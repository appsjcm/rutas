/* Chequeo antes de salir: al pulsar Iniciar, el estado real del turno en una tarjeta.
   No bloquea nada; la navegación arranca igual mientras se lee. */
(()=>{
'use strict';
const K=window.RutasCheckCore;
const boton=document.getElementById('nav-start');
if(!K||!boton)return;
const $=id=>document.getElementById(id);

const TILES='rutas-tiles-v1';
// Solo se cuentan las teselas del mapa 2D: el satélite de Esri numera los ejes al revés
// y las vectoriales del 3D son otro dibujo. Contarlas juntas daría una cobertura falsa.
const MAPA_2D=/(^|\.)tile\.openstreetmap\.org$/;

let roadState='idle',issues=null,ratio=null,pendiente=null;

window.addEventListener('rutas:road-state',e=>{roadState=(e.detail&&e.detail.state)||'idle';});
window.addEventListener('rutas:road-issues',e=>{issues=e.detail?e.detail.issues:null;});
window.addEventListener('rutas:check-route',()=>{roadState='idle';issues=null;ratio=null;});

// ---- estado ----
function puntos(){
 const data=window.Roadbook&&window.Roadbook.getRoute();
 return data&&Array.isArray(data.pts)?data.pts:[];
}
async function cobertura(){
 const pts=puntos();
 if(!pts.length||!('caches' in window))return 0;
 try{
  const cache=await caches.open(TILES),claves=await cache.keys();
  const urls=[];
  for(const r of claves){try{if(MAPA_2D.test(new URL(r.url).hostname))urls.push(r.url);}catch{}}
  return K.coverage(pts,K.cachedKeys(urls),{limit:300});
 }catch{return 0;}
}
async function permiso(){
 try{
  if(!navigator.permissions||!navigator.permissions.query)return undefined;
  const p=await navigator.permissions.query({name:'geolocation'});
  return p.state;
 }catch{return undefined;}   // Safari no contesta: se asume que preguntará al arrancar
}
function vehiculo(){
 const V=window.RutasVehicleCore;
 if(!V)return {count:0,profiled:false};
 const perfil=window.RutasVehicle?V.normalise(window.RutasVehicle.get()):{};
 return {count:V.incompatibilities(issues),profiled:Object.keys(perfil).length>0};
}
function estado(permission,mapRatio){
 const data=window.Roadbook&&window.Roadbook.getRoute();
 const mapa=window.RutasMap&&window.RutasMap.get();
 const v=vehiculo();
 return {
  route:data&&{pts:data.pts,name:data.name,sample:data.sample,
               metres:mapa&&mapa.route?mapa.route.total:0},
  permission,geolocation:!!navigator.geolocation,
  voiceSupported:'speechSynthesis' in window,
  voiceEnabled:!!($('nav-voice')&&$('nav-voice').checked),
  mapRatio,online:navigator.onLine,
  roadState,vehicleCount:v.count,profiled:v.profiled,
  marksHere:window.RutasMarks?window.RutasMarks.anchored().length:0,
  marksTotal:window.RutasMarks?window.RutasMarks.all().length:0,
  screen:window.RutasMap&&window.RutasMap.screenLock?window.RutasMap.screenLock():undefined
 };
}

// ---- tarjeta ----
const ICONO={ok:'✓',warn:'!',bad:'✕'};
const panel=document.createElement('div');
panel.id='check-panel';panel.hidden=true;panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');
panel.innerHTML='<p class="check-head"></p><ul class="check-list"></ul>'+
 '<button type="button" class="btn sm check-close">Entendido</button>';
document.body.append(panel);
const cabecera=panel.querySelector('.check-head'),lista=panel.querySelector('.check-list');
let reloj=null;
function cerrar(){clearTimeout(reloj);reloj=null;panel.hidden=true;}
panel.querySelector('.check-close').addEventListener('click',cerrar);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)cerrar();});

function pinta(items){
 const v=K.verdict(items);
 panel.dataset.tone=v.tone;
 cabecera.textContent=v.headline;
 lista.innerHTML='';
 for(const i of items){
  const li=document.createElement('li');
  li.dataset.state=i.state;
  li.innerHTML='<span class="check-mark" aria-hidden="true"></span><b></b><span class="check-detail"></span>';
  li.querySelector('.check-mark').textContent=ICONO[i.state]||'·';
  li.querySelector('b').textContent=i.label;
  li.querySelector('.check-detail').textContent=i.detail;
  lista.append(li);
 }
 panel.hidden=false;
 clearTimeout(reloj);
 const espera=K.dwell(v.tone);
 reloj=espera?setTimeout(cerrar,espera):null;
}

// Lo que se sabe al instante se pinta ya; el permiso y las teselas llegan al momento.
async function chequear(){
 const token=pendiente={};
 pinta(K.items(estado(undefined,ratio==null?0:ratio)));
 // La pantalla la pide la navegacion en este mismo toque: se espera un momento a que conteste.
 const pantalla=new Promise(ok=>{let n=0;(function mira(){const s=window.RutasMap&&window.RutasMap.screenLock&&window.RutasMap.screenLock();if(s==='on'||s==='off'||s==='unsupported'||++n>15)ok();else setTimeout(mira,100);})();});
 const [p,r]=await Promise.all([permiso(),cobertura(),pantalla]);
 if(pendiente!==token||panel.hidden)return;
 ratio=r;
 pinta(K.items(estado(p,r)));
 badge();
}

// El chequeo informa, no bloquea: la navegación arranca en el mismo clic. Se escucha en
// captura desde el documento porque asi se lee el estado de antes de arrancar, sin depender
// del orden en que se registraron los demas manejadores del boton.
document.addEventListener('click',e=>{
 const t=e.target;
 if(!t||typeof t.closest!=='function'||!t.closest('#nav-start'))return;
 const mapa=window.RutasMap&&window.RutasMap.get();
 if(mapa&&mapa.active)return;                       // ya se esta navegando: el boton no hace nada
 // Simular pulsa este mismo boton por dentro, y el chequeo es de conducir de verdad: en
 // una simulacion decia «GPS ✕ Permiso denegado», que es falso -la simulacion no lo
 // necesita- y, como un fallo no se cierra solo, se quedaba abierto hasta el final.
 const sim=window.RutasSim&&window.RutasSim.get&&window.RutasSim.get();
 if(sim&&sim.running)return;
 chequear();
},true);

// ---- indicador sin conexión: qué funcionará de verdad ----
const insignia=$('net-offline');
function badge(){
 if(!insignia||ratio==null)return;
 const m=K.mapItem(ratio,false);
 insignia.textContent=ratio>=.9?'Sin conexión · la ruta está guardada entera'
  :ratio>=.25?'Sin conexión · mapa guardado al '+Math.round(ratio*100)+' % de la ruta'
  :'Sin conexión · esta zona no se ha visto todavía';
 insignia.dataset.tone=m.state;
}
async function medir(){if(!puntos().length)return;ratio=await cobertura();badge();}
window.addEventListener('offline',medir);
window.addEventListener('rutas:route',()=>{ratio=null;setTimeout(medir,1500);});
if(!navigator.onLine)medir();

window.RutasCheck={run:chequear,close:cerrar,coverage:()=>ratio,measure:medir};
})();
