import {
  GRADES, gradeOf, FACES, PASS_ICONS, TEMPO, RUN, SESSION, KINDER, KUKU_MASTER_STREAK, REVIEW_GRADUATE, POINTS, HAT_COLORS, BADGES, PINS, RUN_SPEEDS, CHARACTERS, ASMR_THEMES, ATHLE_COURSES,
} from "./config.js";
import * as store from "./storage.js";
import { kinderSession, kukuSession, reviewSession, makeChoices, kanaSession, kanjiSession, shuffle } from "./quiz.js";
import { sfx, speak, stopSpeak, unlockAudio, canSpeak, playBgm, setAudioPrefs, audioStatus, stepSound, registerStepThemes } from "./sound.js";
import { loadNorun3D, react, setHatColor, setPins } from "./norun3d.js";
import { runResize, initRunView, startRunView, stopRunView, moveLaneTo, moveLaneBy, setRunHat, runState, laneNow, startPlayRun, playJump, setRunPins } from "./run3d.js";
import { initTowerView, startTower, stopTower, towerStick, towerJump, towerSkill, towerTeleport, towerLook, towerCam, towerToggleView, towerFaceFront, towerResize, setTowerHat, setTowerPins, setTowerChar, charAvailable, towerState, towerDebugHook } from "./tower3d.js";

const $ = (id) => document.getElementById(id);
const DEBUG = location.search.includes("debug");
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* =========================================================
   画面の切り替え
   ========================================================= */
const SCREENS = ["scTitle", "scPass", "scMy", "scKuku", "scKinder", "scKokugo", "scPlay", "scAthle", "scPlayRun", "scQuiz", "scResult", "scShop", "scPin", "scParent", "scConfirm"];
let screen = "loading";
function show(id) {
  screen = id;
  for (const s of SCREENS) $(s).classList.toggle("hidden", s !== id);
  document.body.dataset.screen = id;
  $(id).scrollTop = 0;
  placeNorun();
  // BGM：あそびの ラン・塔は それぞれの曲、ほかは「まなび」の曲（結果画面は その前の曲のまま）
  if (id === "scPlayRun" && play) playBgm(play.mode);    // run / tower（アスレ）/ asmr
  else if (id !== "scResult") playBgm("menu");
}
// マイページでは、のるんを「立つ場所」の上に重ねる
const canvas = $("norunView");
function placeNorun() {
  if (screen === "scMy") {
    const r = $("myStage").getBoundingClientRect();
    Object.assign(canvas.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, bottom: "auto", transform: "none" });
  } else {
    canvas.removeAttribute("style");
  }
}
$("scMy").addEventListener("scroll", placeNorun, { passive: true });
addEventListener("resize", placeNorun);

let toastTimer;
function toast(msg, ms = 900) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), ms);
}
// さいしょのタッチで 音を使えるように
setAudioPrefs({ bgm: store.getSettings().bgm, se: store.getSettings().se });
registerStepThemes(ASMR_THEMES);
addEventListener("pointerdown", unlockAudio, { capture: true });

/* =========================================================
   いま遊んでいる子
   ========================================================= */
let me = null;     // { id, name, grade, face }
let data = null;   // その子のデータ
function save() { if (me) store.saveData(me.id, data); }
function points() { return data.points - data.spent; }

/* =========================================================
   タイトル（プロフィール）
   ========================================================= */
function renderTitle() {
  const list = $("profileList");
  list.innerHTML = "";
  const profs = store.listProfiles();
  $("noProfile").classList.toggle("hidden", profs.length > 0);
  for (const p of profs) {
    const b = document.createElement("button");
    b.className = "prof";
    b.innerHTML = `<span class="face">${esc(p.face || "🐰")}</span><span>${esc(p.name)}<small>${gradeOf(p.grade).name}</small></span>`;
    b.onclick = () => openPass(p);
    list.append(b);
  }
  setHatColor(null);
  setPins(null);
}

/* =========================================================
   合言葉（絵を3つ。じゅんばんは関係なし）
   ========================================================= */
let passFor = null, passPick = [], passMode = "enter", passFirst = null;
function openPass(p) {
  passFor = p;
  const d = store.loadData(p.id);
  passMode = d.pass ? "enter" : "set";
  passFirst = null;
  passPick = [];
  renderPass();
  show("scPass");
}
function renderPass() {
  $("passTitle").textContent = `${passFor.face || ""} ${passFor.name}`;
  $("passNote").textContent = passMode === "enter" ? "あいことばの えを 3つ えらんでね"
    : passFirst ? "もういちど おなじ えを 3つ えらんでね" : "すきな えを 3つ えらんで、あいことばに しよう";
  const slots = document.querySelectorAll(".slot");
  slots.forEach((s, i) => {
    s.textContent = passPick[i] ? PASS_ICONS[passPick[i] - 1] : "";
    s.classList.toggle("on", !!passPick[i]);
  });
  const g = $("passGrid");
  g.innerHTML = "";
  PASS_ICONS.forEach((ic, i) => {
    const b = document.createElement("button");
    b.className = "pic" + (passPick.includes(i + 1) ? " on" : "");
    b.textContent = ic;
    b.onclick = () => pickPass(i + 1);
    g.append(b);
  });
}
const sameSet = (a, b) => a && b && a.length === b.length && [...a].sort().join() === [...b].sort().join();
function pickPass(n) {
  sfx.tap();
  if (passPick.includes(n)) passPick = passPick.filter((x) => x !== n);
  else if (passPick.length < 3) passPick.push(n);
  renderPass();
  if (passPick.length < 3) return;
  setTimeout(() => {
    if (passMode === "enter") {
      const d = store.loadData(passFor.id);
      if (sameSet(d.pass, passPick)) enter(passFor);
      else passWrong("ちがうみたい。もういちど！");
    } else if (!passFirst) {
      passFirst = [...passPick];
      passPick = [];
      renderPass();
    } else if (sameSet(passFirst, passPick)) {
      const d = store.loadData(passFor.id);
      d.pass = [...passPick];
      store.saveData(passFor.id, d);
      toast("あいことばを きめたよ！", 1200);
      enter(passFor);
    } else {
      passFirst = null;
      passWrong("ちがったので、さいしょから えらんでね");
    }
  }, 180);
}
function passWrong(msg) {
  sfx.ng();
  passPick = [];
  renderPass();
  const g = $("passGrid");
  g.classList.remove("shake"); void g.offsetWidth; g.classList.add("shake");
  toast(msg, 1300);
}
$("passClear").onclick = () => { passPick = []; renderPass(); };
$("passBack").onclick = () => { renderTitle(); show("scTitle"); };

function enter(p) {
  me = { ...p };
  data = store.loadData(p.id);
  store.askPersist();
  applyHat();
  renderMy();
  show("scMy");
  react("cheer");
}

/* =========================================================
   マイページ
   ========================================================= */
