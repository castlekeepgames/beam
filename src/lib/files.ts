import { MAX_FILE_BYTES } from '../../supabase/functions/_shared/names'

// Shared with the Edge Functions so guest uploads are named the same way.
export { BUCKET, MAX_FILE_BYTES, objectPaths, safeObjectName } from '../../supabase/functions/_shared/names'
export { batchLabel } from '../../supabase/functions/_shared/preview'

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

/** Image types the browser can reliably decode for a thumbnail. */
export function canThumbnail(mimeType: string): boolean {
  return /^image\/(jpeg|png|webp|gif|bmp|avif)$/i.test(mimeType)
}

/** Image types every browser can show full-size (HEIC, for example, can't). */
export function canViewImage(mimeType: string): boolean {
  return /^image\/(jpeg|png|webp|gif|bmp|avif|svg\+xml)$/i.test(mimeType)
}

/** Short label for the file icon, e.g. "PDF", "ZIP". */
export function extensionLabel(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  const ext = dot > 0 ? fileName.slice(dot + 1) : ''
  return ext && ext.length <= 4 ? ext.toUpperCase() : 'FILE'
}
