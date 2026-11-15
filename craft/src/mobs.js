/* =========================================================
   敵（色モンスター「ぷに」）と ペット
   - 敵：自作の 丸い 生き物。色ごとに 1種（あか・あお・きいろ・みどり）。形は コードで 作る
     野原に たまに 出て、のるんを 見つけると ぴょんぴょん 近づく。当たると ハートが 1つ へる
   - ペット：描いた 絵が 立った 板に なって ついて くる。近くの 敵に 弱い 体当たり
   ========================================================= */
import * as THREE from "three";
import { WORLD, MOB } from "./config.js";
import { B } from "./blocks.js";
import { MONSTERS } from "./colors.js";
import { Player } from "./player.js";

const eyeW = new THREE.MeshBasicMaterial({ color: 0xffffff });
const eyeB = new THREE.MeshBasicMaterial({ color: 0x24202c });
const bodyGeo = new THREE.SphereGeometry(0.42, 16, 12);
const tipGeo = new THREE.ConeGeometry(0.13, 0.26, 10);
const eyeGeo = new THREE.SphereGeometry(0.085, 8, 6), pupGeo = new THREE.SphereGeometry(0.045, 6, 5);

function monsterMesh(hex) {
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  const mat = new THREE.MeshLambertMaterial({ color: hex });
  const body = new THREE.Mesh(bodyGeo, mat); body.scale.set(1, 0.74, 1); body.position.y = 0.31; inner.add(body);
  const tip = new THREE.Mesh(tipGeo, mat); tip.position.set(0.05, 0.68, 0); tip.rotation.z = -0.35; inner.add(tip);
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(eyeGeo, eyeW); e.position.set(0.15 * s, 0.38, 0.34); inner.add(e);
    const p = new THREE.Mesh(pupGeo, eyeB); p.position.set(0.15 * s, 0.37, 0.41); inner.add(p);
  }
  return { g, inner, mat };
}

export class Mobs {
  /* cb：{ onTouch(enemy), onKill(enemy) } */
  constructor(scene, g, cb) {
    this.scene = scene; this.g = g; this.cb = cb;
    this.list = [];
    this.spawnT = 8;
    this.pet = null;
  }

  /* ---- 敵 ---- */
  clear() { for (const e of this.list) this.scene.remove(e.mesh.g); this.list.length = 0; this.spawnT = 8; }

  add(type, x, y, z) {
    const m = MONSTERS.find((m) => m.type === type) || MONSTERS[0];
    const body = new Player(this.g.world);
    body.setSize(MOB.w, MOB.h); body.speed = MOB.speed; body.jumpV = MOB.jumpV;
    body.place({ x, y, z });
    const mesh = monsterMesh(m.hex);
    this.scene.add(mesh.g);
    const e = { type: m.type, name: m.name, body, mesh, hp: MOB.hp, hurtT: 0, hopT: Math.random(), wander: Math.random() * 6.28, wanderT: 0, face: 0, dying: 0 };
    this.list.push(e);
    return e;
  }

  /* 野原（草・砂の 上）で、のるんから 少し はなれた 所に 出す */
  trySpawn() {
    const w = this.g.world, p = this.g.player;
    for (let k = 0; k < 12; k++) {
      const a = Math.random() * Math.PI * 2, d = 9 + Math.random() * 7;
      const x = Math.floor(p.x + Math.cos(a) * d), z = Math.floor(p.z + Math.sin(a) * d);
      if (x < 2 || z < 2 || x > WORLD.sx - 3 || z > WORLD.sz - 3) continue;
      const y = w.topSolid(x, z);
      const top = w.get(x, y, z);
      if ((top !== B.GRASS && top !== B.SAND) || w.get(x, y + 1, z) !== B.AIR || w.get(x, y + 2, z) !== B.AIR) continue;
      const m = MONSTERS[Math.floor(Math.random() * MONSTERS.length)];
      return this.add(m.type, x + 0.5, y + 1, z + 0.5);
    }
    return null;
  }

  /* のるんから いちばん 近い 敵（range 以内）。いなければ null */
  nearest(range) {
    const p = this.g.player; let best = null, bd = range;
    for (const e of this.list) {
      if (e.dying) continue;
      const d = Math.hypot(e.body.x - p.x, e.body.z - p.z, (e.body.y - p.y) * 0.6);
      if (d <= bd) { bd = d; best = e; }
    }
    return best;
  }

