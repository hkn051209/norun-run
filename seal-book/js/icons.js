/* がめんの アイコン（SVG）
 * たんまつの えもじは きしゅで みためが かわるので、ボタンなどの アイコンは ここで かきます。
 * シールの え では ありません。
 */
'use strict';
window.IC = (function () {
  var L = '#6b4a3a';
  function svg(body) {
    return '<svg class="ic" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="' + L + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
  }
  var I = {
    book: '<path d="M24 12c-5-4-12-4-18-2v26c6-2 13-2 18 2z" fill="#ffc2d8"/><path d="M24 12c5-4 12-4 18-2v26c-6-2-13-2-18 2z" fill="#ffe1ec"/><path d="M24 12v26"/><path d="M11 17c3-1 6-1 9 0M11 23c3-1 6-1 9 0M28 17c3-1 6-1 9 0" stroke-width="2"/>',
    bag: '<path d="M14 18c0-6 4-10 10-10s10 4 10 10" fill="none"/><rect x="9" y="16" width="30" height="25" rx="8" fill="#ffd27a"/><rect x="15" y="27" width="18" height="10" rx="4" fill="#fff1c9"/><path d="M9 24h30"/>',
    sheet: '<rect x="9" y="6" width="30" height="36" rx="5" fill="#fff"/><circle cx="18" cy="16" r="5" fill="#ff9fc4"/><circle cx="31" cy="17" r="4.5" fill="#9fd8ff"/><path d="M14 33l4-6 4 6z" fill="#ffd84d"/><circle cx="31" cy="30" r="5" fill="#b9e8a6"/>',
    gacha: '<circle cx="24" cy="18" r="13" fill="#e9f6ff"/><circle cx="18" cy="17" r="4" fill="#ff9fc4"/><circle cx="28" cy="13" r="4" fill="#ffd84d"/><circle cx="29" cy="23" r="4" fill="#9fd8ff"/><path d="M11 28h26v12a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3z" fill="#ff8db6"/><circle cx="24" cy="36" r="3.5" fill="#fff"/>',
    trade: '<path d="M10 18h24l-6-6" stroke="#e65c92" stroke-width="3.4"/><path d="M38 30H14l6 6" stroke="#3d9be0" stroke-width="3.4"/>',
    ticket: '<path d="M6 15a3 3 0 0 1 3-3h30a3 3 0 0 1 3 3v4a5 5 0 0 0 0 10v4a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-4a5 5 0 0 0 0-10z" fill="#ffd84d"/><path d="M30 13v22" stroke-dasharray="3 3"/><path d="M14 20h10M14 27h7" stroke-width="2.2"/>',
    sound: '<path d="M8 19h7l9-8v26l-9-8H8z" fill="#9fd8ff"/><path d="M31 18c3 3 3 9 0 12M35 14c6 5 6 15 0 20"/>',
    mute: '<path d="M8 19h7l9-8v26l-9-8H8z" fill="#d8d0c8"/><path d="M31 19l9 10M40 19l-9 10" stroke="#e65c4a"/>',
    lock: '<path d="M16 21v-5a8 8 0 0 1 16 0v5" /><rect x="11" y="21" width="26" height="20" rx="5" fill="#ffd27a"/><circle cx="24" cy="30" r="2.6" fill="' + L + '"/><path d="M24 32v4"/>',
    palette: '<path d="M24 7C13 7 6 15 6 24c0 9 7 16 15 16 3 0 4-2 3-4-1-3 1-5 4-5h5c5 0 9-3 9-8 0-9-8-16-18-16z" fill="#fff1c9"/><circle cx="15" cy="21" r="3" fill="#ff8fb8"/><circle cx="21" cy="14" r="3" fill="#ffd84d"/><circle cx="30" cy="14" r="3" fill="#6fd38f"/><circle cx="35" cy="22" r="3" fill="#6cb8ff"/>',
    gift: '<rect x="8" y="19" width="32" height="22" rx="4" fill="#d6c2ff"/><rect x="6" y="13" width="36" height="8" rx="3" fill="#ffc2d8"/><path d="M24 13v28"/><path d="M24 13c-3-6-11-6-10-1 1 3 7 2 10 1zM24 13c3-6 11-6 10-1-1 3-7 2-10 1z" fill="#ff8fb8"/>',
    trophy: '<path d="M15 8h18v9a9 9 0 0 1-18 0z" fill="#ffd84d"/><path d="M15 11H9c0 6 3 9 7 9M33 11h6c0 6-3 9-7 9"/><path d="M24 26v7"/><path d="M17 40h14l-2-7H19z" fill="#f3b92a"/>',
    check: '<path d="M10 25l9 9 19-20" stroke="#3f8a2a" stroke-width="4"/>',
    plus: '<circle cx="24" cy="24" r="17" fill="#e8f7ff"/><path d="M24 15v18M15 24h18" stroke-width="3.4"/>',
    minus: '<circle cx="24" cy="24" r="17" fill="#e8f7ff"/><path d="M15 24h18" stroke-width="3.4"/>',
    rotl: '<path d="M14 18a13 13 0 1 1-2 13" stroke-width="3.2"/><path d="M8 10v10h10" stroke-width="3.2"/>',
    rotr: '<path d="M34 18a13 13 0 1 0 2 13" stroke-width="3.2"/><path d="M40 10v10H30" stroke-width="3.2"/>',
    peel: '<rect x="6" y="17" width="36" height="14" rx="7" transform="rotate(-30 24 24)" fill="#ffd9b8"/><rect x="18" y="19" width="12" height="10" rx="2" transform="rotate(-30 24 24)" fill="#fff1e2"/>',
    hand: '<path d="M18 26V11a3 3 0 0 1 6 0v12V9a3 3 0 0 1 6 0v14V12a3 3 0 0 1 6 0v18c0 8-5 12-11 12-5 0-8-2-11-7l-5-8a3 3 0 0 1 5-3z" fill="#ffe1cc"/>',
    grid: '<rect x="8" y="8" width="13" height="13" rx="3" fill="#ffd84d"/><rect x="27" y="8" width="13" height="13" rx="3" fill="#ff9fc4"/><rect x="8" y="27" width="13" height="13" rx="3" fill="#9fd8ff"/><rect x="27" y="27" width="13" height="13" rx="3" fill="#b9e8a6"/>',
    pencil: '<path d="M10 38l3-10 20-20 7 7-20 20z" fill="#ffd84d"/><path d="M28 13l7 7M10 38l10-3"/>',
    key: '<circle cx="16" cy="24" r="8" fill="#ffd84d"/><path d="M24 24h17M35 24v6M40 24v5"/>',
    trash: '<path d="M12 15h24l-2 25H14z" fill="#e8f7ff"/><path d="M8 15h32M19 15v-5h10v5M20 21v13M28 21v13"/>',
    image: '<rect x="7" y="9" width="34" height="30" rx="5" fill="#e8f7ff"/><circle cx="18" cy="19" r="4" fill="#ffd84d"/><path d="M7 34l11-10 8 7 6-5 9 8" fill="#b9e8a6"/>',
    scroll: '<rect x="11" y="8" width="26" height="32" rx="4" fill="#fff6e0"/><path d="M17 17h14M17 24h14M17 31h9"/>',
    star: '<path d="M24 6l5.5 11.5L42 19l-9 8.5 2.3 12.5L24 34l-11.3 6 2.3-12.5L6 19l12.5-1.5z" fill="#ffd84d"/>',
    arrow: '<path d="M8 24h30M28 14l10 10-10 10" stroke-width="3.6" stroke="#e65c92"/>',
    swap: '<path d="M8 17h28l-7-7" stroke="#e65c92" stroke-width="3.6"/><path d="M40 31H12l7 7" stroke="#3d9be0" stroke-width="3.6"/>',
    basket: '<path d="M12 20c0-7 5-12 12-12s12 5 12 12"/><path d="M6 20h36l-4 19H10z" fill="#f2c98f"/><path d="M14 26v8M24 26v8M34 26v8"/>',
    flag: '<path d="M12 42V7"/><path d="M12 9c8-4 13 4 24 0v15c-11 4-16-4-24 0z" fill="#ff8fb8"/>',
    box: '<rect x="7" y="24" width="15" height="15" rx="3" fill="#9fd8ff"/><rect x="26" y="24" width="15" height="15" rx="3" fill="#ffd84d"/><rect x="16" y="9" width="15" height="15" rx="3" fill="#ff9fc4"/>',
    promise: '<path d="M24 40S8 30 8 18a8 8 0 0 1 16-2 8 8 0 0 1 16 2c0 12-16 22-16 22z" fill="#ff9fc4"/><path d="M17 22l5 5 9-9" stroke="#fff" stroke-width="3.4"/>',
    back: '<path d="M30 10L16 24l14 14" stroke-width="4"/>',
    x: '<path d="M14 14l20 20M34 14L14 34" stroke-width="4"/>'
  };
  var out = {};
  Object.keys(I).forEach(function (k) { out[k] = svg(I[k]); });
  return out;
})();
