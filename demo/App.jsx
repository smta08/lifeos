import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  LayoutGrid, CalendarClock, FileText, Mail, Plus, Trash2, Check, X,
  Tv, Music, ShoppingCart, Cloud, Sparkles, Youtube, Film, Palette,
  Dumbbell, Box, ShieldCheck, UploadCloud, Loader2, ScanLine, Inbox,
  TrendingUp, Bell, Lock, FileCheck, Wallet,
} from 'lucide-react'

/* ──────────────────────────────────────────────────────────────────────────
   LifeOS — single-file in-memory demo
   Dark navy (#0A0F1E) · indigo accent (#6366F1) · Inter
   No backend, no localStorage. One `facts` array drives every tab.
   ────────────────────────────────────────────────────────────────────────── */

// ── Icon registry (facts store an icon *key*; resolved here) ───────────────
const ICONS = {
  tv: Tv, music: Music, cart: ShoppingCart, cloud: Cloud, sparkles: Sparkles,
  youtube: Youtube, film: Film, palette: Palette, dumbbell: Dumbbell, box: Box,
  shield: ShieldCheck, file: FileText, wallet: Wallet,
}
const Icon = ({ name, ...p }) => {
  const C = ICONS[name] || Box
  return <C {...p} />
}

// ── Quick-Add presets ──────────────────────────────────────────────────────
const PRESETS = [
  { name: 'Netflix',      amount: 15.99, day: 12, icon: 'tv',       color: '#E50914' },
  { name: 'Spotify',      amount: 9.99,  day: 5,  icon: 'music',    color: '#1DB954' },
  { name: 'Amazon Prime', amount: 14.99, day: 20, icon: 'cart',     color: '#FF9900' },
  { name: 'iCloud',       amount: 2.99,  day: 1,  icon: 'cloud',    color: '#3B82F6' },
  { name: 'Disney+',      amount: 7.99,  day: 15, icon: 'sparkles', color: '#6366F1' },
  { name: 'YouTube',      amount: 11.99, day: 8,  icon: 'youtube',  color: '#FF0000' },
  { name: 'HBO Max',      amount: 15.99, day: 22, icon: 'film',     color: '#A855F7' },
  { name: 'Adobe CC',     amount: 54.99, day: 3,  icon: 'palette',  color: '#FF3366' },
  { name: 'Gym',          amount: 39.99, day: 28, icon: 'dumbbell', color: '#F59E0B' },
  { name: 'Dropbox',      amount: 11.99, day: 18, icon: 'box',      color: '#2563EB' },
]

// ── Gmail simulated suggestions ────────────────────────────────────────────
const GMAIL_SUGGESTIONS = [
  { name: 'Netflix',       amount: 15.99, day: 12, icon: 'tv',     color: '#E50914', sender: 'info@account.netflix.com',  subject: 'Your Netflix payment receipt' },
  { name: 'Spotify',       amount: 9.99,  day: 5,  icon: 'music',  color: '#1DB954', sender: 'no-reply@spotify.com',      subject: 'Your Premium plan renews soon' },
  { name: 'Amazon Prime',  amount: 14.99, day: 20, icon: 'cart',   color: '#FF9900', sender: 'auto-confirm@amazon.com',   subject: 'Your Prime membership receipt' },
  { name: 'Apple iCloud',  amount: 2.99,  day: 1,  icon: 'cloud',  color: '#3B82F6', sender: 'no_reply@email.apple.com',  subject: 'Your iCloud+ subscription' },
  { name: 'BCAA Insurance',amount: 88.00, day: 24, icon: 'shield', color: '#10B981', sender: 'service@bcaa.com',          subject: 'Auto policy renewal notice' },
  { name: 'Adobe CC',      amount: 54.99, day: 3,  icon: 'palette',color: '#FF3366', sender: 'mail@adobe.com',            subject: 'Your Creative Cloud invoice' },
  { name: 'Gym',           amount: 39.99, day: 28, icon: 'dumbbell',color:'#F59E0B', sender: 'billing@fitlife.com',       subject: 'Monthly membership charged' },
]

