/* =========================================================
   出題（さんすうランの問題プールを流用）
   かんたん: 10までのたし算・ひき算。画面には数字でなく ● で出す
   ========================================================= */
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

export function makeQuestion(difficulty) {
  if (difficulty === "kuku") {
    const a = randInt(1, 9), b = randInt(1, 9);
    return { a, b, op: "×", ans: a * b, max: 81 };
  }
  if (difficulty === "easy") {
    if (Math.random() < 0.6) {
      const a = randInt(1, 5), b = randInt(1, Math.min(5, 10 - a));
      return { a, b, op: "+", ans: a + b, max: 10, dots: true };
    }
    const a = randInt(2, 8), b = randInt(1, a - 1);
    return { a, b, op: "−", ans: a - b, max: 10, dots: true };
  }
  // normal
  if (Math.random() < 0.5) {
    const a = randInt(1, 15), b = randInt(1, 20 - a);
    return { a, b, op: "+", ans: a + b, max: 20 };
  }
  const a = randInt(3, 20), b = randInt(1, a - 1);
  return { a, b, op: "−", ans: a - b, max: 20 };
}

/* まちがいの選択肢：子どもが間違えやすい近い数（±1, ±2, かけ算は ±段 も） */
export function makeChoices(q, n) {
  const cands = [1, -1, 2, -2, 3, -3];
  if (q.op === "×") cands.push(q.a, -q.a, q.b, -q.b, 10, -10);
  const wrong = [];
  for (const o of cands.sort(() => Math.random() - 0.5)) {
    const v = q.ans + o;
    if (v >= 0 && v <= q.max && v !== q.ans && !wrong.includes(v)) wrong.push(v);
    if (wrong.length >= n - 1) break;
  }
  let extra = 1;
  while (wrong.length < n - 1) {           // 念のため
    const v = q.ans + 3 + extra++;
    if (!wrong.includes(v)) wrong.push(v);
  }
  const all = [q.ans, ...wrong].sort(() => Math.random() - 0.5);
  return { values: all, correct: all.indexOf(q.ans) };
}

/* 画面表示用 */
export const dots = (n) => "●".repeat(n);
export const OP_WORD = { "+": "たす", "−": "ひく", "×": "かける" };
