/* がめんの データ（ページ・ひょうし・あそぶひと）
 * シールの いちらんは stickers/stickers.json に あります。
 */
'use strict';
(function () {
  window.SEAL_DATA = {
    SHEETS: [], // stickers/stickers.json から よみこむ（js/assets.js）
    CAT: {},
    TEX_NAME: { normal: 'ふつう', puffy: 'ぷっくり', water: 'ウォーター' },
    PAGES: [
      { id: 'sora', name: 'そら', art: 'sk05' },
      { id: 'umi', name: 'うみ', art: 'an12' },
      { id: 'mori', name: 'もり', art: 'sk10' },
      { id: 'okashi', name: 'おかしのくに', art: 'fd05' },
      { id: 'uchu', name: 'うちゅう', art: 'sk01' },
      { id: 'hana', name: 'おはなばたけ', art: 'sk11' },
      { id: 'gohoubi', name: 'ごほうび', art: 'rw02', reward: true }
    ],
    // ごほうびの りゆう（え と いろで えらべる）
    REASONS: [
      { id: 'otetsudai', name: 'おてつだい', icon: 'basket', color: '#ffb8cf' },
      { id: 'ganbatta', name: 'がんばった', icon: 'flag', color: '#ffd27a' },
      { id: 'test', name: 'テスト', icon: 'pencil', color: '#a6d8ff' },
      { id: 'okataduke', name: 'おかたづけ', icon: 'box', color: '#bfe8a8' },
      { id: 'yakusoku', name: 'おやくそくを まもった', icon: 'promise', color: '#d9c6ff' },
      { id: 'sonota', name: 'そのほか', icon: 'star', color: '#ffeaa6' }
    ],
    COVERS: [
      { id: 'pink', name: 'ピンク クリア' },
      { id: 'blue', name: 'ブルー クリア' },
      { id: 'choco', name: 'おかし ブラウン' },
      { id: 'star', name: 'ほしぞら パープル' }
    ],
    FACES: ['🐰', '🐻', '🐱', '🐶', '🐼', '🐥', '🦊', '🐸'],
    // かおマークは ほぞんデータの きごう。がめんでは シールの え で ひょうじする
    FACE_ART: { '🐰': 'an03', '🐻': 'an04', '🐱': 'an02', '🐶': 'an01', '🐼': 'an05', '🐥': 'an11', '🦊': 'an06', '🐸': 'an09' },
    COLORS: ['#ff8fb8', '#6cb8ff', '#ffc94d', '#6fd38f'],
    NAMES: ['ひとりめ', 'ふたりめ', 'さんにんめ', 'よにんめ']
  };
})();
