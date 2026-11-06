import { DEFAULT_KANJI } from "./kokugo-data.js";
/* =========================================================
   保存（端末内の localStorage だけ。外には送らない）
   - プロフィールの一覧： norunmanabi.v1.profiles  [{ id, name, grade, face }]
   - 1人ぶんのデータ  ： norunmanabi.v1.p.<id>    （人ごとに 完全に別のキー）
   - 保護者の暗証番号  ： norunmanabi.v1.parent
   子どもの画面からは、データを消す・学年を変える関数を呼ばない（保護者画面だけが使う）
   ========================================================= */
const PREFIX = "norunmanabi.v1.";
const K_PROFILES = PREFIX + "profiles";
const K_PARENT = PREFIX + "parent";
const K_KANJI = PREFIX + "kanji";        // 保護者が編集した 漢字の出題データ（なければ 最初のデータを使う）
const kData = (id) => PREFIX + "p." + id;

function read(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
function remove(key) {
  try { localStorage.removeItem(key); } catch {}
}

// 端末に「消さないで」とお願いする（対応しているブラウザだけ）
export function askPersist() {
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch {}
}

/* ---------- プロフィール ---------- */
export function listProfiles() {
  const l = read(K_PROFILES, []);
  return Array.isArray(l) ? l.filter((p) => p && p.id) : [];
}
function saveProfiles(list) { write(K_PROFILES, list); }

export function newData() {
  return {
    pass: null,              // 合言葉：絵のIDを3つ（並びは関係なし）
    points: 0,               // ためたポイント
    spent: 0,                // 使ったポイント
    totalCorrect: 0, totalAnswered: 0, bestStreak: 0,
    hats: ["default"], hat: "default",
    kuku: {},                // "3x4": { lv: 0〜2, streak, c, w }  lv 1=正解したことがある 2=おぼえた
    kinder: { correct1: 0, correct2: 0 },   // 年長コース：レベルごとの正解数
    kokugo: { kana: 0, kanji: 0, upto: {} },   // 国語コース：正解数 / upto: 学年ごとの「ならった ところまで」（配当漢字の数）
    review: [],              // [{ key, q, streak }]
    defeated: 0,             // 復習で「やっつけた」数
    play: { run: { best: 0, last: 0, plays: 0, total: 0 }, tower: { best: 0, last: 0, plays: 0 } },   // 遊びモードの記録（m）
    badges: [],              // もらった バッジの id
    days: {},                // "2026-11-06": 正解数
  };
}

export function createProfile(name, grade, face) {
  const id = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const list = listProfiles();
  list.push({ id, name: String(name).trim().slice(0, 10), grade, face });
  saveProfiles(list);
  write(kData(id), newData());
  return id;
}

export function updateProfile(id, patch) {   // 保護者画面から（名前・学年・アイコン）
  saveProfiles(listProfiles().map((p) => (p.id === id ? { ...p, ...patch } : p)));
}

export function deleteProfile(id) {          // 保護者画面から
  saveProfiles(listProfiles().filter((p) => p.id !== id));
  remove(kData(id));
}

export function loadData(id) {
  const d = read(kData(id), null);
  const base = newData();
  if (!d || typeof d !== "object") return base;
  return { ...base, ...d, kinder: { ...base.kinder, ...(d.kinder || {}) }, kokugo: { ...base.kokugo, ...(d.kokugo || {}) },
    play: { run: { ...base.play.run, ...((d.play || {}).run || {}) }, tower: { ...base.play.tower, ...((d.play || {}).tower || {}) } } };
}

export function saveData(id, data) {
  return write(kData(id), data);
}

export function resetPass(id) {               // 保護者画面から：合言葉を忘れた時
  const d = loadData(id);
  d.pass = null;
  saveData(id, d);
}

/* ---------- 保護者の暗証番号（4けた） ---------- */
export const getParentPin = () => read(K_PARENT, null);
export const setParentPin = (pin) => write(K_PARENT, String(pin));

/* ---------- 漢字の出題データ（保護者画面で 表として編集） ----------
   1行 = { g:学年, k:配当漢字, w:ことば, y:よみ, o:送り仮名（熟語は ""） } */
const clean = (r) => ({ g: Number(r.g) || 0, k: String(r.k || "").trim(), w: String(r.w || "").trim(), y: String(r.y || "").trim(), o: String(r.o || "").trim() });
export function getKanji() {
  const v = read(K_KANJI, null);
  return Array.isArray(v) ? v.map(clean) : DEFAULT_KANJI.map((r) => ({ ...r }));
}
export const isKanjiCustom = () => Array.isArray(read(K_KANJI, null));
export function setKanji(rows) { return write(K_KANJI, rows.map(clean)); }
export function resetKanji() { remove(K_KANJI); }
const HIRA_RE = /^[\u3041-\u3096\u30fc]+$/;
/* 1行の チェック。問題がなければ ""、あれば 理由 */
export function checkKanjiRow(r) {
  if (!(r.g >= 1 && r.g <= 6)) return "学年は 1〜6";
  if (!r.w) return "ことばが 空です";
  if (!r.y || !HIRA_RE.test(r.y)) return "よみは ひらがなで";
  if (r.k && !r.w.includes(r.k)) return "配当漢字が ことばに入っていません";
  if (r.o) {
    if (!HIRA_RE.test(r.o)) return "送り仮名は ひらがなで";
    if (!r.w.endsWith(r.o) || !r.y.endsWith(r.o)) return "送り仮名は ことば・よみの 最後と同じに";
    if (r.w.length <= r.o.length) return "ことばに 漢字がありません";
  }
  if (r.w.length > 6 || r.y.length > 8) return "長すぎます（ことば6字・よみ8字まで）";
  return "";
}

/* ---------- バックアップ ---------- */
export function exportAll() {
  const out = { app: "norun-manabi", version: 1, exported: new Date().toISOString(), profiles: listProfiles(), data: {} };
  for (const p of out.profiles) out.data[p.id] = loadData(p.id);
  out.parent = getParentPin();
  if (isKanjiCustom()) out.kanji = getKanji();
  return out;
}

export function importAll(obj) {
  if (!obj || obj.app !== "norun-manabi" || !Array.isArray(obj.profiles)) throw new Error("のるんまなびの バックアップでは ありません");
  // いまのデータを消してから 読みこむ（まるごと入れかえ）
  for (const p of listProfiles()) remove(kData(p.id));
  saveProfiles(obj.profiles);
  for (const p of obj.profiles) write(kData(p.id), { ...newData(), ...(obj.data && obj.data[p.id] || {}) });
  if (obj.parent) setParentPin(obj.parent);
  if (Array.isArray(obj.kanji)) setKanji(obj.kanji); else resetKanji();
}
