/* =========================================================
   のるんラン 設定データ
   ステージ・変身・難易度はここだけ直せば増やせる・調整できるようにしてある
   ========================================================= */

/* ---- 難易度（算数モード側で選ぶ） ---- */
export const DIFFICULTIES = [
  { id: "easy",   name: "かんたん",       note: "●を かぞえて こたえる（10まで）", dots: true },
  { id: "normal", name: "たしざん・ひきざん", note: "20までの たしざん・ひきざん" },
  { id: "kuku",   name: "かけざん",       note: "くくの かけざん" },
];

/* ---- 変身（図鑑） ----
   ランタイプでは「見た目」と図鑑コレクションだけ（計算する時間を減らさないよう、速さなどは変えない）。
   ability はアスレタイプ／塔モードで使う特技（ランでは使わない）。
   look: ランでの見た目。body=体の色（元の色に掛ける） / opacity=透け具合 / addon=しっぽ・あし など */
export const FORMS = [
  { id: "norun", name: "のるん", art: "🧙", ability: null,
    desc: "いつもの のるん。ぷにぷに はねて すすむよ", look: {} },
  { id: "cat",   name: "ねこ",   art: "🐱", ability: "fast",
    desc: "しっぽが ふりふり。アスレでは はやく はしれるよ（じゅんびちゅう）",
    look: { body: 0xffd39a, addon: "tail" } },
  { id: "jelly", name: "くらげ", art: "🪼", ability: "float",
    desc: "すきとおった からだと ゆらゆら あし。アスレでは 2だんジャンプ（じゅんびちゅう）",
    look: { body: 0xa9dcff, opacity: 0.82, addon: "tentacles" } },
  { id: "bread", name: "パン",   art: "🍞", ability: "roll",
    desc: "こんがり やけた のるん。アスレでは ころがれるよ（じゅんびちゅう）",
    look: { body: 0xffc77a } },
  { id: "ghost", name: "おばけ", art: "👻", ability: "phase",
    desc: "ふわふわ すけてる のるん。アスレでは すりぬけ（じゅんびちゅう）",
    look: { body: 0xffffff, opacity: 0.6 } },
];

/* ---- 障害物の並べ方（3レーン：0=左 1=まんなか 2=右。画面から見た左右）
   L=ひくい（ジャンプでこえる）  T=たかい（よけるしかない）  .=なにもない
   B=ぼう / F=さく はアスレ用（ランではどちらも「よける」障害物になる） */
export const PATTERNS = {
  low1:   ["L..", ".L.", "..L"],
  tall1:  ["T..", ".T.", "..T"],
  tall2:  ["TT.", "T.T", ".TT"],
  lowAll: ["LLL"],
  mix:    ["TL.", "LT.", ".TL", ".LT", "T.L", "L.T"],
  bar1:   ["B..", ".B.", "..B"],
  fence2: ["FF.", "F.F", ".FF"],
};

/* ---- 背景のテーマ ----
   decor: 道の外の飾り（flower=花 / mushroom=きのこ）、trees: 木の数、treeNear: 木が道にどれだけ近いか
   obsL / obsT: ひくい障害物・たかい障害物の見た目
   roadDots: 道の模様（pebble=小石 / leaf=落ち葉）、mountains: 遠くの山の色、zone: 問題ゾーン（ゲート前）の床の色 */
export const THEMES = {
  field: {
    sky: 0xa8e4ff, ground: 0x9bd77a, road: 0xf2deb0, dash: 0xe7c98a,
    treeColors: [0x5fbf5a, 0x77c96a, 0x4fae63], trees: 26, treeNear: 2.2, decor: "flower",
    obsL: "log", obsT: "rock",
    roadDots: "pebble", grassTint: 0x86c866, mountains: [0x8cc0e8, 0xa4cdee], zone: 0xd9c8ff,
  },
  forest: {
    sky: 0xbfe8d8, ground: 0x6fb35e, road: 0xd9c08a, dash: 0xc4a66a,
    treeColors: [0x3f9a4f, 0x4daa58, 0x2f8a48, 0x5cb85c], trees: 60, treeNear: 1.2, decor: "mushroom",
    obsL: "stump", obsT: "bigtree",
    roadDots: "leaf", grassTint: 0x5e9f50, mountains: [0x7fb59a, 0x96c5ab], zone: 0xffd6a8,
  },
  sunset: {
    sky: 0xffd2b0, ground: 0xa3cf72, road: 0xf4d6b4, dash: 0xe8b98c,
    treeColors: [0x6bb55a, 0x8cc66a, 0xd99a4a], trees: 30, treeNear: 2.0, decor: "flower",
    obsL: "log", obsT: "rock",
    roadDots: "pebble", grassTint: 0x8fbd60, mountains: [0xc79ac4, 0xe0aac0], zone: 0xc8e6ff,
  },
};

