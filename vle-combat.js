// ============================================================
// 砲撃戦闘（Bombardment Combat）
// ============================================================

function rollD6() { return Math.floor(Math.random() * 6) + 1; }

function getValidBombardmentTargets(attackerUnit) {
  if (getEffectiveAF(attackerUnit) <= 0) return [];
  const attackerAddr = hexAddr(attackerUnit.col, attackerUnit.row);
  const range = attackerUnit.isHeavyArtillery ? 4 : 3;

  return units.filter(target => {
    if (target.offMap) return false;
    if (target.army === attackerUnit.army) return false;
    const targetAddr = hexAddr(target.col, target.row);
    const dist = hexDistance(attackerAddr, targetAddr);
    if (dist < 1 || dist > range) return false;
    return calcLOS(attackerAddr, targetAddr);
  });
}

function calcBombardmentDice(attacker, targetAddr, { isDesultory = false } = {}) {
  const attackerAddr = hexAddr(attacker.col, attacker.row);
  let dice = getEffectiveAF(attacker);
  if (dice <= 0) return 0;

  if (isRidge(attackerAddr) && !isRidge(targetAddr)) dice++;

  if (!isDesultory && hexDistance(attackerAddr, targetAddr) === 1) dice++;

  const hasInfantryTarget = getUnitsAt(targetAddr).some(
    u => u.army !== attacker.army && u.type === 'infantry'
  );
  if (hasInfantryTarget) {
    const isClear = !isRidge(targetAddr) && !isDifficultTerrain(targetAddr);
    if (isClear) {
      const cavAdj = neighborAddrs(targetAddr).some(n =>
        getUnitsAt(n).some(u =>
          u.army === attacker.army && (u.type === 'HC' || u.type === 'LC')
        )
      );
      if (cavAdj) dice++;
    }
  }

  if (isDesultory) dice = Math.ceil(dice / 2);

  return Math.max(1, dice);
}

function calcBombardmentTargetNumber(targetAddr, targetUnit) {
  if (reverseSlope && isRidge(targetAddr) &&
      targetUnit && targetUnit.army === 'allied' && targetUnit.type !== 'artillery') return 5;

  const types = getTerrainTypes(targetAddr);
  let tn;
  if      (types.includes('walled_buildings')) tn = 6;
  else if (types.includes('buildings') ||
           types.includes('woods'))            tn = 5;
  else                                         tn = 4;

  if (targetUnit && (targetUnit.type === 'HC' || targetUnit.type === 'LC')) tn--;

  return tn;
}

function resolveBombardment(attackerUnit, targetUnit, { isDesultory = false, onComplete = null } = {}) {
  if (attackerUnit.army === 'french') markActed(attackerUnit);
  const targetAddr = hexAddr(targetUnit.col, targetUnit.row);
  const numDice = calcBombardmentDice(attackerUnit, targetAddr, { isDesultory });
  const tn = calcBombardmentTargetNumber(targetAddr, targetUnit);

  const isDetachWB = !!(targetUnit.isDetachment &&
                        getTerrainTypes(targetAddr).includes('walled_buildings'));

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

  const bonuses = [];
  const attackerAddr = hexAddr(attackerUnit.col, attackerUnit.row);
  if (isRidge(attackerAddr) && !isRidge(targetAddr)) bonuses.push('Plunging Fire +1');
  if (!isDesultory && hexDistance(attackerAddr, targetAddr) === 1) bonuses.push('Canister +1');
  if (isDesultory) bonuses.push('Desultory ÷2');
  if (isDetachWB)  bonuses.push('Detachment in WB (6×2必要)');

  showBombardModal({
    attackerUnit, targetUnit, targetAddr,
    numDice, tn, rolls, successes, partials, hit,
    isDetachWB, bonuses,
    onResolve: () => {
      const logParts = rolls.join(',');
      addCombatLog(
        `砲撃: ${attackerUnit.id}→${targetUnit.id}` +
        ` [${logParts}] TN${tn} → ${hit ? '1 Hit!' : 'No Hit'}`
      );
      if (hit) applyHit(targetUnit);
      deselect();
      if (onComplete) onComplete();
    },
  });
}

