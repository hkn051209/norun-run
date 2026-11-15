/* =========================================================
   世界（ボクセル）の データと、シードからの 地形の 自動生成（v3：256×256×40）
   - 同じ seed からは かならず 同じ 地形が できる。
     だから セーブは「seed ＋ 変えた ブロックだけ」で すむ（世界ぜんたいは 保存しない）。
   - 生成の 順：高さと バイオーム → 地面と 水 → 洞窟 → 鉱石と 結晶 → 木 → おはな
   ========================================================= */
import { WORLD, NIGHT } from "./config.js";
import { B, BLOCKS, BLOCK_COUNT, isSolid, isSky } from "./blocks.js";

export const BIOME = { PLAINS: 0, FOREST: 1, SNOW: 2, WATER: 3 };
export const BIOME_NAME = ["そうげん", "もり", "ゆきはら", "みずべ"];

const { sx: SX, sy: SY, sz: SZ, sea: SEA } = WORLD;
const idx = (x, y, z) => x + SX * (z + SZ * y);

/* ---- 乱数（場所と seed から 決まる 値。0〜1） ---- */
function h2(ix, iz, s) {
  let h = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + Math.imul(s, 0x9e3779b1)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function h3(ix, iy, iz, s) {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 0x85ebca6b) + Math.imul(iz, 668265263) + Math.imul(s, 0x9e3779b1)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const sm = (t) => t * t * (3 - 2 * t);
/* なめらかな 乱数（2次元） */
function n2(x, z, s) {
  const ix = Math.floor(x), iz = Math.floor(z), tx = sm(x - ix), tz = sm(z - iz);
  const a = h2(ix, iz, s), b = h2(ix + 1, iz, s), c = h2(ix, iz + 1, s), d = h2(ix + 1, iz + 1, s);
  return (a + (b - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz;
}
const fbm2 = (x, z, s) => n2(x, z, s) * 0.57 + n2(x * 2.1, z * 2.1, s + 11) * 0.29 + n2(x * 4.3, z * 4.3, s + 23) * 0.14;
/* なめらかな 乱数（3次元） */
function n3(x, y, z, s) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), tx = sm(x - ix), ty = sm(y - iy), tz = sm(z - iz);
  const l = (a, b, t) => a + (b - a) * t;
  const y0 = l(l(h3(ix, iy, iz, s), h3(ix + 1, iy, iz, s), tx), l(h3(ix, iy, iz + 1, s), h3(ix + 1, iy, iz + 1, s), tx), tz);
  const y1 = l(l(h3(ix, iy + 1, iz, s), h3(ix + 1, iy + 1, iz, s), tx), l(h3(ix, iy + 1, iz + 1, s), h3(ix + 1, iy + 1, iz + 1, s), tx), tz);
  return l(y0, y1, ty);
}

/* 地形を 作る。返す 物：{ data（ブロック）, biome（柱ごとの バイオーム）, height（柱ごとの 地面の 高さ） } */
export function generate(seed) {
  const s = seed | 0;
  const d = new Uint8Array(SX * SY * SZ);
  const biome = new Uint8Array(SX * SZ), H = new Uint8Array(SX * SZ);

  // 1) 高さ と バイオーム
  for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) {
    const e = fbm2(x / 70, z / 70, s + 1);               // 大きな 起伏
    const m = n2(x / 95, z / 95, s + 2);                 // 山に なる 所
    const dt = fbm2(x / 22, z / 22, s + 3);              // 小さな でこぼこ
    let h = 10.5 + e * 19 + (dt - 0.5) * 4;
    const mt = Math.max(0, m - 0.56);
    h += mt * 44;
    if (mt > 0.05) h = h * 0.35 + Math.floor(h / 3) * 3 * 0.65;   // 山は 段々に（崖）
    const hh = Math.max(4, Math.min(SY - 9, Math.round(h)));
    H[x + z * SX] = hh;
    // 北（z が 小さい 方）ほど 寒い → 雪原。しめった 所は 森
    const temp = fbm2(x / 110, z / 110, s + 4) * 0.55 + (z / SZ) * 0.6;
    const wet = fbm2(x / 60, z / 60, s + 5);
    biome[x + z * SX] = hh < SEA ? BIOME.WATER : temp < 0.4 ? BIOME.SNOW : wet > 0.53 ? BIOME.FOREST : BIOME.PLAINS;
  }
  const cold = (x, z) => fbm2(x / 110, z / 110, s + 4) * 0.55 + (z / SZ) * 0.6 < 0.4;

  // 2) 地面 と 水
  for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) {
    const h = H[x + z * SX], bi = biome[x + z * SX];
    const sandy = h <= SEA + 1;
    const snowy = bi === BIOME.SNOW || (bi === BIOME.WATER && cold(x, z));
    for (let y = 0; y < h; y++) {
      let id;
      if (y === 0) id = B.ROCK;
      else if (y < h - 3) id = B.STONE;
      else if (sandy) id = B.SAND;
      else if (y === h - 1) id = snowy ? B.SNOW : h > 31 ? B.STONE : B.GRASS;
      else id = B.DIRT;
      d[idx(x, y, z)] = id;
    }
    for (let y = h; y < SEA; y++) d[idx(x, y, z)] = y === SEA - 1 && snowy ? B.ICE : B.WATER;
  }

  // 3) 洞窟：通路（2つの 乱数が ともに まん中に 近い 所）＋ 深い 所の 広間。深いほど 広い
  for (let z = 1; z < SZ - 1; z++) for (let x = 1; x < SX - 1; x++) {
    const h = H[x + z * SX];
    if (h < SEA + 1) continue;                               // 水の 下は ほらない（水が 流れない ため）
    let dry = true;                                          // となりが 水でも ほらない
    for (let k = 0; k < 4 && dry; k++) { const nx = x + [1, -1, 0, 0][k], nz = z + [0, 0, 1, -1][k]; if (H[nx + nz * SX] < SEA) dry = false; }
    if (!dry) continue;
    const mouth = n2(x / 26, z / 26, s + 9) > 0.7;           // 地上に 口が 開く 所
    const top = mouth ? h : h - 4;
    for (let y = 2; y < top; y++) {
      const depth = 1 - y / 26;                               // 0（浅い）〜1（深い）
      const w = 0.045 + 0.06 * Math.max(0, depth);
      const a = n3(x / 15, y / 9, z / 15, s + 6), b = n3(x / 15, y / 9, z / 15, s + 7);
      let cave = Math.abs(a - 0.5) < w && Math.abs(b - 0.5) < w * 1.25;
      if (!cave && y < 13) cave = n3(x / 19, y / 10, z / 19, s + 8) > 0.735;   // 広間
      if (cave) d[idx(x, y, z)] = B.AIR;
    }
  }

  // 4) 鉱石（石の 中）と、洞窟の 床に 生える あかりけっしょう
  for (let z = 1; z < SZ - 1; z++) for (let x = 1; x < SX - 1; x++) {
    const h = H[x + z * SX];
    for (let y = 1; y < h - 2; y++) {
      const i = idx(x, y, z), id = d[i];
      if (id === B.STONE) {
        if (y >= 9 && n3(x / 2.6, y / 2.6, z / 2.6, s + 12) > 0.8) d[i] = B.COAL;            // 浅い 所：くろいし
        else if (y < 11 && n3(x / 2.3, y / 2.3, z / 2.3, s + 13) > 0.86) d[i] = B.STAR;     // 深い 所：ほしのいし
      } else if (id === B.AIR && d[idx(x, y - 1, z)] === B.STONE && h3(x, y, z, s + 14) < 0.008) d[i] = B.LAMP;
    }
  }

  // 5) 木（森に 集まる。雪原の 木は 雪を かぶる）
  const G = 4;
  for (let gz = 1; gz < SZ / G - 1; gz++) for (let gx = 1; gx < SX / G - 1; gx++) {
    const x = gx * G + Math.floor(h2(gx, gz, s + 20) * G), z = gz * G + Math.floor(h2(gx, gz, s + 21) * G);
    const bi = biome[x + z * SX], h = H[x + z * SX];
    const p = bi === BIOME.FOREST ? 0.62 : bi === BIOME.PLAINS ? 0.045 : bi === BIOME.SNOW ? 0.13 : 0;
    if (h2(gx, gz, s + 22) >= p) continue;
    const ground = d[idx(x, h - 1, z)];
    if ((ground !== B.GRASS && ground !== B.SNOW) || d[idx(x, h, z)] !== B.AIR) continue;
    const th = 3 + Math.floor(h2(gx, gz, s + 23) * 3);
    if (h + th + 3 >= SY) continue;
    for (let dy = th - 2; dy <= th + 1; dy++) {
      const r = dy <= th - 1 ? 2 : 1;
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (r === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2 && h3(x + dx, dy, z + dz, s + 24) < 0.7) continue;
        if (dy === th + 1 && dx !== 0 && dz !== 0) continue;
        const li = idx(x + dx, h + dy, z + dz);
        if (d[li] === B.AIR) d[li] = B.LEAF;
      }
    }
    for (let dy = 0; dy < th; dy++) d[idx(x, h + dy, z)] = B.LOG;
    if (bi === BIOME.SNOW) {                                  // 雪を かぶせる
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) for (let y = h + th + 2; y > h + 1; y--) {
        if (d[idx(x + dx, y - 1, z + dz)] === B.LEAF && d[idx(x + dx, y, z + dz)] === B.AIR) { d[idx(x + dx, y, z + dz)] = B.SNOW; break; }
      }
    }
  }

  // 6) おはな（草原。花畑に なる 所が ある）
  for (let z = 2; z < SZ - 2; z++) for (let x = 2; x < SX - 2; x++) {
    if (biome[x + z * SX] !== BIOME.PLAINS) continue;
    const h = H[x + z * SX];
    if (d[idx(x, h - 1, z)] !== B.GRASS || d[idx(x, h, z)] !== B.AIR) continue;
    const meadow = n2(x / 16, z / 16, s + 30) > 0.66;
    if (h2(x, z, s + 31) < (meadow ? 0.14 : 0.004)) d[idx(x, h, z)] = B.FLOWER;
  }
  return { data: d, biome, height: H };
}

