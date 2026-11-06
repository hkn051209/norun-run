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
    review: [],              // [{ key, q, streak }]
    defeated: 0,             // 復習で「やっつけた」数
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
  return { ...base, ...d, kinder: { ...base.kinder, ...(d.kinder || {}) } };
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

/* ---------- バックアップ ---------- */
export function exportAll() {
  const out = { app: "norun-manabi", version: 1, exported: new Date().toISOString(), profiles: listProfiles(), data: {} };
  for (const p of out.profiles) out.data[p.id] = loadData(p.id);
  out.parent = getParentPin();
  return out;
}

export function importAll(obj) {
  if (!obj || obj.app !== "norun-manabi" || !Array.isArray(obj.profiles)) throw new Error("のるんまなびの バックアップでは ありません");
  // いまのデータを消してから 読みこむ（まるごと入れかえ）
  for (const p of listProfiles()) remove(kData(p.id));
  saveProfiles(obj.profiles);
  for (const p of obj.profiles) write(kData(p.id), { ...newData(), ...(obj.data && obj.data[p.id] || {}) });
  if (obj.parent) setParentPin(obj.parent);
}
