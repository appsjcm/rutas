/* Abre Google Street View en la posición actual. No usa SDK ni envía el GPX:
   solo salen del dispositivo la coordenada elegida y el rumbo de marcha. */
(()=>{
'use strict';
const V=window.RutasStreetView,C=window.RutasNav,M=window.RutasMap;
const controls=document.querySelector('.map-dimension');
if(!V||!C||!M||!controls)return;

const button=document.createElement('button');
button.type='button';button.id='map-streetview';button.textContent='Street View';
button.title='Abrir mi ubicación en Google Street View';
button.setAttribute('aria-label','Abrir mi ubicación en Google Street View');
controls.append(button);

const status=document.createElement('div');
status.id='streetview-status';status.hidden=true;status.setAttribute('role','status');
document.getElementById('nav-stage').append(status);
let statusTimer;

function state(){return M.get();}
function routePoint(s){return s.route?C.at(s.route,s.progress):null;}
function point(s){return s.active&&s.location?{lat:s.location.lat,lon:s.location.lng}:routePoint(s);}
function heading(s){
 if(s.active&&Number.isFinite(s.bearing))return s.bearing;
 if(!s.route)return null;
 const d=Math.max(0,Math.min(s.route.total,s.progress));
 const a=C.at(s.route,d),b=C.at(s.route,Math.min(s.route.total,d+15));
 return C.distance(a,b)<1?null:C.heading(a,b);
}
function message(text){clearTimeout(statusTimer);status.textContent=text;status.hidden=false;statusTimer=setTimeout(()=>status.hidden=true,4500);}
function refresh(){const s=state();button.disabled=navigator.onLine===false||!point(s);button.title=navigator.onLine===false?'Street View necesita conexión.':'Abrir mi ubicación en Google Street View';}

button.onclick=()=>{
 const s=state(),p=point(s),url=V.url(p,heading(s));
 if(!url){message('Todavía no hay una posición disponible.');return;}
 window.open(url,'_blank','noopener,noreferrer');
 // Con noopener el navegador devuelve null incluso cuando la pestaña se ha abierto.
 message('Street View abierto en tu posición actual.');
};
for(const name of ['rutas:route','rutas:progress','rutas:visible','online','offline'])window.addEventListener(name,refresh);
refresh();

window.RutasStreetViewUI={point:()=>point(state()),heading:()=>heading(state()),refresh};
})();
