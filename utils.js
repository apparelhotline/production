/* ============================================================
   utils.js — CSV parsing, sheet fetching, helper functions
============================================================ */

// Parse a Google Sheets URL and return { id, gid } or null.
function parseSheetUrl(url) {
  if (!url) return null;
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) return null;
  const gidMatch = url.match(/[#?&]gid=([0-9]+)/);
  return { id: idMatch[1], gid: gidMatch ? gidMatch[1] : "0" };
}

// Build a CSV-export URL for any sheet that has link-sharing enabled.
function buildCsvUrl({ id, gid }) {
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`;
}

// Minimal RFC4180 CSV parser. Handles quoted fields w/ commas + newlines + "".
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    } else {
      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === ',') { row.push(field); field = ""; i++; continue; }
      if (ch === '\r') { i++; continue; }
      if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
      field += ch; i++; continue;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Map a parsed CSV (array-of-arrays) to an array of order objects.
// Expects the header row to look like the ORDERS tab.
function csvToOrders(rows) {
  if (!rows.length) return [];
  // Find header row by looking for "STATUS" and "ORDER ID"
  let headerIdx = 0;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const r = rows[i].map(c => (c || "").toString().trim().toUpperCase());
    if (r.includes("STATUS") && r.some(c => c.startsWith("ORDER"))) {
      headerIdx = i;
      break;
    }
  }
  const header = rows[headerIdx].map(c => (c || "").toString().trim().toUpperCase());
  const col = name => {
    const variants = Array.isArray(name) ? name : [name];
    for (const v of variants) {
      const idx = header.indexOf(v);
      if (idx !== -1) return idx;
    }
    return -1;
  };
  const idx = {
    status: col("STATUS"),
    orderId: col(["ORDER ID", "ORDERID", "ORDER"]),
    ordered: col("ORDERED"),
    item: col(["ITEM NAME", "ITEM"]),
    type: col("TYPE"),
    sku: col("SKU"),
    qty: col("QTY"),
    color: col("COLOR"),
    size: col("SIZE"),
    details: col("DETAILS"),
    vendor: col("VENDOR"),
    shipBy: col(["SHIP BY", "SHIPBY"]),
    customer: col(["CUSTOMER NAME", "CUSTOMER"]),
    shipTo: col(["SHIP TO", "SHIPTO"]),
  };

  const orders = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const get = k => idx[k] >= 0 ? (r[idx[k]] || "").toString().trim() : "";
    const status = get("status");
    const orderId = get("orderId");
    // skip rows with no status AND no order id (blank separators)
    if (!status && !orderId) continue;
    const qtyStr = get("qty");
    const qty = parseInt(qtyStr, 10);
    orders.push({
      status,
      orderId,
      ordered: get("ordered"),
      item: get("item"),
      type: get("type"),
      sku: get("sku"),
      qty: isNaN(qty) ? 0 : qty,
      color: get("color"),
      size: get("size"),
      details: get("details"),
      vendor: get("vendor"),
      shipBy: get("shipBy"),
      customer: get("customer"),
      shipTo: get("shipTo"),
    });
  }
  return orders;
}

async function fetchOrdersFromSheet(sheetUrl) {
  const parsed = parseSheetUrl(sheetUrl);
  if (!parsed) throw new Error("Could not parse sheet URL — make sure it looks like https://docs.google.com/spreadsheets/d/...");
  const csvUrl = buildCsvUrl(parsed);
  const res = await fetch(csvUrl);
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error("Sheet is not publicly accessible. In Sheets, click Share → General access → Anyone with the link → Viewer.");
    }
    throw new Error(`Fetch failed (HTTP ${res.status}).`);
  }
  const text = await res.text();
  const rows = parseCsv(text);
  return csvToOrders(rows);
}

// ---------- Ship-by classification ----------

// "Ship by" values come in two flavors in the sheet:
//  - Plain Etsy timestamps (10-digit seconds since epoch but they're showing as 1780124340 etc — these are unix-seconds for May/Jun 2026)
//  - Manual strings like "May 28", "Jun 3", "Jun 12"
// Returns a Date or null.
function parseShipBy(s) {
  if (!s) return null;
  const t = s.toString().trim();
  if (!t) return null;
  // Numeric unix timestamp (seconds)
  if (/^\d{10}$/.test(t)) {
    const d = new Date(parseInt(t, 10) * 1000);
    return isNaN(d) ? null : d;
  }
  // Numeric unix (ms)
  if (/^\d{13}$/.test(t)) {
    const d = new Date(parseInt(t, 10));
    return isNaN(d) ? null : d;
  }
  // "May 28" / "Jun 3" → assume current year
  const m = t.match(/^([A-Za-z]+)\s+(\d{1,2})$/);
  if (m) {
    const months = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
    const mi = months[m[1].toLowerCase().slice(0,3)];
    if (mi !== undefined) {
      const year = new Date().getFullYear();
      const d = new Date(year, mi, parseInt(m[2], 10));
      // if it's clearly in the past more than 3 months, assume next year
      const today = new Date();
      const diffDays = (today - d) / (1000 * 60 * 60 * 24);
      if (diffDays > 90) d.setFullYear(year + 1);
      return d;
    }
  }
  // Try Date.parse as a fallback
  const parsed = new Date(t);
  return isNaN(parsed) ? null : parsed;
}

// Classify ship-by relative to today.
// Returns { bucket: "late"|"today"|"week"|"later"|"unscheduled", daysOut, label }
function classifyShipBy(s) {
  const d = parseShipBy(s);
  if (!d) return { bucket: "unscheduled", daysOut: null, date: null, label: "—" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(d);
  due.setHours(0, 0, 0, 0);
  const diffMs = due - today;
  const daysOut = Math.round(diffMs / (1000 * 60 * 60 * 24));
  let bucket;
  if (daysOut < 0) bucket = "late";
  else if (daysOut === 0) bucket = "today";
  else if (daysOut <= 7) bucket = "week";
  else bucket = "later";
  return { bucket, daysOut, date: d, label: formatShortDate(d) };
}

function formatShortDate(d) {
  if (!d || isNaN(d)) return "—";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function formatRelative(daysOut) {
  if (daysOut === null) return "";
  if (daysOut < 0) return `${Math.abs(daysOut)}d late`;
  if (daysOut === 0) return "today";
  if (daysOut === 1) return "tomorrow";
  return `in ${daysOut}d`;
}

// ---------- Status helpers ----------

function statusClass(status) {
  const s = (status || "").toUpperCase();
  if (s === "NEW") return "status-new";
  if (s.includes("ART")) return "status-art";
  if (s.includes("DTG") || s.includes("ALFREDO")) return "status-dtg";
  if (s.includes("MOCKUP")) return "status-mockup";
  if (s.includes("PRODUCTION")) return "status-prod";
  if (s.includes("RAUL") || s.includes("EMBROIDERY")) return "status-raul";
  return "";
}

// Normalize a "type" string. Empty falls back to inference from item name.
function normalizeType(order) {
  const t = (order.type || "").toUpperCase().trim();
  if (t) return t;
  const name = (order.item || "").toUpperCase();
  if (name.includes("VISOR")) return "VISOR";
  if (name.includes("MOCKNECK")) return "MOCKNECK";
  if (name.includes("HAT") || name.includes("TRUCKER") || name.includes("SNAPBACK")) return "HAT";
  if (name.includes("SHORT SET") || name.includes("SHORTS")) return "SHORT SET";
  if (name.includes("HOODIE") || name.includes("SWEATSHIRT") || name.includes("CREWNECK")) return "SWEATSHIRT";
  if (name.includes("SHIRT") || name.includes("CROP")) return "T-SHIRT";
  return "OTHER";
}

// Build a stable item-group key for the per-item matrix.
// Strategy: combine TYPE + first 3 words of ITEM name → broad enough that
// "MOCKNECK SET CUSTOM MATCHING MOCKNECK SET" → "MOCKNECK · MOCKNECK SET CUSTOM"
function itemGroupKey(order) {
  const t = normalizeType(order);
  const name = (order.item || "").toUpperCase().replace(/[^\w\s]/g, " ");
  const head = name.split(/\s+/).filter(Boolean).slice(0, 3).join(" ");
  return `${t}\u2003·\u2003${head || "—"}`;
}

window.Utils = {
  parseSheetUrl, buildCsvUrl, parseCsv, csvToOrders, fetchOrdersFromSheet,
  parseShipBy, classifyShipBy, formatShortDate, formatRelative,
  statusClass, normalizeType, itemGroupKey,
};
