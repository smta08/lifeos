'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { UploadCloud, Loader2, ShieldCheck, Plus, FileCheck, AlertCircle } from 'lucide-react'
import { createFact } from '@/features/facts/actions'
import { makeFactInput } from '@/features/facts/presets'
import { FACT_TYPE_CONFIG } from '@/features/facts/constants'
import { extractText, parseFields, nameFromFileName, type ExtractProgress } from '../extract'
import { useToast } from '@/components/Toast'
import type { FactType } from '@/domain/fact'

type Status = 'idle' | 'extracting' | 'review' | 'error'

const TYPE_OPTIONS: FactType[] = [
  'document', 'subscription', 'insurance', 'warranty',
  'lease', 'license', 'passport', 'receipt', 'bill',
]

interface ReviewForm {
  name: string
  amount: string      // raw input; validated on submit
  date: string        // yyyy-mm-dd for <input type=date>
  factType: FactType
  matched: { amount: boolean; date: boolean; type: boolean }
}

function isoToDateInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

export function DropZone() {
  const router = useRouter()
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState<ExtractProgress | null>(null)
  const [form, setForm] = useState<ReviewForm | null>(null)
  const [adding, setAdding] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const isImage = file.type.startsWith('image/')
    if (!isPdf && !isImage) {
      toast('Unsupported file — drop a PDF or image')
      return
    }

    setForm(null)
    setProgress(null)
    setStatus('extracting')

    try {
      const text = await extractText(file, setProgress)
      const parsed = parseFields(text, file.name)
      setForm({
        name: parsed.name || nameFromFileName(file.name),
        amount: parsed.amount !== null ? parsed.amount.toFixed(2) : '',
        date: isoToDateInput(parsed.dateISO),
        factType: parsed.factType,
        matched: parsed.matched,
      })
      setStatus('review')
    } catch {
      // No content logged — extraction errors can carry document text.
      setStatus('error')
    }
  }

  async function handleAdd() {
    if (!form) return

    const amountNum = form.amount.trim() ? Number(form.amount) : undefined
    if (amountNum !== undefined && (Number.isNaN(amountNum) || amountNum < 0)) {
      toast('Enter a valid amount')
      return
    }

    setAdding(true)
    const result = await createFact(
      makeFactInput({
        type: form.factType,
        title: form.name.trim() || 'Untitled Document',
        amount: amountNum,
        dueDateISO: form.date ? new Date(form.date).toISOString() : undefined,
        recurrence: 'none',
      }),
    )
    setAdding(false)

    if (result.ok) {
      toast(`${form.name.trim() || 'Document'} added`)
      setForm(null)
      setStatus('idle')
      router.refresh()
    } else {
      toast(result.error.message)
    }
  }

  function reset() {
    setForm(null)
    setStatus('idle')
    setProgress(null)
  }

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

      {/* Extracting */}
      {status === 'extracting' && (
        <div className="mt-5 rounded-card border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] p-6 shadow-card">
          <div className="flex items-center gap-3">
            <Loader2 size={22} className="animate-spin text-[#0369A1] dark:text-[#38BDF8]" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA]">
                {progress?.stage === 'ocr' ? 'Reading text from image…' : 'Reading document…'}
              </p>
              <p className="text-xs text-[#52525B] dark:text-[#A1A1AA]">
                Processing on your device — the file never leaves this tab.
              </p>
            </div>
          </div>
          {progress?.stage === 'ocr' && progress.progress !== undefined && (
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#F5F5F7] dark:bg-[#27272A]">
              <div
                className="h-full rounded-full bg-[#0369A1] dark:bg-[#38BDF8] transition-[width] duration-200"
                style={{ width: `${Math.round(progress.progress * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="mt-5 flex items-center gap-3 rounded-card border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-5">
          <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA]">Couldn&apos;t read that file</p>
            <p className="text-xs text-[#52525B] dark:text-[#A1A1AA]">Try a clearer scan, or a different PDF/image.</p>
          </div>
          <button onClick={reset} className="text-sm font-medium text-[#0369A1] dark:text-[#38BDF8]">
            Try again
          </button>
        </div>
      )}

      {/* Review (editable) */}
      <AnimatePresence>
        {status === 'review' && form && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="mt-5 rounded-card border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] p-5 shadow-card"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#1D1D1F] dark:text-[#FAFAFA]">
                Review &amp; confirm
              </p>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#059669]/15 dark:bg-[#34D399]/15 px-2.5 py-1 text-xs font-medium text-[#059669] dark:text-[#34D399]">
                <ShieldCheck size={12} /> Not stored
              </span>
            </div>

            <p className="mb-4 text-xs text-[#52525B] dark:text-[#A1A1AA]">
              Extracted from your document — check the fields and fix anything that&apos;s off.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FieldInput label="Name" hint={!form.name ? 'not found' : undefined}>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-transparent text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA] outline-none"
                  placeholder="Document name"
                />
              </FieldInput>

              <FieldInput label="Type">
                <select
                  value={form.factType}
                  onChange={(e) => setForm({ ...form, factType: e.target.value as FactType })}
                  className="w-full bg-transparent text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA] outline-none"
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t} className="bg-white dark:bg-[#18181B]">
                      {FACT_TYPE_CONFIG[t].label}
                    </option>
                  ))}
                </select>
              </FieldInput>

              <FieldInput label="Amount" hint={!form.matched.amount ? 'not detected' : undefined}>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-[#52525B] dark:text-[#A1A1AA]">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full bg-transparent text-sm font-medium tabular-nums text-[#1D1D1F] dark:text-[#FAFAFA] outline-none"
                    placeholder="0.00"
                  />
                </div>
              </FieldInput>

              <FieldInput label="Date" hint={!form.matched.date ? 'not detected' : undefined}>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-transparent text-sm font-medium tabular-nums text-[#1D1D1F] dark:text-[#FAFAFA] outline-none [color-scheme:light] dark:[color-scheme:dark]"
                />
              </FieldInput>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={reset}
                className="rounded-control border border-[#E4E4E7] dark:border-[#27272A] px-4 py-2.5 text-sm font-medium text-[#52525B] dark:text-[#A1A1AA] transition-colors hover:bg-[#F5F5F7] dark:hover:bg-[#27272A]"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={adding}
                className="flex flex-1 items-center justify-center gap-2 rounded-control bg-[#0369A1] dark:bg-[#38BDF8] py-2.5 text-sm font-semibold text-white dark:text-[#0B0C0E] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Add to LifeOS
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {status === 'idle' && (
        <div className="mt-5 flex flex-col items-center rounded-card border border-dashed border-[#E4E4E7] dark:border-[#27272A] py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E4E4E7] dark:bg-[#27272A]">
            <FileCheck size={22} strokeWidth={1.5} className="text-[#52525B] dark:text-[#A1A1AA]" />
          </div>
          <p className="text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA]">No document yet</p>
          <p className="mt-1 max-w-xs text-xs text-[#52525B] dark:text-[#A1A1AA]">
            Drop a file above to read its real dates and amounts — privately, on your device.
          </p>
        </div>
      )}
    </div>
  )
}

function FieldInput({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-control border border-[#E4E4E7] dark:border-[#27272A] bg-[#F5F5F7] dark:bg-[#27272A]/40 px-3 py-2">
      <div className="mb-0.5 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-[#52525B] dark:text-[#A1A1AA]">{label}</span>
        {hint && <span className="text-[10px] text-amber-600 dark:text-amber-400">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
