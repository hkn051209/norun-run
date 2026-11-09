/* =========================================================
   算数の問題づくり
   - 年長：ドットで数えられる たしざん（5まで → 10まで）
   - 九九：段ごと（じゅんばん／ランダム）
   - 復習：その子の まちがえリストから
   問題のかたち：{ key, kind, a, b, op, ans, text, speech, dots }
   ========================================================= */
import { HIRAGANA, KATAKANA, HIRA_LOOKALIKE, KATA_LOOKALIKE } from "./kokugo-data.js";
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = randInt(0, i); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

export function kinderQ(a, b) {
  return { key: `add:${a}+${b}`, kind: "kinder", a, b, op: "+", ans: a + b, dots: true, max: 10,
    text: `${a} + ${b}`, speech: `${a} たす ${b} は？` };
}
export function kukuQ(a, b) {
  return { key: `kuku:${a}x${b}`, kind: "kuku", a, b, op: "×", ans: a * b, max: 81,
    text: `${a} × ${b}`, speech: `${a} かける ${b} は？` };
}

/* 年長：たして max 以下。同じ問題が つづかないように */
export function kinderSession(max, n) {
  const out = [];
  let last = "";
  while (out.length < n) {
    const a = randInt(1, max - 1), b = randInt(1, max - a);
    const q = kinderQ(a, b);
    if (q.key === last) continue;
    last = q.key;
    out.push(q);
  }
  return out;
}

/* 九九：order=じゅんばん（×1〜×9）/ そうでなければ その段の9問を ばらばらに */
export function kukuSession(dan, order) {
  const bs = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  if (!order) shuffle(bs);
  return bs.map((b) => kukuQ(dan, b));
}

/* 復習：リストから最大 n 問（古いものから） */
export function reviewSession(list, n) {
  return shuffle(list.slice(0, n).map((r) => ({ ...r.q })));
}

/* 3つの選択肢：正解と、まちがえやすい近い数 */
export function makeChoices(q) {
  const cands = [1, -1, 2, -2];
  if (q.op === "×") cands.push(q.a, -q.a, q.b, -q.b, 10, -10);
  shuffle(cands);
  const wrong = [];
  for (const o of cands) {
    const v = q.ans + o;
    const min = q.op === "×" ? 1 : 1;
    if (v >= min && v <= q.max && v !== q.ans && !wrong.includes(v)) wrong.push(v);
    if (wrong.length === 2) break;
  }
  let k = 3;
  while (wrong.length < 2) { const v = q.ans + k++; if (!wrong.includes(v)) wrong.push(v); }
  return shuffle([q.ans, ...wrong]);
}

/* =========================================================
   国語
   - かな（年長）：hira=音を聞いて ひらがなを選ぶ / kata=カタカナを見て 読み（ひらがな）を選ぶ
   - 漢字（小4・小5）：yomi=ことばの読み / erabi=読みから漢字 / okuri=送り仮名
   国語の問題は 選択肢を 問題の中に持つ（q.choices）
   ========================================================= */
export { shuffle };

const pickN = (arr, n, avoid = new Set()) => shuffle(arr.filter((x) => !avoid.has(x))).slice(0, n);
const hiraOf = (kata) => HIRAGANA[KATAKANA.indexOf(kata)];

function kanaWrongs(ans, look, pool, toAnswer = (x) => x) {
  const out = [];
  for (const c of shuffle([...(look[ans] || "")])) {
    const v = toAnswer(c);
    if (v && v !== toAnswer(ans) && !out.includes(v)) out.push(v);
    if (out.length === 2) return out;
  }
  for (const c of shuffle([...pool])) {
    const v = toAnswer(c);
    if (v && v !== toAnswer(ans) && !out.includes(v)) out.push(v);
    if (out.length === 2) break;
  }
  return out;
}

