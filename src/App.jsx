import React, { useState, useCallback, useRef, useEffect } from "react";

const COLORS = {
  bg: "#F2E2C4",
  red: "#C41E24",
  black: "#1A1A1A",
  teal: "#6CBFC0",
  white: "#FAFAF5",
  cellHover: "rgba(108,191,192,0.15)",
  headerBg: "#1A1A1A",
  headerText: "#F2E2C4",
  sectionBg: "#2e2e2e",
  divider: "#555",
};

const CELL_W = 52;
const CELL_H = 40;
const LABEL_W = 110;

const DEFAULT_SUSPECTS = ["Suspeito A", "Suspeito B", "Suspeito C"];
const DEFAULT_WEAPONS = ["Arma 1", "Arma 2", "Arma 3"];
const DEFAULT_PLACES = ["Local X", "Local Y", "Local Z"];

function createMatrix(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function hasConfirmInRow(grid, r, exceptC) {
  for (let c = 0; c < grid[r].length; c++) {
    if (c !== exceptC && grid[r][c] === 1) return true;
  }
  return false;
}

function hasConfirmInCol(grid, c, exceptR) {
  for (let r = 0; r < grid.length; r++) {
    if (r !== exceptR && grid[r][c] === 1) return true;
  }
  return false;
}

function canConfirm(grid, r, c) {
  // Impede confirmar se já existe outro ✓ na mesma linha ou coluna
  return !hasConfirmInRow(grid, r, c) && !hasConfirmInCol(grid, c, r);
}

function applyConfirm(grid, r, c, n) {
  grid[r][c] = 1;
  for (let i = 0; i < n; i++) {
    if (i !== c) grid[r][i] = -1;
    if (i !== r) grid[i][c] = -1;
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
          if (sp[s][p] === 1 && wp[w][p] !== 1) { applyConfirm(wp, w, p, n); changed = true; }
          if (wp[w][p] === 1 && sp[s][p] !== 1) { applyConfirm(sp, s, p, n); changed = true; }
        }
      }
    }
    for (let s = 0; s < n; s++) {
      for (let p = 0; p < n; p++) {
        if (sp[s][p] !== 1) continue;
        for (let w = 0; w < n; w++) {
          if (sw[s][w] === 1 && wp[w][p] !== 1) { applyConfirm(wp, w, p, n); changed = true; }
          if (wp[w][p] === 1 && sw[s][w] !== 1) { applyConfirm(sw, s, w, n); changed = true; }
        }
      }
    }
    for (let w = 0; w < n; w++) {
      for (let p = 0; p < n; p++) {
        if (wp[w][p] !== 1) continue;
        for (let s = 0; s < n; s++) {
          if (sw[s][w] === 1 && sp[s][p] !== 1) { applyConfirm(sp, s, p, n); changed = true; }
          if (sp[s][p] === 1 && sw[s][w] !== 1) { applyConfirm(sw, s, w, n); changed = true; }
        }
      }
    }
    autoComplete(sw, n);
    autoComplete(sp, n);
    autoComplete(wp, n);
  }
}

// Célula clicável
function Cell({ value, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <td
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: CELL_W,
        minWidth: CELL_W,
        height: CELL_H,
        textAlign: "center",
        verticalAlign: "middle",
        border: `1px solid ${COLORS.black}`,
        background: hov ? COLORS.cellHover : COLORS.white,
        cursor: "pointer",
        userSelect: "none",
        touchAction: "manipulation",
      }}
    >
      {value === -1 && (
        <span style={{ color: COLORS.red, fontWeight: 800, fontSize: "1.1em" }}>✕</span>
      )}
      {value === 1 && (
        <span style={{ color: COLORS.teal, fontWeight: 800, fontSize: "1.2em" }}>✓</span>
      )}
    </td>
  );
}

