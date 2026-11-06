/* =========================================================
   のるん まなび 設定データ（数字や絵はここだけ直せば変えられる）
   ========================================================= */

/* 学年。course: その学年で遊ぶ算数のコース（kinder=ドットのたし算 / kuku=九九） */
export const GRADES = [
  { id: "k",  name: "ねんちょう", course: "kinder", speak: true },
  { id: "g1", name: "しょう1",   course: "kinder", speak: true },
  { id: "g2", name: "しょう2",   course: "kuku" },
  { id: "g3", name: "しょう3",   course: "kuku" },
  { id: "g4", name: "しょう4",   course: "kuku" },
  { id: "g5", name: "しょう5",   course: "kuku" },
  { id: "g6", name: "しょう6",   course: "kuku" },
];
export const gradeOf = (id) => GRADES.find((g) => g.id === id) || GRADES[0];

/* プロフィールのアイコン（名前の横に出る） */
export const FACES = ["🐰", "🐻", "🦊", "🐼", "🐸", "🐯", "🐨", "🐧", "🦄", "🐳"];

/* 合言葉の絵（ここから3つえらぶ。じゅんばんは関係なし） */
export const PASS_ICONS = ["🍎", "🐶", "🐱", "🚗", "⭐", "🌸", "🍩", "🐟", "🎈", "🌙", "🍓", "🦖"];

/* テンポ（ミリ秒） */
export const TEMPO = {
  ngShow: 550,      // まちがえた時に 正解の門を光らせる時間
};

/* 選択ラン：のるんが走りつづけ、答えの門（3レーン）を くぐって答える
   speed: 走る速さ / gap: 門と門の間かく / first: さいしょの門までの きょり
   → 問題が出てから 門に着くまでの 考える時間 ＝ gap ÷ speed 秒（年長 約7秒・九九 約5.5秒） */
export const RUN = {
  kinder: { speed: 7, gap: 50, first: 42 },
  kuku:   { speed: 9, gap: 50, first: 42 },
  kana:   { speed: 7, gap: 50, first: 42 },   // 国語：ひらがな・カタカナ（年長）
  kanji:  { speed: 8, gap: 52, first: 44 },   // 国語：漢字（ことばを 読む時間を すこし長めに）
  laneW: 2.4,            // レーンの はば
  endRun: 1.4,           // さいごの門のあと、結果が出るまでの秒数
};

/* 1回の問題の数 */
export const SESSION = { kinder: 10, kuku: 9, review: 10, kana: 10, kanji: 10 };

/* 年長コース：レベル1=5まで / レベル2=10まで。レベル2は レベル1で unlock 問 正解すると あく */
export const KINDER = { levels: [{ id: 1, max: 5 }, { id: 2, max: 10 }], unlock: 20 };

/* 九九：何回つづけて正解したら「おぼえた」か */
export const KUKU_MASTER_STREAK = 3;

/* 復習：何回つづけて正解したら卒業か */
export const REVIEW_GRADUATE = 2;

/* ポイント：正解1問で base、れんぞく正解 every 問ごとに bonus をおまけ */
export const POINTS = { base: 1, every: 5, bonus: 3 };

/* ごほうび：帽子の色（のるんランと同じ色）。cost はポイント */
export const HAT_COLORS = [
  { id: "default", name: "むらさき", color: null,     swatch: "#4b2a63", cost: 0 },
  { id: "pink",    name: "ピンク",   color: 0xff8fc8, swatch: "#ff8fc8", cost: 30 },
  { id: "sky",     name: "そらいろ", color: 0x6cc0ff, swatch: "#6cc0ff", cost: 30 },
  { id: "mint",    name: "ミント",   color: 0x5fe0b0, swatch: "#5fe0b0", cost: 30 },
  { id: "yellow",  name: "きいろ",   color: 0xffd84d, swatch: "#ffd84d", cost: 40 },
  { id: "red",     name: "あか",     color: 0xff5a4f, swatch: "#ff5a4f", cost: 40 },
  { id: "orange",  name: "オレンジ", color: 0xff9a4d, swatch: "#ff9a4d", cost: 40 },
  { id: "navy",    name: "こん",     color: 0x3a4fb0, swatch: "#3a4fb0", cost: 50 },
  { id: "white",   name: "しろ",     color: 0xffffff, swatch: "#f4f0ff", cost: 50 },
  { id: "black",   name: "くろ",     color: 0x3a3a44, swatch: "#3a3a44", cost: 60 },
];

