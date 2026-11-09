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
    ghost:  { from: 2,  w: 3, char: "obake" },    // すりぬけの かべ（おばけで とおりぬける）
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
  { id: "obake",  icon: "👻", name: "おばけ", model: "assets/models/norun-obake.glb",  scale: 0.8, unlock: null, skills: { phase: true }, note: "かべを すりぬける" },
  { id: "penguin",icon: "🐧", name: "ペンギン", model: "assets/models/norun-penguin.glb", scale: 0.8, unlock: null, skills: {}, note: "よちよち あるく（とくぎは これから）" },
];
/* おばけ（モデル担当より）：すそが 地面から 0.07 うく のが 基準。ゆれは ルートの position.y で。
   すりぬけ中は M_Ghost・M_Face を opacity 0.45 に、Ghost_Outline は かくす（りんかくの からが すけて 紫っぽく なるため） */
export const OBAKE = { phaseT: 1.6, opacity: 0.45, bob: 0.06 };
/* ペンギン（モデル担当より）：羽は 外がわに 34° ひらいた のが 基準。うごきは 基準に 足す */
export const PENGUIN = { flap: 0.45, sway: 0.12 };
/* パンの すべる ポーズ（モデル担当より）：X軸まわりに +90°（顔が下・うらが上）。
   接地の高さ：耳の ふちだけなら 0.24、顔と舌も 地面の上に 出すなら 0.33（モデルの 単位） */
export const PAN_SLIDE = { rotX: Math.PI / 2, y: 0.33 };

/* ASMRタワー（2026-11-07 第4弾で 作り直し）
   四角い 部屋（フロア）を 1かいずつ 上がっていく。1フロア ＝ 1つの 素材テーマ（かべ・床・足場が その素材）
   - 足場は「物の形」（キーボードの キー・ボタン・スプーン・クッキー…）。部屋の かべぞいに らせん状に ならぶ
   - 天井の 穴（＝上の フロアの 床の 穴）から 上の フロアへ。チェックポイントは ない
   - 落ちたら ほんとうに 落ちる。とちゅうの 足場や 下の フロアの 床に 着地したら そこから つづき。1かいの 床まで 落ちたら さいしょから
   テーマの こうもく：
     walk：歩く速さの 倍率 / jump：ジャンプの 倍率 / grip：止まりやすさ（小さいほど つるつる。ふつう 16）
     bounce：はねる 床（1＝はねる）/ hopH：ジャンプや 落ちて 着地した 時に 1回 はねる 高さ（いつも 同じ。第10弾）
       ※ はねる 床の 大ジャンプは、着地の 少し前・はねて 上がっている 間の どちらで おしても 同じ 高さ（jump）
     grav：重力の 倍率（ふわふわは 小さい）/ sinkRate：立っていると しずむ 速さ（ねばねば）
     breakT：のってから われるまで（秒。ぱりぱり）/ press：ふむと しずむ 深さ（キーボード）/ wobble：足場が ゆれる（スライム）
     drift：すべる床で 少し ころがされる（ころころ）/ stepEvery：足音の 間かく（歩数）/ shapes：足場の 形 */
export const ASMR_THEMES = [
  { id: "key",   name: "キーボード", sub: "カチャカチャ",   walk: 1.0,  jump: 1.0,  grip: 16, press: 0.16, stepEvery: 1, shapes: ["key", "key", "spacebar"],
    // 踏むたびに ランダムで えらぶ（実録版と 生成版を まぜる）
    sounds: { step: ["step_key", "step_key_alt", "step_key_gen"], land: ["land_key", "land_key_gen"] } },
  { id: "puni",  name: "ぷにぷに",   sub: "グミ",           walk: 1.0,  jump: 1.45, grip: 14, bounce: 1, hopH: 0.55, stepEvery: 1, shapes: ["gumdrop", "button"] },
  { id: "shari", name: "しゃりしゃり", sub: "かきごおり",   walk: 1.15, jump: 1.0,  grip: 0.9, stepEvery: 1, shapes: ["icecube", "spoon"],
    sounds: { step: ["step_shari", "step_shari_gen"], land: ["land_shari", "land_shari_gen"] } },   // ElevenLabs 版は 上書きでも _gen で まぜても よい
  { id: "neba",  name: "ねばねば",   sub: "はちみつ",       walk: 0.35, jump: 0.72, grip: 45, sinkRate: 0.35, sinkMax: 0.5, stepEvery: 2, shapes: ["jar", "spoon"] },
  { id: "zaku",  name: "ざくざく",   sub: "クッキー",       walk: 0.95, jump: 1.0,  grip: 18, crumbs: true, stepEvery: 1, shapes: ["cookie", "button"] },
  { id: "slime", name: "スライム",   sub: "ぷるんぷるん",   walk: 0.9,  jump: 1.7,  grip: 10, bounce: 1, hopH: 0.75, wobble: true, stepEvery: 1, shapes: ["blob", "gumdrop"] },
  { id: "fuwa",  name: "ふわふわ",   sub: "わたあめ",       walk: 0.9,  jump: 1.1,  grip: 8,  grav: 0.4, stepEvery: 2, shapes: ["cotton"] },
  { id: "pari",  name: "ぱりぱり",   sub: "おせんべい",     walk: 1.0,  jump: 1.0,  grip: 16, breakT: 0.6, stepEvery: 1, shapes: ["senbei"] },
  { id: "koro",  name: "ころころ",   sub: "ビーズ",         walk: 1.2,  jump: 1.0,  grip: 0.5, drift: 1.2, stepEvery: 1, shapes: ["bead", "button"] },
  { id: "choco", name: "チョコマシュマロ", sub: "いたチョコと マシュマロ", walk: 1.0, jump: 1.05, grip: 16, stepEvery: 1, shapes: ["chocobar", "mallow"] },
  { id: "push",  name: "プッシュポップ", sub: "シリコンの ポコポコ", walk: 1.0, jump: 1.1, grip: 16, stepEvery: 1, shapes: ["popit"] },
];
/* 足場の 形ごとの 音の きまり（テーマの 音より 優先）
   kind："step"（軽く ふむ）／"land"（着地・強く ふむ）を いつも つかう。rate：音の 高さ（1＝そのまま、小さいほど ひくい）
   それ以外の 足場は、ジャンプから 強く 着地した時が land、歩いて のった時が step */
