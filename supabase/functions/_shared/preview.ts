// Plain TypeScript (no Deno APIs) so Vitest can test it too.
import { isSafeHttpUrl } from './links.ts'

export interface PreviewItem {
  kind: string
  content: string | null
  file_name: string | null
  /** Sent by someone else through a Receive code. */
  from_guest?: boolean
}

const MAX_BODY = 120

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`
}

/** Title and body for the push notification of a new item. */
export function notificationFor(item: PreviewItem, sourceName: string | null): { title: string; body: string } {
  const title = item.from_guest ? 'From a guest' : `From ${sourceName ?? 'another device'}`
  if (item.kind === 'file') return { title, body: `File: ${truncate(item.file_name ?? 'file', MAX_BODY - 6)}` }
  const text = (item.content ?? '').replace(/\s+/g, ' ').trim()
  if (item.kind === 'link') return { title, body: truncate(text, MAX_BODY) }
  return { title, body: truncate(text, MAX_BODY) || '(empty)' }
}

export interface PushPayload {
  title: string
  body: string
  itemId: string
  kind: string
  /** For links: shown as an "Open link" button on the notification. */
  url?: string
}

/** Everything the service worker needs to show the notification. */
export function notificationPayload(item: PreviewItem & { id: string }, sourceName: string | null): PushPayload {
  const { title, body } = notificationFor(item, sourceName)
  const payload: PushPayload = { title, body, itemId: item.id, kind: item.kind }
  if (item.kind === 'link' && item.content && isSafeHttpUrl(item.content)) payload.url = item.content
  return payload
}