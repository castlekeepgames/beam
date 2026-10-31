import { useCallback, useEffect, useRef, useState } from 'react'
import { fileSizeProblem, formatBytes } from '../lib/files'
import { formatCountdown } from '../lib/qr'
import { callReceive, ReceiveError } from '../lib/receive'
import { isAbortError, uploadWithToken } from '../lib/storage'
import { PickButton } from './Composer'
import { inputClass } from './styles'
import { Button, Logo, Page } from './ui'
import { ProgressBar } from './UploadList'

type CodeState =
  | { status: 'checking' }
  | { status: 'ready'; expiresAt: number; remaining: number }
  | { status: 'gone' }
  | { status: 'offline' }

interface Sent {
  key: string
  label: string
  status: 'sending' | 'sent' | 'failed'
  progress: number | null
  note?: string
}

/**
 * What someone sees after scanning a Receive QR code: send text or files to
 * Beam's owner. Not signed in; the code's token is the only permission, and
 * nothing about the owner is ever shown.
 */
export function GuestSend({ token }: { token: string }) {
  const [code, setCode] = useState<CodeState>({ status: 'checking' })
  const [text, setText] = useState('')
  const [sent, setSent] = useState<Sent[]>([])
  const [now, setNow] = useState(() => Date.now())
  const busy = useRef(false)
  const queue = useRef<File[]>([])

  useEffect(() => {
    let cancelled = false
    callReceive<{ expiresAt: string; remaining: number }>(token, 'check')
      .then((r) => {
        if (!cancelled) setCode({ status: 'ready', expiresAt: Date.parse(r.expiresAt), remaining: r.remaining })
      })
      .catch((err) => {
        if (!cancelled) setCode({ status: err instanceof ReceiveError && err.isGone ? 'gone' : 'offline' })
      })
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const update = useCallback((key: string, change: Partial<Sent>) => {
    setSent((cur) => cur.map((s) => (s.key === key ? { ...s, ...change } : s)))
  }, [])

  /** After each successful send: one fewer item left on the code. */
  const usedOne = useCallback(() => {
    setCode((c) => (c.status === 'ready' ? { ...c, remaining: c.remaining - 1 } : c))
  }, [])

  const handleError = useCallback((key: string, err: unknown) => {
    if (err instanceof ReceiveError && err.isGone) setCode({ status: 'gone' })
    update(key, {
      status: 'failed',
      progress: null,
      note: err instanceof ReceiveError && err.isGone ? 'The code expired' : 'Check your connection and try again',
    })
  }, [update])

  async function sendText() {
    const value = text
    if (value.trim() === '') return
    const key = crypto.randomUUID()
    const preview = value.trim().replace(/\s+/g, ' ')
    setSent((cur) => [{ key, label: preview.length > 60 ? `${preview.slice(0, 59)}…` : preview, status: 'sending', progress: null }, ...cur])
    setText('')
    try {
      await callReceive(token, 'text', { text: value })
      update(key, { status: 'sent' })
      usedOne()
    } catch (err) {
      setText(value) // give it back so nothing is lost
      handleError(key, err)
    }
  }

  async function sendFile(file: File) {
    const key = crypto.randomUUID()
    const label = `${file.name} (${formatBytes(file.size)})`
    const tooBig = fileSizeProblem(file)
    if (tooBig) {
      setSent((cur) => [{ key, label, status: 'failed', progress: null, note: tooBig }, ...cur])
      return
    }
    setSent((cur) => [{ key, label, status: 'sending', progress: 0 }, ...cur])
    try {
      const slot = await callReceive<{ itemId: string; path: string; uploadToken: string }>(token, 'upload', {
        name: file.name,
        size: file.size,
        type: file.type,
      })
      await uploadWithToken(slot.path, slot.uploadToken, file, file.type, (p) => update(key, { progress: p }), new AbortController().signal)
      await callReceive(token, 'finish', { itemId: slot.itemId, name: file.name, type: file.type })
      update(key, { status: 'sent', progress: null })
      usedOne()
    } catch (err) {
      if (isAbortError(err)) return
      handleError(key, err)
    }
  }

  /** Files go one at a time so progress is easy to follow. */
  async function addFiles(files: File[]) {
    queue.current.push(...files)
    if (busy.current) return
    busy.current = true
    for (let file = queue.current.shift(); file; file = queue.current.shift()) await sendFile(file)
    busy.current = false
  }

  const timeLeft = code.status === 'ready' ? code.expiresAt - now : 0
  const usable = code.status === 'ready' && timeLeft > 0 && code.remaining > 0

  return (
    <Page>
      <header className="mb-4 flex items-center gap-2.5">
        <Logo />
        <div>
          <h1 className="text-lg leading-tight font-semibold">Send to Beam</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {code.status === 'ready' && usable
              ? `Code works for ${formatCountdown(timeLeft)} · ${code.remaining} item${code.remaining === 1 ? '' : 's'} left`
              : code.status === 'checking'
                ? 'Checking the code…'
                : ' '}
          </p>
        </div>
      </header>

      {code.status === 'checking' ? null : !usable ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
          {code.status === 'offline' ? (
            <p>Can't reach Beam. Check your connection and reload this page.</p>
          ) : (
            <>
              <p className="font-medium text-zinc-800 dark:text-zinc-100">This code isn't accepting anything now</p>
              <p className="mt-1">It has expired, been stopped, or reached its limit. Ask for a new code.</p>
            </>
          )}
        </div>
      ) : (
        <section className="flex flex-col gap-2">
          <textarea
            className={`${inputClass} min-h-28 resize-y`}
            aria-label="Text or link to send"
            placeholder="Type or paste text or a link…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                void sendText()
              }
            }}
          />
          <div className="flex items-center gap-2">
            <span className="hidden pointer-coarse:contents">
              <PickButton label="Photos" accept="image/*,video/*" onFiles={addFiles} />
            </span>
            <PickButton label="Files…" onFiles={addFiles} />
            <span className="flex-1" />
            <Button onClick={sendText} disabled={text.trim() === ''} className="min-w-20">
              Send
            </Button>
          </div>
        </section>
      )}

      {sent.length > 0 && (
        <ul className="mt-5 flex flex-col gap-2" aria-label="Sent">
          {sent.map((s) => (
            <li key={s.key} className="rounded-xl bg-white p-3 text-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate">{s.label}</span>
                <span
                  className={`shrink-0 text-xs font-medium ${
                    s.status === 'sent'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : s.status === 'failed'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-zinc-500'
                  }`}
                >
                  {s.status === 'sent' ? 'Sent ✓' : s.status === 'failed' ? 'Failed' : s.progress !== null ? `${Math.round(s.progress * 100)}%` : 'Sending…'}
                </span>
              </div>
              {s.status === 'sending' && s.progress !== null && (
                <div className="mt-2">
                  <ProgressBar value={s.progress} />
                </div>
              )}
              {s.note && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{s.note}</p>}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-auto pt-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
        What you send goes straight to the person who showed you this code. This page can't see anything of theirs.
        Files up to 50 MB.
      </p>
    </Page>
  )
}