// Célula de header editável inline
function EditableHeader({ value, onChange, vertical = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed) onChange(trimmed);
    else setDraft(value);
    setEditing(false);
  };

  const baseStyle = {
    background: COLORS.headerBg,
    color: COLORS.headerText,
    fontFamily: "'Oswald', 'Impact', sans-serif",
    fontSize: "0.68rem",
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    border: `1px solid ${COLORS.black}`,
    padding: "4px 6px",
    textAlign: "center",
    lineHeight: 1.2,
    cursor: "pointer",
    userSelect: "none",
  };

  if (vertical) {
    // cabeçalho de coluna: texto na vertical
    return (
      <th
        style={{
          ...baseStyle,
          width: CELL_W,
          minWidth: CELL_W,
          height: 80,
          verticalAlign: "bottom",
          position: "relative",
        }}
        title="Clique para editar"
      >
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
            style={{
              width: "90%",
              fontSize: "0.65rem",
              fontFamily: "'Oswald', sans-serif",
              background: "#333",
              color: COLORS.headerText,
              border: "1px solid " + COLORS.teal,
              padding: "2px 4px",
              outline: "none",
            }}
          />
        ) : (
          <div
            onClick={() => setEditing(true)}
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              whiteSpace: "nowrap",
              padding: "4px 0",
              maxHeight: 72,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {value}
          </div>
        )}
      </th>
    );
  }

  // cabeçalho de linha (lateral)
  return (
    <td
      style={{
        ...baseStyle,
        width: LABEL_W,
        minWidth: LABEL_W,
        textAlign: "right",
        padding: "4px 10px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
      title="Clique para editar"
    >
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
          style={{
            width: "100%",
            fontSize: "0.65rem",
            fontFamily: "'Oswald', sans-serif",
            background: "#333",
            color: COLORS.headerText,
            border: "1px solid " + COLORS.teal,
            padding: "2px 4px",
            outline: "none",
            textAlign: "right",
          }}
        />
      ) : (
        <span onClick={() => setEditing(true)}>{value}</span>
      )}
    </td>
  );
}

// Célula cinza (interseção bloqueada — locais × locais diagonal)
function BlockedCell() {
  return (
    <td
      style={{
        width: CELL_W,
        minWidth: CELL_W,
        height: CELL_H,
        background: COLORS.sectionBg,
        border: `1px solid ${COLORS.black}`,
      }}
    />
  );
}

// Separador de seção (linha vermelha com label)
function SectionRow({ label, colSpan }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        style={{
          background: COLORS.red,
          color: COLORS.white,
          fontFamily: "'Oswald', 'Impact', sans-serif",
          fontSize: "0.6rem",
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          padding: "2px 10px",
          border: `1px solid ${COLORS.black}`,
        }}
      >
        {label}
      </td>
    </tr>
  );
}

/*
 * Layout da tabela única (estilo Murdle clássico):
 *
 *              [vazio]  | Sus.A | Sus.B | Sus.C | Loc.X | Loc.Y | Loc.Z |
 * ─────────────────────────────────────────────────────────────────────────
 * [LOCAIS]     (span total)
 *   Local X    |        | SP0,0 | SP0,1 | SP0,2 | ░░░░░ | ░░░░░ | ░░░░░ |
 *   Local Y    |        | SP1,0 | SP1,1 | SP1,2 | ░░░░░ | ░░░░░ | ░░░░░ |
 *   Local Z    |        | SP2,0 | SP2,1 | SP2,2 | ░░░░░ | ░░░░░ | ░░░░░ |
 * ─────────────────────────────────────────────────────────────────────────
 * [ARMAS]      (span total)
 *   Arma 1     |        | SW0,0 | SW0,1 | SW0,2 | WP0,0 | WP0,1 | WP0,2 |
 *   Arma 2     |        | SW1,0 | SW1,1 | SW1,2 | WP1,0 | WP1,1 | WP1,2 |
 *   Arma 3     |        | SW2,0 | SW2,1 | SW2,2 | WP2,0 | WP2,1 | WP2,2 |
 *
 * Índices:
 *   SP[s][p] = suspeito s × local p
 *   SW[w][s] = arma w × suspeito s   (nota: aqui w é linha, s é coluna)
 *   WP[w][p] = arma w × local p
 *
 * ATENÇÃO: no estado do App, gridSW[s][w] = suspeito s × arma w.
 * Na tabela, as armas são LINHAS, então ao renderizar usamos gridSW[w][s].
 * A lógica de applyConfirm/propagate usa (s,w) como (linha,col) → manter consistência:
 * usamos gridSW com rows=suspects, cols=weapons.
 * Na seção ARMAS da tabela, linha=arma w, col=suspeito s → valor = gridSW[s][w]
 */
