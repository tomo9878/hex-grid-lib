// ============================================================
// Napoleon（Le Petit Caporal Table）
// ============================================================

function renderNapoleonConditions() {
  const el = document.getElementById('napoleon-conditions');
  if (!el) return;
  const flags = [];
  if (pasDeChargeActive) flags.push({ label: 'Pas de Charge! （MA+1）', color: '#5bb5ff' });
  if (viveBoostUnitId)   flags.push({ label: `Vive L'Emp! → ${viveBoostUnitId}`, color: '#ffd700' });
  el.innerHTML = '';
  if (flags.length === 0) {
    el.innerHTML = '<div style="color:#555;font-size:11px;padding:2px 0">— なし —</div>';
  } else {
    for (const f of flags) {
      const div = document.createElement('div');
      div.style.cssText = `color:${f.color};font-size:11px;padding:2px 0;font-weight:bold`;
      div.textContent = `⚔ ${f.label}`;
      el.appendChild(div);
    }
  }
}

function enterNapoleonInteractiveMode(key) {
  napoleonMode = key;
  napoleonTargetAddrs.clear();

  const banner = document.getElementById('napoleon-mode-banner');
  const actEl  = document.getElementById('hud-actions');

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-neutral';
  cancelBtn.textContent = 'キャンセル（ESC）';
  cancelBtn.style.marginTop = '4px';
  cancelBtn.addEventListener('click', cancelNapoleonMode);

  if (actEl) { actEl.innerHTML = ''; actEl.appendChild(cancelBtn); }

  switch (key) {
    case 'sun-austerlitz':
      banner.textContent = '☀️ Sun of Austerlitz: Rally中心hexをクリック（ESCでキャンセル）';
      banner.classList.add('active');
      for (const [addr] of hexEls) {
        const hasFr = getUnitsAt(addr).some(u => u.army === 'french') ||
                      neighborAddrs(addr).some(n => getUnitsAt(n).some(u => u.army === 'french'));
        if (hasFr) napoleonTargetAddrs.add(addr);
      }
      setHudState('☀️ Sun of Austerlitz: Rally中心hexをクリック');
      break;

    case 'vive-lempereur':
      banner.textContent = "👑 Vive L'Empereur: ER+2を受けるユニットをクリック（ESCでキャンセル）";
      banner.classList.add('active');
      for (const u of units) napoleonTargetAddrs.add(hexAddr(u.col, u.row));
      setHudState("👑 Vive L'Empereur: ER+2を受けるユニットをクリック");
      break;

    case 'grand-battery':
      banner.textContent = '💥 Grand Battery: Heavy Artilleryのhexをクリック（ESCでキャンセル）';
      banner.classList.add('active');
      for (const u of units.filter(u2 => u2.army === 'french' && u2.isHeavyArtillery)) {
        napoleonTargetAddrs.add(hexAddr(u.col, u.row));
      }
      if (napoleonTargetAddrs.size === 0) {
        addCombatLog('[Napoleon] Grand Battery: Heavy Artilleryユニットがありません');
        cancelNapoleonMode();
        return;
      }
      setHudState('💥 Grand Battery: Heavy Artilleryのhexをクリック');
      break;
  }
  refreshHighlights();
}

function cancelNapoleonMode() {
  napoleonMode    = null;
  napoleonModeIdx = -1;
  napoleonTargetAddrs.clear();
  document.getElementById('napoleon-mode-banner').classList.remove('active');
  refreshHighlights();
  setHudState('待機中');
  const actEl = document.getElementById('hud-actions');
  if (actEl) actEl.innerHTML = '';
}

