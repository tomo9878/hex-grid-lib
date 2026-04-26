// ============================================================
// SVG管理
// ============================================================
const svg = document.getElementById('hex-svg');
const mapImg = document.getElementById('map-img');

let hexEls = new Map();
let unitsLayerEl    = null;
let riverLayerEl    = null;
let riverHoverEl    = null;
let vpControlLayerEl = null;

function setupSVG(W, H) {
  svg.setAttribute('width',   W);
  svg.setAttribute('height',  H);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  setupTerrainLayer();

  hexEls = createHexGrid(svg, layout, {
    cols:       GRID_COLS,
    rows:       GRID_ROWS,
    polyClass:  'hex-normal',
    labelClass: 'hex-label',
    groupId:    'hex-grid',
  });

  riverLayerEl = makeSVGEl('g', { id: 'river-layer' });
  riverHoverEl = makeSVGEl('line', { class: 'river-hover' });
  riverHoverEl.style.display = 'none';
  riverLayerEl.appendChild(riverHoverEl);
  svg.appendChild(riverLayerEl);

  vpControlLayerEl = makeSVGEl('g', { id: 'vp-control-layer' });
  svg.appendChild(vpControlLayerEl);

  unitsLayerEl = makeSVGEl('g', { id: 'units-layer' });
  svg.appendChild(unitsLayerEl);

  svg.addEventListener('mousemove',  onMouseMove);
  svg.addEventListener('click',      onMouseClick);
  svg.addEventListener('mouseleave', () => {
    document.getElementById('hud-hover').textContent = '—';
    setRiverHoverLine(null);
  });
}

// ============================================================
// 座標変換（ビューポート → マップピクセル）
// ============================================================
function viewportToMap(clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX; pt.y = clientY;
  const inv = svg.getScreenCTM().inverse();
  const { x, y } = pt.matrixTransform(inv);
  return { x, y };
}

function getHexAt(clientX, clientY) {
  const { x, y } = viewportToMap(clientX, clientY);
  const cube = layout.pixelToHex(x, y);
  const { col, row } = cubeToLabel(cube);
  if (!inBounds(col, row)) return null;
  return { col, row, addr: hexAddr(col, row) };
}

// ============================================================
// イベントハンドラ
// ============================================================
let lastHoverAddr = null;

function onMouseMove(e) {
  if (riverEditMode) {
    const { x, y } = viewportToMap(e.clientX, e.clientY);
    const hs = getNearestHexside(x, y);
    if (hs) {
      setRiverHoverLine(hs.corners);
      const isRiver = isRiverHexside(hs.addrA, hs.addrB);
      document.getElementById('hud-hover').textContent =
        `${hs.addrA}|${hs.addrB} [${isRiver ? '河川' : '−'}]`;
      document.getElementById('river-hex-label').textContent =
        `${hs.addrA} ↔ ${hs.addrB}`;
    } else {
      setRiverHoverLine(null);
      document.getElementById('hud-hover').textContent = '—';
    }
    return;
  }

  const h = getHexAt(e.clientX, e.clientY);
  const addr = h?.addr ?? null;

  if (terrainEditMode) {
    if (addr) {
      const types = getTerrainTypes(addr);
      const typeStr = types.length ? types.map(t => TERRAIN_JP[t]).join('+') : 'Flat';
      document.getElementById('hud-hover').textContent = `${addr} [${typeStr}]`;
    } else {
      document.getElementById('hud-hover').textContent = '—';
    }
    lastHoverAddr = addr;
    return;
  }

  document.getElementById('hud-hover').textContent = addr ?? '—';

  if (addr !== lastHoverAddr) {
    if (lastHoverAddr && !isHighlighted(lastHoverAddr)) {
      setHexClass(lastHoverAddr, 'hex-normal');
    }
    if (addr && !isHighlighted(addr)) {
      setHexClass(addr, 'hex-hover');
    }
    lastHoverAddr = addr;
  }
}

function isHighlighted(addr) {
  if (gamePhase === 'deployment' && deployZoneHexes.has(addr)) return true;
  if (!selectedUnitId) return false;
  const unit = units.find(u => u.id === selectedUnitId);
  if (!unit) return false;
  const selAddr = hexAddr(unit.col, unit.row);
  if (bombardMode) return addr === selAddr || bombardTargetAddrs.has(addr);
  if (meleeMode)   return addr === selAddr || meleeTargetAddrs.has(addr);
  return addr === selAddr || reachableMap.has(addr);
}

