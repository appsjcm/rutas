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
const dialog=document.createElement('dialog');
dialog.id='streetview-dialog';dialog.setAttribute('aria-labelledby','streetview-dialog-title');
dialog.innerHTML='<div class="streetview-modal-head"><div><small>PUNTO DE LA RUTA</small><h2 id="streetview-dialog-title">Google Street View</h2></div><button type="button" class="streetview-close" aria-label="Cerrar Street View">×</button></div><div class="streetview-frame-wrap"><div class="streetview-loading">Cargando la panorámica…</div><iframe title="Google Street View del punto elegido" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div><div class="streetview-modal-foot"><p>Google recibe solamente este punto y el rumbo. La disponibilidad de imágenes depende de Street View.</p><a class="btn sm" target="_blank" rel="noopener noreferrer">Abrir en Google Maps ↗</a></div>';
document.body.append(dialog);
const frame=dialog.querySelector('iframe'),frameWrap=dialog.querySelector('.streetview-frame-wrap'),loading=dialog.querySelector('.streetview-loading'),external=dialog.querySelector('a');
let statusTimer,frameTimer,picking=false,clickMap=null;

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
 const bearing=heading(s,hit.d),embed=V.embedUrl(hit.point,bearing),url=V.url(hit.point,bearing);
 if(!embed||!url){message('No se pudo abrir ese punto.');return;}
 clearTimeout(frameTimer);frameWrap.classList.remove('loaded');loading.textContent='Cargando la panorámica…';external.href=url;frame.src=embed;
 dialog.showModal();message('Street View abierto en el punto elegido.');
 frameTimer=setTimeout(()=>{if(dialog.open&&!frameWrap.classList.contains('loaded'))loading.textContent='La panorámica tarda en cargar. Puedes abrir este punto en Google Maps.';},10000);
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
frame.addEventListener('load',()=>{if(frame.src&&frame.src!=='about:blank'){clearTimeout(frameTimer);frameWrap.classList.add('loaded');}});
// Al cerrar hay que soltar el iframe: si no, la página de Google se queda cargada de
// fondo gastando red y batería. No basta con escuchar el evento close -medido: no llega
// a dispararse aquí-, así que la limpieza se hace también a mano, y en el evento cancel
// que sí llega al cerrar con Escape.
function limpiarVisor(){
 clearTimeout(frameTimer);
 frame.src='about:blank';
 frameWrap.classList.remove('loaded');
 loading.textContent='Cargando la panorámica…';
 external.removeAttribute('href');
}
function closeDialog(){if(dialog.open)dialog.close();limpiarVisor();}
dialog.querySelector('.streetview-close').onclick=closeDialog;
dialog.addEventListener('click',e=>{if(e.target===dialog)closeDialog();});
dialog.addEventListener('close',limpiarVisor);
dialog.addEventListener('cancel',limpiarVisor);
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&picking)cancel(true);});
for(const name of ['rutas:route','rutas:visible','online','offline'])window.addEventListener(name,()=>{if(name==='rutas:route')cancel();refresh();});
refresh();

window.RutasStreetViewUI={select,cancel,close:closeDialog,isPicking:()=>picking,refresh};
})();