function handleNapoleonModeClick(h) {
  if (!napoleonMode) return;

  switch (napoleonMode) {
    case 'sun-austerlitz': {
      cancelNapoleonMode();
      executeSunAusterlitz(h.addr);
      break;
    }
    case 'vive-lempereur': {
      const target = getUnitsAt(h.addr)[0];
      if (!target) { addCombatLog('[Napoleon] Vive: ユニットが見つかりません'); return; }
      cancelNapoleonMode();
      executeViveLempereur(target);
      break;
    }
    case 'grand-battery': {
      const haUnits = getUnitsAt(h.addr).filter(u => u.army === 'french' && u.isHeavyArtillery);
      if (haUnits.length === 0) { addCombatLog('[Napoleon] Grand Battery: HA unitがありません'); return; }
      cancelNapoleonMode();
      executeGrandBattery(haUnits);
      break;
    }
  }
}

// ---- アクション: Pas de Charge! ----
function executeNapoleonPasDeCharge() {
  pasDeChargeActive = true;
  addCombatLog('[Napoleon] Pas de Charge! フランスユニット MA+1（次のアクション中有効）');
  const banner = document.getElementById('napoleon-mode-banner');
  banner.textContent = '⚔️ Pas de Charge! アクティブ — MA+1 & 追加アクション可';
  banner.classList.add('active');

  const actEl = document.getElementById('hud-actions');
  if (actEl) {
    actEl.innerHTML = '';
    const endBtn = document.createElement('button');
    endBtn.className = 'btn btn-primary';
    endBtn.textContent = 'Pas de Charge 終了';
    endBtn.style.marginTop = '4px';
    endBtn.addEventListener('click', endPasDeCharge);
    actEl.appendChild(endBtn);
  }
  renderNapoleonConditions();
  setHudState('⚔️ Pas de Charge! アクティブ（MA+1、追加アクション可）');
}

function endPasDeCharge() {
  pasDeChargeActive = false;
  document.getElementById('napoleon-mode-banner').classList.remove('active');
  const actEl = document.getElementById('hud-actions');
  if (actEl) actEl.innerHTML = '';
  renderNapoleonConditions();
  setHudState('待機中');
  addCombatLog('[Napoleon] Pas de Charge 終了');
}

// ---- アクション: Sun of Austerlitz! ----
function executeSunAusterlitz(centerAddr) {
  const candidates = [centerAddr, ...neighborAddrs(centerAddr)]
    .flatMap(a => getUnitsAt(a).filter(u => u.army === 'french'))
    .filter(u => !isEnemyAdjacentTo(hexAddr(u.col, u.row), 'french'));

  const seen = new Set();
  const unique = candidates.filter(u => { if (seen.has(u.id)) return false; seen.add(u.id); return true; });
  const targets = unique.slice(0, 3);

  if (targets.length === 0) {
    addCombatLog('[Napoleon] Sun of Austerlitz: 対象ユニットなし（敵隣接のため除外）');
    return;
  }
  for (const u of targets) {
    u.hits = 0;
    addCombatLog(`[Napoleon] Sun of Austerlitz: ${u.id} Special Rally（hits→0）`);
  }
  drawAllUnits();
}

// ---- アクション: Vive L'Empereur! ----
function executeViveLempereur(target) {
  viveBoostUnitId = target.id;
  addCombatLog(`[Napoleon] Vive L'Empereur! ${target.id} の次のElan/Panic Test ER+2`);
  drawAllUnits();
  renderNapoleonConditions();
}

// ---- アクション: Beautiful Daughters Grand Battery! ----
function executeGrandBattery(haUnits) {
  if (haUnits.length === 0) { addCombatLog('[Napoleon] Grand Battery: HAユニットなし'); return; }
  const actions = haUnits.map(u => done => {
    const targets = getValidBombardmentTargets(u);
    if (targets.length === 0) {
      addCombatLog(`[Napoleon] Grand Battery: ${u.id} 有効ターゲットなし`);
      done();
      return;
    }
    const attackerAddr = hexAddr(u.col, u.row);
    const target = getEnemyTargetPriority(targets, attackerAddr)[0];
    setAIHighlights(attackerAddr, hexAddr(target.col, target.row));
    resolveBombardment(u, target, {
      onComplete: () => {
        clearAIHighlights();
        drawAllUnits();
        done();
      },
    });
  });
  addCombatLog(`[Napoleon] Grand Battery: ${haUnits.map(u => u.id).join('、')} が砲撃`);
  executeActionsSequentially(actions, () => {
    addCombatLog('[Napoleon] Grand Battery 完了');
  });
}

