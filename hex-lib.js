/**
 * hex-lib.js — 汎用ヘックスグリッドライブラリ
 * Based on: https://www.redblobgames.com/grids/hexagons/
 *
 * 対応グリッドタイプ:
 *   FlatTopLayout  — 列ベース（Vassal wargame標準）
 *                    dx = 列間隔(水平), dy = 行間隔(垂直/同列内)
 *                    奇数列(0-indexed)が dy/2 下にオフセット
 *
 *   PointyTopLayout — 行ベース（六角形の頂点が上下）
 *                    dx = 行内ヘックス間水平距離, dy = 行間垂直距離
 *                    奇数行(0-indexed)が dx/2 右にオフセット
 */

'use strict';

// ============================================================
// CUBE COORDINATES
// ============================================================

class Hex {
  /** @param {number} q @param {number} r @param {number} s */
  constructor(q, r, s) {
    this.q = q; this.r = r; this.s = s;
    // q + r + s === 0 (浮動小数点誤差許容)
  }

  /** @param {Hex} h @returns {boolean} */
  equals(h) { return this.q === h.q && this.r === h.r && this.s === h.s; }

  /** @param {Hex} h @returns {Hex} */
  add(h) { return new Hex(this.q + h.q, this.r + h.r, this.s + h.s); }

  /** @param {Hex} h @returns {Hex} */
  subtract(h) { return new Hex(this.q - h.q, this.r - h.r, this.s - h.s); }

  /** @param {number} k @returns {Hex} */
  scale(k) { return new Hex(this.q * k, this.r * k, this.s * k); }

  /** @returns {number} */
  length() { return (Math.abs(this.q) + Math.abs(this.r) + Math.abs(this.s)) / 2; }

  /** @param {Hex} h @returns {number} */
  distance(h) { return this.subtract(h).length(); }

  /** @returns {string} */
  key() { return `${this.q},${this.r}`; }

  toString() { return `Hex(${this.q},${this.r},${this.s})`; }
}

/**
 * 分数キューブ座標を最近傍整数キューブ座標に丸める
 * @param {number} q @param {number} r @param {number} s @returns {Hex}
 */
function hexRound(q, r, s) {
  let qi = Math.round(q), ri = Math.round(r), si = Math.round(s);
  const dq = Math.abs(qi - q), dr = Math.abs(ri - r), ds = Math.abs(si - s);
  if (dq > dr && dq > ds)      qi = -ri - si;
  else if (dr > ds)             ri = -qi - si;
  else                          si = -qi - ri;
  return new Hex(qi, ri, si);
}

// ============================================================
// FLAT-TOP LAYOUT（列ベース、Vassal wargame標準）
// ============================================================
//
//  ┌───┐ ┌───┐
//  │1,1│ │2,1│   ← col 1(even,0-indexed=0) は標準位置
//  └───┘ └───┘   ← col 2(odd,0-indexed=1)  は dy/2 下にシフト
//   ┌───┐ ┌───┐
//   │1,2│ │2,2│
//   └───┘ └───┘
//
// 用語: col_idx/row_idx は 0-indexed, col_label/row_label は 1-indexed
// ヘックスアドレス "0409" = col_label=4, row_label=9
//                         = col_idx=3, row_idx=8
//
// 数学的性質:
//   隣接ヘックスの距離 = dy  (同列) = sqrt(dx²+(dy/2)²) ≈ dy (異列)
//   正六角形になる条件: dx = (√3/2) * dy

/** @typedef {{col: number, row: number}} Offset 0-indexed offset座標 */
/** @typedef {{x: number, y: number}} Point 画面ピクセル座標 */

class FlatTopLayout {
  /**
   * @param {object} opts
   * @param {number} opts.dx    列間隔（水平ピクセル）
   * @param {number} opts.dy    行間隔（垂直ピクセル）
   * @param {number} [opts.x0]  グリッド原点X（col_idx=0の中心X）
   * @param {number} [opts.y0]  グリッド原点Y（col_idx=0, row_idx=0の中心Y）
   */
  constructor({ dx, dy, x0 = 0, y0 = 0 }) {
    this.dx = dx; this.dy = dy; this.x0 = x0; this.y0 = y0;
    // 外接円半径: dx = (3/2)*size → size = dx*(2/3)
    this.size = dx * 2 / 3;
  }

  // ---- オフセット ↔ キューブ変換 --------------------------------

  /**
   * 0-indexed offset → Cube座標
   * odd-q方式: 奇数列(col_idx%2===1)が下にシフト
   * @param {number} col 0-indexed
   * @param {number} row 0-indexed
   * @returns {Hex}
   */
  offsetToCube(col, row) {
    const q = col;
    const r = row - (col - (col & 1)) / 2;
    return new Hex(q, r, -q - r);
  }

