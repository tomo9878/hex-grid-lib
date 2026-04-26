// ============================================================
// 敵AI判定 — Anglo-Allied / Prussian Corps Activation
// ============================================================

const BRUSSELS_VP_ADDRS = new Set(['0301','0401','0701','0901','1401']);

const VP_HEXES = [
  { addr:'0409', vp: 6, type:'WB'   },  // Hougoumont
  { addr:'0204', vp: 5, type:'ALOC' },  // Merbe-Braine
  { addr:'0802', vp: 5, type:'ALOC' },  // Mont St. Jean
  { addr:'1007', vp: 4, type:'WB'   },  // La Haye Sainte
  { addr:'0903', vp: 3, type:'ALOC' },  // Mont St. Jean Farm
  { addr:'0104', vp: 3, type:'ALOC' },  // Road to Hal
  { addr:'0301', vp: 3, type:'ALOC' },  // Road to Brussels
  { addr:'0401', vp: 3, type:'ALOC' },
  { addr:'0701', vp: 3, type:'ALOC' },
  { addr:'0901', vp: 3, type:'ALOC' },
  { addr:'1401', vp: 3, type:'ALOC' },
  { addr:'1607', vp: 2, type:'WB'   },  // Papelotte
  { addr:'1412', vp: 1, type:'B'    },  // Plancenoit
  { addr:'1413', vp: 1, type:'B'    },
  { addr:'1512', vp: 1, type:'B'    },
  { addr:'1110', vp:-4, type:'FLOC' },  // La Belle Alliance
  { addr:'1015', vp:-6, type:'FLOC' },  // Rossomme
];
const ALL_VP_ADDRS = new Set(VP_HEXES.map(h => h.addr));

const HEX_LABEL = {
  '0409': 'Hougoumont', '0204': 'Merbe-Braine', '0802': 'Mont St. Jean',
  '1007': 'La Haye Sainte', '0903': 'MSJ Farm', '0104': 'Road to Hal',
  '0301': 'Brussels Rd', '0401': 'Brussels Rd', '0701': 'Brussels Rd',
  '0901': 'Brussels Rd', '1401': 'Brussels Rd', '1607': 'Papelotte',
  '1412': 'Plancenoit', '1413': 'Plancenoit', '1512': 'Plancenoit',
  '1110': 'La Belle Alliance', '1015': 'Rossomme',
};

const VICTORY_LEVELS = [
  { min: 28, label: 'War-Winning Victory' },
  { min: 24, label: 'Decisive Victory' },
  { min: 20, label: 'Major Victory' },
  { min: 16, label: 'Minor Victory' },
  { min: 12, label: 'Standstill' },
  { min:  8, label: 'Minor Defeat' },
  { min:  4, label: 'Major Defeat' },
  { min:  0, label: 'Catastrophe（歴史的結果）' },
];

// フランスコントロールヘックス（French unitが最後に占有したVPヘックス）
const frenchControlHexes = new Set();
// FLOCヘックスはゲーム開始時にフランスコントロール（フランス後方）
VP_HEXES.filter(h => h.type === 'FLOC').forEach(h => frenchControlHexes.add(h.addr));

function setAIHighlights(attackerAddr, targetAddr) {
  aiHighlightAddrs.clear();
  if (attackerAddr) aiHighlightAddrs.set(attackerAddr, 'hex-ai-attacker');
  if (targetAddr)   aiHighlightAddrs.set(targetAddr,   'hex-ai-target');
  refreshHighlights();
}

function clearAIHighlights() {
  aiHighlightAddrs.clear();
  refreshHighlights();
}

function getCorpsUnits(marker) {
  if (marker.type === 'allied') {
    if (marker.id === 'aa-I')   return units.filter(u => u.army === 'allied' && u.id.endsWith('_I') && !u.isDetachment);
    if (marker.id === 'aa-II')  return units.filter(u => u.army === 'allied' && u.id.endsWith('_II'));
    if (marker.id === 'aa-RC')  return units.filter(u => u.army === 'allied' && u.id.endsWith('_RC'));
    if (marker.id === 'aa-CC')  return units.filter(u => u.army === 'allied' && u.id.endsWith('_CC'));
    if (marker.id === 'aa-det') return units.filter(u => u.isDetachment);
  }
  if (marker.type === 'prussian') {
    return units.filter(u => u.army === 'prussian' && u.corps === marker.id && !u.offMap);
  }
  return [];
}

function getFrenchUnits() {
  return units.filter(u => u.army === 'french');
}

