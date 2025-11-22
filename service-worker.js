self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open("pickleball-cache-v1").then((cache) => {
      return cache.addAll([
        "./",
        "./index.html",
        "./dashboard.html",
        "./style.css",
        "./dashboard.css",
        "./script.js",
        "./dashboard.js"
,       "./manifest.json",
        "./assets/icons/icon-192.png",
        "./assets/icons/favicon.ico",
        "./assets/icons/logo.png",
        "./assets/icons/icon-512.png"
      ]);
    })
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