export function hiraQ(c) {
  return {
    key: `hira:${c}`, kind: "kana", type: "hira", ans: c, choices: shuffle([c, ...kanaWrongs(c, HIRA_LOOKALIKE, HIRAGANA)]),
    text: "🔊", sub: "きいて、その もじの もんへ", board: "？", speech: `「${c}」の もじは どれ？`, max: 0,
  };
}
export function kataQ(k) {
  const ans = hiraOf(k);
  return {
    key: `kata:${k}`, kind: "kana", type: "kata", ans, choices: shuffle([ans, ...kanaWrongs(k, KATA_LOOKALIKE, KATAKANA, hiraOf)]),
    text: k, sub: "なんて よむかな？", board: k, speech: "この もじは なんて よむかな？", max: 0,
  };
}
export function kanaSession(type, n) {
  const src = type === "hira" ? HIRAGANA : KATAKANA;
  return pickN(src, n).map((c) => (type === "hira" ? hiraQ(c) : kataQ(c)));
}

/* 送り仮名のまちがい：送り仮名を 1字へらす／ふやす（例：改める → 改る・改ためる） */
function okuriWrongs(r) {
  const stem = r.w.slice(0, r.w.length - r.o.length);           // 漢字の部分
  const stemY = r.y.slice(0, r.y.length - r.o.length);          // 漢字の部分の読み
  const c = [];
  if (r.o.length >= 2) c.push(stem + r.o.slice(1));
  if (stemY.length >= 1) c.push(stem + stemY.slice(-1) + r.o);
  if (stemY.length >= 2) c.push(stem + stemY.slice(-2) + r.o);
  if (r.o.length >= 3) c.push(stem + r.o.slice(2));
  if (!r.o.endsWith("る")) c.push(stem + r.o + "る");
  c.push(stem + r.o + "い");
  return [...new Set(c)].filter((x) => x !== r.w).slice(0, 2);
}

/* 読み・漢字えらび の まちがい：同じ学年の ほかのことば（同じ読み・同じことばは 入れない） */
function otherRows(rows, r, key, n) {
  const sameLen = rows.filter((x) => x !== r && x.y !== r.y && x.w !== r.w && Math.abs(x[key].length - r[key].length) <= 1 && !x.o === !r.o);
  const pool = sameLen.length >= n ? sameLen : rows.filter((x) => x !== r && x.y !== r.y && x.w !== r.w);
  const out = [];
  for (const x of shuffle([...pool])) {
    if (!out.includes(x[key]) && x[key] !== r[key]) out.push(x[key]);
    if (out.length === n) break;
  }
  return out;
}

export function kanjiQ(rows, r, type) {
  const base = { kind: "kanji", type, g: r.g, max: 0 };
  if (type === "yomi") {
    return { ...base, key: `yomi:${r.w}`, ans: r.y, choices: shuffle([r.y, ...otherRows(rows, r, "y", 2)]),
      text: r.w, sub: "よみかたは？", board: r.w, speech: "" };
  }
  if (type === "erabi") {
    return { ...base, key: `erabi:${r.w}`, ans: r.w, choices: shuffle([r.w, ...otherRows(rows, r, "w", 2)]),
      text: r.y, sub: "かんじで かくと？", board: r.y, speech: r.y };
  }
  return { ...base, key: `okuri:${r.w}`, ans: r.w, choices: shuffle([r.w, ...okuriWrongs(r)]),
    text: r.y, sub: "おくりがなが ただしいのは？", board: r.y, speech: r.y };
}
/* type: yomi / erabi / okuri / mix */
export function kanjiSession(allRows, grade, type, n) {
  const rows = allRows.filter((r) => r.g === grade);
  const words = rows.filter((r) => !r.o), okuri = rows.filter((r) => r.o);
  const out = [];
  const used = new Set();
  let guard = 0;
  while (out.length < n && guard++ < 200) {
    const t = type === "mix" ? ["yomi", "erabi", "okuri"][randInt(0, okuri.length ? 2 : 1)] : type;
    const src = t === "okuri" ? okuri : words;
    if (!src.length) break;
    const r = src[randInt(0, src.length - 1)];
    const key = t + r.w;
    if (used.has(key)) continue;
    used.add(key);
    out.push(kanjiQ(rows, r, t));
  }
  return out;
}
