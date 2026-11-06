/* =========================================================
   塔（タワーアスレ・エンドレス）
   コースの部品（かいだん・すき間・高い段・ジャンプ台・1本道・動く足場・回るバー）を
   自動で 上へ つないで、のぼりつづける。頂上なし
   - 移動は バーチャルパッド（まるい スティック）。たおした 方向にだけ 進み、はなすと 止まる
   - ジャンプは ボタン。高い段や かべは ジャンプで のぼる
   - 落ちたら 直前の チェックポイント（旗）から すぐ やりなおし。何回でも OK
   - 記録＝のった足場の いちばん高い所（m）
   ========================================================= */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/GLTFLoader.js";
import { MODEL_URL, findPinSlots, applyPins } from "./norun-model.js";
import { PLAY_TOWER as P } from "./config.js";

const W = P.laneW;
const LANE_X = [W, 0, -W];            // 0=画面の左（カメラは 後ろから +Z を見る。ランと同じ）
const FULL = W * 3;                   // 3レーンぶんの はば
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const lambert = (c, e = 0.18) => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: e });

const canvas = document.getElementById("towerView");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const SKY = [[0, new THREE.Color(0xbfe6ff)], [40, new THREE.Color(0xa9d4ff)], [90, new THREE.Color(0xffd2b0)], [150, new THREE.Color(0xa592e0)], [230, new THREE.Color(0x2e3270)]];
scene.background = new THREE.Color(0xbfe6ff);
scene.fog = new THREE.Fog(0xbfe6ff, 40, 85);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 220);
scene.add(new THREE.HemisphereLight(0xffffff, 0xb9a8d8, 1.5));
const sun = new THREE.DirectionalLight(0xffffff, 0.9);
sun.position.set(-4, 10, -5);
scene.add(sun);

/* ---------- 景色：雲（下にも 上にも）・遠くの 塔 ---------- */
const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
const clouds = [];
for (let i = 0; i < 22; i++) {
  const c = new THREE.Group();
  for (let k = 0; k < 3; k++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(rand(1.4, 2.4), 12, 10), cloudMat);
    s.position.set(k * 2 - 2, rand(0, 0.5), rand(-0.5, 0.5));
    c.add(s);
  }
  c.userData.dy = rand(-14, 10);
  c.position.set((Math.random() < 0.5 ? -1 : 1) * rand(9, 26), 0, rand(-10, 80));
  scene.add(c); clouds.push(c);
}
// 遠くに 見える 大きな塔（のぼっても ずっと 先にある）
const farTower = new THREE.Group();
{
  const body = new THREE.Mesh(new THREE.CylinderGeometry(6, 7.5, 160, 24), lambert(0xf3e6d3, 0.3));
  body.position.y = 40;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(8, 14, 24), lambert(0xc9a6ff, 0.3));
  roof.position.y = 127;
  farTower.add(body, roof);
  for (let y = -30; y < 120; y += 9) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(6.6, 0.35, 8, 28), lambert(0xffb3d4, 0.3));
    ring.rotation.x = Math.PI / 2; ring.position.y = y;
    farTower.add(ring);
  }
}
farTower.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.fog = false; o.material.transparent = true; o.material.opacity = 0.55; } });
scene.add(farTower);

