/* =========================================================
   ブロックの 集まりを 描画用の 形（メッシュ）に する
   - 16×16 の 柱（チャンク）ごとに 1つ。外から 見える 面だけ 作る（かくれた 面は 作らない）
   - 不透明＋ガラス（ぬき）で 1つ、水（半とうめい）で 1つ
   ========================================================= */
import * as THREE from "three";
import { WORLD } from "./config.js";
import { B, BLOCKS, isOpaque } from "./blocks.js";
import { GRID } from "./textures.js";

/* 6つの 面：向き d、4すみ c（外から 見て 左下→右下→右上→左上）、明るさ s */
const FACES = [
  { d: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], s: 0.82, k: "side" },
  { d: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], s: 0.82, k: "side" },
  { d: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], s: 1.0, k: "top" },
  { d: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], s: 0.55, k: "bottom" },
  { d: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], s: 0.7, k: "side" },
  { d: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], s: 0.7, k: "side" },
];
const UV = [[0, 0], [1, 0], [1, 1], [0, 1]];
const E = 0.002; // タイルの ふちの にじみ よけ
const WATER_TOP = 0.86;

class Buf {
  constructor() { this.p = []; this.c = []; this.u = []; this.i = []; this.n = 0; }
  quad(x, y, z, f, tile, topY) {
    const tu = tile % GRID, tv = Math.floor(tile / GRID);
    for (let k = 0; k < 4; k++) {
      const c = f.c[k];
      this.p.push(x + c[0], y + (c[1] ? topY : 0), z + c[2]);
      this.c.push(f.s, f.s, f.s);
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
    if (!id) continue;
    const def = BLOCKS[id];
    const water = id === B.WATER;
    const topY = water && world.get(x, y + 1, z) !== B.WATER ? WATER_TOP : 1;
    for (const f of FACES) {
      const nb = world.get(x + f.d[0], y + f.d[1], z + f.d[2]);
      if (isOpaque(nb)) continue;      // となりが つまって いたら 見えない
      if (nb === id && !(water && f.k === "top" && topY < 1)) continue; // ガラス同士・水同士の 間
      (water ? waterBuf : solidBuf).quad(x, y, z, f, def[f.k], topY);
    }
  }
  return { solid: solidBuf.geometry(), water: waterBuf.geometry() };
}
