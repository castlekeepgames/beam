# Changelog

## 2026-10-30 — Phase 0: project setup
- Scaffolded Vite + React + TypeScript + Tailwind CSS.
- Installable PWA via `vite-plugin-pwa` (injectManifest) with a manifest, icons and a minimal custom service worker (`src/sw.ts`) that precaches the app shell.
- Vitest, `.env.example`, git repo.
- Docs: DECISIONS, SETUP, TESTING, CHANGELOG.
- Phase 1 database migration written (`supabase/migrations/`) ready to apply.
