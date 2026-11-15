/* =========================================================
   持ち物・食べ物・道具・かたさ・マス目クラフトの レシピ
   - 持ち物の 番号：ブロックは ブロックの 番号（いろブロックは 64 に まとめる）、
     ブロックで ない 物は 100 から
   ========================================================= */
import { B, BLOCKS, isColorBlock } from "./blocks.js";

export const I = { STICK: 100, FISH: 101, BERRY: 102, COOKIE: 103 };
export const ITEMS = {
  [I.STICK]: { name: "ぼう", icon: "stick" },
  [I.FISH]: { name: "さかな", icon: "fish" },
  [I.BERRY]: { name: "きのみ", icon: "berry" },
  [I.COOKIE]: { name: "ほしクッキー", icon: "cookie" },
};
export const isItem = (id) => !!ITEMS[id] || (!!BLOCKS[id] && (id < B.COLOR || id === B.COLOR) && id !== B.WATER && id !== B.ROCK);
export const itemName = (id) => (ITEMS[id] ? ITEMS[id].name : BLOCKS[id] ? BLOCKS[id].name : "?");
export const isPlaceable = (id) => !!BLOCKS[id];

/* 食べ物：おなかが いくつ もどるか */
export const FOOD = { [I.FISH]: 2, [I.BERRY]: 1, [I.COOKIE]: 3 };

/* 持ち物の マス：ホットバー 9 ＋ かばん 27 */
export const HOTBAR_N = 9;
export const INV_N = 36;

/* クリエイティブで えらべる 物の 一覧（ぜんぶ） */
export const ALL_ITEMS = [
  B.GRASS, B.DIRT, B.STONE, B.SAND, B.LOG, B.LEAF, B.PLANK, B.GLASS, B.BRICK,
  B.SNOW, B.ICE, B.COAL, B.STAR, B.LAMP, B.SNOWMAN, B.BENCH, B.BED, B.FLOWER, B.COLOR,
  I.STICK, I.FISH, I.BERRY, I.COOKIE,
];

/* さいしょの 持ち物 */
export const START_INV = [[B.COLOR, 8]];

/* 道具。cls＝とくいな ブロックの なかま。段階：1＝木、2＝石、3＝ほし */
export const TOOLS = {
  pick: { name: "ピッケル", cls: "rock" },
  axe: { name: "おの", cls: "wood" },
  shovel: { name: "シャベル", cls: "soil" },
  rod: { name: "つりざお", cls: null },
};
export const TOOL_KEYS = ["pick", "axe", "shovel", "rod"];
export const TIER_MAX = 3;
export const TIER_NAME = ["", "きの ", "いしの ", "ほしの "];
export const TIER_SHORT = ["", "き", "いし", "ほし"];
export const toolName = (key, tier) => (key === "rod" ? "" : TIER_NAME[tier] || "") + TOOLS[key].name;

/* かたさ：たたく 回数 [すで, 木, 石, ほし]。1回で こわれる 物は 作らない（さいてい 2回） */
const H = (cls, hits) => ({ cls, hits });
export const HARD = {
  [B.LEAF]: H(null, [2, 2, 2, 2]), [B.GLASS]: H(null, [2, 2, 2, 2]), [B.FLOWER]: H(null, [2, 2, 2, 2]), [B.SNOWMAN]: H(null, [2, 2, 2, 2]), [B.LAMP]: H(null, [2, 2, 2, 2]),
  [B.GRASS]: H("soil", [3, 2, 2, 2]), [B.DIRT]: H("soil", [3, 2, 2, 2]), [B.SAND]: H("soil", [3, 2, 2, 2]), [B.SNOW]: H("soil", [3, 2, 2, 2]),
  [B.LOG]: H("wood", [4, 2, 2, 2]), [B.PLANK]: H("wood", [4, 2, 2, 2]), [B.BENCH]: H("wood", [4, 2, 2, 2]), [B.BED]: H("wood", [3, 2, 2, 2]),
  [B.STONE]: H("rock", [6, 3, 2, 2]), [B.ICE]: H("rock", [4, 3, 2, 2]), [B.BRICK]: H("rock", [8, 4, 3, 2]),
  [B.COAL]: H("rock", [7, 4, 3, 2]), [B.STAR]: H("rock", [12, 8, 4, 2]),
  [B.COLOR]: H(null, [3, 3, 3, 3]),
};
export function hitsNeeded(blockId, held, tools) {
  const def = BLOCKS[blockId];
  if (!def || !def.breakable) return 0;
  const h = HARD[isColorBlock(blockId) ? B.COLOR : blockId];
  if (!h) return 3;
  const t = TOOLS[held];
  const tier = t && t.cls && t.cls === h.cls ? Math.max(0, Math.min(TIER_MAX, tools[held] | 0)) : 0;
  return Math.max(2, h.hits[tier]);
}
/* こわした 時に 手に 入る 持ち物の 番号（0＝なし） */
export function dropOf(blockId) {
  if (isColorBlock(blockId)) return B.COLOR;
  if (blockId === B.FLOWER) return 0;
  return blockId;
}

/* 敵を たたく 強さ */
export const POWER = { hand: 1, tool: [1, 1.5, 1.75, 2], weapon: 2, weaponBonus: 0.6 };