function getEnemyTargetPriority(candidates, refAddr = null) {
  return [...candidates].sort((a, b) => {
    if (refAddr !== null) {
      const da = hexDistance(hexAddr(a.col, a.row), refAddr);
      const db = hexDistance(hexAddr(b.col, b.row), refAddr);
      if (da !== db) return da - db;
    }
    const spDiff = getEffectiveSP(b) - getEffectiveSP(a);
    if (spDiff !== 0) return spDiff;
    const erDiff = getEffectiveER(a) - getEffectiveER(b);
    if (erDiff !== 0) return erDiff;
    return (b.hits || 0) - (a.hits || 0);
  });
}

function selectAIBombardTarget(attacker, validTargets, primarySort = 'nearest') {
  if (validTargets.length === 0) return null;
  const attackerAddr = hexAddr(attacker.col, attacker.row);

  const vpPriority = validTargets.filter(t => {
    const ta = hexAddr(t.col, t.row);
    return BRUSSELS_VP_ADDRS.has(ta) || neighborAddrs(ta).some(n => BRUSSELS_VP_ADDRS.has(n));
  });

  const pool = vpPriority.length > 0 ? vpPriority : validTargets;
  const refAddr = primarySort === 'nearest' ? attackerAddr : null;
  return getEnemyTargetPriority(pool, refAddr)[0] || null;
}

function aiResolveBombardmentStep(attacker, target, onDone) {
  setAIHighlights(hexAddr(attacker.col, attacker.row), hexAddr(target.col, target.row));

  const targetAddr = hexAddr(target.col, target.row);
  const numDice = calcBombardmentDice(attacker, targetAddr);
  const tn = calcBombardmentTargetNumber(targetAddr, target);
  const isDetachWB = !!(target.isDetachment && getTerrainTypes(targetAddr).includes('walled_buildings'));
  const rolls = Array.from({ length: numDice }, rollD6);

  let successes = 0, partials = 0;
  if (isDetachWB) {
    successes = Math.floor(rolls.filter(r => r === 6).length / 2);
  } else {
    for (const r of rolls) {
      if      (r > tn)  successes++;
      else if (r === tn) partials++;
    }
    successes += Math.floor(partials / 2);
    partials   = partials % 2;
  }
  const hit = successes >= 1;

  const attackerAddr = hexAddr(attacker.col, attacker.row);
  const bonuses = ['[AI自動]'];
  if (isRidge(attackerAddr) && !isRidge(targetAddr)) bonuses.push('Plunging Fire +1');
  if (hexDistance(attackerAddr, targetAddr) === 1)   bonuses.push('Canister +1');
  if (isDetachWB) bonuses.push('Detachment in WB (6×2必要)');

  showBombardModal({
    attackerUnit: attacker, targetUnit: target, targetAddr,
    numDice, tn, rolls, successes, partials, hit, isDetachWB, bonuses,
    onResolve: () => {
      addCombatLog(`[AI] 砲撃: ${attacker.id}→${target.id} [${rolls.join(',')}] TN${tn} → ${hit ? '1 Hit!' : 'No Hit'}`);
      if (hit) applyHit(target);
      clearAIHighlights();
      drawAllUnits();
      onDone();
    },
  });
}

function executeActionsSequentially(actions, onComplete) {
  function next(i) {
    if (i >= actions.length) { onComplete(); return; }
    actions[i](() => next(i + 1));
  }
  next(0);
}

// ---- 11-23: Open Fire at Nearest Target ----

function resolveOpenFireNearest(corpUnits, onDone) {
  const actions = [];
  for (const unit of corpUnits) {
    const targets = getValidBombardmentTargets(unit);
    if (targets.length === 0) continue;
    const target = selectAIBombardTarget(unit, targets, 'nearest');
    if (!target) continue;
    const u = unit, t = target;
    actions.push(done => aiResolveBombardmentStep(u, t, done));
  }
  if (actions.length === 0) {
    addCombatLog('[AI] Open Fire at Nearest: 有効ターゲットなし');
    onDone();
    return;
  }
  executeActionsSequentially(actions, onDone);
}

// ---- 24-33: Open Fire at Largest Target ----

function resolveOpenFireLargest(corpUnits, onDone) {
  const actions = [];
  for (const unit of corpUnits) {
    const targets = getValidBombardmentTargets(unit);
    if (targets.length === 0) continue;
    const target = selectAIBombardTarget(unit, targets, 'largest');
    if (!target) continue;
    const u = unit, t = target;
    actions.push(done => aiResolveBombardmentStep(u, t, done));
  }
  if (actions.length === 0) {
    addCombatLog('[AI] Open Fire at Largest: 有効ターゲットなし');
    onDone();
    return;
  }
  executeActionsSequentially(actions, onDone);
}

// ---- 43-53: Rally Around the Colors ----

