/* =========================================================
   のるんクラフト（仮） v2  きほんの 数値
   ========================================================= */
export const VERSION = "2.0.0";

/* 世界の 大きさ（マス）。x・z が 横、y が 高さ（v1 と 同じ） */
export const WORLD = {
  sx: 48, sy: 24, sz: 48,
  chunk: 16,
  baseH: 7,
  seaY: 5,
};

/* のるんの 動き。大きさ（当たり判定）は モデルを 読みこんでから norun.js が 決める */
export const PLAYER = {
  speed: 4.3,
  jumpV: 8.4,
  gravity: 24,
  maxFall: 25,
  reach: 4,
  bodyWidthBlocks: 0.95,
  hpMax: 6,          // ハートの 数
  regenSec: 25,      // 何秒 ぶじなら ハートが 1つ もどるか
  invuln: 1.5,       // 当たった あと 無敵の 秒
  hitRange: 2.3,     // たたく が 敵に とどく きょり
};

export const CAM = {
  sens: 0.0065,
  pitchMin: -0.15, pitchMax: 1.35,
  pitch0: 0.48,
  padFull: 46,
  padDead: 8,
};

/* 昼と 夜。明るさは「画面で 見た 明るさ」の 割合（昼＝1） */
export const DAY_LEN = 480;
export const NIGHT = {
  blocks: 0.5,     // 夜の ブロックの 明るさ（昼の 50％）
  near: 0.72,      // 夜、のるんの すぐ そばの ブロック（少し 明るい）
  nearR: 7,        // その 明るさが とどく きょり（マス）
  chars: 0.72,     // 夜の のるん・敵・ペットの 明るさ
  morning: 0.04,   // 「ねる」と この 時刻（1日の 中の 割合）に なる
};

/* 敵（色モンスター） */
export const MOB = {
  hp: 6, speed: 1.7, jumpV: 5.2, w: 0.7, h: 0.6,
  see: 9,                  // この きょりで のるんに 気づく
  maxDay: 2, maxNight: 4,  // 同時に いる 数
  everyDay: 14, everyNight: 7,   // 何秒ごとに 1ぴき 出るか
  dropChance: 0.6,         // たおした 時に 色を 落とす 確率
  petDamage: 1, petEvery: 1.4,
};

/* セーブ（スロット4つ） */
export const SLOTS = 4;
export const SLOT_KEY = (i) => "norun-craft-v2-slot-" + i;
export const NAMES_KEY = "norun-craft-v2-names";
export const CODE_PREFIX = "NORUNCRAFT2.";
export const AUTOSAVE_SEC = 20;

/* 端末の 間の 共有（Firebase Realtime Database の REST）
   ★ おうちの 人へ：DESIGN.md の「共有の 準備」の とおりに データベースを 作って、
     下の dbUrl を 自分の データベースの URL に 書きかえて ください。 */
export const SHARE = {
  dbUrl: "https://YOUR-PROJECT-default-rtdb.firebaseio.com",
  path: "norun-craft/v2/shares",
  minLen: 4,          // あいことばの 最低の 長さ
  timeoutMs: 12000,
};
