/* =========================================================
   敵（色モンスター「ぷに」）・ペット・動物
   - 敵：自作の 丸い 生き物。あか・あお・きいろ・みどり ＋ まれに 出る「きんのぷに」（にげる）
   - ペット：描いた 絵が 立った 板に なって ついて くる。近くの 敵に 弱い 体当たり
   - 動物：うさぎ・ひよこ（草原と 森）／ペンギン（雪原）／くらげ（水の 中）。敵では ない（当たらない・たたけない）
     近づくと にげる 子と にげない 子が いる。好物を あげると ハートが 出て しばらく ついて くる
   形は ぜんぶ コードで 作る。のるんの 近くの 分だけ 動かす。
   ========================================================= */
import * as THREE from "three";
import { WORLD, MOB, ANIMAL } from "./config.js";
import { B } from "./blocks.js";
import { I } from "./items.js";
import { MONSTERS } from "./colors.js";
import { BIOME } from "./world.js";
import { Player } from "./player.js";

const eyeW = new THREE.MeshBasicMaterial({ color: 0xffffff });
const eyeB = new THREE.MeshBasicMaterial({ color: 0x24202c });
const sph = (r, a = 14, b = 10) => new THREE.SphereGeometry(r, a, b);
const bodyGeo = sph(0.42, 16, 12);
const tipGeo = new THREE.ConeGeometry(0.13, 0.26, 10);
const eyeGeo = sph(0.085, 8, 6), pupGeo = sph(0.045, 6, 5);
const lam = (hex, extra) => new THREE.MeshLambertMaterial({ color: hex, ...extra });
const part = (parent, geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m; };
const eyes = (inner, dx, y, z, r = 0.05) => { for (const s of [-1, 1]) part(inner, sph(r, 6, 5), eyeB, dx * s, y, z); };

function monsterMesh(m) {
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  const mat = lam(m.hex, m.rare ? { emissive: 0x9a6a00 } : {});
  part(inner, bodyGeo, mat, 0, 0.31, 0, 1, 0.74, 1);
  const tip = part(inner, tipGeo, mat, 0.05, 0.68, 0); tip.rotation.z = -0.35;
  for (const s of [-1, 1]) { part(inner, eyeGeo, eyeW, 0.15 * s, 0.38, 0.34); part(inner, pupGeo, eyeB, 0.15 * s, 0.37, 0.41); }
  if (m.rare) part(inner, new THREE.OctahedronGeometry(0.11), new THREE.MeshBasicMaterial({ color: 0xfff6b0 }), 0.05, 0.92, 0);   // きらきらの かざり
  return { g, inner, mat };
}

/* ---- 動物の 一覧 ---- */
export const ANIMALS = {
  rabbit: { name: "うさぎ", food: B.LEAF, foodName: "はっぱ", w: 0.5, h: 0.5, speed: 2.2, jumpV: 5.4, hop: 0.45 },
  chick: { name: "ひよこ", food: I.BERRY, foodName: "きのみ", w: 0.4, h: 0.4, speed: 1.5, jumpV: 3.4, hop: 0.35 },
  penguin: { name: "ペンギン", food: I.FISH, foodName: "さかな", w: 0.5, h: 0.7, speed: 1.3, jumpV: 0, hop: 0 },
  jelly: { name: "くらげ", food: I.BERRY, foodName: "きのみ", w: 0.5, h: 0.5, speed: 0.8, water: true },
};
function animalMesh(kind) {
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  if (kind === "rabbit") {
    const m = lam(0xffffff), pink = lam(0xffb8cc);
    part(inner, sph(0.24), m, 0, 0.22, -0.04, 1, 0.85, 1.15);
    part(inner, sph(0.17), m, 0, 0.42, 0.16);
    for (const s of [-1, 1]) { part(inner, new THREE.CapsuleGeometry(0.045, 0.2, 3, 6), m, 0.07 * s, 0.68, 0.13); part(inner, new THREE.CapsuleGeometry(0.02, 0.14, 2, 5), pink, 0.07 * s, 0.68, 0.165); }
    part(inner, sph(0.07, 8, 6), m, 0, 0.24, -0.3);
    eyes(inner, 0.08, 0.45, 0.31, 0.028); part(inner, sph(0.02, 5, 4), pink, 0, 0.4, 0.33);
  } else if (kind === "chick") {
    const m = lam(0xffe45c), o = lam(0xff9a3a);
    part(inner, sph(0.2), m, 0, 0.2, 0, 1, 0.95, 1);
    part(inner, sph(0.13), m, 0, 0.4, 0.06);
    const bk = part(inner, new THREE.ConeGeometry(0.045, 0.1, 6), o, 0, 0.39, 0.2); bk.rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) part(inner, sph(0.07, 6, 5), m, 0.19 * s, 0.2, 0, 0.5, 1, 1.2);
    eyes(inner, 0.06, 0.43, 0.165, 0.022);
  } else if (kind === "penguin") {
    const d = lam(0x2a3554), w = lam(0xffffff), o = lam(0xffa53a);
    part(inner, sph(0.24), d, 0, 0.32, 0, 1, 1.35, 1);
    part(inner, sph(0.2), w, 0, 0.29, 0.07, 0.9, 1.25, 0.9);
    const bk = part(inner, new THREE.ConeGeometry(0.05, 0.12, 6), o, 0, 0.5, 0.24); bk.rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) { part(inner, sph(0.09, 6, 5), d, 0.24 * s, 0.32, 0, 0.35, 1.6, 0.9); part(inner, sph(0.07, 6, 5), o, 0.1 * s, 0.03, 0.08, 1, 0.4, 1.5); }
    eyes(inner, 0.08, 0.55, 0.2, 0.025);
  } else {
    const m = new THREE.MeshLambertMaterial({ color: 0xffb0e0, transparent: true, opacity: 0.78 });
    part(inner, new THREE.SphereGeometry(0.26, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), m, 0, 0.3, 0, 1, 0.8, 1);
    for (let i = 0; i < 5; i++) { const a = i * 1.257; part(inner, new THREE.CapsuleGeometry(0.022, 0.24, 2, 5), m, Math.cos(a) * 0.13, 0.15, Math.sin(a) * 0.13); }
    eyes(inner, 0.07, 0.38, 0.2, 0.024);
  }
  return { g, inner };
}

