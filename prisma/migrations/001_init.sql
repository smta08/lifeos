-- LifeOS Phase 1 — initial schema
-- Run this in the Supabase SQL editor or via psql against your project.
-- Prisma manages types/models for service-role paths; this file is the authoritative
-- source for RLS policies, partial indexes, and triggers that Prisma cannot express.

-- ─── Extensions ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE fact_type AS ENUM (
  'subscription', 'document', 'insurance', 'warranty', 'lease',
  'license', 'passport', 'receipt', 'bill', 'task', 'goal', 'custom'
);

CREATE TYPE fact_status AS ENUM ('active', 'archived', 'resolved');

CREATE TYPE fact_source AS ENUM ('manual', 'email', 'ocr', 'api');

CREATE TYPE recurrence AS ENUM ('none', 'weekly', 'monthly', 'yearly');

CREATE TYPE alert_urgency AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE alert_status AS ENUM ('active', 'snoozed', 'dismissed', 'resolved');

CREATE TYPE alert_source AS ENUM ('rule_engine', 'ai_scan');

CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'executive');

CREATE TYPE ai_run_status AS ENUM ('pending', 'completed', 'failed', 'rejected');

-- ─── Tables ───────────────────────────────────────────────────────────────────

-- profiles: one row per user; id mirrors auth.users.id
CREATE TABLE profiles (
  id              UUID              PRIMARY KEY,
  email           TEXT              NOT NULL UNIQUE,
  display_name    TEXT,
  timezone        TEXT              NOT NULL DEFAULT 'UTC',
  notify_email    BOOLEAN           NOT NULL DEFAULT TRUE,
  notify_cadence  TEXT              NOT NULL DEFAULT 'daily',
  tier            subscription_tier NOT NULL DEFAULT 'free',
  created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- facts: the user's tracked life items
CREATE TABLE facts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            fact_type   NOT NULL,
  title           TEXT        NOT NULL,
  category        TEXT,
  amount          NUMERIC(12, 2),
  currency        CHAR(3),
  due_date        TIMESTAMPTZ,
  recurrence      recurrence  NOT NULL DEFAULT 'none',
  status          fact_status NOT NULL DEFAULT 'active',
  source          fact_source NOT NULL DEFAULT 'manual',
  -- Provenance for scanner-created facts (NULL for manual Phase 1 facts)
  connection_id   UUID,
  external_ref    TEXT,
  -- Envelope-encrypted sensitive values; decrypt only inside factRepo
  sensitive       BYTEA,
  metadata        JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- alerts: surface what the user is forgetting; upsert on dedupe_key
CREATE TABLE alerts (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title            TEXT          NOT NULL,
  category         TEXT          NOT NULL,
  urgency          alert_urgency NOT NULL,
  suggested_action TEXT,
  status           alert_status  NOT NULL DEFAULT 'active',
  source           alert_source  NOT NULL,
  dedupe_key       TEXT,
  snoozed_until    TIMESTAMPTZ,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- alert_evidence: evidence_fact_ids is the AI model's output shape; storage lives here
CREATE TABLE alert_evidence (
  alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  fact_id  UUID NOT NULL REFERENCES facts(id)  ON DELETE CASCADE,
  PRIMARY KEY (alert_id, fact_id)
);

-- activity_logs: append-only audit trail (no UPDATE/DELETE RLS policies by design)
CREATE TABLE activity_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type  TEXT        NOT NULL,
  entity_id    TEXT        NOT NULL,
  action       TEXT        NOT NULL,
  metadata     JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ai_runs: per-call AI audit log
CREATE TABLE ai_runs (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job           TEXT          NOT NULL,
  model         TEXT          NOT NULL,
  input_tokens  INT           NOT NULL DEFAULT 0,
  output_tokens INT           NOT NULL DEFAULT 0,
  cost_usd      NUMERIC(10, 6) NOT NULL DEFAULT 0,
  status        ai_run_status NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX facts_user_due_date_idx        ON facts (user_id, due_date);
CREATE INDEX facts_user_type_idx            ON facts (user_id, type);
CREATE INDEX facts_user_status_idx          ON facts (user_id, status);
CREATE INDEX alerts_user_status_urgency_idx ON alerts (user_id, status, urgency);
CREATE INDEX activity_logs_user_created_idx  ON activity_logs (user_id, created_at DESC);
CREATE INDEX ai_runs_user_idx               ON ai_runs (user_id);
-- alert_evidence is looked up by fact_id (resolveAlertsForFact); PK is (alert_id, fact_id)
-- so a standalone fact_id index is required for that access path.
CREATE INDEX alert_evidence_fact_idx        ON alert_evidence (fact_id);

-- Partial unique indexes (Prisma cannot express these; enforced here only)
CREATE UNIQUE INDEX facts_user_external_ref_key
  ON facts (user_id, external_ref)
  WHERE external_ref IS NOT NULL;

CREATE UNIQUE INDEX alerts_user_dedupe_key_idx
  ON alerts (user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

-- ─── updated_at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER facts_updated_at
  BEFORE UPDATE ON facts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER alerts_updated_at
  BEFORE UPDATE ON alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE facts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_runs        ENABLE ROW LEVEL SECURITY;

-- profiles: the profile row IS the user; no delete policy (deletion is a service-role operation)
CREATE POLICY "profiles: select own"
  ON profiles FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles: insert own"
  ON profiles FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles: update own"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- facts
CREATE POLICY "facts: select own"
  ON facts FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "facts: insert own"
  ON facts FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "facts: update own"
  ON facts FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "facts: delete own"
  ON facts FOR DELETE USING (user_id = auth.uid());

-- alerts
CREATE POLICY "alerts: select own"
  ON alerts FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "alerts: insert own"
  ON alerts FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "alerts: update own"
  ON alerts FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "alerts: delete own"
  ON alerts FOR DELETE USING (user_id = auth.uid());

-- alert_evidence: access is gated on owning the parent alert
CREATE POLICY "alert_evidence: select own"
  ON alert_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM alerts
      WHERE alerts.id = alert_evidence.alert_id
        AND alerts.user_id = auth.uid()
    )
  );

CREATE POLICY "alert_evidence: insert own"
  ON alert_evidence FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM alerts
      WHERE alerts.id = alert_evidence.alert_id
        AND alerts.user_id = auth.uid()
    )
  );

CREATE POLICY "alert_evidence: delete own"
  ON alert_evidence FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM alerts
      WHERE alerts.id = alert_evidence.alert_id
        AND alerts.user_id = auth.uid()
    )
  );

-- activity_logs: SELECT + INSERT only — no UPDATE or DELETE policies (append-only by design)
CREATE POLICY "activity_logs: select own"
  ON activity_logs FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "activity_logs: insert own"
  ON activity_logs FOR INSERT WITH CHECK (user_id = auth.uid());

-- ai_runs: users can read their own run history; inserts are service-role or via Inngest
CREATE POLICY "ai_runs: select own"
  ON ai_runs FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "ai_runs: insert own"
  ON ai_runs FOR INSERT WITH CHECK (user_id = auth.uid());

-- ─── Auto-create profile on sign-up ──────────────────────────────────────────
-- Triggered by Supabase Auth on new user creation (runs as postgres / service role)

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
