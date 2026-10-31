import { useEffect, useState, type FormEvent } from 'react'
import { cleanDeviceName, MAX_DEVICE_NAME } from '../lib/device'
import { disablePush, enablePush, getPushState, type PushState } from '../lib/push'
import { formatBytes } from '../lib/files'
import { FREE_STORAGE_BYTES, getStorageUsed } from '../lib/storage'
import { supabase } from '../lib/supabase'
import { formatRelative } from '../lib/time'
import type { Device, DeviceInfo } from '../lib/types'
import type { Notify } from './Toast'
import { inputClass } from './styles'
import { Button } from './ui'

interface Props {
  device: Device
  devices: DeviceInfo[]
  onRename: (name: string) => Promise<void>
  onRemoveDevice: (id: string) => Promise<void>
  onClearAll: (includeKept: boolean) => Promise<number>
  notify: Notify
  onClose: () => void
}

export function Settings({ device, devices, onRename, onRemoveDevice, onClearAll, notify, onClose }: Props) {
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
    <section className="mb-4 flex flex-col gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
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

      <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <NotificationSettings deviceId={device.id} notify={notify} />
      </div>

      <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <DeviceList devices={devices} thisDeviceId={device.id} onRemove={onRemoveDevice} notify={notify} />
      </div>

      <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <StorageSettings onClearAll={onClearAll} notify={notify} />
      </div>

      <div className="flex justify-end border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <Button variant="danger" onClick={signOut}>
          Sign out of this device
        </Button>
      </div>
    </section>
  )
}

function DeviceList({
  devices,
  thisDeviceId,
  onRemove,
  notify,
}: {
  devices: DeviceInfo[]
  thisDeviceId: string
  onRemove: (id: string) => Promise<void>
  notify: Notify
}) {
  const [removing, setRemoving] = useState<string | null>(null)
  const [now] = useState(() => Date.now())

  async function remove(d: DeviceInfo) {
    const ok = window.confirm(
      `Remove "${d.name}"?\n\nIt stops getting notifications and disappears from this list. Its items stay. If that device is still in use, it will ask for a name next time it opens Beam.`,
    )
    if (!ok) return
    setRemoving(d.id)
    try {
      await onRemove(d.id)
      notify(`Removed ${d.name}`)
    } catch {
      notify("Couldn't remove the device. Check your connection and try again.", 'error')
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Your devices</p>
      <ul className="flex flex-col gap-1.5">
        {devices.map((d) => (
          <li key={d.id} className="flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm">
                <span className="truncate font-medium">{d.name}</span>
                {d.id === thisDeviceId && (
                  <span className="shrink-0 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 uppercase dark:bg-indigo-950 dark:text-indigo-300">
                    This device
                  </span>
                )}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Last seen {formatRelative(d.last_seen, now)} · Notifications {d.has_push ? 'on' : 'off'}
              </p>
            </div>
            {d.id !== thisDeviceId && (
              <Button variant="danger" size="sm" onClick={() => remove(d)} disabled={removing === d.id}>
                Remove
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function StorageSettings({
  onClearAll,
  notify,
}: {
  onClearAll: (includeKept: boolean) => Promise<number>
  notify: Notify
}) {
  const [usage, setUsage] = useState<{ bytes: number; files: number } | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [includeKept, setIncludeKept] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    getStorageUsed()
      .then((u) => {
        if (!cancelled) setUsage(u)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [refresh])

  async function clear() {
    setBusy(true)
    try {
      const count = await onClearAll(includeKept)
      notify(count === 0 ? 'Nothing to delete' : `Deleted ${count} item${count === 1 ? '' : 's'}`)
      setConfirming(false)
      setRefresh((n) => n + 1)
    } catch {
      notify("Couldn't delete. Check your connection and try again.", 'error')
    } finally {
      setBusy(false)
    }
  }

  const fraction = usage ? Math.min(1, usage.bytes / FREE_STORAGE_BYTES) : 0

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">Storage</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {usage
            ? `${formatBytes(usage.bytes)} of ${formatBytes(FREE_STORAGE_BYTES)} · ${usage.files} file${usage.files === 1 ? '' : 's'}`
            : 'Checking…'}
        </p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full ${fraction > 0.8 ? 'bg-amber-500' : 'bg-indigo-500'}`}
          style={{ width: `${Math.max(fraction > 0 ? 1 : 0, Math.round(fraction * 100))}%` }}
        />
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Files are deleted automatically 24 hours after they're sent, unless kept.
      </p>

      {!confirming ? (
        <div className="flex justify-end">
          <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
            Clear all…
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950/60 dark:text-red-200">
          <p>Delete every item and file on all your devices? This can't be undone.</p>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={includeKept} onChange={(e) => setIncludeKept(e.target.checked)} />
            Also delete kept items
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" className="bg-red-600! hover:bg-red-500!" onClick={clear} disabled={busy}>
              {busy ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

const isWindows = /Windows/i.test(navigator.userAgent)

function NotificationSettings({ deviceId, notify }: { deviceId: string; notify: Notify }) {
  const [state, setState] = useState<PushState | 'loading'>('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    getPushState()
      .then((s) => {
        if (!cancelled) setState(s)
      })
      .catch(() => {
        if (!cancelled) setState('off')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Permission is only ever requested from this tap, never on page load.
  async function toggle() {
    setBusy(true)
    try {
      const next = state === 'on' ? await disablePush(deviceId) : await enablePush(deviceId)
      setState(next)
      if (next === 'on') notify('Notifications on for this device')
      else if (next === 'blocked') notify('Notifications are blocked. Allow them in the site settings.', 'error')
    } catch {
      notify("Couldn't change notifications. Check your connection and try again.", 'error')
    } finally {
      setBusy(false)
    }
  }

  const description: Record<PushState | 'loading', string> = {
    loading: 'Checking…',
    unsupported: "This browser can't show notifications from Beam.",
    blocked: 'Blocked. Allow notifications for this site in your browser settings, then reopen Beam.',
    off: 'Get a notification when something arrives and Beam is closed.',
    on: "On. You'll be notified about items sent from your other devices.",
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Notifications</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{description[state]}</p>
        </div>
        {(state === 'off' || state === 'on') && (
          <Button variant={state === 'on' ? 'secondary' : 'primary'} onClick={toggle} disabled={busy}>
            {state === 'on' ? 'Turn off' : 'Enable'}
          </Button>
        )}
      </div>
      {isWindows && state === 'on' && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          On Windows, notifications arrive only while Edge or Chrome is running (it can run in the background after
          you close its windows: see docs/SETUP.md).
        </p>
      )}
    </div>
  )
}
