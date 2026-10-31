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
### 2026-10-31 — Separate "Photos" button on touch screens
**Decision:** Next to **Files…**, touch screens get a **Photos** button whose file input only accepts `image/*,video/*`. Android then opens its Photos picker (recent photos and albums) instead of the Camera / Video / Files chooser. The button is hidden when the main pointer is a mouse (`pointer: coarse`), so Windows only shows **Files…**.
**Why:** You asked for a direct way into your photos. An input that accepts any file type can't open Android's Photos picker, so we need two buttons.
**Rejected:** Limiting **Files…** to images, which would stop you sending documents from the phone.
### 2026-10-31 — Cleanup, notifications, share sheet and Keep (Phases 2b–5)
**Decision:**
- **Supabase CLI** is a dev dependency (`npx supabase`). You link it once. After that, migrations go out with `db push` and functions with `functions deploy`, so there's no more pasting into the dashboard. The Phase 1 and 2 migrations were applied by hand, so they're marked applied with `migration repair`.
- **Cleanup is split between SQL and a function.** pg_cron runs `beam-cleanup` at 7 minutes past every hour. It deletes expired rows that aren't kept (Realtime removes them from open devices), then calls the `cleanup` Edge Function. That function lists files with no matching row via `beam_orphaned_files()` (service role only) and deletes them through the Storage API. Supabase doesn't allow deleting files with SQL. Requiring files to be at least an hour old protects uploads that are still in progress.
- **Push is triggered by the database:** an `after insert` trigger on `items` calls `send-push` through pg_net with just `{ item_id }`.
- **The functions run without JWT checks** (`verify_jwt = false`). Supabase's new publishable and secret keys aren't JWTs, and we don't want to store a secret inside the database just to authenticate pg_net calls. So both functions are designed to be harmless if anyone calls them:
  - `cleanup` takes no input and only deletes files that have no row.
  - `send-push` takes only an item id and reads everything else with the service role. It claims the item with `update … set pushed_at = now() where pushed_at is null and created_at > now() - 5 min`, so each item is pushed at most once, and only just after it's created.
  - The worst case is someone using up our free function calls, which is acceptable for a personal app.
- **Web Push uses `jsr:@negrel/webpush`.** It's built on standard browser crypto (WebCrypto) and runs in Supabase's Deno runtime. The VAPID keys were generated locally. The public key is committed in `src/lib/push.ts`, and the private JWK pair is stored only in the `VAPID_KEYS` function secret. The VAPID contact is the site URL, so no email address is sent to push services.
- **Notifications:**
  - They're skipped when Beam is open and in front, because the item already appears there.
  - The tag is the item id, so one notification shows per item.
  - Tapping focuses an open Beam window, or opens Beam at `?item=<id>`, which scrolls to the item and highlights it.
  - A 404 or 410 from the push service clears that device's subscription.
  - On start, an existing subscription is re-saved, and replaced if the VAPID key has changed.
