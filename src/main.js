import * as THREE from "three";
import { GLTFLoader } from "three/addons/GLTFLoader.js";
import {
  DIFFICULTIES, FORMS, PATTERNS, STAGES,
  LANE_W, NORUN_SCALE, JUMP_V, HOP_V, GRAVITY,
} from "./config.js";
import * as store from "./storage.js";
import { makeQuestion, makeChoices, dots, OP_WORD } from "./questions.js";

/* =========================================================
   共通
   ========================================================= */
const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const DEBUG = location.search.includes("debug");

// カメラは -Z 側から +Z（進行方向）を見る。画面の左 = +X
const LANE_X = [LANE_W, 0, -LANE_W];   // 0=左 1=まんなか 2=右（画面から見て）
const SPAWN_AHEAD = 85;                // これより先のものは まだ作らない
const lambert = (c) => new THREE.MeshLambertMaterial({ color: c });

function disposeObj(o) {
  o.traverse((c) => {
    if (c.geometry && !c.geometry.userData.shared) c.geometry.dispose();
    const ms = c.material ? (Array.isArray(c.material) ? c.material : [c.material]) : [];
    for (const m of ms) {
      if (m.userData.shared) continue;
      if (m.map) m.map.dispose();
      m.dispose();
    }
  });
}

/* =========================================================
   描画の準備
   ========================================================= */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8e4ff);
scene.fog = new THREE.Fog(0xa8e4ff, 35, 95);

const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 200);
// 光は控えめ（のるん本体は陰影なしの材質なので、光の影響を受けるのは背景だけ）
scene.add(new THREE.HemisphereLight(0xffffff, 0x9ccf88, 1.5));
const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(-4, 10, -6);
scene.add(sun);

function onResize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < 1 ? 72 : 58;
  camera.updateProjectionMatrix();
}
addEventListener("resize", onResize);
onResize();

/* =========================================================
   背景（はらっぱ・3レーンの道・木・花・雲）
   ========================================================= */
const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 400), lambert(0x9bd77a));
ground.rotation.x = -Math.PI / 2;
ground.position.set(0, -0.02, 120);
scene.add(ground);
const road = new THREE.Mesh(new THREE.PlaneGeometry(LANE_W * 3 + 0.6, 400), lambert(0xf2deb0));
road.rotation.x = -Math.PI / 2;
road.position.set(0, -0.01, 120);
scene.add(road);
for (const x of [1.5, -1.5]) {   // 道のふち
  const e = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 400), lambert(0xffffff));
  e.position.set(x * LANE_W + Math.sign(x) * 0.3, 0.04, 120);
  scene.add(e);
}
// レーンの区切り（流れる点線）
const dashGeo = new THREE.BoxGeometry(0.12, 0.02, 1.4);
dashGeo.userData.shared = true;
const dashMat = lambert(0xe7c98a);
const dashes = [];
for (let i = 0; i < 36; i++) {
  for (const x of [LANE_W / 2, -LANE_W / 2]) {
    const d = new THREE.Mesh(dashGeo, dashMat);
    d.position.set(x, 0.005, -4 + i * 3.5);
    scene.add(d);
    dashes.push(d);
  }
}
const DASH_SPAN = 36 * 3.5;

function makeTree() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 1.3, 7), lambert(0x9a6a3d));
  trunk.position.y = 0.65;
  const c = [0x5fbf5a, 0x77c96a, 0x4fae63][randInt(0, 2)];
  const top = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 10), lambert(c));
  top.position.y = 2.1;
  top.scale.y = 1.15;
  g.add(trunk, top);
  return g;
}
function makeFlower() {
  const g = new THREE.Group();
  const c = [0xff8fbf, 0xffe066, 0xffffff, 0xb59cff][randInt(0, 3)];
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), lambert(c));
  head.position.y = 0.25;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 5), lambert(0x4a9a4a));
  stem.position.y = 0.12;
  g.add(head, stem);
  return g;
}
function makeCloud() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(rand(1, 1.5), 12, 10), lambert(0xffffff));
    s.position.set(i * 1.3 - 1.3, rand(0, 0.3), 0);
    g.add(s);
  }
  return g;
}
const decor = [];
function placeDecor(o, init) {
  const side = Math.random() < 0.5 ? -1 : 1;
  o.position.x = side * rand(LANE_W * 1.5 + 2.2, LANE_W * 1.5 + 14);
  o.position.z = init ? rand(-10, 110) : rand(110, 125);
  o.scale.setScalar(rand(0.8, 1.3));
}
for (let i = 0; i < 26; i++) { const t = makeTree(); placeDecor(t, true); scene.add(t); decor.push(t); }
for (let i = 0; i < 40; i++) { const f = makeFlower(); placeDecor(f, true); f.position.x *= 0.7; scene.add(f); decor.push(f); }
const clouds = [];
for (let i = 0; i < 9; i++) {
  const c = makeCloud();
  c.position.set(rand(-35, 35), rand(9, 14), rand(10, 110));
  scene.add(c);
  clouds.push(c);
}

/* =========================================================
   のるん
   ========================================================= */
const norun = {
  root: new THREE.Group(),   // 左右の位置・傾き
  turn: new THREE.Group(),   // 向き（プレイ中は後ろ姿、メニューでは正面）
  model: null, body: null, hat: null, starL: null, starR: null, eyeL: null, eyeR: null, mouth: null,
};
norun.root.add(norun.turn);
scene.add(norun.root);
// 足もとの影
const shadow = new THREE.Mesh(
  new THREE.CircleGeometry(0.85, 24),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false })
);
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = 0.01;
scene.add(shadow);