export class World {
  constructor(seed) {
    this.seed = seed >>> 0;
    const g = generate(this.seed);
    this.base = g.data;                       // 生成した ままの 地形
    this.data = new Uint8Array(this.base);    // いまの 地形
    this.biome = g.biome;
    this.changes = new Map();                 // 変えた 所だけ：位置番号 → ブロック番号
    this.skyTop = new Int8Array(SX * SZ);     // 柱ごと：空を さえぎる いちばん 上の ブロックの y（なければ -1）
    this.lights = new Map();                  // あかり（あかりけっしょう）の 場所：位置番号 → [x, y, z]
    for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) this.updateTop(x, z);
    const d = this.data;
    for (let i = 0; i < d.length; i++) if (d[i] === B.LAMP) this.lights.set(i, [i % SX, Math.floor(i / (SX * SZ)), Math.floor(i / SX) % SZ]);
  }
  updateTop(x, z) {
    let y = SY - 1;
    while (y >= 0 && !isSky(this.data[idx(x, y, z)])) y--;
    this.skyTop[x + z * SX] = y;
  }
  inside(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < SX && y < SY && z < SZ; }
  get(x, y, z) {
    if (y < 0) return B.ROCK;
    if (!this.inside(x, y, z)) return B.AIR;
    return this.data[idx(x, y, z)];
  }
  solid(x, y, z) { return isSolid(this.get(x, y, z)); }
  write(i, id) {
    const x = i % SX, y = Math.floor(i / (SX * SZ)), z = Math.floor(i / SX) % SZ;
    this.data[i] = id;
    if (this.base[i] === id) this.changes.delete(i); else this.changes.set(i, id);
    if (id === B.LAMP) this.lights.set(i, [x, y, z]); else this.lights.delete(i);
    this.updateTop(x, z);
  }
  set(x, y, z, id) {
    if (!this.inside(x, y, z)) return false;
    this.write(idx(x, y, z), id);
    return true;
  }
  /* セーブ用：[位置番号, 番号, 位置番号, 番号, …]（生成直後と ちがう マスだけ） */
  changesArray() {
    const out = [];
    for (const [i, id] of this.changes) out.push(i, id);
    return out;
  }
  applyChanges(arr) {
    for (let k = 0; k + 1 < arr.length; k += 2) {
      const i = arr[k] | 0, id = arr[k + 1] | 0;
      if (i < 0 || i >= this.data.length || id < 0 || id >= BLOCK_COUNT || (id !== 0 && !BLOCKS[id])) continue;
      this.write(i, id);
    }
  }
  biomeAt(x, z) { return x < 0 || z < 0 || x >= SX || z >= SZ ? BIOME.PLAINS : this.biome[Math.floor(x) + Math.floor(z) * SX]; }
  /* (x, z) の いちばん 上の つまった ブロックの y（なければ -1） */
  topSolid(x, z) { for (let y = SY - 1; y >= 0; y--) if (this.solid(x, y, z)) return y; return -1; }

  /* その マスに 空の 光が どれだけ とどくか（0＝地下 〜 1＝空の 下）。
     空を さえぎる ブロックの 下に 入ると、深さ caveDepth マスで 0 に なる。となりの 柱が 明るければ 少し もらう */
  skyCol(x, y, z) {
    if (x < 0 || z < 0 || x >= SX || z >= SZ) return 1;
    const top = this.skyTop[x + z * SX];
    return y > top ? 1 : Math.max(0, 1 - (top - y) / NIGHT.caveDepth);
  }
  skyAt(x, y, z) {
    const a = this.skyCol(x, y, z);
    if (a >= 1) return 1;
    const b = Math.max(this.skyCol(x + 1, y, z), this.skyCol(x - 1, y, z), this.skyCol(x, y, z + 1), this.skyCol(x, y, z - 1)) - 0.3;
    return Math.max(a, b);
  }
  /* その 場所に あかりが どれだけ とどくか（0〜1）。list：近くの あかりの 一覧 */
  lampAt(x, y, z, list) {
    let best = 0;
    for (let k = 0; k < list.length; k++) {
      const L = list[k], dx = L[0] + 0.5 - x, dy = L[1] + 0.5 - y, dz = L[2] + 0.5 - z;
      const v = 1 - Math.sqrt(dx * dx + dy * dy + dz * dz) / NIGHT.lampR;
      if (v > best) best = v;
    }
    return best;
  }
  /* (x0..x1, z0..z1) の 近く（＋lampR）に ある あかりの 一覧 */
  lightsNear(x0, z0, x1, z1) {
    const out = [], R = NIGHT.lampR;
    for (const L of this.lights.values()) if (L[0] >= x0 - R && L[0] <= x1 + R && L[2] >= z0 - R && L[2] <= z1 + R) out.push(L);
    return out;
  }

  /* スタートの 場所：世界の まん中から いちばん 近い、草原か 森の 陸の 上 */
  spawn() {
    const cx = SX >> 1, cz = SZ >> 1;
    for (let r = 0; r < SX / 2 - 4; r++) {
      for (let k = 0; k < Math.max(1, r * 8); k++) {
        const a = (k / Math.max(1, r * 8)) * Math.PI * 2;
        const x = Math.round(cx + Math.cos(a) * r), z = Math.round(cz + Math.sin(a) * r);
        const bi = this.biome[x + z * SX];
        if (bi !== BIOME.PLAINS && bi !== BIOME.FOREST) continue;
        const y = this.topSolid(x, z);
        const id = this.get(x, y, z);
        if (id === B.GRASS && this.get(x, y + 1, z) === B.AIR && this.get(x, y + 2, z) === B.AIR) return { x: x + 0.5, y: y + 1, z: z + 0.5 };
      }
    }
    const y = this.topSolid(cx, cz);
    return { x: cx + 0.5, y: y + 1, z: cz + 0.5 };
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
    if (n > 0 && hit(id) && world.inside(x, y, z)) return { x, y, z, nx, ny, nz, t, id };   // 出発点の マスは 数えない
    if (tmx <= tmy && tmx <= tmz) { t = tmx; tmx += tdx; x += stx; nx = -stx; ny = 0; nz = 0; }
    else if (tmy <= tmz) { t = tmy; tmy += tdy; y += sty; nx = 0; ny = -sty; nz = 0; }
    else { t = tmz; tmz += tdz; z += stz; nx = 0; ny = 0; nz = -stz; }
  }
  return null;
}
