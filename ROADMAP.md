# ROADMAP — Beam

Work top to bottom. Tick items as they're done; add new tasks to the relevant phase.

## Phase 0 — Project setup
- [x] Scaffold Vite + React + TypeScript + Tailwind
- [x] Add `vite-plugin-pwa` (injectManifest) with manifest, icons, empty custom service worker
- [x] Git repo, `.gitignore`, `.env.example`
- [x] Create `docs/` files: DECISIONS, SETUP, TESTING, CHANGELOG
- [x] Write Supabase project setup steps in `docs/SETUP.md` (I do these by hand)
- [x] Simplify stack to Supabase + GitHub Pages with password sign-in (see DECISIONS)
- [x] **You:** create Supabase project, add your user, apply migration, fill `.env.local` (`docs/SETUP.md` sections 1–4)

## Phase 1 — MVP: text and links
- [x] Email + password sign-in with persistent session
- [x] Device registration + naming (rename from the device-name menu)
- [x] Migrations: `devices`, `items`, RLS policies (applied 2026-10-30)
- [x] Paste box, "Paste from clipboard" button, Send
- [x] Link detection
- [x] Realtime list of recent items, newest first, showing source device and time
- [x] Copy / Open actions, delete item
- [x] Refetch on focus/reconnect
- [x] GitHub Pages deploy workflow (`.github/workflows/deploy.yml`)
- [x] TESTING.md checklist for Phase 1
- [ ] **You:** deploy to GitHub Pages; install PWA on Android and Windows (`docs/SETUP.md` section 6)
- [ ] **You:** run the Phase 1 checklist in `docs/TESTING.md` on both devices

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