let _bombardOnResolve = null;

function showBombardModal({ attackerUnit, targetUnit, numDice, tn, rolls,
                            successes, partials, hit, isDetachWB, bonuses, onResolve }) {
  document.getElementById('bombard-modal-title').textContent =
    `砲撃: ${attackerUnit.id} → ${targetUnit.id}`;

  const infoEl = document.getElementById('bombard-info');
  infoEl.innerHTML =
    `<span style="color:#888">ダイス数:</span> <b>${numDice}</b>` +
    `　<span style="color:#888">目標数:</span> <b>TN${tn}</b>`;
  if (bonuses.length) {
    infoEl.innerHTML += `<br><span style="color:#ff8c00;font-size:11px">${bonuses.join(' / ')}</span>`;
  }

  const diceEl = document.getElementById('bombard-dice-area');
  diceEl.innerHTML = '';
  for (const r of rolls) {
    const span = document.createElement('span');
    span.className = 'die-result ';
    if (isDetachWB) {
      span.className += (r === 6) ? 'die-success' : 'die-miss';
    } else {
      if      (r > tn)  span.className += 'die-success';
      else if (r === tn) span.className += 'die-partial';
      else              span.className += 'die-miss';
    }
    span.textContent = r;
    diceEl.appendChild(span);
  }

  const legendSpan = document.createElement('span');
  legendSpan.style.cssText = 'font-size:10px;color:#555;display:block;margin-top:4px;';
  legendSpan.textContent = isDetachWB
    ? '緑=6（2個で1成功）'
    : `緑=>TN成功  金=TN Partial（2個で1成功）  グレー=失敗`;
  diceEl.appendChild(legendSpan);

  const resultEl = document.getElementById('bombard-result-area');
  let summary = isDetachWB
    ? `6の目: ${rolls.filter(r => r === 6).length} / 2必要　成功: ${successes}`
    : `成功: ${successes}　Partial余り: ${partials > 0 ? partials + '個' : 'なし'}`;
  resultEl.innerHTML =
    `<div style="color:#aaa;font-size:12px">${summary}</div>` +
    `<div class="${hit ? 'bombard-hit' : 'bombard-no-hit'}">${hit ? '💥 1 Hit!' : '✓ No Hit'}</div>`;

  _bombardOnResolve = onResolve;
  document.getElementById('bombard-modal').classList.remove('hidden');
}

function startBombardMode(unit) {
  bombardMode = true;
  bombardTargetAddrs.clear();
  reachableMap.clear();

  const targets = getValidBombardmentTargets(unit);
  for (const t of targets) bombardTargetAddrs.add(hexAddr(t.col, t.row));

  refreshHighlights();
  const msg = targets.length > 0
    ? `${unit.id} 砲撃モード — ターゲットをクリック (${targets.length}体)`
    : `${unit.id} — 射程・LOS内に有効ターゲットなし`;
  setHudState(msg);
}

// ============================================================
// 近接戦闘（Close Combat）
// ============================================================

function getValidCloseCombatTargets(attacker) {
  if (attacker.type === 'artillery') return [];
  const attackerAddr = hexAddr(attacker.col, attacker.row);

  return units.filter(target => {
    if (target.offMap) return false;
    if (target.army === attacker.army) return false;
    const targetAddr = hexAddr(target.col, target.row);
    const dist = hexDistance(attackerAddr, targetAddr);

    if (attacker.type === 'infantry') {
      return dist === 1;
    }
    if (dist < 1 || dist > 2) return false;
    if (!calcLOS(attackerAddr, targetAddr)) return false;
    if (isDifficultTerrain(targetAddr)) return false;
    if (dist === 1 && isRiverCrossing(attackerAddr, targetAddr)) return false;
    return true;
  });
}

