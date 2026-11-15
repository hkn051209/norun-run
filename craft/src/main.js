/* =========================================================
   のるんクラフト（仮） v3  本体
   描画（近くの チャンクだけ）・カメラ（三人称／一人称）・ねらい・たたく／おく・
   持ち物と マス目クラフト・おなかと 経験値・モード・敵／ペット／動物・つり・
   昼夜と 地下の 明るさ・セーブ（4スロット）・共有・画面の ボタン
   ========================================================= */
import * as THREE from "three";
import { VERSION, WORLD, RENDER, PLAYER, XP, CAM, DAY_LEN, NIGHT, MOB, AUTOSAVE_SEC } from "./config.js";
import { B, BLOCKS, isTarget, isSolid } from "./blocks.js";
import { I, ITEMS, itemName, isPlaceable, FOOD, HOTBAR_N, INV_N, ALL_ITEMS, START_INV, TOOL_KEYS, TIER_SHORT, toolName, hitsNeeded, dropOf, POWER, RECIPES, matchRecipe, layoutRecipe } from "./items.js";
import { COLORS, COLOR_INDEX, START_COLORS, nextColor } from "./colors.js";
import { makeAtlas, tileIcon, makeCracks, drawIcon } from "./textures.js";
import { World, raycast, BIOME, BIOME_NAME } from "./world.js";
import { buildChunk } from "./mesher.js";
import { Player } from "./player.js";
import { Input } from "./input.js";
import * as Save from "./save.js";
import * as Share from "./share.js";
import { loadNorun } from "./norun.js";
import { Mobs, ANIMALS } from "./mobs.js";
import { ArtScreen } from "./art.js";
import { NameTag } from "./nametag.js";
import { sfx, unlock } from "./sfx.js";

const $ = (id) => document.getElementById(id);
const QS = new URLSearchParams(location.search);
const DEBUG = QS.has("debug");
const errors = [];
addEventListener("error", (e) => errors.push(String(e.message)));
addEventListener("unhandledrejection", (e) => errors.push(String(e.reason)));
const lin = (v) => Math.pow(v, 2.2);       // 画面で 見た 明るさ → 計算用の 明るさ
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- 描画の 土台 ---------- */
const canvas = $("game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, RENDER.pixelRatioMax));
const scene = new THREE.Scene();
const SKY_DAY = new THREE.Color(0x8fd3ff), SKY_NIGHT = new THREE.Color(0x0e1638), SKY_DUSK = new THREE.Color(0xffb27a), SKY_CAVE = new THREE.Color(0x07080f);
scene.background = SKY_DAY.clone();
scene.fog = new THREE.Fog(scene.background.getHex(), RENDER.fogNear, RENDER.fogFar);
const camera = new THREE.PerspectiveCamera(CAM.fov, 1, 0.08, 220);
scene.add(camera);
const hemi = new THREE.HemisphereLight(0xffffff, 0x9aa7b8, 2.2);
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
scene.add(hemi, sun);

const atlas = makeAtlas();
const tex = new THREE.CanvasTexture(atlas);
tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace;
const matSolid = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, alphaTest: 0.5 });
const matWater = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, depthWrite: false });
/* ブロックの 明るさ：頂点の light＝(空の 光, あかりの 光) と、今の 昼夜から 決める。
   uEnv＝(地上の 明るさ, 地下の 明るさ, のるんの そばの 明るさ)。uGlow＝のるんの 位置 */
const glowU = { value: new THREE.Vector4(0, 0, 0, 0) };
const envU = { value: new THREE.Vector3(1, lin(NIGHT.cave), 0) };
for (const m of [matSolid, matWater]) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = glowU; sh.uniforms.uEnv = envU;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec2 light;\nvarying vec2 vL;\nvarying vec3 vWPos;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvL = light;\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec4 uGlow;\nuniform vec3 uEnv;\nvarying vec2 vL;\nvarying vec3 vWPos;")
      .replace("#include <color_fragment>", `#include <color_fragment>
        float lv = max(mix(uEnv.y, uEnv.x, vL.x), vL.y * vL.y);
        lv = max(lv, uEnv.z * smoothstep(${NIGHT.nearR.toFixed(1)}, 1.5, distance(vWPos, uGlow.xyz)));
        diffuseColor.rgb *= lv;`);
  };
}
const sea = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.MeshBasicMaterial({ color: 0xdff3ff }));
sea.rotation.x = -Math.PI / 2; sea.position.set(WORLD.sx / 2, -8, WORLD.sz / 2);
scene.add(sea);

/* ---------- ゲームの 状態 ---------- */
const g = {
  slot: -1, name: "", playerName: Save.DEFAULT_PLAYER, playing: false, paused: true, sleeping: false, ready: false,
  world: null, player: null,
  inv: new Array(INV_N).fill(null),              // 持ち物 36マス（0〜8 が ホットバー）。{ id, n } か null
  sel: 0,                                         // えらんで いる ホットバーの 枠
  tools: { pick: 0, axe: 0, shovel: 0, rod: 0 }, // 道具の 段階（0＝なし、1＝木、2＝石、3＝ほし）
  held: "hand",
  colors: START_COLORS.slice(), colorSel: COLOR_INDEX.aka, hatColor: null,
  art: Save.emptyArt(), equip: { weapon: -1, pet: -1 },
  mode: "survival", view: "third",
  hp: PLAYER.hpMax, hunger: PLAYER.hungerMax, xp: 0, level: 0,
  respawn: null, enemiesOn: true,
  yaw: 0, pitch: CAM.pitch0, time: DAY_LEN * 0.1, faceYaw: Math.PI,
  target: null, dig: null, fish: null, near: { bench: false, bed: false, water: null },
  invuln: 0, regenT: PLAYER.regenSec, camDist: 4.8, lookUp: 1.4,
  norun: null, light: { day: 1, blocks: 1, cave: NIGHT.cave, near: 1, chars: 1, sky: 1 },
  luck: null, fastFish: false, noGlow: false,
  counters: { broke: 0, placed: 0, saves: 0, hits: 0, knocks: 0, kills: 0, crafts: 0, deaths: 0, fish: 0, eaten: 0, fed: 0, levelUps: 0 },
  get colorSelKey() { return COLORS[this.colorSel].key; },
};
const roll = (p) => (g.luck === null ? Math.random() : g.luck) < p;
const creative = () => g.mode === "creative";
const hasColor = (key) => creative() || g.colors.includes(key);

/* ---------- 持ち物（マス） ---------- */
const invCount = (id) => g.inv.reduce((n, s) => n + (s && s.id === id ? s.n : 0), 0);
/* 入れる。入りきらなかった 数を 返す */
function invAdd(id, n) {
  for (let i = 0; i < INV_N && n > 0; i++) { const s = g.inv[i]; if (s && s.id === id && s.n < PLAYER.stack) { const k = Math.min(n, PLAYER.stack - s.n); s.n += k; n -= k; } }
  for (let i = 0; i < INV_N && n > 0; i++) { if (!g.inv[i]) { const k = Math.min(n, PLAYER.stack); g.inv[i] = { id, n: k }; n -= k; } }
  return n;
}
function invRemove(id, n) {
  for (let i = INV_N - 1; i >= 0 && n > 0; i--) { const s = g.inv[i]; if (s && s.id === id) { const k = Math.min(n, s.n); s.n -= k; n -= k; if (!s.n) g.inv[i] = null; } }
  return n === 0;
}
function takeFromSlot(i, n = 1) { const s = g.inv[i]; if (!s) return; s.n -= n; if (s.n <= 0) g.inv[i] = null; }
const selItem = () => g.inv[g.sel];

/* ---------- チャンク：のるんの 近くだけ 作って 描く ---------- */
const NC = WORLD.sx / WORLD.chunk;
const chunkMap = new Map();          // 番号（cx ＋ cz×16）→ { solid, water }
const dirtyChunks = new Set();
function dropChunk(k) {
  const c = chunkMap.get(k); if (!c) return;
  for (const m of [c.solid, c.water]) if (m) { scene.remove(m); m.geometry.dispose(); }
  chunkMap.delete(k);
}
function buildChunkAt(k) {
  dropChunk(k);
  const geo = buildChunk(g.world, k % NC, Math.floor(k / NC));
  const c = { solid: null, water: null };
  if (geo.solid) { c.solid = new THREE.Mesh(geo.solid, matSolid); scene.add(c.solid); }
  if (geo.water) { c.water = new THREE.Mesh(geo.water, matWater); c.water.renderOrder = 1; scene.add(c.water); }
  chunkMap.set(k, c);
}
function clearChunks() { for (const k of [...chunkMap.keys()]) dropChunk(k); dirtyChunks.clear(); }
/* 毎コマ：遠い チャンクを 消し、近い 順に 足りない チャンクを 少しずつ 作る */
function updateChunks(limit) {
  const p = g.player, pcx = Math.floor(p.x / WORLD.chunk), pcz = Math.floor(p.z / WORLD.chunk), R = RENDER.radius;
  for (const k of chunkMap.keys()) { const cx = k % NC, cz = Math.floor(k / NC); if (Math.abs(cx - pcx) > R + 1 || Math.abs(cz - pcz) > R + 1) dropChunk(k); }
  for (const k of dirtyChunks) if (chunkMap.has(k)) buildChunkAt(k);
  dirtyChunks.clear();
  const todo = [];
  for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
    const cx = pcx + dx, cz = pcz + dz;
    if (cx < 0 || cz < 0 || cx >= NC || cz >= NC) continue;
    const k = cx + cz * NC;
    if (!chunkMap.has(k)) todo.push([dx * dx + dz * dz, k]);
  }
  if (!todo.length) return 0;
  todo.sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < Math.min(limit, todo.length); i++) buildChunkAt(todo[i][1]);
  return todo.length;
}
function markDirty(x, z, wide) {
  const S = WORLD.chunk, r = wide ? NIGHT.lampR : 1;
  for (const [xx, zz] of [[x, z], [x - r, z], [x + r, z], [x, z - r], [x, z + r], [x - r, z - r], [x + r, z + r], [x - r, z + r], [x + r, z - r]]) {
    if (xx >= 0 && zz >= 0 && xx < WORLD.sx && zz < WORLD.sz) dirtyChunks.add(Math.floor(xx / S) + Math.floor(zz / S) * NC);
  }
}
let saveSoon = AUTOSAVE_SEC;
function touchSave() { saveSoon = Math.min(saveSoon, 2); }
function setBlock(x, y, z, id) {
  const old = g.world.get(x, y, z);
  if (!g.world.set(x, y, z, id)) return false;
  markDirty(x, z, id === B.LAMP || old === B.LAMP);      // あかりは 周りの チャンクも 作り直す
  if (id !== B.FLOWER && g.world.get(x, y + 1, z) === B.FLOWER) g.world.set(x, y + 1, z, B.AIR);
  touchSave();
  return true;
}

