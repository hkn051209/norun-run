/* =========================================================
   のるんクラフト（仮） v1  本体
   世界の 描画・カメラ・ねらい・こわす／おく・保存・画面の ボタン
   ========================================================= */
import * as THREE from "three";
import { VERSION, WORLD, PLAYER, CAM, DAY_LEN, AUTOSAVE_SEC } from "./config.js";
import { B, BLOCKS, BLOCK_COUNT, HOTBAR, START_INV, INV_MAX, isTarget } from "./blocks.js";
import { makeAtlas, tileIcon } from "./textures.js";
import { World, raycast } from "./world.js";
import { buildChunk } from "./mesher.js";
import { Player } from "./player.js";
import { Input } from "./input.js";
import * as Save from "./save.js";
import { loadNorun } from "./norun.js";
import { sfx, unlock } from "./sfx.js";

const $ = (id) => document.getElementById(id);
const DEBUG = new URLSearchParams(location.search).has("debug");
const errors = [];
addEventListener("error", (e) => errors.push(String(e.message)));
addEventListener("unhandledrejection", (e) => errors.push(String(e.reason)));

/* ---------- 描画の 土台 ---------- */
const canvas = $("game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));   // タブレットで 重く ならない ように
const scene = new THREE.Scene();
const SKY_DAY = new THREE.Color(0x8fd3ff), SKY_NIGHT = new THREE.Color(0x1d2a5c), SKY_DUSK = new THREE.Color(0xffb27a);
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

// 世界の 下の うすい 雲の 海（世界が 空に ういて 見える）
const sea = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshBasicMaterial({ color: 0xdff3ff }));
sea.rotation.x = -Math.PI / 2; sea.position.set(WORLD.sx / 2, -8, WORLD.sz / 2);
scene.add(sea);

/* ---------- ゲームの 状態 ---------- */
const g = {
  world: null, player: null,
  inv: new Array(BLOCK_COUNT).fill(0),
  sel: 0, yaw: 0, pitch: CAM.pitch0, time: DAY_LEN * 0.12,
  target: null, dirty: false, ready: false, paused: false,
  camDist: 4.8, lookUp: 1.4,
  norun: null, counters: { broke: 0, placed: 0, saves: 0 },
};

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
function setBlock(x, y, z, id) {
  if (!g.world.set(x, y, z, id)) return false;
  markDirty(x, z);
  g.dirty = true; saveSoon = Math.min(saveSoon, 2);
  return true;
}

/* ---------- ねらった ブロックの 光 ---------- */
const hl = new THREE.Group();
const hlFill = new THREE.Mesh(new THREE.BoxGeometry(1.012, 1.012, 1.012), new THREE.MeshBasicMaterial({ color: 0xfff27a, transparent: true, opacity: 0.25, depthWrite: false, fog: false }));
const hlLine = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.014, 1.014, 1.014)), new THREE.LineBasicMaterial({ color: 0xffffff, fog: false }));
hl.add(hlFill, hlLine); hl.visible = false; hl.renderOrder = 2; scene.add(hl);

/* ---------- のるんの かげ ---------- */
const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = 1; scene.add(shadow);

/* ---------- 画面の 部品 ---------- */
const els = { jump: $("btnJump"), brk: $("btnBreak"), put: $("btnPlace"), pad: $("pad"), knob: $("knob") };
const hotbarEl = $("hotbar");
const slots = [];
function buildHotbar() {
  hotbarEl.innerHTML = "";
  HOTBAR.forEach((id, i) => {
    const b = document.createElement("button");
    b.className = "slot"; b.dataset.i = i; b.setAttribute("aria-label", BLOCKS[id].name);
    b.appendChild(tileIcon(atlas, BLOCKS[id].icon));
    const n = document.createElement("span"); n.className = "num"; b.appendChild(n);
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); unlock(); selectSlot(i); });
    b.addEventListener("contextmenu", (e) => e.preventDefault());
    hotbarEl.appendChild(b);
    slots.push({ el: b, num: n, id });
  });
}
function refreshHotbar() {
  slots.forEach((s, i) => {
    const n = g.inv[s.id];
    s.num.textContent = n > 0 ? n : "";
    s.el.classList.toggle("empty", n <= 0);
    s.el.classList.toggle("sel", i === g.sel);
  });
  $("selName").textContent = BLOCKS[HOTBAR[g.sel]].name;
}
function selectSlot(i) {
  g.sel = ((i % HOTBAR.length) + HOTBAR.length) % HOTBAR.length;
  refreshHotbar(); g.dirty = true;
}
let toastT = 0;
function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 1600);
}

