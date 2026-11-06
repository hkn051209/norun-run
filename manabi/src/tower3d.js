/* =========================================================
   塔（エンドレス）：足場を のぼりつづける。頂上なし
   - 足場は 3列（◀ ▶ で 1列ずつ移る）。ジャンプで 上の段へ
   - 下から くもが 上がってくる。くもに のまれるか、画面の下へ 落ちたら おしまい
   - 高さ（m）＝ のった足場の いちばん高い所
   ========================================================= */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/GLTFLoader.js";
import { PLAY_TOWER as P } from "./config.js";

const W = P.laneW;
const LANE_X = [-W, 0, W];            // 0=画面の左（カメラは +Z から -Z を見る）
const PLAT_HALF = 0.98;               // 足場の 半分のはば（のれる はんい）
const rand = (a, b) => a + Math.random() * (b - a);
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const lambert = (c) => new THREE.MeshLambertMaterial({ color: c });

const canvas = document.getElementById("towerView");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const SKY = [[0, new THREE.Color(0xbfe6ff)], [60, new THREE.Color(0xffd7b0)], [120, new THREE.Color(0x9b8cd9)], [200, new THREE.Color(0x2b2f6b)]];
scene.background = new THREE.Color(0xbfe6ff);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
scene.add(new THREE.HemisphereLight(0xffffff, 0xb9a8d8, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 0.9);
sun.position.set(-3, 8, 6);
scene.add(sun);

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- 景色：うしろの塔・雲・下から せまる くも ---------- */
const wallTex = canvasTex(256, 256, (x, w, h) => {
  x.fillStyle = "#f3e6d3"; x.fillRect(0, 0, w, h);
  x.strokeStyle = "#e0cdb2"; x.lineWidth = 6;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) x.strokeRect((r % 2) * 32 + c * 64 - 32, r * 64, 64, 64);
  x.fillStyle = "#8fc4ff"; x.beginPath(); x.roundRect(98, 70, 60, 90, [30, 30, 6, 6]); x.fill();
  x.fillStyle = "#c9a6ff"; x.fillRect(92, 160, 72, 10);
});
wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
wallTex.repeat.set(6, 40);
const wall = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 7.5, 400, 40, 1, true, Math.PI * 0.6, Math.PI * 0.8), new THREE.MeshLambertMaterial({ map: wallTex, side: THREE.BackSide, emissive: 0xffffff, emissiveIntensity: 0.22 }));
wall.position.set(0, 190, 2);
scene.add(wall);
const clouds = [];
for (let i = 0; i < 12; i++) {
  const c = new THREE.Group();
  for (let k = 0; k < 3; k++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(rand(0.9, 1.4), 12, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }));
    s.position.set(k * 1.2 - 1.2, rand(0, 0.3), 0);
    c.add(s);
  }
  c.position.set(rand(-14, 14), rand(-4, 30), rand(-14, -8));
  c.userData.v = rand(0.3, 0.8) * (Math.random() < 0.5 ? -1 : 1);
  scene.add(c); clouds.push(c);
}
// 下から せまる くも（ふわふわの 海）
const fogTex = canvasTex(256, 64, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.45, "rgba(255,255,255,0.95)"); g.addColorStop(1, "rgba(240,235,255,1)");
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.fillStyle = "#fff";
  for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(i * 32 + 8, 30, 22, 0, Math.PI * 2); x.fill(); }
});
fogTex.wrapS = THREE.RepeatWrapping; fogTex.repeat.set(4, 1);
const fogSea = new THREE.Mesh(new THREE.PlaneGeometry(60, 3), new THREE.MeshBasicMaterial({ map: fogTex, transparent: true, depthWrite: false }));
fogSea.renderOrder = 3;
scene.add(fogSea);
const fogBody = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshBasicMaterial({ color: 0xf0ebff }));
scene.add(fogBody);

/* ---------- 足場 ---------- */
const PLAT_COLORS = [0xff9ec7, 0x8fd3ff, 0xffd86b, 0x9be39b, 0xc7a8ff];
const platGeo = new THREE.BoxGeometry(PLAT_HALF * 2, 0.36, 1.0);
const topGeo = new THREE.BoxGeometry(PLAT_HALF * 2 + 0.06, 0.1, 1.06);
const NR_Z = 0.62;   // のるんは 足場の 手前のはしに 立つ（上の足場が のるんに かぶらないように）
const platMats = PLAT_COLORS.map((c) => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.25 }));
const topMat = lambert(0xfffaf0);
const crackMat = lambert(0xb79a7a);
const crackTopMat = lambert(0xd8c3a5);
function makePlat(lane, y, crumble) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(platGeo, crumble ? crackMat : platMats[Math.floor(Math.random() * platMats.length)]);
  body.position.y = -0.18 - 0.05;
  const top = new THREE.Mesh(topGeo, crumble ? crackTopMat : topMat);
  top.position.y = -0.05;
  g.add(body, top);
  if (crumble) {   // ひびの もよう
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, rand(0.5, 1.1)), lambert(0x6b5642));
      c.position.set(rand(-0.6, 0.6), 0.005, rand(-0.3, 0.3)); c.rotation.y = rand(-0.8, 0.8);
      g.add(c);
    }
  }
  g.position.set(LANE_X[lane], y, 0);
  scene.add(g);
  return { lane, y, crumble, g, t: -1, fall: 0, gone: false };
}

