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
- [x] **You:** deploy to GitHub Pages (live at https://castlekeepgames.github.io/beam/, 2026-10-31)
- [x] **You:** install PWA on Android and Windows (`docs/SETUP.md` section 6d)
- [x] **You:** run the Phase 1 checklist in `docs/TESTING.md` on both devices (approved 2026-10-31)

## Phase 2 — Files
- [x] Private `files` storage bucket + policies (migration written; you apply it, SETUP section 7)
- [x] File picker (multiple files) and drag-and-drop on desktop
- [x] 50 MB cap with friendly error (Supabase Free plan limit; see DECISIONS)
- [x] Upload/download progress (uploads one at a time, cancellable)
- [x] Image thumbnails in the list (generated on the sending device)
- [x] Signed-URL download
- [x] Deleting a file item also removes its storage objects
- [x] TESTING.md checklist for Phase 2
- [ ] **You:** run the Phase 2 migration, deploy, and run the Phase 2 checklist

## Phase 2b — Cleanup (moved up from Phase 5 so the 1 GB free storage never fills)
- [ ] `cleanup` Edge Function deletes expired items + files (and orphaned uploads), scheduled hourly
- [ ] Supabase CLI set up (needed for Edge Functions); mark earlier migrations applied

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
- [ ] "Keep" toggle to exempt an item from expiry
- [ ] Empty states, error states, offline banner
- [ ] Keyboard shortcut on desktop: Ctrl+Enter to send

## Later (not started)
- [ ] Windows tray app (Tauri) with global hotkey to send clipboard and auto-copy incoming text
- [ ] End-to-end encryption
- [ ] QR code to open a link on the other device
- [ ] Search / longer history
