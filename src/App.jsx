import React, { useState, useCallback } from "react";

const COLORS = {
  bg: "#F2E2C4",
  bgDark: "#E8D4B0",
  red: "#C41E24",
  black: "#1A1A1A",
  teal: "#6CBFC0",
  white: "#FAFAF5",
  gridLine: "#1A1A1A",
  cellHover: "rgba(108,191,192,0.15)",
  headerBg: "#1A1A1A",
  headerText: "#F2E2C4",
};

const DEFAULT_SUSPECTS = ["Suspeito A", "Suspeito B", "Suspeito C"];
const DEFAULT_WEAPONS = ["Arma 1", "Arma 2", "Arma 3"];
const DEFAULT_PLACES = ["Local X", "Local Y", "Local Z"];

function createMatrix(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function applyConfirm(grid, r, c, n) {
  grid[r][c] = 1;
  for (let i = 0; i < n; i++) {
    if (i !== c) grid[r][i] = grid[r][i] === 1 ? 1 : -1;
    if (i !== r) grid[i][c] = grid[i][c] === 1 ? 1 : -1;
  }
}

function autoComplete(grid, n) {
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < n; r++) {
      const open = [];
      for (let c = 0; c < n; c++) {
        if (grid[r][c] === 0) open.push(c);
      }
      if (open.length === 1 && grid[r][open[0]] !== 1) {
        applyConfirm(grid, r, open[0], n);
        changed = true;
      }
    }
    for (let c = 0; c < n; c++) {
      const open = [];
      for (let r = 0; r < n; r++) {
        if (grid[r][c] === 0) open.push(r);
      }
      if (open.length === 1 && grid[open[0]][c] !== 1) {
        applyConfirm(grid, open[0], c, n);
        changed = true;
      }
    }
  }
}

function propagate(sw, sp, wp, n) {
  let changed = true;
  while (changed) {
    changed = false;
    for (let s = 0; s < n; s++) {
      for (let w = 0; w < n; w++) {
        if (sw[s][w] !== 1) continue;
        for (let p = 0; p < n; p++) {
          if (sp[s][p] === 1 && wp[w][p] !== 1) {
            applyConfirm(wp, w, p, n);
            changed = true;
          }
          if (wp[w][p] === 1 && sp[s][p] !== 1) {
            applyConfirm(sp, s, p, n);
            changed = true;
          }
          if (sp[s][p] === -1 && wp[w][p] === 1) {
            if (sw[s][w] === 0) { /* no action needed beyond what's set */ }
          }
        }
      }
    }
    for (let s = 0; s < n; s++) {
      for (let p = 0; p < n; p++) {
        if (sp[s][p] !== 1) continue;
        for (let w = 0; w < n; w++) {
          if (sw[s][w] === 1 && wp[w][p] !== 1) {
            applyConfirm(wp, w, p, n);
            changed = true;
          }
          if (wp[w][p] === 1 && sw[s][w] !== 1) {
            applyConfirm(sw, s, w, n);
            changed = true;
          }
        }
      }
    }
    for (let w = 0; w < n; w++) {
      for (let p = 0; p < n; p++) {
        if (wp[w][p] !== 1) continue;
        for (let s = 0; s < n; s++) {
          if (sw[s][w] === 1 && sp[s][p] !== 1) {
            applyConfirm(sp, s, p, n);
            changed = true;
          }
          if (sp[s][p] === 1 && sw[s][w] !== 1) {
            applyConfirm(sw, s, w, n);
            changed = true;
          }
        }
      }
    }
    autoComplete(sw, n);
    autoComplete(sp, n);
    autoComplete(wp, n);
  }
}

function CellContent({ value }) {
  if (value === -1)
    return (
      <span style={{ color: COLORS.red, fontWeight: 800, fontSize: "1.1em", fontFamily: "'Courier New', monospace" }}>
        ✕
      </span>
    );
  if (value === 1)
    return (
      <span style={{ color: COLORS.teal, fontWeight: 800, fontSize: "1.2em" }}>
        ✓
      </span>
    );
  return null;
}

