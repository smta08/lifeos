'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { UploadCloud, Loader2, ShieldCheck, Plus, FileCheck } from 'lucide-react'
import { createFact } from '@/features/facts/actions'
import { makeFactInput, DOC_TYPES, FALLBACK_DOC_ICON } from '@/features/facts/presets'
import { useToast } from '@/components/Toast'
import type { FactType } from '@/domain/fact'

interface Extracted {
  name: string
  amount: number
  date: Date
  typeLabel: string
  factType: FactType
  color: string
  icon: typeof FALLBACK_DOC_ICON
}

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min
}

// Mock extraction. Runs entirely in the browser — the dropped file is read for
// its name only and is never uploaded, stored, or sent anywhere. (Phase 2 will
// swap this for on-device OCR; the no-persist contract stays the same.)
function extractFromFile(fileName: string): Extracted {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
  const name = base
    ? base.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 40)
    : 'Untitled Document'
  const doc = DOC_TYPES[Math.floor(Math.random() * DOC_TYPES.length)]
  const date = new Date(Date.now() + Math.floor(randomBetween(30, 330)) * 86_400_000)

  return {
    name,
    amount: +randomBetween(10, 210).toFixed(2),
    date,
    typeLabel: doc.label,
    factType: doc.type,
    color: doc.color,
    icon: doc.icon,
  }
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function DropZone() {
  const router = useRouter()
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [card, setCard] = useState<Extracted | null>(null)
  const [adding, setAdding] = useState(false)

  function handleFile(file: File | undefined) {
    if (!file) return
    setCard(null)
    setBusy(true)
    const name = file.name
    setTimeout(() => {
      setCard(extractFromFile(name))
      setBusy(false)
    }, 1800)
  }

  async function handleAdd() {
    if (!card) return
    setAdding(true)
    const result = await createFact(
      makeFactInput({
        type: card.factType,
        title: card.name,
        amount: card.amount,
        dueDateISO: card.date.toISOString(),
        recurrence: 'none',
      }),
    )
    setAdding(false)

    if (result.ok) {
      toast(`${card.name} added`)
      setCard(null)
      router.refresh()
    } else {
      toast(result.error.message)
    }
  }

  const CardIcon = card?.icon ?? FALLBACK_DOC_ICON

  return (
    <div>
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]) }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
        className={[
          'flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed py-14 text-center transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] dark:focus-visible:ring-[#38BDF8]',
          dragOver
            ? 'border-[#0369A1] dark:border-[#38BDF8] bg-[#0369A1]/[0.04] dark:bg-[#38BDF8]/[0.06]'
            : 'border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] hover:border-[#0369A1]/40 dark:hover:border-[#38BDF8]/40',
        ].join(' ')}
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
          strokeWidth={1.5}
          className="text-[#0369A1] dark:text-[#38BDF8] transition-transform duration-150"
          style={{ transform: dragOver ? 'scale(1.15)' : 'scale(1)' }}
        />
        <p className="mt-3 text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA]">
          Drop a PDF or image here
        </p>
        <p className="mt-1 text-xs text-[#52525B] dark:text-[#A1A1AA]">
          or click to browse · passports, insurance cards, receipts
        </p>
      </div>

      {/* Spinner */}
      {busy && (
        <div className="mt-5 flex items-center gap-3 rounded-card border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] p-6 shadow-card">
          <Loader2 size={22} className="animate-spin text-[#0369A1] dark:text-[#38BDF8]" />
          <div>
            <p className="text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA]">Extracting fields…</p>
            <p className="text-xs text-[#52525B] dark:text-[#A1A1AA]">Reading the document on your device</p>
          </div>
        </div>
      )}

      {/* Extracted card */}
      <AnimatePresence>
        {card && !busy && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="mt-5 rounded-card border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] p-5 shadow-card"
          >
            <div className="mb-4 flex items-center gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: `${card.color}1F` }}
              >
                <CardIcon size={20} strokeWidth={1.75} color={card.color} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wider text-[#0369A1] dark:text-[#38BDF8]">
                  {card.typeLabel}
                </p>
                <p className="truncate text-[15px] font-semibold text-[#1D1D1F] dark:text-[#FAFAFA]">
                  {card.name}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#059669]/15 dark:bg-[#34D399]/15 px-2.5 py-1 text-xs font-medium text-[#059669] dark:text-[#34D399]">
                <ShieldCheck size={12} /> Not stored
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount" value={`$${card.amount.toFixed(2)}`} />
              <Field label="Date" value={fmtDate(card.date)} />
              <Field label="Type" value={card.typeLabel} />
              <Field label="Name" value={card.name} />
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={adding}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-control bg-[#0369A1] dark:bg-[#38BDF8] py-2.5 text-sm font-semibold text-white dark:text-[#0B0C0E] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Add to LifeOS
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!busy && !card && (
        <div className="mt-5 flex flex-col items-center rounded-card border border-dashed border-[#E4E4E7] dark:border-[#27272A] py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E4E4E7] dark:bg-[#27272A]">
            <FileCheck size={22} strokeWidth={1.5} className="text-[#52525B] dark:text-[#A1A1AA]" />
          </div>
          <p className="text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA]">No document yet</p>
          <p className="mt-1 max-w-xs text-xs text-[#52525B] dark:text-[#A1A1AA]">
            Drop a file above to see its fields extracted privately on your device.
          </p>
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-control bg-[#F5F5F7] dark:bg-[#27272A]/50 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-[#52525B] dark:text-[#A1A1AA]">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium tabular-nums text-[#1D1D1F] dark:text-[#FAFAFA]">
        {value}
      </p>
    </div>
  )
}
