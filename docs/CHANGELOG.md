# Changelog

Oldest first.

## 2026-10-30 — Phase 0: project setup
- Scaffolded Vite + React + TypeScript + Tailwind CSS.
- Installable PWA via `vite-plugin-pwa` (injectManifest) with a manifest, icons and a minimal custom service worker (`src/sw.ts`) that precaches the app shell.
- Vitest, `.env.example`, git repo.
- Docs: DECISIONS, SETUP, TESTING, CHANGELOG.
- Phase 1 database migration written (`supabase/migrations/`) ready to apply.
- Simplified the stack to Supabase + GitHub only: password sign-in (no emails or SMTP) and GitHub Pages hosting via a GitHub Actions workflow. The build supports the `/beam/` sub-path.

## 2026-10-30 — Phase 1: text and links (built)
- Email + password sign-in with a persistent session; sign out affects only the current device.
- Device registration and naming (suggested from the browser), with rename from the header.
- Paste box with "Paste from clipboard", link detection, and Send.
- Realtime list of the last 24 hours, newest first, with the source device and relative time. Items arriving from other devices get a brief highlight.
- Copy, Open (links) and Delete. Deletes sync to other devices.
- Refetch on focus, visibility change, reconnect and realtime resubscribe; a live/offline indicator.
- GitHub Pages deploy workflow.
- 31 unit tests (links, items merge, time labels, device names).

## 2026-10-31 — Phase 1: text and links (complete)
- Deployed to https://castlekeepgames.github.io/beam/, installed on Android and Windows, and the device checklist approved.

## 2026-10-31 — Phase 2: files (built; awaiting migration, deploy and device testing)
- Private `files` bucket with per-user storage policies, a 50 MB per-file cap (Free plan limit), and the `items.thumb_path` column (migration `20261031090000_files_storage.sql`).
- **Files…** picker (several files at once) and drag-and-drop onto the window on desktop.
- Uploads run one at a time with a progress bar and a Cancel button. The item appears on other devices only once its upload has finished.
- Image thumbnails are generated on the sending device.
- Download through a short-lived signed URL, with progress, saved under the original file name.
- Deleting a file item also removes its stored files.
- 42 unit tests (added file names, sizes and paths).
- Added a **Photos** button on touch screens that opens Android's Photos picker.
## 2026-10-31 — Phase 2: files (complete)
- Migration applied, deployed, and the device checklist approved on Android and Windows.

## 2026-10-31 — Phases 2b–5: cleanup, notifications, share sheet, polish (built; awaiting deploy and device testing)
- **2b Cleanup:** an hourly pg_cron job deletes expired rows, then the `cleanup` Edge Function deletes files with no row. The Supabase CLI was added for migrations and deploys.
- **3 Notifications:** Enable/Turn off in the device menu, the `send-push` Edge Function triggered on every new item, no notification to the sending device or while Beam is in front, tapping opens the item, and expired subscriptions are cleared.
- **4 Share sheet:** Beam appears in Android's share menu for text, links and files, sends immediately, and confirms with a toast.
- **5 Polish:** a Keep toggle, offline banner, Try again on errors, a richer empty state, Ctrl+Enter to send, and compact card buttons.
- 57 unit tests (added share text, notification wording, Keep, VAPID key); Edge Functions type-checked with Deno.
## 2026-10-31 — Phases 2b–5 (complete)
- Functions deployed, push key stored as a secret, app deployed, and the device checklists approved on Android and Windows. Every planned phase is done; only the "Later" ideas remain.
