self.addEventListener("install", event => {
  event.waitUntil(
    caches.open("deaver-cache-v1").then(cache => {
      return cache.addAll([
        "/",
        "/index.html",
        "/style.css",
        "/script.js",
        "/images/camera.svg",
        "/images/circle-info-solid-2.png",
        "/images/x-twitter-brands-2.png",
        "/images/icon.png",
        "/images/deaver_icon-192.png",
        "/images/deaver_icon-512.png",
        "/images/deaver_default.png",
        "/images/deaver_label.png",
        "/images/deaver_front.png",
        "/images/deaver_left.png",
        "/images/deaver_right.png",
        "/images/deaver_label.png"
      ]);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