export class Mobs {
  /* cb：{ onTouch(enemy), onKill(enemy), onPetHit(enemy), onFed(animal) } */
  constructor(scene, g, cb) {
    this.scene = scene; this.g = g; this.cb = cb;
    this.list = [];            // 敵
    this.animals = [];
    this.spawnT = 8; this.animalT = 1;
    this.pet = null;
  }

  /* ================= 敵 ================= */
  clear() { for (const e of this.list) this.scene.remove(e.mesh.g); this.list.length = 0; this.spawnT = 8; }
  clearAnimals() { for (const a of this.animals) this.scene.remove(a.mesh.g); this.animals.length = 0; this.animalT = 1; }

  add(type, x, y, z) {
    const m = MONSTERS.find((m) => m.type === type) || MONSTERS[0];
    const body = new Player(this.g.world);
    body.setSize(MOB.w, MOB.h); body.speed = m.rare ? MOB.goldSpeed : MOB.speed; body.jumpV = MOB.jumpV;
    body.place({ x, y, z });
    const mesh = monsterMesh(m);
    this.scene.add(mesh.g);
    const e = { type: m.type, name: m.name, rare: !!m.rare, body, mesh, hp: m.rare ? MOB.goldHp : MOB.hp, hurtT: 0, hopT: Math.random(), wander: Math.random() * 6.28, wanderT: 0, face: 0, dying: 0 };
    this.list.push(e);
    return e;
  }

  /* のるんから 少し はなれた 地上（草・砂・雪の 上）を さがす */
  findSpot(dMin, dMax, okTop) {
    const w = this.g.world, p = this.g.player;
    for (let k = 0; k < 12; k++) {
      const a = Math.random() * Math.PI * 2, d = dMin + Math.random() * (dMax - dMin);
      const x = Math.floor(p.x + Math.cos(a) * d), z = Math.floor(p.z + Math.sin(a) * d);
      if (x < 2 || z < 2 || x > WORLD.sx - 3 || z > WORLD.sz - 3) continue;
      const y = w.topSolid(x, z);
      const r = okTop(x, y, z, w.get(x, y, z));
      if (r) return { x, y, z, r };
    }
    return null;
  }
  trySpawn() {
    const w = this.g.world;
    const s = this.findSpot(9, 16, (x, y, z, top) => (top === B.GRASS || top === B.SAND || top === B.SNOW) && w.get(x, y + 1, z) === B.AIR && w.get(x, y + 2, z) === B.AIR);
    if (!s) return null;
    const normal = MONSTERS.filter((m) => !m.rare);
    const type = Math.random() < MOB.goldChance ? "gold" : normal[Math.floor(Math.random() * normal.length)].type;
    return this.add(type, s.x + 0.5, s.y + 1, s.z + 0.5);
  }

