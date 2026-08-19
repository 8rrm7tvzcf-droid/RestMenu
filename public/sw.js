const CACHE='restmenu-ui-v1';
const CORE=['/manifest.webmanifest','/icons/restmenu-192.png','/icons/restmenu-512.png','/icons/apple-touch-icon.png'];

self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(CORE);
  const home=await fetch('/');
  await cache.put('/',home.clone());
  const html=await home.text();
  const assets=[...html.matchAll(/(?:src|href)="(\/assets\/[^"?]+)"/g)].map(match=>match[1]);
  await Promise.all(assets.map(asset=>cache.add(asset)));
  await self.skipWaiting();
})()));

self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())
));

self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(cache=>cache.put('/',copy));return res}).catch(()=>caches.match('/')));
    return;
  }
  if(['script','style','image','font'].includes(req.destination)||url.pathname==='/manifest.webmanifest'){
    event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(cache=>cache.put(req,copy))}return res})));
  }
});
