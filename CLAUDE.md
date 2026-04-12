# Vive l'Empereur - Web App 実装仕様書

## プロジェクト概要

Hermann Luttmann作のソロウォーゲーム「Vive l'Empereur 2nd Edition」（Blue Panther LLC）のWebアプリ実装。

**目的：**
- フランス軍（プレイヤー操作）vs 連合軍・プロイセン軍（自動判定）のソロゲームを正確に再現する
- 敵ユニットの行動判定（移動・攻撃目標の選定）を自動化してミスを防ぐ
- チットプルシステムをデジタルで再現する

---

## 技術方針

### ヘックスグリッド
- **座標系：Cube座標（推奨）**
  - x + y + z = 0 の制約で全計算が一貫する
  - 隣接・距離・移動範囲が数式一発で解決
- **向き：Pointy-top（とがった頂点が上）**
  - Vassalモジュールの `sideways="false"` で確定
- **参考実装：redblobgames.com**
  - https://www.redblobgames.com/grids/hexagons/
  - ライブラリではなくコードを直接取り込む方針
  - 外部依存を増やさず、カスタマイズしやすい

### Vassalモジュールから取得したグリッド実測値

Vassalの `buildFile.xml` より抽出。SVGオーバーレイを合わせる際にそのまま使用する。

```
マップ画像ファイル名： vive-lempereur map v2.png
ヘックス横幅（列間隔）： dx = 109.2 px
ヘックス縦幅（行間隔）： dy = 125.3 px
グリッド原点オフセット： x0 = -2 px, y0 = -14 px
向き：                   Pointy-top（sideways = false）
```

**ヘックス番号体系（Vassalの HexGridNumbering より）：**
- 列が先、行が後（例：列01・行04 → `0104`）
- 列・行ともに数字（`hType="N"`, `vType="N"`）
- 先頭ゼロあり（`hLeading="1"`, `vLeading="1"`）
- 列は左から昇順（`hDescend="false"`）
- 行は上から昇順（`vDescend="false"`）

**SVGオーバーレイの実装メモ：**
- マップ画像をそのまま `<img>` タグで背景として使用
- SVGを絶対位置で重ねてヘックスグリッドを描画
- dx/dy/x0/y0 の値を使えばヘックス中心座標を正確に計算可能
- ヘックス中心座標の計算式（Pointy-top, odd-q offset座標）：
  ```
  px = x0 + col * dx
  py = y0 + row * dy + (col % 2 == 1 ? dy/2 : 0)
  ```
  ※ dx=列間隔、dy=行間隔。奇数列（col % 2 == 1）が縦に dy/2 オフセット。
  ※ 最初の公式（行と列が逆）は誤りだったので修正済み。

### マップ描画方針
- ボード画像（`vive-lempereur map v2.png`）を背景として使用し、SVGでヘックスグリッドをオーバーレイする方式
- 地形データはJSONで管理

### スタックルール
- **基本：1ヘックスに1ユニット**
- スモールユニット（アスタリスク付き）のみ2ユニットまでスタック可
- 城壁建物ヘックスはスモールユニット同士のみスタック可

---

## ゲーム構造

### ターン構造（全12ターン、1ターン≒1時間）
1. Advance Game Turn Marker Phase
2. Draw Activation Marker Phase
3. Activation Phase
4. End Phase

### チットプルシステム
コンテナ（袋）からActivation Markerをランダムに引く。

**マーカー種別：**
| 種別 | 処理 |
|------|------|
| French Corps Activation | プレイヤーがそのコープスのユニットを操作 |
| Anglo-Allied Corps Activation | テーブルをロールして自動判定 |
| Prussian Corps Activation | テーブルをロールして自動判定 |
| Napoleon Commander | 保持してタイミングを選んで使用 |
| Wellington Commander | Old Nosey Tableをロール |
| Blücher Commander | Alte Vorwarts Tableをロール |

**Napoleon Has Humbugged Me, By God!：**
Frenchコープスマーカーを1枚保持可（Napoleonマーカーに加えて）。

---

## ユニット情報