function calcMeleeAttackerDice(attacker, defender, attackerAddr, defenderAddr, { confident = false, bonusDice = 0 } = {}) {
  let dice = getEffectiveSP(attacker);
  if (confident) dice++;
  dice += bonusDice;
  let enfiladeCount = 0;
  for (const nAddr of neighborAddrs(defenderAddr)) {
    if (nAddr === attackerAddr) continue;
    if (getUnitsAt(nAddr).some(u => u.army === attacker.army)) enfiladeCount++;
  }
  dice += Math.min(2, enfiladeCount);
  if (attacker.type === 'HC') dice += 2;
  return Math.max(0, dice);
}

function calcMeleeDefenderDice(attacker, defender, attackerAddr, defenderAddr) {
  let dice = getEffectiveSP(defender) + getEffectiveAF(defender);
  if (isRidge(defenderAddr) && !isRidge(attackerAddr)) dice++;
  return Math.max(0, dice);
}

function calcMeleeTargetNumbers(attacker, defender, attackerAddr, defenderAddr, {
  formSquareSuccess = false,
  formSquareFail    = false,
} = {}) {
  let defER = getEffectiveER(defender);

  if (formSquareSuccess) defER = Math.min(6, defER + 2);
  if (formSquareFail)    defER = Math.max(1, defER - 2);

  const defTypes = getTerrainTypes(defenderAddr);
  if (defTypes.includes('woods') || defTypes.includes('buildings')) defER = Math.min(6, defER + 1);

  if (defTypes.includes('walled_buildings') && defender.isDetachment) defER = Math.min(6, defER + 2);

  if (isRiverCrossing(attackerAddr, defenderAddr)) defER = Math.min(6, defER + 1);

  if ((attacker.type === 'HC' || attacker.type === 'LC') && defender.type === 'artillery') {
    defER = Math.max(1, defER - 1);
  }

  const atkER = getEffectiveER(attacker);
  return { defER, atkER };
}

function rollMeleeDice(numDice, tn) {
  const rolls = Array.from({ length: numDice }, rollD6);
  let successes = 0, partials = 0;
  for (const r of rolls) {
    if      (r > tn)  successes++;
    else if (r === tn) partials++;
  }
  successes += Math.floor(partials / 2);
  return { rolls, successes };
}

function meleeDiceHTML(rolls, tn) {
  return rolls.map(r => {
    const cls = r > tn ? 'die-success' : (r === tn ? 'die-partial' : 'die-miss');
    return `<span class="die-result ${cls}">${r}</span>`;
  }).join('');
}

function getRetreatScoreFn(army) {
  return function(fromAddr, toAddr) {
    const dr = parseInt(toAddr.slice(2), 10) - parseInt(fromAddr.slice(2), 10);
    const dc = parseInt(toAddr.slice(0, 2), 10) - parseInt(fromAddr.slice(0, 2), 10);
    if (army === 'french')   return dr;
    if (army === 'allied')   return -dr + (dc <= 0 ? 1 : 0);
    /* prussian */           return -dr + (dc >= 0 ? 1 : 0);
  };
}

