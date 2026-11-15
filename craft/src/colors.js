/* =========================================================
   色の 一覧（16色。名前は ひらがなの 自作名）
   - 順番（番号）は セーブと「いろブロック」の 番号に 入るので、あとから 変えない（足す 時は 後ろに）
   - start：さいしょから 使える／from：どこで 見つかるか
       red・blue・yellow・green＝その 色の モンスターを たおす
       flower＝おはなを つむ／fish＝つり
   ========================================================= */
export const COLORS = [
  { key: "shiro", name: "ゆきしろ", hex: "#ffffff", start: true },
  { key: "kuro", name: "よるくろ", hex: "#2b2b33", start: true },
  { key: "aka", name: "いちごあか", hex: "#e8413c", start: true },
  { key: "ao", name: "うみあお", hex: "#2f6fe0", start: true },
  { key: "ki", name: "ひよこきいろ", hex: "#ffd93b", start: true },
  { key: "midori", name: "はっぱみどり", hex: "#3fae4a", from: "green" },
  { key: "kimidori", name: "わかばきみどり", hex: "#a4dc4c", from: "green" },
  { key: "daidai", name: "みかんだいだい", hex: "#ff9330", from: "red" },
  { key: "beni", name: "りんごべに", hex: "#b3243e", from: "red" },
  { key: "kon", name: "よぞらこん", hex: "#27357e", from: "blue" },
  { key: "murasaki", name: "ぶどうむらさき", hex: "#8a4fc9", from: "blue" },
  { key: "cream", name: "ぷりんいろ", hex: "#ffeeb0", from: "yellow" },
  { key: "cha", name: "くりちゃいろ", hex: "#8d5a35", from: "yellow" },
  { key: "momo", name: "さくらもも", hex: "#ff9ec4", from: "flower" },
  { key: "hai", name: "くもりはい", hex: "#9aa0a8", from: "flower" },
  { key: "mizu", name: "そらみずいろ", hex: "#7fd4f5", from: "fish" },
];
export const COLOR_INDEX = Object.fromEntries(COLORS.map((c, i) => [c.key, i]));
export const START_COLORS = COLORS.filter((c) => c.start).map((c) => c.key);

/* 色モンスター（自作。色ごとに 1種） */
export const MONSTERS = [
  { type: "red", name: "あかぷに", hex: "#ee5a50" },
  { type: "blue", name: "あおぷに", hex: "#4a86ea" },
  { type: "yellow", name: "きいろぷに", hex: "#f7cf3a" },
  { type: "green", name: "みどりぷに", hex: "#57bd5c" },
];

/* その 出どころから 次に 見つかる 色（まだ 持って いない 物）。なければ null
   つり（fish）は そらみずいろの あと、あおぷにの 色も 出る */
export function nextColor(source, have) {
  const order = source === "fish" ? ["fish", "blue"] : [source];
  for (const src of order) {
    const c = COLORS.find((c) => c.from === src && !have.includes(c.key));
    if (c) return c;
  }
  return null;
}