function applyHat() {
  const pins = data.pins.map((id) => { const p = PINS.find((x) => x.id === id); return p && hasPin(p) ? id : null; });
  if (pins.join() !== data.pins.join()) { data.pins = pins; save(); }
  const h = HAT_COLORS.find((x) => x.id === data.hat) || HAT_COLORS[0];
  setHatColor(h.color);
  setPins(data.pins);
}
/* 帽子の バッジ：持っているか（記録バッジを もらうと つかえる） */
const hasPin = (p) => !p.badge || data.badges.includes(p.badge);
function renderMy() {
  const g = gradeOf(me.grade);
  $("myFace").textContent = me.face || "🐰";
  $("myName").textContent = me.name;
  $("myGrade").textContent = g.name;
  $("btnStudy").innerHTML = g.course === "kuku" ? `<i class="ico" data-ui="ic-kuku">✖️</i> くく` : `<i class="ico" data-ui="ic-tashizan">➕</i> たしざん`;
  $("btnReview").innerHTML = `<i class="ico" data-ui="ic-review">🔁</i> ふくしゅう<small>${data.review.length}こ</small>`;
  applyUiImages($("scMy"));
  $("btnReview").disabled = data.review.length === 0;
  const mastered = Object.values(data.kuku).filter((v) => v.lv >= 2).length;
  const st = [
    ["⭐", points(), "ポイント"],
    ["✅", data.totalCorrect, "せいかい ぜんぶ"],
    ["🔥", data.bestStreak, "さいこう れんぞく"],
    ["📅", data.days[today()] || 0, "きょうの せいかい"],
    ["⚔️", data.defeated, "ふくしゅうで やっつけた"],
  ];
  if (g.course === "kuku") st.push(["🌸", `${mastered}/81`, "おぼえた くく"]);
  st.push(["📖", data.kokugo.kana + data.kokugo.kanji, "こくごで せいかい"]);
  $("myStats").innerHTML = st.map(([i, v, l]) => `<div class="stat"><b>${i} ${v}</b><span>${l}</span></div>`).join("");
  $("kukuCard").classList.toggle("hidden", g.course !== "kuku");
  $("kinderCard").classList.toggle("hidden", g.course !== "kinder");
  if (g.course === "kuku") renderKukuTable();
  else {
    const c1 = data.kinder.correct1, c2 = data.kinder.correct2;
    $("kinderProg").innerHTML = `<div class="stats"><div class="stat"><b>🍓 ${c1}</b><span>5までで せいかい</span></div><div class="stat"><b>🍩 ${c2}</b><span>10までで せいかい</span></div></div>` +
      (c1 < KINDER.unlock ? `<p class="note">5までで あと ${KINDER.unlock - c1}もん せいかいすると、10までの たしざんが ひらくよ</p>` : "");
  }
  $("revInfo").textContent = data.review.length
    ? `まちがえた もんだい ${data.review.length}こ。${REVIEW_GRADUATE}かい つづけて せいかいすると やっつけられるよ（やっつけた数 ${data.defeated}）`
    : `いまは ありません。やっつけた数 ${data.defeated}`;
  $("revList").innerHTML = data.review.slice(0, 30).map((r) => `<span>${esc(qLabel(r.q))}${r.streak ? " ✔" : ""}</span>`).join("");
  const pr = data.play.run, pt = data.play.tower;
  $("myPlay").innerHTML = [
    ["🏃", `${pr.best}m`, "ラン じこベスト"], ["🧗", `${pt.best}m`, "アスレ じこベスト"], ["🎧", `${data.play.asmr.best}m`, "ASMR じこベスト"],
    ["✨", `${pr.kira}こ`, "あつめた キラキラ"],
    ["👟", `${pr.plays + pt.plays}かい`, "あそんだ かいすう"],
  ].map(([i, v, l]) => `<div class="stat"><b>${i} ${v}</b><span>${l}</span></div>`).join("");
  checkBadges();
  $("myBadges").innerHTML = BADGES.map((b) => {
    const has = data.badges.includes(b.id);
    return `<span class="badge ${has ? "" : "off"}" title="${esc(b.name)}"><i>${b.icon}</i>${esc(b.name)}</span>`;
  }).join("");
  $("myHats").innerHTML = data.hats.map((id) => {
    const h = HAT_COLORS.find((x) => x.id === id);
    return h ? `<span class="hatSw" title="${h.name}" style="background:${h.swatch}"></span>` : "";
  }).join("") + `<span class="note" style="margin-left:6px">ぼうしの いろ ${data.hats.length}/${HAT_COLORS.length}</span>`;
  requestAnimationFrame(placeNorun);
}
function renderKukuTable() {
  const t = $("kukuTable");
  let html = `<div class="hd">×</div>`;
  for (let b = 1; b <= 9; b++) html += `<div class="hd">${b}</div>`;
  for (let a = 1; a <= 9; a++) {
    html += `<div class="hd">${a}</div>`;
    for (let b = 1; b <= 9; b++) {
      const v = data.kuku[`${a}x${b}`];
      const lv = v ? v.lv : 0;
      html += `<div class="lv${lv}">${lv ? a * b : ""}</div>`;
    }
  }
  t.innerHTML = html;
}
$("myBack").onclick = () => { stopSpeak(); me = null; data = null; renderTitle(); show("scTitle"); };
$("btnStudy").onclick = () => {
  if (gradeOf(me.grade).course === "kuku") { renderKuku(); show("scKuku"); }
  else { renderKinder(); show("scKinder"); }
};
$("btnReview").onclick = () => startQuiz({ type: "review" });
$("btnKokugo").onclick = () => { renderKokugo(); show("scKokugo"); };
/* ふくしゅうリストに出す 問題の名前 */
function qLabel(q) {
  if (q.type === "hira") return `きく「${q.ans}」`;
  if (q.type === "kata") return q.text;
  if (q.type === "yomi") return `${q.text}（よみ）`;
  if (q.type === "erabi") return `${q.text}（かんじ）`;
  if (q.type === "okuri") return `${q.text}（おくりがな）`;
  return q.text;
}
$("btnShop").onclick = () => { renderShop(); show("scShop"); };
$("btnPlay").onclick = () => { renderPlayMenu(); show("scPlay"); };

/* バッジ：条件を みたしたら もらえる。新しく もらった ものを かえす */
function checkBadges() {
  const got = [];
  for (const b of BADGES) if (!data.badges.includes(b.id) && b.test(data)) { data.badges.push(b.id); got.push(b); }
  if (got.length) save();
  return got;
}

/* =========================================================
   遊びモード（問題なし）：ラン・塔
   ========================================================= */
let play = null;     // { mode: "run" | "tower", best, newBest }
function renderPlayMenu() {
  $("runBest").textContent = `じこベスト ${data.play.run.best}m`;
  const nClear = ATHLE_COURSES.filter((c) => courseRec(c.id).clears > 0).length;
  $("towerBest").textContent = `コース ${nClear}/${ATHLE_COURSES.length} クリア・エンドレス じこベスト ${data.play.tower.best}m`;
  $("asmrBest").textContent = `じこベスト ${data.play.asmr.best}m・${ASMR_THEMES.map((th) => th.name).join("・")}…`;
  renderChars();
}
/* キャラ（変身）：unlock が ついたら その 記録バッジを もっている時だけ えらべる。モデルが ない時も えらべない */
const charOpen = (c) => !c.unlock || data.badges.includes(c.unlock);
function renderChars() {
  const row = $("charRow");
  row.innerHTML = "";
  for (const c of CHARACTERS) {
    const b = document.createElement("button");
    b.className = "charBtn" + (data.play.char === c.id ? " on" : "");
    b.innerHTML = `<i>${c.icon}</i>${c.name}<span>${c.note}</span>`;
    b.disabled = !charOpen(c);
    b.onclick = () => { data.play.char = c.id; save(); sfx.tap(); renderChars(); };
    row.append(b);
    // モデルの ファイルが あるか たしかめる（なければ「じゅんびちゅう」）
    charAvailable(c.id).then((ok) => {
      if (ok) return;
      b.disabled = true;
      b.querySelector("span").textContent = "じゅんびちゅう";
      if (data.play.char === c.id) { data.play.char = "norun"; save(); renderChars(); }
    });
  }
}
$("playBack").onclick = () => { renderMy(); show("scMy"); };
$("goRun").onclick = () => startPlay("run");
$("goTower").onclick = () => { renderAthle(); show("scAthle"); };
$("athleBack").onclick = () => { renderPlayMenu(); show("scPlay"); };
$("goEndless").onclick = () => startPlay("tower");

/* ---------- アスレの コース（第12弾） ----------
   記録は data.play.courses[id] に 足すだけ（今までの 記録は そのまま）。クリアは 記録だけで、バッジは 出さない */
