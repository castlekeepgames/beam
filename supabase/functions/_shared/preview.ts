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

interface BatchFile {
  file_name: string | null
  mime_type: string | null
}

/** "3 photos", "2 videos", "4 photos and videos" or "5 files". */
export function batchLabel(files: Pick<BatchFile, 'mime_type'>[]): string {
  const n = files.length
  const all = (pattern: RegExp) => files.every((f) => pattern.test(f.mime_type ?? ''))
  if (all(/^image\//)) return n === 1 ? '1 photo' : `${n} photos`
  if (all(/^video\//)) return n === 1 ? '1 video' : `${n} videos`
  if (all(/^(image|video)\//)) return `${n} photos and videos`
  return n === 1 ? '1 file' : `${n} files`
}

export interface PushPayload {
  title: string
  body: string
  itemId: string
  kind: string
  /** For links: shown as an "Open link" button on the notification. */
  url?: string
  /** Notifications with the same tag replace each other (one per batch). */
  tag?: string
}

/**
 * Everything the service worker needs to show the notification. For a file in
 * a batch, pass the batch so far: the notification sums it up and replaces the
 * previous one for the same batch.
 */
export function notificationPayload(
  item: PreviewItem & { id: string },
  sourceName: string | null,
  batch?: { id: string; files: BatchFile[] } | null,
): PushPayload {
  const { title, body } = notificationFor(item, sourceName)
  const payload: PushPayload = { title, body, itemId: item.id, kind: item.kind }
  if (item.kind === 'link' && item.content && isSafeHttpUrl(item.content)) payload.url = item.content
  if (batch) {
    payload.tag = `batch-${batch.id}`
    if (batch.files.length > 1) {
      const names = batch.files.map((f) => f.file_name ?? 'file').join(', ')
      payload.body = truncate(`${batchLabel(batch.files)}: ${names}`, MAX_BODY)
    }
  }
  return payload
}