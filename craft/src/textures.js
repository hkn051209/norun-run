/* =========================================================
   ブロックの 絵を コードで 作る（16×16 の ドット絵 × 16まい → 64×64 の 1まい）
   画像ファイルは 使わない。ぜんぶ 色と かんたんな 模様の 自動生成。
   ========================================================= */
import { T } from "./blocks.js";

export const TILE = 16;
export const GRID = 4;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k, c[3] === undefined ? 255 : c[3]];

/* fn(x, y, r) → [r,g,b,(a)] を 16×16 に ぬる */
function paint(img, tile, seed, fn) {
  const r = rng(seed);
  const ox = (tile % GRID) * TILE, oy = Math.floor(tile / GRID) * TILE;
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const c = fn(x, y, r);
    const i = ((oy + y) * TILE * GRID + ox + x) * 4;
    img.data[i] = clamp(c[0]); img.data[i + 1] = clamp(c[1]); img.data[i + 2] = clamp(c[2]);
    img.data[i + 3] = c[3] === undefined ? 255 : clamp(c[3]);
  }
}

const dirt = (x, y, r) => {
  const n = r();
  const base = [141, 101, 70];
  if (n < 0.1) return shade(base, 0.74);
  if (n > 0.9) return shade(base, 1.14);
  return shade(base, 0.94 + r() * 0.12);
};
const grass = (x, y, r) => {
  const n = r();
  const base = [104, 182, 78];
  if (n < 0.12) return shade(base, 0.82);
  if (n > 0.88) return [150, 214, 96];
  return shade(base, 0.95 + r() * 0.1);
};

export function makeAtlas() {
  const cv = document.createElement("canvas");
  cv.width = cv.height = TILE * GRID;
  const ctx = cv.getContext("2d");
  const img = ctx.createImageData(cv.width, cv.height);

  paint(img, T.GRASS_TOP, 11, grass);
  paint(img, T.DIRT, 22, dirt);
  {
    // くさの よこ：土の 上に ぎざぎざの 草
    const edge = []; const er = rng(33);
    for (let x = 0; x < TILE; x++) edge.push(3 + Math.floor(er() * 3));
    const rg = rng(34), rd = rng(35);
    paint(img, T.GRASS_SIDE, 36, (x, y) => (y < edge[x] ? grass(x, y, rg) : dirt(x, y, rd)));
  }
  paint(img, T.STONE, 44, (x, y, r) => {
    const base = [142, 146, 152];
    const crack = (x * 7 + y * 13) % 29 === 0 || ((x + y * 3) % 17 === 0 && r() < 0.6);
    if (crack) return shade(base, 0.7);
    const n = r();
    return shade(base, n < 0.15 ? 0.88 : n > 0.85 ? 1.08 : 0.97 + r() * 0.06);
  });
  paint(img, T.SAND, 55, (x, y, r) => {
    const base = [232, 214, 156];
    const n = r();
    return shade(base, n < 0.1 ? 0.9 : n > 0.92 ? 1.06 : 0.98 + r() * 0.04);
  });
  paint(img, T.LOG_SIDE, 66, (x, y, r) => {
    const base = [126, 90, 56];
    const stripe = x % 4 === 0 ? 0.78 : x % 4 === 2 ? 1.08 : 1;
    const knot = (x === 6 && (y === 4 || y === 5)) || (x === 11 && (y === 10 || y === 11));
    return shade(base, knot ? 0.6 : stripe * (0.95 + r() * 0.1));
  });
  paint(img, T.LOG_TOP, 77, (x, y, r) => {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    if (d > 7) return shade([126, 90, 56], 0.85);
    const ring = Math.floor(d) % 2 === 0;
    return shade(ring ? [214, 176, 118] : [180, 140, 90], 0.96 + r() * 0.08);
  });
  paint(img, T.LEAF, 88, (x, y, r) => {
    const base = [62, 148, 70];
    const n = r();
    if (n < 0.18) return shade(base, 0.68);
    if (n > 0.86) return [110, 190, 92];
    return shade(base, 0.92 + r() * 0.16);
  });
  paint(img, T.PLANK, 99, (x, y, r) => {
    const base = [204, 164, 104];
    const row = Math.floor(y / 4);
    if (y % 4 === 3) return shade(base, 0.68);
    const joint = (row % 2 === 0 ? 5 : 12);
    if (x === joint) return shade(base, 0.74);
    return shade(base, (row % 2 ? 0.96 : 1.03) * (0.97 + r() * 0.06));
  });
  paint(img, T.GLASS, 110, (x, y) => {
    const edge = x === 0 || y === 0 || x === 15 || y === 15;
    if (edge) return [214, 238, 248, 255];
    const shine = (x + y === 7 && x > 1 && x < 6) || (x + y === 9 && x > 2 && x < 6) || (x + y === 22 && x > 9 && x < 13);
    if (shine) return [255, 255, 255, 255];
    return [200, 232, 248, 0];
  });
  paint(img, T.BRICK, 121, (x, y, r) => {
    const row = Math.floor(y / 4);
    const mortar = [222, 214, 200];
    if (y % 4 === 3) return shade(mortar, 0.96 + r() * 0.06);
    const off = row % 2 === 0 ? 0 : 4;
    if ((x + off) % 8 === 7) return shade(mortar, 0.96 + r() * 0.06);
    const tone = ((Math.floor((x + off) / 8) + row) % 3) * 0.05;
    return shade([196, 104, 78], 0.92 + tone + r() * 0.06);
  });
  paint(img, T.WATER, 132, (x, y, r) => {
    const wave = (y % 5 === 1 && (x + Math.floor(y / 5) * 3) % 8 < 4);
    return wave ? [150, 210, 250, 190] : [58 + r() * 10, 140 + r() * 10, 226, 165];
  });
  paint(img, T.ROCK, 143, (x, y, r) => {
    const base = [70, 66, 86];
    const n = r();
    if (n < 0.14) return [120, 96, 150];
    return shade(base, 0.85 + r() * 0.3);
  });

  ctx.putImageData(img, 0, 0);
  return cv;
}

/* ホットバー用：タイル 1まいを 小さい canvas に 写す */
export function tileIcon(atlas, tile, size = 32) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  if (tile === T.GLASS) { ctx.fillStyle = "rgba(190,228,246,.55)"; ctx.fillRect(0, 0, size, size); }
  ctx.drawImage(atlas, (tile % GRID) * TILE, Math.floor(tile / GRID) * TILE, TILE, TILE, 0, 0, size, size);
  return cv;
}