async function loadNorun() {
  const gltf = await new GLTFLoader().loadAsync("assets/models/norun-v2.glb");
  const m = gltf.scene;
  m.scale.setScalar(NORUN_SCALE);
  const get = (n) => m.getObjectByName(n);
  Object.assign(norun, {
    model: m, body: get("Body"), hat: get("Hat"),
    starL: get("Star_L"), starR: get("Star_R"), eyeL: get("Eye_L"), eyeR: get("Eye_R"), mouth: get("Mouth"),
  });
  for (const k of ["hat", "starL", "starR", "eyeL", "eyeR", "mouth"]) {
    const o = norun[k];
    o.userData.basePos = o.position.clone();
    o.userData.baseQuat = o.quaternion.clone();
  }
  norun.turn.add(m);
}

/* のるんの見た目の状態 */
const look = {
  squash: 0,        // + でつぶれ、- でのび
  surprise: 0,      // 0〜1 びっくり顔
  hatPop: 0,        // 0〜1 帽子が浮く
  blinkT: 2, blink: 0,
  star: { a: 0, v: 0, b: 0, w: 0 },   // 星の揺れ（ばね）
  spin: 0,
};

function updateNorunLook(dt, t, ax, ay) {
  if (!norun.model) return;
  // ぷにぷに：つぶれ・のび（体ごと。帽子も一緒に）
  const s = look.squash;
  norun.body.scale.set(1 + s * 0.8, 1 - s, 1 + s * 0.8);

  // まばたき
  look.blinkT -= dt;
  if (look.blinkT <= 0) { look.blink = 0.14; look.blinkT = rand(2, 4.5); }
  look.blink = Math.max(0, look.blink - dt);
  const blinkK = look.blink > 0 && look.surprise < 0.1 ? 0.15 : 1;

  // 目と口（ノード原点が中心なので、スケールでそのまま拡大できる）
  // びっくり：目は縦に大きく見開く（横長の目なので、縦に伸ばすと丸い目になる）、口も縦に開く
  const sp = look.surprise;
  norun.eyeL.scale.set(1 + sp * 0.12, (1 + sp * 1.3) * blinkK, 1 + sp * 0.3);
  norun.eyeR.scale.set(1 + sp * 0.12, (1 + sp * 1.3) * blinkK, 1 + sp * 0.3);
  norun.mouth.scale.set(1 - sp * 0.15, 1 + sp * 0.9, 1);

  // 帽子ポップ
  const hp = look.hatPop;
  const hb = norun.hat.userData;
  norun.hat.position.copy(hb.basePos);
  norun.hat.position.y += hp * 0.95 + (hp > 0 ? Math.sin(t * 6) * 0.04 * hp : 0);
  norun.hat.rotation.set(0, 0, hp > 0 ? Math.sin(t * 5) * 0.15 * hp : 0);
  norun.hat.quaternion.premultiply(hb.baseQuat);

  // 星の揺れ：横の加速・縦の加速で振られて、ばねで戻る
  const st = look.star;
  st.v += (-st.a * 70 - st.v * 5 + ax * 0.06) * dt;
  st.a += st.v * dt;
  st.w += (-st.b * 70 - st.w * 5 - ay * 0.03) * dt;
  st.b += st.w * dt;
  const idle = Math.sin(t * 2.2) * 0.06;
  for (const [star, sign] of [[norun.starL, 1], [norun.starR, -1]]) {
    star.quaternion.copy(star.userData.baseQuat);
    star.rotateZ(clamp(st.a, -0.9, 0.9) + idle * sign);
    star.rotateX(clamp(st.b, -0.8, 0.8));
  }
}

/* =========================================================
   コースの部品
   ========================================================= */
const shared = (geo) => { geo.userData.shared = true; return geo; };
const sharedMat = (m) => { m.userData.shared = true; return m; };
const GEO = {
  log: shared(new THREE.CylinderGeometry(0.32, 0.32, LANE_W - 0.4, 14)),
  logEnd: shared(new THREE.CircleGeometry(0.3, 14)),
  rock: shared(new THREE.DodecahedronGeometry(1.0, 1)),
  post: shared(new THREE.CylinderGeometry(0.1, 0.1, 1.6, 8)),
  bar: shared(new THREE.CylinderGeometry(0.16, 0.16, LANE_W - 0.2, 10)),
  picket: shared(new THREE.BoxGeometry(0.22, 1.9, 0.12)),
  rail: shared(new THREE.BoxGeometry(LANE_W - 0.3, 0.16, 0.1)),
};
const MAT = {
  log: sharedMat(lambert(0xb0753f)),
  logEnd: sharedMat(lambert(0xe8c48c)),
  rock: sharedMat(new THREE.MeshLambertMaterial({ color: 0xa3a8b8, flatShading: true })),
  post: sharedMat(lambert(0xffffff)),
  bar: sharedMat(lambert(0xff7eb6)),
  fence: sharedMat(lambert(0xd9a066)),
};

