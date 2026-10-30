# ROADMAP — Beam

Work top to bottom. Tick items as they're done; add new tasks to the relevant phase.

## Phase 0 — Project setup
- [x] Scaffold Vite + React + TypeScript + Tailwind
- [x] Add `vite-plugin-pwa` (injectManifest) with manifest, icons, empty custom service worker
- [x] Git repo, `.gitignore`, `.env.example`
- [x] Create `docs/` files: DECISIONS, SETUP, TESTING, CHANGELOG
- [x] Write Supabase project setup steps in `docs/SETUP.md` (I do these by hand)
- [ ] **You:** create Supabase project, apply migration, fill `.env.local` (`docs/SETUP.md` sections 1–4)

## Phase 1 — MVP: text and links
- [ ] Email OTP sign-in with persistent session
- [ ] Device registration + naming
- [ ] Migrations: `devices`, `items`, RLS policies (written; applied by you in SETUP step 3)
- [ ] Paste box, "Paste from clipboard" button, Send
- [ ] Link detection (logic + tests done in `src/lib/links.ts`; UI wiring pending)
- [ ] Lock sign-ups after first sign-in (`docs/SETUP.md` section 6)
- [ ] Realtime list of recent items, newest first, showing source device and time
- [ ] Copy / Open actions, delete item
- [ ] Refetch on focus/reconnect
- [ ] Deploy to HTTPS host; install PWA on Android and Windows
- [ ] TESTING.md checklist for Phase 1

## Phase 2 — Files
- [ ] Private `files` storage bucket + policies
- [ ] File picker (multiple files) and drag-and-drop on desktop
- [ ] 100 MB cap with friendly error
- [ ] Upload/download progress
- [ ] Image thumbnails in the list
- [ ] Signed-URL download

## Phase 3 — Notifications
- [ ] VAPID keys (setup steps in SETUP.md)
- [ ] "Enable notifications" button, store subscription on device
- [ ] `send-push` Edge Function + database webhook on `items` insert
- [ ] Skip the source device; handle expired subscriptions
- [ ] Notification click opens app on that item

## Phase 4 — Android share sheet
- [ ] `share_target` in manifest (POST, multipart, text + url + files)
- [ ] Service worker handles share POST and hands off to the app
- [ ] Share flow sends immediately with a confirmation toast
- [ ] Test sharing from Chrome, Photos, and a messaging app

## Phase 5 — Cleanup and polish
- [ ] `cleanup` Edge Function deletes expired items + files, scheduled hourly
- [ ] "Keep" toggle to exempt an item from expiry
- [ ] Empty states, error states, offline banner
- [ ] Keyboard shortcut on desktop: Ctrl+Enter to send

## Later (not started)
- [ ] Windows tray app (Tauri) with global hotkey to send clipboard and auto-copy incoming text
- [ ] End-to-end encryption
- [ ] QR code to open a link on the other device
- [ ] Search / longer history
