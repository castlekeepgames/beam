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
- [x] "Photos" button on touch screens (opens Android's Photos picker)
- [x] 50 MB cap with friendly error (Supabase Free plan limit; see DECISIONS)
- [x] Upload/download progress (uploads one at a time, cancellable)
- [x] Image thumbnails in the list (generated on the sending device)
- [x] Signed-URL download
- [x] Deleting a file item also removes its storage objects
- [x] TESTING.md checklist for Phase 2
- [x] **You:** run the Phase 2 migration, deploy, and run the Phase 2 checklist (approved 2026-10-31)

## Phase 2b — Cleanup (moved up from Phase 5 so the 1 GB free storage never fills)
- [x] Hourly pg_cron job deletes expired rows, then calls the `cleanup` Edge Function to delete files with no row (expired, deleted, abandoned uploads)
- [x] Supabase CLI added as a dev dependency (`npx supabase`), project config in `supabase/config.toml`
- [ ] **You:** CLI sign-in + link, mark earlier migrations applied, push new migrations (`docs/SETUP.md` section 8)
- [ ] Deploy `cleanup` function (I do this once you've linked)

## Phase 3 — Notifications
- [x] VAPID keys generated; public key in `src/lib/push.ts`, private key goes to the `VAPID_KEYS` function secret
- [x] "Enable notifications" in the device menu; subscription stored on the device row (and re-synced on start)
- [x] `send-push` Edge Function + `items` insert trigger (pg_net)
- [x] Skip the source device; clear expired subscriptions (404/410)
- [x] Notification click opens the app on that item (scroll + highlight); no notification when Beam is in front
- [ ] Deploy `send-push` + set `VAPID_KEYS` secret (I do this once you've linked)
- [ ] **You:** enable notifications on each device and run the Phase 3 checklist

## Phase 4 — Android share sheet
- [x] `share_target` in manifest (POST, multipart, text + url + files)
- [x] Service worker handles share POST, stashes it in Cache Storage and hands off to the app
- [x] Share flow sends immediately with a confirmation toast
- [ ] **You:** test sharing from Chrome, Photos, and a messaging app

## Phase 5 — Cleanup and polish
- [x] "Keep" toggle to exempt an item from expiry (un-keeping gives it a fresh 24 hours)
- [x] Empty states, error states (with Try again), offline banner
- [x] Keyboard shortcut on desktop: Ctrl+Enter to send
- [ ] **You:** run the Phase 5 checklist

## Later (not started)
- [ ] Windows tray app (Tauri) with global hotkey to send clipboard and auto-copy incoming text
- [ ] End-to-end encryption
- [ ] QR code to open a link on the other device
- [ ] Search / longer history