// Tabela combinada única, layout clássico Murdle/Cluedo:
//
//                | Suspeito A | Suspeito B | Suspeito C |  ← colunas de suspeitos
// ───────────────┼────────────┼────────────┼────────────┤
// [ARMAS]        |            |            |            |
//   Arma 1       |  SW[0][0]  |  SW[0][1]  |  SW[0][2]  |
//   Arma 2       |  SW[1][0]  |  SW[1][1]  |  SW[1][2]  |
//   Arma 3       |  SW[2][0]  |  SW[2][1]  |  SW[2][2]  |
// ───────────────┼────────────┼────────────┼────────────┤
// [LOCAIS]       |            |            |            |
//   Local X      |  SP[0][0]  |  SP[0][1]  |  SP[0][2]  |
//   Local Y      |  SP[1][0]  |  SP[1][1]  |  SP[1][2]  |
//   Local Z      |  SP[2][0]  |  SP[2][1]  |  SP[2][2]  |
//
// Linhas de arma × local (WP) ficam abaixo como bloco separado na mesma tabela:
//
//                | Local X    | Local Y    | Local Z    |  ← colunas de locais
// ───────────────┼────────────┼────────────┼────────────┤
// [ARMAS]        |            |            |            |
//   Arma 1       |  WP[0][0]  |  WP[0][1]  |  WP[0][2]  |
//   Arma 2       |  WP[1][0]  |  WP[1][1]  |  WP[1][2]  |
//   Arma 3       |  WP[2][0]  |  WP[2][1]  |  WP[2][2]  |

