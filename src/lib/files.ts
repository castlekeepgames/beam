/** 50 MB: the Supabase Free plan's per-file maximum (also enforced by the bucket and the DB). */
export const MAX_FILE_BYTES = 50 * 1024 * 1024

export const BUCKET = 'files'

const UNITS = ['B', 'KB', 'MB', 'GB']

/** Human-readable size: "512 B", "12 KB", "3.4 MB". */
export function formatBytes(bytes: number): string {
  let value = Math.max(0, bytes)
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit++
  }
  const rounded = unit === 0 || value >= 10 ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded} ${UNITS[unit]}`
}

/** Friendly reason a file can't be sent, or null if it's fine. */
export function fileSizeProblem(file: { name: string; size: number }): string | null {
  if (file.size <= MAX_FILE_BYTES) return null
  return `"${file.name}" is ${formatBytes(file.size)}. Beam's limit is ${formatBytes(MAX_FILE_BYTES)} per file.`
}

/**
 * Storage only accepts a limited character set in object names, so store a
 * cleaned-up name (the original goes in items.file_name). Keeps the extension.
 */
export function safeObjectName(fileName: string, maxLength = 100): string {
  const ascii = fileName
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
  const ext = ascii.match(/\.[A-Za-z0-9]{1,9}$/)?.[0] ?? ''
  const stem = ascii
    .slice(0, ascii.length - ext.length)
    .replace(/^[._]+/, '') // no hidden files or "../"
    .slice(0, maxLength - ext.length)
    .replace(/[._]+$/, '')
  return (stem || 'file') + ext
}

/** Object paths for an item: <user>/<item>/<name> and <user>/<item>/thumb.jpg. */
export function objectPaths(userId: string, itemId: string, fileName: string) {
  const folder = `${userId}/${itemId}`
  return { filePath: `${folder}/${safeObjectName(fileName)}`, thumbPath: `${folder}/thumb.jpg` }
}

/** Image types the browser can reliably decode for a thumbnail. */
export function canThumbnail(mimeType: string): boolean {
  return /^image\/(jpeg|png|webp|gif|bmp|avif)$/i.test(mimeType)
}

/** Short label for the file icon, e.g. "PDF", "ZIP". */
export function extensionLabel(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  const ext = dot > 0 ? fileName.slice(dot + 1) : ''
  return ext && ext.length <= 4 ? ext.toUpperCase() : 'FILE'
}
