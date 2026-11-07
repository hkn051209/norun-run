/* =========================================================
   ASMRタワー：部屋（フロア）と 素材テーマの 見た目・足場の 形
   1フロア ＝ 四角い 部屋（ASMR.room 四方）。床は タイル（穴は タイル1まい）。かべ・床・足場が テーマの 素材
   足場は 物の形（キー・ボタン・スプーン・クッキー…）。かべぞいに らせん状に ならび、
   さいごは 天井の 穴（上の フロアの 床の 穴）まで のびる 柱
   ========================================================= */
import * as THREE from "three";
import { ASMR_THEMES, ASMR, PLAY_TOWER as P } from "./config.js";

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const themeOf = (id) => ASMR_THEMES.find((t) => t.id === id);

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const dots = (x, w, h, n, colors, r0, r1) => { for (let i = 0; i < n; i++) { x.fillStyle = pick(colors); x.beginPath(); x.arc(rand(0, w), rand(0, h), rand(r0, r1), 0, Math.PI * 2); x.fill(); } };

/* ---------- テーマの 見た目（色・空・床と かべの もよう・足場の 色） ---------- */
export const LOOK = {
  key: {
    sky: 0xe9eef7, wall: 0x5d6475, parts: [0xffffff, 0xf2f2f7, 0xcfd6e6, 0xffd6e8, 0xd6f0ff],
    tex: canvasTex(256, 256, (x, w, h) => {   // キーボードの 面
      x.fillStyle = "#3e4352"; x.fillRect(0, 0, w, h);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        x.fillStyle = "#e9ecf3"; x.beginPath(); x.roundRect(c * 64 + 5, r * 64 + 5, 54, 54, 9); x.fill();
        x.fillStyle = "#cfd4df"; x.beginPath(); x.roundRect(c * 64 + 11, r * 64 + 9, 42, 40, 7); x.fill();
      }
    }),
  },
  puni: {
    sky: 0xffe3f0, wall: 0xff9ccc, parts: [0xff7eb6, 0x9be39b, 0xffd86b, 0x8fd3ff, 0xc7a8ff], opacity: 0.9,
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
  shari: {
    sky: 0xd8f1ff, wall: 0x8fcdf5, parts: [0xcdeeff, 0xffffff, 0xffc4dc, 0xd3f5c8], opacity: 0.88,
    tex: canvasTex(256, 256, (x, w, h) => {
      x.fillStyle = "#cdeeff"; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 520; i++) { x.fillStyle = `rgba(255,255,255,${rand(0.4, 1)})`; x.fillRect(rand(0, w), rand(0, h), rand(2, 5), rand(2, 5)); }
      x.strokeStyle = "#fff"; x.lineWidth = 3;
      for (let i = 0; i < 10; i++) { const cx = rand(10, w - 10), cy = rand(10, h - 10), r = rand(5, 9); x.beginPath(); x.moveTo(cx - r, cy); x.lineTo(cx + r, cy); x.moveTo(cx, cy - r); x.lineTo(cx, cy + r); x.stroke(); }
    }),
  },
  neba: {
    sky: 0xfff0c8, wall: 0xe8a42a, parts: [0xffc94a, 0xf2b134, 0xffe08a],
    tex: canvasTex(256, 256, (x, w, h) => {
      x.fillStyle = "#ffcc4d"; x.fillRect(0, 0, w, h);
      x.fillStyle = "#e89a1c";
      for (let i = 0; i < 9; i++) { const cx = i * 30 + rand(0, 14), len = rand(40, 150); x.beginPath(); x.roundRect(cx, -10, rand(12, 20), len, 10); x.fill(); x.beginPath(); x.arc(cx + 8, len - 8, 11, 0, Math.PI * 2); x.fill(); }
      x.strokeStyle = "rgba(255,255,255,.55)"; x.lineWidth = 6; x.lineCap = "round";
      for (let i = 0; i < 7; i++) { const cx = rand(10, w - 40), cy = rand(60, h - 10); x.beginPath(); x.moveTo(cx, cy); x.quadraticCurveTo(cx + 15, cy - 8, cx + 34, cy); x.stroke(); }
    }),
  },
  zaku: {
    sky: 0xfbe9d2, wall: 0xc98a4a, parts: [0xd9a05b, 0xe8b673, 0xc68642],
    tex: canvasTex(256, 256, (x, w, h) => {
      x.fillStyle = "#e3ad6a"; x.fillRect(0, 0, w, h);
      dots(x, w, h, 260, ["#d29a55", "#efc387"], 2, 5);
      dots(x, w, h, 22, ["#5a3418", "#6b3f1f"], 6, 11);   // チョコチップ
    }),
  },
  slime: {
    sky: 0xe2ffe0, wall: 0x6fd17a, parts: [0x7be88a, 0x9df2c6, 0xb4f07a], opacity: 0.82,
    tex: canvasTex(256, 256, (x, w, h) => {
      x.fillStyle = "#86e895"; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 30; i++) { const cx = rand(0, w), cy = rand(0, h), r = rand(4, 16); x.strokeStyle = "rgba(255,255,255,.75)"; x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke(); }
    }),
  },
  fuwa: {
    sky: 0xfdf0ff, wall: 0xf7c6ec, parts: [0xffd1ec, 0xd6e4ff, 0xfff3c7, 0xe6d6ff],
    tex: canvasTex(256, 256, (x, w, h) => {
      x.fillStyle = "#ffe3f6"; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) { const cx = rand(0, w), cy = rand(0, h), r = rand(10, 30); const g = x.createRadialGradient(cx, cy, 1, cx, cy, r); g.addColorStop(0, "rgba(255,255,255,.9)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); }
    }),
  },
  pari: {
    sky: 0xf5ead8, wall: 0xb9864d, parts: [0xd7a564, 0xc99352, 0xe0b578],
    tex: canvasTex(256, 256, (x, w, h) => {
      x.fillStyle = "#d9a865"; x.fillRect(0, 0, w, h);
      dots(x, w, h, 120, ["#b98444", "#c8934f", "#e6bd80"], 2, 6);
      x.fillStyle = "#1f3324"; x.fillRect(90, 0, 76, h);   // のり
    }),
  },
  choco: {
    sky: 0xfbeee6, wall: 0x7a4a2e, parts: [0x6b3f24, 0xffffff, 0xffd6e6],
    tex: canvasTex(256, 256, (x, w, h) => {   // チョコの 床（板チョコの みぞ）
      x.fillStyle = "#6b3f24"; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = "#7d4b2c"; x.fillRect(i * 64 + 6, j * 64 + 6, 52, 52); x.fillStyle = "rgba(255,255,255,.12)"; x.fillRect(i * 64 + 8, j * 64 + 8, 48, 6); }
    }),
  },
  push: {
    sky: 0xf1f7ff, wall: 0x8fb8ff, parts: [0xff7eb6, 0xffa64d, 0xffd84d, 0x7be88a, 0x6cc0ff, 0xb48cff],
    tex: canvasTex(256, 256, (x, w, h) => {   // シリコンの ポコポコ
      x.fillStyle = "#cfe0ff"; x.fillRect(0, 0, w, h);
      const cols = ["#ff9ec7", "#ffc27a", "#ffe07a", "#9be39b", "#8fd3ff", "#c7a8ff"];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const cx = i * 64 + 32, cy = j * 64 + 32, g = x.createRadialGradient(cx - 8, cy - 8, 2, cx, cy, 26);
        g.addColorStop(0, "#fff"); g.addColorStop(0.35, cols[(i + j) % 6]); g.addColorStop(1, cols[(i + j + 1) % 6]);
        x.fillStyle = g; x.beginPath(); x.arc(cx, cy, 24, 0, Math.PI * 2); x.fill();
      }
    }),
  },
  koro: {
    sky: 0xf0f4ff, wall: 0x9aa6d9, parts: [0xff8fb1, 0x8fd3ff, 0xffd86b, 0x9be39b, 0xc7a8ff],
    tex: canvasTex(256, 256, (x, w, h) => {
      x.fillStyle = "#eef1fb"; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) {
        const cx = rand(0, w), cy = rand(0, h), r = rand(6, 11);
        x.fillStyle = pick(["#ff8fb1", "#8fd3ff", "#ffd86b", "#9be39b", "#c7a8ff"]); x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
        x.fillStyle = "rgba(255,255,255,.8)"; x.beginPath(); x.arc(cx - r * 0.35, cy - r * 0.35, r * 0.3, 0, Math.PI * 2); x.fill();
      }
    }),
  },
};

