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
    sky: 0xf1edff, wall: 0xb9b0ee, parts: [0xffffff, 0xf2f2f7, 0xcfd6e6, 0xffd6e8, 0xd6f0ff],
    tex: canvasTex(256, 256, (x, w, h) => {   // キーボードの 面
      x.fillStyle = "#9d93d9"; x.fillRect(0, 0, w, h);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        x.fillStyle = "#e9ecf3"; x.beginPath(); x.roundRect(c * 64 + 5, r * 64 + 5, 54, 54, 9); x.fill();
        x.fillStyle = (r + c) % 3 ? "#f3efff" : "#ffe1ef"; x.beginPath(); x.roundRect(c * 64 + 11, r * 64 + 9, 42, 40, 7); x.fill();
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
  neba: {   // はちみつ：かべは あかるい クリーム（はちのす もよう）、床は すきとおった はちみつの 池。足場は びん・銀の スプーン
    sky: 0xfff9ec, wall: 0xfde9b8, parts: [0xff8fb1, 0x8fd3ff, 0x9be39b], liquid: 0xffa915,
    tex: canvasTex(256, 256, (x, w, h) => {   // 池の 底（はちのす）
      x.fillStyle = "#b8650c"; x.fillRect(0, 0, w, h);
      x.strokeStyle = "#e9a03a"; x.lineWidth = 7;
      const r = 26, dx = r * 1.732;
      for (let j = -1; j < 7; j++) for (let i = -1; i < 6; i++) {
        const cx = i * dx + (j % 2 ? dx / 2 : 0), cy = j * r * 1.5;
        x.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + (k * Math.PI) / 3; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath(); x.stroke();
      }
    }),
  },
  zaku: {
    sky: 0xeaf7ff, wall: 0x9fd6f2, parts: [0xd9a05b, 0xe8b673, 0xc68642],
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
    sky: 0xf0f9e8, wall: 0xa9d99a, parts: [0xd7a564, 0xc99352, 0xe0b578],
    tex: canvasTex(256, 256, (x, w, h) => {
      x.fillStyle = "#d9a865"; x.fillRect(0, 0, w, h);
      dots(x, w, h, 120, ["#b98444", "#c8934f", "#e6bd80"], 2, 6);
      x.fillStyle = "#1f3324"; x.fillRect(90, 0, 76, h);   // のり
    }),
  },
  choco: {
    sky: 0xfff0f5, wall: 0xffb3cf, parts: [0x6b3f24, 0xffffff, 0xffd6e6],
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
/* はちみつの 部屋の かべ：クリーム色に うすい はちのす（足場・池と 色が かぶらない ように あかるく） */
let honeyWall = null;
function honeycombWall() {
  if (!honeyWall) honeyWall = canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = "#fff6dc"; x.fillRect(0, 0, w, h);
    x.strokeStyle = "#f6d98a"; x.lineWidth = 4;
    const r = 18, dx = r * 1.732;
    for (let j = -1; j < 6; j++) for (let i = -1; i < 5; i++) {
      const cx = i * dx + (j % 2 ? dx / 2 : 0), cy = j * r * 1.5;
      x.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + (k * Math.PI) / 3; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath(); x.stroke();
    }
  });
  return honeyWall;
}
/* すきとおった はちみつ（キャラが しずんで いくのが 見える） */
export const honeyMat = () => new THREE.MeshLambertMaterial({ color: 0xffb21f, emissive: 0xff9500, emissiveIntensity: 0.35, transparent: true, opacity: 0.55, depthWrite: false });
/* 部屋ごとの 材質（上の フロアを すかす時に その部屋だけ うすく できるように 部屋ごとに つくる） */
function roomMats(id) {
  const L = LOOK[id];
  const floorTex = L.tex.clone(); floorTex.needsUpdate = true; floorTex.repeat.set(1, 1);
  const wallTex = (id === "neba" ? honeycombWall() : checkerTex(L.wall)).clone(); wallTex.needsUpdate = true; wallTex.repeat.set(ASMR.room / ASMR.tile, ASMR.floorH / ASMR.tile);
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
    x.font = `900 78px "NorunMaru","Hiragino Maru Gothic ProN",sans-serif`; x.fillText(ch, w / 2, h / 2 + 4);
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/* ---------- かわいい かざり（ほし・ガーランド） ---------- */
function starShape(r1, r0) {
  const sh = new THREE.Shape();
  for (let k = 0; k < 10; k++) { const a = Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? r0 : r1; const x = Math.cos(a) * r, y = Math.sin(a) * r; k ? sh.lineTo(x, y) : sh.moveTo(x, y); }
  sh.closePath(); return sh;
}
export const starGeo = new THREE.ExtrudeGeometry(starShape(0.36, 0.16), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 });
starGeo.center();
const STAR_COLORS = [0xffe17a, 0xffb3d6, 0xc7b3ff, 0xa8e6ff, 0xb8f0c8];
const starMats = STAR_COLORS.map((c) => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.45 }));
const flagGeo = (() => { const sh = new THREE.Shape(); sh.moveTo(-0.28, 0); sh.lineTo(0.28, 0); sh.lineTo(0, -0.5); sh.closePath(); return new THREE.ShapeGeometry(sh); })();
const flagMats = [0xff9ec7, 0xffe17a, 0xb59cff, 0x8fd3ff, 0x9be39b, 0xffffff].map((c) => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.35, side: THREE.DoubleSide }));
const ropeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
for (const m of [...starMats, ...flagMats, ropeMat]) m.userData.shared = true;   // 部屋どうしで つかい回す（半とうめいに しない）
/* かべに そった ガーランド（三角の はた）。a → b を たるませて つなぐ。nx,nz は 部屋の 内がわ */
function garland(group, a, b, y, sag) {
  const n = Math.max(6, Math.round(Math.hypot(b.x - a.x, b.z - a.z) / 0.75));
  const pts = [];
  for (let k = 0; k <= n; k++) { const t = k / n; pts.push(new THREE.Vector3(a.x + (b.x - a.x) * t, y - Math.sin(Math.PI * t) * sag, a.z + (b.z - a.z) * t)); }
  group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, 0.025, 4, false), ropeMat));
  const yaw = Math.atan2(b.x - a.x, b.z - a.z) - Math.PI / 2;
  for (let k = 1; k < n; k++) {
    const f = new THREE.Mesh(flagGeo, flagMats[k % flagMats.length]);
    f.position.copy(pts[k]); f.rotation.y = yaw; group.add(f);
  }
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
      break;
    }
    case "button": {   // 服の ボタン（4つの あな）
      add(new THREE.CylinderGeometry(w / 2, w / 2, 0.32, 28), M, (m) => { m.position.y = -0.16; m.scale.z = d / w; });
      add(new THREE.TorusGeometry(w / 2 - 0.08, 0.07, 8, 28), partMat(theme, new THREE.Color(c).multiplyScalar(0.85).getHex()), (m) => { m.rotation.x = Math.PI / 2; m.position.y = 0.0; m.scale.y = d / w; });
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(new THREE.CircleGeometry(0.1, 12), new THREE.MeshBasicMaterial({ color: 0x3b2a5a }), (m) => { m.rotation.x = -Math.PI / 2; m.position.set(dx * 0.2, 0.01, dz * 0.2); });
      break;
    }
    case "spoon": {    // スプーン：銀色の 大きな まるい さら（ここに のる）＋ カラフルな 長い え
      const silver = new THREE.MeshPhongMaterial({ color: 0xc9d3df, emissive: 0x6d7a8c, emissiveIntensity: 0.25, specular: 0xffffff, shininess: 90, side: THREE.DoubleSide });
      const bowl = new THREE.SphereGeometry(0.5, 28, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
      add(bowl, silver, (m) => { m.scale.set(w, 1.1, d * 1.15); m.position.y = 0.04; });          // さら（ふかさ 0.55m）
      add(new THREE.TorusGeometry(0.5, 0.045, 8, 36), silver, (m) => { m.rotation.x = Math.PI / 2; m.scale.set(w, d * 1.15, 1); m.position.y = 0.04; });   // ふち
      // え：さらの はしから のびて、すこし 上がる。先は まるく ふくらむ
      const hc = pick([0xff8fb1, 0x8fd3ff, 0x9be39b, 0xc7a8ff]);
      const hm = new THREE.MeshPhongMaterial({ color: hc, emissive: hc, emissiveIntensity: 0.25, shininess: 60 });
      const neck = new THREE.Group(); neck.position.set(0, 0.04, -(d * 1.15) / 2 + 0.05); neck.rotation.x = 0.35; g.add(neck);   // えは 少し 上がる
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, 1.0, 12), silver); stem.rotation.x = Math.PI / 2; stem.position.z = -0.45; neck.add(stem);
      const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 6, 14), hm); grip.rotation.x = Math.PI / 2; grip.scale.set(1.25, 1, 0.55); grip.position.z = -1.25; neck.add(grip);
      const gem = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); gem.position.set(0, 0.1, -1.4); neck.add(gem);
      if (theme === "neba") add(new THREE.CylinderGeometry(0.47, 0.3, 0.5, 28), honeyMat(), (m) => { m.scale.set(w, 1, d * 1.15); m.position.y = -0.25; m.renderOrder = 2; });   // さらの はちみつ
      if (theme === "shari") add(new THREE.SphereGeometry(0.4, 14, 10), partMat(theme, pick([0xffc4dc, 0xd3f5c8, 0xffffff])), (m) => { m.scale.set(w * 0.9, 0.45, d * 0.9); m.position.y = -0.05; });
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
    case "jar": {      // はちみつの びん：ふたは 開いていて、中の はちみつに のる（しずむと すけて 見える）
      const glass = new THREE.MeshPhongMaterial({ color: 0xe8f6ff, emissive: 0xbfe6ff, emissiveIntensity: 0.25, transparent: true, opacity: 0.32, shininess: 120, depthWrite: false, side: THREE.DoubleSide });
      add(new THREE.CylinderGeometry(w * 0.5, w * 0.5, 1.7, 28, 1, true), glass, (m) => { m.position.y = -0.7; m.scale.z = d / w; m.renderOrder = 3; });   // ガラス（ふちは はちみつより 少し 上）
      add(new THREE.TorusGeometry(w * 0.5, 0.06, 8, 32), new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 100 }), (m) => { m.rotation.x = Math.PI / 2; m.position.y = 0.15; m.scale.y = d / w; });
      add(new THREE.CylinderGeometry(w * 0.47, w * 0.47, 1.0, 28), new THREE.MeshLambertMaterial({ color: 0xf0a020, emissive: 0xc06a00, emissiveIntensity: 0.35 }), (m) => { m.position.y = -1.05; m.scale.z = d / w; });  // そこの こい はちみつ
      add(new THREE.CylinderGeometry(w * 0.47, w * 0.47, 0.55, 28), honeyMat(), (m) => { m.position.y = -0.275; m.scale.z = d / w; m.renderOrder = 2; });   // 上の すきとおった はちみつ
      // ラベル（ギンガムの リボン）と はちみつの たれ
      const lc = pick(L.parts);
      add(new THREE.CylinderGeometry(w * 0.505, w * 0.505, 0.36, 28, 1, true), new THREE.MeshLambertMaterial({ color: lc, emissive: lc, emissiveIntensity: 0.3 }), (m) => { m.position.y = -0.95; m.scale.z = d / w; });
      for (let i = 0; i < 3; i++) add(new THREE.CapsuleGeometry(0.08, rand(0.2, 0.5), 4, 8), new THREE.MeshLambertMaterial({ color: 0xffb21f, emissive: 0xff9500, emissiveIntensity: 0.4 }), (m) => { const a = rand(0, 6.28); m.position.set(Math.cos(a) * w * 0.51, -0.2, Math.sin(a) * w * 0.51 * (d / w)); });
      break;
    }
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
  const room = { r, y, theme: th, group, floorGroup, wallGroup, objGroup, mats, exit: null, objs: [], holes: [], twinkle: [] };
  const tileC = (i, j) => ({ x: -half + T * (i + 0.5), z: T * (j + 0.5) });
  const tileOf = (x, z) => ({ i: Math.max(0, Math.min(N - 1, Math.floor((x + half) / T))), j: Math.max(0, Math.min(N - 1, Math.floor(z / T))) });

  // ---- 道：かべぞいの らせん（天井の 下）→ すみの「吹き抜け」の 中を つみあがって 上の フロアへ ----
  // 天井（上の フロアの 床）の 下では、頭が つかえない 高さまでしか 足場を おかない。
  // そこから 上は 天井の ない 吹き抜け（床の 穴 2×2 マス）の 中に 足場を つむ（実機で「上に いけない」の 原因だった）
  const cz = R / 2;
  const jumpH = (P.jumpV * th.jump) ** 2 / (2 * P.gravity * (th.grav || 1));
  let rise = Math.max(0.42, Math.min(1.4, jumpH * 0.55));
  const ceilBottom = H - 0.5;
  const hOutMax = Math.max(1.0, ceilBottom - 1.0 - Math.min(jumpH, 1.9) * 0.95);   // 天井の 下で ジャンプしても 頭が ぶつからない 高さ
  const start = entry ? entry.start : { x: 0, z: 4.2 };
  // 吹き抜け：4すみの どれか（入ってきた 吹き抜けとは ちがう、スタートから とおい すみ）
  const corners = [[0, 0], [N - 2, 0], [0, N - 2], [N - 2, N - 2]]
    .filter(([i, j]) => !entry || i !== entry.i || j !== entry.j)
    .map(([i, j]) => ({ i, j, c: { x: -half + T * (i + 1), z: T * (j + 1) } }))
    .sort((p, q) => Math.hypot(q.c.x - start.x, q.c.z - start.z) - Math.hypot(p.c.x - start.x, p.c.z - start.z));
  const at = corners[Math.random() < 0.7 ? 0 : 1];
  const ac = at.c;     // 吹き抜けの まんなか
  // 吹き抜けの 中の 4つの 場所：すみ（C）・かべぞい（E1・E2）・内がわ（I：床に 2辺 せっする）
  const sx = ac.x > 0 ? 1 : -1, sz = ac.z > cz ? 1 : -1;   // すみの 方向
  const q = (ox, oz) => ({ x: ac.x + ox * T / 2, z: ac.z + oz * T / 2 });
  const QC = q(sx, sz), QE1 = q(-sx, sz), QI = q(-sx, -sz), QE2 = q(sx, -sz);
  const cycle = [QE1, QC, QE2, QI];                       // E1 → C → E2 → I（さいごは かならず I＝床に 出られる）
  let nIn = Math.max(2, Math.ceil((H - hOutMax) / rise));
  if (cycle[((4 - (nIn % 4)) % 4)] === QC) nIn++;          // さいしょの 場所が すみ（外から とどかない）なら 1だん ふやす
  const inSeq = Array.from({ length: nIn }, (_, k) => cycle[(((k - nIn) % 4) + 4) % 4]);
  const hIn = (H - hOutMax) / nIn;
  // 吹き抜けの さいしょの 足場の となり（床がわ）＝ らせんの さいごの 足場
  const first = inSeq[0];
  const outDir = first === QI ? (Math.abs(start.x - first.x) > Math.abs(start.z - first.z) ? [-sx, 0] : [0, -sz]) : first === QE1 ? [0, -sz] : [-sx, 0];
  const lastOut = { x: first.x + outDir[0] * 2.5, z: first.z + outDir[1] * 2.5 };
  // らせん：段の 数は 高さで きめる（部屋を 広げても 段は ふやさない）。lastOut から 逆に ならべて、
  // さいしょの 足場までは 床を 歩く（第7弾：広さで 歩く きょりを かせぐ）
  const nOut = Math.max(2, Math.round(hOutMax / rise));
  const dA = ASMR.stepGap / ASMR.ring;
  const aEnd = Math.atan2(lastOut.z - cz, lastOut.x);
  const ecOf = (e) => ({ x: -half + T * (e.i + 1), z: T * (e.j + 1) });
  const inSq = (p, c, m) => Math.abs(p.x - c.x) < T + m && Math.abs(p.z - c.z) < T + m;
  const ringPt = (k, d) => { const a = aEnd - d * (nOut - k) * dA; return { x: Math.cos(a) * ASMR.ring, z: cz + Math.sin(a) * ASMR.ring, a }; };
  // まわる 向き：低い 段が 下からの 吹き抜けの 真上や スタートの すぐ そばに 来ない 方
  const score = (d) => {
    let sc = 0;
    for (let k = 1; k <= Math.min(4, nOut - 1); k++) {
      const p = ringPt(k, d);
      if (entry && inSq(p, ecOf(entry), 1.0)) sc -= 10;
      sc += Math.min(4, Math.hypot(p.x - start.x, p.z - start.z)) * 0.1;
    }
    const p1 = ringPt(1, d);
    return sc + Math.min(9, Math.hypot(p1.x - start.x, p1.z - start.z)) * 0.3;   // さいしょの 足場までは 床を すこし 歩く
  };
  const dir = score(1) === score(-1) ? (Math.random() < 0.5 ? 1 : -1) : score(1) > score(-1) ? 1 : -1;
  const hOut = hOutMax;
  const L0 = LOOK[th.id];
  const steps = [];
  for (let k = 1; k <= nOut; k++) {
    const rp = ringPt(k, dir), a = rp.a;
    const p = k === nOut ? lastOut : { x: rp.x, z: rp.z };
    // 吹き抜け（下からの・上への）の 真上に 来た 段は、部屋の 内がわへ よせる
    if (k < nOut) for (const c of [entry && (hOut * k) / nOut < 3 ? ecOf(entry) : null, ac].filter(Boolean)) {
      for (let rr = ASMR.ring; rr > 1.5 && inSq(p, c, 1.1); rr -= 0.2) { p.x = Math.cos(a) * rr; p.z = cz + Math.sin(a) * rr; }
    }
    steps.push({ x: p.x, z: p.z, top: y + (hOut * k) / nOut, a });
  }
  inSeq.forEach((p, k) => steps.push({ x: p.x, z: p.z, top: y + hOut + hIn * (k + 1), a: 0, atrium: true, last: k === nIn - 1 }));

  for (const st of steps) {
    const { x: px, z: pz, top, a } = st;
    let kind = pick(th.shapes);
    if (st.atrium && kind === "spacebar") kind = "key";
    if (kind === "key") {   // キーの はたけ：キーが 2×2。1こずつ ふむと しずむ
      const kw = st.atrium ? 0.78 : 1.05, off = kw / 2 + 0.03;
      for (const [ox, oz] of [[-off, -off], [off, -off], [-off, off], [off, off]]) {
        const g = makeShape("key", kw, kw, th.id);
        const x = px + ox, z = pz + oz;
        g.position.set(x, top, z);
        objGroup.add(g);
        room.objs.push(api.add({ x0: x - kw / 2, x1: x + kw / 2, y0: top - 0.45, y1: top, z0: z - kw / 2, z1: z + kw / 2, g, mat: th.id, room: r, kind, baseY: top, oneWay: true, last: st.last }));
      }
      continue;
    }
    const big = st.atrium ? 1.6 : rand(1.9, 2.4);
    const w = kind === "spacebar" ? 2.6 : big, d = kind === "spacebar" ? 1.2 : st.atrium ? 1.6 : rand(1.9, 2.4);
    const g = makeShape(kind, w, d, th.id);
    // スペースバーは 円に そって 向きを かえる（当たり判定は 四角なので ざっくり 合わせる）
    const along = Math.abs(Math.cos(a)) > 0.7;
    const sw = kind === "spacebar" && along ? d : w, sd = kind === "spacebar" && along ? w : d;
    if (kind === "spacebar" && along) g.rotation.y = Math.PI / 2;
    if (kind === "spoon") {   // スプーンの えは かべの 方（外がわ）へ むける（道に はみ出さない）
      const ox = st.atrium ? sx : px, oz = st.atrium ? sz : pz - cz, ol = Math.hypot(ox, oz) || 1;
      g.rotation.y = Math.atan2(-ox / ol, -oz / ol);
    }
    g.position.set(px, top, pz);
    objGroup.add(g);
    room.objs.push(api.add({ x0: px - sw / 2, x1: px + sw / 2, y0: top - 0.45, y1: top, z0: pz - sd / 2, z1: pz + sd / 2, g, mat: th.id, room: r, kind, baseY: top, oneWay: true, last: st.last }));
  }
  // 吹き抜けの しるし：4すみに 黄色い 柱（「ここから 上の かいへ」）
  for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, H, 8), new THREE.MeshLambertMaterial({ color: 0xffd84d, emissive: 0xffb800, emissiveIntensity: 0.35 }));
    post.position.set(ac.x + ox * (T - 0.1), y + H / 2 - 0.5, ac.z + oz * (T - 0.1));
    objGroup.add(post);
    const st = new THREE.Mesh(starGeo, starMats[0]); st.scale.setScalar(1.3);
    st.position.set(post.position.x, y + H - 1.0, post.position.z); st.userData.spin = 1.2; objGroup.add(st); room.twinkle.push(st);
  }
  // 上の フロアの スタート：吹き抜けの 内がわ（I）の となりの 床
  room.exit = { i: at.i, j: at.j, start: { x: QI.x - sx * 2.2, z: QI.z } };
  room.atrium = { x0: ac.x - T, x1: ac.x + T, z0: ac.z - T, z1: ac.z + T };   // 上の かいへの 吹き抜け（第7弾：ここを のぼる 時は 上の かいを 半とうめいに）

  // 床に ころがっている 大きな 物（かざり。のっても いい）
  for (let i = 0; i < 3; i++) {
    const kind = pick(th.shapes);
    const w = rand(2.0, 2.8);
    // 下からの 穴の 上・スタートの すぐ そば・ほかの かざりとは かさならない 場所に おく
    let px = 0, pz = 7, ok = false;
    for (let t = 0; t < 40 && !ok; t++) {
      px = rand(-half * 0.45, half * 0.45); pz = rand(cz - half * 0.5, cz + half * 0.55);
      const ec = entry ? { x: -half + T * (entry.i + 1), z: T * (entry.j + 1) } : null;
      ok = Math.hypot(px - start.x, pz - start.z) > w / 2 + 1.3
        && !(ec && Math.abs(px - ec.x) < T + w / 2 + 0.2 && Math.abs(pz - ec.z) < T + w / 2 + 0.2)
        && !room.objs.some((o) => o.deco && Math.abs((o.x0 + o.x1) / 2 - px) < (o.x1 - o.x0) / 2 + w / 2 + 0.3 && Math.abs((o.z0 + o.z1) / 2 - pz) < (o.z1 - o.z0) / 2 + w / 2 + 0.3);
    }
    if (!ok) continue;
    const g = makeShape(kind === "spacebar" ? "key" : kind, w, w, th.id);
    const top = y + 0.4;
    g.position.set(px, top, pz);
    objGroup.add(g);
    room.objs.push(api.add({ x0: px - w / 2, x1: px + w / 2, y0: y, y1: top, z0: pz - w / 2, z1: pz + w / 2, g, mat: th.id, room: r, kind, baseY: top, deco: true }));
  }

  // 床：タイル（下からの 穴・落とし穴は あける）
  const holes = [];
  if (entry) for (const [di, dj] of [[0, 0], [1, 0], [0, 1], [1, 1]]) holes.push({ i: entry.i + di, j: entry.j + dj, atrium: true });
  if (r >= 1) {
    for (let k = 0; k < ASMR.traps; k++) {
      let t, tries = 0;
      do { t = { i: Math.floor(rand(0, N)), j: Math.floor(rand(1, N)) }; tries++; }
      while (tries < 30 && (holes.some((h) => Math.abs(h.i - t.i) + Math.abs(h.j - t.j) < 2) || used.has(`${t.i},${t.j}`) || room.objs.some((o) => o.deco && o.x1 > tileC(t.i, t.j).x - T / 2 && o.x0 < tileC(t.i, t.j).x + T / 2 && o.z1 > tileC(t.i, t.j).z - T / 2 && o.z0 < tileC(t.i, t.j).z + T / 2) || (entry && Math.hypot(tileC(t.i, t.j).x - entry.start.x, tileC(t.i, t.j).z - entry.start.z) < 3)));
      holes.push({ ...t, trap: true });
    }
  }
  room.holes = holes;
  const tileGeo = new THREE.BoxGeometry(T, 0.5, T);
  const honeyGeo = new THREE.BoxGeometry(T, 0.5, T), honeyFloorMat = L0.liquid ? honeyMat() : null;
  if (honeyFloorMat) mats.list.push(honeyFloorMat);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    if (holes.some((h) => h.i === i && h.j === j)) continue;
    const c = tileC(i, j);
    const m = new THREE.Mesh(tileGeo, [mats.side, mats.side, mats.floor, mats.side, mats.side, mats.side]);
    m.position.set(c.x, y - 0.25, c.z);
    if (L0.liquid) {   // はちみつの 池：そこは 0.5m 下。その上は すきとおった はちみつ（あるくと しずむ）
      m.position.y = y - 0.75;
      const hm = new THREE.Mesh(honeyGeo, honeyFloorMat); hm.position.set(c.x, y - 0.25, c.z); hm.renderOrder = 2; floorGroup.add(hm);
    }
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
  // かわいい かざり：かべの 上の ほうに ガーランド、部屋の 上の ほうに ふわふわ うかぶ ほし
  const gy = y + H - 2.2, inset = 0.35;
  garland(wallGroup, { x: -half + inset, z: R - inset }, { x: half - inset, z: R - inset }, gy, 0.7);
  garland(wallGroup, { x: -half + inset, z: inset }, { x: -half + inset, z: R - inset }, gy, 0.7);
  garland(wallGroup, { x: half - inset, z: inset }, { x: half - inset, z: R - inset }, gy, 0.7);
  garland(wallGroup, { x: half - inset, z: inset }, { x: -half + inset, z: inset }, gy, 0.7);
  for (let i = 0; i < 7; i++) {
    const a = rand(0, Math.PI * 2), rr = rand(1.5, ASMR.ring - 2.2);
    const st = new THREE.Mesh(starGeo, pick(starMats));
    st.position.set(Math.cos(a) * rr, y + rand(H - 4.5, H - 2.8), cz + Math.sin(a) * rr);
    st.rotation.z = rand(-0.4, 0.4); st.userData.spin = rand(0.4, 0.9) * (Math.random() < 0.5 ? 1 : -1); st.userData.y0 = st.position.y; st.userData.ph = rand(0, 6);
    wallGroup.add(st); room.twinkle.push(st);
  }
  // おくの かべの 看板（フロアの 番号と テーマ）
  api.sign(`${r + 1}かい ${th.name}`, th.sub, 0, y + H * 0.55, R - 0.05, room);
  return room;
}
