// ============================================================
// チットプルUI
// ============================================================

const cps = new ChitPullSystem();

const FRENCH_MARKER_TO_CORPS = {
  'fr-I': 'I', 'fr-II': 'II', 'fr-VI': 'VI',
  'fr-IIIcav': 'IIIC', 'fr-IVcav': 'IVC', 'fr-IG': 'IG',
};

function setActiveCorps(markerId) {
  activeCorps = FRENCH_MARKER_TO_CORPS[markerId] ?? null;
  pendingActionUnits.clear();
  if (activeCorps) {
    for (const u of units) {
      if (u.army === 'french' && u.corps === activeCorps && !u.offMap) {
        pendingActionUnits.add(u.id);
      }
    }
  }
  renderUndoButton();
  drawAllUnits();
}

function clearActiveCorps() {
  activeCorps = null;
  pendingActionUnits.clear();
  frenchActivationSnapshot = null;
  renderUndoButton();
  drawAllUnits();
}

// ============================================================
// フランスアクティベーション スナップショット（UNDO用）
// ============================================================

let frenchActivationSnapshot = null;

function takeFrenchActivationSnapshot() {
  frenchActivationSnapshot = {
    units: units.map(u => ({
      id: u.id, col: u.col, row: u.row,
      sp: u.sp, af: u.af, er: u.er,
      hits: u.hits ?? 0,
      battleworn: !!u.battleworn,
      offMap: !!u.offMap,
      acted: !!u.acted,
    })),
    activeCorps,
    pendingActionUnits: [...pendingActionUnits],
    pasDeChargeActive,
    napoleonMode, napoleonModeIdx, viveBoostUnitId,
    combatLogLength: combatLog.length,
    chitPullState: cps.getState(),
  };
}

function restoreFrenchActivationSnapshot() {
  if (!frenchActivationSnapshot) return;
  const snap = frenchActivationSnapshot;

  for (const saved of snap.units) {
    const unit = units.find(u => u.id === saved.id);
    if (!unit) continue;
    unit.col = saved.col; unit.row = saved.row;
    unit.sp  = saved.sp;  unit.af  = saved.af; unit.er = saved.er;
    unit.hits      = saved.hits;
    unit.battleworn = saved.battleworn;
    unit.offMap    = saved.offMap;
    unit.acted     = saved.acted;
  }

  activeCorps = snap.activeCorps;
  pendingActionUnits.clear();
  for (const id of snap.pendingActionUnits) pendingActionUnits.add(id);

  pasDeChargeActive = snap.pasDeChargeActive;
  napoleonMode      = snap.napoleonMode;
  napoleonModeIdx   = snap.napoleonModeIdx;
  viveBoostUnitId   = snap.viveBoostUnitId;

  combatLog.splice(snap.combatLogLength);

  cps.loadState(snap.chitPullState);

  deselect();
  drawAllUnits();
  renderVPControlLayer();
  renderVPPanel();
  renderNapoleonConditions();
  renderCombatLog();
  renderChitUI(cps.getState());
  renderUndoButton();
  setHudState(`↩ やり直し — ${activeCorps} Corps アクティベーション中`);
}

function renderUndoButton() {
  const btn = document.getElementById('btn-undo-activation');
  if (btn) btn.style.display = activeCorps ? '' : 'none';
}

const elTurnBadge      = document.getElementById('turn-badge');
const elCupCount       = document.getElementById('cup-count');
const elCupBreakdown   = document.getElementById('cup-breakdown');
const elDrawnEmpty     = document.getElementById('drawn-empty');
const elDrawnCard      = document.getElementById('drawn-card');
const elHeldNapoleon   = document.getElementById('held-napoleon-area');
const elHeldFrench     = document.getElementById('held-french-area');
const elHeldEmpty      = document.getElementById('held-empty');
const elTRTList        = document.getElementById('trt-list');
const elDiscardedList  = document.getElementById('discarded-list');
const elDiscardedEmpty = document.getElementById('discarded-empty');
const elChitLog        = document.getElementById('chit-log');
const elBtnDraw        = document.getElementById('btn-draw');
const elBtnEndTurn     = document.getElementById('btn-endturn');