function makeObstacle(kind) {
  const g = new THREE.Group();
  if (kind === "L") {          // ひくい丸太：ジャンプでこえる
    const log = new THREE.Mesh(GEO.log, MAT.log);
    log.rotation.z = Math.PI / 2;
    log.position.y = 0.32;
    g.add(log);
    for (const sx of [1, -1]) {
      const end = new THREE.Mesh(GEO.logEnd, MAT.logEnd);
      end.position.set(sx * (LANE_W - 0.4) / 2 + sx * 0.001, 0.32, 0);
      end.rotation.y = sx * Math.PI / 2;
      g.add(end);
    }
  } else if (kind === "T") {   // 大きな岩：よける
    const r = new THREE.Mesh(GEO.rock, MAT.rock);
    r.scale.set(1.05, 1.25, 0.9);
    r.position.y = 1.05;
    r.rotation.y = rand(0, 3);
    g.add(r);
  } else if (kind === "B") {   // ぼう：パンでくぐる
    for (const sx of [1, -1]) {
      const p = new THREE.Mesh(GEO.post, MAT.post);
      p.position.set(sx * (LANE_W / 2 - 0.15), 0.8, 0);
      g.add(p);
    }
    const bar = new THREE.Mesh(GEO.bar, MAT.bar);
    bar.rotation.z = Math.PI / 2;
    bar.position.y = 1.0;
    g.add(bar);
  } else if (kind === "F") {   // 木のさく：おばけはすりぬけ
    for (let i = 0; i < 5; i++) {
      const p = new THREE.Mesh(GEO.picket, MAT.fence);
      p.position.set((i - 2) * 0.48, 0.95, 0);
      g.add(p);
    }
    for (const y of [0.6, 1.4]) {
      const r = new THREE.Mesh(GEO.rail, MAT.fence);
      r.position.set(0, y, -0.1);
      g.add(r);
    }
  }
  return g;
}

/* 文字・ドットを描いたテクスチャ */
function canvasTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const FONT = '"Hiragino Maru Gothic ProN","Rounded Mplus 1c","Noto Sans JP",sans-serif';
const DOOR_COLORS = [["#fff3c4", "#ffd27a"], ["#e3f6ff", "#9fd8ff"], ["#ffe3f0", "#ffb3d4"]];

function doorTexture(value, withDots, colorIdx) {
  return canvasTex(256, 360, (x, w, h) => {
    const [c1, c2] = DOOR_COLORS[colorIdx % 3];
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    x.fillStyle = g;
    x.beginPath(); x.roundRect(6, 6, w - 12, h - 12, 28); x.fill();
    x.lineWidth = 10; x.strokeStyle = "#8a5fbf"; x.stroke();
    x.fillStyle = "#3b2a5a";
    x.textAlign = "center"; x.textBaseline = "middle";
    x.font = `bold ${withDots ? 130 : 150}px ${FONT}`;
    x.fillText(String(value), w / 2, withDots ? 120 : h / 2 + 6);
    if (withDots) {   // かんたん：答えの数を ● でも見せる（5こずつ2だん）
      x.fillStyle = "#ff5a8c";
      for (let i = 0; i < value; i++) {
        const row = Math.floor(i / 5), col = i % 5;
        x.beginPath();
        x.arc(48 + col * 40, 250 + row * 44, 15, 0, Math.PI * 2);
        x.fill();
      }
    }
  });
}
const wallTex = canvasTex(256, 360, (x, w, h) => {
  x.fillStyle = "#c98bb9"; x.fillRect(0, 0, w, h);
  x.strokeStyle = "#a96a9a"; x.lineWidth = 6;
  for (let r = 0; r < 9; r++) {
    const y = r * 40;
    x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke();
    for (let cI = 0; cI < 4; cI++) {
      const cx = cI * 80 + (r % 2) * 40;
      x.beginPath(); x.moveTo(cx, y); x.lineTo(cx, y + 40); x.stroke();
    }
  }
  x.strokeStyle = "#ffffff"; x.lineWidth = 26; x.lineCap = "round";
  x.beginPath(); x.moveTo(70, 120); x.lineTo(186, 240); x.moveTo(186, 120); x.lineTo(70, 240); x.stroke();
});
wallTex.userData = {};

function makeGate(item) {
  const g = new THREE.Group();
  const frame = lambert(0x8a5fbf);
  const H = 2.9;
  for (let i = 0; i < 4; i++) {
    const x = (1.5 - i) * LANE_W;
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.28, H, 0.28), frame);
    p.position.set(x, H / 2, 0);
    g.add(p);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(LANE_W * 3 + 0.5, 0.42, 0.34), frame);
  beam.position.y = H;
  g.add(beam);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 0.9),
    new THREE.MeshBasicMaterial({ map: canvasTex(256, 160, (x, w, h) => {
      x.fillStyle = "#ffe066"; x.beginPath(); x.roundRect(4, 4, w - 8, h - 8, 30); x.fill();
      x.fillStyle = "#3b2a5a"; x.font = `bold 120px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle";
      x.fillText("？", w / 2, h / 2 + 6);
    }) })
  );
  sign.position.set(0, H + 0.62, -0.18);
  sign.rotation.y = Math.PI;      // カメラ（-Z側）に向ける
  g.add(sign);
  item.doors = [];
  for (let lane = 0; lane < 3; lane++) {
    const ci = item.laneChoice[lane];
    const x = LANE_X[lane];
    if (ci < 0) {   // 通れない壁
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(LANE_W - 0.3, H - 0.2, 0.3),
        [lambert(0xc98bb9), lambert(0xc98bb9), lambert(0xc98bb9), lambert(0xc98bb9),
          new THREE.MeshLambertMaterial({ map: wallTex }), new THREE.MeshLambertMaterial({ map: wallTex })]
      );
      wall.material[4].userData.shared = wall.material[5].userData.shared = false;
      wall.position.set(x, (H - 0.2) / 2, 0);
      g.add(wall);
      item.doors.push(null);
    } else {
      const door = new THREE.Mesh(
        new THREE.PlaneGeometry(LANE_W - 0.4, 2.5),
        new THREE.MeshBasicMaterial({
          map: doorTexture(item.choices.values[ci], item.q.dots, lane),
          transparent: true, side: THREE.DoubleSide,
        })
      );
      door.position.set(x, 1.3, 0);
      door.rotation.y = Math.PI;
      g.add(door);
      item.doors.push(door);
    }
  }
  return g;
}

function makeGoal() {
  const g = new THREE.Group();
  const colors = [0xff7eb6, 0xffb347, 0xffe066, 0x8be08b, 0x7ec8ff, 0xb59cff];
  colors.forEach((c, i) => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(LANE_W * 1.75 - i * 0.22, 0.12, 8, 40, Math.PI), lambert(c));
    g.add(r);
  });
  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 1.0),
    new THREE.MeshBasicMaterial({ map: canvasTex(512, 140, (x, w, h) => {
      for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) {
        x.fillStyle = (i + j) % 2 ? "#3b2a5a" : "#ffffff";
        x.fillRect(i * 32, j * 35, 32, 35);
      }
      x.fillStyle = "rgba(255,255,255,.9)"; x.beginPath(); x.roundRect(90, 22, 332, 96, 40); x.fill();
      x.fillStyle = "#ff5a8c"; x.font = `bold 78px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle";
      x.fillText("ゴール", w / 2, h / 2 + 4);
    }) })
  );
  banner.position.y = 2.9;
  banner.rotation.y = Math.PI;
  g.add(banner);
  return g;
}

