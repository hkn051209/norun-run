/* =========================================================
   効果音（ぜんぶ その場で 合成。音の ファイルは 使わない）
   ========================================================= */
let ctx = null;
export let muted = false;
export function setMuted(m) { muted = m; }

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}
/* さいしょの タッチで 音を 出せる ように する */
export function unlock() { ac(); }

function tone(type, f0, f1, dur, vol) {
  if (muted) return;
  const c = ac(); if (!c) return;
  const t = c.currentTime;
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
  break: () => { tone("triangle", 520, 140, 0.12, 0.2); tone("square", 180, 70, 0.08, 0.06); },
  place: () => tone("triangle", 200, 300, 0.09, 0.2),
  no: () => tone("sine", 220, 170, 0.14, 0.1),
  save: () => { tone("sine", 660, 660, 0.09, 0.1); setTimeout(() => tone("sine", 880, 880, 0.14, 0.1), 90); },
};
