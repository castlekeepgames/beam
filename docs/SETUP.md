# Setup

Every manual step needed to run Beam, written so you can redo it from scratch.
Run all commands in **Windows PowerShell** from the project folder (`C:\App Dev\PushMyStuff`).

Beam uses only two services: **Supabase** (database, login, realtime) and **GitHub** (code + hosting via GitHub Pages).

---

## 0. Prerequisites (one-time)

1. Node.js 24 or newer and Git are installed. Check with:
   ```powershell
   node --version
   ```
   ```powershell
   git --version
   ```
2. Let PowerShell run npm. If `npm` fails with *"npm.ps1 cannot be loaded because running scripts is disabled on this system"*, allow local scripts for your Windows user (type `Y` if asked):
   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
   ```
   If you'd rather not change this setting, type `npm.cmd` wherever these docs say `npm` (e.g. `npm.cmd run dev`).
3. Install the project's packages:
   ```powershell
   npm install
   ```

---

## 1. Create the Supabase project

1. Go to <https://supabase.com/dashboard> and sign in (or sign up).
2. Click **New project**.
   - **Name:** `beam`
   - **Database password:** click **Generate a password** and save it in your password manager. You'll need it in Phase 3.
   - **Region:** the one closest to you.
   - **Plan:** Free.
   - If you see options about the **Data API**, leave it **enabled**.
3. Click **Create new project** and wait about 2 minutes for it to finish setting up.

> Free-plan projects pause after about 7 days with no activity. If Beam suddenly can't connect after a break, open the dashboard and click **Restore project**.

---

## 2. Create your Beam login and block everyone else

Beam has exactly one user: you. You create that user here, then switch off sign-ups so nobody else can make an account. Supabase never needs to send an email.

1. In the left sidebar, go to **Authentication → Users**.
2. Click **Add user**, then **Create new user**.
   - **Email:** your email address
   - **Password:** a strong password. Save it in your password manager; you'll type it once on each device.
   - Tick **Auto Confirm User**.
3. Click **Create user**. You should see yourself in the users list.
4. Go to **Authentication → Sign In / Providers** (it may be labelled **Providers** or **Settings**).
5. Turn **off** **Allow new users to sign up**, then click **Save**.
6. On the same page, check that the **Email** provider is enabled. Leave everything else as it is.

> If you had already started setting up custom SMTP or Resend: it isn't needed. You can switch **Enable custom SMTP** off again or leave it; Beam doesn't use it.

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
   `.env.local` is gitignored, so it will never be committed. Keep these two values handy for section 6 as well.

---

## 5. Run Beam locally

1. Start the dev server:
   ```powershell
   npm run dev
   ```
2. Open the `http://localhost:5173` link it prints.
3. To stop the server, press **Ctrl+C** in PowerShell.

---

## 6. Put Beam online with GitHub Pages (end of Phase 1)

Your phone can only install Beam, get notifications and use the share sheet from a real HTTPS site. GitHub Pages gives you one for free. The repo must be **public** for free Pages; nothing secret is in it.

### 6a. Create the GitHub repo and push the code

1. Go to <https://github.com> and sign in (or sign up).
2. Go to <https://github.com/new>.
   - **Repository name:** `beam`
   - **Public**
   - Leave **Add a README**, **.gitignore** and **license** all off (the project already has these).
3. Click **Create repository**.
4. In PowerShell, connect the project to it, replacing `YOUR-GITHUB-USERNAME`:
   ```powershell
   git remote add origin https://github.com/YOUR-GITHUB-USERNAME/beam.git
   ```
5. Push the code. A browser window may open asking you to sign in to GitHub; approve it.
   ```powershell
   git push -u origin main
   ```

### 6b. Give the build its two Supabase values

1. On the repo page, go to **Settings → Secrets and variables → Actions**.
2. Open the **Variables** tab and click **New repository variable**.
   - **Name:** `VITE_SUPABASE_URL` **Value:** your Project URL. Click **Add variable**.
3. Click **New repository variable** again.
   - **Name:** `VITE_SUPABASE_PUBLISHABLE_KEY` **Value:** your publishable key. Click **Add variable**.

### 6c. Turn on GitHub Pages

1. Go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Go to the **Actions** tab, click **Deploy to GitHub Pages** on the left, then **Run workflow → Run workflow**.
4. Wait for the run to show a green tick (about 1 minute).
5. Beam is now at `https://YOUR-GITHUB-USERNAME.github.io/beam/`.

From now on, every `git push` to `main` redeploys automatically.

### 6d. Install Beam on your devices

**Android phone (Chrome):**
1. Open `https://YOUR-GITHUB-USERNAME.github.io/beam/` in Chrome.
2. Tap the **⋮** menu, then **Add to Home screen** (or **Install app**), then **Install**.
3. Open Beam from your home screen and sign in.

**Windows PC (Edge or Chrome):**
1. Open the same URL.
2. Click the **Install** icon at the right end of the address bar (a monitor with a down arrow), then **Install**.
3. Beam opens in its own window and is added to the Start menu. Sign in.
