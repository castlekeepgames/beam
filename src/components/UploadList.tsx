import type { Upload } from '../hooks/useUploads'
import { formatBytes } from '../lib/files'
import { Button } from './ui'

const STATUS: Record<Upload['status'], string> = {
  waiting: 'Waiting…',
  uploading: 'Uploading',
  finishing: 'Finishing…',
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
      <div
        className="h-full rounded-full bg-indigo-500 transition-[width] duration-200"
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
  )
}

export function UploadList({ uploads, onCancel }: { uploads: Upload[]; onCancel: (key: string) => void }) {
  if (uploads.length === 0) return null
  return (
    <section className="mt-4" aria-label="Uploads">
      <ul className="flex flex-col gap-2">
        {uploads.map((u) => (
          <li key={u.key} className="rounded-2xl bg-white p-3 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
            <div className="mb-2 flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.name}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {formatBytes(u.size)} · {STATUS[u.status]}
                  {u.status === 'uploading' && ` ${Math.round(u.progress * 100)}%`}
                </p>
              </div>
              <Button variant="ghost" className="py-1.5" onClick={() => onCancel(u.key)}>
                Cancel
              </Button>
            </div>
            <ProgressBar value={u.progress} />
          </li>
        ))}
      </ul>
    </section>
  )
}