function onMouseClick(e) {
  if (e.button !== 0) return;

  if (gamePhase === 'deployment') {
    const h = getHexAt(e.clientX, e.clientY);
    if (deployingUnitId && h && deployZoneHexes.has(h.addr)) {
      const unit = units.find(u => u.id === deployingUnitId);
      if (unit) deployUnit(unit, h.addr);
    } else {
      selectDeployUnit(null);
    }
    return;
  }

  if (napoleonMode) {
    const h = getHexAt(e.clientX, e.clientY);
    if (h) handleNapoleonModeClick(h);
    return;
  }

  if (riverEditMode) {
    const { x, y } = viewportToMap(e.clientX, e.clientY);
    const hs = getNearestHexside(x, y);
    if (hs) {
      toggleRiverHexside(hs.addrA, hs.addrB);
      const isRiver = isRiverHexside(hs.addrA, hs.addrB);
      document.getElementById('river-hex-label').textContent =
        `${hs.addrA} ↔ ${hs.addrB} [${isRiver ? '河川追加' : '削除'}]`;
    }
    return;
  }

  const h = getHexAt(e.clientX, e.clientY);
  if (!h) return;

  if (terrainEditMode) {
    setTerrainEditHex(h.addr);
    return;
  }

  if (selectedUnitId !== null) {
    const selUnit = units.find(u => u.id === selectedUnitId);
    if (bombardMode) {
      if (bombardTargetAddrs.has(h.addr) && selUnit) {
        const targetUnit = getUnitsAt(h.addr).find(u => u.army !== selUnit.army);
        if (targetUnit) resolveBombardment(selUnit, targetUnit);
      } else {
        deselect();
      }
    } else if (meleeMode) {
      if (meleeTargetAddrs.has(h.addr) && selUnit) {
        const targetUnit = getValidCloseCombatTargets(selUnit)
          .find(t => hexAddr(t.col, t.row) === h.addr);
        if (targetUnit) resolveCloseCombat(selUnit, targetUnit);
      } else {
        deselect();
      }
    } else if (reachableMap.has(h.addr)) {
      moveUnit(selectedUnitId, h.col, h.row);
    } else {
      deselect();
    }
  }
}

function deselect() {
  selectedUnitId = null;
  reachableMap.clear();
  bombardMode = false;
  bombardTargetAddrs.clear();
  meleeMode = false;
  meleeTargetAddrs.clear();
  refreshHighlights();
  setHudState('待機中');
  const actEl = document.getElementById('hud-actions');
  if (actEl) actEl.innerHTML = '';
  drawAllUnits();
}

// ============================================================
// ハイライト・ヘックス状態
// ============================================================

function refreshHighlights() {
  const selUnit = selectedUnitId ? units.find(u => u.id === selectedUnitId) : null;
  const selAddr = selUnit ? hexAddr(selUnit.col, selUnit.row) : null;

  for (const addr of hexEls.keys()) {
    if (napoleonTargetAddrs.has(addr)) {
      setHexClass(addr, 'hex-napoleon');
    } else if (aiHighlightAddrs.has(addr)) {
      setHexClass(addr, aiHighlightAddrs.get(addr));
    } else if (selAddr && addr === selAddr) {
      setHexClass(addr, 'hex-selected');
    } else if (bombardMode && bombardTargetAddrs.has(addr)) {
      setHexClass(addr, 'hex-bombard');
    } else if (meleeMode && meleeTargetAddrs.has(addr)) {
      setHexClass(addr, 'hex-melee');
    } else if (!bombardMode && !meleeMode && reachableMap.has(addr)) {
      setHexClass(addr, reachableMap.get(addr) ? 'hex-stop' : 'hex-reachable');
    } else if (gamePhase === 'deployment' && deployZoneHexes.has(addr)) {
      setHexClass(addr, 'hex-deploy');
    } else {
      setHexClass(addr, addr === lastHoverAddr ? 'hex-hover' : 'hex-normal');
    }
  }
}

function setHexClass(addr, cls) {
  const poly = hexEls.get(addr);
  if (poly) poly.setAttribute('class', cls);
}

function setHudState(msg) {
  document.getElementById('hud-state').textContent = msg;
}

// ============================================================
// ユニット描画
// ============================================================
const IW = 64, IH = 64;

