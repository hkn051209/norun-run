/* =========================================================
   音：BGM（モードごとに ループ）・効果音・読み上げ
   - 音のファイルは assets/audio/ に おくだけで 差しかわる（名前は AUDIO_FILES）
   - ファイルが ない／読めない 効果音は、今までどおり ブラウザの音源で 鳴らす
   - BGM と 効果音は べつべつに 止められる（保護者画面）
   ========================================================= */
export const AUDIO_FILES = {
  bgm: {
    menu:  "assets/audio/bgm_menu.mp3",    // まなび（タイトル・マイページ・学習の 選択ラン・結果）
    run:   "assets/audio/bgm_run.mp3",     // あそび：ラン
    tower: "assets/audio/bgm_tower.mp3",   // あそび：アスレ（中の名前は tower のまま）
    asmr:  "assets/audio/bgm_asmr.mp3",    // あそび：ASMRタワー（足音が 主役なので しずかな 曲）
  },
  // ASMRタワーの 踏み音：テーマの id ごとに step（軽く ふむ）・land（着地・強く ふむ）の ファイルの リスト。registerStepThemes で 登録
  // ふつうは step_<id>.mp3・land_<id>.mp3。テーマに sounds が あれば その リスト（キーボードは 実録版と 生成版を まぜる）
  step: {},
  se: {
    jump:    "assets/audio/se_jump.mp3",     // ジャンプ
    ok:      "assets/audio/se_correct.mp3",  // せいかい
    ng:      "assets/audio/se_wrong.mp3",    // まちがい
    kira:    "assets/audio/se_kira.mp3",     // キラキラを とった
    power:   "assets/audio/se_item.mp3",     // ながれぼし・シャボンを とった
    flag:    "assets/audio/se_flag.mp3",     // チェックポイントの 旗
    done:    "assets/audio/se_goal.mp3",     // ゴール（学習の おわり・あそびの 記録）
    streak:  "assets/audio/se_streak.mp3",   // れんぞく せいかい・じこベスト こうしん（なくても よい）
    bump:    "assets/audio/se_bump.mp3",     // ぶつかった・バーに あたった（なくても よい）
    boing:   "assets/audio/se_pad.mp3",      // ジャンプ台（なくても よい）
    pop:     "assets/audio/se_pop.mp3",      // シャボンが われた（なくても よい）
    tap:     "assets/audio/se_tap.mp3",      // ボタン・レーン移動（なくても よい）
  },
};
const VOL = { bgm: 0.32, se: 0.85 };

let ctx = null, bgmGain = null, seGain = null;
let muted = false;
const prefs = { bgm: true, se: true };
const buffers = {};        // url -> AudioBuffer | null（なかった）
let loading = null;

export function unlockAudio() {   // さいしょのタッチで 音を使えるようにする（iPad の決まり）
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      bgmGain = ctx.createGain(); bgmGain.gain.value = prefs.bgm ? VOL.bgm : 0; bgmGain.connect(ctx.destination);
      seGain = ctx.createGain(); seGain.gain.value = VOL.se; seGain.connect(ctx.destination);
      loadAll();
    }
    if (ctx.state === "suspended") ctx.resume();
  } catch {}
}
export const setMuted = (m) => { muted = m; if (m) stopSpeak(); };
/* 保護者画面の 設定：{ bgm: true/false, se: true/false } */
export function setAudioPrefs(p) {
  Object.assign(prefs, p);
  if (bgmGain) bgmGain.gain.setTargetAtTime(prefs.bgm ? VOL.bgm : 0, ctx.currentTime, 0.1);
  if (prefs.bgm && wantBgm && !cur) playBgm(wantBgm, true);
}

async function loadOne(url) {
  if (url in buffers) return buffers[url];
  try {
    const r = await fetch(url);
    if (!r.ok) throw 0;
    const ab = await r.arrayBuffer();
    buffers[url] = await new Promise((ok, ng) => ctx.decodeAudioData(ab, ok, ng));
  } catch { buffers[url] = null; }
  return buffers[url];
}
function loadAll() {
  if (loading) return loading;
  // 効果音を 先に（小さい）、BGM は 今ほしい曲から
  const se = [...Object.values(AUDIO_FILES.se), ...Object.values(AUDIO_FILES.step).flatMap((s) => [...s.step, ...s.land])].map(loadOne);
  loading = Promise.all(se).then(() => {
    const order = [wantBgm, ...Object.keys(AUDIO_FILES.bgm)].filter(Boolean);
    return Promise.all([...new Set(order)].map((k) => loadOne(AUDIO_FILES.bgm[k]).then(() => { if (k === wantBgm && !cur) playBgm(k, true); })));
  });
  return loading;
}
/* どのファイルが 見つかったか（保護者画面に 出す） */
export const audioStatus = () => Object.fromEntries(
  [...Object.values(AUDIO_FILES.bgm), ...Object.values(AUDIO_FILES.se), ...Object.values(AUDIO_FILES.step).flatMap((s) => [...s.step, ...s.land])]
    .map((u) => [u.split("/").pop(), u in buffers ? !!buffers[u] : null]));
