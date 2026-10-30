import { useState } from 'react'
import { MAX_TEXT_LENGTH } from '../lib/items'
import { parseSingleUrl } from '../lib/links'
import type { Notify } from './Toast'
import { inputClass } from './styles'
import { Button } from './ui'

export function Composer({ onSend, notify }: { onSend: (text: string) => Promise<void>; notify: Notify }) {
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
      />
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={pasteFromClipboard}>
          Paste from clipboard
        </Button>
        <span className="flex-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
          {tooLong
            ? `Too long: ${text.length.toLocaleString()} / ${MAX_TEXT_LENGTH.toLocaleString()} characters`
            : isLink
              ? 'Will send as a link'
              : ''}
        </span>
        <Button onClick={send} disabled={isBlank || tooLong || sending} className="min-w-20">
          {sending ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </section>
  )
}
