// ============================================================
// 移動力・BFS用ヘルパー
// ============================================================

let riverEditMode = false;

function getMA(type) {
  if (type === 'HC') return 3;
  if (type === 'LC') return 4;
  return 2; // infantry / artillery
}

function riverKey(a, b) { return a < b ? `${a}|${b}` : `${b}|${a}`; }

function isRiverHexside(a, b) {
  const key = riverKey(a, b);
  return riverHexsides.some(r => riverKey(r.from, r.to) === key);
}

function isBridgeHexside(a, b) {
  const key = riverKey(a, b);
  return bridgeHexsides.some(r => riverKey(r.from, r.to) === key);
}

function isRiverCrossing(fromAddr, toAddr) {
  return isRiverHexside(fromAddr, toAddr) && !isBridgeHexside(fromAddr, toAddr);
}

function isOnRoad(fromAddr, toAddr) {
  return roadHexes.has(fromAddr) && roadHexes.has(toAddr);
}

function toggleRiverHexside(a, b) {
  const key = riverKey(a, b);
  const idx = riverHexsides.findIndex(r => riverKey(r.from, r.to) === key);
  if (idx >= 0) {
    riverHexsides.splice(idx, 1);
  } else {
    const [f, t] = a < b ? [a, b] : [b, a];
    riverHexsides.push({ from: f, to: t });
  }
  renderRiverLayer();
}

function getHexsideCorners(addrA, addrB) {
  const colLblA = parseInt(addrA.slice(0, 2), 10);
  const rowLblA = parseInt(addrA.slice(2),    10);
  const colLblB = parseInt(addrB.slice(0, 2), 10);
  const rowLblB = parseInt(addrB.slice(2),    10);
  const cubeA = labelToCube(colLblA, rowLblA);
  const cubeB = labelToCube(colLblB, rowLblB);
  const diff = cubeB.subtract(cubeA);
  const dirIdx = FlatTopLayout.DIRS.findIndex(d => d.q === diff.q && d.r === diff.r && d.s === diff.s);
  if (dirIdx < 0) return null;
  const corners = layout.hexCorners(toIdx(colLblA), toIdx(rowLblA));
  return [corners[(dirIdx + 5) % 6], corners[dirIdx]];
}

function getNearestHexside(mapX, mapY) {
  const cube = layout.pixelToHex(mapX, mapY);
  const { col: colLbl, row: rowLbl } = cubeToLabel(cube);
  if (!inBounds(colLbl, rowLbl)) return null;
  const addrA = hexAddr(colLbl, rowLbl);
  let nearest = null, minDist = Infinity;
  for (const nCube of layout.neighbors(cube)) {
    const { col: nC, row: nR } = cubeToLabel(nCube);
    if (!inBounds(nC, nR)) continue;
    const addrB = hexAddr(nC, nR);
    const corners = getHexsideCorners(addrA, addrB);
    if (!corners) continue;
    const midX = (corners[0].x + corners[1].x) / 2;
    const midY = (corners[0].y + corners[1].y) / 2;
    const dist = Math.hypot(mapX - midX, mapY - midY);
    if (dist < minDist) { minDist = dist; nearest = { addrA, addrB, corners }; }
  }
  return nearest;
}

// ============================================================
// 河川レイヤー描画
// ============================================================

function renderRiverLayer() {
  if (!riverLayerEl) return;
  for (const c of [...riverLayerEl.children]) {
    if (c !== riverHoverEl) c.remove();
  }
  for (const r of riverHexsides) {
    const corners = getHexsideCorners(r.from, r.to);
    if (!corners) continue;
    const cls = isBridgeHexside(r.from, r.to) ? 'river-bridge' : 'river-line';
    const line = makeSVGEl('line', {
      x1: corners[0].x, y1: corners[0].y,
      x2: corners[1].x, y2: corners[1].y,
      class: cls,
    });
    riverLayerEl.insertBefore(line, riverHoverEl);
  }
}

function setRiverHoverLine(corners) {
  if (!riverHoverEl) return;
  if (corners) {
    riverHoverEl.setAttribute('x1', corners[0].x);
    riverHoverEl.setAttribute('y1', corners[0].y);
    riverHoverEl.setAttribute('x2', corners[1].x);
    riverHoverEl.setAttribute('y2', corners[1].y);
    riverHoverEl.style.display = '';
  } else {
    riverHoverEl.style.display = 'none';
  }
}

// ============================================================
// 移動可能ヘックスのBFS計算
// ============================================================

function computeReachable(unit) {
  reachableMap.clear();
  const MA = getMA(unit.type) + (pasDeChargeActive && unit.army === 'french' ? 1 : 0);
  const startAddr = hexAddr(unit.col, unit.row);

  const costMap = new Map([[startAddr, 0]]);
  const queue   = [{ addr: startAddr, cost: 0 }];

  while (queue.length > 0) {
    const { addr, cost } = queue.shift();

    for (const nAddr of neighborAddrs(addr)) {
      if (isRiverCrossing(addr, nAddr)) continue;
      if (getUnitsAt(nAddr).some(u => u.army !== unit.army)) continue;

      // Bug #2 fix: road経由の登りはコスト1
      const onRoad = isOnRoad(addr, nAddr);
      const moveCost = (isUphill(addr, nAddr) && !onRoad) ? 2 : 1;
      const newCost  = cost + moveCost;
      if (newCost > MA) continue;

      if ((costMap.get(nAddr) ?? Infinity) <= newCost) continue;
      costMap.set(nAddr, newCost);

      const col = parseInt(nAddr.slice(0, 2), 10);
      if (unit.army === 'french' && !prussianDeployed && (col === 19 || col === 20)) continue;

      const isDifficult = isDifficultTerrain(nAddr) && !onRoad;
      const hasEnemyAdj = isEnemyAdjacentTo(nAddr, unit.army);
      const mustStop    = isDifficult || hasEnemyAdj;

      if (canLandAt(nAddr, unit)) {
        reachableMap.set(nAddr, mustStop);
      }

      if (!mustStop) {
        queue.push({ addr: nAddr, cost: newCost });
      }
    }
  }
}

function moveUnit(unitId, col, row) {
  const unit = units.find(u => u.id === unitId);
  if (!unit) return;
  unit.col = col;
  unit.row = row;
  markActed(unit);  // Bug #1 fix: mark as acted
  const dest = hexAddr(col, row);
  if (unit.army === 'french') {
    setFrenchControl(dest);
  } else {
    clearFrenchControl(dest);
  }
  selectedUnitId = null;
  reachableMap.clear();
  refreshHighlights();
  drawAllUnits();
  document.getElementById('hud-piece').textContent = dest;
  setHudState('待機中');
}
