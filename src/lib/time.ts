/** Short "how long ago" label for list items, e.g. "just now", "5 min ago", "3 h ago". */
export function formatRelative(iso: string, now = Date.now()): string {
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return ''
  const seconds = Math.max(0, Math.round((now - then) / 1000))
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return new Date(then).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}
