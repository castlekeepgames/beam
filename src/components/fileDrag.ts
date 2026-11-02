import type { DragEvent, HTMLAttributes } from 'react'
import { prepareDownloadUrl, readyDownloadUrl } from '../lib/storage'
import type { Item } from '../lib/types'

// Dragging out only makes sense with a mouse (Chrome/Edge on a computer).
const canDragOut = typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches

/**
 * Props that let a file be dragged out of Beam onto the desktop or into a
 * folder, saving the real file (not the thumbnail). Chrome's `DownloadURL`
 * drag needs the link at the moment the drag starts, so it's signed as soon
 * as the mouse moves over the file.
 */
export function fileDragProps(item: Item): HTMLAttributes<HTMLElement> {
  const path = item.file_path
  if (!canDragOut || !path) return {}
  // "type:name:url": a colon in the name would end it early.
  const name = (item.file_name ?? 'download').replace(/:/g, '_')
  const prepare = () => void prepareDownloadUrl(path, name).catch(() => {})
  return {
    draggable: true,
    title: 'Drag to a folder or the desktop to save it',
    onPointerEnter: prepare,
    onDragStart: (event: DragEvent<HTMLElement>) => {
      const url = readyDownloadUrl(path, name)
      if (!url) {
        event.preventDefault() // link not ready yet (rare); a second try will work
        prepare()
        return
      }
      event.dataTransfer.effectAllowed = 'copy'
      event.dataTransfer.setData('DownloadURL', `${item.mime_type || 'application/octet-stream'}:${name}:${url}`)
    },
  }
}
