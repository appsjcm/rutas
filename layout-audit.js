/* Auditor de pantalla: recorre los controles de la página y le pregunta al navegador quién
   recibe el clic en cada uno. Solo se carga con ?sim, así que no pesa para quien conduce. */
(()=>{
'use strict';
const A=window.RutasLayoutAuditCore;
const panel=document.getElementById('sim-panel');
if(!A||!panel)return;
const $=id=>document.getElementById(id);

// Lo que no es un control de la aplicación: chinchetas y créditos del mapa.
const FUERA='.leaflet-marker-icon,.leaflet-control-attribution';
const CONTROLES='button,a[href],input,select,summary,[role=button]';

function nombre(e){
 const id=e.id||(typeof e.className==='string'?e.className.trim().split(/\s+/)[0]:'')||e.tagName;
 const txt=(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,22);
 return txt?id+' «'+txt+'»':id;
}
function fijo(e){
 for(let n=e;n&&n!==document.body;n=n.parentElement)
  if(getComputedStyle(n).position==='fixed')return true;
 return false;
}
// Dentro de una caja que se desplaza por su cuenta -el panel del simulador- se llega
// igual, aunque ahora mismo quede por debajo del borde.
function enCajaDesplazable(e){
 for(let n=e.parentElement;n&&n!==document.body;n=n.parentElement){
  const o=getComputedStyle(n).overflowY;
  if((o==='auto'||o==='scroll')&&n.scrollHeight>n.clientHeight+2)return true;
 }
 return false;
}
function oculto(e){
 const c=getComputedStyle(e);
 return c.visibility==='hidden'||c.opacity==='0'||c.pointerEvents==='none';
}

// El escenario a pantalla completa cubre la pagina a proposito. Lo que queda debajo no es
// un fallo de colocacion siempre que sea el propio escenario quien lo tape: la barra de
// pestañas es fija y estaba dando cuatro falsos problemas cada vez, que es la mejor forma
// de que un auditor deje de leerse. Si lo tapa otra cosa -un panel flotante-, eso si.
function porLaPantallaCompleta(e,encima){
 if(!document.body.classList.contains('map-focus')||!encima)return false;
 const escenario=document.getElementById('nav-stage');
 if(!escenario||escenario.contains(e))return false;
 return escenario.contains(encima)||escenario===encima;
}
function recoger(){
 const items=[];
 // Si la pagina se desplaza, lo que tape un panel fijo se destapa bajando.
 const scrolls=document.documentElement.scrollHeight>innerHeight+2;
 for(const e of document.querySelectorAll(CONTROLES)){
  if(e.disabled||e.hidden||!e.offsetParent||e.closest(FUERA)||oculto(e))continue;
  const r=e.getBoundingClientRect();
  const rect={top:r.top,left:r.left,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
  let hit='self',saltar=false;
  if(A.big(rect)&&A.inside(rect,innerWidth,innerHeight)){
   const c=A.centre(rect);
   const encima=document.elementFromPoint(c.x,c.y);
   if(porLaPantallaCompleta(e,encima))saltar=true;
   // Que el clic caiga en un hijo -el <b> de un botón- sigue siendo el propio control.
   else hit=(!encima||encima===e||e.contains(encima)||encima.contains(e))?'self':nombre(encima);
  }
  if(saltar)continue;
  items.push({name:nombre(e),rect,vw:innerWidth,vh:innerHeight,
   fixed:fijo(e)&&!enCajaDesplazable(e),scrolls,hit});
 }
 return items;
}

// Las capas que flotan sobre el mapa mientras se conduce. Se comparan cajas enteras, no
// centros: una tarjeta puede cubrir media barra de botones sin tocar ningun centro.
// «aviso» es lo que advierte, «mando» lo que se pulsa y «dato» lo que solo se lee; tapar
// los dos primeros es grave.
const CAPAS=[
 ['cartel de maniobra','#drive-banner','dato'],
 ['tarjeta de la calle','#drive-road-info','dato'],
 ['aviso de vía','#nav-road-alert','aviso'],
 ['límite de velocidad','#drive-speed-limit','aviso'],
 ['tarjeta de desvío','#route-recovery','aviso'],
 ['barra de vistas','.map-dimension','mando'],
 ['mandos de conducción','#drive-tools','mando'],
 ['repetir indicación','#nav-repeat','mando'],
 ['ampliar mapa','#nav-focus','mando'],
 ['zoom','.leaflet-control-zoom','mando'],
 ['velocímetro','#drive-speedo','dato'],
 ['panel de conducción','#drive-panel','dato'],
 ['panel del simulador','#sim-panel','mando'],
 // Fuera de pantalla completa, la fila de «Iniciar navegación» y «Simular» es el mando
 // principal de la pantalla. Dentro, esta detras del mapa a proposito y no compite.
 ['botones de la ruta','.btnrow.nav-actions','mando']
];
const SOLO_FUERA_DE_PANTALLA_COMPLETA=new Set(['botones de la ruta']);
function capas(){
 const out=[],completa=document.body.classList.contains('map-focus');
 for(const [nombre,sel,kind] of CAPAS){
  if(completa&&SOLO_FUERA_DE_PANTALLA_COMPLETA.has(nombre))continue;
  const e=document.querySelector(sel);
  // offsetParent es null en todo lo que es position:fixed, y justo los paneles que flotan
  // lo son: con ese filtro el panel del simulador nunca entraba en la lista. Se mira si
  // tiene caja de verdad.
  if(!e||e.hidden||oculto(e)||!e.getClientRects().length)continue;
  const r=e.getBoundingClientRect();
  if(r.width<1||r.height<1)continue;
  out.push({name:nombre,kind,z:getComputedStyle(e).zIndex,
   rect:{top:r.top,left:r.left,right:r.right,bottom:r.bottom,width:r.width,height:r.height}});
 }
 return out;
}

function run(){
 const r=A.report(recoger(),
  {panels:capas(),
   overflowX:document.documentElement.scrollWidth>document.documentElement.clientWidth});
 pinta(r);
 return r;
}

// ---- lo que se ve dentro del panel ----
const bloque=document.createElement('div');
bloque.id='audit-box';
bloque.innerHTML='<button type="button" id="audit-run">Auditar pantalla</button>'+
 '<p id="audit-out" role="status"></p><ol id="audit-list"></ol>';
(document.getElementById('sim-body')||panel).append(bloque);

function pinta(r){
 const salida=$('audit-out'),lista=$('audit-list');
 salida.textContent=A.headline(r);
 salida.dataset.tone=r.limpio?(r.avisos.length?'soft':'ok'):'warn';
 lista.replaceChildren();
 for(const m of r.malos.concat(r.avisos)){
  const li=document.createElement('li');
  li.textContent=A.line(m);
  li.dataset.grave=m.grave?'si':'no';
  lista.append(li);
 }
}
$('audit-run').onclick=()=>{
 // El panel del simulador es la herramienta, no parte de la app que se revisa. Si se
 // deja visible, elementFromPoint informa correctamente de que él mismo tapa el mapa y
 // el resultado queda lleno de falsos problemas. Se aparta solo durante la medición.
 const anterior=panel.style.visibility;
 panel.style.visibility='hidden';
 const r=run();
 panel.style.visibility=anterior;
 // También por consola, que es donde se mira cuando se está cambiando algo.
 if(window.console&&console.table)console.table(r.malos.length?r.malos:[{q:'sin problemas'}]);
};

window.RutasLayoutAudit={run,collect:recoger,layers:capas};
})();
