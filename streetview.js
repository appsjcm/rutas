/* Permite tocar un punto de la ruta y abrirlo en Google Street View. No usa SDK ni
   envía el GPX: solo salen del dispositivo la coordenada elegida y el rumbo. */
(()=>{
'use strict';
const V=window.RutasStreetView,C=window.RutasNav,M=window.RutasMap;
const controls=document.querySelector('.map-dimension');
if(!V||!C||!M||!controls)return;

const button=document.createElement('button');
button.type='button';button.id='map-streetview';button.textContent='Street View';
button.title='Elegir un punto de la ruta para verlo en Google Street View';
button.setAttribute('aria-label','Elegir un punto de la ruta para verlo en Google Street View');
button.setAttribute('aria-pressed','false');
controls.append(button);

const status=document.createElement('div');
status.id='streetview-status';status.hidden=true;status.setAttribute('role','status');
document.getElementById('nav-stage').append(status);
let statusTimer,picking=false,clickMap=null;

function state(){return M.get();}
function heading(s,d){
 if(!s.route)return null;
 d=Math.max(0,Math.min(s.route.total,d));
 const a=C.at(s.route,d),b=C.at(s.route,Math.min(s.route.total,d+15));
 return C.distance(a,b)<1?null:C.heading(a,b);
}
function message(text,sticky=false){clearTimeout(statusTimer);status.textContent=text;status.hidden=false;if(!sticky)statusTimer=setTimeout(()=>status.hidden=true,4500);}
function cancel(note=false){
 if(clickMap)clickMap.off('click',choose);
 clickMap=null;picking=false;button.textContent='Street View';button.setAttribute('aria-pressed','false');
 document.getElementById('nav-stage').classList.remove('streetview-picking');
 if(note)message('Selección cancelada.');
}
function choose(e){
 const s=state(),hit=V.routePosition(s.route,{lat:e.latlng.lat,lon:e.latlng.lng});
 cancel();
 if(!hit){message('No se encontró ese punto de la ruta.');return;}
 const url=V.url(hit.point,heading(s,hit.d));
 if(!url){message('No se pudo abrir ese punto.');return;}
 window.open(url,'_blank','noopener,noreferrer');
 message('Street View abierto en el punto elegido.');
}
function select(){
 const s=state();
 if(picking){cancel(true);return;}
 if(navigator.onLine===false){message('Street View necesita conexión.');return;}
 if(!s.route||!s.map){message('Carga una ruta para elegir un punto.');return;}
 // La selección se hace en el mapa plano, donde el toque y la línea GPX coinciden.
 if(document.getElementById('map-3d').getAttribute('aria-pressed')==='true')document.getElementById('map-2d').click();
 picking=true;clickMap=s.map;clickMap.on('click',choose);button.textContent='Toca la ruta';button.setAttribute('aria-pressed','true');
 document.getElementById('nav-stage').classList.add('streetview-picking');
 message('Toca cualquier punto de la línea para abrirlo en Street View.',true);
}
function refresh(){
 const s=state(),disabled=navigator.onLine===false||!s.route;
 button.disabled=disabled;
 button.title=navigator.onLine===false?'Street View necesita conexión.':'Elegir un punto de la ruta para verlo en Google Street View';
 if(disabled&&picking)cancel();
}

button.onclick=select;
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&picking)cancel(true);});
for(const name of ['rutas:route','rutas:visible','online','offline'])window.addEventListener(name,()=>{if(name==='rutas:route')cancel();refresh();});
refresh();

window.RutasStreetViewUI={select,cancel,isPicking:()=>picking,refresh};
})();
