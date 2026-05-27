# Handoff: Etsy Orders Dashboard

## TL;DR for Claude Code

This is a **complete, working static web app** — not a mock. It can be deployed to GitHub Pages as-is. Open `index.html` in a browser and it runs. No build step, no dependencies to install.

Your job is to help the user deploy it. Most likely path:
1. Initialize a git repo in this directory
2. Push to GitHub
3. Enable GitHub Pages (Settings → Pages → Deploy from branch `main` / root)
4. Visit `https://<user>.github.io/<repo>/`
5. In the app, click **Connect sheet**, paste their Google Sheet URL, and confirm sharing is set to "Anyone with the link · Viewer" in Sheets

If they ask you to "modernize" it (Vite, React build pipeline, TypeScript, Tailwind, etc.), see [Porting to a build pipeline](#porting-to-a-build-pipeline) at the bottom — but verify they actually want that first. The current setup is intentionally zero-build so they can edit the JSX files directly with no tooling.

---

## What this app does

A single-page dashboard for an Etsy seller's open orders. The seller maintains a Google Sheet (one row per line item) and this dashboard pulls it live and breaks it down for at-a-glance fulfillment.

**Sections, top to bottom:**
- Sticky frosted top bar (title, last-updated, refresh, dark mode, sheet config)
- 4 KPI tiles: open orders, line items, total qty, late count
- Ship-by urgency strip: Late · Today · This week · Later · Unscheduled
- Filter chip bar + search box
- Breakdowns: qty-by-type bars, qty-by-status bars
- Per-item color × size × qty matrix (one card per item-group)
- Sortable orders table with expandable detail rows
- Floating Tweaks panel for theming (5 palettes, 3 fonts, light/dark)

---

## Architecture

Zero-dependency single-page React app, all loaded via CDN, no build step. Babel transpiles JSX in the browser.

```
index.html         ← entry point, loads everything
styles.css         ← all styling + 5 color palettes
data.js            ← demo snapshot data (fallback when no sheet configured)
utils.js           ← CSV parser, gviz fetch, ship-by classifier, helpers
components.jsx     ← UI pieces (KpiRow, FilterBar, ItemMatrix, OrdersTable, modal)
tweaks-panel.jsx   ← TweaksPanel shell + form controls (TweakRadio, TweakColor, etc.)
tweaks.jsx         ← palette/font/theme picker
app.jsx            ← <App /> — state, filters, sort, render orchestration
README.md          ← short user-facing readme
```

### Script load order (matters)

```html
<script src="react@18.3.1"></script>
<script src="react-dom@18.3.1"></script>
<script src="@babel/standalone@7.29.0"></script>
<script src="data.js"></script>
<script src="utils.js"></script>
<script type="text/babel" src="components.jsx"></script>
<script type="text/babel" src="tweaks-panel.jsx"></script>
<script type="text/babel" src="tweaks.jsx"></script>
<script type="text/babel" src="app.jsx"></script>
```

Each `<script type="text/babel">` runs in its own scope after Babel transpiles it. Components/utilities are shared by attaching them to `window` at the bottom of each file (e.g. `window.Components = { ... }`, `window.Utils = { ... }`, `window.Tweaks = ...`).

### Data flow

```
Google Sheet (ORDERS tab, shared "Anyone with link")
   │
   ▼  gviz/tq?tqx=out:csv  (no auth, public CSV export)
   │
fetchOrdersFromSheet(url)         ← utils.js
   │
parseCsv(text) → csvToOrders(rows)
   │
[{ status, orderId, item, type, sku, qty, color, size, details, vendor, shipBy, customer, shipTo, ordered }, …]
   │
   ▼  React state in App
   │
filter(search, statusFilter, typeFilter, vendorFilter)
   │
sort(field, dir)
   │
   ▼
Rendered into KpiRow / ShipByBuckets / BreakdownsRow / ItemMatrix / OrdersTable
```

### Persistence (localStorage)

| Key | Value |
|-----|-------|
| `etsy_dashboard_sheet_url` | Google Sheet URL the user pasted |
| `etsy_dashboard_theme` | `"light"` or `"dark"` |
| `etsy_dashboard_palette` | `"linen"` \| `"graphite"` \| `"mist"` \| `"sage"` \| `"plum"` |
| `etsy_dashboard_font` | `"geist"` \| `"manrope"` \| `"jakarta"` |

These persist per-browser. No server, no account system.

### The five palettes

Each palette is a complete set of CSS custom properties under `:root[data-palette="<id>"]` in `styles.css`. Dark variants under `:root[data-theme="dark"][data-palette="<id>"]`. The `<Tweaks>` component flips `data-palette` and `data-font` attributes on `<html>`.

| ID | Look | Light bg | Light accent | Dark bg | Dark accent |
|------|------|----------|--------------|---------|-------------|
| `linen`    | Warm off-white + terracotta  | `#f7f4ee` | `#b6553a` | `#181513` | `#d77957` |
| `graphite` | iOS clean + Apple blue       | `#f5f5f7` | `#007aff` | `#000000` | `#0a84ff` |
| `mist`     | Cool blue-grey + cobalt      | `#f4f6f9` | `#3b6ea5` | `#131722` | `#5685bf` |
| `sage`     | Pale green + forest          | `#f1f3ee` | `#4a7a5a` | `#161a16` | `#6b9a7b` |
| `plum`     | Buttery cream + aubergine    | `#f8f4ef` | `#8a4570` | `#1a1419` | `#a86089` |

---

## Deployment

### Option 1 — GitHub Pages (recommended, free, what the user asked for)

From this `design_handoff_etsy_dashboard/` directory:

```bash
git init
git add .
git commit -m "Initial Etsy orders dashboard"
git branch -M main
gh repo create etsy-orders --public --source=. --push
# Or, without gh CLI:
#   create repo on github.com, then:
#   git remote add origin git@github.com:<USER>/etsy-orders.git
#   git push -u origin main
```

Then on github.com:
1. Repo → **Settings → Pages**
2. **Source**: Deploy from a branch
3. **Branch**: `main` / `/ (root)`
4. **Save** — wait ~30s, URL appears at the top of the Pages settings

Live at `https://<user>.github.io/etsy-orders/`.

### Option 2 — any static host

Drop the folder onto Netlify, Vercel, Cloudflare Pages, S3, etc. No build command — just publish the directory.

### Option 3 — local

Either:
- Open `index.html` directly in a browser (works because Babel transforms in-browser)
- Or `python3 -m http.server 8080` and visit `http://localhost:8080/`

---

## Connecting the live Google Sheet

The CSV-fetch endpoint used is:

```
https://docs.google.com/spreadsheets/d/<SHEET_ID>/gviz/tq?tqx=out:csv&gid=<TAB_GID>
```

This works for **any sheet shared as "Anyone with the link · Viewer"** — no API key, no OAuth, no published-to-web step required. It supports CORS and returns plain CSV.

Implementation in `utils.js`:
- `parseSheetUrl(url)` extracts `{ id, gid }` from a pasted spreadsheet URL
- `buildCsvUrl({id, gid})` constructs the gviz URL
- `fetchOrdersFromSheet(url)` fetches, parses, and returns order objects

The expected columns (case-insensitive header match on any row that contains `STATUS`):

`STATUS · ORDER ID · ORDERED · ITEM NAME · TYPE · SKU · QTY · COLOR · SIZE · DETAILS · VENDOR · SHIP BY · CUSTOMER NAME · SHIP TO`

Missing columns render as `—`. The parser is tolerant to extra columns and blank separator rows.

### Ship-by parsing

`SHIP BY` accepts three formats (see `parseShipBy` in `utils.js`):
- 10-digit unix seconds (`1780124340`)
- 13-digit unix ms
- Human strings (`"Jun 3"`, `"May 28"`) — assumed current year, rolls forward if >90 days in past

Classification (`classifyShipBy`) bins each row into `late` / `today` / `week` / `later` / `unscheduled`.

---

## Key UI/UX patterns to preserve if you refactor

1. **Tweaks panel** lives outside React's tree concerns — it's a floating element controlled by `data-palette` / `data-font` / `data-theme` attributes on `<html>`. Any port should keep the attribute-driven theming so CSS-only palette swaps stay possible.

2. **Per-item matrix grouping** uses `itemGroupKey()` in `utils.js`: `TYPE + first 3 words of ITEM NAME`. This is intentionally fuzzy because the same product appears with slightly different ITEM NAMEs across orders. Tighten or loosen this here.

3. **Status badges** are color-coded via `statusClass()` in `utils.js` — keyword match on the status string (`"NEW"`, `"ART"`, `"DTG"`, `"MOCKUP"`, `"PRODUCTION"`, `"RAUL"`/`"EMBROIDERY"`). Add new keywords here.

4. **Sticky top bar with frosted glass** uses `backdrop-filter: saturate(150%) blur(14px)` over a `color-mix(in oklab, var(--bg) 80%, transparent)` background. Don't replace with a solid color — it loses the iOS feel.

5. **Press feedback** on every button/chip uses `transform: scale(0.97)` on `:active` with `cubic-bezier(0.22, 1, 0.36, 1)` easing. Keep this throughout.

6. **Snapshot fallback** — when no sheet URL is configured (or fetch fails), the app falls back to `SNAPSHOT_ORDERS` in `data.js` so the page never looks empty. Strip the snapshot if you don't want it shipping; the app handles `orders=[]` cleanly.

---

## Known caveats

- **Babel-in-browser** prints a console warning on every load (`You are using the in-browser Babel transformer`). This is expected and harmless for a personal dashboard. To eliminate, port to a build pipeline (see below).
- **`SHIP BY` values like `1780124340`** in the snapshot are real Etsy-style timestamps and parse correctly as 2026 dates, but if the user's actual sheet uses these as Etsy order IDs (not unix seconds), the urgency logic will be wrong. Verify with the user.
- **CSV columns are matched by header name**, so renaming columns in the sheet will silently break that field. Header detection is case-insensitive.

---

## Porting to a build pipeline (optional)

If the user wants Vite + React + TypeScript + (Tailwind or vanilla CSS modules):

1. `npm create vite@latest etsy-orders -- --template react-ts`
2. Move logic from `utils.js` → `src/lib/sheet.ts` (typed)
3. Move components from `components.jsx` + `app.jsx` → `src/components/*.tsx`
4. Keep `styles.css` palettes — they're framework-agnostic, just import in `main.tsx`
5. Replace CDN React/Babel script tags with `npm install`
6. Replace localStorage usage with a small `useLocalStorage` hook
7. GitHub Pages deploy via `vite.config.ts` with `base: '/etsy-orders/'` and `vite-plugin-gh-pages` or a GitHub Action

**Don't do this unless the user asks.** The current zero-build setup is a feature — they can pop open `app.jsx` in the GitHub web UI and edit it without installing anything.

---

## Files

```
index.html         ← entry; loads scripts in order
styles.css         ← all visual styling (~1000 lines, palette blocks at top)
data.js            ← SNAPSHOT_ORDERS array (~100 demo rows)
utils.js           ← CSV parsing, sheet fetch, helpers, exported as window.Utils
components.jsx     ← UI components, exported as window.Components
tweaks-panel.jsx   ← Tweaks shell (from a starter component, do not modify)
tweaks.jsx         ← Tweaks instance with palette/font/theme controls
app.jsx            ← App root, state, filter/sort, ReactDOM.createRoot mount
README.md          ← short user-facing readme (deploy + features)
```
