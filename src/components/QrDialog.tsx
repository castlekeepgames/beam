// Loaded lazily (React.lazy) so the QR encoder isn't part of the main bundle.
import { useCallback, useEffect, useRef, useState } from 'react'
import { formatBytes } from '../lib/files'
import { FILE_QR_SECONDS, formatCountdown, qrPayload, type QrPayload } from '../lib/qr'
import { signedUrl } from '../lib/storage'
import type { Item } from '../lib/types'
import { appBaseUrl } from '../lib/url'
import { QrCode } from './QrCode'
import { Button } from './ui'

type FileLink = { status: 'loading' } | { status: 'ready'; url: string; expiresAt: number } | { status: 'error' }

export default function QrDialog({ item, onClose }: { item: Item; onClose: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeButton.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="QR code"
        className="flex max-h-full w-full max-w-sm flex-col sm:max-w-lg items-center gap-3 overflow-y-auto rounded-2xl bg-white p-5 text-zinc-900 shadow-xl dark:bg-zinc-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {item.kind === 'file' ? <FileQr item={item} /> : <TextQr item={item} />}
        <Button ref={closeButton} variant="secondary" className="w-full" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  )
}

function TextQr({ item }: { item: Item }) {
  const text = item.content ?? ''
  const [payload, setPayload] = useState<{ for: string; result: QrPayload } | null>(null)

  useEffect(() => {
    let cancelled = false
    qrPayload(item, appBaseUrl())
      .then((result) => {
        if (!cancelled) setPayload({ for: text, result })
      })
      .catch(() => {
        if (!cancelled) setPayload({ for: text, result: { status: 'none' } })
      })
    return () => {
      cancelled = true
    }
  }, [item, text])

  const result = payload?.for === text ? payload.result : null
  if (!result) return <p className="py-10 text-sm text-zinc-500">Making the code…</p>
  if (result.status !== 'ok') {
    return (
      <p className="py-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
        This text is too long for a QR code ({text.length.toLocaleString()} characters). Use <strong>Copy</strong>{' '}
        instead, or send it as a file.
      </p>
    )
  }
  return (
    <>
      <QrCode value={result.value} />
      {item.kind === 'link' ? (
        <p className="w-full text-center text-sm break-all text-zinc-600 dark:text-zinc-300">{text}</p>
      ) : (
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-300">
          Scan with any phone camera to open this text in a browser, with a Copy button. The text travels inside the
          code; nothing is uploaded.
        </p>
      )}
    </>
  )
}

function FileQr({ item }: { item: Item }) {
  const [link, setLink] = useState<FileLink>({ status: 'loading' })
  const [now, setNow] = useState(() => Date.now())
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!item.file_path) return
    let cancelled = false
    const requestedAt = Date.now()
    signedUrl(item.file_path, FILE_QR_SECONDS, item.file_name ?? 'download')
      .then((url) => {
        if (!cancelled) setLink({ status: 'ready', url, expiresAt: requestedAt + FILE_QR_SECONDS * 1000 })
      })
      .catch(() => {
        if (!cancelled) setLink({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [item.file_path, item.file_name, attempt])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const renew = useCallback(() => {
    setLink({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  const name = item.file_name ?? 'file'
  const caption = (
    <p className="text-center text-sm text-zinc-600 dark:text-zinc-300">
      Scan to download <strong className="break-all">{name}</strong> ({formatBytes(item.file_size ?? 0)}) on any phone.
    </p>
  )

  if (link.status === 'loading') return <p className="py-10 text-sm text-zinc-500">Creating a download link…</p>
  if (link.status === 'error') {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
        <p>Couldn't create a download link. Check your connection.</p>
        <Button variant="primary" size="sm" onClick={renew}>
          Try again
        </Button>
      </div>
    )
  }

  const remaining = link.expiresAt - now
  if (remaining <= 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
        <p>This download link has expired.</p>
        <Button variant="primary" size="sm" onClick={renew}>
          New link
        </Button>
      </div>
    )
  }

  return (
    <>
      <QrCode value={link.url} />
      {caption}
      <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
        Link works for <span className="font-semibold tabular-nums">{formatCountdown(remaining)}</span>. Anyone who scans
        it before then can download the file.
      </p>
    </>
  )
}