/* ---------- ねらった ブロックの 光 と ヒビ ---------- */
const hl = new THREE.Group();
const hlFill = new THREE.Mesh(new THREE.BoxGeometry(1.012, 1.012, 1.012), new THREE.MeshBasicMaterial({ color: 0xfff27a, transparent: true, opacity: 0.25, depthWrite: false, fog: false }));
const hlLine = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.014, 1.014, 1.014)), new THREE.LineBasicMaterial({ color: 0xffffff, fog: false }));
hl.add(hlFill, hlLine); hl.visible = false; hl.renderOrder = 2; scene.add(hl);
const crackTex = new THREE.CanvasTexture(makeCracks());
crackTex.magFilter = crackTex.minFilter = THREE.NearestFilter; crackTex.generateMipmaps = false; crackTex.repeat.set(0.25, 1);
const crack = new THREE.Mesh(new THREE.BoxGeometry(1.008, 1.008, 1.008), new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, depthWrite: false, fog: false }));
crack.visible = false; crack.renderOrder = 3; scene.add(crack);
const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = 1; scene.add(shadow);

/* ---------- 手に 持つ 物（絵を 立てた 板・両面）。三人称は のるんの 手、一人称は 画面の 右下 ---------- */
const heldMat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.08, side: THREE.DoubleSide });
const heldPivot = new THREE.Group();
const heldMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.85), heldMat);
heldMesh.position.y = 0.36; heldPivot.add(heldMesh); heldPivot.position.set(0.66, 0.26, 0.12); heldPivot.visible = false;
const fpPivot = new THREE.Group();
const fpMat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.08, side: THREE.DoubleSide, depthTest: false, fog: false });
const fpMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), fpMat);
fpMesh.position.y = 0.15; fpMesh.renderOrder = 9; fpPivot.add(fpMesh); fpPivot.position.set(0.3, -0.34, -0.6); fpPivot.rotation.z = -0.25; fpPivot.visible = false;
camera.add(fpPivot);
let swingT = 0, heldOn = false;
const iconTex = new Map(), artTex = new WeakMap();
function texOfIcon(kind, tier) {
  const key = kind + tier;
  if (!iconTex.has(key)) { const t = new THREE.CanvasTexture(drawIcon(kind, tier)); t.colorSpace = THREE.SRGBColorSpace; iconTex.set(key, t); }
  return iconTex.get(key);
}
function texOfArt(entry) {
  if (!artTex.has(entry)) { const t = new THREE.TextureLoader().load(entry.img); t.colorSpace = THREE.SRGBColorSpace; artTex.set(entry, t); }
  return artTex.get(entry);
}
function refreshHeld() {
  let t = null;
  if (g.held === "weapon") { const e = g.art.weapons[g.equip.weapon]; if (e) t = texOfArt(e); else g.held = "hand"; }
  else if (TOOL_KEYS.includes(g.held)) { const e = g.art.tools[g.held]; t = e ? texOfArt(e) : texOfIcon(g.held, g.tools[g.held]); }
  heldOn = !!t;
  if (t && heldMat.map !== t) { heldMat.map = t; heldMat.needsUpdate = true; fpMat.map = t; fpMat.needsUpdate = true; }
}
function refreshPet() { const e = g.equip.pet >= 0 ? g.art.pets[g.equip.pet] : null; mobs.setPet(e ? texOfArt(e) : null); }

const bobber = new THREE.Group();
{ const r = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff5a5a })); const w = new THREE.Mesh(new THREE.SphereGeometry(0.112, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff })); bobber.add(r, w); }
bobber.visible = false; scene.add(bobber);

/* ---------- 雪（雪原で ふる。軽い 点の 集まり） ---------- */
const SNOW_N = 160, SNOW_BOX = [26, 14, 26];
const snowPos = new Float32Array(SNOW_N * 3);
for (let i = 0; i < SNOW_N * 3; i++) snowPos[i] = Math.random() * SNOW_BOX[i % 3];
const snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute("position", new THREE.BufferAttribute(snowPos, 3));
const snowFx = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.13, transparent: true, opacity: 0.9, depthWrite: false, fog: false }));
snowFx.frustumCulled = false; snowFx.visible = false; scene.add(snowFx);
function updateSnow(dt, now) {
  const p = g.player;
  const on = g.world.biomeAt(p.x, p.z) === BIOME.SNOW && g.light.sky > 0.5;
  snowFx.visible = on;
  if (!on) return;
  for (let i = 0; i < SNOW_N; i++) {
    let y = snowPos[i * 3 + 1] - dt * (1.6 + (i % 5) * 0.25);
    if (y < 0) y += SNOW_BOX[1];
    snowPos[i * 3 + 1] = y;
    snowPos[i * 3] = (snowPos[i * 3] + dt * 0.4 * Math.sin(now * 0.001 + i) + SNOW_BOX[0]) % SNOW_BOX[0];
  }
  snowGeo.attributes.position.needsUpdate = true;
  snowFx.position.set(Math.floor(p.x) - SNOW_BOX[0] / 2, p.y - 3, Math.floor(p.z) - SNOW_BOX[2] / 2);
}

/* ---------- ハートの 演出（動物に 餌を あげた 時） ---------- */
const heartTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"); x.fillStyle = "#ff5c8a"; x.beginPath(); x.moveTo(32, 56); x.bezierCurveTo(2, 34, 8, 8, 32, 22); x.bezierCurveTo(56, 8, 62, 34, 32, 56); x.fill(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const hearts3d = [];
function popHearts(x, y, z) {
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false, fog: false }));
    s.scale.setScalar(0.32); s.position.set(x + (Math.random() - 0.5) * 0.6, y + 0.5 + Math.random() * 0.3, z + (Math.random() - 0.5) * 0.6);
    scene.add(s); hearts3d.push({ s, t: 1.3 + i * 0.12 });
  }
}
function updateHearts(dt) {
  for (let i = hearts3d.length - 1; i >= 0; i--) {
    const h = hearts3d[i]; h.t -= dt; h.s.position.y += dt * 0.7; h.s.material.opacity = Math.min(1, h.t);
    if (h.t <= 0) { scene.remove(h.s); h.s.material.dispose(); hearts3d.splice(i, 1); }
  }
}

/* ---------- 画面の 部品 ---------- */
const els = { jump: $("btnJump"), brk: $("btnBreak"), put: $("btnPlace"), ctx: $("btnCtx"), pad: $("pad"), knob: $("knob") };
let toastT = 0;
function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 1800);
}
const press = (el, fn) => { el.addEventListener("pointerdown", (e) => { e.preventDefault(); unlock(); fn(e); }); el.addEventListener("contextmenu", (e) => e.preventDefault()); };

/* 持ち物の アイコン（ブロックは ドット絵、それ以外は 絵） */
function iconOf(id) {
  if (BLOCKS[id]) { const c = tileIcon(atlas, BLOCKS[id].icon, 32, id === B.COLOR ? COLORS[g.colorSel].hex : null); c.className = "px"; return c; }
  return drawIcon(ITEMS[id].icon);
}
function fillSlot(el, s) {
  el.innerHTML = "";
  if (!s) return;
  el.appendChild(iconOf(s.id));
  if (s.n > 1) { const n = document.createElement("span"); n.className = "num"; n.textContent = s.n; el.appendChild(n); }
}

/* ホットバー：持ち物の 0〜8 番 */
const hotEls = [];
function buildHotbar() {
  const bar = $("hotbar"); bar.innerHTML = ""; hotEls.length = 0;
  for (let i = 0; i < HOTBAR_N; i++) {
    const b = document.createElement("button"); b.className = "slot"; b.dataset.i = i;
    press(b, () => selectSlot(i));
    bar.appendChild(b); hotEls.push(b);
  }
}
let hotSig = "";
function refreshHotbar() {
  const sig = g.inv.slice(0, HOTBAR_N).map((s) => (s ? s.id + ":" + s.n : "")).join(",") + "|" + g.colorSel;
  if (sig !== hotSig) { hotSig = sig; hotEls.forEach((el, i) => { fillSlot(el, g.inv[i]); el.dataset.id = g.inv[i] ? g.inv[i].id : ""; el.setAttribute("aria-label", g.inv[i] ? itemName(g.inv[i].id) : "から"); }); }
  hotEls.forEach((el, i) => el.classList.toggle("sel", i === g.sel));
  refreshColorStrip(); refreshSelName(); refreshUse();
}
function selectSlot(i) { g.sel = ((i % HOTBAR_N) + HOTBAR_N) % HOTBAR_N; refreshHotbar(); touchSave(); }
function refreshSelName() {
  const s = selItem();
  $("selName").textContent = s ? itemName(s.id) + (s.id === B.COLOR ? "（" + COLORS[g.colorSel].name + "）" : "") : "";
}
/* 「おく」ボタンの 表示：食べ物を 持って いる 時は「たべる」 */
function refreshUse() {
  const s = selItem(), food = s && FOOD[s.id];
  $("useIc").textContent = food ? "🍴" : "🧱"; $("useLab").textContent = food ? "たべる" : "おく";
}
function refreshColorStrip() {
  const box = $("colorStrip"), s = selItem();
  const show = !!s && s.id === B.COLOR && g.playing;
  box.classList.toggle("show", show);
  if (!show) return;
  box.innerHTML = "";
  COLORS.forEach((c, i) => {
    if (!hasColor(c.key)) return;
    const b = document.createElement("button"); b.className = "sw" + (i === g.colorSel ? " sel" : "") + (c.rare ? " rare" : ""); b.style.background = c.hex; b.dataset.color = c.key; b.title = c.name;
    press(b, () => { g.colorSel = i; hotSig = ""; refreshHotbar(); touchSave(); });
    box.appendChild(b);
  });
}

/* 道具欄：て・作った 道具・装備した 武器 */
function heldList() {
  const list = ["hand"];
  for (const k of TOOL_KEYS) if (g.tools[k] > 0) list.push(k);
  if (g.equip.weapon >= 0 && g.art.weapons[g.equip.weapon]) list.push("weapon");
  return list;
}
function heldName(h) { return h === "hand" ? "て" : h === "weapon" ? "ぶき" : toolName(h, g.tools[h]); }
function refreshTools() {
  const list = heldList();
  if (!list.includes(g.held)) g.held = "hand";
  const box = $("tools"); box.innerHTML = "";
  for (const h of list) {
    const b = document.createElement("button"); b.className = "slot" + (h === g.held ? " sel" : ""); b.dataset.held = h; b.setAttribute("aria-label", heldName(h));
    const art = h === "weapon" ? g.art.weapons[g.equip.weapon] : g.art.tools[h];
    if (art) { const im = document.createElement("img"); im.src = art.img; im.alt = ""; b.appendChild(im); }
    else b.appendChild(drawIcon(h, g.tools[h] || 1));
    if (TOOL_KEYS.includes(h) && h !== "rod") { const t = document.createElement("span"); t.className = "tier"; t.textContent = TIER_SHORT[g.tools[h]]; b.appendChild(t); }
    press(b, () => setHeld(h));
    box.appendChild(b);
  }
  refreshHeld();
  requestAnimationFrame(measureBar);
}
function setHeld(h) {
  if (!heldList().includes(h)) return;
  g.held = h; g.dig = null; refreshTools(); touchSave();
  toast(heldName(h) + " を もったよ");
}
function measureBar() { document.documentElement.style.setProperty("--barH", $("bottom").offsetHeight + "px"); }