function CombinedGrid({ suspects, weapons, places, gridSW, gridSP, gridWP, onCellClick }) {
  const [hovered, setHovered] = useState(null); // { grid, r, c }

  const isHov = (grid, r, c) =>
    hovered && hovered.grid === grid && hovered.r === r && hovered.c === c;

  const cellTd = (grid, r, c, value) => (
    <td
      key={c}
      onClick={() => onCellClick(grid, r, c)}
      onMouseEnter={() => setHovered({ grid, r, c })}
      onMouseLeave={() => setHovered(null)}
      style={{
        width: 44,
        height: 38,
        textAlign: "center",
        verticalAlign: "middle",
        border: `1px solid ${COLORS.black}`,
        background: isHov(grid, r, c) ? COLORS.cellHover : COLORS.white,
        cursor: "pointer",
        transition: "background 0.12s",
        userSelect: "none",
      }}
    >
      <CellContent value={value} />
    </td>
  );

  const sectionHeaderTd = (label, colSpan) => (
    <td
      colSpan={colSpan}
      style={{
        background: COLORS.red,
        color: COLORS.white,
        fontFamily: "'Oswald', 'Impact', sans-serif",
        fontSize: "0.65rem",
        fontWeight: 700,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        padding: "3px 8px",
        border: `1px solid ${COLORS.black}`,
        textAlign: "left",
      }}
    >
      {label}
    </td>
  );

  const rowLabelTd = (label) => (
    <td
      style={{
        background: COLORS.headerBg,
        color: COLORS.headerText,
        fontFamily: "'Oswald', 'Impact', sans-serif",
        fontSize: "0.68rem",
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        padding: "4px 10px",
        border: `1px solid ${COLORS.black}`,
        textAlign: "right",
        whiteSpace: "nowrap",
        minWidth: 90,
      }}
    >
      {label}
    </td>
  );

  const colHeaderTh = (label) => (
    <th
      style={{
        background: COLORS.headerBg,
        color: COLORS.headerText,
        fontFamily: "'Oswald', 'Impact', sans-serif",
        fontSize: "0.68rem",
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        padding: "6px 4px",
        border: `1px solid ${COLORS.black}`,
        textAlign: "center",
        width: 44,
        minWidth: 44,
        lineHeight: 1.2,
        wordBreak: "break-word",
      }}
    >
      {label}
    </th>
  );

  const n = suspects.length;

  return (
    <div style={{ overflowX: "auto", padding: "0 8px" }}>
      {/* ── BLOCO SUPERIOR: Suspeitos × (Armas + Locais) ── */}
      <table
        style={{
          borderCollapse: "collapse",
          border: `2px solid ${COLORS.black}`,
          margin: "0 auto 24px",
        }}
      >
        <thead>
          <tr>
            {/* canto vazio */}
            <th style={{ background: COLORS.black, border: `1px solid ${COLORS.black}`, minWidth: 90 }} />
            {suspects.map((s, i) => (
              <React.Fragment key={i}>{colHeaderTh(s)}</React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* seção ARMAS */}
          <tr>
            {sectionHeaderTd("Armas", n + 1)}
          </tr>
          {weapons.map((w, r) => (
            <tr key={r}>
              {rowLabelTd(w)}
              {suspects.map((_, c) => cellTd("sw", r, c, gridSW[r][c]))}
            </tr>
          ))}

          {/* seção LOCAIS */}
          <tr>
            {sectionHeaderTd("Locais", n + 1)}
          </tr>
          {places.map((p, r) => (
            <tr key={r}>
              {rowLabelTd(p)}
              {suspects.map((_, c) => cellTd("sp", r, c, gridSP[r][c]))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── BLOCO INFERIOR: Armas × Locais ── */}
      <table
        style={{
          borderCollapse: "collapse",
          border: `2px solid ${COLORS.black}`,
          margin: "0 auto",
        }}
      >
        <thead>
          <tr>
            <th style={{ background: COLORS.black, border: `1px solid ${COLORS.black}`, minWidth: 90 }} />
            {places.map((p, i) => (
              <React.Fragment key={i}>{colHeaderTh(p)}</React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {sectionHeaderTd("Armas × Locais", n + 1)}
          </tr>
          {weapons.map((w, r) => (
            <tr key={r}>
              {rowLabelTd(w)}
              {places.map((_, c) => cellTd("wp", r, c, gridWP[r][c]))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function parseList(str) {
  return str
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function App() {
  const [suspects, setSuspects] = useState(DEFAULT_SUSPECTS);
  const [weapons, setWeapons] = useState(DEFAULT_WEAPONS);
  const [places, setPlaces] = useState(DEFAULT_PLACES);
  const [gridSW, setGridSW] = useState(() => createMatrix(3, 3));
  const [gridSP, setGridSP] = useState(() => createMatrix(3, 3));
  const [gridWP, setGridWP] = useState(() => createMatrix(3, 3));
  const [history, setHistory] = useState([]);
  const [configOpen, setConfigOpen] = useState(false);
  const [inputS, setInputS] = useState(DEFAULT_SUSPECTS.join(", "));
  const [inputW, setInputW] = useState(DEFAULT_WEAPONS.join(", "));
  const [inputP, setInputP] = useState(DEFAULT_PLACES.join(", "));

  const n = suspects.length;

  const pushHistory = useCallback(() => {
    setHistory((h) => [
      ...h.slice(-30),
      { sw: deepClone(gridSW), sp: deepClone(gridSP), wp: deepClone(gridWP) },
    ]);
  }, [gridSW, gridSP, gridWP]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setGridSW(prev.sw);
    setGridSP(prev.sp);
    setGridWP(prev.wp);
    setHistory((h) => h.slice(0, -1));
  }, [history]);

  const resetGrids = useCallback(() => {
    const len = suspects.length;
    setGridSW(createMatrix(len, len));
    setGridSP(createMatrix(len, len));
    setGridWP(createMatrix(len, len));
    setHistory([]);
  }, [suspects.length]);

  const handleCellClick = useCallback(
    (gridName, r, c) => {
      pushHistory();
      const sw = deepClone(gridSW);
      const sp = deepClone(gridSP);
      const wp = deepClone(gridWP);
      const grid = gridName === "sw" ? sw : gridName === "sp" ? sp : wp;
      const current = grid[r][c];
      const next = current === 0 ? -1 : current === -1 ? 1 : 0;

      if (next === 1) {
        applyConfirm(grid, r, c, n);
      } else if (next === 0) {
        grid[r][c] = 0;
      } else {
        grid[r][c] = -1;
      }

      autoComplete(sw, n);
      autoComplete(sp, n);
      autoComplete(wp, n);
      propagate(sw, sp, wp, n);

      setGridSW(sw);
      setGridSP(sp);
      setGridWP(wp);
    },
    [gridSW, gridSP, gridWP, n, pushHistory]
  );

  const applyConfig = useCallback(() => {
    const s = parseList(inputS);
    const w = parseList(inputW);
    const p = parseList(inputP);
    if (s.length < 2 || w.length < 2 || p.length < 2) return;
    if (s.length !== w.length || w.length !== p.length) return;
    setSuspects(s);
    setWeapons(w);
    setPlaces(p);
    const len = s.length;
    setGridSW(createMatrix(len, len));
    setGridSP(createMatrix(len, len));
    setGridWP(createMatrix(len, len));
    setHistory([]);
    setConfigOpen(false);
  }, [inputS, inputW, inputP]);

  const solved =
    gridSW.flat().filter((v) => v === 1).length === n &&
    gridSP.flat().filter((v) => v === 1).length === n &&
    gridWP.flat().filter((v) => v === 1).length === n;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        fontFamily: "'Georgia', serif",
        color: COLORS.black,
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Special+Elite&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <header
        style={{
          background: COLORS.red,
          padding: "18px 0 14px",
          textAlign: "center",
          borderBottom: `4px solid ${COLORS.black}`,
        }}
      >
        <h1
          style={{
            fontFamily: "'Oswald', 'Impact', sans-serif",
            fontWeight: 700,
            fontSize: "2.2rem",
            color: COLORS.white,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          MURDLE
        </h1>
        <p
          style={{
            fontFamily: "'Special Elite', 'Courier New', monospace",
            color: COLORS.bg,
            fontSize: "0.8rem",
            margin: "4px 0 0",
            letterSpacing: "0.08em",
          }}
        >
          Quadro Lógico de Dedução
        </p>
      </header>

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 10,
          padding: "14px 16px",
          flexWrap: "wrap",
        }}
      >
        <button onClick={() => setConfigOpen(!configOpen)} style={btnStyle}>
          ⚙ Configurar
        </button>
        <button onClick={undo} disabled={history.length === 0} style={{ ...btnStyle, opacity: history.length === 0 ? 0.4 : 1 }}>
          ↩ Desfazer
        </button>
        <button onClick={resetGrids} style={{ ...btnStyle, background: COLORS.red, color: COLORS.white }}>
          ✕ Limpar
        </button>
      </div>

      {/* Config Panel */}
      {configOpen && (
        <div
          style={{
            maxWidth: 500,
            margin: "0 auto 16px",
            background: COLORS.white,
            border: `2px solid ${COLORS.black}`,
            padding: 16,
            borderRadius: 2,
          }}
        >
          <p style={{ fontSize: "0.75rem", color: COLORS.red, marginTop: 0, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Separe os nomes por vírgula (mesmo número em cada categoria)
          </p>
          <label style={labelStyle}>Suspeitos</label>
          <input value={inputS} onChange={(e) => setInputS(e.target.value)} style={inputStyle} />
          <label style={labelStyle}>Armas</label>
          <input value={inputW} onChange={(e) => setInputW(e.target.value)} style={inputStyle} />
          <label style={labelStyle}>Locais</label>
          <input value={inputP} onChange={(e) => setInputP(e.target.value)} style={inputStyle} />
          <button onClick={applyConfig} style={{ ...btnStyle, background: COLORS.teal, color: COLORS.black, marginTop: 8 }}>
            Aplicar
          </button>
        </div>
      )}

      {/* Solved banner */}
      {solved && (
        <div
          style={{
            textAlign: "center",
            padding: "10px",
            background: COLORS.teal,
            color: COLORS.black,
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 700,
            fontSize: "1.1rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          ✓ Puzzle Resolvido!
        </div>
      )}

      {/* Grid combinada */}
      <div style={{ padding: "16px 8px 40px" }}>
        <CombinedGrid
          suspects={suspects}
          weapons={weapons}
          places={places}
          gridSW={gridSW}
          gridSP={gridSP}
          gridWP={gridWP}
          onCellClick={handleCellClick}
        />
      </div>

      {/* Legend */}
      <div
        style={{
          textAlign: "center",
          paddingBottom: 32,
          fontSize: "0.75rem",
          color: "#666",
          fontFamily: "'Special Elite', monospace",
          padding: "0 12px 32px",
        }}
      >
        Clique: vazio → <span style={{ color: COLORS.red, fontWeight: 800 }}>✕</span> →{" "}
        <span style={{ color: COLORS.teal, fontWeight: 800 }}>✓</span> → vazio
      </div>
    </div>
  );
}

const btnStyle = {
  fontFamily: "'Oswald', 'Impact', sans-serif",
  fontSize: "0.78rem",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  padding: "10px 20px",
  minHeight: 44,
  border: `2px solid ${COLORS.black}`,
  background: COLORS.white,
  color: COLORS.black,
  cursor: "pointer",
  transition: "all 0.15s",
  touchAction: "manipulation",
};

const labelStyle = {
  display: "block",
  fontFamily: "'Oswald', sans-serif",
  fontSize: "0.72rem",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginTop: 8,
  marginBottom: 2,
  color: COLORS.black,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  border: `1px solid ${COLORS.black}`,
  fontFamily: "'Special Elite', monospace",
  fontSize: "0.85rem",
  background: COLORS.bg,
};