/* かべの 市松もよう（テーマの 色の こい・うすい 2色） */
const checkerTexs = new Map();
function checkerTex(c) {
  if (!checkerTexs.has(c)) {
    const a = new THREE.Color(c), b = a.clone().lerp(new THREE.Color(0xffffff), 0.28);
    checkerTexs.set(c, canvasTex(128, 128, (x) => {
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { x.fillStyle = "#" + ((i + j) % 2 ? a : b).getHexString(); x.fillRect(i * 64, j * 64, 64, 64); }
      x.strokeStyle = "rgba(255,255,255,.18)"; x.lineWidth = 2; x.strokeRect(0, 0, 128, 128);
    }));
  }
  return checkerTexs.get(c);
}
/* 部屋ごとの 材質（上の フロアを すかす時に その部屋だけ うすく できるように 部屋ごとに つくる） */
function roomMats(id) {
  const L = LOOK[id];
  const floorTex = L.tex.clone(); floorTex.needsUpdate = true; floorTex.repeat.set(1, 1);
  const wallTex = checkerTex(L.wall).clone(); wallTex.needsUpdate = true; wallTex.repeat.set(ASMR.room / 2.6, ASMR.floorH / 2.6);
  const floor = new THREE.MeshLambertMaterial({ map: floorTex, emissive: 0xffffff, emissiveIntensity: 0.1 });
  const side = new THREE.MeshLambertMaterial({ color: L.wall, emissive: L.wall, emissiveIntensity: 0.15 });
  const wall = new THREE.MeshLambertMaterial({ map: wallTex, color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.12, side: THREE.DoubleSide });
  return { floor, side, wall, list: [floor, side, wall] };
}
const partMat = (id, c) => {
  const L = LOOK[id];
  const m = new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.2 });
  if (L.opacity) { m.transparent = true; m.opacity = L.opacity; }
  return m;
};
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZあいうえおかきくけこ★♪";
function letterTex(ch) {
  const t = canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = "#3b2a5a"; x.textAlign = "center"; x.textBaseline = "middle";
    x.font = `900 78px "Hiragino Maru Gothic ProN",sans-serif`; x.fillText(ch, w / 2, h / 2 + 4);
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/* ---------- 足場の 形（上の面が y=0、w×d の はばに おさまる） ---------- */
function makeShape(kind, w, d, theme) {
  const L = LOOK[theme];
  const c = pick(L.parts);
  const g = new THREE.Group();
  const add = (geo, mat, f) => { const m = new THREE.Mesh(geo, mat); f && f(m); g.add(m); return m; };
  const M = partMat(theme, c);
  switch (kind) {
    case "key": case "spacebar": {   // キーボードの キー（すこし すぼまった 形＋文字）
      const cap = new THREE.CylinderGeometry(0.62, 0.72, 0.5, 4, 1); cap.rotateY(Math.PI / 4);
      add(cap, M, (m) => { m.scale.set(w / 1.0, 1, d / 1.0); m.position.y = -0.25; });
      add(new THREE.BoxGeometry(w * 0.82, 0.06, d * 0.82), partMat(theme, new THREE.Color(c).lerp(new THREE.Color(0xffffff), 0.4).getHex()), (m) => { m.position.y = 0.0; });
      if (kind === "key") add(new THREE.PlaneGeometry(w * 0.6, d * 0.6), new THREE.MeshBasicMaterial({ map: letterTex(pick([...LETTERS])), transparent: true }), (m) => { m.rotation.x = -Math.PI / 2; m.rotation.z = Math.PI; m.position.y = 0.035; });
      add(new THREE.BoxGeometry(w * 0.5, 1.2, d * 0.5), partMat(theme, 0x3e4352), (m) => { m.position.y = -1.1; });   // キーの じく
      break;
    }
    case "button": {   // 服の ボタン（4つの あな）
      add(new THREE.CylinderGeometry(w / 2, w / 2, 0.32, 28), M, (m) => { m.position.y = -0.16; m.scale.z = d / w; });
      add(new THREE.TorusGeometry(w / 2 - 0.08, 0.07, 8, 28), partMat(theme, new THREE.Color(c).multiplyScalar(0.85).getHex()), (m) => { m.rotation.x = Math.PI / 2; m.position.y = 0.0; m.scale.y = d / w; });
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(new THREE.CircleGeometry(0.1, 12), new THREE.MeshBasicMaterial({ color: 0x3b2a5a }), (m) => { m.rotation.x = -Math.PI / 2; m.position.set(dx * 0.2, 0.01, dz * 0.2); });
      break;
    }
    case "spoon": {    // スプーン（まるい ところに のる。え は かざり）
      add(new THREE.SphereGeometry(0.5, 20, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), partMat(theme, 0xdfe6ee), (m) => { m.scale.set(w, 0.45, d); m.position.y = 0; });
      add(new THREE.CircleGeometry(0.5, 24), partMat(theme, 0xf4f8fb), (m) => { m.rotation.x = -Math.PI / 2; m.scale.set(w * 0.95, d * 0.95, 1); m.position.y = 0.005; });
      add(new THREE.BoxGeometry(0.22, 0.08, 1.8), partMat(theme, 0xdfe6ee), (m) => { m.position.set(0, -0.02, -(d / 2 + 0.85)); });
      if (theme === "neba") add(new THREE.CircleGeometry(0.42, 24), partMat(theme, 0xf2b134), (m) => { m.rotation.x = -Math.PI / 2; m.scale.set(w * 0.8, d * 0.8, 1); m.position.y = 0.012; });
      if (theme === "shari") add(new THREE.SphereGeometry(0.4, 14, 10), partMat(theme, pick([0xffc4dc, 0xd3f5c8, 0xffffff])), (m) => { m.scale.set(w * 0.8, 0.35, d * 0.8); m.position.y = 0.0; });
      break;
    }
    case "icecube":    // こおり
      add(new THREE.BoxGeometry(w, 0.7, d), M, (m) => { m.position.y = -0.35; });
      add(new THREE.BoxGeometry(w * 0.7, 0.02, d * 0.7), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }), (m) => { m.position.y = 0.01; });
      break;
    case "gumdrop":    // グミ
      add(new THREE.CylinderGeometry(w * 0.42, w * 0.55, 0.55, 24), M, (m) => { m.position.y = -0.3; m.scale.z = d / w; });
      add(new THREE.SphereGeometry(w * 0.42, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M, (m) => { m.scale.set(1, 0.25, d / w); m.position.y = -0.04; });
      break;
    case "jar":        // はちみつの びん（ふたに のる）
      add(new THREE.CylinderGeometry(w * 0.48, w * 0.5, 1.0, 24), new THREE.MeshLambertMaterial({ color: 0xffc94a, emissive: 0xe89a1c, emissiveIntensity: 0.3, transparent: true, opacity: 0.85 }), (m) => { m.position.y = -0.62; m.scale.z = d / w; });
      add(new THREE.CylinderGeometry(w * 0.45, w * 0.45, 0.14, 24), partMat(theme, 0xd9534f), (m) => { m.position.y = -0.07; m.scale.z = d / w; });
      break;
    case "cookie":     // クッキー
      add(new THREE.CylinderGeometry(w / 2, w / 2, 0.34, 28), M, (m) => { m.position.y = -0.17; m.scale.z = d / w; });
      for (let i = 0; i < 6; i++) add(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshLambertMaterial({ color: 0x5a3418 }), (m) => { const a = rand(0, 6.28), r = rand(0, w * 0.35); m.position.set(Math.cos(a) * r, 0.01, Math.sin(a) * r * (d / w)); m.scale.y = 0.5; });
      break;
    case "blob":       // スライムの かたまり
      add(new THREE.SphereGeometry(0.5, 22, 14), M, (m) => { m.scale.set(w, 0.7, d); m.position.y = -0.33; });
      break;
    case "cotton":     // わたあめ
      for (let i = 0; i < 6; i++) add(new THREE.SphereGeometry(rand(0.38, 0.55), 14, 10), partMat(theme, pick(L.parts)), (m) => { m.position.set(rand(-w * 0.3, w * 0.3), -0.35 + rand(-0.08, 0.05), rand(-d * 0.3, d * 0.3)); });
      add(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 6), new THREE.MeshLambertMaterial({ color: 0xffffff }), (m) => { m.position.y = -1.2; });
      break;
    case "senbei":     // おせんべい（のると われる）
      add(new THREE.CylinderGeometry(w / 2, w / 2, 0.16, 28), M, (m) => { m.position.y = -0.08; m.scale.z = d / w; });
      add(new THREE.PlaneGeometry(w * 0.32, d * 0.98), new THREE.MeshLambertMaterial({ color: 0x1f3324, side: THREE.DoubleSide }), (m) => { m.rotation.x = -Math.PI / 2; m.position.y = 0.006; });
      break;
    case "bead":       // ビーズ（大きな たま）
      add(new THREE.SphereGeometry(Math.min(w, d) / 2, 22, 16), M, (m) => { m.position.y = -Math.min(w, d) / 2 + 0.05; });
      add(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), (m) => { m.position.set(-0.2, -0.05, -0.35); });
      break;
    case "chocobar": { // 板チョコ（みぞの ある 四角）
      const dark = new THREE.MeshLambertMaterial({ color: 0x5a331d, emissive: 0x3a1f10, emissiveIntensity: 0.2 });
      const lite = new THREE.MeshLambertMaterial({ color: 0x7d4b2c, emissive: 0x4a2a16, emissiveIntensity: 0.2 });
      add(new THREE.BoxGeometry(w, 0.32, d), dark, (m) => { m.position.y = -0.2; });
      const n = 3;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) add(new THREE.BoxGeometry(w / n - 0.1, 0.1, d / n - 0.1), lite, (m) => { m.position.set(-w / 2 + (i + 0.5) * (w / n), -0.04, -d / 2 + (j + 0.5) * (d / n)); });
      // 銀紙（すこし だけ）
      add(new THREE.BoxGeometry(w + 0.04, 0.34, d * 0.28), new THREE.MeshLambertMaterial({ color: 0xd8dde6, emissive: 0x9aa3b5, emissiveIntensity: 0.3 }), (m) => { m.position.set(0, -0.2, -d / 2 + d * 0.14); });
      break;
    }
    case "mallow": {   // マシュマロ（ふわっと ふくらんだ つつ）
      const mc = pick([0xffffff, 0xffe0ee, 0xfff4f9]);
      const mm = new THREE.MeshLambertMaterial({ color: mc, emissive: mc, emissiveIntensity: 0.25 });
      add(new THREE.CylinderGeometry(w * 0.46, w * 0.5, 0.75, 28), mm, (m) => { m.position.y = -0.47; m.scale.z = d / w; });
      add(new THREE.SphereGeometry(w * 0.46, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), mm, (m) => { m.scale.set(1, 0.22, d / w); m.position.y = -0.1; });
      break;
    }
    case "popit": {    // プッシュポップ（シリコンの いた に まるい ポコポコが 3×3）
      const base = pick(L.parts);
      add(new THREE.BoxGeometry(w, 0.28, d), new THREE.MeshLambertMaterial({ color: base, emissive: base, emissiveIntensity: 0.22 }), (m) => { m.position.y = -0.16; });
      const n = 3, cw = w / n, cd = d / n, cells = [];
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const cc = L.parts[(i + j * 2) % L.parts.length];
        const dome = new THREE.Mesh(new THREE.SphereGeometry(Math.min(cw, cd) * 0.38, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: cc, emissive: cc, emissiveIntensity: 0.25 }));
        dome.scale.y = 0.55;
        dome.position.set(-w / 2 + (i + 0.5) * cw, -0.02, -d / 2 + (j + 0.5) * cd);
        g.add(dome);
        cells.push({ i, j, dome, popped: false });
      }
      g.userData.pop = { n, cells, t: 0 };
      break;
    }
    default:
      add(new THREE.BoxGeometry(w, 0.4, d), M, (m) => { m.position.y = -0.2; });
  }
  return g;
}