### 軍別カラー
| 色 | 国籍 |
|----|------|
| ライトブルー | フランス |
| ライトレッド | 連合軍（Anglo-Allied） |
| グレー | プロイセン |

### ユニットステータス
各ユニットが持つ値：
- **SP（Strength Points）**：赤い数字。近接戦闘で使用
- **AF（Artillery Factor）**：黒い数字。砲撃戦闘で使用
- **ER（Elan Rating）**：緑の数字。モラル・品質の指標

### ER値の意味
| ER | レベル |
|----|--------|
| 6 | Elite |
| 5 | Veteran |
| 4 | Regulars |
| 3 | Green |
| 2 | Landwehr |

### ユニット状態管理（ステップロス）
```
Fresh（表面）
  ↓ 1st Hit: Shakenマーカーを配置（ER -1）
  ↓ 2nd Hit: Disruptedマーカーを配置（SP/AF/ER全て -1）
  ↓ 3rd Hit: Battleworn面に裏返し、マーカーを除去 → Panic Testを実施
Battleworn（裏面）
  ↓ 4th Hit: Shakenマーカーを配置
  ↓ 5th Hit: Disruptedマーカーを配置
  ↓ 6th Hit+: 2ヘックス後退（撤退できなければ消滅）
```

**Panic Test（3rd Hit時）：** Elan Testを実施。失敗で1ヘックス後退。

**Battleworn面には戻らない（Fresh面への回復不可）。**

### 各種テスト
- **Elan Test：** ダイスを振りER以下なら成功、超えたら失敗
  - ER6のユニットは6が出たら再ロール、4-6で失敗
- **Panic Test：** Battlewornに裏返した直後にElan Testを実施

---

## 移動ルール

### 移動力
| ユニットタイプ | MA |
|--------------|-----|
| Infantry / Artillery | 2ヘックス |
| Heavy Cavalry (HC) | 3ヘックス |
| Light Cavalry (LC) | 4ヘックス |

### 移動修正
- **Forced March：** +1ヘックス、Elan Test実施。失敗で1 Hit
- **Difficult Terrain（難地形）：** Woods/Buildings/Walled Buildingsに入ると停止（道路経由を除く）
- **Enemy Threat：** 敵ユニットに隣接するヘックスに入ると停止
- **Slowing Terrain（登り）：** FlatからRidgeへの移動は2ヘックス消費
- **River：** 道路（橋）以外での河川越えは不可
- **道路：** Difficult/Slowing/Prohibitive地形のペナルティを無効化（Enemy Threatは除く）

### Prussian Zone Restriction
最初のプロイセンユニットが登場するまで、フランスユニットは19xxおよび20xxヘックスに進入不可。

---

## 砲撃戦闘（Bombardment Combat）

### 射程
- Heavy Artillery: 4ヘックス
- その他全ユニット: 3ヘックス

### Line of Sight（LOS）
射撃ヘックス中心から目標ヘックス中心へ想像線を引く。以下の場合にLOS遮断：
- 射撃・目標両方がFlatで、間にRidgeヘックスがある
- 同一高度で間にWoods/Buildings/Walled Buildingsがある
- ヘックスサイド上を通る場合、どちらかが遮蔽地形なら遮断

### ダイス数（基本値 = AF）
加算条件：
- **Plunging Fire：** +1（射撃側がRidge、目標がFlat）
- **Canister（Point Blank）：** +1（隣接目標、Desultory Fireには適用不可）
- **Target in Square：** +1（目標がClearヘックスのInfantryで敵Cavalryに隣接）
- **Desultory Fire：** ダイス数を半分（切り上げ）、Close to Contact Test失敗時

### 目標数（Target Number）
| 地形 | 目標数 |
|------|--------|
| Clear | 4 |
| Woods / Buildings | 5 |
| Walled Buildings | 6 |
| Detachmentユニット（城壁建物） | 6（成功には6が2個必要） |

目標がCavalryの場合、目標数を-1。

### 解決
- 各ダイス > 目標数：Success
- 各ダイス = 目標数：Partial（2個で1 Success）
- **砲撃の最大適用Hit数：1 Hit**（複数Successでも1 Hitのみ）

---

## 近接戦闘（Close Combat）