function drawAllUnits() {
  if (!unitsLayerEl) return;
  unitsLayerEl.innerHTML = '';

  for (const unit of units) {
    if (unit.offMap) continue;
    const col = toIdx(unit.col), row = toIdx(unit.row);
    const { x, y } = layout.hexToPixel(col, row);
    const isSelected = unit.id === selectedUnitId;
    const isPending  = pendingActionUnits.has(unit.id);

    const g = makeSVGEl('g', {
      'data-unit-id': unit.id,
      cursor: 'pointer',
    });
    g.setAttribute('pointer-events', 'all');

    const glowColor = isSelected ? '#ffd700' : isPending ? '#00e5ff' : 'none';
    const glow = makeSVGEl('rect', {
      x: x - IW / 2 - 3, y: y - IH / 2 - 3,
      width: IW + 6, height: IH + 6,
      fill: 'none',
      stroke: glowColor,
      'stroke-width': '2.5', rx: '6',
    });

    const img = makeSVGEl('image', {
      href: unit.imageHref,
      x: x - IW / 2, y: y - IH / 2,
      width: IW, height: IH,
    });

    const armyColors = { french: '#5bb5ff', allied: '#ff8888', prussian: '#aaaaaa' };
    const bar = makeSVGEl('rect', {
      x: x - IW / 2, y: y + IH / 2 - 5,
      width: IW, height: 5,
      fill: armyColors[unit.army] || '#aaa',
      opacity: '0.8', rx: '2',
    });

    g.appendChild(glow);
    g.appendChild(img);
    g.appendChild(bar);

    if (unit.battleworn) {
      const bwBar = makeSVGEl('rect', {
        x: x - IW / 2, y: y - IH / 2,
        width: IW, height: 3,
        fill: '#ff3333', opacity: '0.9', rx: '1',
      });
      g.appendChild(bwBar);
    }

    const _status = getUnitStatus(unit);
    if (_status === 'shaken' || _status === 'disrupted') {
      const badgeColor = _status === 'shaken' ? '#ff8c00' : '#ff2222';
      const badge = makeSVGEl('rect', {
        x: x + IW / 2 - 14, y: y - IH / 2 + 1,
        width: 13, height: 13,
        fill: badgeColor, rx: '2', 'pointer-events': 'none',
      });
      const badgeTxt = makeSVGEl('text', {
        x: x + IW / 2 - 7, y: y - IH / 2 + 11,
        fill: '#fff', 'font-size': '9', 'font-weight': 'bold',
        'text-anchor': 'middle', 'pointer-events': 'none',
      });
      badgeTxt.textContent = _status === 'shaken' ? 'S' : 'D';
      g.appendChild(badge);
      g.appendChild(badgeTxt);
    }

    if ((unit.hits ?? 0) > 0) {
      const dots = '●'.repeat(Math.min(unit.hits, 3));
      const hitTxt = makeSVGEl('text', {
        x: x - IW / 2 + 4, y: y - IH / 2 + 11,
        fill: '#ff4444', 'font-size': '9', 'font-weight': 'bold',
        'pointer-events': 'none',
      });
      hitTxt.textContent = dots;
      g.appendChild(hitTxt);
    }

    if (viveBoostUnitId === unit.id) {
      const viveTxt = makeSVGEl('text', {
        x, y: y + IH / 2 - 2,
        fill: '#ffd700', 'font-size': '13', 'text-anchor': 'middle',
        'pointer-events': 'none',
      });
      viveTxt.textContent = '👑';
      g.appendChild(viveTxt);
    }

    unitsLayerEl.appendChild(g);

    g.addEventListener('click', (e) => {
      e.stopPropagation();
      if (terrainEditMode) return;

      // Corps lock: French units outside the active corps, or already acted, cannot be selected
      if (unit.army === 'french' && activeCorps !== null) {
        if (unit.corps !== activeCorps) return;
        if (unit.acted) return;
      }

      const selUnit = selectedUnitId ? units.find(u => u.id === selectedUnitId) : null;
      const unitAddr = hexAddr(unit.col, unit.row);

      if (bombardMode && selUnit && unit.army !== selUnit.army && bombardTargetAddrs.has(unitAddr)) {
        resolveBombardment(selUnit, unit);
        return;
      }

      if (meleeMode && selUnit && unit.army !== selUnit.army && meleeTargetAddrs.has(unitAddr)) {
        resolveCloseCombat(selUnit, unit);
        return;
      }

      // 連合軍・プロイセン軍はプレイヤーが選択・移動できない（AI制御）
      if (unit.army !== 'french') return;

      if (selectedUnitId === unit.id) {
        deselect();
      } else {
        selectedUnitId = unit.id;
        bombardMode = false;
        bombardTargetAddrs.clear();
        meleeMode = false;
        meleeTargetAddrs.clear();
        computeReachable(unit);
        refreshHighlights();
        drawAllUnits();
        document.getElementById('hud-piece').textContent = hexAddr(unit.col, unit.row);
        setHudState(`${unit.id} 選択中 (MA=${getMA(unit.type)})`);
        updateHudActions(unit);
      }
    });
  }
  renderVPPanel();
}

