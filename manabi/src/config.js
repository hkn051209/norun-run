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
  laneW: 2.4,            // レーンの はば
  endRun: 1.4,           // さいごの門のあと、結果が出るまでの秒数
};

/* 1回の問題の数 */
export const SESSION = { kinder: 10, kuku: 9, review: 10 };

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
