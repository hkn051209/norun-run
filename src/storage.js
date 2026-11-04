/* =========================================================
   プレイヤーデータ（端末内の localStorage のみ。外部には送らない）
   名前ごとに完全に別のキーで保存する： norunrun.v1.player.<名前>
   ========================================================= */
const PREFIX = "norunrun.v1.";
const K_LIST = PREFIX + "players";
const K_LAST = PREFIX + "last";
const kPlayer = (name) => PREFIX + "player." + encodeURIComponent(name);

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

export function newPlayerData(name) {
  return {
    name,
    created: Date.now(),
    difficulty: "easy",
    cleared: [],          // クリアしたステージID
    forms: ["norun"],     // 図鑑に登録された変身
    form: "norun",        // さいごに選んだ変身
    hats: ["default"],    // 集めた帽子の色（小物のごほうび）
    hat: "default",       // いまの帽子の色
    danCleared: { order: [], random: [] },   // かけざんモードでクリアした段
    bestEndless: 0,       // エンドレスの さいこう記録（m）
    bgm: true,
  };
}

export function cleanName(raw) {
  return String(raw || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 10);
}

export function listPlayers() {
  const list = read(K_LIST, []);
  return Array.isArray(list) ? list.filter((n) => typeof n === "string") : [];
}

export function createPlayer(rawName) {
  const name = cleanName(rawName);
  if (!name) return { ok: false, reason: "empty" };
  const list = listPlayers();
  if (list.includes(name)) return { ok: false, reason: "exists" };
  list.push(name);
  write(K_LIST, list);
  write(kPlayer(name), newPlayerData(name));
  return { ok: true, name };
}

export function loadPlayer(name) {
  const base = newPlayerData(name);
  const d = read(kPlayer(name), null);
  if (!d || typeof d !== "object") return base;
  // 項目が増えても古いデータで動くように、足りない項目は初期値で補う
  return { ...base, ...d, name };
}

export function savePlayer(data) {
  return write(kPlayer(data.name), data);
}

export function deletePlayer(name) {
  write(K_LIST, listPlayers().filter((n) => n !== name));
  remove(kPlayer(name));
  if (read(K_LAST, null) === name) remove(K_LAST);
}

export const getLast = () => read(K_LAST, null);
export const setLast = (name) => write(K_LAST, name);
