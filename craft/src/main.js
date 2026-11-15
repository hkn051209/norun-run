/* =========================================================
   のるんクラフト（仮） v2  本体
   描画・カメラ・ねらい・たたく／おく・クラフト・敵と ペット・つり・昼夜・
   セーブ（4スロット）・共有・画面の ボタン
   ========================================================= */
import * as THREE from "three";
import { VERSION, WORLD, PLAYER, CAM, DAY_LEN, NIGHT, MOB, AUTOSAVE_SEC } from "./config.js";
import { B, BLOCKS, isTarget, isSolid } from "./blocks.js";
import { I, ITEM_COUNT, INV_MAX, ITEMS, itemName, HOTBAR_BASE, HOTBAR_EXTRA, START_INV, TOOLS, TOOL_KEYS, toolName, hitsNeeded, dropOf, POWER, RECIPES } from "./items.js";
import { COLORS, COLOR_INDEX, START_COLORS, MONSTERS, nextColor } from "./colors.js";
import { makeAtlas, tileIcon, makeCracks, drawIcon } from "./textures.js";
import { World, raycast } from "./world.js";
import { buildChunk } from "./mesher.js";
import { Player } from "./player.js";
import { Input } from "./input.js";
import * as Save from "./save.js";
import * as Share from "./share.js";
import { loadNorun } from "./norun.js";
import { Mobs } from "./mobs.js";
import { ArtScreen } from "./art.js";
import { sfx, unlock } from "./sfx.js";

const $ = (id) => document.getElementById(id);
const QS = new URLSearchParams(location.search);
const DEBUG = QS.has("debug");
const errors = [];
addEventListener("error", (e) => errors.push(String(e.message)));
addEventListener("unhandledrejection", (e) => errors.push(String(e.reason)));
const lin = (v) => Math.pow(v, 2.2);       // 画面で 見た 明るさ → 計算用の 明るさ

/* ---------- 描画の 土台 ---------- */
const canvas = $("game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
const scene = new THREE.Scene();
const SKY_DAY = new THREE.Color(0x8fd3ff), SKY_NIGHT = new THREE.Color(0x0e1638), SKY_DUSK = new THREE.Color(0xffb27a);
scene.background = SKY_DAY.clone();
scene.fog = new THREE.Fog(scene.background.getHex(), 45, 120);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
const hemi = new THREE.HemisphereLight(0xffffff, 0x9aa7b8, 2.2);
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
scene.add(hemi, sun);

const atlas = makeAtlas();
const tex = new THREE.CanvasTexture(atlas);
tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace;
const matSolid = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, alphaTest: 0.5 });
const matWater = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, depthWrite: false });
/* 夜、のるんの そばの ブロックだけ 少し 明るく する（軽い：色に かけ算 するだけ） */
const glowU = { value: new THREE.Vector4(0, 0, 0, 0) };
for (const m of [matSolid, matWater]) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = glowU;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWPos;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec4 uGlow;\nvarying vec3 vWPos;")
      .replace("#include <color_fragment>", `#include <color_fragment>\ndiffuseColor.rgb *= 1.0 + uGlow.w * smoothstep(${NIGHT.nearR.toFixed(1)}, 1.5, distance(vWPos, uGlow.xyz));`);
  };
}
const sea = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshBasicMaterial({ color: 0xdff3ff }));
sea.rotation.x = -Math.PI / 2; sea.position.set(WORLD.sx / 2, -8, WORLD.sz / 2);
scene.add(sea);

/* ---------- ゲームの 状態 ---------- */
const g = {
  slot: -1, name: "", playing: false, paused: true, sleeping: false, ready: false,
  world: null, player: null,
  inv: new Array(ITEM_COUNT).fill(0),
  sel: B.GRASS,                                   // えらんで いる 持ち物
  tools: { pick: 0, axe: 0, shovel: 0, rod: 0 }, // 道具の 段階（0＝なし、1＝木、2＝石）
  held: "hand",                                   // 手に 持って いる 物：hand / pick / axe / shovel / rod / weapon
  colors: START_COLORS.slice(), colorSel: COLOR_INDEX.aka,
  art: Save.emptyArt(), equip: { weapon: -1, pet: -1 },
  hp: PLAYER.hpMax, respawn: null, enemiesOn: true,
  yaw: 0, pitch: CAM.pitch0, time: DAY_LEN * 0.1, faceYaw: Math.PI,
  target: null, dig: null, fish: null, near: { bench: false, bed: false, water: null },
  invuln: 0, regenT: PLAYER.regenSec, camDist: 4.8, lookUp: 1.4,
  norun: null, light: { day: 1, blocks: 1, near: 1, chars: 1 },
  luck: null, fastFish: false, noGlow: false,     // 検証用
  counters: { broke: 0, placed: 0, saves: 0, hits: 0, knocks: 0, kills: 0, crafts: 0, deaths: 0, fish: 0 },
};
const roll = (p) => (g.luck === null ? Math.random() : g.luck) < p;