const elChitPanel  = document.getElementById('chit-panel');
const elChitToggle = document.getElementById('chit-toggle');
elChitToggle.addEventListener('click', () => {
  const collapsed = elChitPanel.classList.toggle('collapsed');
  elChitToggle.textContent = collapsed ? '▶' : '◀';
});

const TYPE_COLOR = {
  french:    '#5bb5ff',
  allied:    '#ff8888',
  prussian:  '#aaaaaa',
  napoleon:  '#ffd700',
  wellington:'#cc4444',
  blucher:   '#aaaaaa',
};
const TYPE_LABEL_JP = {
  french:    'フランス',
  allied:    '連合軍',
  prussian:  'プロイセン',
  napoleon:  'Napoleon',
  wellington:'Wellington',
  blucher:   'Blücher',
};

function renderChitUI(state) {
  renderVPPanel();

  elTurnBadge.textContent = `ターン ${state.turn} / 12`;

  elCupCount.textContent = state.cup.length;
  const bd = {};
  for (const m of state.cup) bd[m.type] = (bd[m.type] || 0) + 1;
  elCupBreakdown.innerHTML = '';
  for (const [type, count] of Object.entries(bd)) {
    const chip = document.createElement('span');
    chip.className = 'cc-chip';
    chip.style.color = TYPE_COLOR[type] || '#aaa';
    chip.textContent = `${TYPE_LABEL_JP[type] || type} ×${count}`;
    elCupBreakdown.appendChild(chip);
  }

  if (state.drawn) {
    elDrawnEmpty.style.display = 'none';
    elDrawnCard.style.display = '';
    renderDrawnCard(elDrawnCard, state.drawn);
  } else {
    elDrawnEmpty.style.display = '';
    elDrawnCard.style.display = 'none';
  }

  elHeldNapoleon.innerHTML = '';
  state.heldNapoleon.forEach((m, i) => {
    const div = makeHeldCard(m, () => openNapoleonModal(i), '使用', 'btn-warn');
    elHeldNapoleon.appendChild(div);
  });
  elHeldFrench.innerHTML = '';
  if (state.heldFrench) {
    const div = makeHeldCard(state.heldFrench, () => {
      const r = cps.useHeldFrench();
      if (!r.ok) { alert(r.error); return; }
      if (r.marker && r.marker.type === 'french') {
        setActiveCorps(r.marker.id);
        takeFrenchActivationSnapshot();
      }
      renderChitUI(cps.getState());
    }, '使用（Humbugged）', 'btn-hold');
    elHeldFrench.appendChild(div);
  }
  elHeldEmpty.style.display =
    (state.heldNapoleon.length === 0 && !state.heldFrench) ? '' : 'none';

  elTRTList.innerHTML = '';
  if (state.trtMarkers.length === 0) {
    elTRTList.innerHTML = '<div style="color:#555;font-size:11px">— 全コープス展開済み —</div>';
  } else {
    for (const m of state.trtMarkers) {
      const div = document.createElement('div');
      div.className = 'trt-item';
      div.innerHTML = `<span>${m.label} <span style="color:#888">(${m.sub})</span></span>`
                    + `<span class="trt-turn">ターン${m.trtTurn}到着</span>`;
      elTRTList.appendChild(div);
    }
  }

  elDiscardedList.innerHTML = '';
  if (state.discarded.length === 0) {
    elDiscardedEmpty.style.display = '';
    elDiscardedList.appendChild(elDiscardedEmpty);
  } else {
    elDiscardedEmpty.style.display = 'none';
    for (const m of state.discarded) {
      const div = document.createElement('div');
      div.className = 'disc-item';
      div.textContent = m.sub ? `${m.label} (${m.sub})` : m.label;
      elDiscardedList.appendChild(div);
    }
  }

  elChitLog.innerHTML = '';
  state.log.slice(0, 20).forEach((entry, i) => {
    const div = document.createElement('div');
    div.className = 'log-entry' + (i < 3 ? ' log-new' : '');
    div.textContent = entry.msg;
    elChitLog.appendChild(div);
  });

  const frenchActive = state.drawn?.type === 'french';
  elBtnDraw.disabled = (!!state.drawn && !frenchActive) || state.cup.length === 0;
  elBtnDraw.textContent = frenchActive ? '✅ 完了 → 次を引く' : '🎲 マーカーを引く';
  elBtnEndTurn.disabled = !!state.drawn && !frenchActive;
  if (state.turn >= 12 && state.cup.length === 0 && !state.drawn) {
    elBtnEndTurn.textContent = 'ゲーム終了';
  } else {
    elBtnEndTurn.textContent = 'ターン終了 →';
  }
}

