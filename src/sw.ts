/// <reference lib="webworker" />
// Custom service worker. Phase 0: precache the app shell only.
// Share target (Phase 4) and push / notification click (Phase 3) go here.
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Serve the app shell for in-app routes so the installed app opens offline.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))