// ============================================================
// HUDアクションボタン
// ============================================================

function updateHudActions(unit) {
  const el = document.getElementById('hud-actions');
  if (!el) return;
  el.innerHTML = '';

  const af = getEffectiveAF(unit);
  if (af > 0) {
    const btn = makeBtn(`砲撃 (AF=${af})`, 'btn-danger', () => {
      meleeMode = false;
      meleeTargetAddrs.clear();
      startBombardMode(unit);
    });
    el.appendChild(btn);
  }

  if (unit.type !== 'artillery') {
    const meleeTargets = getValidCloseCombatTargets(unit);
    if (meleeTargets.length > 0) {
      const btn = makeBtn(`近接攻撃 (${meleeTargets.length})`, 'btn-warn', () => {
        bombardMode = false;
        bombardTargetAddrs.clear();
        startMeleeMode(unit);
      });
      el.appendChild(btn);
    }
  }

  if ((unit.hits ?? 0) > 0) {
    const btn = makeBtn('Rally', 'btn-primary', () => {
      bombardMode = false;
      bombardTargetAddrs.clear();
      meleeMode = false;
      meleeTargetAddrs.clear();
      doRally(unit);
    });
    el.appendChild(btn);
  }
}

// ============================================================
// パン＆ズーム
// ============================================================
const container = document.getElementById('map-container');
const viewport  = document.getElementById('viewport');

let zoom   = 0.38;
let panX   = 0, panY = 0;
let isPanning = false;
let dragStart = null;
let hasDragged = false;

function applyTransform() {
  container.style.transform = `translate(${panX}px,${panY}px) scale(${zoom})`;
  document.getElementById('zoom-val').textContent = Math.round(zoom * 100);
}

viewport.addEventListener('wheel', e => {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
  const oldZoom = zoom;
  zoom = Math.min(Math.max(zoom * factor, 0.1), 4);
  const k = zoom / oldZoom;
  panX = e.clientX - k * (e.clientX - panX);
  panY = e.clientY - k * (e.clientY - panY);
  applyTransform();
}, { passive: false });

viewport.addEventListener('mousedown', e => {
  if (e.button === 1 || e.button === 2) {
    isPanning = true;
    hasDragged = false;
    dragStart = { x: e.clientX - panX, y: e.clientY - panY };
    viewport.classList.add('panning');
    e.preventDefault();
  }
});

window.addEventListener('mousemove', e => {
  if (!isPanning) return;
  const dx = Math.abs(e.clientX - (dragStart.x + panX));
  const dy = Math.abs(e.clientY - (dragStart.y + panY));
  if (dx > 3 || dy > 3) hasDragged = true;
  panX = e.clientX - dragStart.x;
  panY = e.clientY - dragStart.y;
  applyTransform();
});

window.addEventListener('mouseup', () => {
  isPanning = false;
  viewport.classList.remove('panning');
});

viewport.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (napoleonMode) cancelNapoleonMode();
    else if (selectedUnitId !== null) deselect();
  }
});

// ============================================================
// 地形編集 UI
// ============================================================
let terrainEditMode = false;
let terrainEditAddr = null;

function setTerrainEditHex(addr) {
  terrainEditAddr = addr;
  document.getElementById('terrain-hex-label').textContent = `ヘックス: ${addr}`;
  const types = getTerrainTypes(addr);
  document.getElementById('tc-ridge').checked            = types.includes('ridge');
  document.getElementById('tc-woods').checked            = types.includes('woods');
  document.getElementById('tc-buildings').checked        = types.includes('buildings');
  document.getElementById('tc-walled_buildings').checked = types.includes('walled_buildings');
}

function setRiverEditMode(on) {
  riverEditMode = on;
  const btn   = document.getElementById('btn-river-toggle');
  const panel = document.getElementById('river-edit-panel');
  if (on) {
    btn.textContent = '河川設定 ON';
    btn.classList.replace('btn-neutral', 'btn-river-on');
    panel.style.display = 'block';
    svg.style.cursor = 'crosshair';
    if (selectedUnitId !== null) deselect();
  } else {
    btn.textContent = '河川設定 OFF';
    btn.classList.replace('btn-river-on', 'btn-neutral');
    panel.style.display = 'none';
    setRiverHoverLine(null);
    svg.style.cursor = '';
    document.getElementById('hud-hover').textContent = '—';
  }
}

