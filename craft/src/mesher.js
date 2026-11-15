/* =========================================================
   ブロックの 集まりを 描画用の 形（メッシュ）に する
   - 16×16 の 柱（チャンク）ごとに 1つ。外から 見える 面だけ 作る
   - 不透明＋ガラス＋おはな（ぬき）で 1つ、水（半とうめい）で 1つ
   - いろブロックは 白い 絵に 頂点の 色を かけて 色を 出す
   ========================================================= */
import * as THREE from "three";
import { WORLD } from "./config.js";
import { B, BLOCKS, isOpaque } from "./blocks.js";
import { COLORS } from "./colors.js";
import { GRID } from "./textures.js";

const FACES = [
  { d: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], s: 0.82, k: "side" },
  { d: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], s: 0.82, k: "side" },
  { d: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], s: 1.0, k: "top" },
  { d: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], s: 0.55, k: "bottom" },
  { d: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], s: 0.7, k: "side" },
  { d: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], s: 0.7, k: "side" },
];
/* おはな：ばってんの 2まい（表と 裏） */
const A = 0.14, Z = 0.86;
const CROSS = [
  [[A, 0, A], [Z, 0, Z], [Z, 1, Z], [A, 1, A]], [[Z, 0, Z], [A, 0, A], [A, 1, A], [Z, 1, Z]],
  [[A, 0, Z], [Z, 0, A], [Z, 1, A], [A, 1, Z]], [[Z, 0, A], [A, 0, Z], [A, 1, Z], [Z, 1, A]],
];
const UV = [[0, 0], [1, 0], [1, 1], [0, 1]];
const E = 0.002;
const WATER_TOP = 0.86;
const WHITE = [1, 1, 1];
const TINT = COLORS.map((c) => { const k = new THREE.Color(c.hex); return [k.r, k.g, k.b]; });   // 計算用（リニア）の 色

class Buf {
  constructor() { this.p = []; this.c = []; this.u = []; this.i = []; this.n = 0; }
  quad(x, y, z, corners, s, tile, topY, tint) {
    const tu = tile % GRID, tv = Math.floor(tile / GRID);
    for (let k = 0; k < 4; k++) {
      const c = corners[k];
      this.p.push(x + c[0], y + (c[1] ? topY : 0), z + c[2]);
      this.c.push(s * tint[0], s * tint[1], s * tint[2]);
      this.u.push((tu + (UV[k][0] ? 1 - E : E)) / GRID, 1 - (tv + (UV[k][1] ? E : 1 - E)) / GRID);
    }
    const n = this.n;
    this.i.push(n, n + 1, n + 2, n, n + 2, n + 3);
    this.n += 4;
  }
  geometry() {
    if (!this.n) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.u, 2));
    g.setIndex(this.i);
    g.computeBoundingSphere();
    return g;
  }
}

export function buildChunk(world, cx, cz) {
  const S = WORLD.chunk;
  const solidBuf = new Buf(), waterBuf = new Buf();
  for (let y = 0; y < WORLD.sy; y++) for (let z = cz * S; z < cz * S + S; z++) for (let x = cx * S; x < cx * S + S; x++) {
    const id = world.get(x, y, z);
    const def = BLOCKS[id];
    if (!def) continue;
    if (def.cross) { for (const q of CROSS) solidBuf.quad(x, y, z, q, 1, def.side, 0.9, WHITE); continue; }
    const water = id === B.WATER;
    const topY = water && world.get(x, y + 1, z) !== B.WATER ? WATER_TOP : 1;
    const tint = def.color !== undefined ? TINT[def.color] : WHITE;
    for (const f of FACES) {
      const nb = world.get(x + f.d[0], y + f.d[1], z + f.d[2]);
      if (isOpaque(nb)) continue;
      if (nb === id) continue;      // ガラス同士・水同士の 間
      (water ? waterBuf : solidBuf).quad(x, y, z, f.c, f.s, def[f.k], topY, tint);
    }
  }
  return { solid: solidBuf.geometry(), water: waterBuf.geometry() };
}
