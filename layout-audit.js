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

// El escenario a pantalla completa cubre la pagina; lo que esta fuera de el no compite.
function tapadoPorPantallaCompleta(e){
 if(!document.body.classList.contains('map-focus'))return false;
 const escenario=document.getElementById('nav-stage');
 if(escenario&&escenario.contains(e))return false;
 return !fijo(e);
}
function recoger(){
 const items=[];
 // Si la pagina se desplaza, lo que tape un panel fijo se destapa bajando.
 const scrolls=document.documentElement.scrollHeight>innerHeight+2;
 for(const e of document.querySelectorAll(CONTROLES)){
  if(e.disabled||e.hidden||!e.offsetParent||e.closest(FUERA)||oculto(e))continue;
  // Con el mapa a pantalla completa, lo de la pagina queda detras a proposito: eso no es
  // un fallo de colocacion, es la pantalla completa haciendo su trabajo.
  if(tapadoPorPantallaCompleta(e))continue;
  const r=e.getBoundingClientRect();
  const rect={top:r.top,left:r.left,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
  let hit='self';
  if(A.big(rect)&&A.inside(rect,innerWidth,innerHeight)){
   const c=A.centre(rect);
   const encima=document.elementFromPoint(c.x,c.y);
   // Que el clic caiga en un hijo -el <b> de un botón- sigue siendo el propio control.
   hit=(!encima||encima===e||e.contains(encima)||encima.contains(e))?'self':nombre(encima);
  }
  items.push({name:nombre(e),rect,vw:innerWidth,vh:innerHeight,
   fixed:fijo(e)&&!enCajaDesplazable(e),scrolls,hit});
 }
 return items;
}

function run(){
 const r=A.report(recoger(),
  {overflowX:document.documentElement.scrollWidth>document.documentElement.clientWidth});
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
 const r=run();
 // También por consola, que es donde se mira cuando se está cambiando algo.
 if(window.console&&console.table)console.table(r.malos.length?r.malos:[{q:'sin problemas'}]);
};

window.RutasLayoutAudit={run,collect:recoger};
})();
