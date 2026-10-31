import type { Item } from './types'

/** Longer than this and phone cameras struggle to read the code off a screen. */
export const QR_MAX_CHARS = 600

/** How long a file's QR download link works. */
export const FILE_QR_SECONDS = 15 * 60

/** Hash prefix for the shared-text page: <base>#t=<base64url UTF-8 text>. */
const TEXT_HASH = '#t='

export type QrAvailability = 'ok' | 'too-long' | 'none'

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(base64)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

/**
 * Phone scanners handle raw-text QR codes inconsistently (some try to hand the
 * text to another app), but every scanner opens web links. So text is encoded
 * as a link to Beam's shared-text page, with the text after the `#`, which
 * browsers never send to a server.
 */
export function textViewUrl(text: string, baseUrl: string): string {
  return `${baseUrl}${TEXT_HASH}${bytesToBase64Url(new TextEncoder().encode(text))}`
}

/** The text from a shared-text link's hash, or null if this isn't one (or it's corrupt). */
export function readSharedText(hash: string): string | null {
  if (!hash.startsWith(TEXT_HASH)) return null
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(base64UrlToBytes(hash.slice(TEXT_HASH.length)))
  } catch {
    return null
  }
}

/** What an item's QR code encodes: the link itself, or a shared-text page link. */
export function qrValue(item: Pick<Item, 'kind' | 'content'>, baseUrl: string): string {
  const content = item.content ?? ''
  return item.kind === 'link' ? content : textViewUrl(content, baseUrl)
}

/** Whether an item can be shown as a QR code. */
export function qrAvailability(item: Pick<Item, 'kind' | 'content' | 'file_path'>, baseUrl: string): QrAvailability {
  if (item.kind === 'file') return item.file_path ? 'ok' : 'none'
  if (!item.content) return 'none'
  return qrValue(item, baseUrl).length <= QR_MAX_CHARS ? 'ok' : 'too-long'
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
