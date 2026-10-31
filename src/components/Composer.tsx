import { useRef, useState } from 'react'
import { MAX_TEXT_LENGTH } from '../lib/items'
import { parseSingleUrl } from '../lib/links'
import type { Notify } from './Toast'
import { inputClass } from './styles'
import { Button } from './ui'

interface Props {
  onSend: (text: string) => Promise<void>
  onFiles: (files: File[]) => void
  notify: Notify
}

export function Composer({ onSend, onFiles, notify }: Props) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const isBlank = text.trim() === ''
  const tooLong = text.length > MAX_TEXT_LENGTH
  const isLink = !isBlank && parseSingleUrl(text) !== null

  // Clipboard reads are only allowed from a tap, never in the background.
  async function pasteFromClipboard() {
    if (!navigator.clipboard?.readText) {
      notify("This browser can't read the clipboard. Long-press the box and choose Paste.", 'error')
      return
    }
    try {
      const clip = await navigator.clipboard.readText()
      if (clip === '') notify('Your clipboard is empty (or holds something other than text).')
      else setText(clip)
    } catch {
      notify('Clipboard access was blocked. Allow it in the site settings, or long-press the box and choose Paste.', 'error')
    }
  }

  async function send() {
    if (isBlank || tooLong || sending) return
    setSending(true)
    try {
      await onSend(text)
      setText('')
      notify(isLink ? 'Link sent' : 'Sent')
    } catch {
      notify("Couldn't send. Check your connection and try again.", 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <textarea
        className={`${inputClass} min-h-28 resize-y`}
        aria-label="Text or link to send"
        placeholder="Paste text or a link…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          // Ctrl+Enter (Cmd+Enter on Mac) sends; plain Enter is a new line.
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            void send()
          }
        }}
      />
      {(tooLong || isLink) && (
        <p className={`text-xs ${tooLong ? 'text-red-600 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
          {tooLong
            ? `Too long: ${text.length.toLocaleString()} / ${MAX_TEXT_LENGTH.toLocaleString()} characters`
            : 'Will send as a link'}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={pasteFromClipboard} aria-label="Paste from clipboard">
          <span className="sm:hidden">Paste</span>
          <span className="hidden sm:inline">Paste from clipboard</span>
        </Button>
        {/* Images/videos only, so Android opens its Photos picker. Touch screens only. */}
        <span className="hidden pointer-coarse:contents">
          <PickButton label="Photos" accept="image/*,video/*" onFiles={onFiles} />
        </span>
        <PickButton label="Files…" onFiles={onFiles} />
        <span className="hidden flex-1 text-right text-xs text-zinc-400 pointer-fine:inline dark:text-zinc-500">
          Ctrl+Enter
        </span>
        <span className="flex-1 pointer-fine:hidden" />
        <Button onClick={send} disabled={isBlank || tooLong || sending} className="min-w-20">
          {sending ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </section>
  )
}

/** A button that opens the system file picker (several files at once). */
function PickButton({ label, accept, onFiles }: { label: string; accept?: string; onFiles: (files: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <Button variant="secondary" onClick={() => input.current?.click()}>
        {label}
      </Button>
      <input
        ref={input}
        type="file"
        multiple
        accept={accept}
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = '' // allow picking the same file again
          if (files.length) onFiles(files)
        }}
      />
    </>
  )
}
