self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    await self.registration.unregister();
    const cs=await self.clients.matchAll();
    for(const c of cs) c.navigate(c.url);
  })());
});