function resolveRallyAroundColors(corpUnits, onDone) {
  const bombardActions = [];

  for (const unit of corpUnits) {
    const unitAddr = hexAddr(unit.col, unit.row);

    if ((unit.hits || 0) > 0) {
      if (isEnemyAdjacentTo(unitAddr, unit.army)) {
        const msgs = doRetreat(unit, 1);
        msgs.forEach(m => addCombatLog(`[AI] ${m}`));
      }
      doRally(unit);
    } else {
      const targets = getValidBombardmentTargets(unit);
      if (targets.length === 0) continue;
      const sorted = [...targets].sort((a, b) => {
        const da = Math.min(...[...ALL_VP_ADDRS].map(vp => hexDistance(hexAddr(a.col, a.row), vp)));
        const db = Math.min(...[...ALL_VP_ADDRS].map(vp => hexDistance(hexAddr(b.col, b.row), vp)));
        return da - db;
      });
      const target = sorted[0];
      if (!target) continue;
      const u = unit, t = target;
      bombardActions.push(done => aiResolveBombardmentStep(u, t, done));
    }
  }

  drawAllUnits();

  if (bombardActions.length === 0) {
    onDone();
    return;
  }
  executeActionsSequentially(bombardActions, onDone);
}

// ---- 64-66: A Bad Day for Napoleon ----

function resolveBadDayForNapoleon() {
  const result = cps.removeNapoleonMarker();
  const msg = result.source === 'recovery'
    ? '[AI] A Bad Day for Napoleon: Napoleon recovers! 1枚カップ復活'
    : `[AI] A Bad Day for Napoleon: マーカー除去（${result.source}）`;
  addCombatLog(msg);
  renderChitUI(cps.getState());
}

// ============================================================
// 敵AI Phase 2 — Advance (34-42)
// ============================================================

function computeReachableLocal(unit) {
  const MA = getMA(unit.type);
  const startAddr = hexAddr(unit.col, unit.row);
  const costMap = new Map([[startAddr, 0]]);
  const queue   = [{ addr: startAddr, cost: 0 }];
  const result  = new Map();

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
      if (canLandAt(nAddr, unit)) result.set(nAddr, mustStop);
      if (!mustStop) queue.push({ addr: nAddr, cost: newCost });
    }
  }
  return result;
}

// isDestination=true のとき最終ヘックス優先（Ridge/Forest/Buildings）、falseは中間（Clear優先）
// candidates はすべて「今回の移動先候補」= 最終ヘックスなので isDestination=true 固定
function applyHexPriority(candidates, unit, fromAddr) {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  return [...candidates].sort((a, b) => {
    // 1. 敵に隣接しないヘックス優先
    const aE = !isEnemyAdjacentTo(a, unit.army) ? 1 : 0;
    const bE = !isEnemyAdjacentTo(b, unit.army) ? 1 : 0;
    if (aE !== bE) return bE - aE;
    // 2. 道路ヘックス優先
    const aRd = roadHexes.has(a) ? 1 : 0;
    const bRd = roadHexes.has(b) ? 1 : 0;
    if (aRd !== bRd) return bRd - aRd;
    // 3. Elevation変化なし優先（flat↔ridgeを避ける）
    const aSE = isRidge(a) === isRidge(fromAddr) ? 1 : 0;
    const bSE = isRidge(b) === isRidge(fromAddr) ? 1 : 0;
    if (aSE !== bSE) return bSE - aSE;
    // 4. 最終ヘックス: Ridge/Forest/Buildings優先
    const aGood = (isRidge(a) || isDifficultTerrain(a)) ? 1 : 0;
    const bGood = (isRidge(b) || isDifficultTerrain(b)) ? 1 : 0;
    if (aGood !== bGood) return bGood - aGood;
    // 5. スタック回避
    const aOcc = getUnitsAt(a).filter(u => u.id !== unit.id).length === 0 ? 1 : 0;
    const bOcc = getUnitsAt(b).filter(u => u.id !== unit.id).length === 0 ? 1 : 0;
    if (aOcc !== bOcc) return bOcc - aOcc;
    return 0;
  })[0];
}

function moveTowardTarget(unit, targetAddr, stopAtDist = 0) {
  const reachable = computeReachableLocal(unit);
  if (reachable.size === 0) return null;
  const fromAddr = hexAddr(unit.col, unit.row);
  let candidates = [...reachable.keys()];

  if (stopAtDist > 0) {
    const atDist = candidates.filter(a => hexDistance(a, targetAddr) === stopAtDist);
    if (atDist.length > 0) {
      candidates = atDist;
    } else {
      candidates.sort((a, b) => hexDistance(a, targetAddr) - hexDistance(b, targetAddr));
      const minD = hexDistance(candidates[0], targetAddr);
      candidates = candidates.filter(a => hexDistance(a, targetAddr) === minD);
    }
  } else {
    candidates.sort((a, b) => hexDistance(a, targetAddr) - hexDistance(b, targetAddr));
    const minD = hexDistance(candidates[0], targetAddr);
    candidates = candidates.filter(a => hexDistance(a, targetAddr) === minD);
  }

  const chosen = applyHexPriority(candidates, unit, fromAddr);
  if (!chosen || chosen === fromAddr) return null;

  unit.col = parseInt(chosen.slice(0, 2), 10);
  unit.row = parseInt(chosen.slice(2), 10);
  return chosen;
}

