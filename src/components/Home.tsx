import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useItems, type Connection } from '../hooks/useItems'
import { cleanDeviceName, MAX_DEVICE_NAME } from '../lib/device'
import { supabase } from '../lib/supabase'
import { formatRelative } from '../lib/time'
import type { Device } from '../lib/types'
import { Composer } from './Composer'
import { ItemCard } from './ItemCard'
import { useToast, type Notify } from './Toast'
import { inputClass } from './styles'
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
  const { items, deviceNames, loaded, loadError, connection, freshIds, sendText, deleteItem } = useItems(userId, device.id)
  const { notify, view: toast } = useToast()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const now = useNow(30_000)

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
    async (id: string) => {
      try {
        await deleteItem(id)
      } catch {
        notify("Couldn't delete. Check your connection and try again.", 'error')
      }
    },
    [deleteItem, notify],
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

      {settingsOpen && (
        <Settings device={device} onRename={onRename} notify={notify} onClose={() => setSettingsOpen(false)} />
      )}

      <Composer onSend={sendText} notify={notify} />

      <section className="mt-6 flex-1">
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          Recent · last 24 hours
        </h2>
        {loadError && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{loadError}</p>}
        {!loaded && !loadError ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Nothing here yet. Send something from this or another device.
          </p>
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
              />
            ))}
          </ul>
        )}
      </section>

      {toast}
    </Page>
  )
}

function Settings({
  device,
  onRename,
  notify,
  onClose,
}: {
  device: Device
  onRename: (name: string) => Promise<void>
  notify: Notify
  onClose: () => void
}) {
  const [name, setName] = useState(device.name)
  const [busy, setBusy] = useState(false)

  async function save(event: FormEvent) {
    event.preventDefault()
    const clean = cleanDeviceName(name)
    if (!clean) return notify('Give this device a name.', 'error')
    setBusy(true)
    try {
      await onRename(clean)
      notify('Device renamed')
      onClose()
    } catch {
      notify("Couldn't rename. Check your connection and try again.", 'error')
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    // 'local' signs out only this device; your other devices stay signed in.
    await supabase.auth.signOut({ scope: 'local' })
  }

  return (
    <section className="mb-4 rounded-2xl bg-white p-3.5 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
      <form onSubmit={save} className="flex flex-col gap-2">
        <label htmlFor="device-name" className="text-sm font-medium">
          This device's name
        </label>
        <div className="flex gap-2">
          <input
            id="device-name"
            className={inputClass}
            maxLength={MAX_DEVICE_NAME}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" disabled={busy}>
            Save
          </Button>
        </div>
      </form>
      <div className="mt-3 flex justify-end border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <Button variant="danger" onClick={signOut}>
          Sign out of this device
        </Button>
      </div>
    </section>
  )
}