// ---- アクション: The Bearskins! ----
function executeNapoleonBearskins() {
  const ogUnits = units.filter(u => u.isOG && !u.battleworn && u.army === 'french');
  if (ogUnits.length === 0) {
    addCombatLog('[Napoleon] Bearskins: OG（非Battleworn）ユニットなし');
    return;
  }

  const actions = [];
  const tested = new Set();

  for (const og of ogUnits) {
    const ogAddr = hexAddr(og.col, og.row);
    const adjEnemies = neighborAddrs(ogAddr)
      .flatMap(n => getUnitsAt(n).filter(e =>
        e.army !== 'french' && !e.isDetachment && !tested.has(e.id)));
    for (const enemy of adjEnemies) {
      tested.add(enemy.id);
      const e = enemy;
      actions.push(done => {
        const result = performElanTest(e);
        const rollStr = result.reroll !== null ? `${result.roll}→再:${result.reroll}` : `${result.roll}`;
        const outcome = result.success ? '成功（後退なし）' : '失敗（1hex後退）';
        addCombatLog(`[Napoleon Bearskins] ${e.id} Elan ER=${result.er} ⚄${rollStr} → ${outcome}`);
        if (!result.success) {
          const msgs = doRetreat(e, 1);
          msgs.forEach(m => addCombatLog(`[Bearskins] ${m}`));
          drawAllUnits();
        }
        done();
      });
    }
  }

  if (actions.length === 0) {
    addCombatLog('[Napoleon] Bearskins: OG隣接の敵ユニットなし');
    return;
  }
  addCombatLog(`[Napoleon] Bearskins: ${actions.length}ユニットがElan Test`);
  executeActionsSequentially(actions, () => {
    drawAllUnits();
    addCombatLog('[Napoleon] Bearskins 完了');
  });
}

// ---- Napoleon アクション ディスパッチャー ----
function executeNapoleonAction(idx, key) {
  const r = cps.useNapoleon(idx, key);
  if (!r.ok) { alert(r.error); return; }
  renderChitUI(cps.getState());

  switch (key) {
    case 'pas-de-charge':
      executeNapoleonPasDeCharge();
      break;
    case 'bearskins':
      executeNapoleonBearskins();
      break;
    case 'sun-austerlitz':
    case 'vive-lempereur':
    case 'grand-battery':
      napoleonModeIdx = idx;
      enterNapoleonInteractiveMode(key);
      break;
    default:
      addCombatLog(`[Napoleon] 不明なキー: ${key}`);
  }
}

// ============================================================
// Wellington（Old Nosey Table）
// ============================================================

function resolveWellington(marker, onDone) {
  setHudState('[Wellington] Old Nosey Table 処理中...');

  const rallyTargets = units.filter(u => u.army === 'allied' && !u.isDetachment && (u.hits ?? 0) > 0);
  if (rallyTargets.length > 0) {
    const target = rallyTargets.sort((a, b) => {
      if ((b.hits || 0) !== (a.hits || 0)) return (b.hits || 0) - (a.hits || 0);
      return getEffectiveER(b) - getEffectiveER(a);
    })[0];
    addCombatLog(`[Wellington] Step1 Rally: ${target.id}（hits=${target.hits}）`);
    doRally(target);
  } else {
    addCombatLog('[Wellington] Step1 Rally: Hit持ちユニットなし');
  }

  const preamble = rallyTargets.length > 0
    ? `① ${rallyTargets.sort((a,b)=>(b.hits||0)-(a.hits||0))[0]?.id} を Rally 済み\n② 以下のテーブルをロール：`
    : '① Rally対象なし\n② 以下のテーブルをロール：';
  openRollModal(marker, WELLINGTON_TABLE, onDone, preamble,
    (key, done) => executeWellingtonResult(key, done));
}

