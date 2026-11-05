import * as THREE from "three";
import { GLTFLoader } from "three/addons/GLTFLoader.js";
import {
  DIFFICULTIES, FORMS, PATTERNS, STAGES, THEMES, DAN_RUN, ENDLESS_RUN, HAT_COLORS,
  LANE_W, NORUN_SCALE, JUMP_V, HOP_V, GRAVITY,
} from "./config.js";
import * as store from "./storage.js";
import { makeQuestion, makeDanQuestions, makeChoices, dots, OP_WORD } from "./questions.js";

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
// 見た目の切り替え：URL に ?classic を付けると前の見た目（高いカメラ・平らな道・原っぱ）で比べられる
const CLASSIC = location.search.includes("classic");
// プレイ中のカメラ：新しい見た目は 低く・近く（道が奥へすぼまって スピード感が出る）
const CAM = CLASSIC
  ? { y: 3.4, z: -6.3, lookY: 1.0, lookZ: 10, fov: 58, fovPortrait: 72 }
  : { y: 2.5, z: -4.9, lookY: 1.0, lookZ: 12, fov: 64, fovPortrait: 78 };

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
      if (m.map && !m.userData.keepMap) m.map.dispose();
      m.dispose();
    }
  });
}

/* =========================================================
   描画の準備
   ========================================================= */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));   // スマホで重くならないよう少し控えめ
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
  camera.fov = camera.aspect < 1 ? CAM.fovPortrait : CAM.fov;
  camera.updateProjectionMatrix();
}
addEventListener("resize", onResize);
onResize();

/* =========================================================
   背景（はらっぱ・3レーンの道・木・花・雲）
   ========================================================= */
const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 400), lambert(0x9bd77a));   // 色はテーマで変わる
ground.rotation.x = -Math.PI / 2;
ground.position.set(0, -0.02, 120);
scene.add(ground);
const road = new THREE.Mesh(new THREE.PlaneGeometry(LANE_W * 3 + 0.6, 400), lambert(0xf2deb0));
road.rotation.x = -Math.PI / 2;
road.position.set(0, -0.01, 120);
scene.add(road);
if (CLASSIC) for (const x of [1.5, -1.5]) {   // 道のふち（前の見た目）
  const e = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 400), lambert(0xffffff));
  e.position.set(x * LANE_W + Math.sign(x) * 0.3, 0.04, 120);
  scene.add(e);
}
// 新しい見た目：レーンの境目は 石だたみの「溝」（道の長さ方向に同じなので動かさなくてよい）
const grooveMat = lambert(0x8a7458);
const grooveHiMat = lambert(0xfff3dc);
if (!CLASSIC) for (const x of [LANE_W / 2, -LANE_W / 2]) {
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 400), grooveMat);
  gr.rotation.x = -Math.PI / 2;
  gr.position.set(x, 0.004, 120);
  const hi = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 400), grooveHiMat);
  hi.rotation.x = -Math.PI / 2;
  hi.position.set(x + 0.09, 0.005, 120);
  scene.add(gr, hi);
}
// レーンの区切り（流れる点線）
const dashGeo = new THREE.BoxGeometry(0.12, 0.02, 1.4);
dashGeo.userData.shared = true;
const dashMat = lambert(0xe7c98a);
const dashes = [];
for (let i = 0; i < 36; i++) {
  for (const x of [LANE_W / 2, -LANE_W / 2]) {
    const d = new THREE.Mesh(dashGeo, dashMat);
    d.visible = CLASSIC;
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
  const top = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 10), lambert(0x5fbf5a));
  top.position.y = 2.1;
  top.scale.y = 1.15;
  g.add(trunk, top);
  g.userData = { kind: "tree", top };
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
  g.userData = { kind: "flower" };
  return g;
}
function makeMushroom() {
  const g = new THREE.Group();
  const c = [0xff6b6b, 0xffa94d, 0xf783ac][randInt(0, 2)];
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), lambert(c));
  cap.position.y = 0.32;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.34, 8), lambert(0xfff4e0));
  stem.position.y = 0.17;
  g.add(cap, stem);
  for (let i = 0; i < 3; i++) {   // 白い水玉
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), lambert(0xffffff));
    const a = i * 2.1;
    d.position.set(Math.cos(a) * 0.17, 0.5, Math.sin(a) * 0.17);
    g.add(d);
  }
  g.userData = { kind: "mushroom" };
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
let theme = THEMES.field;
const decor = [];
function placeDecor(o, init) {
  const side = Math.random() < 0.5 ? -1 : 1;
  const isTree = o.userData.kind === "tree";
  // 新しい見た目では 柵・生け垣・近くの大きな木より外側に置く
  const base = CLASSIC ? LANE_W * 1.5 : LANE_W * 1.5 + 0.6 + (isTree ? 7.5 : 2.6);
  const near = CLASSIC ? (isTree ? theme.treeNear : 1.0) : 0;
  const far = isTree ? 14 : 8;
  o.position.x = side * rand(base + near, base + far);
  o.position.z = init ? rand(-10, 110) : rand(110, 125);
  o.scale.setScalar(rand(0.8, 1.3));
}
for (let i = 0; i < 60; i++) { const t2 = makeTree(); scene.add(t2); decor.push(t2); }
for (let i = 0; i < 36; i++) { const f = makeFlower(); scene.add(f); decor.push(f); }
for (let i = 0; i < 30; i++) { const m = makeMushroom(); scene.add(m); decor.push(m); }

const themeName = (th) => Object.keys(THEMES).find((k) => THEMES[k] === th) || "field";
/* 背景のテーマを切り替える（ステージごと） */
function applyTheme(name) {
  theme = THEMES[name] || THEMES.field;
  scene.background.set(theme.sky);
  scene.fog.color.set(theme.sky);
  ground.material.color.set(theme.ground);
  road.material.color.set(theme.road);
  dashMat.color.set(theme.dash);
  applyThemeExtras();
  for (const [name, set] of Object.entries(kitSets)) set.visible = name === themeName(theme);
  let trees = 0;
  for (const o of decor) {
    const k = o.userData.kind;
    if (kitReady) { o.visible = false; continue; }   // Nature Kit の木・花に置きかえ
    if (k === "tree") {
      o.visible = trees++ < theme.trees;
      o.userData.top.material.color.set(theme.treeColors[randInt(0, theme.treeColors.length - 1)]);
    } else {
      o.visible = k === theme.decor;
    }
    placeDecor(o, true);
  }
}

