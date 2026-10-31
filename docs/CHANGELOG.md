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