function executeWellingtonResult(key, onDone) {
  switch (key) {
    case 'reverse-slope':
      reverseSlope = true;
      addCombatLog('[Wellington] Reverse Slope Deployment: このターン、Ridge連合軍へのBombardment TN=5');
      renderConditionsPanel();
      onDone();
      break;

    case 'thin-red-line':
      thinRedLine = true;
      addCombatLog('[Wellington] The Thin Red Line: British Infantry SP/ER+1（このターン）');
      renderConditionsPanel();
      drawAllUnits();
      onDone();
      break;

    case 'maitland': {
      const eligible = units.filter(u =>
        u.army === 'allied' && !u.isDetachment && isBritish(u) &&
        (u.type === 'infantry' || u.type === 'HC' || u.type === 'LC') &&
        neighborAddrs(hexAddr(u.col, u.row)).some(n =>
          getUnitsAt(n).some(f => f.army === 'french'))
      );
      if (eligible.length === 0) {
        addCombatLog('[Wellington] Now Maitland: 対象ユニットなし（隣接フランスなし）');
        onDone();
        return;
      }
      addCombatLog(`[Wellington] Now Maitland: ${eligible.length}ユニットが攻撃（Close to Contact成功で+2ダイス）`);
      const actions = eligible.map(unit => done => {
        const frAddr = hexAddr(unit.col, unit.row);
        const frTargets = neighborAddrs(frAddr).flatMap(n => getUnitsAt(n).filter(f => f.army === 'french'));
        if (frTargets.length === 0) { done(); return; }
        const target = frTargets[0];
        aiResolveCloseCombat(unit, target, done, 2);
      });
      executeActionsSequentially(actions, onDone);
      break;
    }

    case 'scum':
      scumOfTheEarth = true;
      addCombatLog('[Wellington] Scum of the Earth: British Infantry ER-1（このターン）');
      renderConditionsPanel();
      drawAllUnits();
      onDone();
      break;

    case 'bad-day':
      resolveBadDayForNapoleon();
      onDone();
      break;

    default:
      addCombatLog(`[Wellington] 不明なキー: ${key}`);
      onDone();
  }
}

// ============================================================
// Blücher（Alte Vorwarts Table）
// ============================================================

function resolveBlucher(marker, onDone) {
  setHudState('[Blücher] Alte Vorwarts Table 処理中...');

  const deployed = cps.advanceTRTMarkers();
  renderChitUI(cps.getState());

  const deployActions = deployed.map(m => done => {
    addCombatLog(`[Blücher] ${m.label}（${m.sub}）展開！`);
    deployPrussianCorps(m, done);
  });

  executeActionsSequentially(deployActions, () => {
    _resolveBlucherStep2(marker, onDone);
  });
}

function _resolveBlucherStep2(marker, onDone) {
  const prussianHit = units.filter(u => u.army === 'prussian' && !u.offMap && (u.hits ?? 0) > 0);
  if (prussianHit.length > 0) {
    const target = prussianHit.sort((a, b) => {
      if ((b.hits || 0) !== (a.hits || 0)) return (b.hits || 0) - (a.hits || 0);
      return getEffectiveER(b) - getEffectiveER(a);
    })[0];
    addCombatLog(`[Blücher] Step2 Rally: ${target.id}（hits=${target.hits}）`);
    doRally(target);
  } else {
    addCombatLog('[Blücher] Step2 Rally: Hit持ちプロイセンユニットなし');
  }

  const trtState = cps.getState().trtMarkers;
  const trtInfo  = trtState.length > 0
    ? trtState.map(m => `${m.label}→T${m.trtTurn}`).join('、')
    : '全コープス展開済み';
  const preamble = `① TRT前進完了（${trtInfo}）\n② Rally済み\n③ 以下のテーブルをロール：`;
  openRollModal(marker, BLUCHER_TABLE, onDone, preamble,
    (key, done) => executeBlucherResult(key, done));
}

