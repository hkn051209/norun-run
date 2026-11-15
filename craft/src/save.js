/* =========================================================
   セーブ（スロット4つ・localStorage）と、書き出し・読みこみコード
   形式は DESIGN.md の「保存形式（v3）」を 見てください。
   世界は「seed ＋ 変えた ブロックだけ」を 保存する（世界ぜんたいは 保存しない）。
   ========================================================= */
import { WORLD, PLAYER, SLOTS, SLOT_KEY, NAMES_KEY, CODE_PREFIX } from "./config.js";
import { BLOCKS, B } from "./blocks.js";
import { ITEMS, INV_N, HOTBAR_N, TOOL_KEYS, TIER_MAX } from "./items.js";
import { COLOR_INDEX, START_COLORS } from "./colors.js";

export const ART_MAX = 3;
const PNG = "data:image/png;base64,";
const ART_LIMIT = 300000;

export const emptyArt = () => ({ weapons: [null, null, null], pets: [null, null, null], tools: { pick: null, axe: null, shovel: null, rod: null } });
export const defaultName = (i) => "データ" + (i + 1);
export const DEFAULT_PLAYER = "のるん";
export const cleanName = (s, max = 12) => String(s || "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, max);

/* ゲームの 状態 → セーブデータ */
export function pack(g) {
  const r2 = (v) => Math.round(v * 100) / 100;
  return {
    app: "norun-craft", v: 3,
    name: g.name,                                  // スロットの 名前
    playerName: g.playerName,                      // 遊ぶ 人の 名前（頭の 上に 出る）
    size: [WORLD.sx, WORLD.sy, WORLD.sz],
    seed: g.world.seed,
    changes: g.world.changesArray(),
    inv: g.inv.map((s) => (s ? [s.id, s.n] : 0)),  // 36マス（0〜8 が ホットバー）
    sel: g.sel,                                    // えらんで いる ホットバーの 枠（0〜8）
    tools: { ...g.tools },
    held: g.held,
    colors: g.colors.slice(),
    colorSel: g.colorSelKey,
    hatColor: g.hatColor,                          // 帽子の 色（色の key。null＝もとの 色）
    art: g.art,
    equip: { ...g.equip },
    mode: g.mode,                                  // "survival" / "creative"
    view: g.view,                                  // "third" / "first"
    hp: g.hp, hunger: r2(g.hunger), xp: g.xp, level: g.level,
    respawn: g.respawn ? { x: r2(g.respawn.x), y: r2(g.respawn.y), z: r2(g.respawn.z) } : null,
    enemiesOn: g.enemiesOn,
    player: { x: r2(g.player.x), y: r2(g.player.y), z: r2(g.player.z), yaw: r2(g.yaw), pitch: r2(g.pitch) },
    time: Math.round(g.time),
    savedAt: Date.now(),
  };
}

const okArt = (a) => (a && typeof a.img === "string" && a.img.startsWith(PNG) && a.img.length < ART_LIMIT ? { img: a.img, area: Math.max(0, Math.min(1, +a.area || 0)) } : null);
const okItem = (id) => (!!ITEMS[id] || (!!BLOCKS[id] && id <= B.COLOR && id !== B.WATER && id !== B.ROCK));

/* 読みこんだ データが 正しい 形か しらべて、足りない 所を おぎなう。だめなら 理由を 投げる */
export function check(d) {
  if (!d || d.app !== "norun-craft") throw new Error("のるんクラフトの データでは ないよ");
  if (d.v !== 3) throw new Error("この 版の データは よめないよ");
  const s = d.size;
  if (!Array.isArray(s) || s[0] !== WORLD.sx || s[1] !== WORLD.sy || s[2] !== WORLD.sz) throw new Error("世界の 大きさが ちがうよ");
  if (!Number.isFinite(d.seed)) throw new Error("seed が ないよ");
  if (!Array.isArray(d.changes) || d.changes.length % 2) throw new Error("changes が こわれて いるよ");
  // 持ち物は 保存の 形（[番号, 数] か 0）の まま 返す。しらべた データを そのまま 保存・コードに しても 形が 変わらない ように
  const inv = [];
  for (let i = 0; i < INV_N; i++) {
    const v = Array.isArray(d.inv) ? d.inv[i] : 0;
    const id = Array.isArray(v) ? v[0] | 0 : 0, n = Array.isArray(v) ? Math.floor(+v[1]) : 0;
    inv.push(id && okItem(id) && n > 0 ? [id, Math.min(PLAYER.stack, n)] : 0);
  }
  const tools = {};
  for (const k of TOOL_KEYS) tools[k] = Math.max(0, Math.min(k === "rod" ? 1 : TIER_MAX, (d.tools && d.tools[k]) | 0));
  const colors = START_COLORS.slice();
  for (const k of Array.isArray(d.colors) ? d.colors : []) if (k in COLOR_INDEX && !colors.includes(k)) colors.push(k);
  const creative = d.mode === "creative";
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
  const num = (v, lo, hi, def) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : def);
  const usable = (k) => k in COLOR_INDEX && (creative || colors.includes(k));
  return {
    ...d, inv, tools, colors, art, equip, held,
    name: cleanName(d.name),
    playerName: cleanName(d.playerName, 10) || DEFAULT_PLAYER,
    sel: num(d.sel | 0, 0, HOTBAR_N - 1, 0),
    colorSel: usable(d.colorSel) ? d.colorSel : colors[0],
    hatColor: usable(d.hatColor) ? d.hatColor : null,
    mode: creative ? "creative" : "survival",
    view: d.view === "first" ? "first" : "third",
    hp: Math.round(num(d.hp, 1, PLAYER.hpMax, PLAYER.hpMax)),
    hunger: num(d.hunger, 0, PLAYER.hungerMax, PLAYER.hungerMax),
    xp: Math.round(num(d.xp, 0, 1e6, 0)), level: Math.round(num(d.level, 0, 9999, 0)),
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
  for (let i = 0; i < SLOTS; i++) out.push(cleanName(arr[i]) || defaultName(i));
  return out;
}
export function setName(i, name) {
  const names = getNames();
  names[i] = cleanName(name) || defaultName(i);
  try { localStorage.setItem(NAMES_KEY, JSON.stringify(names)); } catch (e) { /* 何も しない */ }
  return names[i];
}
/* タイトル用：4つの スロットの ようす */
export function slotList() {
  const names = getNames();
  const out = [];
  for (let i = 0; i < SLOTS; i++) {
    const d = loadSlot(i);
    out.push({ i, name: names[i], exists: !!d, savedAt: d ? d.savedAt : 0, colors: d ? d.colors.length : 0, playerName: d ? d.playerName : DEFAULT_PLAYER, mode: d ? d.mode : "survival", level: d ? d.level : 0 });
  }
  return out;
}

/* ---- 書き出しコード： "NORUNCRAFT3." ＋ セーブデータ(JSON)を base64url に した もの ---- */
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