/* ハート・おなか・経験値 */
const xpNeed = (lv) => XP.xpBase + lv * XP.xpStep;
function refreshStatus() {
  const fill = (box, n, max, ch) => {
    if (box.children.length !== max) { box.innerHTML = ""; for (let i = 0; i < max; i++) { const s = document.createElement("span"); s.textContent = ch; box.appendChild(s); } }
    [...box.children].forEach((s, i) => s.classList.toggle("off", i >= n));
  };
  fill($("hearts"), g.hp, PLAYER.hpMax, "❤️");
  fill($("hunger"), Math.ceil(g.hunger - 0.001), PLAYER.hungerMax, "🍙");
  $("lv").textContent = "Lv " + g.level;
  $("xpfill").style.width = Math.min(100, (g.xp / xpNeed(g.level)) * 100) + "%";
}
function addXp(n) {
  if (creative()) return;
  g.xp += n;
  let up = false;
  while (g.xp >= xpNeed(g.level)) { g.xp -= xpNeed(g.level); g.level++; up = true; g.counters.levelUps++; }
  if (up) { sfx.color(); toast("レベルアップ！ Lv " + g.level); const el = $("lv"); el.classList.remove("up"); void el.offsetWidth; el.classList.add("up"); }
  refreshStatus(); touchSave();
}
function refreshEnemyBtn() { $("btnEnemy").classList.toggle("off", !g.enemiesOn); $("enemyLab").textContent = g.enemiesOn ? "でる" : "でない"; }
function refreshModeBtn() {
  const c = creative();
  document.body.classList.toggle("creative", c);
  $("btnMode").classList.toggle("creative", c);
  $("modeIc").textContent = c ? "✨" : "⛏"; $("modeLab").textContent = c ? "クリエイティブ" : "サバイバル";
  $("mMode").textContent = c ? "⛏ サバイバルに する（あつめた ぶんだけ）" : "✨ クリエイティブに する（つかいほうだい）";
  requestAnimationFrame(measureBar);
}
function refreshViewBtn() {
  const f = g.view === "first";
  document.body.classList.toggle("first", f);
  $("btnView").classList.toggle("first", f); $("viewLab").textContent = f ? "じぶん" : "うしろ";
}
function refreshAllUI() { hotSig = ""; refreshHotbar(); refreshTools(); refreshStatus(); refreshEnemyBtn(); refreshModeBtn(); refreshViewBtn(); refreshCtx(); }

/* ---------- かさなる 画面 ---------- */
const OVS = ["title", "sheet", "menu", "bag", "art"];
function syncPause() {
  g.paused = OVS.some((id) => $(id).classList.contains("show"));
  input.enabled = !g.paused && g.playing && !g.sleeping;
  if (!input.enabled) input.releaseAll();
}
function openOv(id) { $(id).classList.add("show"); syncPause(); }
function closeOv(id) { $(id).classList.remove("show"); syncPause(); }

/* ---------- モード と 視点 ---------- */
function setMode(m) {
  g.mode = m === "creative" ? "creative" : "survival";
  if (creative()) { g.hp = PLAYER.hpMax; g.hunger = PLAYER.hungerMax; }
  else { g.player.fly = false; if (!g.colors.includes(g.colorSelKey)) g.colorSel = COLOR_INDEX[g.colors[0]]; if (g.hatColor && !g.colors.includes(g.hatColor)) { g.hatColor = null; applyHat(); } }
  refreshAllUI(); touchSave();
}
function toggleMode() { setMode(creative() ? "survival" : "creative"); toast(creative() ? "クリエイティブ：そざいも いろも つかいほうだい！" : "サバイバル：あつめた ぶんだけ"); }
$("btnMode").addEventListener("click", () => { if (g.playing && !g.sleeping) toggleMode(); });
function setView(v) {
  g.view = v === "first" ? "first" : "third";
  g.pitch = g.view === "first" ? clamp(g.pitch, -CAM.fpPitch, CAM.fpPitch) : clamp(g.pitch, CAM.pitchMin, CAM.pitchMax);
  refreshViewBtn(); resize(); touchSave();
}
function toggleView() { if (!g.playing || g.sleeping) return; setView(g.view === "first" ? "third" : "first"); toast(g.view === "first" ? "じぶんの めで みるよ" : "うしろから みるよ"); }
$("btnView").addEventListener("click", toggleView);
/* ジャンプを すばやく 2回：クリエイティブなら 空を とぶ／やめる */
let lastJumpPress = -1e9;
function jumpPress(ts) {
  const now = ts || performance.now();        // おした 時刻（画面が 重い 時でも ずれない ように、入力の 時刻を 使う）
  if (creative() && g.playing && !g.paused && now - lastJumpPress < 450) {
    const p = g.player; p.fly = !p.fly; p.vy = 0;
    toast(p.fly ? "そらを とぶよ（ジャンプで のぼる・もう2かいで おりる）" : "とぶのを やめたよ");
    lastJumpPress = -1e9; return;
  }
  lastJumpPress = now;
}

/* ---------- 名札 と 帽子の 色 ---------- */
const nameTag = new NameTag("");
const hatMats = [];
function applyHat() {
  const c = g.hatColor ? COLORS[COLOR_INDEX[g.hatColor]] : null;
  for (const h of hatMats) {
    if (c) { h.mat.color.set(c.hex); h.mat.emissive.set(c.fx ? c.hex : 0x000000); h.mat.emissiveIntensity = c.fx === "glow" ? 0.55 : c.fx === "metal" ? 0.3 : 0; h.mat.metalness = c.fx === "metal" ? 0.6 : h.metal; h.mat.roughness = c.fx === "metal" ? 0.35 : h.rough; }
    else { h.mat.color.copy(h.color); h.mat.emissive.set(0x000000); h.mat.emissiveIntensity = 0; h.mat.metalness = h.metal; h.mat.roughness = h.rough; }
  }
}
function setPlayerName(name) {
  g.playerName = Save.cleanName(name, 10) || Save.DEFAULT_PLAYER;
  nameTag.set(g.playerName); touchSave();
  return g.playerName;
}

/* ---------- 色 ---------- */
function unlockColor(c) {
  if (g.colors.includes(c.key)) return false;
  g.colors.push(c.key);
  toast((c.rare ? "★ レアな いろ「" : "あたらしい いろ「") + c.name + "」を みつけた！");
  sfx.color(); refreshColorStrip(); touchSave();
  return true;
}

/* ---------- たたく（敵が 近ければ 攻撃、そうで なければ ブロック） ---------- */
function attackPower() {
  if (g.held === "weapon") { const e = g.art.weapons[g.equip.weapon]; return POWER.weapon + POWER.weaponBonus * Math.min(1, (e ? e.area : 0) / 0.5); }
  return TOOL_KEYS.includes(g.held) && g.held !== "rod" ? POWER.tool[g.tools[g.held]] : POWER.hand;
}
function useHunger(n) { if (!creative()) g.hunger = Math.max(0, g.hunger - n); }
function hit() {
  if (!g.playing || g.paused || g.sleeping) return null;
  swingT = 1;
  const p = g.player;
  const e = mobs.nearest(PLAYER.hitRange);
  if (e) {
    const fx = e.body.x - p.x, fz = e.body.z - p.z;
    g.faceYaw = Math.atan2(fx, fz);
    mobs.damage(e, attackPower(), fx, fz);
    g.counters.hits++; sfx.hit(); useHunger(PLAYER.hungerAct);
    return "enemy";
  }
  const t = g.target;
  if (!t) { sfx.swish(); return null; }
  const need = hitsNeeded(t.id, g.held, g.tools);
  if (!need) { toast("これは こわせないよ"); sfx.no(); return null; }
  const key = t.x + "," + t.y + "," + t.z;
  if (!g.dig || g.dig.key !== key) g.dig = { key, x: t.x, y: t.y, z: t.z, hits: 0, need, t: 0 };
  g.dig.hits++; g.dig.need = need; g.dig.t = 3.5; g.counters.knocks++; useHunger(PLAYER.hungerAct);
  if (g.dig.hits < need) { sfx.knock(g.dig.hits); return "knock"; }
  // こわれた
  g.dig = null;
  setBlock(t.x, t.y, t.z, B.AIR);
  const drop = dropOf(t.id);
  let msg = "";
  if (drop && invAdd(drop, 1) > 0) msg = "かばんが いっぱいで ひろえなかった…";
  if (t.id === B.LEAF && roll(0.3)) { invAdd(I.BERRY, 1); msg = msg || "きのみが おちて きた！"; }
  if (t.id === B.FLOWER) { const c = nextColor("flower", g.colors); if (!(c && roll(0.5) && unlockColor(c))) msg = "おはなを つんだよ"; else msg = ""; }
  if (t.id === B.STAR) { const c = nextColor("ore", g.colors); if (c && roll(0.15) && unlockColor(c)) msg = ""; }     // レア色：ほしのいしから
  if (msg) toast(msg);
  g.counters.broke++;
  addXp(t.id === B.COAL || t.id === B.STAR ? XP.ore : XP.block);
  sfx.break(); refreshHotbar(); updateTarget();
  return "broke";
}
/* 「おく」ボタン：食べ物なら 食べる（動物の そばなら 餌）、ブロックなら 置く */
function use() {
  if (!g.playing || g.paused || g.sleeping) return false;
  const s = selItem();
  if (s) {
    const fed = mobs.feed(s.id);
    if (fed && !fed.wrong) { if (!creative()) takeFromSlot(g.sel); refreshHotbar(); touchSave(); return true; }
    if (FOOD[s.id]) return eat(g.sel);
    if (fed && fed.wrong && !g.target) { toast(fed.wrong.name + "は " + fed.wrong.def.foodName + "が すき"); return false; }
  }
  return placeBlock();
}
function eat(slot) {
  const s = g.inv[slot];
  if (!s || !FOOD[s.id]) return false;
  if (!creative() && g.hunger > PLAYER.hungerMax - 0.5) { toast("おなか いっぱい"); sfx.no(); return false; }   // ほぼ 満タンの 時は 食べない（むだに しない）
  g.hunger = Math.min(PLAYER.hungerMax, g.hunger + FOOD[s.id]);
  if (!creative()) takeFromSlot(slot);
  g.counters.eaten++;
  sfx.craft(); toast("もぐもぐ… " + itemName(s.id) + " おいしい！");
  refreshHotbar(); refreshStatus(); touchSave();
  return true;
}
function placeBlock() {
  const t = g.target;
  if (!t) return false;
  const s = selItem();
  g.lastNo = "";
  if (!s) { g.lastNo = "none"; return false; }
  if (!isPlaceable(s.id)) { g.lastNo = "notblock"; toast(itemName(s.id) + " は おけないよ"); sfx.no(); return false; }
  const x = t.x + t.nx, y = t.y + t.ny, z = t.z + t.nz;
  if (!g.world.inside(x, y, z)) { g.lastNo = "outside"; toast("そこには おけないよ"); sfx.no(); return false; }
  const cur = g.world.get(x, y, z);
  if (cur !== B.AIR && cur !== B.WATER) { g.lastNo = "filled"; return false; }
  if (BLOCKS[s.id].solid && g.player.overlapsCell(x, y, z)) { g.lastNo = "norun"; toast("のるんが いるよ"); sfx.no(); return false; }
  setBlock(x, y, z, s.id === B.COLOR ? B.COLOR + g.colorSel : s.id);
  if (!creative()) takeFromSlot(g.sel);           // クリエイティブは へらない
  g.counters.placed++;
  sfx.place(); refreshHotbar(); updateTarget(); scanNear();
  return true;
}