/* ASMR の テーマを 登録（足音の ファイル名が きまる） */
export function registerStepThemes(themes) {
  const url = (n) => `assets/audio/${n}.mp3`;
  for (const th of themes) {
    const s = th.sounds || {};
    AUDIO_FILES.step[th.id] = { step: (s.step || [`step_${th.id}`]).map(url), land: (s.land || [`land_${th.id}`]).map(url) };
  }
  if (ctx) for (const s of Object.values(AUDIO_FILES.step)) [...s.step, ...s.land].forEach(loadOne);
}

/* ---------- BGM ---------- */
let wantBgm = null, cur = null;   // cur = { name, src, g }
export function playBgm(name, force = false) {
  if (name === wantBgm && !force && cur) return;
  wantBgm = name;
  if (!ctx) return;                       // さいしょの タッチの あとで 鳴る
  const buf = buffers[AUDIO_FILES.bgm[name]];
  if (cur && cur.name === name && !force) return;
  stopBgm(0.5, true);
  if (!buf || !prefs.bgm) return;         // ファイルが まだ／ない、または BGM オフ
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;                        // つなぎめなく ループ
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, ctx.currentTime);
  g.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.6);
  src.connect(g).connect(bgmGain);
  src.start();
  cur = { name, src, g };
}
export function stopBgm(fade = 0.4, keepWant = false) {
  if (!keepWant) wantBgm = null;
  if (!cur || !ctx) return;
  const { src, g } = cur;
  try {
    g.gain.cancelScheduledValues(ctx.currentTime);
    g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + fade);
    src.stop(ctx.currentTime + fade + 0.05);
  } catch {}
  cur = null;
}
// 画面を はなれたら 止める（iPad で 裏で 鳴りつづけない）
document.addEventListener("visibilitychange", () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend(); else ctx.resume();
});

