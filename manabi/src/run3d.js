/* =========================================================
   選択ラン（学習用）
   のるんが自動で走りつづけ、問題ごとに 答えの門が3つ（3レーン）あらわれる。
   レーンを移って 門をくぐると答え。障害物・ジャンプはなし。止まらない。
   - 当たりの判定や記録は main.js（onPass で返す）。ここは 見た目と動きだけ
   - 走っていない時は 描画を止める（電池のため）
   ========================================================= */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/GLTFLoader.js";
import { RUN, TEMPO } from "./config.js";
const TEMPO_NG = TEMPO.ngShow / 1000;

const W = RUN.laneW;
const LANE_X = [W, 0, -W];            // 0=画面の左 1=まんなか 2=右（カメラは -Z 側から +Z を見る）
const FONT = '"Hiragino Maru Gothic ProN","Rounded Mplus 1c","Noto Sans JP",sans-serif';
const rand = (a, b) => a + Math.random() * (b - a);
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const lambert = (c) => new THREE.MeshLambertMaterial({ color: c });

const canvas = document.getElementById("runView");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfe6ff);
scene.fog = new THREE.Fog(0xbfe6ff, 30, 90);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
scene.add(new THREE.HemisphereLight(0xffffff, 0xa8d08c, 1.5));
const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(-4, 10, -6);
scene.add(sun);

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* ---------- 景色（軽く：道・縁石・草・木・雲） ---------- */
const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 400), lambert(0x9bd77a));
ground.rotation.x = -Math.PI / 2;
ground.position.set(0, -0.02, 120);
scene.add(ground);
const roadTex = canvasTex(256, 256, (x, w, h) => {   // 石だたみ
  x.fillStyle = "#c9b48e"; x.fillRect(0, 0, w, h);
  const cw = w / 5, ch = h / 5;
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    const s = rand(0.92, 1.06);
    const col = `rgb(${Math.round(242 * s)},${Math.round(226 * s)},${Math.round(190 * s)})`;
    for (const dx of [0, -w]) {
      const sx = (r % 2) * cw / 2 + c * cw + dx + 4, sy = r * ch + 4;
      x.fillStyle = col;
      x.beginPath(); x.roundRect(sx, sy, cw - 8, ch - 8, 12); x.fill();
    }
  }
});
roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
roadTex.repeat.set(3, 150);
const road = new THREE.Mesh(new THREE.PlaneGeometry(W * 3 + 0.6, 400), new THREE.MeshLambertMaterial({ map: roadTex }));
road.rotation.x = -Math.PI / 2;
road.position.set(0, -0.01, 120);
scene.add(road);
for (const s of [1, -1]) {
  const curb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 400), lambert(0xf2ece0));
  curb.position.set(s * (W * 1.5 + 0.55), 0.14, 120);
  scene.add(curb);
  for (const x of [W / 2]) {   // レーンの境目
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 400), lambert(0xa08a68));
    gr.rotation.x = -Math.PI / 2;
    gr.position.set(s * x, 0.004, 120);
    scene.add(gr);
  }
}
const deco = [];
const trunkGeo = new THREE.CylinderGeometry(0.2, 0.28, 1.6, 7), leafGeo = new THREE.SphereGeometry(1.2, 12, 10);
const flowerGeo = new THREE.SphereGeometry(0.17, 8, 6);
const leafMats = [0x5fbf5a, 0x77c96a, 0x4fae63].map(lambert);
const flowerMats = [0xff8fbf, 0xffe066, 0xffffff, 0xb59cff].map(lambert);
const trunkMat = lambert(0x9a6a3d);
function placeDeco(o, init) {
  const side = Math.random() < 0.5 ? -1 : 1;
  o.position.x = side * (W * 1.5 + (o.userData.tree ? rand(2.5, 14) : rand(1.2, 6)));
  o.position.z = init ? rand(-8, 100) : rand(100, 112);
}
for (let i = 0; i < 34; i++) {
  const g = new THREE.Group();
  const tr = new THREE.Mesh(trunkGeo, trunkMat); tr.position.y = 0.8;
  const lf = new THREE.Mesh(leafGeo, leafMats[i % 3]); lf.position.y = 2.4; lf.scale.y = 1.1;
  g.add(tr, lf);
  g.userData.tree = true;
  g.scale.setScalar(rand(0.8, 1.3));
  placeDeco(g, true); scene.add(g); deco.push(g);
}
for (let i = 0; i < 40; i++) {
  const f = new THREE.Mesh(flowerGeo, flowerMats[i % 4]);
  f.position.y = 0.2;
  placeDeco(f, true); scene.add(f); deco.push(f);
}
for (let i = 0; i < 7; i++) {
  const c = new THREE.Group();
  for (let k = 0; k < 3; k++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(rand(1.1, 1.6), 12, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }));
    s.position.set(k * 1.4 - 1.4, rand(0, 0.3), 0);
    c.add(s);
  }
  c.position.set(rand(-40, 40), rand(14, 20), rand(60, 110));
  scene.add(c);
}

