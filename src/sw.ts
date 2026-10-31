/// <reference lib="webworker" />
// Custom service worker: app-shell precache, Android share target, web push
// and notification clicks.
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
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
}

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

      await self.registration.showNotification(data.title ?? 'Beam', {
        body: data.body ?? 'New item',
        icon: scoped('pwa-192x192.png'),
        tag: data.itemId ?? 'beam',
        data: { itemId: data.itemId ?? null },
      })
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const itemId = (event.notification.data as { itemId?: string | null } | null)?.itemId ?? null
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
