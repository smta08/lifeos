-- LifeOS 002 — align the alerts table with the repository + domain layer,
-- and add the indexes the query paths actually use.
--
-- Idempotent: safe to run whether or not 001 was applied in its original form.
-- Run in the Supabase SQL editor (or via psql) AFTER 001.

-- ─── alerts: snooze_until → snoozed_until, add resolved_at ─────────────────────
-- The repository (alertRepo) and the rule engine read/write `snoozed_until` and
-- `resolved_at`. The original 001 shipped `snooze_until` and no `resolved_at`,
-- so snooze/resolve/recompute writes failed with "column does not exist".

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alerts' AND column_name = 'snooze_until'
  ) THEN
    ALTER TABLE alerts RENAME COLUMN snooze_until TO snoozed_until;
  END IF;
END $$;

ALTER TABLE alerts ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS resolved_at   TIMESTAMPTZ;

-- ─── Indexes used by real query paths ─────────────────────────────────────────

-- activity list orders by (user_id, created_at DESC) — replace the user-only index.
DROP INDEX IF EXISTS activity_logs_user_idx;
CREATE INDEX IF NOT EXISTS activity_logs_user_created_idx
  ON activity_logs (user_id, created_at DESC);

-- resolveAlertsForFact looks up alert_evidence by fact_id; PK is (alert_id, fact_id).
CREATE INDEX IF NOT EXISTS alert_evidence_fact_idx
  ON alert_evidence (fact_id);
