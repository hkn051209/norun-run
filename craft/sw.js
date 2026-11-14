/* =========================================================
   のるんクラフト（仮） Service Worker
   - さいしょの 読みこみで 下の ファイルを ぜんぶ ためる → 次からは オフラインでも 起動
   - ためた 物を すぐ 返し、うらで 新しい 物を 取りに 行って 入れかえる
     （ファイルを 直したら、次の 次の 起動で 新しく なる。すぐ 切りかえたい 時は CACHE の 数字を 上げる）
   ========================================================= */
const CACHE = "norun-craft-v1.0.0";
const FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "src/main.js",
  "src/config.js",
  "src/blocks.js",
  "src/textures.js",
  "src/world.js",
  "src/mesher.js",
  "src/player.js",
  "src/input.js",
  "src/save.js",
  "src/norun.js",
  "src/norun-model.js",
  "src/sfx.js",
  "lib/three.module.min.js",
  "lib/addons/GLTFLoader.js",
  "lib/addons/BufferGeometryUtils.js",
  "assets/models/norun-v7.glb",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-maskable-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("norun-craft-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // ?debug などが 付いて いても 同じ ファイルと して あつかう
    const hit = await cache.match(req, { ignoreSearch: true });
    const fresh = fetch(req).then((res) => {
      if (res && res.ok && res.type === "basic") cache.put(url.origin + url.pathname, res.clone()).catch(() => {});
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(fresh); return hit; }
    const res = await fresh;
    return res || new Response("offline", { status: 503, statusText: "offline" });
  })());
});
