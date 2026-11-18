/* デジタル シールちょう  ほんたい */
'use strict';
(function () {
  var D = window.SEAL_DATA, CAT = D.CAT, Snd = window.Snd;
  var KEY = 'sealbook-v4';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* ---------- ほぞん ---------- */
  function newPlayer(i) {
    return { name: D.NAMES[i], face: D.FACES[i], color: D.COLORS[i], cover: D.COVERS[i].id, tickets: 0, inv: {}, pages: D.PAGES.map(function () { return []; }), rewards: [], rewardView: 'order' };
  }
  function fresh() { return { v: 1, pass: '1234', muted: false, players: [0, 1, 2, 3].map(newPlayer), history: [] }; }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.players && s.players.length === 4) {
        s.players.forEach(function (p, i) {
          var d = newPlayer(i);
          for (var k in d) if (p[k] === undefined) p[k] = d[k];
          while (p.pages.length < D.PAGES.length) p.pages.push([]);
        });
        if (!s.history) s.history = [];
        if (!/^\d{4}$/.test(s.pass || '')) s.pass = '1234';
        return s;
      }
    } catch (e) { /* こわれていたら あたらしく */ }
    return fresh();
  }
  var S = load();
  Snd.muted = !!S.muted;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { toast('ほぞん できなかったよ'); }
  }

  /* ---------- もちもの ---------- */
  var cur = null;
  function P() { return S.players[cur]; }
  function keyOf(id, tex) { return id + '~' + tex; }
  function parseKey(k) { var a = String(k).split('~'); return { id: a[0], tex: a[1] || 'normal', d: CAT[a[0]] }; }
  function validKey(k) { return !!parseKey(k).d; }
  function invAdd(p, k, n) { p.inv[k] = (p.inv[k] || 0) + n; if (p.inv[k] <= 0) delete p.inv[k]; }
  var TEX_ORDER = { normal: 0, puffy: 1, water: 2 };
  function invList(p) {
    return Object.keys(p.inv).filter(function (k) { return p.inv[k] > 0 && validKey(k); }).sort(function (a, b) {
      var A = parseKey(a), B = parseKey(b);
      return (A.d.order - B.d.order) || (TEX_ORDER[A.tex] - TEX_ORDER[B.tex]);
    });
  }
  function invTotal(p) { return Object.keys(p.inv).reduce(function (s, k) { return s + (validKey(k) ? p.inv[k] : 0); }, 0); }
  function placedTotal(p) { return p.pages.reduce(function (s, pg) { return s + pg.length; }, 0); }
  function stkName(k) { var x = parseKey(k); return x.d ? x.d.n : '？'; }
  function texLabel(k) { var t = parseKey(k).tex; return t === 'normal' ? '' : '<span class="texb tb-' + t + '">' + D.TEX_NAME[t] + '</span>'; }

  /* ---------- シールの みため ---------- */
  function glitterHTML() {
    var cols = ['#ffd84d', '#ffffff', '#ff9fd0', '#bfe6ff', '#fff3a0', '#d7b8ff'];
    var h = '';
    for (var i = 0; i < 14; i++) {
      var x = 18 + Math.random() * 64, y = 58 + Math.random() * 26;
      var dx = (Math.random() * 2 - 1) * 30, dy = -(20 + Math.random() * 40);
      var star = i % 3 === 0;
      h += '<i class="glit' + (star ? ' star' : '') + '" style="--x:' + x.toFixed(1) + '%;--y:' + y.toFixed(1) + '%;--dx:' + dx.toFixed(0) +
        '%;--dy:' + dy.toFixed(0) + '%;--c:' + cols[i % cols.length] + ';--d:' + (Math.random() * 0.25).toFixed(2) + 's">' + (star ? '★' : '') + '</i>';
    }
    return h;
  }
  // シール 1まい：PNG の え（さわらない）に、フチ・かげ・ツヤ・ドームを かさねる
  function stkHTML(k) {
    var x = parseKey(k), d = x.d, a = d && window.SealAssets.get(d.id);
    if (!d || !a) return '<div class="stk tex-normal"></div>';
    var tex = x.tex, art = '<img class="art" src="' + a.art + '" alt="' + esc(d.n) + '" draggable="false">';
    var h = '<div class="stk tex-' + tex + (d.reward ? ' reward' : '') + (a.placeholder ? ' is-ph' : '') + '" data-k="' + esc(k) + '">';
    var rim = tex === 'puffy' ? a.thick : a.thin, m = ' style="--m:url(\'' + (tex === 'water' ? a.thick : rim) + '\')"';
    if (tex === 'water') {
      h += '<div class="dome" style="--h:' + d.h + '"><i class="liquid"></i>' + art + glitterHTML() + '<i class="shine"></i><i class="rimlight"></i></div>';
    } else {
      h += '<img class="lay rim" src="' + rim + '" alt="" draggable="false">' + art;
      if (tex === 'puffy') h += '<i class="lay shade"' + m + '></i><i class="lay gloss"' + m + '></i><i class="lay spec"' + m + '></i>';
    }
    // ごほうび：きんいろの フチが ひかる ＋ キラキラ
    if (d.reward) h += (tex === 'water' ? '' : '<i class="lay shimmer"' + m + '></i>') + '<i class="tw a">✦</i><i class="tw b">✧</i><i class="tw c">✦</i>';
    if (a.placeholder) h += '<i class="ph-tag">かり</i>';
    return h + '</div>';
  }
  function sheetIcon(sh) { var a = window.SealAssets.get(sh.items[0].id); return '<img class="tab-ico" src="' + (a ? a.art : '') + '" alt="">'; }
  function tapEffect(stk) {
    if (!stk) return;
    var cls = stk.classList.contains('tex-water') ? 'shake' : 'squish';
    stk.classList.remove('squish', 'shake');
    void stk.offsetWidth;
    stk.classList.add(cls);
    if (cls === 'shake') Snd.water(); else if (stk.classList.contains('tex-puffy')) Snd.squish(); else Snd.tap();
    setTimeout(function () { stk.classList.remove(cls); }, 1500);
  }

  /* ---------- がめん ---------- */
  var scr = 'players';
  var R = {};
  function go(name) {
    if (name !== 'players' && cur === null) name = 'players';
    scr = name;
    $$('.screen').forEach(function (s) { s.classList.toggle('on', s.id === 'scr-' + name); });
    $('#topbar').classList.toggle('hidden', name === 'players');
    $$('#nav button').forEach(function (b) { b.classList.toggle('on', b.dataset.go === name); });
    selUid = null;
    R[name]();
    updTop();
  }
  function rerender() { R[scr](); updTop(); }
  function updTop() {
    $('#muteBtn').textContent = S.muted ? '🔇' : '🔊';
    $('#muteBtn').setAttribute('aria-label', S.muted ? 'おと なし' : 'おと あり');
    if (cur === null) return;
    var p = P();
    $('#who .face').textContent = p.face;
    $('#who .nm').textContent = p.name;
    $('#who').style.setProperty('--c', p.color);
    $('#tickets b').textContent = p.tickets;
  }

  var toastTimer;
  function toast(msg) {
    var t = $('#toast'); t.innerHTML = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1900);
  }

  // ちいさな かくにん ダイアログ（ブラウザの confirm は つかわない）
  function ask(msg, okLabel, danger) {
    return new Promise(function (res) {
      var dl = $('#dialog');
      dl.innerHTML = '<div class="dlg"><p>' + msg + '</p><div class="dlg-btns"><button class="big" data-r="0">やめる</button><button class="big ' + (danger ? 'danger' : 'pri') + '" data-r="1">' + okLabel + '</button></div></div>';
      dl.classList.remove('hidden');
      $$('button', dl).forEach(function (b) {
        b.onclick = function () { dl.classList.add('hidden'); dl.innerHTML = ''; res(b.dataset.r === '1'); };
      });
    });
  }

  /* ---------- 1. だれが あそぶ？ ---------- */
  R.players = function () {
    var el = $('#scr-players');
    el.innerHTML = '<div class="title-wrap"><div class="title-deco">⭐ 🌸 🎀 🌈 ⭐</div><h1>シールちょう</h1><p>だれが あそぶ？</p></div>' +
      '<div class="pcards">' + S.players.map(function (p, i) {
        return '<button class="pcard" data-i="' + i + '" style="--c:' + p.color + '"><span class="pface">' + p.face + '</span>' +
          '<span class="pname">' + esc(p.name) + '</span><span class="pmeta">シール ' + (invTotal(p) + placedTotal(p)) + 'まい ・ 🎫' + p.tickets + '</span></button>';
      }).join('') + '</div>' +
      '<button class="lock-corner" id="lockCorner">🔒 ほごしゃ</button>';
    $$('.pcard', el).forEach(function (b) {
      b.onclick = function () {
        cur = +b.dataset.i; bookOpen = false; pageIdx = 0; choice = null; tr = { step: 'who' };
        Snd.pop(); go('book'); setTimeout(checkRewards, 250);
      };
    });
    $('#lockCorner').onclick = openParent;
  };

  /* ---------- 2. シールちょう ---------- */
  var bookOpen = false, pageIdx = 0, choice = null, selUid = null, flipping = false, opening = false;
  function isRewardPage(i) { return !!D.PAGES[i === undefined ? pageIdx : i].reward; }
  function isRewardKey(k) { var d = parseKey(k).d; return !!(d && d.reward); }
  function boardMode() { return isRewardPage() && P().rewardView !== 'free'; }
  function md(t) { var d = new Date(t); return (d.getMonth() + 1) + '/' + d.getDate(); }
  function reasonOf(id) { return D.REASONS.filter(function (r) { return r.id === id; })[0] || D.REASONS[D.REASONS.length - 1]; }
  function reasonChip(id) { var r = reasonOf(id); return '<span class="rchip" style="--rc:' + r.color + '"><i>' + r.icon + '</i><b>' + r.name + '</b></span>'; }

  function coverHTML(p) {
    return '<div class="cover" id="cover"><div class="cover-insert"></div><div class="cover-gloss"></div>' +
      '<div class="cover-label"><span class="cl-face">' + p.face + '</span><span class="cl-name">' + esc(p.name) + ' の</span><b>シールちょう</b></div></div>';
  }
  // ごほうびページ：もらった じゅんに ならべる
  function rewardBoard(p) {
    var list = p.rewards.filter(function (r) { return r.seen && validKey(r.key); });
    var show = list.slice(-20);
    return '<div class="rb"><div class="rb-title">🏆 もらった じゅん</div>' +
      (show.length ? '<div class="rb-grid">' + show.map(function (r) {
        return '<div class="rb-cell"><div class="rb-stk">' + stkHTML(r.key) + '</div><span class="rb-date">' + md(r.t) + '</span>' + reasonChip(r.reason) + '</div>';
      }).join('') + '</div>' : '<div class="rb-empty">まだ ないよ<br>おてつだい や がんばった ときに<br>おうちの ひとから もらえるよ</div>') +
      (list.length > 20 ? '<div class="rb-more">ほか ' + (list.length - 20) + 'まい（ほごしゃ モードで ぜんぶ みられます）</div>' : '') + '</div>';
  }
  function pageInner(idx) {
    var pg = D.PAGES[idx], p = P();
    var h = '<div class="page-label">' + pg.icon + ' ' + pg.name + '</div><div class="holes"></div>';
    if (pg.reward && p.rewardView !== 'free') return h + rewardBoard(p);
    p.pages[idx].forEach(function (it) {
      if (!validKey(it.key)) return;
      h += '<div class="placed' + (it.uid === selUid ? ' sel' : '') + '" data-uid="' + it.uid + '" style="left:' + it.x + '%;top:' + it.y + '%;--s:' + it.s + ';--r:' + it.r + 'deg">' + stkHTML(it.key) + '</div>';
    });
    return h;
  }
  function fillPage(el, idx) {
    var pg = D.PAGES[idx];
    el.className = 'page bg-' + pg.id + (pg.reward && P().rewardView !== 'free' ? ' board' : '');
    el.innerHTML = pageInner(idx);
  }

  R.book = function () {
    var p = P(), el = $('#scr-book');
    el.classList.toggle('closed', !bookOpen);
    el.innerHTML = '<div class="book-main"><div class="stage" id="stage"><div class="binder cov-' + p.cover + '" id="binder">' +
      '<div class="binder-back"></div>' +
      '<div class="page-area" id="pageArea"><div class="page" id="page"></div></div>' +
      '<div class="rings"><i></i><i></i><i></i><i></i></div>' +
      (bookOpen ? '' : coverHTML(p)) +
      '<div class="belt' + (bookOpen ? '' : ' closed') + '"><b class="snap"></b></div>' +
      '</div></div><div class="controls" id="controls"></div></div>' +
      '<aside class="tray" id="tray"></aside>';
    fillPage($('#page'), pageIdx);
    layoutBook();
    rControls(); rTray();
    $('#page').addEventListener('pointerdown', onDown);
  };

  function layoutBook() {
    var st = $('#stage'), b = $('#binder');
    if (!st || !b) return;
    var W = st.clientWidth, H = st.clientHeight;
    var pw = Math.floor(Math.min((W - 16) / 1.34, (H - 10) / 1.43));
    b.style.setProperty('--pw', Math.max(150, pw) + 'px');
  }
  function pagePW() { var b = $('#binder'); return b ? parseFloat(b.style.getPropertyValue('--pw')) || 300 : 0; }

  function rControls() {
    var c = $('#controls'); if (!c) return;
    if (!bookOpen) {
      c.innerHTML = '<button class="big pri" id="openBtn">📖 ひらく</button><button class="big" id="coverBtn">🎨 ちょうを えらぶ</button>';
      $('#openBtn').onclick = openBook;
      $('#coverBtn').onclick = chooseCover;
    } else if (selUid) {
      c.innerHTML = '<div class="edit-bar"><button class="big" data-ed="big">➕<span>おおきく</span></button><button class="big" data-ed="small">➖<span>ちいさく</span></button>' +
        '<button class="big" data-ed="rl">↺<span>まわす</span></button><button class="big" data-ed="rr">↻<span>まわす</span></button>' +
        '<button class="big warn" data-ed="peel">🩹<span>はがす</span></button><button class="big pri" data-ed="done">✔<span>おわり</span></button></div>';
      $$('[data-ed]', c).forEach(function (b) { b.onclick = function () { editSel(b.dataset.ed); }; });
    } else {
      var pg = D.PAGES[pageIdx], free = P().rewardView === 'free';
      c.innerHTML = '<button class="big" id="prevBtn"' + (pageIdx === 0 ? ' disabled' : '') + '>◀ まえ</button>' +
        '<div class="pageno" id="pageNo"><b>' + (pageIdx + 1) + '</b> / ' + D.PAGES.length + '<span>' + pg.name + '</span></div>' +
        '<button class="big" id="nextBtn"' + (pageIdx === D.PAGES.length - 1 ? ' disabled' : '') + '>つぎ ▶</button>' +
        (pg.reward ? '<div class="seg" id="rvSeg"><button class="mid' + (free ? '' : ' on') + '" data-v="order">🏆 ならべる</button><button class="mid' + (free ? ' on' : '') + '" data-v="free">✋ はる</button></div>' : '') +
        '<button class="mid" id="closeBtn">とじる</button>';
      $('#prevBtn').onclick = function () { flip(-1); };
      $('#nextBtn').onclick = function () { flip(1); };
      $('#closeBtn').onclick = closeBook;
      $$('#rvSeg button').forEach(function (b) {
        b.onclick = function () { P().rewardView = b.dataset.v; save(); Snd.tap(); fillPage($('#page'), pageIdx); rControls(); rTray(); };
      });
    }
  }

  function trayKeys(p) {
    var list = invList(p);
    if (isRewardPage()) return boardMode() ? [] : list.filter(isRewardKey);
    return list;
  }
  function rTray() {
    var t = $('#tray'); if (!t) return;
    var p = P(), list = trayKeys(p);
    if (choice && (!(p.inv[choice] > 0) || list.indexOf(choice) < 0)) choice = null;
    var empty = boardMode() ? 'ここは ならべる ページ<br>「✋ はる」に すると<br>ごほうびシールを はれるよ' :
      isRewardPage() ? 'ごほうびシールが ないよ<br>おうちの ひとから<br>もらえるよ' : 'シールが ないよ<br>📄シールシート や<br>🎰ガチャ で もらおう';
    t.innerHTML = '<div class="tray-head">🎒 はる シール<small>' + (choice ? 'ページを タップして はってね' : 'ゆびで ページまで ひっぱってね') + '</small></div>' +
      (list.length ? '<div class="tray-list">' + list.map(function (k) {
        return '<button class="tray-item' + (k === choice ? ' on' : '') + '" data-k="' + esc(k) + '">' + stkHTML(k) + '<span class="cnt">' + p.inv[k] + '</span></button>';
      }).join('') + '</div>' : '<div class="tray-empty">' + empty + '</div>');
    $$('.tray-item', t).forEach(function (b) {
      b.addEventListener('pointerdown', function (e) { beginSourceDrag(e, b.dataset.k, b, trayAxis()); });
      b.onclick = function () {
        if (Date.now() < suppressClick || !bookOpen) return;
        choice = (choice === b.dataset.k) ? null : b.dataset.k;
        selUid = null; markSel(); rControls(); rTray(); Snd.tap();
      };
    });
  }
  function trayAxis() { return window.matchMedia('(orientation: portrait)').matches ? 'x' : 'y'; }

  function openBook() {
    if (bookOpen || opening) return;
    opening = true;
    var cv = $('#cover'), belt = $('.belt');
    belt.classList.add('unsnap'); Snd.snap();
    setTimeout(function () { cv.classList.add('opening'); Snd.flip(); }, 380);
    setTimeout(function () {
      opening = false; bookOpen = true;
      if (cv.parentNode) cv.parentNode.removeChild(cv);
      belt.classList.remove('closed', 'unsnap');
      $('#scr-book').classList.remove('closed');
      rControls(); rTray();
    }, 1400);
  }
  function closeBook() {
    bookOpen = false; choice = null; selUid = null; Snd.flip();
    R.book();
    var cv = $('#cover'); if (cv) cv.classList.add('closing');
  }

  function chooseCover() {
    var p = P(), m = $('#modal');
    m.innerHTML = '<div class="sheet-modal"><h2>🎨 ちょうを えらぼう</h2><div class="cover-pick">' + D.COVERS.map(function (c) {
      return '<button class="cp' + (p.cover === c.id ? ' on' : '') + '" data-c="' + c.id + '"><div class="mini-binder cov-' + c.id + '"><div class="cover"><div class="cover-insert"></div><div class="cover-gloss"></div></div><div class="rings"><i></i><i></i><i></i></div><div class="belt closed"><b class="snap"></b></div></div><span>' + c.name + '</span></button>';
    }).join('') + '</div><button class="big" id="cpClose">とじる</button></div>';
    m.classList.remove('hidden');
    $$('.cp', m).forEach(function (b) {
      b.onclick = function () { p.cover = b.dataset.c; save(); Snd.pop(); m.classList.add('hidden'); m.innerHTML = ''; R.book(); };
    });
    $('#cpClose').onclick = function () { m.classList.add('hidden'); m.innerHTML = ''; };
  }

  // ページめくり：いまの ページの コピーを そらせながら めくる
  function flip(dir) {
    var np = pageIdx + dir;
    if (!bookOpen || flipping || np < 0 || np >= D.PAGES.length) return;
    flipping = true; selUid = null; Snd.flip();
    var area = $('#pageArea'), page = $('#page'), fl;
    var done = function () {
      if (!flipping) return;
      if (dir < 0) fillPage($('#page'), pageIdx);
      if (fl && fl.parentNode) fl.parentNode.removeChild(fl);
      flipping = false;
    };
    if (dir > 0) {
      fl = page.cloneNode(true); fl.removeAttribute('id'); fl.classList.add('flipper', 'fwd');
      area.appendChild(fl);
      pageIdx = np; fillPage(page, pageIdx);
    } else {
      pageIdx = np;
      fl = document.createElement('div'); fillPage(fl, pageIdx); fl.classList.add('flipper', 'back');
      area.appendChild(fl);
    }
    fl.addEventListener('animationend', done);
    setTimeout(done, 900);
    rControls(); rTray();
  }

  function itemByUid(u) { var arr = P().pages[pageIdx]; for (var i = 0; i < arr.length; i++) if (arr[i].uid === u) return arr[i]; return null; }
  function markSel() { $$('#page .placed').forEach(function (e) { e.classList.toggle('sel', e.dataset.uid === selUid); }); }
  function select(u) { selUid = u; choice = null; markSel(); rControls(); rTray(); }

  function peelItem(it, el) {
    var p = P(), arr = p.pages[pageIdx], i = arr.indexOf(it);
    if (i < 0) return;
    arr.splice(i, 1);
    invAdd(p, it.key, 1); save(); Snd.peel();
    toast(stkName(it.key) + ' を もちものに もどしたよ');
    if (selUid === it.uid) selUid = null;
    if (el) { el.classList.add('peeling'); setTimeout(function () { var pg = $('#page'); if (pg) fillPage(pg, pageIdx); }, 350); }
    else fillPage($('#page'), pageIdx);
    rControls(); rTray();
  }

  function editSel(a) {
    var it = itemByUid(selUid);
    if (a === 'done' || !it) { selUid = null; markSel(); rControls(); return; }
    var el = $('#page .placed[data-uid="' + selUid + '"]');
    if (a === 'big') it.s = Math.min(2.6, +(it.s + 0.2).toFixed(2));
    if (a === 'small') it.s = Math.max(0.4, +(it.s - 0.2).toFixed(2));
    if (a === 'rl') it.r = (it.r - 15) % 360;
    if (a === 'rr') it.r = (it.r + 15) % 360;
    if (a === 'peel') { peelItem(it, el); return; }
    save(); Snd.tap();
    if (el) { el.style.setProperty('--s', it.s); el.style.setProperty('--r', it.r + 'deg'); }
  }

  /* ドラッグの かげ（ゆびに くっついて うごく シール） */
  var ghost = null;
  function ghostSize(scale) { var pw = pagePW(); return (pw ? pw * 0.2 : 110) * (scale || 1); }
  function makeGhost(k, scale, cls) {
    dropGhost();
    var size = ghostSize(scale);
    ghost = document.createElement('div');
    ghost.className = 'ghost ' + (cls || '');
    ghost.style.fontSize = size + 'px';
    ghost.innerHTML = stkHTML(k) + (cls === 'peel' ? '<span class="ghost-tag">はがす</span>' : '');
    ghost._s = size;
    document.body.appendChild(ghost);
    return ghost;
  }
  function moveGhost(x, y) { if (ghost) ghost.style.transform = 'translate3d(' + (x - ghost._s / 2) + 'px,' + (y - ghost._s / 2) + 'px,0)'; }
  function dropGhost(anim) {
    if (!ghost) return;
    var g = ghost; ghost = null;
    if (anim) { g.classList.add(anim); setTimeout(function () { g.remove(); }, 260); } else g.remove();
  }
  function inPage(x, y) {
    var pg = $('#page'); if (!pg || !bookOpen || scr !== 'book') return false;
    var r = pg.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }
  function canDrop(k) {
    if (!isRewardPage()) return true;
    if (boardMode()) return false;
    return isRewardKey(k);
  }
  function dropNG(k) {
    if (boardMode()) toast('「✋ はる」に すると はれるよ');
    else toast('ここは ごほうびシール だけ はれるよ');
    Snd.ng();
  }

  /* もちもの（トレイ・もちものシート）から ドラッグで はる */
  var sdrag = null, suppressClick = 0;
  function beginSourceDrag(e, k, el, axis) {
    if (sdrag || drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
    sdrag = { id: e.pointerId, k: k, el: el, x0: e.clientX, y0: e.clientY, axis: axis, type: e.pointerType, active: false };
    if (e.pointerType !== 'mouse') sdrag.timer = setTimeout(function () { if (sdrag && !sdrag.active) activateSource(sdrag.x0, sdrag.y0); }, 280);
    document.addEventListener('pointermove', sMove, true);
    document.addEventListener('pointerup', sUp, true);
    document.addEventListener('pointercancel', sCancel, true);
  }
  function activateSource(x, y) {
    var d = sdrag; if (!d) return;
    clearTimeout(d.timer);
    d.active = true; suppressClick = Date.now() + 100000;
    if (d.el) d.el.classList.add('lifted');
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (er) {} }
    if (scr !== 'book') { choice = null; bookOpen = true; go('book'); }
    else if (!bookOpen && !opening) { bookOpen = true; R.book(); }
    choice = null; selUid = null; markSel(); rControls();
    makeGhost(d.k, 1.15, 'lift');
    moveGhost(x, y); Snd.tap();
  }
  function sMove(e) {
    var d = sdrag; if (!d || e.pointerId !== d.id) return;
    var dx = e.clientX - d.x0, dy = e.clientY - d.y0, dist = Math.hypot(dx, dy);
    if (!d.active) {
      if (d.type === 'mouse') { if (dist > 6) activateSource(e.clientX, e.clientY); }
      else if (dist > 10) {
        var across = d.axis === 'x' ? Math.abs(dy) > Math.abs(dx) : Math.abs(dx) > Math.abs(dy);
        if (across) activateSource(e.clientX, e.clientY); else { sEnd(); return; }
      }
      if (!d.active) return;
    }
    moveGhost(e.clientX, e.clientY);
    var over = inPage(e.clientX, e.clientY), ok = over && canDrop(d.k);
    if (ghost) { ghost.classList.toggle('over', ok); ghost.classList.toggle('ng', over && !ok); }
    var pg = $('#page'); if (pg) pg.classList.toggle('drop-ok', ok);
    e.preventDefault();
  }
  function sUp(e) {
    var d = sdrag; if (!d || e.pointerId !== d.id) return;
    if (d.active) {
      suppressClick = Date.now() + 400;
      var over = inPage(e.clientX, e.clientY);
      if (over && canDrop(d.k)) { dropGhost(); placeAt(e.clientX, e.clientY, d.k); }
      else { if (over) dropNG(d.k); dropGhost('back'); }
    }
    sEnd();
  }
  function sCancel(e) { var d = sdrag; if (!d || e.pointerId !== d.id) return; if (d.active) dropGhost('back'); sEnd(); }
  function sEnd() {
    var d = sdrag; sdrag = null;
    if (d) { clearTimeout(d.timer); if (d.el) d.el.classList.remove('lifted'); }
    if (!d || !d.active) suppressClick = 0;
    var pg = $('#page'); if (pg) pg.classList.remove('drop-ok');
    document.removeEventListener('pointermove', sMove, true);
    document.removeEventListener('pointerup', sUp, true);
    document.removeEventListener('pointercancel', sCancel, true);
  }
  // ドラッグちゅうは がめんを スクロールさせない
  document.addEventListener('touchmove', function (e) { if ((sdrag && sdrag.active) || (drag && drag.uid)) e.preventDefault(); }, { passive: false });

  /* ページの うえの そうさ（はった シールを うごかす・めくる・タップで はる） */
  var drag = null;
  function onDown(e) {
    if (!bookOpen || flipping || drag || sdrag) return;
    var page = $('#page');
    var pl = choice ? null : e.target.closest('.placed');
    try { page.setPointerCapture(e.pointerId); } catch (er) {}
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, uid: pl ? pl.dataset.uid : null, el: pl, moved: false, out: false };
    if (pl) {
      var it = itemByUid(pl.dataset.uid), r = page.getBoundingClientRect();
      drag.ox = it.x - (e.clientX - r.left) / r.width * 100;
      drag.oy = it.y - (e.clientY - r.top) / r.height * 100;
      if (selUid !== pl.dataset.uid) select(pl.dataset.uid);
    }
    page.onpointermove = onMove;
    page.onpointerup = onUp;
    page.onpointercancel = function () { if (drag && drag.out) { dropGhost(); if (drag.el) drag.el.style.visibility = ''; } drag = null; };
    e.preventDefault();
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.moved && Math.hypot(dx, dy) > 8) drag.moved = true;
    if (!(drag.uid && drag.moved)) return;
    var it = itemByUid(drag.uid); if (!it) return;
    if (inPage(e.clientX, e.clientY)) {
      if (drag.out) { drag.out = false; dropGhost(); drag.el.style.visibility = ''; }
      var r = $('#page').getBoundingClientRect();
      it.x = +clamp((e.clientX - r.left) / r.width * 100 + drag.ox, 0, 100).toFixed(2);
      it.y = +clamp((e.clientY - r.top) / r.height * 100 + drag.oy, 0, 100).toFixed(2);
      drag.el.style.left = it.x + '%'; drag.el.style.top = it.y + '%';
      drag.el.classList.add('dragging');
    } else {
      // ちょうの そとへ → はがれそう
      if (!drag.out) { drag.out = true; drag.el.style.visibility = 'hidden'; makeGhost(it.key, it.s * 1.1, 'peel'); }
      moveGhost(e.clientX, e.clientY);
    }
  }
  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag; drag = null;
    var dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (d.uid) {
      if (d.el) d.el.classList.remove('dragging');
      var it = itemByUid(d.uid);
      if (d.out && it) { dropGhost('poof'); peelItem(it, null); return; }
      if (d.moved) { save(); Snd.pop(); }
      else tapEffect(d.el && d.el.querySelector('.stk'));
      return;
    }
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) { flip(dx < 0 ? 1 : -1); return; }
    if (Math.hypot(dx, dy) < 14) {
      if (choice) placeAt(e.clientX, e.clientY, choice);
      else if (selUid) { selUid = null; markSel(); rControls(); }
    }
  }
  function placeAt(cx, cy, k) {
    var p = P();
    if (!k || !(p.inv[k] > 0)) { choice = null; rTray(); return false; }
    if (!canDrop(k)) { dropNG(k); return false; }
    var r = $('#page').getBoundingClientRect();
    var it = { uid: uid(), key: k, x: +clamp((cx - r.left) / r.width * 100, 3, 97).toFixed(2), y: +clamp((cy - r.top) / r.height * 100, 3, 97).toFixed(2), s: 1, r: 0 };
    p.pages[pageIdx].push(it);
    invAdd(p, k, -1);
    choice = null;
    save(); Snd.pop();
    selUid = it.uid;
    fillPage($('#page'), pageIdx);
    var el = $('#page .placed[data-uid="' + it.uid + '"]');
    if (el) el.classList.add('stuck');
    rControls(); rTray();
    return true;
  }

  /* ---------- 3. もちもの ---------- */
  R.inv = function () {
    var p = P(), list = invList(p), el = $('#scr-inv');
    if (choice && !(p.inv[choice] > 0)) choice = null;
    el.innerHTML = '<div class="paper"><h2>🎒 ' + esc(p.name) + ' の もちもの</h2>' +
      '<p class="sub">もっている シール <b>' + invTotal(p) + '</b>まい ・ ちょうに はった シール <b>' + placedTotal(p) + '</b>まい</p>' +
      (list.length ? '<p class="hint">👆 シールを ゆびで おさえて うごかすと、ちょうに はれるよ</p><div class="inv-grid">' + list.map(function (k) {
        return '<button class="inv-item' + (k === choice ? ' on' : '') + '" data-k="' + esc(k) + '"><div class="ii">' + stkHTML(k) + '</div>' +
          '<span class="cnt">×' + p.inv[k] + '</span><span class="nm">' + esc(stkName(k)) + '</span>' + texLabel(k) + '</button>';
      }).join('') + '</div>' : '<div class="empty">まだ シールが ないよ<br>📄 シールシート や 🎰 ガチャ で あつめよう！</div>') +
      '</div><div class="bottom-bar"><button class="big pri" id="useBtn"' + (choice ? '' : ' disabled') + '>📖 ちょうに はる</button></div>';
    $$('.inv-item', el).forEach(function (b) {
      b.addEventListener('pointerdown', function (e) { beginSourceDrag(e, b.dataset.k, b, 'y'); });
      b.onclick = function () {
        if (Date.now() < suppressClick) return;
        if (choice === b.dataset.k) tapEffect(b.querySelector('.stk'));
        choice = b.dataset.k; Snd.tap();
        $$('.inv-item', el).forEach(function (x) { x.classList.toggle('on', x === b); });
        $('#useBtn').disabled = false;
      };
    });
    $('#useBtn').onclick = function () {
      if (!choice) return;
      var c = choice;
      if (isRewardPage() && !isRewardKey(c)) pageIdx = 0;
      go('book'); choice = c;
      if (!bookOpen) { openBook(); } else rTray();
      setTimeout(rTray, 1450);
    };
  };

  /* ---------- 4. シールシート ---------- */
  var sheetIdx = 0;
  function normalSheets() { return D.SHEETS.filter(function (s) { return !s.reward; }); }
  function rewardSheet() { return D.SHEETS.filter(function (s) { return s.reward; })[0]; }
  function sheetTabs(idx, id, list) {
    return '<div class="tabs" id="' + id + '">' + (list || D.SHEETS).map(function (s, i) {
      return '<button class="tab' + (i === idx ? ' on' : '') + '" data-i="' + i + '">' + sheetIcon(s) + '<span>' + s.name + '</span></button>';
    }).join('') + '</div>';
  }
  R.sheets = function () {
    var el = $('#scr-sheets'), sh = D.SHEETS[sheetIdx];
    if (!sh) { sheetIdx = 0; sh = D.SHEETS[0]; }
    el.innerHTML = sheetTabs(sheetIdx, 'sheetTabs') +
      '<div class="sheet-scroll"><div class="lace lace-' + sh.id + (sh.reward ? ' lace-reward' : '') + '"><div class="sheet sheet-' + sh.id + '">' +
      '<div class="sheet-title">' + sheetIcon(sh) + ' ' + sh.name + ' シール</div>' +
      '<div class="sheet-grid' + (sh.norun ? ' many' : '') + '">' + sh.items.map(function (it) {
        var k = keyOf(it.id, it.tex);
        return '<button class="sheet-item" data-k="' + k + '">' + stkHTML(k) + '</button>';
      }).join('') + '</div><div class="sheet-foot">' + (sh.reward ? '🏆 ごほうびシールは おうちの ひとから もらえる とくべつな シールだよ' : 'すきな シールを タップすると もちものに はいるよ') +
      (sh.items.some(function (it) { var a = window.SealAssets.get(it.id); return a && a.placeholder; }) ? '<br><small>「かり」の シールは、ほんものの え が とどくまでの かりの え です</small>' : '') +
      '</div></div></div></div>';
    $$('.tab', $('#sheetTabs')).forEach(function (b) { b.onclick = function () { sheetIdx = +b.dataset.i; Snd.tap(); R.sheets(); }; });
    $$('.sheet-item', el).forEach(function (b) {
      b.onclick = function () {
        var p = P(), k = b.dataset.k;
        if (sh.reward) { tapEffect(b.querySelector('.stk')); toast('ごほうびシールは おうちの ひとから もらえるよ'); return; }
        invAdd(p, k, 1); save(); Snd.get();
        tapEffect(b.querySelector('.stk'));
        flyTo(b, $('#nav [data-go="inv"]'));
        toast(stkName(k) + ' を もちものに いれたよ！');
      };
    });
  };
  function flyTo(from, to) {
    if (!from || !to || !from.animate) return;
    var a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    var c = from.cloneNode(true); c.className = 'flyer';
    c.style.left = a.left + 'px'; c.style.top = a.top + 'px'; c.style.width = a.width + 'px'; c.style.height = a.height + 'px';
    document.body.appendChild(c);
    var dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    var an = c.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + dx * 0.5 + 'px,' + (dy * 0.5 - 60) + 'px) scale(.8)', opacity: 1 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.3)', opacity: 0.3 }], { duration: 650, easing: 'ease-in' });
    an.onfinish = function () { c.remove(); to.classList.add('bump'); setTimeout(function () { to.classList.remove('bump'); }, 400); };
  }

  /* ---------- 5. ガチャ ---------- */
  var spinning = false;
  function rollGacha() {
    var ns = normalSheets(), sh = ns[Math.floor(Math.random() * ns.length)];
    var it = sh.items[Math.floor(Math.random() * sh.items.length)];
    var r = Math.random(), tex = r < 0.3 ? 'puffy' : r < 0.55 ? 'water' : 'normal';
    return keyOf(it.id, tex);
  }
  var CAPS = ['#ff8fb8', '#6cb8ff', '#ffd84d', '#7ee0a0', '#c7a4ff', '#ffab6b'];
  R.gacha = function () {
    var p = P(), el = $('#scr-gacha'), t = p.tickets;
    var caps = '';
    var POS = [[20, 84], [39, 87], [58, 86], [77, 83], [29, 70], [48, 72], [67, 70], [84, 66], [14, 66], [38, 56], [57, 57], [75, 52], [24, 50], [46, 41], [64, 40], [33, 33]];
    POS.forEach(function (q, i) { caps += '<i style="--c:' + CAPS[i % CAPS.length] + ';left:' + q[0] + '%;top:' + q[1] + '%;--rot:' + (i * 67 % 360) + 'deg"></i>'; });
    el.innerHTML = '<div class="gacha-wrap"><div class="machine" id="machine"><div class="g-dome"><div class="g-caps">' + caps + '</div><i class="g-shine"></i></div>' +
      '<div class="g-body"><div class="g-label">シール ガチャ</div><div class="g-handle" id="gHandle"><i></i></div><div class="g-out"></div></div></div>' +
      '<div class="g-side"><div class="g-tickets">🎫 ガチャけん<br><b id="gCount">' + t + '</b> まい</div>' +
      (t > 0 ? '<button class="big pri huge" id="spinBtn">まわす！<small>けん 1まい つかうよ</small></button>' :
        '<div class="g-none" id="gNone">🎫 けんが ないよ<br><b>ほごしゃに けんを もらってね</b></div><button class="big huge" id="spinBtn" disabled>まわす！</button>') +
      '<p class="g-hint">ぷっくり や ウォーター が でるかも！</p></div></div><div class="g-result hidden" id="gResult"></div>';
    var sb = $('#spinBtn');
    if (sb && t > 0) sb.onclick = spin;
  };
  function spin() {
    var p = P();
    if (spinning) return;
    if (p.tickets < 1) { Snd.ng(); toast('ほごしゃに けんを もらってね'); return; }
    spinning = true;
    p.tickets -= 1;
    var k = rollGacha();
    invAdd(p, k, 1);
    save(); updTop();
    $('#gCount').textContent = p.tickets;
    $('#spinBtn').disabled = true;
    $('#gHandle').classList.add('turn'); $('#machine').classList.add('shake');
    Snd.gacha();
    var col = CAPS[Math.floor(Math.random() * CAPS.length)];
    setTimeout(function () {
      var r = $('#gResult'); if (!r) { spinning = false; return; }
      var tex = parseKey(k).tex;
      r.innerHTML = '<div class="g-res-inner"><div class="capsule" style="--c:' + col + '"><i class="top"></i><i class="bot"></i></div>' +
        '<div class="prize">' + stkHTML(k) + '</div><div class="g-msg"><b>' + esc(stkName(k)) + '</b> が でたよ！' +
        (tex !== 'normal' ? '<br><span class="texb tb-' + tex + ' bigtex">' + D.TEX_NAME[tex] + ' シール！</span>' : '') + '</div>' +
        '<div class="g-btns">' + (p.tickets > 0 ? '<button class="big pri" id="gAgain">もういちど</button>' : '') + '<button class="big" id="gClose">やったね！</button></div></div>';
      r.classList.remove('hidden');
      setTimeout(function () { Snd.win(); }, 900);
      var again = $('#gAgain');
      $('#gClose').onclick = function () { spinning = false; R.gacha(); };
      if (again) again.onclick = function () { spinning = false; R.gacha(); spin(); };
      $('.prize .stk', r).addEventListener('click', function (ev) { tapEffect(ev.currentTarget); });
    }, 1300);
  }

  /* ---------- 6. こうかん・プレゼント ---------- */
  var tr = { step: 'who' };
  function fmtTime(t) { var d = new Date(t); return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function stkGrid(p, sel, id) {
    var list = invList(p);
    if (!list.length) return '<div class="empty">シールを もっていないよ</div>';
    return '<div class="inv-grid" id="' + id + '">' + list.map(function (k) {
      return '<button class="inv-item' + (k === sel ? ' on' : '') + '" data-k="' + esc(k) + '"><div class="ii">' + stkHTML(k) + '</div><span class="cnt">×' + p.inv[k] + '</span><span class="nm">' + esc(stkName(k)) + '</span>' + texLabel(k) + '</button>';
    }).join('') + '</div>';
  }
  function who(i) { var q = S.players[i]; return '<span class="whochip" style="--c:' + q.color + '">' + q.face + ' ' + esc(q.name) + '</span>'; }
  R.trade = function () {
    var el = $('#scr-trade'), me = P(), h = '<div class="paper trade">';
    var back = '<button class="mid back" id="trBack">◀ もどる</button>';
    if (tr.step === 'who') {
      h += '<h2>🔄 こうかん ・ 🎁 プレゼント</h2><p class="sub">だれと する？</p><div class="partners">' +
        S.players.map(function (q, i) {
          if (i === cur) return '';
          return '<button class="pcard small" data-i="' + i + '" style="--c:' + q.color + '"><span class="pface">' + q.face + '</span><span class="pname">' + esc(q.name) + '</span><span class="pmeta">シール ' + invTotal(q) + 'まい</span></button>';
        }).join('') + '</div>';
      h += '<h3>📜 りれき</h3>' + (S.history.length ? '<ul class="hist">' + S.history.slice(0, 30).map(function (x) {
        return '<li><span class="ht">' + fmtTime(x.t) + '</span> ' + (x.type === 'trade' ?
          esc(x.na) + ' ⇄ ' + esc(x.nb) + ' <span class="hs">' + stkHTML(x.ka) + '</span>と<span class="hs">' + stkHTML(x.kb) + '</span>を こうかん' :
          esc(x.na) + ' → ' + esc(x.nb) + ' <span class="hs">' + stkHTML(x.ka) + '</span>を プレゼント') + '</li>';
      }).join('') + '</ul>' : '<p class="sub">まだ ないよ</p>');
    } else if (tr.step === 'mode') {
      h += back + '<h2>' + who(tr.partner) + ' と なにする？</h2><div class="modes">' +
        '<button class="mode" data-m="trade">🔄<b>こうかん</b><span>シールを とりかえっこ</span></button>' +
        '<button class="mode" data-m="gift">🎁<b>プレゼント</b><span>シールを あげる</span></button></div>';
    } else if (tr.step === 'give') {
      h += back + '<h2>' + who(cur) + ' が あげる シールを えらんでね</h2>' + stkGrid(me, tr.give, 'giveGrid');
    } else if (tr.step === 'get') {
      h += back + '<h2>' + who(tr.partner) + ' の シールから ほしい シールを えらんでね</h2>' + stkGrid(S.players[tr.partner], tr.get, 'getGrid');
    } else if (tr.step === 'confirm') {
      var isT = tr.mode === 'trade';
      h += back + '<h2>' + (isT ? 'これで こうかんする？' : 'これを プレゼントする？') + '</h2>' +
        '<div class="confirm-row"><div class="cbox">' + who(cur) + '<div class="cstk">' + stkHTML(tr.give) + '</div><span>' + esc(stkName(tr.give)) + '</span></div>' +
        '<div class="carrow">' + (isT ? '⇄' : '➡') + '</div>' +
        '<div class="cbox">' + who(tr.partner) + '<div class="cstk">' + (isT ? stkHTML(tr.get) + '</div><span>' + esc(stkName(tr.get)) + '</span>' : '<span class="giftbox">🎁</span></div><span>もらう</span>') + '</div></div>' +
        '<div class="bottom-bar"><button class="big" id="trCancel">やめる</button><button class="big pri huge" id="trDo">' + (isT ? 'こうかんする' : 'プレゼントする') + '</button></div>';
    }
    el.innerHTML = h + '</div>';

    if ($('#trBack')) $('#trBack').onclick = function () {
      tr.step = { mode: 'who', give: 'mode', get: 'give', confirm: tr.mode === 'trade' ? 'get' : 'give' }[tr.step];
      R.trade();
    };
    $$('.partners .pcard', el).forEach(function (b) { b.onclick = function () { tr = { step: 'mode', partner: +b.dataset.i }; Snd.tap(); R.trade(); }; });
    $$('.mode', el).forEach(function (b) { b.onclick = function () { tr.mode = b.dataset.m; tr.step = 'give'; tr.give = tr.get = null; Snd.tap(); R.trade(); }; });
    $$('#giveGrid .inv-item').forEach(function (b) { b.onclick = function () { tr.give = b.dataset.k; tr.step = tr.mode === 'trade' ? 'get' : 'confirm'; Snd.tap(); R.trade(); }; });
    $$('#getGrid .inv-item').forEach(function (b) { b.onclick = function () { tr.get = b.dataset.k; tr.step = 'confirm'; Snd.tap(); R.trade(); }; });
    if ($('#trCancel')) $('#trCancel').onclick = function () { tr = { step: 'who' }; R.trade(); };
    if ($('#trDo')) $('#trDo').onclick = doTrade;
  };
  function doTrade() {
    var a = P(), b = S.players[tr.partner], isT = tr.mode === 'trade';
    if (!(a.inv[tr.give] > 0) || (isT && !(b.inv[tr.get] > 0))) { Snd.ng(); toast('その シールは もう ないよ'); tr = { step: 'who' }; R.trade(); return; }
    invAdd(a, tr.give, -1); invAdd(b, tr.give, 1);
    if (isT) { invAdd(b, tr.get, -1); invAdd(a, tr.get, 1); }
    S.history.unshift({ t: Date.now(), type: isT ? 'trade' : 'gift', a: cur, b: tr.partner, na: a.name, nb: b.name, ka: tr.give, kb: isT ? tr.get : null });
    S.history = S.history.slice(0, 100);
    save(); Snd.win();
    toast(isT ? '🔄 こうかん できたよ！' : '🎁 プレゼント したよ！');
    tr = { step: 'who' }; R.trade();
  }

  /* ---------- 7. ほごしゃ モード ---------- */
  function pinPad(title, sub, onEnter, onCancel) {
    var m = $('#modal'), buf = '';
    m.innerHTML = '<div class="pin"><h2>' + title + '</h2><p class="sub">' + (sub || '') + '</p><div class="dots" id="pinDots"><i></i><i></i><i></i><i></i></div>' +
      '<div class="keys">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 'けす', 0, 'やめる'].map(function (k) {
        return '<button class="key' + (typeof k === 'string' ? ' fn' : '') + '" data-k="' + k + '">' + k + '</button>';
      }).join('') + '</div></div>';
    m.classList.remove('hidden');
    function show() { $$('#pinDots i').forEach(function (d, i) { d.classList.toggle('on', i < buf.length); }); }
    $$('.key', m).forEach(function (b) {
      b.onclick = function () {
        var k = b.dataset.k;
        if (k === 'やめる') { m.classList.add('hidden'); m.innerHTML = ''; if (onCancel) onCancel(); return; }
        if (k === 'けす') { buf = buf.slice(0, -1); show(); return; }
        if (buf.length >= 4) return;
        buf += k; show(); Snd.tap();
        if (buf.length === 4) {
          var code = buf;
          setTimeout(function () {
            if (!onEnter(code)) { buf = ''; show(); var d = $('#pinDots'); if (d) { d.classList.add('ng'); setTimeout(function () { d.classList.remove('ng'); }, 500); } }
          }, 150);
        }
      };
    });
  }
  function openParent() {
    pinPad('🔒 ほごしゃ モード', 'パスワード（4けた）を いれてください', function (code) {
      if (code === S.pass) { pp = { i: cur === null ? 0 : cur, view: 'main', sheet: 0, tex: 'normal', rk: null, reason: null }; showParent(); return true; }
      Snd.ng(); return false;
    });
  }
  var pp = { i: 0, view: 'main', sheet: 0, tex: 'normal', rk: null, reason: null };
  function closeParent() { var m = $('#modal'); m.classList.add('hidden'); m.innerHTML = ''; rerender(); setTimeout(checkRewards, 300); }
  function showParent() {
    var m = $('#modal'), q = S.players[pp.i];
    m.classList.remove('hidden');
    var h = '<div class="parent"><div class="pp-head"><h2>🔒 ほごしゃ モード</h2><button class="big" id="ppClose">とじる</button></div>' +
      '<div class="pp-tabs">' + S.players.map(function (x, i) {
        return '<button class="pp-tab' + (i === pp.i ? ' on' : '') + '" data-i="' + i + '" style="--c:' + x.color + '">' + x.face + ' ' + esc(x.name) + '</button>';
      }).join('') + '</div>';
    if (pp.view === 'main') {
      var rs = rewardSheet();
      h += '<div class="pp-reward"><h3>🏆 ごほうびシールを あげる</h3>' +
        '<div class="ppr-step"><span class="ppr-no">1</span><b>あげる こ</b>' + who(pp.i) + '<small>（うえで えらべます）</small></div>' +
        '<div class="ppr-step"><span class="ppr-no">2</span><b>シール</b></div><div class="ppr-stks">' + (rs ? rs.items.map(function (it) {
          var k = keyOf(it.id, it.tex);
          return '<button class="ppr-stk' + (pp.rk === k ? ' on' : '') + '" data-rk="' + k + '">' + stkHTML(k) + '</button>';
        }).join('') : '') + '</div>' +
        '<div class="ppr-step"><span class="ppr-no">3</span><b>りゆう</b></div><div class="ppr-reasons">' + D.REASONS.map(function (r) {
          return '<button class="ppr-reason' + (pp.reason === r.id ? ' on' : '') + '" data-rs="' + r.id + '" style="--rc:' + r.color + '"><i>' + r.icon + '</i><b>' + r.name + '</b></button>';
        }).join('') + '</div>' +
        '<div class="ppr-go"><button class="big pri huge" id="ppRewardGo"' + (pp.rk && pp.reason ? '' : ' disabled') + '>🎁 ' + esc(q.name) + ' に あげる</button>' +
        '<small>つぎに ' + esc(q.name) + ' で ひらいた ときに、おいわいの えんしゅつと いっしょに とどきます</small></div></div>' +
        '<div class="pp-grid">' +
        '<div class="pp-card"><h3>🎫 ガチャけんを あげる</h3><p>いま <b id="ppT">' + q.tickets + '</b> まい</p><div class="row"><button class="big pri" data-t="1">＋1</button><button class="big pri" data-t="5">＋5</button></div></div>' +
        '<div class="pp-card"><h3>🎁 シールを あげる</h3><p>ぜんぶの シートから えらべます</p><button class="big pri" id="ppGive">シールを えらぶ</button></div>' +
        '<div class="pp-card"><h3>✏️ なまえ と かお</h3><div class="row"><input id="ppName" maxlength="10" value="' + esc(q.name) + '"><button class="big" id="ppNameBtn">かえる</button></div>' +
        '<div class="faces">' + D.FACES.map(function (f) { return '<button class="facebtn' + (f === q.face ? ' on' : '') + '" data-f="' + f + '">' + f + '</button>'; }).join('') + '</div></div>' +
        '<div class="pp-card"><h3>🗑 データを リセット</h3><p>シール・はったもの・けん・ちょうの しゅるい・ごほうびの りれきを さいしょに もどします（なまえ と かお は のこります）</p><button class="big danger" id="ppReset">リセット</button></div>' +
        '<div class="pp-card"><h3>🖼 シールの え</h3><p>ほんばんの PNG：<b id="ppReal">' + (window.SealAssets.total() - window.SealAssets.placeholderCount()) + '</b>まい ／ かりの えもじ：<b id="ppPh">' + window.SealAssets.placeholderCount() + '</b>まい</p><p>PNG の おきかたは README を みてください</p></div>' +
        '<div class="pp-card"><h3>🔑 パスワードを かえる</h3><p>4けたの すうじ</p><button class="big" id="ppPass">かえる</button></div>' +
        '</div>' + rewardHistoryHTML();
    } else {
      var ns = normalSheets(), sh = ns[pp.sheet] || ns[0];
      h += '<div class="pp-give"><div class="row"><button class="mid back" id="ppBack">◀ もどる</button><b>' + esc(q.name) + ' に あげる シールを タップ</b></div>' +
        sheetTabs(pp.sheet, 'ppSheetTabs', ns) +
        '<div class="row texrow">しつかん：' + ['normal', 'puffy', 'water'].map(function (t) { return '<button class="mid texbtn' + (pp.tex === t ? ' on' : '') + '" data-tex="' + t + '">' + D.TEX_NAME[t] + '</button>'; }).join('') + '</div>' +
        '<div class="sheet-grid' + (sh.norun ? ' many' : '') + ' pp-sheet">' + sh.items.map(function (it) {
          var k = keyOf(it.id, pp.tex);
          return '<button class="sheet-item" data-k="' + k + '">' + stkHTML(k) + '</button>';
        }).join('') + '</div></div>';
    }
    m.innerHTML = h + '</div>';

    $('#ppClose').onclick = closeParent;
    $$('.pp-tab', m).forEach(function (b) { b.onclick = function () { pp.i = +b.dataset.i; showParent(); }; });
    $$('[data-t]', m).forEach(function (b) {
      b.onclick = function () { q.tickets += +b.dataset.t; save(); Snd.get(); $('#ppT').textContent = q.tickets; toast(esc(q.name) + ' に けんを ' + b.dataset.t + 'まい あげたよ'); };
    });
    if ($('#ppGive')) $('#ppGive').onclick = function () { pp.view = 'give'; showParent(); };
    if ($('#ppNameBtn')) $('#ppNameBtn').onclick = function () {
      var v = $('#ppName').value.trim().slice(0, 10);
      if (!v) { toast('なまえを いれてね'); return; }
      q.name = v; save(); toast('なまえを かえたよ'); showParent();
    };
    $$('.facebtn', m).forEach(function (b) { b.onclick = function () { q.face = b.dataset.f; save(); showParent(); }; });
    if ($('#ppReset')) $('#ppReset').onclick = function () {
      ask(esc(q.name) + ' の データを リセットしますか？', 'つぎへ', true).then(function (ok) {
        if (!ok) return;
        return ask('ほんとうに けしますか？<br>もとに もどせません。', 'リセットする', true).then(function (ok2) {
          if (!ok2) return;
          var n = newPlayer(pp.i); n.name = q.name; n.face = q.face;
          S.players[pp.i] = n;
          if (cur === pp.i) { choice = null; selUid = null; pageIdx = 0; bookOpen = false; }
          save(); toast('リセット しました'); showParent();
        });
      });
    };
    if ($('#ppPass')) $('#ppPass').onclick = function () {
      pinPad('🔑 あたらしい パスワード', '4けたを いれてください', function (c1) {
        pinPad('🔑 もういちど', 'おなじ 4けたを いれてください', function (c2) {
          if (c2 !== c1) { Snd.ng(); toast('ちがう すうじでした。もういちど'); return false; }
          S.pass = c2; save(); toast('パスワードを かえました'); showParent(); return true;
        }, showParent);
        return true;
      }, showParent);
    };
    if ($('#ppBack')) $('#ppBack').onclick = function () { pp.view = 'main'; showParent(); };
    $$('.ppr-stk', m).forEach(function (b) { b.onclick = function () { pp.rk = b.dataset.rk; Snd.tap(); showParent(); }; });
    $$('.ppr-reason', m).forEach(function (b) { b.onclick = function () { pp.reason = b.dataset.rs; Snd.tap(); showParent(); }; });
    if ($('#ppRewardGo')) $('#ppRewardGo').onclick = function () {
      if (!pp.rk || !pp.reason) return;
      q.rewards.push({ t: Date.now(), key: pp.rk, reason: pp.reason, seen: false });
      save(); Snd.win();
      toast('🏆 ' + esc(q.name) + ' に ごほうびを おくったよ');
      pp.rk = null; pp.reason = null; showParent();
    };
    $$('#ppSheetTabs .tab').forEach(function (b) { b.onclick = function () { pp.sheet = +b.dataset.i; showParent(); }; });
    $$('.texbtn', m).forEach(function (b) { b.onclick = function () { pp.tex = b.dataset.tex; showParent(); }; });
    $$('.pp-sheet .sheet-item', m).forEach(function (b) {
      b.onclick = function () { invAdd(q, b.dataset.k, 1); save(); Snd.get(); tapEffect(b.querySelector('.stk')); toast(esc(q.name) + ' に ' + esc(stkName(b.dataset.k)) + ' を あげたよ'); };
    });
  }

  function rewardHistoryHTML() {
    var all = [];
    S.players.forEach(function (x, i) { x.rewards.forEach(function (r) { all.push({ i: i, r: r }); }); });
    all.sort(function (a, b) { return b.r.t - a.r.t; });
    return '<div class="pp-card pp-hist"><h3>📜 ごほうびの りれき</h3>' + (all.length ? '<ul class="hist">' + all.slice(0, 80).map(function (x) {
      return '<li><span class="ht">' + fmtTime(x.r.t) + '</span>' + who(x.i) + '<span class="hs">' + (validKey(x.r.key) ? stkHTML(x.r.key) : '') + '</span>' + esc(stkName(x.r.key)) + ' ' + reasonChip(x.r.reason) +
        '<span class="hstate' + (x.r.seen ? ' got' : '') + '">' + (x.r.seen ? 'とどいた' : 'まだ ひらいていない') + '</span></li>';
    }).join('') + '</ul>' : '<p>まだ ありません</p>') + '</div>';
  }

  /* ---------- 8. ごほうび の うけとり ---------- */
  var celebrating = false;
  function checkRewards() {
    if (cur === null || celebrating || scr === 'players') return;
    var p = P(), r = p.rewards.filter(function (x) { return !x.seen && validKey(x.key); })[0];
    if (!r) return;
    celebrating = true;
    var ov = $('#celebrate'), conf = '';
    var cols = ['#ffd84d', '#ff8fb8', '#8fd7ff', '#b9e8a6', '#d6c2ff', '#fff'];
    for (var i = 0; i < 36; i++) conf += '<i class="cf" style="--x:' + (Math.random() * 100).toFixed(1) + '%;--d:' + (Math.random() * 1.2).toFixed(2) + 's;--c:' + cols[i % cols.length] + ';--r:' + Math.floor(Math.random() * 360) + 'deg;--t:' + (2.2 + Math.random() * 1.6).toFixed(2) + 's"></i>';
    ov.innerHTML = '<div class="cel-rays"></div>' + conf + '<div class="cel-inner"><div class="cel-title">ごほうびシールを もらったよ！</div>' +
      '<div class="cel-stk">' + stkHTML(r.key) + '<i class="tw a">✦</i><i class="tw b">✦</i><i class="tw c">✧</i><i class="tw d">✦</i></div>' +
      '<div class="cel-name">' + esc(stkName(r.key)) + '</div><div class="cel-why">' + reasonChip(r.reason) + '</div>' +
      '<button class="big pri huge" id="celOk">やったー！</button></div>';
    ov.classList.remove('hidden');
    Snd.fanfare();
    $('.cel-stk .stk', ov).addEventListener('click', function (e) { tapEffect(e.currentTarget); });
    $('#celOk').onclick = function () {
      r.seen = true; r.got = Date.now();
      invAdd(p, r.key, 1); save(); Snd.get();
      ov.classList.add('hidden'); ov.innerHTML = ''; celebrating = false;
      toast('🏆 ' + esc(stkName(r.key)) + ' が もちものに はいったよ');
      rerender();
      setTimeout(checkRewards, 400);
    };
  }

  /* ---------- きどう ---------- */
  var ready = false;
  function init() {
    $$('#nav button').forEach(function (b) { b.onclick = function () { choice = b.dataset.go === 'book' ? choice : null; go(b.dataset.go); }; });
    $('#who').onclick = function () { cur = null; go('players'); };
    $('#lockBtn').onclick = openParent;
    $('#muteBtn').onclick = function () { S.muted = !S.muted; Snd.muted = S.muted; save(); updTop(); if (!S.muted) Snd.tap(); };
    document.addEventListener('pointerdown', function () { Snd.unlock(); }, { passive: true });
    document.addEventListener('contextmenu', function (e) { if (!e.target.closest('input')) e.preventDefault(); });
    window.addEventListener('resize', layoutBook);
    window.addEventListener('orientationchange', function () { setTimeout(layoutBook, 300); });
    if (window.ResizeObserver) new ResizeObserver(function () { layoutBook(); }).observe($('main'));
    var ps = $('#scr-players');
    ps.classList.add('on');
    ps.innerHTML = '<div class="loading"><div class="ld-book">📖</div><p>シールを じゅんびちゅう…</p><div class="ld-bar"><i id="ldBar"></i></div></div>';
    window.SealAssets.prepare(function (n, all) { var b = $('#ldBar'); if (b) b.style.width = Math.round(n / all * 100) + '%'; })
      .then(function () { ready = true; go('players'); })
      .catch(function () { ps.innerHTML = '<div class="loading"><p>シールを よみこめなかったよ<br>もういちど ひらいてね</p></div>'; });
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }
  // テストよう（がめんの そうさには つかわない）
  window.__seal = { state: function () { return S; }, key: KEY, ready: function () { return ready; }, roll: function () { return rollGacha(); } };
  init();
})();