function executeBlucherResult(key, onDone) {
  const prussianUnits = units.filter(u => u.army === 'prussian' && !u.offMap);

  switch (key) {
    case 'revenge': {
      const actions = prussianUnits.map(unit => done => {
        const unitAddr = hexAddr(unit.col, unit.row);
        const french = getFrenchUnits();
        if (french.length === 0) { done(); return; }

        if (unit.type === 'infantry') {
          const adjFrench = neighborAddrs(unitAddr).flatMap(n =>
            getUnitsAt(n).filter(f => f.army === 'french'));
          if (adjFrench.length > 0) {
            addCombatLog(`[Blücher Revenge] ${unit.id} → 近接攻撃（+1ER CtC）`);
            aiResolveCloseCombat(unit, adjFrench[0], done);
          } else {
            const targets = getValidBombardmentTargets(unit);
            if (targets.length > 0) {
              aiResolveBombardmentStep(unit, targets[0], done);
            } else {
              const nearest = getEnemyTargetPriority(french, unitAddr)[0];
              const moved = moveTowardTarget(unit, hexAddr(nearest.col, nearest.row), 0);
              addCombatLog(`[Blücher Revenge] ${unit.id} 接近 → ${moved || '移動不可'}`);
              drawAllUnits();
              done();
            }
          }
        } else if (unit.type === 'HC' || unit.type === 'LC') {
          const nearest = getEnemyTargetPriority(french, unitAddr)[0];
          const dist    = hexDistance(unitAddr, hexAddr(nearest.col, nearest.row));
          if (dist <= 2 && isCavalryChargeEligible(unit, nearest)) {
            addCombatLog(`[Blücher Revenge] ${unit.id} → 突撃（+1ER CtC）`);
            aiResolveCloseCombat(unit, nearest, done);
          } else {
            const targets = getValidBombardmentTargets(unit);
            if (targets.length > 0) {
              aiResolveBombardmentStep(unit, targets[0], done);
            } else {
              const moved = moveTowardTarget(unit, hexAddr(nearest.col, nearest.row), 0);
              addCombatLog(`[Blücher Revenge] ${unit.id} 接近 → ${moved || '移動不可'}`);
              drawAllUnits();
              done();
            }
          }
        } else {
          const targets = getValidBombardmentTargets(unit);
          if (targets.length > 0) {
            aiResolveBombardmentStep(unit, targets[0], done);
          } else {
            const nearest = getEnemyTargetPriority(french, unitAddr)[0];
            const moved = moveTowardTarget(unit, hexAddr(nearest.col, nearest.row), 0);
            addCombatLog(`[Blücher Revenge] ${unit.id} 接近 → ${moved || '移動不可'}`);
            drawAllUnits();
            done();
          }
        }
      });
      if (actions.length === 0) { addCombatLog('[Blücher] Revenge: プロイセンユニットなし'); onDone(); return; }
      executeActionsSequentially(actions, onDone);
      break;
    }

    case 'forward': {
      const actions = prussianUnits.map(unit => done => {
        const unitAddr = hexAddr(unit.col, unit.row);
        const french = getFrenchUnits();
        if (french.length === 0) { done(); return; }
        const nearest = getEnemyTargetPriority(french, unitAddr)[0];
        const tAddr   = hexAddr(nearest.col, nearest.row);
        const dist    = hexDistance(unitAddr, tAddr);
        if (dist === 1) {
          const targets = getValidBombardmentTargets(unit);
          if (targets.length > 0) aiResolveBombardmentStep(unit, targets[0], done);
          else { addCombatLog(`[Blücher Forward] ${unit.id}: 砲撃不可・待機`); done(); }
        } else {
          const moved = moveTowardTarget(unit, tAddr, 0);
          addCombatLog(`[Blücher Forward] ${unit.id} 接近 → ${moved || '移動不可'}`);
          if (moved) setAIHighlights(unitAddr, moved);
          drawAllUnits();
          setTimeout(() => { clearAIHighlights(); done(); }, 300);
        }
      });
      const trtResults = cps.rollTRTForward();
      for (const r of trtResults) {
        const delta = r.d === 1 ? '遅延' : (r.d <= 3 ? '変化なし' : '前進');
        addCombatLog(`[Blücher Forward] TRT ${r.label}: ⚄${r.d} → ${delta}（T${r.trtTurn}）`);
      }
      renderChitUI(cps.getState());
      if (actions.length === 0) { onDone(); return; }
      executeActionsSequentially(actions, onDone);
      break;
    }

    case 'ligny': {
      const lignyFrench = units.filter(u =>
        u.army === 'french' && !u.battleworn &&
        (u.id.endsWith('_I') || u.id.endsWith('_II'))
      );
      const actions = [];
      for (const french of lignyFrench) {
        const fAddr = hexAddr(french.col, french.row);
        const adjPrussian = neighborAddrs(fAddr).flatMap(n =>
          getUnitsAt(n).filter(p => p.army === 'prussian'));
        if (adjPrussian.length === 0) continue;
        actions.push(done => {
          const result = performElanTest(french);
          const outcome = result.success ? '成功（後退なし）' : '失敗（1hex後退）';
          addCombatLog(`[Blücher Ligny] ${french.id} Elan Test: ⚄${result.roll} / ER${result.er} → ${outcome}`);
          if (!result.success) {
            const msgs = doRetreat(french, 1);
            msgs.forEach(m => addCombatLog(`[Blücher Ligny] ${m}`));
            drawAllUnits();
          }
          done();
        });
      }
      if (actions.length === 0) { addCombatLog('[Blücher] Ligny: 対象ユニットなし'); onDone(); return; }
      executeActionsSequentially(actions, onDone);
      break;
    }

    case 'bad-day':
      resolveBadDayForNapoleon();
      onDone();
      break;

    default:
      addCombatLog(`[Blücher] 不明なキー: ${key}`);
      onDone();
  }
}