const DOC_TYPES = ['Insurance card', 'Warranty', 'Lease', 'Receipt']
const BUDGET = 300

// ── Date helpers ───────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December']

// Next occurrence of a given day-of-month (today or future)
function nextRenewal(day) {
  const now = new Date()
  let d = new Date(now.getFullYear(), now.getMonth(), day)
  if (d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    d = new Date(now.getFullYear(), now.getMonth() + 1, day)
  }
  return d
}
function daysUntil(date) {
  const now = new Date()
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const b = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.round((b - a) / 86400000)
}
function fmtDate(date) {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`
}
const uid = () => Math.random().toString(36).slice(2, 10)

// ── Animated count-up ──────────────────────────────────────────────────────
function useCountUp(target, duration = 800) {
  const [val, setVal] = useState(0)
  const fromRef = useRef(0)
  useEffect(() => {
    const from = fromRef.current
    const start = performance.now()
    let raf
    const tick = (t) => {
      const p = Math.min((t - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3) // cubic ease-out
      setVal(from + (target - from) * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return val
}

// ── Days-until badge ───────────────────────────────────────────────────────
function DaysBadge({ date }) {
  const d = daysUntil(date)
  let cls = 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
  if (d <= 3) cls = 'bg-red-500/15 text-red-300 ring-red-500/30'
  else if (d <= 14) cls = 'bg-amber-500/15 text-amber-300 ring-amber-500/30'
  const label = d < 0 ? 'overdue' : d === 0 ? 'today' : d === 1 ? '1 day' : `${d} days`
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${cls}`}>
      <Bell size={11} strokeWidth={2} /> {label}
    </span>
  )
}

