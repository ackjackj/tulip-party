/* tulip party — キャッシュ番人(Service Worker)
   役割: ページ(HTML)は常にネットから最新を取得し、古い画面の残りを防ぐ。
   オフライン時だけ、最後に表示できたページを代わりに出す。 */
var CACHE = 'tp-cache-v1';

self.addEventListener('install', function (e) {
  // 新しい番人を即座に有効化(古いものを待たない)
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    // 古いキャッシュを掃除
    var keys = await caches.keys();
    await Promise.all(keys.map(function (k) {
      if (k !== CACHE) return caches.delete(k);
    }));
    await self.clients.claim(); // すぐ全ページを制御下に
  })());
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  // ページ移動(HTML)だけを対象に: 常にネット優先・ブラウザキャッシュ無視
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith((async function () {
      try {
        // cache:'reload' でSafari等のHTTPキャッシュを必ず素通りして最新を取得
        var fresh = await fetch(req, { cache: 'reload' });
        try {
          var c = await caches.open(CACHE);
          c.put(req, fresh.clone()); // オフライン用に最新を控えておく
        } catch (ignore) {}
        return fresh;
      } catch (err) {
        // ネットに繋がらない時だけ、最後に取れたページを返す
        var cached = await caches.match(req);
        return cached || Response.error();
      }
    })());
  }
  // 画像やスクリプトなど他のリソースは通常どおり(ブラウザ任せ)
});
