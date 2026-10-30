# Setup

Every manual step needed to run Beam, written so you can redo it from scratch.
Run all commands in **Windows PowerShell** from the project folder (`C:\App Dev\PushMyStuff`).

---

## 0. Prerequisites (one-time)

1. Node.js 24 or newer and Git are installed. Check with:
   ```powershell
   node --version
   ```
   ```powershell
   git --version
   ```
2. Install the project's packages:
   ```powershell
   npm install
   ```

---

## 1. Create the Supabase project

1. Go to <https://supabase.com/dashboard> and sign in. Use the same email you'll use to sign in to Beam: Supabase's built-in email sender only delivers to members of your Supabase organization.
2. Click **New project**.
   - **Name:** `beam`
   - **Database password:** click **Generate a password** and save it in your password manager. You'll need it in Phase 3.
   - **Region:** the one closest to you.
   - **Plan:** Free.
   - If you see options about the **Data API**, leave it **enabled**.
3. Click **Create new project** and wait about 2 minutes for it to finish setting up.

> Free-plan projects pause after about 7 days with no activity. If Beam suddenly can't connect after a break, open the dashboard and click **Restore project**.

---

## 2. Make sign-in emails contain a code (not just a link)

Beam signs you in with a one-time code typed into the app. Supabase's default emails only contain a link, so both templates need changing. Supabase only lets you edit templates once you've set up your own email sender (custom SMTP). We use Resend for this (see `docs/DECISIONS.md`).

### 2a. Create a Resend sending key

1. Go to <https://resend.com> and sign up with **the same email address you'll use to sign in to Beam**. Without your own domain, Resend only delivers to the address on your account, which is all Beam needs.
2. Verify your email if Resend asks you to.
3. In Resend, open **API Keys**, then click **Create API Key**.
   - **Name:** `supabase-beam`
   - **Permission:** **Sending access** (not Full access)
   - **Domain:** All domains
4. Click **Add**, then copy the key (it starts with `re_`). Resend only shows it once. Keep it somewhere temporary until step 2b. Don't put it in `.env.local` or anywhere in the project.

### 2b. Point Supabase at Resend

1. In the Supabase dashboard, go to **Authentication → Emails** and open the **SMTP Settings** tab. If you don't see it, look under **Project Settings → Authentication**.
2. Turn on **Enable custom SMTP** and fill in:
   - **Sender email:** `onboarding@resend.dev`
   - **Sender name:** `Beam`
   - **Host:** `smtp.resend.com`
   - **Port:** `465`
   - **Username:** `resend`
   - **Password:** the `re_...` key from 2a
   - **Minimum interval between emails:** leave the default
3. Click **Save**.

> Codes come from `onboarding@resend.dev`. The first one may land in spam. If it does, mark it "Not spam".

### 2c. Edit the templates

1. Still in **Authentication → Emails**, open the **Templates** tab.
2. Open the **Magic Link** template. Replace the **Subject** with:
   ```
   Your Beam sign-in code
   ```
   and replace the **Body** (message) with:
   ```html
   <h2>Your Beam sign-in code</h2>
   <p>Enter this code in Beam:</p>
   <p style="font-size:28px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
   <p>If you didn't ask for this, you can ignore this email.</p>
   ```
   Click **Save**.
3. Open the **Confirm signup** template and make exactly the same change, with the same subject and body. Your very first sign-in uses this template. Click **Save**.
4. Type `{{ .Token }}` exactly as shown, with double curly braces, a dot and a capital T. Supabase replaces it with the code.
5. Go to **Authentication → Sign In / Providers** (it may be labelled **Providers**) and check that **Email** is enabled. Leave the other settings as they are. The app accepts codes of any length from 6 to 10 digits.

---

## 3. Create the database tables

1. In PowerShell, copy the migration to your clipboard:
   ```powershell
   Get-Content -Raw "supabase\migrations\20261030120000_devices_items.sql" | Set-Clipboard
   ```
2. In the dashboard, open **SQL Editor** in the left sidebar, then click **New query** (or **+**).
3. Paste with **Ctrl+V** and click **Run**.
4. You should see **"Success. No rows returned"**. If it asks you to confirm because the query contains destructive operations, confirm. This is just the `revoke` lines.
5. Check it worked: open **Table Editor**. You should see `devices` and `items`, and each should show RLS as enabled (no "RLS disabled" warning).

---

## 4. Put the keys in `.env.local`

1. In the dashboard, click **Connect** at the top of the page, or go to **Project Settings → API Keys**.
2. Copy the **Project URL** (it looks like `https://abcdefghijklmnop.supabase.co`).
3. Copy the **Publishable key** (it starts with `sb_publishable_`). If you only see a legacy **anon** key, that works too.
   **Do not** copy the `service_role` key or any **secret** key. Those must never go in the app.
4. Create your local env file and open it:
   ```powershell
   Copy-Item .env.example .env.local
   ```
   ```powershell
   notepad .env.local
   ```
5. Fill in the two values after the `=` signs, with no quotes and no spaces. Save, then close Notepad.
   ```
   VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
   ```
   `.env.local` is gitignored, so it will never be committed.

---

## 5. Run Beam locally

1. Start the dev server:
   ```powershell
   npm run dev
   ```
2. Open the `http://localhost:5173` link it prints.
3. To stop the server, press **Ctrl+C** in PowerShell.

---

## 6. Lock the account to just you (after your first sign-in)

Do this once you have signed in to Beam successfully for the first time.

1. Go to **Authentication → Sign In / Providers** (or **Authentication → Settings**).
2. Turn **off** "Allow new users to sign up". Click **Save**.
3. You can still sign in. Nobody else can create an account.

---

## 7. Deploy (written at the end of Phase 1)

Hosting is Vercel (see `docs/DECISIONS.md`). Step-by-step instructions for GitHub, Vercel and installing the PWA on Android and Windows will be added here once the Phase 1 features are built.
