/* =========================================================
   絵を コードで 作る（画像ファイルは 使わない）
   - ブロック：16×16 の ドット絵 → 128×128 の 1まい（8×8 マス）
   - ヒビ：4段階
   - 道具・持ち物の アイコン：64×64
   ========================================================= */
import { T } from "./blocks.js";

export const TILE = 16;
export const GRID = 8;

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
  const n = r(); const base = [141, 101, 70];
  if (n < 0.1) return shade(base, 0.74);
  if (n > 0.9) return shade(base, 1.14);
  return shade(base, 0.94 + r() * 0.12);
};
const grass = (x, y, r) => {
  const n = r(); const base = [104, 182, 78];
  if (n < 0.12) return shade(base, 0.82);
  if (n > 0.88) return [150, 214, 96];
  return shade(base, 0.95 + r() * 0.1);
};
const plank = (x, y, r) => {
  const base = [204, 164, 104];
  const row = Math.floor(y / 4);
  if (y % 4 === 3) return shade(base, 0.68);
  if (x === (row % 2 === 0 ? 5 : 12)) return shade(base, 0.74);
  return shade(base, (row % 2 ? 0.96 : 1.03) * (0.97 + r() * 0.06));
};

export function makeAtlas() {
  const cv = document.createElement("canvas");
  cv.width = cv.height = TILE * GRID;
  const ctx = cv.getContext("2d");
  const img = ctx.createImageData(cv.width, cv.height);

  paint(img, T.GRASS_TOP, 11, grass);
  paint(img, T.DIRT, 22, dirt);
  {
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
    const n = r();
    return shade([232, 214, 156], n < 0.1 ? 0.9 : n > 0.92 ? 1.06 : 0.98 + r() * 0.04);
  });
  paint(img, T.LOG_SIDE, 66, (x, y, r) => {
    const stripe = x % 4 === 0 ? 0.78 : x % 4 === 2 ? 1.08 : 1;
    const knot = (x === 6 && (y === 4 || y === 5)) || (x === 11 && (y === 10 || y === 11));
    return shade([126, 90, 56], knot ? 0.6 : stripe * (0.95 + r() * 0.1));
  });
  paint(img, T.LOG_TOP, 77, (x, y, r) => {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    if (d > 7) return shade([126, 90, 56], 0.85);
    return shade(Math.floor(d) % 2 === 0 ? [214, 176, 118] : [180, 140, 90], 0.96 + r() * 0.08);
  });
  paint(img, T.LEAF, 88, (x, y, r) => {
    const n = r(); const base = [62, 148, 70];
    if (n < 0.18) return shade(base, 0.68);
    if (n > 0.86) return [110, 190, 92];
    return shade(base, 0.92 + r() * 0.16);
  });
  paint(img, T.PLANK, 99, plank);
  paint(img, T.GLASS, 110, (x, y) => {
    if (x === 0 || y === 0 || x === 15 || y === 15) return [214, 238, 248, 255];
    const shine = (x + y === 7 && x > 1 && x < 6) || (x + y === 9 && x > 2 && x < 6) || (x + y === 22 && x > 9 && x < 13);
    return shine ? [255, 255, 255, 255] : [200, 232, 248, 0];
  });
  paint(img, T.BRICK, 121, (x, y, r) => {
    const row = Math.floor(y / 4); const mortar = [222, 214, 200];
    if (y % 4 === 3) return shade(mortar, 0.96 + r() * 0.06);
    const off = row % 2 === 0 ? 0 : 4;
    if ((x + off) % 8 === 7) return shade(mortar, 0.96 + r() * 0.06);
    return shade([196, 104, 78], 0.92 + ((Math.floor((x + off) / 8) + row) % 3) * 0.05 + r() * 0.06);
  });
  paint(img, T.WATER, 132, (x, y, r) => {
    const wave = (y % 5 === 1 && (x + Math.floor(y / 5) * 3) % 8 < 4);
    return wave ? [150, 210, 250, 190] : [58 + r() * 10, 140 + r() * 10, 226, 165];
  });
  paint(img, T.ROCK, 143, (x, y, r) => (r() < 0.14 ? [120, 96, 150] : shade([70, 66, 86], 0.85 + r() * 0.3)));

  // さぎょうだい：上は マス目の 板、横は 板＋道具の 絵
  paint(img, T.BENCH_TOP, 154, (x, y, r) => {
    const base = [222, 186, 126];
    if (x === 0 || y === 0 || x === 15 || y === 15) return shade([150, 104, 60], 1);
    if (x === 5 || x === 10 || y === 5 || y === 10) return shade(base, 0.72);
    return shade(base, 0.97 + r() * 0.06);
  });
  paint(img, T.BENCH_SIDE, 165, (x, y, r) => {
    if (y < 3) return shade([150, 104, 60], 0.95 + r() * 0.1);
    const p = plank(x, y, r);
    const saw = (y === 7 && x > 2 && x < 9) || (y === 8 && x > 2 && x < 9 && x % 2 === 0);
    const ham = (x === 12 && y > 5 && y < 13) || (y === 6 && x > 9 && x < 15) || (y === 7 && x > 9 && x < 15);
    if (saw) return [120, 130, 140];
    if (ham) return (y < 8 ? [110, 116, 126] : [120, 84, 50]);
    return p;
  });
  // ベッド：上は まくら＋ふとん、横は ふとん＋木の あし
  paint(img, T.BED_TOP, 176, (x, y, r) => {
    if (y < 5) return (x > 2 && x < 13 && y > 0) ? shade([250, 250, 255], 0.96 + r() * 0.04) : [232, 226, 240];
    if (y === 5) return [150, 80, 170];
    const star = ((x === 4 && y === 9) || (x === 11 && y === 12) || (x === 7 && y === 13));
    return star ? [255, 226, 110] : shade([178, 110, 204], 0.95 + r() * 0.08);
  });
  paint(img, T.BED_SIDE, 187, (x, y, r) => {
    if (y < 7) return shade([178, 110, 204], 0.92 + r() * 0.08);
    if (y === 7) return [130, 70, 150];
    if (y > 11 && x > 3 && x < 12) return shade([110, 76, 46], 0.9);
    return shade([170, 126, 78], 0.94 + r() * 0.1);
  });
  // おはな（ばってんに 立てて 表示。まわりは すきとおる）
  paint(img, T.FLOWER, 198, (x, y) => {
    const dx = x - 7.5, dy = y - 5;
    const d = Math.hypot(dx, dy);
    if (d < 1.6) return [255, 214, 70];
    if (d < 4.4 && (Math.abs(dx) < 1.6 || Math.abs(dy) < 1.6 || Math.abs(Math.abs(dx) - Math.abs(dy)) < 1.3)) return [255, 150, 196];
    if ((x === 7 || x === 8) && y > 8) return [70, 160, 70];
    if (y > 10 && y < 14 && ((x > 3 && x < 7 && x + y === 17) || (x > 8 && x < 12 && y - x === 2) || (x === 5 && y === 12) || (x === 10 && y === 12))) return [90, 180, 80];
    return [0, 0, 0, 0];
  });
  // いろブロック：白い 絵に、あとで 色を かける（mesher が 色を のせる）
  paint(img, T.COLOR, 209, (x, y, r) => {
    if (x === 0 || y === 0) return [255, 255, 255];
    if (x === 15 || y === 15) return [196, 196, 196];
    const dot = (x % 5 === 2 && y % 5 === 2);
    return dot ? [255, 255, 255] : shade([232, 232, 232], 0.98 + r() * 0.03);
  });

  ctx.putImageData(img, 0, 0);
  return cv;
}