/* ---------- コース ---------- */
const COL = { floor: 0x9be39b, stair: 0xffd86b, step: 0x8fd3ff, gap: 0xff9ec7, zig: 0xc7a8ff, mover: 0xffa64d, bar: 0x9be3d6, wall: 0x8fd3ff };
const topMats = new Map();
function topMatOf(c) {   // 上の面は 部品の色を うすくした色（レーンの すじ入り）
  if (!topMats.has(c)) {
    const col = new THREE.Color(c).lerp(new THREE.Color(0xffffff), 0.62);
    topMats.set(c, new THREE.MeshLambertMaterial({ color: col, emissive: col, emissiveIntensity: 0.22 }));
  }
  return topMats.get(c);
}
const padMat = lambert(0xff5fa2, 0.35);
const solids = [];      // { x0, x1, y0, y1, z0, z1, mesh, mov?, pad? }
const bars = [];        // { cx, cz, y, half, ang, sp, g }
const flags = [];       // { z, y, g, cloth, hit }
function addBox(x0, x1, y0, y1, z0, z1, color, opt = {}) {
  const g = new THREE.Group();
  const h = y1 - y0;
  const body = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, h, z1 - z0), opt.pad ? padMat : lambert(color));
  body.position.y = -h / 2;
  g.add(body);
  if (!opt.pad) {
    const top = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + 0.04, 0.08, z1 - z0 + 0.04), topMatOf(color));
    top.position.y = -0.03;
    g.add(top);
  } else {   // ジャンプ台の しるし
    for (const lx of LANE_X) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.09, 8, 24), lambert(0xffffff, 0.5));
      ring.rotation.x = Math.PI / 2; ring.position.set(lx - (x0 + x1) / 2, 0.02, 0);
      g.add(ring);
    }
  }
  g.position.set((x0 + x1) / 2, y1, (z0 + z1) / 2);
  scene.add(g);
  const s = { x0, x1, y0, y1, z0, z1, g, ...opt };
  solids.push(s);
  return s;
}
const laneBox = (l, y0, y1, z0, z1, c, opt) => addBox(LANE_X[l] - W / 2 + 0.05, LANE_X[l] + W / 2 - 0.05, y0, y1, z0, z1, c, opt);
const fullBox = (y0, y1, z0, z1, c, opt) => addBox(-FULL / 2, FULL / 2, y0, y1, z0, z1, c, opt);

function addFlag(z, y) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8), lambert(0xffffff, 0.3));
  pole.position.y = 1.1;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.lineTo(0.9, -0.3); shape.lineTo(0, -0.6);
  const cloth = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: 0xff7eb6, side: THREE.DoubleSide }));
  cloth.position.set(0.05, 2.15, 0);
  g.add(pole, cloth);
  g.position.set(FULL / 2 - 0.2, y, z);
  scene.add(g);
  flags.push({ z, y, g, cloth, hit: false });
}

