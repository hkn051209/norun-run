/* =========================================================
   世界（ボクセル）の データと 地形の 自動生成
   - 同じ seed からは かならず 同じ 地形が できる。
     だから セーブは「seed ＋ 変えた ブロックだけ」で すむ。
   ========================================================= */
import { WORLD } from "./config.js";
import { B, BLOCK_COUNT, isSolid } from "./blocks.js";

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const idx = (x, y, z) => x + WORLD.sx * (z + WORLD.sz * y);

/* 地形を 作る：平地 ＋ 小さい 丘 ＋ 水たまり ＋ 木 */
export function generate(seed) {
  const { sx, sy, sz, baseH, seaY } = WORLD;
  const rnd = mulberry32(seed);
  const d = new Uint8Array(sx * sy * sz);
  const cx = sx / 2, cz = sz / 2;

  // 丘（＋）と 水たまり（−）の 山を、まんなか（スタート）から はなして おく
  const bumps = [];
  const put = (amp, r) => {
    for (let k = 0; k < 60; k++) {
      const x = 5 + rnd() * (sx - 10), z = 5 + rnd() * (sz - 10);
      if (Math.hypot(x - cx, z - cz) < r + 5) continue;
      if (bumps.some((b) => Math.hypot(x - b.x, z - b.z) < (r + b.r) * 0.95)) continue;
      bumps.push({ x, z, amp, r });
      return;
    }
  };
  for (let i = 0; i < 4; i++) put(3 + rnd() * 3, 5 + rnd() * 3);
  for (let i = 0; i < 3; i++) put(-(3.2 + rnd() * 1.3), 4 + rnd() * 2);

  // なめらかな でこぼこ（少しだけ）
  const gs = 6, gw = Math.ceil(sx / gs) + 2;
  const grid = new Float32Array(gw * gw);
  for (let i = 0; i < grid.length; i++) grid[i] = rnd() * 2 - 1;
  const noise = (x, z) => {
    const fx = x / gs, fz = z / gs, ix = Math.floor(fx), iz = Math.floor(fz);
    let tx = fx - ix, tz = fz - iz;
    tx = tx * tx * (3 - 2 * tx); tz = tz * tz * (3 - 2 * tz);
    const g = (a, b) => grid[a + b * gw];
    return (g(ix, iz) * (1 - tx) + g(ix + 1, iz) * tx) * (1 - tz) + (g(ix, iz + 1) * (1 - tx) + g(ix + 1, iz + 1) * tx) * tz;
  };

  const H = new Uint8Array(sx * sz);
  for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++) {
    let dev = noise(x, z) * 0.75, pond = 0;
    for (const b of bumps) {
      const q = ((x + 0.5 - b.x) ** 2 + (z + 0.5 - b.z) ** 2) / (b.r * b.r);
      dev += b.amp * Math.exp(-q);
      if (b.amp < 0) pond += Math.exp(-q / 1.56);
    }
    // スタートの まわりは 平らに
    const dc = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
    const flat = Math.max(0, Math.min(1, (dc - 3) / 4));
    dev *= flat * flat * (3 - 2 * flat);
    const h = Math.max(2, Math.min(sy - 9, Math.round(baseH + dev)));
    H[x + z * sx] = h;
    const sandy = pond > 0.3 && h <= baseH;
    for (let y = 0; y < h; y++) {
      let id;
      if (y === 0) id = B.ROCK;
      else if (y < h - 3) id = B.STONE;
      else if (sandy) id = B.SAND;
      else id = y === h - 1 ? B.GRASS : B.DIRT;
      d[idx(x, y, z)] = id;
    }
    for (let y = h; y <= seaY; y++) d[idx(x, y, z)] = B.WATER;
  }

  // 木
  const trees = [];
  for (let k = 0; k < 90 && trees.length < 14; k++) {
    const x = 3 + Math.floor(rnd() * (sx - 6)), z = 3 + Math.floor(rnd() * (sz - 6));
    const h = H[x + z * sx];
    if (d[idx(x, h - 1, z)] !== B.GRASS) continue;
    if (Math.hypot(x + 0.5 - cx, z + 0.5 - cz) < 5) continue;
    if (trees.some((t) => Math.abs(t.x - x) < 4 && Math.abs(t.z - z) < 4)) continue;
    trees.push({ x, z });
    const th = 3 + Math.floor(rnd() * 2);
    const leaf = (lx, ly, lz) => { if (ly < sy && d[idx(lx, ly, lz)] === B.AIR) d[idx(lx, ly, lz)] = B.LEAF; };
    for (let dy = th - 2; dy <= th + 1; dy++) {
      const r = dy <= th - 1 ? 2 : 1;
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (r === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2 && rnd() < 0.7) continue;
        if (dy === th + 1 && dx !== 0 && dz !== 0) continue;
        leaf(x + dx, h + dy, z + dz);
      }
    }
    for (let dy = 0; dy < th; dy++) d[idx(x, h + dy, z)] = B.LOG;
  }
  return d;
}