function renderDrawnCard(el, m) {
  const color = TYPE_COLOR[m.type] || '#aaa';
  el.style.borderLeftColor = color;
  el.innerHTML = '';

  const label = document.createElement('div');
  label.className = 'mc-label';
  label.style.color = color;
  label.textContent = m.label;
  el.appendChild(label);

  if (m.sub) {
    const sub = document.createElement('div');
    sub.className = 'mc-sub';
    sub.textContent = m.sub;
    el.appendChild(sub);
  }

  const actions = document.createElement('div');
  actions.className = 'mc-actions';
  el.appendChild(actions);

  switch (m.type) {
    case 'french': {
      const status = document.createElement('div');
      status.style.cssText = 'font-size:11px;color:#88ddff;margin-bottom:4px';
      status.textContent = '⚡ アクティベーション中 — 操作後に次を引いてください';
      actions.appendChild(status);

      if (!cps.getState().heldFrench) {
        const btnHold = makeBtn('保持（Humbugged）', 'btn-hold', () => {
          const r = cps.holdFrench();
          if (!r.ok) { alert(r.error); return; }
          clearActiveCorps();
          renderChitUI(cps.getState());
        });
        actions.appendChild(btnHold);
      }
      break;
    }

    case 'allied': {
      if (m.id === 'aa-det') {
        const btnDet = makeBtn('Detachment Activation', 'btn-danger', () => {
          const onDone = () => { cps.resolveDrawn(); renderChitUI(cps.getState()); };
          resolveDetachmentActivation(onDone);
        });
        actions.appendChild(btnDet);
      } else {
        const btnRoll = makeBtn('ロール＆アクティベート', 'btn-danger', () => {
          const onDone = () => { cps.resolveDrawn(); renderChitUI(cps.getState()); };
          openRollModal(m, ALLIED_PRUSSIAN_TABLE, onDone, '',
            (key, done) => runAlliedPrussianAI(m, key, done));
        });
        actions.appendChild(btnRoll);
      }
      break;
    }

    case 'prussian': {
      const btnRoll = makeBtn('ロール＆アクティベート', 'btn-danger', () => {
        const onDone = () => { cps.resolveDrawn(); renderChitUI(cps.getState()); };
        openRollModal(m, ALLIED_PRUSSIAN_TABLE, onDone, '',
          (key, done) => runAlliedPrussianAI(m, key, done));
      });
      actions.appendChild(btnRoll);
      break;
    }

    case 'wellington': {
      const btnRoll = makeBtn('Old Nosey Table', 'btn-danger', () => {
        const onDone = () => { cps.resolveDrawn(); renderChitUI(cps.getState()); };
        resolveWellington(m, onDone);
      });
      actions.appendChild(btnRoll);
      break;
    }

    case 'blucher': {
      const btnRoll = makeBtn('Alte Vorwarts Table', 'btn-neutral', () => {
        const onDone = () => { cps.resolveDrawn(); renderChitUI(cps.getState()); };
        resolveBlucher(m, onDone);
      });
      actions.appendChild(btnRoll);
      break;
    }

    case 'napoleon':
      break;
  }
}

