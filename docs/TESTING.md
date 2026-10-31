# Testing

Logic is covered by Vitest (`npm test`). Device flows are checked by hand using the lists below.
Tick items as you test them, and note the date and anything odd.

---

## Phase 0 — Project setup

Windows PC (local):
- [ ] `npm run dev`, then open `http://localhost:5173`. The Beam sign-in screen appears.
- [ ] `npm run build`, then `npm run preview`, then open the printed URL. DevTools → Application → Manifest shows "Beam" with icons and no errors.
- [ ] In the same preview, DevTools → Application → Service workers shows `sw.js` as activated.

---

## Phase 1 — Text and links

**Status:** approved on Android and Windows, 2026-10-31.

### A. Quick local check on the PC (before deploying)
Run `npm run dev` and open `http://localhost:5173` in Edge or Chrome.
- [ ] Wrong password: shows "Wrong email or password."
- [ ] Right password: shows "Name this device", pre-filled with "Windows PC".
- [ ] Click **Continue**: the main screen shows the paste box and the "Recent" list, and the dot at the top says **Live** (green).
- [ ] Type some text and click **Send**: it appears at the top as "This device · just now", and the box clears.

### B. Install on both devices
Follow `docs/SETUP.md` section 6, then sign in on each device.
- [ ] **Android:** Beam installs from Chrome and opens full-screen from its home-screen icon. The naming screen suggests "Android phone".
- [ ] **Windows:** Beam installs from Edge or Chrome, opens in its own window and appears in the Start menu.
- [ ] Close Beam completely and reopen it on each device. You're still signed in and not asked to name the device again.

### C. Sending and receiving (have both devices open)
- [ ] **PC → phone:** send text from the PC. It appears on the phone within about 2 seconds, with a brief indigo outline, labelled with the PC's name.
- [ ] **Phone → PC:** the same in reverse.
- [ ] The item is **not** outlined on the device that sent it, and is labelled "This device" there.
- [ ] **Link:** paste just a URL (e.g. `https://example.com`). The hint says "Will send as a link". On the other device it shows as a link with an **Open** button, which opens it in the browser.
- [ ] **Not a link:** text with a URL plus other words (e.g. `look at https://example.com`) is sent as plain text.
- [ ] `www.example.com` is sent as a link and opens `https://www.example.com`.
- [ ] **Copy:** tap Copy on a text item. You see "Copied", and pasting into another app gives exactly the same text, line breaks included.
- [ ] **Long text:** more than 6 lines shows **Show more / Show less**.
- [ ] **Empty box:** the Send button is disabled.
- [ ] **Delete:** delete an item on one device. It disappears there at once, and on the other device within a couple of seconds (or the next time you switch back to the app).

### D. Clipboard button
- [ ] **Android:** tap **Paste from clipboard**. The first time, Chrome asks for permission; allow it, and the clipboard text fills the box.
- [ ] **Android:** deny the permission (or turn it off in site settings). Beam shows a message explaining how to paste manually.
- [ ] **Windows:** **Paste from clipboard** fills the box. Edge or Chrome may ask the first time.

### E. Missed messages and reconnecting
- [ ] Turn on airplane mode on the phone. The dot turns red ("Offline – reconnecting").
- [ ] While the phone is offline, send something from the PC. Turn airplane mode off. The item appears on the phone without you doing anything else.
- [ ] Lock the phone for 5 minutes or more, send something from the PC, then unlock and open Beam. The item is there.
- [ ] Minimise Beam on the PC, send from the phone, then bring Beam back. The item is there.

### F. Device name and sign out
- [ ] Tap the device name (top right), rename the device and save. You see "Device renamed". New items sent from it show the new name on the other device.
- [ ] Choose **Sign out of this device**. The sign-in screen appears, and the **other** device is still signed in.
- [ ] Sign in again on the same device. You're not asked to name it again.

### G. Expiry (check the next day)
- [ ] Items older than 24 hours no longer appear in the list. They're deleted from the database in Phase 5.

---

## Phase 2 — Files

**Status:** approved on Android and Windows, 2026-10-31 (including the Photos button).

Do these after SETUP.md section 7 (migration + deploy), with Beam open on both devices.

### A. Sending files
- [ ] **Windows:** click **Files…**, pick one file (e.g. a PDF). An upload row with a progress bar appears, then the file shows at the top of the list with its icon, name and size.
- [ ] **Windows:** pick 3 files at once. They upload one after another (the others say "Waiting…"), and each becomes its own item.
- [ ] **Windows:** drag a file from Explorer onto the Beam window. A "Drop files to send" overlay appears, and dropping the file sends it.
- [ ] **Android:** tap **Files…**. The Android picker opens (Camera / Video / Files). Pick a file and it uploads with progress.
- [ ] **Android:** tap **Photos**. Android's Photos picker opens, showing your recent photos and albums. Select two or more photos and videos; each uploads as its own item.
- [ ] **Windows:** there is no Photos button (only Paste from clipboard, Files… and Send).
- [ ] **Too big:** try a file over 50 MB. You get a "…is NN MB. Beam's limit is 50 MB per file." message and nothing uploads.
- [ ] **Cancel:** start a large upload (20–50 MB) and tap **Cancel**. You see "Cancelled …", and no item appears on either device.

