/* =========================================================
   アスレ（コース登り）と ASMRタワー（素材テーマの タワー）
   ※ 中の名前は もとの「塔」のまま（tower）。画面の 表示名は「アスレ」
   コースの部品を 自動で 上へ つないで、のぼりつづける。頂上なし
   - 移動は バーチャルパッド（たおした 方向にだけ 進み、はなすと 止まる）。ジャンプは ボタン
   - 落ちたら 直前の チェックポイント（旗）から すぐ やりなおし。何回でも OK
   - 記録＝のった足場の いちばん高い所（m）
   - キャラ（変身）：のるん／くらげ（二段ジャンプ・ふわり）／パン（すべる）。とくぎの 部品は その キャラの 時だけ 出る
   - ASMRタワー：区間ごとに 素材テーマ（しゃりしゃり・ぷにぷに・ねばねば…）。足場の 見た目・足音・はね・すべりが かわる
   - 第12弾：アスレに「コース」（ゴールあり・4つ）を 追加。エンドレスは そのまま。
     新しい しかけ：溶岩（落ちたら はたから）・むかってくる レーザー（ジャンプで よける）・こおりの 床・くずれる 足場
   ========================================================= */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/GLTFLoader.js";
import { findPinSlots, applyPins } from "./norun-model.js";
import { PLAY_TOWER as P, CHARACTERS, PAN_SLIDE, ASMR_THEMES, ASMR, OBAKE, PENGUIN, SHAPE_SOUND, ASMR_CAM, ATHLE_COURSES } from "./config.js";
import { buildRoom, LOOK, themeOf } from "./asmr-rooms.js";

const W = P.laneW;
const LANE_X = [W, 0, -W];            // 0=画面の左（カメラは 後ろから +Z を見る）
const FULL = W * 3;                   // 3レーンぶんの はば
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const lambert = (c, e = 0.18) => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: e });
const NORMAL = { walk: 1, jump: 1, grip: 16, bounce: 0, sink: 0.12, stepEvery: 1 };   // ふつうの 床

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

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* ---------- 景色：雲・遠くの 塔 ---------- */
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
const COL = { floor: 0x9be39b, stair: 0xffd86b, step: 0x8fd3ff, gap: 0xff9ec7, zig: 0xc7a8ff, mover: 0xffa64d, bar: 0x9be3d6, wall: 0x8fd3ff,
  vanish: 0xb6a4ff, conv: 0x8b9bb4, door: 0xff9e5e, wind: 0xa8e6ff, duck: 0xffcf66, wide: 0x9be3d6,
  rock: 0x6b5a66, laser: 0x9aa6c8, ice: 0xbfefff, crumble: 0xc9a27a, goal: 0xffe17a };
const topMats = new Map();
function topMatOf(c) {   // 上の面は 部品の色を うすくした色
  if (!topMats.has(c)) {
    const col = new THREE.Color(c).lerp(new THREE.Color(0xffffff), 0.62);
    topMats.set(c, new THREE.MeshLambertMaterial({ color: col, emissive: col, emissiveIntensity: 0.22 }));
  }
  return topMats.get(c);
}
const padMat = lambert(0xff5fa2, 0.35);
// 流れる床の もよう（やじるし）。上の面では 絵の 右＝ワールドの +x、絵の 下＝ワールドの +z（前）
const arrowTex = (dir) => canvasTex(128, 128, (x, w, h) => {
  x.fillStyle = "#8b9bb4"; x.fillRect(0, 0, w, h);
  x.strokeStyle = "#ffe066"; x.lineWidth = 14; x.lineJoin = "round"; x.lineCap = "round";
  x.save();
  x.translate(w / 2, h / 2);
  x.rotate({ up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[dir]);
  x.translate(-w / 2, -h / 2);
  for (const oy of [24, 88]) { x.beginPath(); x.moveTo(24, oy + 26); x.lineTo(64, oy - 6); x.lineTo(104, oy + 26); x.stroke(); }
  x.restore();
});

const solids = [];      // { x0, x1, y0, y1, z0, z1, g, mov?, pad?, mat?, van?, conv?, off? }
const bars = [];        // { cx, cz, y, half, ang, sp, g }
const flags = [];       // { z, y, g, cloth, hit }
const beams = [];       // むかってくる レーザー（{ z, y, sec, g, dbl }）
const extras = [];      // 景色や しかけ（{ z, g, update?(dt,t) }）
const zones = [];       // 風・スイッチなどの 区間（{ kind, x0, x1, z0, z1, y, ... }）
function addBox(x0, x1, y0, y1, z0, z1, color, opt = {}) {
  const g = new THREE.Group();
  const h = y1 - y0;
  const bodyMat = opt.pad ? padMat : lambert(color);
  const body = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, h, z1 - z0), bodyMat);
  body.position.y = -h / 2;
  g.add(body);
  if (opt.pad) {   // ジャンプ台の しるし
    for (const lx of LANE_X) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.09, 8, 24), lambert(0xffffff, 0.5));
      ring.rotation.x = Math.PI / 2; ring.position.set(lx - (x0 + x1) / 2, 0.02, 0);
      g.add(ring);
    }
  } else {
    let topMat;
    if (opt.conv) {
      const dir = opt.conv.x > 0 ? "right" : opt.conv.x < 0 ? "left" : opt.conv.z > 0 ? "down" : "up";
      topMat = new THREE.MeshLambertMaterial({ map: arrowTex(dir), emissive: 0xffffff, emissiveIntensity: 0.1 });
      topMat.map.repeat.set((x1 - x0) / 2.4, (z1 - z0) / 2.4);
      opt.conv.tex = topMat.map;
    } else topMat = topMatOf(color);
    const top = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + 0.04, 0.08, z1 - z0 + 0.04), topMat);
    top.position.y = -0.03;
    g.add(top);
  }
  g.position.set((x0 + x1) / 2, y1, (z0 + z1) / 2);
  scene.add(g);
  const s = { x0, x1, y0, y1, z0, z1, g, ...opt };
  solids.push(s);
  return s;
}
const laneBox = (l, y0, y1, z0, z1, c, opt) => addBox(LANE_X[l] - W / 2 + 0.05, LANE_X[l] + W / 2 - 0.05, y0, y1, z0, z1, c, opt);
const fullBox = (y0, y1, z0, z1, c, opt) => addBox(-FULL / 2, FULL / 2, y0, y1, z0, z1, c, opt);
function disposeGroup(g) { scene.remove(g); g.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }

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
/* 看板（ASMR の テーマ名・とくぎの ヒント） */
function addSign(z, y, text, sub, color = "#ff7eb6", wide = 3.4) {
  const tex = canvasTex(Math.round(512 * wide / 3.4), 160, (x, w, h) => {
    x.fillStyle = "rgba(255,255,255,.92)"; x.beginPath(); x.roundRect(6, 6, w - 12, h - 12, 40); x.fill();
    x.strokeStyle = color; x.lineWidth = 10; x.stroke();
    x.fillStyle = "#3b2a5a"; x.textAlign = "center"; x.textBaseline = "middle";
    // ながい 文は 字を 小さく して 看板に おさめる（第13弾）
    let px = 64; x.font = `900 ${px}px "NorunMaru","Hiragino Maru Gothic ProN","Rounded Mplus 1c",sans-serif`;
    while (px > 30 && x.measureText(text).width > w - 56) { px -= 2; x.font = `900 ${px}px "NorunMaru","Hiragino Maru Gothic ProN","Rounded Mplus 1c",sans-serif`; }
    x.fillText(text, w / 2, sub ? 64 : h / 2);
    if (sub) {
      let sp = 34; x.font = `800 ${sp}px "NorunMaru","Hiragino Maru Gothic ProN",sans-serif`;
      while (sp > 20 && x.measureText(sub).width > w - 56) { sp -= 2; x.font = `800 ${sp}px "NorunMaru","Hiragino Maru Gothic ProN",sans-serif`; }
      x.fillStyle = "#7d6b9c"; x.fillText(sub, w / 2, 118);
    }
  });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(wide, 1.06), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  m.position.set(0, y + 4.3, z);
  m.rotation.y = Math.PI;   // カメラ（後ろ）の方を むく
  m.renderOrder = 5;
  scene.add(m);
  extras.push({ z, g: m, sign: true });
}

