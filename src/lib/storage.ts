import { BUCKET } from './files'
import { supabase, SUPABASE_KEY, SUPABASE_URL } from './supabase'

export class StorageError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/** Turn a storage failure into something worth showing. */
export function describeStorageError(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (/bucket not found/i.test(message)) return 'File storage is not set up yet (run the Phase 2 migration).'
  if (error instanceof StorageError && error.status === 413) return 'The file is too large for storage.'
  if (/row-level security|unauthorized|403/i.test(message)) return 'Storage refused the upload (permissions).'
  if (/network/i.test(message) || !navigator.onLine) return 'Check your connection and try again.'
  return 'Please try again.'
}

const encodePath = (path: string) => path.split('/').map(encodeURIComponent).join('/')

/**
 * Upload one object straight to Supabase Storage so we get upload progress
 * (supabase-js's upload() doesn't report it). Never overwrites.
 */
export async function uploadObject(
  path: string,
  body: Blob,
  contentType: string,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<void> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new StorageError('Not signed in', 401)
  signal.throwIfAborted()
  return xhrUpload(
    'POST',
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(path)}`,
    { Authorization: `Bearer ${token}` },
    body,
    contentType,
    onProgress,
    signal,
  )
}

/**
 * Upload with a one-time upload token from the `receive` function (used by
 * guests, who aren't signed in). The token only allows this exact path.
 */
export function uploadWithToken(
  path: string,
  uploadToken: string,
  body: Blob,
  contentType: string,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<void> {
  const url = `${SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/${encodePath(path)}?token=${encodeURIComponent(uploadToken)}`
  return xhrUpload('PUT', url, {}, body, contentType, onProgress, signal)
}

function xhrUpload(
  method: 'POST' | 'PUT',
  url: string,
  headers: Record<string, string>,
  body: Blob,
  contentType: string,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<void> {
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, url)
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value)
    xhr.setRequestHeader('apikey', SUPABASE_KEY)
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.setRequestHeader('Content-Type', contentType || 'application/octet-stream')
    xhr.setRequestHeader('cache-control', 'max-age=3600')
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve()
      let message = `Upload failed (${xhr.status})`
      try {
        const parsed = JSON.parse(xhr.responseText) as { message?: string; error?: string }
        message = parsed.message ?? parsed.error ?? message
      } catch {
        // Not JSON; keep the generic message.
      }
      reject(new StorageError(message, xhr.status))
    }
    xhr.onerror = () => reject(new StorageError('Network error', 0))
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'))
    signal.addEventListener('abort', () => xhr.abort(), { once: true })
    xhr.send(body)
  })
}

/** Fetch a URL into a Blob, reporting progress against `expectedBytes` if the server doesn't say. */
export async function fetchWithProgress(
  url: string,
  expectedBytes: number,
  onProgress: (fraction: number) => void,
): Promise<Blob> {
  const response = await fetch(url)
  if (!response.ok || !response.body) throw new StorageError(`Download failed (${response.status})`, response.status)
  const total = Number(response.headers.get('content-length')) || expectedBytes
  const reader = response.body.getReader()
  const chunks: BlobPart[] = []
  let loaded = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.byteLength
    if (total > 0) onProgress(Math.min(1, loaded / total))
  }
  return new Blob(chunks, { type: response.headers.get('content-type') ?? '' })
}

/** Hand a Blob to the browser as a download with the given file name. */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/**
 * Short-lived signed URL for a private object. With `downloadAs`, opening the
 * URL downloads the file under that name instead of displaying it.
 */
export async function signedUrl(path: string, seconds: number, downloadAs?: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, seconds, downloadAs ? { download: downloadAs } : undefined)
  if (error) throw error
  return data.signedUrl
}

const thumbUrls = new Map<string, { url: string; expires: number }>()

/** Signed thumbnail URL, cached so scrolling the list doesn't re-sign every image. */
export async function thumbnailUrl(path: string): Promise<string> {
  const cached = thumbUrls.get(path)
  if (cached && cached.expires > Date.now() + 5 * 60_000) return cached.url
  const url = await signedUrl(path, 3600)
  thumbUrls.set(path, { url, expires: Date.now() + 3600_000 })
  return url
}

/** Supabase Free plan file storage (project-wide). */
export const FREE_STORAGE_BYTES = 1024 ** 3

/** How much of the file bucket you're using, from Storage's own records. */
export async function getStorageUsed(): Promise<{ bytes: number; files: number }> {
  const { data, error } = await supabase.rpc('beam_storage_used')
  if (error) throw new Error(error.message)
  const row = (Array.isArray(data) ? data[0] : data) as { bytes: number | string; files: number } | undefined
  return { bytes: Number(row?.bytes ?? 0), files: Number(row?.files ?? 0) }
}

/** Best-effort removal of storage objects (anything missed is swept by the cleanup job). */
export async function removeObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  await supabase.storage.from(BUCKET).remove(paths)
}

/** A small JPEG preview (max `size` px), or null if the browser can't decode the image. */
export async function createThumbnail(file: Blob, size = 320): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#ffffff' // JPEG has no transparency
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.75))
  } catch {
    return null
  }
}