### B. Receiving and downloading
- [ ] A file sent from the PC appears on the phone within a couple of seconds, with the PC's name and a brief highlight.
- [ ] **Photos** (JPEG/PNG) show a small thumbnail in the list on both devices. Other files show an extension badge (PDF, ZIP…).
- [ ] **Android:** tap **Download**. The button shows "Downloading NN%", then the file appears in your Downloads with its original name and opens correctly.
- [ ] **Windows:** **Download** saves the file with its original name (including spaces or accents) and it opens correctly.
- [ ] A file with an unusual name (e.g. `Café menu (final).pdf`) downloads with that exact name.

### C. Deleting
- [ ] Delete a file item on one device. It disappears on both devices.
- [ ] In Supabase, **Storage → files → (your user id folder)**: the deleted item's folder is gone, or empty.

### D. Problems to report
- [ ] Note any upload that fails and the exact message shown.
---

## Phase 2b — Cleanup

**Status:** approved on Android and Windows, 2026-10-31.

Hard to watch in real time. Check it over a day.
- [ ] In Supabase, **Integrations → Cron** (or **Database → Cron**) shows a job **beam-cleanup** scheduled `7 * * * *`, and its recent runs succeed.
- [ ] **Edge Functions → cleanup → Logs** show `cleanup: removed N orphaned file(s)` each hour.
- [ ] Items older than 24 hours disappear from both devices without you doing anything (even with Beam closed overnight).
- [ ] In **Storage → files**, folders for expired items are gone after the next hourly run.

---

## Phase 3 — Notifications

**Status:** approved on Android and Windows, 2026-10-31.

Set up per SETUP.md section 9 first.
- [ ] **Android:** device menu → Notifications → **Enable** → Allow. It now says "On".
- [ ] **Windows:** the same. The Windows tip about background running appears.
- [ ] **Phone gets a notification:** close Beam on the phone (swipe it away), send text from the PC. A notification "From <PC name>" shows the text.
- [ ] **PC gets a notification:** minimise or close the Beam window, send from the phone. A Windows notification appears.
- [ ] **Tap the notification.** Beam opens and scrolls to that item, with a brief highlight.
- [ ] **No self-notifications:** the device you send from never gets a notification for its own item.
- [ ] **No notification while open:** with Beam open and in front on the receiving device, nothing pops up (the item just appears).
- [ ] **Files and links:** the notification says "File: name" or shows the link.
- [ ] **Turn off:** device menu → Notifications → **Turn off**. Sends from the other device no longer notify this one.

---

## Phase 4 — Android share sheet

**Status:** approved on Android and Windows, 2026-10-31.

Set up per SETUP.md section 10 first. Only works in the installed app on Android.
- [ ] **Chrome:** open any web page, tap **Share → Beam**. Beam opens, shows "Shared to Beam ✓", and the PC gets the page as a link with **Open**.
- [ ] **Photos:** share one photo, then three photos at once. Each uploads with progress and appears on the PC with a thumbnail.
- [ ] **Messaging app** (WhatsApp, Messages…): share a message's text. It arrives on the PC as text.
- [ ] **Text plus link** (e.g. sharing from an app that adds a message): both arrive in one item.
- [ ] **Over 50 MB** (e.g. a long video): you get the "Beam's limit is 50 MB" message and nothing uploads.
- [ ] **Not signed in:** sign out, share something, then sign in. It's sent after you sign in.

---

## Phase 5 — Polish

**Status:** approved on Android and Windows, 2026-10-31.

- [ ] **Keep:** tap **Keep** on an item. A "KEPT" badge appears on both devices, and the button says **Unkeep**.
- [ ] **Keep survives expiry:** a kept item is still there after 24 hours (check the next day).
- [ ] **Unkeep:** the item stays for another 24 hours, then disappears.
- [ ] **Offline banner:** turn on airplane mode. An amber "You're offline" banner appears, and goes away when you're back online.
- [ ] **Load error:** with airplane mode on, reopen Beam. An error with **Try again** appears; turn airplane mode off and tap it, and the list loads.
- [ ] **Empty state:** with no items, the empty box shows a tip (share sheet on Android; drag and drop / Ctrl+Enter on Windows).
- [ ] **Ctrl+Enter (Windows):** type text and press Ctrl+Enter to send. Plain Enter makes a new line.
- [ ] **Phone layout:** on every card, the buttons (Copy / Open / Download, Keep, Delete) fit on one row. Long text shows **Show more** under it.
---

