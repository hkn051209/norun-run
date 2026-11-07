/* =========================================================
   選択ラン（学習用）
   のるんが自動で走りつづけ、問題ごとに 答えの門が3つ（3レーン）あらわれる。
   レーンを移って 門をくぐると答え。障害物・ジャンプはなし。止まらない。
   - 当たりの判定や記録は main.js（onPass で返す）。ここは 見た目と動きだけ
   - 走っていない時は 描画を止める（電池のため）
   ========================================================= */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/GLTFLoader.js";
import { MODEL_URL, findPinSlots, applyPins } from "./norun-model.js";
import { RUN, TEMPO, PLAY_RUN, RUN_ITEMS } from "./config.js";
const TEMPO_NG = TEMPO.ngShow / 1000;

const W = RUN.laneW;
const LANE_X = [W, 0, -W];            // 0=画面の左 1=まんなか 2=右（カメラは -Z 側から +Z を見る）
const FONT = '"NorunMaru","Hiragino Maru Gothic ProN","Rounded Mplus 1c","Noto Sans JP",sans-serif';
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
  const g = await new GLTFLoader().loadAsync(MODEL_URL);
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
  nr.pins = findPinSlots(m);
  nr.root.add(m);
}
export function setRunPins(pins) { if (nr.pins) applyPins(nr.pins, pins); }
export function setRunHat(color) {
  for (const m of nr.hatMats) { if (color == null) m.color.copy(m.userData.base); else m.color.set(color); }
}

