const CACHE = "mth-v3";

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      c.addAll([
        "./",
        "index.html",
        "assets/styles.css",
        "assets/app.js",
        "assets/logo.svg",
        "assets/favicon.svg",
        "assets/site.webmanifest"
        // ❌ KHÔNG precache manifest.json nữa
      ])
    )
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  // ✅ manifest.json: network-first (luôn cố lấy bản mới)
  if (url.pathname.endsWith("/manifest.json")) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // tools/assets/index: cache-first (có rồi trả nhanh, song song cập nhật)
  if (
    url.pathname.includes("/tools/") ||
    url.pathname.includes("/assets/") ||
    url.pathname.endsWith("/index.html")
  ) {
    e.respondWith(
      caches.match(e.request).then(
        (cached) =>
          cached ||
          fetch(e.request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
            return res;
          })
      )
    );
  }
});