/* =========================================================
   遊びモード（問題なし）
   ========================================================= */
/* ラン：のるんランと同じ 3レーン・障害物・ジャンプ。ぶつかるまで エンドレス
   speed: はじめの速さ / speedUp: 100m ごとに 上がる速さ / maxSpeed: いちばん速い
   rowGap: 障害物の列の間かく（はじめ）→ rowGapMin まで だんだん せまく
   patterns: 障害物の ならび（L=ひくい→ジャンプ / T=たかい→よける）。from: この距離(m)から 出る */
export const PLAY_RUN = {
  // はじめの速さは 保護者画面で えらべる（RUN_SPEEDS）。ここの speed は 「ふつう」の時の値
  // 速くした ぶん、障害物の 列の間かくも ひろげて 考える時間（約1.3秒）は 前と同じくらいに
  speed: 13.5, speedUp: 0.5, maxSpeed: 18,
  rowGap: 18, rowGapMin: 13, gapShrinkPer100: 0.4,
  jumpV: 8.6, gravity: 22, hopV: 3.4,
  patterns: [
    { w: 3, from: 0,   rows: ["L..", ".L.", "..L"] },
    { w: 3, from: 0,   rows: ["T..", ".T.", "..T"] },
    { w: 2, from: 60,  rows: ["TT.", "T.T", ".TT"] },
    { w: 1, from: 120, rows: ["LLL"] },
    { w: 2, from: 250, rows: ["TL.", "LT.", ".TL", ".LT", "T.L", "L.T"] },
    { w: 1, from: 400, rows: ["TLT", "LTT", "TTL"] },
  ],
};
/* ランの はじめの速さ（保護者画面で えらぶ。端末ごとに 保存）
   maxSpeed は それぞれの いちばん速い値
   （2026-11-07：アイテムなしでも じゅうぶん 速いように、ぜんぶ 引き上げ。
     前の「ふつう＋ながれぼし」＝ 10×1.35 ≒ 13.5 が 今の「ふつう」） */
export const RUN_SPEEDS = [
  { id: "slow",   name: "ゆっくり", speed: 11,   maxSpeed: 15 },
  { id: "normal", name: "ふつう",   speed: 13.5, maxSpeed: 18 },
  { id: "fast",   name: "はやい",   speed: 16,   maxSpeed: 20 },
];
/* ランの アイテム
   kira（キラキラ）：ならんで出る。とると かず が ふえる（記録とバッジに）。ジャンプの 山なりに ならぶことも
   star（ながれぼし）：ボーナス。とると 4秒 むてき（障害物が はじけとぶ）＋ キラキラを すいよせる。
                     速さは ほんの少し（×dash）だけ。素の速さは アイテムなしで じゅうぶんに してある
   bubble（シャボン）：とると のるんを つつむ。1回だけ ぶつかっても だいじょうぶ
   every：だいたい この距離（マス）ごとに 1回 出る / from：この距離(m)から 出る */
export const RUN_ITEMS = {
  kira:   { every: 22, from: 0 },
  star:   { every: 260, from: 40, time: 4, dash: 1.1, magnet: 9 },
  bubble: { every: 420, from: 80 },
};