const courseRec = (id) => (data.play.courses[id] ||= { clears: 0, bestTime: 0, bestPct: 0, plays: 0 });
const courseOpen = (i) => i === 0 || courseRec(ATHLE_COURSES[i - 1].id).clears > 0;   // じゅんばんに ひらく（子どもごと）
const fmtTime = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
function renderAthle() {
  const box = $("courseList");
  box.innerHTML = "";
  ATHLE_COURSES.forEach((c, i) => {
    const r = courseRec(c.id), open = courseOpen(i);
    const card = document.createElement("div");
    card.className = "card playCard courseCard";
    const rec = r.clears > 0
      ? `<span class="clear">⭐ クリア ${r.clears}かい</span><span>⏱ ベスト ${fmtTime(r.bestTime)}</span>`
      : r.plays > 0 ? `<span>🚩 いちばん すすんだ ${r.bestPct}%</span>` : "";
    card.innerHTML = `<span class="ic">${open ? c.icon : "🔒"}</span><div style="flex:1"><button class="big${i % 2 ? " alt" : ""}">${i + 1}. ${c.name}</button>
      <div class="note">${c.sub}</div>${open ? `<div class="rec">${rec}</div>` : `<div class="lock">🔒 「${ATHLE_COURSES[i - 1].name}」を クリアすると ひらくよ</div>`}</div>`;
    const b = card.querySelector("button");
    b.disabled = !open;
    b.onclick = () => startPlay("tower", c.id);
    box.append(card);
  });
  $("endlessBest").textContent = `じこベスト ${data.play.tower.best}m・ゴールなしで どこまでも`;
}
function finishCourse(cleared, time = 0) {
  const c = ATHLE_COURSES.find((x) => x.id === play.course), i = ATHLE_COURSES.indexOf(c);
  const st = towerState(), pct = cleared ? 100 : st ? st.pct : 0;
  stopTower();
  const r = courseRec(c.id);
  const wasOpenNext = i + 1 < ATHLE_COURSES.length && courseOpen(i + 1);
  const prevBest = r.bestTime;
  r.plays++;
  r.bestPct = Math.max(r.bestPct, pct);
  if (cleared) { r.clears++; if (!r.bestTime || time < r.bestTime) r.bestTime = time; }
  save();                     // コースも 記録だけ（バッジは 勉強でのみ）
  sfx.done(); react("cheer");
  const lines = [];
  if (cleared) {
    $("resBig").textContent = `${c.icon} ${c.name} クリア！`;
    lines.push(`⏱ タイム ${fmtTime(time)}`);
    lines.push(!prevBest ? "🎉 はじめての クリア！" : time < prevBest ? `🏅 ベスト こうしん！（まえは ${fmtTime(prevBest)}）` : `🏅 ベスト ${fmtTime(r.bestTime)}`);
    if (!wasOpenNext && i + 1 < ATHLE_COURSES.length) lines.push(`🔓 つぎの「${ATHLE_COURSES[i + 1].name}」が ひらいた！`);
  } else {
    $("resBig").textContent = `${c.icon} ${c.name} ${pct}%`;
    lines.push(`🚩 ${pct}% まで すすんだ（いちばん すすんだのは ${r.bestPct}%）`);
  }
  $("resText").textContent = lines.join("\n");
  const next = cleared && i + 1 < ATHLE_COURSES.length ? ATHLE_COURSES[i + 1] : null;
  $("resNext").classList.toggle("hidden", !next);
  if (next) { $("resNext").textContent = `つぎの コース：${next.name}`; $("resNext").onclick = () => startPlay("tower", next.id); }
  quiz = null;
  show("scResult");
}
$("goAsmr").onclick = () => startPlay("asmr");
function pMsg(text, ms = 900) {
  const m = $("pMsg");
  m.textContent = text;
  m.classList.add("show");
  clearTimeout(pMsg.t);
  pMsg.t = setTimeout(() => m.classList.remove("show"), ms);
}
async function startPlay(mode, course = null) {
  const rec = data.play[mode];
  play = { mode, course, best: rec.best, newBest: false, last: 0, kira: 0 };
  $("resNext").classList.add("hidden");
  const h = HAT_COLORS.find((x) => x.id === data.hat) || HAT_COLORS[0];
  $("pDist").textContent = "0m";
  $("pBest").textContent = `🏅${rec.best}m`;
  $("pKira").textContent = "✨0";
  $("pKira").classList.toggle("hidden", mode !== "run" && !course);
  if (course) {   // コース：すすんだ %・タイム・ベスト
    const r = courseRec(course);
    $("pDist").textContent = "0%";
    $("pKira").textContent = "⏱ 0:00";
    $("pBest").textContent = r.bestTime ? `🏁 ${fmtTime(r.bestTime)}` : "🏁 はじめて";
  }
  $("scPlayRun").classList.toggle("tower", mode !== "run");   // アスレ・ASMR は バーチャルパッド＋ジャンプ
  $("scPlayRun").classList.toggle("asmr", mode === "asmr");    // ASMR は 視点の ボタンも
  $("pView").classList.remove("on");
  $("pView").querySelector("span").textContent = "おいかけ";
  $("pSkill").classList.add("hidden");
  resetStick();
  show("scPlayRun");
  if (mode === "run") {
    setRunHat(h.color);
    setRunPins(data.pins);
    const sp = RUN_SPEEDS.find((s) => s.id === store.getSettings().runSpeed) || RUN_SPEEDS[1];
    startPlayRun({
      speed: sp.speed, maxSpeed: sp.maxSpeed,
      onTick: playTick,
      onKira: (k) => { play.kira = k; $("pKira").textContent = `✨${k}`; sfx.kira(); },
      onItem: (kind) => {
        if (kind === "star") { sfx.power(); pMsg("ながれぼし！ むてき＆キラキラ", 1100); }
        else if (kind === "bubble") { sfx.power(); pMsg("シャボンで まもる！", 1000); }
        else if (kind === "pop") { sfx.pop(); pMsg("シャボンが まもった！", 900); }
        else if (kind === "smash") sfx.pop();
      },
      onHit: () => { sfx.bump(); pMsg("ぶつかった！", 1100); },
      onEnd: (m, k) => finishPlay(m, k),
    });
    pMsg("よーい スタート！", 900);
  } else {
    const c = CHARACTERS.find((x) => x.id === data.play.char) || CHARACTERS[0];
    const got = await setTowerChar(charOpen(c) ? c.id : "norun");
    if (screen !== "scPlayRun" || !play) return;
    const cdef = CHARACTERS.find((x) => x.id === got);
    $("pSkill").classList.toggle("hidden", !cdef.skills.slide && !cdef.skills.phase);
    $("pSkill").innerHTML = cdef.skills.phase ? "<b>👻</b>すりぬけ" : "<b>🛷</b>すべる";
    setTowerHat(h.color);
    setTowerPins(data.pins);
    startTower({
      mode: mode === "asmr" ? "asmr" : "athle",
      course,
      onCourseTick: (pct, sec) => { if (!play) return; $("pDist").textContent = `${pct}%`; $("pKira").textContent = `⏱ ${fmtTime(sec)}`; },
      onGoal: (time) => { sfx.streak(); pMsg("⭐ ゴール！", 1400); setTimeout(() => { if (play && play.course === course) finishCourse(true, time); }, 1600); },
      onLava: () => { sfx.bump(); pMsg("あちち！ はたから もういちど", 1300); },
      onCrumble: () => sfx.pop(),
      onStep: (id, kind, rate) => { stepSound(id, kind, rate); if (window.G) (window.__steps ||= []).push([id, kind, rate]); },
      onTheme: (th, fl) => pMsg(`${fl}かい ${th.name}`, 1300),
      onDrop: (fl, th, bottom) => { sfx.bump(); pMsg(fl === 1 && bottom ? "1かいまで おちた… さいしょから！" : `${fl}かいに おちた！ ここから つづき`, 1600); },
      onBigBounce: () => sfx.boing(),
      onSwitch: () => { sfx.flag(); pMsg("とびらが ひらいた！", 900); },
      onHeight: course ? null : playTick,
      onCheckpoint: () => { sfx.flag(); pMsg("🚩 チェックポイント！", 900); },
      onFall: () => { sfx.tap(); pMsg("だいじょうぶ！ はたから もういちど", 1300); },
      onPad: () => sfx.boing(),
      onBump: (kind) => { sfx.bump(); pMsg(kind === "laser" ? "レーザーに あたった！" : "バーに あたった！", 800); },
    });
    if (course) { const cc = ATHLE_COURSES.find((x) => x.id === course); pMsg(`${cc.icon} ${cc.name} スタート！`, 1300); }
    else if (mode !== "asmr") pMsg(cdef.id === "norun" ? "のぼろう！" : `${cdef.name}に へんしん！`, 1000);
    else setTimeout(() => { if (play && play.mode === "asmr") pMsg("👆 スワイプで 見まわせるよ", 1800); }, 1500);
  }
}
function playTick(m) {
  if (!play || m === play.last) return;
  play.last = m;
  $("pDist").textContent = `${m}m`;
  if (m > play.best && play.best > 0 && !play.newBest) { play.newBest = true; sfx.streak(); pMsg("じこベスト こうしん！", 1100); }
  if (m > play.best) $("pBest").textContent = `🏅${m}m`;
  else if (m > 0 && m % 100 === 0 && play.mode === "run") { sfx.ok(); pMsg(`${m}m！`, 700); }
  else if (m > 0 && m % 25 === 0 && play.mode !== "run") { sfx.ok(); pMsg(`${m}m！`, 700); }
}
function playMove(d) {
  if (!play || play.mode !== "run") return;
  moveLaneBy(d);
  sfx.tap();
}
function playJumpNow() {
  if (!play) return;
  if (play.mode === "run" ? playJump() : towerJump()) sfx.jump();
}
/* ---------- 塔：バーチャルパッド（たおした 方向へ 歩く。はなすと 止まる） ---------- */
const stickEl = $("pStick"), knob = $("pKnob");
let stickId = null;
function resetStick() {
  stickId = null;
  stickEl.classList.remove("on");
  knob.style.transform = "";
  towerStick(0, 0);
}
function stickAt(e) {
  const r = stickEl.getBoundingClientRect();
  const R = r.width / 2;
  let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R);
  const m = Math.hypot(dx, dy), lim = R * 0.62;
  if (m > lim) { dx *= lim / m; dy *= lim / m; }
  knob.style.transform = `translate(${dx}px,${dy}px)`;
  let x = dx / lim, y = -dy / lim;
  const mag = Math.hypot(x, y);
  if (mag < 0.18) { x = 0; y = 0; }                 // まんなか ふきんは 止まる
  towerStick(x, y);
}
stickEl.addEventListener("pointerdown", (e) => {
  e.preventDefault(); e.stopPropagation();
  stickId = e.pointerId;
  stickEl.setPointerCapture(e.pointerId);
  stickEl.classList.add("on");
  stickAt(e);
});
stickEl.addEventListener("pointermove", (e) => { if (e.pointerId === stickId) stickAt(e); });
for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) stickEl.addEventListener(ev, (e) => { if (e.pointerId === stickId) resetStick(); });
// パソコン：矢印キー・WASD で 同じように
const keys = new Set();
function keyStick() {
  if (!play || play.mode === "run" || stickId !== null) return;
  const x = (keys.has("r") ? 1 : 0) - (keys.has("l") ? 1 : 0), y = (keys.has("u") ? 1 : 0) - (keys.has("d") ? 1 : 0);
  towerStick(x, y);
}
const KEYMAP = { ArrowLeft: "l", KeyA: "l", ArrowRight: "r", KeyD: "r", ArrowUp: "u", KeyW: "u", ArrowDown: "d", KeyS: "d" };
addEventListener("keydown", (e) => { if (screen === "scPlayRun" && play && play.mode !== "run" && KEYMAP[e.code]) { e.preventDefault(); keys.add(KEYMAP[e.code]); keyStick(); } });
addEventListener("keyup", (e) => { if (KEYMAP[e.code]) { keys.delete(KEYMAP[e.code]); keyStick(); } });
function finishPlay(m, kira = 0) {
  $("resNext").classList.add("hidden");
  const rec = data.play[play.mode];
  const prev = rec.best;
  rec.last = m;
  rec.plays++;
  if (play.mode === "run") { rec.total += m; rec.kira += kira; rec.bestKira = Math.max(rec.bestKira, kira); }
  if (m > rec.best) rec.best = m;
  save();                     // 遊びは 記録だけ（バッジは 勉強でのみ）
  sfx.done();
  react("cheer");
  const name = { run: "ラン", tower: "アスレ", asmr: "ASMRタワー" }[play.mode];
  $("resBig").textContent = `${name} ${m}m！`;
  const lines = [m > prev ? (prev > 0 ? `🏅 じこベスト こうしん！（まえは ${prev}m）` : "🏅 はじめての きろく！") : `🏅 じこベスト ${rec.best}m（あと ${rec.best - m + 1}m で こうしん）`];
  if (play.mode === "run") lines.push(`✨ キラキラ ${kira}こ（ぜんぶで ${rec.kira}こ）`);
  $("resText").textContent = lines.join("\n");
  quiz = null;
  show("scResult");
}
/* ✕：そこまでの 記録を のこして おわる（塔は ここで おわる。ランも 走った分は 記録） */
$("pQuit").onclick = () => {
  if (!play) { renderMy(); show("scMy"); return; }
  if (play.mode === "run") {
    const R = runState();
    const m = R && R.mode === "play" ? Math.floor(R.dist / 2) : play.last, k = R && R.mode === "play" ? R.kira : play.kira;
    stopRunView();
    finishPlay(m, k);
  } else if (play.course) finishCourse(false);
  else finishPlay(stopTower());
};
/* ASMR：視点の 切りかえ（寄った 視点 ⇔ 一人称）・正面を むく */
/* 視点は 3つを じゅんばんに：よった してん → おいかけ → いちにんしょう。ボタンには「つぎの 視点」を 出す */
const VIEW_NAME = { near: "よった してん", chase: "おいかけ", fp: "いちにんしょう" };
const VIEW_NEXT = { near: "chase", chase: "fp", fp: "near" };
function viewToggle() {
  const v = towerToggleView();
  if (!v) return;
  $("pView").classList.toggle("on", v !== "near");
  $("pView").querySelector("span").textContent = VIEW_NAME[VIEW_NEXT[v]];
  pMsg(`👁 ${VIEW_NAME[v]}`, 800);
  sfx.tap();
}
function faceFront() { towerFaceFront(); sfx.tap(); }
/* 横画面：⤢ で 全画面に して 横向きに する（Android など、できる 端末だけ）。もう一度 おすと もどる */
const canFull = !!(document.documentElement.requestFullscreen && screen.orientation && screen.orientation.lock);
$("pFull").classList.toggle("hidden", !canFull);
async function toggleFull() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen({ navigationUI: "hide" });
      await screen.orientation.lock("landscape").catch(() => {});
    } else {
      try { screen.orientation.unlock(); } catch {}
      await document.exitFullscreen();
    }
  } catch { pMsg("この たんまつでは できないよ。よこに むけてね", 1400); }
  setTimeout(relayout, 150);
}
$("pFull").onclick = toggleFull;
/* 画面の 向きが かわった 時：少し まってから 3Dの 画面と レイアウトを なおす（Android は すぐには 大きさが かわらない ことが ある） */
function relayout() { towerResize(); runResize(); placeNorun(); }
for (const ev of ["orientationchange", "resize"]) addEventListener(ev, () => { relayout(); setTimeout(relayout, 250); setTimeout(relayout, 700); });
if (window.visualViewport) visualViewport.addEventListener("resize", () => setTimeout(relayout, 60));
if (screen.orientation) screen.orientation.addEventListener?.("change", () => setTimeout(relayout, 200));
function playSkillNow() { if (play && play.mode !== "run" && towerSkill()) sfx.boing(); }
for (const [id, fn] of [["pLeft", () => playMove(-1)], ["pRight", () => playMove(1)], ["pJump", playJumpNow], ["pSkill", playSkillNow], ["pView", viewToggle], ["pFront", faceFront]]) {
  const b = $(id);
  b.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); fn(); b.classList.add("press"); setTimeout(() => b.classList.remove("press"), 120); });
}
let pSwipe = null;
$("scPlayRun").addEventListener("pointerdown", (e) => { if (e.target.closest("button") || e.target.closest("#pStick") || !play || play.mode !== "run") return; pSwipe = { x: e.clientX, y: e.clientY }; });
/* ASMRタワー：画面を スワイプして 視点を まわす（パッド・ボタン いがいの 所。2本ゆびでも OK） */
const look = new Map();
$("scPlayRun").addEventListener("pointerdown", (e) => {
  if (!play || play.mode !== "asmr" || e.target.closest("button") || e.target.closest("#pStick")) return;
  look.set(e.pointerId, { x: e.clientX, y: e.clientY });
  try { $("scPlayRun").setPointerCapture(e.pointerId); } catch {}
});
$("scPlayRun").addEventListener("pointermove", (e) => {
  const p = look.get(e.pointerId);
  if (!p) return;
  towerLook(e.clientX - p.x, e.clientY - p.y);
  p.x = e.clientX; p.y = e.clientY;
});
for (const ev of ["pointerup", "pointercancel"]) $("scPlayRun").addEventListener(ev, (e) => look.delete(e.pointerId));
$("scPlayRun").addEventListener("pointerup", (e) => {
  if (!pSwipe) return;
  const dx = e.clientX - pSwipe.x, dy = e.clientY - pSwipe.y;
  pSwipe = null;
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) playMove(dx < 0 ? -1 : 1);
  else playJumpNow();     // タップ・上スワイプは ジャンプ
});
addEventListener("keydown", (e) => {
  if (screen !== "scPlayRun" || e.repeat || !play) return;
  if (play.mode === "run") {
    if (e.code === "ArrowLeft" || e.code === "KeyA") playMove(-1);
    if (e.code === "ArrowRight" || e.code === "KeyD") playMove(1);
    if (e.code === "ArrowUp" || e.code === "KeyW") { e.preventDefault(); playJumpNow(); }
  }
  if (e.code === "Space") { e.preventDefault(); playJumpNow(); }
  if (e.code === "ShiftLeft" || e.code === "KeyX") playSkillNow();
  if (play.mode === "asmr" && (e.code === "KeyQ" || e.code === "KeyE")) towerLook(e.code === "KeyQ" ? -60 : 60, 0);   // パソコン：Q・E で 視点を まわす
  if (play.mode === "asmr" && e.code === "KeyV") viewToggle();
  if (play.mode === "asmr" && e.code === "KeyF") faceFront();
});

