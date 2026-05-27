/* ============================================================
   tweaks.jsx — palette/font picker. Renders inside <App>.
============================================================ */

const PALETTES = [
  { id: "linen",    name: "Linen",    desc: "Warm off-white · terracotta",  swatches: ["#f7f4ee", "#b6553a", "#1f1a14"] },
  { id: "graphite", name: "Graphite", desc: "Crisp iOS · Apple blue",       swatches: ["#f5f5f7", "#007aff", "#1d1d1f"] },
  { id: "mist",     name: "Mist",     desc: "Cool grey · cobalt",           swatches: ["#f4f6f9", "#3b6ea5", "#1c2436"] },
  { id: "sage",     name: "Sage",     desc: "Pale green · forest",          swatches: ["#f1f3ee", "#4a7a5a", "#1f2a22"] },
  { id: "plum",     name: "Plum",     desc: "Buttery cream · aubergine",    swatches: ["#f8f4ef", "#8a4570", "#2a1f28"] },
];

const FONTS = [
  { value: "geist",   label: "Geist" },
  { value: "manrope", label: "Manrope" },
  { value: "jakarta", label: "Jakarta" },
];

function PaletteCard({ palette, active, onClick }) {
  return (
    <button className={`palette-card ${active ? "active" : ""}`} onClick={onClick} type="button">
      <span className="palette-swatches">
        {palette.swatches.map((c, i) => <span key={i} style={{ background: c }} />)}
      </span>
      <span style={{display:"flex", flexDirection:"column"}}>
        <span className="palette-name">{palette.name}</span>
        <span className="palette-desc">{palette.desc}</span>
      </span>
    </button>
  );
}

function Tweaks({ palette, setPalette, font, setFont, theme, setTheme }) {
  return (
    <window.TweaksPanel title="Tweaks">
      <window.TweakSection label="Color scheme">
        <div className="palette-grid">
          {PALETTES.map(p => (
            <PaletteCard
              key={p.id}
              palette={p}
              active={palette === p.id}
              onClick={() => setPalette(p.id)}
            />
          ))}
        </div>
      </window.TweakSection>

      <window.TweakSection label="Type">
        <window.TweakRadio
          label="Font family"
          value={font}
          options={FONTS}
          onChange={setFont}
        />
      </window.TweakSection>

      <window.TweakSection label="Appearance">
        <window.TweakRadio
          label="Mode"
          value={theme}
          options={[
            { value: "light", label: "Light" },
            { value: "dark",  label: "Dark"  },
          ]}
          onChange={setTheme}
        />
      </window.TweakSection>
    </window.TweaksPanel>
  );
}

window.Tweaks = Tweaks;
window.PALETTES = PALETTES;