- **Share target:** the service worker catches `POST <scope>share-target`, stores the text and files in a `beam-share` Cache Storage entry, then redirects to `?share=1`. The app sends them immediately. A lone URL becomes a link (Chrome puts the page URL in `text`). Message text plus a URL are sent together. The title is used only when nothing else was shared.
- **Keep:** a `kept` boolean. Clients may update only `kept` and `expires_at` (via a column-level grant and an update policy). Un-keeping gives the item a fresh 24 hours, so it doesn't vanish the moment you un-keep it. Realtime `UPDATE` events sync it across devices.
- **Polish:** an offline banner (driven by the browser's online/offline state), a "Try again" button on load errors, a fuller empty state with tips, Ctrl+Enter to send, a size option on buttons, and "Show more" moved under the text so action buttons fit on one row on a phone.

**Rejected:**
- Doing cleanup from the app when it opens. It wouldn't run if no device opened Beam.
- `npm:web-push`. It relies on Node crypto, which works less reliably in Deno than WebCrypto.
- Database webhooks configured in the dashboard. They'd be untracked dashboard settings.
- Storing a shared secret in Supabase Vault. It's an extra manual step, and the idempotent design above makes it unnecessary.
### 2026-10-31 — QR codes (Phase 6)
**Decision:**
- **What gets a QR button:** link, text and file cards. Tapping it opens a full-screen dialog with the code, which loads only when opened.
- **Library:** `uqr` (from the unjs project). It has no dependencies and is about 5 KB compressed. We draw the SVG ourselves from its grid of squares, with one path per horizontal run, instead of injecting markup the library generates.
- **Scanning:** medium error correction, black squares on a white card with a 4-square quiet margin, so it scans in dark mode too. Text over 600 characters isn't encoded, because codes get too dense to read off a screen; the dialog suggests Copy instead. Verified by decoding generated codes with an independent reader (`jsQR`), including a 539-character signed file link.
- **Files:** the code holds a 15-minute Supabase signed URL with `download=<original name>`, so any phone can download the file without Beam. The dialog shows a countdown and offers **New link** once it expires.

**Trade-off accepted:** anyone who scans or photographs a file's code within those 15 minutes can download that file. The dialog says so.

**Rejected:**
- `qrcode`: three dependencies, including a command-line parser.
- Writing our own QR encoder: not "a few lines".
- Longer file links: they widen the window in which a photographed code still works.
### 2026-10-31 — Text QR codes open a web page instead of holding raw text
**Decision:** A text item's QR code is now a link: `<Beam URL>#t=<text as base64url UTF-8>`. Opening it shows a "Shared from Beam" page with the text and a **Copy text** button. The page needs no sign-in, makes no Supabase calls, and doesn't register the service worker. The 600-character limit now applies to the whole link, which leaves room for roughly 400 characters of plain English text.
**Why:** You scanned a text code and got "this app was not found on your device". Phone scanners handle raw-text codes inconsistently (some try to hand the text to another app), but every scanner opens web links. Browsers never send the part after `#` to a server, so the text still isn't uploaded anywhere, not even to GitHub.
**Rejected:**
- Uploading the text and encoding a link to it: that stores it online and needs a server change.
- Keeping raw text and adding a warning: it would still fail on the phones that need it most.
### 2026-10-31 — Compress text in QR links; allow denser codes
**Decision:**
- **Compression:** text is deflate-compressed with the browser's built-in `CompressionStream('deflate-raw')` and encoded as `#z=<base64url>` whenever that's shorter than the plain `#t=` form. The shared-text page decompresses it with `DecompressionStream`.
- **Limits:** codes up to 600 characters keep medium error correction. From 601 to 1,000 characters they use low error correction (version 22 at most) and display larger on wide screens.
- **Checked:** a 1,000-character code decodes with an independent reader even at 2 px per square.

**Why:** a ~600-character message you sent was rejected as "too long" after the switch to link-based codes, because base64 adds about a third. Compression roughly halves ordinary prose, so messages like that now fit with room to spare.

**Rejected:**
- A compression library (e.g. lz-string). The browser built-ins are enough and add nothing to the bundle.
- Going beyond 1,000 characters. Codes that dense become unreliable to scan off a phone screen; Copy or sending a file covers longer text.
### 2026-10-31 — Receive codes: guests can send to me (Phase 7)
**Decision:**
- **How it works:** a **Receive** button shows a QR code for `…/beam/#r=<token>`. The token is 32 random bytes, and only its SHA-256 hash is stored, in `receive_codes`. The guest page calls the `receive` Edge Function, which checks the hash and inserts items into my account with the service role, with `from_guest = true`.
- **Limits:** a code works for **10 minutes** (database default, hard maximum 1 hour) and **20 items**, and stops when I close the dialog. Each send uses up one item atomically through `beam_claim_receive()`, which only the service role can call.
- **Files take two steps:**
  1. `upload` uses up one item and returns a Storage **signed upload token** for `<owner>/<new item id>/<safe name>`. The guest uploads straight to Storage, with progress.
  2. `finish` confirms the object exists, then inserts the item, reading its size and type from Storage.
  - Uploads that are never finished are swept up by the hourly cleanup, as orphaned files.
- **Guests can only add.** The function never returns anything about my data, and the guest page shows only the countdown and how many items are left.
- **No service worker for guests:** the guest page and the shared-text page don't register Beam's service worker, so scanning a code doesn't install anything on a stranger's phone.
- **Shared code:** link detection and safe file names moved to `supabase/functions/_shared` (plain TypeScript), so the app and the functions classify and name things identically.
- **Database changes:** the CLI turned out to apply migrations through a temporary login role, so Claude can run `db push` without your database password.

**Rejected:**
- Codes that stay valid until stopped: risky if photographed.
- Single-use codes: inconvenient for sending several photos.
- Putting a Supabase key on the guest page with an RLS policy for guests: it would make guest permissions part of the database's general rules instead of one small function.
### 2026-10-31 — Quick wins: image paste, app shortcuts, Open link (Phase 8)
**Decision:**
- **Pasting files:** a paste into the text box that contains files (a Win+Shift+S screenshot, or files copied in Explorer) sends them as files. Plain text still pastes normally. A page-wide `paste` listener does the same when no text field has focus. Screenshots named `image.png` (or nameless) are renamed `Screenshot YYYY-MM-DD HH-MM-SS.png`, in local time.
- **Paste button:** it now tries `navigator.clipboard.read()` first. A copied image is sent as a file straight away. Text still fills the box so you can check it before sending. If permission is refused, it doesn't try again via `readText()`, which would show a second prompt.
- **App-icon shortcuts** (manifest `shortcuts`): **Send clipboard** (`?action=clipboard`) and **Receive** (`?action=receive`). Send clipboard reads straight away only if the `clipboard-read` permission is already granted and the read succeeds; otherwise it shows a one-tap bar. This keeps to the "no background clipboard reads, no surprise prompts" rule. Shortcut text is sent immediately; that's the point of the shortcut.
- **Open link:** `send-push` now includes `url` for link items (http/https only, built in `notificationPayload()`). The service worker adds an **Open link** action that calls `clients.openWindow(url)` and checks the URL again. Tapping the notification itself still opens Beam on the item.

**Note:** Android only shows new shortcuts after Chrome refreshes the installed app (up to a day), or after reinstalling. Windows picks them up when the app next starts.