/* =========================================================
   九九の段えらび
   ========================================================= */
let kDan = 1, kOrder = true;
function renderKuku() {
  const g = $("danGrid");
  g.innerHTML = "";
  for (let n = 1; n <= 9; n++) {
    let m = 0;
    for (let b = 1; b <= 9; b++) if ((data.kuku[`${n}x${b}`] || {}).lv >= 2) m++;
    const b = document.createElement("button");
    b.className = "dan" + (kDan === n ? " on" : "");
    b.innerHTML = `${n}の だん<small>${"★".repeat(Math.round(m / 3))}${"☆".repeat(3 - Math.round(m / 3))} おぼえた ${m}/9</small>`;
    b.onclick = () => { kDan = n; sfx.tap(); renderKuku(); };
    g.append(b);
  }
  $("kOrder").classList.toggle("on", kOrder);
  $("kRandom").classList.toggle("on", !kOrder);
  $("kNote").textContent = kOrder ? `${kDan}×1 から ${kDan}×9 まで じゅんばんに` : `${kDan}の だんを ばらばらに`;
}
$("kOrder").onclick = () => { kOrder = true; renderKuku(); };
$("kRandom").onclick = () => { kOrder = false; renderKuku(); };
$("kGo").onclick = () => startQuiz({ type: "kuku", dan: kDan, order: kOrder });
$("kukuBack").onclick = () => { renderMy(); show("scMy"); };

