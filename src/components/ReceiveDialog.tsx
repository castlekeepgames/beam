// Loaded lazily (React.lazy) so the QR encoder isn't part of the main bundle.
import { useEffect, useRef, useState } from 'react'
import { formatCountdown } from '../lib/qr'
import {
  createReceiveCode,
  RECEIVE_MAX_ITEMS,
  receiveUrl,
  stopReceiveCode,
  type ReceiveCode,
} from '../lib/receive'
import { appBaseUrl } from '../lib/url'
import { QrCode } from './QrCode'
import { Button } from './ui'

type CodeState = { status: 'loading' } | { status: 'ready'; code: ReceiveCode } | { status: 'error' }

interface Props {
  /** Items guests have sent since the dialog opened (counted by Home from the live list). */
  received: number
  onClose: () => void
}

/**
 * Shows a Receive QR code. The code exists only while this dialog is open:
 * closing it (or "New code") stops the old one straight away.
 */
export default function ReceiveDialog({ received, onClose }: Props) {
  const [state, setState] = useState<CodeState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const closeButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let cancelled = false
    let createdId: string | null = null
    createReceiveCode()
      .then((code) => {
        if (cancelled) return void stopReceiveCode(code.id)
        createdId = code.id
        setState({ status: 'ready', code })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' })
      })
    return () => {
      cancelled = true
      if (createdId) void stopReceiveCode(createdId)
    }
  }, [attempt])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    closeButton.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function newCode() {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }

  const remaining = state.status === 'ready' ? Date.parse(state.code.expiresAt) - now : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Receive from someone"
        className="flex max-h-full w-full max-w-sm flex-col items-center gap-3 overflow-y-auto rounded-2xl bg-white p-5 text-zinc-900 shadow-xl sm:max-w-lg dark:bg-zinc-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Receive from someone</h2>

        {state.status === 'loading' && <p className="py-10 text-sm text-zinc-500">Making a code…</p>}

        {state.status === 'error' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
            <p>Couldn't make a Receive code. Check your connection.</p>
            <Button size="sm" onClick={newCode}>
              Try again
            </Button>
          </div>
        )}

        {state.status === 'ready' && remaining <= 0 && (
          <div className="flex flex-col items-center gap-3 py-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
            <p>This code has expired.</p>
            <Button size="sm" onClick={newCode}>
              New code
            </Button>
          </div>
        )}

        {state.status === 'ready' && remaining > 0 && (
          <>
            <QrCode value={receiveUrl(state.code.token, appBaseUrl())} />
            <p className="text-center text-sm text-zinc-600 dark:text-zinc-300">
              Ask them to scan this with their phone camera. They'll get a page to send you text or files, with no app
              or sign-in.
            </p>
            <p className="text-center text-sm">
              Works for <span className="font-semibold tabular-nums">{formatCountdown(remaining)}</span> · up to{' '}
              {RECEIVE_MAX_ITEMS} items
              {received > 0 && (
                <>
                  {' '}
                  ·{' '}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {received} received
                  </span>
                </>
              )}
            </p>
            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
              Anyone who scans it can send you things until it expires or you close this. They can't see anything in
              your Beam.
            </p>
          </>
        )}

        <Button ref={closeButton} variant="secondary" className="w-full" onClick={onClose}>
          {state.status === 'ready' && remaining > 0 ? 'Stop receiving' : 'Close'}
        </Button>
      </div>
    </div>
  )
}
