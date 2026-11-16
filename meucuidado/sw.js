const CACHE='meucuidado-shell-v7';
const ASSETS=['./?v=1.6.0','./index.html?v=1.6.0','./assets/app.css?v=1.6.0','./assets/app.js?v=1.6.0','./manifest.webmanifest?v=1.6.0','./icon.svg','./icon-192.png','./icon-512.png','./assets/cloud-config.js?v=1.6.0'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('meucuidado-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==location.origin)return;
 event.respondWith(fetch(event.request).then(response=>{
  if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}
  return response;
 }).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('./index.html?v=1.6.0'))));
});