/* 塔（タワーアスレ）：コースの部品を 自動で 上へ つないで のぼりつづける。頂上なし
   のるんは バーチャルパッド（まるい スティック）を たおした 方向にだけ 進む。はなすと 止まる
   speed: いちばん たおした時の 歩く速さ。ジャンプは ボタンで 段・すき間・バーを こえる
   落ちたら すぐ 直前の チェックポイント（旗）から（何回でも OK。記録は へらない）
   speed: 前へ進む速さ（高さ1mごとに +speedUp、maxSpeed まで）
   stepUp: これより ひくい段は ジャンプなしで のぼれる（かいだん）
   parts: 部品と 出はじめる高さ(m)・出やすさ */
export const PLAY_TOWER = {
  laneW: 2.4, speed: 5.2, speedUp: 0, maxSpeed: 5.2,
  jumpV: 8.6, gravity: 22, stepUp: 0.45, padV: 12.8,
  parts: {
    stairs: { from: 0,  w: 3 },   // かいだん（自動で のぼる）
    gaps:   { from: 0,  w: 3 },   // すき間を ジャンプ
    steps:  { from: 2,  w: 3 },   // はしごの ような 高い段（ジャンプで のぼる）
    pad:    { from: 4,  w: 2 },   // ジャンプ台 → 高いかべの 上へ
    zigzag: { from: 8,  w: 2 },   // 1本道が 左右に ずれる
    mover:  { from: 12, w: 2 },   // 左右に 動く足場
    bar:    { from: 16, w: 2 },   // 回るバー（ジャンプで よける。当たっても 少し もどるだけ）
    vanish: { from: 3,  w: 2 },   // 消える足場（のって 少しすると 消える → また もどる）
    conveyor:{ from: 6, w: 2 },   // 流れる床（のると 横や 後ろへ 流される）
    door:   { from: 5,  w: 2 },   // スイッチで 開く扉（スイッチを ふむと 開く）
    wind:   { from: 10, w: 2 },   // 横風の 区間（風で 流される。白い すじと 扇風機で 風が 見える）
    // とくぎの 部品（その キャラを えらんだ時だけ 出る）
    duck:   { from: 2,  w: 3, char: "pan" },      // ひくい トンネル（パンの「すべる」で くぐる）
    wide:   { from: 2,  w: 3, char: "kurage" },   // ひろい すき間（くらげの 二段ジャンプ・ふわり で こえる）
  },
  vanishT: 0.9, vanishOff: 2.4,   // 消える足場：のってから 消えるまで（秒）／消えている 時間
  conveyorV: 2.0,                 // 流れる床の 速さ（歩く速さ 5.2 より おそい）
  windV: 2.4,                     // 横風の 強さ
  slideT: 1.0, slideV: 7.0,       // パンの すべる：時間（秒）と 速さ
  floatG: 0.32, floatMaxFall: 3.0,   // くらげの ふわり：落ちる時の 重力の 割合・いちばん速い 落ちる速さ
};

/* アスレで えらべる キャラ（変身）。unlock は あとで 条件を つける時に つかう（null＝はじめから）
   例：unlock: "c200"（記録バッジ c200 を もっていたら えらべる）
   skills：doubleJump＝空中で もう1回 ジャンプ / floatFall＝ゆっくり 落ちる / slide＝すべる（ひくい所を くぐる） */
export const CHARACTERS = [
  { id: "norun",  icon: "🐱", name: "のるん", model: "assets/models/norun-v7.glb",     scale: 0.8, unlock: null, skills: {}, note: "ふつうの のるん" },
  { id: "kurage", icon: "🪼", name: "くらげ", model: "assets/models/norun-kurage.glb", scale: 0.8, unlock: null, skills: { doubleJump: true, floatFall: true }, note: "二段ジャンプ・ふわりと おちる" },
  { id: "pan",    icon: "🍞", name: "パン",   model: "assets/models/norun-pan.glb",    scale: 0.8, unlock: null, skills: { slide: true }, note: "すべって ひくい所を くぐる" },
];
/* パンの すべる ポーズ（モデル担当より）：X軸まわりに +90°（顔が下・うらが上）。
   接地の高さ：耳の ふちだけなら 0.24、顔と舌も 地面の上に 出すなら 0.33（モデルの 単位） */
