/* =========================================================
   ブロックの 一覧（名前・絵は ぜんぶ 自作）
   - id は セーブに 入るので、あとから 番号を 変えない（足す 時は 後ろに）
   - solid：ぶつかる／opaque：むこうが 見えない／target：ねらえる／breakable：こわせる
   ========================================================= */
export const B = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4, LOG: 5, LEAF: 6,
  PLANK: 7, GLASS: 8, BRICK: 9, WATER: 10, ROCK: 11,
};

/* 絵（タイル）の 番号。textures.js の アトラス（4×4）の 中の 場所 */
export const T = {
  GRASS_TOP: 0, GRASS_SIDE: 1, DIRT: 2, STONE: 3, SAND: 4, LOG_SIDE: 5, LOG_TOP: 6,
  LEAF: 7, PLANK: 8, GLASS: 9, BRICK: 10, WATER: 11, ROCK: 12,
};

const solid = { solid: true, opaque: true, target: true, breakable: true };

export const BLOCKS = [
  null,
  { id: 1, key: "grass", name: "くさ", top: T.GRASS_TOP, side: T.GRASS_SIDE, bottom: T.DIRT, icon: T.GRASS_SIDE, ...solid },
  { id: 2, key: "dirt", name: "つち", top: T.DIRT, side: T.DIRT, bottom: T.DIRT, icon: T.DIRT, ...solid },
  { id: 3, key: "stone", name: "いし", top: T.STONE, side: T.STONE, bottom: T.STONE, icon: T.STONE, ...solid },
  { id: 4, key: "sand", name: "すな", top: T.SAND, side: T.SAND, bottom: T.SAND, icon: T.SAND, ...solid },
  { id: 5, key: "log", name: "き", top: T.LOG_TOP, side: T.LOG_SIDE, bottom: T.LOG_TOP, icon: T.LOG_SIDE, ...solid },
  { id: 6, key: "leaf", name: "はっぱ", top: T.LEAF, side: T.LEAF, bottom: T.LEAF, icon: T.LEAF, ...solid },
  { id: 7, key: "plank", name: "いた", top: T.PLANK, side: T.PLANK, bottom: T.PLANK, icon: T.PLANK, ...solid },
  { id: 8, key: "glass", name: "ガラス", top: T.GLASS, side: T.GLASS, bottom: T.GLASS, icon: T.GLASS, ...solid, opaque: false },
  { id: 9, key: "brick", name: "れんが", top: T.BRICK, side: T.BRICK, bottom: T.BRICK, icon: T.BRICK, ...solid },
  { id: 10, key: "water", name: "みず", top: T.WATER, side: T.WATER, bottom: T.WATER, icon: T.WATER, solid: false, opaque: false, target: false, breakable: false },
  { id: 11, key: "rock", name: "そこの いわ", top: T.ROCK, side: T.ROCK, bottom: T.ROCK, icon: T.ROCK, ...solid, breakable: false },
];

export const BLOCK_COUNT = BLOCKS.length;

/* 下の ホットバーに ならぶ 順（9こ） */
export const HOTBAR = [B.GRASS, B.DIRT, B.STONE, B.SAND, B.LOG, B.LEAF, B.PLANK, B.GLASS, B.BRICK];

/* さいしょから 持っている 数。いた・ガラス・れんがは 世界に 生えて いないので 少し 配る
   （v2 で クラフトが 入ったら 0 に する） */
export const START_INV = { [B.PLANK]: 24, [B.GLASS]: 12, [B.BRICK]: 12 };
export const INV_MAX = 999;

export const isSolid = (id) => id !== 0 && BLOCKS[id].solid;
export const isOpaque = (id) => id !== 0 && BLOCKS[id].opaque;
export const isTarget = (id) => id !== 0 && BLOCKS[id].target;
