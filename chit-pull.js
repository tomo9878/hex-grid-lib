'use strict';

// ============================================================
// マーカー定義
// ============================================================

const MARKER_DEFS = [
  // フランス軍コープス
  { id: 'fr-I',       type: 'french',    label: 'I Corps',      sub: "D'Erlon",      color: '#5bb5ff' },
  { id: 'fr-II',      type: 'french',    label: 'II Corps',     sub: 'Reille',       color: '#5bb5ff' },
  { id: 'fr-VI',      type: 'french',    label: 'VI Corps',     sub: 'Lobau',        color: '#5bb5ff' },
  { id: 'fr-IIIcav',  type: 'french',    label: 'III Cav',      sub: 'Kellerman',    color: '#5bb5ff' },
  { id: 'fr-IVcav',   type: 'french',    label: 'IV Cav',       sub: 'Milhaud',      color: '#5bb5ff' },
  { id: 'fr-IG',      type: 'french',    label: 'IG',           sub: 'Drouot',       color: '#5bb5ff' },
  // 連合軍コープス
  { id: 'aa-I',       type: 'allied',    label: 'I Corps',      sub: 'Orange',       color: '#ff8888' },
  { id: 'aa-II',      type: 'allied',    label: 'II Corps',     sub: 'Hill',         color: '#ff8888' },
  { id: 'aa-RC',      type: 'allied',    label: 'RC',           sub: 'Wellington RC',color: '#ff8888' },
  { id: 'aa-CC',      type: 'allied',    label: 'CC',           sub: 'Uxbridge',     color: '#ff8888' },
  { id: 'aa-det',     type: 'allied',    label: 'Detachments',  sub: '',             color: '#ff8888' },
  // コマンダーマーカー
  { id: 'napoleon-1', type: 'napoleon',  label: 'Napoleon',     sub: 'Le Petit Caporal', color: '#ffd700' },
  { id: 'napoleon-2', type: 'napoleon',  label: 'Napoleon',     sub: 'Le Petit Caporal', color: '#ffd700' },
  { id: 'wellington', type: 'wellington',label: 'Wellington',   sub: 'Old Nosey',    color: '#cc4444' },
  { id: 'blucher',    type: 'blucher',   label: 'Blücher',      sub: 'Alte Vorwarts',color: '#aaaaaa' },
  // プロイセン軍（TRT経由。初期カップには入らない）
  { id: 'pr-IV',      type: 'prussian',  label: 'IV Corps',     sub: 'Bülow',        color: '#aaaaaa', trtTurn: 10 },
  { id: 'pr-II',      type: 'prussian',  label: 'II Corps',     sub: 'Pirch I',      color: '#aaaaaa', trtTurn: 11 },
  { id: 'pr-I',       type: 'prussian',  label: 'I Corps',      sub: 'Ziethen',      color: '#aaaaaa', trtTurn: 12 },
];

// ============================================================
// 2ダイスロール（11-66システム）
// d1×10 + d2、範囲は11〜66
// ============================================================

function roll2d6() {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  return { total: d1 * 10 + d2, d1, d2 };
}

// ============================================================
// テーブル定義
// ============================================================

