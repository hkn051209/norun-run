/* =========================================================
   持ち物・道具・かたさ・クラフトの レシピ
   - 持ち物の 番号：ブロックは ブロックの 番号（いろブロックは 16 に まとめる）、
     ブロックで ない 物は 40 から
   ========================================================= */
import { B, BLOCKS, isColorBlock } from "./blocks.js";

export const I = { STICK: 40, FISH: 41 };
export const ITEM_COUNT = 48;
export const INV_MAX = 999;
export const ITEMS = {
  [I.STICK]: { name: "ぼう", icon: "stick" },
  [I.FISH]: { name: "さかな", icon: "fish" },
};
export const itemName = (id) => (ITEMS[id] ? ITEMS[id].name : BLOCKS[id] ? BLOCKS[id].name : "?");

/* 下の ホットバーに ならぶ 順。さいごの 3つ（いろブロック・さぎょうだい・ベッド）は 持って いる 時だけ 出る */
export const HOTBAR_BASE = [B.GRASS, B.DIRT, B.STONE, B.SAND, B.LOG, B.LEAF, B.PLANK, B.GLASS, B.BRICK];
export const HOTBAR_EXTRA = [B.COLOR, B.BENCH, B.BED];

/* さいしょの 持ち物（いろブロックを 少し。色で あそべる ように） */
export const START_INV = { [B.COLOR]: 8 };

/* 道具。cls＝とくいな ブロックの なかま */
export const TOOLS = {
  pick: { name: "ピッケル", cls: "rock" },
  axe: { name: "おの", cls: "wood" },
  shovel: { name: "シャベル", cls: "soil" },
  rod: { name: "つりざお", cls: null },
};
export const TOOL_KEYS = ["pick", "axe", "shovel", "rod"];
export const TIER_NAME = ["", "きの ", "いしの "];
export const toolName = (key, tier) => (key === "rod" ? "" : TIER_NAME[tier] || "") + TOOLS[key].name;

/* かたさ：たたく 回数 [すで, 木の 道具, 石の 道具]。
   1回で こわれる 物は 作らない（まちがって さわっても こわれない ように）。さいてい 2回 */
const H = (cls, hits) => ({ cls, hits });
export const HARD = {
  [B.LEAF]: H(null, [2, 2, 2]), [B.GLASS]: H(null, [2, 2, 2]), [B.FLOWER]: H(null, [2, 2, 2]),
  [B.GRASS]: H("soil", [3, 2, 2]), [B.DIRT]: H("soil", [3, 2, 2]), [B.SAND]: H("soil", [3, 2, 2]),
  [B.LOG]: H("wood", [4, 2, 2]), [B.PLANK]: H("wood", [4, 2, 2]), [B.BENCH]: H("wood", [4, 2, 2]), [B.BED]: H("wood", [3, 2, 2]),
  [B.STONE]: H("rock", [6, 3, 2]), [B.BRICK]: H("rock", [8, 4, 3]),
  [B.COLOR]: H(null, [3, 3, 3]),
};
/* その ブロックを、いま 持って いる 物（held）で こわすのに 何回 たたくか。こわせない 物は 0 */
export function hitsNeeded(blockId, held, tools) {
  const def = BLOCKS[blockId];
  if (!def || !def.breakable) return 0;
  const h = HARD[isColorBlock(blockId) ? B.COLOR : blockId];
  if (!h) return 3;
  const t = TOOLS[held];
  const tier = t && t.cls && t.cls === h.cls ? Math.max(0, Math.min(2, tools[held] | 0)) : 0;
  return Math.max(2, h.hits[tier]);
}
/* こわした 時に 手に 入る 持ち物の 番号（0＝なし） */
export function dropOf(blockId) {
  if (isColorBlock(blockId)) return B.COLOR;
  if (blockId === B.FLOWER) return 0;
  return blockId;
}

/* 敵を たたく 強さ */
export const POWER = { hand: 1, tool: 1.5, weapon: 2, weaponBonus: 0.6 };

/* クラフトの レシピ。
   need：[持ち物の 番号, 数]／out：できる 物（item＝持ち物、tool＝道具と 段階、heal＝ハート）
   bench：true なら さぎょうだいの 近くで だけ 作れる */
export const RECIPES = [
  { id: "plank", name: "いた", need: [[B.LOG, 1]], out: { item: B.PLANK, n: 4 }, bench: false },
  { id: "bench", name: "さぎょうだい", need: [[B.PLANK, 4]], out: { item: B.BENCH, n: 1 }, bench: false },
  { id: "eat", name: "さかなを たべる", need: [[I.FISH, 1]], out: { heal: 1 }, bench: false },
  { id: "stick", name: "ぼう", need: [[B.PLANK, 2]], out: { item: I.STICK, n: 4 }, bench: true },
  { id: "pick1", name: "きの ピッケル", need: [[I.STICK, 2], [B.PLANK, 3]], out: { tool: "pick", tier: 1 }, bench: true },
  { id: "axe1", name: "きの おの", need: [[I.STICK, 2], [B.PLANK, 3]], out: { tool: "axe", tier: 1 }, bench: true },
  { id: "shovel1", name: "きの シャベル", need: [[I.STICK, 2], [B.PLANK, 3]], out: { tool: "shovel", tier: 1 }, bench: true },
  { id: "pick2", name: "いしの ピッケル", need: [[I.STICK, 2], [B.STONE, 3]], out: { tool: "pick", tier: 2 }, bench: true },
  { id: "axe2", name: "いしの おの", need: [[I.STICK, 2], [B.STONE, 3]], out: { tool: "axe", tier: 2 }, bench: true },
  { id: "shovel2", name: "いしの シャベル", need: [[I.STICK, 2], [B.STONE, 3]], out: { tool: "shovel", tier: 2 }, bench: true },
  { id: "rod", name: "つりざお", need: [[I.STICK, 3], [B.PLANK, 1]], out: { tool: "rod", tier: 1 }, bench: true },
  { id: "bed", name: "ベッド", need: [[B.PLANK, 3], [B.LEAF, 3]], out: { item: B.BED, n: 1 }, bench: true },
  { id: "color", name: "いろブロック", need: [[B.STONE, 1]], out: { item: B.COLOR, n: 4 }, bench: true },
  { id: "glass", name: "ガラス", need: [[B.SAND, 2]], out: { item: B.GLASS, n: 1 }, bench: true },
  { id: "brick", name: "れんが", need: [[B.DIRT, 2], [B.STONE, 1]], out: { item: B.BRICK, n: 2 }, bench: true },
];