/* ---------- 部品 ---------- */
const B = { z: 0, y: 0, last: "", n: 0 };
function rest(len) {
  fullBox(B.y - 0.6, B.y, B.z, B.z + len, COL.floor);
  addFlag(B.z + 0.6, B.y);
  B.z += len;
}
const PARTS = {
  stairs() {   // かいだん：ジャンプなしで のぼれる
    const n = randInt(5, 7), rise = 0.4, dep = 1.3, y0 = B.y;
    for (let i = 0; i < n; i++) fullBox(y0 - 0.6, y0 + rise * (i + 1), B.z + i * dep, B.z + (i + 1) * dep, COL.stair);
    B.z += n * dep; B.y = y0 + rise * n;
  },
  gaps() {     // すき間を ジャンプで こえる
    const k = randInt(2, 3);
    for (let i = 0; i < k; i++) {
      B.z += rand(1.4, Math.min(2.5, 1.7 + B.y * 0.02));
      B.y += rand(0, 0.45);
      const len = rand(3, 4.2);
      fullBox(B.y - 0.6, B.y, B.z, B.z + len, COL.gap);
      B.z += len;
    }
  },
  steps() {    // はしごの ような 高い段（止まって まつ → ジャンプで のぼる）
    const k = randInt(3, 4), dep = 2.6;
    for (let i = 0; i < k; i++) {
      B.y += rand(0.85, 1.05);
      fullBox(B.y - 1.6, B.y, B.z, B.z + dep, COL.step);
      B.z += dep;
    }
  },
  pad() {      // ジャンプ台 → 高い かべの 上へ
    const len = 3.2, hgt = rand(2.6, 3.0);
    fullBox(B.y - 0.6, B.y + 0.12, B.z, B.z + len, 0, { pad: true });
    B.z += len;
    B.y += hgt;
    fullBox(B.y - hgt - 0.6, B.y, B.z, B.z + 4, COL.wall);
    B.z += 4;
  },
  zigzag() {   // 1本道が 左右に ずれる（レーンを かえる）
    let l = randInt(0, 2);
    const k = randInt(3, 4);
    const lap = 1.8;     // となりの 道と 重なる 長さ（この間に レーンを かえる）
    for (let i = 0; i < k; i++) {
      const len = rand(4.6, 5.6);
      laneBox(l, B.y - 0.6, B.y, B.z - (i ? lap : 0), B.z + len, COL.zig);
      B.z += len;
      l = l === 0 ? 1 : l === 2 ? 1 : (Math.random() < 0.5 ? 0 : 2);
    }
  },
  mover() {    // 左右に 動く足場（のって わたる）
    const k = randInt(1, 2);
    for (let i = 0; i < k; i++) {
      const len = rand(5, 6);
      const s = laneBox(1, B.y - 0.5, B.y, B.z, B.z + len, COL.mover, { mov: { ph: rand(0, 6.28), sp: rand(1.5, 1.9) + B.y * 0.004, dx: 0 } });
      s.w = s.x1 - s.x0;
      B.z += len;
      if (i < k - 1) { fullBox(B.y - 0.6, B.y, B.z, B.z + 2.4, COL.floor); B.z += 2.4; }
    }
  },
  bar() {      // 回るバー（ジャンプで よける）
    const len = 11;
    fullBox(B.y - 0.6, B.y, B.z, B.z + len, COL.bar);
    const cz = B.z + len / 2;
    addBox(-0.28, 0.28, B.y, B.y + 1.2, cz - 0.28, cz + 0.28, 0xffffff);    // まんなかの 柱（ジャンプで こえられる）
    const g = new THREE.Group();
    const half = W * 1.45;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, half * 2, 12), lambert(0xff5f7e, 0.3));
    rod.rotation.z = Math.PI / 2;
    g.add(rod);
    for (const sx of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), lambert(0xffffff, 0.3));
      cap.position.x = sx * half;
      g.add(cap);
    }
    g.position.set(0, B.y + 0.45, cz);
    scene.add(g);
    bars.push({ cx: 0, cz, y: B.y, half, ang: rand(0, 6.28), sp: (Math.random() < 0.5 ? -1 : 1) * (1.3 + Math.min(0.6, B.y * 0.006)), g });
    B.z += len;
  },
};
function addPart() {
  const list = Object.entries(P.parts).filter(([k, v]) => B.y >= v.from && k !== B.last);
  let r = Math.random() * list.reduce((s, [, v]) => s + v.w, 0);
  let name = list[0][0];
  for (const [k, v] of list) if ((r -= v.w) <= 0) { name = k; break; }
  B.last = name;
  PARTS[name]();
  rest(rand(3.2, 4.2));
  B.n++;
}

/* ---------- のるん ---------- */
const nr = { root: new THREE.Group(), body: null, hatMats: [], starL: null, starR: null, pins: null };
scene.add(nr.root);
const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.7, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2;
scene.add(shadow);
let loaded = null;
export function initTowerView() {
  if (!loaded) loaded = new GLTFLoader().loadAsync(MODEL_URL).then((g) => {
    const m = g.scene;
    m.scale.setScalar(0.8);
    Object.assign(nr, { body: m.getObjectByName("Body"), starL: m.getObjectByName("Star_L"), starR: m.getObjectByName("Star_R") });
    for (const s of [nr.starL, nr.starR]) if (s) s.userData.q = s.quaternion.clone();
    m.traverse((o) => {
      if (o.isMesh && o.material.name === "M_Hat") {
        o.material = o.material.clone();
        o.material.userData.base = o.material.color.clone();
        nr.hatMats.push(o.material);
      }
    });
    nr.pins = findPinSlots(m);
    nr.root.add(m);
  });
  return loaded;
}
export function setTowerHat(color) {
  for (const m of nr.hatMats) { if (color == null) m.color.copy(m.userData.base); else m.color.set(color); }
}
export function setTowerPins(pins) { if (nr.pins) applyPins(nr.pins, pins); }