/* ---------- もちもの画面 と マス目クラフト ---------- */
const bag = { cursor: -1, size: 2, cells: [0, 0, 0, 0], book: false, msg: "" };
const canMake = (r) => creative() || Object.keys(r.need).every((id) => invCount(+id) >= r.need[id]);
const toolHave = (r) => r.out.tool && g.tools[r.out.tool] >= r.out.tier;
function bagMsg(t) { bag.msg = t; $("bagMsg").textContent = t; }
function tapSlot(i) {
  if (bag.cursor >= 0 && !g.inv[bag.cursor]) bag.cursor = -1;       // 持って いた 物を 使いきった 時
  if (bag.cursor < 0) { if (g.inv[i]) bag.cursor = i; }
  else if (bag.cursor === i) bag.cursor = -1;
  else {
    const a = g.inv[bag.cursor], b = g.inv[i];
    if (a && b && a.id === b.id) { const k = Math.min(a.n, PLAYER.stack - b.n); b.n += k; a.n -= k; if (!a.n) g.inv[bag.cursor] = null; }   // 同じ 物は 重ねる
    else { g.inv[bag.cursor] = b; g.inv[i] = a; }                                                                                       // ちがう 物は 入れかえる
    bag.cursor = -1;
  }
  renderBag(); refreshHotbar(); touchSave();
}
function tapCell(k) {
  const cur = bag.cursor >= 0 ? g.inv[bag.cursor] : null;
  bag.cells[k] = cur ? (bag.cells[k] === cur.id ? 0 : cur.id) : 0;     // 持って いる 物を 置く／もう1回で 外す
  bagMsg(cur ? "" : "かばんの ものを えらんでから、マスを おしてね");
  renderBag();
}
function doCraft() {
  const r = matchRecipe(bag.cells, bag.size);
  if (!r) { bagMsg("この ならべかたでは なにも できないよ"); sfx.no(); return false; }
  if (toolHave(r)) { bagMsg("もう もって いるよ"); sfx.no(); return false; }
  if (!canMake(r)) { bagMsg("ざいりょうが たりないよ"); sfx.no(); return false; }
  if (!creative()) for (const id of Object.keys(r.need)) invRemove(+id, r.need[id]);
  const o = r.out;
  let left = 0;
  if (o.item) left = invAdd(o.item, o.n);
  if (o.tool) { g.tools[o.tool] = o.tier; if (g.held === "hand" && o.tool !== "rod") g.held = o.tool; }
  g.counters.crafts++; bag.cursor = -1;
  sfx.craft(); bagMsg(left ? "かばんが いっぱいで はいりきらなかった…" : r.name + " が できた！");
  refreshAllUI(); renderBag(); touchSave();
  return true;
}
function pickRecipe(r) {
  if (r.size > bag.size) { bagMsg("「" + r.name + "」は さぎょうだいの ちかくで つくれるよ（3×3）"); sfx.no(); return; }
  bag.cells = layoutRecipe(r, bag.size);                       // 材料を 自動で マスに ならべる
  bagMsg(r.name + "：" + Object.keys(r.need).map((id) => itemName(+id) + " " + (creative() ? "∞" : invCount(+id)) + "/" + r.need[id]).join("　"));
  renderBag();
}
function cellBtn(cls, s, onTap, data) {
  const b = document.createElement("button"); b.className = "cell " + cls;
  if (data) for (const k of Object.keys(data)) b.dataset[k] = data[k];
  fillSlot(b, s);
  b.addEventListener("click", onTap);
  return b;
}
function renderBag() {
  if (bag.cursor >= 0 && !g.inv[bag.cursor]) bag.cursor = -1;
  const grid = $("cgrid"); grid.innerHTML = ""; grid.style.gridTemplateColumns = `repeat(${bag.size}, var(--cell))`;
  bag.cells.forEach((id, k) => grid.appendChild(cellBtn("", id ? { id, n: 1 } : null, () => tapCell(k), { k })));
  const r = matchRecipe(bag.cells, bag.size), res = $("cresult");
  const ok = !!r && canMake(r) && !toolHave(r);
  res.innerHTML = ""; res.classList.toggle("ok", ok); res.classList.toggle("dim", !!r && !ok); res.dataset.id = r ? r.id : "";
  if (r) { res.appendChild(r.out.item ? iconOf(r.out.item) : drawIcon(r.out.tool, r.out.tier)); if (r.out.n > 1) { const n = document.createElement("span"); n.className = "num"; n.textContent = r.out.n; res.appendChild(n); } }
  const pack = $("pack"), hot = $("hot2"); pack.innerHTML = ""; hot.innerHTML = "";
  for (let i = HOTBAR_N; i < INV_N; i++) pack.appendChild(cellBtn(i === bag.cursor ? "cur" : "", g.inv[i], () => tapSlot(i), { i }));
  for (let i = 0; i < HOTBAR_N; i++) hot.appendChild(cellBtn("hot" + (i === bag.cursor ? " cur" : ""), g.inv[i], () => tapSlot(i), { i }));
  const book = $("book"); book.classList.toggle("show", bag.book); book.innerHTML = "";
  if (bag.book) for (const rc of RECIPES) {
    const dim = !canMake(rc) || rc.size > bag.size || toolHave(rc);
    const b = cellBtn(dim ? "dim" : "", null, () => pickRecipe(rc), { id: rc.id });
    b.appendChild(rc.out.item ? iconOf(rc.out.item) : drawIcon(rc.out.tool, rc.out.tier)); b.title = rc.name;
    book.appendChild(b);
  }
  const all = $("allItems"); all.innerHTML = "";
  if (creative()) for (const id of ALL_ITEMS) all.appendChild(cellBtn("", { id, n: 1 }, () => { const left = invAdd(id, PLAYER.stack); bagMsg(left ? "かばんが いっぱいだよ" : itemName(id) + " を かばんに いれたよ"); renderBag(); refreshHotbar(); touchSave(); }, { id }));
  const cur = bag.cursor >= 0 ? g.inv[bag.cursor] : null;
  $("eatBtn").style.display = cur && FOOD[cur.id] ? "" : "none";
  $("cBook").classList.toggle("sel", bag.book);
  $("bagMsg").textContent = bag.msg || (cur ? "「" + itemName(cur.id) + "」を もって いるよ。マスを おすと おける／べつの かばんの マスで いれかえ" : (bag.size === 3 ? "さぎょうだいの ちかく：3×3 で つくれるよ" : "てもとでは 2×2。さぎょうだいの ちかくなら 3×3"));
}
function openBag() {
  if (!g.playing || g.sleeping) return;
  scanNear();
  bag.size = g.near.bench ? 3 : 2; bag.cells = new Array(bag.size * bag.size).fill(0); bag.cursor = -1; bag.msg = "";
  renderBag(); openOv("bag");
}
$("btnBag").addEventListener("click", openBag);
$("bagClose").addEventListener("click", () => closeOv("bag"));
$("cresult").addEventListener("click", doCraft);
$("cClear").addEventListener("click", () => { bag.cells.fill(0); bagMsg(""); renderBag(); });
$("cBook").addEventListener("click", () => { bag.book = !bag.book; renderBag(); });
$("eatBtn").addEventListener("click", () => { if (bag.cursor >= 0 && eat(bag.cursor)) { if (!g.inv[bag.cursor]) bag.cursor = -1; bagMsg("もぐもぐ… おなかが ふくれた"); renderBag(); } else bagMsg("おなか いっぱい"); });

/* ---------- 近くの 物（さぎょうだい・ベッド・水）を しらべる ---------- */
let benchArmed = false, benchAway = 0;
function scanNear() {
  if (!g.world) return;
  const p = g.player, px = Math.floor(p.x), py = Math.floor(p.y), pz = Math.floor(p.z);
  let bench = false, bed = false, water = null, wd = 3.6;
  for (let dy = -2; dy <= 2; dy++) for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) {
    const x = px + dx, y = py + dy, z = pz + dz, id = g.world.get(x, y, z);
    if (id === B.BENCH || id === B.BED) {
      if (Math.abs(dx) <= 2 && Math.abs(dz) <= 2 && Math.abs(dy) <= 1) { if (id === B.BENCH) bench = true; else bed = true; }
    } else if (id === B.WATER && g.world.get(x, y + 1, z) === B.AIR) {
      const d = Math.hypot(x + 0.5 - p.x, z + 0.5 - p.z);
      if (d < wd) { wd = d; water = { x, y, z }; }
    }
  }
  g.near = { bench, bed, water };
  $("btnBag").classList.toggle("near", bench);
  refreshCtx();
}
function ctxMode() {
  if (g.fish) return g.fish.phase === "bite" ? "pull" : "wait";
  if (g.near.bed) return "sleep";
  if (g.tools.rod > 0 && g.near.water) return "fish";
  return "";
}
function refreshCtx() {
  const m = g.playing ? ctxMode() : "";
  els.ctx.classList.toggle("show", !!m);
  els.ctx.classList.toggle("alert", m === "pull");
  els.ctx.dataset.mode = m;
  if (!m) return;
  $("ctxIc").textContent = m === "sleep" ? "🛏" : m === "pull" ? "❗" : "🎣";
  $("ctxLab").textContent = m === "sleep" ? "ねる" : m === "pull" ? "ひく！" : m === "wait" ? "まつ…" : "つり";
}
function context() {
  if (!g.playing || g.paused || g.sleeping) return;
  const m = ctxMode();
  if (m === "sleep") sleep();
  else if (m === "fish") startFish();
  else if (m === "pull") catchFish();
  else if (m === "wait") endFish("まだ はやいよ！ にげちゃった");
}

/* ---------- ねる ---------- */
function growFlowers() {
  const p = g.player;
  for (let k = 0, n = 0; k < 40 && n < 3; k++) {
    const x = Math.floor(p.x + (Math.random() - 0.5) * 48), z = Math.floor(p.z + (Math.random() - 0.5) * 48);
    if (x < 2 || z < 2 || x > WORLD.sx - 3 || z > WORLD.sz - 3) continue;
    const y = g.world.topSolid(x, z);
    if (g.world.get(x, y, z) === B.GRASS && g.world.get(x, y + 1, z) === B.AIR && !p.overlapsCell(x, y + 1, z)) { setBlock(x, y + 1, z, B.FLOWER); n++; }
  }
}
function sleep() {
  g.sleeping = true; syncPause(); endFish("");
  $("fade").classList.add("show"); sfx.sleep();
  setTimeout(() => {
    const p = g.player;
    g.time = DAY_LEN * NIGHT.morning;
    g.hp = PLAYER.hpMax; g.invuln = 0;
    g.respawn = { x: p.x, y: p.y, z: p.z };
    mobs.clear(); growFlowers();
    refreshStatus(); saveNow(false);
    $("fade").classList.remove("show");
    g.sleeping = false; syncPause();
    toast("おはよう！ げんき いっぱい");
  }, 800);
}

