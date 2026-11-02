import { useCallback, useEffect, useRef, useState } from 'react'
import { signedUrl } from '../lib/storage'
import type { Item } from '../lib/types'
import { fileDragProps } from './fileDrag'
import { Button } from './ui'

const SWIPE_PX = 50

type Loaded = { path: string; url: string } | { path: string; failed: true }

/**
 * Full-screen view of one or more photos, each loaded through a short-lived
 * signed URL. With several: arrows, ← → keys, or swipe to move between them.
 */
export function PhotoViewer({
  photos,
  start,
  onDownload,
  onClose,
}: {
  photos: Item[]
  start: number
  onDownload: (item: Item) => void
  onClose: () => void
}) {
  const [index, setIndex] = useState(start)
  const photo = photos[Math.min(index, photos.length - 1)]
  const path = photo?.file_path ?? null
  const name = photo?.file_name ?? 'Photo'
  const many = photos.length > 1
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const swipeFrom = useRef<number | null>(null)

  const go = useCallback(
    (step: number) => setIndex((i) => (Math.min(i, photos.length - 1) + step + photos.length) % photos.length),
    [photos.length],
  )

  useEffect(() => {
    if (!path) return
    let cancelled = false
    signedUrl(path, 600)
      .then((url) => {
        if (!cancelled) setLoaded({ path, url })
      })
      .catch(() => {
        if (!cancelled) setLoaded({ path, failed: true })
      })
    return () => {
      cancelled = true
    }
  }, [path])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && many) go(-1)
      else if (e.key === 'ArrowRight' && many) go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, go, many])

  if (!photo) return null
  const current = loaded && loaded.path === path ? loaded : null
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation()
  const arrowClass =
    'absolute top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-2xl leading-none text-white hover:bg-black/70 pointer-coarse:hidden'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={name}
      className="fixed inset-0 z-50 flex flex-col bg-black/95 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      onClick={onClose}
    >
      <div className="flex items-center gap-2 p-3 text-white" onClick={stop}>
        <p className="min-w-0 flex-1 truncate text-sm">
          {name}
          {many && <span className="ml-2 text-zinc-400">{`${Math.min(index, photos.length - 1) + 1} of ${photos.length}`}</span>}
        </p>
        <Button size="sm" variant="secondary" onClick={() => onDownload(photo)}>
          Download
        </Button>
        <Button size="sm" variant="ghost" className="text-white! hover:bg-white/10!" onClick={onClose} aria-label="Close">
          ✕
        </Button>
      </div>
      <div
        className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center p-2"
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse') swipeFrom.current = e.clientX
        }}
        onPointerUp={(e) => {
          const from = swipeFrom.current
          swipeFrom.current = null
          if (from === null || !many) return
          const dx = e.clientX - from
          if (Math.abs(dx) > SWIPE_PX) go(dx < 0 ? 1 : -1)
        }}
      >
        {!current && <p className="text-sm text-zinc-400">Loading…</p>}
        {current && 'failed' in current && (
          <p className="text-sm text-zinc-400">Couldn't load the photo. Check your connection.</p>
        )}
        {current && 'url' in current && (
          <div className="flex max-h-full max-w-full" onClick={stop} {...fileDragProps(photo)}>
            <img
              src={current.url}
              alt={name}
              draggable={false}
              className="max-h-[calc(100dvh-6rem)] max-w-full object-contain"
              onError={() => setLoaded({ path: current.path, failed: true })}
            />
          </div>
        )}
        {many && (
          <>
            <button
              type="button"
              className={`${arrowClass} left-3`}
              onClick={(e) => {
                stop(e)
                go(-1)
              }}
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button
              type="button"
              className={`${arrowClass} right-3`}
              onClick={(e) => {
                stop(e)
                go(1)
              }}
              aria-label="Next photo"
            >
              ›
            </button>
          </>
        )}
      </div>
    </div>
  )
}
