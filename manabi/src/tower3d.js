/* =========================================================
   アスレ（コース登り）と ASMRタワー（素材テーマの タワー）
   ※ 中の名前は もとの「塔」のまま（tower）。画面の 表示名は「アスレ」
   コースの部品を 自動で 上へ つないで、のぼりつづける。頂上なし
   - 移動は バーチャルパッド（たおした 方向にだけ 進み、はなすと 止まる）。ジャンプは ボタン
   - 落ちたら 直前の チェックポイント（旗）から すぐ やりなおし。何回でも OK
   - 記録＝のった足場の いちばん高い所（m）
   - キャラ（変身）：のるん／くらげ（二段ジャンプ・ふわり）／パン（すべる）。とくぎの 部品は その キャラの 時だけ 出る
   - ASMRタワー：区間ごとに 素材テーマ（しゃりしゃり・ぷにぷに・ねばねば…）。足場の 見た目・足音・はね・すべりが かわる
   ========================================================= */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/GLTFLoader.js";
import { findPinSlots, applyPins } from "./norun-model.js";
import { PLAY_TOWER as P, CHARACTERS, PAN_SLIDE, ASMR_THEMES, ASMR } from "./config.js";

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

/* ---------- ASMR の 素材の 見た目 ---------- */
const THEME_LOOK = {
  shari: {   // かきごおり：水色に 白い つぶと きらきら
    color: 0x9fd8ff, sky: 0xd8f1ff,
    tex: canvasTex(256, 256, (x, w, h) => {
      x.fillStyle = "#cdeeff"; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 520; i++) { x.fillStyle = `rgba(255,255,255,${rand(0.4, 1)})`; x.fillRect(rand(0, w), rand(0, h), rand(2, 5), rand(2, 5)); }
      x.strokeStyle = "#fff"; x.lineWidth = 3;
      for (let i = 0; i < 10; i++) { const cx = rand(10, w - 10), cy = rand(10, h - 10), r = rand(5, 9); x.beginPath(); x.moveTo(cx - r, cy); x.lineTo(cx + r, cy); x.moveTo(cx, cy - r); x.lineTo(cx, cy + r); x.stroke(); }
    }),
  },
  puni: {    // グミ：ピンクで すけて、まるい あわ
    color: 0xff8fc4, sky: 0xffe3f0, opacity: 0.86,
    tex: canvasTex(256, 256, (x, w, h) => {
      x.fillStyle = "#ffb3d9"; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) {
        const cx = rand(0, w), cy = rand(0, h), r = rand(8, 26);
        const g = x.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r);
        g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(0.5, "rgba(255,220,240,.5)"); g.addColorStop(1, "rgba(255,150,200,0)");
        x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
      }
    }),
  },
  neba: {    // はちみつ：こはく色に たれる もようと つや
    color: 0xf2b134, sky: 0xfff0c8,
    tex: canvasTex(256, 256, (x, w, h) => {
      x.fillStyle = "#ffcc4d"; x.fillRect(0, 0, w, h);
      x.fillStyle = "#e89a1c";
      for (let i = 0; i < 9; i++) { const cx = i * 30 + rand(0, 14), len = rand(40, 150); x.beginPath(); x.roundRect(cx, -10, rand(12, 20), len, 10); x.fill(); x.beginPath(); x.arc(cx + 8, len - 8, 11, 0, Math.PI * 2); x.fill(); }
      x.strokeStyle = "rgba(255,255,255,.55)"; x.lineWidth = 6; x.lineCap = "round";
      for (let i = 0; i < 7; i++) { const cx = rand(10, w - 40), cy = rand(60, h - 10); x.beginPath(); x.moveTo(cx, cy); x.quadraticCurveTo(cx + 15, cy - 8, cx + 34, cy); x.stroke(); }
    }),
  },
};
const themeOf = (id) => ASMR_THEMES.find((t) => t.id === id);
const themeMats = new Map();
function themeMat(id, top) {
  const key = id + (top ? ":top" : "");
  if (!themeMats.has(key)) {
    const L = THEME_LOOK[id];
    const m = top
      ? new THREE.MeshLambertMaterial({ map: L.tex, emissive: 0xffffff, emissiveIntensity: 0.12 })
      : new THREE.MeshLambertMaterial({ color: L.color, emissive: L.color, emissiveIntensity: 0.25 });
    if (L.opacity) { m.transparent = true; m.opacity = L.opacity; }
    themeMats.set(key, m);
  }
  return themeMats.get(key);
}