/* ---------- つり ---------- */
function startFish() {
  const c = g.near.water; if (!c) return;
  const p = g.player;
  g.fish = { phase: "wait", t: g.fastFish ? 1.2 : 2 + Math.random() * 3.5, cell: c, x: p.x, z: p.z, before: g.held };
  g.held = "rod"; refreshHeld();
  g.faceYaw = Math.atan2(c.x + 0.5 - p.x, c.z + 0.5 - p.z);
  bobber.position.set(c.x + 0.5, c.y + 0.9, c.z + 0.5); bobber.visible = true;
  swingT = 1; sfx.splash(); toast("うきを なげた。「！」が でたら ひいてね"); refreshCtx();
}
function endFish(msg) {
  if (!g.fish) return;
  g.held = heldList().includes(g.fish.before) ? g.fish.before : "hand";
  g.fish = null; bobber.visible = false; refreshHeld(); refreshCtx();
  if (msg) toast(msg);
}
function catchFish() {
  g.counters.fish++;
  addXp(XP.fish);
  swingT = 1;
  const big = nextColor("bigfish", g.colors);
  if (big && roll(0.06)) { endFish(""); invAdd(I.FISH, 3); unlockColor(big); toast("おおものだ！ ★「" + big.name + "」と さかな 3びき！"); refreshHotbar(); return; }   // レア色：つりの 大物
  const c = nextColor("fish", g.colors);
  if (c && roll(0.18)) { endFish(""); unlockColor(c); return; }
  let msg;
  if (roll(0.16)) { const id = [B.GLASS, B.GLASS, B.BRICK, B.COLOR][Math.floor(Math.random() * 4)]; invAdd(id, 1); msg = "おや？ " + itemName(id) + " が つれた！"; }
  else { invAdd(I.FISH, 1); msg = "さかなが つれた！"; }
  sfx.pop(); endFish(msg); refreshHotbar(); touchSave();
}
function updateFish(dt, now) {
  const f = g.fish; if (!f) return;
  const p = g.player;
  if (Math.hypot(p.x - f.x, p.z - f.z) > 0.8) { endFish("つりを やめたよ"); return; }
  f.t -= dt;
  if (f.phase === "wait") {
    bobber.position.y = f.cell.y + 0.9 + Math.sin(now * 0.004) * 0.03;
    if (f.t <= 0) { f.phase = "bite"; f.t = g.fastFish ? 4 : 1.4; sfx.bite(); toast("！ いまだ、ひいて！"); refreshCtx(); }
  } else {
    bobber.position.y = f.cell.y + 0.78 + Math.sin(now * 0.03) * 0.05;
    if (f.t <= 0) endFish("にげられちゃった…");
  }
}

/* ---------- 敵・ペット・動物・体力 ---------- */
const mobs = new Mobs(scene, g, {
  onTouch: (e) => { if (g.invuln <= 0 && !g.sleeping) hurt(1, e.body.x, e.body.z); },
  onKill: (e) => {
    g.counters.kills++; sfx.pop();
    addXp(e.rare ? XP.gold : XP.enemy);
    const c = nextColor(e.type, g.colors);
    if (!(c && (e.rare || roll(MOB.dropChance)) && unlockColor(c))) toast(e.name + " を たおした！");   // きんのぷには かならず レア色を 落とす
  },
  onFed: (a) => { g.counters.fed++; const q = mobs.posOf(a); popHearts(q.x, q.y + a.def.h, q.z); sfx.color(); toast(a.name + "が よろこんで ついて くるよ"); },
});
function hurt(n, fromX, fromZ) {
  const p = g.player;
  g.invuln = PLAYER.invuln; g.regenT = PLAYER.regenSec;
  const dx = p.x - fromX, dz = p.z - fromZ, l = Math.hypot(dx, dz) || 1;
  p.vx = dx / l * 7; p.vz = dz / l * 7; p.vy = 5.5; p.onGround = false;
  sfx.hurt();
  if (creative()) return;                       // クリエイティブは ハートが へらない
  g.hp -= n; refreshStatus();
  const h = $("hearts"); h.classList.remove("hurt"); void h.offsetWidth; h.classList.add("hurt");
  if (g.hp <= 0) die();
}
function die() {
  g.counters.deaths++;
  endFish("");
  g.player.place(respawnPoint());
  g.hp = PLAYER.hpMax; g.invuln = 3; g.dig = null;
  mobs.clear(); camY = g.player.y + g.lookUp; benchArmed = false; benchAway = 0;
  refreshStatus(); toast("やられちゃった… もとの ばしょに もどったよ"); touchSave();
}
function respawnPoint() {
  const r = g.respawn;
  if (r) { const t = new Player(g.world); t.setSize(g.player.w, g.player.h); if (!t.collides(r.x, r.y, r.z)) return r; }
  return g.world.spawn();
}
$("btnEnemy").addEventListener("click", () => {
  g.enemiesOn = !g.enemiesOn;
  if (!g.enemiesOn) mobs.clear();
  refreshEnemyBtn(); toast(g.enemiesOn ? "てきが でるよ" : "てきは でないよ"); touchSave();
});

/* ---------- おえかき ---------- */
const artScreen = new ArtScreen({
  g, toast,
  close: () => closeOv("art"),
  changed: (kind, use) => {
    if (kind === "weapon") { if (use && g.equip.weapon >= 0) g.held = "weapon"; }
    if (kind === "pet") refreshPet();
    if (kind === "hat") applyHat();
    refreshTools(); touchSave();
  },
});
function openArt() { if (!g.playing || g.sleeping) return; artScreen.open(); openOv("art"); }
$("btnArt").addEventListener("click", openArt);

/* ---------- 操作 ---------- */
let hintDone = false;
const input = new Input(canvas, els, {
  hit, use, context, jumpPress,
  select: (i) => selectSlot(i),
  cycle: (d) => selectSlot(g.sel + d),
  bag: openBag, paint: openArt, view: toggleView,
  nextTool: () => { const l = heldList(); setHeld(l[(l.indexOf(g.held) + 1) % l.length]); },
  gesture: () => unlock(),
  modeChanged: (touch) => document.body.classList.toggle("touch", touch),
});
document.body.classList.toggle("touch", input.touchMode);

/* ---------- カメラ（三人称：うしろから／一人称：のるんの 目） ---------- */
const camTarget = new THREE.Vector3(), camPos = new THREE.Vector3();
const ray = new THREE.Raycaster();
let camY = 0;
function updateCamera(dt) {
  const p = g.player;
  const first = g.view === "first";
  g.pitch = first ? clamp(g.pitch, -CAM.fpPitch, CAM.fpPitch) : clamp(g.pitch, CAM.pitchMin, CAM.pitchMax);
  const cp = Math.cos(g.pitch);
  const dx = Math.sin(g.yaw) * cp, dy = Math.sin(g.pitch), dz = Math.cos(g.yaw) * cp;   // カメラが のるんから 見て ある 向き
  if (first) {
    const eye = p.y + p.stepVis + p.h * 0.82;
    camera.position.set(p.x, eye, p.z);
    camTarget.set(p.x - dx, eye - dy, p.z - dz);          // その 反対（前）を 見る
    camera.lookAt(camTarget);
    g.faceYaw = Math.atan2(-dx, -dz);
  } else {
    const wantY = p.y + g.lookUp;
    camY += (wantY - camY) * Math.min(1, dt * 12);
    if (Math.abs(wantY - camY) > 3) camY = wantY;
    let ty = camY;
    if (g.world.solid(Math.floor(p.x), Math.floor(ty), Math.floor(p.z))) ty = p.y + p.h * 0.8;
    camTarget.set(p.x, ty, p.z);
    let dist = g.camDist;
    for (let t = 0.2; t <= g.camDist + 0.3; t += 0.1) {
      if (isSolid(g.world.get(Math.floor(camTarget.x + dx * t), Math.floor(camTarget.y + dy * t), Math.floor(camTarget.z + dz * t)))) { dist = Math.max(0.5, t - 0.3); break; }
    }
    camPos.set(camTarget.x + dx * dist, camTarget.y + dy * dist, camTarget.z + dz * dist);
    camera.position.copy(camPos);
    camera.lookAt(camTarget);
  }
  camera.updateMatrixWorld();
}

const aim = new THREE.Vector2();
function updateTarget() {
  const p = g.player;
  if (input.touchMode || !input.mouse.inside || g.view === "first") aim.set(0, 0); else aim.set(input.mouse.x, input.mouse.y);
  ray.setFromCamera(aim, camera);
  const o = ray.ray.origin, d = ray.ray.direction;
  const hitB = raycast(g.world, o.x, o.y, o.z, d.x, d.y, d.z, g.camDist + PLAYER.reach + 2, isTarget);
  let ok = null;
  if (hitB) {
    const cx = p.x, cy = p.y + p.h / 2, cz = p.z;
    const qx = clamp(cx, hitB.x, hitB.x + 1), qy = clamp(cy, hitB.y, hitB.y + 1), qz = clamp(cz, hitB.z, hitB.z + 1);
    if (Math.hypot(qx - cx, qy - cy, qz - cz) <= PLAYER.reach) ok = hitB;
  }
  g.target = ok;
  hl.visible = !!ok;
  if (ok) hl.position.set(ok.x + 0.5, ok.y + 0.5, ok.z + 0.5);
  const dg = g.dig;
  crack.visible = !!dg;
  if (dg) { crack.position.set(dg.x + 0.5, dg.y + 0.5, dg.z + 0.5); crackTex.offset.x = Math.min(3, Math.floor((dg.hits / dg.need) * 4)) * 0.25; }
}