### 前提
- Infantry：攻撃開始時に目標と隣接している必要がある
- Cavalry：最大2ヘックス離れていてもOK（LOS必要）

### Close to Contact Test
攻撃ユニットがElan Testを実施。
- 失敗：攻撃不可。Infantryのみ目標にDesultory Fire可能
- 成功：目標ヘックスに移動して戦闘
- ER比-2以上の大差で成功：**Confident**ボーナス

### Cavalry Withdrawal
フランスCavalryがInfantryに攻撃される場合、Close to Contact Testの前に降参して1-2ヘックス後退可能（ダイス不要、Infantryの勝利）。

### ダイス数
- **攻撃側：** SP値のダイス数
- **防御側：** SP + AF のダイス数

### 加算条件
- **Confident（攻撃側）：** +1ダイス
- **Enfilade（攻撃側）：** +1ダイス/隣接友軍（最大2）
- **Downhill Fire（防御側）：** +1ダイス（防御側がRidge、攻撃側がFlat）

### 目標数（Target Number）= 相手のER
防御側ERの調整：
- **Cover：** +1（Woods/Buildingsヘックス）
- **Heavy Cover：** +2（Walled BuildingsのDetachmentユニット）
- **River Barrier：** +1（攻撃側が河川越え）

### 解決
- 各ダイス > 相手ER：Success
- 各ダイス = 相手ER：Partial（2個で1 Success）
- **近接戦闘の最大適用Hit数：3 Hit**
- 多くのSuccessを得た側が勝利（同数なら防御側勝利）
- **敗者：2ヘックス後退**

### Cavalry Charge特有ルール
- Cavalry → Infantry：**Form Square Test**（Infantry側がElan Test）
  - 成功：InfantryのER +2
  - 失敗：InfantryのER -2
- Heavy Cavalry攻撃：+2ダイス
- Cavalry攻撃 vs Artillery：目標側のER -1
- **Blown Horses：** 戦闘解決後に攻撃Cavalryが1 Hit（勝敗判定には影響しない）

---

## 後退（Retreat）

### 基本ルール
- 後退原因から距離を離す方向へ移動
- 敵ユニットを通過・終了位置に他ユニット（オーバースタック）不可
- 同じヘックスを2回通過不可（できなければ停止＋未後退ヘックス数分のHit）

### 後退方向
- フランス：南
- 連合軍：北・北西
- プロイセン：北・北東

### 敵隣接ペナルティ
後退中に敵隣接ヘックスを通過したとき1 Hit（友軍がそのヘックスにいる場合は免除）。

### マップ外後退：ユニット消滅

---

## Rally（回復）

- マーカーを1段階回復：Disrupted→Shaken、Shaken→除去
- Battleworn面からFresh面への回復は**不可**
- 消滅ユニットはRallyできない

---

## 敵自動判定ロジック

### Anglo-Allied / Prussian Corps Activation Table
2ダイスで11-66を生成し、以下の結果を参照：

| ロール | 結果 | 処理概要 |
|--------|------|---------|
| 11-23 | Open Fire at Nearest Target | 射程・LOS内の最近フランスユニットに砲撃。Road to Brussels VP hex隣接のフランスユニット優先 |
| 24-33 | Open Fire at Largest Target | 射程・LOS内の最大SPフランスユニットに砲撃。Road to Brussels VP hex隣接のフランスユニット優先 |
| 34-42 | Advance | ユニットタイプ別に最近フランスユニットに接近・攻撃 |
| 43-53 | Rally Around the Colors | HitありユニットをRally（隣接敵がいれば1ヘックス後退してから）。未損傷ユニットはVP hex最近のフランスユニットに砲撃 |
| 54-63 | Reinforce/Recapture | French Controlまたは隣接のVP hexを防衛・奪還。4ヘックス以内のVP hexが対象 |
| 64-66 | A Bad Day for Napoleon | Napoleonマーカーを1枚除去 |

