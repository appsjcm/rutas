/* Permite tocar cualquier punto del mapa y abrirlo en Google Street View; cerca de la ruta se
   ajusta a ella. No usa SDK ni envía el GPX: solo salen del dispositivo la coordenada elegida
   y, si es de la ruta, el rumbo. */
(()=>{
'use strict';
const V=window.RutasStreetView,C=window.RutasNav,M=window.RutasMap;
const controls=document.querySelector('.map-dimension');
if(!V||!C||!M||!controls)return;

const button=document.createElement('button');
button.type='button';button.id='map-streetview';button.textContent='Street View';
const TITULO='Elegir un punto del mapa para verlo en Google Street View';
button.title=TITULO;
button.setAttribute('aria-label',TITULO);
button.setAttribute('aria-pressed','false');
controls.append(button);

const status=document.createElement('div');
status.id='streetview-status';status.hidden=true;status.setAttribute('role','status');
document.getElementById('nav-stage').append(status);
const dialog=document.createElement('dialog');
dialog.id='streetview-dialog';dialog.setAttribute('aria-labelledby','streetview-dialog-title');
dialog.innerHTML='<div class="streetview-modal-head"><div><small id="streetview-dialog-kind">PUNTO DE LA RUTA</small><h2 id="streetview-dialog-title">Google Street View</h2></div><button type="button" class="streetview-close" aria-label="Cerrar Street View">×</button></div><div class="streetview-frame-wrap"><div class="streetview-loading">Cargando la panorámica…</div><iframe title="Google Street View del punto elegido" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div><div class="streetview-modal-foot"><p>Google recibe solamente este punto y el rumbo. La disponibilidad de imágenes depende de Street View.</p><a class="btn sm" target="_blank" rel="noopener noreferrer">Abrir en Google Maps ↗</a></div>';
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
// Abrir el visor en un punto concreto. Lo usa el toque en el mapa y tambien la vista de
// calle del simulador cuando KartaView y Panoramax no tienen nada por aqui.
function openAt(point,bearing,note,enRuta){
 if(navigator.onLine===false){message('Street View necesita conexión.');return false;}
 const embed=V.embedUrl(point,bearing),url=V.url(point,bearing);
 if(!embed||!url){message('No se pudo abrir ese punto.');return false;}
 dialog.querySelector('#streetview-dialog-kind').textContent=enRuta===false?'PUNTO DEL MAPA':'PUNTO DE LA RUTA';
 // Lo que se dice que recibe Google tiene que ser lo que recibe: sin rumbo, solo el punto.
 dialog.querySelector('.streetview-modal-foot p').textContent='Google recibe solamente este punto'+(V.normaliseHeading(bearing)===null?'':' y el rumbo')+'. La disponibilidad de imágenes depende de Street View.';
 clearTimeout(frameTimer);frameWrap.classList.remove('loaded');loading.textContent='Cargando la panorámica…';external.href=url;frame.src=embed;
 dialog.showModal();if(note)message(note);
 frameTimer=setTimeout(()=>{if(dialog.open&&!frameWrap.classList.contains('loaded'))loading.textContent='La panorámica tarda en cargar. Puedes abrir este punto en Google Maps.';},10000);
 return true;
}
// Cerca de la linea -28 px de pantalla, lo que cubre un dedo- se ajusta a la ruta; lejos se
// abre donde se ha tocado, sin rumbo: Google elige hacia donde mirar.
const AJUSTE_PX=28;
function choose(e){
 const s=state(),tap={lat:e.latlng.lat,lon:e.latlng.lng};
 let radio=0;
 try{const p=s.map.latLngToContainerPoint(e.latlng);radio=e.latlng.distanceTo(s.map.containerPointToLatLng(L.point(p.x+AJUSTE_PX,p.y)));}catch{}
 const elegido=V.pick(s.route,tap,radio);
 cancel();
 if(!elegido){message('No se pudo abrir ese punto.');return;}
 if(elegido.onRoute)openAt(elegido.point,heading(s,elegido.d),'Street View en la ruta, mirando en el sentido de la marcha.',true);
 else openAt(elegido.point,null,'Street View en el punto del mapa elegido.',false);
}
function select(){
 const s=state();
 if(picking){cancel(true);return;}
 if(navigator.onLine===false){message('Street View necesita conexión.');return;}
 if(!s.map){message('El mapa aún no está listo.');return;}
 // La selección se hace en el mapa plano y con el norte arriba: en 3D, o con el mapa girado
 // segun la marcha, el toque no cae donde se ve, porque el mapa no sabe que esta girado.
 if(document.getElementById('map-3d').getAttribute('aria-pressed')==='true')document.getElementById('map-2d').click();
 const rumbo=document.getElementById('drive-heading');
 if(rumbo&&rumbo.getAttribute('aria-pressed')==='true')rumbo.click();
 picking=true;clickMap=s.map;clickMap.on('click',choose);button.textContent='Toca el mapa';button.setAttribute('aria-pressed','true');
 document.getElementById('nav-stage').classList.add('streetview-picking');
 message(s.route?'Toca cualquier punto del mapa. Sobre la ruta, la vista mira en el sentido de la marcha.':'Toca cualquier punto del mapa para verlo en Street View.',true);
}
function refresh(){
 const s=state(),disabled=navigator.onLine===false||!s.map;
 button.disabled=disabled;
 button.title=navigator.onLine===false?'Street View necesita conexión.':TITULO;
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

window.RutasStreetViewUI={select,cancel,openAt,close:closeDialog,isPicking:()=>picking,refresh};
})();