function makeHeldCard(m, onUse, btnLabel, btnClass) {
  const color = TYPE_COLOR[m.type] || '#aaa';
  const div = document.createElement('div');
  div.className = 'marker-card';
  div.style.borderLeftColor = color;
  div.innerHTML = `<div class="mc-label" style="color:${color}">${m.label}</div>`
                + (m.sub ? `<div class="mc-sub">${m.sub}</div>` : '');
  const actions = document.createElement('div');
  actions.className = 'mc-actions';
  actions.appendChild(makeBtn(btnLabel, btnClass, onUse));
  div.appendChild(actions);
  return div;
}

function makeBtn(text, cls, onClick) {
  const btn = document.createElement('button');
  btn.className = `btn ${cls}`;
  btn.textContent = text;
  btn.addEventListener('click', onClick);
  return btn;
}

// ---- ダイスロールモーダル ----
let _rollResolve = null;

function openRollModal(marker, table, onResolve, preamble = '', onAIExec = null) {
  const { total, d1, d2 } = roll2d6();
  const result = lookupTable(table, total);

  document.getElementById('roll-modal-title').textContent =
    `${marker.label}${marker.sub ? ' — ' + marker.sub : ''} アクティベーション`;
  document.getElementById('roll-dice').textContent = `⚄ ${d1} + ⚄ ${d2} = ${total}`;

  if (result) {
    document.getElementById('roll-result-title').textContent = result.title;
    document.getElementById('roll-result-desc').textContent =
      (preamble ? preamble + '\n\n' : '') + result.desc;
  } else {
    document.getElementById('roll-result-title').textContent = '（結果なし）';
    document.getElementById('roll-result-desc').textContent = `ロール: ${total}`;
  }

  _rollResolve = onResolve;

  const btnAI = document.getElementById('btn-roll-ai-exec');
  if (onAIExec && result) {
    btnAI.style.display = '';
    btnAI.onclick = () => {
      document.getElementById('roll-modal').classList.add('hidden');
      onAIExec(result.key, () => {
        if (_rollResolve) { _rollResolve(); _rollResolve = null; }
      });
    };
  } else {
    btnAI.style.display = 'none';
    btnAI.onclick = null;
  }

  document.getElementById('roll-modal').classList.remove('hidden');
}

document.getElementById('btn-roll-resolve').addEventListener('click', () => {
  document.getElementById('roll-modal').classList.add('hidden');
  if (_rollResolve) { _rollResolve(); _rollResolve = null; }
});

document.getElementById('btn-bombard-resolve').addEventListener('click', () => {
  document.getElementById('bombard-modal').classList.add('hidden');
  if (_bombardOnResolve) { _bombardOnResolve(); _bombardOnResolve = null; }
});

// ---- Napoleon選択モーダル ----
let _napoleonIdx = -1;

function openNapoleonModal(idx) {
  _napoleonIdx = idx;
  const list = document.getElementById('napoleon-options-list');
  list.innerHTML = '';
  for (const opt of NAPOLEON_OPTIONS) {
    const div = document.createElement('div');
    div.className = 'napoleon-option';
    div.innerHTML = `<div class="nopt-title">${opt.title}</div>`
                  + `<div class="nopt-desc">${opt.desc}</div>`;
    div.addEventListener('click', () => {
      document.getElementById('napoleon-modal').classList.add('hidden');
      executeNapoleonAction(_napoleonIdx, opt.key);
    });
    list.appendChild(div);
  }
  document.getElementById('napoleon-modal').classList.remove('hidden');
}

