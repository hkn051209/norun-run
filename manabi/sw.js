/* のるん まなび：Service Worker（オフラインでも 起動できるように／ホーム画面に インストールできるように）
   ・ゲームを 新しくしたら CACHE の番号を 1つ ふやす（古いキャッシュは 自動で けす）
   ・index.html は ネット優先（つながる時は いつも 最新）。コード・絵・音は キャッシュ優先
   ・音（mp3）は はじめて 鳴らした時に まるごと キャッシュする（さいしょから 全曲は ダウンロードしない）
   ・大きい 素材（3Dモデル・テクスチャ等）は はじめて つかった 時に キャッシュへ 入れる */
const CACHE = 'norun-manabi-v1';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];
const BOOT = [   // 起動に 必要な コードと フォントだけ 先に 入れる
  'src/main.js', 'src/config.js', 'src/storage.js', 'src/quiz.js', 'src/kokugo-data.js',
  'src/sound.js', 'src/run3d.js', 'src/tower3d.js', 'src/asmr-rooms.js', 'src/norun3d.js', 'src/norun-model.js',
  'lib/three.module.min.js',
  'assets/fonts/mplus-rounded-1c-Medium.woff', 'assets/fonts/mplus-rounded-1c-ExtraBold.woff',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c =>
    Promise.all([...CORE, ...BOOT].map(u => c.add(u).catch(() => {})))   // 無いファイルは とばす
  ).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('norun-manabi-') && k !== CACHE).map(k => caches.delete(k))))
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
  if (!same) return;
  if (req.mode === 'navigate') {   // ページ本体：ネット優先 → だめなら キャッシュ
    e.respondWith(fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put('index.html', cp)); } return r; })
      .catch(() => caches.match('index.html').then(r => r || caches.match('./'))));
    return;
  }
  if (/\.mp3$/.test(url.pathname)) {   // 音
    e.respondWith((async () => {
      const c = await caches.open(CACHE), key = url.pathname;
      let r = await c.match(key);
      if (!r) { try { const full = await fetch(key); if (!full.ok) return full; await c.put(key, full.clone()); r = full; } catch (err) { return fetch(req); } }
      return rangeFrom(r.clone(), req.headers.get('range'));
    })());
    return;
  }
  e.respondWith(caches.match(req, {ignoreSearch: same}).then(hit => hit || fetch(req).then(r => {   // コード・絵など：キャッシュ優先
    if (r.ok || r.type === 'opaque') { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
    return r;
  })));
});
