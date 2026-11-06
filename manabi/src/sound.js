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
    tower: "assets/audio/bgm_tower.mp3",   // あそび：とう
  },
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
  const se = Object.values(AUDIO_FILES.se).map(loadOne);
  loading = Promise.all(se).then(() => {
    const order = [wantBgm, ...Object.keys(AUDIO_FILES.bgm)].filter(Boolean);
    return Promise.all([...new Set(order)].map((k) => loadOne(AUDIO_FILES.bgm[k]).then(() => { if (k === wantBgm && !cur) playBgm(k, true); })));
  });
  return loading;
}
/* どのファイルが 見つかったか（保護者画面に 出す） */
export const audioStatus = () => Object.fromEntries(
  [...Object.entries(AUDIO_FILES.bgm), ...Object.entries(AUDIO_FILES.se)].map(([k, u]) => [u.split("/").pop(), u in buffers ? !!buffers[u] : null]));

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