// ── Avatar (colored disc + icon) ───────────────────────────────────────────
function Avatar({ icon, color, size = 40 }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-xl"
      style={{ width: size, height: size, background: `${color}22`, boxShadow: `inset 0 0 0 1px ${color}33` }}
    >
      <Icon name={icon} size={size * 0.5} color={color} strokeWidth={1.75} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [facts, setFacts] = useState([])
  const [tab, setTab] = useState('overview')
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const pushToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }, [])

  const addFact = useCallback((f) => {
    setFacts((prev) => [...prev, { id: uid(), ...f }])
    pushToast(`${f.name} added to LifeOS`)
  }, [pushToast])

  const removeFact = useCallback((id) => {
    setFacts((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const TABS = [
    { key: 'overview', label: 'Overview', icon: LayoutGrid },
    { key: 'timeline', label: 'Timeline', icon: CalendarClock },
    { key: 'docs',     label: 'Docs',     icon: FileText },
    { key: 'gmail',    label: 'Gmail Scan', icon: Mail },
  ]

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-slate-100" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Keyframes />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0A0F1E]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 ring-1 ring-indigo-500/30">
            <ScanLine size={18} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight">LifeOS</h1>
            <p className="text-[11px] text-slate-500">Quietly watching so you don't have to</p>
          </div>
          <div className="ml-auto hidden items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-[11px] text-slate-400 ring-1 ring-white/10 sm:flex">
            <Lock size={11} /> In-memory demo · nothing leaves this tab
          </div>
        </div>

        {/* Tabs */}
        <nav className="mx-auto flex max-w-5xl gap-1 px-3 pb-2">
          {TABS.map((t) => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`group relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors ${
                  active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <t.icon size={15} strokeWidth={2} className={active ? 'text-indigo-400' : ''} />
                {t.label}
                {active && <span className="absolute inset-x-2 -bottom-2 h-0.5 rounded-full bg-indigo-500" />}
              </button>
            )
          })}
        </nav>
      </header>

      {/* Body */}
      <main key={tab} className="mx-auto max-w-5xl px-5 py-7" style={{ animation: 'tabFade 250ms ease' }}>
        {tab === 'overview' && <Overview facts={facts} addFact={addFact} removeFact={removeFact} />}
        {tab === 'timeline' && <Timeline facts={facts} />}
        {tab === 'docs' && <Docs addFact={addFact} />}
        {tab === 'gmail' && <Gmail addFact={addFact} />}
      </main>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border border-indigo-500/30 bg-[#11182E] px-4 py-3 shadow-2xl shadow-black/50"
          style={{ animation: 'toastIn 300ms cubic-bezier(.16,1,.3,1)' }}
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20">
            <Check size={14} className="text-emerald-400" strokeWidth={3} />
          </span>
          <span className="text-[13px] font-medium">{toast}</span>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════ OVERVIEW ══
function Overview({ facts, addFact, removeFact }) {
  const total = facts.reduce((s, f) => s + f.amount, 0)
  const soon = facts.filter((f) => daysUntil(f.renewDate) <= 14 && daysUntil(f.renewDate) >= 0).length
  const animTotal = useCountUp(total)
  const animCount = useCountUp(facts.length, 600)
  const animSoon = useCountUp(soon, 600)
  const pct = Math.min((total / BUDGET) * 100, 100)
  const over = total > BUDGET

  const addedNames = new Set(facts.map((f) => f.name))

  const addPreset = (p) =>
    addFact({ name: p.name, amount: p.amount, icon: p.icon, color: p.color, renewDate: nextRenewal(p.day), type: 'Subscription' })

  return (
    <div className="space-y-7">
      {/* Spending strip */}
      <section
        className="rounded-2xl border border-white/8 bg-gradient-to-br from-[#131A30] to-[#0E1424] p-6"
        style={{ animation: 'fadeUp 300ms ease both' }}
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-wider text-slate-500">Monthly spend</p>
            <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums">
              ${animTotal.toFixed(2)}
            </p>
          </div>
          <div className="flex gap-6">
            <Stat label="Tracked" value={Math.round(animCount)} icon={Wallet} />
            <Stat label="Renewing soon" value={Math.round(animSoon)} icon={Bell} accent={soon > 0} />
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="mb-1.5 flex justify-between text-[11px] text-slate-500">
            <span>$0</span>
            <span className={over ? 'font-semibold text-red-400' : ''}>
              {over ? `$${(total - BUDGET).toFixed(0)} over budget` : `Budget $${BUDGET}`}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${over ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </section>

      {/* Quick-Add chips */}
      <section style={{ animation: 'fadeUp 300ms ease both', animationDelay: '40ms' }}>
        <SectionTitle icon={Plus} title="Quick add" sub="One tap to start tracking" />
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => {
            const added = addedNames.has(p.name)
            return (
              <button
                key={p.name}
                disabled={added}
                onClick={() => addPreset(p)}
                className={`group flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium transition-all ${
                  added
                    ? 'cursor-default border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-white/10 bg-white/[0.03] text-slate-200 hover:-translate-y-px hover:border-indigo-500/40 hover:bg-white/[0.06]'
                }`}
              >
                <Avatar icon={p.icon} color={added ? '#10B981' : p.color} size={22} />
                {p.name}
                {added
                  ? <Check size={14} className="text-emerald-400" strokeWidth={3} />
                  : <span className="text-slate-500 group-hover:text-indigo-400">+${p.amount}</span>}
              </button>
            )
          })}
        </div>
      </section>

      {/* Subscription list */}
      <section style={{ animation: 'fadeUp 300ms ease both', animationDelay: '80ms' }}>
        <SectionTitle icon={LayoutGrid} title="Your subscriptions" sub={`${facts.length} tracked`} />
        {facts.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Nothing tracked yet"
            body="Add a service above, drop a document, or scan your Gmail to begin."
          />
        ) : (
          <div className="grid gap-2.5">
            {[...facts]
              .sort((a, b) => a.renewDate - b.renewDate)
              .map((f, i) => (
                <div
                  key={f.id}
                  className="group flex items-center gap-4 rounded-2xl border border-white/8 bg-[#11182E] p-4 transition-all hover:-translate-y-px hover:border-white/15 hover:shadow-lg hover:shadow-black/30"
                  style={{ animation: 'fadeUp 300ms ease both', animationDelay: `${i * 0.04}s` }}
                >
                  <Avatar icon={f.icon} color={f.color} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[14px] font-semibold">{f.name}</p>
                      {f.type !== 'Subscription' && (
                        <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">{f.type}</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[12px] text-slate-500">Renews {fmtDate(f.renewDate)}</p>
                  </div>
                  <DaysBadge date={f.renewDate} />
                  <p className="w-20 text-right text-[14px] font-semibold tabular-nums">${f.amount.toFixed(2)}</p>
                  <button
                    onClick={() => removeFact(f.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 opacity-0 transition-all hover:bg-red-500/15 hover:text-red-400 group-hover:opacity-100"
                    aria-label={`Delete ${f.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value, icon: I, accent }) {
  return (
    <div className="text-right">
      <p className="flex items-center justify-end gap-1 text-[11px] uppercase tracking-wider text-slate-500">
        <I size={11} /> {label}
      </p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${accent ? 'text-amber-400' : ''}`}>{value}</p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════ TIMELINE ══
function Timeline({ facts }) {
  const now = new Date()
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  return (
    <div>
      <SectionTitle icon={CalendarClock} title="Next 12 months" sub="When everything renews" />
      {facts.length === 0 && (
        <div className="mb-5">
          <EmptyState icon={CalendarClock} title="Your timeline is clear" body="Add subscriptions to see them mapped across the year." />
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {months.map((m, i) => {
          const items = facts
            .filter((f) => f.renewDate.getFullYear() === m.year && f.renewDate.getMonth() === m.month)
            .sort((a, b) => a.renewDate - b.renewDate)
          const has = items.length > 0
          const monthTotal = items.reduce((s, f) => s + f.amount, 0)
          return (
            <div
              key={i}
              className={`rounded-2xl border p-4 transition-colors ${
                has ? 'border-indigo-500/30 bg-indigo-500/[0.04]' : 'border-white/8 bg-[#0E1424]'
              }`}
              style={{ animation: 'fadeUp 300ms ease both', animationDelay: `${i * 0.04}s` }}
            >
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="text-[13px] font-semibold">
                  {MONTHS_LONG[m.month]} <span className="text-slate-500">{m.year}</span>
                </h3>
                {has && <span className="text-[12px] font-medium tabular-nums text-indigo-300">${monthTotal.toFixed(2)}</span>}
              </div>
              {has ? (
                <ul className="space-y-1.5">
                  {items.map((f) => (
                    <li key={f.id} className="flex items-center gap-2.5 text-[13px]">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: f.color }} />
                      <span className="flex-1 truncate text-slate-300">{f.name}</span>
                      <span className="text-[12px] text-slate-500">{fmtDate(f.renewDate)}</span>
                      <span className="tabular-nums text-slate-400">${f.amount.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12px] text-slate-600">Nothing scheduled</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════ DOCS ══
function Docs({ addFact }) {
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [card, setCard] = useState(null)
  const inputRef = useRef(null)

  const handleFile = (file) => {
    if (!file) return
    setCard(null)
    setBusy(true)
    setTimeout(() => {
      const base = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
      const name = base ? base.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 32) : 'Untitled Document'
      const amount = +(Math.random() * 200 + 10).toFixed(2)
      const type = DOC_TYPES[Math.floor(Math.random() * DOC_TYPES.length)]
      const renewDate = new Date(Date.now() + (30 + Math.floor(Math.random() * 300)) * 86400000)
      setCard({ name, amount, type, renewDate, icon: 'file', color: '#6366F1' })
      setBusy(false)
    }, 1800)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  return (
    <div>
      <SectionTitle icon={FileText} title="Document drop zone" sub="Extraction runs locally — files are never stored" />

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed py-14 text-center transition-all ${
          dragOver ? 'border-indigo-500 bg-indigo-500/[0.06]' : 'border-white/12 bg-[#0E1424] hover:border-white/20'
        }`}
        style={{ animation: 'fadeUp 300ms ease both' }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <UploadCloud
          size={40}
          className={`text-indigo-400 transition-transform ${dragOver ? 'scale-115' : ''}`}
          strokeWidth={1.5}
          style={{ transform: dragOver ? 'scale(1.15)' : 'scale(1)' }}
        />
        <p className="mt-3 text-[14px] font-medium">Drop a PDF or image here</p>
        <p className="mt-1 text-[12px] text-slate-500">or click to browse · passports, insurance cards, receipts</p>
      </div>

      {/* Spinner */}
      {busy && (
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/8 bg-[#11182E] p-6" style={{ animation: 'fadeUp 250ms ease both' }}>
          <Loader2 size={22} className="animate-spin text-indigo-400" />
          <div>
            <p className="text-[13px] font-medium">Extracting fields…</p>
            <p className="text-[12px] text-slate-500">Reading the document on your device</p>
          </div>
        </div>
      )}

      {/* Extracted card */}
      {card && !busy && (
        <div className="mt-5 rounded-2xl border border-indigo-500/25 bg-[#11182E] p-5" style={{ animation: 'fadeUp 300ms ease both' }}>
          <div className="mb-4 flex items-center gap-3">
            <Avatar icon="file" color="#6366F1" />
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-wider text-indigo-300">{card.type}</p>
              <p className="text-[15px] font-semibold">{card.name}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/30">
              <ShieldCheck size={12} /> Not stored
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount" value={`$${card.amount.toFixed(2)}`} />
            <Field label="Date" value={fmtDate(card.renewDate)} />
            <Field label="Type" value={card.type} />
            <Field label="Name" value={card.name} />
          </div>

          <button
            onClick={() => { addFact({ ...card, type: card.type }); setCard(null) }}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-indigo-400"
          >
            <Plus size={16} /> Add to LifeOS
          </button>
        </div>
      )}

      {!busy && !card && (
        <div className="mt-5">
          <EmptyState icon={FileCheck} title="No document yet" body="Drop a file above to see fields extracted privately." />
        </div>
      )}
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div className="rounded-xl bg-white/[0.03] px-3 py-2.5 ring-1 ring-white/5">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-[13px] font-medium tabular-nums">{value}</p>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════ GMAIL ══
const GMAIL_STEPS = ['Connecting…', 'Fetching emails…', 'Matching patterns…', 'Found 7 items']

function Gmail({ addFact }) {
  const [phase, setPhase] = useState('idle') // idle | scanning | results
  const [step, setStep] = useState(-1)
  const [items, setItems] = useState([])      // pending suggestions
  const [processed, setProcessed] = useState(0)
  const [leaving, setLeaving] = useState({})  // id -> true while sliding out
  const timers = useRef([])

  const connect = () => {
    setPhase('scanning')
    setStep(0)
    timers.current = [
      setTimeout(() => setStep(1), 400),
      setTimeout(() => setStep(2), 900),
      setTimeout(() => setStep(3), 1600),
      setTimeout(() => setStep(3), 2300),
      setTimeout(() => {
        setItems(GMAIL_SUGGESTIONS.map((s) => ({ ...s, id: uid() })))
        setPhase('results')
      }, 2800),
    ]
  }

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const finalize = (id) => {
    setLeaving((l) => ({ ...l, [id]: true }))
    setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id))
      setProcessed((n) => n + 1)
    }, 200)
  }

  const approve = (s) => {
    addFact({ name: s.name, amount: s.amount, icon: s.icon, color: s.color, renewDate: nextRenewal(s.day), type: 'Subscription' })
    finalize(s.id)
  }
  const dismiss = (s) => finalize(s.id)

  // ── Idle ──
  if (phase === 'idle') {
    return (
      <div>
        <SectionTitle icon={Mail} title="Gmail scan" sub="Find subscriptions hiding in your inbox" />
        <div className="flex flex-col items-center rounded-2xl border border-white/8 bg-[#0E1424] py-16 text-center" style={{ animation: 'fadeUp 300ms ease both' }}>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/15 ring-1 ring-indigo-500/30">
            <Mail size={28} className="text-indigo-400" strokeWidth={1.5} />
          </div>
          <p className="mt-4 text-[15px] font-semibold">Connect Gmail to scan</p>
          <p className="mt-1 max-w-xs text-[12px] text-slate-500">
            Read-only. We extract renewal facts and never store your emails. (Simulated for this demo.)
          </p>
          <button
            onClick={connect}
            className="mt-5 flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-indigo-400"
          >
            <ScanLine size={16} /> Connect & scan
          </button>
        </div>
      </div>
    )
  }

  // ── Scanning ──
  if (phase === 'scanning') {
    return (
      <div>
        <SectionTitle icon={Mail} title="Gmail scan" sub="Working…" />
        <div className="rounded-2xl border border-white/8 bg-[#0E1424] p-8" style={{ animation: 'fadeUp 300ms ease both' }}>
          <div className="mx-auto max-w-sm space-y-3">
            {GMAIL_STEPS.map((label, i) => {
              const done = i < step
              const active = i === step
              return (
                <div key={i} className={`flex items-center gap-3 transition-opacity ${i > step ? 'opacity-30' : 'opacity-100'}`}>
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full ring-1 ${
                    done ? 'bg-emerald-500/20 ring-emerald-500/40' : active ? 'bg-indigo-500/20 ring-indigo-500/40' : 'bg-white/5 ring-white/10'
                  }`}>
                    {done ? <Check size={14} className="text-emerald-400" strokeWidth={3} />
                      : active ? <Loader2 size={14} className="animate-spin text-indigo-400" />
                      : <span className="text-[11px] text-slate-500">{i + 1}</span>}
                  </span>
                  <span className={`text-[13px] ${active ? 'font-medium text-white' : 'text-slate-400'}`}>{label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── Results ──
  const remaining = items.length
  return (
    <div>
      <SectionTitle icon={Mail} title="Gmail scan" sub={`${processed} processed · ${remaining} to review`} />

      <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3">
        <TrendingUp size={16} className="text-emerald-400" />
        <p className="text-[13px] text-emerald-200">
          Found 7 subscriptions. Approve the ones you want to track.
        </p>
      </div>

      {remaining === 0 ? (
        <EmptyState icon={Check} title="All caught up" body={`You reviewed all ${processed} suggestions. Check the Overview tab.`} />
      ) : (
        <div className="grid gap-2.5">
          {items.map((s, i) => (
            <div
              key={s.id}
              className="flex items-center gap-4 rounded-2xl border border-white/8 bg-[#11182E] p-4"
              style={{
                animation: leaving[s.id] ? 'slideOut 200ms ease forwards' : 'fadeUp 300ms ease both',
                animationDelay: leaving[s.id] ? '0s' : `${i * 0.04}s`,
              }}
            >
              <Avatar icon={s.icon} color={s.color} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-semibold">{s.name}</p>
                  <span className="tabular-nums text-[12px] text-slate-400">${s.amount.toFixed(2)}/mo</span>
                </div>
                <p className="truncate text-[12px] text-slate-500">{s.subject}</p>
                <p className="truncate text-[11px] text-slate-600">{s.sender}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => dismiss(s)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
                  aria-label="Dismiss"
                >
                  <X size={16} />
                </button>
                <button
                  onClick={() => approve(s)}
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-indigo-500 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-indigo-400"
                >
                  <Check size={15} strokeWidth={2.5} /> Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════ SHARED PIECES ══
function SectionTitle({ icon: I, title, sub }) {
  return (
    <div className="mb-3.5 flex items-center gap-2.5">
      <I size={16} className="text-indigo-400" />
      <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
      {sub && <span className="text-[12px] text-slate-500">· {sub}</span>}
    </div>
  )
}

function EmptyState({ icon: I, title, body }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/10 bg-[#0E1424] py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
        <I size={22} className="text-slate-500" strokeWidth={1.5} />
      </div>
      <p className="mt-3 text-[14px] font-medium text-slate-300">{title}</p>
      <p className="mt-1 max-w-xs text-[12px] text-slate-500">{body}</p>
    </div>
  )
}

// ── Keyframes (single inline style tag) ────────────────────────────────────
function Keyframes() {
  return (
    <style>{`
      @keyframes fadeUp   { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes tabFade  { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideOut { to { opacity: 0; transform: translateX(20px); } }
      @keyframes toastIn  { from { opacity: 0; transform: translateY(12px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
    `}</style>
  )
}