/* ---------- 部品 ---------- */
const B = { z: 0, y: 0, last: "", n: 0, mode: "athle", theme: 0, secLeft: 0, char: "norun", dy: 0, course: null };   // dy：むずかしさ（エンドレスは 高さ ＝ dy）
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
      B.z += rand(1.4, Math.min(2.5, 1.7 + B.dy * 0.02));
      B.y += rand(0, 0.45);
      const len = rand(3, 4.2);
      fullBox(B.y - 0.6, B.y, B.z, B.z + len, COL.gap);
      B.z += len;
    }
  },
  steps() {    // はしごの ような 高い段（ジャンプで のぼる）
    const k = randInt(3, 4), dep = 2.6;
    const up = 1.0;
    for (let i = 0; i < k; i++) {
      B.y += rand(0.85, 1.05) * up;
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
  zigzag() {   // 1本道が 左右に ずれる（となりの 道と 重なっている 間に うつる）
    let l = randInt(0, 2);
    const k = randInt(3, 4), lap = 1.8;
    for (let i = 0; i < k; i++) {
      const len = rand(4.6, 5.6);
      laneBox(l, B.y - 0.6, B.y, B.z - (i ? lap : 0), B.z + len, COL.zig);
      B.z += len;
      l = l === 0 ? 1 : l === 2 ? 1 : (Math.random() < 0.5 ? 0 : 2);
    }
  },
  mover() {    // 左右に 動く足場
    const k = randInt(1, 2);
    for (let i = 0; i < k; i++) {
      const len = rand(5, 6);
      const s = laneBox(1, B.y - 0.5, B.y, B.z, B.z + len, COL.mover, { mov: { ph: rand(0, 6.28), sp: rand(1.5, 1.9) + B.dy * 0.004, dx: 0 } });
      s.w = s.x1 - s.x0;
      B.z += len;
      if (i < k - 1) { fullBox(B.y - 0.6, B.y, B.z, B.z + 2.4, COL.floor); B.z += 2.4; }
    }
  },
  bar() {      // 回るバー（ジャンプで よける）
    const len = 11;
    fullBox(B.y - 0.6, B.y, B.z, B.z + len, COL.bar);
    const cz = B.z + len / 2;
    addBox(-0.28, 0.28, B.y, B.y + 1.2, cz - 0.28, cz + 0.28, 0xffffff);
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
    bars.push({ cx: 0, cz, y: B.y, half, ang: rand(0, 6.28), sp: (Math.random() < 0.5 ? -1 : 1) * (1.3 + Math.min(0.6, B.dy * 0.006)), g });
    B.z += len;
  },

  /* ---- 2026-11-07 追加の しかけ ---- */
  vanish() {   // 消える足場：のって 少しすると ちかちか → 消える → しばらくして もどる
    const k = randInt(4, 5);
    let l = randInt(0, 2);
    for (let i = 0; i < k; i++) {
      B.z += 0.6;
      B.y += rand(0, 0.3);
      const s = addBox(LANE_X[l] - 1.15, LANE_X[l] + 1.15, B.y - 0.4, B.y, B.z, B.z + 2.3, COL.vanish, { van: { t: -1, offT: 0 } });
      // 点線の ふち（消える足場の しるし）
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.06, 6, 20), lambert(0xffffff, 0.5));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.03;
      s.g.add(ring);
      B.z += 2.3;
      if (i % 2 === 1) l = l === 1 ? pick([0, 2]) : 1;    // 2まいごとに となりの レーンへ
    }
  },
  conveyor() { // 流れる床：横へ（落ちないように 反対へ 歩く）／後ろへ（がんばって 前へ）
    const k = randInt(1, 2);
    for (let i = 0; i < k; i++) {
      const len = rand(6, 8);
      const side = Math.random() < 0.6;
      const conv = side ? { x: pick([-1, 1]) * P.conveyorV, z: 0 } : { x: 0, z: -P.conveyorV };
      fullBox(B.y - 0.6, B.y, B.z, B.z + len, COL.conv, { conv });
      B.z += len;
      if (i < k - 1) { fullBox(B.y - 0.6, B.y, B.z, B.z + 2, COL.floor); B.z += 2; }
    }
  },
  door() {     // スイッチで 開く扉：スイッチ（まるい ボタン）を ふむと、前の 扉が 下がって 開く
    const len = 10;
    fullBox(B.y - 0.6, B.y, B.z, B.z + len, COL.door);
    const l = randInt(0, 2);
    const sx = LANE_X[l] * 1.05, sz = B.z + 2.6;
    const btn = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.12, 24), lambert(0xffffff, 0.3));
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.18, 24), lambert(0xff4f6e, 0.35));
    base.position.y = 0.06; cap.position.y = 0.18;
    btn.add(base, cap);
    btn.position.set(sx, B.y, sz);
    scene.add(btn);
    const dz = B.z + 7;
    const door = addBox(-FULL / 2, FULL / 2, B.y - 0.6, B.y + 4.2, dz, dz + 0.5, 0xffb37a);
    // 扉の もよう（スイッチと 同じ 赤い まる）
    const mark = new THREE.Mesh(new THREE.CircleGeometry(0.7, 24), new THREE.MeshBasicMaterial({ color: 0xff4f6e }));
    mark.position.set(0, -2.3, -0.26); mark.rotation.y = Math.PI;
    door.g.add(mark);
    const z = { kind: "switch", x: sx, z: sz, y: B.y, r: 0.85, cap, door, open: false, t: 0 };
    zones.push(z);
    extras.push({ z: sz, g: btn });
    B.z += len;
  },
  wind() {     // 横風：白い すじが 流れる 方向へ 押される（扇風機が 風上に ある）
    const len = 11, dir = pick([-1, 1]);
    fullBox(B.y - 0.6, B.y, B.z, B.z + len, COL.wind);
    const zone = { kind: "wind", x0: -FULL / 2 - 3, x1: FULL / 2 + 3, z0: B.z, z1: B.z + len, y: B.y, vx: dir * P.windV, streaks: [], fan: null };
    // 扇風機
    const fan = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.6, 8), lambert(0xffffff, 0.3));
    post.position.y = 0.8;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.1, 8, 28), lambert(0x6cc0ff, 0.35));
    ring.position.y = 1.9; ring.rotation.y = Math.PI / 2;
    const blades = new THREE.Group();
    for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 0.28), lambert(0xffffff, 0.4)); b.position.y = 0.42; const piv = new THREE.Group(); piv.add(b); piv.rotation.x = (i / 4) * Math.PI * 2; blades.add(piv); }
    blades.position.y = 1.9;
    fan.add(post, ring, blades);
    fan.position.set(-dir * (FULL / 2 + 0.9), B.y, B.z + len / 2);
    scene.add(fan);
    zone.fan = blades;
    // 風の すじ
    const smat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide });
    const sg = new THREE.Group();
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.06), smat);
      m.position.set(rand(zone.x0, zone.x1), B.y + rand(0.3, 2.4), rand(zone.z0, zone.z1));
      m.userData.v = rand(0.9, 1.4);
      sg.add(m); zone.streaks.push(m);
    }
    scene.add(sg);
    extras.push({ z: B.z + len / 2, g: fan }, { z: B.z + len / 2, g: sg });
    zones.push(zone);
    B.z += len;
  },
  duck() {     // ひくい トンネル（パン：すべって くぐる）
    const len = 9;
    fullBox(B.y - 0.6, B.y, B.z, B.z + len, COL.duck);
    const cz0 = B.z + 3, cz1 = B.z + 6.2;
    const ceil = addBox(-FULL / 2, FULL / 2, B.y + 0.72, B.y + 3.4, cz0, cz1, 0xffe9a8);
    // しましまの 入り口
    for (let i = 0; i < 6; i++) {
      const st = new THREE.Mesh(new THREE.PlaneGeometry(FULL / 6 - 0.1, 0.35), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff7a59 : 0xffffff, side: THREE.DoubleSide }));
      st.position.set(-FULL / 2 + (i + 0.5) * (FULL / 6), -2.5, -(cz1 - cz0) / 2 - 0.01);
      ceil.g.add(st);
    }
    addSign(B.z + 1.2, B.y, "🍞 すべって くぐろう", "", "#ffb800");
    B.z += len;
  },
  ghost() {    // すりぬけの かべ（おばけ：すりぬけで とおる。ほかの キャラの時は 出ない）
    const len = 9;
    fullBox(B.y - 0.6, B.y, B.z, B.z + len, COL.wide);
    const wz = B.z + 4.5;
    const w = addBox(-FULL / 2, FULL / 2, B.y - 0.6, B.y + 4.6, wz, wz + 0.6, 0xb9a6ff, { ghostWall: true });
    w.g.children[0].material = new THREE.MeshLambertMaterial({ color: 0xb9a6ff, emissive: 0x8f7ad9, emissiveIntensity: 0.3, transparent: true, opacity: 0.75 });
    addSign(B.z + 1.2, B.y, "👻 すりぬけよう", "", "#8f7ad9");
    B.z += len;
  },
  wide() {     // ひろい すき間（くらげ：二段ジャンプ・ふわり）
    fullBox(B.y - 0.6, B.y, B.z, B.z + 3, COL.wide);
    addSign(B.z + 1, B.y, "🪼 2かい ジャンプ！", "");
    B.z += 3 + rand(5.0, 5.8);
    B.y += rand(0, 0.6);
    fullBox(B.y - 0.6, B.y, B.z, B.z + 4, COL.wide);
    B.z += 4;
  },

  /* ---- 2026-11-13 第12弾：コースの 新しい しかけ ---- */
  lava() {     // 溶岩：下が 溶岩の 区間を、足場（岩）を つたって わたる。むずかしく なると 小さく・はなれて・くずれる 岩や 動く 岩が まざる
    const d = Math.min(1, B.dy / 100);
    // 岩の おくゆき（すすむ 向き）は、走って とんだ ジャンプ（約4m）で とびこえて しまわない 長さに（第12弾・テストで 調整）
    const k = randInt(4, 5) + Math.round(d * 2), size = 2.4 - d * 0.6, deep = 3.4 - d * 0.6, gap0 = 1.0 + d * 0.8;
    const z0 = B.z, lavaY = B.y - P.lavaDrop;
    let l = 1;
    fullBox(B.y - 0.6, B.y, B.z, B.z + 1.2, COL.rock); B.z += 1.2;      // 岸
    for (let i = 0; i < k; i++) {
      B.z += rand(gap0 * 0.8, gap0);
      B.y += rand(-0.1, 0.25 + d * 0.25);
      // ならび：ふつうの 岩 → 動く 岩 → くずれる 岩 …（くずれる 岩の つぎに 動く 岩は 来ない＝まって いられない 所を 作らない）
      const kind = d > 0.55 && i % 3 === 1 ? "mov" : d > 0.25 && i % 3 === 2 ? "crumble" : "rock";
      const len = deep + (kind === "mov" ? 0.4 : 0);
      if (kind === "mov") {
        const s = laneBox(1, B.y - 0.5, B.y, B.z, B.z + len, COL.mover, { mov: { ph: rand(0, 6.28), sp: 1.1 + d * 0.6, dx: 0 } });
        s.w = s.x1 - s.x0;
      } else {
        const s = addBox(LANE_X[l] - size / 2, LANE_X[l] + size / 2, B.y - 0.8, B.y, B.z, B.z + len, kind === "crumble" ? COL.crumble : COL.rock,
          kind === "crumble" ? { van: { t: -1, offT: 0, crumble: true } } : {});
        if (kind === "crumble") crackMark(s);
        l = Math.max(0, Math.min(2, l + pick([-1, 0, 1])));
      }
      B.z += len;
    }
    B.z += rand(gap0 * 0.8, gap0);
    fullBox(B.y - 0.6, B.y, B.z, B.z + 1.6, COL.rock); B.z += 1.6;      // 向こう岸
    lavaPool(z0 + 1.0, B.z - 1.4, lavaY);
    if (!B.seen.lava) { B.seen.lava = true; addSign(z0 + 0.6, B.y, "🌋 ようがんに おちないで！", "いわを つたって わたろう", "#ff6a3d"); }
  },
  laser() {    // むかってくる レーザー：前から 流れてくる 光の バー。ジャンプで よける（当たっても 少し もどるだけ）
    const d = Math.min(1, B.dy / 100);
    const len = 16 + Math.round(d * 4);
    fullBox(B.y - 0.6, B.y, B.z, B.z + len, COL.laser);
    const z0 = B.z, z1 = B.z + len;
    // 発射口（向こうの はしの 門）
    const gate = new THREE.Group();
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.6, 0.5), lambert(0x4b5579, 0.3)); p.position.set(sx * (FULL / 2 + 0.3), 1.3, 0); gate.add(p); }
    const top = new THREE.Mesh(new THREE.BoxGeometry(FULL + 1.1, 0.4, 0.5), lambert(0x4b5579, 0.3)); top.position.y = 2.6; gate.add(top);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff3b6b })); lamp.position.set(0, 2.95, 0); gate.add(lamp);
    gate.position.set(0, B.y, z1 - 0.3); scene.add(gate);
    extras.push({ z: z1, g: gate });
    zones.push({ kind: "laser", z0, z1, y: B.y, v: 3.2 + d * 2.8, every: 2.9 - d * 1.15, dbl: d > 0.6, t: 0.6, lamp });
    if (!B.seen.laser) { B.seen.laser = true; addSign(z0 + 0.6, B.y, "⚡ レーザーが くるよ", "ジャンプで よけよう", "#ff3b6b"); }
    B.z = z1;
  },
  ice() {      // こおりの 床：すべって 止まりにくい。とちゅうで 道が ほそく なる
    const d = Math.min(1, B.dy / 100);
    const a = 4, nar = 4 + Math.round(d * 3), b = 3;
    fullBox(B.y - 0.6, B.y, B.z, B.z + a, COL.ice, { ice: true }); B.z += a;
    const l = randInt(0, 2);
    laneBox(l, B.y - 0.6, B.y, B.z, B.z + nar, COL.ice, { ice: true });
    if (d > 0.5) laneBox(l === 1 ? pick([0, 2]) : 1, B.y - 0.6, B.y, B.z + nar * 0.5, B.z + nar, COL.ice, { ice: true });
    B.z += nar;
    fullBox(B.y - 0.6, B.y, B.z, B.z + b, COL.ice, { ice: true }); B.z += b;
    if (!B.seen.ice) { B.seen.ice = true; addSign(B.z - a - nar - b + 0.6, B.y, "🧊 つるつる こおり", "ゆっくり すすもう", "#4fb3ff"); }
  },
  crumble() {  // くずれる 足場：のって 少しすると ぐらぐら → 下へ 落ちる（しばらくして もどる）
    const d = Math.min(1, B.dy / 100);
    const k = randInt(4, 5) + Math.round(d);
    let l = randInt(0, 2);
    for (let i = 0; i < k; i++) {
      B.z += 0.6 + d * 0.4;
      B.y += rand(0, 0.35);
      const s = addBox(LANE_X[l] - 1.15, LANE_X[l] + 1.15, B.y - 0.6, B.y, B.z, B.z + 2.9, COL.crumble, { van: { t: -1, offT: 0, crumble: true } });
      crackMark(s);
      B.z += 2.9;
      l = Math.max(0, Math.min(2, l + pick([-1, 1])));
    }
    if (!B.seen.crumble) { B.seen.crumble = true; addSign(B.z - k * 3, B.y, "🪨 くずれる あしば", "とまらずに すすもう", "#c9873a"); }
  },
  goal() {     // ゴール：ひろい 台と アーチ・大きな ほし
    const len = 9;
    fullBox(B.y - 0.6, B.y, B.z, B.z + len, COL.goal);
    const gz = B.z + 3;
    const g = new THREE.Group();
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 3.6, 12), lambert(0xffffff, 0.35)); p.position.set(sx * (FULL / 2 - 0.2), 1.8, 0); g.add(p); }
    const tex = canvasTex(512, 128, (x, w, h) => { x.fillStyle = "#ff7eb6"; x.beginPath(); x.roundRect(4, 4, w - 8, h - 8, 50); x.fill(); x.fillStyle = "#fff"; x.font = `900 76px "NorunMaru",sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("⭐ ゴール ⭐", w / 2, h / 2 + 4); });
    const ban = new THREE.Mesh(new THREE.PlaneGeometry(FULL, FULL / 4), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true }));
    ban.position.y = 3.7; ban.rotation.y = Math.PI; g.add(ban);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 0), lambert(0xffd93b, 0.6)); star.position.set(0, 1.6, 2.2); g.add(star);
    g.position.set(0, B.y, gz); scene.add(g);
    extras.push({ z: gz + 30, g, update: (dt) => { star.rotation.y += dt * 2; star.position.y = 1.6 + Math.sin(T.time * 2) * 0.2; } });
    zones.push({ kind: "goal", z: gz, y: B.y });
    B.goalZ = gz;
    B.z += len;
  },
};
/* くずれる 足場の しるし（ひび） */
function crackMark(s) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(s.x1 - s.x0 - 0.2, s.z1 - s.z0 - 0.2), new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.02; s.g.add(m);
}
const crackTex = canvasTex(128, 128, (x, w, h) => {
  x.strokeStyle = "rgba(90,50,20,.75)"; x.lineWidth = 5; x.lineCap = "round";
  for (const [a, b] of [[[64, 64], [20, 30]], [[64, 64], [110, 40]], [[64, 64], [50, 118]], [[64, 64], [100, 100]], [[40, 45], [10, 70]]]) { x.beginPath(); x.moveTo(...a); x.lineTo(...b); x.stroke(); }
});
/* 溶岩の 池（光る もようが 流れる） */
const lavaTex = canvasTex(256, 256, (x, w, h) => {
  x.fillStyle = "#ff5a1f"; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i++) { const r = rand(8, 34); const gr = x.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, i % 3 ? "#ffd23f" : "#fff2a8"); gr.addColorStop(1, "rgba(255,90,31,0)"); x.save(); x.translate(rand(0, w), rand(0, h)); x.fillStyle = gr; x.beginPath(); x.arc(0, 0, r, 0, 7); x.fill(); x.restore(); }
  x.strokeStyle = "rgba(150,30,10,.5)"; x.lineWidth = 6;
  for (let i = 0; i < 10; i++) { x.beginPath(); x.moveTo(rand(0, w), rand(0, h)); x.bezierCurveTo(rand(0, w), rand(0, h), rand(0, w), rand(0, h), rand(0, w), rand(0, h)); x.stroke(); }
});
lavaTex.wrapS = lavaTex.wrapT = THREE.RepeatWrapping;
const lavaMat = new THREE.MeshBasicMaterial({ map: lavaTex, fog: false });
function lavaPool(z0, z1, y) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(FULL + 8, z1 - z0), lavaMat);
  m.rotation.x = -Math.PI / 2; m.position.set(0, y, (z0 + z1) / 2);
  scene.add(m);
  extras.push({ z: z1, g: m });
  zones.push({ kind: "lava", z0, z1, y });
}
const beamGeo = new THREE.CylinderGeometry(0.11, 0.11, FULL + 0.6, 10); beamGeo.rotateZ(Math.PI / 2);
const glowGeo = new THREE.CylinderGeometry(0.26, 0.26, FULL + 0.6, 10); glowGeo.rotateZ(Math.PI / 2);
const beamMat = new THREE.MeshBasicMaterial({ color: 0xff2d6b });
const glowMat = new THREE.MeshBasicMaterial({ color: 0xff7aa8, transparent: true, opacity: 0.35, depthWrite: false });
function spawnBeam(zn, z) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(beamGeo, beamMat), new THREE.Mesh(glowGeo, glowMat));
  g.position.set(0, zn.y + P.laserH, z); scene.add(g);
  beams.push({ z, y: zn.y, sec: zn, g });
}
/* コース：plan の 部品を じゅんばんに ならべて、さいごに ゴール。むずかしさ（dy）は すすむほど 上がる */
const SKILL_PART = { pan: "duck", kurage: "wide", obake: "ghost" };
function buildCourse(c) {
  // コース1の さいしょの 看板：あたらしい 操作（さわった 所に パッド）の 説明（第13弾）
  if (c.id === "mori") addSign(3.2, 0, "👆 さわった ところに パッドが でるよ", "ジャンプは みぎしたの ボタン！", "#ff7eb6", 6.4);
  const plan = c.plan.filter((k) => k !== "S" || SKILL_PART[B.char]).map((k) => (k === "S" ? SKILL_PART[B.char] : k));
  plan.forEach((name, i) => {
    B.dy = c.dy0 + (c.dy1 - c.dy0) * (plan.length > 1 ? i / (plan.length - 1) : 0);
    B.last = name;
    PARTS[name]();
    rest(rand(3.2, 4.0));
    B.n++;
  });
  PARTS.goal();
}
function addPart() {
  B.dy = B.y;   // エンドレス：むずかしさ ＝ 高さ（今までと 同じ）
  const list = Object.entries(P.parts).filter(([k, v]) => B.y >= v.from && k !== B.last && (!v.char || v.char === B.char));
  let r = Math.random() * list.reduce((s, [, v]) => s + v.w, 0);
  let name = list[0][0];
  for (const [k, v] of list) if ((r -= v.w) <= 0) { name = k; break; }
  B.last = name;
  PARTS[name]();
  rest(rand(3.2, 4.2));
  B.n++;
}

/* ---------- キャラ（変身） ---------- */
const nr = { root: new THREE.Group(), pose: new THREE.Group(), cur: null };
nr.root.add(nr.pose);
scene.add(nr.root);
const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.7, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2;
scene.add(shadow);
const charCache = new Map();
let hatColor = null, pinList = null;
function loadChar(id) {
  if (charCache.has(id)) return charCache.get(id);
  const def = CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
  const p = new GLTFLoader().loadAsync(def.model).then((g) => {
    const m = g.scene;
    m.scale.setScalar(def.scale);
    const get = (n) => m.getObjectByName(n);
    const ch = { id: def.id, def, model: m, body: get("Body"), starL: get("Star_L"), starR: get("Star_R"), hatMats: [], pins: null, feet: [], tentacles: [] };
    for (const s of [ch.starL, ch.starR]) if (s) s.userData.q = s.quaternion.clone();
    // パンの 足（Foot_L / Foot_R）
    for (const n of ["Foot_L", "Foot_R"]) { const f = get(n); if (f) { f.userData.rx = f.rotation.x; ch.feet.push(f); } }
    // くらげの 触手（Tentacles の 下に 7本）
    const ten = get("Tentacles");
    if (ten) for (const c of ten.children) { c.userData.r = c.rotation.clone(); ch.tentacles.push(c); }
    // おばけ：すりぬけで すける 材質（M_Ghost・M_Face）と りんかく（Ghost_Outline）
    ch.ghostMats = []; ch.outline = get("Ghost_Outline");
    // ペンギン：羽（外がわ 34° が 基準。うごきは 基準に 足す）
    ch.wings = [];
    m.traverse((o) => {
      if (o.isMesh && o.material && (o.material.name === "M_Ghost" || o.material.name === "M_Face") && def.skills.phase) {
        o.material = o.material.clone();
        o.material.userData.t = o.material.transparent; o.material.userData.o = o.material.opacity;
        ch.ghostMats.push(o.material);
      }
      // ペンギンの 羽：Flipper_L / Flipper_R（three.js が 名前を かえても いいように 先頭で 判定）
      if (/^Flipper_[LR]/.test(o.name) && !ch.wings.includes(o)) {
        o.userData.r = o.rotation.clone();
        // モデルは 正面が +Z、_L は -x がわ。Z軸まわりで 外へ ひらく 向きは L が -、R が +
        o.userData.side = /^Flipper_L/.test(o.name) ? -1 : 1;
        ch.wings.push(o);
      }
    });
    m.traverse((o) => {
      if (o.isMesh && o.material && o.material.name === "M_Hat") {
        o.material = o.material.clone();
        o.material.userData.base = o.material.color.clone();
        ch.hatMats.push(o.material);
      }
    });
    ch.pins = findPinSlots(m);
    return ch;
  });
  charCache.set(id, p);
  p.catch(() => charCache.delete(id));
  return p;
}
function applyLook(ch) {
  for (const m of ch.hatMats) { if (hatColor == null) m.color.copy(m.userData.base); else m.color.set(hatColor); }
  if (ch.pins && ch.pins.length) applyPins(ch.pins, pinList);
}
/* キャラを えらぶ（モデルが 読めなかったら のるんに もどして、その id を かえす） */
export async function setTowerChar(id) {
  let ch;
  try { ch = await loadChar(id); } catch { ch = await loadChar("norun"); }
  if (nr.cur !== ch) {
    nr.pose.clear();
    nr.pose.add(ch.model);
    nr.cur = ch;
  }
  applyLook(ch);
  return ch.id;
}
/* そのキャラの モデルが あるか（えらぶ画面で つかう） */
export function charAvailable(id) { return loadChar(id).then(() => true, () => false); }
export function initTowerView() { return setTowerChar(nr.cur ? nr.cur.id : "norun"); }
export function setTowerHat(color) { hatColor = color; if (nr.cur) applyLook(nr.cur); }
export function setTowerPins(pins) { pinList = pins; if (nr.cur) applyLook(nr.cur); }

/* ---------- 状態 ---------- */
let T = null;
const me = { x: 0, y: 0, z: 0, vx: 0, vz: 0, vy: 0, yaw: 0, on: null, squash: 0, ph: 0, star: 0, starV: 0, stun: 0, wait: 0, blocked: false, jumps: 0, slideT: 0, phaseT: 0, steps: 0, sink: 0, neba: 0, jumpBuf: 0, airT: 0 };
const ME0 = { vx: 0, vz: 0, vy: 0, yaw: 0, on: null, stun: 0, blocked: false, jumps: 0, slideT: 0, phaseT: 0, steps: 0, sink: 0, neba: 0, jumpBuf: 0, airT: 0, lastOn: null, hopFrom: null };
/* ASMR の カメラ：キャラに 寄った 視点。スワイプで まわす（yaw＝左右、pitch＝上下） */
const cam = { yaw: 0, pitch: 0.15, yawS: 0, pitchS: 0.15, fp: false, mode: "near", idle: 99 };   // mode：near（寄った）/ chase（追い）/ fp（一人称）
export function towerLook(dx, dy) {
  if (!T || B.mode !== "asmr") return;
  cam.yaw -= dx * ASMR_CAM.swipe;      // 指を 右へ → 右を むく（実機の 感想で 向きを 逆に した）
  cam.pitch = Math.max(ASMR_CAM.pitchMin, Math.min(ASMR_CAM.pitchMax, cam.pitch + dy * ASMR_CAM.swipe));
  cam.idle = 0;
}
/* 視点の 切りかえ：寄った 視点 → 追い視点 → 一人称 → … いまの 視点を かえす */
const VIEWS = ["near", "chase", "fp"];
export function towerToggleView() {
  if (!T || B.mode !== "asmr") return null;
  cam.mode = VIEWS[(VIEWS.indexOf(cam.mode) + 1) % VIEWS.length];
  cam.fp = cam.mode === "fp";
  cam.pitch = cam.fp ? 0 : 0.15;
  if (cam.mode === "chase") cam.yaw = cam.yawS + Math.atan2(Math.sin(me.yaw - cam.yawS), Math.cos(me.yaw - cam.yawS));
  return cam.mode;
}
/* 正面を むく：つぎに のぼる 足場の 方へ、キャラと カメラを 向ける（なければ キャラの 向き） */
export function towerFaceFront() {
  if (!T || B.mode !== "asmr") return;
  const room = A.rooms[A.k];
  let tgt = null;
  if (room) for (const s of room.objs) {
    if (s.deco || s.off || s.y1 <= me.y + 0.2) continue;
    if (!tgt || s.y1 < tgt.y1 || (s.y1 === tgt.y1 && dist2(s) < dist2(tgt))) tgt = s;
  }
  const yaw = tgt ? Math.atan2((tgt.x0 + tgt.x1) / 2 - me.x, (tgt.z0 + tgt.z1) / 2 - me.z) : me.yaw;
  me.yaw = yaw;
  // いちばん 近い まわり方で
  cam.yaw = cam.yawS + Math.atan2(Math.sin(yaw - cam.yawS), Math.cos(yaw - cam.yawS));
  cam.pitch = cam.fp ? 0 : 0.15;
  cam.idle = 0;
}
const dist2 = (s) => ((s.x0 + s.x1) / 2 - me.x) ** 2 + ((s.z0 + s.z1) / 2 - me.z) ** 2;
const stick = { x: 0, y: 0 };   // バーチャルパッド：x=右が +、y=上（前）が +。大きさ 0〜1
const skills = () => (nr.cur ? nr.cur.def.skills : {});

/* ---------- かけら（クッキーを ふむ・せんべいが われる） ---------- */
const honeyRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.09, 10, 28), new THREE.MeshPhongMaterial({ color: 0xffc94a, emissive: 0xffa000, emissiveIntensity: 0.45, specular: 0xffffff, shininess: 80, transparent: true, opacity: 0.75 }));
honeyRing.rotation.x = -Math.PI / 2; honeyRing.scale.z = 0.4; honeyRing.visible = false; scene.add(honeyRing);
const crumbGeo = new THREE.BoxGeometry(0.12, 0.08, 0.12);
const crumbs = [];
function spawnCrumbs(s, color, n, x, z) {
  const mat = new THREE.MeshLambertMaterial({ color });
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(crumbGeo, mat);
    m.position.set(x ?? rand(s.x0, s.x1), s.y1 + 0.05, z ?? rand(s.z0, s.z1));
    scene.add(m);
    crumbs.push({ m, vx: rand(-1.5, 1.5), vy: rand(1.5, 4), vz: rand(-1.5, 1.5), t: 1.2 });
  }
}
function updateCrumbs(dt) {
  for (let i = crumbs.length - 1; i >= 0; i--) {
    const c = crumbs[i];
    c.t -= dt; c.vy -= 18 * dt;
    c.m.position.x += c.vx * dt; c.m.position.y += c.vy * dt; c.m.position.z += c.vz * dt;
    c.m.rotation.x += dt * 6;
    if (c.t <= 0) { scene.remove(c.m); crumbs.splice(i, 1); }
  }
}

/* ---------- ASMRタワー：部屋 ---------- */
const A = { rooms: [], k: -1 };
const signTex = (text, sub) => {
  const c = document.createElement("canvas"); c.width = 512; c.height = 160;
  const x = c.getContext("2d");
  x.fillStyle = "#fffdfb"; x.strokeStyle = "#c7b3ff"; x.lineWidth = 10; x.beginPath(); x.roundRect(8, 8, 496, 144, 44); x.fill(); x.stroke();
  x.fillStyle = "#ffd75e"; x.font = `900 40px "NorunMaru",sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("★", 44, 40); x.fillStyle = "#ff9ec7"; x.fillText("★", 470, 120);
  x.fillStyle = "#4a3470"; x.textAlign = "center"; x.textBaseline = "middle";
  x.font = `900 60px "NorunMaru","Hiragino Maru Gothic ProN",sans-serif`; x.fillText(text, 256, sub ? 62 : 80);
  if (sub) { x.font = `800 32px "NorunMaru","Hiragino Maru Gothic ProN",sans-serif`; x.fillStyle = "#7d6b9c"; x.fillText(sub, 256, 118); }
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
};
const roomApi = {
  add(s) { solids.push(s); return s; },
  sign(text, sub, x, y, z, room) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.25), new THREE.MeshBasicMaterial({ map: signTex(text, sub), transparent: true }));
    m.position.set(x, y, z); m.rotation.y = Math.PI;
    room.wallGroup.add(m);
  },
};
function ensureRooms(k) {
  while (A.rooms.length <= k + 2) {
    const prev = A.rooms[A.rooms.length - 1];
    const room = buildRoom(A.rooms.length, prev ? prev.exit : null, roomApi);
    scene.add(room.group);
    A.rooms.push(room);
  }
}
/* いまの フロアに あわせて 見せ方を かえる：上の フロアの 床（＝天井）は うすく、もっと上と ずっと下は かくす */
function showRooms(k) {
  for (const room of A.rooms) {
    const d = room.r - k;
    room.group.visible = d >= -2 && d <= 1;
    const ghost = d === 1;
    room.wallGroup.visible = d <= 0;
    room.objGroup.visible = d <= 0;
    // 天井（上の フロアの 床）は ごく うすく。下から 見上げても じゃまに ならない ように
    for (const m of room.mats.list) {
      if (m.userData.o0 === undefined) { m.userData.o0 = m.opacity; m.userData.t0 = m.transparent; m.userData.d0 = m.depthWrite; }
      m.transparent = ghost || m.userData.t0; m.opacity = ghost ? Math.min(m.userData.o0, 0.09) : m.userData.o0; m.depthWrite = ghost ? false : m.userData.d0;
    }
  }
}
/* 第7弾：上の かいへ 上がる 直前〜とちゅうは、上の かいの 床（ふち・あつみ も）と 足場を 半とうめいで 見せる。
   かべは 見せない まま。上がりきったら（k が かわったら）showRooms で ふつうに もどる */
