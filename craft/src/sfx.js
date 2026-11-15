/* =========================================================
   効果音（ぜんぶ その場で 合成。音の ファイルは 使わない）
   ========================================================= */
let ctx = null;
function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}
export function unlock() { ac(); }

function tone(type, f0, f1, dur, vol, delay = 0) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

export const sfx = {
  jump: () => tone("sine", 320, 620, 0.16, 0.12),
  knock: (k = 0) => { tone("triangle", 260 + k * 40, 150, 0.07, 0.2); tone("square", 120, 80, 0.05, 0.05); },   // たたく（進むほど 高く）
  break: () => { tone("triangle", 520, 140, 0.12, 0.2); tone("square", 180, 70, 0.08, 0.06); },
  place: () => tone("triangle", 200, 300, 0.09, 0.2),
  swish: () => tone("sine", 500, 260, 0.08, 0.05),
  no: () => tone("sine", 220, 170, 0.14, 0.1),
  save: () => { tone("sine", 660, 660, 0.09, 0.1); tone("sine", 880, 880, 0.14, 0.1, 0.09); },
  craft: () => { tone("triangle", 440, 440, 0.07, 0.14); tone("triangle", 660, 660, 0.1, 0.14, 0.08); },
  hit: () => { tone("square", 300, 120, 0.09, 0.1); tone("triangle", 600, 200, 0.07, 0.12); },
  hurt: () => tone("sawtooth", 260, 110, 0.2, 0.1),
  pop: () => { tone("sine", 500, 900, 0.1, 0.16); tone("sine", 900, 1300, 0.12, 0.1, 0.08); },
  color: () => [523, 659, 784, 1047].forEach((f, i) => tone("sine", f, f, 0.16, 0.12, i * 0.09)),
  splash: () => tone("sine", 700, 250, 0.18, 0.08),
  bite: () => { tone("square", 880, 880, 0.06, 0.1); tone("square", 880, 880, 0.06, 0.1, 0.1); },
  sleep: () => [659, 523, 392].forEach((f, i) => tone("sine", f, f, 0.3, 0.1, i * 0.25)),
};