const ALLIED_PRUSSIAN_TABLE = [
  {
    range: [11, 23], key: 'fire-nearest', title: 'Open Fire at Nearest Target',
    desc: '射程・LOS内の最近フランスユニットに砲撃。Road to Brussels VP hex隣接のフランスユニット優先。',
  },
  {
    range: [24, 33], key: 'fire-largest', title: 'Open Fire at Largest Target',
    desc: '射程・LOS内の最大SPフランスユニットに砲撃。Road to Brussels VP hex隣接のフランスユニット優先。',
  },
  {
    range: [34, 42], key: 'advance', title: 'Advance',
    desc: 'ユニットタイプ別に最近フランスユニットへ接近・攻撃する。\n・Anglo-Allied Infantry：2ヘックス離れていれば砲撃、隣接かつ相手Battlewornなら近接攻撃。\n・Anglo-Allied Cavalry：2ヘックス以内に接近し可能なら突撃。\n・Prussian Infantry：最近フランスへ接近、2ヘックスなら砲撃、隣接なら近接攻撃。\n・Prussian Cavalry：2ヘックス以内かつBattlewornなら突撃。\n・Artillery（全軍）：射程・LOS内に入るまで接近。既に射程内なら砲撃。',
  },
  {
    range: [43, 53], key: 'rally', title: 'Rally Around the Colors',
    desc: 'HitありユニットをRally（隣接敵がいれば先に1ヘックス後退してから）。未損傷ユニットはVP hex最近のフランスユニットに砲撃。',
  },
  {
    range: [54, 63], key: 'reinforce', title: 'Reinforce / Recapture',
    desc: 'French ControlまたはフランスユニットがVP hexに隣接・進入している場合、4ヘックス以内のVP hexを防衛・奪還する（Road to Brussels優先は距離制限無視）。',
  },
  {
    range: [64, 66], key: 'bad-day', title: 'A Bad Day for Napoleon',
    desc: 'Napoleonマーカーを1枚除去する。',
  },
];

const WELLINGTON_TABLE = [
  {
    range: [11, 26], key: 'reverse-slope', title: 'Reverse Slope Deployment',
    desc: 'このターン終了まで、Ridgeヘックスの連合軍Infantry/Cavalryへの砲撃の目標数が自動的に「5」になる。',
  },
  {
    range: [31, 43], key: 'thin-red-line', title: 'The Thin Red Line',
    desc: 'British Infantry全部隊（DetachmentのHougoumont/La Haye Sainteを含む）のSPとERを+1する。',
  },
  {
    range: [44, 53], key: 'maitland', title: "Now Maitland, Now's Your Time!",
    desc: 'フランスユニットに隣接するBritish Infantry/Cavalryが即座に近接攻撃。Close to Contact Test成功で+2ダイス。',
  },
  {
    range: [54, 63], key: 'scum', title: 'Scum of the Earth',
    desc: 'British Infantry全部隊（Detachment含む）のERを-1する。',
  },
  {
    range: [64, 66], key: 'bad-day', title: 'A Bad Day for Napoleon',
    desc: 'Napoleonマーカーを1枚除去する。',
  },
];

const BLUCHER_TABLE = [
  {
    range: [11, 33], key: 'revenge', title: 'Revenge!',
    desc: '隣接Prussian InfantryはClose to Contact Test +1ERで近接攻撃。2ヘックス以内のPrussian CavalryはClose to Contact Test +1ERで突撃。その他は最近フランスユニットに砲撃（不可なら1ヘックス接近）。',
  },
  {
    range: [34, 52], key: 'forward', title: 'Forward for the Fatherland!',
    desc: '全Prussianユニットが最近フランスユニットに接近。隣接するなら砲撃。TRT上の各Prussian Activation MarkerをD6ロール（1=+1マス遅延、2-3=変化なし、4-6=1マス前進）。',
  },
  {
    range: [53, 63], key: 'ligny', title: 'Ligny Demoralization',
    desc: 'I/II Corpsの非BattlewornフランスユニットにI/II Corps隣接PrussianがElan Test。失敗で1ヘックス後退。',
  },
  {
    range: [64, 66], key: 'bad-day', title: 'A Bad Day for Napoleon',
    desc: 'Napoleonマーカーを1枚除去する。',
  },
];

const NAPOLEON_OPTIONS = [
  {
    key: 'pas-de-charge', title: 'Pas de Charge!',
    desc: 'French Corps Activation中に使用。各アクティブユニットが1ヘックス（非禁止地形）無料移動＋別のUnit Actionを実行。移動の場合MAを+1ヘックス無料延長（Forced Marchではない）。',
  },
  {
    key: 'sun-austerlitz', title: 'The Sun of Austerlitz!',
    desc: '任意ヘックスを選択。そのヘックス内・隣接で敵非隣接の最大3ユニットをSpecial Rally（Shaken/Disrupted問わずマーカーを除去）。',
  },
  {
    key: 'vive-lempereur', title: "Vive L'Empereur!",
    desc: 'Elan TestかPanic Test前に任意ユニットのERを+2（そのテストのみ）。',
  },
  {
    key: 'grand-battery', title: 'Beautiful Daughters Grand Battery!',
    desc: '1-2枚のHeavy Artilleryが入るヘックスを指定。そのユニットのみで砲撃戦闘を実施。',
  },
  {
    key: 'bearskins', title: 'The Bearskins!',
    desc: 'OGユニット（Battlewornでない）に隣接する全敵ユニットがElan Test。失敗で1ヘックス後退（Detachment除く）。',
  },
];

