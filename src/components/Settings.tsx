import { useEffect, useState, type FormEvent } from 'react'
import { cleanDeviceName, MAX_DEVICE_NAME } from '../lib/device'
import { disablePush, enablePush, getPushState, type PushState } from '../lib/push'
import { supabase } from '../lib/supabase'
import type { Device } from '../lib/types'
import type { Notify } from './Toast'
import { inputClass } from './styles'
import { Button } from './ui'

interface Props {
  device: Device
  onRename: (name: string) => Promise<void>
  notify: Notify
  onClose: () => void
}

export function Settings({ device, onRename, notify, onClose }: Props) {
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

      <div className="flex justify-end border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <Button variant="danger" onClick={signOut}>
          Sign out of this device
        </Button>
      </div>
    </section>
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