/* ---------- 明るさ：昼夜（空・地上）と 地下。キャラクターも いっしょに 変える ---------- */
const skyCol = new THREE.Color();
let charB = 1, skyHere = 1;
function updateSky(dt) {
  const p = g.player;
  const a = (g.time / DAY_LEN) * Math.PI * 2;
  const s = Math.sin(a);
  const day = clamp(s * 2.2 + 0.5, 0, 1);                // 0＝夜 1＝昼
  // のるんの いる 所に 空の 光が どれだけ とどくか（0＝地下）
  const sk = g.world.skyAt(Math.floor(p.x), Math.floor(p.y + p.h * 0.5), Math.floor(p.z));
  skyHere += (sk - skyHere) * Math.min(1, dt * 3);
  skyCol.copy(SKY_NIGHT).lerp(SKY_DAY, day);
  skyCol.lerp(SKY_DUSK, Math.max(0, 1 - Math.abs(s) * 4) * 0.45);
  skyCol.lerp(SKY_CAVE, (1 - skyHere) * 0.92);            // 地下では 霧も 暗く
  scene.background.copy(skyCol); scene.fog.color.copy(skyCol);
  // 地上の ブロック：夜は 昼の 50％。地下：42％。のるんの そばは 72％ まで
  const b = NIGHT.blocks + (1 - NIGHT.blocks) * day;
  envU.value.set(lin(b), lin(NIGHT.cave), g.noGlow ? 0 : lin(NIGHT.near));
  glowU.value.set(p.x, p.y + 0.5, p.z, 0);
  sea.material.color.setRGB(0.87 * b, 0.95 * b, b, THREE.SRGBColorSpace);
  // のるん・敵・動物（ライトで 照らす 物）と、ペット・持ち物（絵の 板）
  const lamp = g.world.lampAt(p.x, p.y + 0.5, p.z, g.world.lightsNear(Math.floor(p.x), Math.floor(p.z), Math.floor(p.x), Math.floor(p.z)));
  const env = Math.max(skyHere * b + (1 - skyHere) * NIGHT.cave, lamp);
  const cb = Math.max(NIGHT.chars, env);
  charB += (cb - charB) * Math.min(1, dt * 4);
  hemi.intensity = 2.2 * lin(charB); sun.intensity = 1.6 * lin(charB) * skyHere;
  sun.position.set(p.x + Math.cos(a) * 30, p.y + Math.abs(s) * 40 + 8, p.z + 18); sun.target.position.set(p.x, p.y, p.z); sun.target.updateMatrixWorld();
  heldMat.color.setRGB(charB, charB, charB, THREE.SRGBColorSpace); fpMat.color.copy(heldMat.color);
  if (mobs.pet) mobs.pet.mesh.material.color.copy(heldMat.color);
  g.light = { day, blocks: b, cave: NIGHT.cave, near: g.noGlow ? 0 : NIGHT.near, chars: charB, sky: skyHere, lamp, hemi: hemi.intensity, sun: sun.intensity };
  const icon = day > 0.5 ? "🌞" : "🌙";
  if ($("clock").textContent !== icon) $("clock").textContent = icon;
}

/* ---------- のるんの 動き ---------- */
let walkPhase = 0, lean = 0;
function updateNorun(dt, now) {
  const n = g.norun, p = g.player;
  if (!n) return;
  const first = g.view === "first";
  n.group.position.set(p.x, p.y + p.stepVis, p.z);
  const sp = Math.hypot(p.vx, p.vz);
  if (!first && sp > 0.4 && g.invuln < PLAYER.invuln - 0.4 && !g.fish) {
    const want = Math.atan2(p.vx, p.vz);
    let d = want - g.faceYaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    g.faceYaw += d * Math.min(1, dt * 12);
  }
  n.group.rotation.y = g.faceYaw;
  n.group.visible = !first && !(g.invuln > 0 && Math.floor(now / 90) % 2 === 0);     // 一人称では 体を 映さない
  nameTag.sprite.visible = !first && !!nameTag.text && camera.position.distanceTo(n.group.position) > 2.2;   // 名札も 一人称では 出さない（カメラが 近すぎる 時も）
  const moving = sp > 0.4 && p.onGround;
  if (moving) walkPhase += dt * sp * 2.6;
  let sy = 1, hop = 0;
  if (!p.onGround && !p.inWater) sy = 1 + clamp(p.vy * 0.018, -0.1, 0.16);
  else if (moving) { hop = Math.abs(Math.sin(walkPhase)) * 0.09; sy = 1 + Math.sin(walkPhase * 2) * 0.05; }
  else sy = 1 + Math.sin(now * 0.0022) * 0.018;
  sy -= p.landT * 0.24;
  if (p.inWater) hop = Math.sin(now * 0.004) * 0.04;
  const sxz = 1 / Math.sqrt(sy);
  n.inner.scale.set(sxz, sy, sxz);
  n.inner.position.y = hop;
  lean += ((moving ? 0.13 : 0) - lean) * Math.min(1, dt * 10);
  n.inner.rotation.x = lean;
  swingT = Math.max(0, swingT - dt * 4.5);
  const sw = Math.sin(swingT * Math.PI);
  heldPivot.visible = heldOn && !first;
  heldPivot.rotation.x = sw * 1.25 + (g.fish ? 0.5 : 0);
  heldPivot.position.y = 0.26 + hop;
  fpPivot.visible = heldOn && first;
  fpPivot.rotation.x = -sw * 1.1 - (g.fish ? 0.4 : 0);
  fpPivot.position.y = -0.34 + (moving ? Math.sin(walkPhase * 2) * 0.012 : 0);

  let gy = Math.floor(p.y + 0.01);
  while (gy > 0 && !g.world.solid(Math.floor(p.x), gy - 1, Math.floor(p.z))) gy--;
  const hgt = p.y - gy;
  shadow.position.set(p.x, gy + 0.02, p.z);
  const k = Math.max(0.35, 1 - hgt * 0.18);
  shadow.scale.setScalar(k * p.w * 1.25);
  shadow.material.opacity = 0.3 * k;
  shadow.visible = !first;
}

/* ---------- 保存 ---------- */
function saveNow(manual) {
  if (!g.playing || g.slot < 0) return false;
  const ok = Save.saveSlot(g.slot, Save.pack(g));
  if (ok) g.counters.saves++;
  saveSoon = AUTOSAVE_SEC;
  if (manual) { toast(ok ? "ほぞん したよ" : "ほぞん できなかった…"); if (ok) sfx.save(); }
  return ok;
}
function resetRuntime() {
  g.target = null; g.dig = null; g.fish = null; bobber.visible = false; g.invuln = 0; g.regenT = PLAYER.regenSec;
  benchArmed = false; benchAway = 0; mobs.clear(); mobs.clearAnimals(); g.faceYaw = Math.PI;
  g.player.world = g.world; g.player.fly = false;
  clearChunks(); skyHere = 1; charB = 1;
}
function afterWorld() {
  camY = g.player.y + g.lookUp;
  updateChunks(9);                              // まず 足もとの まわりだけ すぐ 作る。のこりは 毎コマ 少しずつ
  nameTag.set(g.playerName); applyHat();
  refreshPet(); refreshAllUI();
}
function applySave(d) {
  g.world = new World(d.seed);
  g.world.applyChanges(d.changes);
  g.inv = d.inv.map((v) => (v ? { id: v[0], n: v[1] } : null));
  g.sel = d.sel;
  g.tools = { ...d.tools }; g.held = d.held;
  g.colors = d.colors.slice(); g.colorSel = COLOR_INDEX[d.colorSel]; g.hatColor = d.hatColor;
  g.art = d.art; g.equip = { ...d.equip };
  g.mode = d.mode; g.view = d.view; g.playerName = d.playerName;
  g.hp = d.hp; g.hunger = d.hunger; g.xp = d.xp; g.level = d.level;
  g.respawn = d.respawn; g.enemiesOn = d.enemiesOn;
  g.time = Number.isFinite(d.time) ? d.time : 0;
  resetRuntime();
  const pl = d.player || {};
  if (Number.isFinite(pl.x) && Number.isFinite(pl.y) && Number.isFinite(pl.z)) g.player.place({ x: clamp(pl.x, 0.5, WORLD.sx - 0.5), y: clamp(pl.y, 0, WORLD.sy + 4), z: clamp(pl.z, 0.5, WORLD.sz - 0.5) });
  else g.player.place(g.world.spawn());
  g.yaw = Number.isFinite(pl.yaw) ? pl.yaw : 0;
  g.pitch = Number.isFinite(pl.pitch) ? pl.pitch : CAM.pitch0;
  afterWorld();
}
function newWorld(seed) {
  g.world = new World(seed === undefined ? (Math.random() * 0xffffffff) >>> 0 : seed);
  g.inv = new Array(INV_N).fill(null);
  for (const [id, n] of START_INV) invAdd(id, n);
  g.sel = 0; g.tools = { pick: 0, axe: 0, shovel: 0, rod: 0 }; g.held = "hand";
  g.colors = START_COLORS.slice(); g.colorSel = COLOR_INDEX.aka; g.hatColor = null;
  g.art = Save.emptyArt(); g.equip = { weapon: -1, pet: -1 };
  g.mode = "survival"; g.view = "third"; g.playerName = Save.DEFAULT_PLAYER;
  g.hp = PLAYER.hpMax; g.hunger = PLAYER.hungerMax; g.xp = 0; g.level = 0;
  g.respawn = null; g.enemiesOn = true;
  g.time = DAY_LEN * 0.1; g.yaw = 0; g.pitch = CAM.pitch0;
  resetRuntime();
  g.player.place(g.world.spawn());
  afterWorld();
}

/* ---------- タイトル（スロットを えらぶ） ---------- */
const fmtDate = (t) => { const d = new Date(t), z = (n) => String(n).padStart(2, "0"); return `${d.getMonth() + 1}がつ${d.getDate()}にち ${z(d.getHours())}:${z(d.getMinutes())}`; };
function renderCards() {
  const box = $("cards"); box.innerHTML = "";
  for (const s of Save.slotList()) {
    const row = document.createElement("div"); row.className = "card" + (s.exists ? "" : " new"); row.dataset.i = s.i;
    const play = document.createElement("button"); play.className = "play";
    const nm = document.createElement("span"); nm.className = "nm"; nm.textContent = s.name;
    const dt = document.createElement("span"); dt.className = "dt";
    dt.textContent = s.exists ? `🕒 ${fmtDate(s.savedAt)}　👤 ${s.playerName}　Lv ${s.level}　🎨 ${s.colors}いろ${s.mode === "creative" ? "　✨" : ""}` : "＋ あたらしく はじめる";
    play.append(nm, dt); play.addEventListener("click", () => startSlot(s.i));
    const more = document.createElement("button"); more.className = "more"; more.textContent = "⋯"; more.setAttribute("aria-label", s.name + " の メニュー");
    more.addEventListener("click", () => openSheet(s.i));
    row.append(play, more); box.appendChild(row);
  }
}
function showTitle() {
  if (g.playing) saveNow(false);
  g.playing = false; mobs.clear(); endFish("");
  for (const id of OVS) $(id).classList.remove("show");
  renderCards(); $("titleMsg").textContent = ""; openOv("title"); refreshColorStrip(); refreshCtx();
}
function startSlot(i) {
  $("titleMsg").textContent = "せかいを つくって いるよ…";
  const d = Save.loadSlot(i);
  g.slot = i; g.name = Save.getNames()[i];
  if (d) applySave(d); else newWorld(SEED_FIX ? SEED_FIX + i : undefined);
  g.playing = true;
  for (const id of OVS) $(id).classList.remove("show");
  syncPause(); refreshAllUI(); scanNear();
  saveNow(false);
  toast(d ? g.name + " の つづきから" : g.name + " を はじめるよ");
}

