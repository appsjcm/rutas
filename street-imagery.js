/* Vista de calle: fotografías reales cerca de la posición simulada, de KartaView y, si
   allí no hay, de Panoramax. Sin claves ni tokens. Solo lee el estado del simulador y de
   la navegación; si algo falla, se apaga y la simulación sigue igual. */
(()=>{
'use strict';
const S=window.RutasStreetImageryCore,C=window.RutasNav;
const panel=document.getElementById('sim-panel'),stage=document.getElementById('nav-stage');
if(!S||!C||!panel||!stage)return;          // solo dentro del simulador
const $=id=>document.getElementById(id);

const MODO='rutas-vista-calle';
const RADIO=100;        // se pide un poco más de lo que se acepta, para tener por dónde andar
const BUSCA_CADA=45;    // metros mínimos entre dos búsquedas: pocas peticiones
const TIMEOUT=5000;     // una API lenta no puede bloquear el visor

// ---- proveedores: misma interfaz, el resto del módulo no nota la diferencia ----
async function conPlazo(fn){
 const ctrl=new AbortController();
 const t=setTimeout(()=>ctrl.abort(),TIMEOUT);
 try{return await fn(ctrl.signal);}
 finally{clearTimeout(t);}
}

const KartaView={
 nombre:'KartaView',
 async search(point){
  return conPlazo(async signal=>{
   const body=new URLSearchParams({lat:String(point.lat),lng:String(point.lon),radius:String(RADIO)});
   const r=await fetch('https://api.kartaview.org/1.0/list/nearby-photos/',
    {method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body,signal,cache:'no-store'});
   if(!r.ok)throw Error('respondió '+r.status);
   const j=await r.json();
   return (j&&j.currentPageItems||[]).map(S.fromKartaView).filter(Boolean);
  });
 }
};

const Panoramax={
 nombre:'Panoramax',
 async search(point){
  return conPlazo(async signal=>{
   const caja=S.bbox(point,RADIO);
   if(!caja)return [];
   const r=await fetch('https://api.panoramax.xyz/api/search?limit=40&bbox='+caja.join(','),
    {signal,cache:'no-store'});
   if(!r.ok)throw Error('respondió '+r.status);
   const j=await r.json();
   return (j&&j.features||[]).map(S.fromPanoramax).filter(Boolean);
  });
 }
};
const PROVEEDORES=[KartaView,Panoramax];    // el orden es el orden de preferencia

// ---- estado propio, sin tocar el del simulador ----
let modo=leerModo(),juego=[],actual=null,ultimoPunto=null,ultimaBusqueda=null,
    manual=false,buscando=false,fallo=0;
const memoria=new Map();                    // fotos ya vistas, para no repetir descargas

function leerModo(){try{return localStorage.getItem(MODO)||'auto';}catch{return 'auto';}}
function guardarModo(v){try{localStorage.setItem(MODO,v);}catch{}}

// ---- lo que se ve ----
const visor=document.createElement('div');
visor.id='si-viewer';visor.hidden=true;
visor.innerHTML='<img id="si-img" alt="Fotografía de la calle en este punto del recorrido">'+
 '<p id="si-caption"></p>';
stage.append(visor);

const control=document.createElement('div');
control.id='si-box';
control.innerHTML='<span class="si-title">Vista de calle</span>'+
 '<div class="si-modes" role="group" aria-label="Vista durante la simulación">'+
  '<button type="button" data-modo="mapa">🗺 Mapa</button>'+
  '<button type="button" data-modo="calle">📷 Calle</button>'+
  '<button type="button" data-modo="auto">🔀 Automático</button>'+
 '</div>'+
 // Los mandos del visor viven aquí y no sobre la foto: en la esquina de la foto los
 // tapaba este mismo panel, y encima ensuciaban la imagen.
 '<div class="si-controls"><button type="button" id="si-prev" aria-label="Foto anterior">◀</button>'+
 '<button type="button" id="si-auto" aria-label="Volver a seguir la posición">🎯 Automático</button>'+
 '<button type="button" id="si-next" aria-label="Foto siguiente">▶</button></div>'+
 '<p class="si-state" id="si-state"></p>';
// Delante de las secciones secundarias: es lo que se mira, no un ajuste de mas.
(function(){
 const cuerpo=document.getElementById('sim-body')||panel;
 const despues=document.getElementById('sim-info');
 if(despues&&despues.parentElement===cuerpo)despues.after(control);else cuerpo.append(control);
})();

// Un atajo donde la gente busca una vista: junto a 2D, Satélite y 3D. Estaba solo dentro
// del panel, el último de nueve apartados, y así no lo encontraba nadie.
const barra=document.querySelector('.map-dimension');
let atajo=null;
if(barra){
 atajo=document.createElement('button');
 atajo.type='button';atajo.id='si-quick';atajo.textContent='📷 Calle';
 atajo.title='Fotografías reales de la calle durante la simulación';
 barra.append(atajo);
 atajo.addEventListener('click',()=>cambiarModo(modo==='mapa'?'calle':'mapa'));
 // Elegir un mapa es decir que ahora se quiere el mapa.
 barra.addEventListener('click',e=>{
  const b=e.target.closest('button');
  if(!b||b===atajo||b.id==='map-places')return;
  if(modo!=='mapa')cambiarModo('mapa');
 });
}

function cambiarModo(v){
 modo=v;guardarModo(modo);marcaModo();manual=false;
 if(modo==='mapa'){ocultar();estado('');return;}
 ultimoPunto=null;ultimaBusqueda=null;
 refrescar(true);
}

function estado(texto){const e=$('si-state');if(e)e.textContent=texto||'';}
function marcaModo(){
 for(const b of control.querySelectorAll('.si-modes button'))
  b.setAttribute('aria-pressed',String(b.dataset.modo===modo));
 if(atajo)atajo.setAttribute('aria-pressed',String(modo!=='mapa'));
}
control.querySelector('.si-modes').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 cambiarModo(b.dataset.modo);
});
marcaModo();