  nearest(range) {
    const p = this.g.player; let best = null, bd = range;
    for (const e of this.list) {
      if (e.dying) continue;
      const d = Math.hypot(e.body.x - p.x, e.body.z - p.z, (e.body.y - p.y) * 0.6);
      if (d <= bd) { bd = d; best = e; }
    }
    return best;
  }

  damage(e, n, fx, fz) {
    if (e.dying) return false;
    e.hp -= n; e.hurtT = 0.25;
    const len = Math.hypot(fx, fz) || 1;
    e.body.vx = (fx / len) * 5; e.body.vz = (fz / len) * 5; e.body.vy = 4.2; e.body.onGround = false;
    if (e.hp <= 0) { e.dying = 0.001; this.cb.onKill(e); return true; }
    return false;
  }

  update(dt, night) {
    const g = this.g, p = g.player;
    if (g.enemiesOn) {
      this.spawnT -= dt;
      const max = night ? MOB.maxNight : MOB.maxDay;
      if (this.spawnT <= 0) {
        this.spawnT = night ? MOB.everyNight : MOB.everyDay;
        if (this.list.filter((e) => !e.dying).length < max) this.trySpawn();
      }
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i];
      if (!e) continue;               // とちゅうで ぜんぶ 消えた 時（のるんが やられて もどった 時）
      const b = e.body;
      if (e.dying) {
        e.dying += dt * 3;
        const k = Math.max(0, 1 - e.dying);
        e.mesh.inner.scale.set(1 + (1 - k) * 0.6, k, 1 + (1 - k) * 0.6);
        if (e.dying >= 1) { this.scene.remove(e.mesh.g); this.list.splice(i, 1); }
        continue;
      }
      const dx = p.x - b.x, dz = p.z - b.z, dist = Math.hypot(dx, dz);
      let wx = 0, wz = 0;
      if (e.rare && dist < MOB.see) { wx = -dx / (dist || 1); wz = -dz / (dist || 1); }     // きんのぷには にげる
      else if (!e.rare && dist < MOB.see && dist > 0.2) { wx = dx / dist; wz = dz / dist; }
      else {
        e.wanderT -= dt;
        if (e.wanderT <= 0) { e.wanderT = 2 + Math.random() * 3; e.wander = Math.random() * 6.28; e.idle = Math.random() < 0.4; }
        if (!e.idle) { wx = Math.cos(e.wander) * 0.5; wz = Math.sin(e.wander) * 0.5; }
      }
      e.hopT -= dt;
      const hop = b.onGround && e.hopT <= 0 && (wx || wz);
      if (hop) e.hopT = 0.55 + Math.random() * 0.3;
      if (e.hurtT > 0) { e.hurtT -= dt; b.update(dt, b.vx / b.speed, b.vz / b.speed, false); }
      else b.update(dt, wx, wz, hop);
      if (b.y < -5 || dist > 40) { this.scene.remove(e.mesh.g); this.list.splice(i, 1); continue; }
      if (wx || wz) { const want = Math.atan2(wx, wz); let d = want - e.face; d = Math.atan2(Math.sin(d), Math.cos(d)); e.face += d * Math.min(1, dt * 8); }
      e.mesh.g.position.set(b.x, b.y + b.stepVis, b.z);
      e.mesh.g.rotation.y = e.face;
      const sy = b.onGround ? 1 - b.landT * 0.25 + Math.sin(performance.now() * 0.006 + i) * 0.04 : 1 + Math.max(-0.1, Math.min(0.2, b.vy * 0.03));
      e.mesh.inner.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
      if (e.rare) e.mesh.mat.emissive.setHex(e.hurtT > 0 ? 0xffffff : 0x9a6a00); else e.mesh.mat.emissive.setScalar(e.hurtT > 0 ? 0.6 : 0);
      if (!e.rare && dist < (p.w + b.w) / 2 + 0.08 && p.y < b.y + b.h && b.y < p.y + p.h) this.cb.onTouch(e);
    }
    this.updateAnimals(dt);
    this.updatePet(dt);
  }

  /* ================= 動物 ================= */
  addAnimal(kind, x, y, z, shy) {
    const def = ANIMALS[kind];
    const mesh = animalMesh(kind);
    this.scene.add(mesh.g);
    const a = { kind, def, name: def.name, mesh, shy: shy === undefined ? Math.random() < 0.5 : shy, followT: 0, wander: Math.random() * 6.28, wanderT: 0, idle: false, hopT: Math.random(), face: Math.random() * 6.28, t: Math.random() * 10 };
    if (def.water) { a.pos = new THREE.Vector3(x, y, z); a.shy = false; }
    else { a.body = new Player(this.g.world); a.body.setSize(def.w, def.h); a.body.speed = def.speed; a.body.jumpV = def.jumpV || 1; a.body.place({ x, y, z }); }
    this.animals.push(a);
    return a;
  }
  /* 場所の バイオームに 合った 動物を 1ぴき 出す */
  trySpawnAnimal() {
    const w = this.g.world;
    const s = this.findSpot(10, ANIMAL.near, (x, y, z, top) => {
      const above = w.get(x, y + 1, z), bi = w.biomeAt(x, z);
      if (above === B.WATER) return w.get(x, y + 2, z) === B.WATER ? "jelly" : null;      // 深さ 2 以上の 水
      if (above !== B.AIR || w.get(x, y + 2, z) !== B.AIR) return null;
      if (top === B.SNOW || top === B.ICE) return bi === BIOME.SNOW || top === B.ICE ? "penguin" : null;
      if (top === B.GRASS) return Math.random() < 0.5 ? "rabbit" : "chick";
      return null;
    });
    // 近くに 水が あるのに くらげが いない 時は、まず 水の 中を さがす（陸の 動物で うまって しまわない ように）
    let pick = s;
    if (!this.animals.some((a) => a.kind === "jelly")) {
      const wsp = this.findSpot(4, ANIMAL.near, (x, y, z) => (w.get(x, y + 1, z) === B.WATER && w.get(x, y + 2, z) === B.WATER ? "jelly" : null));
      if (wsp) pick = wsp;
    }
    if (!pick) return null;
    return this.addAnimal(pick.r, pick.x + 0.5, pick.y + (pick.r === "jelly" ? 1.6 : 1), pick.z + 0.5);
  }
  posOf(a) { return a.pos || a.body; }
  /* 好物を あげる：近くに その 物が 好きな 動物が いれば、ついて くる ように なる。
     返す 物：あげた 動物／好物が ちがう 動物が 近くに いる 時は { wrong: 動物 }／いなければ null */
  feed(itemId) {
    const p = this.g.player; let best = null, bd = ANIMAL.feedRange, wrong = null;
    for (const a of this.animals) {
      const q = this.posOf(a), d = Math.hypot(q.x - p.x, q.z - p.z, (q.y - p.y) * 0.5);
      if (d > ANIMAL.feedRange) continue;
      if (a.def.food === itemId) { if (d <= bd) { bd = d; best = a; } } else wrong = a;
    }
    if (best) { best.followT = ANIMAL.followSec; best.shy = false; this.cb.onFed(best); return best; }
    return wrong ? { wrong } : null;
  }
  updateAnimals(dt) {
    const g = this.g, p = g.player, w = g.world;
    this.animalT -= dt;
    if (this.animalT <= 0) { this.animalT = ANIMAL.every; if (this.animals.length < ANIMAL.max) this.trySpawnAnimal(); }
    for (let i = this.animals.length - 1; i >= 0; i--) {
      const a = this.animals[i], q = this.posOf(a), def = a.def;
      const dx = p.x - q.x, dz = p.z - q.z, dist = Math.hypot(dx, dz);
      if (dist > ANIMAL.far || q.y < -5) { this.scene.remove(a.mesh.g); this.animals.splice(i, 1); continue; }
      a.t += dt; a.followT = Math.max(0, a.followT - dt);
      let wx = 0, wz = 0, fast = 1;
      if (a.followT > 0) { if (dist > 1.7) { wx = dx / dist; wz = dz / dist; } }                       // 餌を もらった：ついて くる
      else if (a.shy && dist < ANIMAL.shy) { wx = -dx / (dist || 1); wz = -dz / (dist || 1); fast = 1.5; }   // にげる 子
      else {
        a.wanderT -= dt;
        if (a.wanderT <= 0) { a.wanderT = 1.5 + Math.random() * 3; a.wander = Math.random() * 6.28; a.idle = Math.random() < 0.5; }
        if (!a.idle) { wx = Math.cos(a.wander) * 0.6; wz = Math.sin(a.wander) * 0.6; }
      }
      let sy = 1;
      if (def.water) {
        // くらげ：水の 中を ふわふわ。水の 外へは 出ない
        const nx = q.x + wx * def.speed * dt, nz = q.z + wz * def.speed * dt;
        let ny = q.y + Math.sin(a.t * 1.3) * 0.25 * dt + (a.followT > 0 ? Math.max(-0.5, Math.min(0.5, p.y - q.y)) * dt : 0);
        const wet = (x, y, z) => w.get(Math.floor(x), Math.floor(y), Math.floor(z)) === B.WATER;
        if (wet(nx, q.y, nz) && wet(nx, q.y + 0.45, nz)) { q.x = nx; q.z = nz; } else a.wanderT = 0;
        if (wet(q.x, ny - 0.1, q.z) && wet(q.x, ny + 0.5, q.z)) q.y = ny;
        sy = 1 + Math.sin(a.t * 3) * 0.14;
        a.mesh.g.position.set(q.x, q.y - 0.2, q.z);
      } else {
        const b = a.body;
        a.hopT -= dt;
        const hop = def.hop > 0 && b.onGround && a.hopT <= 0 && (wx || wz);
        if (hop) a.hopT = def.hop + Math.random() * 0.2;
        const sp0 = b.speed; b.speed = def.speed * fast;
        b.update(dt, wx, wz, !!hop);
        b.speed = sp0;
        a.mesh.g.position.set(b.x, b.y + b.stepVis, b.z);
        if (a.kind === "penguin") a.mesh.inner.rotation.z = (wx || wz) ? Math.sin(a.t * 9) * 0.16 : 0;   // よちよち
        sy = b.onGround ? 1 - b.landT * 0.2 + Math.sin(a.t * 2.4) * 0.03 : 1 + Math.max(-0.08, Math.min(0.16, b.vy * 0.03));
      }
      if (wx || wz) { const want = Math.atan2(wx, wz); let d = want - a.face; d = Math.atan2(Math.sin(d), Math.cos(d)); a.face += d * Math.min(1, dt * 7); }
      else if (a.followT > 0) { const want = Math.atan2(dx, dz); let d = want - a.face; d = Math.atan2(Math.sin(d), Math.cos(d)); a.face += d * Math.min(1, dt * 5); }
      a.mesh.g.rotation.y = a.face;
      a.mesh.inner.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
    }
  }

  /* ================= ペット ================= */
  setPet(texture) {
    if (this.pet) { this.scene.remove(this.pet.mesh); this.pet.mesh.material.dispose(); this.pet = null; }
    if (!texture) return;
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.08, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), mat);
    const p = this.g.player;
    mesh.position.set(p.x + 0.8, p.y + 1, p.z + 0.8);
    this.scene.add(mesh);
    this.pet = { mesh, bumpT: 0, tilt: 0, bounce: new THREE.Vector3() };
  }

  updatePet(dt) {
    const pet = this.pet; if (!pet) return;
    const g = this.g, p = g.player, pos = pet.mesh.position, now = performance.now() * 0.001;
    pet.bumpT -= dt;
    let foe = null, fd = 5;
    for (const e of this.list) { if (e.dying) continue; const d = Math.hypot(e.body.x - p.x, e.body.z - p.z); if (d < fd) { fd = d; foe = e; } }
    let tx, ty, tz;
    if (foe && pet.bumpT <= 0) { tx = foe.body.x; ty = foe.body.y + 0.45; tz = foe.body.z; }
    else {
      const f = g.faceYaw;
      tx = p.x - Math.sin(f) * 1.0 + Math.cos(f) * 0.9; tz = p.z - Math.cos(f) * 1.0 - Math.sin(f) * 0.9;
      ty = p.y + 1.0 + Math.sin(now * 3) * 0.12;
    }
    if (Math.hypot(tx - pos.x, tz - pos.z) > 12) pos.set(tx, ty, tz);     // 遠く はなれたら そばへ
    const k = Math.min(1, dt * (foe && pet.bumpT <= 0 ? 6 : 3.2));
    const mx = (tx - pos.x) * k, mz = (tz - pos.z) * k;
    pos.x += mx + pet.bounce.x * dt; pos.y += (ty - pos.y) * k; pos.z += mz + pet.bounce.z * dt;
    pet.bounce.multiplyScalar(Math.exp(-dt * 5));
    if (foe && pet.bumpT <= 0 && Math.hypot(foe.body.x - pos.x, foe.body.z - pos.z) < 0.55) {
      pet.bumpT = MOB.petEvery;
      const fx = foe.body.x - p.x, fz = foe.body.z - p.z;
      this.damage(foe, MOB.petDamage, fx, fz);
      const l = Math.hypot(fx, fz) || 1; pet.bounce.set(-fx / l * 5, 0, -fz / l * 5);
      this.cb.onPetHit && this.cb.onPetHit(foe);
    }
    pet.mesh.rotation.set(0, g.yaw, 0);
    const side = (mx * Math.cos(g.yaw) - mz * Math.sin(g.yaw)) / Math.max(dt, 0.001);
    pet.tilt += (Math.max(-0.5, Math.min(0.5, -side * 0.12)) - pet.tilt) * Math.min(1, dt * 8);
    pet.mesh.rotation.z = pet.tilt;
  }
}