/* ---------- のるん ---------- */
const nr = { root: new THREE.Group(), body: null, hat: null, hatMats: [], starL: null, starR: null };
scene.add(nr.root);
const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.8, 24),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = 0.01;
scene.add(shadow);

export async function initRunView() {
  const g = await new GLTFLoader().loadAsync("assets/models/norun-v4.glb");
  const m = g.scene;
  m.scale.setScalar(0.85);
  const get = (n) => m.getObjectByName(n);
  Object.assign(nr, { body: get("Body"), hat: get("Hat"), starL: get("Star_L"), starR: get("Star_R") });
  for (const s of [nr.starL, nr.starR]) s.userData.q = s.quaternion.clone();
  m.traverse((o) => {
    if (o.isMesh && o.material.name === "M_Hat") {
      o.material = o.material.clone();
      o.material.userData.base = o.material.color.clone();
      nr.hatMats.push(o.material);
    }
  });
  nr.root.add(m);
}
export function setRunHat(color) {
  for (const m of nr.hatMats) { if (color == null) m.color.copy(m.userData.base); else m.color.set(color); }
}

/* ---------- 門 ---------- */
const DOOR_COLORS = [["#fff3c4", "#ffd27a"], ["#e3f6ff", "#9fd8ff"], ["#ffe3f0", "#ffb3d4"]];
function doorTex(value, dots, ci) {
  return canvasTex(256, 360, (x, w, h) => {
    const [c1, c2] = DOOR_COLORS[ci];
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    x.fillStyle = g;
    x.beginPath(); x.roundRect(6, 6, w - 12, h - 12, 28); x.fill();
    x.lineWidth = 10; x.strokeStyle = "#8a5fbf"; x.stroke();
    x.fillStyle = "#3b2a5a"; x.textAlign = "center"; x.textBaseline = "middle";
    x.font = `bold ${dots ? 130 : 150}px ${FONT}`;
    x.fillText(String(value), w / 2, dots ? 120 : h / 2 + 6);
    if (dots) {
      x.fillStyle = "#8a5fbf";
      for (let i = 0; i < value; i++) {
        x.beginPath(); x.arc(48 + (i % 5) * 40, 250 + Math.floor(i / 5) * 44, 15, 0, Math.PI * 2); x.fill();
      }
    }
  });
}
// 門の上の 問題の看板（年長はドット：ピンク＝はじめの数、水色＝たす数）
function boardTex(q) {
  return canvasTex(512, 200, (x, w, h) => {
    x.fillStyle = "#ffffff"; x.beginPath(); x.roundRect(6, 6, w - 12, h - 12, 40); x.fill();
    x.lineWidth = 8; x.strokeStyle = "#ffb800"; x.stroke();
    x.textAlign = "center"; x.textBaseline = "middle";
    if (q.dots) {
      const dot = (n, x0, col) => {
        x.fillStyle = col;
        const cols = Math.min(5, n), rows = Math.ceil(n / 5);
        for (let i = 0; i < n; i++) {
          const cx = x0 + (i % 5) * 34 - ((cols - 1) * 34) / 2, cy = h / 2 + (Math.floor(i / 5) - (rows - 1) / 2) * 36;
          x.beginPath(); x.arc(cx, cy, 14, 0, Math.PI * 2); x.fill();
        }
      };
      dot(q.a, 130, "#ff7eb6");
      x.fillStyle = "#7d6b9c"; x.font = `bold 80px ${FONT}`; x.fillText("＋", w / 2, h / 2 + 4);
      dot(q.b, 382, "#5bc0eb");
    } else {
      x.fillStyle = "#3b2a5a"; x.font = `bold 110px ${FONT}`;
      x.fillText(`${q.text} = ?`, w / 2, h / 2 + 6);
    }
  });
}
// ⭕ ❌ の しるし（絵文字ではなく 図形で描く）
const markOk = canvasTex(128, 128, (x) => { x.lineWidth = 18; x.strokeStyle = "#ff4d6d"; x.beginPath(); x.arc(64, 64, 44, 0, Math.PI * 2); x.stroke(); });
const markNg = canvasTex(128, 128, (x) => { x.lineWidth = 20; x.lineCap = "round"; x.strokeStyle = "#3b6bff"; x.beginPath(); x.moveTo(26, 26); x.lineTo(102, 102); x.moveTo(102, 26); x.lineTo(26, 102); x.stroke(); });
const frameMat = lambert(0x8a5fbf);
const postGeo = new THREE.BoxGeometry(0.26, 2.9, 0.26);
const beamGeo = new THREE.BoxGeometry(W * 3 + 0.5, 0.4, 0.3);
const doorGeo = new THREE.PlaneGeometry(W - 0.4, 2.5);
const glowGeo = new THREE.PlaneGeometry(W + 0.35, 3.2);