/* =========================================================
   コースを組み立てる（障害物区間 → 算数ゲート をくり返して ゴール）
   ========================================================= */
function pickWeighted(weights) {
  const entries = Object.entries(weights);
  let r = Math.random() * entries.reduce((s, [, w]) => s + w, 0);
  for (const [k, w] of entries) { if ((r -= w) <= 0) return k; }
  return entries[0][0];
}

function buildCourse(stage, difficulty) {
  const items = [];
  let d = 28;
  let lastVariant = "";
  stage.sections.forEach((rows) => {
    for (let r = 0; r < rows; r++) {
      d += stage.rowGap;
      const variants = PATTERNS[pickWeighted(stage.patterns)];
      let v = variants[randInt(0, variants.length - 1)];
      if (v === lastVariant && variants.length > 1) v = variants[(variants.indexOf(v) + 1) % variants.length];
      lastVariant = v;
      [...v].forEach((c, lane) => { if (c !== ".") items.push({ type: "obs", kind: c, lane, d }); });
    }
    d += stage.rowGap + 8;
    // 算数ゲート
    const q = makeQuestion(difficulty);
    const choices = makeChoices(q, stage.choices);
    const laneChoice = [-1, -1, -1];
    if (stage.choices >= 3) {
      laneChoice.splice(0, 3, 0, 1, 2);
    } else {
      const wall = randInt(0, 2);   // 1レーンは通れない壁
      let k = 0;
      for (let lane = 0; lane < 3; lane++) if (lane !== wall) laneChoice[lane] = k++;
    }
    items.push({ type: "gate", d, q, choices, laneChoice });
    d += 18;
  });
  const goalD = d + 26;
  items.push({ type: "goal", d: goalD });
  return { items, goalD };
}

/* =========================================================
   ゲームの状態
   ========================================================= */
let player = null;          // いま遊んでいる人のデータ
let state = "loading";      // loading | menu | ready | play | fail | clear
let run = null;             // 1回のランの情報

const me = { lane: 1, x: 0, y: 0, vy: 0, jumps: 0, rollT: 0, prevVx: 0, vx: 0, prevVy: 0 };

function formOf(id) { return FORMS.find((f) => f.id === id) || FORMS[0]; }

function startRun(stage, formId) {
  clearRun();
  const form = formOf(formId);
  const course = buildCourse(stage, player.difficulty);
  run = {
    bounce: 0,
    stage, form, course, dist: 0, next: 0, active: [], t: 0, endT: 0, reason: null, failGate: null,
    speed: stage.speed * (form.ability === "fast" ? 1.2 : 1),
    laneK: form.ability === "fast" ? 22 : 14,
  };
  Object.assign(me, { lane: 1, x: 0, y: 0, vy: 0, jumps: 0, rollT: 0, vx: 0 });
  Object.assign(look, { surprise: 0, hatPop: 0, spin: 0 });
  $("formBadge").textContent = form.art;
  $("btnRoll").classList.toggle("hidden", form.ability !== "roll");
  $("question").classList.add("off");
  showScreen(null);
  $("hud").classList.remove("hidden");
  updateProgress();
  state = "ready";
  run.readyT = 1.6;
  toast("よーい…", 900);
  setTimeout(() => { if (state === "ready") toast("どん！", 600); }, 900);
  bgmPlay();
}

function clearRun() {
  if (!run) return;
  for (const it of run.active) { scene.remove(it.obj); disposeObj(it.obj); }
  for (const p of particles) { scene.remove(p.m); p.m.material.dispose(); }
  particles.length = 0;
  run = null;
}

function spawnAhead() {
  const items = run.course.items;
  while (run.next < items.length && items[run.next].d - run.dist < SPAWN_AHEAD) {
    const it = items[run.next++];
    if (it.type === "obs") { it.obj = makeObstacle(it.kind); it.obj.position.x = LANE_X[it.lane]; }
    else if (it.type === "gate") it.obj = makeGate(it);
    else it.obj = makeGoal();
    it.obj.position.z = it.d - run.dist;
    scene.add(it.obj);
    run.active.push(it);
  }
}

/* のるんが今いるレーン（移動中は近い方） */
const laneNow = () => LANE_X.reduce((best, x, i) => (Math.abs(me.x - x) < Math.abs(me.x - LANE_X[best]) ? i : best), 0);
// 移動中は2レーンにまたがる
const touchesLane = (lane) => Math.abs(me.x - LANE_X[lane]) < 0.95;

function hitsObstacle(it) {
  const ab = run.form.ability;
  if (it.kind === "L") return me.y < 0.62;
  if (it.kind === "T") return true;
  if (it.kind === "B") return !(me.rollT > 0 && me.y < 0.2) && me.y < 1.4;
  if (it.kind === "F") return ab !== "phase";
  return false;
}

