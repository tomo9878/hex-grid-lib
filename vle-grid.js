// ============================================================
// VLE グリッド設定（Vassalモジュールより実測）
// ============================================================
const GRID_DX   = 109.2;
const GRID_DY   = 125.3;
const GRID_X0   = -2;
const GRID_Y0   = -14;
const GRID_COLS = 20;
const GRID_ROWS = 16;

const layout = new FlatTopLayout({
  dx: GRID_DX, dy: GRID_DY, x0: GRID_X0, y0: GRID_Y0,
});

const toIdx   = (label) => label;
const toLabel = (idx)   => idx;

function hexAddr(colLabel, rowLabel) {
  return String(colLabel).padStart(2, '0') + String(rowLabel).padStart(2, '0');
}

function cubeToLabel(hex) {
  const off = layout.cubeToOffset(hex);
  return { col: toLabel(off.col), row: toLabel(off.row) };
}

function labelToCube(colLabel, rowLabel) {
  return layout.offsetToCube(toIdx(colLabel), toIdx(rowLabel));
}

function inBounds(colLabel, rowLabel) {
  return colLabel >= 1 && colLabel <= GRID_COLS &&
         rowLabel >= 1 && rowLabel <= GRID_ROWS;
}

// ============================================================
// 地形データ
// ============================================================
const TERRAIN_TYPES  = ['flat', 'ridge', 'woods', 'buildings', 'walled_buildings'];
const TERRAIN_COLORS = {
  flat:             null,
  ridge:            'rgba(200,160,80,0.45)',
  woods:            'rgba(30,110,30,0.45)',
  buildings:        'rgba(160,140,110,0.45)',
  walled_buildings: 'rgba(100,80,70,0.55)',
};
const TERRAIN_JP = {
  flat:             'Flat',
  ridge:            'Ridge',
  woods:            'Woods',
  buildings:        'Buildings',
  walled_buildings: 'Walled Buildings',
};

const terrainData    = new Map();
const terrainFillEls = new Map();

const TERRAIN_PRIORITY = ['walled_buildings', 'buildings', 'woods', 'ridge'];

function getTerrainTypes(addr) {
  return terrainData.get(addr) || [];
}

function isRidge(addr)     { return getTerrainTypes(addr).includes('ridge'); }
function isWoods(addr)     { return getTerrainTypes(addr).includes('woods'); }
function isBuildings(addr) { const t = getTerrainTypes(addr); return t.includes('buildings') || t.includes('walled_buildings'); }
function isDifficultTerrain(addr) { return isWoods(addr) || isBuildings(addr); }

function getDisplayColor(addr) {
  const types = getTerrainTypes(addr);
  for (const t of TERRAIN_PRIORITY) {
    if (types.includes(t)) return TERRAIN_COLORS[t];
  }
  return null;
}

function updateTerrainFill(addr) {
  const fillEl = terrainFillEls.get(addr);
  if (fillEl) fillEl.setAttribute('fill', getDisplayColor(addr) || 'none');
}

function setTerrainTypes(addr, types) {
  const filtered = (types || []).filter(t => t !== 'flat');
  if (filtered.length === 0) {
    terrainData.delete(addr);
  } else {
    terrainData.set(addr, filtered);
  }
  updateTerrainFill(addr);
}

function toggleTerrainType(addr, type) {
  const current = getTerrainTypes(addr);
  const idx = current.indexOf(type);
  const next = idx >= 0 ? current.filter(t => t !== type) : [...current, type];
  setTerrainTypes(addr, next);
}

function setupTerrainLayer() {
  const g = makeSVGEl('g', { id: 'terrain-fills' });
  svg.appendChild(g);
  for (let cl = 1; cl <= GRID_COLS; cl++) {
    for (let rl = 1; rl <= GRID_ROWS; rl++) {
      const addr = hexAddr(cl, rl);
      const poly = makeSVGEl('polygon', {
        points: layout.cornersToSVG(cl, rl),
        fill: 'none', stroke: 'none',
        'pointer-events': 'none',
      });
      g.appendChild(poly);
      terrainFillEls.set(addr, poly);
    }
  }
}

