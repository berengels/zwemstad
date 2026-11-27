const BASE='__BASE_PATH__';
const PREFIX='zwemstad:'+BASE+':';
const CACHE=PREFIX+'__CACHE_VERSION__';
const PRECACHE=__PRECACHE__;
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PRECACHE)));});
// A new app version activates after existing tabs close; do not delete assets from a live app.
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(BASE))return;
 if(url.pathname===BASE+'schedule.json'){
  event.respondWith((async()=>{
   const cache=await caches.open(CACHE);
   try{
    const response=await fetch(event.request,{cache:'no-store'});
    if(!response.ok||!response.headers.get('Content-Type')?.includes('application/json'))throw new Error('Geen roosterantwoord');
    // Do not replace the offline fallback with a malformed response.
    const data=await response.clone().json();if(!data.generatedAt||!Array.isArray(data.sessions)||!Array.isArray(data.sources))throw new Error('Onbekend formaat');
    await cache.put(BASE+'schedule.json',response.clone());return response;
   }catch(error){
    const cached=await cache.match(BASE+'schedule.json');if(!cached)throw error;
    const headers=new Headers(cached.headers);headers.set('X-Zwemstad-Offline','1');
    return new Response(cached.body,{status:200,headers});
   }
  })());return;
 }
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request).catch(async()=>{const cache=await caches.open(CACHE);return (await cache.match(BASE+'index.html'))||(await cache.match(BASE));}));return;
 }
 // Only cache known versioned application assets; external pool pages stay outside this cache.
 if(PRECACHE.includes(url.pathname))event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(event.request))||fetch(event.request)));
});