function MurdleGrid({
  suspects, weapons, places,
  gridSW, gridSP, gridWP,
  onCell,
  onRenameSuspect, onRenameWeapon, onRenamePlace,
}) {
  const n = suspects.length;
  // total colunas: 1 (label) + n (suspeitos) + n (locais)
  const totalCols = 1 + n + n;

  return (
    <div style={{ overflowX: "auto", padding: "0 8px" }}>
      <table style={{ borderCollapse: "collapse", border: `2px solid ${COLORS.black}`, margin: "0 auto" }}>
        <thead>
          <tr>
            {/* canto superior esquerdo */}
            <th style={{ background: COLORS.black, border: `1px solid ${COLORS.black}`, width: LABEL_W, minWidth: LABEL_W }} />

            {/* cabeçalhos de suspeitos */}
            {suspects.map((s, i) => (
              <EditableHeader key={"s" + i} value={s} onChange={(v) => onRenameSuspect(i, v)} vertical />
            ))}

            {/* cabeçalhos de locais */}
            {places.map((p, i) => (
              <EditableHeader key={"p" + i} value={p} onChange={(v) => onRenamePlace(i, v)} vertical />
            ))}
          </tr>
        </thead>

        <tbody>
          {/* ── Seção LOCAIS ── */}
          <SectionRow label="Locais" colSpan={totalCols} />

          {places.map((p, placeIdx) => (
            <tr key={"place" + placeIdx}>
              <EditableHeader value={p} onChange={(v) => onRenamePlace(placeIdx, v)} />

              {/* suspeitos × local (SP) — SP[s][p] */}
              {suspects.map((_, suspIdx) => (
                <Cell
                  key={"sp" + suspIdx}
                  value={gridSP[suspIdx][placeIdx]}
                  onClick={() => onCell("sp", suspIdx, placeIdx)}
                />
              ))}

              {/* locais × locais: bloqueado (não faz sentido) */}
              {places.map((_, pi) => (
                <BlockedCell key={"blk" + pi} />
              ))}
            </tr>
          ))}

          {/* ── Seção ARMAS ── */}
          <SectionRow label="Armas" colSpan={totalCols} />

          {weapons.map((w, weapIdx) => (
            <tr key={"weap" + weapIdx}>
              <EditableHeader value={w} onChange={(v) => onRenameWeapon(weapIdx, v)} />

              {/* suspeitos × arma (SW) — gridSW[s][w] */}
              {suspects.map((_, suspIdx) => (
                <Cell
                  key={"sw" + suspIdx}
                  value={gridSW[suspIdx][weapIdx]}
                  onClick={() => onCell("sw", suspIdx, weapIdx)}
                />
              ))}

              {/* arma × locais (WP) — gridWP[w][p] */}
              {places.map((_, placeIdx) => (
                <Cell
                  key={"wp" + placeIdx}
                  value={gridWP[weapIdx][placeIdx]}
                  onClick={() => onCell("wp", weapIdx, placeIdx)}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [suspects, setSuspects] = useState(DEFAULT_SUSPECTS);
  const [weapons, setWeapons] = useState(DEFAULT_WEAPONS);
  const [places, setPlaces] = useState(DEFAULT_PLACES);
  const [gridSW, setGridSW] = useState(() => createMatrix(3, 3)); // [s][w]
  const [gridSP, setGridSP] = useState(() => createMatrix(3, 3)); // [s][p]
  const [gridWP, setGridWP] = useState(() => createMatrix(3, 3)); // [w][p]
  const [history, setHistory] = useState([]);

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
    setGridSW(createMatrix(n, n));
    setGridSP(createMatrix(n, n));
    setGridWP(createMatrix(n, n));
    setHistory([]);
    setCulprit(null);
  }, [n]);

  const handleCell = useCallback(
    (gridName, r, c) => {
      pushHistory();
      const sw = deepClone(gridSW);
      const sp = deepClone(gridSP);
      const wp = deepClone(gridWP);
      const grid = gridName === "sw" ? sw : gridName === "sp" ? sp : wp;
      const cur = grid[r][c];
      const next = cur === 0 ? -1 : cur === -1 ? 1 : 0;

      if (next === 1) {
        // Só confirma se não viola a restrição 1-para-1
        if (!canConfirm(grid, r, c)) return;
        applyConfirm(grid, r, c, n);
      } else {
        grid[r][c] = next;
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

  const renameSuspect = useCallback((i, val) => {
    setSuspects((prev) => prev.map((v, idx) => (idx === i ? val : v)));
  }, []);

  const renameWeapon = useCallback((i, val) => {
    setWeapons((prev) => prev.map((v, idx) => (idx === i ? val : v)));
  }, []);

  const renamePlace = useCallback((i, val) => {
    // locais aparecem tanto nas colunas quanto nas linhas — sincronizados automaticamente
    // pois ambos leem do mesmo array `places`
    setPlaces((prev) => prev.map((v, idx) => (idx === i ? val : v)));
  }, []);

  const [culprit, setCulprit] = useState(null); // índice do suspeito culpado

  const solved =
    gridSW.flat().filter((v) => v === 1).length === n &&
    gridSP.flat().filter((v) => v === 1).length === n &&
    gridWP.flat().filter((v) => v === 1).length === n;

  // Monta o trio do culpado selecionado
  // gridSW[s][w] === 1 → suspeito s usou arma w
  // gridSP[s][p] === 1 → suspeito s estava no local p
  const solution = (() => {
    if (!solved || culprit === null) return null;
    const w = gridSW[culprit].indexOf(1);
    const p = gridSP[culprit].indexOf(1);
    if (w === -1 || p === -1) return null;
    return { suspect: suspects[culprit], weapon: weapons[w], place: places[p] };
  })();

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "'Georgia', serif", color: COLORS.black }}>
      <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Special+Elite&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{ background: COLORS.red, padding: "18px 0 14px", textAlign: "center", borderBottom: `4px solid ${COLORS.black}` }}>
        <h1 style={{ fontFamily: "'Oswald', 'Impact', sans-serif", fontWeight: 700, fontSize: "2.2rem", color: COLORS.white, letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>
          MURDLE
        </h1>
        <p style={{ fontFamily: "'Special Elite', 'Courier New', monospace", color: COLORS.bg, fontSize: "0.8rem", margin: "4px 0 0", letterSpacing: "0.08em" }}>
          Quadro Lógico de Dedução
        </p>
      </header>

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "center", gap: 10, padding: "14px 16px", flexWrap: "wrap" }}>
        <button onClick={undo} disabled={history.length === 0} style={{ ...btnStyle, opacity: history.length === 0 ? 0.4 : 1 }}>
          ↩ Desfazer
        </button>
        <button onClick={resetGrids} style={{ ...btnStyle, background: COLORS.red, color: COLORS.white }}>
          ✕ Limpar
        </button>
      </div>

      {/* Hint edição */}
      <p style={{ textAlign: "center", fontSize: "0.72rem", color: "#888", fontFamily: "'Special Elite', monospace", marginBottom: 12 }}>
        Toque no nome de qualquer suspeito, arma ou local para editar
      </p>

      {/* Solved banner */}
      {solved && (
        <div
          style={{
            textAlign: "center",
            padding: "14px 20px",
            background: COLORS.teal,
            color: COLORS.black,
            borderTop: `3px solid ${COLORS.black}`,
            borderBottom: `3px solid ${COLORS.black}`,
          }}
        >
          <div style={{
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 700,
            fontSize: "1.1rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 10,
          }}>
            ✓ Puzzle Resolvido!
          </div>

          {/* Seletor de culpado */}
          <div style={{ marginBottom: 10, fontFamily: "'Oswald', sans-serif", fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Quem é o culpado?
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {suspects.map((s, i) => (
              <button
                key={i}
                onClick={() => setCulprit(i)}
                style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  padding: "6px 14px",
                  border: `2px solid ${COLORS.black}`,
                  background: culprit === i ? COLORS.red : COLORS.white,
                  color: culprit === i ? COLORS.white : COLORS.black,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Resultado */}
          {solution && (
            <div style={{
              fontFamily: "'Special Elite', 'Courier New', monospace",
              fontSize: "1rem",
              fontWeight: 400,
              letterSpacing: "0.04em",
              padding: "8px 0 4px",
              borderTop: `1px solid ${COLORS.black}`,
            }}>
              Foi <strong>{solution.suspect}</strong> com <strong>{solution.weapon}</strong> no <strong>{solution.place}</strong>
            </div>
          )}
        </div>
      )}

      {/* Grid única */}
      <div style={{ padding: "16px 8px 40px" }}>
        <MurdleGrid
          suspects={suspects}
          weapons={weapons}
          places={places}
          gridSW={gridSW}
          gridSP={gridSP}
          gridWP={gridWP}
          onCell={handleCell}
          onRenameSuspect={renameSuspect}
          onRenameWeapon={renameWeapon}
          onRenamePlace={renamePlace}
        />
      </div>

      {/* Legend */}
      <div style={{ textAlign: "center", padding: "0 12px 32px", fontSize: "0.75rem", color: "#666", fontFamily: "'Special Elite', monospace" }}>
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