// ============================================================
// Detachment Activation
// ============================================================

const DETACHMENT_HEXES = {
  hougoumont_det:   '0409',
  lahayesainte_det: '1007',
  papelotte_det:    '1607',
};

function resolveDetachmentActivation(onDone) {
  setHudState('[Detachment] Activation処理中...');
  addCombatLog('── Detachment Activation ──');

  const detIds = ['hougoumont_det', 'lahayesainte_det', 'papelotte_det'];

  const actions = detIds.map(detId => done => {
    const det = units.find(u => u.id === detId);
    if (!det) { done(); return; }

    const detAddr = DETACHMENT_HEXES[detId];
    const adjFrench = neighborAddrs(detAddr)
      .flatMap(n => getUnitsAt(n).filter(u => u.army === 'french'));

    if (detId === 'papelotte_det') {
      if (adjFrench.length === 0) {
        addCombatLog(`[Papelotte] 隣接フランスなし → Rally`);
        setAIHighlights(detAddr, detAddr);
        doRally(det);
        drawAllUnits();
        setTimeout(() => { clearAIHighlights(); done(); }, 400);
      } else {
        addCombatLog(`[Papelotte] 隣接フランスあり（${adjFrench.map(u=>u.id).join('/')}）→ 待機`);
        done();
      }
    } else {
      const label = detId === 'hougoumont_det' ? 'Hougoumont' : 'La Haye Sainte';
      if (adjFrench.length === 0) {
        addCombatLog(`[${label}] 隣接フランスなし → Rally`);
        setAIHighlights(detAddr, detAddr);
        doRally(det);
        drawAllUnits();
        setTimeout(() => { clearAIHighlights(); done(); }, 400);
      } else {
        const target = [...adjFrench].sort(
          (a, b) => getEffectiveSP(b) - getEffectiveSP(a)
        )[0];
        const tAddr = hexAddr(target.col, target.row);
        addCombatLog(`[${label}] 最大SP隣接フランス: ${target.id}（実効SP=${getEffectiveSP(target)}）→ Elan Test`);
        setAIHighlights(detAddr, tAddr);
        const { roll, reroll, success, er, testER } = performElanTest(target);
        const rollStr = reroll !== null ? `${roll}→再ロール:${reroll}` : `${roll}`;
        addCombatLog(
          `[${target.id}] Elan Test ER=${testER} ダイス:${rollStr} → ` +
          (success ? '成功（ダメージなし）' : '失敗 → 1 Hit！')
        );
        if (!success) applyHit(target);
        drawAllUnits();
        setTimeout(() => { clearAIHighlights(); done(); }, 600);
      }
    }
  });

  executeActionsSequentially(actions, () => {
    addCombatLog('── Detachment Activation 完了 ──');
    setHudState('[Detachment] 完了');
    onDone();
  });
}

