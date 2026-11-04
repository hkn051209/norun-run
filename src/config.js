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
   ability: ゲーム中の特技。v1 は 3D は本体のまま、図鑑の絵は絵文字アート */
export const FORMS = [
  { id: "norun", name: "のるん", art: "🧙", ability: null,     desc: "いつもの のるん。ぷにぷに はねて すすむよ" },
  { id: "cat",   name: "ねこ",   art: "🐱", ability: "fast",   desc: "はしるのが はやい！ よこにも すばやく うごけるよ" },
  { id: "jelly", name: "くらげ", art: "🪼", ability: "float",  desc: "2だんジャンプ！ ふわりと ゆっくり おちるよ" },
  { id: "bread", name: "パン",   art: "🍞", ability: "roll",   desc: "したに スワイプで ころがる！ ひくい ぼうの したを とおれるよ" },
  { id: "ghost", name: "おばけ", art: "👻", ability: "phase",  desc: "きの さくを すりぬけられるよ" },
];

/* ---- 障害物の並べ方（3レーン：0=左 1=まんなか 2=右。画面から見た左右）
   L=ひくい（ジャンプでこえる）  T=たかい（よけるしかない）
   B=ぼう（パンでころがってくぐる・ほかはよける）  F=さく（おばけはすりぬけ・ほかはよける）  .=なにもない */
export const PATTERNS = {
  low1:   ["L..", ".L.", "..L"],
  tall1:  ["T..", ".T.", "..T"],
  tall2:  ["TT.", "T.T", ".TT"],
  lowAll: ["LLL"],
  mix:    ["TL.", "LT.", ".TL", ".LT", "T.L", "L.T"],
  bar1:   ["B..", ".B.", "..B"],
  fence2: ["FF.", "F.F", ".FF"],
};

/* ---- ステージ ----
   speed: すすむ速さ / sections: 障害物区間ごとの列の数（区間のあとに算数ゲート） / choices: ゲートの選択肢数
   rowGap: 障害物の列の間隔 / patterns: 使う並べ方と出やすさ / reward: はじめてクリアした時のごほうび
   ready:false のステージは「つくりちゅう」として表示だけする */
export const STAGES = [
  {
    id: 1, name: "はじまりの はらっぱ", ready: true,
    speed: 7, sections: [3, 3, 4, 4], choices: 2, rowGap: 13,
    patterns: { low1: 3, tall1: 3, tall2: 2, lowAll: 1 },
    reward: { type: "form", id: "cat" },
    theme: { sky: 0xa8e4ff, grass: 0x9bd77a, road: 0xf2deb0 },
  },
  { id: 2, name: "もりの こみち",     ready: false, reward: { type: "form", id: "jelly" } },
  { id: 3, name: "ふしぎな どうくつ", ready: false, reward: { type: "form", id: "bread" } },
  { id: 4, name: "おばけの やかた",   ready: false, reward: { type: "form", id: "ghost" } },
];

/* ---- 動き ---- */
export const LANE_W = 2.4;          // レーンの幅
export const NORUN_SCALE = 0.85;    // モデルの大きさ（帽子の幅 約1.9）
export const JUMP_V = 8.6;          // ジャンプの強さ
export const HOP_V = 3.6;           // ふだんの ぷにぷに跳ね
export const GRAVITY = 22;
