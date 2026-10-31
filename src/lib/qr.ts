import type { Item } from './types'

/** Up to this length a code uses medium error correction (easiest to scan). */
export const QR_COMFORT_CHARS = 600

/** Hard cap: beyond this, codes get too dense to read off a screen. */
export const QR_MAX_CHARS = 1000

/** How long a file's QR download link works. */
export const FILE_QR_SECONDS = 15 * 60

/**
 * Shared-text page hashes: <base>#t=<base64url UTF-8 text>, or
 * <base>#z=<base64url deflate-raw of the UTF-8 text> when that's shorter.
 */
const PLAIN = '#t='
const ZIPPED = '#z='

export type QrPayload = { status: 'ok'; value: string } | { status: 'too-long'; length: number } | { status: 'none' }

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(base64)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

async function transform(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream) {
  const out = new Blob([bytes]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

/**
 * Phone scanners handle raw-text QR codes inconsistently (some try to hand the
 * text to another app), but every scanner opens web links. So text is encoded
 * as a link to Beam's shared-text page, with the text after the `#`, which
 * browsers never send to a server. Compressed when that makes it shorter.
 */
export async function textViewUrl(text: string, baseUrl: string): Promise<string> {
  const raw = new TextEncoder().encode(text)
  let hash = PLAIN + bytesToBase64Url(raw)
  if (typeof CompressionStream !== 'undefined') {
    try {
      const zipped = ZIPPED + bytesToBase64Url(await transform(raw, new CompressionStream('deflate-raw')))
      if (zipped.length < hash.length) hash = zipped
    } catch {
      // Keep the uncompressed form.
    }
  }
  return baseUrl + hash
}

/** Is this location hash a shared-text link? (Cheap, synchronous check.) */
export function isSharedTextHash(hash: string): boolean {
  return hash.startsWith(PLAIN) || hash.startsWith(ZIPPED)
}

/** The text from a shared-text link's hash, or null if this isn't one (or it's corrupt). */
export async function readSharedText(hash: string): Promise<string | null> {
  try {
    const decode = (bytes: Uint8Array) => new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    if (hash.startsWith(PLAIN)) return decode(base64UrlToBytes(hash.slice(PLAIN.length)))
    if (hash.startsWith(ZIPPED) && typeof DecompressionStream !== 'undefined') {
      return decode(await transform(base64UrlToBytes(hash.slice(ZIPPED.length)), new DecompressionStream('deflate-raw')))
    }
    return null
  } catch {
    return null
  }
}

/** What a link or text item's QR code encodes, or why it can't have one. */
export async function qrPayload(item: Pick<Item, 'kind' | 'content'>, baseUrl: string): Promise<QrPayload> {
  const content = item.content ?? ''
  if (!content) return { status: 'none' }
  const value = item.kind === 'link' ? content : await textViewUrl(content, baseUrl)
  return value.length <= QR_MAX_CHARS ? { status: 'ok', value } : { status: 'too-long', length: content.length }
}

/** Medium error correction while it fits comfortably; low for long payloads so they stay scannable. */
export function qrErrorCorrection(value: string): 'M' | 'L' {
  return value.length <= QR_COMFORT_CHARS ? 'M' : 'L'
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