export class World {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.base = generate(this.seed);          // 生成した ままの 地形
    this.data = new Uint8Array(this.base);    // いまの 地形
    this.changes = new Map();                 // 変えた 所だけ：位置番号 → ブロックid
  }
  inside(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < WORLD.sx && y < WORLD.sy && z < WORLD.sz; }
  get(x, y, z) {
    if (y < 0) return B.ROCK;
    if (!this.inside(x, y, z)) return B.AIR;
    return this.data[idx(x, y, z)];
  }
  solid(x, y, z) { return isSolid(this.get(x, y, z)); }
  set(x, y, z, id) {
    if (!this.inside(x, y, z)) return false;
    const i = idx(x, y, z);
    this.data[i] = id;
    if (this.base[i] === id) this.changes.delete(i); else this.changes.set(i, id);
    return true;
  }
  /* セーブ用：[位置番号, id, 位置番号, id, …] */
  changesArray() {
    const out = [];
    for (const [i, id] of this.changes) out.push(i, id);
    return out;
  }
  applyChanges(arr) {
    for (let k = 0; k + 1 < arr.length; k += 2) {
      const i = arr[k] | 0, id = arr[k + 1] | 0;
      if (i < 0 || i >= this.data.length || id < 0 || id >= BLOCK_COUNT) continue;
      this.data[i] = id;
      if (this.base[i] === id) this.changes.delete(i); else this.changes.set(i, id);
    }
  }
  /* スタートの 場所（まんなかの 地面の 上） */
  spawn() {
    const x = Math.floor(WORLD.sx / 2), z = Math.floor(WORLD.sz / 2);
    let y = WORLD.sy - 1;
    while (y > 0 && !this.solid(x, y - 1, z)) y--;
    return { x: x + 0.5, y, z: z + 0.5 };
  }
  /* 世界ぜんたいの 指紋（検証用）。1マスでも ちがえば 変わる */
  hash() {
    let h = 0x811c9dc5;
    const d = this.data;
    for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16);
  }
}

/* 視線が さいしょに 当たる ブロックを さがす（マスを 1つずつ たどる） */
export function raycast(world, ox, oy, oz, dx, dy, dz, maxD, hit) {
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const stx = dx > 0 ? 1 : -1, sty = dy > 0 ? 1 : -1, stz = dz > 0 ? 1 : -1;
  const tdx = dx !== 0 ? Math.abs(1 / dx) : Infinity, tdy = dy !== 0 ? Math.abs(1 / dy) : Infinity, tdz = dz !== 0 ? Math.abs(1 / dz) : Infinity;
  let tmx = dx !== 0 ? (dx > 0 ? x + 1 - ox : ox - x) * tdx : Infinity;
  let tmy = dy !== 0 ? (dy > 0 ? y + 1 - oy : oy - y) * tdy : Infinity;
  let tmz = dz !== 0 ? (dz > 0 ? z + 1 - oz : oz - z) * tdz : Infinity;
  let nx = 0, ny = 0, nz = 0, t = 0;
  for (let n = 0; n < 256 && t <= maxD; n++) {
    const id = world.get(x, y, z);
    if (hit(id) && world.inside(x, y, z)) return { x, y, z, nx, ny, nz, t, id };
    if (tmx <= tmy && tmx <= tmz) { t = tmx; tmx += tdx; x += stx; nx = -stx; ny = 0; nz = 0; }
    else if (tmy <= tmz) { t = tmy; tmy += tdy; y += sty; nx = 0; ny = -sty; nz = 0; }
    else { t = tmz; tmz += tdz; z += stz; nx = 0; ny = 0; nz = -stz; }
  }
  return null;
}
