import { useCallback, useEffect, useState } from 'react'
import { useFileDrop } from '../hooks/useFileDrop'
import { useOpenItem, useShareIntake } from '../hooks/useIntents'
import { useItems, type Connection } from '../hooks/useItems'
import { useOnline } from '../hooks/useOnline'
import { useUploads } from '../hooks/useUploads'
import { syncPush } from '../lib/push'
import { formatRelative } from '../lib/time'
import type { Device, Item } from '../lib/types'
import { Composer } from './Composer'
import { ItemCard } from './ItemCard'
import { Settings } from './Settings'
import { useToast } from './Toast'
import { UploadList } from './UploadList'
import { Button, Logo, Page } from './ui'

const CONNECTION_LABEL: Record<Connection, string> = {
  connecting: 'Connecting…',
  live: 'Live',
  offline: 'Offline – reconnecting',
}
const CONNECTION_DOT: Record<Connection, string> = {
  connecting: 'bg-amber-400',
  live: 'bg-emerald-500',
  offline: 'bg-red-500',
}

/** Re-render every `ms` so "5 min ago" labels stay current. */
function useNow(ms: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(timer)
  }, [ms])
  return now
}

interface Props {
  userId: string
  device: Device
  onRename: (name: string) => Promise<void>
}

export function Home({ userId, device, onRename }: Props) {
  const { items, deviceNames, loaded, loadError, connection, freshIds, markFresh, retry, sendText, addItem, deleteItem, toggleKeep } =
    useItems(userId, device.id)
  const { notify, view: toast } = useToast()
  const { uploads, addFiles, cancel } = useUploads({ userId, deviceId: device.id, onItem: addItem, notify })
  const dragging = useFileDrop(addFiles)
  const online = useOnline()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const now = useNow(30_000)

  useShareIntake(sendText, addFiles, notify)
  useOpenItem(items, markFresh)

  // Keep this device's push subscription current if notifications are already on.
  useEffect(() => {
    syncPush(device.id).catch(() => {})
  }, [device.id])

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        notify('Copied')
      } catch {
        notify("Couldn't copy: the browser blocked clipboard access.", 'error')
      }
    },
    [notify],
  )

  const remove = useCallback(
    async (item: Item) => {
      try {
        await deleteItem(item)
      } catch {
        notify("Couldn't delete. Check your connection and try again.", 'error')
      }
    },
    [deleteItem, notify],
  )

  const keep = useCallback(
    async (item: Item) => {
      try {
        await toggleKeep(item)
        notify(item.kept ? 'No longer kept: expires in 24 hours' : 'Kept: won’t expire')
      } catch {
        notify("Couldn't change Keep. Check your connection and try again.", 'error')
      }
    },
    [toggleKeep, notify],
  )

  const sourceLabel = (sourceId: string | null) => {
    if (sourceId === device.id) return 'This device'
    return (sourceId && deviceNames[sourceId]) || 'Unknown device'
  }

  return (
    <Page>
      <header className="mb-4 flex items-center gap-2.5">
        <Logo />
        <div className="flex-1">
          <h1 className="text-lg leading-tight font-semibold">Beam</h1>
          <p className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <span className={`h-2 w-2 rounded-full ${CONNECTION_DOT[connection]}`} aria-hidden />
            {CONNECTION_LABEL[connection]}
          </p>
        </div>
        <Button variant="ghost" onClick={() => setSettingsOpen((v) => !v)} aria-expanded={settingsOpen}>
          {device.name}
          <span aria-hidden>{settingsOpen ? '▴' : '▾'}</span>
        </Button>
      </header>

      {!online && (
        <div
          role="status"
          className="mb-4 rounded-xl bg-amber-100 px-3.5 py-2.5 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200"
        >
          You're offline. Sending won't work until you reconnect; anything sent meanwhile will appear then.
        </div>
      )}

      {settingsOpen && (
        <Settings device={device} onRename={onRename} notify={notify} onClose={() => setSettingsOpen(false)} />
      )}

      <Composer onSend={sendText} onFiles={addFiles} notify={notify} />

      <UploadList uploads={uploads} onCancel={cancel} />

      <section className="mt-6 flex-1">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">Recent</h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Items expire after 24 hours unless kept</p>
        </div>

        {loadError && (
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:bg-red-950/60 dark:text-red-300">
            <span className="flex-1">{loadError}</span>
            <Button variant="secondary" size="sm" onClick={retry}>
              Try again
            </Button>
          </div>
        )}

        {!loaded && !loadError ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : loaded && items.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                source={sourceLabel(item.source_device_id)}
                time={formatRelative(item.created_at, now)}
                fresh={freshIds.has(item.id)}
                onCopy={copy}
                onDelete={remove}
                onToggleKeep={keep}
                notify={notify}
              />
            ))}
          </ul>
        )}
      </section>

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-indigo-600/15 p-6 backdrop-blur-sm">
          <div className="rounded-2xl border-2 border-dashed border-indigo-500 bg-white/90 px-8 py-6 text-center text-lg font-medium text-indigo-700 dark:bg-zinc-900/90 dark:text-indigo-300">
            Drop files to send
          </div>
        </div>
      )}

      {toast}
    </Page>
  )
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
      <p className="font-medium text-zinc-700 dark:text-zinc-300">Nothing here yet</p>
      <p className="mt-1">Paste text or a link, or pick files above. They'll show up on your other devices instantly.</p>
      <p className="mt-3 text-xs pointer-fine:hidden">
        Tip: in any Android app, tap <strong>Share</strong> and choose <strong>Beam</strong>.
      </p>
      <p className="mt-3 hidden text-xs pointer-fine:block">
        Tip: drag files onto this window, or press <kbd className="font-sans font-semibold">Ctrl+Enter</kbd> to send
        text.
      </p>
    </div>
  )
}
