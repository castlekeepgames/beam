# Decisions

One entry per meaningful decision, newest at the bottom.

---

### 2026-10-30 — Stack versions from the current Vite template
**Decision:** Vite 8, React 19, TypeScript 7, Tailwind CSS 4 (`@tailwindcss/vite`), `vite-plugin-pwa` 2 (injectManifest), Vitest 5, oxlint (the template's linter).
**Why:** These are what `create-vite` generates today, and they all have compatible peer ranges, so we don't start on outdated majors.
**Rejected:** Pinning older majors (Vite 6, Tailwind 3), which gains nothing for a new project.

### 2026-10-30 — Hosting: Vercel (Hobby plan)
**Superseded** by "Simplify to Supabase + GitHub Pages" below.
**Decision:** Deploy the static build to Vercel from a GitHub repo. Every push to `main` deploys automatically.
**Why:** It's free for personal, non-commercial use and auto-detects Vite. You set env vars in the dashboard, the HTTPS URL is stable, and preview deploys are available if we want them.
**Rejected:** Netlify: its newer free plan is credit-based and charges per production deploy, which a build-test-fix loop burns through. Cloudflare Pages: also a good option, but its dashboard now pushes you towards Workers, which makes the setup steps more fiddly.

### 2026-10-30 — Env var for the Supabase key is `VITE_SUPABASE_PUBLISHABLE_KEY`
**Decision:** Use `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
**Why:** New Supabase projects show a "publishable" key (`sb_publishable_…`) where they used to show the "anon" key. Both are safe in the browser, and the legacy anon key also works in this variable. Naming the variable after what the dashboard shows avoids confusion.
**Rejected:** `VITE_SUPABASE_ANON_KEY`, which no longer matches the dashboard label.

### 2026-10-30 — Phase 1 migrations are applied through the SQL Editor
**Decision:** Migrations live in `supabase/migrations/` as usual. For Phase 1, you paste them into the Supabase SQL Editor yourself. We switch to the Supabase CLI (`npx supabase db push`) in Phase 3, when we need it for Edge Functions anyway. At that point we'll mark the earlier migrations as applied with `supabase migration repair`.
**Why:** It avoids installing and logging in to the CLI before we actually need it. The SQL is still tracked in git, so nothing is an untracked dashboard edit.
**Rejected:** Setting up the CLI in Phase 0, which adds a large download plus a login and link step for one SQL file.

### 2026-10-30 — Only one account; sign-ups are turned off after the first sign-in
**Superseded** by "Simplify to Supabase + GitHub Pages" below (the user is now created in the dashboard, so sign-ups are off from the start).
**Decision:** After you create your account with the first OTP sign-in, turn off "Allow new users to sign up" in Supabase Auth.
**Why:** Email OTP otherwise lets anyone with the URL create an account. RLS would keep their data separate, but they'd still be using our free-tier quota. Beam is single-user.
**Rejected:** An allow-list trigger on `auth.users`, which is more moving parts for the same result.

### 2026-10-30 — Service worker updates itself silently
**Decision:** `registerType: 'autoUpdate'`. The SW calls `skipWaiting()` and `clientsClaim()`, so a new deploy takes over the next time the app loads.
**Why:** There's one user and no long-running forms, so an "update available" prompt would just be friction.
**Rejected:** A prompt-to-reload flow. We can add it later if an update ever interrupts something.

### 2026-10-30 — Separate TypeScript config for the service worker
**Decision:** `tsconfig.sw.json` type-checks `src/sw.ts` against the `WebWorker` lib. `tsconfig.app.json` excludes it.
**Why:** The DOM and WebWorker libs conflict when they're in the same program. `tsc -b` still checks both.

### 2026-10-30 — Icons are generated once from `public/logo.svg`
**Decision:** The PNG icons, maskable icon and favicon are generated from `public/logo.svg` with `@vite-pwa/assets-generator`. It's run outside the project, and the outputs are committed.
**Why:** We need the icons, not a permanent image-processing dependency (it pulls in `sharp`). The maskable icon uses a square, full-bleed copy of the logo with no padding, so Android's mask doesn't show a white border.

### 2026-10-30 — Schema details beyond the starting data model
**Decision:**
- `user_id` defaults to `auth.uid()`, so the client never sends it.
- `devices` has an update policy, needed to rename a device, update `last_seen` and (in Phase 3) store the push subscription.
- `items` has no update policy yet. Phase 5's "Keep" toggle will add one.
- `items.source_device_id` is `on delete set null`, so deleting a device keeps its items.
- The insert policy also checks that `source_device_id` is one of your own devices.
- Check constraints: text and link items need `content` (1–100,000 characters); file items need `file_path`, `file_name` and `file_size`; `file_size` is at most 100 MB.
- Table privileges are granted to `authenticated` only, and revoked from `anon`. This is in addition to RLS.

**Why:** These close gaps in the starting model without changing its shape. The 100k-character cap stops an accidental huge paste from going over Realtime's message size limit.

### 2026-10-30 — Sign-in emails go through Resend (custom SMTP)
**Superseded** by "Simplify to Supabase + GitHub Pages" below. Never set up.
**Decision:** Supabase Auth sends email through Resend's SMTP (`smtp.resend.com`), from `onboarding@resend.dev`, using a Resend API key with sending access only.
**Why:** Supabase won't let you edit email templates without custom SMTP, and we need the template to show the one-time code. The built-in sender is also limited to a couple of emails per hour. Resend's free tier covers this easily. Its key can only send mail, and without a verified domain Resend only delivers to the account owner's address, which suits a single-user app.
**Rejected:** Gmail SMTP with an app password. It works, but that password gives full access to the Gmail account if it ever leaks. We also rejected switching to magic links: tapping a link in the email opens the browser rather than the installed PWA, which makes sign-in fiddly.

### 2026-10-30 — Simplify to Supabase + GitHub Pages, with password sign-in
**Decision:**
- **Two services only:** Supabase (database, auth, realtime, storage, Edge Functions) and GitHub (code and hosting).
- **Sign-in:** email + password. The single user is created in the Supabase dashboard with "Auto Confirm", and public sign-ups are off from the start. Supabase never sends an auth email, so no SMTP is needed.
- **Hosting:** GitHub Pages, deployed by `.github/workflows/deploy.yml` on every push to `main`. The repo is public, because free Pages requires it.
- **Sub-path:** the site is served from `/<repo-name>/`, so the Vite `base` comes from the `BASE_PATH` env var. It's `/` locally and set by the workflow in CI. The manifest scope and start URL follow it. The build also copies `index.html` to `404.html`, so a deep link still loads the app.
- **Config:** the deployed build reads the Supabase URL and publishable key from GitHub repository **variables**, not secrets. Both values end up in the public JS bundle anyway.

**Why:** The original plan needed four accounts (Supabase, Vercel, Resend, GitHub), plus SMTP and email-template setup, just to send a sign-in code to one person. A password stays remembered by the persisted session and the browser's password manager, so you rarely type it. GitHub Pages removes a separate host account. Every roadmap feature still works.

**Trade-offs accepted:**
- The code is publicly visible. Nothing secret is in it. RLS protects the data, and with sign-ups off nobody else can get an account.
- GitHub Pages can't set custom headers. That's fine: the service worker is revalidated by the browser's normal update check.

**Rejected:**
- Cloudflare-only (Workers + Durable Objects + R2): one account, but it needs a card for R2, and we'd hand-write auth, realtime and push.
- Firebase-only: one account, but Storage and Functions need the paid Blaze plan.
- Hosting on the home PC: only works on the same network and while the PC is on, and HTTPS is awkward.
- Vercel with a private repo: adds a third account just to hide code that has nothing secret in it.

### 2026-10-30 — Phase 1 behaviour choices
**Decision:**
- **Paste from clipboard fills the box rather than sending straight away.** You see what's about to go out (clipboards often hold something stale or private), and Send is one more tap. Easy to flip later if it feels slow.
- **Sign out applies to this device only** (`signOut({ scope: 'local' })`). Signing out on the phone doesn't sign out the PC.
- **Sync strategy:**
  - Realtime `INSERT` events filtered to your `user_id`.
  - Realtime `DELETE` events. Supabase can't filter these and only sends the row id, which is fine for one user.
  - A full refetch whenever the channel (re)subscribes, the window regains focus or visibility, or the network comes back.
  - The list keeps the newest 100 unexpired items. Expired items are hidden by the query and on the client until the Phase 5 cleanup job deletes them.
- **Device identity:** `{ id, name }` is stored in localStorage under `beam.device`. On start we update `last_seen` on that row. If the row is missing (deleted, or a different account) you're asked to name the device again. If the request fails because you're offline, the app starts with the remembered device. `last_seen` is refreshed at most every 5 minutes while the app is visible.
- **Text is sent exactly as typed.** Only a lone URL is trimmed and stored as a link. A bare `www.` host becomes `https://`.
- **"Open" only follows http(s) URLs,** even if the database somehow holds something else.

**Why:** These match the spec's behaviour notes (clipboard only on a tap, catch up after reconnecting, never highlight on the device an item came from) while keeping the code small.
### 2026-10-31 — Phase 2 file handling
**Decision:**
- **The file cap is 50 MB, not 100 MB.** That's the most the Supabase Free plan accepts per file. It's enforced in the app (with a friendly message before upload), on the bucket (`file_size_limit`) and in the `items_file_size` check.
- **Upload with progress through a direct HTTP request** to Supabase Storage's upload endpoint, instead of `supabase-js`'s upload, which doesn't report progress. Files upload one at a time, and each one can be cancelled.
- **Storage paths:** `<user_id>/<item_id>/<safe name>`. The item id is a client-side UUID, so the path is known up front. Storage only accepts a limited set of characters in object names, so the stored name is a cleaned-up version. The original name is kept in `items.file_name` and used when you download.
- **The item row is inserted only after the upload finishes,** so other devices never see a half-uploaded file. If the insert fails, the uploaded objects are removed.
- **Thumbnails are made on the sending device:** a JPEG up to 320 px, saved to `thumb.jpg` next to the file and recorded in the new `items.thumb_path` column. Supabase's image resizing is a paid feature. If an image can't be decoded in the browser (e.g. HEIC), it simply has no thumbnail.
- **Downloads** use a 60-second signed URL fetched with progress, then save through a temporary blob link with the original file name. At 50 MB a whole file in memory is fine.
- **Deleting a file item** deletes the row first (so it disappears everywhere at once), then the storage objects. Anything left behind is swept up by the cleanup job.
- **The cleanup job moves up to "Phase 2b",** straight after files, so the Free plan's 1 GB of storage can't fill up with expired files.

**Rejected:**
- Upgrading to Supabase Pro (about $25/month) just for the 100 MB cap.
- The TUS resumable-upload library: an extra dependency, and not needed at 50 MB.
- Loading full images as previews: wasteful on mobile data.