function lookupTable(table, roll) {
  for (const entry of table) {
    if (roll >= entry.range[0] && roll <= entry.range[1]) return entry;
  }
  return null;
}

// ============================================================
// ChitPullSystem
// ============================================================

class ChitPullSystem {
  constructor() {
    this.turn = 1;
    this.cup = [];           // このターンまだ引かれていないマーカー
    this.drawn = null;       // 現在引かれているマーカー（処理中）
    this.discarded = [];     // このターン解決済み
    this.heldNapoleon = [];  // 保持中Napoleonマーカー（最大2枚）
    this.heldFrench = null;  // 保持中フランスコープス（最大1枚：Humbugged）
    this.trtMarkers = [];    // プロイセン到着待ちTRTマーカー
    this.log = [];
    this._listeners = [];

    this._buildInitialCup();
  }

  // ---- 初期化 ------------------------------------------------

  _buildInitialCup() {
    this.cup = MARKER_DEFS
      .filter(m => m.type !== 'prussian')
      .map(m => ({ ...m }));
    this.trtMarkers = MARKER_DEFS
      .filter(m => m.type === 'prussian')
      .map(m => ({ ...m }));
    this.drawn = null;
    this.discarded = [];
  }

  // ---- 内部ユーティリティ ------------------------------------

  _log(msg) {
    this.log.unshift({ turn: this.turn, msg });
    if (this.log.length > 80) this.log.pop();
    this._fire();
  }

  _fire() {
    const state = this.getState();
    this._listeners.forEach(fn => fn(state));
  }

  on(fn) {
    this._listeners.push(fn);
  }

  _checkTRT() {
    const arrived = this.trtMarkers.filter(m => m.trtTurn <= this.turn);
    this.trtMarkers = this.trtMarkers.filter(m => m.trtTurn > this.turn);
    for (const m of arrived) {
      this.cup.push({ ...m });
      this._log(`📯 ${m.label}（${m.sub}）がカップに追加されました`);
    }
    return arrived;
  }

  // Blücherの Step1 用：TRTマーカーを全て1マス前進。到着したものを返す。
  advanceTRTMarkers() {
    const deployed = [];
    for (const m of this.trtMarkers) {
      m.trtTurn = Math.max(this.turn, m.trtTurn - 1);
    }
    const arrived = this.trtMarkers.filter(m => m.trtTurn <= this.turn);
    this.trtMarkers = this.trtMarkers.filter(m => m.trtTurn > this.turn);
    for (const m of arrived) {
      this.cup.push({ ...m });
      deployed.push(m);
      this._log(`📯 ${m.label}（${m.sub}）TRT前進 → 即時展開・カップへ追加`);
    }
    if (arrived.length === 0) {
      const names = this.trtMarkers.map(m => `${m.label}(→T${m.trtTurn})`).join('、');
      this._log(`📯 TRTマーカー前進: ${names || 'なし'}`);
    }
    return deployed;
  }

  // Blücherの「Forward for the Fatherland!」用：TRTマーカーを個別にロール
  rollTRTForward() {
    const results = [];
    for (const m of this.trtMarkers) {
      const d = Math.floor(Math.random() * 6) + 1;
      let delta = 0;
      if (d === 1) delta = +1;       // 遅延
      else if (d <= 3) delta = 0;    // 変化なし
      else delta = -1;               // 前進（到着ターンを1減らす）
      m.trtTurn = Math.max(this.turn + 1, m.trtTurn + delta);
      results.push({ label: m.label, sub: m.sub, d, trtTurn: m.trtTurn });
    }
    return results;
  }