/* ---------- 状態 ---------- */
let T = null;
const me = { x: 0, y: 0, z: 0, vx: 0, vz: 0, vy: 0, yaw: 0, on: null, squash: 0, ph: 0, star: 0, starV: 0, stun: 0, wait: 0, blocked: false };
const stick = { x: 0, y: 0 };   // バーチャルパッド：x=右が +、y=上（前）が +。大きさ 0〜1

function clearCourse() {
  for (const s of solids) { scene.remove(s.g); s.g.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
  for (const b of bars) scene.remove(b.g);
  for (const f of flags) scene.remove(f.g);
  solids.length = 0; bars.length = 0; flags.length = 0;
}
export function startTower(opts) {
  stopTower();
  clearCourse();
  Object.assign(B, { z: -4, y: 0, last: "", n: 0 });
  rest(9);
  T = { ...opts, best: 0, falls: 0, camY: 0, time: 0, raf: 0, cp: { z: -2, y: 0 }, cpN: 0, speed: P.speed };
  Object.assign(me, { x: 0, y: 0, z: -2, vx: 0, vz: 0, vy: 0, yaw: 0, on: null, stun: 0, wait: 0.9, blocked: false });
  stick.x = stick.y = 0;
  canvas.style.display = "block";
  onResize();
  clock.getDelta();
  loop();
}
export function stopTower() {
  if (!T) return 0;
  const best = Math.floor(T.best);
  cancelAnimationFrame(T.raf);
  T = null;
  canvas.style.display = "none";
  return best;
}
/* バーチャルパッドの 入力（main.js から 毎回 よぶ） */
export function towerStick(x, y) {
  const m = Math.hypot(x, y);
  const k = m > 1 ? 1 / m : 1;
  stick.x = x * k; stick.y = y * k;
}
export function towerJump() {
  if (!T || !me.on || me.wait > 0) return false;
  me.on = null;
  me.vy = P.jumpV;
  me.squash = -0.22;
  return true;
}
export const towerState = () => (T ? { best: T.best, falls: T.falls, cpN: T.cpN, speed: T.speed, me: { ...me, on: !!me.on }, solids: solids.map((s) => ({ x0: s.x0, x1: s.x1, y1: s.y1, z0: s.z0, z1: s.z1, pad: !!s.pad, mov: !!s.mov })), bars: bars.map((b) => ({ cz: b.cz, y: b.y, ang: b.ang, half: b.half })) } : null);

function onResize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.fov = w < h ? 74 : 60;
  camera.updateProjectionMatrix();
}
addEventListener("resize", onResize);

function respawn() {
  T.falls++;
  Object.assign(me, { x: 0, y: T.cp.y, z: T.cp.z, vx: 0, vz: 0, vy: 0, yaw: 0, on: null, stun: 0, wait: 0.7 });
  T.camY = T.cp.y;
  if (T.onFall) T.onFall(T.falls);
}

/* 1つの 軸ずつ 動かして、かべに ぶつかったら 止める（ひくい段は そのまま のぼる） */
const HW = 0.3, HD = 0.28;
function hits(x, z, y) {
  for (const s of solids) {
    if (!(x + HW > s.x0 && x - HW < s.x1 && z + HD > s.z0 && z - HD < s.z1)) continue;
    if (s.y1 <= y + 0.02 || s.y0 >= y + 1.0) continue;
    return s;
  }
  return null;
}
function moveAxis(axis, d) {
  if (Math.abs(d) < 1e-5) return;
  const nx = axis === "x" ? me.x + d : me.x, nz = axis === "z" ? me.z + d : me.z;
  const s = hits(nx, nz, me.y);
  if (!s) { me.x = nx; me.z = nz; return; }
  if (me.on && s.y1 - me.y <= P.stepUp && !hits(nx, nz, s.y1)) { me.y = s.y1; me.x = nx; me.z = nz; return; }   // かいだん
  me.blocked = true;
}

