// ============================================================
// ゲーム状態 — ユニット配列
// ============================================================

const units = [
  // I Corps (Prince of Orange)
  { id: 'chasse_I',         col:  1, row: 4,  type: 'infantry',  army: 'allied',   small: false, imageHref: 'images/chasse_I_front.png',                sp: 4, af: 1, er: 4, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'cooke_I',          col:  6, row: 7,  type: 'infantry',  army: 'allied',   small: false, imageHref: 'images/cooke_I_front.png',                 sp: 5, af: 1, er: 5, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'kielmansegge_I',   col:  7, row: 6,  type: 'infantry',  army: 'allied',   small: false, imageHref: 'images/kielmansegge_I_front.png',          sp: 4, af: 1, er: 4, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'alten_I',          col:  8, row: 6,  type: 'infantry',  army: 'allied',   small: false, imageHref: 'images/alten_I_front.png',                 sp: 4, af: 1, er: 5, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'bylandt_I',        col: 11, row: 6,  type: 'infantry',  army: 'allied',   small: false, imageHref: 'images/bylandt_I_front.png',               sp: 3, af: 1, er: 3, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'saxeweimar_I',     col: 16, row: 6,  type: 'infantry',  army: 'allied',   small: false, imageHref: 'images/saxe-weimar_I_front.png',           sp: 3, af: 0, er: 3, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  // II Corps (Hill)
  { id: 'halkett_II',       col:  3, row: 4,  type: 'infantry',  army: 'allied',   small: false, imageHref: 'images/halkett_II_front.png',              sp: 4, af: 1, er: 4, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'mitchell_II',      col:  3, row: 6,  type: 'infantry',  army: 'allied',   small: false, imageHref: 'images/mitchell_II_front.png',             sp: 4, af: 1, er: 4, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'clinton_II',       col:  4, row: 7,  type: 'infantry',  army: 'allied',   small: false, imageHref: 'images/clinton_II_front.png',              sp: 4, af: 1, er: 5, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  // RC (Wellington)
  { id: '1brunswick_RC',    col:  6, row: 3,  type: 'infantry',  army: 'allied',   small: true,  imageHref: 'images/1_brunswick_RC_front.png',          sp: 3, af: 0, er: 3, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: '2brunswick_RC',    col:  6, row: 3,  type: 'infantry',  army: 'allied',   small: true,  imageHref: 'images/2_brunswick_RC_front.png',          sp: 3, af: 0, er: 3, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'kruse_RC',         col:  7, row: 5,  type: 'infantry',  army: 'allied',   small: false, imageHref: 'images/kruse_RC_front.png',                sp: 3, af: 0, er: 3, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: '1reserve_RC',      col:  7, row: 7,  type: 'infantry',  army: 'allied',   small: false, imageHref: 'images/1_reserve_RC_front.png',            sp: 4, af: 1, er: 4, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: '2reserve_RC',      col:  9, row: 6,  type: 'infantry',  army: 'allied',   small: false, imageHref: 'images/2_reserve_RC_front.png',            sp: 4, af: 1, er: 4, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'picton_RC',        col: 12, row: 6,  type: 'infantry',  army: 'allied',   small: false, imageHref: 'images/picton_RC_front.png',               sp: 5, af: 1, er: 5, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'lambert_RC',       col: 13, row: 6,  type: 'infantry',  army: 'allied',   small: false, imageHref: 'images/lambert_RC_front.png',              sp: 4, af: 1, er: 4, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'vincke_RC',        col: 14, row: 6,  type: 'infantry',  army: 'allied',   small: false, imageHref: 'images/vincke_RC_front.png',               sp: 3, af: 0, er: 4, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  // CC (Uxbridge)
  { id: 'rightflank_CC',    col:  6, row: 6,  type: 'LC',        army: 'allied',   small: false, imageHref: 'images/right_flank_CC_front.png',          sp: 2, af: 0, er: 4, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'somerset_CC',      col:  8, row: 5,  type: 'HC',        army: 'allied',   small: false, imageHref: 'images/somerset_CC_front.png',             sp: 4, af: 0, er: 5, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: '1netherland_CC',   col:  9, row: 3,  type: 'LC',        army: 'allied',   small: true,  imageHref: 'images/1_netherland_CC_front.png',         sp: 2, af: 0, er: 3, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: '2netherland_CC',   col:  9, row: 3,  type: 'LC',        army: 'allied',   small: true,  imageHref: 'images/2_netherland_CC_front.png',         sp: 2, af: 0, er: 3, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'ha_reserve_CC',    col:  9, row: 4,  type: 'artillery', army: 'allied',   small: false, imageHref: 'images/horse_art_R_CC_front.png',          sp: 0, af: 2, er: 4, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'ponsonby_CC',      col: 11, row: 4,  type: 'HC',        army: 'allied',   small: false, imageHref: 'images/ponsonby_CC_front.png',             sp: 4, af: 0, er: 5, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'vandeleur_CC',     col: 13, row: 4,  type: 'LC',        army: 'allied',   small: false, imageHref: 'images/vandeleur_CC_front.png',            sp: 2, af: 0, er: 4, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'vivian_CC',        col: 16, row: 5,  type: 'LC',        army: 'allied',   small: false, imageHref: 'images/vivian_CC_front.png',               sp: 2, af: 0, er: 4, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  // Detachments
  { id: 'hougoumont_det',   col:  4, row: 9,  type: 'infantry',  army: 'allied',   small: true,  imageHref: 'images/hougoumount_detachment_front.png',  sp: 2, af: 0, er: 5, hits: 0, battleworn: false, isHeavyArtillery: false, isDetachment: true, acted: false },
  { id: 'lahayesainte_det', col: 10, row: 7,  type: 'infantry',  army: 'allied',   small: true,  imageHref: 'images/la_haye_sainte_detachment_front.png', sp: 2, af: 0, er: 5, hits: 0, battleworn: false, isHeavyArtillery: false, isDetachment: true, acted: false },
  { id: 'papelotte_det',    col: 16, row: 7,  type: 'infantry',  army: 'allied',   small: true,  imageHref: 'images/papelotte_detachment_front.png',    sp: 1, af: 0, er: 3, hits: 0, battleworn: false, isHeavyArtillery: false, isDetachment: true, acted: false },

  // ============================================================
  // フランス軍
  // ============================================================
  // I Corps (D'Erlon)
  { id: 'quiot_I',        col: 13, row:  9, type: 'infantry',  army: 'french', small: false, corps: 'I',    imageHref: 'images/quiot_I_front.png',       sp: 4, af: 2, er: 4, bwSP: 3, bwAF: 1, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'donzelot_I',     col: 14, row:  9, type: 'infantry',  army: 'french', small: false, corps: 'I',    imageHref: 'images/donzelot_I_front.png',    sp: 5, af: 2, er: 4, bwSP: 3, bwAF: 1, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'marcognet_I',    col: 13, row: 10, type: 'infantry',  army: 'french', small: false, corps: 'I',    imageHref: 'images/marcognet_I_front.png',   sp: 4, af: 2, er: 4, bwSP: 3, bwAF: 1, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'durutte_I',      col: 14, row: 10, type: 'infantry',  army: 'french', small: false, corps: 'I',    imageHref: 'images/durutte_I_front.png',     sp: 4, af: 2, er: 4, bwSP: 3, bwAF: 1, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'jaquinot_I',     col: 13, row: 11, type: 'LC',        army: 'french', small: false, corps: 'I',    imageHref: 'images/jaquinot_I_front.png',    sp: 3, af: 1, er: 5, bwSP: 2, bwAF: 1, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'deSalles_I',     col: 12, row:  9, type: 'artillery', army: 'french', small: false, corps: 'I',    imageHref: 'images/deSalles_I_front.png',    sp: 1, af: 4, er: 4, bwSP: 1, bwAF: 3, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: true,  acted: false },
  // II Corps (Reille)
  { id: 'foy_II',         col:  6, row: 11, type: 'infantry',  army: 'french', small: false, corps: 'II',   imageHref: 'images/foy_II_front.png',        sp: 5, af: 2, er: 4, bwSP: 3, bwAF: 1, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'bachelu_II',     col:  6, row: 12, type: 'infantry',  army: 'french', small: false, corps: 'II',   imageHref: 'images/bachelu_II_front.png',    sp: 4, af: 2, er: 4, bwSP: 3, bwAF: 1, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'jerome_II',      col:  7, row: 11, type: 'infantry',  army: 'french', small: false, corps: 'II',   imageHref: 'images/jerome_II_front.png',     sp: 7, af: 2, er: 4, bwSP: 5, bwAF: 1, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'pire_II',        col:  7, row: 12, type: 'LC',        army: 'french', small: false, corps: 'II',   imageHref: 'images/pire_II_front.png',       sp: 3, af: 1, er: 5, bwSP: 2, bwAF: 1, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'pellitier_II',   col:  6, row: 13, type: 'artillery', army: 'french', small: false, corps: 'II',   imageHref: 'images/pellitier_II_front.png',  sp: 1, af: 4, er: 4, bwSP: 1, bwAF: 3, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: true,  acted: false },
  // VI Corps (Lobau)
  { id: 'jeanin_VI',      col: 11, row: 11, type: 'infantry',  army: 'french', small: false, corps: 'VI',   imageHref: 'images/jeanin_VI_front.png',     sp: 3, af: 2, er: 4, bwSP: 2, bwAF: 1, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'simmer_VI',      col: 11, row: 12, type: 'infantry',  army: 'french', small: false, corps: 'VI',   imageHref: 'images/simmer_VI_front.png',     sp: 4, af: 2, er: 4, bwSP: 3, bwAF: 1, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'domon_VI',       col: 10, row: 12, type: 'LC',        army: 'french', small: false, corps: 'VI',   imageHref: 'images/domon_VI_front.png',      sp: 2, af: 1, er: 5, bwSP: 1, bwAF: 1, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'subervie_VI',    col: 12, row: 12, type: 'LC',        army: 'french', small: false, corps: 'VI',   imageHref: 'images/subervie_VI_front.png',   sp: 2, af: 1, er: 5, bwSP: 1, bwAF: 1, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'noury_VI',       col: 11, row: 13, type: 'artillery', army: 'french', small: false, corps: 'VI',   imageHref: 'images/noury_VI_front.png',      sp: 1, af: 4, er: 4, bwSP: 1, bwAF: 3, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: true,  acted: false },
  // III Cav Corps (Kellerman)
  { id: 'lheritier_IIIC', col:  5, row: 11, type: 'HC',        army: 'french', small: false, corps: 'IIIC', imageHref: 'images/lheritier_IIIC_front.png', sp: 3, af: 1, er: 5, bwSP: 2, bwAF: 1, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'dhurbal_IIIC',   col:  4, row: 11, type: 'HC',        army: 'french', small: false, corps: 'IIIC', imageHref: 'images/dhurbal_IIIC_front.png',  sp: 3, af: 1, er: 5, bwSP: 2, bwAF: 1, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'chastel_IIIC',   col:  5, row: 12, type: 'LC',        army: 'french', small: false, corps: 'IIIC', imageHref: 'images/chastel_IIC_front.png',   sp: 2, af: 1, er: 5, bwSP: 1, bwAF: 1, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'strolz_IIIC',    col:  4, row: 12, type: 'LC',        army: 'french', small: false, corps: 'IIIC', imageHref: 'images/strolz_IIC_front.png',    sp: 3, af: 1, er: 5, bwSP: 2, bwAF: 1, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  // IV Cav Corps (Milhaud)
  { id: 'delort_IVC',     col: 14, row: 11, type: 'HC',        army: 'french', small: false, corps: 'IVC',  imageHref: 'images/delort_IVC_front.png',    sp: 3, af: 1, er: 5, bwSP: 2, bwAF: 1, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  { id: 'wathier_IVC',    col: 15, row: 11, type: 'HC',        army: 'french', small: false, corps: 'IVC',  imageHref: 'images/wathier_IVC_front.png',   sp: 3, af: 1, er: 5, bwSP: 1, bwAF: 1, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  // IG — Guyot
  { id: 'guyot_IG',       col:  5, row: 12, type: 'HC',        army: 'french', small: false, corps: 'IG',   imageHref: 'images/guyot_IG_front.png',      sp: 4, af: 4, er: 6, bwSP: 3, bwAF: 3, bwER: 4, hits: 0, battleworn: false, isHeavyArtillery: false, isOG: true,  acted: false },
  // IG — Lefeb-Desno
  { id: 'lefeb-desno_IG', col: 15, row: 12, type: 'LC',        army: 'french', small: false, corps: 'IG',   imageHref: 'images/lefeb-desno_IG_front.png', sp: 5, af: 4, er: 5, bwSP: 4, bwAF: 3, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: false, acted: false },
  // IG — その他（small×2スタック）
  { id: '1GR_IG',         col: 10, row: 13, type: 'artillery', army: 'french', small: true,  corps: 'IG',   imageHref: 'images/1GR_IG_front.png',        sp: 2, af: 6, er: 6, bwSP: 1, bwAF: 4, bwER: 5, hits: 0, battleworn: false, isHeavyArtillery: true,  isOG: true,  acted: false },
  { id: '2GR_IG',         col: 10, row: 13, type: 'artillery', army: 'french', small: true,  corps: 'IG',   imageHref: 'images/2GR_IG_front.png',        sp: 2, af: 6, er: 6, bwSP: 1, bwAF: 4, bwER: 5, hits: 0, battleworn: false, isHeavyArtillery: true,  isOG: true,  acted: false },
  { id: 'morand_IG',      col:  9, row: 13, type: 'infantry',  army: 'french', small: true,  corps: 'IG',   imageHref: 'images/morand_IG_front.png',     sp: 3, af: 3, er: 6, bwSP: 2, bwAF: 2, bwER: 5, hits: 0, battleworn: false, isHeavyArtillery: false, isOG: true,  acted: false },
  { id: 'michel_IG',      col:  9, row: 13, type: 'infantry',  army: 'french', small: true,  corps: 'IG',   imageHref: 'images/michel_IG_front.png',     sp: 2, af: 3, er: 6, bwSP: 1, bwAF: 2, bwER: 5, hits: 0, battleworn: false, isHeavyArtillery: false, isOG: true,  acted: false },
  { id: 'friant_IG',      col: 10, row: 14, type: 'infantry',  army: 'french', small: true,  corps: 'IG',   imageHref: 'images/friant_IG_front.png',     sp: 3, af: 3, er: 6, bwSP: 2, bwAF: 2, bwER: 5, hits: 0, battleworn: false, isHeavyArtillery: false, isOG: true,  acted: false },
  { id: 'rouget_IG',      col: 10, row: 14, type: 'infantry',  army: 'french', small: true,  corps: 'IG',   imageHref: 'images/rouget_IG_front.png',     sp: 2, af: 3, er: 6, bwSP: 1, bwAF: 2, bwER: 5, hits: 0, battleworn: false, isHeavyArtillery: false, isOG: true,  acted: false },
  { id: 'chartrand_IG',   col: 11, row: 13, type: 'infantry',  army: 'french', small: true,  corps: 'IG',   imageHref: 'images/chartrand_IG_front.png',  sp: 3, af: 3, er: 5, bwSP: 2, bwAF: 2, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: false, isYG: true,  acted: false },
  { id: 'guye_IG',        col: 11, row: 13, type: 'infantry',  army: 'french', small: true,  corps: 'IG',   imageHref: 'images/guye_IG_front.png',       sp: 2, af: 3, er: 5, bwSP: 1, bwAF: 2, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: false, isYG: true,  acted: false },
  // Grouchy variant（基本シナリオでは未使用 — offMap: true）
  { id: 'hulot_IV',       col: 13, row: 15, type: 'infantry',  army: 'french', small: false, corps: 'IV',   imageHref: 'images/hulot_IV_front.png',      sp: 4, af: 2, er: 4, bwSP: 3, bwAF: 1, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: false, offMap: true, acted: false },
  { id: 'vichery_IV',     col: 14, row: 15, type: 'infantry',  army: 'french', small: false, corps: 'IV',   imageHref: 'images/vichery_IV_front.png',    sp: 4, af: 2, er: 4, bwSP: 3, bwAF: 1, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: false, offMap: true, acted: false },
  { id: 'pecheux_IV',     col: 13, row: 16, type: 'infantry',  army: 'french', small: false, corps: 'IV',   imageHref: 'images/pecheux_IV_front.png',    sp: 5, af: 2, er: 4, bwSP: 3, bwAF: 1, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: false, offMap: true, acted: false },
  { id: 'baltus_IV',      col: 14, row: 16, type: 'artillery', army: 'french', small: false, corps: 'IV',   imageHref: 'images/baltus_IV_front.png',     sp: 1, af: 4, er: 4, bwSP: 1, bwAF: 3, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: true,  offMap: true, acted: false },
  { id: 'maurin_IC',      col: 11, row: 15, type: 'LC',        army: 'french', small: false, corps: 'IC',   imageHref: 'images/maurin_IC_front.png',     sp: 3, af: 1, er: 5, bwSP: 2, bwAF: 1, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: false, offMap: true, acted: false },
  { id: 'soult_IC',       col: 11, row: 16, type: 'LC',        army: 'french', small: false, corps: 'IC',   imageHref: 'images/soult_IC_front.png',      sp: 2, af: 1, er: 5, bwSP: 1, bwAF: 1, bwER: 3, hits: 0, battleworn: false, isHeavyArtillery: false, offMap: true, acted: false },

  // ============================================================
  // プロイセン軍（offMap: true で開始）
  // ============================================================
  // IV Corps (Bülow) — entry 2011, TRT T10
  { id: 'bulow_cav_PR',    col: 20, row: 11, type: 'HC',        army: 'prussian', small: false, imageHref: 'images/bulow_cav_PR_front.png',  sp: 4, af: 0, er: 4, hits: 0, battleworn: false, isHeavyArtillery: false, corps: 'pr-IV', offMap: true, acted: false },
  { id: 'bulow_inf1_PR',   col: 20, row: 11, type: 'infantry',  army: 'prussian', small: false, imageHref: 'images/bulow_inf1_PR_front.png', sp: 4, af: 1, er: 4, hits: 0, battleworn: false, isHeavyArtillery: false, corps: 'pr-IV', offMap: true, acted: false },
  { id: 'bulow_inf2_PR',   col: 20, row: 11, type: 'infantry',  army: 'prussian', small: false, imageHref: 'images/bulow_inf2_PR_front.png', sp: 3, af: 1, er: 3, hits: 0, battleworn: false, isHeavyArtillery: false, corps: 'pr-IV', offMap: true, acted: false },
  { id: 'bulow_art_PR',    col: 20, row: 11, type: 'artillery', army: 'prussian', small: false, imageHref: 'images/bulow_art_PR_front.png',  sp: 0, af: 2, er: 3, hits: 0, battleworn: false, isHeavyArtillery: false, corps: 'pr-IV', offMap: true, acted: false },
  // II Corps (Pirch I) — entry 2009, TRT T11
  { id: 'pirch_cav_PR',    col: 20, row:  9, type: 'HC',        army: 'prussian', small: false, imageHref: 'images/pirch_cav_PR_front.png',  sp: 4, af: 0, er: 4, hits: 0, battleworn: false, isHeavyArtillery: false, corps: 'pr-II', offMap: true, acted: false },
  { id: 'pirch_inf1_PR',   col: 20, row:  9, type: 'infantry',  army: 'prussian', small: false, imageHref: 'images/pirch_inf1_PR_front.png', sp: 4, af: 1, er: 4, hits: 0, battleworn: false, isHeavyArtillery: false, corps: 'pr-II', offMap: true, acted: false },
  { id: 'pirch_inf2_PR',   col: 20, row:  9, type: 'infantry',  army: 'prussian', small: false, imageHref: 'images/pirch_inf2_PR_front.png', sp: 4, af: 1, er: 4, hits: 0, battleworn: false, isHeavyArtillery: false, corps: 'pr-II', offMap: true, acted: false },
  { id: 'pirch_art_PR',    col: 20, row:  9, type: 'artillery', army: 'prussian', small: false, imageHref: 'images/pirch_art_PR_front.png',  sp: 0, af: 2, er: 4, hits: 0, battleworn: false, isHeavyArtillery: false, corps: 'pr-II', offMap: true, acted: false },
  // I Corps (Ziethen) — entry 2003, TRT T12
  { id: 'ziethen_cav_PR',  col: 20, row:  3, type: 'LC',        army: 'prussian', small: false, imageHref: 'images/ziethen_cav_PR_front.png',  sp: 2, af: 0, er: 4, hits: 0, battleworn: false, isHeavyArtillery: false, corps: 'pr-I', offMap: true, acted: false },
  { id: 'ziethen_inf1_PR', col: 20, row:  3, type: 'infantry',  army: 'prussian', small: false, imageHref: 'images/ziethen_inf1_PR_front.png', sp: 4, af: 1, er: 4, hits: 0, battleworn: false, isHeavyArtillery: false, corps: 'pr-I', offMap: true, acted: false },
  { id: 'ziethen_inf2_PR', col: 20, row:  3, type: 'infantry',  army: 'prussian', small: false, imageHref: 'images/ziethen_inf2_PR_front.png', sp: 4, af: 1, er: 4, hits: 0, battleworn: false, isHeavyArtillery: false, corps: 'pr-I', offMap: true, acted: false },
  { id: 'ziethen_art_PR',  col: 20, row:  3, type: 'artillery', army: 'prussian', small: false, imageHref: 'images/ziethen_art_PR_front.png',  sp: 0, af: 2, er: 4, hits: 0, battleworn: false, isHeavyArtillery: false, corps: 'pr-I', offMap: true, acted: false },
];

// British unit IDs（Thin Red Line / Scum of the Earth 対象）
const BRITISH_UNIT_IDS = new Set([
  'cooke_I', 'kielmansegge_I', 'alten_I',
  'halkett_II', 'mitchell_II', 'clinton_II',
  '1reserve_RC', '2reserve_RC', 'picton_RC', 'lambert_RC',
  'somerset_CC', 'ponsonby_CC', 'rightflank_CC', 'vandeleur_CC', 'vivian_CC', 'ha_reserve_CC',
  'hougoumont_det', 'lahayesainte_det',
]);
function isBritish(unit) { return BRITISH_UNIT_IDS.has(unit.id); }

// ============================================================
// グローバルゲーム状態
// ============================================================
let selectedUnitId = null;
const reachableMap = new Map();
let bombardMode = false;
const bombardTargetAddrs = new Set();
let meleeMode = false;
const meleeTargetAddrs = new Set();
const combatLog = [];

const aiHighlightAddrs = new Map();

let reverseSlope   = false;
let thinRedLine    = false;
let scumOfTheEarth = false;

let gamePhase = 'rainy-start';
let deployingUnitId = null;
const deployZoneHexes = new Set();
const rainyLog = [];

let napoleonMode      = null;
let napoleonModeIdx   = -1;
let viveBoostUnitId   = null;
let pasDeChargeActive = false;
const napoleonTargetAddrs = new Set();

let activeCorps = null;
const pendingActionUnits = new Set();

function markActed(unit) {
  unit.acted = true;
  pendingActionUnits.delete(unit.id);
  drawAllUnits();
}

// ============================================================
// ユニットクエリ
// ============================================================

function getUnitsAt(addr) {
  return units.filter(u => !u.offMap && hexAddr(u.col, u.row) === addr);
}

function isEnemyAdjacentTo(addr, movingArmy) {
  for (const nAddr of neighborAddrs(addr)) {
    if (getUnitsAt(nAddr).some(u => u.army !== movingArmy)) return true;
  }
  return false;
}

function canLandAt(addr, movingUnit) {
  const occupants = getUnitsAt(addr).filter(u => u.id !== movingUnit.id);
  const friendly  = occupants.filter(u => u.army === movingUnit.army);
  if (friendly.length === 0) return true;
  if (friendly.length === 1) return movingUnit.small || friendly[0].small;
  return false;
}

// ============================================================
// ユニットステータス計算
// ============================================================

function getUnitStatus(unit) {
  if (!unit.battleworn) {
    if ((unit.hits ?? 0) >= 2) return 'disrupted';
    if ((unit.hits ?? 0) >= 1) return 'shaken';
    return 'fresh';
  } else {
    if ((unit.hits ?? 0) >= 2) return 'disrupted';
    if ((unit.hits ?? 0) >= 1) return 'shaken';
    return 'battleworn';
  }
}

function getEffectiveSP(unit) {
  const base = unit.battleworn && unit.bwSP != null ? unit.bwSP : (unit.sp ?? 0);
  let sp = base;
  if (getUnitStatus(unit) === 'disrupted') sp = Math.max(0, sp - 1);
  if (thinRedLine && unit.army === 'allied' && unit.type === 'infantry' && isBritish(unit)) sp++;
  return sp;
}

function getEffectiveAF(unit) {
  const base = unit.battleworn && unit.bwAF != null ? unit.bwAF : (unit.af ?? 0);
  return getUnitStatus(unit) === 'disrupted' ? Math.max(0, base - 1) : base;
}

function getEffectiveER(unit) {
  const base = unit.battleworn && unit.bwER != null ? unit.bwER : (unit.er ?? 4);
  let er = base;
  const st = getUnitStatus(unit);
  if (st === 'shaken' || st === 'disrupted') er = Math.max(1, er - 1);
  if (unit.army === 'allied' && unit.type === 'infantry' && isBritish(unit)) {
    if (thinRedLine)    er = Math.min(6, er + 1);
    if (scumOfTheEarth) er = Math.max(1, er - 1);
  }
  return er;
}

// ============================================================
// 戦闘ログ
// ============================================================

function addCombatLog(msg) {
  combatLog.unshift(msg);
  if (combatLog.length > 30) combatLog.pop();
  renderCombatLog();
}

function renderCombatLog() {
  const el = document.getElementById('combat-log');
  if (!el) return;
  el.innerHTML = '';
  combatLog.slice(0, 20).forEach((msg, i) => {
    const div = document.createElement('div');
    div.className = 'cl-entry' + (i === 0 ? ' cl-new' : '');
    div.textContent = msg;
    el.appendChild(div);
  });
}

// ============================================================
// Elan Test / Panic Test / ステップロス / Rally
// ============================================================

function performElanTest(unit) {
  const er = getEffectiveER(unit);
  let viveBonus = 0;
  if (viveBoostUnitId && unit.id === viveBoostUnitId) {
    viveBonus = 2;
    viveBoostUnitId = null;
    addCombatLog(`[Napoleon] Vive L'Empereur! ${unit.id} ER+2 適用`);
    renderNapoleonConditions();
  }
  const testER = er + viveBonus;
  const roll = rollD6();
  if (er >= 6 && roll === 6 && testER <= 6) {
    const reroll = rollD6();
    return { roll, reroll, success: reroll <= 3, er, testER };
  }
  return { roll, reroll: null, success: roll <= testER, er, testER };
}

function runPanicTest(unit) {
  if (unit.isDetachment) {
    addCombatLog(`[${unit.id}] Panic Test（Detachment）→ 後退なし・追加1Hit`);
    applyHit(unit);
    return;
  }
  const { roll, reroll, success, er } = performElanTest(unit);
  const rollStr = reroll !== null ? `${roll}→再:${reroll}` : `${roll}`;
  addCombatLog(`[${unit.id}] Panic Test ER=${er} ダイス:${rollStr} → ${success ? '成功' : '失敗'}`);
  if (!success) {
    const msgs = doRetreat(unit, 1);
    msgs.forEach(m => addCombatLog(m));
  }
}

function applyHit(unit) {
  if (!unit.battleworn) {
    unit.hits = (unit.hits ?? 0) + 1;
    if (unit.hits >= 3) {
      unit.battleworn = true;
      unit.hits = 0;
      addCombatLog(`[${unit.id}] Battleworn に！`);
      runPanicTest(unit);
    } else if (unit.hits === 2) {
      addCombatLog(`[${unit.id}] Disrupted（SP/AF/ER -1）`);
    } else {
      addCombatLog(`[${unit.id}] Shaken（ER -1）`);
    }
  } else {
    unit.hits = (unit.hits ?? 0) + 1;
    if (unit.hits >= 3) {
      addCombatLog(`[${unit.id}] 2ヘックス後退！（後退不能なら消滅）`);
    } else if (unit.hits === 2) {
      addCombatLog(`[${unit.id}] Disrupted（SP/AF/ER -1）`);
    } else {
      addCombatLog(`[${unit.id}] Shaken（ER -1）`);
    }
  }
  drawAllUnits();
}

function doRally(unit) {
  if ((unit.hits ?? 0) <= 0) return;
  markActed(unit);
  const before = getUnitStatus(unit);
  unit.hits = Math.max(0, (unit.hits ?? 0) - 1);
  const after = getUnitStatus(unit);
  addCombatLog(`[${unit.id}] Rally: ${before} → ${after}${unit.battleworn ? '（Battleworn継続）' : ''}`);
  drawAllUnits();
  deselect();
}