## Phase 6 — QR codes

**Status:** approved, 2026-10-31.

Use a phone that **isn't** signed in to Beam (a friend's, or your phone's camera while Beam shows the code on the PC).
- [ ] **Link:** on the PC, tap **QR** on a link item. Point a phone camera at the screen and the link opens on that phone.
- [ ] **Text:** tap **QR** on a short text item. Scanning opens a "Shared from Beam" page in the phone's browser showing the text, with **Copy text**. No sign-in is asked for.
- [ ] **Medium text (a paragraph, ~500–700 characters):** **QR** shows a code (denser than a short one) that still scans and opens the full text.
- [ ] **Very long text (a page or more):** **QR** says it's too long and suggests Copy or sending it as a file.
- [ ] **File:** tap **QR** on a file item. The dialog shows the file name, size and a countdown from about 15:00. Scanning downloads the file on the other phone with its original name.
- [ ] **Expiry:** leave the file QR open for 15 minutes (or come back later). It says the link has expired and offers **New link**, which shows a fresh code. The old code no longer downloads.
- [ ] **Closing:** **Close**, tapping outside the white box, and **Esc** on the PC all close the dialog.
- [ ] **Dark mode:** the code still scans with the phone in dark mode (it's always black on white).
- [ ] **Phone layout:** cards still fit their buttons on one row (Open · Copy · QR · Keep · Delete).
---

## Phase 7 — Receive codes (someone sends to you)

**Status:** approved, 2026-10-31.

You need a second phone that isn't signed in to Beam (a friend's, or a browser in private/incognito mode).
- [ ] **Open:** in Beam, tap **Receive** (top right). A QR code appears with "Works for 10:00 · up to 20 items", counting down.
- [ ] **Guest page:** scan it with the other phone. A "Send to Beam" page opens with no sign-in, showing the countdown and "20 items left".
- [ ] **Text:** the guest types a message and taps **Send**. It shows "Sent ✓". Within a couple of seconds it appears on **all** your devices labelled **Guest**, and the Receive dialog shows "1 received".
- [ ] **Link:** the guest sends just a URL. It arrives as a link with **Open**.
- [ ] **Photos and files:** the guest taps **Photos**, picks two pictures, and sees a progress bar for each. Both arrive as file items you can **Download** (no thumbnail for guest photos).
- [ ] **Over 50 MB:** a guest file over 50 MB shows a "limit is 50 MB" message and isn't sent.
- [ ] **Notification:** with Beam closed on your phone, a guest send gives a "From a guest" notification.
- [ ] **Stop:** tap **Stop receiving**. On the guest page, the next send fails with "The code expired", and reloading it says the code isn't accepting anything.
- [ ] **Expiry:** leave a code for 10 minutes. The dialog says it has expired and offers **New code**. The old code no longer works on the guest page.
- [ ] **Privacy:** the guest page never shows any of your items, names or devices.
---

## Phase 8 — Quick wins

Close and reopen Beam on each device first (on the PC, Ctrl+Shift+R in the Beam window if needed).

**Pasting images (Windows)**
- [ ] Press **Win+Shift+S** and snip part of the screen, then click in Beam's text box and press **Ctrl+V**. It uploads straight away as `Screenshot <date> <time>.png` and arrives on the phone with a thumbnail.
- [ ] Snip again, click on an empty part of the Beam window (not the text box), and press **Ctrl+V**. Same result.
- [ ] Copy a file in File Explorer (**Ctrl+C**), then **Ctrl+V** in Beam. It's sent with its own name.
- [ ] Copy some text and press **Ctrl+V** in the box. The text appears in the box as before (not sent as a file).
- [ ] Copy an image (right-click an image in a web page → **Copy image**), then click **Paste from clipboard**. The image is sent.

**App-icon shortcuts**
- [ ] **Windows:** right-click Beam's taskbar icon (or its Start menu entry). **Send clipboard** and **Receive from someone** are listed.
- [ ] **Send clipboard** with text copied: Beam opens and sends it ("Sent from clipboard ✓"), or shows a **Send clipboard** bar to tap if it doesn't have clipboard permission yet.
- [ ] **Receive from someone:** Beam opens straight into the Receive QR code.
- [ ] **Android:** long-press the Beam icon. The two shortcuts appear (may take up to a day, or reinstall Beam to get them straight away; see SETUP.md section 10).

**Open link on notifications**
- [ ] With Beam closed on the phone, send a link from the PC. The notification has an **Open link** button, which opens the page in Chrome directly.
- [ ] Tapping the notification itself (not the button) still opens Beam on that item.
- [ ] Text and file notifications have no Open link button.