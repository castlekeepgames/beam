# Testing

Logic is covered by Vitest (`npm test`). Device flows are checked by hand using the lists below.
Tick items as you test them, and note the date and anything odd.

---

## Phase 0 — Project setup

Windows PC (local):
- [ ] `npm run dev`, then open `http://localhost:5173`. You should see the Beam logo and "Setup in progress."
- [ ] `npm run build`, then `npm run preview`, then open the printed URL. DevTools → Application → Manifest shows "Beam" with icons and no errors.
- [ ] In the same preview, DevTools → Application → Service workers shows `sw.js` as activated.

## Phase 1 — Text and links

Checklist will be written as the Phase 1 features are built.
