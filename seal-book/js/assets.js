/* がぞうの じゅんび
 * 1. stickers/stickers.json を よみこむ
 * 2. シールの PNG を よみこむ。ファイルが ない ときだけ、かりの えもじ から PNG を つくる
 * 3. PNG の かたちに そった しろい フチ（ダイカット）を つくる（もとの え には さわらない）
 * 4. assets/textures/ に しつかん がぞうが あれば つかう
 */
'use strict';
window.SealAssets = (function () {
  var D = window.SEAL_DATA;
  var BOX = 180;          // シール 1まいの きじゅんの おおきさ（px）
  var PAD = 16;           // フチの ための よはく
  var RIM_THIN = 6;       // ふつうシールの フチ
  var RIM_THICK = 10;     // ぷっくりシールの フチ
  var A = {};             // id -> { art, thin, thick, placeholder }

  function loadImg(src) {
    return new Promise(function (res) {
      var im = new Image();
      im.onload = function () { res(im.naturalWidth ? im : null); };
      im.onerror = function () { res(null); };
      im.src = src;
    });
  }
  function toURL(cv) {
    return new Promise(function (res) {
      if (cv.toBlob) cv.toBlob(function (b) { res(b ? URL.createObjectURL(b) : cv.toDataURL()); }, 'image/png');
      else res(cv.toDataURL());
    });
  }
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  // かりの え：えもじを とうめい PNG に する
  function emojiCanvas(e) {
    var c = canvas(BOX, BOX), x = c.getContext('2d');
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = Math.round(BOX * 0.74) + 'px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
    x.fillText(e || '⭐', BOX / 2, BOX * 0.54);
    return c;
  }
  // え を BOX の なかに おさめた キャンバス（フチの けいさん よう）
  function fitCanvas(src) {
    var c = canvas(BOX, BOX), x = c.getContext('2d');
    var w = src.naturalWidth || src.width, h = src.naturalHeight || src.height, k = Math.min(BOX / w, BOX / h);
    x.drawImage(src, (BOX - w * k) / 2, (BOX - h * k) / 2, w * k, h * k);
    return c;
  }
  // かたちに そった しろい フチ
  function rimCanvas(fit, r) {
    var S = BOX + PAD * 2, c = canvas(S, S), x = c.getContext('2d');
    var steps = 24;
    x.drawImage(fit, PAD, PAD);
    [r, r * 0.66, r * 0.33].forEach(function (rr) {
      for (var i = 0; i < steps; i++) {
        var a = i / steps * Math.PI * 2;
        x.drawImage(fit, PAD + Math.cos(a) * rr, PAD + Math.sin(a) * rr);
      }
    });
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, S, S);
    return c;
  }

  function buildCatalog(json) {
    var order = 0;
    D.SHEETS = json.sheets.map(function (sh) {
      return {
        id: sh.id, name: sh.name,
        norun: /^norun/.test(sh.id),
        items: sh.stickers.map(function (st) {
          var it = { id: st.id, file: 'stickers/' + st.file, n: st.name, tex: st.tex || 'normal', ph: st.placeholder || '', sheet: sh.id, order: order++ };
          it.h = (order * 47) % 360;
          D.CAT[it.id] = it;
          return it;
        })
      };
    });
  }

  function prepOne(it) {
    return loadImg(it.file).then(function (im) {
      var ph = !im;
      var src = im || emojiCanvas(it.ph);
      var fit = fitCanvas(src);
      var jobs = [ph ? toURL(fit) : Promise.resolve(it.file), toURL(rimCanvas(fit, RIM_THIN)), toURL(rimCanvas(fit, RIM_THICK))];
      return Promise.all(jobs).then(function (u) {
        A[it.id] = { art: u[0], thin: u[1], thick: u[2], placeholder: ph };
      });
    });
  }

  // しつかん がぞう（あれば つかう）
  var TEXTURES = [['desk', 'assets/textures/desk.jpg'], ['paper', 'assets/textures/paper.png']]
    .concat(D.COVERS.map(function (c) { return ['cover-' + c.id, 'assets/textures/cover-' + c.id + '.jpg']; }))
    .concat(D.PAGES.map(function (p) { return ['page-' + p.id, 'assets/textures/page-' + p.id + '.jpg']; }));
  var found = [];
  function probeTextures() {
    var root = document.documentElement;
    return Promise.all(TEXTURES.map(function (t) {
      return loadImg(t[1]).then(function (im) {
        if (!im) return;
        root.style.setProperty('--tx-' + t[0], 'url("' + t[1] + '")');
        root.classList.add('has-' + t[0]);
        found.push(t[1]);
      });
    }));
  }

  function prepare(onProgress) {
    return fetch('stickers/stickers.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (json) {
      buildCatalog(json);
      var all = Object.keys(D.CAT).map(function (k) { return D.CAT[k]; });
      var done = 0, i = 0;
      // 4こずつ じゅんばんに
      function worker() {
        if (i >= all.length) return Promise.resolve();
        var it = all[i++];
        return prepOne(it).then(function () { done++; if (onProgress) onProgress(done, all.length); return worker(); });
      }
      return Promise.all([worker(), worker(), worker(), worker(), probeTextures()]);
    });
  }

  return {
    prepare: prepare,
    get: function (id) { return A[id]; },
    placeholderCount: function () { return Object.keys(A).filter(function (k) { return A[k].placeholder; }).length; },
    total: function () { return Object.keys(A).length; },
    textures: function () { return found.slice(); },
    geom: { box: BOX, pad: PAD }
  };
})();