/* ---------- こわす・おく ---------- */
function breakBlock() {
  if (!g.ready || g.paused) return false;
  const t = g.target;
  if (!t) return false;
  const def = BLOCKS[t.id];
  if (!def.breakable) { toast("これは こわせないよ"); sfx.no(); return false; }
  setBlock(t.x, t.y, t.z, B.AIR);
  g.inv[t.id] = Math.min(INV_MAX, g.inv[t.id] + 1);   // こわした 素材を ひろう
  g.counters.broke++;
  sfx.break(); refreshHotbar(); updateTarget();
  return true;
}
function placeBlock() {
  if (!g.ready || g.paused) return false;
  const t = g.target;
  if (!t) return false;
  const id = HOTBAR[g.sel];
  if (g.inv[id] <= 0) { toast(BLOCKS[id].name + " が ないよ"); sfx.no(); return false; }
  const x = t.x + t.nx, y = t.y + t.ny, z = t.z + t.nz;      // ねらった 面の となり
  g.lastNo = "";
  if (!g.world.inside(x, y, z)) { g.lastNo = "outside"; toast("そこには おけないよ"); sfx.no(); return false; }
  const cur = g.world.get(x, y, z);
  if (cur !== B.AIR && cur !== B.WATER) { g.lastNo = "filled"; return false; }
  if (g.player.overlapsCell(x, y, z)) { g.lastNo = "norun"; toast("のるんが いるよ"); sfx.no(); return false; }   // のるんに めりこむ 所は だめ
  setBlock(x, y, z, id);
  g.inv[id]--;
  g.counters.placed++;
  sfx.place(); refreshHotbar(); updateTarget();
  return true;
}

/* ---------- 操作 ---------- */
let hintDone = false;
const input = new Input(canvas, els, {
  breakBlock, placeBlock,
  select: selectSlot,
  cycle: (d) => selectSlot(g.sel + d),
  gesture: () => unlock(),
  modeChanged: (touch) => document.body.classList.toggle("touch", touch),
});
document.body.classList.toggle("touch", input.touchMode);

/* ---------- カメラ ---------- */
const camTarget = new THREE.Vector3(), camPos = new THREE.Vector3(), tmpV = new THREE.Vector3();
const ray = new THREE.Raycaster();
let camY = 0;
function updateCamera(dt) {
  const p = g.player;
  g.pitch = Math.max(CAM.pitchMin, Math.min(CAM.pitchMax, g.pitch));
  // 注視点：のるんの 頭の 少し 上（照準が のるんに かくれない）
  const wantY = p.y + g.lookUp;
  camY += (wantY - camY) * Math.min(1, dt * 12);
  if (Math.abs(wantY - camY) > 3) camY = wantY;
  let ty = camY;
  if (g.world.solid(Math.floor(p.x), Math.floor(ty), Math.floor(p.z))) ty = p.y + p.h * 0.8;   // 天井が 低い 時
  camTarget.set(p.x, ty, p.z);
  const cp = Math.cos(g.pitch);
  const dx = Math.sin(g.yaw) * cp, dy = Math.sin(g.pitch), dz = Math.cos(g.yaw) * cp;
  // かべの 中に 入らない ように、ぶつかる 手前まで 寄せる
  let dist = g.camDist;
  for (let t = 0.2; t <= g.camDist + 0.3; t += 0.1) {
    const x = camTarget.x + dx * t, y = camTarget.y + dy * t, z = camTarget.z + dz * t;
    if (isTarget(g.world.get(Math.floor(x), Math.floor(y), Math.floor(z)))) { dist = Math.max(0.5, t - 0.3); break; }
  }
  camPos.set(camTarget.x + dx * dist, camTarget.y + dy * dist, camTarget.z + dz * dist);
  camera.position.copy(camPos);
  camera.lookAt(camTarget);
  camera.updateMatrixWorld();
}