/* =========================================================
   年長：たしざん
   ========================================================= */
function renderKinder() {
  const open2 = data.kinder.correct1 >= KINDER.unlock;
  $("kLv2").disabled = !open2;
  $("kLv2").textContent = open2 ? "🍩 10までの たしざん" : "🔒 10までの たしざん";
  $("kLvNote").textContent = open2 ? "" : `5までで あと ${KINDER.unlock - data.kinder.correct1}もん せいかいすると ひらくよ`;
}
$("kLv1").onclick = () => startQuiz({ type: "kinder", level: 1 });
$("kLv2").onclick = () => startQuiz({ type: "kinder", level: 2 });
$("kindBack").onclick = () => { renderMy(); show("scMy"); };

/* =========================================================
   国語：コースえらび
   - 年長・小1：ひらがな（きいて えらぶ）／カタカナ（よみを えらぶ）
   - 小2〜小6：その学年の漢字（出題データに ことばが ある学年だけ）
   ========================================================= */
const KANJI_MODES = [
  { t: "yomi",  label: "🔤 よみ", note: "かんじの ことばを よむ" },
  { t: "erabi", label: "🈴 かんじえらび", note: "よみに あう かんじを えらぶ" },
  { t: "okuri", label: "✍️ おくりがな", note: "ただしい おくりがなを えらぶ" },
  { t: "mix",   label: "🎲 ミックス", note: "3つの もんだいが まざる" },
];
const kanjiGrade = () => (me.grade === "k" ? 0 : Number(me.grade.slice(1)));
/* 出題データの 並び順（教科書に 出てくる順）で、その学年の 配当漢字を ならべる */
function kanjiOrder(rows) { return [...new Set(rows.map((r) => r.k).filter(Boolean))]; }
/* 「ならった ところまで」の 行だけ（配当漢字が 空の行は いつも 出す） */
function kanjiRowsUpTo(gn) {
  const rows = store.getKanji().filter((r) => r.g === gn);
  const order = kanjiOrder(rows);
  const n = Math.min(order.length, data.kokugo.upto[gn] || order.length);
  const ok = new Set(order.slice(0, n));
  return { rows: rows.filter((r) => !r.k || ok.has(r.k)), order, n };
}
function renderKokugo() {
  const g = gradeOf(me.grade);
  const box = $("kokuBtns");
  box.innerHTML = "";
  const add = (html, cls, onclick, disabled) => {
    const b = document.createElement("button");
    b.className = "big " + cls; b.innerHTML = html; b.onclick = onclick; b.disabled = !!disabled;
    box.append(b);
  };
  let note = "";
  if (g.course === "kinder") {
    $("kokuTitle").textContent = "ひらがな・カタカナ";
    add("🔊 ひらがな<small>きいて、その もじの もんへ</small>", "", () => startQuiz({ type: "kana", kana: "hira" }), !canSpeak());
    add("🦊 カタカナ<small>みて、よみかたの もんへ</small>", "alt", () => startQuiz({ type: "kana", kana: "kata" }));
    if (!canSpeak()) note = "この たんまつでは よみあげが つかえないので、ひらがなは あそべません";
  } else {
    const gn = kanjiGrade();
    const { rows, order, n } = kanjiRowsUpTo(gn);
    const words = rows.filter((r) => !r.o).length, okuri = rows.filter((r) => r.o).length;
    $("kokuTitle").textContent = `${gn}ねんせいの かんじ`;
    if (words < 3) {
      note = "この 学年の かんじは じゅんびちゅうです。おうちのかたが 保護者画面で ことばを ふやすと あそべるよ";
    } else {
      KANJI_MODES.forEach((m, i) => {
        const off = m.t === "okuri" && okuri < 1;
        add(`${m.label}<small>${m.note}</small>`, ["", "alt", "kokugo", "gray"][i], () => startQuiz({ type: "kanji", grade: gn, kanji: m.t }), off);
      });
      note = `ことば ${words}こ・おくりがな ${okuri}こ から でるよ`;
      // ならった ところまで（教科書の じゅんばん）
      const wrap = document.createElement("div");
      wrap.className = "card";
      wrap.innerHTML = `<b>📚 ならった ところまで</b>
        <input type="range" id="kUpto" min="${Math.min(3, order.length)}" max="${order.length}" value="${n}" style="width:100%;margin:12px 0">
        <div class="note" id="kUptoNote"></div>`;
      box.append(wrap);
      const r = wrap.querySelector("#kUpto");
      const label = (v) => `きょうかしょの はじめから「${order[v - 1]}」まで（${v} / ${order.length}じ）${Number(v) === order.length ? "＝ ぜんぶ" : ""}`;
      wrap.querySelector("#kUptoNote").textContent = label(n);
      r.oninput = () => { wrap.querySelector("#kUptoNote").textContent = label(r.value); };
      r.onchange = () => { data.kokugo.upto[gn] = Number(r.value); save(); renderKokugo(); };
    }
  }
  $("kokuNote").textContent = note;
}
$("kokuBack").onclick = () => { renderMy(); show("scMy"); };

/* =========================================================
   クイズ
   ========================================================= */
let quiz = null;
/* 学習の入口（コース選び・復習）から、選択ランが始まる */
function startQuiz(opts) {
  $("resNext").classList.add("hidden");   // コースの「つぎの コース」ボタンは 学習の 結果では 出さない
  let qs;
  if (opts.type === "kinder") qs = kinderSession(KINDER.levels[opts.level - 1].max, SESSION.kinder);
  else if (opts.type === "kuku") qs = kukuSession(opts.dan, opts.order);
  else if (opts.type === "kana") qs = kanaSession(opts.kana, SESSION.kana);
  else if (opts.type === "kanji") qs = kanjiSession(kanjiRowsUpTo(opts.grade).rows, opts.grade, opts.kanji, SESSION.kanji);
  else qs = reviewSession(data.review, SESSION.review);
  if (!qs.length) return;
  quiz = { opts, qs, i: -1, correct: 0, earned: 0, streak: 0, marks: [], mastered: [], defeated: 0, added: 0 };
  const cfg = runCfg(qs);
  const h = HAT_COLORS.find((x) => x.id === data.hat) || HAT_COLORS[0];
  setRunHat(h.color);
  setRunPins(data.pins);
  $("qBox").classList.add("off");
  show("scQuiz");
  updateBar();
  startRunView({
    qs, values: qs.map((q) => (q.choices ? shuffle([...q.choices]) : makeChoices(q))),
    speed: cfg.speed, gap: cfg.gap, first: cfg.first,
    onFocus: focusQ, onPass: answer, onEnd: finishQuiz,
  });
}
/* 走る速さ：問題の種類から（ふくしゅうで まざる時は いちばん ゆっくりに あわせる） */
function runCfg(qs) {
  const course = gradeOf(me.grade).course;
  const keyOf = (q) => (q.kind === "kana" ? "kana" : q.kind === "kanji" ? "kanji" : q.kind === "kinder" ? "kinder" : course === "kinder" ? "kinder" : "kuku");
  const cfgs = [...new Set(qs.map(keyOf))].map((k) => RUN[k] || RUN.kuku);
  return cfgs.reduce((a, b) => (b.gap / b.speed > a.gap / a.speed ? b : a));
}
function updateBar() {
  $("qDots").innerHTML = quiz.qs.map((_, k) => `<i class="${quiz.marks[k] || (k === quiz.i ? "now" : "")}"></i>`).join("");
  $("qStreak").textContent = `🔥${quiz.streak}`;
  $("qPts").textContent = `⭐${points()}`;
}
/* つぎの門が いま考える問題になった */
function focusQ(i) {
  quiz.i = i;
  const q = quiz.qs[i];
  if (q.dots) {
    const row = (n, cls) => `<div class="dots ${cls}">${"<i></i>".repeat(n)}</div>`;
    $("qVis").innerHTML = `${row(q.a, "a")}<span class="plus">＋</span>${row(q.b, "b")}`;
    $("qText").textContent = "";
    $("qSub").textContent = `${q.a} たす ${q.b} は？`;
  } else if (q.kind === "kana" || q.kind === "kanji") {
    $("qVis").innerHTML = "";
    $("qText").textContent = q.text;
    $("qSub").textContent = q.sub;
  } else {
    $("qVis").innerHTML = "";
    $("qText").textContent = `${q.text} = ?`;
    $("qSub").textContent = "";
  }
  $("qText").classList.toggle("word", q.kind === "kana" || q.kind === "kanji");
  $("btnSpeak").classList.toggle("hidden", !canSpeak() || !q.speech);
  $("qBox").classList.remove("off");
  updateBar();
  // 年長・小1は 自動で読み上げ。「きいて えらぶ ひらがな」は どの学年でも 読み上げる
  if (q.speech && (gradeOf(me.grade).speak || q.type === "hira")) speak(q.speech);
}
$("btnSpeak").addEventListener("pointerdown", (e) => { e.stopPropagation(); if (quiz && quiz.i >= 0) speak(quiz.qs[quiz.i].speech); });

