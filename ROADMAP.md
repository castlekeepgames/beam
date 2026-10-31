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
- [x] **You:** CLI sign-in + link, mark earlier migrations applied, push new migrations (`docs/SETUP.md` section 8)
- [x] Deploy `cleanup` function (deployed and smoke-tested 2026-10-31)

## Phase 3 — Notifications
- [x] VAPID keys generated; public key in `src/lib/push.ts`, private key goes to the `VAPID_KEYS` function secret
- [x] "Enable notifications" in the device menu; subscription stored on the device row (and re-synced on start)
- [x] `send-push` Edge Function + `items` insert trigger (pg_net)
- [x] Skip the source device; clear expired subscriptions (404/410)
- [x] Notification click opens the app on that item (scroll + highlight); no notification when Beam is in front
- [x] Deploy `send-push` + set `VAPID_KEYS` secret (2026-10-31)
- [x] **You:** enable notifications on each device and run the Phase 3 checklist (approved 2026-10-31)

## Phase 4 — Android share sheet
- [x] `share_target` in manifest (POST, multipart, text + url + files)
- [x] Service worker handles share POST, stashes it in Cache Storage and hands off to the app
- [x] Share flow sends immediately with a confirmation toast
- [x] **You:** test sharing from Chrome, Photos, and a messaging app (approved 2026-10-31)

## Phase 5 — Cleanup and polish
- [x] "Keep" toggle to exempt an item from expiry (un-keeping gives it a fresh 24 hours)
- [x] Empty states, error states (with Try again), offline banner
- [x] Keyboard shortcut on desktop: Ctrl+Enter to send
- [x] **You:** run the Phase 5 checklist (approved 2026-10-31)

## Phase 6 — QR codes
- [x] **QR** button on link, text and file cards; full-screen code with the link/text underneath
- [x] Files: QR holds a 15-minute signed download link (original file name), with a countdown and **New link**
- [x] Text QR opens a "Shared from Beam" page (text carried in the link's #fragment); text is compressed when that's shorter, so typical messages up to ~700 characters fit; codes over 600 characters use denser error correction (hard cap 1,000) and display larger on wide screens; anything longer suggests Copy
- [x] QR encoder (`uqr`) loaded only when the dialog opens
- [x] **You:** run the Phase 6 checklist (approved 2026-10-31)

## Phase 7 — Receive codes (guests send to me)
- [x] `receive_codes` table (token hash only), `items.from_guest`, atomic claim function
- [x] `receive` Edge Function: check, text, file upload via one-time upload token, finish
- [x] **Receive** button: QR + countdown + count received; closing it stops the code; **New code** after expiry
- [x] Guest "Send to Beam" page (no sign-in): text, Photos/Files with progress, items left, countdown
- [x] Guest items labelled "Guest" and notify as "From a guest"
- [x] Migration applied and functions deployed by Claude (CLI no longer needs your password)
- [x] **You:** run the Phase 7 checklist with a second phone (approved 2026-10-31)

## Phase 8 — Quick wins
- [x] Paste screenshots/images/files: Ctrl+V in the box or anywhere on the page sends them (screenshots get a timestamped name); **Paste** button sends a copied image
- [x] App-icon shortcuts: **Send clipboard** and **Receive** (Windows taskbar right-click, Android long-press)
- [x] **Open link** button on link notifications
- [x] **You:** run the Phase 8 checklist (approved 2026-10-31)

## Phase 9 — Everyday upgrades
- [x] Tap a photo to view it full-screen (with Download)
- [x] Your devices list: last seen, notifications on/off, Remove
- [x] Storage meter (real usage of the 1 GB) and Clear all (kept items optional)
- [x] Thumbnails for guest photos
- [x] Send to one device only ("To:" picker; only that device sees it and is notified)
- [x] Search box over the list (text, links, file names, device names)
- [x] **You:** run the Phase 9 checklist (approved 2026-10-31)

## Later (not started)
- [ ] Longer history (search currently covers the last 24 hours plus kept items)
- [ ] Windows tray app (Tauri) with global hotkey to send clipboard and auto-copy incoming text
- [ ] End-to-end encryption
- [ ] Per-item lifetime (1 h / 24 h / 7 days)
