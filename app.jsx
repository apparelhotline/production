/* ============================================================
   app.jsx — main App
============================================================ */
const { Icon, KpiRow, FilterBar, ShipByBuckets, BreakdownsRow, ItemMatrix, OrdersTable, SheetUrlModal } = window.Components;
const U2 = window.Utils;

const LS_SHEET_URL = "etsy_dashboard_sheet_url";
const LS_THEME = "etsy_dashboard_theme";
const LS_PALETTE = "etsy_dashboard_palette";
const LS_FONT = "etsy_dashboard_font";

const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1ysZPOFHIwNATn8rrUwiy9Y-G3-nbDwcUxMxoMUXTTys/edit?gid=728848446";

function App() {
  const [orders, setOrders] = useState(window.SNAPSHOT_ORDERS);
  const [source, setSource] = useState("snapshot"); // "snapshot" | "sheet"
  const [lastUpdated, setLastUpdated] = useState(null);
  const [sheetUrl, setSheetUrl] = useState(() => localStorage.getItem(LS_SHEET_URL) || DEFAULT_SHEET_URL);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem(LS_THEME) || "light");
  const [palette, setPalette] = useState(() => localStorage.getItem(LS_PALETTE) || "linen");
  const [font, setFont] = useState(() => localStorage.getItem(LS_FONT) || "geist");

  // Filters & search & sort
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ status: new Set(), type: new Set(), vendor: new Set() });
  const [sort, setSort] = useState({ field: "shipBy", dir: "asc" });

  // Apply theme / palette / font to <html>
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(LS_THEME, theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.setAttribute("data-palette", palette);
    localStorage.setItem(LS_PALETTE, palette);
  }, [palette]);
  useEffect(() => {
    document.documentElement.setAttribute("data-font", font);
    localStorage.setItem(LS_FONT, font);
  }, [font]);

  // Fetch from sheet if URL set
  const reload = async () => {
    if (!sheetUrl) {
      setOrders(window.SNAPSHOT_ORDERS);
      setSource("snapshot");
      setLastUpdated(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await U2.fetchOrdersFromSheet(sheetUrl);
      setOrders(data);
      setSource("sheet");
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message || String(e));
      // keep showing snapshot
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [sheetUrl]);

  // Filter + sort logic
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sFilters = filters.status, tFilters = filters.type, vFilters = filters.vendor;
    let out = orders.filter(o => {
      if (sFilters.size && !sFilters.has(o.status || "—")) return false;
      if (tFilters.size && !tFilters.has(U2.normalizeType(o))) return false;
      if (vFilters.size && !vFilters.has(o.vendor || "—")) return false;
      if (!q) return true;
      const hay = [o.orderId, o.customer, o.item, o.sku, o.color, o.size, o.shipTo]
        .filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });

    // Sort
    const dir = sort.dir === "asc" ? 1 : -1;
    out = [...out].sort((a, b) => {
      let va, vb;
      if (sort.field === "shipBy") {
        const ca = U2.classifyShipBy(a.shipBy);
        const cb = U2.classifyShipBy(b.shipBy);
        // unscheduled at the bottom always
        if (!ca.date && !cb.date) return 0;
        if (!ca.date) return 1;
        if (!cb.date) return -1;
        return (ca.date - cb.date) * dir;
      }
      if (sort.field === "qty") return ((a.qty || 0) - (b.qty || 0)) * dir;
      if (sort.field === "type") {
        va = U2.normalizeType(a); vb = U2.normalizeType(b);
      } else {
        va = (a[sort.field] || "").toString().toUpperCase();
        vb = (b[sort.field] || "").toString().toUpperCase();
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    return out;
  }, [orders, search, filters, sort]);

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <h1><span className="dot" /> Etsy Orders</h1>
          <span className="sub">
            Open orders
            {source === "snapshot" && <> · <span style={{color:"var(--accent)"}}>demo snapshot</span></>}
          </span>
        </div>
        <div className="topbar-actions">
          {lastUpdated && (
            <span className="last-updated">
              Updated {lastUpdated.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}
            </span>
          )}
          {loading && <span className="spinner" />}
          <button className="btn btn-icon" title="Refresh" onClick={reload} disabled={loading}>
            <Icon name="refresh" size={14}/>
          </button>
          <button className="btn btn-icon" title="Toggle dark mode"
            onClick={() => setTheme(t => t === "light" ? "dark" : "light")}>
            <Icon name={theme === "light" ? "moon" : "sun"} size={14}/>
          </button>
          <button className="btn" title="Connect a Google Sheet" onClick={() => setShowSettings(true)}>
            <Icon name="settings" size={14}/>
            {sheetUrl ? "Sheet connected" : "Connect sheet"}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-box">
          <strong>Couldn't load sheet</strong>
          {error}
          <div style={{marginTop:6, fontSize:12, opacity:0.85}}>
            Showing snapshot data instead. Click <em>Sheet connected</em> to update settings.
          </div>
        </div>
      )}

      <KpiRow orders={filtered} />

      <div className="section">
        <div className="section-head">
          <h2 className="section-title">Ship-by urgency</h2>
        </div>
        <ShipByBuckets orders={filtered} />
      </div>

      <div className="section">
        <div className="section-head">
          <h2 className="section-title">Filters & search</h2>
        </div>
        <FilterBar
          orders={filtered}
          allOrders={orders}
          search={search} setSearch={setSearch}
          filters={filters} setFilters={setFilters}
        />
      </div>

      <div className="section">
        <div className="section-head">
          <h2 className="section-title">Breakdowns <span className="muted">across filtered open orders</span></h2>
        </div>
        <BreakdownsRow orders={filtered} />
      </div>

      <div className="section">
        <div className="section-head">
          <h2 className="section-title">
            Per-item · color × size × qty
            <span className="muted">{filtered.length} line{filtered.length===1?"":"s"}</span>
          </h2>
        </div>
        <ItemMatrix orders={filtered} />
      </div>

      <div className="section">
        <div className="section-head">
          <h2 className="section-title">
            Open orders
            <span className="muted">{filtered.length} of {orders.length}</span>
          </h2>
        </div>
        <OrdersTable orders={filtered} sort={sort} setSort={setSort} />
      </div>

      {showSettings && (
        <SheetUrlModal
          initial={sheetUrl}
          onSave={(v) => { setSheetUrl(v); localStorage.setItem(LS_SHEET_URL, v); }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {window.Tweaks && (
        <window.Tweaks
          palette={palette} setPalette={setPalette}
          font={font} setFont={setFont}
          theme={theme} setTheme={setTheme}
        />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
