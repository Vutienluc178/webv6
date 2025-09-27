self.addEventListener('install', e=>{
  self.skipWaiting();
  e.waitUntil(caches.open('mth-v1').then(c=>c.addAll([
    './','index.html','assets/styles.css','assets/app.js','assets/logo.svg','assets/favicon.svg','assets/site.webmanifest','manifest.json'
  ])));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>!['mth-v1'].includes(k)).map(k=>caches.delete(k)))));
});
self.addEventListener('fetch', e=>{
  const url = new URL(e.request.url);
  // Cache-first for same-origin assets and tools/*.html
  if (url.origin === location.origin) {
    if (url.pathname.startsWith('/tools/') || url.pathname.startsWith('/assets/') || url.pathname.endsWith('/manifest.json') || url.pathname.endsWith('/index.html')) {
      e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request).then(res=>{
        const resClone = res.clone();
        caches.open('mth-v1').then(c=>c.put(e.request, resClone));
        return res;
      })));
      return;
    }
  }
  // default: network-first
  e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
});
