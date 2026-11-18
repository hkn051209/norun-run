/* オフラインで あそべるように ファイルを ほぞんする
 * あとから おいた PNG も、さいしょに ネットで ひらいた ときに じどうで ほぞんされます。
 * ファイルを さしかえたら、下の CACHE の なまえを かえてください（例：-v5-1 → -v5-2）。
 */
const CACHE = 'sealbook-v5-1';
const ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "css/style.css",
  "js/data.js",
  "js/sound.js",
  "js/assets.js",
  "js/app.js",
  "stickers/stickers.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "stickers/norun/set1/01_normal.png",
  "stickers/norun/set1/02_happy.png",
  "stickers/norun/set1/03_salute.png",
  "stickers/norun/set1/04_sleep.png",
  "stickers/norun/set1/05_cry.png",
  "stickers/norun/set1/06_angry.png",
  "stickers/norun/set1/07_surprise.png",
  "stickers/norun/set1/08_melt.png",
  "stickers/norun/set1/09_cat.png",
  "stickers/norun/set1/10_rabbit.png",
  "stickers/norun/set1/11_bear.png",
  "stickers/norun/set1/12_panda.png",
  "stickers/norun/set1/13_fox.png",
  "stickers/norun/set1/14_penguin.png",
  "stickers/norun/set1/15_chick.png",
  "stickers/norun/set1/16_jellyfish.png",
  "stickers/norun/set1/17_bread.png",
  "stickers/norun/set1/18_strawberry.png",
  "stickers/norun/set1/19_pudding.png",
  "stickers/norun/set1/20_pancake.png",
  "stickers/norun/set1/21_onigiri.png",
  "stickers/norun/set1/22_donut.png",
  "stickers/norun/set1/23_mochi.png",
  "stickers/norun/set1/24_cupcake.png",
  "stickers/norun/set1/25_ghost.png",
  "stickers/norun/set1/26_heart.png",
  "stickers/norun/set1/27_star.png",
  "stickers/norun/set1/28_moon.png",
  "stickers/norun/set1/29_cloud.png",
  "stickers/norun/set1/30_mushroom.png",
  "stickers/norun/set1/31_gamepad.png",
  "stickers/norun/set1/32_cushion.png",
  "stickers/norun/set2/01_arigatou.png",
  "stickers/norun/set2/02_gomen.png",
  "stickers/norun/set2/03_ok.png",
  "stickers/norun/set2/04_dame.png",
  "stickers/norun/set2/05_love.png",
  "stickers/norun/set2/06_hungry.png",
  "stickers/norun/set2/07_hot.png",
  "stickers/norun/set2/08_yawn.png",
  "stickers/norun/set2/09_frog.png",
  "stickers/norun/set2/10_octopus.png",
  "stickers/norun/set2/11_pig.png",
  "stickers/norun/set2/12_sheep.png",
  "stickers/norun/set2/13_hamster.png",
  "stickers/norun/set2/14_seal.png",
  "stickers/norun/set2/15_crab.png",
  "stickers/norun/set2/16_dog.png",
  "stickers/norun/set2/17_oden.png",
  "stickers/norun/set2/18_takoyaki.png",
  "stickers/norun/set2/19_nikuman.png",
  "stickers/norun/set2/20_yakiimo.png",
  "stickers/norun/set2/21_taiyaki.png",
  "stickers/norun/set2/22_softcream.png",
  "stickers/norun/set2/23_kakigori.png",
  "stickers/norun/set2/24_dango.png",
  "stickers/norun/set2/25_snowman.png",
  "stickers/norun/set2/26_kagamimochi.png",
  "stickers/norun/set2/27_balloon.png",
  "stickers/norun/set2/28_slime.png",
  "stickers/norun/set2/29_pumpkin.png",
  "stickers/norun/set2/30_tree.png",
  "stickers/norun/set2/31_teruteru.png",
  "stickers/norun/set2/32_daruma.png"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => (req.mode === 'navigate' ? caches.match('index.html') : Response.error()));
    })
  );
});
