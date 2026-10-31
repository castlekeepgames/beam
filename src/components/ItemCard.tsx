import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { extensionLabel, formatBytes } from '../lib/files'
import { isSafeHttpUrl } from '../lib/links'
import { describeStorageError, fetchWithProgress, saveBlob, signedUrl, thumbnailUrl } from '../lib/storage'
import type { Item } from '../lib/types'
import type { Notify } from './Toast'
import { buttonClass } from './styles'
import { Button } from './ui'
import { ProgressBar } from './UploadList'

// Only loaded when someone taps "QR", keeping the encoder out of the main bundle.
const QrDialog = lazy(() => import('./QrDialog'))

const LONG_TEXT_CHARS = 400
const LONG_TEXT_LINES = 6

interface Props {
  item: Item
  source: string
  time: string
  fresh: boolean
  onCopy: (text: string) => void
  onDelete: (item: Item) => void
  onToggleKeep: (item: Item) => void
  notify: Notify
}

export function ItemCard({ item, source, time, fresh, onCopy, onDelete, onToggleKeep, notify }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const closeQr = useCallback(() => setShowQr(false), [])
  const content = item.content ?? ''
  const isFile = item.kind === 'file'
  const isLink = item.kind === 'link' && isSafeHttpUrl(content)
  const isLong = content.length > LONG_TEXT_CHARS || content.split('\n').length > LONG_TEXT_LINES
  const download = useDownload(item, notify)

  return (
    <li
      id={`item-${item.id}`}
      className={`scroll-mt-4 rounded-2xl bg-white p-3.5 ring-1 transition-shadow duration-700 dark:bg-zinc-900 ${
        fresh ? 'ring-2 ring-indigo-500 shadow-md shadow-indigo-500/20' : 'ring-zinc-200 dark:ring-zinc-800'
      }`}
    >
      <p className="mb-1.5 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        <span>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{source}</span> · {time}
        </span>
        {item.kept && (
          <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-indigo-700 uppercase dark:bg-indigo-950 dark:text-indigo-300">
            Kept
          </span>
        )}
      </p>

      {isFile ? (
        <FileSummary item={item} />
      ) : isLink ? (
        <a
          href={content}
          target="_blank"
          rel="noopener noreferrer"
          className="block break-all text-indigo-600 underline decoration-indigo-300 underline-offset-2 dark:text-indigo-400"
        >
          {content}
        </a>
      ) : (
        <>
          <p className={`break-words whitespace-pre-wrap ${isLong && !expanded ? 'line-clamp-6' : ''}`}>{content}</p>
          {isLong && (
            <button
              type="button"
              className="mt-1 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </>
      )}

      {download.progress !== null && (
        <div className="mt-2.5">
          <ProgressBar value={download.progress} />
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {isFile && (
          <Button size="sm" onClick={download.start} disabled={download.progress !== null}>
            {download.progress === null ? 'Download' : `Downloading ${Math.round(download.progress * 100)}%`}
          </Button>
        )}
        {isLink && (
          <a href={content} target="_blank" rel="noopener noreferrer" className={buttonClass('primary', '', 'sm')}>
            Open
          </a>
        )}
        {!isFile && (
          <Button size="sm" variant={isLink ? 'secondary' : 'primary'} onClick={() => onCopy(content)}>
            Copy
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowQr(true)}
          aria-label="Show QR code"
          title="Show a QR code to scan with another phone"
        >
          QR
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          onClick={() => onToggleKeep(item)}
          aria-pressed={item.kept}
          title={item.kept ? 'Let this item expire normally' : 'Stop this item from expiring'}
        >
          {item.kept ? 'Unkeep' : 'Keep'}
        </Button>
        <Button size="sm" variant="danger" onClick={() => onDelete(item)} aria-label="Delete item">
          Delete
        </Button>
      </div>

      {showQr && (
        <Suspense fallback={null}>
          <QrDialog item={item} onClose={closeQr} />
        </Suspense>
      )}
    </li>
  )
}

function FileSummary({ item }: { item: Item }) {
  const thumb = useThumbnail(item.thumb_path)
  const name = item.file_name ?? 'File'
  return (
    <div className="flex items-center gap-3">
      {thumb ? (
        <img src={thumb} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-zinc-100 object-cover dark:bg-zinc-800" />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
          {extensionLabel(name)}
        </div>
      )}
      <div className="min-w-0">
        <p className="line-clamp-2 font-medium break-all">{name}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatBytes(item.file_size ?? 0)}</p>
      </div>
    </div>
  )
}

/** Signed URL for an item's thumbnail, or null while loading / if there is none. */
function useThumbnail(path: string | null) {
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

/** Download via a short-lived signed URL, with progress. */
function useDownload(item: Item, notify: Notify) {
  const [progress, setProgress] = useState<number | null>(null)

  async function start() {
    if (!item.file_path || progress !== null) return
    const name = item.file_name ?? 'download'
    setProgress(0)
    try {
      const url = await signedUrl(item.file_path, 60)
      const blob = await fetchWithProgress(url, item.file_size ?? 0, setProgress)
      saveBlob(blob, name)
      notify(`Downloaded ${name}`)
    } catch (error) {
      notify(`Couldn't download "${name}". ${describeStorageError(error)}`, 'error')
    } finally {
      setProgress(null)
    }
  }

  return { progress, start }
}