  // ---- コア操作 ----------------------------------------------

  /**
   * カップからランダムにマーカーを1枚引く
   */
  drawMarker() {
    if (this.drawn) {
      return { error: '現在のマーカーを先に解決または保持してください' };
    }
    if (this.cup.length === 0) {
      return { error: 'カップにマーカーがありません' };
    }
    const idx = Math.floor(Math.random() * this.cup.length);
    this.drawn = this.cup.splice(idx, 1)[0];

    // Napoleonは自動的に保持
    if (this.drawn.type === 'napoleon') {
      if (this.heldNapoleon.length < 2) {
        this.heldNapoleon.push(this.drawn);
        const held = this.drawn;
        this.drawn = null;
        this._log(`🎖️ ${held.label} を引きました → 自動保持（${this.heldNapoleon.length}/2）`);
        return { ok: true, marker: held, autoHeld: true };
      }
      // すでに2枚保持中の場合はカップに戻す（ルール上は起こらないはずだが保険）
      this.cup.push(this.drawn);
      this.drawn = null;
      this._log(`⚠️ Napoleon マーカーをすでに2枚保持中のためカップに戻しました`);
      return { error: 'Napoleonマーカーをすでに2枚保持中です' };
    }

    const sub = this.drawn.sub ? ` (${this.drawn.sub})` : '';
    this._log(`🎲 ${this.drawn.label}${sub} を引きました`);
    return { ok: true, marker: this.drawn };
  }

  /**
   * 現在引いたフランスコープスマーカーを保持（Napoleon Has Humbugged Me, By God!）
   */
  holdFrench() {
    if (!this.drawn || this.drawn.type !== 'french') {
      return { error: 'フランスコープスマーカーが引かれていません' };
    }
    if (this.heldFrench) {
      return { error: 'すでにフランスコープスマーカーを1枚保持中です（最大1枚）' };
    }
    this.heldFrench = this.drawn;
    this.drawn = null;
    this._log(`🎌 ${this.heldFrench.label} を保持しました（Napoleon Has Humbugged Me!）`);
    return { ok: true };
  }

  /**
   * 現在引いたマーカーを解決済みにする
   * @param {object} [extra] - resolve時の追加データ（テーブルロール結果など）
   */
  resolveDrawn(extra = {}) {
    if (!this.drawn) return { error: '引かれたマーカーがありません' };
    const m = this.drawn;
    this.discarded.push({ ...m, resolveData: extra });
    this.drawn = null;
    const sub = m.sub ? ` (${m.sub})` : '';
    this._log(`✅ ${m.label}${sub} を解決しました`);
    return { ok: true };
  }

  /**
   * 保持中のNapoleonマーカーを使用（Le Petit Caporal Tableからアクション選択）
   * @param {number} idx - heldNapoleon内のインデックス
   * @param {string} actionKey - NAPOLEON_OPTIONSのkey
   */
  useNapoleon(idx, actionKey) {
    if (idx < 0 || idx >= this.heldNapoleon.length) {
      return { error: '無効なインデックスです' };
    }
    const action = NAPOLEON_OPTIONS.find(o => o.key === actionKey);
    if (!action) return { error: '無効なアクションキーです' };
    const m = this.heldNapoleon.splice(idx, 1)[0];
    this.discarded.push({ ...m, resolveData: { action } });
    this._log(`⚔️ Napoleon マーカーを使用：${action.title}`);
    return { ok: true, action };
  }

  /**
   * 保持中のフランスコープスマーカーを使用（通常のフランスアクティベーションとして処理）
   */
  useHeldFrench() {
    if (!this.heldFrench) return { error: '保持中のフランスマーカーがありません' };
    const m = this.heldFrench;
    this.heldFrench = null;
    // drawnとして処理させる（UIがresolveDrawnを呼ぶ）
    this.drawn = m;
    this._log(`🎌 ${m.label} を使用します`);
    return { ok: true, marker: m };
  }