/* ブロックの タイル 1まいを 小さい canvas に 写す。tint（#rrggbb）が あれば 色を かける */
export function tileIcon(atlas, tile, size = 32, tint = null) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  if (tile === T.GLASS) { ctx.fillStyle = "rgba(190,228,246,.55)"; ctx.fillRect(0, 0, size, size); }
  ctx.drawImage(atlas, (tile % GRID) * TILE, Math.floor(tile / GRID) * TILE, TILE, TILE, 0, 0, size, size);
  if (tint) { ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = tint; ctx.fillRect(0, 0, size, size); }
  return cv;
}

/* ヒビ：4段階を 横に ならべた 絵（64×16）。段階が 進むほど 線が ふえる */
export function makeCracks() {
  const cv = document.createElement("canvas");
  cv.width = TILE * 4; cv.height = TILE;
  const ctx = cv.getContext("2d");
  const r = rng(4242);
  const lines = [];
  for (let i = 0; i < 9; i++) {
    let x = 4 + r() * 8, y = 4 + r() * 8; const pts = [[x, y]];
    const a0 = r() * Math.PI * 2;
    for (let k = 0; k < 5; k++) { const a = a0 + (r() - 0.5) * 1.6; x += Math.cos(a) * 2.2; y += Math.sin(a) * 2.2; pts.push([x, y]); }
    lines.push(pts);
  }
  for (let s = 0; s < 4; s++) {
    const n = [2, 4, 6, 9][s];
    for (let i = 0; i < n; i++) for (const [px, py] of lines[i]) {
      const x = Math.round(px), y = Math.round(py);
      if (x < 0 || y < 0 || x > 15 || y > 15) continue;
      ctx.fillStyle = "rgba(20,16,24,0.8)"; ctx.fillRect(s * TILE + x, y, 1, 1);
    }
  }
  return cv;
}

