# AGENTS.md — Beam

Beam is a personal app for passing text, links and files between my Android phone and my Windows PC. Paste or share something on one device and it pops up on the other within a second or two.

This file is the source of truth for how to work on this project. Read it fully before starting any task, and re-read it when a session resumes.

## Owner context

- Single user (me), two or more devices: an Android phone and a Windows PC.
- I build by vibe coding: you write the code, I test on real devices and report back. Explain anything I have to do by hand (dashboards, keys, installs) as numbered steps.
- My terminal is **Windows PowerShell**. Give every command in PowerShell syntax (no `&&` chaining on older PowerShell, no `export`, use `$env:VAR = "..."`, backslash paths where it matters).

## Product requirements

1. **Send:** paste text or a link, or pick one or more files, and send in one tap. A "Paste from clipboard" button reads the clipboard on tap.
2. **Receive:** new items appear instantly on every other signed-in device. Each item has a one-tap action: Copy (text), Open (link), Download (file).
3. **Notify:** if the app isn't open on the receiving device, it gets a push notification. Tapping it opens the app on that item.
4. **Share from Android:** Beam appears in Android's share sheet (Web Share Target) and accepts text, URLs and files.
5. **Ephemeral by default:** items and files auto-delete after 24 hours. File size cap 50 MB per file (the Supabase Free plan's per-file maximum).
6. **Private:** only my account can read or write my items. Nothing is public.

Non-goals for now: multiple users/sharing with others, iOS, a native Windows tray app (possible later phase, see ROADMAP.md), end-to-end encryption (later phase).

## Tech stack

- **Frontend:** Vite + React + TypeScript, installable PWA via `vite-plugin-pwa` using the `injectManifest` strategy (we need a custom service worker for share target + push).
- **Styling:** Tailwind CSS. Mobile-first; must also look good as an installed desktop window.
- **Backend:** Supabase
  - Auth: email + password for a single user created in the Supabase dashboard; public sign-ups disabled. Sessions persisted so I rarely re-sign-in. No auth emails are ever sent (no SMTP needed).
  - Postgres with Row Level Security on every table.
  - Realtime: subscribe to inserts on `items` for the current user.
  - Storage: private bucket `files`, accessed via signed URLs only.
  - Edge Functions (Deno): `send-push` (web push on new item) and `cleanup` (scheduled deletion of expired items + their files).
- **Push:** standard Web Push with VAPID keys, sent from the `send-push` Edge Function.
- **Hosting:** GitHub Pages (public repo), deployed by a GitHub Actions workflow on every push to `main`. The site lives under a sub-path (`https://<user>.github.io/beam/`), so never hard-code `/` for asset or app URLs — use `import.meta.env.BASE_URL` or relative paths. HTTPS is required for PWA install, service workers, push and share target.
- **Third parties:** keep it to Supabase and GitHub. Ask before adding any other service.
- **Tests:** Vitest for logic. Device flows are verified manually using `docs/TESTING.md`.

Prefer well-maintained libraries over hand-rolled code, but don't add a dependency for something a few lines can do. Ask before adding anything heavy.

## Data model (starting point)

`devices`
- `id` uuid pk, `user_id` uuid (auth.users), `name` text (e.g. "Pixel", "Desktop"), `push_subscription` jsonb null, `last_seen` timestamptz, `created_at` timestamptz

`items`
- `id` uuid pk, `user_id` uuid, `kind` text check in ('text','link','file')
- `content` text null (text or URL), `file_path` text null, `file_name` text null, `file_size` bigint null, `mime_type` text null
- `source_device_id` uuid references devices
- `created_at` timestamptz default now(), `expires_at` timestamptz default now() + interval '24 hours'

- `thumb_path` text null (small JPEG thumbnail for images, generated on the sending device)

RLS: users can select/insert/delete only rows where `user_id = auth.uid()`. Storage policies restrict `files/<user_id>/...` to that user.

Storage layout: `files/<user_id>/<item_id>/<safe file name>` and `files/<user_id>/<item_id>/thumb.jpg`. The item id is generated on the client so the path is known before the row exists; the row is inserted only after the upload finishes.

Keep all schema changes as SQL migration files in `supabase/migrations/`, never as untracked dashboard edits.

## Key behaviours and gotchas

- **Device identity:** on first launch, register a `devices` row, store its id in localStorage, and let me name the device. Never notify or highlight the device an item came from.
- **Link detection:** if pasted text is a single URL, save as `kind = 'link'`.
- **Clipboard:** browsers only allow clipboard reads/writes from a user gesture. Never try to read the clipboard in the background. Show a clear message if permission is denied.
- **Share target:** use `method: "POST"`, `enctype: "multipart/form-data"` in the manifest. The service worker intercepts the POST, stashes text/files (IndexedDB or Cache), redirects to an in-app route, and the app uploads them. Only works on Android after the PWA is installed from the deployed HTTPS site — it cannot be tested on localhost.
- **Push:** ask for notification permission only from a button tap, never on page load. Store the subscription on the `devices` row. Trigger `send-push` from a database webhook on `items` insert.
- **Realtime + reconnect:** when the app regains focus or network, refetch recent items so nothing is missed while the socket was down.
- **Large files:** show upload/download progress; reject files over the cap before uploading with a friendly message.
- **Cleanup:** `cleanup` deletes expired rows *and* their storage objects. Schedule it hourly.

## Security rules

- Never commit secrets. The repo is public. Use `.env.local` (gitignored) for the Supabase URL and publishable key locally, and GitHub repository variables for the deployed build (both values are public by design). The service role / secret key and VAPID private key live only in Supabase Edge Function secrets.
- Keep `.env.example` up to date with variable names (no values).
- Every new table gets RLS enabled in the same migration that creates it.

## Project structure

```
/src             React app
/src/sw.ts       custom service worker (share target, push, notification click)
/supabase        migrations and edge functions
/docs            project docs (see below)
AGENTS.md        this file
ROADMAP.md       phases and checklist
```

## Docs workflow

Keep these current as part of every task, not as an afterthought:

- `ROADMAP.md` — tick items off as they're done; add newly discovered tasks under the right phase.
- `docs/DECISIONS.md` — one short entry per meaningful decision: date, decision, why, alternatives rejected.
- `docs/SETUP.md` — every manual step I must do (Supabase project, keys, env vars, deploy, installing the PWA on each device), written so I could redo it from scratch.
- `docs/TESTING.md` — manual test checklist for each feature on Android and Windows.
- `docs/CHANGELOG.md` — brief dated entry per completed phase or notable change.

## How to work

1. Work one roadmap phase at a time. Start each phase by stating the plan in a few bullets, then build.
2. Make small, focused commits with clear messages.
3. Run the build, type check and tests before saying a step is done. Fix failures rather than reporting them.
4. When something needs me (creating accounts, pasting keys, testing on my phone), stop and give me exact numbered steps, then wait.
5. At the end of each phase, give me: what changed, what to test (pointing at `docs/TESTING.md`), and anything you're unsure about.
6. If a requirement here is wrong or impractical, say so and propose a change instead of silently working around it.
