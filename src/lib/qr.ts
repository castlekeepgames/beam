import type { Item } from './types'

/** Longer than this and phone cameras struggle to read the code off a screen. */
export const QR_MAX_CHARS = 600

/** How long a file's QR download link works. */
export const FILE_QR_SECONDS = 15 * 60

export type QrAvailability = 'ok' | 'too-long' | 'none'

/** Whether an item can be shown as a QR code. */
export function qrAvailability(item: Pick<Item, 'kind' | 'content' | 'file_path'>): QrAvailability {
  if (item.kind === 'file') return item.file_path ? 'ok' : 'none'
  const text = item.content ?? ''
  if (text === '') return 'none'
  return text.length <= QR_MAX_CHARS ? 'ok' : 'too-long'
}

/**
 * SVG path for the dark modules of a QR matrix, one sub-path per horizontal
 * run (much smaller than one <rect> per module). Coordinates are in modules.
 */
export function qrPath(modules: boolean[][]): string {
  let path = ''
  modules.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      if (!row[x]) {
        x++
        continue
      }
      const start = x
      while (x < row.length && row[x]) x++
      path += `M${start} ${y}h${x - start}v1h${start - x}z`
    }
  })
  return path
}

/** "14:05" style countdown; never negative. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
