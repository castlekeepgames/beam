/** Image types we take from the clipboard, best first. */
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

/** The best image type on offer, or null. */
export function pickImageType(types: readonly string[]): string | null {
  return IMAGE_TYPES.find((t) => types.includes(t)) ?? null
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "Screenshot 2026-10-31 14-32-05.png", using local time. */
export function screenshotName(mimeType: string, now: Date): string {
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  return `Screenshot ${stamp}.${EXTENSIONS[mimeType] ?? 'png'}`
}

/**
 * Pasted screenshots arrive as "image.png" (or nameless); give them a useful,
 * unique name. Real files keep theirs.
 */
export function nameForPastedFile(file: File, now: Date): File {
  const generic = file.name === '' || /^image\.(png|jpe?g|gif|webp|bmp)$/i.test(file.name)
  if (!generic) return file
  return new File([file], screenshotName(file.type, now), { type: file.type, lastModified: file.lastModified })
}

export type ClipboardContent = { kind: 'text'; text: string } | { kind: 'file'; file: File } | { kind: 'empty' }

export class ClipboardUnavailable extends Error {}

/**
 * Read the clipboard (must be called from a tap or another explicit user
 * action). Images come back as a File, otherwise text.
 */
export async function readClipboard(now = new Date()): Promise<ClipboardContent> {
  if (navigator.clipboard?.read) {
    let items: ClipboardItems | null = null
    try {
      items = await navigator.clipboard.read()
    } catch (err) {
      // Permission refused: don't ask a second time through readText().
      if (err instanceof DOMException && err.name === 'NotAllowedError') throw err
    }
    if (items) {
      for (const item of items) {
        const type = pickImageType(item.types)
        if (type) {
          const blob = await item.getType(type)
          return { kind: 'file', file: new File([blob], screenshotName(type, now), { type }) }
        }
      }
      for (const item of items) {
        if (item.types.includes('text/plain')) {
          const text = await (await item.getType('text/plain')).text()
          return text ? { kind: 'text', text } : { kind: 'empty' }
        }
      }
      return { kind: 'empty' }
    }
  }
  if (!navigator.clipboard?.readText) throw new ClipboardUnavailable()
  const text = await navigator.clipboard.readText()
  return text ? { kind: 'text', text } : { kind: 'empty' }
}

/** Whether we may read the clipboard without a prompt (so a launch shortcut can just do it). */
export async function clipboardReadGranted(): Promise<boolean> {
  try {
    const status = await navigator.permissions.query({ name: 'clipboard-read' as PermissionName })
    return status.state === 'granted'
  } catch {
    return false // e.g. Firefox doesn't know this permission
  }
}
