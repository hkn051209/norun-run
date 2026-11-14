/* =========================================================
   セーブ（localStorage）と、書き出し・読みこみコード
   形式は DESIGN.md の「保存形式」を 見てください。
   ========================================================= */
import { WORLD, SAVE_KEY, CODE_PREFIX } from "./config.js";
import { BLOCK_COUNT, INV_MAX } from "./blocks.js";

/* ゲームの 状態 → セーブデータ */
export function pack(g) {
  const inv = {};
  for (let id = 1; id < BLOCK_COUNT; id++) if (g.inv[id] > 0) inv[id] = g.inv[id];
  const r2 = (v) => Math.round(v * 100) / 100;
  return {
    app: "norun-craft", v: 1,
    size: [WORLD.sx, WORLD.sy, WORLD.sz],
    seed: g.world.seed,
    changes: g.world.changesArray(),
    inv,
    sel: g.sel,
    player: { x: r2(g.player.x), y: r2(g.player.y), z: r2(g.player.z), yaw: r2(g.yaw), pitch: r2(g.pitch) },
    time: Math.round(g.time),
    savedAt: Date.now(),
  };
}

/* 読みこんだ データが 正しい 形か しらべる。だめなら 理由を 投げる */
export function check(d) {
  if (!d || d.app !== "norun-craft") throw new Error("のるんクラフトの データでは ないよ");
  if (d.v !== 1) throw new Error("あたらしい 版の データは よめないよ");
  const s = d.size;
  if (!Array.isArray(s) || s[0] !== WORLD.sx || s[1] !== WORLD.sy || s[2] !== WORLD.sz) throw new Error("世界の 大きさが ちがうよ");
  if (!Number.isFinite(d.seed)) throw new Error("seed が ないよ");
  if (!Array.isArray(d.changes) || d.changes.length % 2) throw new Error("changes が こわれて いるよ");
  const inv = {};
  for (const k of Object.keys(d.inv || {})) {
    const id = +k, n = Math.floor(+d.inv[k]);
    if (id >= 1 && id < BLOCK_COUNT && n > 0) inv[id] = Math.min(INV_MAX, n);
  }
  return { ...d, inv };
}

export function saveLocal(data) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); return true; }
  catch (e) { console.warn("save failed", e); return false; }
}
export function loadLocal() {
  try {
    const s = localStorage.getItem(SAVE_KEY);
    return s ? check(JSON.parse(s)) : null;
  } catch (e) { console.warn("load failed", e); return null; }
}
export function clearLocal() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 何も しない */ } }

/* 書き出しコード： "NORUNCRAFT1." ＋ セーブデータ(JSON)を base64url に した もの */
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
