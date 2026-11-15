/* =========================================================
   のるんクラフト（仮） v3  きほんの 数値
   ========================================================= */
export const VERSION = "3.0.0";

/* 世界の 大きさ（マス）。x・z が 横、y が 高さ */
export const WORLD = {
  sx: 256, sy: 40, sz: 256,
  chunk: 16,        // 描画の まとまり（16×16 の 柱）。ぜんぶで 16×16＝256こ
  sea: 18,          // 水面の 高さ（水の いちばん 上の ブロックは y=17）
};

/* 描画：のるんの 近くの チャンクだけ 作って 描く。遠くは 霧で かくす */
export const RENDER = {
  radius: 3,          // のるんの いる チャンクから 何チャンク先まで 描くか（3＝7×7＝49こ）
  fogNear: 30, fogFar: 54,
  buildPerFrame: 2,   // 1コマに 新しく 作る チャンクの 数（かくつき防止）
  pixelRatioMax: 1.5,
};

export const PLAYER = {
  speed: 4.3,
  jumpV: 8.4,
  gravity: 24,
  maxFall: 25,
  reach: 4,
  bodyWidthBlocks: 0.95,
  hpMax: 6,           // ハートの 数
  regenSec: 14,       // 何秒 ぶじなら ハートが 1つ もどるか（おなかが 空っぽの 間は もどらない）
  invuln: 1.5,
  hitRange: 2.3,
  hungerMax: 6,       // おなかの 数
  hungerSec: 55,      // 何秒で おなかが 1つ へるか
  hungerAct: 0.02,    // たたく・ジャンプ 1回で へる 量
  hungrySpeed: 0.8,   // おなかが 空っぽの 間の 歩く 速さ（倍率）
  stack: 99,          // 1マスに 重ねられる 数
};

/* 経験値：レベル L から 次へは xpBase ＋ L × xpStep */
export const XP = { block: 1, ore: 3, enemy: 5, gold: 15, fish: 3, xpBase: 10, xpStep: 5 };

export const CAM = {
  sens: 0.0065,
  pitchMin: -0.15, pitchMax: 1.35,     // 三人称
  fpPitch: 1.45,                       // 一人称（上下 ±）
  pitch0: 0.48,
  padFull: 46,
  padDead: 8,
  fov: 60, fovPortrait: 72, fovFirst: 75,
};

/* 明るさ。値は「画面で 見た 明るさ」の 割合（昼の 地上＝1） */
export const DAY_LEN = 480;
export const NIGHT = {
  blocks: 0.5,     // 夜の 地上
  cave: 0.42,      // 地下（空が 見えない 所）。夜より 少し 暗い
  near: 0.72,      // のるんの すぐ そば（夜・地下）
  nearR: 7,
  chars: 0.72,     // 夜・地下の のるん・敵・動物
  morning: 0.04,
  caveDepth: 5,    // 空が 見えなく なって から 何マスで いちばん 暗く なるか
  lampR: 8,        // あかりけっしょうの 光が とどく きょり
};

/* 敵（色モンスター） */
export const MOB = {
  hp: 6, speed: 1.7, jumpV: 5.2, w: 0.7, h: 0.6,
  see: 9,
  maxDay: 2, maxNight: 4,
  everyDay: 14, everyNight: 7,
  dropChance: 0.6,
  petDamage: 1, petEvery: 1.4,
  goldChance: 0.07, goldHp: 10, goldSpeed: 2.6,   // まれに 出る「きんのぷに」（にげる）
};

/* 動物 */
export const ANIMAL = {
  max: 8,            // のるんの 近くで 同時に 動く 数
  every: 2.5,        // 何秒ごとに 1ぴき 足すか
  near: 28, far: 46, // 出す きょり／消す きょり
  shy: 3.2,          // にげる 子が にげだす きょり
  followSec: 40,     // 餌を あげた あと ついて くる 秒
  feedRange: 2.6,
};

/* セーブ（スロット4つ） */
export const SLOTS = 4;
export const SLOT_KEY = (i) => "norun-craft-v3-slot-" + i;
export const NAMES_KEY = "norun-craft-v3-names";
export const CODE_PREFIX = "NORUNCRAFT3.";
export const AUTOSAVE_SEC = 20;

/* 端末の 間の 共有（Firebase Realtime Database の REST）
   ★ おうちの 人へ：DESIGN.md の「共有の 準備」の とおりに データベースを 作って、
     下の dbUrl を 自分の データベースの URL に 書きかえて ください。 */
export const SHARE = {
  dbUrl: "https://YOUR-PROJECT-default-rtdb.firebaseio.com",
  path: "norun-craft/v3/shares",
  minLen: 4,
  timeoutMs: 12000,
};
