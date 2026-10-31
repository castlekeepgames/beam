// Hand-off for Android's share sheet, used by both the service worker (which
// receives the share POST) and the app (which sends it). Works in window and
// worker scopes: only the Cache API, Response, File and FormData are used.

const CACHE = 'beam-share'
const META = '/__beam-share/meta'

export interface SharedPayload {
  title: string
  text: string
  url: string
  files: File[]
}

interface StashedMeta {
  title: string
  text: string
  url: string
  files: { key: string; name: string; type: string }[]
}

const field = (form: FormData, name: string) => {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

/** Service worker: store a share-target POST until the app picks it up. */
export async function stashShare(form: FormData): Promise<void> {
  await caches.delete(CACHE) // only ever one pending share
  const cache = await caches.open(CACHE)
  const files = form.getAll('files').filter((f): f is File => f instanceof File && f.name !== '')
  const meta: StashedMeta = {
    title: field(form, 'title'),
    text: field(form, 'text'),
    url: field(form, 'url'),
    files: [],
  }
  for (const [i, file] of files.entries()) {
    const key = `/__beam-share/file/${i}`
    await cache.put(key, new Response(file, { headers: { 'Content-Type': file.type || 'application/octet-stream' } }))
    meta.files.push({ key, name: file.name, type: file.type })
  }
  await cache.put(META, new Response(JSON.stringify(meta), { headers: { 'Content-Type': 'application/json' } }))
}

/** App: take (and clear) the pending share, if any. */
export async function takeShare(): Promise<SharedPayload | null> {
  if (typeof caches === 'undefined') return null
  const cache = await caches.open(CACHE)
  const metaResponse = await cache.match(META)
  if (!metaResponse) return null
  const meta = (await metaResponse.json()) as StashedMeta
  const files: File[] = []
  for (const f of meta.files) {
    const response = await cache.match(f.key)
    if (response) files.push(new File([await response.blob()], f.name, { type: f.type }))
  }
  await caches.delete(CACHE)
  return { title: meta.title, text: meta.text, url: meta.url, files }
}