/* ---------- コース ---------- */
const COL = { floor: 0x9be39b, stair: 0xffd86b, step: 0x8fd3ff, gap: 0xff9ec7, zig: 0xc7a8ff, mover: 0xffa64d, bar: 0x9be3d6, wall: 0x8fd3ff,
  vanish: 0xb6a4ff, conv: 0x8b9bb4, door: 0xff9e5e, wind: 0xa8e6ff, duck: 0xffcf66, wide: 0x9be3d6 };
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
const extras = [];      // 景色や しかけ（{ z, g, update?(dt,t) }）
const zones = [];       // 風・スイッチなどの 区間（{ kind, x0, x1, z0, z1, y, ... }）
function addBox(x0, x1, y0, y1, z0, z1, color, opt = {}) {
  const g = new THREE.Group();
  const h = y1 - y0;
  const bodyMat = opt.pad ? padMat : opt.mat ? themeMat(opt.mat, false) : lambert(color);
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
    if (opt.mat) {
      topMat = themeMat(opt.mat, true).clone();
      topMat.map = THEME_LOOK[opt.mat].tex.clone();
      topMat.map.needsUpdate = true;
      topMat.map.repeat.set((x1 - x0) / 2.4, (z1 - z0) / 2.4);
    } else if (opt.conv) {
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
function addSign(z, y, text, sub, color = "#ff7eb6") {
  const tex = canvasTex(512, 160, (x, w, h) => {
    x.fillStyle = "rgba(255,255,255,.92)"; x.beginPath(); x.roundRect(6, 6, w - 12, h - 12, 40); x.fill();
    x.strokeStyle = color; x.lineWidth = 10; x.stroke();
    x.fillStyle = "#3b2a5a"; x.textAlign = "center"; x.textBaseline = "middle";
    x.font = `900 64px "Hiragino Maru Gothic ProN","Rounded Mplus 1c",sans-serif`; x.fillText(text, w / 2, sub ? 64 : h / 2);
    if (sub) { x.font = `800 34px "Hiragino Maru Gothic ProN",sans-serif`; x.fillStyle = "#7d6b9c"; x.fillText(sub, w / 2, 118); }
  });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.06), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  m.position.set(0, y + 4.3, z);
  m.rotation.y = Math.PI;   // カメラ（後ろ）の方を むく
  m.renderOrder = 5;
  scene.add(m);
  extras.push({ z, g: m, sign: true });
}

/* ---------- 部品 ---------- */
const B = { z: 0, y: 0, last: "", n: 0, mode: "athle", theme: 0, secLeft: 0, char: "norun" };
const mat = () => (B.mode === "asmr" ? ASMR_THEMES[B.theme % ASMR_THEMES.length].id : undefined);
function rest(len) {
  fullBox(B.y - 0.6, B.y, B.z, B.z + len, COL.floor, { mat: mat() });
  addFlag(B.z + 0.6, B.y);
  B.z += len;
}
const PARTS = {
  stairs() {   // かいだん：ジャンプなしで のぼれる
    const n = randInt(5, 7), rise = 0.4, dep = 1.3, y0 = B.y;
    for (let i = 0; i < n; i++) fullBox(y0 - 0.6, y0 + rise * (i + 1), B.z + i * dep, B.z + (i + 1) * dep, COL.stair, { mat: mat() });
    B.z += n * dep; B.y = y0 + rise * n;
  },
  gaps() {     // すき間を ジャンプで こえる
    const k = randInt(2, 3);
    for (let i = 0; i < k; i++) {
      B.z += rand(1.4, Math.min(2.5, 1.7 + B.y * 0.02));
      B.y += rand(0, 0.45);
      const len = rand(3, 4.2);
      fullBox(B.y - 0.6, B.y, B.z, B.z + len, COL.gap, { mat: mat() });
      B.z += len;
    }
  },
  steps() {    // はしごの ような 高い段（ジャンプで のぼる）
    const k = randInt(3, 4), dep = 2.6;
    const up = B.mode === "asmr" && mat() === "neba" ? 0.75 : 1.0;   // ねばねばは ジャンプが ひくいので 段も ひくく
    for (let i = 0; i < k; i++) {
      B.y += rand(0.85, 1.05) * up;
      fullBox(B.y - 1.6, B.y, B.z, B.z + dep, COL.step, { mat: mat() });
      B.z += dep;
    }
  },
  pad() {      // ジャンプ台 → 高い かべの 上へ
    const len = 3.2, hgt = rand(2.6, 3.0);
    fullBox(B.y - 0.6, B.y + 0.12, B.z, B.z + len, 0, { pad: true });
    B.z += len;
    B.y += hgt;
    fullBox(B.y - hgt - 0.6, B.y, B.z, B.z + 4, COL.wall, { mat: mat() });
    B.z += 4;
  },
  zigzag() {   // 1本道が 左右に ずれる（となりの 道と 重なっている 間に うつる）
    let l = randInt(0, 2);
    const k = randInt(3, 4), lap = 1.8;
    for (let i = 0; i < k; i++) {
      const len = rand(4.6, 5.6);
      laneBox(l, B.y - 0.6, B.y, B.z - (i ? lap : 0), B.z + len, COL.zig, { mat: mat() });
      B.z += len;
      l = l === 0 ? 1 : l === 2 ? 1 : (Math.random() < 0.5 ? 0 : 2);
    }
  },
  mover() {    // 左右に 動く足場
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
    bars.push({ cx: 0, cz, y: B.y, half, ang: rand(0, 6.28), sp: (Math.random() < 0.5 ? -1 : 1) * (1.3 + Math.min(0.6, B.y * 0.006)), g });
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
  wide() {     // ひろい すき間（くらげ：二段ジャンプ・ふわり）
    fullBox(B.y - 0.6, B.y, B.z, B.z + 3, COL.wide);
    addSign(B.z + 1, B.y, "🪼 2かい ジャンプ！", "");
    B.z += 3 + rand(5.0, 5.8);
    B.y += rand(0, 0.6);
    fullBox(B.y - 0.6, B.y, B.z, B.z + 4, COL.wide);
    B.z += 4;
  },
};
const ASMR_PARTS = ["stairs", "gaps", "steps", "zigzag"];   // 素材を 味わう 区間なので しかけは つかわない
function addPart() {
  if (B.mode === "asmr") {
    // 区間の はじめ：テーマの 看板
    if (B.secLeft <= 0) {
      if (B.n > 0) B.theme++;
      B.secLeft = ASMR.sectionParts;
      const th = ASMR_THEMES[B.theme % ASMR_THEMES.length];
      addSign(B.z + 1.5, B.y, th.name, th.sub, "#" + THEME_LOOK[th.id].color.toString(16).padStart(6, "0"));
      rest(5);
    }
    const name = pick(ASMR_PARTS.filter((k) => k !== B.last));
    B.last = name;
    PARTS[name]();
    rest(rand(3.2, 4.2));
    B.secLeft--;
    B.n++;
    return;
  }
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
const me = { x: 0, y: 0, z: 0, vx: 0, vz: 0, vy: 0, yaw: 0, on: null, squash: 0, ph: 0, star: 0, starV: 0, stun: 0, wait: 0, blocked: false, jumps: 0, slideT: 0, steps: 0, sink: 0 };
const stick = { x: 0, y: 0 };   // バーチャルパッド：x=右が +、y=上（前）が +。大きさ 0〜1
const skills = () => (nr.cur ? nr.cur.def.skills : {});

function clearCourse() {
  for (const s of solids) disposeGroup(s.g);
  for (const b of bars) disposeGroup(b.g);
  for (const f of flags) disposeGroup(f.g);
  for (const e of extras) disposeGroup(e.g);
  solids.length = 0; bars.length = 0; flags.length = 0; extras.length = 0; zones.length = 0;
}
/* opts.mode："athle"（アスレ）／"asmr"（ASMRタワー） */
export function startTower(opts) {
  stopTower();
  clearCourse();
  Object.assign(B, { z: -4, y: 0, last: "", n: 0, mode: opts.mode || "athle", theme: 0, secLeft: 0, char: nr.cur ? nr.cur.id : "norun" });
  if (B.mode === "asmr") { addPart(); } else rest(9);
  T = { ...opts, best: 0, falls: 0, camY: 0, time: 0, raf: 0, cp: { z: -2, y: 0 }, cpN: 0, speed: P.speed, themeIdx: -1 };
  Object.assign(me, { x: 0, y: 0, z: -2, vx: 0, vz: 0, vy: 0, yaw: 0, on: null, stun: 0, wait: 0.9, blocked: false, jumps: 0, slideT: 0, steps: 0, sink: 0 });
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
export function towerStick(x, y) {
  const m = Math.hypot(x, y);
  const k = m > 1 ? 1 / m : 1;
  stick.x = x * k; stick.y = y * k;
}
const floorProps = () => (me.on && me.on.mat ? themeOf(me.on.mat) : NORMAL);
export function towerJump() {
  if (!T || me.wait > 0) return false;
  if (me.slideT > 0 && !headroom(1.0)) return false;   // トンネルの 中では 立てない
  if (me.on) { me.vy = P.jumpV * floorProps().jump; me.jumps = 1; }
  else if (skills().doubleJump && me.jumps < 2) { me.vy = P.jumpV * 0.92; me.jumps = 2; }   // くらげ：空中で もう1回
  else return false;
  me.slideT = 0;
  me.on = null;
  me.squash = -0.22;
  return true;
}
/* とくぎ（パン：すべる） */
export function towerSkill() {
  if (!T || me.wait > 0 || !skills().slide || me.slideT > 0) return false;
  me.slideT = P.slideT;
  return true;
}
export const towerSkillName = () => (skills().slide ? "slide" : null);
export const towerState = () => (T ? {
  best: T.best, falls: T.falls, cpN: T.cpN, speed: T.speed, mode: B.mode, char: nr.cur && nr.cur.id, theme: T.themeIdx,
  me: { ...me, on: !!me.on, onMat: me.on && me.on.mat, onConv: !!(me.on && me.on.conv) },
  solids: solids.map((s) => ({ x0: s.x0, x1: s.x1, y0: s.y0, y1: s.y1, z0: s.z0, z1: s.z1, pad: !!s.pad, mov: !!s.mov, van: !!s.van, off: !!s.off, conv: !!s.conv, mat: s.mat })),
  bars: bars.map((b) => ({ cz: b.cz, y: b.y, ang: b.ang, half: b.half })),
  zones: zones.map((z) => ({ kind: z.kind, z: z.z, z0: z.z0, z1: z.z1, x: z.x, open: z.open, y: z.y })),
} : null);

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
  Object.assign(me, { x: 0, y: T.cp.y, z: T.cp.z, vx: 0, vz: 0, vy: 0, yaw: 0, on: null, stun: 0, wait: 0.7, jumps: 0, slideT: 0 });
  T.camY = T.cp.y;
  if (T.onFall) T.onFall(T.falls);
}

/* 1つの 軸ずつ 動かして、かべに ぶつかったら 止める（ひくい段は そのまま のぼる） */
const HW = 0.3, HD = 0.28;
const bodyH = () => (me.slideT > 0 ? 0.55 : 1.0);    // すべっている時は せが ひくい
function hits(x, z, y, h = bodyH()) {
  for (const s of solids) {
    if (s.off) continue;
    if (!(x + HW > s.x0 && x - HW < s.x1 && z + HD > s.z0 && z - HD < s.z1)) continue;
    if (s.y1 <= y + 0.02 || s.y0 >= y + h) continue;
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
function loop() {
  if (!T) return;
  T.raf = requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = (T.time += dt);
  const sk = skills();

  // コースを 先へ つぎたす・後ろを 消す
  while (B.z < me.z + 80) addPart();
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
        if (v.offT <= 0) { s.off = false; s.g.visible = true; s.g.scale.setScalar(1); }
        else if (v.offT < 0.4) { s.g.visible = true; s.g.scale.setScalar(1 - v.offT / 0.4 * 0.9); }   // ふわっと もどる
      } else {
        if (me.on === s && v.t < 0) v.t = 0;
        if (v.t >= 0) {
          v.t += dt;
          s.g.visible = v.t < P.vanishT * 0.45 || Math.floor(v.t * 14) % 2 === 0;   // ちかちか
          if (v.t > P.vanishT) { s.off = true; s.g.visible = false; v.t = -1; v.offT = P.vanishOff; if (me.on === s) me.on = null; }
        }
      }
    }
    if (s.conv && s.conv.tex) {
      s.conv.tex.offset.x -= (s.conv.x / 2.4) * dt;    // もようが 流れる 方向へ 動く
      s.conv.tex.offset.y += (s.conv.z / 2.4) * dt;
    }
  }
  for (const b of bars) { b.ang += b.sp * dt; b.g.rotation.y = b.ang; }

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
  const canMove = me.wait <= 0 && me.stun <= 0;
  T.speed = P.speed * (me.on ? fp.walk : 1);
  let tvx = canMove ? -stick.x * T.speed : 0;     // 画面の 右 ＝ ワールドの -x
  let tvz = canMove ? stick.y * T.speed : 0;
  if (me.slideT > 0) {
    // パン：むいている 方向へ ソリの ように すべる（スティックで 少し かじとり）
    me.slideT -= dt;
    if (me.slideT <= 0 && !headroom(1.0)) me.slideT = 0.05;    // トンネルの 中では 立ち上がらない
    tvx = Math.sin(me.yaw) * P.slideV + -stick.x * 1.5;
    tvz = Math.cos(me.yaw) * P.slideV;
  }
  const grip = me.on ? fp.grip : 6;     // 空中は すこし ふんばりが きかない
  me.vx = damp(me.vx, tvx, grip, dt);
  me.vz = damp(me.vz, tvz, grip, dt);
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
  me.vy -= P.gravity * (floating ? P.floatG : 1) * dt;
  if (floating) me.vy = Math.max(me.vy, -P.floatMaxFall);
  let ny = me.y + me.vy * dt;
  let sup = null;
  for (const s of solids) {
    if (s.off) continue;
    if (!(me.x + 0.36 > s.x0 && me.x - 0.36 < s.x1 && me.z + 0.3 > s.z0 && me.z - 0.3 < s.z1)) continue;
    if (s.y1 > prevY + 0.05) continue;
    if (!sup || s.y1 > sup.y1) sup = s;
  }
  if (sup && me.vy <= 0 && ny <= sup.y1) {
    const fall = prevY - sup.y1;
    const wasAir = !me.on;
    ny = sup.y1; me.vy = 0; me.on = sup; me.jumps = 0;
    const lp = sup.mat ? themeOf(sup.mat) : NORMAL;
    if (wasAir && fall > 0.15) {
      me.squash = Math.min(0.42, 0.1 + fall * 0.12 + lp.sink * 0.5);
      me.sink = lp.sink;
      if (T.onStep && sup.mat) T.onStep(sup.mat, "land");
    }
    if (sup.pad) { me.vy = P.padV; me.on = null; me.squash = 0.3; if (T.onPad) T.onPad(); }
    else if (wasAir && lp.bounce && fall > 0.6) { me.vy = Math.min(lp.bounce, Math.sqrt(2 * P.gravity * fall) * 0.6); me.on = null; }   // ぷにぷに：ぽよんと はねかえる（だんだん 止まる）
  } else me.on = null;
  me.y = ny;

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
  // ASMR：いまの テーマが かわったら 知らせる
  if (B.mode === "asmr" && me.on && me.on.mat) {
    const i = ASMR_THEMES.findIndex((x) => x.id === me.on.mat);
    if (i !== T.themeIdx) { T.themeIdx = i; if (T.onTheme) T.onTheme(ASMR_THEMES[i]); }
  }
  if (me.y < T.cp.y - 7) respawn();

  // 足音（ASMR の 素材の 床を 歩いた時）
  const prevPh = me.ph;
  me.ph += dt * (me.on && going ? 9.5 * Math.max(0.6, fp.walk) : 4);
  if (me.on && going && me.on.mat && Math.floor(me.ph / Math.PI) !== Math.floor(prevPh / Math.PI)) {
    me.steps++;
    if (me.steps % fp.stepEvery === 0 && T.onStep) T.onStep(me.on.mat, "step");
  }

  /* ---------- 見た目 ---------- */
  me.sink = damp(me.sink, 0, 6, dt);
  me.squash = damp(me.squash, me.on ? 0 : Math.max(-0.14, Math.min(0.05, -me.vy * 0.018)), me.on && fp.bounce ? 7 : 10, dt);
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
    // パンの すべる ポーズ：X軸まわりに +90°（顔が下）・接地の 高さ
    const sc = ch.def.scale;
    nr.pose.rotation.x = damp(nr.pose.rotation.x, sliding ? PAN_SLIDE.rotX : 0, 18, dt);
    nr.pose.position.y = damp(nr.pose.position.y, sliding ? PAN_SLIDE.y * sc : 0, 18, dt);
  }
  nr.root.position.set(me.x, me.y + hop - me.sink * 0.25, me.z);
  nr.root.rotation.set(0, me.yaw, 0);
  nr.root.visible = me.wait <= 0 || Math.floor(me.wait * 12) % 2 === 0;
  // ぷにぷにの 床は ふまれると へこむ
  for (const s of solids) if (s.mat === "puni") s.g.scale.y = damp(s.g.scale.y, me.on === s ? 0.82 : 1, 12, dt);
  // 影
  let sy = null;
  for (const s of solids) if (!s.off && me.x + 0.3 > s.x0 && me.x - 0.3 < s.x1 && me.z > s.z0 && me.z < s.z1 && s.y1 <= me.y + 0.05 && (sy === null || s.y1 > sy)) sy = s.y1;
  shadow.visible = sy !== null;
  if (sy !== null) { shadow.position.set(me.x, sy + 0.04, me.z); shadow.scale.setScalar(Math.max(0.35, 1 - (me.y - sy) / 4)); }

  // カメラ：後ろの 少し上から
  T.camY = damp(T.camY, me.on ? me.y : Math.min(me.y, T.camY + 1.5), me.on ? 4 : 2, dt);
  const wide = camera.aspect > 1;
  camera.position.set(me.x * 0.45, T.camY + (wide ? 3.0 : 3.4), me.z - (wide ? 6.2 : 6.8));
  camera.lookAt(me.x * 0.3, T.camY + (wide ? 0.1 : 1.0), me.z + 7);

  // 景色：雲・遠くの塔・空の色（ASMR は テーマの 色）
  for (const c of clouds) {
    c.position.y = T.camY + c.userData.dy;
    if (c.position.z < me.z - 12) c.position.z += rand(85, 95);
  }
  farTower.position.set(-16, T.camY * 0.6 - 30, me.z + 110);
  if (B.mode === "asmr" && T.themeIdx >= 0) {
    scene.background.lerp(new THREE.Color(THEME_LOOK[ASMR_THEMES[T.themeIdx].id].sky), 1 - Math.exp(-2 * dt));
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