  /**
   * A Bad Day for Napoleon: Napoleonマーカーを1枚除去する。
   * 優先順位: 保持中 → 使用済み(discarded) → カップ → 全消滅済み(1枚復活)
   */
  removeNapoleonMarker() {
    // 1. 保持中を優先
    if (this.heldNapoleon.length > 0) {
      const m = this.heldNapoleon.splice(0, 1)[0];
      this.discarded.push(m);
      this._log(`☁️ A Bad Day for Napoleon: 保持中 ${m.label} を除去（残り保持${this.heldNapoleon.length}枚）`);
      return { ok: true, source: 'held' };
    }
    // 2. 使用済み（discarded）から除去
    const discIdx = this.discarded.findIndex(m => m.type === 'napoleon');
    if (discIdx >= 0) {
      const m = this.discarded.splice(discIdx, 1)[0];
      this._log(`☁️ A Bad Day for Napoleon: 使用済み ${m.label} を除去`);
      return { ok: true, source: 'discarded' };
    }
    // 3. カップから除去
    const cupIdx = this.cup.findIndex(m => m.type === 'napoleon');
    if (cupIdx >= 0) {
      const m = this.cup.splice(cupIdx, 1)[0];
      this._log(`☁️ A Bad Day for Napoleon: カップ内 ${m.label} を除去`);
      return { ok: true, source: 'cup' };
    }
    // 4. 全て除去済み → 1枚カップに復活（Napoleon recovers!）
    const recovery = { id: 'napoleon-1', type: 'napoleon', label: 'Napoleon', sub: 'Le Petit Caporal', color: '#ffd700' };
    this.cup.push(recovery);
    this._log('☁️ A Bad Day for Napoleon: 全マーカー除去済み → Napoleon recovers! 1枚カップに復活');
    return { ok: true, source: 'recovery' };
  }

  /**
   * ターン終了。保持マーカーをカップに戻し、次ターンへ。
   */
  endTurn() {
    if (this.drawn) {
      this.cup.push(this.drawn);
      this.drawn = null;
    }
    for (const m of this.heldNapoleon) this.cup.push(m);
    this.heldNapoleon = [];
    if (this.heldFrench) {
      this.cup.push(this.heldFrench);
      this.heldFrench = null;
    }
    for (const m of this.discarded) this.cup.push(m);
    this.discarded = [];

    if (this.turn >= 12) {
      this._log('━━ ゲーム終了（ターン12完了）━━');
      this._fire();
      return { ok: true, gameOver: true };
    }

    this.turn++;
    this._log(`━━━ ターン ${this.turn} 開始 ━━━`);
    const arrivedCorps = this._checkTRT();
    return { ok: true, turn: this.turn, arrivedCorps };
  }

  // ---- 状態取得 ----------------------------------------------

  getState() {
    return {
      turn: this.turn,
      cup: [...this.cup],
      drawn: this.drawn ? { ...this.drawn } : null,
      discarded: [...this.discarded],
      heldNapoleon: [...this.heldNapoleon],
      heldFrench: this.heldFrench ? { ...this.heldFrench } : null,
      trtMarkers: [...this.trtMarkers],
      log: [...this.log],
    };
  }

  /**
   * セーブデータから内部状態を復元する
   */
  loadState(state) {
    this.turn          = state.turn;
    this.cup           = state.cup.map(m => ({ ...m }));
    this.drawn         = state.drawn ? { ...state.drawn } : null;
    this.discarded     = state.discarded.map(m => ({ ...m }));
    this.heldNapoleon  = state.heldNapoleon.map(m => ({ ...m }));
    this.heldFrench    = state.heldFrench ? { ...state.heldFrench } : null;
    this.trtMarkers    = state.trtMarkers.map(m => ({ ...m }));
    this.log           = [...state.log];
    this._fire();
  }

  // カップ内のマーカーを種別ごとに集計
  getCupBreakdown() {
    const counts = {};
    for (const m of this.cup) {
      counts[m.type] = (counts[m.type] || 0) + 1;
    }
    return counts;
  }
}
