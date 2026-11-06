/* =========================================================
   算数の問題づくり
   - 年長：ドットで数えられる たしざん（5まで → 10まで）
   - 九九：段ごと（じゅんばん／ランダム）
   - 復習：その子の まちがえリストから
   問題のかたち：{ key, kind, a, b, op, ans, text, speech, dots }
   ========================================================= */
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