function fadeGroup(g, op) {
  g.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (m.userData.shared) continue;
      if (m.userData.fo === undefined) { m.userData.fo = m.opacity; m.userData.ft = m.transparent; m.userData.fd = m.depthWrite; }
      if (op >= 1) { m.opacity = m.userData.fo; m.transparent = m.userData.ft; m.depthWrite = m.userData.fd; }
      else { m.transparent = true; m.opacity = Math.min(m.userData.fo, op); m.depthWrite = false; }
    }
  });
}
function setApproach(on) {
  if (A.approach === on) return;
  A.approach = on;
  const up = A.rooms[A.k + 1];
  if (!up) return;
  up.objGroup.visible = on;
  fadeGroup(up.objGroup, on ? 0.45 : 1);
  for (const m of up.mats.list) m.opacity = on ? Math.min(m.userData.o0, 0.32) : Math.min(m.userData.o0, 0.09);
}
function clearRooms() {
  for (const room of A.rooms) disposeGroup(room.group);
  A.rooms.length = 0; A.k = -1;
}

function clearCourse() {
  clearRooms();
  for (const s of solids) if (s.g && s.g.parent === scene) disposeGroup(s.g);
  for (const b of bars) disposeGroup(b.g);
  for (const f of flags) disposeGroup(f.g);
  for (const e of extras) disposeGroup(e.g);
  for (const b of beams) disposeGroup(b.g);
  solids.length = 0; bars.length = 0; flags.length = 0; extras.length = 0; zones.length = 0; beams.length = 0;
}
/* opts.mode："athle"（アスレ）／"asmr"（ASMRタワー） */
export function startTower(opts) {
  stopTower();
  clearCourse();
  const course = opts.course ? ATHLE_COURSES.find((c) => c.id === opts.course) : null;   // opts.course：コースの id（なし＝エンドレス）
  Object.assign(B, { z: -4, y: 0, last: "", n: 0, mode: opts.mode || "athle", char: nr.cur ? nr.cur.id : "norun", dy: 0, course, seen: {}, goalZ: 0 });
  const asmr = B.mode === "asmr";
  T = { ...opts, best: 0, falls: 0, camY: 0, time: 0, raf: 0, cp: { z: -2, y: 0 }, cpN: 0, speed: P.speed, themeIdx: -1, floor: -1, goal: false, runT: 0, immune: 0, pct: 0 };
  if (asmr) ensureRooms(0); else { rest(9); if (course) buildCourse(course); }
  Object.assign(me, ME0, { x: 0, y: 0, z: asmr ? 4.2 : -2, wait: 0.9 });
  Object.assign(cam, { yaw: 0, pitch: 0.15, yawS: 0, pitchS: 0.15, idle: 99, fp: false, mode: "near" });
  farTower.visible = !asmr;
  for (const c of clouds) c.visible = !asmr;
  scene.fog.near = asmr ? 30 : 40; scene.fog.far = asmr ? 70 : 85;
  stick.x = stick.y = 0;
  canvas.style.display = "block";
  onResize();
  clock.getDelta();
  loop();
}
export const towerCam = () => ({ ...cam });
/* 画面の 大きさが かわった 時（スマホを 横に した 時など）に よぶ */
export function towerResize() { if (T) onResize(); }
export function stopTower() {
  if (!T) return 0;
  const best = Math.floor(T.best);
  cancelAnimationFrame(T.raf);
  T = null;
  canvas.style.display = "none";
  return best;
}
export function towerStick(x, y) {
  const m = Math.hypot(x, y);
  const k = m > 1 ? 1 / m : 1;
  stick.x = x * k; stick.y = y * k;
}
// プールの 上は、部屋の テーマでは なく プールの 素材の 手ざわり（はちみつの 部屋でも ビーズの 上は ビーズ。しずみ・はねは なし）
const floorProps = () => (me.on && me.on.ice ? { ...NORMAL, grip: P.iceGrip, walk: P.iceWalk } : me.on && me.on.pool ? { ...NORMAL, walk: me.on.pool.walk } : me.on && me.on.mat ? { ...NORMAL, ...themeOf(me.on.mat) } : NORMAL);
/* ASMR：いまいる フロアの テーマ（ふわふわの 重力などは 部屋ぜんたいに かかる） */
const roomTheme = () => (B.mode === "asmr" && A.rooms[A.k] ? A.rooms[A.k].theme : null);
/* プール（第11弾）：キャラの まわりが へこむ。ビーズ・わたあめは つぶが よけて しずみ、スライム・かき氷・チョコは 表面が へこむ */
const _m4 = new THREE.Matrix4();
function poolFx(s, dt) {
  const fx = s.g.userData.poolFx, on = me.on === s;
  if (!on && !(s.fxT > 0)) return;
  s.fxT = on ? 1.5 : s.fxT - dt;
  const lx = me.x - s.g.position.x, lz = me.z - s.g.position.z, R = 0.85, k = 1 - Math.exp(-10 * dt);
  if (fx.pos) {
    for (let i = 0; i < fx.n; i++) {
      const px = fx.pos[i * 3], pz = fx.pos[i * 3 + 2], dx = px - lx, dz = pz - lz, d = Math.hypot(dx, dz);
      let ox = 0, oy = 0, oz = 0;
      if (on && d < R) { const f = (R - d) / R; oy = -f * (fx.type === "cotton" ? 0.4 : 0.32); ox = (dx / (d || 1)) * f * 0.22; oz = (dz / (d || 1)) * f * 0.22; }
      const o = fx.off, a = i * 3;
      if (Math.abs(o[a] - ox) + Math.abs(o[a + 1] - oy) + Math.abs(o[a + 2] - oz) < 0.002) continue;
      o[a] += (ox - o[a]) * k; o[a + 1] += (oy - o[a + 1]) * k; o[a + 2] += (oz - o[a + 2]) * k;
      const sc = fx.sc[i];
      _m4.makeScale(sc, sc * (fx.type === "cotton" ? 0.8 * (1 + o[a + 1]) : 1), sc).setPosition(px + o[a], fx.pos[a + 1] + o[a + 1], pz + o[a + 2]);
      fx.mesh.setMatrixAt(i, _m4);
    }
    fx.mesh.instanceMatrix.needsUpdate = true;
  } else {
    const pa = fx.mesh.geometry.attributes.position, depth = s.pool.sink * 0.9, t = T.time;
    for (let i = 0; i < pa.count; i++) {
      const d2 = (pa.getX(i) - lx) ** 2 + (pa.getZ(i) - lz) ** 2;
      let y = on ? -depth * Math.exp(-d2 / 0.28) : 0;
      if (on && fx.type === "slime") y += Math.sin(Math.sqrt(d2) * 7 - t * 9) * 0.025 * Math.exp(-d2 / 1.5);   // スライムは ぷるぷる 波
      if (on && fx.type === "ice") y = Math.min(fx.cur[i], y);                                          // かき氷は あしあとが のこる
      fx.cur[i] += (y - fx.cur[i]) * (fx.type === "ice" ? (on ? k : 0.004) : k);
      pa.setY(i, fx.base[i] + fx.cur[i]);
    }
    pa.needsUpdate = true; fx.mesh.geometry.computeVertexNormals();
  }
}
/* ASMR：天井（上の フロアの 床）に 頭を ぶつけない 速さに おさえる（吹き抜けの 中は 天井が ないので そのまま）。
   第10弾：ぷにぷにで 天井に 頭を ぶつけて はね方が みだれ、上れなく なるのを ふせぐ */
