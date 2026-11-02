import { useEffect, useState } from 'react'
import { thumbnailUrl } from '../lib/storage'

/** Signed URL for an item's thumbnail, or null while loading / if there is none. */
export function useThumbnail(path: string | null) {
  const [loaded, setLoaded] = useState<{ path: string; url: string } | null>(null)
  useEffect(() => {
    if (!path) return
    let cancelled = false
    thumbnailUrl(path)
      .then((url) => {
        if (!cancelled) setLoaded({ path, url })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [path])
  return loaded && loaded.path === path ? loaded.url : null
}
