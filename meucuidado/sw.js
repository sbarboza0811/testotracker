const CACHE='meucuidado-shell-v2';
const ASSETS=['./','./index.html','./assets/app.css','./assets/app.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./assets/cloud-config.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method==='GET'&&u.origin===location.origin){e.respondWith(caches.match(e.request).then(x=>x||fetch(e.request)));}});