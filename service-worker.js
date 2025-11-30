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
        "./dashboard.js",
        "./manifest.json",
        "./assets/icons/icon-192.png",
        "./assets/icons/favicon.ico",
        "./assets/icons/logo.png",
        "./assets/icons/arrows-clockwise.png",
        "./assets/icons/icon-512.png",
        "./assets/icons/add.png",
        "./assets/icons/cogwheel.png",
        "./assets/icons/dashboard.png",
        "./assets/icons/delete.png",
        "./assets/icons/dice.png",
        "./assets/icons/game.png",
        "./assets/icons/inbox.png",
        "./assets/icons/outbox.png",
        "./assets/icons/pickleball.png",
        "./assets/icons/remove.png",
        "./assets/icons/search.png",
        "./assets/icons/add-group.png",
        "./assets/audio/match-ready.wav"
      ]);
    })
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