function ocultar(){visor.hidden=true;}
function mostrar(foto,punto){
 if(!foto){ocultar();return;}
 const img=$('si-img');
 if(img.dataset.id!==foto.id){
  img.dataset.id=foto.id;
  img.src=foto.imageUrl;
 }
 $('si-caption').textContent=S.caption(foto,punto)+' · '+foto.attribution;
 visor.hidden=false;
 actual=foto;
 botones();
 precargar();
}
// La siguiente y la anterior, para que no se vea un hueco al avanzar.
function botones(){
 const prev=$('si-prev'),next=$('si-next');
 if(prev)prev.disabled=!S.neighbour(juego,actual,-1);
 if(next)next.disabled=!S.neighbour(juego,actual,1);
}
function precargar(){
 for(const paso of [1,-1]){
  const v=S.neighbour(juego,actual,paso);
  if(v&&!memoria.has(v.id)){
   const i=new Image();i.src=v.imageUrl;
   memoria.set(v.id,i);
  }
 }
 S.trim(memoria,S.CACHE_MAX);
}

// Una imagen que no carga no deja el visor en blanco: se pasa a la siguiente.
$('si-img').addEventListener('error',()=>{
 const v=S.neighbour(juego,actual,1);
 if(v){mostrar(v,punto());return;}
 ocultar();estado(S.status('none'));
});

// ---- de dónde se leen posición y rumbo, sin tocar nada ----
function mapa(){return window.RutasMap?window.RutasMap.get():null;}
function ruta(){const s=mapa();return s&&s.route&&s.route.pts&&s.route.pts.length>1?s.route:null;}
function avance(){const s=mapa();return s&&Number.isFinite(s.progress)?s.progress:0;}
function punto(){
 const s=mapa();
 if(s&&s.active&&s.location)return {lat:s.location.lat,lon:s.location.lng};
 const r=ruta();
 return r?C.at(r,avance()):null;
}
function rumbo(){
 const r=ruta();if(!r)return null;
 const d=avance();
 const a=C.at(r,Math.max(0,Math.min(r.total,d))),b=C.at(r,Math.max(0,Math.min(r.total,d+15)));
 return C.distance(a,b)<1?null:C.heading(a,b);
}

