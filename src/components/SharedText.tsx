import { useState } from 'react'
import { Button, Logo, Page } from './ui'

/**
 * What someone sees after scanning a text QR code: no sign-in, no Supabase.
 * The text came from the link's #fragment, which never leaves their phone.
 */
export function SharedText({ text }: { text: string }) {
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle')

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied('done')
    } catch {
      setCopied('failed')
    }
  }

  return (
    <Page>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-6">
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <Logo className="h-7 w-7" />
          Shared from Beam
        </div>
        <div className="w-full rounded-2xl bg-white p-4 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <p className="text-base break-words whitespace-pre-wrap select-text">{text}</p>
        </div>
        <Button onClick={copy} className="w-full max-w-xs">
          {copied === 'done' ? 'Copied ✓' : 'Copy text'}
        </Button>
        {copied === 'failed' && (
          <p className="text-center text-sm text-red-600 dark:text-red-400">
            Couldn't copy automatically. Long-press the text above to select and copy it.
          </p>
        )}
        <p className="max-w-xs text-center text-xs text-zinc-400 dark:text-zinc-500">
          This text was inside the QR code itself. It isn't stored anywhere online.
        </p>
      </div>
    </Page>
  )
}
