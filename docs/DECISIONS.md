# Decisions

One entry per meaningful decision, newest at the bottom.

---

### 2026-10-30 — Stack versions from the current Vite template
**Decision:** Vite 8, React 19, TypeScript 7, Tailwind CSS 4 (`@tailwindcss/vite`), `vite-plugin-pwa` 2 (injectManifest), Vitest 5, oxlint (the template's linter).
**Why:** These are what `create-vite` generates today, and they all have compatible peer ranges, so we don't start on outdated majors.
**Rejected:** Pinning older majors (Vite 6, Tailwind 3), which gains nothing for a new project.

### 2026-10-30 — Hosting: Vercel (Hobby plan)
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
**Decision:** Supabase Auth sends email through Resend's SMTP (`smtp.resend.com`), from `onboarding@resend.dev`, using a Resend API key with sending access only.
**Why:** Supabase won't let you edit email templates without custom SMTP, and we need the template to show the one-time code. The built-in sender is also limited to a couple of emails per hour. Resend's free tier covers this easily. Its key can only send mail, and without a verified domain Resend only delivers to the account owner's address, which suits a single-user app.
**Rejected:** Gmail SMTP with an app password. It works, but that password gives full access to the Gmail account if it ever leaks. We also rejected switching to magic links: tapping a link in the email opens the browser rather than the installed PWA, which makes sign-in fiddly.
