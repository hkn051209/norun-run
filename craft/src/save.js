/* =========================================================
   セーブ（スロット4つ・localStorage）と、書き出し・読みこみコード
   形式は DESIGN.md の「保存形式（v2）」を 見てください。
   ========================================================= */
import { WORLD, PLAYER, SLOTS, SLOT_KEY, NAMES_KEY, CODE_PREFIX } from "./config.js";
import { BLOCKS } from "./blocks.js";
import { ITEM_COUNT, INV_MAX, ITEMS, TOOL_KEYS } from "./items.js";
import { COLORS, COLOR_INDEX, START_COLORS } from "./colors.js";

export const ART_MAX = 3;                       // 武器・ペットの 絵の 枠
const PNG = "data:image/png;base64,";
const ART_LIMIT = 300000;                       // 絵 1まいの 文字数の 上限

export const emptyArt = () => ({ weapons: [null, null, null], pets: [null, null, null], tools: { pick: null, axe: null, shovel: null, rod: null } });
export const defaultName = (i) => "データ" + (i + 1);

/* ゲームの 状態 → セーブデータ */
export function pack(g) {
  const inv = {};
  for (let id = 1; id < ITEM_COUNT; id++) if (g.inv[id] > 0) inv[id] = g.inv[id];
  const r2 = (v) => Math.round(v * 100) / 100;
  return {
    app: "norun-craft", v: 2,
    name: g.name,
    size: [WORLD.sx, WORLD.sy, WORLD.sz],
    seed: g.world.seed,
    changes: g.world.changesArray(),
    inv,
    sel: g.sel,                                   // えらんで いる 持ち物の 番号
    tools: { ...g.tools },
    held: g.held,
    colors: g.colors.slice(),
    colorSel: COLORS[g.colorSel].key,
    art: g.art,
    equip: { ...g.equip },
    hp: g.hp,
    respawn: g.respawn ? { x: r2(g.respawn.x), y: r2(g.respawn.y), z: r2(g.respawn.z) } : null,
    enemiesOn: g.enemiesOn,
    player: { x: r2(g.player.x), y: r2(g.player.y), z: r2(g.player.z), yaw: r2(g.yaw), pitch: r2(g.pitch) },
    time: Math.round(g.time),
    savedAt: Date.now(),
  };
}

const okArt = (a) => (a && typeof a.img === "string" && a.img.startsWith(PNG) && a.img.length < ART_LIMIT ? { img: a.img, area: Math.max(0, Math.min(1, +a.area || 0)) } : null);

