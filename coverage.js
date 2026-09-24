/* Tramos sin pasar. Apunta por donde se ha circulado de verdad mientras el GPS esta en
   marcha y avisa si la ronda se ha saltado un trozo. Solo lee el estado de la navegacion;
   si algo falla, se calla y la navegacion sigue igual. */
(()=>{
'use strict';
const C=window.RutasCoverageCore,N=window.RutasNav;
if(!C||!N)return;
const $=id=>document.getElementById(id);

const CLAVE='rutas-cobertura-v1:';
let tramos=[],ultimo=null,huella=null,pintado=null,capa=null;

// ---- lo que se ve ----
const aviso=document.createElement('button');
aviso.type='button';aviso.id='cobertura-aviso';aviso.hidden=true;
aviso.setAttribute('aria-live','polite');

function coloca(){
 const barra=document.querySelector('.nav-homebar');   // cabecera siempre visible de la ruta
 if(barra){if(aviso.previousElementSibling!==barra)barra.after(aviso);return true;}
 const ficha=document.querySelector('.route-overview');
 if(ficha){if(aviso.parentElement!==ficha)ficha.append(aviso);return true;}
 if(aviso.parentElement)return true;
 const fila=$('nav-start')&&$('nav-start').closest('.btnrow');
 if(fila)fila.before(aviso);
 return !!aviso.parentElement;
}

function mapa(){const s=window.RutasMap&&window.RutasMap.get();return s&&s.map?s:null;}

// Los huecos se dibujan sobre el mapa, que es donde se entiende de que calle se trata.
function dibuja(huecos){
 const s=mapa();
 if(!s||!s.route||!window.L)return;
 const firma=JSON.stringify(huecos);
 if(firma===pintado)return;
 pintado=firma;
 if(capa){s.map.removeLayer(capa);capa=null;}
 if(!huecos.length)return;
 capa=L.featureGroup().addTo(s.map);
 for(const [a,b] of huecos){
  const pts=N.section(s.route,a,b).map(p=>[p.lat,p.lon]);
  if(pts.length<2)continue;
  L.polyline(pts,{color:'#ffffff',weight:11,opacity:.85}).addTo(capa);
  L.polyline(pts,{color:'#b3261e',weight:6,opacity:.95,dashArray:'10 8'}).addTo(capa);
 }
}

function pinta(){
 const huecos=C.gaps(tramos);
 const texto=C.summary(huecos);
 if(!texto){aviso.hidden=true;dibuja([]);return;}
 coloca();
 aviso.textContent=texto+' · ver en el mapa';
 aviso.hidden=false;
 dibuja(huecos);
}

// Al pulsar, al primero de los que faltan: es el que se pilla mas a mano volviendo.
aviso.onclick=()=>{
 const huecos=C.gaps(tramos);
 if(!huecos.length)return;
 const s=mapa();
 if(!s||!s.route)return;
 if(s.active){
  const m=$('nav-message');
  if(m)m.textContent='Detén el GPS para ir a ver los tramos que faltan.';
  return;
 }
 try{window.RutasMap.seek(huecos[0][0]);}catch(e){}
 const escenario=$('nav-stage');
 if(escenario)escenario.scrollIntoView({block:'center',behavior:'smooth'});
};

// ---- lo que se guarda ----
function clave(){return huella?CLAVE+huella:null;}
function guarda(){
 const k=clave();
 if(!k)return;
 try{localStorage.setItem(k,JSON.stringify(C.pack(tramos)));}catch(e){}
}
function recupera(){
 const k=clave();
 tramos=[];ultimo=null;
 if(!k)return;
 try{tramos=C.unpack(localStorage.getItem(k));}catch(e){tramos=[];}
}

// La huella de la ruta es la misma que usa la navegacion para el avance, asi que cambiar
// de GPX cambia de registro solo y no se mezclan dos rondas.
function nuevaRuta(){
 const s=mapa();
 huella=s&&s.route?N.fingerprint(s.route):null;
 pintado=null;
 if(capa&&s&&s.map){s.map.removeLayer(capa);capa=null;}
 recupera();
 pinta();
}

// ---- el latido ----
// Solo cuenta lo que pasa con el GPS en marcha: mover la vista previa por el recorrido no
// es haber pasado por alli.
let guardarEn=0;
function paso(d){
 const s=mapa();
 if(!s||!s.active||!Number.isFinite(d))return;
 tramos=C.step(tramos,ultimo,d);
 ultimo=d;
 const ahora=Date.now();
 if(ahora>guardarEn){guardarEn=ahora+5000;guarda();}
 pinta();
}

window.addEventListener('rutas:progress',e=>{
 try{paso(e&&e.detail?Number(e.detail.distance):NaN);}
 catch(err){if(window.console)console.debug('[cobertura]',err);}
});
// Al parar se apunta lo ultimo y se deja de encadenar: la siguiente salida empieza donde
// este, no donde se quedo ayer.
window.addEventListener('rutas:check-route',()=>{try{nuevaRuta();}catch(e){}});
window.addEventListener('rutas:route',()=>{try{nuevaRuta();}catch(e){}});
window.addEventListener('rutas:visible',()=>{try{coloca();pinta();}catch(e){}});
window.addEventListener('pagehide',()=>{ultimo=null;guarda();});
new MutationObserver(()=>{if($('nav-stop')&&$('nav-stop').disabled){ultimo=null;guarda();}})
 .observe($('nav-stop'),{attributes:true,attributeFilter:['disabled']});

addEventListener('load',()=>{try{nuevaRuta();}catch(e){}});
if(document.readyState==='complete')try{nuevaRuta();}catch(e){}

window.RutasCoverage={
 gaps:()=>C.gaps(tramos),
 covered:()=>tramos.slice(),
 metres:()=>C.metres(tramos),
 summary:()=>C.summary(C.gaps(tramos)),
 reset:()=>{tramos=[];ultimo=null;guarda();pinta();}
};
})();
