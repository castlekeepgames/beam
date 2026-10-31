/// <reference lib="webworker" />
// Custom service worker: app-shell precache, Android share target, web push
// and notification clicks.
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { isSafeHttpUrl } from '../supabase/functions/_shared/links'
import { stashShare } from './shared/shareStash'

declare let self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

const scoped = (path: string) => new URL(path, self.registration.scope).href

// Android share sheet → POST <scope>share-target (see manifest share_target).
// Stash the shared text/files and hand over to the app, which sends them.
registerRoute(
  ({ url, request }) => request.method === 'POST' && url.href === scoped('share-target'),
  async ({ request }) => {
    try {
      await stashShare(await request.formData())
      return Response.redirect(scoped('./?share=1'), 303)
    } catch {
      return Response.redirect(scoped('./?share=failed'), 303)
    }
  },
  'POST',
)

// Serve the app shell for in-app routes so the installed app opens offline.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

interface PushPayload {
  title?: string
  body?: string
  itemId?: string
  /** Set for link items: adds an "Open link" button. */
  url?: string
}

/** Notification options plus `actions` (supported by Chrome/Edge, missing from TS's lib). */
type BeamNotificationOptions = NotificationOptions & { actions?: { action: string; title: string }[] }

self.addEventListener('push', (event) => {
  let data: PushPayload = {}
  try {
    data = (event.data?.json() ?? {}) as PushPayload
  } catch {
    data = { body: event.data?.text() }
  }

  event.waitUntil(
    (async () => {
      // If Beam is open and in front, realtime already shows the item.
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      if (windows.some((w) => w.visibilityState === 'visible' && w.focused)) return

      const url = data.url && isSafeHttpUrl(data.url) ? data.url : null
      const options: BeamNotificationOptions = {
        body: data.body ?? 'New item',
        icon: scoped('pwa-192x192.png'),
        tag: data.itemId ?? 'beam',
        data: { itemId: data.itemId ?? null, url },
        actions: url ? [{ action: 'open-link', title: 'Open link' }] : [],
      }
      await self.registration.showNotification(data.title ?? 'Beam', options)
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const { itemId = null, url = null } = (event.notification.data ?? {}) as { itemId?: string | null; url?: string | null }

  // "Open link" button: straight to the link in the browser, skipping Beam.
  if (event.action === 'open-link' && url && isSafeHttpUrl(url)) {
    event.waitUntil(self.clients.openWindow(url).then(() => undefined))
    return
  }

  const target = scoped(itemId ? `./?item=${encodeURIComponent(itemId)}` : './')

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = windows.find((w) => w.url.startsWith(self.registration.scope))
      if (existing) {
        await existing.focus()
        existing.postMessage({ type: 'beam:open-item', itemId })
        return
      }
      await self.clients.openWindow(target)
    })(),
  )
})