// ---- búsqueda, con el orden de preferencia y sin insistir si no hay nada ----
async function buscar(p,h){
 if(buscando)return;
 buscando=true;
 estado(S.status('searching'));
 try{
  for(const prov of PROVEEDORES){
   if(navigator.onLine===false){estado(S.status('offline'));return;}
   let fotos=[];
   try{fotos=await prov.search(p);}
   catch(e){
    // Detalle técnico solo para quien desarrolla; al usuario no se le cuenta esto.
    if(window.console)console.debug('[vista de calle]',prov.nombre,e&&e.message);
    continue;
   }
   const elegida=S.pick(fotos,p,h,actual&&actual.sequenceId);
   if(elegida){
    juego=S.sortSequence(fotos.filter(f=>f.sequenceId===elegida.sequenceId||!elegida.sequenceId));
    if(!juego.length)juego=S.sortSequence(fotos);
    manual=false;fallo=0;
    mostrar(elegida,p);
    estado(prov.nombre);
    return;
   }
  }
  juego=[];actual=null;ocultar();
  fallo++;
  estado(S.status('none'));
  volverAlMapa();
 }finally{buscando=false;}
}

// Sin fotografías se sigue con el mapa. Solo se pasa al 3D si ya estaba cargado y en
// marcha: forzarlo aquí podría fallar, y esto es un complemento, no la navegación.
function volverAlMapa(){
 try{
  const tres=window.Rutas3D&&window.Rutas3D.get();
  if(modo==='calle'&&tres&&tres.ready&&!tres.active){const b=$('map-3d');if(b&&!b.disabled)b.click();}
 }catch{}
}

// ---- el latido: se llama en cada actualización de posición, y casi siempre no hace nada ----
function refrescar(forzar){
 if(modo==='mapa'){ocultar();return;}
 const p=punto(),h=rumbo();
 if(!p){ocultar();return;}
 if(navigator.onLine===false){ocultar();estado(S.status('offline'));return;}
 if(manual)return;                                   // el usuario está mirando a mano
 if(!forzar&&!S.shouldRefresh(ultimoPunto,p))return; // no se cambia por avanzar dos metros
 ultimoPunto=p;

 // Mientras sigamos cerca de lo ya descargado, no se pregunta a nadie.
 const dentro=S.bestInSequence(juego,p,h);
 if(dentro){mostrar(dentro,p);estado(dentro.provider);return;}

 // Fuera de lo descargado: se busca, pero no más de una vez cada BUSCA_CADA metros.
 if(!forzar&&ultimaBusqueda&&S.distance(ultimaBusqueda,p)<BUSCA_CADA)return;
 ultimaBusqueda=p;
 buscar(p,h);
}

// ---- controles del visor ----
$('si-prev').onclick=()=>{const v=S.neighbour(juego,actual,-1);if(v){manual=true;mostrar(v,punto());}};
$('si-next').onclick=()=>{const v=S.neighbour(juego,actual,1);if(v){manual=true;mostrar(v,punto());}};
$('si-auto').onclick=()=>{manual=false;ultimoPunto=null;refrescar(true);};

// ---- enganches, todos de solo lectura ----
window.addEventListener('rutas:progress',()=>{try{refrescar(false);}catch(e){if(window.console)console.debug('[vista de calle]',e);}});
window.addEventListener('rutas:route',()=>{juego=[];actual=null;ultimoPunto=null;ultimaBusqueda=null;manual=false;ocultar();});
window.addEventListener('rutas:check-route',()=>{juego=[];actual=null;ocultar();});
window.addEventListener('offline',()=>{ocultar();estado(S.status('offline'));});
window.addEventListener('online',()=>{estado('');ultimoPunto=null;ultimaBusqueda=null;refrescar(true);});

estado(navigator.onLine===false?S.status('offline'):'');
window.RutasStreetImagery={mode:()=>modo,current:()=>actual,set:()=>juego.slice(),
 refresh:()=>refrescar(true),providers:PROVEEDORES.map(p=>p.nombre)};
})();
