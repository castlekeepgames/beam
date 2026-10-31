// Plain TypeScript (no Deno APIs) so Vitest can test it too.

export interface PreviewItem {
  kind: string
  content: string | null
  file_name: string | null
}

const MAX_BODY = 120

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`
}

/** Title and body for the push notification of a new item. */
export function notificationFor(item: PreviewItem, sourceName: string | null): { title: string; body: string } {
  const title = `From ${sourceName ?? 'another device'}`
  if (item.kind === 'file') return { title, body: `File: ${truncate(item.file_name ?? 'file', MAX_BODY - 6)}` }
  const text = (item.content ?? '').replace(/\s+/g, ' ').trim()
  if (item.kind === 'link') return { title, body: truncate(text, MAX_BODY) }
  return { title, body: truncate(text, MAX_BODY) || '(empty)' }
}