document.getElementById('btn-napoleon-cancel').addEventListener('click', () => {
  document.getElementById('napoleon-modal').classList.add('hidden');
});

// ---- メインボタン ----
elBtnDraw.addEventListener('click', () => {
  // フランスアクティベーション中なら自動解決してから次を引く
  if (cps.getState().drawn?.type === 'french') {
    cps.resolveDrawn();
  }
  clearActiveCorps();
  const r = cps.drawMarker();
  if (r.error) {
    alert(r.error);
    return;
  }
  // フランスマーカーを引いた瞬間にコープスロックとスナップショットを設定
  if (r.marker && r.marker.type === 'french') {
    setActiveCorps(r.marker.id);
    takeFrenchActivationSnapshot();
  }
  renderChitUI(cps.getState());
});

elBtnEndTurn.addEventListener('click', () => {
  if (cps.getState().drawn) {
    alert('現在のマーカーを先に解決してください');
    return;
  }
  reverseSlope   = false;
  thinRedLine    = false;
  scumOfTheEarth = false;
  renderConditionsPanel();
  if (napoleonMode) cancelNapoleonMode();
  pasDeChargeActive = false;
  viveBoostUnitId   = null;
  renderNapoleonConditions();
  // Bug #1 fix: reset acted flags for all units at end of turn
  for (const u of units) u.acted = false;
  clearActiveCorps();
  drawAllUnits();
  const r = cps.endTurn();
  renderChitUI(cps.getState());
  if (r.arrivedCorps && r.arrivedCorps.length > 0) {
    const deploySeq = r.arrivedCorps.map(m => done => deployPrussianCorps(m, done));
    executeActionsSequentially(deploySeq, () => {});
  }
  renderVPPanel();
  if (r.gameOver) {
    setTimeout(() => endGame(), 200);
  }
});

cps.on(renderChitUI);

document.getElementById('btn-endgame-close').addEventListener('click', () => {
  document.getElementById('endgame-modal').classList.add('hidden');
});

document.getElementById('btn-check-vp').addEventListener('click', () => {
  const { total, rows } = calcVP();
  showEndGameModal(total, getVictoryLevel(total), rows);
});

// ============================================================
// ゲームフェーズ管理 — Rainy Start / Deployment
// ============================================================

const DEPLOY_ZONES = {
  'I':    { center: '1309', radius: 3 },
  'II':   { center: '0611', radius: 3 },
  'VI':   { center: '1111', radius: 1 },
  'IIIC': { center: '0511', radius: 2 },
  'IVC':  { center: '1411', radius: 2 },
};

function getDeploymentZone(unit) {
  if (unit.corps === 'IG') {
    if (unit.id === 'guyot_IG')       return { center: '0512', radius: 2 };
    if (unit.id === 'lefeb-desno_IG') return { center: '1511', radius: 2 };
    return { center: '1013', radius: 1 };
  }
  return DEPLOY_ZONES[unit.corps] || { center: '1309', radius: 2 };
}

function getFrenchDeployUnits() {
  const GROUCHY_IDS = new Set([
    'hulot_IV','vichery_IV','pecheux_IV','baltus_IV',
    'chastel_IIIC','strolz_IIIC','maurin_IC','soult_IC',
  ]);
  return units.filter(u => u.army === 'french' && !GROUCHY_IDS.has(u.id));
}

function computeDeployableHexes(unit) {
  const zone = getDeploymentZone(unit);
  const result = new Set();
  for (let c = 1; c <= GRID_COLS; c++) {
    for (let r = 1; r <= GRID_ROWS; r++) {
      const addr = hexAddr(c, r);
      if (hexDistance(addr, zone.center) > zone.radius) continue;
      if (neighborAddrs(addr).some(n => getUnitsAt(n).some(u => u.army === 'allied'))) continue;
      const occupants = getUnitsAt(addr).filter(u => u.army === 'french');
      if (occupants.length === 0) {
        result.add(addr);
      } else if (occupants.length === 1 && unit.small && occupants[0].small) {
        result.add(addr);
      }
    }
  }
  return result;
}

