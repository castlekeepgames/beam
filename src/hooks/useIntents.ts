import { useEffect, useRef, useState } from 'react'
import type { Notify } from '../components/Toast'
import { composeSharedText } from '../lib/share'
import type { Item } from '../lib/types'
import { takeShare } from '../shared/shareStash'

/** Remove a query parameter without reloading (so a refresh doesn't repeat it). */
function clearParam(name: string) {
  const url = new URL(window.location.href)
  if (!url.searchParams.has(name)) return
  url.searchParams.delete(name)
  window.history.replaceState(null, '', url)
}

// Module-level so React StrictMode's double effect can't send a share twice.
let shareHandled = false

/**
 * Android share sheet: the service worker stashed the share and redirected to
 * ?share=1. Send it straight away and confirm with a toast.
 */
export function useShareIntake(sendText: (text: string) => Promise<void>, addFiles: (files: File[]) => void, notify: Notify) {
  useEffect(() => {
    const flag = new URLSearchParams(window.location.search).get('share')
    if (!flag || shareHandled) return
    shareHandled = true
    clearParam('share')
    if (flag === 'failed') {
      notify("Couldn't receive the shared item. Try sharing again.", 'error')
      return
    }
    void (async () => {
      const shared = await takeShare()
      if (!shared) return
      const text = composeSharedText(shared)
      if (text) {
        try {
          await sendText(text)
          if (shared.files.length === 0) notify('Shared to Beam ✓')
        } catch {
          notify("Couldn't send the shared text. Check your connection.", 'error')
        }
      }
      // Each file shows its own progress and "Sent …" toast.
      if (shared.files.length) addFiles(shared.files)
      if (!text && shared.files.length === 0) notify('Nothing to send from that share.', 'error')
    })()
  }, [sendText, addFiles, notify])
}

/**
 * Notification taps: open on ?item=<id> (fresh launch) or a message from the
 * service worker (app already open). Scrolls to the item and highlights it.
 */
export function useOpenItem(items: Item[], highlight: (id: string) => void) {
  const [target, setTarget] = useState<{ id: string; at: number } | null>(() => {
    const id = new URLSearchParams(window.location.search).get('item')
    return id ? { id, at: 0 } : null
  })
  const handled = useRef<number | null>(null)

  useEffect(() => {
    clearParam('item')
    if (!('serviceWorker' in navigator)) return
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; itemId?: string | null } | null
      if (data?.type === 'beam:open-item' && data.itemId) setTarget({ id: data.itemId, at: Date.now() })
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    if (!target || handled.current === target.at || !items.some((i) => i.id === target.id)) return
    handled.current = target.at
    document.getElementById(`item-${target.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    highlight(target.id)
  }, [target, items, highlight])
}
