// Real document extraction — runs entirely in the browser.
// PDFs are parsed with pdf.js; images are OCR'd with Tesseract.js. The file
// bytes are read in-memory and never uploaded or persisted (only the OCR engine
// and language data are fetched, not the document itself).

import type { FactType } from '@/domain/fact'

export interface ParsedFields {
  name: string
  amount: number | null
  dateISO: string | null
  typeLabel: string
  factType: FactType
  // Whether the parser actually found anything meaningful in the text.
  matched: { amount: boolean; date: boolean; type: boolean }
}

export interface ExtractProgress {
  stage: 'reading' | 'ocr'
  // 0–1 for OCR; undefined while reading a PDF (indeterminate)
  progress?: number
}

// ─── Text extraction ──────────────────────────────────────────────────────────

export async function extractText(
  file: File,
  onProgress?: (p: ExtractProgress) => void,
): Promise<string> {
  const isPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

  if (isPdf) {
    onProgress?.({ stage: 'reading' })
    return extractPdfText(file)
  }
  return extractImageText(file, onProgress)
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  // Served from /public (copied on postinstall). Self-hosted, no CDN — the
  // document bytes never leave the browser.
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const buffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buffer }).promise

  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    pages.push(text)
  }
  await pdf.destroy()
  return pages.join('\n')
}

async function extractImageText(
  file: File,
  onProgress?: (p: ExtractProgress) => void,
): Promise<string> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') {
        onProgress?.({ stage: 'ocr', progress: m.progress })
      }
    },
  })
  try {
    const { data } = await worker.recognize(file)
    return data.text
  } finally {
    await worker.terminate()
  }
}

// ─── Field parsing ──────────────────────────────────────────────────────────────

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8,
  september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
}

// Type keywords, most specific first. Each maps to a fact type + display label.
const TYPE_RULES: { re: RegExp; factType: FactType; label: string }[] = [
  { re: /\b(passport)\b/i,                                  factType: 'passport',     label: 'Passport' },
  { re: /\b(driver'?s?\s*licen[cs]e|licence|license)\b/i,   factType: 'license',      label: 'License' },
  { re: /\b(insurance|policy|premium|coverage|insured)\b/i, factType: 'insurance',    label: 'Insurance' },
  { re: /\b(warranty|guarantee)\b/i,                        factType: 'warranty',     label: 'Warranty' },
  { re: /\b(lease|tenancy|landlord|rent)\b/i,               factType: 'lease',        label: 'Lease' },
  { re: /\b(subscription|membership|renew|billing\s*cycle)\b/i, factType: 'subscription', label: 'Subscription' },
  { re: /\b(invoice|receipt|order\s*(?:no|number|#)|total\s*due)\b/i, factType: 'receipt', label: 'Receipt' },
]

function detectType(text: string): { factType: FactType; label: string; matched: boolean } {
  for (const rule of TYPE_RULES) {
    if (rule.re.test(text)) return { factType: rule.factType, label: rule.label, matched: true }
  }
  return { factType: 'document', label: 'Document', matched: false }
}

// Pull all currency-style amounts; prefer one near a "total/amount/premium" cue,
// otherwise the largest value found.
function detectAmount(text: string): number | null {
  const amountRe = /(?:[$£€]|USD|CAD|EUR|GBP|INR|AUD)?\s?(\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d+\.\d{2})/gi
  const cueRe = /(total|amount|premium|price|due|balance|subtotal|grand\s*total)/i

  const candidates: { value: number; cued: boolean }[] = []
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    const cued = cueRe.test(line)
    let m: RegExpExecArray | null
    amountRe.lastIndex = 0
    while ((m = amountRe.exec(line)) !== null) {
      const value = parseFloat(m[1].replace(/,/g, ''))
      if (!Number.isNaN(value) && value > 0) candidates.push({ value, cued })
    }
  }
  if (candidates.length === 0) return null

  const cued = candidates.filter((c) => c.cued)
  const pool = cued.length > 0 ? cued : candidates
  return pool.reduce((max, c) => (c.value > max ? c.value : max), 0)
}

function clampDate(y: number, m: number, d: number): Date | null {
  if (m < 0 || m > 11 || d < 1 || d > 31) return null
  const date = new Date(y, m, d)
  return date.getFullYear() === y && date.getMonth() === m && date.getDate() === d ? date : null
}

function detectDates(text: string): Date[] {
  const out: Date[] = []

  // ISO: 2026-07-12
  for (const m of Array.from(text.matchAll(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/g))) {
    const d = clampDate(+m[1], +m[2] - 1, +m[3])
    if (d) out.push(d)
  }
  // Numeric: 12/07/2026 or 07-12-2026 (ambiguous → infer from values)
  for (const m of Array.from(text.matchAll(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d{2})\b/g))) {
    const a = +m[1], b = +m[2], y = +m[3]
    // If first > 12 it must be the day; if second > 12 the first is the month.
    const [mo, day] = a > 12 ? [b, a] : b > 12 ? [a, b] : [a, b] // default month-first
    const d = clampDate(y, mo - 1, day)
    if (d) out.push(d)
  }
  // Month name: Jul 12, 2026  /  July 12 2026
  for (const m of Array.from(text.matchAll(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(20\d{2})\b/g))) {
    const mo = MONTHS[m[1].toLowerCase()]
    if (mo === undefined) continue
    const d = clampDate(+m[3], mo, +m[2])
    if (d) out.push(d)
  }
  // Day-first month name: 12 July 2026
  for (const m of Array.from(text.matchAll(/\b(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(20\d{2})\b/g))) {
    const mo = MONTHS[m[2].toLowerCase()]
    if (mo === undefined) continue
    const d = clampDate(+m[3], mo, +m[1])
    if (d) out.push(d)
  }
  return out
}

// Prefer the nearest future date (renewal/expiry); fall back to the latest date.
function chooseDate(dates: Date[]): Date | null {
  if (dates.length === 0) return null
  const now = Date.now()
  const future = dates.filter((d) => d.getTime() >= now).sort((a, b) => a.getTime() - b.getTime())
  if (future.length > 0) return future[0]
  return dates.sort((a, b) => b.getTime() - a.getTime())[0]
}

function detectName(text: string, fallback: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  // First reasonably-titley line: has letters, not mostly digits, not too long.
  for (const line of lines.slice(0, 12)) {
    const letters = (line.match(/[A-Za-z]/g) ?? []).length
    const digits = (line.match(/\d/g) ?? []).length
    if (letters >= 3 && letters >= digits && line.length <= 60) {
      return line.replace(/\s+/g, ' ').slice(0, 60)
    }
  }
  return fallback
}

export function nameFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
  if (!base) return 'Untitled Document'
  return base.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 60)
}

export function parseFields(text: string, fileName: string): ParsedFields {
  const fallbackName = nameFromFileName(fileName)
  const type = detectType(text)
  const amount = detectAmount(text)
  const date = chooseDate(detectDates(text))

  return {
    name: detectName(text, fallbackName),
    amount,
    dateISO: date ? date.toISOString() : null,
    typeLabel: type.label,
    factType: type.factType,
    matched: { amount: amount !== null, date: date !== null, type: type.matched },
  }
}