function isCavalryChargeEligible(attacker, target) {
  const aAddr = hexAddr(attacker.col, attacker.row);
  const tAddr = hexAddr(target.col, target.row);
  const dist  = hexDistance(aAddr, tAddr);
  if (dist < 1 || dist > 2) return false;
  if (!calcLOS(aAddr, tAddr))      return false;
  if (isDifficultTerrain(tAddr))   return false;
  if (dist === 1) {
    return !isRiverCrossing(aAddr, tAddr);
  }
  const intermediates = neighborAddrs(aAddr).filter(n =>
    neighborAddrs(n).includes(tAddr) &&
    !isDifficultTerrain(n)           &&
    !isRiverCrossing(aAddr, n)       &&
    !isRiverCrossing(n, tAddr)
  );
  return intermediates.length > 0;
}

function aiResolveCloseCombat(attacker, defender, onDone, bonusDice = 0) {
  setAIHighlights(hexAddr(attacker.col, attacker.row), hexAddr(defender.col, defender.row));
  resolveCloseCombat(attacker, defender, () => {
    clearAIHighlights();
    drawAllUnits();
    onDone();
  }, { bonusDice });
}

// ---- Advance: Artillery ----
function advanceArtillery(unit, onDone) {
  const targets = getValidBombardmentTargets(unit);
  if (targets.length > 0) {
    const unitAddr = hexAddr(unit.col, unit.row);
    const target = getEnemyTargetPriority(targets, unitAddr)[0];
    aiResolveBombardmentStep(unit, target, onDone);
  } else {
    const french = getFrenchUnits().filter(u => !u.offMap);
    if (french.length === 0) { onDone(); return; }
    const unitAddr = hexAddr(unit.col, unit.row);
    const nearestFrench = getEnemyTargetPriority(french, unitAddr)[0];
    const moved = moveTowardTarget(unit, hexAddr(nearestFrench.col, nearestFrench.row));
    addCombatLog(`[AI] ${unit.id} 接近移動 → ${moved || '移動不可'}`);
    drawAllUnits();
    onDone();
  }
}

// ---- Advance: Infantry（variant: 'allied'|'prussian'） ----
function advanceInfantry(unit, variant, onDone) {
  const french = getFrenchUnits().filter(u => !u.offMap);
  if (french.length === 0) { onDone(); return; }
  const unitAddr = hexAddr(unit.col, unit.row);
  const target   = getEnemyTargetPriority(french, unitAddr)[0];
  const tAddr    = hexAddr(target.col, target.row);
  const dist     = hexDistance(unitAddr, tAddr);

  if (dist === 1) {
    // 隣接: Allied→Battlewornなら近接、そうでなければ砲撃 / Prussian→無条件近接
    const shouldAttack = variant === 'prussian' || target.battleworn;
    if (shouldAttack) {
      aiResolveCloseCombat(unit, target, onDone);
    } else {
      const af = getEffectiveAF(unit);
      if (af > 0 && calcLOS(unitAddr, tAddr)) {
        aiResolveBombardmentStep(unit, target, onDone);
      } else {
        addCombatLog(`[AI] ${unit.id}: 隣接・砲撃不可→待機`);
        onDone();
      }
    }
  } else if (dist === 2) {
    // 2ヘックス: 砲撃のみ。できなければ前進せず待機
    const af = getEffectiveAF(unit);
    if (af > 0 && calcLOS(unitAddr, tAddr)) {
      aiResolveBombardmentStep(unit, target, onDone);
    } else {
      addCombatLog(`[AI] ${unit.id}: 2hex・砲撃不可→待機`);
      onDone();
    }
  } else {
    // dist > 2: 最寄りフランスへ移動
    const moved = moveTowardTarget(unit, tAddr);
    addCombatLog(`[AI] ${unit.id} 接近移動 → ${moved || '移動不可'}`);
    if (moved) setAIHighlights(unitAddr, moved);
    drawAllUnits();
    setTimeout(() => { clearAIHighlights(); onDone(); }, 400);
  }
}

