/* Free Mapillary street imagery follows the current GPX progress. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),C=window.RutasNav,STORE='rutas-mapillary-token-v1';
const stage=$('nav-stage'),pane=$('streetview-pane'),mapillaryCanvas=$('mapillary-canvas');
const mapButton=document.createElement('button');mapButton.type='button';mapButton.id='map-streetview';mapButton.textContent='Calle';mapButton.title='Panorámicas y fotografías gratuitas siguiendo la ruta';mapButton.setAttribute('aria-pressed','false');document.querySelector('.map-dimension')?.append(mapButton);
const photoHud=document.createElement('div');photoHud.id='streetview-hud';photoHud.hidden=true;photoHud.innerHTML='<small id="streetview-source">VISTA CALLE · MAPILLARY</small><b id="streetview-place">Siguiendo el recorrido</b><span id="streetview-position"></span>';pane.append(photoHud);
const actions=document.createElement('div');actions.id='streetview-actions';const recenter=document.createElement('button');recenter.type='button';recenter.id='streetview-recenter';recenter.className='btn';recenter.textContent='Orientar a la marcha';actions.append($('streetview-map'),recenter);pane.append(actions);
const notice=document.createElement('div');notice.id='streetview-notice';notice.role='status';notice.hidden=true;stage.append(notice);

let active=false,pending=false,lastDistance=NaN,lastRoute=null,request=0,currentHeading=0;
let viewer=null,mapillaryLoad=null,vectorTileLoad=null,loadedToken='',currentImage=null;
const cache=new Map();

function savedToken(){try{return localStorage.getItem(STORE)||'';}catch{return '';}}
function storeToken(value){try{if(value)localStorage.setItem(STORE,value);else localStorage.removeItem(STORE);return true;}catch{return false;}}
function status(text,kind='info'){const el=$('mapillary-status');el.textContent=text;el.dataset.kind=kind;}
function friendlyError(error){const message=error?.message||'';if(/401|403|token|fetch data|failed to fetch/i.test(message))return 'No se ha podido conectar con Mapillary. Revisa el token de cliente y la conexión.';return message||'No se ha podido consultar Mapillary.';}
function buttons(on){for(const id of ['drive-streetview','streetview-preview','map-streetview']){const button=$(id);if(!button)continue;button.setAttribute('aria-pressed',String(on));if(id==='drive-streetview')button.textContent=on?'Mapa':'Vista calle';else if(id==='streetview-preview')button.textContent=on?'Volver al mapa':'Vista calle';}}
function showNotice(text){notice.textContent=text;notice.hidden=!text;}
function openSettings(message){close();const settings=document.querySelector('.route-settings');if(settings){settings.open=true;settings.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}status(message,'warn');setTimeout(()=>$('mapillary-token').focus({preventScroll:true}),250);}
function showMap(message=''){pane.hidden=true;stage.classList.remove('streetview-active');photoHud.hidden=true;if(message)showNotice(message);window.RutasMap?.get().map?.invalidateSize();}
function showImagery(){$('streetview-status').textContent='';notice.hidden=true;pane.hidden=false;photoHud.hidden=false;stage.classList.add('streetview-active');setTimeout(()=>viewer?.resize(),40);}
function close(){active=false;request++;pending=false;lastDistance=NaN;lastRoute=null;currentImage=null;showMap();showNotice('');buttons(false);}
function clearCache(){cache.clear();}

function loadMapillary(){if(window.mapillary?.Viewer)return Promise.resolve(window.mapillary);if(mapillaryLoad)return mapillaryLoad;mapillaryLoad=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='vendor/mapillary.js';script.onload=()=>resolve(window.mapillary);script.onerror=()=>reject(Error('No se ha podido cargar el visor panorámico gratuito.'));document.head.append(script);}).catch(error=>{mapillaryLoad=null;throw error;});return mapillaryLoad;}
async function prepare(token){await loadMapillary();if(!viewer){viewer=new mapillary.Viewer({accessToken:token,container:mapillaryCanvas});loadedToken=token;}else if(loadedToken!==token){await viewer.setAccessToken(token);loadedToken=token;}}
function loadVectorTile(){if(!vectorTileLoad)vectorTileLoad=Promise.all([import('./vendor/pbf-module.js'),import('./vendor/vector-tile-module.js')]).then(([pbf,vt])=>({Pbf:pbf.default,VectorTile:vt.VectorTile}));return vectorTileLoad;}
function poseAt(state,distance){const d=Math.max(0,Math.min(state.route.total,distance)),p=C.at(state.route,d),from=d>=state.route.total-2?C.at(state.route,Math.max(0,d-30)):p,to=d>=state.route.total-2?p:C.at(state.route,Math.min(state.route.total,d+30));return {p,heading:C.heading(from,to),distance:d};}
function angleGap(a,b){return Math.abs(((a-b+540)%360)-180);}
function trim(){if(cache.size>70)cache.delete(cache.keys().next().value);}
function routeLabel(){const road=$('drive-road-name')?.textContent?.trim();return road&&!/buscando/i.test(road)?road:'Siguiendo el recorrido';}
function updateHud(source,pose,date=''){$('streetview-source').textContent=source;$('streetview-place').textContent=routeLabel();$('streetview-position').textContent=(date?date+' · ':'')+(pose.distance/1000).toLocaleString('es-ES',{maximumFractionDigits:2})+' km desde el inicio';}

async function search(pose,token){
 const bucket=Math.round(pose.distance/80);let images=cache.get(bucket);
 if(!images){
  const z=14,n=2**z,x=Math.floor((pose.p.lon+180)/360*n),rad=pose.p.lat*Math.PI/180,y=Math.floor((1-Math.asinh(Math.tan(rad))/Math.PI)/2*n),{Pbf,VectorTile}=await loadVectorTile();
  const read=async(tx,ty)=>{const url=`https://tiles.mapillary.com/maps/vtp/mly1_computed_public/2/${z}/${tx}/${ty}?access_token=${encodeURIComponent(token)}`,response=await fetch(url);if(!response.ok)throw Error(response.status===401||response.status===403?'Mapillary no acepta este token.':'Mapillary no está respondiendo ahora mismo.');const tile=new VectorTile(new Pbf(new Uint8Array(await response.arrayBuffer()))),layer=tile.layers.image;if(!layer)return [];const found=[];for(let i=0;i<layer.length;i++){const feature=layer.feature(i),coordinates=feature.toGeoJSON(tx,ty,z).geometry.coordinates,p=feature.properties;found.push({id:String(p.id),coordinate:{lat:coordinates[1],lng:coordinates[0]},spherical:Boolean(p.is_pano),compass:p.compass_angle,captured:p.captured_at});}return found;};
  const requests=[];for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++)requests.push(read(x+ox,y+oy));const results=await Promise.allSettled(requests),success=results.filter(result=>result.status==='fulfilled');if(!success.length)throw results[0].reason;images=success.flatMap(result=>result.value);cache.set(bucket,images);trim();
 }
 return images.map(image=>{const distance=C.distance(pose.p,{lat:image.coordinate.lat,lon:image.coordinate.lng}),direction=Number.isFinite(image.compass)?angleGap(image.compass,pose.heading):45;return {image,distance,score:distance+(image.spherical?-42:direction*.32)};}).filter(item=>item.distance<=120).sort((a,b)=>a.score-b.score)[0]||null;
}
function orient(){if(!viewer||!currentImage)return;if(currentImage.spherical){const delta=((currentHeading-(Number(currentImage.compass)||0)+540)%360)-180,x=(.5+delta/360+1)%1;viewer.setCenter([x,.5]);}else viewer.setCenter([.5,.5]);viewer.setZoom(0);}
async function render(found,pose,token){await prepare(token);currentHeading=pose.heading;currentImage=found.image;await viewer.moveTo(currentImage.id);orient();const year=currentImage.captured?new Date(currentImage.captured).getFullYear().toString():'';updateHud(currentImage.spherical?'PANORÁMICA GRATIS · MAPILLARY 360':'FOTO GRATIS · MAPILLARY',pose,year);showImagery();}

async function sync(distance){
 if(!active||pending)return;const state=window.RutasMap?.get();if(!state?.route)return;const pose=poseAt(state,Number.isFinite(distance)?distance:state.progress);if(lastRoute===state.route&&Number.isFinite(lastDistance)&&Math.abs(pose.distance-lastDistance)<32)return;if(lastRoute!==state.route)clearCache();lastRoute=state.route;lastDistance=pose.distance;pending=true;const requestId=++request,token=savedToken();showNotice('Buscando panorámicas gratuitas…');
 try{const found=await search(pose,token);if(!active||requestId!==request)return;if(found)await render(found,pose,token);else showMap('No hay fotografías gratuitas próximas. Se mantiene el mapa.');}
 catch(error){if(!active||requestId!==request)return;const message=friendlyError(error);status(message,'warn');showMap(message+' Se mantiene el mapa.');}
 finally{if(requestId===request)pending=false;}
}
async function open(){if(active){close();return;}if(!savedToken()){openSettings('Añade un token gratuito de Mapillary. No requiere facturación.');return;}const map2d=$('map-2d');if(map2d?.getAttribute('aria-pressed')!=='true')map2d.click();active=true;buttons(true);lastDistance=NaN;lastRoute=null;sync();}

$('drive-streetview').onclick=open;$('streetview-preview').onclick=open;$('map-streetview').onclick=open;$('streetview-map').onclick=close;$('streetview-recenter').onclick=orient;
for(const id of ['map-3d','map-satellite'])$(id)?.addEventListener('click',()=>{if(active)close();});
$('mapillary-save').onclick=()=>{const value=$('mapillary-token').value.trim();if(!value){status('Pega un token antes de guardarlo.','warn');return;}if(!storeToken(value)){status('Este navegador no ha permitido guardar el token.','warn');return;}status('Token gratuito guardado solo en este dispositivo.','ok');clearCache();};
$('mapillary-clear').onclick=()=>{close();storeToken('');$('mapillary-token').value='';status('Token borrado de este dispositivo.');clearCache();};
$('streetview-test').onclick=()=>{const value=$('mapillary-token').value.trim();if(value)storeToken(value);const settings=document.querySelector('.route-settings');if(settings)settings.open=false;open();};
try{localStorage.removeItem('rutas-google-maps-key-v1');localStorage.removeItem('rutas-street-provider-v1');}catch{}
const token=savedToken();if(token){$('mapillary-token').value=token;status('Token gratuito guardado. Vista calle está lista.','ok');}
window.addEventListener('rutas:progress',event=>sync(event.detail?.distance));window.addEventListener('rutas:check-route',()=>{lastRoute=null;lastDistance=NaN;clearCache();if(active)sync();});window.addEventListener('offline',()=>{if(active)showMap('Sin conexión: se mantiene el mapa disponible.');});window.addEventListener('online',()=>{if(active){lastDistance=NaN;sync();}});window.RutasStreetView={open,close,isActive:()=>active,sync};
})();