  /**
   * Cube座標 → 0-indexed offset
   * @param {Hex} hex
   * @returns {Offset}
   */
  cubeToOffset(hex) {
    const col = hex.q;
    const row = hex.r + (hex.q - (hex.q & 1)) / 2;
    return { col, row };
  }

  // ---- ピクセル ↔ ヘックス変換 ---------------------------------

  /**
   * 0-indexed offset → ヘックス中心ピクセル座標
   *   cx = x0 + col * dx
   *   cy = y0 + row * dy + (col%2===1 ? dy/2 : 0)
   *
   * 等価形式（キューブ座標から直接）:
   *   cx = x0 + q * dx
   *   cy = y0 + r * dy + q * dy/2   ← 両式は一致する
   * @param {number} col 0-indexed
   * @param {number} row 0-indexed
   * @returns {Point}
   */
  hexToPixel(col, row) {
    return {
      x: this.x0 + col * this.dx,
      y: this.y0 + row * this.dy + (col % 2 === 1 ? this.dy / 2 : 0),
    };
  }

  /**
   * ピクセル座標 → 最近傍ヘックス（Cube座標）
   * 分数キューブ座標経由:
   *   q_frac = (px - x0) / dx
   *   r_frac = (py - y0) / dy - q_frac / 2
   * @param {number} px @param {number} py
   * @returns {Hex}
   */
  pixelToHex(px, py) {
    const q = (px - this.x0) / this.dx;
    const r = (py - this.y0) / this.dy - q / 2;
    return hexRound(q, r, -q - r);
  }

  // ---- 隣接・範囲 -----------------------------------------------

  /** フラットトップ6方向ベクトル */
  static DIRS = [
    new Hex(1, -1, 0), new Hex(1, 0, -1),
    new Hex(0, 1, -1), new Hex(-1, 1, 0),
    new Hex(-1, 0, 1), new Hex(0, -1, 1),
  ];

  /**
   * 隣接6ヘックスのCube座標配列
   * @param {Hex} hex
   * @returns {Hex[]}
   */
  neighbors(hex) {
    return FlatTopLayout.DIRS.map(d => hex.add(d));
  }

  /**
   * 隣接ヘックスか判定
   * @param {Hex} a @param {Hex} b @returns {boolean}
   */
  isNeighbor(a, b) { return a.distance(b) === 1; }

  /**
   * 中心hexからn以内の全ヘックス
   * @param {Hex} center @param {number} n @returns {Hex[]}
   */
  range(center, n) {
    const results = [];
    for (let q = -n; q <= n; q++) {
      for (let r = Math.max(-n, -q - n); r <= Math.min(n, -q + n); r++) {
        results.push(center.add(new Hex(q, r, -q - r)));
      }
    }
    return results;
  }

  // ---- SVG描画用 -----------------------------------------------

  /**
   * ヘックスの6頂点ピクセル座標（SVGポリゴン用）
   * フラットトップ: 角度 0°, 60°, 120°, 180°, 240°, 300°
   * @param {number} col 0-indexed @param {number} row 0-indexed
   * @returns {Point[]}
   */
  hexCorners(col, row) {
    const { x, y } = this.hexToPixel(col, row);
    const s = this.size;
    return Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i;  // 0°始まり
      return { x: x + s * Math.cos(angle), y: y + s * Math.sin(angle) };
    });
  }

  /**
   * SVG polygon points属性文字列
   * @param {number} col 0-indexed @param {number} row 0-indexed
   * @returns {string}
   */
  cornersToSVG(col, row) {
    return this.hexCorners(col, row)
      .map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(' ');
  }
}

// ============================================================
// POINTY-TOP LAYOUT（行ベース）
// ============================================================
//
//  /\ /\
// /  X  \   奇数行(0-indexed)が dx/2 右にシフト
// \  |  /
//  \/ \/
//
// Vassal: sideways="true" に相当（一般的な六角形ゲームの見た目）

class PointyTopLayout {
  /**
   * @param {object} opts
   * @param {number} opts.dx    行内の隣接ヘックス水平距離
   * @param {number} opts.dy    行間の垂直距離
   * @param {number} [opts.x0]
   * @param {number} [opts.y0]
   */
  constructor({ dx, dy, x0 = 0, y0 = 0 }) {
    this.dx = dx; this.dy = dy; this.x0 = x0; this.y0 = y0;
    // 外接円半径: dx = √3 * size → size = dx/√3
    this.size = dx / Math.sqrt(3);
  }