export const PAN_SLIDE = { rotX: Math.PI / 2, y: 0.33 };

/* ASMRタワー：区間ごとに 素材テーマが かわる タワーアスレ
   テーマごとに：足場の色・もよう／足音（assets/audio/step_<id>.mp3・land_<id>.mp3）／歩く速さ・ジャンプの高さ・すべり・はね・しずみこみ
   walk：歩く速さの 倍率 / jump：ジャンプの 倍率 / grip：止まりやすさ（小さいほど つるつる すべる）
   bounce：着地した時に 自動で はねる 強さ（0＝はねない）/ sink：着地の しずみこみ（見た目） / stepEvery：足音の 間かく（歩数）
   ※ いまは 3テーマ（たたき台）。テーマを ふやす時は ここに 足して、tower3d.js の THEME_LOOK に 見た目を 足す */
export const ASMR_THEMES = [
  { id: "shari", name: "しゃりしゃり", sub: "かきごおり", walk: 1.0, jump: 1.0, grip: 3.5, bounce: 0,   sink: 0.12, stepEvery: 1 },
  { id: "puni",  name: "ぷにぷに",     sub: "グミ",       walk: 1.0, jump: 1.3, grip: 16,  bounce: 4.2, sink: 0.38, stepEvery: 1 },
  { id: "neba",  name: "ねばねば",     sub: "はちみつ",   walk: 0.6, jump: 0.8, grip: 30,  bounce: 0,   sink: 0.22, stepEvery: 2 },
];
export const ASMR = { sectionParts: 4 };   // 1テーマで いくつ 部品を つなぐか

/* バッジ（決まり：ごほうびは 勉強でのみ。遊びの ラン・塔は 記録だけで、バッジは 出さない）。マイページに ならぶ */
export const BADGES = [
  { id: "c50",   icon: "🌱", name: "せいかい 50",   test: (d) => d.totalCorrect >= 50 },
  { id: "c200",  icon: "🌳", name: "せいかい 200",  test: (d) => d.totalCorrect >= 200 },
  { id: "c500",  icon: "🏆", name: "せいかい 500",  test: (d) => d.totalCorrect >= 500 },
  { id: "st10",  icon: "🔥", name: "10れんぞく",    test: (d) => d.bestStreak >= 10 },
  { id: "def10", icon: "⚔️", name: "ふくしゅう 10", test: (d) => d.defeated >= 10 },
  { id: "kuku",  icon: "🌸", name: "くく ぜんぶ",   test: (d) => Object.values(d.kuku).filter((v) => v.lv >= 2).length >= 81 },
  { id: "kok100", icon: "📖", name: "こくご 100",  test: (d) => d.kokugo.kana + d.kokugo.kanji >= 100 },
];

/* 帽子に つける バッジ（モデルの Slot_1〜3 に 入っている 6種）。最大3こ つけられる
   badge：この 記録バッジを もらうと つかえる（null は はじめから）。条件は 勉強だけ（遊びでは もらえない） */
export const PINS = [
  { id: "panda", icon: "🐼", name: "パンダ",   badge: null,      hint: "はじめから" },
  { id: "star",  icon: "⭐", name: "ほし",     badge: "c50",     hint: "せいかい 50で" },
  { id: "heart", icon: "💗", name: "ハート",   badge: "def10",   hint: "ふくしゅうで 10こ やっつけると" },
  { id: "paw",   icon: "🐾", name: "あしあと", badge: "c200",    hint: "せいかい あわせて 200で" },
  { id: "moon",  icon: "🌙", name: "つき",     badge: "c500",    hint: "せいかい あわせて 500で" },
  { id: "fish",  icon: "🐟", name: "さかな",   badge: "kok100",  hint: "こくごで 100もん せいかいすると" },
];