/* ねらい：タッチは 画面の まんなか（照準）、マウスは カーソルの 先 */
const aim = new THREE.Vector2();
function updateTarget() {
  const p = g.player;
  if (input.touchMode || !input.mouse.inside) aim.set(0, 0); else aim.set(input.mouse.x, input.mouse.y);
  ray.setFromCamera(aim, camera);
  const o = ray.ray.origin, d = ray.ray.direction;
  const hit = raycast(g.world, o.x, o.y, o.z, d.x, d.y, d.z, g.camDist + PLAYER.reach + 2, isTarget);
  let ok = null;
  if (hit) {
    // とどく きょり：のるんの 体の まんなかから ブロックの いちばん 近い 所まで
    const cx = p.x, cy = p.y + p.h / 2, cz = p.z;
    const qx = Math.max(hit.x, Math.min(cx, hit.x + 1)), qy = Math.max(hit.y, Math.min(cy, hit.y + 1)), qz = Math.max(hit.z, Math.min(cz, hit.z + 1));
    if (Math.hypot(qx - cx, qy - cy, qz - cz) <= PLAYER.reach) ok = hit;
  }
  g.target = ok;
  hl.visible = !!ok;
  if (ok) hl.position.set(ok.x + 0.5, ok.y + 0.5, ok.z + 0.5);
}

/* ---------- 昼と 夜 ---------- */
const skyCol = new THREE.Color();
function updateSky() {
  const a = (g.time / DAY_LEN) * Math.PI * 2;          // 0＝朝
  const s = Math.sin(a);                                 // ＋が 昼、−が 夜
  const day = Math.max(0, Math.min(1, s * 2.2 + 0.5));   // 0＝夜 1＝昼
  skyCol.copy(SKY_NIGHT).lerp(SKY_DAY, day);
  const dusk = Math.max(0, 1 - Math.abs(s) * 4) * 0.45;
  skyCol.lerp(SKY_DUSK, dusk);
  scene.background.copy(skyCol); scene.fog.color.copy(skyCol);
  const br = 0.42 + 0.58 * day;                          // 夜でも まっくらには しない
  matSolid.color.setScalar(br); matWater.color.setScalar(br); sea.material.color.setRGB(0.87 * br, 0.95 * br, br);
  hemi.intensity = 0.9 + 1.3 * day; sun.intensity = 0.3 + 1.3 * day;
  sun.position.set(Math.cos(a) * 30, Math.abs(s) * 40 + 8, 18);
}

/* ---------- のるんの 動き（コードで つける ゆれ・のび ちぢみ） ---------- */
let walkPhase = 0, faceYaw = Math.PI, lean = 0;
function updateNorun(dt, now) {
  const n = g.norun, p = g.player;
  if (!n) return;
  n.group.position.set(p.x, p.y + p.stepVis, p.z);
  const sp = Math.hypot(p.vx, p.vz);
  if (sp > 0.4) {
    const want = Math.atan2(p.vx, p.vz);                 // 顔（+Z）を 進む 向きへ
    let d = want - faceYaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    faceYaw += d * Math.min(1, dt * 12);
  }
  n.group.rotation.y = faceYaw;
  const moving = sp > 0.4 && p.onGround;
  if (moving) walkPhase += dt * sp * 2.6;
  let sy = 1, hop = 0;
  if (!p.onGround && !p.inWater) sy = 1 + Math.max(-0.1, Math.min(0.16, p.vy * 0.018));   // ジャンプで のびる
  else if (moving) { hop = Math.abs(Math.sin(walkPhase)) * 0.09; sy = 1 + Math.sin(walkPhase * 2) * 0.05; }
  else sy = 1 + Math.sin(now * 0.0022) * 0.018;                                             // 息づかい
  sy -= p.landT * 0.24;                                                                     // 着地で ぺちゃん
  if (p.inWater) hop = Math.sin(now * 0.004) * 0.04;
  const sxz = 1 / Math.sqrt(sy);
  n.inner.scale.set(sxz, sy, sxz);
  n.inner.position.y = hop;
  lean += ((moving ? 0.13 : 0) - lean) * Math.min(1, dt * 10);
  n.inner.rotation.x = lean;

  // かげ：足もとの 下の 地面に
  let gy = Math.floor(p.y + 0.01);
  while (gy > 0 && !g.world.solid(Math.floor(p.x), gy - 1, Math.floor(p.z))) gy--;
  const hgt = p.y - gy;
  shadow.position.set(p.x, gy + 0.02, p.z);
  const k = Math.max(0.35, 1 - hgt * 0.18);
  shadow.scale.setScalar(k * p.w * 1.25);
  shadow.material.opacity = 0.3 * k;
}