/* ---------------------------------------------------------
   マス目クラフトの レシピ
   grid：形（上の 行から）。"." は 空き。key：文字 → 持ち物の 番号
   out：できる 物（item＝持ち物と 数／tool＝道具と 段階）
   2×2 に おさまる 形は 手元で、それより 大きい 形は さぎょうだい（3×3）で 作る。
   左右を 反対に 置いても 作れる。
   --------------------------------------------------------- */
const tool3 = (id, name, mat, tool, tier) => [
  { id: "pick" + id, name: name + "ピッケル", grid: ["MMM", ".S.", ".S."], key: { M: mat, S: I.STICK }, out: { tool: "pick", tier } },
  { id: "axe" + id, name: name + "おの", grid: ["MM", "MS", ".S"], key: { M: mat, S: I.STICK }, out: { tool: "axe", tier } },
  { id: "shovel" + id, name: name + "シャベル", grid: ["M", "S", "S"], key: { M: mat, S: I.STICK }, out: { tool: "shovel", tier } },
];
export const RECIPES = [
  { id: "plank", name: "いた", grid: ["L"], key: { L: B.LOG }, out: { item: B.PLANK, n: 4 } },
  { id: "bench", name: "さぎょうだい", grid: ["PP", "PP"], key: { P: B.PLANK }, out: { item: B.BENCH, n: 1 } },
  { id: "stick", name: "ぼう", grid: ["P", "P"], key: { P: B.PLANK }, out: { item: I.STICK, n: 4 } },
  ...tool3(1, "きの ", B.PLANK, "", 1),
  ...tool3(2, "いしの ", B.STONE, "", 2),
  ...tool3(3, "ほしの ", B.STAR, "", 3),
  { id: "rod", name: "つりざお", grid: ["..S", ".SP", "S.P"], key: { S: I.STICK, P: B.PLANK }, out: { tool: "rod", tier: 1 } },
  { id: "bed", name: "ベッド", grid: ["FFF", "PPP"], key: { F: B.LEAF, P: B.PLANK }, out: { item: B.BED, n: 1 } },
  { id: "lamp", name: "あかりけっしょう", grid: ["H", "S"], key: { H: B.STAR, S: I.STICK }, out: { item: B.LAMP, n: 2 } },
  { id: "snowman", name: "ゆきだるま", grid: ["Y", "Y"], key: { Y: B.SNOW }, out: { item: B.SNOWMAN, n: 1 } },
  { id: "cookie", name: "ほしクッキー", grid: ["BB"], key: { B: I.BERRY }, out: { item: I.COOKIE, n: 1 } },
  { id: "color", name: "いろブロック", grid: ["T"], key: { T: B.STONE }, out: { item: B.COLOR, n: 4 } },
  { id: "glass", name: "ガラス", grid: ["N", "K"], key: { N: B.SAND, K: B.COAL }, out: { item: B.GLASS, n: 2 } },
  { id: "brick", name: "れんが", grid: ["D", "K"], key: { D: B.DIRT, K: B.COAL }, out: { item: B.BRICK, n: 2 } },
];
for (const r of RECIPES) {
  r.rows = r.grid.length; r.cols = Math.max(...r.grid.map((s) => s.length));
  r.size = Math.max(r.rows, r.cols) > 2 ? 3 : 2;                 // 必要な マス目（2＝手元で 作れる、3＝さぎょうだい）
  r.cells = r.grid.map((row) => { const o = []; for (let c = 0; c < r.cols; c++) o.push(row[c] && row[c] !== "." ? r.key[row[c]] : 0); return o; });
  r.need = {}; for (const row of r.cells) for (const id of row) if (id) r.need[id] = (r.need[id] || 0) + 1;
}

/* マス目（size×size の 配列。0＝空き）を、まわりの 空きを 切りおとした 形に する */
function trim(cells, size) {
  let r0 = size, r1 = -1, c0 = size, c1 = -1;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (cells[r * size + c]) { r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, c); c1 = Math.max(c1, c); }
  if (r1 < 0) return null;
  const out = [];
  for (let r = r0; r <= r1; r++) { const row = []; for (let c = c0; c <= c1; c++) row.push(cells[r * size + c]); out.push(row); }
  return out;
}
const same = (a, b, mirror) => a.length === b.length && a[0].length === b[0].length && a.every((row, r) => row.every((v, c) => v === b[r][mirror ? row.length - 1 - c : c]));
/* マス目に 合う レシピ（なければ null） */
export function matchRecipe(cells, size) {
  const t = trim(cells, size);
  if (!t) return null;
  for (const r of RECIPES) if (same(t, r.cells, false) || same(t, r.cells, true)) return r;
  return null;
}
/* レシピを マス目に ならべる（レシピ本の 自動配置）。入らなければ null */
export function layoutRecipe(r, size) {
  if (r.rows > size || r.cols > size) return null;
  const cells = new Array(size * size).fill(0);
  const c0 = Math.floor((size - r.cols) / 2);
  for (let y = 0; y < r.rows; y++) for (let x = 0; x < r.cols; x++) cells[y * size + c0 + x] = r.cells[y][x];
  return cells;
}