/* ---------- 部屋を つくる ----------
   api.add(solid)：当たり判定の 箱を 登録（g が あれば 画面に 出す）
   entry：下から 上がってくる 穴の タイル {i, j}（1かいは null）
   かえす 部屋：{ r, y, theme, group, floorGroup, wallGroup, objGroup, exit, mats, objs } */
export function buildRoom(r, entry, api, used = new Set()) {
  const th = ASMR_THEMES[r % ASMR_THEMES.length];
  const R = ASMR.room, half = R / 2, T = ASMR.tile, N = Math.round(R / T), H = ASMR.floorH;
  const y = r * H;
  const mats = roomMats(th.id);
  const group = new THREE.Group(), floorGroup = new THREE.Group(), wallGroup = new THREE.Group(), objGroup = new THREE.Group();
  group.add(floorGroup, wallGroup, objGroup);
  const room = { r, y, theme: th, group, floorGroup, wallGroup, objGroup, mats, exit: null, objs: [], holes: [] };
  const tileC = (i, j) => ({ x: -half + T * (i + 0.5), z: T * (j + 0.5) });
  const tileOf = (x, z) => ({ i: Math.max(0, Math.min(N - 1, Math.floor((x + half) / T))), j: Math.max(0, Math.min(N - 1, Math.floor(z / T))) });

  // らせんの 道：かべぞいの 円の 上に、だんだん 高く 物を おく
  const cz = R / 2;
  const jumpH = (P.jumpV * th.jump) ** 2 / (2 * P.gravity * (th.grav || 1));
  const rise = Math.max(0.42, Math.min(1.5, jumpH * 0.55));
  let n = Math.ceil((H - 0.01) / rise);
  const start = entry ? tileC(entry.i, entry.j) : { x: 0, z: 3.2 };
  const a0 = Math.atan2(start.z - cz, start.x);
  const dir = Math.random() < 0.5 ? 1 : -1;
  const da = 2.75 / ASMR.ring;
  let exitT, guard = 0;
  for (;;) {
    const a = a0 + dir * (n + 0.6) * da;
    exitT = tileOf(Math.cos(a) * ASMR.ring, cz + Math.sin(a) * ASMR.ring);
    if ((!entry || exitT.i !== entry.i || exitT.j !== entry.j) || guard++ > 3) break;
    n++;
  }
  const stepH = H / n;
  const pc = tileC(exitT.i, exitT.j);      // さいごの 柱（天井の 穴の まんなか）
  for (let k = 1; k <= n; k++) {
    const last = k === n;
    const a = a0 + dir * (k + 0.6) * da;
    let px = Math.cos(a) * ASMR.ring, pz = cz + Math.sin(a) * ASMR.ring;
    if (k === n - 1) {   // 柱の ひとつ前は 柱に ちかづける（すき間 0.7 くらい）
      const dx = px - pc.x, dz = pz - pc.z, dl = Math.hypot(dx, dz) || 1;
      const want = 0.65 + 1.1 + 0.6;
      if (dl > want) { px = pc.x + (dx / dl) * want; pz = pc.z + (dz / dl) * want; }
    }
    const top = y + stepH * k;
    if (last) {   // さいごは 天井の 穴まで のびる 柱（まわりに すき間が あるので、そこから 下へ 落ちることも ある）
      const c = tileC(exitT.i, exitT.j);
      px = c.x; pz = c.z;
      const pw = 1.3;
      const g = new THREE.Group();
      const col = new THREE.Mesh(new THREE.BoxGeometry(pw * 0.7, top - y, pw * 0.7), mats.side);
      col.position.y = -(top - y) / 2;
      g.add(col, makeShape(th.shapes[0], pw, pw, th.id));
      g.position.set(px, top, pz);
      objGroup.add(g);
      const s = api.add({ x0: px - pw / 2, x1: px + pw / 2, y0: y, y1: top, z0: pz - pw / 2, z1: pz + pw / 2, g, mat: th.id, room: r, pillar: true, kind: th.shapes[0] });
      room.objs.push(s);
      break;
    }
    const kind = pick(th.shapes);
    if (kind === "key") {   // キーの はたけ：キーが 2×2。1こずつ ふむと しずむ
      const kw = 1.05;
      for (const [ox, oz] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) {
        const g = makeShape("key", kw, kw, th.id);
        const x = px + ox, z = pz + oz;
        g.position.set(x, top, z);
        objGroup.add(g);
        room.objs.push(api.add({ x0: x - kw / 2, x1: x + kw / 2, y0: top - 0.45, y1: top, z0: z - kw / 2, z1: z + kw / 2, g, mat: th.id, room: r, kind, baseY: top }));
      }
      continue;
    }
    const w = kind === "spacebar" ? 2.6 : rand(1.9, 2.4), d = kind === "spacebar" ? 1.2 : rand(1.9, 2.4);
    const g = makeShape(kind, w, d, th.id);
    // スペースバーは 円に そって 向きを かえる（当たり判定は 四角なので ざっくり 合わせる）
    const along = Math.abs(Math.cos(a)) > 0.7;
    const sw = kind === "spacebar" && along ? d : w, sd = kind === "spacebar" && along ? w : d;
    if (kind === "spacebar" && along) g.rotation.y = Math.PI / 2;
    if (kind === "spoon") g.rotation.y = -a + Math.PI / 2;
    g.position.set(px, top, pz);
    objGroup.add(g);
    const s = api.add({ x0: px - sw / 2, x1: px + sw / 2, y0: top - 0.45, y1: top, z0: pz - sd / 2, z1: pz + sd / 2, g, mat: th.id, room: r, kind, baseY: top });
    room.objs.push(s);
  }
  room.exit = exitT;

  // 床に ころがっている 大きな 物（かざり。のっても いい）
  for (let i = 0; i < 3; i++) {
    const kind = pick(th.shapes);
    const w = rand(2.0, 2.8);
    const px = rand(-2, 2), pz = rand(4.5, 8.5);
    const g = makeShape(kind === "spacebar" ? "key" : kind, w, w, th.id);
    const top = y + 0.4;
    g.position.set(px, top, pz);
    objGroup.add(g);
    room.objs.push(api.add({ x0: px - w / 2, x1: px + w / 2, y0: y, y1: top, z0: pz - w / 2, z1: pz + w / 2, g, mat: th.id, room: r, kind, baseY: top, deco: true }));
  }

  // 床：タイル（下からの 穴・落とし穴は あける）
  const holes = [];
  if (entry) holes.push(entry);
  if (r >= 1) {
    for (let k = 0; k < ASMR.traps; k++) {
      let t, tries = 0;
      do { t = { i: Math.floor(rand(0, N)), j: Math.floor(rand(1, N)) }; tries++; }
      while (tries < 30 && (holes.some((h) => Math.abs(h.i - t.i) + Math.abs(h.j - t.j) < 2) || used.has(`${t.i},${t.j}`)));
      holes.push({ ...t, trap: true });
    }
  }
  room.holes = holes;
  const tileGeo = new THREE.BoxGeometry(T, 0.5, T);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    if (holes.some((h) => h.i === i && h.j === j)) continue;
    const c = tileC(i, j);
    const m = new THREE.Mesh(tileGeo, [mats.side, mats.side, mats.floor, mats.side, mats.side, mats.side]);
    m.position.set(c.x, y - 0.25, c.z);
    floorGroup.add(m);
    api.add({ x0: c.x - T / 2, x1: c.x + T / 2, y0: y - 0.5, y1: y, z0: c.z - T / 2, z1: c.z + T / 2, g: null, mat: th.id, room: r, floor: true });
  }
  // 落とし穴の ふち（あぶない しるし）
  for (const h of holes) {
    if (!h.trap) continue;
    const c = tileC(h.i, h.j);
    const ring = new THREE.Mesh(new THREE.RingGeometry(T * 0.5, T * 0.56, 4, 1), new THREE.MeshBasicMaterial({ color: 0xff7a59, side: THREE.DoubleSide }));
    ring.rotation.set(-Math.PI / 2, 0, Math.PI / 4);
    ring.position.set(c.x, y + 0.02, c.z);
    floorGroup.add(ring);
  }

  // かべ：左・右・おく（見える）、手前（見えない。カメラは 手前から 部屋を のぞく）
  const wallH = H, th2 = 0.4;
  const walls = [
    { x0: half, x1: half + th2, z0: -th2, z1: R + th2, vis: true },
    { x0: -half - th2, x1: -half, z0: -th2, z1: R + th2, vis: true },
    { x0: -half, x1: half, z0: R, z1: R + th2, vis: true },
    { x0: -half, x1: half, z0: -th2, z1: 0, vis: true },
  ];
  for (const w of walls) {
    if (w.vis) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w.x1 - w.x0, wallH, w.z1 - w.z0), mats.wall);
      m.position.set((w.x0 + w.x1) / 2, y + wallH / 2 - 0.5, (w.z0 + w.z1) / 2);
      wallGroup.add(m);
    }
    api.add({ x0: w.x0, x1: w.x1, y0: y - 0.5, y1: y + wallH, z0: w.z0, z1: w.z1, g: null, room: r, bound: true });
  }
  // おくの かべの 看板（フロアの 番号と テーマ）
  api.sign(`${r + 1}かい ${th.name}`, th.sub, 0, y + 4.6, R - 0.05, room);
  return room;
}