function selectDeployUnit(unitId) {
  deployingUnitId = unitId;
  deployZoneHexes.clear();
  if (unitId) {
    const unit = units.find(u => u.id === unitId);
    if (unit && unit.offMap) {
      for (const addr of computeDeployableHexes(unit)) deployZoneHexes.add(addr);
      setHudState(`配置中: ${unit.id.replace(/_/g,' ')} — 緑ヘックスをクリック`);
    }
  } else {
    setHudState('ユニットを選択してください');
  }
  refreshHighlights();
  renderDeploymentPanel();
}

function deployUnit(unit, addr) {
  const colLabel = parseInt(addr.slice(0, 2), 10);
  const rowLabel = parseInt(addr.slice(2), 10);
  unit.col = colLabel;
  unit.row = rowLabel;
  unit.offMap = false;
  deployingUnitId = null;
  deployZoneHexes.clear();
  refreshHighlights();
  drawAllUnits();
  renderDeploymentPanel();
  const remaining = getFrenchDeployUnits().filter(u => u.offMap).length;
  if (remaining === 0) {
    document.getElementById('btn-deploy-complete').disabled = false;
    setHudState('全ユニット配置完了！「配置完了」ボタンで会戦開始');
  } else {
    setHudState(`残り ${remaining} ユニット — 次のユニットを選択`);
  }
}

function renderDeploymentPanel() {
  const deployUnits = getFrenchDeployUnits();
  const placed = deployUnits.filter(u => !u.offMap).length;
  document.getElementById('deploy-progress').textContent =
    `${placed} / ${deployUnits.length} 配置完了`;

  const CORPS_ORDER = ['I','II','VI','IIIC','IVC','IG'];
  const CORPS_LABEL = {
    'I':'I Corps (D\'Erlon)', 'II':'II Corps (Reille)',
    'VI':'VI Corps (Lobau)', 'IIIC':'III Cav (Kellerman)',
    'IVC':'IV Cav (Milhaud)', 'IG':'IG (Drouot)',
  };

  const list = document.getElementById('deploy-unit-list');
  list.innerHTML = '';
  for (const corps of CORPS_ORDER) {
    const corpUnits = deployUnits.filter(u => u.corps === corps);
    if (!corpUnits.length) continue;
    const hdr = document.createElement('div');
    hdr.style.cssText = 'font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.08em;margin:8px 0 3px';
    hdr.textContent = CORPS_LABEL[corps] || corps;
    list.appendChild(hdr);
    for (const unit of corpUnits) {
      const zone = getDeploymentZone(unit);
      const placed = !unit.offMap;
      const card = document.createElement('div');
      card.className = 'deploy-unit-card'
        + (unit.id === deployingUnitId ? ' selected' : '')
        + (placed ? ' deployed' : '');
      card.innerHTML = `<div class="du-name">${unit.id.replace(/_/g,' ')}</div>`
        + (placed
          ? `<div class="du-placed">✓ ${hexAddr(unit.col, unit.row)}</div>`
          : `<div class="du-info">${unit.type} · ${zone.center} ±${zone.radius}</div>`);
      if (!placed) card.addEventListener('click', () => selectDeployUnit(unit.id));
      list.appendChild(card);
    }
  }
}

function renderRainyStartPanel() {
  const state = cps.getState();
  const turn = state.turn;
  const mod = turn - 1;
  document.getElementById('rainy-turn-info').textContent =
    `ターン ${turn} — 開始判定ロール`;
  document.getElementById('rainy-modifier-info').textContent =
    `1d6+${mod}≥5 で会戦開始${turn >= 5 ? '（強制開始）' : ''}`;
  const logEl = document.getElementById('rainy-log');
  logEl.innerHTML = '';
  for (const e of rainyLog.slice(0, 8)) {
    const div = document.createElement('div');
    div.className = 'rainy-log-entry ' + (e.success ? 'success' : 'fail');
    div.textContent = e.msg;
    logEl.appendChild(div);
  }
}

