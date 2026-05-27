/* ============================================================
   components.jsx — dashboard UI pieces
============================================================ */
const { useState, useEffect, useMemo, useRef } = React;
const U = window.Utils;

/* ---------- Tiny icons (lucide-style strokes) ---------- */
function Icon({ name, size = 14 }) {
  const props = {
    width: size, height: size, viewBox: "0 0 24 24",
    fill: "none", stroke: "currentColor", strokeWidth: 1.75,
    strokeLinecap: "round", strokeLinejoin: "round",
  };
  switch (name) {
    case "search": return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case "settings": return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>;
    case "refresh": return <svg {...props}><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>;
    case "moon": return <svg {...props}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>;
    case "sun": return <svg {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>;
    case "x": return <svg {...props}><path d="M18 6 6 18M6 6l12 12"/></svg>;
    case "chevron-down": return <svg {...props}><path d="m6 9 6 6 6-6"/></svg>;
    case "chevron-right": return <svg {...props}><path d="m9 6 6 6-6 6"/></svg>;
    case "copy": return <svg {...props}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
    case "check": return <svg {...props}><path d="m5 12 5 5L20 7"/></svg>;
    case "alert": return <svg {...props}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>;
    case "package": return <svg {...props}><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>;
    default: return null;
  }
}

/* ---------- KPIs ---------- */
function KpiRow({ orders }) {
  const distinctOrders = new Set(orders.map(o => o.orderId)).size;
  const lineItems = orders.length;
  const totalQty = orders.reduce((s, o) => s + (o.qty || 0), 0);
  const late = orders.filter(o => U.classifyShipBy(o.shipBy).bucket === "late").length;
  return (
    <div className="kpi-row">
      <Kpi label="Open orders" value={distinctOrders} sub="distinct order IDs" />
      <Kpi label="Line items" value={lineItems} sub="rows across all orders" />
      <Kpi label="Total qty" value={totalQty} sub="units to make/ship" accent />
      <Kpi label="Late" value={late} sub={late === 0 ? "all on track" : "past ship-by"} danger={late > 0} />
    </div>
  );
}

function Kpi({ label, value, sub, accent, danger }) {
  return (
    <div className={`kpi ${accent ? "accent" : ""} ${danger ? "danger" : ""}`}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      {sub && <span className="kpi-sub">{sub}</span>}
    </div>
  );
}

/* ---------- Filter bar ---------- */
function FilterBar({ orders, allOrders, search, setSearch, filters, setFilters }) {
  // Counts use unfiltered "allOrders" for chip totals
  const countsByField = (field) => {
    const m = {};
    allOrders.forEach(o => {
      const v = field === "type" ? U.normalizeType(o) : (o[field] || "—");
      const key = v || "—";
      m[key] = (m[key] || 0) + 1;
    });
    return m;
  };

  const toggle = (field, value) => {
    setFilters(prev => {
      const cur = prev[field] || new Set();
      const next = new Set(cur);
      if (next.has(value)) next.delete(value); else next.add(value);
      return { ...prev, [field]: next };
    });
  };

  const statusCounts = countsByField("status");
  const typeCounts = countsByField("type");
  const vendorCounts = countsByField("vendor");

  const renderChips = (field, counts) => Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .filter(([k]) => k && k !== "—")
    .map(([k, n]) => (
      <button key={k}
        className={`chip ${filters[field] && filters[field].has(k) ? "active" : ""}`}
        onClick={() => toggle(field, k)}>
        {k} <span className="chip-count">{n}</span>
      </button>
    ));

  return (
    <div className="filter-bar">
      <div className="search">
        <Icon name="search" size={14} />
        <input
          type="text"
          placeholder="Search customer, order ID, item, SKU…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <button className="btn-ghost" onClick={() => setSearch("")} style={{padding:0}}><Icon name="x" size={14}/></button>}
      </div>
      <div className="chip-group">
        <span className="chip-group-label">Status</span>
        {renderChips("status", statusCounts)}
      </div>
      <div className="chip-group">
        <span className="chip-group-label">Type</span>
        {renderChips("type", typeCounts)}
      </div>
      {Object.keys(vendorCounts).filter(k=>k&&k!=="—").length>0 && (
        <div className="chip-group">
          <span className="chip-group-label">Vendor</span>
          {renderChips("vendor", vendorCounts)}
        </div>
      )}
    </div>
  );
}

/* ---------- Ship-by bucket strip ---------- */
function ShipByBuckets({ orders }) {
  const buckets = { late: [], today: [], week: [], later: [], unscheduled: [] };
  orders.forEach(o => {
    const c = U.classifyShipBy(o.shipBy);
    buckets[c.bucket].push(o);
  });
  const summarize = (list) => ({
    rows: list.length,
    qty: list.reduce((s, o) => s + (o.qty || 0), 0),
  });
  const buckets_def = [
    { key: "late", label: "Late", className: "late" },
    { key: "today", label: "Today", className: "today" },
    { key: "week", label: "This week" },
    { key: "later", label: "Later" },
    { key: "unscheduled", label: "Unscheduled" },
  ];
  return (
    <div className="shipby-grid">
      {buckets_def.map(b => {
        const s = summarize(buckets[b.key]);
        return (
          <div key={b.key} className={`shipby-bucket ${b.className || ""}`}>
            <span className="shipby-label">{b.label}</span>
            <span className="shipby-count">{s.rows}</span>
            <span className="shipby-qty">{s.qty} unit{s.qty===1?"":"s"}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Generic breakdown bar list ---------- */
function BreakdownBars({ title, entries, total }) {
  const max = Math.max(1, ...entries.map(e => e.value));
  return (
    <div className="breakdown">
      <h3>{title}</h3>
      <div className="breakdown-list">
        {entries.map(e => (
          <div className="breakdown-row" key={e.key}>
            <span className="label" title={e.key}>{e.key}</span>
            <div className="bar"><div className="bar-fill" style={{width: `${(e.value/max)*100}%`}}/></div>
            <span className="count">{e.value}{total ? <span style={{opacity:0.5}}> · {Math.round((e.value/total)*100)}%</span> : null}</span>
          </div>
        ))}
        {entries.length===0 && <span className="no-details">No data.</span>}
      </div>
    </div>
  );
}

/* ---------- Breakdowns: by type, by status ---------- */
function BreakdownsRow({ orders }) {
  const byType = {};
  const byStatus = {};
  let total = 0;
  orders.forEach(o => {
    const t = U.normalizeType(o);
    const q = o.qty || 0;
    byType[t] = (byType[t] || 0) + q;
    byStatus[o.status || "—"] = (byStatus[o.status || "—"] || 0) + q;
    total += q;
  });
  const typeEntries = Object.entries(byType).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({key:k,value:v}));
  const statusEntries = Object.entries(byStatus).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({key:k,value:v}));

  return (
    <div className="breakdown-grid">
      <BreakdownBars title="Qty by type" entries={typeEntries} total={total}/>
      <BreakdownBars title="Qty by status" entries={statusEntries} total={total}/>
    </div>
  );
}

/* ---------- Per-item color × size matrix ---------- */
function ItemMatrix({ orders }) {
  // Group by itemGroupKey
  const groups = {};
  orders.forEach(o => {
    const k = U.itemGroupKey(o);
    if (!groups[k]) groups[k] = { key: k, type: U.normalizeType(o), name: o.item, rows: [] };
    groups[k].rows.push(o);
  });

  const groupList = Object.values(groups).sort((a, b) => {
    const qa = a.rows.reduce((s, o) => s + (o.qty || 0), 0);
    const qb = b.rows.reduce((s, o) => s + (o.qty || 0), 0);
    return qb - qa;
  });

  return (
    <div className="item-cards">
      {groupList.map(g => <ItemMatrixCard key={g.key} group={g} />)}
    </div>
  );
}

function ItemMatrixCard({ group }) {
  // Build color × size matrix; if no color/size info, show summary.
  const sizes = new Set();
  const colors = new Set();
  let hasDetails = false;
  group.rows.forEach(o => {
    const c = (o.color || "").trim();
    const s = (o.size || "").trim();
    if (c) { colors.add(c); hasDetails = true; }
    if (s) { sizes.add(s); hasDetails = true; }
  });

  const totalQty = group.rows.reduce((s, o) => s + (o.qty || 0), 0);
  const totalRows = group.rows.length;

  // Sort sizes in a sensible order
  const sizeOrder = ["XS","SMALL","S","MEDIUM","M","LARGE","L","X-LARGE","XL","2XL","XXL","3XL","OS","ONE SIZE","—"];
  const sortedSizes = [...sizes].sort((a, b) => {
    const ia = sizeOrder.indexOf(a.toUpperCase());
    const ib = sizeOrder.indexOf(b.toUpperCase());
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  const sortedColors = [...colors].sort();

  // If neither size nor color → fallback summary
  if (sortedSizes.length === 0 && sortedColors.length === 0) {
    return (
      <div className="item-card">
        <ItemHead group={group} totalRows={totalRows} totalQty={totalQty} />
        <div className="no-details">
          No color/size specified on any open line. {totalQty} unit{totalQty===1?"":"s"} across {totalRows} line{totalRows===1?"":"s"}.
        </div>
      </div>
    );
  }

  // Build matrix
  const useColorRows = sortedColors.length > 0;
  const useSizeCols = sortedSizes.length > 0;

  // grid[color][size] = qty
  const grid = {};
  const colorTotals = {};
  const sizeTotals = {};
  group.rows.forEach(o => {
    const c = (o.color || "").trim() || "—";
    const s = (o.size || "").trim() || "—";
    if (!grid[c]) grid[c] = {};
    grid[c][s] = (grid[c][s] || 0) + (o.qty || 0);
    colorTotals[c] = (colorTotals[c] || 0) + (o.qty || 0);
    sizeTotals[s] = (sizeTotals[s] || 0) + (o.qty || 0);
  });

  // Make sure "—" rows/cols only show if we have unspecified data
  const allColors = Object.keys(grid).sort((a, b) => {
    if (a === "—") return 1; if (b === "—") return -1;
    return a.localeCompare(b);
  });
  const allSizes = [...new Set([...sortedSizes, ...Object.values(grid).flatMap(r => Object.keys(r))])]
    .sort((a, b) => {
      if (a === "—") return 1; if (b === "—") return -1;
      const ia = sizeOrder.indexOf(a.toUpperCase());
      const ib = sizeOrder.indexOf(b.toUpperCase());
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

  return (
    <div className="item-card">
      <ItemHead group={group} totalRows={totalRows} totalQty={totalQty} />
      <table className="matrix">
        <thead>
          <tr>
            <th>{useColorRows ? "Color ↓ / Size →" : "Size"}</th>
            {allSizes.map(s => <th key={s}>{s}</th>)}
            <th>Σ</th>
          </tr>
        </thead>
        <tbody>
          {allColors.map(c => (
            <tr key={c}>
              <th>{c}</th>
              {allSizes.map(s => {
                const v = grid[c]?.[s] || 0;
                return <td key={s} className={`qty ${v === 0 ? "zero" : "has"}`}>{v || ""}</td>;
              })}
              <td className="qty"><strong>{colorTotals[c]}</strong></td>
            </tr>
          ))}
          <tr className="total">
            <th>Σ</th>
            {allSizes.map(s => <td key={s} className="qty">{sizeTotals[s] || 0}</td>)}
            <td className="qty">{totalQty}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ItemHead({ group, totalRows, totalQty }) {
  // Shorten the long item name
  const display = group.name && group.name.length > 80
    ? group.name.slice(0, 78) + "…"
    : group.name || "(no name)";
  return (
    <>
      <div className="item-card-head">
        <div className="item-card-title" title={group.name}>{display}</div>
        <span className="item-card-type">{group.type}</span>
      </div>
      <div className="item-card-stat">
        <span><strong>{totalQty}</strong> units</span>
        <span><strong>{totalRows}</strong> line{totalRows===1?"":"s"}</span>
      </div>
    </>
  );
}

/* ---------- Orders table ---------- */
function OrdersTable({ orders, sort, setSort }) {
  const [expanded, setExpanded] = useState(new Set());
  const toggle = (key) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const cols = [
    { key: "shipBy", label: "Ship by", className: "tight" },
    { key: "status", label: "Status", className: "tight" },
    { key: "orderId", label: "Order", className: "tight mono-cell" },
    { key: "item", label: "Item", className: "item-name" },
    { key: "type", label: "Type", className: "tight" },
    { key: "qty", label: "Qty", className: "qty-cell" },
    { key: "color", label: "Color", className: "tight" },
    { key: "size", label: "Size", className: "tight" },
    { key: "customer", label: "Customer", className: "tight" },
  ];

  const setSortField = (field) => {
    setSort(prev => {
      if (prev.field === field) return { field, dir: prev.dir === "asc" ? "desc" : "asc" };
      return { field, dir: "asc" };
    });
  };

  return (
    <div className="table-wrap" style={{overflowX:"auto"}}>
      <table className="orders-table">
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c.key} className={`sortable ${c.className||""}`} onClick={()=>setSortField(c.key)}>
                {c.label}
                {sort.field === c.key && <span className="sort-ind">{sort.dir==="asc"?"↑":"↓"}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((o, i) => {
            const key = `${o.orderId}-${o.sku}-${i}`;
            const isOpen = expanded.has(key);
            const ship = U.classifyShipBy(o.shipBy);
            const showUrgency = ship.bucket === "late" || ship.bucket === "today";
            return (
              <React.Fragment key={key}>
                <tr className={`row ${isOpen?"expanded":""}`} onClick={() => toggle(key)}>
                  <td className="tight">
                    <div style={{display:"flex",flexDirection:"column",gap:2}}>
                      <span className="mono">{ship.label}</span>
                      {showUrgency && <span className={`badge ${ship.bucket==="late"?"urgent":"due-today"}`}>{U.formatRelative(ship.daysOut)}</span>}
                    </div>
                  </td>
                  <td className="tight"><span className={`badge ${U.statusClass(o.status)}`}>{o.status || "—"}</span></td>
                  <td className="tight mono-cell">{o.orderId}</td>
                  <td className="item-name">{o.item || "—"}</td>
                  <td className="tight"><span className="badge">{U.normalizeType(o)}</span></td>
                  <td className="qty-cell mono">{o.qty}</td>
                  <td className="tight">{o.color || "—"}</td>
                  <td className="tight">{o.size || "—"}</td>
                  <td className="tight">{o.customer || "—"}</td>
                </tr>
                {isOpen && (
                  <tr className="row-detail">
                    <td colSpan={cols.length}>
                      <DetailRow order={o} ship={ship} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
          {orders.length === 0 && (
            <tr><td colSpan={cols.length} style={{textAlign:"center",padding:"32px",color:"var(--text-muted)"}}>No orders match your filters.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function DetailRow({ order, ship }) {
  return (
    <div className="detail-grid">
      <div className="detail-block">
        <h4>Details / notes</h4>
        {order.details
          ? <pre>{order.details}</pre>
          : <span className="no-details">No details on this line.</span>}
        {order.sku && (
          <>
            <h4 style={{marginTop:14}}>SKU</h4>
            <pre>{order.sku}</pre>
          </>
        )}
        {order.vendor && (
          <>
            <h4 style={{marginTop:14}}>Vendor</h4>
            <pre>{order.vendor}</pre>
          </>
        )}
      </div>
      <div className="detail-block">
        <h4>
          Ship to
          <CopyBtn text={order.shipTo || ""} />
        </h4>
        <div className="detail-address">{order.shipTo || "—"}</div>
        <h4 style={{marginTop:14}}>Ordered</h4>
        <pre>{order.ordered || "—"}</pre>
        <h4 style={{marginTop:14}}>Ship by</h4>
        <pre>{ship.label}{ship.daysOut !== null ? ` (${U.formatRelative(ship.daysOut)})` : ""}</pre>
      </div>
    </div>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const click = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };
  return (
    <button className={`copy-btn ${copied?"copied":""}`} onClick={click} title="Copy to clipboard">
      {copied ? <><Icon name="check" size={10}/> Copied</> : <><Icon name="copy" size={10}/> Copy</>}
    </button>
  );
}

/* ---------- Sheet URL modal ---------- */
function SheetUrlModal({ initial, onSave, onClose }) {
  const [val, setVal] = useState(initial || "");
  const inputRef = useRef(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <h2>Connect your Google Sheet</h2>
        <p>Paste the URL of your <strong>ORDERS</strong> tab. The dashboard fetches CSV directly from Google — no API key needed.</p>
        <label>Sheet URL</label>
        <input
          ref={inputRef}
          type="text"
          placeholder="https://docs.google.com/spreadsheets/d/.../edit?gid=..."
          value={val}
          onChange={e=>setVal(e.target.value)}
        />
        <div className="help">
          <strong>One-time setup in Sheets:</strong>
          <ol>
            <li>Click <em>Share</em> (top right)</li>
            <li>Under <em>General access</em>, choose <em>Anyone with the link · Viewer</em></li>
            <li>Copy the URL of the <em>ORDERS</em> tab and paste above</li>
          </ol>
        </div>
        <div className="modal-actions">
          {initial && <button className="btn btn-ghost" onClick={() => { onSave(""); onClose(); }}>Disconnect</button>}
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-accent" onClick={() => { onSave(val.trim()); onClose(); }}>Save & reload</button>
        </div>
      </div>
    </div>
  );
}

window.Components = {
  Icon, KpiRow, FilterBar, ShipByBuckets, BreakdownsRow, ItemMatrix, OrdersTable, SheetUrlModal,
};