/* ---- ステージ ----
   speed: すすむ速さ（計算する時間が必要なので、むやみに上げない）
   sections: 障害物区間ごとの列の数（区間のあとに算数ゲート）
   choices: ゲートの選択肢の数。数字ならぜんぶ同じ、配列ならゲートごと
            2 = 扉2つ＋通れない壁 / 3 = 3レーンぜんぶ扉（難所）
   rowGap: 障害物の列の間隔 / patterns: 使う並べ方と出やすさ / reward: はじめてクリアした時のごほうび
   ready:false のステージは「つくりちゅう」として表示だけする */
export const STAGES = [
  {
    id: 1, name: "はじまりの はらっぱ", ready: true, theme: "field",
    speed: 7, sections: [3, 3, 4, 4], choices: 2, rowGap: 13,
    patterns: { low1: 3, tall1: 3, tall2: 2, lowAll: 1 },
    reward: { type: "form", id: "cat" },
  },
  {
    id: 2, name: "もりの こみち", ready: true, theme: "forest",
    speed: 7, sections: [3, 4, 4, 4, 4], choices: [2, 3, 2, 3, 3], rowGap: 12,
    patterns: { low1: 2, tall1: 2, tall2: 3, lowAll: 2, mix: 3 },
    reward: { type: "form", id: "jelly" },
  },
  { id: 3, name: "ふしぎな どうくつ", ready: false, reward: { type: "form", id: "bread" } },
  { id: 4, name: "おばけの やかた",   ready: false, reward: { type: "form", id: "ghost" } },
];

/* ---- かけざんモード（段をえらぶ） ----
   order=じゅんばん（×1〜×9）/ random=その段からランダム。どちらも9問・ゴールあり
   かけざんは思い出す系なので、ステージより少し速い */
export const DAN_RUN = {
  theme: "field", speed: 8, rowsPerSection: 2, choices: 2, rowGap: 13,
  patterns: { low1: 3, tall1: 3, tall2: 2, lowAll: 1 },
};

/* ---- エンドレスモード ----
   たし算・ひき算・かけざんが まざる。ゴールなし、ぶつかるまで。
   gates が threeFrom 個をこえると、ときどき3択（threeRate）
   rewards: 走った長さ（m）ごとに小物を1つ。例：200m で1つ、600m で2つ… */
export const ENDLESS_RUN = {
  theme: "sunset", speed: 7, rowGap: 12, rowsMin: 2, rowsMax: 4,
  threeFrom: 4, threeRate: 0.4,
  patterns: { low1: 2, tall1: 2, tall2: 3, lowAll: 2, mix: 2 },
  rewards: [200, 600, 1200, 2000],
};

/* ---- 小物：帽子の色（ごほうび） ----
   color: 帽子の色（元の陰影がかかるので明るめに指定）。null は元の色
   ピンズの付け替えは、モデルの改修後に追加予定 */
export const HAT_COLORS = [
  { id: "default", name: "むらさき", color: null,     swatch: "#4b2a63" },
  { id: "pink",    name: "ピンク",   color: 0xff8fc8, swatch: "#ff8fc8" },
  { id: "sky",     name: "そらいろ", color: 0x6cc0ff, swatch: "#6cc0ff" },
  { id: "mint",    name: "ミント",   color: 0x5fe0b0, swatch: "#5fe0b0" },
  { id: "yellow",  name: "きいろ",   color: 0xffd84d, swatch: "#ffd84d" },
  { id: "red",     name: "あか",     color: 0xff5a4f, swatch: "#ff5a4f" },
  { id: "orange",  name: "オレンジ", color: 0xff9a4d, swatch: "#ff9a4d" },
  { id: "navy",    name: "こん",     color: 0x3a4fb0, swatch: "#3a4fb0" },
  { id: "white",   name: "しろ",     color: 0xffffff, swatch: "#f4f0ff" },
  { id: "black",   name: "くろ",     color: 0x3a3a44, swatch: "#3a3a44" },
];

/* ---- 動き ---- */
export const LANE_W = 2.4;          // レーンの幅
export const NORUN_SCALE = 0.85;    // モデルの大きさ（帽子の幅 約1.9）
export const JUMP_V = 8.6;          // ジャンプの強さ（ランでは どの姿でも同じ）
export const HOP_V = 3.6;           // ふだんの ぷにぷに跳ね
export const GRAVITY = 22;
