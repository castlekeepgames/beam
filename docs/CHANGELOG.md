# Changelog

## 2026-10-30 — Phase 0: project setup
- Scaffolded Vite + React + TypeScript + Tailwind CSS.
- Installable PWA via `vite-plugin-pwa` (injectManifest) with a manifest, icons and a minimal custom service worker (`src/sw.ts`) that precaches the app shell.
- Vitest, `.env.example`, git repo.
- Docs: DECISIONS, SETUP, TESTING, CHANGELOG.
- Phase 1 database migration written (`supabase/migrations/`) ready to apply.
- Simplified the stack to Supabase + GitHub only: password sign-in (no emails or SMTP) and GitHub Pages hosting via a GitHub Actions workflow. The build supports the `/beam/` sub-path.

## 2026-10-30 — Phase 1: text and links (built; awaiting device testing)
- Email + password sign-in with a persistent session; sign out affects only the current device.
- Device registration and naming (suggested from the browser), with rename from the header.
- Paste box with "Paste from clipboard", link detection, and Send.
- Realtime list of the last 24 hours, newest first, with the source device and relative time. Items arriving from other devices get a brief highlight.
- Copy, Open (links) and Delete. Deletes sync to other devices.
- Refetch on focus, visibility change, reconnect and realtime resubscribe; a live/offline indicator.
- GitHub Pages deploy workflow.
- 31 unit tests (links, items merge, time labels, device names).