/* スロットごとの メニュー */
const sh = { i: 0, mode: "", arm: "" };
function openSheet(i) {
  sh.i = i; sh.mode = ""; sh.arm = "";
  const s = Save.slotList()[i];
  $("shTitle").textContent = s.name; $("shName").value = s.name;
  $("shPlayer").value = s.playerName; $("shPlayer").disabled = !s.exists; $("shPlayerSet").disabled = !s.exists;
  $("shPlay").textContent = s.exists ? "▶ つづきから あそぶ" : "＋ あたらしく はじめる";
  $("shExport").disabled = !s.exists; $("shSend").disabled = !s.exists; $("shDelete").disabled = !s.exists;
  $("shWork").classList.remove("show"); $("shMsg").textContent = "";
  openOv("sheet");
}
function sheetWork(mode, msg) {
  sh.mode = mode; sh.arm = "";
  const code = mode === "export" || mode === "import", pass = mode === "send" || mode === "recv";
  $("shWork").classList.add("show");
  $("shCode").style.display = code ? "" : "none"; $("shPass").style.display = pass ? "" : "none";
  $("shCode").readOnly = mode === "export"; if (mode === "import") $("shCode").value = "";
  $("shDo").textContent = { export: "コピー", import: "よみこむ", send: "おくる", recv: "うけとる" }[mode];
  $("shMsg").textContent = msg;
}
function writeSlot(i, data) {
  const names = Save.getNames();
  if (names[i] === Save.defaultName(i) && data.name) names[i] = Save.setName(i, data.name);
  data.name = names[i]; data.savedAt = Date.now();
  Save.saveSlot(i, data);
  renderCards(); openSheet(i);
}
function confirmOverwrite(tag) {
  if (!Save.loadSlot(sh.i) || sh.arm === tag) return true;
  sh.arm = tag;
  $("shMsg").textContent = "この データは うわがき されるよ。よければ もういちど おしてね";
  return false;
}
$("shClose").addEventListener("click", () => closeOv("sheet"));
$("shPlay").addEventListener("click", () => startSlot(sh.i));
$("shRename").addEventListener("click", () => {
  const name = Save.setName(sh.i, $("shName").value);
  const d = Save.loadSlot(sh.i);
  if (d) { d.name = name; Save.saveSlot(sh.i, d); }
  renderCards(); $("shTitle").textContent = name; $("shName").value = name; $("shMsg").textContent = "データの なまえを「" + name + "」に したよ";
});
$("shPlayerSet").addEventListener("click", () => {
  const d = Save.loadSlot(sh.i); if (!d) return;
  d.playerName = Save.cleanName($("shPlayer").value, 10) || Save.DEFAULT_PLAYER; Save.saveSlot(sh.i, d);
  renderCards(); $("shPlayer").value = d.playerName; $("shMsg").textContent = "あそぶ ひとの なまえを「" + d.playerName + "」に したよ";
});
$("shExport").addEventListener("click", () => { sheetWork("export", "この コードを わたすと、おなじ せかいで あそべるよ"); $("shCode").value = Save.toCode(Save.loadSlot(sh.i)); });
$("shImport").addEventListener("click", () => sheetWork("import", "コードを はりつけてね"));
$("shSend").addEventListener("click", () => sheetWork("send", "あいことばを きめて おくってね（おなじ あいことばは うわがき）"));
$("shRecv").addEventListener("click", () => sheetWork("recv", "おくった ときの あいことばを いれてね"));
$("shDo").addEventListener("click", async () => {
  const msg = $("shMsg");
  try {
    if (sh.mode === "export") { await copyText($("shCode"), msg); return; }
    if (sh.mode === "import") {
      const d = Save.fromCode($("shCode").value);
      if (!confirmOverwrite("import")) return;
      writeSlot(sh.i, d); $("shMsg").textContent = "よみこんだよ";
    } else if (sh.mode === "send") {
      msg.textContent = "おくって いるよ…";
      const d = Save.loadSlot(sh.i);
      await Share.send($("shPass").value, Save.toCode(d), d.name);
      msg.textContent = "おくったよ！ べつの たんまつで おなじ あいことばを いれてね";
    } else if (sh.mode === "recv") {
      if (!confirmOverwrite("recv")) return;
      msg.textContent = "さがして いるよ…";
      const v = await Share.receive($("shPass").value);
      let d; try { d = Save.fromCode(v.data); } catch (e) { throw Object.assign(new Error(Share.MESSAGES.bad), { code: "bad" }); }
      writeSlot(sh.i, d); $("shMsg").textContent = "うけとったよ！";
    }
  } catch (e) { msg.textContent = e.message; g.lastShareError = e.code || "code"; }
});
$("shDelete").addEventListener("click", () => {
  if (sh.arm !== "delete") { sh.arm = "delete"; $("shMsg").textContent = "ほんとうに けす？ もういちど おすと きえるよ"; return; }
  Save.deleteSlot(sh.i);
  if (g.slot === sh.i) g.slot = -1;
  renderCards(); openSheet(sh.i); $("shMsg").textContent = "けしたよ";
});
async function copyText(area, msg) {
  try { await navigator.clipboard.writeText(area.value); msg.textContent = "コピー したよ"; }
  catch (e) { area.select(); msg.textContent = "えらんだ 文字を コピー してね"; }
}

/* ---------- あそびの 中の メニュー ---------- */
let mMode = "";
$("btnMenu").addEventListener("click", () => { if (!g.playing || g.sleeping) return; $("menuTitle").textContent = g.name; $("mPlayer").value = g.playerName; $("mWork").classList.remove("show"); $("menuMsg").textContent = ""; openOv("menu"); });
$("mClose").addEventListener("click", () => closeOv("menu"));
$("mSave").addEventListener("click", () => { saveNow(true); $("menuMsg").textContent = "ほぞん したよ"; });
$("mMode").addEventListener("click", () => { toggleMode(); $("menuMsg").textContent = creative() ? "クリエイティブに したよ" : "サバイバルに したよ"; });
$("mPlayerSet").addEventListener("click", () => { const n = setPlayerName($("mPlayer").value); $("mPlayer").value = n; $("menuMsg").textContent = "なまえを「" + n + "」に したよ。あたまの うえに でるよ"; });
$("mExport").addEventListener("click", () => {
  saveNow(false); mMode = "export";
  $("mWork").classList.add("show"); $("mCode").style.display = ""; $("mPass").style.display = "none"; $("mDo").textContent = "コピー";
  $("mCode").value = Save.toCode(Save.pack(g));
  $("menuMsg").textContent = "この コードを わたすと、おなじ せかいで あそべるよ";
});
$("mSend").addEventListener("click", () => {
  mMode = "send";
  $("mWork").classList.add("show"); $("mCode").style.display = "none"; $("mPass").style.display = ""; $("mDo").textContent = "おくる";
  $("menuMsg").textContent = "あいことばを きめて おくってね（おなじ あいことばは うわがき）";
});
$("mDo").addEventListener("click", async () => {
  const msg = $("menuMsg");
  if (mMode === "export") { await copyText($("mCode"), msg); return; }
  try {
    msg.textContent = "おくって いるよ…";
    saveNow(false);
    await Share.send($("mPass").value, Save.toCode(Save.pack(g)), g.name);
    msg.textContent = "おくったよ！ べつの たんまつで おなじ あいことばを いれてね";
  } catch (e) { msg.textContent = e.message; g.lastShareError = e.code || ""; }
});
$("mTitle").addEventListener("click", showTitle);

/* ---------- 画面の 大きさ ---------- */
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = g.view === "first" ? CAM.fovFirst : w < h ? CAM.fovPortrait : CAM.fov;
  camera.updateProjectionMatrix();
  fpPivot.position.x = Math.min(0.3, 0.3 * (w / h) / 1.2);
  measureBar();
}
addEventListener("resize", resize);
addEventListener("orientationchange", () => setTimeout(resize, 200));

/* ---------- 毎コマ ---------- */
let last = performance.now(), fpsN = 0, fpsT = 0, fps = 0, scanT = 0, statT = 0, jsMs = 0, jsMax = 0, pending = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const t0 = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  fpsN++; fpsT += dt; if (fpsT >= 1) { fps = fpsN / fpsT; fpsN = 0; fpsT = 0; }
  if (!g.ready || !g.world) return;

  if (g.playing && !g.paused && !g.sleeping) {
    const p = g.player;
    const lk = input.takeLook();
    g.yaw -= lk.dx * CAM.sens;
    g.pitch += lk.dy * CAM.sens;
    const mv = input.moveVec();
    const fx = -Math.sin(g.yaw), fz = -Math.cos(g.yaw), rx = Math.cos(g.yaw), rz = -Math.sin(g.yaw);
    let wx = fx * -mv.y + rx * mv.x, wz = fz * -mv.y + rz * mv.x;
    const knocked = g.invuln > PLAYER.invuln - 0.3;
    if (knocked) { wx = p.vx / p.speed; wz = p.vz / p.speed; }
    if (!creative()) p.fly = false;
    p.speed = PLAYER.speed * (p.fly ? 1.6 : g.hunger <= 0 && !creative() ? PLAYER.hungrySpeed : 1);   // おなかが 空っぽの 間は 少し おそい
    const steps = Math.max(1, Math.ceil(dt / 0.017));
    for (let i = 0; i < steps; i++) {
      p.update(dt / steps, wx, wz, input.jump && !knocked);
      if (p.jumped) { sfx.jump(); useHunger(PLAYER.hungerAct); }
    }
    if (p.y < -20) p.place(respawnPoint());
    if (!hintDone && (mv.x || mv.y)) { hintDone = true; $("hint").classList.add("hide"); }

    const tPrev = g.time;
    g.time = (g.time + dt) % DAY_LEN;
    if (g.time < tPrev) growFlowers();
    mobs.update(dt, g.light.day < 0.5);
    updateFish(dt, now);
    if (g.invuln > 0) g.invuln -= dt;
    // おなか：時間で へる。空っぽの 間は ハートが もどらない（ハートは へらない）
    if (!creative()) {
      g.hunger = Math.max(0, g.hunger - dt / PLAYER.hungerSec);
      if (g.hp < PLAYER.hpMax && g.hunger > 0) { g.regenT -= dt; if (g.regenT <= 0) { g.hp++; g.regenT = PLAYER.regenSec; } }
    }
    statT -= dt; if (statT <= 0) { statT = 0.5; refreshStatus(); }
    if (g.dig) { g.dig.t -= dt; if (g.dig.t <= 0) g.dig = null; }

    scanT -= dt;
    if (scanT <= 0) {
      scanT = 0.2; scanNear();
      if (g.near.bench) { benchAway = 0; if (benchArmed && g.invuln <= 0 && !mobs.nearest(8)) { benchArmed = false; openBag(); } }
      else { benchAway += 0.2; if (benchAway >= 1) benchArmed = true; }
    }
    saveSoon -= dt;
    if (saveSoon <= 0) saveNow(false);
  }
  pending = updateChunks(RENDER.buildPerFrame);
  updateSky(dt);
  updateNorun(dt, now);
  updateSnow(dt, now);
  updateHearts(dt);
  updateCamera(dt);
  updateTarget();
  hlFill.material.opacity = 0.2 + 0.14 * Math.sin(now * 0.006);
  renderer.render(scene, camera);
  const ms = performance.now() - t0;
  jsMs += (ms - jsMs) * 0.05;       // 1コマの 処理時間（ならした 値）
  if (ms > jsMax) jsMax = ms;
}

