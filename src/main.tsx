import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { isSharedTextHash } from './lib/qr'

// Visitors opening a scanned text QR code don't need Beam's offline service worker.
if (!isSharedTextHash(window.location.hash)) registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