**詳細（Advance: 34-42）：**
- Anglo-Allied Infantry：最近フランスに接近。2ヘックス離れていれば砲撃。隣接していれば相手がBattlewornなら近接攻撃、そうでなければ砲撃
- Anglo-Allied Cavalry：最近フランスに2ヘックスまで接近。2ヘックス以内なら突撃（可能なら）
- Prussian Infantry：最近フランスに接近。2ヘックスなら砲撃。隣接なら近接攻撃
- Prussian Cavalry：最近フランスに2ヘックスまで接近。2ヘックス以内かつBattlewornなら突撃
- Artillery（全軍）：射程・LOS内に入るまで接近。既に射程内なら最近フランスユニットに砲撃

**詳細（Reinforce/Recapture: 54-63）：**
Road to Brussels VP hexにフランスユニットが進入・隣接した場合、連合軍はそのVP hexを最優先で対応（距離4ヘックス制限を無視）。

### Target Priority（優先順位）
複数対象が存在する場合：
1. 最近のフランスユニット（絶対ヘックス数、地形コスト無視）
2. 最大SPのフランスユニット
3. 最小ERのフランスユニット
4. 最多Hitのフランスユニット
5. プレイヤーの選択

### 移動ヘックス選択優先順位
複数の合法ヘックスがある場合：
1. 敵に隣接しないヘックス
2. 道路ヘックス
3. 高低差変化なしのヘックス
4. Clearヘックス（最終ヘックスを除く）。最終ヘックスはRidge/Forest/Buildings/Walled Buildingが理想
5. 他ユニットが占有していないヘックス
6. プレイヤーの選択

---

## Wellington（Old Nosey Table）

**引いたとき：**
1. 最多HitのAnglo-Allied（Detachment除く）ユニットをRally（同数ならER最高、さらに同数ならプレイヤー選択）
2. 2ダイスロール（11-66）→ 結果は当該ターン終了まで有効

| ロール | 結果 | 処理 |
|--------|------|------|
| 11-26 | Reverse Slope Deployment | Ridgeヘックスの連合軍Infantry/Cavalryへの砲撃の目標数が自動的に「5」になる |
| 31-43 | The Thin Red Line | British Infantry全部隊（DetachmentのHougoumont/La Haye Sainteを含む）のSPとERを+1 |
| 44-53 | Now Maitland, Now's Your Time! | フランスユニットに隣接するBritish Infantry/Cavalryが即座に近接攻撃。Close to Contact Test成功で+2ダイス |
| 54-63 | Scum of the Earth | British Infantry全部隊（Detachment含む）のERを-1 |
| 64-66 | A Bad Day for Napoleon | Napoleonマーカーを1枚除去 |

---

## Blücher（Alte Vorwarts Table）

**引いたとき：**
1. TRT上の全Prussian Activation Markerを1マス前に進める。Game Turn Markerと同じマスに入ったらそのコープスを展開
2. 最多HitのPrussianユニットをRally
3. 2ダイスロール（11-66）→ 結果を参照

| ロール | 結果 | 処理 |
|--------|------|------|
| 11-33 | Revenge! | 隣接Prussian InfantryはClose to Contact Test +1ERで近接攻撃。2ヘックス以内のPrussian CavalryはClose to Contact Test +1ERで突撃。その他は最近フランスユニットに砲撃（不可なら1ヘックス接近） |
| 34-52 | Forward for the Fatherland! | 全Prussianユニットが最近フランスユニットに接近。隣接するなら砲撃。各TRT上のPrussian Activation Markerをダイスロール（1=+1マス遅延、2-3=変化なし、4-6=1マス前進） |
| 53-63 | Ligny Demoralization | I/II Corpsの非BattlewornフランスユニットにI/II Corps隣接PrussianがElan Test。失敗で1ヘックス後退 |
| 64-66 | A Bad Day for Napoleon | Napoleonマーカーを1枚除去 |

---

## Napoleon（Le Petit Caporal Table）

2枚のNapoleonマーカーが存在。引いたとき保持し、任意のタイミングで使用。ターン終了時に未使用でもカップに戻す。

以下から1つを選択：

