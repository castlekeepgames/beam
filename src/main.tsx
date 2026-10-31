import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { isSharedTextHash } from './lib/qr'
import { isReceiveHash } from './lib/receive'

// Visitors opening a scanned QR code (shared text or Receive) don't need Beam's offline service worker.
const visitor = isSharedTextHash(window.location.hash) || isReceiveHash(window.location.hash)
if (!visitor) registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