/* ---------- のるん ---------- */
const nr = { root: new THREE.Group(), body: null, hatMats: [], starL: null, starR: null, turn: new THREE.Group() };
nr.root.add(nr.turn);
scene.add(nr.root);
const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.7, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2;
scene.add(shadow);
let loaded = null;
export function initTowerView() {
  if (!loaded) loaded = new GLTFLoader().loadAsync("assets/models/norun-v4.glb").then((g) => {
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
    nr.turn.add(m);
  });
  return loaded;
}
export function setTowerHat(color) {
  for (const m of nr.hatMats) { if (color == null) m.color.copy(m.userData.base); else m.color.set(color); }
}

/* ---------- 状態 ---------- */
let T = null;
const me = { lane: 1, x: 0, y: 0, vy: 0, on: null, squash: 0, ph: 0, star: 0, starV: 0 };

function addRow() {
  const y = T.topY + rand(P.rowDy[0], P.rowDy[1]);
  const h = y;
  // 「かならず のれる道」：前の段の道から 1列以内
  let main = Math.max(0, Math.min(2, T.mainLane + [-1, 0, 1][Math.floor(Math.random() * 3)]));
  if (main === T.mainLane && Math.random() < 0.5) main = Math.max(0, Math.min(2, main + (Math.random() < 0.5 ? -1 : 1)));
  T.mainLane = main;
  T.plats.push(makePlat(main, y, false));
  const rate = h < P.crumble.from ? 0 : Math.min(P.crumble.maxRate, P.crumble.rate + (h - P.crumble.from) * 0.002);
  if (Math.random() < 0.55) {
    const others = [0, 1, 2].filter((l) => l !== main);
    T.plats.push(makePlat(others[Math.floor(Math.random() * 2)], y, Math.random() < rate * 2));
  }
  T.topY = y;
}

export function startTower(opts) {
  stopTower();
  T = { ...opts, plats: [], topY: 0, mainLane: 1, camY: 0, cloudY: -4, best: 0, time: 0, over: false, overT: 0, raf: 0 };
  T.plats.push(makePlat(0, 0, false), makePlat(1, 0, false), makePlat(2, 0, false));   // スタートの床
  while (T.topY < 30) addRow();
  Object.assign(me, { lane: 1, x: 0, y: 0, vy: 0, on: T.plats[1], squash: 0 });
  canvas.style.display = "block";
  onResize();
  clock.getDelta();
  loop();
}
export function stopTower() {
  if (!T) return;
  cancelAnimationFrame(T.raf);
  for (const p of T.plats) scene.remove(p.g);
  T = null;
  canvas.style.display = "none";
}
export function towerMove(d) { if (T && !T.over) me.lane = Math.max(0, Math.min(2, me.lane + d)); }
export function towerJump() {
  if (!T || T.over || !me.on) return false;
  me.on = null;
  me.vy = P.jumpV;
  me.squash = -0.22;
  return true;
}
export const towerState = () => (T ? { ...T, me: { ...me } } : null);   // 動作確認用

function onResize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.fov = w < h ? 68 : 52;
  camera.updateProjectionMatrix();
}
addEventListener("resize", onResize);

