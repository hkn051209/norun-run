/* =========================================================
   ブロックの 一覧（名前・絵は ぜんぶ 自作）
   - 番号は セーブに 入るので、あとから 変えない（足す 時は 後ろに）
   - solid：ぶつかる／opaque：むこうが 見えない／target：ねらえる／breakable：こわせる
   - 16〜31 は「いろブロック」（16 ＋ 色の 番号）。持ち物の 上では 1種類（番号 16）と して 数える
   ========================================================= */
import { COLORS } from "./colors.js";

export const B = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4, LOG: 5, LEAF: 6,
  PLANK: 7, GLASS: 8, BRICK: 9, WATER: 10, ROCK: 11,
  BENCH: 12, BED: 13, FLOWER: 14,
  COLOR: 16,
};

/* 絵（タイル）の 番号。textures.js の アトラス（8×8）の 中の 場所 */
export const T = {
  GRASS_TOP: 0, GRASS_SIDE: 1, DIRT: 2, STONE: 3, SAND: 4, LOG_SIDE: 5, LOG_TOP: 6,
  LEAF: 7, PLANK: 8, GLASS: 9, BRICK: 10, WATER: 11, ROCK: 12,
  BENCH_TOP: 13, BENCH_SIDE: 14, BED_TOP: 15, BED_SIDE: 16, FLOWER: 17, COLOR: 18,
};

const solid = { solid: true, opaque: true, target: true, breakable: true };
const one = (t) => ({ top: t, side: t, bottom: t, icon: t });

export const BLOCKS = [];
const def = (d) => { BLOCKS[d.id] = d; };
def({ id: 1, key: "grass", name: "くさ", top: T.GRASS_TOP, side: T.GRASS_SIDE, bottom: T.DIRT, icon: T.GRASS_SIDE, ...solid });
def({ id: 2, key: "dirt", name: "つち", ...one(T.DIRT), ...solid });
def({ id: 3, key: "stone", name: "いし", ...one(T.STONE), ...solid });
def({ id: 4, key: "sand", name: "すな", ...one(T.SAND), ...solid });
def({ id: 5, key: "log", name: "き", top: T.LOG_TOP, side: T.LOG_SIDE, bottom: T.LOG_TOP, icon: T.LOG_SIDE, ...solid });
def({ id: 6, key: "leaf", name: "はっぱ", ...one(T.LEAF), ...solid });
def({ id: 7, key: "plank", name: "いた", ...one(T.PLANK), ...solid });
def({ id: 8, key: "glass", name: "ガラス", ...one(T.GLASS), ...solid, opaque: false });
def({ id: 9, key: "brick", name: "れんが", ...one(T.BRICK), ...solid });
def({ id: 10, key: "water", name: "みず", ...one(T.WATER), solid: false, opaque: false, target: false, breakable: false });
def({ id: 11, key: "rock", name: "そこの いわ", ...one(T.ROCK), ...solid, breakable: false });
def({ id: 12, key: "bench", name: "さぎょうだい", top: T.BENCH_TOP, side: T.BENCH_SIDE, bottom: T.PLANK, icon: T.BENCH_SIDE, ...solid });
def({ id: 13, key: "bed", name: "ベッド", top: T.BED_TOP, side: T.BED_SIDE, bottom: T.PLANK, icon: T.BED_TOP, ...solid });
def({ id: 14, key: "flower", name: "おはな", ...one(T.FLOWER), solid: false, opaque: false, target: true, breakable: true, cross: true });
COLORS.forEach((c, i) => def({ id: B.COLOR + i, key: "color-" + c.key, name: "いろブロック", ...one(T.COLOR), ...solid, color: i }));

export const BLOCK_COUNT = B.COLOR + COLORS.length;   // 32

export const isSolid = (id) => !!BLOCKS[id] && BLOCKS[id].solid;
export const isOpaque = (id) => !!BLOCKS[id] && BLOCKS[id].opaque;
export const isTarget = (id) => !!BLOCKS[id] && BLOCKS[id].target;
export const isColorBlock = (id) => id >= B.COLOR && id < BLOCK_COUNT;