function makeGate(q, values) {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Mesh(postGeo, frameMat);
    p.position.set((1.5 - i) * W, 1.45, 0);
    g.add(p);
  }
  const beam = new THREE.Mesh(beamGeo, frameMat);
  beam.position.y = 2.9;
  g.add(beam);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.33), new THREE.MeshBasicMaterial({ map: boardTex(q) }));
  board.position.set(0, 3.85, -0.05);
  board.rotation.y = Math.PI;
  g.add(board);
  const doors = [], glows = [], marks = [];
  values.forEach((v, lane) => {
    const x = LANE_X[lane];
    const glow = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({ color: 0x3cc98a, transparent: true, opacity: 0, depthWrite: false }));
    glow.position.set(x, 1.3, 0.04);
    glow.rotation.y = Math.PI;
    const door = new THREE.Mesh(doorGeo, new THREE.MeshBasicMaterial({ map: doorTex(v, q.dots, lane), transparent: true, side: THREE.DoubleSide }));
    door.position.set(x, 1.3, 0);
    door.rotation.y = Math.PI;
    const mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: markOk, transparent: true, depthTest: false }));
    mark.position.set(x, 1.6, -0.3);
    mark.scale.set(1.6, 1.6, 1);
    mark.visible = false;
    mark.renderOrder = 5;
    g.add(glow, door, mark);
    doors.push(door); glows.push(glow); marks.push(mark);
  });
  scene.add(g);
  return { g, doors, glows, marks };
}
function disposeGate(gt) {
  scene.remove(gt.g);
  gt.g.traverse((o) => {
    if (o.material && !o.isSprite && o.material !== frameMat) {
      if (o.material.map && o.material.map !== markOk && o.material.map !== markNg) o.material.map.dispose();
      o.material.dispose();
    }
    if (o.isSprite) o.material.dispose();
  });
}

/* まちがえた時に 光らせる「正解の門」（門から取り出して 前に置く） */
function showRightDoor(gt, right, chosen) {
  clearGhost();
  const group = new THREE.Group();
  const door = gt.doors[right], glow = gt.glows[right], mark = gt.marks[chosen];
  door.userData.fade = false;
  door.material.opacity = 1;
  group.add(glow, door);
  glow.position.z = 0.04;
  mark.visible = false;
  scene.add(group);
  R.ghost = { group, door, glow, t: TEMPO_NG };
}
function clearGhost() {
  if (!R || !R.ghost) return;
  const gh = R.ghost;
  scene.remove(gh.group);
  for (const m of [gh.door, gh.glow]) { if (m.material.map) m.material.map.dispose(); m.material.dispose(); }
  R.ghost = null;
}

/* ---------- 走る ---------- */
let R = null;          // いまのラン
const me = { lane: 1, x: 0, y: 0, vy: 0, squash: 0, sway: 0, swayPh: 0, star: 0, starV: 0 };

export function startRunView(opts) {
  stopRunView();
  R = {
    ...opts,          // qs, values（各問題の3つの答え）, speed, gap, first, onPass, onFocus, onEnd
    dist: 0, gates: [], focus: -1, endT: -1, active: true,
  };
  Object.assign(me, { lane: 1, x: 0, y: 0, vy: 0 });
  canvas.style.display = "block";
  clock.getDelta();
  loop();
}
export function stopRunView() {
  if (!R) return;
  clearGhost();
  for (const gt of R.gates) if (gt) disposeGate(gt);
  R = null;
  canvas.style.display = "none";
}
export function moveLaneTo(lane) { if (R) me.lane = Math.max(0, Math.min(2, lane)); }
export function moveLaneBy(d) { if (R) me.lane = Math.max(0, Math.min(2, me.lane + d)); }
export const laneNow = () => me.lane;
export const runState = () => R;     // 動作確認用

const gateZ = (i) => R.first + i * R.gap - R.dist;
const nearestLane = () => LANE_X.reduce((b, x, i) => (Math.abs(me.x - x) < Math.abs(me.x - LANE_X[b]) ? i : b), 0);

function onResize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.fov = w < h ? 74 : 60;
  camera.updateProjectionMatrix();
}
addEventListener("resize", onResize);
onResize();

