const CACHE='meucuidado-shell-v11';
const ASSETS=['./','./index.html','./assets/map.css?v=3.0','./assets/map.js?v=3.0','./assets/body3d.js?v=3.0','./manifest.webmanifest?v=3.0','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('meucuidado-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET')return;
 if(url.origin===self.location.origin){
  event.respondWith(fetch(request).then(response=>{
   if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}
   return response;
  }).catch(()=>caches.match(request).then(cached=>cached||(request.mode==='navigate'?caches.match('./index.html'):Response.error()))));
 }else if(url.hostname==='cdn.jsdelivr.net'&&(url.pathname.includes('/npm/three@0.186.1/')||url.pathname.includes('/gh/kblood/CharacterCreator@852e48f316b90a0937234886630e4fb4cdfd1f78/output/'))){
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
   if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}
   return response;
  })));
 }
});