/* ---------- 効果音 ---------- */
function tone(freq, start, dur, type = "sine", vol = 0.18) {
  if (!ctx || muted || !prefs.se) return;
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
/* ノイズ（しゃりしゃり・ねばねばの 足音の もと） */
let noiseBuf = null;
function noise(start, dur, vol, type, freq, q = 1) {
  if (!ctx || muted || !prefs.se) return;
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = ctx.currentTime + start;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  s.connect(f).connect(g).connect(ctx.destination);
  s.start(t0, Math.random() * 0.3); s.stop(t0 + dur + 0.02);
}
function sweep(f0, f1, start, dur, vol, type = "sine") {
  if (!ctx || muted || !prefs.se) return;
  const t0 = ctx.currentTime + start;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
/* ファイルが ない時の 足音（テーマごとの 代わりの 音） */
const STEP_SYNTH = {
  shari: { step: () => { noise(0, 0.07, 0.22, "highpass", 3500); noise(0.03, 0.05, 0.12, "bandpass", 6000, 2); },
           land: () => { noise(0, 0.16, 0.3, "highpass", 3000); tone(2600, 0.02, 0.1, "sine", 0.05); } },
  puni:  { step: () => sweep(220, 120, 0, 0.09, 0.14),
           land: () => { sweep(320, 90, 0, 0.26, 0.2); sweep(500, 260, 0.05, 0.12, 0.06); } },
  key:   { step: () => { noise(0, 0.03, 0.25, "bandpass", 3200, 3); tone(1800, 0, 0.025, "square", 0.04); },      // カチャッ
           land: () => { [0, 0.03, 0.055].forEach((d) => noise(d, 0.035, 0.22, "bandpass", 2800 + d * 8000, 3)); } },
  zaku:  { step: () => noise(0, 0.09, 0.26, "bandpass", 1800, 1.2),
           land: () => { noise(0, 0.2, 0.3, "bandpass", 1500, 1); noise(0.05, 0.12, 0.15, "highpass", 4000); } },
  pari:  { step: () => noise(0, 0.05, 0.22, "highpass", 2500),
           land: () => { noise(0, 0.12, 0.35, "highpass", 2000); noise(0.04, 0.18, 0.2, "bandpass", 1200, 2); } },
  slime: { step: () => sweep(180, 90, 0, 0.14, 0.16), land: () => { sweep(260, 70, 0, 0.4, 0.22); sweep(420, 180, 0.08, 0.2, 0.08); } },
  fuwa:  { step: () => noise(0, 0.12, 0.08, "lowpass", 900), land: () => noise(0, 0.25, 0.14, "lowpass", 700) },
  koro:  { step: () => { for (let i = 0; i < 4; i++) tone(2400 + Math.random() * 1600, i * 0.025, 0.03, "sine", 0.05); },
           land: () => { for (let i = 0; i < 10; i++) tone(2000 + Math.random() * 2000, i * 0.03, 0.04, "sine", 0.05); } },
  choco: { step: () => { noise(0, 0.05, 0.24, "highpass", 2600); tone(1500, 0, 0.03, "triangle", 0.05); },          // パキッ
           land: () => { noise(0, 0.08, 0.32, "highpass", 2200); noise(0.03, 0.1, 0.18, "bandpass", 1300, 2); } },
  push:  { step: () => sweep(700, 260, 0, 0.07, 0.16), land: () => { sweep(600, 180, 0, 0.1, 0.2); sweep(900, 400, 0.04, 0.06, 0.08); } },   // ポコッ
  neba:  { step: () => { sweep(420, 140, 0, 0.13, 0.08, "triangle"); noise(0, 0.12, 0.12, "lowpass", 700); },
           land: () => { sweep(500, 110, 0, 0.3, 0.12, "triangle"); noise(0, 0.25, 0.16, "lowpass", 600); } },
};
/* 足音を 鳴らす（kind："step"／"land"） */
/* 足場を 踏んだ 瞬間の 音（kind："step"＝軽く ふむ／"land"＝着地・強く ふむ。rate：音の 高さ）
   ファイルが あれば リストから ランダムに 1つ。ない時は 代わりの 合成音 */
export function stepSound(id, kind = "step", rate = 1) {
  if (!ctx || muted || !prefs.se) return;
  const f = AUDIO_FILES.step[id];
  const got = f ? f[kind].map((u) => buffers[u]).filter(Boolean) : [];
  const buf = got.length ? got[Math.floor(Math.random() * got.length)] : null;
  if (buf) {
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.playbackRate.value = rate * (0.94 + Math.random() * 0.12);   // 1回ずつ 少し ちがう 音に
    s.connect(seGain);
    s.start();
  } else if (STEP_SYNTH[id]) STEP_SYNTH[id][kind]();
  else tone(500, 0, 0.04, "sine", 0.05);
}
/* ファイルが あれば それを、なければ synth を 鳴らす */
function play(name, synth) {
  if (!ctx || muted || !prefs.se) return;
  const buf = buffers[AUDIO_FILES.se[name]];
  if (buf) {
    const s = ctx.createBufferSource();
    s.buffer = buf;
    if (name === "kira") s.playbackRate.value = 0.94 + Math.random() * 0.14;   // つづけて とった時に 少し 音の高さを かえる
    s.connect(seGain);
    s.start();
  } else synth();
}
export const sfx = {
  ok: () => play("ok", () => { tone(1046, 0, 0.12, "triangle"); tone(1568, 0.07, 0.16, "triangle"); }),          // ピンポン
  ng: () => play("ng", () => { tone(220, 0, 0.18, "square", 0.08); tone(180, 0.09, 0.2, "square", 0.08); }),     // ブブッ
  streak: () => play("streak", () => [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, i * 0.06, 0.14, "triangle", 0.14))),
  done: () => play("done", () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.1, 0.22, "triangle", 0.16))),
  tap: () => play("tap", () => tone(660, 0, 0.05, "sine", 0.08)),
  jump: () => play("jump", () => { tone(520, 0, 0.08, "sine", 0.1); tone(780, 0.04, 0.1, "sine", 0.08); }),
  kira: () => play("kira", () => tone(1760 + Math.random() * 300, 0, 0.07, "sine", 0.07)),                    // キラッ
  power: () => play("power", () => [523, 784, 1046, 1568].forEach((f, i) => tone(f, i * 0.045, 0.12, "triangle", 0.13))),   // ながれぼし・シャボン
  pop: () => play("pop", () => { tone(900, 0, 0.06, "sine", 0.12); tone(1400, 0.04, 0.08, "sine", 0.08); }),     // シャボンが われる
  boing: () => play("boing", () => { tone(330, 0, 0.12, "sine", 0.12); tone(660, 0.06, 0.16, "sine", 0.1); }),      // ジャンプ台
  flag: () => play("flag", () => [784, 1046, 1318].forEach((f, i) => tone(f, i * 0.08, 0.14, "triangle", 0.12))),   // チェックポイント
  bump: () => play("bump", () => { tone(220, 0, 0.18, "square", 0.08); tone(180, 0.09, 0.2, "square", 0.08); }),    // ぶつかった
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