function doRetreat(unit, hexCount) {
  const logs = [];
  const scoreFn = getRetreatScoreFn(unit.army);
  let currentAddr = hexAddr(unit.col, unit.row);
  const visited = new Set([currentAddr]);

  for (let step = 0; step < hexCount; step++) {
    const neighbors = neighborAddrs(currentAddr);
    const valid = neighbors.filter(nAddr => {
      if (visited.has(nAddr)) return false;
      if (getUnitsAt(nAddr).some(u => u.army !== unit.army)) return false;
      if (!canLandAt(nAddr, unit)) return false;
      return true;
    });
    valid.sort((a, b) => scoreFn(currentAddr, b) - scoreFn(currentAddr, a));

    if (valid.length === 0) {
      applyHit(unit);
      logs.push(`[${unit.id}] 後退不能 → 1 Hit`);
    } else {
      currentAddr = valid[0];
      visited.add(currentAddr);
      unit.col = parseInt(currentAddr.slice(0, 2), 10);
      unit.row = parseInt(currentAddr.slice(2), 10);
      logs.push(`[${unit.id}] → ${currentAddr} に後退`);

      const occupants = getUnitsAt(currentAddr).filter(u => u.id !== unit.id);
      const hasFriendly = occupants.some(u => u.army === unit.army);
      if (!hasFriendly && isEnemyAdjacentTo(currentAddr, unit.army)) {
        applyHit(unit);
        logs.push(`[${unit.id}] 敵隣接通過 → 1 Hit`);
      }
    }
  }

  drawAllUnits();
  return logs;
}

function showMeleeModal(content, buttons) {
  document.getElementById('melee-content').innerHTML = content;
  const footer = document.getElementById('melee-modal-footer');
  footer.innerHTML = '';
  for (const { label, cls, cb } of buttons) {
    footer.appendChild(makeBtn(label, cls, cb));
  }
  document.getElementById('melee-modal').classList.remove('hidden');
}

function closeMeleeModal() {
  document.getElementById('melee-modal').classList.add('hidden');
}