| アクション | 効果 |
|-----------|------|
| Pas de Charge! | French Corps Activation中に使用。各アクティブユニットが1ヘックス（非禁止地形）無料移動＋別のUnit Actionを実行。移動の場合はMAを+1ヘックス無料延長（Forced Marchではない） |
| The Sun of Austerlitz! | 任意ヘックスを選択。そのヘックス内・隣接で敵非隣接の最大3ユニットをSpecial Rally（Shaken/Disrupted問わずマーカーを除去） |
| Vive L'Empereur! | Elan TestかPanic Test前に任意ユニットのERを+2（そのテストのみ） |
| Beautiful Daughters Grand Battery! | 1-2枚のHeavy Artilleryが入るヘックスを指定。そのユニットのみで砲撃戦闘を実施 |
| The Bearskins! | OGユニット（Battlewornでない）に隣接する全敵ユニットがElan Test。失敗で1ヘックス後退（Detachment除く） |

---

## Detachment Units

3つの城壁建物ヘックスに配置されるガリソン：
- Hougoumont（0409）：6VPのWalled Building
- La Haye Sainte（1007）：4VPのWalled Building
- Papelotte/La Haye（1607）：2VPのWalled Building

**Detachment Activationマーカーが引かれたとき：**
- Hougoumont：隣接する最大SPフランスユニットがElan Test。失敗で1 Hit。隣接フランスなければDetachmentがRally
- La Haye Sainte：同上
- Papelotte：隣接フランスがいなければRally。いれば何もしない

**Detachmentユニットの特殊ルール：**
- 移動・砲撃・近接攻撃は行わない
- 後退の代わりにElan Test（失敗で追加1 Hit）
- 消滅するがFlip/Retreatはしない

---

## プロイセン軍到着

### デフォルトスケジュール（TRT配置）
| ターン | コープス |
|--------|---------|
| 10 | Bulow（IV Corps）→ ヘックス2011 |
| 11 | Pirch I（II Corps）→ ヘックス2009 |
| 12 | Ziethen（I Corps）→ ヘックス2003 |

### 到着時の処理
1. Cavalry unitを指定エントリーヘックスに配置→道路に沿ってMA分移動（BulowとPirch IはPlancenoit最近ヘックスへ、ZiethenはPapelotteへ）
2. Infantry unitを同様に処理
3. エントリーヘックスが満杯になるまで繰り返す

---

## 勝利条件

### VP計算
ゲーム終了時（ターン12終了後）にFrench Controlの各VPヘックスで集計。

| VP | タイプ | ヘックス |
|----|--------|---------|
| +6 | WB | Hougoumont（0409） |
| +5 | ALOC | Merbe-Braine（0204） |
| +5 | ALOC | Mont St. Jean（0802） |
| +4 | WB | La Haye Sainte（1007） |
| +3 | ALOC | Mont St. Jean Farm（0903） |
| +3 | ALOC | Road to Hal（0104） |
| +3/hex | ALOC | Road to Brussels（0301/0401/0701/0901/1401） |
| +2 | WB | Papelotte（1607） |
| +1/hex | Building | Plancenoit（1412/1413/1512） |
| -4 | FLOC | La Belle Alliance（1110） |
| -6 | FLOC | Rossomme（1015） |

### ユニット損害VP
| VP | 条件 |
|----|------|
| +2 | Britishの大型Infantryユニット消滅（1体につき） |
| -3 | OGユニットがBattleworn（1体につき） |
| -2 | YGユニットがBattleworn（1体につき） |
| -1 | Imperial Guard Artillery/CavalryがBattleworn（1体につき） |

### 勝利レベル
| 合計VP | 結果 |
|--------|------|
| 0-3 | Catastrophe（歴史的結果） |
| 4-7 | Major Defeat |
| 8-11 | Minor Defeat |
| 12-15 | Standstill |
| 16-19 | Minor Victory |
| 20-23 | Major Victory |
| 24-27 | Decisive Victory |
| 28+ | War-Winning Victory |

---

## 初期配置

### 連合軍
**I Corps（Prince of Orange）：**
0104 Chasse、0607 Cooke、0706 Kielmansegge、0806 Alten、1106 Bylandt、1606 Saxe-Weimar

**II Corps（Hill）：**
0304 Halkett、0306 Mitchell、0407 Clinton