// ---- Advance: Cavalry（variant: 'allied'|'prussian'） ----
function advanceCavalry(unit, variant, onDone) {
  const french = getFrenchUnits().filter(u => !u.offMap);
  if (french.length === 0) { onDone(); return; }
  const unitAddr = hexAddr(unit.col, unit.row);
  const target   = getEnemyTargetPriority(french, unitAddr)[0];
  const tAddr    = hexAddr(target.col, target.row);
  const dist     = hexDistance(unitAddr, tAddr);

  if (dist <= 2) {
    const canCharge = isCavalryChargeEligible(unit, target);
    const chargeCondition = variant === 'allied'
      ? canCharge
      : canCharge && target.battleworn;

    if (chargeCondition) {
      aiResolveCloseCombat(unit, target, onDone);
    } else {
      const af = getEffectiveAF(unit);
      if (af > 0 && calcLOS(unitAddr, tAddr)) {
        aiResolveBombardmentStep(unit, target, onDone);
      } else {
        addCombatLog(`[AI] ${unit.id}: 砲撃不可・待機`);
        onDone();
      }
    }
  } else {
    const moved = moveTowardTarget(unit, tAddr, 2);
    addCombatLog(`[AI] ${unit.id} 接近移動(2hex手前) → ${moved || '移動不可'}`);
    if (moved) setAIHighlights(unitAddr, moved);
    drawAllUnits();
    setTimeout(() => { clearAIHighlights(); onDone(); }, 400);
  }
}

// ---- 34-42: Advance ----

function resolveAdvance(corpUnits, marker, onDone) {
  const isAllied = marker.type === 'allied';
  const actions  = [];

  for (const unit of corpUnits) {
    const u = unit;
    if (unit.type === 'artillery') {
      actions.push(done => advanceArtillery(u, done));
    } else if (unit.type === 'infantry') {
      const variant = isAllied ? 'allied' : 'prussian';
      actions.push(done => advanceInfantry(u, variant, done));
    } else {
      const variant = isAllied ? 'allied' : 'prussian';
      actions.push(done => advanceCavalry(u, variant, done));
    }
  }

  if (actions.length === 0) {
    addCombatLog('[AI] Advance: 対象ユニットなし');
    onDone();
    return;
  }
  executeActionsSequentially(actions, onDone);
}

// ============================================================
// 敵AI Phase 3 — Reinforce/Recapture (54-63)
// ============================================================

function isQualifiedVPHex(addr, unitAddr, isAllied) {
  const frenchOn  = frenchControlHexes.has(addr) ||
                    getUnitsAt(addr).some(u => u.army === 'french');
  const frenchAdj = neighborAddrs(addr).some(n =>
    getUnitsAt(n).some(u => u.army === 'french'));
  if (!frenchOn && !frenchAdj) return false;

  const dist = hexDistance(addr, unitAddr);
  if (dist <= 4) return true;
  return isAllied && BRUSSELS_VP_ADDRS.has(addr);
}

function getNearestQualifiedVP(unitAddr, isAllied) {
  const candidates = VP_HEXES
    .filter(h => isQualifiedVPHex(h.addr, unitAddr, isAllied))
    .map(h => ({ ...h, dist: hexDistance(h.addr, unitAddr) }))
    .sort((a, b) => a.dist - b.dist || b.vp - a.vp);
  return candidates[0] || null;
}

// ---- Reinforce: Allied Infantry ----
function reinforceAlliedInfantry(unit, onDone) {
  const unitAddr = hexAddr(unit.col, unit.row);
  const isAtOrAdjVP = ALL_VP_ADDRS.has(unitAddr)
    ? isQualifiedVPHex(unitAddr, unitAddr, true)
    : neighborAddrs(unitAddr).some(n => isQualifiedVPHex(n, unitAddr, true));

  if (isAtOrAdjVP) {
    const targets = getValidBombardmentTargets(unit);
    if (targets.length > 0) {
      const tgt = getEnemyTargetPriority(targets, unitAddr)[0];
      aiResolveBombardmentStep(unit, tgt, onDone);
      return;
    }
    addCombatLog(`[AI Reinforce] ${unit.id}: 砲撃ターゲットなし・待機`);
    onDone();
  } else {
    const vpHex = getNearestQualifiedVP(unitAddr, true);
    if (!vpHex) {
      addCombatLog(`[AI Reinforce] ${unit.id}: 対象VPヘックスなし・待機`);
      onDone();
      return;
    }
    const moved = moveTowardTarget(unit, vpHex.addr);
    addCombatLog(`[AI Reinforce] ${unit.id} → VP${vpHex.addr}へ移動: ${moved || '移動不可'}`);
    if (moved) setAIHighlights(unitAddr, moved);
    drawAllUnits();
    setTimeout(() => { clearAIHighlights(); onDone(); }, 400);
  }
}

