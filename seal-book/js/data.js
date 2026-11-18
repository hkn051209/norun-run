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
      { id: 'sora', name: 'そら', icon: '☁️' },
      { id: 'umi', name: 'うみ', icon: '🐚' },
      { id: 'mori', name: 'もり', icon: '🌳' },
      { id: 'okashi', name: 'おかしのくに', icon: '🍬' },
      { id: 'uchu', name: 'うちゅう', icon: '🪐' },
      { id: 'hana', name: 'おはなばたけ', icon: '🌷' },
      { id: 'gohoubi', name: 'ごほうび', icon: '🏆', reward: true }
    ],
    // ごほうびの りゆう（え と いろで えらべる）
    REASONS: [
      { id: 'otetsudai', name: 'おてつだい', icon: '🧺', color: '#ffb8cf' },
      { id: 'ganbatta', name: 'がんばった', icon: '💪', color: '#ffd27a' },
      { id: 'test', name: 'テスト', icon: '📝', color: '#a6d8ff' },
      { id: 'okataduke', name: 'おかたづけ', icon: '🧸', color: '#bfe8a8' },
      { id: 'yakusoku', name: 'おやくそくを まもった', icon: '🤙', color: '#d9c6ff' },
      { id: 'sonota', name: 'そのほか', icon: '⭐', color: '#ffeaa6' }
    ],
    COVERS: [
      { id: 'pink', name: 'ピンク クリア' },
      { id: 'blue', name: 'ブルー クリア' },
      { id: 'choco', name: 'おかし ブラウン' },
      { id: 'star', name: 'ほしぞら パープル' }
    ],
    FACES: ['🐰', '🐻', '🐱', '🐶', '🐼', '🐥', '🦊', '🐸'],
    COLORS: ['#ff8fb8', '#6cb8ff', '#ffc94d', '#6fd38f'],
    NAMES: ['ひとりめ', 'ふたりめ', 'さんにんめ', 'よにんめ']
  };
})();
