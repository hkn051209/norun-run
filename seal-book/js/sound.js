/* こうかおん：すべて WebAudio で その場で つくる（おんせいファイルなし） */
'use strict';
window.Snd = (function () {
  var ctx = null;
  var o = { muted: false, count: {}, last: null };

  function ac() {
    if (!ctx) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function env(c, g, t, vol, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  function tone(f1, f2, dur, type, vol, delay) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (delay || 0);
    var os = c.createOscillator(), g = c.createGain();
    os.type = type || 'sine';
    os.frequency.setValueAtTime(f1, t);
    os.frequency.exponentialRampToValueAtTime(f2, t + dur);
    env(c, g, t, vol || 0.04, dur);
    os.connect(g); g.connect(c.destination);
    os.start(t); os.stop(t + dur + 0.02);
  }

  // かみの「ぱらっ」：みじかい ノイズを バンドパスで けずって 2かい ならす
  function noise(dur, f1, f2, vol, delay, q) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (delay || 0);
    var len = Math.max(1, Math.floor(c.sampleRate * dur));
    var buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.random());
    var src = c.createBufferSource(); src.buffer = buf;
    var bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q || 1.1;
    bp.frequency.setValueAtTime(f1, t);
    bp.frequency.exponentialRampToValueAtTime(f2, t + dur);
    var g = c.createGain(); env(c, g, t, vol, dur);
    src.connect(bp); bp.connect(g); g.connect(c.destination);
    src.start(t); src.stop(t + dur + 0.02);
  }

  function play(name, fn) {
    o.count[name] = (o.count[name] || 0) + 1;
    o.last = name;
    if (o.muted) return;
    try { if (ac()) fn(); } catch (e) { /* おとが でなくても あそべる */ }
  }

  o.unlock = function () { if (!o.muted) { try { ac(); } catch (e) {} } };
  o.flip = function () { play('flip', function () { noise(0.07, 3600, 1600, 0.05, 0, 0.9); noise(0.11, 2400, 900, 0.035, 0.06, 0.9); }); };
  o.pop = function () { play('pop', function () { tone(520, 980, 0.08, 'sine', 0.05); }); };
  o.peel = function () { play('peel', function () { noise(0.12, 1200, 4200, 0.035, 0, 2); }); };
  o.get = function () { play('get', function () { tone(880, 880, 0.07, 'triangle', 0.04); tone(1320, 1320, 0.12, 'triangle', 0.04, 0.07); }); };
  o.snap = function () { play('snap', function () { noise(0.03, 4200, 2600, 0.06, 0, 3); tone(320, 200, 0.05, 'square', 0.015, 0.01); }); };
  o.gacha = function () { play('gacha', function () { for (var i = 0; i < 7; i++) noise(0.04, 1900, 1400, 0.035, i * 0.13, 5); }); };
  o.win = function () { play('win', function () { [660, 880, 1100, 1320].forEach(function (f, i) { tone(f, f, 0.12, 'triangle', 0.04, i * 0.09); }); }); };
  // ごほうびの おいわい：ファンファーレ ＋ キラキラ
  o.fanfare = function () { play('fanfare', function () {
    [[523, 0], [659, .12], [784, .24], [1047, .36], [784, .56], [1047, .68]].forEach(function (n) { tone(n[0], n[0], 0.16, 'triangle', 0.05, n[1]); tone(n[0] * 2, n[0] * 2, 0.1, 'sine', 0.015, n[1]); });
    tone(1047, 1047, 0.6, 'triangle', 0.045, 0.82); tone(1319, 1319, 0.6, 'triangle', 0.03, 0.82); tone(1568, 1568, 0.6, 'sine', 0.025, 0.82);
    for (var i = 0; i < 10; i++) tone(2000 + Math.random() * 2500, 3000 + Math.random() * 2000, 0.06, 'sine', 0.012, 0.9 + i * 0.07);
  }); };
  o.ng = function () { play('ng', function () { tone(240, 170, 0.18, 'square', 0.02); }); };
  o.squish = function () { play('squish', function () { tone(260, 520, 0.12, 'sine', 0.05); }); };
  o.water = function () { play('water', function () { for (var i = 0; i < 5; i++) tone(1500 + Math.random() * 1500, 2600, 0.05, 'sine', 0.015, i * 0.05); }); };
  o.tap = function () { play('tap', function () { tone(700, 600, 0.04, 'sine', 0.025); }); };
  return o;
})();