// ---- Reinforce: Allied Cavalry ----
function reinforceAlliedCavalry(unit, onDone) {
  const unitAddr = hexAddr(unit.col, unit.row);
  const french = getFrenchUnits();
  if (french.length === 0) { onDone(); return; }

  const chargeTargets = french.filter(f => isCavalryChargeEligible(unit, f));
  if (chargeTargets.length > 0) {
    const tgt = getEnemyTargetPriority(chargeTargets, unitAddr)[0];
    aiResolveCloseCombat(unit, tgt, onDone);
    return;
  }

  const targets = getValidBombardmentTargets(unit);
  if (targets.length > 0) {
    const tgt = getEnemyTargetPriority(targets, unitAddr)[0];
    aiResolveBombardmentStep(unit, tgt, onDone);
    return;
  }

  const vpHex = getNearestQualifiedVP(unitAddr, true);
  const dest = vpHex ? vpHex.addr : null;
  if (dest) {
    const moved = moveTowardTarget(unit, dest, 2);
    addCombatLog(`[AI Reinforce] ${unit.id} → VP${dest}へ移動: ${moved || '移動不可'}`);
    if (moved) setAIHighlights(unitAddr, moved);
    drawAllUnits();
    setTimeout(() => { clearAIHighlights(); onDone(); }, 400);
  } else {
    addCombatLog(`[AI Reinforce] ${unit.id}: 対象VPヘックスなし・待機`);
    onDone();
  }
}

// ---- Reinforce: Prussian corps config ----
const PRUSSIAN_CORPS_CONFIG = {
  'pr-IV': { entryAddr: '2011', targetAddr: '1512', label: 'Bülow IV Corps' },
  'pr-II': { entryAddr: '2009', targetAddr: '1512', label: 'Pirch I II Corps' },
  'pr-I':  { entryAddr: '2003', targetAddr: '1607', label: 'Ziethen I Corps' },
};
const PRUSSIAN_REINFORCE_TARGET = {
  'pr-IV': '1512',
  'pr-II': '1512',
  'pr-I':  '1607',
};

function reinforcePrussianInfantry(unit, targetAddr, onDone) {
  const unitAddr = hexAddr(unit.col, unit.row);
  const dist = hexDistance(unitAddr, targetAddr);
  const frenchAtTarget = getUnitsAt(targetAddr).some(u => u.army === 'french');
  const frenchAdjTarget = neighborAddrs(targetAddr).some(n =>
    getUnitsAt(n).some(u => u.army === 'french'));

  if (dist <= 1 && (frenchAtTarget || frenchAdjTarget)) {
    const adjFrench = neighborAddrs(unitAddr).flatMap(n =>
      getUnitsAt(n).filter(f => f.army === 'french'));
    if (adjFrench.length > 0) {
      const tgt = getEnemyTargetPriority(adjFrench, unitAddr)[0];
      if (tgt.battleworn) {
        aiResolveCloseCombat(unit, tgt, onDone);
      } else {
        const af = getEffectiveAF(unit);
        if (af > 0 && calcLOS(unitAddr, hexAddr(tgt.col, tgt.row))) {
          aiResolveBombardmentStep(unit, tgt, onDone);
        } else {
          addCombatLog(`[AI Reinforce] ${unit.id}: 砲撃不可・待機`);
          onDone();
        }
      }
    } else {
      addCombatLog(`[AI Reinforce] ${unit.id}: 隣接フランスなし・待機`);
      onDone();
    }
  } else {
    const moved = moveTowardTarget(unit, targetAddr);
    addCombatLog(`[AI Reinforce] ${unit.id} → ${targetAddr}へ移動: ${moved || '移動不可'}`);
    if (moved) setAIHighlights(unitAddr, moved);
    drawAllUnits();
    setTimeout(() => { clearAIHighlights(); onDone(); }, 400);
  }
}

function reinforcePrussianCavalry(unit, targetAddr, onDone) {
  const unitAddr = hexAddr(unit.col, unit.row);
  const french = getFrenchUnits();
  if (french.length === 0) { onDone(); return; }

  const bwTargets = french.filter(f => f.battleworn && isCavalryChargeEligible(unit, f));
  if (bwTargets.length > 0) {
    const tgt = getEnemyTargetPriority(bwTargets, unitAddr)[0];
    aiResolveCloseCombat(unit, tgt, onDone);
    return;
  }

  const targets = getValidBombardmentTargets(unit);
  if (targets.length > 0) {
    const tgt = getEnemyTargetPriority(targets, unitAddr)[0];
    aiResolveBombardmentStep(unit, tgt, onDone);
    return;
  }

  const moved = moveTowardTarget(unit, targetAddr, 2);
  addCombatLog(`[AI Reinforce] ${unit.id} → ${targetAddr}へ移動: ${moved || '移動不可'}`);
  if (moved) setAIHighlights(unitAddr, moved);
  drawAllUnits();
  setTimeout(() => { clearAIHighlights(); onDone(); }, 400);
}

