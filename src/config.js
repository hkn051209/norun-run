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
   obsL / obsT: ひくい障害物・たかい障害物の見た目 */
export const THEMES = {
  field: {
    sky: 0xa8e4ff, ground: 0x9bd77a, road: 0xf2deb0, dash: 0xe7c98a,
    treeColors: [0x5fbf5a, 0x77c96a, 0x4fae63], trees: 26, treeNear: 2.2, decor: "flower",
    obsL: "log", obsT: "rock",
  },
  forest: {
    sky: 0xbfe8d8, ground: 0x6fb35e, road: 0xd9c08a, dash: 0xc4a66a,
    treeColors: [0x3f9a4f, 0x4daa58, 0x2f8a48, 0x5cb85c], trees: 60, treeNear: 1.2, decor: "mushroom",
    obsL: "stump", obsT: "bigtree",
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

/* ---- 動き ---- */
export const LANE_W = 2.4;          // レーンの幅
export const NORUN_SCALE = 0.85;    // モデルの大きさ（帽子の幅 約1.9）
export const JUMP_V = 8.6;          // ジャンプの強さ（ランでは どの姿でも同じ）
export const HOP_V = 3.6;           // ふだんの ぷにぷに跳ね
export const GRAVITY = 22;