/* ---------- はじまり ---------- */
const SEED_FIX = DEBUG ? Number(QS.get("seed")) : 0;      // ?debug&seed=数字 で 地形を 固定（スロットごとに ＋番号）
async function boot() {
  if (DEBUG && QS.get("share")) Share.setDbUrl(QS.get("share"));
  buildHotbar();
  g.player = new Player(null);
  const norun = await loadNorun();
  g.norun = norun;
  scene.add(norun.group);
  norun.group.add(heldPivot);
  norun.model.traverse((o) => { if (o.isMesh && o.material && o.material.name === "M_Hat" && !hatMats.some((h) => h.mat === o.material)) hatMats.push({ mat: o.material, color: o.material.color.clone(), metal: o.material.metalness, rough: o.material.roughness }); });
  nameTag.sprite.position.y = norun.size.visualH + 0.32;
  norun.group.add(nameTag.sprite);
  g.player.setSize(norun.size.hitW, norun.size.hitH);
  g.lookUp = norun.size.hitH + 0.55;
  g.camDist = 3.0 + norun.size.hitH * 2.0;
  refreshStatus(); refreshEnemyBtn();
  resize();
  g.ready = true;
  showTitle();
  $("loading").classList.add("hide");
  document.body.dataset.ready = "1";
}
addEventListener("pagehide", () => saveNow(false));
document.addEventListener("visibilitychange", () => { if (document.hidden) saveNow(false); });

/* 検証用の のぞき穴（?debug の 時だけ）。ボットは 状態を 読み、操作は 画面を さわって 行う。
   時間の かかる 準備（素材を 配る・動物や 敵を そばに 出す・時刻を 変える・目的の 場所へ 移動）だけ ここから 行う */
if (DEBUG) {
  const find = (ok) => { const w = g.world, d = w.data, SX = WORLD.sx, SZ = WORLD.sz; for (let i = 0; i < d.length; i++) { const x = i % SX, y = Math.floor(i / (SX * SZ)), z = Math.floor(i / SX) % SZ; if (ok(d[i], x, y, z, w)) return { x, y, z }; } return null; };
  window.__nc = {
    g, input, errors, VERSION, mobs, bag,
    state: () => ({
      ready: g.ready, playing: g.playing, paused: g.paused, slot: g.slot, name: g.name, playerName: g.playerName,
      pos: g.player && { x: g.player.x, y: g.player.y, z: g.player.z }, onGround: g.player.onGround, fly: g.player.fly, speed: g.player.speed,
      yaw: g.yaw, pitch: g.pitch, sel: g.sel, inv: g.inv.map((s) => (s ? [s.id, s.n] : 0)), tools: { ...g.tools }, held: g.held,
      colors: g.colors.slice(), colorSel: g.colorSelKey, hatColor: g.hatColor, equip: { ...g.equip }, mode: g.mode, view: g.view,
      art: { weapons: g.art.weapons.map((a) => a && a.area), pets: g.art.pets.map((a) => a && a.area), tools: Object.fromEntries(TOOL_KEYS.map((k) => [k, g.art.tools[k] && g.art.tools[k].area])) },
      hp: g.hp, hunger: g.hunger, xp: g.xp, level: g.level, respawn: g.respawn, enemiesOn: g.enemiesOn, time: g.time, light: g.light,
      target: g.target && { x: g.target.x, y: g.target.y, z: g.target.z, nx: g.target.nx, ny: g.target.ny, nz: g.target.nz, id: g.target.id },
      dig: g.dig && { hits: g.dig.hits, need: g.dig.need }, crack: crack.visible, fish: g.fish && g.fish.phase, near: g.near, ctx: els.ctx.dataset.mode || "",
      hash: g.world ? g.world.hash() : "", changes: g.world ? g.world.changes.size : 0, seed: g.world ? g.world.seed : 0,
      biome: g.world ? BIOME_NAME[g.world.biomeAt(g.player.x, g.player.z)] : "",
      enemies: mobs.list.filter((e) => !e.dying).map((e) => ({ type: e.type, hp: e.hp, x: e.body.x, y: e.body.y, z: e.body.z })),
      animals: mobs.animals.map((a) => { const q = mobs.posOf(a); return { kind: a.kind, shy: a.shy, follow: a.followT, x: q.x, y: q.y, z: q.z }; }),
      pet: mobs.pet && { x: mobs.pet.mesh.position.x, y: mobs.pet.mesh.position.y, z: mobs.pet.mesh.position.z },
      heldShown: heldPivot.visible, fpHeldShown: fpPivot.visible, norunShown: !!g.norun && g.norun.group.visible, tagShown: nameTag.sprite.visible, tagText: nameTag.text,
      hat: hatMats.length ? "#" + hatMats[0].mat.color.getHexString() : "", hatParts: hatMats.length,
      cam: { x: camera.position.x, y: camera.position.y, z: camera.position.z }, snow: snowFx.visible,
      power: attackPower(), counters: { ...g.counters }, fps, touch: input.touchMode, padShown: els.pad.classList.contains("show"),
      norun: g.norun && { source: g.norun.source, size: g.norun.size }, camDist: g.camDist,
      hitbox: { w: g.player.w, h: g.player.h }, errors: errors.slice(), highlight: hl.visible, lastNo: g.lastNo || "", lastShareError: g.lastShareError || "",
      bag: { size: bag.size, cells: bag.cells.slice(), cursor: bag.cursor },
    }),
    /* 速さの 目安：fps、1コマの 処理時間、描いて いる チャンク・三角形・描画回数 */
    perf: (reset) => ({ fps, jsMs, jsMax: reset ? (jsMax = 0) : jsMax, chunks: chunkMap.size, pending, tris: renderer.info.render.triangles, calls: renderer.info.render.calls, geos: renderer.info.memory.geometries }),
    block: (x, y, z) => g.world.get(x, y, z),
    count: (id) => invCount(id),
    give: (id, n) => { invAdd(id, n); refreshAllUI(); },
    clearInv: () => { g.inv.fill(null); refreshAllUI(); },
    setTime: (t) => { g.time = t; },
    setHp: (n) => { g.hp = n; refreshStatus(); },
    setHunger: (n) => { g.hunger = n; refreshStatus(); },
    spawn: (type, dist = 1.6) => { const p = g.player; return !!mobs.add(type, p.x - Math.sin(g.yaw) * dist, p.y + 0.2, p.z - Math.cos(g.yaw) * dist); },
    spawnAnimal: (kind, dist = 1.8, shy = false) => { const p = g.player; return !!mobs.addAnimal(kind, p.x - Math.sin(g.yaw) * dist, p.y + 0.1, p.z - Math.cos(g.yaw) * dist, shy); },
    tp: (x, y, z) => { g.player.place({ x, y, z }); camY = y + g.lookUp; },
    /* 地上の、その バイオームの 立てる 場所 */
    findBiome: (bi) => { const w = g.world; for (let r = 4; r < 120; r += 3) for (let k = 0; k < 40; k++) { const a = k / 40 * 6.283, x = Math.round(128 + Math.cos(a) * r), z = Math.round(128 + Math.sin(a) * r); if (w.biomeAt(x, z) !== bi) continue; const y = w.topSolid(x, z); if (w.get(x, y + 1, z) === 0 && w.get(x, y + 2, z) === 0 && [1, 15, 4].includes(w.get(x, y, z))) return { x: x + 0.5, y: y + 1, z: z + 0.5 }; } return null; },
    /* 平らで 何も ない 草地（5×5） */
    findFlat: () => { const w = g.world; for (let r = 0; r < 110; r += 2) for (let k = 0; k < Math.max(1, r * 3); k++) { const a = k / Math.max(1, r * 3) * 6.283, x = Math.round(128 + Math.cos(a) * r), z = Math.round(128 + Math.sin(a) * r), y = w.topSolid(x, z); let ok = w.get(x, y, z) === B.GRASS; for (let dz = -3; dz <= 3 && ok; dz++) for (let dx = -3; dx <= 3 && ok; dx++) { if (w.get(x + dx, y, z + dz) !== B.GRASS) ok = false; for (let dy = 1; dy <= 5 && ok; dy++) if (w.get(x + dx, y + dy, z + dz) !== 0) ok = false; } if (ok) return { x: x + 0.5, y: y + 1, z: z + 0.5 }; } return null; },
    /* 岸辺（となりが 水）の 立てる 場所 */
    findWater: () => { const w = g.world; for (let r = 2; r < 120; r += 2) for (let k = 0; k < 60; k++) { const a = k / 60 * 6.283, x = Math.round(128 + Math.cos(a) * r), z = Math.round(128 + Math.sin(a) * r); const y = w.topSolid(x, z); if (w.get(x, y + 1, z) !== 0 || w.get(x, y + 2, z) !== 0 || [6, 5].includes(w.get(x, y, z))) continue; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (w.get(x + dx, y, z + dz) === B.WATER && w.get(x + dx, y + 1, z + dz) === B.AIR) return { x: x + 0.5, y: y + 1, z: z + 0.5 }; } return null; },
    /* その ブロックで、となり（+z 側）に 立てる すき間が ある 所（洞窟の 中の 鉱石など） */
    findBlock: (id, yMax = 99) => find((b, x, y, z, w) => b === id && y <= yMax && z < WORLD.sz - 2 && w.get(x, y, z + 1) === 0 && w.get(x, y - 1, z + 1) !== 0 && w.get(x, y - 1, z + 1) !== B.WATER),
    findCave: () => find((b, x, y, z, w) => b === 0 && y > 2 && y < 12 && w.skyAt(x, y, z) === 0 && w.solid(x, y - 1, z) && w.get(x, y + 1, z) === 0 && w.lampAt(x, y, z, w.lightsNear(x, z, x, z)) === 0),
    /* 画面の 明るさ（0〜255）。center＝true なら 画面の まん中 だけ */
    lum: (center) => {
      const hv = hl.visible, cv = crack.visible; hl.visible = false; crack.visible = false;   // ねらいの 光は 入れない
      renderer.render(scene, camera); hl.visible = hv; crack.visible = cv;
      const t = document.createElement("canvas"); t.width = t.height = 64;
      const x = t.getContext("2d"); x.drawImage(canvas, 0, 0, 64, 64);
      const a = center ? 29 : 0, b = center ? 35 : 64;
      const d = x.getImageData(a, a, b - a, b - a).data; let s = 0;
      for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      return s / ((b - a) * (b - a));
    },
    colorsOnScreen: () => {
      renderer.render(scene, camera);
      const t = document.createElement("canvas"); t.width = t.height = 64;
      const x = t.getContext("2d"); x.drawImage(canvas, 0, 0, 64, 64);
      const d = x.getImageData(0, 0, 64, 64).data; const set = new Set();
      for (let i = 0; i < d.length; i += 4) set.add((d[i] >> 4) + "," + (d[i + 1] >> 4) + "," + (d[i + 2] >> 4));
      return set.size;
    },
    code: () => Save.toCode(Save.pack(g)),
    setMode, setView,
  };
}

boot().catch((e) => { errors.push(String(e)); console.error(e); $("loading").textContent = "よみこみに しっぱい しました"; });
requestAnimationFrame(frame);
