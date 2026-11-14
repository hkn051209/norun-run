/* =========================================================
   のるんクラフト（仮） v1  きほんの 数値
   ========================================================= */
export const VERSION = "1.0.0";

/* 世界の 大きさ（マス）。x・z が 横、y が 高さ */
export const WORLD = {
  sx: 48, sy: 24, sz: 48,
  chunk: 16,      // 描画の まとまり（16×16 の 柱）。3×3＝9こ
  baseH: 7,       // 平地の 地面の あつさ（いちばん上の ブロックは y=6）
  seaY: 5,        // 水面の ブロックの y
};

/* のるんの 動き。大きさ（当たり判定）は モデルを 読みこんでから norun.js が 決める */
export const PLAYER = {
  speed: 4.3,       // 歩く 速さ（マス/秒）
  jumpV: 8.4,       // ジャンプの 初速（高さ 約1.4マス）
  gravity: 24,
  maxFall: 25,
  reach: 4,         // こわす・おく が とどく きょり（マス）
  bodyWidthBlocks: 0.95, // のるんの 体の はば（見た目）を 何マスに するか
};

/* カメラ（3人称）。きょりは モデルの 高さから 決める（main.js） */
export const CAM = {
  sens: 0.0065,     // スワイプ 1px あたりの 回転（ラジアン）
  pitchMin: -0.15, pitchMax: 1.35,
  pitch0: 0.48,
  padFull: 46,      // パッド：ずらし 46px で 全力（『まなび』第13弾と 同じ）
  padDead: 8,
};

export const DAY_LEN = 480;            // 1日の 長さ（秒）
export const SAVE_KEY = "norun-craft-save-v1";
export const CODE_PREFIX = "NORUNCRAFT1.";
export const AUTOSAVE_SEC = 20;
