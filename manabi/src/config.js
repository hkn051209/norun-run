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
  speed: 10, speedUp: 0.5, maxSpeed: 15,
  rowGap: 14, rowGapMin: 10, gapShrinkPer100: 0.4,
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
   maxSpeed は それぞれの いちばん速い値 */
export const RUN_SPEEDS = [
  { id: "slow",   name: "ゆっくり", speed: 8,  maxSpeed: 13 },
  { id: "normal", name: "ふつう",   speed: 10, maxSpeed: 15 },
  { id: "fast",   name: "はやい",   speed: 12, maxSpeed: 17 },
];
/* ランの アイテム
   kira（キラキラ）：ならんで出る。とると かず が ふえる（記録とバッジに）。ジャンプの 山なりに ならぶことも
   star（ながれぼし）：とると 3秒 ダッシュ（速さ ×dash）＋ むてき（ぶつかっても 障害物が はじけとぶ）
   bubble（シャボン）：とると のるんを つつむ。1回だけ ぶつかっても だいじょうぶ
   every：だいたい この距離（マス）ごとに 1回 出る / from：この距離(m)から 出る */
export const RUN_ITEMS = {
  kira:   { every: 22, from: 0 },
  star:   { every: 260, from: 40, time: 3, dash: 1.35 },
  bubble: { every: 420, from: 80 },
};

/* 塔（タワーアスレ）：コースの部品を 自動で 上へ つないで のぼりつづける。頂上なし
   のるんは 自動で 前へ進む。◀ ▶ で レーン、ジャンプで 段・すき間・バーを こえる
   落ちたら すぐ 直前の チェックポイント（旗）から（何回でも OK。記録は へらない）
   speed: 前へ進む速さ（高さ1mごとに +speedUp、maxSpeed まで）
   stepUp: これより ひくい段は ジャンプなしで のぼれる（かいだん）
   parts: 部品と 出はじめる高さ(m)・出やすさ */
export const PLAY_TOWER = {
  laneW: 2.4, speed: 5.0, speedUp: 0.012, maxSpeed: 6.4,
  jumpV: 8.6, gravity: 22, stepUp: 0.45, padV: 12.8,
  parts: {
    stairs: { from: 0,  w: 3 },   // かいだん（自動で のぼる）
    gaps:   { from: 0,  w: 3 },   // すき間を ジャンプ
    steps:  { from: 2,  w: 3 },   // はしごの ような 高い段（ジャンプで のぼる）
    pad:    { from: 4,  w: 2 },   // ジャンプ台 → 高いかべの 上へ
    zigzag: { from: 8,  w: 2 },   // 1本道が 左右に ずれる
    mover:  { from: 12, w: 2 },   // 左右に 動く足場
    bar:    { from: 16, w: 2 },   // 回るバー（ジャンプで よける。当たっても 少し もどるだけ）
  },
};

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