export const SHAPE_SOUND = {
  spacebar: { kind: "land", rate: 0.78 },   // 大きな キーは ひくい 着地系の 音
  chocobar: { kind: "land", rate: 1.0 },    // 板チョコ：パキッ（割れる 音）
  mallow:   { rate: 0.85 },                 // マシュマロ：やわらかく ひくめ
};
/* ASMRの カメラ（キャラに 寄った 視点。スワイプで まわす） */
export const ASMR_CAM = {
  dist: 3.1, height: 2.1, lookUp: 0.55, ahead: 3.0,
  pitchMin: -0.6, pitchMax: 0.45,    // 上下に まわせる はんい。マイナス＝下から 見上げる（第10弾：登る 先の 足場も 見られる ように 広げた）
  lookUpMax: 3.6,                     // いちばん 見上げた 時に、見る 点を どれだけ 上げるか（m）
  chase: { dist: 4.6, height: 2.6, turn: 3.0 },   // 追い視点（第10弾）：キャラの 真うしろ・少し はなれて、キャラの 向きに ついていく
  swipe: 0.008,                       // スワイプの 強さ
  minDist: 2.0,                       // かべぎわで これより 近づく 時は 上へ にげる（キャラが 画面を ふさがない ように）
  follow: 2.2,                        // スワイプして から この 秒数 たつと、歩く 方向へ ゆっくり カメラが まわりこむ
  eye: 0.85,                          // 一人称の 目の 高さ
};
export const ASMR = {
  room: 17.5,        // 部屋の 1辺（m）。第7弾「キーボードを 歩くのが 一瞬」→ 13 から 17.5 へ（タイル 7まい）
  floorH: 12,        // 1フロアの 高さ（m）。7 → 10（第5弾）→ 12（第7弾）
  tile: 2.5,         // 床の タイル（穴は タイル1まいぶん）。room ÷ tile が 整数に なるように
  // 第8弾：かべぞい 周回の 道（参考：かべに そって のぼり、角の 踊り場で 向きを かえる タワー）
  wall: {
    inset: 1.15,     // かべから 足場の まんなかまで（m）。かべと 足場の あいだに 少し すき間（ふみはずすと 落ちる）
    len: 2.5,        // かべぞいの ジャンプの 足場の 長さ（かべに そって）。足場の すき間は 約0.5m
    walk: 4.8,       // 歩行区間（つながった 長い 足場）の 長さ（第9弾）
    walkLast: 4.2,   // さいごの 面（吹き抜けの 手前）の 歩行区間の 長さ
    dep: 1.7,        // 足場の おくゆき（かべから 部屋の 内がわへ）
    // かど と かど の あいだ：ジャンプ → 歩行区間 → ジャンプ。さいごの 面は 歩行区間 → ジャンプ → さいごの 段
    land: 2.8,       // 角の 踊り場（正方形）の 1辺
    landInset: 1.5,  // かべから 踊り場の まんなかまで
    lastD: 4.55,     // さいごの 段（吹き抜けの となり）の まんなかの、かどの 線（かべから inset）から の きょり。第10弾：5.6 だと 吹き抜けの 1段目まで 1.2〜1.4m あいて とどかない ことが あった → 4.55（すき間 約0.35m）
    lastLen: 1.6,    // さいごの 段の 長さ
  },
  pariBack: 5,       // われた せんべいが もどるまで（秒）
  traps: 1,          // 2かい より上の 床に あける よけいな 穴（落とし穴）の 数
  brake: 36,         // スティックを はなした 時の ブレーキ（地上。ふつうの ふんばり 16 より 強い）
  brakeAir: 14,      // スティックを はなした 時の ブレーキ（空中。ふつうは 6）
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