/* 門をくぐった：v が選んだ答え。正解なら true を返す（のるんは 止まらない） */
function answer(i, v) {
  const q = quiz.qs[i];
  const ok = v === q.ans;
  stopSpeak();
  data.totalAnswered++;
  if (ok) {
    quiz.correct++;
    quiz.streak++;
    data.totalCorrect++;
    data.days[today()] = (data.days[today()] || 0) + 1;
    data.bestStreak = Math.max(data.bestStreak, quiz.streak);
    let pt = POINTS.base;
    if (quiz.streak % POINTS.every === 0) { pt += POINTS.bonus; sfx.streak(); toast(`🔥 ${quiz.streak}れんぞく！ +${POINTS.bonus}`, 800); } else sfx.ok();
    data.points += pt;
    quiz.earned += pt;
    if (q.kind === "kana" || q.kind === "kanji") data.kokugo[q.kind]++;
    if (q.kind === "kinder") data.kinder[`correct${quiz.opts.level || (q.ans <= 5 ? 1 : 2)}`]++;
    judge("⭕", "#ff4d6d");
    flash("rgba(60,201,138,.16)");
  } else {
    quiz.streak = 0;
    sfx.ng();
    judge("❌", "#3b6bff");
    toast(`こたえは ${q.ans}`, TEMPO.ngShow + 250);
  }
  recordKuku(q, ok);
  recordReview(q, ok);
  quiz.marks[i] = ok ? "ok" : "ng";
  save();
  updateBar();
  if (i === quiz.qs.length - 1) $("qBox").classList.add("off");
  return ok;
}
let judgeT;
function judge(mark, color) {
  const j = $("judge");
  j.textContent = mark;
  j.style.color = color;
  j.classList.add("show");
  clearTimeout(judgeT);
  judgeT = setTimeout(() => j.classList.remove("show"), TEMPO.ngShow);
}
function flash(color) {
  const f = $("flash");
  f.style.background = color;
  f.style.opacity = 1;
  setTimeout(() => { f.style.opacity = 0; }, 120);
}

/* レーンの えらび方：画面の下の ◀ ▶ ボタン（1レーンずつ）／左右にスワイプ */
for (const [id, d] of [["btnLeft", -1], ["btnRight", 1]]) {
  const b = $(id);
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    moveLaneBy(d);
    sfx.tap();
    b.classList.add("press");
    setTimeout(() => b.classList.remove("press"), 120);
  });
}
let swipe = null;
$("scQuiz").addEventListener("pointerdown", (e) => {
  if (e.target.closest("button")) return;
  swipe = { x: e.clientX, y: e.clientY };
});
$("scQuiz").addEventListener("pointerup", (e) => {
  if (!swipe) return;
  const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
  swipe = null;
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { moveLaneBy(dx < 0 ? -1 : 1); sfx.tap(); }
});
addEventListener("keydown", (e) => {
  if (screen !== "scQuiz") return;
  if (e.code === "ArrowLeft") moveLaneBy(-1);
  if (e.code === "ArrowRight") moveLaneBy(1);
  if (e.code === "Digit1") moveLaneTo(0);
  if (e.code === "Digit2") moveLaneTo(1);
  if (e.code === "Digit3") moveLaneTo(2);
});

/* 九九：覚えたかどうか（lv 1=正解したことがある / 2=おぼえた） */
function recordKuku(q, ok) {
  if (q.kind !== "kuku") return;
  const k = `${q.a}x${q.b}`;
  const v = data.kuku[k] || { lv: 0, streak: 0, c: 0, w: 0 };
  if (ok) {
    v.c++; v.streak++;
    if (v.lv < 1) v.lv = 1;
    if (v.streak >= KUKU_MASTER_STREAK && v.lv < 2) { v.lv = 2; quiz.mastered.push(q.text); }
  } else {
    v.w++; v.streak = 0;
    if (v.lv === 2) v.lv = 1;
  }
  data.kuku[k] = v;
}
/* 復習：まちがえたら リストへ。リストにある問題を 2回つづけて正解したら 卒業 */
function recordReview(q, ok) {
  const r = data.review.find((x) => x.key === q.key);
  if (ok) {
    if (!r) return;
    r.streak++;
    if (r.streak >= REVIEW_GRADUATE) {
      data.review = data.review.filter((x) => x !== r);
      data.defeated++;
      quiz.defeated++;
      setTimeout(() => toast("⚔️ やっつけた！", 800), 120);
    }
  } else if (r) {
    r.streak = 0;
  } else {
    data.review.push({ key: q.key, q: { ...q }, streak: 0 });
    quiz.added++;
  }
}
function finishQuiz() {
  const n = quiz.qs.length;
  sfx.done();
  react("cheer");
  $("resBig").textContent = quiz.correct === n ? "ぜんもん せいかい！🎉" : `${n}もん ちゅう ${quiz.correct}もん せいかい！`;
  const lines = [`⭐ ポイント +${quiz.earned}（いま ${points()}）`];
  if (quiz.mastered.length) lines.push(`🌸 おぼえた！ ${quiz.mastered.join("、")}`);
  if (quiz.defeated) lines.push(`⚔️ ふくしゅうで ${quiz.defeated}こ やっつけた！`);
  if (quiz.added) lines.push(`🔁 ${quiz.added}こ ふくしゅうリストに いれたよ`);
  const nextHat = HAT_COLORS.find((h) => !data.hats.includes(h.id));
  if (nextHat) lines.push(points() >= nextHat.cost ? "👒 ぼうしの いろと こうかんできるよ！" : `👒 あと ${nextHat.cost - points()}ポイントで ぼうしの いろと こうかんできるよ`);
  for (const b of checkBadges()) {
    lines.push(`${b.icon} バッジ「${b.name}」を もらった！`);
    const pin = PINS.find((p) => p.badge === b.id);
    if (pin) lines.push(`${pin.icon} ぼうしの バッジ「${pin.name}」が つけられるように なった！`);
  }
  $("resText").textContent = lines.join("\n");
  play = null;
  show("scResult");
}
$("resAgain").onclick = () => {
  if (play) { startPlay(play.mode, play.course); return; }
  if (quiz.opts.type === "review" && !data.review.length) { renderMy(); show("scMy"); return; }
  startQuiz(quiz.opts);
};
$("resMy").onclick = () => { quiz = null; play = null; renderMy(); show("scMy"); };
$("qQuit").onclick = () => { stopSpeak(); stopRunView(); quiz = null; renderMy(); show("scMy"); };

/* =========================================================
   帽子の色と交換
   ========================================================= */