/* ---------- 保存 ---------- */
let saveSoon = AUTOSAVE_SEC;
function saveNow(manual) {
  if (!g.ready) return false;
  const ok = Save.saveLocal(Save.pack(g));
  if (ok) { g.dirty = false; g.counters.saves++; }
  saveSoon = AUTOSAVE_SEC;
  if (manual) { toast(ok ? "ほぞん したよ" : "ほぞん できなかった…"); if (ok) sfx.save(); }
  return ok;
}
function applySave(d) {
  g.world = new World(d.seed);
  g.world.applyChanges(d.changes);
  g.inv.fill(0);
  for (const k of Object.keys(d.inv)) g.inv[+k] = d.inv[k];
  g.sel = Math.max(0, Math.min(HOTBAR.length - 1, d.sel | 0));
  g.time = Number.isFinite(d.time) ? d.time : 0;
  g.player.world = g.world;
  const pl = d.player || {};
  if (Number.isFinite(pl.x) && Number.isFinite(pl.y) && Number.isFinite(pl.z)) g.player.place({ x: Math.max(0.5, Math.min(WORLD.sx - 0.5, pl.x)), y: Math.max(0, Math.min(WORLD.sy + 4, pl.y)), z: Math.max(0.5, Math.min(WORLD.sz - 0.5, pl.z)) });
  else g.player.place(g.world.spawn());
  g.yaw = Number.isFinite(pl.yaw) ? pl.yaw : 0;
  g.pitch = Number.isFinite(pl.pitch) ? pl.pitch : CAM.pitch0;
  camY = g.player.y + g.lookUp;
  rebuildAll(); refreshHotbar();
}
function newWorld(seed) {
  g.world = new World(seed === undefined ? (Math.random() * 0xffffffff) >>> 0 : seed);
  g.inv.fill(0);
  for (const k of Object.keys(START_INV)) g.inv[+k] = START_INV[k];
  g.sel = 0; g.time = DAY_LEN * 0.12; g.yaw = 0; g.pitch = CAM.pitch0;
  g.player.world = g.world;
  g.player.place(g.world.spawn());
  camY = g.player.y + g.lookUp;
  rebuildAll(); refreshHotbar();
}

/* ---------- メニュー ---------- */
function openMenu(on) {
  g.paused = on; input.enabled = !on; if (on) input.releaseAll();
  $("menu").classList.toggle("show", on);
  $("codeBox").classList.remove("show");
  $("menuMsg").textContent = "";
}
$("btnMenu").addEventListener("click", () => openMenu(true));
$("mClose").addEventListener("click", () => openMenu(false));
$("mSave").addEventListener("click", () => { saveNow(true); $("menuMsg").textContent = "ほぞん したよ"; });
$("mExport").addEventListener("click", () => {
  saveNow(false);
  $("codeBox").classList.add("show");
  $("codeText").value = Save.toCode(Save.pack(g));
  $("codeText").readOnly = true; $("codeDo").textContent = "コピー"; $("codeDo").dataset.mode = "copy";
  $("menuMsg").textContent = "この コードを わたすと、おなじ せかいで あそべるよ";
});
$("mImport").addEventListener("click", () => {
  $("codeBox").classList.add("show");
  $("codeText").value = ""; $("codeText").readOnly = false;
  $("codeDo").textContent = "よみこむ"; $("codeDo").dataset.mode = "load";
  $("menuMsg").textContent = "コードを はりつけてね（いまの せかいは うわがき されるよ）";
});
$("codeDo").addEventListener("click", async () => {
  if ($("codeDo").dataset.mode === "copy") {
    try { await navigator.clipboard.writeText($("codeText").value); $("menuMsg").textContent = "コピー したよ"; }
    catch (e) { $("codeText").select(); $("menuMsg").textContent = "えらんだ 文字を コピー してね"; }
    return;
  }
  try {
    const d = Save.fromCode($("codeText").value);
    applySave(d); saveNow(false); openMenu(false); toast("よみこんだよ");
  } catch (e) { $("menuMsg").textContent = e.message; }
});
let resetArm = 0;
$("mReset").addEventListener("click", () => {
  if (Date.now() - resetArm > 4000) { resetArm = Date.now(); $("menuMsg").textContent = "ほんとうに さいしょから？ もういちど おすと あたらしい せかいに なるよ"; return; }
  resetArm = 0; newWorld(); saveNow(false); openMenu(false); toast("あたらしい せかい！");
});

/* ---------- 画面の 大きさ ---------- */
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < h ? 72 : 60;        // 縦画面は 広めに
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
addEventListener("orientationchange", () => setTimeout(resize, 200));

