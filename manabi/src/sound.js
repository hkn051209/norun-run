/* =========================================================
   効果音（ファイルなし。ブラウザの音源で その場で鳴らす）と 読み上げ
   ========================================================= */
let ctx = null;
let muted = false;

export function unlockAudio() {   // さいしょのタッチで 音を使えるようにする（iPad の決まり）
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
  } catch {}
}
export const setMuted = (m) => { muted = m; if (m) stopSpeak(); };

function tone(freq, start, dur, type = "sine", vol = 0.18) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + start;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export const sfx = {
  ok() { tone(1046, 0, 0.12, "triangle"); tone(1568, 0.07, 0.16, "triangle"); },          // ピンポン
  ng() { tone(220, 0, 0.18, "square", 0.08); tone(180, 0.09, 0.2, "square", 0.08); },     // ブブッ
  streak() { [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, i * 0.06, 0.14, "triangle", 0.14)); },
  done() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.1, 0.22, "triangle", 0.16)); },
  tap() { tone(660, 0, 0.05, "sine", 0.08); },
};

/* 読み上げ（日本語の声があれば それを使う） */
let jaVoice = null;
function pickVoice() {
  try {
    const vs = speechSynthesis.getVoices();
    jaVoice = vs.find((v) => v.lang === "ja-JP") || vs.find((v) => v.lang && v.lang.startsWith("ja")) || null;
  } catch {}
}
try { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } catch {}

export const canSpeak = () => typeof window.speechSynthesis !== "undefined";

export function speak(text) {
  if (!canSpeak() || muted) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    if (jaVoice) u.voice = jaVoice;
    u.rate = 1.05;
    u.pitch = 1.1;
    speechSynthesis.speak(u);
  } catch {}
}
export function stopSpeak() {
  try { if (canSpeak()) speechSynthesis.cancel(); } catch {}
}