function resolveCloseCombat(attacker, defender, onComplete = null, { bonusDice = 0 } = {}) {
  if (attacker.army === 'french') markActed(attacker);
  const attackerAddr = hexAddr(attacker.col, attacker.row);
  const defenderAddr = hexAddr(defender.col, defender.row);
  const _done = () => { deselect(); if (onComplete) onComplete(); };

  document.getElementById('melee-modal-title').textContent =
    `近接戦闘: ${attacker.id} → ${defender.id}`;

  function stepA() {
    const isCavWithdrawal =
      attacker.type === 'infantry' &&
      defender.army === 'french' &&
      (defender.type === 'HC' || defender.type === 'LC');

    if (isCavWithdrawal) {
      showMeleeModal(
        `<div style="color:#ffd700;font-weight:bold;margin-bottom:8px">Cavalry Withdrawal</div>` +
        `<div style="font-size:12px;color:#aaa">` +
          `防御側 <b>${defender.id}</b>（French Cavalry）は撤退を選択できます。<br>` +
          `撤退：ダイスなし、<b>${attacker.id}</b> の勝利・前進。` +
        `</div>`,
        [
          { label: '撤退する（2ヘックス後退）', cls: 'btn-warn', cb: () => {
            closeMeleeModal();
            const msgs = doRetreat(defender, 2);
            attacker.col = parseInt(defenderAddr.slice(0, 2), 10);
            attacker.row = parseInt(defenderAddr.slice(2), 10);
            drawAllUnits();
            msgs.forEach(m => addCombatLog(m));
            addCombatLog(`近接戦闘: ${attacker.id}→${defender.id} [Cavalry Withdrawal]`);
            addCombatLog(`[${attacker.id}] → ${defenderAddr} に前進`);
            _done();
          }},
          { label: '戦闘する', cls: 'btn-danger', cb: () => {
            closeMeleeModal();
            stepB();
          }},
        ]
      );
    } else {
      stepB();
    }
  }

  function stepB() {
    const atkER = getEffectiveER(attacker);
    const defER = getEffectiveER(defender);

    showMeleeModal(
      `<div style="font-size:12px;color:#aaa;margin-bottom:10px">` +
        `<b style="color:#fff">${attacker.id}</b> が Close to Contact Test を実施<br>` +
        `ER = ${atkER}　→　1d6 ≤ ${atkER} で成功` +
      `</div>`,
      [
        { label: '🎲 ダイスを振る', cls: 'btn-primary', cb: () => {
          const roll = rollD6();
          const success = roll <= atkER;
          const confident = success && (atkER - defER >= 2);

          let content =
            `<div style="font-size:28px;text-align:center;color:${success ? '#0f0' : '#f66'};margin:8px 0">` +
              `🎲 ${roll}` +
            `</div>` +
            `<div style="text-align:center;font-weight:bold;font-size:14px;color:${success ? '#0f0' : '#f66'}">` +
              (success ? `成功！（${roll} ≤ ER${atkER}）` : `失敗…（${roll} > ER${atkER}）`) +
            `</div>`;

          if (confident) {
            content += `<div style="color:#ffd700;margin-top:6px;font-size:12px;text-align:center">` +
              `✦ Confident！（ER差 +${atkER - defER}）→ 攻撃ダイス +1` +
            `</div>`;
          }

          if (success) {
            showMeleeModal(content, [
              { label: '戦闘へ →', cls: 'btn-primary', cb: () => {
                closeMeleeModal();
                stepC(confident);
              }},
            ]);
          } else {
            if (attacker.type === 'infantry') {
              content += `<div style="color:#ff8c00;margin-top:8px;font-size:12px">` +
                `Infantry は Desultory Fire（砲撃ダイス÷2）を選択できます。` +
              `</div>`;
              showMeleeModal(content, [
                { label: 'Desultory Fire', cls: 'btn-warn', cb: () => {
                  closeMeleeModal();
                  const af = getEffectiveAF(attacker);
                  if (af > 0) {
                    resolveBombardment(attacker, defender, { isDesultory: true, onComplete: _done });
                  } else {
                    addCombatLog(`${attacker.id}: AF=0のためDesultory Fire不可`);
                    _done();
                  }
                }},
                { label: '攻撃中止', cls: 'btn-neutral', cb: () => {
                  closeMeleeModal();
                  addCombatLog(`近接戦闘: ${attacker.id}→${defender.id} [Close to Contact 失敗・中止]`);
                  _done();
                }},
              ]);
            } else {
              content += `<div style="color:#ff4444;margin-top:8px;font-size:12px;text-align:center">Cavalry は攻撃を実施できません。</div>`;
              showMeleeModal(content, [
                { label: '閉じる', cls: 'btn-neutral', cb: () => {
                  closeMeleeModal();
                  addCombatLog(`近接戦闘: ${attacker.id}→${defender.id} [Close to Contact 失敗]`);
                  _done();
                }},
              ]);
            }
          }
        }},
      ]
    );
  }

  function stepC(confident) {
    const isCavVsInf =
      (attacker.type === 'HC' || attacker.type === 'LC') &&
      defender.type === 'infantry';

    if (isCavVsInf) {
      const defER = getEffectiveER(defender);
      showMeleeModal(
        `<div style="font-weight:bold;color:#fff;margin-bottom:8px">Form Square Test</div>` +
        `<div style="font-size:12px;color:#aaa">` +
          `Cavalry が Infantry を攻撃します。<br>` +
          `防御側 <b>${defender.id}</b>（ER=${defER}）が Elan Test：<br>` +
          `1d6 ≤ ${defER} → 成功（ER +2）　失敗 → ER -2` +
        `</div>`,
        [
          { label: '🎲 ダイスを振る', cls: 'btn-primary', cb: () => {
            const roll = rollD6();
            const success = roll <= defER;
            const content =
              `<div style="font-size:28px;text-align:center;color:${success ? '#0f0' : '#f66'};margin:8px 0">` +
                `🎲 ${roll}` +
              `</div>` +
              `<div style="text-align:center;font-weight:bold;font-size:14px;color:${success ? '#0f0' : '#f66'}">` +
                (success ? `成功！→ 防御側 ER +2` : `失敗… → 防御側 ER -2`) +
              `</div>`;
            showMeleeModal(content, [
              { label: '戦闘へ →', cls: 'btn-primary', cb: () => {
                closeMeleeModal();
                stepD(confident, success, !success);
              }},
            ]);
          }},
        ]
      );
    } else {
      stepD(confident, false, false);
    }
  }

  function stepD(confident, formSquareSuccess, formSquareFail) {
    const { defER, atkER } = calcMeleeTargetNumbers(
      attacker, defender, attackerAddr, defenderAddr,
      { formSquareSuccess, formSquareFail }
    );
    const atkDice = calcMeleeAttackerDice(attacker, defender, attackerAddr, defenderAddr, { confident, bonusDice });
    const defDice = calcMeleeDefenderDice(attacker, defender, attackerAddr, defenderAddr);

    const atkBonuses = [];
    if (confident) atkBonuses.push('Confident +1');
    if (bonusDice > 0) atkBonuses.push(`Wellington +${bonusDice}`);
    const enfiladeCount = Math.min(2, neighborAddrs(defenderAddr).filter(nAddr =>
      nAddr !== attackerAddr && getUnitsAt(nAddr).some(u => u.army === attacker.army)
    ).length);
    if (enfiladeCount > 0) atkBonuses.push(`Enfilade +${enfiladeCount}`);
    if (attacker.type === 'HC') atkBonuses.push('Heavy Cavalry +2');

    const defBonuses = [];
    if (isRidge(defenderAddr) && !isRidge(attackerAddr)) defBonuses.push('Downhill +1d');
    const defTypes = getTerrainTypes(defenderAddr);
    if (defTypes.includes('woods') || defTypes.includes('buildings')) defBonuses.push('Cover ER+1');
    if (defTypes.includes('walled_buildings') && defender.isDetachment)  defBonuses.push('Heavy Cover ER+2');
    if (isRiverCrossing(attackerAddr, defenderAddr)) defBonuses.push('River Barrier ER+1');
    if ((attacker.type === 'HC' || attacker.type === 'LC') && defender.type === 'artillery') defBonuses.push('vs Artillery ER-1');
    if (formSquareSuccess) defBonuses.push('Form Square ER+2');
    if (formSquareFail)    defBonuses.push('Form Square Fail ER-2');

    showMeleeModal(
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px">` +
        `<div style="background:rgba(91,181,255,.08);border:1px solid #5bb5ff33;border-radius:5px;padding:8px">` +
          `<div style="color:#5bb5ff;font-weight:bold;margin-bottom:4px">攻撃側: ${attacker.id}</div>` +
          `<div style="font-size:11px;color:#aaa">ダイス: <b>${atkDice}</b>　TN &gt; ${atkER}</div>` +
          (atkBonuses.length ? `<div style="font-size:10px;color:#ffd700;margin-top:3px">${atkBonuses.join(' / ')}</div>` : '') +
        `</div>` +
        `<div style="background:rgba(255,136,136,.08);border:1px solid #ff888833;border-radius:5px;padding:8px">` +
          `<div style="color:#ff8888;font-weight:bold;margin-bottom:4px">防御側: ${defender.id}</div>` +
          `<div style="font-size:11px;color:#aaa">ダイス: <b>${defDice}</b>　TN &gt; ${defER}</div>` +
          (defBonuses.length ? `<div style="font-size:10px;color:#ffd700;margin-top:3px">${defBonuses.join(' / ')}</div>` : '') +
        `</div>` +
      `</div>`,
      [
        { label: '🎲 双方ダイスを振る', cls: 'btn-primary', cb: () => {
          const atkResult = rollMeleeDice(atkDice, atkER);
          const defResult = rollMeleeDice(defDice, defER);
          const atkHits = Math.min(3, atkResult.successes);
          const defHits = Math.min(3, defResult.successes);

          const attackerWins = atkResult.successes > defResult.successes;
          const draw = atkResult.successes === defResult.successes;

          let winnerText, winnerColor;
          if (draw)           { winnerText = '引き分け（防御側勝利）'; winnerColor = '#aaa'; }
          else if (attackerWins) { winnerText = `${attacker.id} の勝利！`; winnerColor = '#0f0'; }
          else                { winnerText = `${defender.id} の勝利！`; winnerColor = '#ff8888'; }

          const content =
            `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">` +
              `<div>` +
                `<div style="color:#5bb5ff;font-size:11px;margin-bottom:4px">攻撃側 TN&gt;${atkER}</div>` +
                `<div style="display:flex;flex-wrap:wrap;gap:4px">${meleeDiceHTML(atkResult.rolls, atkER)}</div>` +
                `<div style="font-size:11px;color:#aaa;margin-top:4px">成功: <b>${atkResult.successes}</b> → Hit ${atkHits}</div>` +
              `</div>` +
              `<div>` +
                `<div style="color:#ff8888;font-size:11px;margin-bottom:4px">防御側 TN&gt;${defER}</div>` +
                `<div style="display:flex;flex-wrap:wrap;gap:4px">${meleeDiceHTML(defResult.rolls, defER)}</div>` +
                `<div style="font-size:11px;color:#aaa;margin-top:4px">成功: <b>${defResult.successes}</b> → Hit ${defHits}</div>` +
              `</div>` +
            `</div>` +
            `<div style="font-size:15px;font-weight:bold;color:${winnerColor};text-align:center;` +
              `padding:8px 0;border-top:1px solid #333;border-bottom:1px solid #333;margin-bottom:4px">` +
              winnerText +
            `</div>`;

          showMeleeModal(content, [
            { label: '結果を適用 →', cls: 'btn-primary', cb: () => {
              closeMeleeModal();
              stepE(atkHits, defHits, attackerWins, draw, atkResult, defResult, atkER, defER);
            }},
          ]);
        }},
      ]
    );
  }

  function stepE(atkHits, defHits, attackerWins, draw, atkResult, defResult, atkER, defER) {
    const logs = [];

    for (let i = 0; i < defHits; i++) applyHit(defender);
    if (defHits > 0) logs.push(`${defender.id}: ${defHits} Hit`);

    for (let i = 0; i < atkHits; i++) applyHit(attacker);
    if (atkHits > 0) logs.push(`${attacker.id}: ${atkHits} Hit`);

    if (draw) {
      logs.push(`引き分け → 攻撃側は元の位置に留まる`);
    } else if (attackerWins) {
      doRetreat(defender, 2).forEach(m => logs.push(m));
      attacker.col = parseInt(defenderAddr.slice(0, 2), 10);
      attacker.row = parseInt(defenderAddr.slice(2), 10);
      logs.push(`[${attacker.id}] → ${defenderAddr} に前進`);
    } else {
      doRetreat(attacker, 2).forEach(m => logs.push(m));
    }

    if (attacker.type === 'HC' || attacker.type === 'LC') {
      applyHit(attacker);
      logs.push(`[${attacker.id}] Blown Horses → 1 Hit`);
    }

    const summary =
      `近接戦闘: ${attacker.id}→${defender.id}` +
      ` [ATK:${atkResult.rolls.join(',')} TN${atkER}` +
      ` / DEF:${defResult.rolls.join(',')} TN${defER}]` +
      ` → ${attackerWins ? '攻撃側勝利' : draw ? '引き分け' : '防御側勝利'}`;
    addCombatLog(summary);
    logs.forEach(m => addCombatLog(m));

    drawAllUnits();
    _done();
  }

  stepA();
}

function startMeleeMode(unit) {
  meleeMode = true;
  meleeTargetAddrs.clear();
  reachableMap.clear();
  bombardMode = false;
  bombardTargetAddrs.clear();

  const targets = getValidCloseCombatTargets(unit);
  for (const t of targets) meleeTargetAddrs.add(hexAddr(t.col, t.row));

  refreshHighlights();
  const msg = targets.length > 0
    ? `${unit.id} 近接攻撃モード — ターゲットをクリック (${targets.length}体)`
    : `${unit.id} — 近接攻撃可能ターゲットなし`;
  setHudState(msg);
}