// ============================================================
// プロイセン到着システム
// ============================================================

function getOffMapUnits(corpId) {
  return units.filter(u => u.army === 'prussian' && u.corps === corpId && u.offMap);
}

function deploymentOrder(unit) {
  if (unit.type === 'HC' || unit.type === 'LC') return 0;
  if (unit.type === 'infantry') return 1;
  return 2;
}

function delayedEntryHex(corpId) {
  const { entryAddr } = PRUSSIAN_CORPS_CONFIG[corpId];
  const entryCol = parseInt(entryAddr.slice(0, 2), 10);
  const entryRow = parseInt(entryAddr.slice(2), 10);
  for (let d = 1; d < 15; d++) {
    for (const sign of [-1, 1]) {
      const r = entryRow + sign * d;
      if (r < 1 || r > 14) continue;
      const addr = hexAddr(entryCol, r);
      if (getUnitsAt(addr).length === 0) return addr;
    }
  }
  return null;
}

function placePrussianUnit(unit, addr) {
  unit.offMap = false;
  unit.col    = parseInt(addr.slice(0, 2), 10);
  unit.row    = parseInt(addr.slice(2),    10);
  prussianDeployed = true;
}

function deployPrussianCorps(marker, onDone = null) {
  prussianDeployed = true;
  const cfg = PRUSSIAN_CORPS_CONFIG[marker.id];
  if (!cfg) {
    addCombatLog(`[展開] ${marker.label} 設定なし`);
    onDone?.();
    return;
  }
  addCombatLog(`📯 ${cfg.label} arrives at ${cfg.entryAddr}!`);
  setHudState(`[展開] ${cfg.label} 到着`);

  const offMap = getOffMapUnits(marker.id)
    .sort((a, b) => deploymentOrder(a) - deploymentOrder(b));
  if (offMap.length === 0) {
    drawAllUnits(); renderOffMapPanel();
    onDone?.();
    return;
  }

  const actions = offMap.map(u => done => {
    let landAddr = cfg.entryAddr;
    if (!canLandAt(landAddr, u)) {
      const alt = delayedEntryHex(marker.id);
      if (alt) {
        landAddr = alt;
        addCombatLog(`[展開] ${u.id}: entry hex 満杯 → delayed entry ${alt}`);
      } else {
        addCombatLog(`[展開] ${u.id}: マップエッジ満杯 → オフマップ待機`);
        done(); return;
      }
    }
    const fromAddr = landAddr;
    placePrussianUnit(u, landAddr);
    const moved = moveTowardTarget(u, cfg.targetAddr);
    const toAddr = hexAddr(u.col, u.row);
    addCombatLog(`[展開] ${u.id}: ${fromAddr} → ${moved ? toAddr : fromAddr}`);
    if (moved) setAIHighlights(fromAddr, moved);
    drawAllUnits();
    renderOffMapPanel();
    setTimeout(() => { clearAIHighlights(); done(); }, 300);
  });

  executeActionsSequentially(actions, () => {
    drawAllUnits();
    renderOffMapPanel();
    renderChitUI(cps.getState());
    onDone?.();
  });
}