function capCeil(v) {
  if (B.mode !== "asmr") return v;
  const room = A.rooms[A.k], at = room && room.atrium;
  if (!room) return v;
  if (at && me.x > at.x0 - 0.2 && me.x < at.x1 + 0.2 && me.z > at.z0 - 0.2 && me.z < at.z1 + 0.2) return v;
  const g = P.gravity * ((roomTheme() && roomTheme().grav) || 1);
  const room2 = me.y - room.y;
  const free = ASMR.floorH - 0.5 - room2 - bodyH() - 0.08;     // 頭の 上の あき
  const vmax = Math.sqrt(2 * g * Math.max(0.35, free));
  return Math.min(v, vmax);
}
/* はねる 床の 上にいる／はねた ばかり なら、その 床の テーマ（はねている 間も 同じ 大ジャンプが 出る ように） */
const jumpProps = () => (me.on ? floorProps() : me.hopFrom && me.hopFrom.mat ? { ...NORMAL, ...themeOf(me.hopFrom.mat) } : NORMAL);
export function towerJump() {
  if (!T || me.wait > 0) return false;
  if (me.slideT > 0 && !headroom(1.0)) return false;   // トンネルの 中では 立てない
  const fp = jumpProps();
  // はねている とちゅう（上がっている 間）に おしても、着地で おしても、同じ 大ジャンプ（第10弾：はね方を 一定に）
  if (me.on || me.airT < 0.1 || (me.hopFrom && me.vy > 0)) { me.vy = capCeil(P.jumpV * fp.jump * (1 - me.neba * 0.15)); me.jumps = 1; me.hopFrom = null; }   // 足場を はなれた すぐ後も とべる（はちみつに しずむと 少し ひくく：第8弾で 0.3→0.15。しずんでも 次の 段に とどく ように）
  else if (skills().doubleJump && me.jumps < 2) { me.vy = P.jumpV * 0.92; me.jumps = 2; }   // くらげ：空中で もう1回
  else { me.jumpBuf = 0.35; return false; }      // 着地の すこし前に おしたら、着地で とぶ（はねる 床で 大ジャンプ）
  me.slideT = 0;
  me.on = null;
  me.airT = 1;
  me.squash = -0.22;
  return true;
}
/* とくぎ（パン：すべる／おばけ：すりぬけ） */
export function towerSkill() {
  if (!T || me.wait > 0) return false;
  const sk = skills();
  if (sk.slide && me.slideT <= 0) { me.slideT = P.slideT; return true; }
  if (sk.phase && me.phaseT <= 0) { me.phaseT = OBAKE.phaseT; setGhost(true); return true; }
  return false;
}
/* 動作確認用：その場所へ うつす（?debug の時だけ main から つかう） */
export function towerTeleport(x, y, z) { if (!T) return; Object.assign(me, ME0, { x, y, z }); T.camY = y; }
export const towerSkillName = () => (skills().slide ? "slide" : skills().phase ? "phase" : null);
/* おばけの すりぬけ：すける（M_Ghost・M_Face を opacity 0.45、Ghost_Outline を かくす）／もどす */
function setGhost(on) {
  const ch = nr.cur;
  if (!ch) return;
  for (const m of ch.ghostMats) { m.transparent = on ? true : m.userData.t; m.opacity = on ? OBAKE.opacity : m.userData.o; m.needsUpdate = true; }
  if (ch.outline) ch.outline.visible = !on;
}
export const towerState = () => (T ? {
  best: T.best, falls: T.falls, cpN: T.cpN, speed: T.speed, mode: B.mode, course: B.course && B.course.id, goal: T.goal, pct: T.pct, runT: T.runT, goalZ: B.goalZ, cp: T.cp,
  beams: beams.map((b) => ({ z: b.z, y: b.y })), char: nr.cur && nr.cur.id, theme: T.themeIdx, floor: A.k, approach: !!A.approach,
  rooms: A.rooms.map((r) => ({ r: r.r, theme: r.theme.id, exit: r.exit, holes: r.holes })),
  me: { ...me, on: !!me.on, onMat: me.on && me.on.mat, onConv: !!(me.on && me.on.conv) },
  solids: solids.map((s) => ({ x0: s.x0, x1: s.x1, y0: s.y0, y1: s.y1, z0: s.z0, z1: s.z1, pad: !!s.pad, mov: !!s.mov, van: !!s.van, off: !!s.off, conv: !!s.conv, mat: s.mat, room: s.room, floor: !!s.floor, bound: !!s.bound, pillar: !!s.pillar, deco: !!s.deco, ghostWall: !!s.ghostWall, kind: s.kind, noBreak: !!s.noBreak })),
  bars: bars.map((b) => ({ cz: b.cz, y: b.y, ang: b.ang, half: b.half })),
  zones: zones.map((z) => ({ kind: z.kind, z: z.z, z0: z.z0, z1: z.z1, x: z.x, open: z.open, y: z.y })),
  ice: solids.filter((s) => s.ice).length,
} : null);