/* ---------- チャンク ---------- */
const NCX = WORLD.sx / WORLD.chunk, NCZ = WORLD.sz / WORLD.chunk;
const chunks = [];
const dirtyChunks = new Set();
function rebuildChunk(ci) {
  const cx = ci % NCX, cz = Math.floor(ci / NCX);
  const c = chunks[ci] || (chunks[ci] = { solid: null, water: null });
  const geo = buildChunk(g.world, cx, cz);
  for (const k of ["solid", "water"]) {
    if (c[k]) { scene.remove(c[k]); c[k].geometry.dispose(); c[k] = null; }
    if (geo[k]) {
      c[k] = new THREE.Mesh(geo[k], k === "solid" ? matSolid : matWater);
      if (k === "water") c[k].renderOrder = 1;
      scene.add(c[k]);
    }
  }
}
function rebuildAll() { for (let i = 0; i < NCX * NCZ; i++) rebuildChunk(i); dirtyChunks.clear(); }
function markDirty(x, z) {
  const S = WORLD.chunk;
  const add = (xx, zz) => { if (xx >= 0 && zz >= 0 && xx < WORLD.sx && zz < WORLD.sz) dirtyChunks.add(Math.floor(xx / S) + Math.floor(zz / S) * NCX); };
  add(x, z); add(x - 1, z); add(x + 1, z); add(x, z - 1); add(x, z + 1);
}
let saveSoon = AUTOSAVE_SEC;
function touchSave() { saveSoon = Math.min(saveSoon, 2); }
function setBlock(x, y, z, id) {
  if (!g.world.set(x, y, z, id)) return false;
  markDirty(x, z);
  if (id !== B.FLOWER && g.world.get(x, y + 1, z) === B.FLOWER) { g.world.set(x, y + 1, z, B.AIR); }   // 足もとが なくなった おはなは 消える
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

/* ---------- 手に 持つ 物（絵を 立てた 板・両面） ---------- */
const heldPivot = new THREE.Group();
const heldMat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.08, side: THREE.DoubleSide });
const heldMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.85), heldMat);
heldMesh.position.y = 0.36; heldPivot.add(heldMesh); heldPivot.position.set(0.66, 0.26, 0.12); heldPivot.visible = false;
let swingT = 0;
const iconTex = new Map();           // ふつうの 見た目（道具の アイコン）
const artTex = new WeakMap();        // 描いた 絵
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
  heldPivot.visible = !!t;
  if (t && heldMat.map !== t) { heldMat.map = t; heldMat.needsUpdate = true; }
}
function refreshPet() { const e = g.equip.pet >= 0 ? g.art.pets[g.equip.pet] : null; mobs.setPet(e ? texOfArt(e) : null); }

/* つりの うき */
const bobber = new THREE.Group();
{ const r = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff5a5a })); const w = new THREE.Mesh(new THREE.SphereGeometry(0.112, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff })); bobber.add(r, w); }
bobber.visible = false; scene.add(bobber);

/* ---------- 画面の 部品 ---------- */
const els = { jump: $("btnJump"), brk: $("btnBreak"), put: $("btnPlace"), ctx: $("btnCtx"), pad: $("pad"), knob: $("knob") };
let toastT = 0;
function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 1800);
}
const press = (el, fn) => { el.addEventListener("pointerdown", (e) => { e.preventDefault(); unlock(); fn(e); }); el.addEventListener("contextmenu", (e) => e.preventDefault()); };

/* 持ち物の アイコン */
function iconOf(id, size = 32) {
  if (BLOCKS[id]) return tileIcon(atlas, BLOCKS[id].icon, size, id === B.COLOR ? COLORS[g.colorSel].hex : null);
  return drawIcon(ITEMS[id].icon);
}

/* ホットバー（9種 ＋ 持って いる 時だけ いろブロック・さぎょうだい・ベッド） */
let hotItems = [], hotSig = "";
const slots = [];
function refreshHotbar() {
  const items = HOTBAR_BASE.concat(HOTBAR_EXTRA.filter((id) => g.inv[id] > 0 || (id === B.COLOR)));
  if (!items.includes(g.sel)) g.sel = items[0];
  const sig = items.join(",") + "|" + g.colorSel;
  if (sig !== hotSig) {
    hotSig = sig; hotItems = items; slots.length = 0;
    const bar = $("hotbar"); bar.innerHTML = "";
    document.documentElement.style.setProperty("--n", Math.max(10, items.length));
    items.forEach((id) => {
      const b = document.createElement("button");
      b.className = "slot"; b.dataset.id = id; b.setAttribute("aria-label", itemName(id));
      b.appendChild(iconOf(id));
      const n = document.createElement("span"); n.className = "num"; b.appendChild(n);
      press(b, () => selectItem(id));
      bar.appendChild(b);
      slots.push({ el: b, num: n, id });
    });
    requestAnimationFrame(measureBar);
  }
  for (const s of slots) {
    const n = g.inv[s.id];
    s.num.textContent = n > 0 ? n : "";
    s.el.classList.toggle("empty", n <= 0);
    s.el.classList.toggle("sel", s.id === g.sel);
  }
  refreshColorStrip(); refreshSelName();
}
function selectItem(id) { if (!hotItems.includes(id)) return; g.sel = id; refreshHotbar(); touchSave(); }
function refreshSelName() {
  let s = itemName(g.sel);
  if (g.sel === B.COLOR) s += "（" + COLORS[g.colorSel].name + "）";
  $("selName").textContent = s;
}
/* いろブロックを えらんで いる 間、解放ずみの 色が 上に ならぶ */
function refreshColorStrip() {
  const box = $("colorStrip");
  const show = g.sel === B.COLOR && g.playing;
  box.classList.toggle("show", show);
  if (!show) return;
  box.innerHTML = "";
  for (const key of g.colors) {
    const i = COLOR_INDEX[key], c = COLORS[i];
    const b = document.createElement("button"); b.className = "sw" + (i === g.colorSel ? " sel" : ""); b.style.background = c.hex; b.dataset.color = key; b.title = c.name;
    press(b, () => { g.colorSel = i; hotSig = ""; refreshHotbar(); touchSave(); });
    box.appendChild(b);
  }
}