  /**
   * 0-indexed offset → Cube（odd-r: 奇数行が右シフト）
   * @param {number} col @param {number} row @returns {Hex}
   */
  offsetToCube(col, row) {
    const q = col - (row - (row & 1)) / 2;
    const r = row;
    return new Hex(q, r, -q - r);
  }

  /** @param {Hex} hex @returns {Offset} */
  cubeToOffset(hex) {
    const col = hex.q + (hex.r - (hex.r & 1)) / 2;
    const row = hex.r;
    return { col, row };
  }

  /** @param {number} col @param {number} row @returns {Point} */
  hexToPixel(col, row) {
    return {
      x: this.x0 + col * this.dx + (row % 2 === 1 ? this.dx / 2 : 0),
      y: this.y0 + row * this.dy,
    };
  }

  /** @param {number} px @param {number} py @returns {Hex} */
  pixelToHex(px, py) {
    const r = (py - this.y0) / this.dy;
    const q = (px - this.x0 - (Math.round(r) % 2 === 1 ? this.dx / 2 : 0)) / this.dx;
    // より正確なキューブ変換
    const size = this.size;
    const qf = ((px - this.x0) * Math.sqrt(3) / 3 - (py - this.y0) / 3) / size;
    const rf = (py - this.y0) * 2 / 3 / size;
    return hexRound(qf, rf, -qf - rf);
  }

  static DIRS = [
    new Hex(1, 0, -1), new Hex(1, -1, 0),
    new Hex(0, -1, 1), new Hex(-1, 0, 1),
    new Hex(-1, 1, 0), new Hex(0, 1, -1),
  ];

  /** @param {Hex} hex @returns {Hex[]} */
  neighbors(hex) { return PointyTopLayout.DIRS.map(d => hex.add(d)); }

  /** @param {number} col @param {number} row @returns {Point[]} */
  hexCorners(col, row) {
    const { x, y } = this.hexToPixel(col, row);
    const s = this.size;
    return Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i + Math.PI / 6;  // 30°始まり
      return { x: x + s * Math.cos(angle), y: y + s * Math.sin(angle) };
    });
  }

  /** @param {number} col @param {number} row @returns {string} */
  cornersToSVG(col, row) {
    return this.hexCorners(col, row)
      .map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(' ');
  }
}

// ============================================================
// 経路探索（BFS）
// ============================================================

/**
 * BFS最短経路
 * @param {Hex} start
 * @param {Hex} goal
 * @param {(hex: Hex) => boolean} isBlocked  通過不可なら true
 * @param {(hex: Hex) => Hex[]} getNeighbors  隣接取得関数
 * @returns {Hex[] | null}  start→goalのパス、到達不可ならnull
 */
function hexBFS(start, goal, isBlocked, getNeighbors) {
  const frontier = [start];
  const cameFrom = new Map([[start.key(), null]]);

  while (frontier.length > 0) {
    const current = frontier.shift();
    if (current.equals(goal)) break;
    for (const next of getNeighbors(current)) {
      if (!cameFrom.has(next.key()) && !isBlocked(next)) {
        cameFrom.set(next.key(), current);
        frontier.push(next);
      }
    }
  }

  if (!cameFrom.has(goal.key())) return null;
  const path = [];
  let cur = goal;
  while (cur) { path.unshift(cur); cur = cameFrom.get(cur.key()); }
  return path;
}

/**
 * ダイクストラ法（地形コスト考慮の最短経路）
 * @param {Hex} start
 * @param {Hex} goal
 * @param {(from: Hex, to: Hex) => number | null} moveCost  移動コスト、null=通過不可
 * @param {(hex: Hex) => Hex[]} getNeighbors
 * @returns {{ path: Hex[], cost: number } | null}
 */
function hexDijkstra(start, goal, moveCost, getNeighbors) {
  const dist = new Map([[start.key(), 0]]);
  const prev = new Map([[start.key(), null]]);
  // 簡易優先度付きキュー（小規模マップ用）
  const queue = [{ hex: start, cost: 0 }];

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const { hex: current, cost: curCost } = queue.shift();
    if (current.equals(goal)) break;
    if (curCost > (dist.get(current.key()) ?? Infinity)) continue;

    for (const next of getNeighbors(current)) {
      const c = moveCost(current, next);
      if (c === null) continue;
      const newCost = curCost + c;
      if (newCost < (dist.get(next.key()) ?? Infinity)) {
        dist.set(next.key(), newCost);
        prev.set(next.key(), current);
        queue.push({ hex: next, cost: newCost });
      }
    }
  }

  if (!prev.has(goal.key())) return null;
  const path = [];
  let cur = goal;
  while (cur) { path.unshift(cur); cur = prev.get(cur.key()); }
  return { path, cost: dist.get(goal.key()) };
}