const clock = new THREE.Clock();
function loop() {
  if (!T) return;
  T.raf = requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = (T.time += dt);

  // コースを 先へ つぎたす・後ろを 消す
  while (B.z < me.z + 80) addPart();
  for (let i = solids.length - 1; i >= 0; i--) {
    const s = solids[i];
    if (s.z1 < me.z - 18 && s.z1 < T.cp.z - 2) { scene.remove(s.g); s.g.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); solids.splice(i, 1); }
  }
  for (let i = bars.length - 1; i >= 0; i--) if (bars[i].cz < me.z - 18) { scene.remove(bars[i].g); bars.splice(i, 1); }
  for (let i = flags.length - 1; i >= 0; i--) if (flags[i].z < me.z - 18) { scene.remove(flags[i].g); flags.splice(i, 1); }

  // 動く足場・回るバー
  for (const s of solids) {
    if (!s.mov) continue;
    const cx = Math.sin(t * s.mov.sp + s.mov.ph) * W;
    const ox = (s.x0 + s.x1) / 2;
    s.mov.dx = cx - ox;
    s.x0 = cx - s.w / 2; s.x1 = cx + s.w / 2;
    s.g.position.x = cx;
  }
  for (const b of bars) { b.ang += b.sp * dt; b.g.rotation.y = b.ang; }

  // のるん：スティックの 方向へ 歩く（はなすと すぐ 止まる）
  T.speed = P.speed;
  if (me.wait > 0) me.wait -= dt;
  if (me.stun > 0) me.stun -= dt;
  const canMove = me.wait <= 0 && me.stun <= 0;
  const tvx = canMove ? -stick.x * T.speed : 0;     // 画面の 右 ＝ ワールドの -x
  const tvz = canMove ? stick.y * T.speed : 0;
  me.vx = damp(me.vx, tvx, 16, dt);
  me.vz = damp(me.vz, tvz, 16, dt);
  me.blocked = false;
  const px = me.x;
  if (me.on && me.on.mov) me.x += me.on.mov.dx;        // 動く足場の上では いっしょに 動く
  moveAxis("x", me.vx * dt);
  moveAxis("z", me.vz * dt);
  const vx = (me.x - px) / Math.max(dt, 1e-4);
  const going = Math.hypot(me.vx, me.vz) > 0.4;

  // 上下：足場に のる
  const prevY = me.y;
  me.vy -= P.gravity * dt;
  let ny = me.y + me.vy * dt;
  let sup = null;
  for (const s of solids) {
    if (!(me.x + 0.36 > s.x0 && me.x - 0.36 < s.x1 && me.z + 0.3 > s.z0 && me.z - 0.3 < s.z1)) continue;
    if (s.y1 > prevY + 0.05) continue;
    if (!sup || s.y1 > sup.y1) sup = s;
  }
  if (sup && me.vy <= 0 && ny <= sup.y1) {
    if (!me.on && prevY - sup.y1 > 0.15) me.squash = Math.min(0.3, 0.1 + (prevY - sup.y1) * 0.12);
    ny = sup.y1; me.vy = 0; me.on = sup;
    if (sup.pad) { me.vy = P.padV; me.on = null; me.squash = 0.3; if (T.onPad) T.onPad(); }
  } else me.on = null;
  me.y = ny;

  // 回るバー：当たったら 少し 後ろへ はねる（落ちない）
  for (const b of bars) {
    if (me.stun > 0 || me.y - b.y > 0.8 || me.y < b.y - 0.3) continue;
    const rx = me.x - b.cx, rz = me.z - b.cz;
    const dx = Math.cos(b.ang), dz = -Math.sin(b.ang);    // バーの むき（xz）
    const along = rx * dx + rz * dz, across = Math.abs(-rx * dz + rz * dx);
    if (Math.abs(along) < b.half + 0.2 && across < 0.5) {
      me.stun = 0.55; me.vy = 5; me.on = null; me.squash = -0.2;
      me.z = Math.max(b.cz - 5, me.z - 1.6);
      if (T.onBump) T.onBump();
    }
  }

  // 高さの記録・チェックポイント
  if (me.on && me.y > T.best) { T.best = me.y; if (T.onHeight) T.onHeight(Math.floor(T.best)); }
  for (const f of flags) {
    if (!f.hit && me.on && me.z > f.z && Math.abs(me.y - f.y) < 0.6) {
      f.hit = true;
      f.cloth.material.color.set(0x3cc98a);
      if (f.z > T.cp.z + 0.1) {
        T.cp = { z: f.z + 0.2, y: f.y };
        T.cpN++;
        if (T.onCheckpoint) T.onCheckpoint(T.cpN);
      }
    }
    f.cloth.rotation.y = Math.sin(t * 4 + f.z) * 0.3;
  }
  // 落ちた → チェックポイントから
  if (me.y < T.cp.y - 7) respawn();

  // のるんの 見た目
  me.ph += dt * (me.on && going ? 9.5 : 4);
  me.squash = damp(me.squash, me.on ? 0 : Math.max(-0.14, Math.min(0.05, -me.vy * 0.018)), 10, dt);
  const hop = me.on && going ? Math.abs(Math.sin(me.ph)) * 0.12 : 0;
  // 歩く 方向を むく（後ろへ 歩く時も そっちを むく）
  if (going) {
    const want = Math.atan2(me.vx, me.vz);
    let d = want - me.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    me.yaw += d * (1 - Math.exp(-12 * dt));
  }
  if (nr.body) {
    nr.body.scale.set(1 + me.squash * 0.8, 1 - me.squash, 1 + me.squash * 0.8);
    nr.body.rotation.set(0, Math.sin(me.ph) * 0.05, Math.sin(me.ph) * 0.12);
    me.starV += (-me.star * 60 - me.starV * 5 - Math.cos(me.ph) * 4 + vx * 0.04 - me.vy * 0.25) * dt;
    me.star += me.starV * dt;
    for (const s of [nr.starL, nr.starR]) if (s) { s.quaternion.copy(s.userData.q); s.rotateZ(Math.max(-0.7, Math.min(0.7, me.star))); }
  }
  nr.root.position.set(me.x, me.y + hop, me.z);
  nr.root.rotation.set(0, me.yaw, 0);
  nr.root.visible = me.wait <= 0 || Math.floor(me.wait * 12) % 2 === 0;    // やりなおし直後は ちかちか
  // 影
  let sy = null;
  for (const s of solids) if (me.x + 0.3 > s.x0 && me.x - 0.3 < s.x1 && me.z > s.z0 && me.z < s.z1 && s.y1 <= me.y + 0.05 && (sy === null || s.y1 > sy)) sy = s.y1;
  shadow.visible = sy !== null;
  if (sy !== null) { shadow.position.set(me.x, sy + 0.04, me.z); shadow.scale.setScalar(Math.max(0.35, 1 - (me.y - sy) / 4)); }

  // カメラ：後ろの 少し上から
  T.camY = damp(T.camY, me.on ? me.y : Math.min(me.y, T.camY + 1.5), me.on ? 4 : 2, dt);
  // よこ長の 画面では のるんが 下の ボタンに かくれないように 少し 上に うつす
  const wide = camera.aspect > 1;
  camera.position.set(me.x * 0.45, T.camY + (wide ? 3.0 : 3.4), me.z - (wide ? 6.2 : 6.8));
  camera.lookAt(me.x * 0.3, T.camY + (wide ? 0.1 : 1.0), me.z + 7);

  // 景色：雲・遠くの塔・空の色
  for (const c of clouds) {
    c.position.y = T.camY + c.userData.dy;
    if (c.position.z < me.z - 12) c.position.z += rand(85, 95);
  }
  farTower.position.set(-16, T.camY * 0.6 - 30, me.z + 110);
  const h = T.camY;
  for (let i = 0; i < SKY.length - 1; i++) {
    const [h0, c0] = SKY[i], [h1, c1] = SKY[i + 1];
    if (h <= h1 || i === SKY.length - 2) { scene.background.copy(c0).lerp(c1, Math.max(0, Math.min(1, (h - h0) / (h1 - h0)))); break; }
  }
  scene.fog.color.copy(scene.background);
  renderer.render(scene, camera);
}