// ---- Reinforce: Artillery（共通） ----
function reinforceArtillery(unit, onDone) {
  const unitAddr = hexAddr(unit.col, unit.row);
  const targets = getValidBombardmentTargets(unit).filter(t => {
    const ta = hexAddr(t.col, t.row);
    return ALL_VP_ADDRS.has(ta) ||
           neighborAddrs(ta).some(n => ALL_VP_ADDRS.has(n));
  });
  if (targets.length > 0) {
    const tgt = getEnemyTargetPriority(targets, unitAddr)[0];
    aiResolveBombardmentStep(unit, tgt, onDone);
    return;
  }
  const french = getFrenchUnits().filter(f => {
    const fa = hexAddr(f.col, f.row);
    return ALL_VP_ADDRS.has(fa) || neighborAddrs(fa).some(n => ALL_VP_ADDRS.has(n));
  });
  const approachTargets = french.length > 0 ? french : getFrenchUnits();
  if (approachTargets.length === 0) { onDone(); return; }
  const nearest = getEnemyTargetPriority(approachTargets, unitAddr)[0];
  const moved = moveTowardTarget(unit, hexAddr(nearest.col, nearest.row));
  addCombatLog(`[AI Reinforce] ${unit.id} 接近 → ${moved || '移動不可'}`);
  drawAllUnits();
  onDone();
}

// ---- 54-63: Reinforce/Recapture ----

function resolveReinforceRecapture(corpUnits, marker, onDone) {
  const isAllied = marker.type === 'allied';
  const prTarget = PRUSSIAN_REINFORCE_TARGET[marker.id] || '1512';
  const actions  = [];

  for (const unit of corpUnits) {
    const u = unit;
    if (unit.type === 'artillery') {
      actions.push(done => reinforceArtillery(u, done));
    } else if (isAllied) {
      if (unit.type === 'infantry') {
        actions.push(done => reinforceAlliedInfantry(u, done));
      } else {
        actions.push(done => reinforceAlliedCavalry(u, done));
      }
    } else {
      if (unit.type === 'infantry') {
        actions.push(done => reinforcePrussianInfantry(u, prTarget, done));
      } else {
        actions.push(done => reinforcePrussianCavalry(u, prTarget, done));
      }
    }
  }

  if (actions.length === 0) {
    addCombatLog('[AI] Reinforce/Recapture: 対象ユニットなし');
    onDone();
    return;
  }
  executeActionsSequentially(actions, onDone);
}

// ============================================================
// フランスコントロール管理
// ============================================================

function renderVPControlLayer() {
  if (!vpControlLayerEl) return;
  vpControlLayerEl.innerHTML = '';
  for (const addr of frenchControlHexes) {
    const col = parseInt(addr.slice(0, 2), 10);
    const row = parseInt(addr.slice(2), 10);
    const { x, y } = layout.hexToPixel(toIdx(col), toIdx(row));
    const star = makeSVGEl('text', {
      x, y: y + 5,
      'text-anchor': 'middle',
      'font-size': '22',
      fill: '#e03030',
      opacity: '0.85',
      'pointer-events': 'none',
    });
    star.textContent = '★';
    vpControlLayerEl.appendChild(star);
  }
  for (const h of VP_HEXES) {
    if (h.type !== 'FLOC') continue;
    if (frenchControlHexes.has(h.addr)) continue;
    const col = parseInt(h.addr.slice(0, 2), 10);
    const row = parseInt(h.addr.slice(2), 10);
    const { x, y } = layout.hexToPixel(toIdx(col), toIdx(row));
    const star = makeSVGEl('text', {
      x, y: y + 5,
      'text-anchor': 'middle',
      'font-size': '22',
      fill: '#3090e0',
      opacity: '0.85',
      'pointer-events': 'none',
    });
    star.textContent = '★';
    vpControlLayerEl.appendChild(star);
  }
}

function setFrenchControl(addr) {
  if (!ALL_VP_ADDRS.has(addr)) return;
  if (frenchControlHexes.has(addr)) return;
  frenchControlHexes.add(addr);
  renderVPControlLayer();
}

function clearFrenchControl(addr) {
  if (!frenchControlHexes.has(addr)) return;
  frenchControlHexes.delete(addr);
  renderVPControlLayer();
}

// ---- メインディスパッチャー ----

function runAlliedPrussianAI(marker, tableKey, onDone) {
  setHudState(`[AI] ${marker.label}（${marker.sub}）アクティベーション中...`);

  const doAI = () => {
    const corpUnits = getCorpsUnits(marker);
    _runAlliedPrussianAICore(corpUnits, marker, tableKey, onDone);
  };
  if (marker.type === 'prussian') {
    handleOffMapEntry(marker, doAI);
  } else {
    doAI();
  }
}