**RC（Wellington）：**
0603 1/Brunswick、0603 2/Brunswick、0705 Kruse、0707 1/Reserve、0906 2/Reserve、1206 Picton、1306 Lambert、1406 Vincke

**CC（Uxbridge）：**
0606 Right Flank、0805 Somerset、0903 1/Netherland、0903 2/Netherland、0904 H.A. Reserve、1104 Ponsonby、1304 Vandeleur、1605 Vivian

**Detachments：**
0409 Hougoumont、1007 La Haye Sainte、1607 Papelotte

### フランス軍（南側、連合軍非隣接条件）
| コープス | 展開位置 |
|---------|---------|
| I Corps（D'Erlon） | 1309から3ヘックス以内 |
| II Corps（Reille） | 0611から3ヘックス以内 |
| VI Corps（Lobau） | 1111から1ヘックス以内 |
| III Cav Corps（Kellerman） | 0511から2ヘックス以内 |
| IV Cav Corps（Milhaud） | 1411から2ヘックス以内 |
| IG（Drouot）Guyot | 0512から2ヘックス以内 |
| IG（Drouot）Lefeb-Desnou | 1511から2ヘックス以内 |
| IG（Drouot）その他 | 1013から1ヘックス以内 |

---

## 実装優先順位

1. ✅ **ヘックスグリッド描画**（Pointy-top、Cube座標、SVGオーバーレイ）
   - `hex-lib.js`：FlatTopLayout / PointyTopLayout、BFS・Dijkstra・LOS、SVGグリッド生成
   - `index.html`：マップ画像 + SVGオーバーレイ、パン＆ズーム、駒クリック移動プロトタイプ
2. **ユニット配置・表示**（両面、マーカー付き）
3. ✅ **チットプルシステム**（マーカー管理、ランダム抽選）
   - `chit-pull.js`：`ChitPullSystem` クラス
     - カップ管理（15枚初期：仏×6、連合×5、Napoleon×2、Wellington、Blücher）
     - プロイセン3コープスはTRT待ち（ターン10/11/12に自動追加）
     - Napoleon自動保持（最大2枚）、Humbugged（フランス1枚保持）
     - `endTurn()` で全保持マーカーをカップに戻し次ターンへ
   - 連合軍・プロイセン共通テーブル（11-66、6結果）
   - Wellington Old Nosey Table / Blücher Alte Vorwarts Table
   - Napoleon Le Petit Caporal Table（5択アクション）
   - UIパネル（右サイド折り畳み可）：カップ残り・内訳・現在マーカー・保持中・TRTスケジュール・解決済み・ログ
   - ダイスロールモーダル（結果＋説明自動表示）、Napoleon選択モーダル
4. **移動ルール**（地形コスト、Enemy Threat、Slowing Terrain）
5. **砲撃戦闘解決**（射程・LOS計算、ダイス判定）
6. **近接戦闘解決**（各種ボーナス・修正の適用）
7. **敵自動判定ロジック**（Target Priority計算が核心）
8. **Wellington/Blücher/Napoleon処理**
9. **ステップロス・Panic Test・Rally**
10. **VP計算・勝利判定**

---

## 注意事項・実装上のポイント

- **「nearest」の定義：** 絶対ヘックス数（地形コスト無視）で計算
- **Combined Fire：** 隣接または同ヘックスの2ユニットが同目標に砲撃するとき、ダイスを合算できる
- **Desultory Fire：** 半分（切り上げ）。Point Blankボーナスは適用しない
- **Walled Buildings（城壁建物）：** Detachmentは6で2個の成功が必要（「6/5*」の表記）
- **ER修正の上下限：** 修正後ERは最大6、最低1
- **Close Combat最大Hit：** 3Hit（超過分は勝敗判定に使うが適用はしない）
- **Bombardment最大Hit：** 1Hit（複数Successでも1Hitのみ）
- **「A Rainy Start」：** ターン1で5-6が出るまでゲーム開始しない（+1修正が毎ターン加算）

---

*ルールブック：Vive l'Empereur 2nd Edition（Blue Panther LLC、2024年改訂）*
*Designer: Hermann Luttmann / 2024 Rules Revisions: Jonathan Warshay*