function onResize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.fov = B.mode === "asmr" ? (w < h ? 78 : 66) : w < h ? 74 : 60;
  camera.updateProjectionMatrix();
}
addEventListener("resize", onResize);

function respawn(lava = false) {
  T.falls++;
  if (me.phaseT > 0) setGhost(false);
  Object.assign(me, ME0, { x: 0, y: T.cp.y, z: T.cp.z, wait: 0.7 });
  T.camY = T.cp.y;
  if (T.onFall && !lava) T.onFall(T.falls);
}

/* 1つの 軸ずつ 動かして、かべに ぶつかったら 止める（ひくい段は そのまま のぼる） */
const HW = 0.3, HD = 0.28;
const bodyH = () => (me.slideT > 0 ? 0.55 : 1.0);    // すべっている時は せが ひくい
function hits(x, z, y, h = bodyH()) {
  for (const s of solids) {
    if (s.off) continue;
    if (me.phaseT > 0 && !s.bound && s.y1 > y + P.stepUp) continue;   // おばけ：かべを すりぬける（部屋の かべは だめ）
    if (!(x + HW > s.x0 && x - HW < s.x1 && z + HD > s.z0 && z - HD < s.z1)) continue;
    if (s.y1 <= y + 0.02 || s.y0 >= y + h) continue;
    if (s.oneWay && s.y1 - y > P.stepUp) continue;   // 浮いた 足場は 横から ぶつからない（上から のる だけ。ひくい 段は のぼれる）
    return s;
  }
  return null;
}
const headroom = (h) => !hits(me.x, me.z, me.y, h);
function moveAxis(axis, d) {
  if (Math.abs(d) < 1e-5) return;
  const nx = axis === "x" ? me.x + d : me.x, nz = axis === "z" ? me.z + d : me.z;
  const s = hits(nx, nz, me.y);
  if (!s) { me.x = nx; me.z = nz; return; }
  if (me.on && s.y1 - me.y <= P.stepUp && !hits(nx, nz, s.y1)) { me.y = s.y1; me.x = nx; me.z = nz; return; }   // かいだん
  me.blocked = true;
}

