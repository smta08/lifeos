// Real Gmail scan — runs in the browser using the user's read-only OAuth token.
// We fetch message metadata + snippet, derive facts in memory, and discard the
// raw email. Nothing raw is ever sent to our server (honors "never persist raw").

import {
  Tv, Music, ShoppingCart, Cloud, Sparkles, Youtube, Film, Box, Palette, Mail,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { FactType } from '@/domain/fact'
import { parseFields } from '@/features/docs/extract'

export interface GmailMatch {
  id: string
  name: string
  amount: number | null
  dateISO: string | null
  factType: FactType
  icon: LucideIcon
  color: string
  sender: string
  subject: string
}

export class GmailScopeError extends Error {}
export class GmailAuthError extends Error {}

// Known senders → brand identity. Matched against the From header (case-insensitive).
const BRANDS: { re: RegExp; name: string; icon: LucideIcon; color: string; type: FactType }[] = [
  { re: /netflix\.com/i,            name: 'Netflix',      icon: Tv,           color: '#E50914', type: 'subscription' },
  { re: /spotify\.com/i,            name: 'Spotify',      icon: Music,        color: '#1DB954', type: 'subscription' },
  { re: /amazon\.[a-z.]+/i,         name: 'Amazon',       icon: ShoppingCart, color: '#FF9900', type: 'subscription' },
  { re: /(apple|icloud)\.com/i,     name: 'Apple',        icon: Cloud,        color: '#3B82F6', type: 'subscription' },
  { re: /adobe\.com/i,              name: 'Adobe',        icon: Palette,      color: '#FF3366', type: 'subscription' },
  { re: /youtube\.com|youtube/i,    name: 'YouTube',      icon: Youtube,      color: '#FF0000', type: 'subscription' },
  { re: /disney(plus)?\.com/i,      name: 'Disney+',      icon: Sparkles,     color: '#6366F1', type: 'subscription' },
  { re: /(hbomax|max)\.com/i,       name: 'HBO Max',      icon: Film,         color: '#A855F7', type: 'subscription' },
  { re: /dropbox\.com/i,            name: 'Dropbox',      icon: Box,          color: '#2563EB', type: 'subscription' },
]

// Gmail search query: recent receipt/subscription-shaped mail, capped to 1 year.
const QUERY = [
  'newer_than:1y',
  '(',
  'subject:(receipt OR invoice OR subscription OR renewal OR "payment" OR "your plan" OR membership)',
  'OR from:(netflix.com OR spotify.com OR amazon.com OR apple.com OR adobe.com OR youtube.com OR disneyplus.com OR dropbox.com)',
  ')',
].join(' ')

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me/messages'
const MAX_MESSAGES = 40

interface ListResponse {
  messages?: { id: string }[]
}
interface MessageResponse {
  id: string
  snippet?: string
  payload?: { headers?: { name: string; value: string }[] }
}

function header(msg: MessageResponse, name: string): string {
  return msg.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

// "Display Name <user@host>" → { display, email }
function parseFrom(from: string): { display: string; email: string } {
  const m = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/)
  if (m) return { display: m[1].trim(), email: m[2].trim() }
  return { display: from.trim(), email: from.trim() }
}

function brandFor(from: string, display: string): { name: string; icon: LucideIcon; color: string; type: FactType } {
  for (const b of BRANDS) {
    if (b.re.test(from)) return { name: b.name, icon: b.icon, color: b.color, type: b.type }
  }
  // Unknown sender: use the display name (or domain) as the title.
  const name = display || from.split('@')[1]?.split('.')[0] || 'Subscription'
  return {
    name: name.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 40),
    icon: Mail,
    color: '#52525B',
    type: 'subscription',
  }
}

async function gapi<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (res.status === 401) throw new GmailAuthError('Session expired')
  if (res.status === 403) throw new GmailScopeError('Missing Gmail read permission')
  if (!res.ok) throw new Error(`Gmail API error ${res.status}`)
  return res.json() as Promise<T>
}

export interface ScanCallbacks {
  onListed?: (count: number) => void
  onProgress?: (done: number, total: number) => void
}

export async function fetchGmailSuggestions(
  token: string,
  cb: ScanCallbacks = {},
): Promise<GmailMatch[]> {
  const list = await gapi<ListResponse>(
    `${GMAIL_API}?maxResults=${MAX_MESSAGES}&q=${encodeURIComponent(QUERY)}`,
    token,
  )
  const ids = (list.messages ?? []).map((m) => m.id)
  cb.onListed?.(ids.length)
  if (ids.length === 0) return []

  const detailUrl = (id: string) =>
    `${GMAIL_API}/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`

  let done = 0
  const messages = await Promise.all(
    ids.map(async (id) => {
      const msg = await gapi<MessageResponse>(detailUrl(id), token)
      cb.onProgress?.(++done, ids.length)
      return msg
    }),
  )

  // Build matches, then dedupe by brand (prefer an entry that has an amount).
  const byName = new Map<string, GmailMatch>()
  for (const msg of messages) {
    const from = header(msg, 'From')
    const subject = header(msg, 'Subject')
    const { display, email } = parseFrom(from)
    const brand = brandFor(from, display)

    // Reuse the document parser over subject + snippet for amount/date.
    const parsed = parseFields(`${subject}\n${msg.snippet ?? ''}`, brand.name)

    const match: GmailMatch = {
      id: msg.id,
      name: brand.name,
      amount: parsed.amount,
      dateISO: parsed.dateISO,
      factType: brand.type,
      icon: brand.icon,
      color: brand.color,
      sender: email,
      subject: subject || '(no subject)',
    }

    const key = match.name.toLowerCase()
    const existing = byName.get(key)
    if (!existing || (existing.amount === null && match.amount !== null)) {
      byName.set(key, match)
    }
  }

  return Array.from(byName.values())
}
