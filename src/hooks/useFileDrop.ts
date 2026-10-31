import { useEffect, useRef, useState } from 'react'
import { nameForPastedFile } from '../lib/clipboard'

const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false

/** Drag files anywhere onto the window (desktop). Returns whether files are being dragged over. */
export function useFileDrop(onFiles: (files: File[]) => void) {
  const [dragging, setDragging] = useState(false)
  const depth = useRef(0)
  const onFilesRef = useRef(onFiles)
  useEffect(() => {
    onFilesRef.current = onFiles
  })

  useEffect(() => {
    const enter = (event: DragEvent) => {
      if (!hasFiles(event)) return
      depth.current++
      setDragging(true)
    }
    const leave = (event: DragEvent) => {
      if (!hasFiles(event)) return
      depth.current = Math.max(0, depth.current - 1)
      if (depth.current === 0) setDragging(false)
    }
    const over = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault() // allow dropping
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
    }
    const drop = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault() // don't let the browser open the file
      depth.current = 0
      setDragging(false)
      const files = Array.from(event.dataTransfer?.files ?? [])
      if (files.length) onFilesRef.current(files)
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('dragover', over)
      window.removeEventListener('drop', drop)
    }
  }, [])

  return dragging
}

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

/**
 * Ctrl+V of a screenshot or copied files anywhere on the page (desktop) sends
 * them. Pastes into text fields are left alone (the Composer handles its own).
 */
export function usePastedFiles(onFiles: (files: File[]) => void) {
  const onFilesRef = useRef(onFiles)
  useEffect(() => {
    onFilesRef.current = onFiles
  })

  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      if (isEditable(event.target)) return
      const files = Array.from(event.clipboardData?.files ?? [])
      if (files.length === 0) return
      event.preventDefault()
      const now = new Date()
      onFilesRef.current(files.map((f) => nameForPastedFile(f, now)))
    }
    window.addEventListener('paste', paste)
    return () => window.removeEventListener('paste', paste)
  }, [])
}