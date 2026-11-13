/* のるんのだいぼうけん：Service Worker（オフラインでも 起動できるように）
   ・ゲームを 新しくしたら CACHE の番号を 1つ ふやす（古いキャッシュは 自動で けす）
   ・index.html は ネット優先（つながる時は いつも 最新）。絵・音・フォントは キャッシュ優先
   ・BGM（mp3）は はじめて 鳴らした時に まるごと キャッシュする（さいしょから 全曲は ダウンロードしない）
   ・絵も 起動直後に つかう ものだけ 先に 入れ、あとは はじめて つかった 時に 入れる */
const CACHE = 'norun-daibouken-v8-4-4';
const forms = ['normal','kurage','pan','obake','penguin'], dirs = ['front','back','side'];
const enemies = ['ant','bee','cat','cat_side','cat_back','crow','crow_side','crow_back','dog','dog_side','dog_back',
  'boss_cat','boss_cat_side','boss_cat_back','boss_crow','boss_crow_side','boss_crow_back','boss_hand','roomba'];
const pad = n => String(n).padStart(2,'0');
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];
const ASSETS = [   // 先に 入れておくのは 起動直後に つかう 絵だけ（タイトルまわり・のるん・敵・エフェクト）
  ...forms.flatMap(f => dirs.map(d => `img/norun_${f}_${d}.png`)),
  ...enemies.map(e => `img/enemy_${e}.png`),
  'img/fx-water-slash-chappi.png', 'img/fx-grass-chappi.png', 'img/fx-fire-chappi.png',
  'img/keyvisual_title.png', 'img/bg_title.png',
];
/* ステージ背景（stagebg_*）・地図／工房／結果の 背景・絵本の 絵・BGM は 先に 読まない。
   はじめて 画面を ひらいた時に 読んだものを その時 キャッシュに 入れ、2回目からは キャッシュから 出す */
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c =>
    Promise.all([...CORE, ...ASSETS].map(u => c.add(u).catch(() => {})))   // 無いファイルは とばす
  ).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('norun-daibouken-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// mp3 の「とちゅうから」の読み込み（Range）に、キャッシュした まるごとの ファイルから 切り出して こたえる
async function rangeFrom(res, range) {
  const buf = await res.arrayBuffer(), m = /bytes=(\d*)-(\d*)/.exec(range || '');
  if (!m) return new Response(buf, {status:200, headers:{'Content-Type':'audio/mpeg','Content-Length':String(buf.byteLength)}});
  const size = buf.byteLength;
  let a = m[1] === '' ? Math.max(0, size - (+m[2])) : +m[1], b = (m[1] !== '' && m[2] !== '') ? +m[2] : size - 1;
  b = Math.min(b, size - 1);
  return new Response(buf.slice(a, b + 1), {status:206, headers:{'Content-Type':'audio/mpeg','Content-Range':`bytes ${a}-${b}/${size}`,'Content-Length':String(b - a + 1),'Accept-Ranges':'bytes'}});
}
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url), same = url.origin === self.location.origin;
  const font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!same && !font) return;
  if (same && req.mode === 'navigate') {   // ページ本体：ネット優先 → だめなら キャッシュ
    e.respondWith(fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put('index.html', cp)); } return r; })
      .catch(() => caches.match('index.html').then(r => r || caches.match('./'))));
    return;
  }
  if (same && /\.mp3$/.test(url.pathname)) {   // BGM
    e.respondWith((async () => {
      const c = await caches.open(CACHE), key = url.pathname;
      let r = await c.match(key);
      if (!r) { try { const full = await fetch(key); if (!full.ok) return full; await c.put(key, full.clone()); r = full; } catch (err) { return fetch(req); } }
      return rangeFrom(r.clone(), req.headers.get('range'));
    })());
    return;
  }
  e.respondWith(caches.match(req, {ignoreSearch: same}).then(hit => hit || fetch(req).then(r => {   // 絵・フォントなど：キャッシュ優先
    if (r.ok || r.type === 'opaque') { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
    return r;
  })));
});
