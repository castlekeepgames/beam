// Plain TypeScript shared by the app and the Edge Functions (no Deno or DOM APIs).

/** 50 MB: the Supabase Free plan's per-file maximum (also enforced by the bucket and the DB). */
export const MAX_FILE_BYTES = 50 * 1024 * 1024

export const BUCKET = 'files'

/**
 * Storage only accepts a limited character set in object names, so store a
 * cleaned-up name (the original goes in items.file_name). Keeps the extension.
 */
export function safeObjectName(fileName: string, maxLength = 100): string {
  const ascii = fileName
    .normalize('NFKD')
    .replace(/\p{M}/gu, '') // drop accents left as combining marks by NFKD
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
