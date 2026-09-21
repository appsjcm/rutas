/* Google Street View follows the current GPX progress without sending the GPX file. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),C=window.RutasNav;
const STORE='rutas-google-maps-key-v1',stage=$('nav-stage'),pane=$('streetview-pane'),canvas=$('streetview-canvas');
const mapButton=document.createElement('button');mapButton.type='button';mapButton.id='map-streetview';mapButton.textContent='Calle';mapButton.title='Fotografías de la calle siguiendo la ruta';mapButton.setAttribute('aria-pressed','false');document.querySelector('.map-dimension')?.append(mapButton);
const photoHud=document.createElement('div');photoHud.id='streetview-hud';photoHud.hidden=true;photoHud.innerHTML='<small>VISTA CALLE</small><b id="streetview-place">Siguiendo el recorrido</b><span id="streetview-position"></span>';pane.append(photoHud);
const actions=document.createElement('div');actions.id='streetview-actions';const recenter=document.createElement('button');recenter.type='button';recenter.id='streetview-recenter';recenter.className='btn';recenter.textContent='Orientar a la marcha';actions.append($('streetview-map'),recenter);pane.append(actions);
const notice=document.createElement('div');notice.id='streetview-notice';notice.role='status';notice.hidden=true;stage.append(notice);
let active=false,panorama=null,service=null,loadPromise=null,loadedKey='',lastDistance=NaN,lastRoute=null,request=0,pending=false,currentHeading=0;
const cache=new Map(),prefetching=new Set();

function savedKey(){try{return localStorage.getItem(STORE)||'';}catch{return '';}}
function storeKey(value){try{if(value)localStorage.setItem(STORE,value);else localStorage.removeItem(STORE);return true;}catch{return false;}}
function status(text,kind='info'){$('streetview-key-status').textContent=text;$('streetview-key-status').dataset.kind=kind;}
function buttons(on){for(const id of ['drive-streetview','streetview-preview','map-streetview']){const b=$(id);if(!b)continue;b.setAttribute('aria-pressed',String(on));if(id==='drive-streetview')b.textContent=on?'Mapa':'Vista calle';else if(id==='streetview-preview')b.textContent=on?'Volver al mapa':'Vista calle';}}
function openSettings(message){close();const settings=document.querySelector('.route-settings');if(settings){settings.open=true;settings.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}status(message,'warn');setTimeout(()=>$('streetview-key').focus({preventScroll:true}),250);}
function showNotice(text){notice.textContent=text;notice.hidden=!text;}
function showMap(message=''){
 pane.hidden=true;stage.classList.remove('streetview-active');
 if(message)showNotice(message);
 window.RutasMap?.get().map?.invalidateSize();
}
function showPanorama(){$('streetview-status').textContent='';notice.hidden=true;pane.hidden=false;photoHud.hidden=false;stage.classList.add('streetview-active');setTimeout(()=>window.google?.maps?.event?.trigger(panorama,'resize'),30);}
function close(){active=false;request++;pending=false;lastDistance=NaN;lastRoute=null;photoHud.hidden=true;showMap();showNotice('');buttons(false);panorama?.setVisible(false);}

function loadGoogle(key){
 if(window.google?.maps?.importLibrary)return Promise.resolve(window.google.maps);
 if(loadPromise&&loadedKey===key)return loadPromise;
 loadedKey=key;
 loadPromise=new Promise((resolve,reject)=>{
  const callback='__rutasStreetViewReady';let settled=false;
  const finish=(fn,value)=>{if(settled)return;settled=true;clearTimeout(timer);fn(value);};
  window[callback]=()=>finish(resolve,window.google.maps);
  window.gm_authFailure=()=>finish(reject,Error('Google no ha aceptado la clave. Revisa sus restricciones y la facturación.'));
  document.getElementById('rutas-google-maps')?.remove();
  const script=document.createElement('script');script.id='rutas-google-maps';script.async=true;script.referrerPolicy='strict-origin-when-cross-origin';
  script.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(key)+'&loading=async&v=weekly&language=es&region=ES&auth_referrer_policy=origin&callback='+callback;
  script.onerror=()=>finish(reject,Error('No se ha podido conectar con Google Street View.'));
  document.head.append(script);
  const timer=setTimeout(()=>finish(reject,Error('Google Street View está tardando demasiado en responder.')),20000);
 }).catch(error=>{loadPromise=null;throw error;});
 return loadPromise;
}

async function prepare(){
 const key=savedKey();if(!key){openSettings('Añade tu clave de Google Maps para activar Vista calle. Se guardará solo en este dispositivo.');return false;}
 showNotice('Conectando con Google Street View…');
 try{
  await loadGoogle(key);
  const lib=await google.maps.importLibrary('streetView');
  if(!panorama){
   panorama=new lib.StreetViewPanorama(canvas,{addressControl:false,clickToGo:true,disableDefaultUI:true,fullscreenControl:false,linksControl:true,motionTracking:false,motionTrackingControl:false,panControl:true,showRoadLabels:true,zoom:0,zoomControl:true});
   service=new lib.StreetViewService();
  }
  return true;
 }catch(error){showMap();showNotice('');openSettings(error.message||'No se ha podido abrir Vista calle. Revisa la clave.');return false;}
}

function routePose(state,distance){
 const d=Math.max(0,Math.min(state.route.total,distance)),p=C.at(state.route,d);
 const from=d>=state.route.total-2?C.at(state.route,Math.max(0,d-30)):p;
 const to=d>=state.route.total-2?p:C.at(state.route,Math.min(state.route.total,d+30));
 return {p,heading:C.heading(from,to),distance:d};
}
function cacheKey(distance){return Math.round(distance/30);}
function remember(key,data){cache.set(key,data);if(cache.size>80)cache.delete(cache.keys().next().value);}
function renderPanorama(data,pose){
 currentHeading=pose.heading;panorama.setPano(data.location.pano);panorama.setPov({heading:currentHeading,pitch:0});panorama.setZoom(0);panorama.setVisible(true);
 const road=$('drive-road-name')?.textContent?.trim(),place=data.location.description?.trim();
 $('streetview-place').textContent=place||(road&&!/buscando/i.test(road)?road:'Siguiendo el recorrido');
 $('streetview-position').textContent=(pose.distance/1000).toLocaleString('es-ES',{maximumFractionDigits:2})+' km desde el inicio';
 showPanorama();
}
function prefetch(state,distance){
 if(!active||!service||distance>=state.route.total)return;const routeRef=state.route,pose=routePose(state,distance),key=cacheKey(pose.distance);if(cache.has(key)||prefetching.has(key))return;prefetching.add(key);
 service.getPanorama({location:{lat:pose.p.lat,lng:pose.p.lon},radius:60,preference:google.maps.StreetViewPreference.NEAREST,source:google.maps.StreetViewSource.OUTDOOR},(data,result)=>{prefetching.delete(key);if(!active||window.RutasMap.get().route!==routeRef)return;remember(key,result===google.maps.StreetViewStatus.OK&&data?.location?.pano?data:null);});
}
function findPanorama(pose,token){
 const key=cacheKey(pose.distance);if(cache.has(key)){const data=cache.get(key);if(data){renderPanorama(data,pose);prefetch(window.RutasMap.get(),pose.distance+30);}else{panorama.setVisible(false);showMap('No hay imágenes aquí. Se muestra el mapa y Vista calle volverá a buscar más adelante.');}return;}
 pending=true;
 service.getPanorama({location:{lat:pose.p.lat,lng:pose.p.lon},radius:60,preference:google.maps.StreetViewPreference.NEAREST,source:google.maps.StreetViewSource.OUTDOOR},(data,result)=>{
  pending=false;if(!active||token!==request)return;
  if(result===google.maps.StreetViewStatus.OK&&data?.location?.pano){
   remember(key,data);renderPanorama(data,pose);prefetch(window.RutasMap.get(),pose.distance+30);
  }else{
   remember(key,null);panorama.setVisible(false);showMap('No hay imágenes aquí. Se muestra el mapa y Vista calle volverá a buscar más adelante.');
  }
 });
}
function sync(distance){
 if(!active||!service||pending)return;
 const state=window.RutasMap?.get();if(!state?.route)return;
 const pose=routePose(state,Number.isFinite(distance)?distance:state.progress);
 if(lastRoute===state.route&&Number.isFinite(lastDistance)&&Math.abs(pose.distance-lastDistance)<28)return;
 if(lastRoute!==state.route){cache.clear();prefetching.clear();}
 lastRoute=state.route;lastDistance=pose.distance;showNotice('Buscando la imagen más próxima…');findPanorama(pose,++request);
}
async function open(){
 if(active){close();return;}
 const map2d=$('map-2d');if(map2d?.getAttribute('aria-pressed')!=='true')map2d.click();
 if(!await prepare())return;
 active=true;buttons(true);lastDistance=NaN;lastRoute=null;sync();
}

$('drive-streetview').onclick=open;$('streetview-preview').onclick=open;$('map-streetview').onclick=open;$('streetview-map').onclick=close;
$('streetview-recenter').onclick=()=>{if(panorama){panorama.setPov({heading:currentHeading,pitch:0});panorama.setZoom(0);}};
$('map-3d')?.addEventListener('click',()=>{if(active)close();});
$('streetview-save').onclick=()=>{
 const key=$('streetview-key').value.trim();
 if(!key){status('Pega una clave antes de guardarla.','warn');return;}
 const changed=key!==savedKey();
 if(!storeKey(key)){status('Este navegador no ha permitido guardar la clave.','warn');return;}
 status(changed&&loadedKey&&loadedKey!==key?'Clave actualizada. Recarga Rutas antes de probar la nueva clave.':'Clave guardada solo en este dispositivo. Ya puedes probar Vista calle.','ok');
};
$('streetview-clear').onclick=()=>{close();storeKey('');$('streetview-key').value='';status('Clave borrada de este dispositivo.');};
$('streetview-test').onclick=()=>{const typed=$('streetview-key').value.trim();if(typed&&typed!==savedKey())storeKey(typed);open();};
const key=savedKey();if(key){$('streetview-key').value=key;status('Clave guardada en este dispositivo. Vista calle está lista para usarse.','ok');}
window.addEventListener('rutas:progress',event=>sync(event.detail?.distance));
window.addEventListener('rutas:check-route',()=>{lastRoute=null;lastDistance=NaN;cache.clear();prefetching.clear();if(active)sync();});
window.addEventListener('offline',()=>{if(active){showMap('Sin conexión: se mantiene el mapa disponible.');}});
window.addEventListener('online',()=>{if(active){lastDistance=NaN;sync();}});
window.RutasStreetView={open,close,isActive:()=>active,sync};
})();