const clouds = [];
for (let i = 0; i < 9; i++) {
  const c = makeCloud();
  c.position.set(rand(-35, 35), rand(9, 14), rand(10, 110));
  scene.add(c);
  clouds.push(c);
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
/* =========================================================
   背景の作りこみ（スマホで重くならないよう、同じ形は使い回す）
   - 道の模様（小石・落ち葉）と草の模様：テクスチャを流して動かす
   - 道のふちの石・草むら、道ばたの小物：1周期ぶんを並べたグループを ずらして くり返す
   - 遠くの山：動かない（霧の影響を受けない）
   ========================================================= */
const ROAD_REPEAT = 100, ROAD_REPEAT_COBBLE = 150, GROUND_REPEAT_Y = 50;
/* 石だたみ：5×5の石。1段ごとに半分ずらす。はしをまたぐ石は反対側にも描いて、つなぎ目が出ないように */
function drawCobble(x, w, h) {
  const base = new THREE.Color(theme.road);
  const mortar = base.clone().multiplyScalar(0.62);
  x.fillStyle = `#${mortar.getHexString()}`;
  x.fillRect(0, 0, w, h);
  const rows = 5, cols = 5, cw = w / cols, ch = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const shade = rand(0.88, 1.08);
      const col = base.clone().multiplyScalar(shade);
      const ox = (r % 2) * cw / 2 + c * cw, oy = r * ch;
      const iw = cw - rand(5, 9), ih = ch - rand(5, 9);
      for (const dx of [0, -w]) {
        const sx = ox + dx + (cw - iw) / 2, sy = oy + (ch - ih) / 2;
        const g = x.createLinearGradient(sx, sy, sx, sy + ih);
        g.addColorStop(0, `#${col.clone().multiplyScalar(1.12).getHexString()}`);
        g.addColorStop(1, `#${col.clone().multiplyScalar(0.9).getHexString()}`);
        x.fillStyle = g;
        x.beginPath(); x.roundRect(sx, sy, iw, ih, 12); x.fill();
        x.fillStyle = "rgba(255,255,255,.18)";      // 上のふちの光
        x.beginPath(); x.roundRect(sx + 4, sy + 3, iw - 8, 5, 3); x.fill();
      }
    }
  }
  if (theme.roadDots === "leaf") {   // 森は落ち葉も少し
    const cols2 = ["#e08a3c", "#c9652e", "#e6b84a"];
    for (let i = 0; i < 10; i++) {
      x.save(); x.translate(rand(10, w - 10), rand(10, h - 10)); x.rotate(rand(0, Math.PI));
      x.fillStyle = cols2[randInt(0, 2)];
      x.beginPath(); x.ellipse(0, 0, 4, 7, 0, 0, Math.PI * 2); x.fill();
      x.restore();
    }
  }
}
function drawRoadTex(x, w, h) {
  if (!CLASSIC) { drawCobble(x, w, h); return; }
  const base = new THREE.Color(theme.road);
  x.fillStyle = `#${base.getHexString()}`;
  x.fillRect(0, 0, w, h);
  // うっすら土のむら
  for (let i = 0; i < 40; i++) {
    x.fillStyle = `rgba(160,120,70,${rand(0.03, 0.07)})`;
    x.beginPath(); x.ellipse(rand(0, w), rand(0, h), rand(10, 30), rand(6, 18), 0, 0, Math.PI * 2); x.fill();
  }
  if (theme.roadDots === "leaf") {
    const cols = ["#e08a3c", "#c9652e", "#e6b84a", "#a9763e"];
    for (let i = 0; i < 14; i++) {
      x.save(); x.translate(rand(0, w), rand(0, h)); x.rotate(rand(0, Math.PI));
      x.globalAlpha = 0.8;
      x.fillStyle = cols[randInt(0, cols.length - 1)];
      x.beginPath(); x.ellipse(0, 0, 3.2, 5.5, 0, 0, Math.PI * 2); x.fill();
      x.restore();
    }
  } else {
    for (let i = 0; i < 30; i++) {
      const g = randInt(175, 215);
      x.fillStyle = `rgba(${g},${g - 8},${g - 25},.85)`;
      x.beginPath(); x.ellipse(rand(0, w), rand(0, h), rand(1.2, 2.4), rand(2, 4), 0, 0, Math.PI * 2); x.fill();
    }
  }
}
function drawGrassTex(x, w, h) {
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, w, h);    // 色は材質の色（テーマ）で付ける
  const tint = new THREE.Color(theme.grassTint);
  for (let i = 0; i < 160; i++) {          // 草のすじ
    const px = rand(0, w), py = rand(0, h);
    x.strokeStyle = `rgba(${Math.round(tint.r * 140)},${Math.round(tint.g * 200)},${Math.round(tint.b * 120)},.35)`;
    x.lineWidth = 2;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + rand(-3, 3), py - rand(6, 12)); x.stroke();
  }
}
const roadCanvas = document.createElement("canvas");
roadCanvas.width = roadCanvas.height = CLASSIC ? 128 : 256;
const roadTex = new THREE.CanvasTexture(roadCanvas);
roadTex.colorSpace = THREE.SRGBColorSpace;
roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
roadTex.repeat.set(CLASSIC ? 2 : 3, CLASSIC ? ROAD_REPEAT : ROAD_REPEAT_COBBLE);
road.material.map = roadTex;
const grassCanvas = document.createElement("canvas");
grassCanvas.width = 128; grassCanvas.height = 128;
const grassTex = new THREE.CanvasTexture(grassCanvas);
grassTex.colorSpace = THREE.SRGBColorSpace;
grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
grassTex.repeat.set(36, GROUND_REPEAT_Y);
ground.material.map = grassTex;

// 道のふち（石・草むら）と 道ばたの小物：長さ EDGE_P の1周期を EDGE_COPIES 回くり返す
const EDGE_P = 30, EDGE_COPIES = 5;
const edge = new THREE.Group();
scene.add(edge);
const edgeStoneGeo = new THREE.DodecahedronGeometry(0.22, 0);
const edgeStoneMat = new THREE.MeshLambertMaterial({ color: 0xc9c4bb, flatShading: true });
const tuftGeo = new THREE.ConeGeometry(0.09, 0.55, 4);
const tuftMat = lambert(0x6fb35e);
const bushGeo = new THREE.SphereGeometry(0.55, 10, 8);
const bushMat = lambert(0x58a84f);
const blobGeo = new THREE.CircleGeometry(1, 20);
const blobMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16, depthWrite: false });
blobGeo.userData.shared = true;
blobMat.userData.shared = true;
function blobShadow(r, sx = 1, sz = 1) {   // まるい影
  const s = new THREE.Mesh(blobGeo, blobMat);
  s.rotation.x = -Math.PI / 2;
  s.position.y = 0.015;
  s.scale.set(r * sx, r * sz, 1);
  return s;
}
/* ---------- 新しい見た目：道を「通路」にする ----------
   道のすぐ外に 立体の縁石 → 木の柵 → 生け垣 → 道に近い大きな木（枝が上にかぶさる）。
   どれも1周期ぶんを InstancedMesh でまとめて描くので、数が多くても軽い */
const CURB_X = LANE_W * 1.5 + 0.3 + 0.27;      // 縁石の中心（道のはし＋半分）
const curbMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
const fenceMat = lambert(0xc99561);
const hedgeMat = lambert(0x5aa64f);
const nearLeafMat = lambert(0x4fae55);
const nearTrunkMat = lambert(0x8a5a33);
/* 縁石：1.5m の石ブロック（色を少しずつ変える） */
function buildCurbs(mk) {
  const curbs = [];
  for (const side of [1, -1]) for (let z = 0; z < EDGE_P; z += 1.5) curbs.push([side * CURB_X, z + 0.75, rand(0.86, 1.0)]);
  const curbGeo = new THREE.BoxGeometry(0.54, 0.3, 1.44);
  const curbIm = mk(curbGeo, curbMat, curbs, (o, [x, z], off) => {
    o.position.set(x, 0.15, z + off); o.scale.set(1, 1, 1); o.rotation.set(0, 0, 0);
  });
  const cc = new THREE.Color();
  for (let i = 0; i < curbIm.count; i++) {
    const s = curbs[i % curbs.length][2];
    curbIm.setColorAt(i, cc.setRGB(0.93 * s, 0.9 * s, 0.85 * s));
  }
  curbIm.instanceColor.needsUpdate = true;
}

/* 図形で作った通路（Kenney の素材が読めなかった時の予備） */
function buildCorridor(mk) {
  const posts = [], rails = [], hedges = [], trees = [];
  for (const side of [1, -1]) {
    // 柵：くい 1.5m ごと＋横木2本
    for (let z = 0; z < EDGE_P; z += 1.5) posts.push([side * (CURB_X + 0.62), z]);
    for (const y of [0.42, 0.78]) rails.push([side * (CURB_X + 0.62), y]);
    // 生け垣：すきまを空けて ならべる
    let z = rand(0, 2);
    while (z < EDGE_P - 2) {
      const len = rand(3, 5.5);
      hedges.push([side * (CURB_X + 1.55 + rand(0, 0.3)), z + len / 2, len, rand(0.75, 1.05)]);
      z += len + rand(0.8, 2.5);
    }
    // 道に近い大きな木（1周期に3本）
    for (let i = 0; i < 3; i++) {
      trees.push([side * (CURB_X + rand(3.0, 4.8)), i * (EDGE_P / 3) + rand(0, EDGE_P / 3 - 2), rand(0.9, 1.25)]);
    }
  }
  mk(new THREE.CylinderGeometry(0.07, 0.08, 1.0, 6), fenceMat, posts, (o, [x, z], off) => {
    o.position.set(x, 0.5, z + off); o.scale.set(1, 1, 1); o.rotation.set(0, 0, 0);
  });
  mk(new THREE.BoxGeometry(0.06, 0.1, EDGE_P), fenceMat, rails, (o, [x, y], off) => {
    o.position.set(x, y, EDGE_P / 2 + off); o.scale.set(1, 1, 1); o.rotation.set(0, 0, 0);
  });
  mk(new THREE.SphereGeometry(0.5, 12, 8), hedgeMat, hedges, (o, [x, z, len, h], off) => {
    o.position.set(x, 0.42 * h, z + off); o.scale.set(1.5, 1.7 * h, len); o.rotation.set(0, 0, 0);
  });
  mk(blobGeo, blobMat, hedges, (o, [x, z, len], off) => {
    o.position.set(x + 0.1, 0.016, z + off); o.scale.set(1.0, len * 0.55, 1); o.rotation.set(-Math.PI / 2, 0, 0);
  });
  // 大きな木：幹＋葉っぱ3つ。葉っぱは道の側に張り出す
  mk(new THREE.CylinderGeometry(0.28, 0.4, 3.4, 8), nearTrunkMat, trees, (o, [x, z, s], off) => {
    o.position.set(x, 1.7 * s, z + off); o.scale.set(s, s, s); o.rotation.set(0, 0, -Math.sign(x) * 0.06);
  });
  const leafGeo = new THREE.SphereGeometry(1.0, 12, 10);
  [[0, 3.6, 0, 1.9], [-0.9, 3.1, 0.6, 1.4], [0.6, 3.3, -0.8, 1.5]].forEach(([dx, y, dz, r]) => {
    mk(leafGeo, nearLeafMat, trees, (o, [x, z, s], off) => {
      o.position.set(x - Math.sign(x) * (0.6 - dx) * s, y * s, z + dz * s + off);
      o.scale.set(r * s, r * s * 0.85, r * s); o.rotation.set(0, 0, 0);
    });
  });
  mk(blobGeo, blobMat, trees, (o, [x, z, s], off) => {
    o.position.set(x - Math.sign(x) * 0.5, 0.017, z + off); o.scale.set(2.1 * s, 1.8 * s, 1); o.rotation.set(-Math.PI / 2, 0, 0);
  });
}