const clock = new THREE.Clock();
let dbgHook = null;
export function towerDebugHook(fn) { dbgHook = fn; }
function loop() {
  if (!T) return;
  T.raf = requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = (T.time += dt);
  if (dbgHook) dbgHook(dt, { me, solids, beams, zones, bars, stick, B, T });   // テスト用（?debug の 時だけ main.js から つかう）
  const sk = skills();

  // コースを 先へ つぎたす・後ろを 消す
  const asmr = B.mode === "asmr";
  if (asmr) {
    const k = Math.max(0, Math.floor((T.camY + 0.5) / ASMR.floorH));
    if (k !== A.k) {
      ensureRooms(k);
      showRooms(k);
      const prevK = A.k;
      A.k = k;
      T.themeIdx = ASMR_THEMES.indexOf(A.rooms[k].theme);
      A.approach = false; T.camFade = null;
      for (const room of A.rooms) fadeGroup(room.objGroup, 1);
      if (prevK >= 0 && k < prevK) T.dropPending = true;     // 着地した 時に「○かいに おちた」を 知らせる
      else if (T.onTheme) T.onTheme(A.rooms[k].theme, k + 1);
    }
    // 吹き抜けの 中で 上の かいの 床に 近づいたら、上の かいを 半とうめいで 見せる
    const cur = A.rooms[A.k], at = cur && cur.atrium;
    setApproach(!!at && me.x > at.x0 - 0.6 && me.x < at.x1 + 0.6 && me.z > at.z0 - 0.6 && me.z < at.z1 + 0.6 && me.y > cur.y + ASMR.floorH - 5);
  } else if (!B.course) while (B.z < me.z + 80) addPart();
  for (let i = solids.length - 1; i >= 0; i--) {
    const s = solids[i];
    if (s.z1 < me.z - 18 && s.z1 < T.cp.z - 2) { disposeGroup(s.g); solids.splice(i, 1); }
  }
  for (let i = bars.length - 1; i >= 0; i--) if (bars[i].cz < me.z - 18) { disposeGroup(bars[i].g); bars.splice(i, 1); }
  for (let i = flags.length - 1; i >= 0; i--) if (flags[i].z < me.z - 18) { disposeGroup(flags[i].g); flags.splice(i, 1); }
  for (let i = extras.length - 1; i >= 0; i--) if (extras[i].z < me.z - 20) { disposeGroup(extras[i].g); extras.splice(i, 1); }
  for (let i = zones.length - 1; i >= 0; i--) if ((zones[i].z1 || zones[i].z) < me.z - 20) zones.splice(i, 1);

  // しかけ：動く足場・消える足場・流れる床
  for (const s of solids) {
    if (s.mov) {
      const cx = Math.sin(t * s.mov.sp + s.mov.ph) * W;
      s.mov.dx = cx - (s.x0 + s.x1) / 2;
      s.x0 = cx - s.w / 2; s.x1 = cx + s.w / 2;
      s.g.position.x = cx;
    }
    if (s.van) {
      const v = s.van;
      if (s.off) {
        v.offT -= dt;
        if (v.offT <= 0) { s.off = false; s.g.visible = true; s.g.scale.setScalar(1); s.g.position.y = s.y1; s.g.rotation.set(0, 0, 0); }
        else if (v.offT < 0.4) { s.g.visible = true; s.g.position.y = s.y1; s.g.rotation.set(0, 0, 0); s.g.scale.setScalar(1 - v.offT / 0.4 * 0.9); }   // ふわっと もどる
        else if (v.crumble) { s.g.visible = true; s.g.position.y -= dt * (6 + (v.fall = (v.fall || 0) + dt * 18)); s.g.rotation.x += dt * 1.5; if (s.g.position.y < s.y1 - 12) s.g.visible = false; }   // くずれて 下へ 落ちる
      } else {
        if (me.on === s && v.t < 0) v.t = 0;
        if (v.t >= 0) {
          v.t += dt;
          const lim = v.crumble ? P.crumbleT : P.vanishT;
          if (v.crumble) { s.g.rotation.z = Math.sin(v.t * 55) * 0.05; s.g.position.y = s.y1 - Math.min(0.12, v.t * 0.2); }   // ぐらぐら
          else s.g.visible = v.t < P.vanishT * 0.45 || Math.floor(v.t * 14) % 2 === 0;   // ちかちか
          if (v.t > lim) { s.off = true; s.g.visible = !!v.crumble; v.t = -1; v.offT = v.crumble ? P.crumbleBack : P.vanishOff; v.fall = 0; if (me.on === s) me.on = null; if (v.crumble && T.onCrumble) T.onCrumble(); }
        }
      }
    }
    if (s.conv && s.conv.tex) {
      s.conv.tex.offset.x -= (s.conv.x / 2.4) * dt;    // もようが 流れる 方向へ 動く
      s.conv.tex.offset.y += (s.conv.z / 2.4) * dt;
    }
  }
  for (const b of bars) { b.ang += b.sp * dt; b.g.rotation.y = b.ang; }
  for (const e of extras) if (e.update) e.update(dt);
  lavaTex.offset.x += dt * 0.03; lavaTex.offset.y += dt * 0.05;   // 溶岩が ゆっくり 流れる
  // むかってくる レーザー：門から 一定の 間かくで 出て、手前へ 流れる（近くに いる 時だけ）
  for (const zn of zones) {
    if (zn.kind !== "laser") continue;
    const near = me.z > zn.z0 - 14 && me.z < zn.z1 + 1;
    zn.lamp.visible = !near || zn.t > 0.35 || Math.floor(T.time * 10) % 2 === 0;   // 出る 前に ちかちか
    if (!near) continue;
    zn.t -= dt;
    if (zn.t <= 0) { zn.t = zn.every; spawnBeam(zn, zn.z1 - 0.3); if (zn.dbl) spawnBeam(zn, zn.z1 + 1.4); if (T.onLaser) T.onLaser(); }
  }
  for (let i = beams.length - 1; i >= 0; i--) {
    const bm = beams[i];
    bm.z -= bm.sec.v * dt;
    if (bm.z < bm.sec.z1) bm.g.position.z = bm.z; else bm.g.position.z = bm.sec.z1 - 0.3;   // 2本目は 門の 中で まつ
    bm.g.visible = bm.z < bm.sec.z1 + 0.01;
    bm.g.children[1].scale.setScalar(1 + Math.sin(T.time * 20 + i) * 0.12);
    if (bm.z < bm.sec.z0 - 0.5) { disposeGroup(bm.g); beams.splice(i, 1); }
  }
  if (asmr) for (const s of solids) {
    if (!s.mat || s.floor) continue;
    const th = themeOf(s.mat);
    // キーボード：ふむと キーが しずむ
    if (th.press && s.baseY != null) s.g.position.y = damp(s.g.position.y, s.baseY - (me.on === s ? th.press : 0), 22, dt);
    // スライム：ぷるぷる ゆれる
    if (th.wobble) { s.wob = Math.max(0, (s.wob || 0) - dt * 1.2); const w = Math.sin(t * 16 + s.x0) * 0.16 * s.wob; s.g.scale.set(1 + w, 1 - w * 1.4, 1 + w); }
    // ぱりぱり：のると われる（しばらくして もどる）
    if (th.breakT && !s.pillar && !s.deco && !s.noBreak) {   // 角の 踊り場（noBreak）は われない（第11弾）
      if (s.off) { s.brkBack -= dt; if (s.brkBack <= 0) { s.off = false; s.g.visible = true; s.g.scale.setScalar(1); s.brk = -1; } }
      else {
        if (me.on === s && !(s.brk >= 0)) s.brk = 0;
        if (s.brk >= 0) {
          s.brk += dt;
          s.g.rotation.z = Math.sin(s.brk * 60) * 0.03;
          if (s.brk > th.breakT) { s.off = true; s.g.visible = false; s.brkBack = ASMR.pariBack; if (me.on === s) me.on = null; if (T.onStep) T.onStep("pari", "land"); spawnCrumbs(s, 0xd7a564, 14); }
        }
      }
    }
  }
  updateCrumbs(dt);

  // 看板：近づいたら うすくなる（前が 見えなく ならないように）
  for (const e of extras) if (e.sign) { const d = e.z - me.z; e.g.material.opacity = Math.max(0, Math.min(1, (d - 1.5) / 4)); e.g.visible = d > 1.5; }

  // スイッチと 扉
  for (const z of zones) {
    if (z.kind === "switch") {
      if (!z.open && me.on && Math.abs(me.y - z.y) < 0.2 && Math.hypot(me.x - z.x, me.z - z.z) < z.r) {
        z.open = true;
        z.cap.material = lambert(0x3cc98a, 0.35);
        z.cap.position.y = 0.1;
        if (T.onSwitch) T.onSwitch();
      }
      if (z.open && z.t < 1) {
        z.t = Math.min(1, z.t + dt / 0.8);
        z.door.g.position.y = z.door.y1 - z.t * 4.9;
        if (z.t > 0.35) z.door.off = true;
      }
    }
    if (z.kind === "wind") {
      z.fan.rotation.x += dt * 14;
      for (const m of z.streaks) {
        m.position.x += z.vx * 3.2 * m.userData.v * dt;
        if (m.position.x > z.x1) m.position.x = z.x0; else if (m.position.x < z.x0) m.position.x = z.x1;
      }
    }
  }

  // 歩く：スティックの 方向へ（床の 素材で 速さ・すべりが かわる）
  const fp = floorProps();
  if (me.wait > 0) me.wait -= dt;
  if (me.stun > 0) me.stun -= dt;
  if (me.jumpBuf > 0) me.jumpBuf -= dt;
  if (me.phaseT > 0) {
    me.phaseT -= dt;
    if (me.phaseT <= 0 && hits(me.x, me.z, me.y, 1.0)) me.phaseT = 0.05;    // かべの 中では まだ すけたまま
    if (me.phaseT <= 0) setGhost(false);
  }
  // ねばねば：立っていると だんだん しずむ（おもく なる）。はなれると もどる
  if (me.on && fp.sinkRate) me.neba = Math.min(fp.sinkMax, me.neba + fp.sinkRate * dt);
  else me.neba = Math.max(0, me.neba - dt * 2);
  const canMove = me.wait <= 0 && me.stun <= 0;
  T.speed = P.speed * (me.on ? fp.walk * (1 - me.neba * 0.8) : 1);   // プールの 中は プールの 速さ（floorProps）
  // スティックの 向き → ワールドの 向き（ASMR は カメラの 向きに あわせる。アスレは いつも 前が +z）
  const cy = asmr ? cam.yawS : 0;
  const fx = Math.sin(cy), fz = Math.cos(cy), rx = -Math.cos(cy), rz = Math.sin(cy);   // 前・画面の 右
  let tvx = canMove ? (fx * stick.y + rx * stick.x) * T.speed : 0;
  let tvz = canMove ? (fz * stick.y + rz * stick.x) * T.speed : 0;
  if (me.slideT > 0) {
    // パン：むいている 方向へ ソリの ように すべる（スティックで 少し かじとり）
    me.slideT -= dt;
    if (me.slideT <= 0 && !headroom(1.0)) me.slideT = 0.05;    // トンネルの 中では 立ち上がらない
    tvx = Math.sin(me.yaw) * P.slideV + -stick.x * 1.5;
    tvz = Math.cos(me.yaw) * P.slideV;
  }
  let grip = me.on ? fp.grip : 6;     // 空中は すこし ふんばりが きかない
  // 第7弾：ASMR は スティックを はなしたら ブレーキ（ほぼ その場で 止まる。たおしている 間の すべり感は テーマの まま）
  if (asmr && Math.hypot(stick.x, stick.y) < 0.08 && !(me.slideT > 0)) grip = me.on ? Math.max(fp.grip, ASMR.brake) : ASMR.brakeAir;
  me.vx = damp(me.vx, tvx, grip, dt);
  me.vz = damp(me.vz, tvz, grip, dt);
  // ころころ：ビーズの 上では 止まっていても 少し ころがされる
  if (me.on && fp.drift) { me.vx += Math.sin(t * 1.3 + me.z) * fp.drift * dt; me.vz += Math.cos(t * 1.1 + me.x) * fp.drift * dt; }
  me.blocked = false;
  const px = me.x;
  if (me.on && me.on.mov) me.x += me.on.mov.dx;        // 動く足場の上では いっしょに 動く
  moveAxis("x", me.vx * dt);
  moveAxis("z", me.vz * dt);
  if (me.on && me.on.conv) { moveAxis("x", me.on.conv.x * dt); moveAxis("z", me.on.conv.z * dt); }   // 流れる床
  for (const z of zones) if (z.kind === "wind" && me.z > z.z0 && me.z < z.z1 && me.y > z.y - 1 && me.y < z.y + 5) moveAxis("x", z.vx * dt);   // 横風
  const vx = (me.x - px) / Math.max(dt, 1e-4);
  const going = Math.hypot(me.vx, me.vz) > 0.4;

  // 上下：足場に のる（くらげは ふわりと 落ちる）
  const prevY = me.y;
  const floating = sk.floatFall && me.vy < 0 && !me.on;
  const rt = roomTheme();
  const grav = (rt && rt.grav) || 1;      // ふわふわの 部屋は 重力が よわい
  me.vy -= P.gravity * grav * (floating ? P.floatG : 1) * dt;
  if (floating) me.vy = Math.max(me.vy, -P.floatMaxFall);
  me.vy = Math.max(me.vy, -24);
  let ny = me.y + me.vy * dt;
  // 頭を ぶつける（天井・上の 足場を 下から つきぬけない）
  if (me.vy > 0) {
    const h = bodyH();
    for (const s of solids) {
      if (s.off || s.oneWay || (me.phaseT > 0 && !s.bound)) continue;   // 浮いた 足場は 下から つきぬけて OK
      if (!(me.x + 0.3 > s.x0 && me.x - 0.3 < s.x1 && me.z + 0.26 > s.z0 && me.z - 0.26 < s.z1)) continue;
      if (s.y0 >= prevY + h - 0.02 && s.y0 < ny + h) { ny = s.y0 - h; me.vy = 0; break; }
    }
  }
  let sup = null;
  for (const s of solids) {
    if (s.off) continue;
    if (!(me.x + 0.36 > s.x0 && me.x - 0.36 < s.x1 && me.z + 0.3 > s.z0 && me.z - 0.3 < s.z1)) continue;
    if (s.y1 > prevY + 0.05) continue;
    if (!sup || s.y1 > sup.y1) sup = s;
  }
  let landedNow = false, landImpact = 0, touched = null;   // touched：はねて すぐ はなれた 足場も ふくめて、いま 踏んだ 足場
  if (sup && me.vy <= 0 && ny <= sup.y1) {
    const impact = -me.vy;
    if (!me.on && (prevY - sup.y1 > 0.05 || impact > 1.5)) { landedNow = true; landImpact = impact; }
    touched = sup;
    const fall = prevY - sup.y1;
    const wasAir = !me.on;
    ny = sup.y1; me.vy = 0; me.on = sup; me.jumps = 0; me.airT = 0;
    const lp = sup.pool ? NORMAL : sup.mat ? { ...NORMAL, ...themeOf(sup.mat) } : NORMAL;   // プールは はねない・しずまない（プールの 手ざわり）
    if (wasAir && (fall > 0.15 || impact > 3)) {
      me.squash = Math.min(0.45, 0.1 + impact * 0.02 + (lp.bounce ? 0.15 : 0));
      me.sink = lp.bounce ? 0.4 : lp.sinkRate ? 0.3 : 0.12;
      if (lp.crumbs) spawnCrumbs(sup, 0xd9a05b, 6, me.x, me.z);
      if (lp.wobble) sup.wob = 1;
    }
    if (sup.pad) { me.vy = P.padV; me.on = null; me.squash = 0.3; if (T.onPad) T.onPad(); }
    else if (wasAir && lp.bounce && me.jumpBuf > 0) {
      // ぷにぷに・スライム：着地の 前に ジャンプを おしていたら、いつも 同じ 高さの 大ジャンプ
      me.jumpBuf = 0; me.vy = capCeil(P.jumpV * lp.jump); me.on = null; me.hopFrom = null;
      if (T.onBigBounce) T.onBigBounce();
    } else if (wasAir && lp.bounce && !me.hopFrom && fall > 0.6) {
      // ジャンプや 落ちて 着地した 時だけ、いつも 同じ 高さで 1回 ぽよんと はねる（はねた あとの 着地では はねない → 止まる）
      me.vy = capCeil(Math.sqrt(2 * P.gravity * lp.hopH)); me.on = null; me.hopFrom = sup;
    } else if (me.jumpBuf > 0) { me.jumpBuf = 0; me.on = sup; me.hopFrom = null; towerJump(); }
    else me.hopFrom = null;
  } else { me.on = null; me.airT += dt; }
  me.y = ny;
  if (asmr && T.dropPending && me.on) {
    T.dropPending = false;
    const k = Math.max(0, Math.floor((me.y + 0.5) / ASMR.floorH));
    if (T.onDrop) T.onDrop(k + 1, A.rooms[k].theme, k === 0 && me.y < 0.5);   // 1かいの 床まで 落ちたら さいしょから
  }

  // 回るバー：当たったら 少し 後ろへ はねる（落ちない）
  for (const b of bars) {
    if (me.stun > 0 || me.y - b.y > 0.8 || me.y < b.y - 0.3) continue;
    const rx = me.x - b.cx, rz = me.z - b.cz;
    const dx = Math.cos(b.ang), dz = -Math.sin(b.ang);
    const along = rx * dx + rz * dz, across = Math.abs(-rx * dz + rz * dx);
    if (Math.abs(along) < b.half + 0.2 && across < 0.5) {
      me.stun = 0.55; me.vy = 5; me.on = null; me.squash = -0.2; me.slideT = 0;
      me.z = Math.max(b.cz - 5, me.z - 1.6);
      if (T.onBump) T.onBump();
    }
  }

  // レーザー：当たったら 回る バーと 同じ（少し 後ろへ はねる。落ちない）。当たった あと しばらくは 当たらない
  if (T.immune > 0) T.immune -= dt;
  if (!asmr && T.immune <= 0 && me.stun <= 0) for (const bm of beams) {
    if (bm.z >= bm.sec.z1) continue;
    if (Math.abs(me.z - bm.z) < 0.4 && me.y < bm.y + P.laserH + 0.12 && me.y > bm.y - 0.6) {
      me.stun = 0.55; me.vy = 5; me.on = null; me.squash = -0.2; me.slideT = 0;
      me.z = Math.max(bm.sec.z0 - 1, me.z - 1.6); T.immune = P.laserImmune;
      if (T.onBump) T.onBump("laser");
      break;
    }
  }
  // 溶岩：おちたら「あちち」→ 直前の はたから
  for (const zn of zones) if (zn.kind === "lava" && me.z > zn.z0 && me.z < zn.z1 && me.y < zn.y + 0.15) { if (T.onLava) T.onLava(); respawn(true); break; }
  // ゴール
  if (B.course && !T.goal && me.on) for (const zn of zones) if (zn.kind === "goal" && me.z > zn.z && Math.abs(me.y - zn.y) < 1) {
    T.goal = true; me.wait = 99; stick.x = stick.y = 0;
    if (T.onGoal) T.onGoal(Math.round(T.runT * 10) / 10);
  }
  if (B.course) {
    if (!T.goal && T.time > 0.9) T.runT += dt;
    const pct = Math.max(0, Math.min(99, Math.floor(((me.z + 2) / Math.max(1, B.goalZ + 2)) * 100)));
    if (T.goal) T.pct = 100; else if (pct > T.pct) T.pct = pct;
    if (T.onCourseTick) T.onCourseTick(T.pct, Math.floor(T.runT));
  }

  // 高さの記録・チェックポイント（ASMR は チェックポイントなし）
  if (me.on && me.y > T.best) { T.best = me.y; if (T.onHeight) T.onHeight(Math.floor(T.best)); }
  if (asmr && me.y < -12) {   // 部屋の 外へ 落ちて しまった時の 安全（さいしょから）
    Object.assign(me, ME0, { x: 0, y: 0, z: 4.2, wait: 0.7 });
    T.camY = 0;
    if (T.onDrop) T.onDrop(1, A.rooms[0].theme);
  }
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
  if (!asmr && me.y < T.cp.y - 7) respawn();

  // 踏み音：その テーマの 足場を 踏んだ 瞬間に 鳴らす（歩く リズムでは 鳴らさない）
  me.ph += dt * (me.on && going ? 9.5 * Math.max(0.5, fp.walk) : 4);
  const hit = me.on || touched;
  // 第11弾：鳴らすのは「足音」では なく、踏んだ 素材 そのものの 音（hit.snd が あれば その 素材の 音）
  if (hit && hit.mat && (hit !== me.lastOn || landedNow) && !(hit.g && hit.g.userData.pop) && T.onStep) {
    const rule = SHAPE_SOUND[hit.kind] || {};
    let kind = rule.kind || (landedNow && landImpact > 4.5 ? "land" : "step"), rate = rule.rate || 1;
    if (hit.kind === "chocomallow") {   // はじめは チョコが パキッ、われた あとは 中の マシュマロが ふにゅっ
      const cr = hit.g.userData.crack;
      if (cr && !cr.visible) { cr.visible = true; kind = "land"; spawnCrumbs(hit, 0x5b3420, 8, me.x, me.z); } else { kind = "step"; rate = 0.82; }
      hit.crackT = 7;
    }
    T.onStep(hit.snd || hit.mat, kind, rate);
    if (hit.kind === "chocobar") spawnCrumbs(hit, 0x5a331d, landedNow ? 8 : 4, me.x, me.z);   // パキッ（かけら）
    me.poolDist = 0;
  }
  // プールの 上を 歩いている 間は、何歩か ぶん（every m）歩くたびに 素材の 音（ビーズが じゃらっ・スライムが ぷちゅっ …）
  if (me.on && me.on.pool && going && T.onStep) {
    me.poolDist = (me.poolDist || 0) + Math.hypot(me.vx, me.vz) * dt;
    if (me.poolDist > me.on.pool.every) { me.poolDist = 0; T.onStep(me.on.snd, "step", 0.9 + Math.random() * 0.22); }
  }
  // かざりの ほし：くるくる・ふわふわ
  if (asmr) for (const room of A.rooms) if (room.group.visible && room.twinkle) for (const st of room.twinkle) {
    st.rotation.y += st.userData.spin * dt;
    if (st.userData.y0 !== undefined) st.position.y = st.userData.y0 + Math.sin(T.time * 1.3 + st.userData.ph) * 0.18;
  }
  // プッシュポップ：のった マスが ポコッと へこむ（はなれて しばらくすると もどる）
  for (const s of solids) {
    const pp = s.g && s.g.userData.pop;
    if (!pp) continue;
    if (hit === s) {
      pp.t = 2.5;
      const lx = me.x - (s.x0 + s.x1) / 2, lz = me.z - (s.z0 + s.z1) / 2;
      const i = Math.floor((lx / (s.x1 - s.x0) + 0.5) * pp.n), j = Math.floor((lz / (s.z1 - s.z0) + 0.5) * pp.n);
      const c = pp.cells.find((q) => q.i === i && q.j === j);
      if (c && !c.popped) {
        c.popped = true;
        if (T.onStep) T.onStep(s.mat, landedNow && landImpact > 4.5 ? "land" : "step", 1);
      }
    } else if (pp.t > 0) {
      pp.t -= dt;
      if (pp.t <= 0) for (const c of pp.cells) c.popped = false;
    }
    for (const c of pp.cells) c.dome.scale.y = damp(c.dome.scale.y, c.popped ? -0.35 : 0.55, 20, dt);
  }
  me.lastOn = hit || (me.airT > 0.15 ? null : me.lastOn);

  /* ---------- 見た目 ---------- */
  me.sink = damp(me.sink, 0, 6, dt);
  me.squash = damp(me.squash, me.on ? me.neba * 0.25 : Math.max(-0.14, Math.min(0.05, -me.vy * 0.018)), me.on && fp.bounce ? 7 : 10, dt);
  const sliding = me.slideT > 0;
  const hop = me.on && going && !sliding ? Math.abs(Math.sin(me.ph)) * 0.12 : 0;
  if (going) {
    const want = Math.atan2(me.vx, me.vz);
    let d = want - me.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    me.yaw += d * (1 - Math.exp(-(sliding ? 5 : 12) * dt));
  }
  const ch = nr.cur;
  if (ch) {
    if (ch.body) {
      ch.body.scale.set(1 + me.squash * 0.8, 1 - me.squash, 1 + me.squash * 0.8);
      ch.body.rotation.set(0, Math.sin(me.ph) * 0.05, sliding ? 0 : Math.sin(me.ph) * 0.12);
    }
    me.starV += (-me.star * 60 - me.starV * 5 - Math.cos(me.ph) * 4 + vx * 0.04 - me.vy * 0.25) * dt;
    me.star += me.starV * dt;
    for (const s of [ch.starL, ch.starR]) if (s) { s.quaternion.copy(s.userData.q); s.rotateZ(Math.max(-0.7, Math.min(0.7, me.star))); }
    // パン：足を パタパタ（すべっている 間は 足を かくす）
    ch.feet.forEach((f, i) => {
      f.visible = !sliding;
      const sw = me.on && going ? Math.sin(me.ph * 2 + i * Math.PI) * 0.7 : 0;
      f.rotation.x = f.userData.rx + sw;
    });
    // くらげ：触手を ゆらゆら（ふわり中は ひろげる）
    ch.tentacles.forEach((c, i) => {
      const r = c.userData.r;
      const spread = floating ? 0.35 : 0;
      c.rotation.x = r.x + Math.sin(t * 5 + i * 0.9) * 0.18 + spread * Math.cos((i / ch.tentacles.length) * Math.PI * 2);
      c.rotation.z = r.z + Math.cos(t * 4 + i * 1.3) * 0.15 + spread * Math.sin((i / ch.tentacles.length) * Math.PI * 2);
    });
    // ペンギン：よちよち（体を 左右に ゆらす）＋羽を パタパタ（基準の 角度に 足す）
    ch.wings.forEach((w) => {
      const r = w.userData.r;
      const flap = (me.on ? (going ? Math.abs(Math.sin(me.ph)) * PENGUIN.flap : Math.sin(t * 2) * 0.05) : 0.5 + Math.sin(t * 22) * 0.4) * w.userData.side;
      w.rotation.set(r.x, r.y, r.z + flap);
    });
    if (ch.wings.length && ch.body && me.on && going) ch.body.rotation.z = Math.sin(me.ph) * PENGUIN.sway * 1.6;
    // パンの すべる ポーズ：X軸まわりに +90°（顔が下）・接地の 高さ
    const sc = ch.def.scale;
    nr.pose.rotation.x = damp(nr.pose.rotation.x, sliding ? PAN_SLIDE.rotX : 0, 18, dt);
    nr.pose.position.y = damp(nr.pose.position.y, sliding ? PAN_SLIDE.y * sc : 0, 18, dt);
  }
  const bob = ch && ch.def.skills.phase ? Math.sin(t * 2.4) * OBAKE.bob + OBAKE.bob : 0;   // おばけ：ふわふわ（ルートの position.y で）
  const mallowSink = me.on && (me.on.kind === "mallow" || me.on.kind === "chocomallow") ? 0.16 : me.on && me.on.pool ? me.on.pool.sink : 0;   // マシュマロ・プールに しずむ
  me.msink = damp(me.msink || 0, mallowSink, 7, dt);
  nr.root.position.set(me.x, me.y + (bob ? bob : hop) - me.sink * 0.25 - me.neba * 1.1 - me.msink, me.z);
  // はちみつに しずんでいる時：まわりに はちみつの わ（ねっとり）
  if (honeyRing) {
    const on = asmr && me.on && me.neba > 0.02;
    honeyRing.visible = on;
    if (on) { honeyRing.position.set(me.x, me.y + 0.01, me.z); const k = 0.5 + me.neba * 0.9; honeyRing.scale.set(k, k, 0.45); }
  }
  nr.root.rotation.set(0, me.yaw, 0);
  nr.root.visible = (me.wait <= 0 || Math.floor(me.wait * 12) % 2 === 0) && !(asmr && cam.fp);   // 一人称の 時は キャラを かくす
  shadow.material.opacity = (asmr && cam.fp) || me.neba > 0.02 ? 0 : 0.18;   // はちみつに しずんでいる 時は かげを 出さない（はちみつの わ が かわり）
  // ぷにぷにの 足場は ふまれると へこむ
  if (asmr) for (const s of solids) {
    if (!s.g || s.floor) continue;
    if (s.mat === "puni") s.g.scale.y = damp(s.g.scale.y, me.on === s ? 0.8 : 1, 12, dt);
    if (s.kind === "mallow") s.g.scale.y = damp(s.g.scale.y, me.on === s ? 0.72 : 1, 7, dt);   // マシュマロ：ふわっと しずむ
    if (s.kind === "chocomallow") {   // チョコマシュマロ：ふにゅっと へこむ。われた チョコは しばらくして もとに もどる
      s.g.scale.y = damp(s.g.scale.y, me.on === s ? 0.78 : 1, 9, dt);
      if (s.crackT > 0 && me.on !== s) { s.crackT -= dt; if (s.crackT <= 0) s.g.userData.crack.visible = false; }
    }
    if (s.g.userData.poolFx) poolFx(s, dt);
  }
  // 影
  let sy = null;
  for (const s of solids) if (!s.off && me.x + 0.3 > s.x0 && me.x - 0.3 < s.x1 && me.z > s.z0 && me.z < s.z1 && s.y1 <= me.y + 0.05 && (sy === null || s.y1 > sy)) sy = s.y1;
  shadow.visible = sy !== null;
  if (sy !== null) { shadow.position.set(me.x, sy + 0.04, me.z); shadow.scale.setScalar(Math.max(0.35, 1 - (me.y - sy) / 4)); }

  // カメラ：後ろの 少し上から
  T.camY = damp(T.camY, me.on ? me.y : Math.min(me.y, T.camY + 1.5), me.on ? 4 : 2, dt);
  const wide = camera.aspect > 1;
  if (asmr) {
    // スワイプして しばらく さわらないと、歩いている 方向へ カメラが ゆっくり まわりこむ（へんな 角度の まま に ならない）
    cam.idle += dt;
    if (cam.mode === "chase") {
      // 追い視点：キャラの 向きに いつも ついていく（スワイプで 見まわしても、歩きだすと うしろへ もどる）
      if (going || cam.idle > 0.8) { const dy = Math.atan2(Math.sin(me.yaw - cam.yaw), Math.cos(me.yaw - cam.yaw)); cam.yaw += dy * (1 - Math.exp(-ASMR_CAM.chase.turn * dt)); }
    } else if (cam.idle > ASMR_CAM.follow && going && me.on && !cam.fp) {
      const dy = Math.atan2(Math.sin(me.yaw - cam.yaw), Math.cos(me.yaw - cam.yaw));
      if (Math.abs(dy) < 2.4) cam.yaw += dy * (1 - Math.exp(-1.2 * dt));   // うしろ 向きに 歩く 時は まわらない
    }
    cam.yawS += (cam.yaw - cam.yawS) * (1 - Math.exp(-14 * dt));
    cam.pitchS += (cam.pitch - cam.pitchS) * (1 - Math.exp(-14 * dt));
    const half = ASMR.room / 2 - 0.35, ry = A.rooms[A.k] ? A.rooms[A.k].y : 0;
    // 吹き抜けを 上がる とちゅうは 天井が ないので、カメラも 上の かいの 高さまで 上がって よい（上の かいの 床は 半とうめい）
    const top = ry + ASMR.floorH * (A.approach ? 2 : 1) - 0.4;
    if (cam.fp) {
      // 一人称：目の 高さから、見ている 方向へ（キャラは かくす）
      const ey = me.y + ASMR_CAM.eye - me.neba * 0.9;
      camera.position.set(me.x + Math.sin(cam.yawS) * 0.15, Math.min(top, ey), me.z + Math.cos(cam.yawS) * 0.15);
      camera.lookAt(me.x + Math.sin(cam.yawS) * 5 * Math.cos(cam.pitchS), ey + Math.sin(-cam.pitchS) * 5 + 0.2, me.z + Math.cos(cam.yawS) * 5 * Math.cos(cam.pitchS));
    } else {
      // 寄った 視点（うしろ 少し上）。部屋の かべの 外には 出ない
      const chase = cam.mode === "chase";
      const dist = (chase ? ASMR_CAM.chase.dist : ASMR_CAM.dist) * (wide ? 1 : 1.2);      // たて画面は はばが せまいので 少しだけ はなれる
      const d = dist * Math.cos(cam.pitchS);
      // 見上げる 時（pitch が マイナス）は カメラを 低く して、見る 点を 上げる（足もとより 下には 行かない）
      const hgt = Math.max(1.1, (chase ? ASMR_CAM.chase.height : ASMR_CAM.height) + dist * Math.sin(cam.pitchS));
      const upLook = Math.max(0, -cam.pitchS) / -ASMR_CAM.pitchMin * ASMR_CAM.lookUpMax;
      let cx = me.x - Math.sin(cam.yawS) * d, cz = me.z - Math.cos(cam.yawS) * d;
      cx = Math.max(-half, Math.min(half, cx)); cz = Math.max(0.35, Math.min(ASMR.room - 0.35, cz));
      // かべに じゃまされて 近く なった ぶん、上から 見下ろす（キャラが 画面を ふさがない ように）
      const hd = Math.hypot(cx - me.x, cz - me.z);
      const short = Math.max(0, d - hd) * 0.9 + Math.max(0, ASMR_CAM.minDist - hd) * 1.4;
      let cyy = Math.min(top, T.camY + Math.min(hgt + short, A.approach ? 2.8 : 3.4));   // 上がりすぎない（真上から 見下ろす 角度に しない）
      // カメラが 足場（スプーンの さら・びん など）の 中に 入ったら、キャラの 方へ よせて 外に 出す
      // ただし キャラから 1.8m より 近くには よせない（よせすぎると カメラが キャラの 中に 入る）。
      // それでも 中なら、その 足場を 半とうめいに する（吹き抜けの 中など、足場に かこまれた 所）
      const inObj = (x, y, z) => solids.find((o) => !o.floor && !o.bound && !o.off && o.g && o.g !== nr.root && x > o.x0 - 0.25 && x < o.x1 + 0.25 && z > o.z0 - 0.25 && z < o.z1 + 0.25 && y > o.y0 - 0.9 && y < o.y1 + 0.35);
      for (let k = 0; k < 6 && inObj(cx, cyy, cz) && Math.hypot(cx - me.x, cz - me.z) > 2.4; k++) {
        cx = me.x + (cx - me.x) * 0.8; cz = me.z + (cz - me.z) * 0.8; cyy = Math.min(top, cyy + 0.25);
      }
      const hitO = inObj(cx, cyy, cz), hitG = hitO ? hitO.g : null;
      if (hitG !== T.camFade) {
        if (T.camFade) fadeGroup(T.camFade, A.approach && A.rooms[A.k + 1] && T.camFade.parent === A.rooms[A.k + 1].objGroup ? 0.45 : 1);
        if (hitG) fadeGroup(hitG, 0.3);
        T.camFade = hitG;
      }
      camera.position.set(cx, cyy, cz);
      // かべで 近く なった 時と 横画面（たての 見える はばが せまい）は 見る 点を 手前・低めに して、キャラが 画面から 切れない ように
      const near = Math.max(0.25, Math.min(1, (hd - 0.6) / Math.max(0.6, d - 0.6)));
      const ah = ASMR_CAM.ahead * near * (wide ? 0.75 : 1);
      camera.lookAt(me.x + Math.sin(cam.yawS) * ah, T.camY + (A.approach ? 0.9 : ASMR_CAM.lookUp * (wide ? 0.6 : 1)) + upLook, me.z + Math.cos(cam.yawS) * ah);   // 吹き抜けでは 上の かいの 方を 見る
    }
  } else {
    camera.position.set(me.x * 0.45, T.camY + (wide ? 3.0 : 3.4), me.z - (wide ? 6.2 : 6.8));
    camera.lookAt(me.x * 0.3, T.camY + (wide ? 0.1 : 1.0), me.z + 7);
  }

  // 景色：雲・遠くの塔・空の色（ASMR は テーマの 色）
  for (const c of clouds) {
    c.position.y = T.camY + c.userData.dy;
    if (c.position.z < me.z - 12) c.position.z += rand(85, 95);
  }
  farTower.position.set(-16, T.camY * 0.6 - 30, me.z + 110);
  if (asmr && T.themeIdx >= 0) {
    scene.background.lerp(new THREE.Color(LOOK[ASMR_THEMES[T.themeIdx].id].sky), 1 - Math.exp(-2 * dt));
  } else if (B.course) {
    scene.background.set(B.course.sky);   // コースごとの 空の 色
  } else {
    const h = T.camY;
    for (let i = 0; i < SKY.length - 1; i++) {
      const [h0, c0] = SKY[i], [h1, c1] = SKY[i + 1];
      if (h <= h1 || i === SKY.length - 2) { scene.background.copy(c0).lerp(c1, Math.max(0, Math.min(1, (h - h0) / (h1 - h0)))); break; }
    }
  }
  scene.fog.color.copy(scene.background);
  renderer.render(scene, camera);
}
