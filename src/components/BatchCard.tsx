import { useCallback, useState } from 'react'
import { useThumbnail } from '../hooks/useThumbnail'
import { canSaveToFolder, downloadAll, downloadFile, pickFolder } from '../lib/download'
import { batchLabel, canViewImage, extensionLabel, formatBytes } from '../lib/files'
import { describeStorageError } from '../lib/storage'
import type { Item } from '../lib/types'
import { fileDragProps } from './fileDrag'
import { CardMeta, CardShell } from './ItemCard'
import { PhotoViewer } from './PhotoViewer'
import type { Notify } from './Toast'
import { Button } from './ui'
import { ProgressBar } from './UploadList'

interface Props {
  id: string
  /** The batch's files, in the order they were sent. */
  items: Item[]
  source: string
  target: string | null
  time: string
  fresh: boolean
  onDelete: (items: Item[]) => void
  onSetKept: (items: Item[], kept: boolean) => void
  notify: Notify
}

/** Several files sent together: one card with a grid of files and Download all. */
export function BatchCard({ id, items, source, target, time, fresh, onDelete, onSetKept, notify }: Props) {
  const [progress, setProgress] = useState<{ label: string; value: number } | null>(null)
  const [viewing, setViewing] = useState<number | null>(null)
  const closeViewer = useCallback(() => setViewing(null), [])
  const photos = items.filter((i) => i.file_path && canViewImage(i.mime_type ?? ''))
  const allKept = items.every((i) => i.kept)
  const totalBytes = items.reduce((sum, i) => sum + (i.file_size ?? 0), 0)
  const allPhotos = items.every((i) => (i.mime_type ?? '').startsWith('image/'))

  async function downloadOne(item: Item) {
    if (progress) return
    const name = item.file_name ?? 'download'
    setProgress({ label: `Downloading ${name}`, value: 0 })
    try {
      await downloadFile(item, (value) => setProgress({ label: `Downloading ${name}`, value }))
      notify(`Downloaded ${name}`)
    } catch (error) {
      notify(`Couldn't download "${name}". ${describeStorageError(error)}`, 'error')
    } finally {
      setProgress(null)
    }
  }

  /**
   * Download all: normal browser downloads (your Downloads folder, like any
   * other download). "Save to folder…" (Chrome/Edge on a computer) writes them
   * straight into a folder you pick instead.
   */
  async function downloadEverything(toFolder: boolean) {
    if (progress) return
    let folder: FileSystemDirectoryHandle | null = null
    if (toFolder) {
      try {
        folder = await pickFolder(allPhotos)
      } catch {
        notify("Couldn't use that folder. Try Download all instead.", 'error')
        return
      }
      if (!folder) return // cancelled
    }
    setProgress({ label: 'Starting…', value: 0 })
    try {
      const { saved, failed } = await downloadAll(items, folder, (p) =>
        setProgress({ label: `Downloading ${p.current} of ${p.total}`, value: p.fraction }),
      )
      if (failed.length > 0) {
        notify(`Saved ${saved} of ${items.length}. Couldn't download: ${failed.join(', ')}`, 'error')
      } else {
        notify(folder ? `Saved ${saved} files to “${folder.name}”` : `Downloaded ${saved} files`)
      }
    } catch (error) {
      notify(`Couldn't download the files. ${describeStorageError(error)}`, 'error')
    } finally {
      setProgress(null)
    }
  }

  return (
    <CardShell id={`batch-${id}`} fresh={fresh}>
      <CardMeta source={source} target={target} time={time} kept={allKept} />
      <p className="mb-2 font-medium">
        {batchLabel(items)} <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">· {formatBytes(totalBytes)}</span>
      </p>

      <ul className="grid grid-cols-4 gap-1.5 sm:grid-cols-6" aria-label="Files">
        {items.map((item) => {
          const photoIndex = photos.indexOf(item)
          return (
            <BatchTile
              key={item.id}
              item={item}
              onOpen={() => (photoIndex >= 0 ? setViewing(photoIndex) : void downloadOne(item))}
            />
          )
        })}
      </ul>

      {progress && (
        <div className="mt-2.5">
          <p className="mb-1 truncate text-xs text-zinc-500 dark:text-zinc-400">{`${progress.label} · ${Math.round(progress.value * 100)}%`}</p>
          <ProgressBar value={progress.value} />
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Button size="sm" onClick={() => void downloadEverything(false)} disabled={progress !== null}>
          {`Download all (${items.length})`}
        </Button>
        {canSaveToFolder() && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void downloadEverything(true)}
            disabled={progress !== null}
            title="Save every file straight into a folder you pick (Chrome won't allow Downloads or Desktop themselves, so pick or make a folder inside them)"
          >
            Save to folder…
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          onClick={() => onSetKept(items, !allKept)}
          aria-pressed={allKept}
          title={allKept ? 'Let these files expire normally' : 'Stop these files from expiring'}
        >
          {allKept ? 'Unkeep' : 'Keep'}
        </Button>
        <Button size="sm" variant="danger" onClick={() => onDelete(items)} aria-label="Delete all files in this batch">
          Delete all
        </Button>
      </div>

      {viewing !== null && photos.length > 0 && (
        <PhotoViewer photos={photos} start={viewing} onDownload={downloadOne} onClose={closeViewer} />
      )}
    </CardShell>
  )
}

/** One square in the batch grid: a thumbnail, or the file type and name. */
function BatchTile({ item, onOpen }: { item: Item; onOpen: () => void }) {
  const thumb = useThumbnail(item.thumb_path)
  const name = item.file_name ?? 'File'
  const viewable = canViewImage(item.mime_type ?? '')
  const drag = fileDragProps(item)
  return (
    <li id={`item-${item.id}`} className="scroll-mt-24">
      <button
        type="button"
        {...drag}
        className="flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-lg bg-indigo-50 text-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:bg-indigo-950 dark:text-indigo-300"
        onClick={onOpen}
        aria-label={viewable ? `View ${name}` : `Download ${name}`}
        title={`${name} (${formatBytes(item.file_size ?? 0)})${drag.title ? `\n${drag.title}` : ''}`}
      >
        {thumb ? (
          <img src={thumb} alt="" draggable={false} className="h-full w-full object-cover" />
        ) : (
          <>
            <span className="text-xs font-bold">{extensionLabel(name)}</span>
            <span className="mt-0.5 line-clamp-2 px-1 text-center text-[10px] leading-tight break-all text-zinc-600 dark:text-zinc-300">
              {name}
            </span>
          </>
        )}
      </button>
    </li>
  )
}