const clock = new THREE.Clock();
function loop() {
  if (!T) return;
  T.raf = requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  T.time += dt;

  // 足場を 上へ つぎたす・下の古いものを 消す
  while (T.topY < T.camY + 26) addRow();
  T.plats = T.plats.filter((p) => {
    if (p.y < T.cloudY - 8 || p.gone) { scene.remove(p.g); return false; }
    return true;
  });

  // くずれる足場
  for (const p of T.plats) {
    if (p.t >= 0) {
      p.t += dt;
      p.g.position.x = LANE_X[p.lane] + Math.sin(p.t * 60) * 0.05;
      if (p.t > P.crumbleT) {
        p.fall += dt * 14;
        p.g.position.y -= p.fall * dt;
        p.g.rotation.z += dt * 0.8;
        if (me.on === p) me.on = null;
        if (p.g.position.y < p.y - 12) p.gone = true;
      }
    }
  }

  // のるん：左右
  const px = me.x;
  me.x = damp(me.x, LANE_X[me.lane], 14, dt);
  const vx = (me.x - px) / Math.max(dt, 1e-4);
  // 足場の上を 歩いて はみ出したら 落ちる
  if (me.on && Math.abs(me.x - LANE_X[me.on.lane]) > PLAT_HALF) me.on = null;
  if (me.on) {
    me.y = me.on.g.position.y;
    me.vy = 0;
  } else {
    const prevY = me.y;
    me.vy -= P.gravity * dt;
    me.y += me.vy * dt;
    if (me.vy <= 0 && !T.over) {
      for (const p of T.plats) {
        if (p.t > P.crumbleT) continue;
        const top = p.g.position.y;
        if (prevY >= top - 0.02 && me.y <= top && Math.abs(me.x - LANE_X[p.lane]) < PLAT_HALF) {
          me.y = top; me.vy = 0; me.on = p;
          me.squash = Math.min(0.32, 0.12 + Math.abs(prevY - me.y) * 0.5);
          if (p.crumble && p.t < 0) p.t = 0;
          if (top > T.best + 0.01) {
            T.best = top;
            if (T.onHeight) T.onHeight(Math.floor(T.best));
          }
          break;
        }
      }
    }
  }

  // カメラ：上へだけ ついていく
  T.camY = Math.max(T.camY, damp(T.camY, me.y + 1.2, 3, dt));
  // くも：少し まってから 上がりはじめる。カメラから はなれすぎないように 追いつく
  if (T.time > P.cloud.grace && !T.over) {
    const v = Math.min(P.cloud.max, P.cloud.start + T.best * P.cloud.per);
    T.cloudY += v * dt;
    T.cloudY = Math.max(T.cloudY, T.camY - 6.8);   // くもは いつも 画面の下に 見えている
  }
  // おしまい：くもに のまれる・画面の下へ 落ちる
  if (!T.over && (me.y < T.cloudY + 0.3 || me.y < T.camY - 8)) {
    T.over = true; T.overT = 1.2;
    if (T.onFall) T.onFall(Math.floor(T.best));
  }
  if (T.over) {
    T.overT -= dt;
    if (T.overT <= 0) { const end = T.onEnd, h = Math.floor(T.best); stopTower(); end(h); return; }
  }

  // のるんの見た目
  me.ph += dt * (me.on ? 6 : 12);
  me.squash = damp(me.squash, me.on ? Math.sin(me.ph) * 0.04 : Math.max(-0.14, Math.min(0.05, -me.vy * 0.018)), 10, dt);
  if (nr.body) {
    nr.body.scale.set(1 + me.squash * 0.8, 1 - me.squash, 1 + me.squash * 0.8);
    nr.body.rotation.z = Math.sin(me.ph * 0.5) * 0.06;
    me.starV += (-me.star * 60 - me.starV * 5 + vx * 0.04 - me.vy * 0.3) * dt;
    me.star += me.starV * dt;
    for (const s of [nr.starL, nr.starR]) if (s) { s.quaternion.copy(s.userData.q); s.rotateZ(Math.max(-0.7, Math.min(0.7, me.star))); }
  }
  nr.turn.rotation.y = 0;                   // 正面（カメラの方）を向く
  nr.root.position.set(me.x, me.y, NR_Z);
  nr.root.rotation.z = Math.max(-0.3, Math.min(0.3, -vx * 0.03));
  // 影：下の足場の上に
  let sy = -100;
  for (const p of T.plats) if (Math.abs(me.x - LANE_X[p.lane]) < PLAT_HALF && p.g.position.y <= me.y + 0.01 && p.g.position.y > sy) sy = p.g.position.y;
  shadow.visible = sy > -100;
  shadow.position.set(me.x, sy + 0.012, NR_Z - 0.15);
  shadow.scale.setScalar(Math.max(0.4, 1 - (me.y - sy) / 4));

  // 景色
  for (const c of clouds) {
    c.position.x += c.userData.v * dt;
    if (c.position.x > 18) c.position.x = -18; else if (c.position.x < -18) c.position.x = 18;
    if (c.position.y < T.camY - 10) c.position.y += rand(36, 44);
  }
  fogSea.position.set(0, T.cloudY - 0.4, 2.5);     // 上のはし ＝ くもの高さ＋1
  fogBody.position.set(0, T.cloudY - 21.8, 2.4);
  fogTex.offset.x = (T.time * 0.05) % 1;
  // 空の色：高くなるほど 夕方 → 夜
  const h = T.camY;
  for (let i = 0; i < SKY.length - 1; i++) {
    const [h0, c0] = SKY[i], [h1, c1] = SKY[i + 1];
    if (h <= h1 || i === SKY.length - 2) { scene.background.copy(c0).lerp(c1, Math.max(0, Math.min(1, (h - h0) / (h1 - h0)))); break; }
  }
  wall.material.emissive.copy(scene.background);     // 塔の かべも 空の色に そまる（高くなるほど 夕方 → 夜）

  // カメラは のるんの 少し上の高さから ほぼ まっすぐ 見る（上の足場が のるんに かぶらないように）
  camera.position.set(me.x * 0.25, T.camY + 0.7, camera.aspect < 1 ? 12.5 : 11);
  camera.lookAt(me.x * 0.15, T.camY + 1.5, 0);
  renderer.render(scene, camera);
}