function updateRun(dt) {
  run.t += dt;
  if (state === "ready") {
    run.readyT -= dt;
    if (run.readyT <= 0) state = "play";
  }
  const moving = state === "play";
  const speed = moving ? run.speed : 0;
  run.dist += speed * dt;
  if (run.bounce > 0) {
    const b = Math.min(run.bounce, dt * 9);
    run.bounce -= b;
    run.dist -= b;
  }
  spawnAhead();

  // 物の位置
  for (const it of run.active) it.obj.position.z = it.d - run.dist;

  if (moving) {
    // 当たり判定
    for (const it of run.active) {
      const z = it.d - run.dist;
      if (it.type === "obs" && !it.passed) {
        if (Math.abs(z) < 0.75 && touchesLane(it.lane) && hitsObstacle(it)) { fail("hit"); break; }
        if (z < -0.75) it.passed = true;
      } else if (it.type === "gate" && !it.passed && z <= 0.2) {
        it.passed = true;
        passGate(it);
        if (state !== "play") break;
      } else if (it.type === "goal" && !it.passed && z <= 0) {
        it.passed = true;
        clearStage();
      }
    }
    // 出題の表示：ゲートが見えてきたら
    const g = run.active.find((it) => it.type === "gate" && !it.passed);
    if (g && g.d - run.dist < 62) showQuestion(g.q); else hideQuestion();
  }

  // 後ろに流れたものを消す
  run.active = run.active.filter((it) => {
    if (it.obj.position.z < -12) { scene.remove(it.obj); disposeObj(it.obj); return false; }
    return true;
  });
  // 通った正解の扉は ふわっと消す
  for (const it of run.active) {
    if (it.type === "gate" && it.passed && it.ok) {
      for (const dr of it.doors) if (dr) dr.material.opacity = Math.max(0, dr.material.opacity - dt * 3);
    }
  }
  updateProgress();
}

function passGate(g) {
  const lane = laneNow();
  const ci = g.laneChoice[lane];
  if (ci < 0) { fail("wall", g); return; }
  if (ci === g.choices.correct) {
    g.ok = true;
    sparkle(0xffe066);
    toast("せいかい！ ✨", 700);
    hideQuestion();
  } else {
    fail("wrong", g);
  }
}

function fail(reason, gate) {
  state = "fail";
  run.reason = reason;
  run.failGate = gate || null;
  run.endT = 0;
  shakeT = 0.4;
  run.bounce = 2.2;      // ぶつかって 少し後ろへ はね返る（のるんと障害物が重ならないように）
  me.vy = 5;
  hideQuestion();
  toast(reason === "wrong" ? "あっ！ ちがう とびら！" : "ぶつかった！", 1200);
}

function clearStage() {
  state = "clear";
  run.endT = 0;
  hideQuestion();
  toast("ゴール！ 🎉", 1400);
  for (let i = 0; i < 4; i++) setTimeout(() => sparkle([0xff7eb6, 0xffe066, 0x7ec8ff, 0x8be08b][i]), i * 180);
  // 記録とごほうび（はじめてのクリアのみ）
  const first = !player.cleared.includes(run.stage.id);
  run.reward = null;
  if (first) {
    player.cleared.push(run.stage.id);
    const rw = run.stage.reward;
    if (rw && rw.type === "form" && !player.forms.includes(rw.id)) {
      player.forms.push(rw.id);
      run.reward = rw;
    }
    store.savePlayer(player);
  }
}

function showResult() {
  const ok = state === "clear";
  $("hud").classList.add("hidden");
  const nextStage = STAGES.find((s) => s.id === run.stage.id + 1);
  if (ok) {
    $("resultIcon").textContent = "🎉";
    $("resultTitle").textContent = "ステージクリア！";
    let t = `「${run.stage.name}」を クリアしたよ！`;
    if (run.reward) {
      const f = formOf(run.reward.id);
      t += `\n\nあたらしい へんしん\n${f.art}「${f.name}」を てにいれた！\nずかんに とうろくしたよ`;
      $("resultIcon").textContent = f.art;
    }
    $("resultText").textContent = t;
  } else {
    $("resultIcon").textContent = "💫";
    $("resultTitle").textContent = "ざんねん！";
    let t = "ぶつかっちゃった！\nもういちど チャレンジしよう";
    if (run.reason === "wrong" || run.reason === "wall") {
      const q = run.failGate.q;
      const ans = q.ans;
      t = run.reason === "wall" ? "とびらの ない かべに ぶつかった！\n" : "";
      t += q.dots
        ? `${dots(q.a)} ${OP_WORD[q.op]} ${dots(q.b)}\nこたえは ${dots(ans) || "0こ"}（${ans}）だったよ`
        : `${q.a} ${q.op} ${q.b} の こたえは ${ans} だったよ`;
    }
    $("resultText").textContent = t;
  }
  $("btnNext").classList.toggle("hidden", !(ok && nextStage && nextStage.ready));
  showScreen("scResult");
}

/* =========================================================
   エフェクト・表示
   ========================================================= */
const particles = [];
const pGeo = shared(new THREE.OctahedronGeometry(0.09));
function sparkle(color) {
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({ color }));
    m.position.set(me.x, 1.2 + me.y, 0.3);
    scene.add(m);
    particles.push({ m, v: new THREE.Vector3(rand(-3, 3), rand(3, 7), rand(-1, 3)), life: 0.9 });
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.v.y -= 12 * dt;
    p.m.position.addScaledVector(p.v, dt);
    p.m.rotation.x += dt * 6;
    if (p.life <= 0) { scene.remove(p.m); p.m.material.dispose(); particles.splice(i, 1); }
  }
}