function renderPins() {
  $("pinSlots").innerHTML = data.pins.map((id, i) => {
    const p = PINS.find((x) => x.id === id);
    return `<div class="pinSlot ${p ? "on" : ""}">${p ? p.icon : ""}<small>${i + 1}</small></div>`;
  }).join("");
  const g = $("pinGrid");
  g.innerHTML = "";
  for (const p of PINS) {
    const has = hasPin(p), on = data.pins.includes(p.id);
    const b = document.createElement("button");
    b.className = "pinBtn" + (on ? " on" : "");
    b.disabled = !has;
    b.innerHTML = `<i>${p.icon}</i>${p.name}<span>${on ? "つけてる" : has ? "つける" : p.hint}</span>`;
    b.onclick = () => {
      const i = data.pins.indexOf(p.id);
      if (i >= 0) data.pins[i] = null;                     // はずす
      else {
        const free = data.pins.indexOf(null);
        if (free < 0) { toast("3こまで だよ。どれかを はずしてね", 1200); return; }
        data.pins[free] = p.id;                             // あいている スロットへ
      }
      sfx.tap();
      save();
      applyHat();
      react("ok");
      renderPins();
    };
    g.append(b);
  }
}
function renderShop() {
  renderPins();
  $("shopPts").textContent = `⭐ ポイント ${points()}（せいかいすると たまるよ）`;
  const g = $("hatGrid");
  g.innerHTML = "";
  for (const h of HAT_COLORS) {
    const has = data.hats.includes(h.id);
    const on = data.hat === h.id;
    const b = document.createElement("button");
    b.className = "hat" + (on ? " on" : "");
    b.innerHTML = `<span class="sw" style="background:${h.swatch}"></span>${h.name}<span class="note" style="margin:0">${on ? "かぶってる" : has ? "かぶる" : `⭐${h.cost}で こうかん`}</span>`;
    b.disabled = !has && points() < h.cost;
    b.onclick = () => {
      if (!has) {
        if (points() < h.cost) return;
        data.spent += h.cost;
        data.hats.push(h.id);
        sfx.streak();
        toast(`${h.name}を てにいれた！`, 1000);
      } else sfx.tap();
      data.hat = h.id;
      save();
      applyHat();
      react("ok");
      renderShop();
    };
    g.append(b);
  }
}
$("shopBack").onclick = () => { renderMy(); show("scMy"); };

/* =========================================================
   保護者：長押し → 暗証番号 → 保護者画面
   ========================================================= */
let pressT = null;
const pb = $("parentBtn");
pb.addEventListener("pointerdown", () => {
  const fill = pb.querySelector(".fill");
  fill.style.transition = "width 2s linear";
  fill.style.width = "100%";
  pressT = setTimeout(() => { fill.style.transition = "none"; fill.style.width = "0"; openPin(); }, 2000);
});
for (const ev of ["pointerup", "pointerleave", "pointercancel"]) {
  pb.addEventListener(ev, () => {
    clearTimeout(pressT);
    const fill = pb.querySelector(".fill");
    fill.style.transition = "none";
    fill.style.width = "0";
  });
}

let pin = "", pinMode = "enter", pinFirst = null, pinAfter = null;
function openPin(mode) {
  pinMode = mode || (store.getParentPin() ? "enter" : "set");
  pin = ""; pinFirst = null;
  renderPin();
  show("scPin");
}
function renderPin() {
  $("pinTitle").textContent = pinMode === "set" ? "暗証番号を決めてください" : "暗証番号";
  $("pinNote").textContent = pinMode === "set" ? (pinFirst ? "確認のため、もう一度入力してください" : "保護者画面に入るための4けたの数字です") : "4けたの数字を入力してください";
  $("pinShow").textContent = "●".repeat(pin.length) + "○".repeat(4 - pin.length);
  const pad = $("pinPad");
  if (!pad.children.length) {
    for (const k of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"]) {
      const b = document.createElement("button");
      b.textContent = k;
      if (!k) b.style.visibility = "hidden";
      b.onclick = () => pinKey(k);
      pad.append(b);
    }
  }
}
function pinKey(k) {
  if (k === "⌫") pin = pin.slice(0, -1);
  else if (pin.length < 4) pin += k;
  renderPin();
  if (pin.length < 4) return;
  setTimeout(() => {
    if (pinMode === "enter") {
      if (pin === store.getParentPin()) { openParent(); }
      else { pin = ""; renderPin(); toast("番号がちがいます", 1000); }
    } else if (!pinFirst) {
      pinFirst = pin; pin = ""; renderPin();
    } else if (pinFirst === pin) {
      store.setParentPin(pin);
      toast("暗証番号を設定しました", 1000);
      openParent();
    } else {
      pinFirst = null; pin = ""; renderPin(); toast("一致しませんでした。最初から", 1200);
    }
  }, 120);
}
$("pinBack").onclick = () => { renderTitle(); show("scTitle"); };

let newFace = FACES[0];
function openParent() {
  if (!kj.dirty) kjLoad();
  renderParent();
  renderKj();
  show("scParent");
}
function gradeOptions(sel) {
  return GRADES.map((g) => `<option value="${g.id}" ${g.id === sel ? "selected" : ""}>${g.name}</option>`).join("");
}
function renderPlaySettings() {
  const st = store.getSettings();
  $("setBgm").checked = st.bgm;
  $("setSe").checked = st.se;
  const s = audioStatus();
  const got = Object.entries(s).filter(([, v]) => v).map(([k]) => k);
  $("audioFiles").textContent = got.length ? `読みこめた 音の ファイル：${got.join("、")}` : "音の ファイルは まだ ありません（効果音は ブラウザの音で 鳴ります。BGM は ファイルを 入れると 鳴ります）";
  const cur = st.runSpeed;
  $("setRunSpeed").innerHTML = RUN_SPEEDS.map((s) => `<option value="${s.id}" ${s.id === cur ? "selected" : ""}>${s.name}（${s.speed}）</option>`).join("");
}
$("setBgm").onchange = (e) => { store.setSettings({ bgm: e.target.checked }); setAudioPrefs({ bgm: e.target.checked }); };
$("setSe").onchange = (e) => { store.setSettings({ se: e.target.checked }); setAudioPrefs({ se: e.target.checked }); if (e.target.checked) sfx.ok(); };
$("setRunSpeed").onchange = (e) => { store.setSettings({ runSpeed: e.target.value }); toast("保存しました", 900); };
function renderParent() {
  renderPlaySettings();
  const list = $("pList");
  list.innerHTML = "";
  const profs = store.listProfiles();
  if (!profs.length) list.innerHTML = `<p class="note">まだありません。下から追加してください。</p>`;
  for (const p of profs) {
    const d = store.loadData(p.id);
    const row = document.createElement("div");
    row.className = "pRow";
    row.innerHTML = `<span class="face">${esc(p.face || "🐰")}</span>
      <div><b style="font-size:20px">${esc(p.name)}</b>
        <div class="note">正解 ${d.totalCorrect}／${d.totalAnswered}問・おぼえた九九 ${Object.values(d.kuku).filter((v) => v.lv >= 2).length}/81・復習 ${d.review.length}・ポイント ${d.points - d.spent}・ラン ${d.play.run.best}m・アスレ ${d.play.tower.best}m・ASMR ${d.play.asmr.best}m・合言葉 ${d.pass ? "設定ずみ" : "未設定"}</div>
        <div class="ctl">学年 <select data-g>${gradeOptions(p.grade)}</select>
          <button class="small gray" data-pass>合言葉をリセット</button>
          <button class="small danger" data-del>データを消す</button></div>
      </div>`;
    row.querySelector("[data-g]").onchange = (e) => { store.updateProfile(p.id, { grade: e.target.value }); toast("学年を変更しました"); renderParent(); };
    row.querySelector("[data-pass]").onclick = () => confirmDo(`「${p.name}」の合言葉をリセットしますか？`, "次に入るときに、新しい合言葉を選びます", "リセットする", () => { store.resetPass(p.id); toast("リセットしました"); openParent(); });
    row.querySelector("[data-del]").onclick = () => confirmDo(`「${p.name}」のデータを消しますか？`, "記録・持ち物・復習リストがすべて消えます。元に戻せません。", "消す", () => { store.deleteProfile(p.id); toast("消しました"); openParent(); });
    list.append(row);
  }
  $("newGrade").innerHTML = gradeOptions("k");
  const fs = $("newFaces");
  fs.innerHTML = "";
  for (const f of FACES) {
    const b = document.createElement("button");
    b.textContent = f;
    b.className = f === newFace ? "on" : "";
    b.onclick = () => { newFace = f; renderFaces(); };
    fs.append(b);
  }
}
function renderFaces() { [...$("newFaces").children].forEach((b) => b.classList.toggle("on", b.textContent === newFace)); }
$("btnAdd").onclick = () => {
  const name = $("newName").value.trim();
  if (!name) { toast("名前を入れてください"); return; }
  store.createProfile(name, $("newGrade").value, newFace);
  $("newName").value = "";
  toast(`「${name}」を追加しました`);
  renderParent();
};
$("parentBack").onclick = () => {
  const close = () => { kj.dirty = false; renderTitle(); show("scTitle"); };
  if (kj.dirty) confirmDo("保存していない 漢字データの変更があります", "保存せずに とじると、変更は なくなります", "保存せずに とじる", close);
  else close();
};