function exportTerrainJSON() {
  const obj = {};
  for (const [addr, types] of terrainData) obj[addr] = types;
  const json = JSON.stringify({
    version: 2,
    terrain: obj,
    rivers:  riverHexsides,
    bridges: bridgeHexsides,
  }, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'vle-terrain.json'; a.click();
  URL.revokeObjectURL(url);
}

function importTerrainJSON(text) {
  try {
    const data = JSON.parse(text);
    const terrain = data.terrain || data;
    for (const addr of terrainFillEls.keys()) setTerrainTypes(addr, []);
    for (const [addr, val] of Object.entries(terrain)) {
      const types = Array.isArray(val) ? val : [val];
      const valid = types.filter(t => TERRAIN_TYPES.includes(t) && t !== 'flat');
      if (valid.length > 0 && terrainFillEls.has(addr)) {
        setTerrainTypes(addr, valid);
      }
    }
    if (Array.isArray(data.rivers))  riverHexsides  = data.rivers.filter(r => r.from && r.to);
    if (Array.isArray(data.bridges)) bridgeHexsides = data.bridges.filter(r => r.from && r.to);
    renderRiverLayer();
    return true;
  } catch (err) {
    alert('JSON読み込みエラー: ' + err.message);
    return false;
  }
}

// ============================================================
// 河川・道路データ
// ============================================================
let riverHexsides  = [];
let bridgeHexsides = [];
const roadHexes = new Set();

// ============================================================
// プロイセン展開フラグ（19xx/20xx制限）
// ============================================================
let prussianDeployed = false;

// ============================================================
// 移動コスト・LOS用 地形関数
// ============================================================

function neighborAddrs(addr) {
  const colLabel = parseInt(addr.slice(0, 2), 10);
  const rowLabel = parseInt(addr.slice(2),    10);
  const cube = labelToCube(colLabel, rowLabel);
  const result = [];
  for (const n of layout.neighbors(cube)) {
    const { col, row } = cubeToLabel(n);
    if (inBounds(col, row)) result.push(hexAddr(col, row));
  }
  return result;
}

function isUphill(fromAddr, toAddr) {
  return !isRidge(fromAddr) && isRidge(toAddr);
}

function getMoveCost(fromAddr, toAddr) {
  return isUphill(fromAddr, toAddr) ? 2 : 1;
}

function isRidgeBlocking(addr) {
  if (!isRidge(addr)) return false;
  return neighborAddrs(addr).some(n => !isRidge(n));
}

// ============================================================
// ヘックス距離
// ============================================================

function hexDistance(addrA, addrB) {
  const cA = parseInt(addrA.slice(0, 2), 10), rA = parseInt(addrA.slice(2), 10);
  const cB = parseInt(addrB.slice(0, 2), 10), rB = parseInt(addrB.slice(2), 10);
  return labelToCube(cA, rA).distance(labelToCube(cB, rB));
}

// ============================================================
// LOS計算
// ============================================================

function isLOSBlocker(addr, fromIsRidge, toIsRidge) {
  const sameElev = (fromIsRidge === toIsRidge);

  if (!fromIsRidge && !toIsRidge && isRidge(addr)) return true;

  if (sameElev && isDifficultTerrain(addr)) return true;

  if (!sameElev && isRidge(addr) && isDifficultTerrain(addr)) return true;

  return false;
}

function calcLOS(fromAddr, toAddr) {
  if (fromAddr === toAddr) return true;

  const fromCol = parseInt(fromAddr.slice(0, 2), 10);
  const fromRow = parseInt(fromAddr.slice(2),    10);
  const toCol   = parseInt(toAddr.slice(0, 2),   10);
  const toRow   = parseInt(toAddr.slice(2),       10);

  const fromHex = labelToCube(fromCol, fromRow);
  const toHex   = labelToCube(toCol,   toRow);

  const N = fromHex.distance(toHex);
  if (N <= 1) return true;

  const fromIsRidge = isRidge(fromAddr);
  const toIsRidge   = isRidge(toAddr);

  const EPS = 1e-6;
  const fP = { q: fromHex.q + EPS, r: fromHex.r + EPS, s: fromHex.s - 2 * EPS };
  const tP = { q: toHex.q   + EPS, r: toHex.r   + EPS, s: toHex.s   - 2 * EPS };
  const fM = { q: fromHex.q - EPS, r: fromHex.r - EPS, s: fromHex.s + 2 * EPS };
  const tM = { q: toHex.q   - EPS, r: toHex.r   - EPS, s: toHex.s   + 2 * EPS };

  const step = 1.0 / N;

  function lerpAndRound(a, b, t) {
    return hexRound(
      a.q * (1 - t) + b.q * t,
      a.r * (1 - t) + b.r * t,
      a.s * (1 - t) + b.s * t,
    );
  }

  function cubeToAddr(hex) {
    const { col, row } = cubeToLabel(hex);
    return inBounds(col, row) ? hexAddr(col, row) : null;
  }

  for (let i = 1; i < N; i++) {
    const t = step * i;
    const hP = lerpAndRound(fP, tP, t);
    const hM = lerpAndRound(fM, tM, t);

    if (hP.equals(hM)) {
      const addr = cubeToAddr(hP);
      if (addr && isLOSBlocker(addr, fromIsRidge, toIsRidge)) return false;
    } else {
      const addrP = cubeToAddr(hP);
      const addrM = cubeToAddr(hM);
      if (addrP && isLOSBlocker(addrP, fromIsRidge, toIsRidge)) return false;
      if (addrM && isLOSBlocker(addrM, fromIsRidge, toIsRidge)) return false;
    }
  }

  return true;
}