/* 道具・持ち物の アイコン（64×64）。tier：1＝木、2＝石 */
export function drawIcon(kind, tier = 1) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 64;
  const c = cv.getContext("2d");
  c.lineCap = "round"; c.lineJoin = "round";
  const wood = "#9a6a3a", woodD = "#6e4826";
  const head = tier === 2 ? "#9aa0aa" : "#c79a5c", headD = tier === 2 ? "#6c727c" : "#8f6a38";
  const line = (x0, y0, x1, y1, w, col) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
  const handle = () => { line(13, 53, 42, 22, 9, woodD); line(13, 53, 42, 22, 5, wood); };
  if (kind === "pick") {
    handle();
    for (const [w, col] of [[11, headD], [6, head]]) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(18, 14); c.quadraticCurveTo(48, 8, 54, 42); c.stroke(); }
  } else if (kind === "axe") {
    handle();
    c.fillStyle = headD; c.beginPath(); c.moveTo(30, 12); c.lineTo(52, 8); c.quadraticCurveTo(62, 22, 54, 36); c.lineTo(36, 30); c.closePath(); c.fill();
    c.fillStyle = head; c.beginPath(); c.moveTo(34, 15); c.lineTo(50, 12); c.quadraticCurveTo(56, 22, 51, 31); c.lineTo(39, 27); c.closePath(); c.fill();
  } else if (kind === "shovel") {
    line(12, 54, 38, 26, 9, woodD); line(12, 54, 38, 26, 5, wood);
    c.fillStyle = headD; c.beginPath(); c.moveTo(34, 20); c.lineTo(48, 8); c.quadraticCurveTo(62, 10, 58, 22); c.lineTo(46, 34); c.closePath(); c.fill();
    c.fillStyle = head; c.beginPath(); c.moveTo(38, 21); c.lineTo(49, 12); c.quadraticCurveTo(57, 13, 55, 21); c.lineTo(46, 30); c.closePath(); c.fill();
  } else if (kind === "rod") {
    line(8, 56, 52, 8, 6, woodD); line(8, 56, 52, 8, 3, wood);
    line(52, 8, 52, 40, 1.5, "#e8eef4");
    c.fillStyle = "#ff5a5a"; c.beginPath(); c.arc(52, 44, 5, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#fff"; c.beginPath(); c.arc(52, 42, 5, Math.PI, 0); c.fill();
  } else if (kind === "stick") {
    line(16, 50, 48, 14, 9, woodD); line(16, 50, 48, 14, 5, wood);
  } else if (kind === "fish") {
    c.fillStyle = "#3d8fd8"; c.beginPath(); c.moveTo(48, 32); c.lineTo(60, 20); c.lineTo(60, 44); c.closePath(); c.fill();
    c.fillStyle = "#5fb0ee"; c.beginPath(); c.ellipse(30, 32, 22, 13, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#bfe4ff"; c.beginPath(); c.ellipse(28, 37, 14, 5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#fff"; c.beginPath(); c.arc(17, 29, 4, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#223"; c.beginPath(); c.arc(16, 29, 2, 0, Math.PI * 2); c.fill();
  } else if (kind === "heart") {
    c.fillStyle = "#ff5c7a"; c.beginPath(); c.moveTo(32, 54); c.bezierCurveTo(4, 34, 10, 10, 32, 22); c.bezierCurveTo(54, 10, 60, 34, 32, 54); c.fill();
  } else if (kind === "hand") {
    c.fillStyle = "#fff"; c.strokeStyle = "#5a4a6a"; c.lineWidth = 3;
    c.beginPath(); c.ellipse(32, 36, 17, 15, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    for (const x of [20, 28, 36, 44]) { c.beginPath(); c.ellipse(x, 20, 4.5, 8, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
    c.beginPath(); c.ellipse(32, 38, 15, 12, 0, 0, Math.PI * 2); c.fill();
  }
  return cv;
}