/* ---------- 漢字の出題データ（表で 確認・編集） ---------- */
const kj = { rows: [], dirty: false, grade: 4, limit: 80, changed: new Set() };
function kjLoad() {
  kj.rows = store.getKanji();
  kj.dirty = false;
  kj.changed = new Set();
  kj.limit = 80;
  $("kjMsg").textContent = store.isKanjiCustom() ? "保護者が 編集した データを 使っています" : "最初のデータを 使っています";
}
function renderKj() {
  const cnt = (g) => kj.rows.filter((r) => r.g === g).length;
  $("kjGrade").innerHTML = [1, 2, 3, 4, 5, 6].map((g) => `<option value="${g}" ${g === kj.grade ? "selected" : ""}>${g}年（${cnt(g)}行）</option>`).join("");
  const f = $("kjFilter").value.trim();
  const idx = [];
  kj.rows.forEach((r, i) => { if (r.g === kj.grade && (!f || r.k.includes(f) || r.w.includes(f) || r.y.includes(f))) idx.push(i); });
  const body = $("kjBody");
  body.innerHTML = idx.slice(0, kj.limit).map((i) => {
    const r = kj.rows[i];
    const bad = store.checkKanjiRow(r);
    const cell = (k, w) => `<td><input data-i="${i}" data-k="${k}" value="${esc(r[k])}" maxlength="${w}" autocomplete="off"></td>`;
    return `<tr class="${bad ? "bad" : kj.changed.has(r) ? "changed" : ""}" title="${esc(bad)}">${cell("k", 2)}${cell("w", 8)}${cell("y", 10)}${cell("o", 5)}<td><button class="kjDel" data-del="${i}" aria-label="けす">✕</button></td></tr>`;
  }).join("") || `<tr><td colspan="5" class="note" style="padding:10px">この学年の データは まだありません。「＋ 行を追加」で ふやせます。</td></tr>`;
  const words = kj.rows.filter((r) => r.g === kj.grade && !r.o).length;
  $("kjCount").textContent = `${idx.length}行（熟語 ${words}・送り仮名 ${cnt(kj.grade) - words}）`;
  $("kjMore").classList.toggle("hidden", idx.length <= kj.limit);
}
$("kjGrade").onchange = (e) => { kj.grade = Number(e.target.value); kj.limit = 80; renderKj(); };
$("kjFilter").oninput = () => { kj.limit = 80; renderKj(); };
$("kjMore").onclick = () => { kj.limit += 120; renderKj(); };
$("kjBody").addEventListener("input", (e) => {
  const el = e.target;
  if (!el.dataset.k) return;
  const r = kj.rows[Number(el.dataset.i)];
  r[el.dataset.k] = el.value.trim();
  kj.dirty = true;
  kj.changed.add(r);
  const bad = store.checkKanjiRow(r);
  const tr = el.closest("tr");
  tr.className = bad ? "bad" : "changed";
  tr.title = bad;
  $("kjMsg").textContent = bad ? `⚠ ${bad}` : "まだ 保存していません";
});
$("kjBody").addEventListener("click", (e) => {
  const b = e.target.closest("[data-del]");
  if (!b) return;
  kj.rows.splice(Number(b.dataset.del), 1);
  kj.dirty = true;
  $("kjMsg").textContent = "まだ 保存していません";
  renderKj();
});
$("kjAdd").onclick = () => {
  const r = { g: kj.grade, k: "", w: "", y: "", o: "" };
  kj.rows.unshift(r);
  kj.changed.add(r);
  kj.dirty = true;
  $("kjFilter").value = "";
  renderKj();
  const first = $("kjBody").querySelector("input");
  if (first) first.focus();
};
$("kjSave").onclick = () => {
  const rows = kj.rows.filter((r) => r.k || r.w || r.y || r.o);   // まったく空の行は すてる
  const seen = new Set();
  for (const r of rows) {
    let bad = store.checkKanjiRow(r);
    const key = `${r.g}|${r.w}|${r.o ? "o" : ""}`;
    if (!bad && seen.has(key)) bad = "同じ ことばが 2回あります";
    seen.add(key);
    if (bad) {
      kj.grade = r.g;
      $("kjFilter").value = r.w || r.y || "";
      renderKj();
      $("kjMsg").textContent = `⚠ 保存できません：${r.g}年「${r.w || "（空）"}」… ${bad}`;
      return;
    }
  }
  if (!store.setKanji(rows)) { $("kjMsg").textContent = "⚠ 保存できませんでした（端末の空きを確認してください）"; return; }
  kjLoad();
  renderKj();
  $("kjMsg").textContent = `保存しました（${rows.length}行）。次の こくごから 使われます`;
  toast("保存しました", 1000);
};
$("kjReset").onclick = () => confirmDo("漢字の出題データを 最初のデータに戻しますか？", "保護者画面で 直した・ふやした 行は なくなります（子どもの記録は 消えません）", "戻す", () => {
  store.resetKanji(); kjLoad(); show("scParent"); renderKj(); toast("最初のデータに戻しました", 1200);
});
$("btnPinChange").onclick = () => openPin("set");

/* バックアップ */
const backupText = () => JSON.stringify(store.exportAll());
$("btnExport").onclick = () => {
  const blob = new Blob([backupText()], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `norun-manabi-backup-${today()}.json`;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  $("ioMsg").textContent = "書き出しました（ダウンロード／ファイルに保存されます）";
};
$("btnCopy").onclick = async () => {
  try { await navigator.clipboard.writeText(backupText()); $("ioMsg").textContent = "コピーしました。メモなどに貼りつけて保管してください"; }
  catch { $("importText").value = backupText(); $("ioMsg").textContent = "コピーできなかったので、下の欄に表示しました。全部選んでコピーしてください"; }
};
$("btnImport").onclick = async () => {
  let text = $("importText").value.trim();
  const f = $("importFile").files[0];
  if (f) text = await f.text();
  if (!text) { $("ioMsg").textContent = "ファイルを選ぶか、テキストを貼りつけてください"; return; }
  let obj;
  try { obj = JSON.parse(text); } catch { $("ioMsg").textContent = "読みこめませんでした（形式がちがいます）"; return; }
  confirmDo("バックアップを読みこみますか？", "いまのデータはすべて置きかわります", "読みこむ", () => {
    try { store.importAll(obj); toast("読みこみました", 1200); } catch (e) { toast(e.message, 1600); }
    $("importText").value = ""; $("importFile").value = "";
    kj.dirty = false;
    openParent();
  });
};

/* 確認画面（ブラウザの確認ダイアログは使わない） */
let cfAction = null, cfBack = null;
function confirmDo(text, note, yes, action) {
  cfAction = action;
  cfBack = screen;
  $("cfText").textContent = text;
  $("cfNote").textContent = note;
  $("cfYes").textContent = yes;
  show("scConfirm");
}
$("cfYes").onclick = () => { const a = cfAction; cfAction = null; if (a) a(); };
$("cfNo").onclick = () => { cfAction = null; show(cfBack || "scTitle"); };

/* =========================================================
   起動
   ========================================================= */
/* イラストの わく：assets/ui/ に 画像が あれば 絵文字の かわりに つかう（なければ 絵文字の まま）。くわしくは ILLUST.md */
const uiOk = new Map();
function uiImage(name) {
  if (!uiOk.has(name)) uiOk.set(name, new Promise((ok) => { const im = new Image(); im.onload = () => ok(true); im.onerror = () => ok(false); im.src = `assets/ui/${name}.png`; }));
  return uiOk.get(name);
}
function applyUiImages(root = document) {
  for (const el of root.querySelectorAll("[data-ui]")) {
    const name = el.dataset.ui;
    uiImage(name).then((ok) => { if (ok && !el.querySelector("img")) el.innerHTML = `<img src="assets/ui/${name}.png" alt="">`; });
  }
}
uiImage("logo").then((ok) => { if (ok) { const t = $("logoText"); t.insertAdjacentHTML("beforebegin", `<img id="logoImg" src="assets/ui/logo.png" alt="のるん まなび">`); t.classList.add("hidden"); } });
uiImage("bg-pattern").then((ok) => { if (ok) document.body.classList.add("uiBg"); });
applyUiImages();
try {
  await Promise.all([loadNorun3D(), initRunView(), document.fonts ? document.fonts.load('800 40px "NorunMaru"').catch(() => {}) : null]);
} catch (e) {
  console.warn("のるんのモデルを読めませんでした", e);
  canvas.style.display = "none";
}
$("loading").classList.add("hidden");
renderTitle();
show("scTitle");

if (DEBUG) {
  window.G = {
    store, get me() { return me; }, get data() { return data; }, get quiz() { return quiz; }, get screen() { return screen; },
    enter, startQuiz, renderMy, show, openParent, moveLaneTo, runState, laneNow, renderKokugo, startPlay, towerState, towerStick, towerJump, towerSkill, towerTeleport, towerLook, towerCam, towerToggleView, towerFaceFront, towerDebugHook, get play() { return play; },
  };
  document.title = "ready";
}