/* ---------- 門 ---------- */
const DOOR_COLORS = [["#fff3c4", "#ffd27a"], ["#e3f6ff", "#9fd8ff"], ["#ffe3f0", "#ffb3d4"]];
function doorTex(value, dots, ci, size) {
  return canvasTex(256, 360, (x, w, h) => {
    const [c1, c2] = DOOR_COLORS[ci];
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    x.fillStyle = g;
    x.beginPath(); x.roundRect(6, 6, w - 12, h - 12, 28); x.fill();
    x.lineWidth = 10; x.strokeStyle = "#8a5fbf"; x.stroke();
    x.fillStyle = "#3b2a5a"; x.textAlign = "center"; x.textBaseline = "middle";
    if (typeof value === "string") { drawWord(x, value, w, h, size); return; }
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
// 文字の門（国語）：3字までは 1行、4字からは 2行（小さい「ゃ・っ」などが 行のはじめに来ないように）
const SMALL = "ゃゅょっぁぃぅぇぉャュョッァィゥェォー";
function splitWord(s) {
  const a = [...s];
  if (a.length <= 3) return [s];
  let k = Math.ceil(a.length / 2);
  if (SMALL.includes(a[k])) k++;
  if (k >= a.length) k = Math.ceil(a.length / 2) - 1;
  return [a.slice(0, k).join(""), a.slice(k).join("")];
}
// 同じ門の3つは 同じ大きさの文字にする（大きさで 答えが わからないように）
const DOOR_W = 256;
function wordSize(s) {
  const lines = splitWord(s);
  const per = Math.max(...lines.map((l) => [...l].length));
  return Math.min(lines.length > 1 ? 112 : 160, Math.floor((DOOR_W - 34) / per));
}
function drawWord(x, s, w, h, size = wordSize(s)) {
  const lines = splitWord(s);
  x.font = `bold ${size}px ${FONT}`;
  const lh = size * 1.12;
  lines.forEach((l, i) => x.fillText(l, w / 2, h / 2 + 6 + (i - (lines.length - 1) / 2) * lh));
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
    } else if (q.board != null) {
      const n = [...q.board].length;
      x.fillStyle = "#3b2a5a"; x.font = `bold ${Math.min(130, Math.floor(450 / Math.max(1, n)))}px ${FONT}`;
      x.fillText(q.board, w / 2, h / 2 + 6);
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
  const size = values.every((v) => typeof v === "string") ? Math.min(...values.map(wordSize)) : undefined;
  values.forEach((v, lane) => {
    const x = LANE_X[lane];
    const glow = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({ color: 0x3cc98a, transparent: true, opacity: 0, depthWrite: false }));
    glow.position.set(x, 1.3, 0.04);
    glow.rotation.y = Math.PI;
    const door = new THREE.Mesh(doorGeo, new THREE.MeshBasicMaterial({ map: doorTex(v, q.dots, lane, size), transparent: true, side: THREE.DoubleSide }));
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

/* ---------- 障害物（遊びのラン） ----------
   L=ひくい丸太・きりかぶ（ジャンプで こえる） / T=岩・大きな木（よける） */
const OBS_GEO = {
  log: new THREE.CylinderGeometry(0.32, 0.32, W - 0.4, 14), logEnd: new THREE.CircleGeometry(0.3, 14),
  stump: new THREE.CylinderGeometry(0.62, 0.72, 0.58, 16), stumpTop: new THREE.CircleGeometry(0.62, 16),
  rock: new THREE.DodecahedronGeometry(1.0, 1),
  trunk: new THREE.CylinderGeometry(0.5, 0.65, 2.4, 12), crown: new THREE.SphereGeometry(1.05, 14, 10),
  shadow: new THREE.CircleGeometry(1, 20),
};
const OBS_MAT = {
  log: lambert(0xb0753f), logEnd: lambert(0xe8c48c), bark: lambert(0x8a5a33), leaves: lambert(0x3f9a4f),
  rock: new THREE.MeshLambertMaterial({ color: 0xa3a8b8, flatShading: true }),
  shadow: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16, depthWrite: false }),
};
function makeObstacle(kind) {
  const g = new THREE.Group();
  const add = (geo, mat, setup) => { const m = new THREE.Mesh(geo, mat); setup(m); g.add(m); return m; };
  if (kind === "L") {
    if (Math.random() < 0.5) {
      add(OBS_GEO.log, OBS_MAT.log, (m) => { m.rotation.z = Math.PI / 2; m.position.y = 0.32; });
      for (const sx of [1, -1]) add(OBS_GEO.logEnd, OBS_MAT.logEnd, (m) => { m.position.set(sx * ((W - 0.4) / 2 + 0.001), 0.32, 0); m.rotation.y = sx * Math.PI / 2; });
    } else {
      add(OBS_GEO.stump, OBS_MAT.log, (m) => { m.position.y = 0.29; });
      add(OBS_GEO.stumpTop, OBS_MAT.logEnd, (m) => { m.rotation.x = -Math.PI / 2; m.position.y = 0.585; });
    }
    add(OBS_GEO.shadow, OBS_MAT.shadow, (m) => { m.rotation.x = -Math.PI / 2; m.position.y = 0.012; m.scale.set(1.05, 0.6, 1); });
  } else {
    if (Math.random() < 0.5) {
      add(OBS_GEO.rock, OBS_MAT.rock, (m) => { m.scale.set(1.05, 1.25, 0.9); m.position.y = 1.05; m.rotation.y = rand(0, 3); });
    } else {
      add(OBS_GEO.trunk, OBS_MAT.bark, (m) => { m.position.y = 1.2; });
      add(OBS_GEO.crown, OBS_MAT.leaves, (m) => { m.position.y = 2.9; });
    }
    add(OBS_GEO.shadow, OBS_MAT.shadow, (m) => { m.rotation.x = -Math.PI / 2; m.position.y = 0.012; m.scale.set(1.15, 0.85, 1); });
  }
  scene.add(g);
  return g;
}
/* ---------- アイテム（遊びのラン） ---------- */
const kiraGeo = new THREE.OctahedronGeometry(0.26, 0);
const kiraMat = new THREE.MeshLambertMaterial({ color: 0xffe066, emissive: 0xffb800, emissiveIntensity: 0.55 });
const starShape = new THREE.Shape();
for (let i = 0; i < 10; i++) {
  const r = i % 2 ? 0.26 : 0.6, a = (i / 10) * Math.PI * 2 + Math.PI / 2;
  if (i === 0) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r); else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
}
const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.18, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 });
starGeo.center();
const starMat = new THREE.MeshLambertMaterial({ color: 0xffd84d, emissive: 0xff9f1a, emissiveIntensity: 0.6 });
const bubbleGeo = new THREE.SphereGeometry(0.55, 20, 14);
const bubbleMat = new THREE.MeshLambertMaterial({ color: 0x9fe3ff, emissive: 0x6cc0ff, emissiveIntensity: 0.35, transparent: true, opacity: 0.55, depthWrite: false });
function makeItem(kind) {
  const g = new THREE.Group();
  if (kind === "kira") g.add(new THREE.Mesh(kiraGeo, kiraMat));
  else if (kind === "star") g.add(new THREE.Mesh(starGeo, starMat));
  else {
    g.add(new THREE.Mesh(bubbleGeo, bubbleMat));
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    shine.position.set(-0.22, 0.24, -0.4);
    g.add(shine);
  }
  scene.add(g);
  return g;
}
// のるんを つつむ シャボン（とった時に 見える）
const shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(1.15, 24, 16), new THREE.MeshLambertMaterial({ color: 0xbfeaff, emissive: 0x6cc0ff, emissiveIntensity: 0.3, transparent: true, opacity: 0.32, depthWrite: false }));
shieldMesh.visible = false;
scene.add(shieldMesh);
// ダッシュ中の キラキラの あと
const trail = [];
for (let i = 0; i < 14; i++) {
  const m = new THREE.Mesh(kiraGeo, new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0 }));
  m.scale.setScalar(0.5);
  scene.add(m);
  trail.push({ m, t: 0 });
}

