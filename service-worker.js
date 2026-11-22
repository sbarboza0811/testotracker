/* TestoTrack PWA v34: rede primeiro, cache como fallback offline. */
const CACHE_NAME='testotrack-shell-v34';
const REV='20261122-sapphire-2';
const FILES=['./','./index.html','./v3.css','./minimal.css','./v3-data.js','./v3-cloud.js','./v3-ui.js','./v3-edit.js','./v3-meal.js','./v3-activity.js','./legacy.html','./manifest.webmanifest','./icons/icon.svg'];
const VERSIONED=['./v3.css','./minimal.css','./v3-data.js','./v3-cloud.js','./v3-ui.js','./v3-edit.js','./v3-meal.js','./v3-activity.js','./manifest.webmanifest'].map(url=>url+'?v='+REV);
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE_NAME);
  // Uma URL indisponível não deve impedir a instalação da atualização.
  await Promise.allSettled([...FILES,...VERSIONED].map(async url=>{
   const response=await fetch(url,{cache:'reload'});
   if(response.ok)await cache.put(url,response);
  }));
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const names=await caches.keys();
  await Promise.all(names.filter(name=>name.startsWith('testotrack-shell-')&&name!==CACHE_NAME).map(name=>caches.delete(name)));
  await self.clients.claim();
 })());
});
self.addEventListener('message',event=>{
 if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE_NAME);
  try{
   const response=await fetch(request,{cache:'no-store'});
   if(response.ok)event.waitUntil(cache.put(request,response.clone()).catch(()=>{}));
   return response;
  }catch{
   const cached=await cache.match(request)||await caches.match(request);
   if(cached)return cached;
   if(request.mode==='navigate'){
    const offline=await cache.match('./index.html');
    if(offline)return offline;
   }
   return Response.error();
  }
 })());
});
