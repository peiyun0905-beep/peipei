// 離線快取：第一次開啟後，沒有網路也能使用轉盤。
// 改版時把 CACHE 的版本號加 1，舊快取會在啟用時刪除。
var CACHE = "food-wheel-v1";
var FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) { return cache.addAll(FILES); }));
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key.indexOf("food-wheel-") === 0 && key !== CACHE;
      }).map(function (key) { return caches.delete(key); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  // 頁面：先試網路（有新版就更新快取），沒網路時用快取
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(function (response) {
        var copy = response.clone();
        caches.open(CACHE).then(function (cache) { cache.put("./index.html", copy); });
        return response;
      }).catch(function () {
        return caches.match("./index.html");
      })
    );
    return;
  }

  // 圖示與設定檔：先用快取，沒有才連網路
  event.respondWith(
    caches.match(request).then(function (cached) { return cached || fetch(request); })
  );
});