function handleOffMapEntry(marker, onDone) {
  const cfg = PRUSSIAN_CORPS_CONFIG[marker.id];
  if (!cfg) { onDone(); return; }

  const offMap = getOffMapUnits(marker.id)
    .sort((a, b) => deploymentOrder(a) - deploymentOrder(b));
  if (offMap.length === 0) { onDone(); return; }

  addCombatLog(`[展開] ${cfg.label} オフマップ投入（${offMap.length}ユニット）`);
  const actions = offMap.map(u => done => {
    const hasFrench = getUnitsAt(cfg.entryAddr).some(v => v.army === 'french');
    let landAddr = cfg.entryAddr;
    if (hasFrench || !canLandAt(cfg.entryAddr, u)) {
      const alt = delayedEntryHex(marker.id);
      if (alt) {
        landAddr = alt;
        addCombatLog(`[展開] ${u.id}: Delayed Entry → ${alt}`);
      } else {
        addCombatLog(`[展開] ${u.id}: Delayed Entry → 待機`);
        done(); return;
      }
    }
    const fromAddr = landAddr;
    placePrussianUnit(u, landAddr);
    const moved = moveTowardTarget(u, cfg.targetAddr);
    addCombatLog(`[展開] ${u.id}: ${fromAddr} → ${moved ? hexAddr(u.col, u.row) : fromAddr}`);
    drawAllUnits();
    renderOffMapPanel();
    done();
  });

  executeActionsSequentially(actions, onDone);
}

function renderOffMapPanel() {
  const el = document.getElementById('off-map-panel');
  if (!el) return;
  const waiting = units.filter(u => u.offMap && u.army === 'prussian');
  if (waiting.length === 0) {
    el.innerHTML = '<div style="color:#555;font-size:11px">— 全ユニット展開済み —</div>';
    return;
  }
  el.innerHTML = '';
  const byCorps = {};
  for (const u of waiting) {
    if (!byCorps[u.corps]) byCorps[u.corps] = [];
    byCorps[u.corps].push(u);
  }
  for (const [corpId, list] of Object.entries(byCorps)) {
    const cfg = PRUSSIAN_CORPS_CONFIG[corpId];
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom:4px';
    const title = document.createElement('div');
    title.style.cssText = 'color:#aaa;font-size:11px;font-weight:bold';
    title.textContent = cfg ? cfg.label : corpId;
    wrap.appendChild(title);
    for (const u of list) {
      const row = document.createElement('div');
      row.style.cssText = 'color:#bbb;font-size:10px;padding-left:8px';
      row.textContent = `${u.id}  ${u.type}  SP:${u.sp} AF:${u.af} ER:${u.er}`;
      wrap.appendChild(row);
    }
    el.appendChild(wrap);
  }
}

function renderConditionsPanel() {
  const el = document.getElementById('allied-conditions');
  if (!el) return;
  const flags = [];
  if (reverseSlope)    flags.push({ label: 'Reverse Slope', color: '#4af' });
  if (thinRedLine)     flags.push({ label: 'Thin Red Line', color: '#f84' });
  if (scumOfTheEarth)  flags.push({ label: 'Scum of the Earth', color: '#a66' });
  el.innerHTML = '';
  if (flags.length === 0) {
    el.innerHTML = '<div style="color:#555;font-size:11px;padding:2px 0">— なし —</div>';
  } else {
    for (const f of flags) {
      const div = document.createElement('div');
      div.style.cssText = `color:${f.color};font-size:11px;padding:2px 0;font-weight:bold`;
      div.textContent = `✦ ${f.label}`;
      el.appendChild(div);
    }
  }
}