function rollRainyStart() {
  const state = cps.getState();
  const turn = state.turn;
  const mod = turn - 1;
  const roll = Math.ceil(Math.random() * 6);
  const total = roll + mod;
  const success = total >= 5 || turn >= 5;
  const msg = turn >= 5
    ? `Turn ${turn}: 強制開始 → 会戦開始！`
    : `Turn ${turn}: 🎲${roll}+${mod}=${total} → ${success ? '会戦開始！' : '待機続行'}`;
  rainyLog.unshift({ msg, success });
  cps._log(msg);
  if (success) {
    startDeploymentPhase();
  } else {
    cps.endTurn();
    renderChitUI(cps.getState());
    renderRainyStartPanel();
  }
}

function startDeploymentPhase() {
  gamePhase = 'deployment';
  document.getElementById('rainy-start-section').style.display  = 'none';
  document.getElementById('deployment-section').style.display   = '';
  document.getElementById('battle-section').style.display       = 'none';
  document.getElementById('btn-rainy-roll').style.display       = 'none';
  document.getElementById('btn-deploy-complete').style.display  = '';
  document.getElementById('btn-deploy-complete').disabled       = true;
  document.getElementById('btn-draw').style.display             = 'none';
  document.getElementById('btn-endturn').style.display          = 'none';
  document.getElementById('btn-check-vp').style.display         = 'none';
  renderDeploymentPanel();
  setHudState('フランス軍配置フェーズ — ユニットを選択してください');
}

function startBattlePhase() {
  gamePhase = 'battle';
  deployingUnitId = null;
  deployZoneHexes.clear();
  document.getElementById('rainy-start-section').style.display  = 'none';
  document.getElementById('deployment-section').style.display   = 'none';
  document.getElementById('battle-section').style.display       = '';
  document.getElementById('btn-rainy-roll').style.display       = 'none';
  document.getElementById('btn-deploy-complete').style.display  = 'none';
  document.getElementById('btn-draw').style.display             = '';
  document.getElementById('btn-endturn').style.display          = '';
  document.getElementById('btn-check-vp').style.display         = '';
  refreshHighlights();
  drawAllUnits();
  setHudState('待機中');
  cps._log('フランス軍配置完了 — 会戦開始！');
  renderChitUI(cps.getState());
}

function initGamePhase() {
  document.getElementById('rainy-start-section').style.display  = '';
  document.getElementById('deployment-section').style.display   = 'none';
  document.getElementById('battle-section').style.display       = 'none';
  document.getElementById('btn-rainy-roll').style.display       = '';
  document.getElementById('btn-deploy-complete').style.display  = 'none';
  document.getElementById('btn-draw').style.display             = 'none';
  document.getElementById('btn-endturn').style.display          = 'none';
  document.getElementById('btn-check-vp').style.display         = 'none';
  renderRainyStartPanel();
  setHudState('会戦開始判定待ち — 「開始判定ロール」ボタンを押してください');
}

document.getElementById('btn-rainy-roll').addEventListener('click', rollRainyStart);
document.getElementById('btn-deploy-complete').addEventListener('click', startBattlePhase);

// ============================================================
// セーブ・ロード
// ============================================================

const SAVE_KEY = 'vle-save-v1';