document.getElementById('btn-river-toggle').addEventListener('click', () => {
  if (!riverEditMode && terrainEditMode) {
    terrainEditMode = false;
    document.getElementById('btn-terrain-toggle').textContent = '地形設定 OFF';
    document.getElementById('btn-terrain-toggle').classList.replace('btn-terrain-on', 'btn-neutral');
    document.getElementById('terrain-edit-panel').style.display = 'none';
    terrainEditAddr = null;
  }
  setRiverEditMode(!riverEditMode);
});

document.getElementById('btn-terrain-toggle').addEventListener('click', () => {
  terrainEditMode = !terrainEditMode;
  const btn   = document.getElementById('btn-terrain-toggle');
  const panel = document.getElementById('terrain-edit-panel');
  if (terrainEditMode) {
    if (riverEditMode) setRiverEditMode(false);
    btn.textContent = '地形設定 ON';
    btn.classList.replace('btn-neutral', 'btn-terrain-on');
    panel.style.display = 'block';
    svg.style.cursor = 'crosshair';
    if (selectedUnitId !== null) deselect();
  } else {
    btn.textContent = '地形設定 OFF';
    btn.classList.replace('btn-terrain-on', 'btn-neutral');
    panel.style.display = 'none';
    terrainEditAddr = null;
    svg.style.cursor = '';
    document.getElementById('hud-hover').textContent = '—';
  }
});

for (const type of ['ridge', 'woods', 'buildings', 'walled_buildings']) {
  document.getElementById(`tc-${type}`).addEventListener('change', () => {
    if (!terrainEditAddr) return;
    toggleTerrainType(terrainEditAddr, type);
    const types = getTerrainTypes(terrainEditAddr);
    const typeStr = types.length ? types.map(t => TERRAIN_JP[t]).join('+') : 'Flat';
    document.getElementById('hud-hover').textContent = `${terrainEditAddr} [${typeStr}]`;
  });
}

document.getElementById('btn-terrain-export').addEventListener('click', exportTerrainJSON);

document.getElementById('terrain-import-input').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => importTerrainJSON(ev.target.result);
  reader.readAsText(file);
  e.target.value = '';
});

// ============================================================
// 初期化
// ============================================================
function init() {
  const W = mapImg.naturalWidth, H = mapImg.naturalHeight;
  setupSVG(W, H);

  for (const u of units) {
    if (u.army === 'french' && !u.offMap) u.offMap = true;
  }

  drawAllUnits();

  panX = (window.innerWidth  - W * zoom) / 2;
  panY = (window.innerHeight - H * zoom) / 2;
  applyTransform();
}

if (mapImg.complete && mapImg.naturalWidth > 0) {
  init();
} else {
  mapImg.addEventListener('load', init);
}

// ============================================================
// テストシナリオパネル
// ============================================================
function initTestPanel() {
  if (typeof TEST_SCENARIOS === 'undefined') return;

  const body   = document.getElementById('test-panel-body');
  const toggle = document.getElementById('test-panel-toggle');
  let open = false;

  document.getElementById('test-panel-header').addEventListener('click', () => {
    open = !open;
    body.classList.toggle('open', open);
    toggle.textContent = open ? '▲ 閉じる' : '▼ 開く';
  });

  const CATEGORY_LABEL = { bombard: '🔴 砲撃テスト', melee: '⚔️ 近接戦闘テスト' };
  let lastCat = null;

  for (const s of TEST_SCENARIOS) {
    if (s.category !== lastCat) {
      const hdr = document.createElement('div');
      hdr.className = 'tp-category';
      hdr.textContent = CATEGORY_LABEL[s.category] || s.category;
      body.appendChild(hdr);
      lastCat = s.category;
    }
    const row = document.createElement('div');
    row.className = 'tp-scenario';

    const btn = document.createElement('button');
    btn.className = 'tp-btn';
    btn.textContent = s.id.toUpperCase();
    btn.title = s.title;
    btn.addEventListener('click', () => {
      loadTestScenario(s.id);
      addCombatLog(`シナリオ ${s.id}: ${s.title}`);
    });

    const desc = document.createElement('div');
    desc.className = 'tp-desc';
    desc.textContent = s.title;
    desc.title = s.desc;

    row.appendChild(btn);
    row.appendChild(desc);
    body.appendChild(row);
  }
}

window.addEventListener('load', () => {
  setTimeout(initTestPanel, 100);
  if (typeof VLE_TERRAIN_DATA !== 'undefined') {
    importTerrainJSON(JSON.stringify(VLE_TERRAIN_DATA));
  }
});