let shownQ = null;
function showQuestion(q) {
  if (shownQ === q) return;
  shownQ = q;
  const el = $("question");
  if (q.dots) {
    el.innerHTML = `<span class="dot">${dots(q.a)}</span><span class="op">${OP_WORD[q.op]}</span><span class="dot">${dots(q.b)}</span>`;
  } else {
    el.textContent = `${q.a} ${q.op} ${q.b} = ?`;
  }
  el.classList.remove("off");
}
function hideQuestion() {
  shownQ = null;
  $("question").classList.add("off");
}

function updateProgress() {
  if (!run) return;
  const p = clamp(run.dist / run.course.goalD, 0, 1);
  $("progressFill").style.width = `${p * 100}%`;
  $("progressIcon").style.left = `${p * 100}%`;
}

let toastTimer;
function toast(msg, ms = 1000) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), ms);
}

/* BGM（assets/bgm.mp3 を置けば鳴る。無ければボタンを隠す） */
const bgm = new Audio("assets/bgm.mp3");
bgm.loop = true;
bgm.volume = 0.4;
let bgmAvailable = true;
bgm.addEventListener("error", () => { bgmAvailable = false; $("btnBgm").classList.add("hidden"); });
function bgmPlay() {
  if (!bgmAvailable || !player) return;
  $("btnBgm").textContent = player.bgm ? "♪" : "♪×";
  if (player.bgm) bgm.play().catch(() => {}); else bgm.pause();
}
$("btnBgm").onclick = () => { player.bgm = !player.bgm; store.savePlayer(player); bgmPlay(); };

/* =========================================================
   入力（スワイプ・ボタン・キー）
   ========================================================= */