{
  const stones = [], tufts = [], bushes = [];
  const edgeX = LANE_W * 1.5 + 0.55;
  for (const side of [1, -1]) {
    for (let i = 0; i < 9; i++) stones.push([side * (edgeX + rand(0, 0.5)), rand(0, EDGE_P), rand(0.6, 1.3)]);
    for (let i = 0; i < 7; i++) {
      const z = rand(0, EDGE_P), x = side * (CLASSIC ? edgeX + rand(0.5, 1.6) : CURB_X + rand(0.75, 1.3));
      for (let k = 0; k < 4; k++) tufts.push([x + rand(-0.15, 0.15), z + rand(-0.15, 0.15), rand(0.7, 1.3), rand(-0.4, 0.4)]);
    }
    if (CLASSIC) for (let i = 0; i < 2; i++) bushes.push([side * (edgeX + rand(1.6, 3.2)), rand(0, EDGE_P), rand(0.8, 1.4)]);
  }
  const mk = (geo, mat, list, place) => {
    const im = new THREE.InstancedMesh(geo, mat, list.length * EDGE_COPIES);
    const o = new THREE.Object3D();
    let n = 0;
    for (let c = 0; c < EDGE_COPIES; c++) {
      for (const it of list) { place(o, it, c * EDGE_P); o.updateMatrix(); im.setMatrixAt(n++, o.matrix); }
    }
    im.frustumCulled = false;
    edge.add(im);
    return im;
  };
  if (CLASSIC) mk(edgeStoneGeo, edgeStoneMat, stones, (o, [x, z, s], off) => {
    o.position.set(x, 0.08 * s, z + off); o.scale.set(s, s * 0.7, s); o.rotation.set(0, z * 3, 0);
  });
  if (!CLASSIC) buildCurbs(mk);
  if (CLASSIC) mk(tuftGeo, tuftMat, tufts, (o, [x, z, s, tilt], off) => {
    o.position.set(x, 0.25 * s, z + off); o.scale.set(s, s, s); o.rotation.set(tilt * 0.6, 0, tilt);
  });
  mk(bushGeo, bushMat, bushes, (o, [x, z, s], off) => {
    o.position.set(x, 0.35 * s, z + off); o.scale.set(s * 1.2, s * 0.85, s); o.rotation.set(0, 0, 0);
  });
  // 茂みの影
  mk(blobGeo, blobMat, bushes, (o, [x, z, s], off) => {
    o.position.set(x + 0.15, 0.016, z + off - 0.15); o.scale.set(s * 0.8, s * 0.7, 1); o.rotation.set(-Math.PI / 2, 0, 0);
  });
  // 道ばたの立て札（ところどころ）
  const signTex = canvasTex(128, 64, (x, w, h) => {
    x.fillStyle = "#f3d9a4"; x.fillRect(0, 0, w, h);
    x.strokeStyle = "#a0703c"; x.lineWidth = 6; x.strokeRect(3, 3, w - 6, h - 6);
    x.fillStyle = "#7a4e22"; x.font = `bold 34px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText("→", w / 2, h / 2 + 2);
  });
  if (CLASSIC) for (let c = 0; c < EDGE_COPIES; c++) {
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6), lambert(0x9a6a3d));
    post.position.y = 0.45;
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.36, 0.05), [
      lambert(0xd9b07a), lambert(0xd9b07a), lambert(0xd9b07a), lambert(0xd9b07a),
      new THREE.MeshLambertMaterial({ map: signTex }), new THREE.MeshLambertMaterial({ map: signTex }),
    ]);
    board.position.y = 0.85;
    g.add(post, board);
    g.position.set((c % 2 ? 1 : -1) * (CLASSIC ? edgeX + 1.1 : CURB_X + 1.35), 0, c * EDGE_P + 17);
    g.rotation.y = Math.PI;
    edge.add(g);
  }
}
let edgeScroll = 0;

/* =========================================================
   Kenney「Nature Kit」（CC0）で 道ばたを作る
   - モデルは assets/models/nature/ に入っている分だけ読む
   - どれも EDGE_P の1周期ぶんを InstancedMesh でまとめて描く（数が多くても軽い）
   - テーマごとに1セットずつ作り、見えるセットを切り替える
   ========================================================= */
const KIT_DIR = "assets/models/nature/";
const KIT = {};          // 名前 → [{ geometry, material }]（ノードの位置・大きさは形に焼きこみ済み）
let kitReady = false;
const kitSets = {};      // テーマ名 → Group
const kitLambert = new Map();
// Kenney の葉っぱ・草は 青みの強い緑なので、のるんランの あたたかい色に合わせて 置きかえる（材質の名前で指定）
const KIT_RECOLOR = {
  leafsGreen: 0x63c25a,
  leafsDark: 0x3f9d55,
  grass: 0x72c45e,
  leafsFall: 0xf2a646,
};

async function loadKit(names) {
  const loader = new GLTFLoader();
  await Promise.all(names.map(async (n) => {
    const g = await loader.loadAsync(`${KIT_DIR}${n}.glb`);
    g.scene.updateMatrixWorld(true);
    const parts = [];
    g.scene.traverse((o) => {
      if (!o.isMesh) return;
      const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
      // 軽い材質にそろえる（色はそのまま）。同じ名前の材質は使い回す
      const key = o.material.name + "#" + o.material.color.getHexString();
      if (!kitLambert.has(key)) {
        const col = KIT_RECOLOR[o.material.name] != null ? new THREE.Color(KIT_RECOLOR[o.material.name]) : o.material.color.clone();
        kitLambert.set(key, new THREE.MeshLambertMaterial({ color: col }));
      }
      parts.push({ geometry: geo, material: kitLambert.get(key) });
    });
    KIT[n] = parts;
  }));
}

/* モデル1つぶん（部品ごとに InstancedMesh）。list の各要素を place で置く */
function kitInst(parent, name, list, place) {
  if (!list.length || !KIT[name]) return;
  const o = new THREE.Object3D();
  for (const part of KIT[name]) {
    const im = new THREE.InstancedMesh(part.geometry, part.material, list.length * EDGE_COPIES);
    let n = 0;
    for (let c = 0; c < EDGE_COPIES; c++) {
      for (const it of list) {
        o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1);
        place(o, it);
        o.position.z += c * EDGE_P;
        o.updateMatrix();
        im.setMatrixAt(n++, o.matrix);
      }
    }
    im.frustumCulled = false;
    parent.add(im);
  }
}
function blobInst(parent, list, place) {
  const im = new THREE.InstancedMesh(blobGeo, blobMat, list.length * EDGE_COPIES);
  const o = new THREE.Object3D();
  let n = 0;
  for (let c = 0; c < EDGE_COPIES; c++) {
    for (const it of list) {
      o.position.set(0, 0, 0); o.rotation.set(-Math.PI / 2, 0, 0); o.scale.set(1, 1, 1);
      place(o, it);
      o.position.z += c * EDGE_P;
      o.updateMatrix();
      im.setMatrixAt(n++, o.matrix);
    }
  }
  im.frustumCulled = false;
  parent.add(im);
}

/* テーマごとの 素材の組み合わせ */
const KIT_THEMES = {
  field: {
    near: ["tree_oak", "tree_default", "tree_fat"], far: ["tree_default", "tree_detailed", "tree_oak"],
    flowers: ["flower_redA", "flower_yellowA", "flower_purpleA"], bushes: ["plant_bushDetailed", "plant_bushLarge"],
    small: ["rock_smallA", "rock_smallC", "stump_round"], mushrooms: [],
  },
  forest: {
    near: ["tree_oak_dark", "tree_default_dark", "tree_pineRoundA"], far: ["tree_pineTallA_detailed", "tree_pineRoundA", "tree_default_dark"],
    flowers: ["flower_purpleA"], bushes: ["plant_bushDetailed", "plant_bushLarge"],
    small: ["stump_round", "log", "rock_smallC"], mushrooms: ["mushroom_redGroup", "mushroom_tanGroup"],
  },
  sunset: {
    near: ["tree_oak_fall", "tree_default_fall", "tree_fat_fall"], far: ["tree_default_fall", "tree_fat_fall", "tree_oak"],
    flowers: ["flower_yellowA", "flower_redA"], bushes: ["plant_bushDetailed", "plant_bushLarge"],
    small: ["rock_smallA", "stump_round", "log"], mushrooms: [],
  },
};
const KIT_NAMES = [...new Set(Object.values(KIT_THEMES).flatMap((k) => [...k.near, ...k.far, ...k.flowers, ...k.bushes, ...k.small, ...k.mushrooms]).concat(["fence_simple", "grass", "grass_large", "sign"]))];

/* 1テーマぶんの道ばた（場所はテーマごとに少しずつ違う並びになる） */
function buildKitSet(themeName) {
  const k = KIT_THEMES[themeName];
  const g = new THREE.Group();
  g.visible = false;
  edge.add(g);
  const FENCE_X = CURB_X + 0.62, FENCE_S = 2.0;      // 柵：長さ 2m・高さ 0.7m
  const pick = (arr) => arr[randInt(0, arr.length - 1)];
  const byModel = {};    // モデル名 → 置く場所の一覧
  const add = (name, item) => { (byModel[name] ||= []).push(item); };
  const bushShadows = [], treeShadows = [];
  for (const side of [1, -1]) {
    // 柵（道に そって ずっと）
    for (let z = 0; z < EDGE_P; z += FENCE_S) add("fence_simple", { x: side * FENCE_X, z: z + FENCE_S / 2, s: FENCE_S, ry: Math.PI / 2 });
    // 草むら（縁石と柵の あいだ と 柵の外）
    for (let i = 0; i < 10; i++) add(Math.random() < 0.5 ? "grass" : "grass_large", { x: side * (FENCE_X + rand(-0.35, 1.4)), z: rand(0, EDGE_P), s: rand(1.8, 2.6), ry: rand(0, 6) });
    // 花
    for (let i = 0; i < 7; i++) add(pick(k.flowers), { x: side * (FENCE_X + rand(0.4, 1.6)), z: rand(0, EDGE_P), s: rand(2.0, 2.8), ry: rand(0, 6) });
    // 茂み（柵の外に ならべる）
    let z = rand(0, 1.5);
    while (z < EDGE_P - 1) {
      const it = { x: side * (FENCE_X + rand(1.3, 2.1)), z, s: rand(2.6, 3.6), ry: rand(0, 6) };
      add(pick(k.bushes), it);
      bushShadows.push(it);
      z += rand(1.4, 2.6);
    }
    // 小石・切り株・丸太（ところどころ）
    for (let i = 0; i < 3; i++) add(pick(k.small), { x: side * (FENCE_X + rand(0.5, 1.5)), z: rand(0, EDGE_P), s: rand(2.2, 3.0), ry: rand(0, 6) });
    // きのこ（森）
    for (let i = 0; i < (k.mushrooms.length ? 6 : 0); i++) add(pick(k.mushrooms), { x: side * (FENCE_X + rand(0.4, 2.2)), z: rand(0, EDGE_P), s: rand(2.4, 3.4), ry: rand(0, 6) });
    // 道の近くの大きな木（1周期に3本）。枝が道の上にかぶさるよう、少し道側へ
    for (let i = 0; i < 3; i++) {
      const it = { x: side * (FENCE_X + rand(3.0, 4.4)), z: i * (EDGE_P / 3) + rand(0, EDGE_P / 3 - 2), s: rand(4.2, 5.4), ry: rand(0, 6) };
      add(pick(k.near), it);
      treeShadows.push(it);
    }
    // 遠くの木
    for (let i = 0; i < 6; i++) add(pick(k.far), { x: side * rand(FENCE_X + 7, FENCE_X + 20), z: rand(0, EDGE_P), s: rand(4, 6.5), ry: rand(0, 6) });
  }
  // 立て札（2周期に1本）
  const sign = [{ x: CURB_X + 1.15, z: 17, s: 2.2, ry: Math.PI }];
  for (const [name, list] of Object.entries(byModel)) {
    kitInst(g, name, list, (o, it) => { o.position.set(it.x, 0, it.z); o.scale.setScalar(it.s); o.rotation.y = it.ry; });
  }
  kitInst(g, "sign", sign, (o, it) => { o.position.set(it.x, 0, it.z); o.scale.setScalar(it.s); o.rotation.y = it.ry; });
  blobInst(g, bushShadows, (o, it) => { o.position.set(it.x, 0.016, it.z); o.scale.set(it.s * 0.32, it.s * 0.3, 1); });
  blobInst(g, treeShadows, (o, it) => { o.position.set(it.x - Math.sign(it.x) * 0.3, 0.017, it.z); o.scale.set(it.s * 0.5, it.s * 0.45, 1); });
  kitSets[themeName] = g;
}

/* 起動時に呼ぶ：素材を読んで テーマごとのセットを作る。失敗したら 図形の通路で代わりに */
async function setupRoadside() {
  if (CLASSIC) return;
  try {
    await loadKit(KIT_NAMES);
    for (const name of Object.keys(KIT_THEMES)) buildKitSet(name);
    kitReady = true;
  } catch (e) {
    console.warn("Nature Kit を読めなかったので、図形の道ばたを使います", e);
    buildCorridor(mkInst);
  }
}
function mkInst(geo, mat, list, place) {
  const im = new THREE.InstancedMesh(geo, mat, list.length * EDGE_COPIES);
  const o = new THREE.Object3D();
  let n = 0;
  for (let c = 0; c < EDGE_COPIES; c++) {
    for (const it of list) { place(o, it, c * EDGE_P); o.updateMatrix(); im.setMatrixAt(n++, o.matrix); }
  }
  im.frustumCulled = false;
  edge.add(im);
  return im;
}

// 遠くの山（霧の影響を受けない・動かない）
const mountains = [];
for (let i = 0; i < 16; i++) {
  const r = rand(14, 30), h = rand(14, 30);
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), new THREE.MeshBasicMaterial({ color: 0x8cc0e8, fog: false }));
  const x = (i - 7.5) * 22 + rand(-6, 6);
  m.position.set(x, h / 2 - 2, rand(150, 175));
  m.userData.layer = i % 2;
  scene.add(m);
  mountains.push(m);
  // 雪のぼうし
  if (h > 22) {
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.32, h * 0.32, 7), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }));
    cap.position.y = h * 0.34;
    m.add(cap);
  }
}
// 遠くの大きな雲（霧の影響を受けない）
for (let i = 0; i < 6; i++) {
  const c = makeCloud();
  c.traverse((o) => { if (o.isMesh) o.material = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: 0.9 }); });
  c.scale.setScalar(rand(3, 5));
  c.position.set(rand(-90, 90), rand(22, 34), rand(140, 160));
  scene.add(c);
}
// 木に影をつける
for (const o of decor) if (o.userData.kind === "tree") o.add(blobShadow(1.25, 1, 0.8));

/* テーマに合わせて 模様・ふち・山の色を変える */
function applyThemeExtras() {
  const rx = roadCanvas.getContext("2d");
  drawRoadTex(rx, roadCanvas.width, roadCanvas.height);
  roadTex.needsUpdate = true;
  road.material.color.set(0xffffff);
  drawGrassTex(grassCanvas.getContext("2d"), grassCanvas.width, grassCanvas.height);
  grassTex.needsUpdate = true;
  tuftMat.color.set(theme.grassTint);
  bushMat.color.set(new THREE.Color(theme.grassTint).multiplyScalar(0.85));
  edgeStoneMat.color.set(theme.roadDots === "leaf" ? 0xb5ad9c : 0xd2cdc2);
  hedgeMat.color.set(new THREE.Color(theme.grassTint).multiplyScalar(0.82));
  nearLeafMat.color.set(theme.treeColors[0]);
  curbMat.color.set(theme.roadDots === "leaf" ? 0xd8d0bf : 0xf2ece0);
  grooveMat.color.set(new THREE.Color(theme.road).multiplyScalar(0.55));
  mountains.forEach((m) => m.material.color.set(theme.mountains[m.userData.layer]));
}

/* 背景を流す（テクスチャのずらし・ふちのくり返し） */
function scrollGround(dist) {
  roadTex.offset.y = -((dist * roadTex.repeat.y) / 400) % 1;
  grassTex.offset.y = -((dist * GROUND_REPEAT_Y) / 400) % 1;
  edge.position.z = -10 - (dist % EDGE_P);
}

/* =========================================================
   演出：土ぼこり・キラキラ・紙吹雪（使い回しの「プール」で、毎回作らない）
   ========================================================= */
const softTex = canvasTex(64, 64, (x, w, h) => {
  const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, w, h);
});
const starTex = canvasTex(64, 64, (x, w, h) => {
  x.fillStyle = "#ffffff";
  x.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 12 : 30;
    x.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r);
  }
  x.closePath(); x.fill();
});
function makePool(n, make) {
  const items = [];
  for (let i = 0; i < n; i++) { const o = make(); o.visible = false; scene.add(o); items.push({ o, life: 0 }); }
  let k = 0;
  return { items, take() { const it = items[k]; k = (k + 1) % n; return it; } };
}
const dustPool = makePool(24, () => new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: 0xd9c4a0, transparent: true, depthWrite: false })));
const starPool = makePool(36, () => new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false })));
const CONFETTI_COLORS = [0xff7eb6, 0xffd84d, 0x6cc0ff, 0x5fe0b0, 0xb59cff, 0xff9a4d];
const confettiGeo = new THREE.PlaneGeometry(0.14, 0.24);
const confettiMats = CONFETTI_COLORS.map((c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
const confettiPool = makePool(90, () => new THREE.Mesh(confettiGeo, confettiMats[randInt(0, confettiMats.length - 1)]));

function dust() {   // 着地した時の 土ぼこり（後ろへ流れる）
  for (let i = 0; i < 2; i++) {
    const it = dustPool.take();
    it.o.visible = true;
    it.o.material.color.set(new THREE.Color(theme.road).multiplyScalar(0.85));
    it.o.position.set(me.x + rand(-0.5, 0.5), 0.15, rand(-0.5, -0.2));
    it.v = new THREE.Vector3(rand(-0.4, 0.4), rand(0.3, 0.7), -(run ? run.speed : 2) * 0.55);
    it.life = it.max = rand(0.45, 0.65);
    it.kind = "dust";
  }
}
function starBurst() {   // 正解の キラキラ
  const cols = [0xffe066, 0xff8fc8, 0x8fd8ff, 0xffffff];
  for (let i = 0; i < 18; i++) {
    const it = starPool.take();
    it.o.visible = true;
    it.o.material.color.set(cols[i % cols.length]);
    it.o.position.set(me.x, 1.3 + me.y, 0.4);
    const a = (i / 18) * Math.PI * 2;
    it.v = new THREE.Vector3(Math.cos(a) * rand(2.5, 4), Math.sin(a) * rand(2.5, 4) + 1.5, rand(0, 1.5));
    it.life = it.max = rand(0.6, 0.9);
    it.kind = "star";
  }
}
function confetti() {    // ゴールの 紙吹雪
  for (const it of confettiPool.items) {
    it.o.visible = true;
    it.o.position.set(me.x + rand(-5, 5), rand(4, 8), rand(-1, 5));
    it.o.rotation.set(rand(0, 6), rand(0, 6), rand(0, 6));
    it.v = new THREE.Vector3(rand(-0.6, 0.6), rand(-1.6, -0.8), rand(-0.3, 0.3));
    it.spin = new THREE.Vector3(rand(-6, 6), rand(-6, 6), rand(-6, 6));
    it.life = it.max = rand(2.6, 3.6);
    it.kind = "confetti";
  }
}
function updateFx(dt, t) {
  for (const pool of [dustPool, starPool, confettiPool]) {
    for (const it of pool.items) {
      if (it.life <= 0) continue;
      it.life -= dt;
      const k = Math.max(0, it.life / it.max);
      if (it.life <= 0) { it.o.visible = false; continue; }
      if (it.kind === "dust") {
        it.o.position.addScaledVector(it.v, dt);
        const s = 0.5 + (1 - k) * 0.9;
        it.o.scale.set(s, s, 1);
        it.o.material.opacity = 0.55 * k;
      } else if (it.kind === "star") {
        it.v.y -= 6 * dt;
        it.o.position.addScaledVector(it.v, dt);
        const s = 0.35 * (0.6 + k * 0.6) * (1 + Math.sin(t * 20 + it.max * 10) * 0.15);
        it.o.scale.set(s, s, 1);
        it.o.material.opacity = Math.min(1, k * 1.6);
      } else {
        it.o.position.addScaledVector(it.v, dt);
        it.o.position.x += Math.sin(t * 3 + it.max * 7) * dt * 0.8;
        it.o.rotation.x += it.spin.x * dt;
        it.o.rotation.y += it.spin.y * dt;
        if (it.o.position.y < 0.05) it.life = 0.01;
      }
    }
  }
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
  const gltf = await new GLTFLoader().loadAsync("assets/models/norun-v4.glb");
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

  // 体の色を変身ごとに変えるため、体の材質を自分用に複製しておく
  norun.bodyMats = [];
  m.traverse((o) => {
    if (o.isMesh && o.material.name === "M_Body") {
      o.material = o.material.clone();
      o.material.userData.baseColor = o.material.color.clone();
      norun.bodyMats.push(o.material);
    }
  });
  // 帽子の色を変えるため、帽子の材質も複製しておく
  norun.hatMats = [];
  m.traverse((o) => {
    if (o.isMesh && o.material.name === "M_Hat") {
      o.material = o.material.clone();
      o.material.userData.baseColor = o.material.color.clone();
      norun.hatMats.push(o.material);
    }
  });
  // びっくりした時の「お」の口（元の口と入れ替えて見せる）
  norun.mouth.userData.parts = norun.mouth.children.length ? [...norun.mouth.children] : [norun.mouth];
  if (!norun.mouth.children.length) norun.mouth.userData.parts = [];
  const om = new THREE.Group();
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.075, 24), new THREE.MeshBasicMaterial({ color: 0x4a2340 }));
  hole.scale.set(1, 1.2, 1);
  const tongue = new THREE.Mesh(new THREE.CircleGeometry(0.045, 20), new THREE.MeshBasicMaterial({ color: 0xff8fa8 }));
  tongue.scale.set(1.2, 0.7, 1);
  tongue.position.set(0, -0.045, 0.002);
  om.add(hole, tongue);
  om.position.set(0, -0.005, 0.035);
  om.visible = false;
  norun.mouth.add(om);
  openMouth = om;
}

/* 頭の上の「！」（いつもカメラを向く板） */
const bang = new THREE.Sprite(new THREE.SpriteMaterial({
  map: canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = "#ffe066";
    x.beginPath();
    for (let i = 0; i < 16; i++) {        // ぎざぎざの ふきだし
      const a = (i / 16) * Math.PI * 2, r = i % 2 ? 46 : 60;
      x.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r);
    }
    x.closePath(); x.fill();
    x.lineWidth = 5; x.strokeStyle = "#ff9f1c"; x.stroke();
    x.fillStyle = "#ff3d6e"; x.font = `bold 80px ${FONT}`;
    x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText("！", w / 2 + 2, h / 2 + 4);
  }),
  depthTest: false,
}));
bang.visible = false;
bang.renderOrder = 10;
norun.root.add(bang);
let openMouth = new THREE.Group();

/* ---------- 変身の見た目 ----------
   体の色（元の色に掛ける）・透け具合・飾り（ねこのしっぽ、くらげのあし）。
   飾りは体（Body）の子にするので、ぷにぷにの つぶれ・のびも一緒にかかる */
const formLook = { id: "norun", addon: null };

function makeBeads(n, r0, r1, colors, opacity = 1) {
  const beads = [];
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const r = lerp(r0, r1, i / Math.max(1, n - 1));
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(r, 10, 8),
      new THREE.MeshBasicMaterial({ color: colors[i % colors.length], transparent: opacity < 1, opacity })
    );
    g.add(m);
    beads.push(m);
  }
  return { g, beads };
}

function buildAddon(kind) {
  const group = new THREE.Group();
  if (kind === "tail") {
    // 帽子のつばの下から 後ろへ出て、上へ くるんと立つ（後ろ姿でも見えるように 帽子より外まで出す）
    const { g, beads } = makeBeads(12, 0.14, 0.1, [0xf2a65a, 0xf2a65a, 0xffe2b8]);
    group.add(g);
    return {
      group,
      update(t, k) {   // 先っぽほど よくゆれる
        beads.forEach((b, i) => {
          const u = i / (beads.length - 1);
          const back = Math.min(u * 2.2, 1);            // 前半は後ろへ
          const up = Math.max(0, u - 0.35) / 0.65;      // 後半は上へ
          b.position.set(
            Math.sin(t * 5 - i * 0.5) * 0.18 * up * k,
            0.18 + up * 1.15 + Math.sin(t * 5 - i * 0.5 + 1) * 0.04 * up,
            -0.5 - back * 0.62 + up * 0.12
          );
        });
      },
    };
  }
  if (kind === "tentacles") {
    const strands = [];
    for (let s = 0; s < 6; s++) {
      const { g, beads } = makeBeads(10, 0.11, 0.05, [0xc8ecff, 0x9fd4ff, 0xe3c8ff], 0.85);
      group.add(g);
      strands.push({ beads, a: lerp(-1.25, 1.25, s / 5) });
    }
    return {
      group,
      update(t, k) {   // からだの後ろ下から 帽子の外まで ゆらゆら たなびく あし
        for (const st of strands) {
          const bx = Math.sin(st.a) * 0.6, bz = -Math.cos(st.a) * 0.45;
          st.beads.forEach((b, i) => {
            const u = i / (st.beads.length - 1);
            b.position.set(
              bx * (1 + u * 0.45) + Math.sin(t * 4 + i * 0.6 + st.a * 3) * 0.1 * u,
              0.12 + u * 0.18 + Math.sin(t * 5 - i * 0.8 + st.a) * 0.1 * u * k,
              bz - u * 1.0
            );
          });
        }
      },
    };
  }
  return null;
}

function applyHat(id) {
  if (!norun.hatMats) return;
  const h = HAT_COLORS.find((x) => x.id === id) || HAT_COLORS[0];
  for (const m of norun.hatMats) {
    if (h.color == null) m.color.copy(m.userData.baseColor);
    else m.color.set(h.color);
  }
}

function applyFormLook(id) {
  if (!norun.model) return;
  const lk = formOf(id).look || {};
  const op = lk.opacity ?? 1;
  for (const m of norun.bodyMats) {
    m.color.copy(m.userData.baseColor);
    if (lk.body != null) m.color.multiply(new THREE.Color(lk.body));
    m.transparent = op < 1;
    m.opacity = op;
    m.depthWrite = op >= 1;
    m.needsUpdate = true;
  }
  if (formLook.addon) {
    norun.body.remove(formLook.addon.group);
    disposeObj(formLook.addon.group);
  }
  formLook.addon = lk.addon ? buildAddon(lk.addon) : null;
  if (formLook.addon) norun.body.add(formLook.addon.group);
  formLook.id = id;
}

function animateAddon(dt, t) {
  if (!formLook.addon) return;
  const k = state === "play" ? 1.3 : 0.8;
  formLook.addon.update(t, k);
}

/* のるんの見た目の状態 */
const look = {
  squash: 0,        // + でつぶれ、- でのび
  surprise: 0,      // 0〜1 びっくり顔
  hatPop: 0,        // 0〜1 帽子が浮く
  blinkT: 2, blink: 0,
  star: { a: 0, v: 0, b: 0, w: 0 },   // 星の揺れ（ばね）
  spin: 0,
  // 走る時の 左右の揺れ（体は足もとを支点に揺れ、帽子と星は少し遅れてついてくる）
  swayPhase: 0, swayAmp: 0, sway: 0, swayVel: 0,
  hatLag: { a: 0, v: 0 },
};
const SWAY = { angle: 0.17, twist: 0.07, speed: 9.6 };   // 角度（ラジアン）・ひねり・速さ（2回跳ねるごとに左右1往復）

function updateNorunLook(dt, t, ax, ay) {
  if (!norun.model) return;
  // ぷにぷに：つぶれ・のび（体ごと。帽子も一緒に）
  const s = look.squash;
  norun.body.scale.set(1 + s * 0.8, 1 - s, 1 + s * 0.8);

  // 走る揺れ：左右に ゆらゆら（メニューでは ゆっくり小さく）
  const running = state === "play" || state === "ready";
  look.swayAmp = damp(look.swayAmp, running ? 1 : state === "menu" ? 0.3 : 0, 6, dt);
  look.swayPhase += dt * (running ? SWAY.speed : 3.5);
  const prevSway = look.sway, prevSwayVel = look.swayVel;
  look.sway = Math.sin(look.swayPhase) * SWAY.angle * look.swayAmp;
  look.swayVel = (look.sway - prevSway) / Math.max(dt, 1e-4);
  const swayAcc = (look.swayVel - prevSwayVel) / Math.max(dt, 1e-4);
  norun.body.rotation.set(0, Math.sin(look.swayPhase) * SWAY.twist * look.swayAmp, look.sway);
  // 帽子：体の揺れを ばねで追いかける（少し遅れる）
  const hl = look.hatLag;
  hl.v += (-(hl.a - look.sway) * 90 - hl.v * 9) * dt;
  hl.a += hl.v * dt;
  const hatLagRel = clamp(hl.a - look.sway, -0.25, 0.25);

  // まばたき
  look.blinkT -= dt;
  if (look.blinkT <= 0) { look.blink = 0.14; look.blinkT = rand(2, 4.5); }
  look.blink = Math.max(0, look.blink - dt);
  const blinkK = look.blink > 0 && look.surprise < 0.1 ? 0.15 : 1;

  // びっくり顔：目の形は そのまま（大きくすると鋭く見えて怖いので）。
  // 口を「お」の形に開けて、頭の上に「！」を出す
  const sp = look.surprise;
  norun.eyeL.scale.set(1, blinkK, 1);
  norun.eyeR.scale.set(1, blinkK, 1);
  const om = clamp((sp - 0.15) / 0.85, 0, 1);
  norun.mouth.userData.parts.forEach((c) => { c.visible = om < 0.5; });
  openMouth.visible = om > 0.02;
  openMouth.scale.setScalar(0.4 + om * 0.6);
  const ex = clamp((sp - 0.05) / 0.5, 0, 1);
  bang.visible = ex > 0.02;
  const pop = ex < 1 ? ex * 1.25 : 1 + Math.sin(t * 9) * 0.04;   // ぽんっと出て、少しはずむ
  bang.scale.set(0.9 * pop, 0.9 * pop, 1);
  bang.position.y = 2.15 + me.y * 0 + Math.sin(t * 6) * 0.04;

  // 変身の飾り（しっぽ・あし）をゆらす
  animateAddon(dt, t);

  // 帽子ポップ
  const hp = look.hatPop;
  const hb = norun.hat.userData;
  norun.hat.position.copy(hb.basePos);
  norun.hat.position.y += hp * 0.95 + (hp > 0 ? Math.sin(t * 6) * 0.04 * hp : 0);
  norun.hat.rotation.set(0, 0, (hp > 0 ? Math.sin(t * 5) * 0.15 * hp : 0) + hatLagRel);
  norun.hat.quaternion.premultiply(hb.baseQuat);

  // 星の揺れ：横の加速・縦の加速で振られて、ばねで戻る
  const st = look.star;
  st.v += (-st.a * 70 - st.v * 5 + ax * 0.06 - clamp(swayAcc, -40, 40) * 0.5) * dt;
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
  stump: shared(new THREE.CylinderGeometry(0.62, 0.72, 0.58, 16)),
  stumpTop: shared(new THREE.CircleGeometry(0.62, 16)),
  trunk: shared(new THREE.CylinderGeometry(0.55, 0.7, 3.2, 12)),
  leaves: shared(new THREE.SphereGeometry(1.05, 14, 10)),
  post: shared(new THREE.CylinderGeometry(0.1, 0.1, 1.6, 8)),
  bar: shared(new THREE.CylinderGeometry(0.16, 0.16, LANE_W - 0.2, 10)),
  picket: shared(new THREE.BoxGeometry(0.22, 1.9, 0.12)),
  rail: shared(new THREE.BoxGeometry(LANE_W - 0.3, 0.16, 0.1)),
};
const MAT = {
  log: sharedMat(lambert(0xb0753f)),
  logEnd: sharedMat(lambert(0xe8c48c)),
  rock: sharedMat(new THREE.MeshLambertMaterial({ color: 0xa3a8b8, flatShading: true })),
  bark: sharedMat(lambert(0x8a5a33)),
  leaves: sharedMat(lambert(0x3f9a4f)),
  post: sharedMat(lambert(0xffffff)),
  bar: sharedMat(lambert(0xff7eb6)),
  fence: sharedMat(lambert(0xd9a066)),
};

function makeObstacle(kind) {
  const g = new THREE.Group();
  if (kind === "L" && theme.obsL === "stump") {   // きりかぶ：ジャンプでこえる
    const s = new THREE.Mesh(GEO.stump, MAT.log);
    s.position.y = 0.29;
    const top = new THREE.Mesh(GEO.stumpTop, MAT.logEnd);
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.585;
    g.add(s, top);
  } else if (kind === "T" && theme.obsT === "bigtree") {   // 大きな木：よける
    const tr = new THREE.Mesh(GEO.trunk, MAT.bark);
    tr.position.y = 1.6;
    const lv = new THREE.Mesh(GEO.leaves, MAT.leaves);
    lv.position.y = 3.4;
    lv.scale.set(1.0, 0.9, 1.0);
    g.add(tr, lv);
  } else if (kind === "L") {          // ひくい丸太：ジャンプでこえる
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
  // 足もとの影
  if (kind === "L") g.add(blobShadow(theme.obsL === "stump" ? 0.85 : 1.05, 1, theme.obsL === "stump" ? 0.85 : 0.5));
  else if (kind === "T") g.add(blobShadow(1.15, 1, 0.85));
  return g;
}

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

/* 問題ゾーン（ゲートの手前）の床：テーマの色に「？」もよう。テクスチャはテーマごとに1つ作って使い回す */
const zoneTexCache = {};
function zoneTexture() {
  const key = theme.zone;
  if (zoneTexCache[key]) return zoneTexCache[key];
  const col = `#${new THREE.Color(theme.zone).getHexString()}`;
  const tex = canvasTex(256, 512, (x, w, h) => {
    x.fillStyle = col; x.fillRect(0, 0, w, h);
    x.fillStyle = "rgba(255,255,255,.45)";
    for (let i = 0; i < 6; i++) x.fillRect(0, i * 14, w, 7);        // 入り口のしま
    x.font = `bold 64px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillStyle = "rgba(255,255,255,.5)";
    [[64, 170], [192, 260], [64, 350], [192, 440]].forEach(([px, py]) => x.fillText("？", px, py));
    x.strokeStyle = "rgba(255,255,255,.8)"; x.lineWidth = 8;
    x.strokeRect(4, -10, w - 8, h + 20);                             // 両はしの白い線
  });
  tex.userData.keep = true;
  zoneTexCache[key] = tex;
  return tex;
}
const ZONE_LEN = 15;

function makeGate(item) {
  const g = new THREE.Group();
  const zoneMat = new THREE.MeshLambertMaterial({ map: zoneTexture() });
  zoneMat.userData.keepMap = true;
  const zone = new THREE.Mesh(new THREE.PlaneGeometry(LANE_W * 3 + 0.4, ZONE_LEN), zoneMat);
  zone.rotation.x = -Math.PI / 2;
  zone.rotation.z = Math.PI;       // 入り口のしまを手前に
  zone.position.set(0, 0.012, -ZONE_LEN / 2);
  g.add(zone);
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

/* コース：def.kind = stage（ステージ）/ dan（かけざん）/ endless（エンドレス）
   エンドレスは走りながら先を継ぎ足していく（extend） */
function makeCourse(def) {
  const c = { items: [], d: 28, gi: 0, lastVariant: "", goalD: Infinity, gates: 0, extend: () => {} };
  const addRows = (rows) => {
    for (let r = 0; r < rows; r++) {
      c.d += def.rowGap;
      const variants = PATTERNS[pickWeighted(def.patterns)];
      let v = variants[randInt(0, variants.length - 1)];
      if (v === c.lastVariant && variants.length > 1) v = variants[(variants.indexOf(v) + 1) % variants.length];
      c.lastVariant = v;
      [...v].forEach((ch, lane) => { if (ch !== ".") c.items.push({ type: "obs", kind: ch, lane, d: c.d }); });
    }
  };
  const addGate = (q, n) => {
    c.d += def.rowGap + 8;
    const choices = makeChoices(q, n);
    const laneChoice = [-1, -1, -1];
    if (n >= 3) {
      laneChoice.splice(0, 3, 0, 1, 2);   // 3択：3レーンぜんぶ扉（どこでも通れる）
    } else {
      const wall = randInt(0, 2);        // 2択：1レーンは通れない壁
      let k = 0;
      for (let lane = 0; lane < 3; lane++) if (lane !== wall) laneChoice[lane] = k++;
    }
    c.items.push({ type: "gate", d: c.d, q, choices, laneChoice, no: ++c.gates });
    c.d += 18;
    c.gi++;
  };

  if (def.kind === "endless") {
    c.extend = (dist) => {
      while (c.d - dist < 190) {
        addRows(randInt(def.rowsMin, def.rowsMax));
        const n = c.gi >= def.threeFrom && Math.random() < def.threeRate ? 3 : 2;
        addGate(makeQuestion("mixed"), n);
      }
    };
    c.extend(0);
  } else {
    def.sections.forEach((rows, gi) => {
      addRows(rows);
      const n = Array.isArray(def.choices) ? def.choices[gi] : def.choices;
      addGate(def.questions ? def.questions[gi] : makeQuestion(player.difficulty), n);
    });
    c.goalD = c.d + 26;
    c.items.push({ type: "goal", d: c.goalD });
  }
  return c;
}

/* ランの設定を作る（「もういちど」で作り直せるように関数で持つ） */
function stageDef(stage) {
  return () => ({ kind: "stage", ...stage, title: stage.name });
}
function danDef(dan, order) {
  return () => ({
    kind: "dan", dan, order, ...DAN_RUN,
    title: `${dan}の だん（${order ? "じゅんばん" : "ランダム"}）`,
    sections: Array(9).fill(DAN_RUN.rowsPerSection),
    questions: makeDanQuestions(dan, order),
  });
}
function endlessDef() {
  return () => ({ kind: "endless", ...ENDLESS_RUN, title: "エンドレス" });
}

/* =========================================================
   ゲームの状態
   ========================================================= */
let player = null;          // いま遊んでいる人のデータ
let state = "loading";      // loading | menu | ready | play | fail | clear
let run = null;             // 1回のランの情報

const me = { lane: 1, x: 0, y: 0, vy: 0, jumps: 0, rollT: 0, prevVx: 0, vx: 0, prevVy: 0 };

function formOf(id) { return FORMS.find((f) => f.id === id) || FORMS[0]; }

function startRun(makeDef, formId) {
  clearRun();
  const def = makeDef();
  const form = formOf(formId);
  applyTheme(def.theme);         // 障害物の見た目もテーマで決まるので、コースを作る前に
  applyFormLook(form.id);
  applyHat(player.hat);
  const course = makeCourse(def);
  run = {
    bounce: 0, makeDef, def, correct: 0,
    form, course, dist: 0, next: 0, active: [], t: 0, endT: 0, reason: null, failGate: null,
    // ランでは どの姿でも 速さ・動きは同じ（変身は見た目と図鑑。特技はアスレ／塔モードで使う）
    speed: def.speed,
    laneK: 14,
  };
  const endless = def.kind === "endless";
  $("progress").classList.toggle("hidden", endless);
  $("meter").classList.toggle("hidden", !endless);
  Object.assign(me, { lane: 1, x: 0, y: 0, vy: 0, jumps: 0, rollT: 0, vx: 0 });
  Object.assign(look, { surprise: 0, hatPop: 0, spin: 0 });
  $("formBadge").textContent = form.art;
  $("btnRoll").classList.add("hidden");
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
  if (it.kind === "L") return me.y < 0.62;
  return true;   // T（たかい）・B・F はよけるしかない
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
  run.course.extend(run.dist);
  // エンドレス：すすむほど 少しずつ速くなる
  if (run.def.kind === "endless") {
    run.speed = Math.min(run.def.maxSpeed, run.def.speed + (run.dist / 100) * run.def.speedUp);
  }
  spawnAhead();
  // エンドレスで たまった古いデータを捨てる
  if (run.next > 120) {
    run.course.items.splice(0, 60);
    run.next -= 60;
  }

  // 物の位置
  for (const it of run.active) {
    it.obj.position.z = it.d - run.dist;
    // のるんを通りすぎた障害物は消す（大きな木などがカメラの前をふさがないように。ぶつかった物は残す）
    if (it.type === "obs" && it !== run.hitObs) it.obj.visible = it.obj.position.z > (CLASSIC ? -1.6 : -0.9);
  }

  if (moving) {
    // 当たり判定
    for (const it of run.active) {
      const z = it.d - run.dist;
      if (it.type === "obs" && !it.passed) {
        if (Math.abs(z) < 0.75 && touchesLane(it.lane) && hitsObstacle(it)) { run.hitObs = it; fail("hit"); break; }
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
    // 出題の表示：ゲートが見えてきたら（失敗・ゴールした時は出さない）
    const g = run.active.find((it) => it.type === "gate" && !it.passed);
    if (state === "play" && g && g.d - run.dist < 62) showQuestion(g.q); else hideQuestion();
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
    run.correct++;
    sparkle(0xffe066);
    starBurst();
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
  if (run.def.kind === "endless") endlessReward();
}

/* 小物（いまは帽子の色）を n こ もらう。まだ持っていない色から えらぶ */
function grantHats(n) {
  const got = [];
  for (let i = 0; i < n; i++) {
    const pool = HAT_COLORS.filter((h) => !player.hats.includes(h.id));
    if (!pool.length) break;
    const h = pool[randInt(0, pool.length - 1)];
    player.hats.push(h.id);
    got.push(h);
  }
  return got;
}

function endlessReward() {
  const m = Math.floor(run.dist);
  const every = run.def.rewardEvery;
  run.meters = m;
  run.isBest = m > (player.bestEndless || 0);
  if (run.isBest) player.bestEndless = m;
  run.hatsGot = grantHats(Math.floor(run.correct / every));   // せいかい10もんごとに 小物1つ
  run.toNext = every - (run.correct % every);
  store.savePlayer(player);
}

function clearStage() {
  state = "clear";
  run.endT = 0;
  hideQuestion();
  toast("ゴール！ 🎉", 1400);
  confetti();
  for (let i = 0; i < 4; i++) setTimeout(() => sparkle([0xff7eb6, 0xffe066, 0x7ec8ff, 0x8be08b][i]), i * 180);
  const def = run.def;
  run.reward = null;
  run.hatsGot = [];
  if (def.kind === "stage") {
    // ステージ：はじめてクリアした時に 新しい変身
    if (!player.cleared.includes(def.id)) {
      player.cleared.push(def.id);
      const rw = def.reward;
      if (rw && rw.type === "form" && !player.forms.includes(rw.id)) {
        player.forms.push(rw.id);
        run.reward = rw;
      }
    }
  } else if (def.kind === "dan") {
    // かけざん：クリアするたびに 小物（帽子の色）を1つ
    const list = player.danCleared[def.order ? "order" : "random"];
    if (!list.includes(def.dan)) list.push(def.dan);
    run.hatsGot = grantHats(1);
  }
  store.savePlayer(player);
}

function hatsText(got) {
  return got.map((h) => `👒 ぼうしの いろ「${h.name}」`).join("\n");
}

function failAnswerText() {
  let t = "ぶつかっちゃった！\nもういちど チャレンジしよう";
  if (run.reason === "wrong" || run.reason === "wall") {
    const q = run.failGate.q;
    const ans = q.ans;
    t = run.reason === "wall" ? "とびらの ない かべに ぶつかった！\n" : "";
    t += q.dots
      ? `${dots(q.a)} ${OP_WORD[q.op]} ${dots(q.b)}\nこたえは ${dots(ans) || "0こ"}（${ans}）だったよ`
      : `${q.a} ${q.op} ${q.b} の こたえは ${ans} だったよ`;
  }
  return t;
}

function showResult() {
  const ok = state === "clear";
  const def = run.def;
  $("hud").classList.add("hidden");
  let icon, title, text, next = false;
  if (def.kind === "endless") {
    icon = run.hatsGot.length ? "👒" : "🏃";
    title = `${run.meters}m はしった！`;
    text = `せいかい ${run.correct}もん\nさいこう きろく ${player.bestEndless}m${run.isBest && run.meters > 0 ? "（しんきろく！）" : ""}`;
    if (run.hatsGot.length) text += `\n\nごほうび！\n${hatsText(run.hatsGot)}\nきせかえで かえられるよ`;
    else if (player.hats.length < HAT_COLORS.length) text += `\n\nあと ${run.toNext}もん せいかいで 小物が もらえるよ`;
    if (run.reason !== "hit") text += `\n\n${failAnswerText()}`;
  } else if (ok) {
    icon = "🎉";
    title = def.kind === "dan" ? `${def.title} クリア！` : "ステージクリア！";
    text = def.kind === "dan" ? `9もん ぜんぶ せいかい！` : `「${def.name}」を クリアしたよ！`;
    if (run.reward) {
      const f = formOf(run.reward.id);
      text += `\n\nあたらしい へんしん\n${f.art}「${f.name}」を てにいれた！\nずかんに とうろくしたよ`;
      icon = f.art;
    }
    if (run.hatsGot.length) {
      text += `\n\nごほうび！\n${hatsText(run.hatsGot)}\nきせかえで かえられるよ`;
      icon = "👒";
    } else if (def.kind === "dan") {
      text += "\n\nぼうしの いろは ぜんぶ もってるよ！";
    }
    const nextStage = def.kind === "stage" && STAGES.find((s) => s.id === def.id + 1);
    next = !!(nextStage && nextStage.ready);
  } else {
    icon = "💫";
    title = "ざんねん！";
    text = failAnswerText();
  }
  $("resultIcon").textContent = icon;
  $("resultTitle").textContent = title;
  $("resultText").textContent = text;
  $("btnNext").classList.toggle("hidden", !next);
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
  if (run.def.kind === "endless") {
    const every = run.def.rewardEvery;
    $("meter").textContent = `${Math.floor(run.dist)}m ・ ごほうびまで あと${every - (run.correct % every)}もん`;
    return;
  }
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
  if (me.jumps >= 1) return;
  me.jumps++;
  me.rollT = 0;
  me.vy = JUMP_V * (me.jumps === 2 ? 0.85 : 1);
  look.squash = -0.2;
}
function roll() {
  return;   // ころがりはアスレ用（ランでは使わない）
  // eslint-disable-next-line no-unreachable
  if (state !== "play") return;
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
const SCREENS = ["scTitle", "scNewPlayer", "scConfirm", "scHome", "scRunMenu", "scStages", "scDan", "scDress", "scForms", "scResult"];
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
  if (!player.forms.includes(player.form)) player.form = "norun";
  if (!player.hats.includes(player.hat)) player.hat = "default";
  player.danCleared = { order: [], random: [], ...(player.danCleared || {}) };
  applyFormLook(player.form);
  applyHat(player.hat);
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
$("btnRun").onclick = () => showScreen("scRunMenu");
$("btnZukan").onclick = () => openForms(null);
$("btnDress").onclick = () => openDress();

// ---- ランタイプのメニュー ----
$("btnModeStage").onclick = () => { renderStages(); showScreen("scStages"); };
$("btnModeDan").onclick = () => { renderDan(); showScreen("scDan"); };
$("btnModeEndless").onclick = () => openForms(endlessDef(), ENDLESS_RUN.theme, "scRunMenu");
$("btnRunMenuBack").onclick = () => showScreen("scHome");

// ---- かけざん：段えらび ----
let danPick = 1, danOrder = true;
function renderDan() {
  const grid = $("danGrid");
  grid.innerHTML = "";
  const done = player.danCleared[danOrder ? "order" : "random"];
  for (let n = 1; n <= 9; n++) {
    const b = document.createElement("button");
    b.className = "chip dan" + (danPick === n ? " on" : "");
    b.innerHTML = `${n}の だん${done.includes(n) ? "<br>⭐" : ""}`;
    b.onclick = () => { danPick = n; renderDan(); };
    grid.append(b);
  }
  $("btnDanOrder").classList.toggle("on", danOrder);
  $("btnDanRandom").classList.toggle("on", !danOrder);
  $("danNote").textContent = danOrder
    ? `${danPick}×1 から ${danPick}×9 まで じゅんばんに 9もん`
    : `${danPick}の だんから ばらばらに 9もん`;
}
$("btnDanOrder").onclick = () => { danOrder = true; renderDan(); };
$("btnDanRandom").onclick = () => { danOrder = false; renderDan(); };
$("btnDanGo").onclick = () => openForms(danDef(danPick, danOrder), DAN_RUN.theme, "scDan");
$("btnDanBack").onclick = () => showScreen("scRunMenu");

// ---- きせかえ（帽子の色。ピンズはモデル改修後） ----
let dressPick = "default";
function openDress() {
  dressPick = player.hat;
  applyFormLook(player.form);
  renderDress();
  showScreen("scDress");
}
function renderDress() {
  const grid = $("hatGrid");
  grid.innerHTML = "";
  for (const h of HAT_COLORS) {
    const has = player.hats.includes(h.id);
    const b = document.createElement("button");
    b.className = "hat" + (dressPick === h.id ? " on" : "");
    b.innerHTML = has
      ? `<span class="sw" style="background:${h.swatch}"></span>${h.name}`
      : `<span class="sw lock">？</span>？？？`;
    b.disabled = !has;
    b.onclick = () => { dressPick = h.id; applyHat(h.id); player.hat = h.id; store.savePlayer(player); renderDress(); };
    grid.append(b);
  }
  $("hatCount").textContent = `あつめた いろ ${player.hats.length}/${HAT_COLORS.length}（かけざん・エンドレスで もらえるよ）`;
}
$("btnDressBack").onclick = () => showScreen("scHome");
$("btnSwitch").onclick = () => { player = null; applyFormLook("norun"); applyHat("default"); renderTitle(); toMenu("scTitle"); };

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
    b.onclick = () => openForms(stageDef(s), s.theme, "scStages");
    list.append(b);
  }
}
$("btnStagesBack").onclick = () => showScreen("scRunMenu");

// ---- 図鑑（stage があればスタート前の変身えらび） ----
let formsDef = null, formsBack = "scHome", pickedForm = "norun";
/* makeDef があれば スタート前の変身えらび、無ければ 図鑑を見るだけ */
function openForms(makeDef, themeName = "field", back = "scHome") {
  formsDef = makeDef;
  formsBack = makeDef ? back : "scHome";
  pickedForm = player.forms.includes(player.form) ? player.form : "norun";
  $("formsTitle").textContent = makeDef ? "どの すがたで いく？" : "ずかん";
  $("btnFormsGo").classList.toggle("hidden", !makeDef);
  applyTheme(themeName);   // スタート前は そのコースの景色を見せる
  applyFormLook(pickedForm);
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
    b.onclick = () => { pickedForm = f.id; applyFormLook(f.id); renderForms(); };
    list.append(b);
  }
  const f = formOf(pickedForm);
  const got = player.forms.length, all = FORMS.length;
  $("formDesc").textContent = `${f.art} ${f.name}：${f.desc}（あつめた すがた ${got}/${all}）`;
}
$("btnFormsGo").onclick = () => {
  player.form = pickedForm;
  store.savePlayer(player);
  startRun(formsDef, pickedForm);
};
$("btnFormsBack").onclick = () => {
  applyTheme("field");
  applyFormLook(player.form);
  if (formsBack === "scStages") renderStages();
  if (formsBack === "scDan") renderDan();
  showScreen(formsBack);
};

// ---- 結果 ----
$("btnRetry").onclick = () => startRun(run.makeDef, run.form.id);
$("btnNext").onclick = () => {
  const s = STAGES.find((x) => x.id === run.def.id + 1);
  openForms(stageDef(s), s.theme);
};
$("btnToHome").onclick = () => { applyTheme("field"); renderHome(); toMenu("scHome"); };
$("btnQuit").onclick = () => { applyTheme("field"); renderHome(); toMenu("scHome"); };

/* =========================================================
   毎フレームの更新
   ========================================================= */
let shakeT = 0;
let faceAngle = Math.PI, showcase = 1;
const _camLook = new THREE.Vector3();

function updateMe(dt) {
  const inRun = run && (state === "play" || state === "ready");

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
    me.vy -= g * dt;
    me.y += me.vy * dt;
    if (me.y <= 0) {
      if (me.vy < -2) look.squash = Math.min(0.32, 0.1 + -me.vy * 0.025);   // 着地でつぶれる
      if (state === "play" && me.vy < -2) dust();
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
  edgeScroll += speed * dt;
  scrollGround(edgeScroll);
  for (const d of dashes) {
    d.position.z -= speed * dt;
    if (d.position.z < -4) d.position.z += DASH_SPAN;   // カメラの近くまで来たら先に回す
  }
  for (const o of decor) {
    o.position.z -= speed * dt;
    if (o.position.z < -12) placeDecor(o, false);
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
    lerp(CAM.y, 1.75, showcase) + rand(-sh, sh),
    lerp(CAM.z, -4.6, showcase)
  );
  _camLook.set(lerp(me.x * 0.35, me.x, showcase), lerp(CAM.lookY, 0.75, showcase), lerp(CAM.lookZ, 0, showcase));
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
  updateFx(dt, t);
  updateCamera(dt, t);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

/* =========================================================
   起動
   ========================================================= */
tick();
try {
  await Promise.all([loadNorun(), setupRoadside()]);
  applyTheme("field");
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
    selectPlayer, startRun, openForms, toMenu, renderHome, jump, moveLane, roll, fail, applyFormLook, applyTheme,
    applyHat, stageDef, danDef, endlessDef, openDress, renderer,
    nextObstacle() {
      return run && run.active.filter((i) => !i.passed).sort((a, b) => a.d - b.d)[0];
    },
  };
  document.title = "ready";
}
