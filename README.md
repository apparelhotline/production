# Etsy Orders Dashboard

A clean, static, single-page dashboard for your Etsy orders. Reads directly from a Google Sheet (no API key, no backend) and breaks down open orders by status, type, ship-by urgency, vendor, and a per-item color × size × qty matrix.

## Quick start

1. **Drop the files on GitHub Pages.** Push the folder to a repo, enable Pages on `main` → root. That's it.
2. **Open the page**, click *Connect sheet* (top right), paste your Google Sheet URL (any tab — the one with your ORDERS columns).
3. **In Google Sheets**, click *Share* → *General access* → *Anyone with the link · Viewer*. The dashboard fetches CSV directly from Google.

The sheet URL is stored in your browser (`localStorage`) so each user configures their own. Before configuring, the dashboard shows a snapshot of demo data so the page never looks empty.

## Expected columns

The CSV parser is tolerant — it looks for these header names (case-insensitive) on the first row that contains `STATUS`:

`STATUS · ORDER ID · ORDERED · ITEM NAME · TYPE · SKU · QTY · COLOR · SIZE · DETAILS · VENDOR · SHIP BY · CUSTOMER NAME · SHIP TO`

Missing columns are fine — they just render as `—`.

## What's "open"?

Everything fetched from the ORDERS tab. To exclude completed work, just move those rows to the COMPLETED tab in your sheet.

## Features

- **KPIs** — distinct open orders, line items, total qty, late count
- **Ship-by buckets** — Late · Today · This week · Later · Unscheduled
- **Filter chips** — by status, type, vendor; multi-select; counts on each
- **Search** — customer / order ID / item / SKU / address
- **Per-item matrix** — for every item type, a color × size × qty grid with row + column totals
- **Sortable table** — click any column header
- **Row expansion** — see details, full ship address, vendor, SKU
- **Copy address** — one click to clipboard
- **Dark mode** — toggle in the top bar

## Files

```
index.html      — entry point
styles.css      — soft minimal warm theme
data.js         — snapshot fallback data
utils.js        — CSV parser + sheet fetch + ship-by classifier
components.jsx  — dashboard UI pieces
app.jsx         — main App, filters & sort
```

All assets are loaded relative — no build step. Open `index.html` directly or serve any static way.