/* 道具欄：て・作った 道具・装備した 武器。タップで 持ちかえ */
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
    if (TOOL_KEYS.includes(h) && h !== "rod") { const t = document.createElement("span"); t.className = "tier"; t.textContent = g.tools[h] === 2 ? "いし" : "き"; b.appendChild(t); }
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
function measureBar() { document.documentElement.style.setProperty("--barH", $("bar").offsetHeight + "px"); }

function refreshHearts() {
  const box = $("hearts");
  if (box.children.length !== PLAYER.hpMax) { box.innerHTML = ""; for (let i = 0; i < PLAYER.hpMax; i++) { const s = document.createElement("span"); s.textContent = "❤️"; box.appendChild(s); } }
  [...box.children].forEach((s, i) => s.classList.toggle("off", i >= g.hp));
}
function refreshEnemyBtn() { $("btnEnemy").classList.toggle("off", !g.enemiesOn); $("enemyLab").textContent = g.enemiesOn ? "でる" : "でない"; }
function refreshAllUI() { hotSig = ""; refreshHotbar(); refreshTools(); refreshHearts(); refreshEnemyBtn(); refreshCtx(); }

/* ---------- かさなる 画面 ---------- */
const OVS = ["title", "sheet", "menu", "craft", "art"];
function syncPause() {
  g.paused = OVS.some((id) => $(id).classList.contains("show"));
  input.enabled = !g.paused && g.playing && !g.sleeping;
  if (!input.enabled) input.releaseAll();
}
function openOv(id) { $(id).classList.add("show"); syncPause(); }
function closeOv(id) { $(id).classList.remove("show"); syncPause(); }

/* ---------- 色 ---------- */
function unlockColor(c) {
  if (g.colors.includes(c.key)) return false;
  g.colors.push(c.key);
  toast("あたらしい いろ「" + c.name + "」を みつけた！");
  sfx.color(); refreshColorStrip(); touchSave();
  return true;
}

/* ---------- たたく（敵が 近ければ 攻撃、そうで なければ ブロック） ---------- */
function attackPower() {
  if (g.held === "weapon") { const e = g.art.weapons[g.equip.weapon]; return POWER.weapon + POWER.weaponBonus * Math.min(1, (e ? e.area : 0) / 0.5); }
  return TOOL_KEYS.includes(g.held) && g.held !== "rod" ? POWER.tool : POWER.hand;
}
function hit() {
  if (!g.playing || g.paused || g.sleeping) return null;
  swingT = 1;
  const p = g.player;
  const e = mobs.nearest(PLAYER.hitRange);
  if (e) {
    const fx = e.body.x - p.x, fz = e.body.z - p.z;
    g.faceYaw = Math.atan2(fx, fz);
    mobs.damage(e, attackPower(), fx, fz);
    g.counters.hits++; sfx.hit();
    return "enemy";
  }
  const t = g.target;
  if (!t) { sfx.swish(); return null; }
  const need = hitsNeeded(t.id, g.held, g.tools);
  if (!need) { toast("これは こわせないよ"); sfx.no(); return null; }
  const key = t.x + "," + t.y + "," + t.z;
  if (!g.dig || g.dig.key !== key) g.dig = { key, x: t.x, y: t.y, z: t.z, hits: 0, need, t: 0 };
  g.dig.hits++; g.dig.need = need; g.dig.t = 3.5; g.counters.knocks++;
  if (g.dig.hits < need) { sfx.knock(g.dig.hits); return "knock"; }
  // こわれた
  g.dig = null;
  setBlock(t.x, t.y, t.z, B.AIR);
  const drop = dropOf(t.id);
  if (drop) g.inv[drop] = Math.min(INV_MAX, g.inv[drop] + 1);
  if (t.id === B.FLOWER) {
    const c = nextColor("flower", g.colors);
    if (!(c && roll(0.5) && unlockColor(c))) toast("おはなを つんだよ");
  }
  g.counters.broke++;
  sfx.break(); refreshHotbar(); updateTarget();
  return "broke";
}
function placeBlock() {
  if (!g.playing || g.paused || g.sleeping) return false;
  const t = g.target;
  if (!t) return false;
  const item = g.sel;
  g.lastNo = "";
  if (g.inv[item] <= 0) { g.lastNo = "none"; toast(itemName(item) + " が ないよ"); sfx.no(); return false; }
  const x = t.x + t.nx, y = t.y + t.ny, z = t.z + t.nz;
  if (!g.world.inside(x, y, z)) { g.lastNo = "outside"; toast("そこには おけないよ"); sfx.no(); return false; }
  const cur = g.world.get(x, y, z);
  if (cur !== B.AIR && cur !== B.WATER) { g.lastNo = "filled"; return false; }
  if (g.player.overlapsCell(x, y, z)) { g.lastNo = "norun"; toast("のるんが いるよ"); sfx.no(); return false; }
  setBlock(x, y, z, item === B.COLOR ? B.COLOR + g.colorSel : item);
  g.inv[item]--;
  g.counters.placed++;
  sfx.place(); refreshHotbar(); updateTarget(); scanNear();
  return true;
}