/* ---------- 毎コマ ---------- */
let last = performance.now(), fpsN = 0, fpsT = 0, fps = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000); last = now;
  fpsN++; fpsT += dt; if (fpsT >= 1) { fps = fpsN / fpsT; fpsN = 0; fpsT = 0; }
  if (!g.ready) return;

  if (!g.paused) {
    const lk = input.takeLook();
    g.yaw -= lk.dx * CAM.sens;
    g.pitch += lk.dy * CAM.sens;
    const mv = input.moveVec();
    // カメラの 向きを 基準に：パッドの 上＝おく（カメラから 遠ざかる 向き）
    const fx = -Math.sin(g.yaw), fz = -Math.cos(g.yaw), rx = Math.cos(g.yaw), rz = -Math.sin(g.yaw);
    const wx = fx * -mv.y + rx * mv.x, wz = fz * -mv.y + rz * mv.x;
    const steps = Math.max(1, Math.ceil(dt / 0.017));
    for (let i = 0; i < steps; i++) {
      g.player.update(dt / steps, wx, wz, input.jump);
      if (g.player.jumped) sfx.jump();
    }
    if (g.player.y < -20) g.player.place(g.world.spawn());
    if (!hintDone && (mv.x || mv.y)) { hintDone = true; $("hint").classList.add("hide"); }
    g.time = (g.time + dt) % DAY_LEN;
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
async function boot() {
  buildHotbar();
  g.player = new Player(null);
  const norun = await loadNorun();
  g.norun = norun;
  scene.add(norun.group);
  // モデルの 実寸から 当たり判定と カメラを 決める
  g.player.setSize(norun.size.hitW, norun.size.hitH);
  g.lookUp = norun.size.hitH + 0.55;
  g.camDist = 3.0 + norun.size.hitH * 2.0;

  const saved = Save.loadLocal();
  // ?debug&seed=数字 で 検証用に 地形を 固定できる
  const fixSeed = DEBUG ? Number(new URLSearchParams(location.search).get("seed")) : 0;
  if (saved) applySave(saved); else newWorld(fixSeed || undefined);
  resize();
  g.ready = true;
  $("loading").classList.add("hide");
  document.body.dataset.ready = "1";
}

addEventListener("pagehide", () => saveNow(false));
document.addEventListener("visibilitychange", () => { if (document.hidden) saveNow(false); });

/* 検証用の のぞき穴（?debug の 時だけ）。ボットは ここから 状態を 読むだけで、操作は 画面を さわって 行う */
if (DEBUG) {
  window.__nc = {
    g, input, errors, VERSION,
    state: () => ({
      ready: g.ready,
      pos: { x: g.player.x, y: g.player.y, z: g.player.z }, onGround: g.player.onGround,
      yaw: g.yaw, pitch: g.pitch, sel: g.sel, inv: g.inv.slice(),
      target: g.target && { x: g.target.x, y: g.target.y, z: g.target.z, nx: g.target.nx, ny: g.target.ny, nz: g.target.nz, id: g.target.id },
      hash: g.world.hash(), changes: g.world.changes.size, seed: g.world.seed,
      counters: { ...g.counters }, fps, touch: input.touchMode, padShown: els.pad.classList.contains("show"),
      norun: g.norun && { source: g.norun.source, size: g.norun.size }, camDist: g.camDist,
      hitbox: { w: g.player.w, h: g.player.h }, errors: errors.slice(),
      highlight: hl.visible, inWater: g.player.inWater, lastNo: g.lastNo || "", vy: g.player.vy,
      head: g.world.get(Math.floor(g.player.x), Math.floor(g.player.y + g.player.h + 0.6), Math.floor(g.player.z)),
    }),
    block: (x, y, z) => g.world.get(x, y, z),
    code: () => Save.toCode(Save.pack(g)),
    setTime: (t) => { g.time = t; },
    /* いま 画面に 出て いる 色の 数（まっ白・まっ黒で ない ことの 確認） */
    colors: () => {
      renderer.render(scene, camera);
      const t = document.createElement("canvas"); t.width = t.height = 64;
      const x = t.getContext("2d"); x.drawImage(canvas, 0, 0, 64, 64);
      const d = x.getImageData(0, 0, 64, 64).data; const set = new Set();
      for (let i = 0; i < d.length; i += 4) set.add((d[i] >> 4) + "," + (d[i + 1] >> 4) + "," + (d[i + 2] >> 4));
      return set.size;
    },
  };
}

boot().catch((e) => { errors.push(String(e)); console.error(e); $("loading").textContent = "よみこみに しっぱい しました"; });
requestAnimationFrame(frame);
