import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useFileDrop, usePastedFiles } from '../hooks/useFileDrop'
import { useLaunchAction, useOpenItem, useShareIntake } from '../hooks/useIntents'
import { useItems, type Connection } from '../hooks/useItems'
import { useOnline } from '../hooks/useOnline'
import { useUploads } from '../hooks/useUploads'
import { ClipboardUnavailable, clipboardReadGranted, readClipboard, type ClipboardContent } from '../lib/clipboard'
import { syncPush } from '../lib/push'
import { matchesSearch } from '../lib/search'
import { formatRelative } from '../lib/time'
import type { Device, Item } from '../lib/types'
import { Composer } from './Composer'
import { ItemCard } from './ItemCard'
import { Settings } from './Settings'
import { useToast } from './Toast'
import { inputClass } from './styles'
import { UploadList } from './UploadList'
import { Button, Logo, Page } from './ui'

// Only loaded when someone taps Receive (it includes the QR encoder).
const ReceiveDialog = lazy(() => import('./ReceiveDialog'))

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
  const {
    items,
    devices,
    deviceNames,
    loaded,
    loadError,
    connection,
    freshIds,
    markFresh,
    retry,
    sendText: sendTextTo,
    addItem,
    deleteItem,
    toggleKeep,
    clearAll,
    removeDevice,
  } = useItems(userId, device.id)
  const { notify, view: toast } = useToast()

  // "To:" picker. Falls back to all devices if the chosen one is removed.
  const otherDevices = useMemo(() => devices.filter((d) => d.id !== device.id), [devices, device.id])
  const [chosenTarget, setChosenTarget] = useState<string | null>(null)
  const target = chosenTarget && otherDevices.some((d) => d.id === chosenTarget) ? chosenTarget : null
  const sendText = useCallback((text: string) => sendTextTo(text, target), [sendTextTo, target])

  const [search, setSearch] = useState('')

  const { uploads, addFiles, cancel } = useUploads({
    userId,
    deviceId: device.id,
    targetDeviceId: target,
    onItem: addItem,
    notify,
  })
  const dragging = useFileDrop(addFiles)
  usePastedFiles(addFiles)
  const online = useOnline()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [receiveOpenedAt, setReceiveOpenedAt] = useState<number | null>(null)
  const now = useNow(30_000)

  useShareIntake(sendText, addFiles, notify)
  useOpenItem(items, markFresh)

  // "Send clipboard": text is sent as-is, an image as a file.
  const [clipboardPrompt, setClipboardPrompt] = useState(false)
  const sendContent = useCallback(
    async (clip: ClipboardContent) => {
      if (clip.kind === 'empty') return notify('Your clipboard is empty.')
      if (clip.kind === 'file') return addFiles([clip.file])
      try {
        await sendText(clip.text)
        notify('Sent from clipboard ✓')
      } catch {
        notify("Couldn't send. Check your connection and try again.", 'error')
      }
    },
    [sendText, addFiles, notify],
  )
  const sendClipboard = useCallback(async () => {
    setClipboardPrompt(false)
    try {
      await sendContent(await readClipboard())
    } catch (err) {
      notify(
        err instanceof ClipboardUnavailable
          ? "This browser can't read the clipboard."
          : 'Clipboard access was blocked. Allow it in the site settings.',
        'error',
      )
    }
  }, [sendContent, notify])
  // From the app-icon shortcut: send straight away if reading is already allowed
  // (and the window has focus); otherwise ask for one tap. Never a surprise prompt.
  const launchClipboard = useCallback(() => {
    void (async () => {
      if (await clipboardReadGranted()) {
        try {
          return await sendContent(await readClipboard())
        } catch {
          // e.g. the window isn't focused yet; fall through to the one-tap bar
        }
      }
      setClipboardPrompt(true)
    })()
  }, [sendContent])
  const openReceive = useCallback(() => setReceiveOpenedAt(Date.now()), [])
  useLaunchAction(openReceive, launchClipboard)

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

  const sourceLabel = (item: Item) => {
    if (item.from_guest) return 'Guest'
    const sourceId = item.source_device_id
    if (sourceId === device.id) return 'This device'
    return (sourceId && deviceNames[sourceId]) || 'Unknown device'
  }
  const targetLabel = (item: Item) => {
    if (!item.target_device_id) return null
    if (item.target_device_id === device.id) return 'This device'
    return deviceNames[item.target_device_id] ?? 'Another device'
  }

  const shownItems = search.trim()
    ? items.filter((item) =>
        matchesSearch(item, search, [sourceLabel(item), targetLabel(item) ?? ''].filter(Boolean)),
      )
    : items

  // Count guest items that arrive while the Receive dialog is open.
  const receivedSince = receiveOpenedAt
    ? items.filter((i) => i.from_guest && Date.parse(i.created_at) >= receiveOpenedAt - 5000).length
    : 0
  const closeReceive = useCallback(() => setReceiveOpenedAt(null), [])

  return (
    <Page>
      <header className="mb-4 flex items-center gap-1.5">
        <Logo />
        <div className="ml-1 flex-1">
          <h1 className="text-lg leading-tight font-semibold">Beam</h1>
          <p className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <span className={`h-2 w-2 rounded-full ${CONNECTION_DOT[connection]}`} aria-hidden />
            {CONNECTION_LABEL[connection]}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={openReceive}
          title="Show a QR code so someone without Beam can send you text or files"
        >
          Receive
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setSettingsOpen((v) => !v)} aria-expanded={settingsOpen}>
          <span className="max-w-28 truncate sm:max-w-48">{device.name}</span>
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

      {clipboardPrompt && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-indigo-50 px-3.5 py-2.5 text-sm text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
          <span className="flex-1">Send what's on your clipboard?</span>
          <Button size="sm" onClick={sendClipboard}>
            Send clipboard
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setClipboardPrompt(false)} aria-label="Dismiss">
            ✕
          </Button>
        </div>
      )}

      {settingsOpen && (
        <Settings
          device={device}
          devices={devices}
          onRename={onRename}
          onRemoveDevice={removeDevice}
          onClearAll={clearAll}
          notify={notify}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      <Composer
        onSend={sendText}
        onFiles={addFiles}
        notify={notify}
        otherDevices={otherDevices}
        target={target}
        onTarget={setChosenTarget}
      />

      <UploadList uploads={uploads} onCancel={cancel} />

      <section className="mt-6 flex-1">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">Recent</h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Items expire after 24 hours unless kept</p>
        </div>

        {items.length > 0 && (
          <div className="relative mb-3">
            <input
              type="search"
              className={`${inputClass} py-2 pr-9 text-sm`}
              placeholder="Search text, links, file names…"
              aria-label="Search items"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSearch('')
              }}
            />
            {search && (
              <button
                type="button"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md px-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        )}

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
        ) : shownItems.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Nothing matches “{search.trim()}”.
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {shownItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                source={sourceLabel(item)}
                target={targetLabel(item)}
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

      {receiveOpenedAt !== null && (
        <Suspense fallback={null}>
          <ReceiveDialog received={receivedSince} onClose={closeReceive} />
        </Suspense>
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