function _runAlliedPrussianAICore(corpUnits, marker, tableKey, onDone) {
  switch (tableKey) {
    case 'fire-nearest':
      resolveOpenFireNearest(corpUnits, onDone);
      break;
    case 'fire-largest':
      resolveOpenFireLargest(corpUnits, onDone);
      break;
    case 'rally':
      resolveRallyAroundColors(corpUnits, onDone);
      break;
    case 'bad-day':
      resolveBadDayForNapoleon();
      onDone();
      break;
    case 'advance':
      resolveAdvance(corpUnits, marker, onDone);
      break;
    case 'reinforce':
      resolveReinforceRecapture(corpUnits, marker, onDone);
      break;
    default:
      addCombatLog(`[AI] 不明なキー: ${tableKey}`);
      onDone();
  }
}

// ============================================================
// VP計算・勝利判定
// ============================================================

function calcVP() {
  const rows = [];
  let total = 0;

  for (const h of VP_HEXES) {
    const isFrench = frenchControlHexes.has(h.addr);
    let countThisHex = false;
    if (h.type === 'FLOC') {
      if (!isFrench) countThisHex = true;
    } else {
      if (isFrench) countThisHex = true;
    }
    if (!countThisHex) continue;
    const label = HEX_LABEL[h.addr] ? `${h.addr} ${HEX_LABEL[h.addr]}` : h.addr;
    rows.push({ label, vp: h.vp, sign: h.vp >= 0 ? 'pos' : 'neg' });
    total += h.vp;
  }

  for (const u of units) {
    if (u.offMap) continue;

    if (u.army === 'allied' && u.type === 'infantry' && !u.small
        && isBritish(u) && !u.isDetachment
        && (u.eliminated || (u.battleworn && u.hits >= 3))) {
      rows.push({ label: `${u.id} 消滅`, vp: 2, sign: 'pos' });
      total += 2;
    }

    if (u.isOG && u.battleworn) {
      rows.push({ label: `${u.id} (OG) BW`, vp: -3, sign: 'neg' });
      total -= 3;
    }

    if (u.isYG && u.battleworn) {
      rows.push({ label: `${u.id} (YG) BW`, vp: -2, sign: 'neg' });
      total -= 2;
    }

    if (u.army === 'french' && u.id.endsWith('_IG')
        && (u.type === 'artillery' || u.type === 'HC' || u.type === 'LC')
        && !u.isOG && !u.isYG && u.battleworn) {
      rows.push({ label: `${u.id} (IG) BW`, vp: -1, sign: 'neg' });
      total -= 1;
    }
  }

  return { total, rows };
}

function getVictoryLevel(vp) {
  for (const v of VICTORY_LEVELS) {
    if (vp >= v.min) return v.label;
  }
  return 'Catastrophe（歴史的結果）';
}

function renderVPPanel() {
  const { total, rows } = calcVP();
  const level = getVictoryLevel(total);
  const numEl = document.getElementById('vp-total-num');
  const levelEl = document.getElementById('vp-level-str');
  const rowsEl = document.getElementById('vp-rows');
  if (!numEl) return;
  numEl.textContent = total >= 0 ? `+${total}` : `${total}`;
  numEl.style.color = total >= 12 ? '#6f6' : total >= 0 ? '#ffd700' : '#f88';
  levelEl.textContent = `— ${level} —`;
  rowsEl.innerHTML = rows.map(r =>
    `<div class="vp-row ${r.sign}"><span>${r.label}</span><span>${r.vp >= 0 ? '+' : ''}${r.vp}</span></div>`
  ).join('') || '<div style="color:#555;font-size:11px;padding:2px 0">— なし —</div>';
}

function showEndGameModal(total, level, rows) {
  const el = document.getElementById('endgame-modal');
  document.getElementById('endgame-level').textContent = level;
  document.getElementById('endgame-total').textContent = `合計 VP：${total >= 0 ? '+' : ''}${total}`;

  const hexR = rows.filter(r => r.label.match(/^\d{4}/));
  const unitR = rows.filter(r => !r.label.match(/^\d{4}/));

  let html = '';
  if (hexR.length) {
    html += '<div class="eg-section">ヘックスVP</div>';
    html += hexR.map(r => `<div class="eg-row ${r.sign}"><span>${r.label}</span><span>${r.vp >= 0 ? '+' : ''}${r.vp}</span></div>`).join('');
  }
  if (unitR.length) {
    html += '<div class="eg-section">ユニットVP</div>';
    html += unitR.map(r => `<div class="eg-row ${r.sign}"><span>${r.label}</span><span>${r.vp >= 0 ? '+' : ''}${r.vp}</span></div>`).join('');
  }
  if (!rows.length) html = '<div style="color:#555;font-size:11px">VPなし</div>';
  document.getElementById('endgame-breakdown').innerHTML = html;
  el.classList.remove('hidden');
}

function endGame() {
  const { total, rows } = calcVP();
  const level = getVictoryLevel(total);
  addCombatLog(`━━━ ゲーム終了 VP: ${total >= 0 ? '+' : ''}${total}（${level}）━━━`);
  showEndGameModal(total, level, rows);
}