function moveLane(dir) {
  if (state !== "play" && state !== "ready") return;
  me.lane = clamp(me.lane + dir, 0, 2);
}
function jump() {
  if (state !== "play" && state !== "ready") return;
  const max = run.form.ability === "float" ? 2 : 1;
  if (me.jumps >= max) return;
  me.jumps++;
  me.rollT = 0;
  me.vy = JUMP_V * (me.jumps === 2 ? 0.85 : 1);
  look.squash = -0.2;
}
function roll() {
  if (state !== "play" || run.form.ability !== "roll") return;
  me.rollT = 0.9;
  if (me.y > 0.1) me.vy = -12;   // 空中なら すぐ着地
}
$("btnL").onclick = () => moveLane(-1);
$("btnR").onclick = () => moveLane(1);
$("btnJump").onclick = jump;
$("btnRoll").onclick = roll;
let swipe = null;
renderer.domElement.addEventListener("pointerdown", (e) => { swipe = { x: e.clientX, y: e.clientY }; });
addEventListener("pointerup", (e) => {
  if (!swipe) return;
  const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
  swipe = null;
  if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) moveLane(dx < 0 ? -1 : 1);
  else if (dy < -30) jump();
  else if (dy > 30) roll();
  else jump();   // タップ
});
addEventListener("keydown", (e) => {
  if (e.repeat) return;
  if (e.code === "ArrowLeft" || e.code === "KeyA") moveLane(-1);
  if (e.code === "ArrowRight" || e.code === "KeyD") moveLane(1);
  if (e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Space") jump();
  if (e.code === "ArrowDown" || e.code === "KeyS") roll();
});

/* =========================================================
   画面（メニュー）
   ========================================================= */
const SCREENS = ["scTitle", "scNewPlayer", "scConfirm", "scHome", "scStages", "scForms", "scResult"];
function showScreen(id) {
  for (const s of SCREENS) $(s).classList.toggle("hidden", s !== id);
}
function toMenu(screenId) {
  clearRun();
  state = "menu";
  $("hud").classList.add("hidden");
  hideQuestion();
  Object.assign(me, { lane: 1, x: 0, y: 0, vy: 0, jumps: 0, rollT: 0 });
  Object.assign(look, { surprise: 0, hatPop: 0, spin: 0 });
  showScreen(screenId);
}

// ---- プレイヤー選択 ----
let delMode = false;
function renderTitle() {
  const list = $("playerList");
  list.innerHTML = "";
  const names = store.listPlayers();
  if (names.length === 0) {
    const p = document.createElement("p");
    p.className = "note";
    p.textContent = "まずは なまえを つくってね";
    list.append(p);
  }
  for (const name of names) {
    const row = document.createElement("div");
    row.className = "player";
    const b = document.createElement("button");
    b.className = "big";
    b.textContent = `🟣 ${name}`;
    b.onclick = () => selectPlayer(name);
    row.append(b);
    if (delMode) {
      const d = document.createElement("button");
      d.className = "small danger";
      d.textContent = "けす";
      d.onclick = () => askDelete(name);
      row.append(d);
    }
    list.append(row);
  }
  $("btnDelMode").textContent = delMode ? "けすのを やめる" : "なまえを けす";
  $("btnDelMode").classList.toggle("hidden", names.length === 0);
}
$("btnDelMode").onclick = () => { delMode = !delMode; renderTitle(); };
$("btnNewPlayer").onclick = () => {
  $("nameInput").value = "";
  $("nameMsg").textContent = "";
  showScreen("scNewPlayer");
  setTimeout(() => $("nameInput").focus(), 50);
};
$("btnNameCancel").onclick = () => { renderTitle(); showScreen("scTitle"); };
$("btnNameOk").onclick = () => {
  const r = store.createPlayer($("nameInput").value);
  if (!r.ok) {
    $("nameMsg").textContent = r.reason === "exists" ? "その なまえは もう あるよ" : "なまえを いれてね";
    return;
  }
  selectPlayer(r.name);
};
$("nameInput").addEventListener("keydown", (e) => { if (e.key === "Enter") $("btnNameOk").click(); });
let delTarget = null;
function askDelete(name) {
  delTarget = name;
  $("confirmText").textContent = `「${name}」の データを けす？`;
  showScreen("scConfirm");
}
$("btnConfirmYes").onclick = () => { store.deletePlayer(delTarget); delMode = false; renderTitle(); showScreen("scTitle"); };
$("btnConfirmNo").onclick = () => { renderTitle(); showScreen("scTitle"); };

function selectPlayer(name) {
  player = store.loadPlayer(name);
  store.setLast(name);
  delMode = false;
  renderHome();
  toMenu("scHome");
}

// ---- ホーム ----
function renderHome() {
  $("homeHello").textContent = `${player.name} の ぼうけん`;
  const row = $("diffRow");
  row.innerHTML = "";
  for (const d of DIFFICULTIES) {
    const b = document.createElement("button");
    b.className = "chip" + (player.difficulty === d.id ? " on" : "");
    b.textContent = d.name;
    b.onclick = () => { player.difficulty = d.id; store.savePlayer(player); renderHome(); };
    row.append(b);
  }
  $("diffNote").textContent = (DIFFICULTIES.find((d) => d.id === player.difficulty) || DIFFICULTIES[0]).note;
}
$("btnRun").onclick = () => { renderStages(); showScreen("scStages"); };
$("btnZukan").onclick = () => openForms(null);
$("btnSwitch").onclick = () => { player = null; renderTitle(); toMenu("scTitle"); };

// ---- ステージ ----
const isUnlocked = (s) => s.id === 1 || player.cleared.includes(s.id - 1);
function renderStages() {
  const list = $("stageList");
  list.innerHTML = "";
  for (const s of STAGES) {
    const b = document.createElement("button");
    b.className = "stage";
    const cleared = player.cleared.includes(s.id);
    let sub = cleared ? "⭐ クリア！" : "";
    if (!s.ready) sub = "つくりちゅう";
    else if (!isUnlocked(s)) sub = `🔒 ステージ${s.id - 1}を クリアすると あくよ`;
    b.innerHTML = `<span class="num">${s.id}</span><span class="t">${s.name}<br><span class="s">${sub}</span></span>`;
    b.disabled = !s.ready || !isUnlocked(s);
    b.onclick = () => openForms(s);
    list.append(b);
  }
}
$("btnStagesBack").onclick = () => showScreen("scHome");

// ---- 図鑑（stage があればスタート前の変身えらび） ----
let formsStage = null, pickedForm = "norun";
function openForms(stage) {
  formsStage = stage;
  pickedForm = player.forms.includes(player.form) ? player.form : "norun";
  $("formsTitle").textContent = stage ? "どの すがたで いく？" : "ずかん";
  $("btnFormsGo").classList.toggle("hidden", !stage);
  renderForms();
  showScreen("scForms");
}
function renderForms() {
  const list = $("formList");
  list.innerHTML = "";
  for (const f of FORMS) {
    const has = player.forms.includes(f.id);
    const b = document.createElement("button");
    b.className = "form" + (has && pickedForm === f.id ? " on" : "");
    b.innerHTML = `<span class="art">${has ? f.art : "❔"}</span>${has ? f.name : "？？？"}`;
    b.disabled = !has;
    b.onclick = () => { pickedForm = f.id; renderForms(); };
    list.append(b);
  }
  const f = formOf(pickedForm);
  const got = player.forms.length, all = FORMS.length;
  $("formDesc").textContent = `${f.art} ${f.name}：${f.desc}（あつめた すがた ${got}/${all}）`;
}
$("btnFormsGo").onclick = () => {
  player.form = pickedForm;
  store.savePlayer(player);
  startRun(formsStage, pickedForm);
};
$("btnFormsBack").onclick = () => {
  if (formsStage) { renderStages(); showScreen("scStages"); } else showScreen("scHome");
};

// ---- 結果 ----
$("btnRetry").onclick = () => startRun(run.stage, run.form.id);
$("btnNext").onclick = () => {
  const s = STAGES.find((x) => x.id === run.stage.id + 1);
  openForms(s);
};
$("btnToHome").onclick = () => { renderHome(); toMenu("scHome"); };
$("btnQuit").onclick = () => { renderHome(); toMenu("scHome"); };

/* =========================================================
   毎フレームの更新
   ========================================================= */
let shakeT = 0;
let faceAngle = Math.PI, showcase = 1;
const _camLook = new THREE.Vector3();

function updateMe(dt) {
  const inRun = run && (state === "play" || state === "ready");
  const ab = run ? run.form.ability : null;

  // 左右
  const prevX = me.x;
  if (inRun) me.x = damp(me.x, LANE_X[me.lane], run.laneK, dt);
  else if (state === "menu") me.x = damp(me.x, 0, 8, dt);
  me.vx = (me.x - prevX) / Math.max(dt, 1e-4);
  const ax = (me.vx - me.prevVx) / Math.max(dt, 1e-4);
  me.prevVx = me.vx;

  // 上下（ぷにぷに跳ね・ジャンプ）
  const prevVy = me.vy;
  if (state === "fail") {
    me.vy -= GRAVITY * dt;
    me.y = Math.max(0, me.y + me.vy * dt);
    if (me.y === 0) me.vy = 0;
  } else if (state !== "loading") {
    if (me.rollT > 0) me.rollT -= dt;
    let g = GRAVITY;
    if (ab === "float" && me.vy < 0 && me.jumps > 0) g *= 0.35;   // くらげ：ふわりと落ちる
    me.vy -= g * dt;
    me.y += me.vy * dt;
    if (me.y <= 0) {
      if (me.vy < -2) look.squash = Math.min(0.32, 0.1 + -me.vy * 0.025);   // 着地でつぶれる
      me.y = 0;
      me.jumps = 0;
      // ふだんは ぷにぷに跳ね続ける（メニューではゆっくり、ころがり中は跳ねない）
      me.vy = me.rollT > 0 ? 0 : state === "menu" ? HOP_V * 0.7 : HOP_V;
    }
  }
  const ay = (me.vy - prevVy) / Math.max(dt, 1e-4);

  // つぶれ・のび
  if (me.rollT > 0) look.squash = damp(look.squash, 0.45, 18, dt);
  else if (me.y > 0.05) look.squash = damp(look.squash, clamp(-me.vy * 0.018, -0.14, 0.05), 10, dt);
  else look.squash = damp(look.squash, 0, 12, dt);

  // びっくり・帽子ポップ（失敗時）
  look.surprise = damp(look.surprise, state === "fail" ? 1 : 0, 14, dt);
  look.hatPop = damp(look.hatPop, state === "fail" ? 1 : 0, 6, dt);

  // 向き：プレイ中は後ろ姿、メニュー・結果・ゴールでは正面
  // 失敗した時も、少しおいて振り向いて びっくり顔を見せる
  const front = state === "menu" || state === "clear" || state === "loading" || (state === "fail" && run && run.endT > 0.25);
  if (state === "clear") look.spin += dt * 2.2;
  faceAngle = damp(faceAngle, front ? Math.PI : 0, 6, dt);
  norun.turn.rotation.y = faceAngle + (state === "clear" ? Math.sin(look.spin * 2) * 0.25 : 0);

  norun.root.position.set(me.x, me.y, 0);
  norun.root.rotation.z = inRun ? clamp(me.vx * 0.03, -0.3, 0.3) : 0;   // レーン移動で傾く
  shadow.position.x = me.x;
  const sh = 1 - clamp(me.y / 3, 0, 0.6);
  shadow.scale.set(sh * (1 + look.squash), sh, 1);

  return { ax, ay };
}

function updateWorld(dt, speed) {
  for (const d of dashes) {
    d.position.z -= speed * dt;
    if (d.position.z < -4) d.position.z += DASH_SPAN;   // カメラの近くまで来たら先に回す
  }
  for (const o of decor) {
    o.position.z -= speed * dt;
    if (o.position.z < -12) { const sx = o.position.x; placeDecor(o, false); if (Math.abs(sx) < LANE_W * 1.5 + 8) o.position.x *= 0.7; }
  }
  for (const c of clouds) {
    c.position.z -= (speed * 0.25 + 0.3) * dt;
    if (c.position.z < -20) c.position.set(rand(-35, 35), rand(9, 14), rand(110, 130));
  }
}

function updateCamera(dt, t) {
  // メニュー・結果では前に回り込んで顔を見せる（失敗・ゴールの時は少しおいてから）
  const inMenu = state === "menu" || state === "loading" ||
    ((state === "fail" || state === "clear") && run && run.endT > 0.35);
  showcase = damp(showcase, inMenu ? 1 : 0, 4, dt);
  shakeT = Math.max(0, shakeT - dt);
  const sh = shakeT * 0.35;
  // プレイ中：後ろから / メニュー：前に回り込んで顔を見せる（のるんが振り向く）
  const px = lerp(me.x * 0.55, me.x, showcase);
  camera.position.set(
    px + rand(-sh, sh),
    lerp(3.4, 1.75, showcase) + rand(-sh, sh),
    lerp(-6.3, -4.6, showcase)
  );
  _camLook.set(lerp(me.x * 0.35, me.x, showcase), lerp(1.0, 0.75, showcase), lerp(10, 0, showcase));
  camera.lookAt(_camLook);
  // メニュー中はのるんがパネルに隠れないよう画面をずらす（横長→左、縦長→上）
  const W = innerWidth, H = innerHeight, portrait = H > W;
  camera.setViewOffset(W, H, portrait ? 0 : 0.24 * showcase * W, portrait ? 0.22 * showcase * H : 0, W, H);
}

const clock = new THREE.Clock();
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  let speed = 0;
  if (run) {
    updateRun(dt);
    speed = state === "play" ? run.speed : 0;
    if (state === "fail" || state === "clear") {
      run.endT += dt;
      if (run.endT > (state === "fail" ? 1.6 : 1.8) && !run.shown) { run.shown = true; showResult(); }
    }
  } else if (state === "menu") {
    speed = 0.8;   // メニューでも景色をゆっくり流す
  }
  updateWorld(dt, speed);
  const { ax, ay } = updateMe(dt);
  updateNorunLook(dt, t, ax, ay);
  updateParticles(dt);
  updateCamera(dt, t);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

/* =========================================================
   起動
   ========================================================= */
tick();
try {
  await loadNorun();
  $("loading").classList.add("hidden");
  state = "menu";
  renderTitle();
  showScreen("scTitle");
} catch (e) {
  console.error(e);
  $("loading").textContent = "よみこみに しっぱいしました\nページを ひらきなおしてね";
}

// 動作確認用（URL に ?debug を付けた時だけ）
if (DEBUG) {
  window.G = {
    THREE, store, STAGES, FORMS, norun, me, look,
    get state() { return state; }, get run() { return run; }, get player() { return player; },
    selectPlayer, startRun, openForms, toMenu, renderHome, jump, moveLane, roll, fail,
    nextObstacle() {
      return run && run.active.filter((i) => !i.passed).sort((a, b) => a.d - b.d)[0];
    },
  };
  document.title = "ready";
}
