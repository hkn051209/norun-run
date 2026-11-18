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
      { id: 'hana', name: 'おはなばたけ', icon: '🌷' }
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