/* 読みこんだ データが 正しい 形か しらべて、足りない 所を おぎなう。だめなら 理由を 投げる */
export function check(d) {
  if (!d || d.app !== "norun-craft") throw new Error("のるんクラフトの データでは ないよ");
  if (d.v !== 2) throw new Error("この 版の データは よめないよ");
  const s = d.size;
  if (!Array.isArray(s) || s[0] !== WORLD.sx || s[1] !== WORLD.sy || s[2] !== WORLD.sz) throw new Error("世界の 大きさが ちがうよ");
  if (!Number.isFinite(d.seed)) throw new Error("seed が ないよ");
  if (!Array.isArray(d.changes) || d.changes.length % 2) throw new Error("changes が こわれて いるよ");
  const inv = {};
  for (const k of Object.keys(d.inv || {})) {
    const id = +k, n = Math.floor(+d.inv[k]);
    if (id >= 1 && id < ITEM_COUNT && (BLOCKS[id] || ITEMS[id]) && n > 0) inv[id] = Math.min(INV_MAX, n);
  }
  const tools = {};
  for (const k of TOOL_KEYS) tools[k] = Math.max(0, Math.min(k === "rod" ? 1 : 2, (d.tools && d.tools[k]) | 0));
  const colors = START_COLORS.slice();
  for (const k of Array.isArray(d.colors) ? d.colors : []) if (k in COLOR_INDEX && !colors.includes(k)) colors.push(k);
  const a = d.art || {};
  const art = emptyArt();
  for (let i = 0; i < ART_MAX; i++) { art.weapons[i] = okArt(a.weapons && a.weapons[i]); art.pets[i] = okArt(a.pets && a.pets[i]); }
  for (const k of TOOL_KEYS) art.tools[k] = okArt(a.tools && a.tools[k]);
  const eq = d.equip || {};
  const slot = (v, list) => (Number.isInteger(v) && v >= 0 && v < ART_MAX && list[v] ? v : -1);
  const equip = { weapon: slot(eq.weapon, art.weapons), pet: slot(eq.pet, art.pets) };
  let held = d.held;
  if (held === "weapon") { if (equip.weapon < 0) held = "hand"; }
  else if (!(TOOL_KEYS.includes(held) && tools[held] > 0)) held = "hand";
  const rs = d.respawn;
  return {
    ...d, inv, tools, colors, art, equip, held,
    name: typeof d.name === "string" && d.name.trim() ? d.name.trim().slice(0, 12) : "",
    colorSel: colors.includes(d.colorSel) ? d.colorSel : colors[0],
    hp: Math.max(1, Math.min(PLAYER.hpMax, Number.isFinite(d.hp) ? Math.round(d.hp) : PLAYER.hpMax)),
    respawn: rs && [rs.x, rs.y, rs.z].every(Number.isFinite) ? { x: rs.x, y: rs.y, z: rs.z } : null,
    enemiesOn: d.enemiesOn !== false,
  };
}

/* ---- スロット ---- */
export function saveSlot(i, data) {
  try { localStorage.setItem(SLOT_KEY(i), JSON.stringify(data)); return true; }
  catch (e) { console.warn("save failed", e); return false; }
}
export function loadSlot(i) {
  try {
    const s = localStorage.getItem(SLOT_KEY(i));
    return s ? check(JSON.parse(s)) : null;
  } catch (e) { console.warn("load failed", e); return null; }
}
export function deleteSlot(i) { try { localStorage.removeItem(SLOT_KEY(i)); } catch (e) { /* 何も しない */ } }

/* スロットの 名前（データが 無い スロットにも 付けられる ように、別に 持つ） */
export function getNames() {
  let arr = [];
  try { arr = JSON.parse(localStorage.getItem(NAMES_KEY) || "[]"); } catch (e) { arr = []; }
  const out = [];
  for (let i = 0; i < SLOTS; i++) out.push(typeof arr[i] === "string" && arr[i].trim() ? arr[i].trim().slice(0, 12) : defaultName(i));
  return out;
}
export function setName(i, name) {
  const names = getNames();
  names[i] = String(name || "").trim().slice(0, 12) || defaultName(i);
  try { localStorage.setItem(NAMES_KEY, JSON.stringify(names)); } catch (e) { /* 何も しない */ }
  return names[i];
}
/* タイトル用：4つの スロットの ようす */
export function slotList() {
  const names = getNames();
  const out = [];
  for (let i = 0; i < SLOTS; i++) {
    const d = loadSlot(i);
    out.push({ i, name: names[i], exists: !!d, savedAt: d ? d.savedAt : 0, colors: d ? d.colors.length : 0 });
  }
  return out;
}

/* ---- 書き出しコード： "NORUNCRAFT2." ＋ セーブデータ(JSON)を base64url に した もの ---- */
export function toCode(data) {
  const json = JSON.stringify(data);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return CODE_PREFIX + b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function fromCode(text) {
  const s = String(text || "").replace(/\s+/g, "");
  if (!s.startsWith(CODE_PREFIX)) throw new Error("コードの はじめが ちがうよ");
  let b64 = s.slice(CODE_PREFIX.length).replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  let data;
  try { data = JSON.parse(decodeURIComponent(escape(atob(b64)))); }
  catch (e) { throw new Error("コードが こわれて いるよ"); }
  return check(data);
}
