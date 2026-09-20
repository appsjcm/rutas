const VERSION='rutas-shell-review-v2',TILES='rutas-tiles-v1',FONTS='rutas-fonts-v1',TILE_CAP=1500;
const SHELL=['./','index.html','navigation.css','nav-core.js','restrictions-core.js','navigation.js','restrictions.js','manifest.webmanifest','icon-192.png','icon-512.png','vendor/leaflet.js','vendor/leaflet.css'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)))});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{const keep=[VERSION,TILES,FONTS];for(const k of await caches.keys())if(k.startsWith('rutas-')&&!keep.includes(k))await caches.delete(k);await self.clients.claim();})())});
self.addEventListener('message',e=>{if(e.data==='skip-waiting')self.skipWaiting()});

async function trim(cache){const keys=await cache.keys();if(keys.length<=TILE_CAP)return;for(const k of keys.slice(0,keys.length-TILE_CAP))await cache.delete(k);}

// Teselas: solo se guarda lo que el mapa ha pedido de verdad. Nunca se descarga por lotes,
// que es lo que la politica de uso de OpenStreetMap desaconseja.
async function tile(req){const cache=await caches.open(TILES),hit=await cache.match(req);
 if(hit)return hit;
 try{const res=await fetch(req);if(res&&(res.ok||res.type==='opaque')){await cache.put(req,res.clone());trim(cache);}return res;}
 catch{return new Response('',{status:504,statusText:'Sin conexion y sin tesela guardada'});}}

async function fromCache(req,name){const cache=await caches.open(name),hit=await cache.match(req);
 const live=fetch(req).then(res=>{if(res&&(res.ok||res.type==='opaque'))cache.put(req,res.clone());return res;}).catch(()=>null);
 if(hit){live;return hit;}
 const res=await live;
 return res||Response.error();}

self.addEventListener('fetch',e=>{
 const req=e.request;if(req.method!=='GET')return;
 let url;try{url=new URL(req.url);}catch{return;}
 if(url.hostname.includes('overpass'))return;                 // nunca se cachea: tiene su propia caducidad
 if(url.hostname.endsWith('tile.openstreetmap.org')){e.respondWith(tile(req));return;}
 if(url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com'){e.respondWith(fromCache(req,FONTS));return;}
 if(url.origin===self.location.origin)e.respondWith(fromCache(req,VERSION));
});
