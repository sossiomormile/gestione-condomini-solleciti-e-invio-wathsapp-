const C="condomini-v2-1-20260907";
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(["./","./index.html","./manifest.json"])))});
self.addEventListener("activate",e=>e.waitUntil(Promise.all([
  caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))),
  self.clients.claim()
])));
self.addEventListener("fetch",e=>{
  e.respondWith(fetch(e.request).then(r=>{
    const copy=r.clone();
    caches.open(C).then(c=>c.put(e.request,copy)).catch(()=>{});
    return r;
  }).catch(()=>caches.match(e.request)));
});