function saveGame() {
  const state = {
    version: 1,
    gamePhase,
    prussianDeployed,
    frenchControlHexes: [...frenchControlHexes],
    reverseSlope, thinRedLine, scumOfTheEarth,
    activeCorps,
    pendingActionUnits: [...pendingActionUnits],
    units: units.map(u => ({
      id: u.id, col: u.col, row: u.row,
      sp: u.sp, af: u.af, er: u.er,
      hits: u.hits ?? 0,
      battleworn: !!u.battleworn,
      offMap: !!u.offMap,
      acted: !!u.acted,
    })),
    chitPull: cps.getState(),
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  const btn = document.getElementById('btn-save');
  if (btn) { btn.textContent = '✅ 保存済'; setTimeout(() => { btn.textContent = '💾 セーブ'; }, 1200); }
}

function _applyPhaseUI(phase) {
  const show = id => { const el = document.getElementById(id); if (el) el.style.display = ''; };
  const hide = id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; };
  if (phase === 'battle') {
    hide('rainy-start-section'); hide('deployment-section'); show('battle-section');
    hide('btn-rainy-roll'); hide('btn-deploy-complete');
    show('btn-draw'); show('btn-endturn'); show('btn-check-vp');
  } else if (phase === 'deployment') {
    hide('rainy-start-section'); show('deployment-section'); hide('battle-section');
    hide('btn-rainy-roll'); show('btn-deploy-complete');
    hide('btn-draw'); hide('btn-endturn'); hide('btn-check-vp');
    const dc = document.getElementById('btn-deploy-complete');
    if (dc) dc.disabled = false;
  } else {
    show('rainy-start-section'); hide('deployment-section'); hide('battle-section');
    show('btn-rainy-roll'); hide('btn-deploy-complete');
    hide('btn-draw'); hide('btn-endturn'); hide('btn-check-vp');
  }
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) { alert('セーブデータがありません'); return; }
  let state;
  try { state = JSON.parse(raw); } catch { alert('セーブデータが壊れています'); return; }

  // ユニット状態を復元
  for (const saved of state.units) {
    const unit = units.find(u => u.id === saved.id);
    if (!unit) continue;
    unit.col = saved.col; unit.row = saved.row;
    unit.sp  = saved.sp;  unit.af  = saved.af; unit.er = saved.er;
    unit.hits      = saved.hits;
    unit.battleworn = saved.battleworn;
    unit.offMap    = saved.offMap;
    unit.acted     = saved.acted;
  }

  // グローバル状態を復元
  gamePhase        = state.gamePhase;
  prussianDeployed = state.prussianDeployed;
  frenchControlHexes.clear();
  for (const h of (state.frenchControlHexes || [])) frenchControlHexes.add(h);
  reverseSlope   = !!state.reverseSlope;
  thinRedLine    = !!state.thinRedLine;
  scumOfTheEarth = !!state.scumOfTheEarth;
  activeCorps    = state.activeCorps ?? null;
  pendingActionUnits.clear();
  for (const id of (state.pendingActionUnits || [])) pendingActionUnits.add(id);

  // ChitPullSystem を復元
  cps.loadState(state.chitPull);

  // UI を再描画
  _applyPhaseUI(gamePhase);
  deselect();
  drawAllUnits();
  renderVPControlLayer();
  renderVPPanel();
  renderConditionsPanel();
  renderNapoleonConditions();
  renderChitUI(cps.getState());
  if (gamePhase === 'deployment') renderDeploymentPanel();
  setHudState('ロード完了');
}

document.getElementById('btn-undo-activation').addEventListener('click', () => {
  if (!frenchActivationSnapshot) return;
  if (confirm('このアクティベーションをやり直しますか？\n全ユニットの移動・攻撃が開始前の状態に戻ります。')) {
    restoreFrenchActivationSnapshot();
  }
});

document.getElementById('btn-save').addEventListener('click', saveGame);
document.getElementById('btn-load').addEventListener('click', () => {
  if (confirm('セーブデータをロードします。現在の状態は失われます。よろしいですか？')) loadGame();
});

// ---- 初期描画 ----
renderChitUI(cps.getState());
renderVPPanel();
renderConditionsPanel();
renderNapoleonConditions();
renderOffMapPanel();
initGamePhase();