  /* 敵に ダメージ。(fx, fz)：はじく 向き */
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
    // 出現
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
      if (e.dying) {            // たおれた：ぺしゃんと 小さく なって 消える
        e.dying += dt * 3;
        const k = Math.max(0, 1 - e.dying);
        e.mesh.inner.scale.set(1 + (1 - k) * 0.6, k, 1 + (1 - k) * 0.6);
        if (e.dying >= 1) { this.scene.remove(e.mesh.g); this.list.splice(i, 1); }
        continue;
      }
      const dx = p.x - b.x, dz = p.z - b.z, dist = Math.hypot(dx, dz);
      let wx = 0, wz = 0;
      if (dist < MOB.see && dist > 0.2) { wx = dx / dist; wz = dz / dist; }
      else {
        e.wanderT -= dt;
        if (e.wanderT <= 0) { e.wanderT = 2 + Math.random() * 3; e.wander = Math.random() * 6.28; e.idle = Math.random() < 0.4; }
        if (!e.idle) { wx = Math.cos(e.wander) * 0.5; wz = Math.sin(e.wander) * 0.5; }
      }
      e.hopT -= dt;
      const hop = b.onGround && e.hopT <= 0 && (wx || wz);
      if (hop) e.hopT = 0.55 + Math.random() * 0.3;
      if (e.hurtT > 0) { e.hurtT -= dt; b.update(dt, b.vx / b.speed, b.vz / b.speed, false); }   // はじかれて いる 間
      else b.update(dt, wx, wz, hop);
      if (b.y < -5 || dist > 40) { this.scene.remove(e.mesh.g); this.list.splice(i, 1); continue; }
      if (wx || wz) { const want = Math.atan2(wx, wz); let d = want - e.face; d = Math.atan2(Math.sin(d), Math.cos(d)); e.face += d * Math.min(1, dt * 8); }
      e.mesh.g.position.set(b.x, b.y + b.stepVis, b.z);
      e.mesh.g.rotation.y = e.face;
      const sy = b.onGround ? 1 - b.landT * 0.25 + Math.sin(performance.now() * 0.006 + i) * 0.04 : 1 + Math.max(-0.1, Math.min(0.2, b.vy * 0.03));
      e.mesh.inner.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
      e.mesh.mat.emissive.setScalar(e.hurtT > 0 ? 0.6 : 0);
      // のるんに 当たった
      if (dist < (p.w + b.w) / 2 + 0.08 && p.y < b.y + b.h && b.y < p.y + p.h) this.cb.onTouch(e);
    }
    this.updatePet(dt);
  }

  /* ---- ペット ---- */
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
    // 近くの 敵（のるんから 5マス 以内）が いれば 体当たりへ、いなければ のるんの ななめ 後ろへ
    let foe = null, fd = 5;
    for (const e of this.list) { if (e.dying) continue; const d = Math.hypot(e.body.x - p.x, e.body.z - p.z); if (d < fd) { fd = d; foe = e; } }
    let tx, ty, tz;
    if (foe && pet.bumpT <= 0) { tx = foe.body.x; ty = foe.body.y + 0.45; tz = foe.body.z; }
    else {
      const f = g.faceYaw;
      tx = p.x - Math.sin(f) * 1.0 + Math.cos(f) * 0.9; tz = p.z - Math.cos(f) * 1.0 - Math.sin(f) * 0.9;
      ty = p.y + 1.0 + Math.sin(now * 3) * 0.12;                // 上下に ふわふわ
    }
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
    // 絵が いつも 見える ように カメラの 方を 向き、進む 向きへ かたむく
    pet.mesh.rotation.set(0, g.yaw, 0);
    const side = (mx * Math.cos(g.yaw) - mz * Math.sin(g.yaw)) / Math.max(dt, 0.001);
    pet.tilt += (Math.max(-0.5, Math.min(0.5, -side * 0.12)) - pet.tilt) * Math.min(1, dt * 8);
    pet.mesh.rotation.z = pet.tilt;
  }
}