const clock = new THREE.Clock();
let raf = 0;
function loop() {
  cancelAnimationFrame(raf);
  if (!R) return;
  raf = requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  R.dist += R.speed * dt;

  // 景色を流す
  roadTex.offset.y = -((R.dist * roadTex.repeat.y) / 400) % 1;
  for (const o of deco) {
    o.position.z -= R.speed * dt;
    if (o.position.z < -10) placeDeco(o, false);
  }

  // 門：近づいたら作る・くぐったら判定・後ろへ行ったら消す
  for (let i = 0; i < R.qs.length; i++) {
    const z = gateZ(i);
    if (!R.gates[i] && z < 85 && z > -12) R.gates[i] = makeGate(R.qs[i], R.values[i]);
    const gt = R.gates[i];
    if (!gt) continue;
    gt.g.position.z = z;
    if (!gt.passed && z <= 0.2) {
      gt.passed = true;
      const lane = nearestLane();
      const v = R.values[i][lane];
      const ok = R.onPass(i, v);
      const right = R.values[i].indexOf(R.qs[i].ans);
      gt.marks[lane].material.map = ok ? markOk : markNg;
      gt.marks[lane].visible = true;
      gt.markT = 0.9;
      if (ok) { me.vy = 5.5; me.squash = -0.2; }
      else showRightDoor(gt, right, lane);
      for (let l = 0; l < 3; l++) if (l !== right) gt.doors[l].userData.fade = true;
      if (i === R.qs.length - 1) R.endT = RUN.endRun;
    }
    if (gt.passed) {
      for (const d of gt.doors) if (d.userData.fade) d.material.opacity = Math.max(0.2, d.material.opacity - dt * 2.5);
      // 通りぬけた門は すぐ消す（柱や看板が カメラの前を ふさがないように）
      gt.g.visible = z > -0.3;
    }
    if (z < -12 && gt && !gt.removed) { gt.removed = true; disposeGate(gt); R.gates[i] = null; }
  }
  // まちがえた時：正解の門を のるんの少し前に 残して 光らせる（のるんは 止まらない）
  if (R.ghost) {
    const gh = R.ghost;
    gh.t -= dt;
    gh.group.position.z = 2.6;
    gh.glow.material.opacity = 0.75 + Math.sin(t * 22) * 0.25;
    gh.group.scale.setScalar(0.9 + Math.sin(t * 22) * 0.03);
    if (gh.t <= 0) clearGhost();
  }
  // いま考える問題（まだ くぐっていない いちばん近い門）
  let f = -1;
  for (let i = 0; i < R.qs.length; i++) if (!(R.gates[i] && R.gates[i].passed) && gateZ(i) > 0.2) { f = i; break; }
  if (f !== R.focus) { R.focus = f; if (f >= 0) R.onFocus(f); }
  if (R.endT >= 0) {
    R.endT -= dt;
    if (R.endT < 0) { const end = R.onEnd; stopRunView(); end(); return; }
  }

  // のるん：レーン移動・ぷにぷに跳ね・ゆらゆら
  const px = me.x;
  me.x = damp(me.x, LANE_X[me.lane], 12, dt);
  const vx = (me.x - px) / Math.max(dt, 1e-4);
  me.vy -= 20 * dt;
  me.y += me.vy * dt;
  if (me.y <= 0) {
    if (me.vy < -2) me.squash = Math.min(0.3, -me.vy * 0.03);
    me.y = 0;
    me.vy = 3.4;
  }
  me.squash = damp(me.squash, me.y > 0.05 ? -0.05 : 0, 10, dt);
  me.swayPh += dt * 9.5;
  const sway = Math.sin(me.swayPh) * 0.16;
  if (nr.body) {
    nr.body.scale.set(1 + me.squash * 0.8, 1 - me.squash, 1 + me.squash * 0.8);
    nr.body.rotation.set(0, Math.sin(me.swayPh) * 0.06, sway);
    me.starV += (-me.star * 60 - me.starV * 5 - Math.cos(me.swayPh) * 5 + vx * 0.05) * dt;
    me.star += me.starV * dt;
    for (const s of [nr.starL, nr.starR]) { s.quaternion.copy(s.userData.q); s.rotateZ(Math.max(-0.7, Math.min(0.7, me.star))); }
  }
  nr.root.position.set(me.x, me.y, 0);
  nr.root.rotation.z = Math.max(-0.3, Math.min(0.3, vx * 0.03));
  shadow.position.x = me.x;
  shadow.scale.setScalar(1 - Math.min(me.y / 3, 0.5));

  // カメラ：後ろから
  camera.position.set(me.x * 0.5, 2.7, -5.2);
  camera.lookAt(me.x * 0.3, 1.1, 14);
  renderer.render(scene, camera);
}