/* ---------- クラフト ---------- */
function craftBlock(r) {          // 作れない 理由（作れるなら ""）
  if (r.bench && !g.near.bench) return "bench";
  if (r.out.tool && g.tools[r.out.tool] >= r.out.tier) return "have";
  if (r.out.heal && g.hp >= PLAYER.hpMax) return "full";
  for (const [id, n] of r.need) if (g.inv[id] < n) return "need";
  return "";
}
function craft(r) {
  if (craftBlock(r)) { sfx.no(); return false; }
  for (const [id, n] of r.need) g.inv[id] -= n;
  const o = r.out;
  if (o.item) g.inv[o.item] = Math.min(INV_MAX, g.inv[o.item] + o.n);
  if (o.tool) { g.tools[o.tool] = o.tier; if (g.held === "hand" && o.tool !== "rod") g.held = o.tool; }
  if (o.heal) { g.hp = Math.min(PLAYER.hpMax, g.hp + o.heal); }
  g.counters.crafts++;
  sfx.craft(); toast(o.heal ? "もぐもぐ… げんきが でた！" : r.name + " が できた！");
  refreshAllUI(); renderCraft(); touchSave();
  return true;
}
function renderCraft() {
  $("craftNote").textContent = g.near.bench ? "さぎょうだいが ちかくに あるよ。ぜんぶ つくれる！" : "🔒 の ものは、さぎょうだいの ちかくで つくれるよ";
  const box = $("craftList"); box.innerHTML = "";
  for (const r of RECIPES) {
    const why = craftBlock(r);
    const row = document.createElement("div"); row.className = "rc" + (why === "bench" ? " lock" : ""); row.dataset.id = r.id;
    const o = r.out;
    row.appendChild(o.item ? iconOf(o.item) : o.tool ? drawIcon(o.tool, o.tier) : drawIcon("heart"));
    const nm = document.createElement("div"); nm.className = "rn";
    const b = document.createElement("b"); b.textContent = (r.bench ? (g.near.bench ? "" : "🔒 ") : "") + r.name + (o.item && o.n > 1 ? " ×" + o.n : ""); nm.appendChild(b);
    const need = document.createElement("span");
    r.need.forEach(([id, n], k) => { const i = document.createElement("i"); i.className = g.inv[id] < n ? "ng" : ""; i.textContent = (k ? "　" : "") + itemName(id) + " " + g.inv[id] + "/" + n; need.appendChild(i); });
    nm.appendChild(need); row.appendChild(nm);
    const btn = document.createElement("button");
    btn.textContent = why === "have" ? "もってる" : why === "full" ? "まんたん" : why === "bench" ? "さぎょうだいで" : o.heal ? "たべる" : "つくる";
    btn.disabled = !!why;
    btn.addEventListener("click", () => craft(r));
    row.appendChild(btn); box.appendChild(row);
  }
  const bag = $("bag"); bag.innerHTML = "";
  const add = (t) => { const s = document.createElement("span"); s.textContent = t; bag.appendChild(s); };
  for (let id = 1; id < ITEM_COUNT; id++) if (g.inv[id] > 0) add(itemName(id) + " " + g.inv[id]);
  for (const k of TOOL_KEYS) if (g.tools[k] > 0) add("🛠 " + toolName(k, g.tools[k]));
  if (!bag.children.length) add("まだ なにも もって いないよ。き を たたいて あつめよう");
}
function openCraft() { if (!g.playing || g.sleeping) return; scanNear(); renderCraft(); openOv("craft"); }
$("btnCraft").addEventListener("click", openCraft);
$("craftClose").addEventListener("click", () => closeOv("craft"));

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
  $("btnCraft").classList.toggle("near", bench);
  refreshCtx();
}
/* その場の ボタン：つり中＝ひく／ベッドの そば＝ねる／水の そば（つりざお あり）＝つり */
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
  if (g.world.count(B.FLOWER) >= 10) return;
  for (let k = 0, n = 0; k < 40 && n < 3; k++) {
    const x = 2 + Math.floor(Math.random() * (WORLD.sx - 4)), z = 2 + Math.floor(Math.random() * (WORLD.sz - 4));
    const y = g.world.topSolid(x, z);
    if (g.world.get(x, y, z) === B.GRASS && g.world.get(x, y + 1, z) === B.AIR && !g.player.overlapsCell(x, y + 1, z)) { setBlock(x, y + 1, z, B.FLOWER); n++; }
  }
}
function sleep() {
  g.sleeping = true; syncPause(); endFish("");
  $("fade").classList.add("show"); sfx.sleep();
  setTimeout(() => {
    const p = g.player;
    g.time = DAY_LEN * NIGHT.morning;
    g.hp = PLAYER.hpMax; g.invuln = 0;
    g.respawn = { x: p.x, y: p.y, z: p.z };      // ここが 復活地点
    mobs.clear(); growFlowers();
    refreshHearts(); saveNow(false);
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
  let msg;
  const c = nextColor("fish", g.colors);
  if (c && roll(0.18)) { endFish(""); unlockColor(c); swingT = 1; return; }
  if (roll(0.16)) {
    const id = [B.GLASS, B.GLASS, B.BRICK, B.COLOR][Math.floor(Math.random() * 4)];
    g.inv[id] = Math.min(INV_MAX, g.inv[id] + 1); msg = "おや？ " + itemName(id) + " が つれた！";
  } else { g.inv[I.FISH] = Math.min(INV_MAX, g.inv[I.FISH] + 1); msg = "さかなが つれた！"; }
  swingT = 1; sfx.pop(); endFish(msg); refreshHotbar(); touchSave();
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

/* ---------- 敵・ペット・体力 ---------- */
const mobs = new Mobs(scene, g, {
  onTouch: (e) => { if (g.invuln <= 0 && !g.sleeping) hurt(1, e.body.x, e.body.z); },
  onKill: (e) => {
    g.counters.kills++; sfx.pop();
    const c = nextColor(e.type, g.colors);       // その 色の なかまの 色を 落とす
    if (!(c && roll(MOB.dropChance) && unlockColor(c))) toast(e.name + " を たおした！");
  },
});
function hurt(n, fromX, fromZ) {
  const p = g.player;
  g.hp -= n; g.invuln = PLAYER.invuln; g.regenT = PLAYER.regenSec;
  const dx = p.x - fromX, dz = p.z - fromZ, l = Math.hypot(dx, dz) || 1;
  p.vx = dx / l * 7; p.vz = dz / l * 7; p.vy = 5.5; p.onGround = false;
  sfx.hurt(); refreshHearts();
  const h = $("hearts"); h.classList.remove("hurt"); void h.offsetWidth; h.classList.add("hurt");
  if (g.hp <= 0) die();
}
/* ハートが ゼロ：スタート地点（ベッドで ねた 所）へ もどるだけ。持ち物も 色も そのまま */
function die() {
  g.counters.deaths++;
  endFish("");
  g.player.place(respawnPoint());
  g.hp = PLAYER.hpMax; g.invuln = 3; g.dig = null;
  mobs.clear(); camY = g.player.y + g.lookUp; benchArmed = false; benchAway = 0;   // もどった 先で クラフト画面が 勝手に 開かない ように
  refreshHearts(); toast("やられちゃった… もとの ばしょに もどったよ"); touchSave();
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
    refreshTools(); touchSave();
  },
});
function openArt() { if (!g.playing || g.sleeping) return; artScreen.open(); openOv("art"); }
$("btnArt").addEventListener("click", openArt);

/* ---------- 操作 ---------- */
let hintDone = false;
const input = new Input(canvas, els, {
  hit, placeBlock, context,
  select: (i) => { if (hotItems[i] !== undefined) selectItem(hotItems[i]); },
  cycle: (d) => { const i = hotItems.indexOf(g.sel); selectItem(hotItems[(i + d + hotItems.length) % hotItems.length]); },
  craft: openCraft, paint: openArt,
  nextTool: () => { const l = heldList(); setHeld(l[(l.indexOf(g.held) + 1) % l.length]); },
  gesture: () => unlock(),
  modeChanged: (touch) => document.body.classList.toggle("touch", touch),
});
document.body.classList.toggle("touch", input.touchMode);

/* ---------- カメラ ---------- */
const camTarget = new THREE.Vector3(), camPos = new THREE.Vector3();
const ray = new THREE.Raycaster();
let camY = 0;
function updateCamera(dt) {
  const p = g.player;
  g.pitch = Math.max(CAM.pitchMin, Math.min(CAM.pitchMax, g.pitch));
  const wantY = p.y + g.lookUp;
  camY += (wantY - camY) * Math.min(1, dt * 12);
  if (Math.abs(wantY - camY) > 3) camY = wantY;
  let ty = camY;
  if (g.world.solid(Math.floor(p.x), Math.floor(ty), Math.floor(p.z))) ty = p.y + p.h * 0.8;
  camTarget.set(p.x, ty, p.z);
  const cp = Math.cos(g.pitch);
  const dx = Math.sin(g.yaw) * cp, dy = Math.sin(g.pitch), dz = Math.cos(g.yaw) * cp;
  let dist = g.camDist;
  for (let t = 0.2; t <= g.camDist + 0.3; t += 0.1) {
    if (isSolid(g.world.get(Math.floor(camTarget.x + dx * t), Math.floor(camTarget.y + dy * t), Math.floor(camTarget.z + dz * t)))) { dist = Math.max(0.5, t - 0.3); break; }
  }
  camPos.set(camTarget.x + dx * dist, camTarget.y + dy * dist, camTarget.z + dz * dist);
  camera.position.copy(camPos);
  camera.lookAt(camTarget);
  camera.updateMatrixWorld();
}

const aim = new THREE.Vector2();
function updateTarget() {
  const p = g.player;
  if (input.touchMode || !input.mouse.inside) aim.set(0, 0); else aim.set(input.mouse.x, input.mouse.y);
  ray.setFromCamera(aim, camera);
  const o = ray.ray.origin, d = ray.ray.direction;
  const hitB = raycast(g.world, o.x, o.y, o.z, d.x, d.y, d.z, g.camDist + PLAYER.reach + 2, isTarget);
  let ok = null;
  if (hitB) {
    const cx = p.x, cy = p.y + p.h / 2, cz = p.z;
    const qx = Math.max(hitB.x, Math.min(cx, hitB.x + 1)), qy = Math.max(hitB.y, Math.min(cy, hitB.y + 1)), qz = Math.max(hitB.z, Math.min(cz, hitB.z + 1));
    if (Math.hypot(qx - cx, qy - cy, qz - cz) <= PLAYER.reach) ok = hitB;
  }
  g.target = ok;
  hl.visible = !!ok;
  if (ok) hl.position.set(ok.x + 0.5, ok.y + 0.5, ok.z + 0.5);
  // ヒビ
  const dg = g.dig;
  crack.visible = !!dg;
  if (dg) { crack.position.set(dg.x + 0.5, dg.y + 0.5, dg.z + 0.5); crackTex.offset.x = Math.min(3, Math.floor((dg.hits / dg.need) * 4)) * 0.25; }
}

/* ---------- 昼と 夜：空・ブロック・キャラクターの 明るさを いっしょに 変える ---------- */
const skyCol = new THREE.Color();
function updateSky() {
  const a = (g.time / DAY_LEN) * Math.PI * 2;
  const s = Math.sin(a);                                 // ＋が 昼、−が 夜
  const day = Math.max(0, Math.min(1, s * 2.2 + 0.5));   // 0＝夜 1＝昼
  skyCol.copy(SKY_NIGHT).lerp(SKY_DAY, day);
  skyCol.lerp(SKY_DUSK, Math.max(0, 1 - Math.abs(s) * 4) * 0.45);
  scene.background.copy(skyCol); scene.fog.color.copy(skyCol);
  // ブロック：夜は 昼の 50％（画面で 見た 明るさ）
  const b = NIGHT.blocks + (1 - NIGHT.blocks) * day;
  matSolid.color.setRGB(b, b, b, THREE.SRGBColorSpace); matWater.color.copy(matSolid.color);
  sea.material.color.setRGB(0.87 * b, 0.95 * b, b, THREE.SRGBColorSpace);
  // のるんの そばだけ 少し 明るく
  const near = NIGHT.near + (1 - NIGHT.near) * day;
  glowU.value.set(g.player.x, g.player.y + 0.5, g.player.z, g.noGlow ? 0 : lin(near) / lin(b) - 1);
  // のるん・敵（ライトで 照らす 物）と、ペット・持ち物（絵の 板）
  const cb = NIGHT.chars + (1 - NIGHT.chars) * day;
  hemi.intensity = 2.2 * lin(cb); sun.intensity = 1.6 * lin(cb);
  sun.position.set(Math.cos(a) * 30, Math.abs(s) * 40 + 8, 18);
  heldMat.color.setRGB(cb, cb, cb, THREE.SRGBColorSpace);
  if (mobs.pet) mobs.pet.mesh.material.color.copy(heldMat.color);
  g.light = { day, blocks: b, near: g.noGlow ? b : near, chars: cb, hemi: hemi.intensity, sun: sun.intensity };
  const icon = day > 0.5 ? "🌞" : "🌙";
  if ($("clock").textContent !== icon) $("clock").textContent = icon;
}

/* ---------- のるんの 動き ---------- */
let walkPhase = 0, lean = 0;
function updateNorun(dt, now) {
  const n = g.norun, p = g.player;
  if (!n) return;
  n.group.position.set(p.x, p.y + p.stepVis, p.z);
  const sp = Math.hypot(p.vx, p.vz);
  if (sp > 0.4 && g.invuln < PLAYER.invuln - 0.4 && !g.fish) {
    const want = Math.atan2(p.vx, p.vz);
    let d = want - g.faceYaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    g.faceYaw += d * Math.min(1, dt * 12);
  }
  n.group.rotation.y = g.faceYaw;
  n.group.visible = !(g.invuln > 0 && g.invuln < PLAYER.invuln + 0.1 && Math.floor(now / 90) % 2 === 0);   // 当たった あとは ちかちか
  const moving = sp > 0.4 && p.onGround;
  if (moving) walkPhase += dt * sp * 2.6;
  let sy = 1, hop = 0;
  if (!p.onGround && !p.inWater) sy = 1 + Math.max(-0.1, Math.min(0.16, p.vy * 0.018));
  else if (moving) { hop = Math.abs(Math.sin(walkPhase)) * 0.09; sy = 1 + Math.sin(walkPhase * 2) * 0.05; }
  else sy = 1 + Math.sin(now * 0.0022) * 0.018;
  sy -= p.landT * 0.24;
  if (p.inWater) hop = Math.sin(now * 0.004) * 0.04;
  const sxz = 1 / Math.sqrt(sy);
  n.inner.scale.set(sxz, sy, sxz);
  n.inner.position.y = hop;
  lean += ((moving ? 0.13 : 0) - lean) * Math.min(1, dt * 10);
  n.inner.rotation.x = lean;
  // 持ち物を ふる
  swingT = Math.max(0, swingT - dt * 4.5);
  heldPivot.rotation.x = Math.sin(swingT * Math.PI) * 1.25 + (g.fish ? 0.5 : 0);
  heldPivot.position.y = 0.26 + hop;

  let gy = Math.floor(p.y + 0.01);
  while (gy > 0 && !g.world.solid(Math.floor(p.x), gy - 1, Math.floor(p.z))) gy--;
  const hgt = p.y - gy;
  shadow.position.set(p.x, gy + 0.02, p.z);
  const k = Math.max(0.35, 1 - hgt * 0.18);
  shadow.scale.setScalar(k * p.w * 1.25);
  shadow.material.opacity = 0.3 * k;
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
  benchArmed = false; benchAway = 0; mobs.clear(); g.faceYaw = Math.PI;
  g.player.world = g.world; mobs.g = g;
}
function applySave(d) {
  g.world = new World(d.seed);
  g.world.applyChanges(d.changes);
  g.inv.fill(0);
  for (const k of Object.keys(d.inv)) g.inv[+k] = d.inv[k];
  g.sel = Number.isInteger(d.sel) ? d.sel : B.GRASS;
  g.tools = { ...d.tools }; g.held = d.held;
  g.colors = d.colors.slice(); g.colorSel = COLOR_INDEX[d.colorSel];
  g.art = d.art; g.equip = { ...d.equip };
  g.hp = d.hp; g.respawn = d.respawn; g.enemiesOn = d.enemiesOn;
  g.time = Number.isFinite(d.time) ? d.time : 0;
  resetRuntime();
  const pl = d.player || {};
  if (Number.isFinite(pl.x) && Number.isFinite(pl.y) && Number.isFinite(pl.z)) g.player.place({ x: Math.max(0.5, Math.min(WORLD.sx - 0.5, pl.x)), y: Math.max(0, Math.min(WORLD.sy + 4, pl.y)), z: Math.max(0.5, Math.min(WORLD.sz - 0.5, pl.z)) });
  else g.player.place(g.world.spawn());
  g.yaw = Number.isFinite(pl.yaw) ? pl.yaw : 0;
  g.pitch = Number.isFinite(pl.pitch) ? pl.pitch : CAM.pitch0;
  camY = g.player.y + g.lookUp;
  rebuildAll(); refreshPet(); refreshAllUI();
}
function newWorld(seed) {
  g.world = new World(seed === undefined ? (Math.random() * 0xffffffff) >>> 0 : seed);
  g.inv.fill(0);
  for (const k of Object.keys(START_INV)) g.inv[+k] = START_INV[k];
  g.sel = B.GRASS; g.tools = { pick: 0, axe: 0, shovel: 0, rod: 0 }; g.held = "hand";
  g.colors = START_COLORS.slice(); g.colorSel = COLOR_INDEX.aka;
  g.art = Save.emptyArt(); g.equip = { weapon: -1, pet: -1 };
  g.hp = PLAYER.hpMax; g.respawn = null; g.enemiesOn = true;
  g.time = DAY_LEN * 0.1; g.yaw = 0; g.pitch = CAM.pitch0;
  resetRuntime();
  g.player.place(g.world.spawn());
  camY = g.player.y + g.lookUp;
  rebuildAll(); refreshPet(); refreshAllUI();
}

/* ---------- タイトル（スロットを えらぶ） ---------- */
const fmtDate = (t) => { const d = new Date(t), z = (n) => String(n).padStart(2, "0"); return `${d.getMonth() + 1}がつ${d.getDate()}にち ${z(d.getHours())}:${z(d.getMinutes())}`; };
function renderCards() {
  const box = $("cards"); box.innerHTML = "";
  for (const s of Save.slotList()) {
    const row = document.createElement("div"); row.className = "card" + (s.exists ? "" : " new"); row.dataset.i = s.i;
    const play = document.createElement("button"); play.className = "play";
    const nm = document.createElement("span"); nm.className = "nm"; nm.textContent = s.name;
    const dt = document.createElement("span"); dt.className = "dt"; dt.textContent = s.exists ? "🕒 " + fmtDate(s.savedAt) + "　🎨 " + s.colors + "いろ" : "＋ あたらしく はじめる";
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
  const d = Save.loadSlot(i);
  g.slot = i; g.name = Save.getNames()[i];
  if (d) applySave(d); else newWorld(SEED_FIX ? SEED_FIX + i : undefined);
  g.playing = true;
  for (const id of OVS) $(id).classList.remove("show");
  syncPause(); refreshAllUI(); scanNear();
  saveNow(false);
  toast(d ? g.name + " の つづきから" : g.name + " を はじめるよ");
}

/* スロットごとの メニュー（名前・コード・あいことば・けす） */
const sh = { i: 0, mode: "", arm: "" };
function openSheet(i) {
  sh.i = i; sh.mode = ""; sh.arm = "";
  const s = Save.slotList()[i];
  $("shTitle").textContent = s.name; $("shName").value = s.name;
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
/* 読みこんだ データを その スロットへ 入れる（名前が 初期の ままなら 相手の 名前を もらう） */
function writeSlot(i, data) {
  const names = Save.getNames();
  if (names[i] === Save.defaultName(i) && data.name) names[i] = Save.setName(i, data.name);
  data.name = names[i]; data.savedAt = Date.now();
  Save.saveSlot(i, data);
  renderCards(); openSheet(i);
}
/* 上書きの 確認：データが ある スロットは もういちど おして もらう */
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
  renderCards(); $("shTitle").textContent = name; $("shName").value = name; $("shMsg").textContent = "なまえを「" + name + "」に したよ";
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
$("btnMenu").addEventListener("click", () => { if (!g.playing || g.sleeping) return; $("menuTitle").textContent = g.name; $("mWork").classList.remove("show"); $("menuMsg").textContent = ""; openOv("menu"); });
$("mClose").addEventListener("click", () => closeOv("menu"));
$("mSave").addEventListener("click", () => { saveNow(true); $("menuMsg").textContent = "ほぞん したよ"; });
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
  camera.fov = w < h ? 72 : 60;
  camera.updateProjectionMatrix();
  measureBar();
}
addEventListener("resize", resize);
addEventListener("orientationchange", () => setTimeout(resize, 200));

/* ---------- 毎コマ ---------- */
let last = performance.now(), fpsN = 0, fpsT = 0, fps = 0, scanT = 0;
function frame(now) {
  requestAnimationFrame(frame);
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
    const knocked = g.invuln > PLAYER.invuln - 0.3;                 // はじかれて いる 間は 操作が きかない
    if (knocked) { wx = p.vx / p.speed; wz = p.vz / p.speed; }
    const steps = Math.max(1, Math.ceil(dt / 0.017));
    for (let i = 0; i < steps; i++) {
      p.update(dt / steps, wx, wz, input.jump && !knocked);
      if (p.jumped) sfx.jump();
    }
    if (p.y < -20) p.place(respawnPoint());
    if (!hintDone && (mv.x || mv.y)) { hintDone = true; $("hint").classList.add("hide"); }

    const tPrev = g.time;
    g.time = (g.time + dt) % DAY_LEN;
    if (g.time < tPrev) growFlowers();                              // 朝に なったら おはなが 少し 生える
    mobs.update(dt, g.light.day < 0.5);
    updateFish(dt, now);
    if (g.invuln > 0) g.invuln -= dt;
    if (g.hp < PLAYER.hpMax) { g.regenT -= dt; if (g.regenT <= 0) { g.hp++; g.regenT = PLAYER.regenSec; refreshHearts(); } }
    if (g.dig) { g.dig.t -= dt; if (g.dig.t <= 0) g.dig = null; }

    scanT -= dt;
    if (scanT <= 0) {
      scanT = 0.2; scanNear();
      // さぎょうだいに 近づいたら クラフト画面が 開く（いちど はなれる まで、もう 開かない）
      // （敵が 近い 時・当たった 直後は 開かない。たたかいの じゃまに なる ため）
      if (g.near.bench) { benchAway = 0; if (benchArmed && g.invuln <= 0 && !mobs.nearest(8)) { benchArmed = false; openCraft(); } }
      else { benchAway += 0.2; if (benchAway >= 1) benchArmed = true; }
    }
    saveSoon -= dt;
    if (saveSoon <= 0) saveNow(false);
  }
  if (dirtyChunks.size) { for (const ci of dirtyChunks) rebuildChunk(ci); dirtyChunks.clear(); }
  updateSky();
  updateNorun(dt, now);
  updateCamera(dt);
  updateTarget();
  hlFill.material.opacity = 0.2 + 0.14 * Math.sin(now * 0.006);
  renderer.render(scene, camera);
}

/* ---------- はじまり ---------- */
const SEED_FIX = DEBUG ? Number(QS.get("seed")) : 0;      // ?debug&seed=数字 で 地形を 固定（スロットごとに ＋番号）
async function boot() {
  if (DEBUG && QS.get("share")) Share.setDbUrl(QS.get("share"));
  g.player = new Player(null);
  const norun = await loadNorun();
  g.norun = norun;
  scene.add(norun.group);
  norun.group.add(heldPivot);
  g.player.setSize(norun.size.hitW, norun.size.hitH);
  g.lookUp = norun.size.hitH + 0.55;
  g.camDist = 3.0 + norun.size.hitH * 2.0;
  refreshHearts(); refreshEnemyBtn();
  resize();
  g.ready = true;
  showTitle();
  $("loading").classList.add("hide");
  document.body.dataset.ready = "1";
}
addEventListener("pagehide", () => saveNow(false));
document.addEventListener("visibilitychange", () => { if (document.hidden) saveNow(false); });

/* 検証用の のぞき穴（?debug の 時だけ）。ボットは 状態を 読み、操作は 画面を さわって 行う。
   時間の かかる 準備（素材を 配る・敵を 出す・夜に する 等）だけ ここから 行う */
if (DEBUG) {
  window.__nc = {
    g, input, errors, VERSION, mobs,
    state: () => ({
      ready: g.ready, playing: g.playing, paused: g.paused, slot: g.slot, name: g.name,
      pos: g.player && { x: g.player.x, y: g.player.y, z: g.player.z }, onGround: g.player.onGround,
      yaw: g.yaw, pitch: g.pitch, sel: g.sel, inv: g.inv.slice(), tools: { ...g.tools }, held: g.held,
      colors: g.colors.slice(), colorSel: COLORS[g.colorSel].key, equip: { ...g.equip },
      art: { weapons: g.art.weapons.map((a) => a && a.area), pets: g.art.pets.map((a) => a && a.area), tools: Object.fromEntries(TOOL_KEYS.map((k) => [k, g.art.tools[k] && g.art.tools[k].area])) },
      hp: g.hp, respawn: g.respawn, enemiesOn: g.enemiesOn, time: g.time, light: g.light,
      target: g.target && { x: g.target.x, y: g.target.y, z: g.target.z, nx: g.target.nx, ny: g.target.ny, nz: g.target.nz, id: g.target.id },
      dig: g.dig && { hits: g.dig.hits, need: g.dig.need }, crack: crack.visible, fish: g.fish && g.fish.phase, near: g.near, ctx: els.ctx.dataset.mode || "",
      hash: g.world ? g.world.hash() : "", changes: g.world ? g.world.changes.size : 0, seed: g.world ? g.world.seed : 0,
      enemies: mobs.list.filter((e) => !e.dying).map((e) => ({ type: e.type, hp: e.hp, x: e.body.x, y: e.body.y, z: e.body.z })),
      pet: mobs.pet && { x: mobs.pet.mesh.position.x, y: mobs.pet.mesh.position.y, z: mobs.pet.mesh.position.z },
      heldShown: heldPivot.visible, power: attackPower(),
      counters: { ...g.counters }, fps, touch: input.touchMode, padShown: els.pad.classList.contains("show"),
      norun: g.norun && { source: g.norun.source, size: g.norun.size }, camDist: g.camDist,
      hitbox: { w: g.player.w, h: g.player.h }, errors: errors.slice(), highlight: hl.visible, lastNo: g.lastNo || "", lastShareError: g.lastShareError || "",
    }),
    block: (x, y, z) => g.world.get(x, y, z),
    give: (id, n) => { g.inv[id] = Math.min(INV_MAX, g.inv[id] + n); refreshAllUI(); },
    setTime: (t) => { g.time = t; },
    setHp: (n) => { g.hp = n; refreshHearts(); },
    spawn: (type, dist = 1.6) => { const p = g.player; return !!mobs.add(type, p.x - Math.sin(g.yaw) * dist, p.y + 0.2, p.z - Math.cos(g.yaw) * dist); },
    tp: (x, y, z) => { g.player.place({ x, y, z }); camY = y + g.lookUp; },
    findWater: () => { const w = g.world; for (let z = 2; z < WORLD.sz - 2; z++) for (let x = 2; x < WORLD.sx - 2; x++) { const y = w.topSolid(x, z); if (w.get(x, y + 1, z) === B.AIR && w.get(x, y, z) !== B.LEAF) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { if (w.get(x + dx, y, z + dz) === B.WATER && w.get(x + dx, y + 1, z + dz) === B.AIR) return { x: x + 0.5, y: y + 1, z: z + 0.5 }; } } return null; },
    /* 画面の 明るさ（地形の 部分の 平均。0〜255） */
    lum: () => {
      renderer.render(scene, camera);
      const t = document.createElement("canvas"); t.width = t.height = 64;
      const x = t.getContext("2d"); x.drawImage(canvas, 0, 0, 64, 64);
      const d = x.getImageData(0, 0, 64, 64).data; let s = 0;
      for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      return s / (64 * 64);
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
  };
}

boot().catch((e) => { errors.push(String(e)); console.error(e); $("loading").textContent = "よみこみに しっぱい しました"; });
requestAnimationFrame(frame);