// ============================================================
// LOS（Line of Sight）
// ============================================================

/**
 * 2ヘックス間のヘックス直線（端点含む）
 * @param {Hex} a @param {Hex} b @returns {Hex[]}
 */
function hexLine(a, b) {
  const n = a.distance(b);
  if (n === 0) return [a];
  const results = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    results.push(hexRound(
      a.q + (b.q - a.q) * t,
      a.r + (b.r - a.r) * t,
      a.s + (b.s - a.s) * t,
    ));
  }
  return results;
}

// ============================================================
// SVG ユーティリティ
// ============================================================

/**
 * SVG名前空間で要素を生成し、属性を一括セット
 * @param {string} tag
 * @param {Record<string, string|number>} [attrs]
 * @returns {SVGElement}
 */
function makeSVGEl(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

/**
 * SVGにヘックスグリッドを描画し、ポリゴン要素のMapを返す
 *
 * @param {SVGElement} svgEl    描画先SVG要素
 * @param {FlatTopLayout|PointyTopLayout} layout
 * @param {object} opts
 * @param {number}   opts.cols          列数（ラベル 1〜cols）
 * @param {number}   opts.rows          行数（ラベル 1〜rows）
 * @param {string}   [opts.polyClass]   ポリゴンのclass属性（セットするとstroke/fillより優先）
 * @param {string}   [opts.polyStroke]  枠線色（polyClassなし時）
 * @param {string}   [opts.polyFill]    塗り色（polyClassなし時）
 * @param {boolean}  [opts.showLabels]  ラベルを表示するか（デフォルト true）
 * @param {string}   [opts.labelClass]  ラベルのclass属性
 * @param {function} [opts.labelFn]     (colLabel, rowLabel) → 表示文字列
 *                                      デフォルト: "0102" 形式
 * @param {function} [opts.attrFn]      (colLabel, rowLabel) → ポリゴン追加属性オブジェクト
 * @param {string}   [opts.groupId]     生成する<g>のid（デフォルト 'hex-grid'）
 *
 * @returns {Map<string, SVGPolygonElement>}
 *          key = labelFn(col, row)、value = ポリゴン要素
 */
function createHexGrid(svgEl, layout, opts = {}) {
  const {
    cols,
    rows,
    polyClass   = null,
    polyStroke  = '#00cc66',
    polyFill    = 'none',
    showLabels  = true,
    labelClass  = null,
    labelFn     = (c, r) => `${String(c).padStart(2, '0')}${String(r).padStart(2, '0')}`,
    attrFn      = null,
    groupId     = 'hex-grid',
  } = opts;

  const g = makeSVGEl('g', { id: groupId });
  /** @type {Map<string, SVGPolygonElement>} */
  const polyMap = new Map();

  for (let cl = 1; cl <= cols; cl++) {
    for (let rl = 1; rl <= rows; rl++) {
      const col = cl - 1, row = rl - 1;   // 0-indexed → layout に渡す
      const label = labelFn(cl, rl);

      // ---- ポリゴン ----
      const polyAttrs = {
        points: layout.cornersToSVG(col, row),
        'data-col': cl,
        'data-row': rl,
      };
      if (polyClass) {
        polyAttrs.class = polyClass;
      } else {
        polyAttrs.fill           = polyFill;
        polyAttrs.stroke         = polyStroke;
        polyAttrs['stroke-width'] = '1.5';
        polyAttrs.opacity        = '0.4';
      }
      if (attrFn) Object.assign(polyAttrs, attrFn(cl, rl));

      const poly = makeSVGEl('polygon', polyAttrs);
      g.appendChild(poly);
      polyMap.set(label, poly);

      // ---- ラベル ----
      if (showLabels) {
        const { x, y } = layout.hexToPixel(col, row);
        const lblAttrs = {
          x,
          y: y + 1,
          'text-anchor': 'middle',
          'dominant-baseline': 'middle',
          'font-size': '10',
          'pointer-events': 'none',
          'user-select': 'none',
        };
        if (labelClass) {
          lblAttrs.class = labelClass;
        } else {
          lblAttrs.fill    = polyStroke;
          lblAttrs.opacity = '0.5';
        }
        const lbl = makeSVGEl('text', lblAttrs);
        lbl.textContent = label;
        g.appendChild(lbl);
      }
    }
  }

  svgEl.appendChild(g);
  return polyMap;
}

// ============================================================
// Export（モジュール環境とブラウザ直接読み込み両対応）
// ============================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Hex, hexRound, hexLine,
    FlatTopLayout, PointyTopLayout,
    hexBFS, hexDijkstra,
    makeSVGEl, createHexGrid,
  };
}
