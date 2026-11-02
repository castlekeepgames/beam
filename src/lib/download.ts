import { fetchWithProgress, saveBlob, signedUrl, StorageError } from './storage'
import type { Item } from './types'

/** Characters Windows (and Android's Downloads) won't accept in a file name. */
// oxlint-disable-next-line no-control-regex
const UNSAFE_NAME = /[\\/:*?"<>|\u0000-\u001f]/g

/** "photo.jpg" -> "photo.jpg", "photo (1).jpg", "photo (2).jpg"… with unsafe characters replaced. */
export function numberedName(fileName: string, n: number): string {
  const safe = fileName.replace(UNSAFE_NAME, '_').trim() || 'download'
  if (n === 0) return safe
  const dot = safe.lastIndexOf('.')
  return dot > 0 ? `${safe.slice(0, dot)} (${n})${safe.slice(dot)}` : `${safe} (${n})`
}

/** Download one file item through a short-lived signed URL. */
export async function downloadFile(item: Item, onProgress: (fraction: number) => void): Promise<void> {
  if (!item.file_path) throw new StorageError('No file', 404)
  const url = await signedUrl(item.file_path, 60)
  const blob = await fetchWithProgress(url, item.file_size ?? 0, onProgress)
  saveBlob(blob, item.file_name ?? 'download')
}

type DirectoryPicker = (options?: {
  id?: string
  mode?: 'read' | 'readwrite'
  startIn?: 'downloads' | 'pictures' | 'documents' | 'desktop'
}) => Promise<FileSystemDirectoryHandle>

function directoryPicker(): DirectoryPicker | undefined {
  return (window as Window & { showDirectoryPicker?: DirectoryPicker }).showDirectoryPicker
}

/** Chrome and Edge on a computer can save straight into a folder you pick. */
export function canSaveToFolder(): boolean {
  return typeof directoryPicker() === 'function'
}

/**
 * Ask for a folder to save into (must run straight from a tap or click).
 * Null if cancelled.
 */
export async function pickFolder(photos: boolean): Promise<FileSystemDirectoryHandle | null> {
  const picker = directoryPicker()
  if (!picker) return null
  try {
    return await picker({ id: 'beam-download', mode: 'readwrite', startIn: photos ? 'pictures' : 'downloads' })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null
    throw error
  }
}

/** First name like `fileName` that isn't already in the folder. */
async function freeName(folder: FileSystemDirectoryHandle, fileName: string): Promise<string> {
  for (let n = 0; ; n++) {
    const candidate = numberedName(fileName, n)
    try {
      await folder.getFileHandle(candidate)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotFoundError') return candidate
      if (error instanceof DOMException && error.name === 'TypeMismatchError') continue // a folder by that name
      throw error
    }
  }
}

/** Stream one file straight to disk (no copy held in memory). */
async function saveToFolder(folder: FileSystemDirectoryHandle, item: Item, onProgress: (fraction: number) => void) {
  if (!item.file_path) throw new StorageError('No file', 404)
  const response = await fetch(await signedUrl(item.file_path, 300))
  if (!response.ok || !response.body) throw new StorageError(`Download failed (${response.status})`, response.status)
  const total = Number(response.headers.get('content-length')) || item.file_size || 0
  const handle = await folder.getFileHandle(await freeName(folder, item.file_name ?? 'download'), { create: true })
  const writable = await handle.createWritable()
  let loaded = 0
  const counter = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      loaded += chunk.byteLength
      if (total > 0) onProgress(Math.min(1, loaded / total))
      controller.enqueue(chunk)
    },
  })
  await response.body.pipeThrough(counter).pipeTo(writable)
}

export interface BatchProgress {
  /** 1-based number of the file being downloaded. */
  current: number
  total: number
  /** Overall progress by size, 0–1. */
  fraction: number
}

/**
 * Download every file, one after another. With a folder, each file is written
 * straight into it; without one, each goes to the browser's downloads.
 * Keeps going past failures and reports which files didn't make it.
 */
export async function downloadAll(
  items: Item[],
  folder: FileSystemDirectoryHandle | null,
  onProgress: (progress: BatchProgress) => void,
): Promise<{ saved: number; failed: string[] }> {
  const files = items.filter((i) => i.file_path)
  const totalBytes = files.reduce((sum, i) => sum + (i.file_size ?? 0), 0) || 1
  let doneBytes = 0
  let saved = 0
  const failed: string[] = []
  for (const [index, item] of files.entries()) {
    const size = item.file_size ?? 0
    const report = (fraction: number) =>
      onProgress({ current: index + 1, total: files.length, fraction: Math.min(1, (doneBytes + fraction * size) / totalBytes) })
    report(0)
    try {
      if (folder) await saveToFolder(folder, item, report)
      else {
        await downloadFile(item, report)
        // Give the browser a moment between downloads so it doesn't drop any.
        await new Promise((resolve) => setTimeout(resolve, 400))
      }
      saved++
    } catch {
      failed.push(item.file_name ?? 'file')
    }
    doneBytes += size
  }
  return { saved, failed }
}
