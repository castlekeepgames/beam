import { useState, type FormEvent } from 'react'
import { cleanDeviceName, MAX_DEVICE_NAME, suggestDeviceName } from '../lib/device'
import { inputClass } from './styles'
import { Button, CenteredCard } from './ui'

export function DeviceSetup({ onSave }: { onSave: (name: string) => Promise<void> }) {
  const [name, setName] = useState(() => suggestDeviceName(navigator.userAgent))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const clean = cleanDeviceName(name)
    if (!clean) {
      setError('Give this device a name.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSave(clean)
    } catch {
      setError("Couldn't save. Check your connection and try again.")
      setBusy(false)
    }
  }

  return (
    <CenteredCard title="Name this device">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          Your other devices will show this name next to things you send from here.
        </p>
        <input
          className={inputClass}
          aria-label="Device name"
          maxLength={MAX_DEVICE_NAME}
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy} className="mt-2">
          {busy ? 'Saving…' : 'Continue'}
        </Button>
      </form>
    </CenteredCard>
  )
}
