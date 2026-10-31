import { useCallback, useEffect, useRef, useState } from 'react'
import type { Notify } from '../components/Toast'
import { canThumbnail, fileSizeProblem, MAX_FILE_BYTES, formatBytes, objectPaths } from '../lib/files'
import { createThumbnail, describeStorageError, isAbortError, removeObjects, uploadObject } from '../lib/storage'
import { supabase } from '../lib/supabase'
import { ITEM_COLUMNS, type Item } from '../lib/types'

export interface Upload {
  key: string
  name: string
  size: number
  progress: number
  status: 'waiting' | 'uploading' | 'finishing'
}

interface Job {
  upload: Upload
  file: File
  controller: AbortController
  /** Device this file is for (null = all devices), fixed when it was added. */
  target: string | null
}

interface Deps {
  userId: string
  deviceId: string
  /** Current "To:" choice; captured per file when it's added (null = all devices). */
  targetDeviceId: string | null
  onItem: (item: Item) => void
  notify: Notify
}

/**
 * Uploads files one at a time with progress. Each file becomes an item row
 * only after its upload (and thumbnail) has finished.
 */
export function useUploads(deps: Deps) {
  const [uploads, setUploads] = useState<Upload[]>([])
  const queue = useRef<Job[]>([])
  const active = useRef<Job | null>(null)
  const depsRef = useRef(deps)
  useEffect(() => {
    depsRef.current = deps
  })

  const patch = useCallback((key: string, change: Partial<Upload>) => {
    setUploads((cur) => cur.map((u) => (u.key === key ? { ...u, ...change } : u)))
  }, [])
  const drop = useCallback((key: string) => {
    setUploads((cur) => cur.filter((u) => u.key !== key))
  }, [])

  const sendOne = useCallback(
    async ({ upload, file, controller, target }: Job) => {
      const { userId, deviceId, onItem, notify } = depsRef.current
      const itemId = crypto.randomUUID()
      const { filePath, thumbPath } = objectPaths(userId, itemId, file.name)
      const uploaded: string[] = []
      try {
        patch(upload.key, { status: 'uploading' })
        await uploadObject(filePath, file, file.type, (p) => patch(upload.key, { progress: p }), controller.signal)
        uploaded.push(filePath)
        patch(upload.key, { status: 'finishing', progress: 1 })

        let thumb: string | null = null
        if (canThumbnail(file.type)) {
          const preview = await createThumbnail(file)
          if (preview) {
            try {
              await uploadObject(thumbPath, preview, 'image/jpeg', () => {}, controller.signal)
              uploaded.push(thumbPath)
              thumb = thumbPath
            } catch (error) {
              if (isAbortError(error)) throw error // otherwise: send without a thumbnail
            }
          }
        }

        controller.signal.throwIfAborted()
        const { data, error } = await supabase
          .from('items')
          .insert({
            id: itemId,
            kind: 'file',
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type || null,
            thumb_path: thumb,
            source_device_id: deviceId,
            target_device_id: target,
          })
          .select(ITEM_COLUMNS)
          .single()
        if (error) throw new Error(error.message)
        onItem(data)
        notify(`Sent ${file.name}`)
      } catch (error) {
        void removeObjects(uploaded).catch(() => {})
        if (isAbortError(error)) notify(`Cancelled ${file.name}`)
        else notify(`Couldn't send "${file.name}". ${describeStorageError(error)}`, 'error')
      } finally {
        drop(upload.key)
      }
    },
    [patch, drop],
  )

  const pump = useCallback(async () => {
    if (active.current) return
    for (let job = queue.current.shift(); job; job = queue.current.shift()) {
      active.current = job
      await sendOne(job)
    }
    active.current = null
  }, [sendOne])

  const addFiles = useCallback(
    (files: File[]) => {
      const { notify } = depsRef.current
      const tooBig = files.filter((f) => fileSizeProblem(f))
      if (tooBig.length === 1) notify(fileSizeProblem(tooBig[0])!, 'error')
      else if (tooBig.length > 1)
        notify(`${tooBig.length} files are over ${formatBytes(MAX_FILE_BYTES)} and were skipped.`, 'error')

      const jobs = files
        .filter((f) => !fileSizeProblem(f))
        .map<Job>((file) => ({
          file,
          controller: new AbortController(),
          target: depsRef.current.targetDeviceId,
          upload: { key: crypto.randomUUID(), name: file.name, size: file.size, progress: 0, status: 'waiting' },
        }))
      if (jobs.length === 0) return
      queue.current.push(...jobs)
      setUploads((cur) => [...cur, ...jobs.map((j) => j.upload)])
      void pump()
    },
    [pump],
  )

  const cancel = useCallback(
    (key: string) => {
      if (active.current?.upload.key === key) {
        active.current.controller.abort() // sendOne cleans up and removes the row
        return
      }
      queue.current = queue.current.filter((job) => job.upload.key !== key)
      drop(key)
    },
    [drop],
  )

  return { uploads, addFiles, cancel }
}