function pickPattern(dist) {
  const list = PLAY_RUN.patterns.filter((p) => dist >= p.from);
  let r = Math.random() * list.reduce((s, p) => s + p.w, 0);
  for (const p of list) if ((r -= p.w) <= 0) return p.rows;
  return list[0].rows;
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
/* 遊びのラン：onTick(m) 毎フレーム / onEnd(m) ぶつかって おわった時 */
export function startPlayRun(opts) {
  stopRunView();
  const base = opts.speed || PLAY_RUN.speed, maxSpeed = opts.maxSpeed || PLAY_RUN.maxSpeed;
  R = {
    mode: "play", ...opts, base, maxSpeed, dist: 0, speed: base, obs: [], items: [], rowD: 34, last: "",
    ready: 1.0, over: false, overT: 0, bounce: 0, shake: 0,
    kira: 0, dashT: 0, shield: false, safeT: 0, trailI: 0, trailT: 0,
    nextKira: 34, nextStar: RUN_ITEMS.star.from * 2 + 40, nextBubble: RUN_ITEMS.bubble.from * 2 + 60,
  };
  shieldMesh.visible = false;
  Object.assign(me, { lane: 1, x: 0, y: 0, vy: 0, jumps: 0 });
  canvas.style.display = "block";
  clock.getDelta();
  loop();
}
export function playJump() {
  if (!R || R.mode !== "play" || R.over || me.jumps >= 1) return false;
  me.jumps = 1;
  me.vy = PLAY_RUN.jumpV;
  me.squash = -0.2;
  return true;
}
const meters = () => Math.floor(R.dist / 2);   // 2マス ＝ 1m（のるんランと同じ 見え方の 目安）
/* 障害物を はじきとばす（ダッシュ中・シャボン） */
function knockAway(o) {
  o.fly = { vy: 7, vx: (Math.random() < 0.5 ? -1 : 1) * 5, spin: rand(-8, 8) };
  o.passed = true;
}
/* 障害物の列の あいだに アイテムを おく。safe=その列で 通れるレーン */
function placeItems(fromD, toD, rowStr) {
  const free = [0, 1, 2].filter((l) => rowStr[l] === ".");
  const low = [0, 1, 2].filter((l) => rowStr[l] === "L");
  const mid = (fromD + toD) / 2;
  if (R.nextStar <= toD && free.length) {
    R.items.push({ kind: "star", lane: free[Math.floor(Math.random() * free.length)], d: mid, y: 1.0 });
    R.nextStar = toD + RUN_ITEMS.star.every * rand(0.8, 1.3);
    return;
  }
  if (R.nextBubble <= toD && free.length) {
    R.items.push({ kind: "bubble", lane: free[Math.floor(Math.random() * free.length)], d: mid, y: 1.0 });
    R.nextBubble = toD + RUN_ITEMS.bubble.every * rand(0.8, 1.3);
    return;
  }
  if (R.nextKira > toD) return;
  R.nextKira = toD + RUN_ITEMS.kira.every * rand(0.6, 1.4);
  if (low.length && Math.random() < 0.4) {
    // ひくい障害物の 上に 山なりに（ジャンプで とれる）
    const l = low[Math.floor(Math.random() * low.length)];
    [-1.6, -0.8, 0, 0.8, 1.6].forEach((dz) => R.items.push({ kind: "kira", lane: l, d: toD + dz, y: 0.55 + (1.7 - Math.abs(dz)) * 0.75 }));
  } else if (free.length) {
    // 通れる レーンに 1列（そのまま 走れば とれる）
    const l = free[Math.floor(Math.random() * free.length)];
    for (let d = toD - 6.5; d > fromD + 1.5 && d > toD - 14; d -= 1.6) R.items.push({ kind: "kira", lane: l, d, y: 0.6 });
  }
}
function playStep(dt) {
  if (R.ready > 0) R.ready -= dt;
  const moving = R.ready <= 0 && !R.over;
  if (R.dashT > 0) R.dashT -= dt;
  if (R.safeT > 0) R.safeT -= dt;
  if (moving) {
    R.speed = Math.min(R.maxSpeed, R.base + (meters() / 100) * PLAY_RUN.speedUp) * (R.dashT > 0 ? RUN_ITEMS.star.dash : 1);
    R.dist += R.speed * dt;
  }
  if (R.bounce > 0) { const b = Math.min(R.bounce, dt * 9); R.bounce -= b; R.dist -= b; }
  // 先の障害物を つくる
  while (R.rowD - R.dist < 90) {
    const gap = Math.max(PLAY_RUN.rowGapMin, PLAY_RUN.rowGap - (R.rowD / 200) * PLAY_RUN.gapShrinkPer100);
    const prevD = R.rowD;
    R.rowD += gap;
    const rows = pickPattern(R.rowD / 2);
    let v = rows[Math.floor(Math.random() * rows.length)];
    if (v === R.last && rows.length > 1) v = rows[(rows.indexOf(v) + 1) % rows.length];
    R.last = v;
    placeItems(prevD, R.rowD, v);
    [...v].forEach((ch, lane) => { if (ch !== ".") R.obs.push({ kind: ch, lane, d: R.rowD, obj: null }); });
  }
  for (const o of R.obs) {
    const z = o.d - R.dist;
    if (!o.obj && z < 85) { o.obj = makeObstacle(o.kind); o.obj.position.x = LANE_X[o.lane]; }
    if (!o.obj) continue;
    o.obj.position.z = z;
    if (o.fly) {   // はじきとばされた 障害物
      o.fly.vy -= 20 * dt;
      o.obj.position.y += o.fly.vy * dt;
      o.obj.position.x += o.fly.vx * dt;
      o.obj.rotation.z += o.fly.spin * dt;
      o.obj.visible = z > -0.9 && o.obj.position.y > -3;
      continue;
    }
    if (o !== R.hit) o.obj.visible = z > -0.9;    // 通りすぎた物は 消す（カメラの前を ふさがない）
    if (moving && !o.passed && Math.abs(z) < 0.75 && Math.abs(me.x - LANE_X[o.lane]) < 0.95 && (o.kind === "T" || me.y < 0.62)) {
      if (R.dashT > 0 || R.safeT > 0) { knockAway(o); R.shake = 0.15; if (R.onItem) R.onItem("smash"); continue; }
      if (R.shield) {
        R.shield = false; R.safeT = 0.8; shieldMesh.visible = false;
        knockAway(o); R.shake = 0.2;
        if (R.onItem) R.onItem("pop");
        continue;
      }
      R.hit = o; R.over = true; R.overT = 1.3; R.bounce = 2.2; R.shake = 0.35; me.vy = 5;
      if (R.onHit) R.onHit(meters());
    }
    if (z < -0.75) o.passed = true;
  }
  R.obs = R.obs.filter((o) => {
    if (o.obj && o.obj.position.z < -12) { scene.remove(o.obj); return false; }
    return true;
  });
  // アイテム
  const tt = clock.elapsedTime;
  for (const it of R.items) {
    const z = it.d - R.dist;
    if (!it.obj && z < 80) { it.obj = makeItem(it.kind); it.obj.position.set(LANE_X[it.lane], it.y, z); }
    if (!it.obj) continue;
    it.obj.position.z = z;
    it.obj.rotation.y = tt * (it.kind === "kira" ? 3 : 1.6);
    if (it.kind !== "kira") it.obj.position.y = it.y + Math.sin(tt * 3 + it.d) * 0.15;
    // ながれぼし中は 前の キラキラを すいよせる
    if (!it.got && it.kind === "kira" && R.dashT > 0 && z < RUN_ITEMS.star.magnet && z > -0.5) {
      it.obj.position.x = damp(it.obj.position.x, me.x, 10, dt);
      it.y = damp(it.y, me.y + 0.6, 10, dt);
      it.obj.position.y = it.y;
    }
    if (it.got) { it.obj.position.y += dt * 6; it.obj.scale.multiplyScalar(1 - dt * 5); }
    else if (!R.over && Math.abs(z) < 0.8 && Math.abs(me.x - it.obj.position.x) < 0.9 && Math.abs(me.y + 0.6 - it.y) < 0.95) {
      it.got = true;
      if (it.kind === "kira") { R.kira++; if (R.onKira) R.onKira(R.kira); }
      else if (it.kind === "star") { R.dashT = RUN_ITEMS.star.time; if (R.onItem) R.onItem("star"); }
      else { R.shield = true; shieldMesh.visible = true; if (R.onItem) R.onItem("bubble"); }
    }
  }
  R.items = R.items.filter((it) => {
    if (it.obj && (it.obj.position.z < -6 || it.obj.scale.x < 0.08)) { scene.remove(it.obj); return false; }
    return true;
  });
  // シャボン・ダッシュの 見た目
  shieldMesh.position.set(me.x, me.y + 0.6, 0);
  shieldMesh.scale.setScalar(1 + Math.sin(tt * 6) * 0.04);
  R.trailT -= dt;
  if (R.dashT > 0 && R.trailT <= 0) {
    R.trailT = 0.04;
    const p = trail[R.trailI++ % trail.length];
    p.t = 0.5; p.m.position.set(me.x + rand(-0.4, 0.4), me.y + rand(0.2, 1.1), rand(-0.3, 0.3));
  }
  for (const p of trail) {
    if (p.t > 0) { p.t -= dt; p.m.position.z -= R.speed * dt; }
    p.m.material.opacity = Math.max(0, p.t * 2);
  }
  // 景色
  roadTex.offset.y = -((R.dist * roadTex.repeat.y) / 400) % 1;
  if (moving) for (const o of deco) { o.position.z -= R.speed * dt; if (o.position.z < -10) placeDeco(o, false); }
  if (R.onTick) R.onTick(meters(), R.speed);
  if (R.over) {
    R.overT -= dt;
    if (R.overT <= 0) { const end = R.onEnd, m = meters(), k = R.kira; stopRunView(); end(m, k); return false; }
  }
  return true;
}

export function stopRunView() {
  if (!R) return;
  if (R.mode === "play") {
    for (const o of R.obs) if (o.obj) scene.remove(o.obj);
    for (const it of R.items) if (it.obj) scene.remove(it.obj);
    shieldMesh.visible = false;
    for (const p of trail) { p.t = 0; p.m.material.opacity = 0; }
    R = null; canvas.style.display = "none"; return;
  }
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
export function runResize() { onResize(); }
onResize();

const clock = new THREE.Clock();
let raf = 0;
function loop() {
  cancelAnimationFrame(raf);
  if (!R) return;
  raf = requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (R.mode === "play") { if (playStep(dt)) moveNorun(dt, true); return; }
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

  moveNorun(dt, false);
}

/* のるん：レーン移動・ぷにぷに跳ね・ゆらゆら（play=遊びのラン：ジャンプあり・重力つよめ） */
function moveNorun(dt, play) {
  const px = me.x;
  me.x = damp(me.x, LANE_X[me.lane], 12, dt);
  const vx = (me.x - px) / Math.max(dt, 1e-4);
  me.vy -= (play ? PLAY_RUN.gravity : 20) * dt;
  me.y += me.vy * dt;
  if (me.y <= 0) {
    if (me.vy < -2) me.squash = Math.min(0.3, -me.vy * 0.03);
    me.y = 0;
    me.jumps = 0;
    me.vy = play && R.over ? 0 : play ? PLAY_RUN.hopV : 3.4;
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

  // カメラ：後ろから（ぶつかった時は 少し ゆれる）
  let sx = 0;
  if (play && R.shake > 0) { R.shake -= dt; sx = Math.sin(R.shake * 70) * R.shake * 0.5; }
  camera.position.set(me.x * 0.5 + sx, 2.7, -5.2);
  // 遊びの ランを よこ長の 画面で：のるんが まんなかの ジャンプボタンに かくれないように 少し上に うつす
  camera.lookAt(me.x * 0.3, play && camera.aspect > 1 ? (camera.aspect > 1.8 ? -2.8 : -1.9) : 1.1, 14);
  renderer.render(scene, camera);
}
