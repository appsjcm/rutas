(function(){
'use strict';
const $=id=>document.getElementById(id),A=window.RutasRestrictions,C=window.RutasNav;
let report=null,layer=null,token=0,controller=null,routeRef=null,acks=[],ackKey=null;
const km=m=>(m/1000).toFixed(3).replace('.',',')+' km';
function bounds(pts){let s=90,w=180,n=-90,e=-180;for(const p of pts){s=Math.min(s,p.lat);n=Math.max(n,p.lat);w=Math.min(w,p.lon);e=Math.max(e,p.lon);}return [s-.002,w-.002,n+.002,e+.002];}
function key(pts){return 'rutas-osm-check-v1:'+bounds(pts).join(',');}
const ACK_TOLERANCE=60;
function loadAcks(route){const print=C.fingerprint(route);ackKey='rutas-oneway-ack-v2:'+print;acks=[];try{localStorage.removeItem('rutas-oneway-ack-v1:'+print);const raw=JSON.parse(localStorage.getItem(ackKey));if(Array.isArray(raw))acks=raw.filter(a=>Array.isArray(a)&&Number.isSafeInteger(a[0])&&Number.isFinite(a[1]));}catch{}}
function saveAcks(){if(!ackKey)return;try{acks.length?localStorage.setItem(ackKey,JSON.stringify(acks)):localStorage.removeItem(ackKey);}catch{}}
function muted(issue){return acks.some(a=>a[0]===issue.way&&Math.abs(a[1]-issue.start)<=ACK_TOLERANCE);}
function setAck(issue,on){if(on){if(!muted(issue))acks.push([issue.way,Math.round(issue.start)]);}else acks=acks.filter(a=>!(a[0]===issue.way&&Math.abs(a[1]-issue.start)<=ACK_TOLERANCE));}
function reset(){const state=RutasMap.get();if(!state.route||state.route.pts===routeRef)return;routeRef=state.route.pts;loadAcks(state.route);token++;if(controller)controller.abort();report=null;if(layer){state.map.removeLayer(layer);layer=null;}$('road-issues').replaceChildren();$('road-export').disabled=true;$('road-check').disabled=Roadbook.getRoute().sample;$('road-status').textContent=Roadbook.getRoute().sample?'Carga tu GPX real para comprobarlo.':'Sin comprobar. Pulsa Comprobar mi recorrido; se consulta únicamente la zona del mapa.';$('nav-road-alert').hidden=true;try{const cache=JSON.parse(localStorage.getItem(key(routeRef)));if(cache&&Date.now()-cache.saved<86400000)render(cache.data,state.route,true);}catch{}}
function description(issue){return issue.kind==='opposed'?'Posible sentido contrario':issue.kind==='conditional'?'Sentido variable: revisar condiciones':'Coincidencia dudosa entre vías cercanas';}
function link(text,url){const a=document.createElement('a');a.textContent=text;a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
function render(data,route,cached=false){if(data.remark||!Array.isArray(data.elements))throw Error('La consulta de OpenStreetMap está incompleta. No se puede verificar esta ruta.');if(!data.elements.length)throw Error('Esos datos no contienen ninguna calle de la zona, así que no verifican nada. Repite la consulta o usa otro archivo.');report=A.analyze(route.pts,data.elements);report.osmDate=data.osm3s?.timestamp_osm_base||null;report.checked=new Date().toISOString();const state=RutasMap.get();if(layer)state.map.removeLayer(layer);layer=L.featureGroup().addTo(state.map);$('road-issues').replaceChildren();if(!ackKey)loadAcks(route);
 const painters=[];
 const updateStatus=()=>{const live=report.issues.filter(i=>!muted(i)),probable=live.filter(i=>i.kind==='opposed').length,doubtful=live.length-probable,hidden=report.issues.length-live.length,date=report.osmDate?new Date(report.osmDate).toLocaleDateString('es-ES'):'no indicada',coverage=report.sampled?Math.round(report.matched/report.sampled*100):0,old=report.osmDate&&Date.now()-Date.parse(report.osmDate)>30*86400000;
  $('road-status').textContent=(live.length?probable+(probable===1?' posible tramo en sentido contrario':' posibles tramos en sentido contrario')+' y '+doubtful+(doubtful===1?' punto dudoso.':' puntos dudosos.'):report.issues.length?'Todos los avisos de esta ruta están marcados como revisados.':'No se detectaron conflictos de sentido único con estos datos. Esto no confirma que toda la ruta sea legal.')+(hidden?' '+hidden+(hidden===1?' tramo revisado y silenciado.':' tramos revisados y silenciados.'):'')+' Coincidencia geométrica en el '+coverage+' % de las muestras. Fecha de los datos OSM: '+date+(old?' (más de 30 días; requiere verificación actual).':'.')+(cached?' Datos recuperados del dispositivo.':'');};
 for(const [i,issue] of report.issues.entries()){const red=issue.kind==='opposed',symbol=red?'⛔':'⚠',color=red?'#c12719':'#a56800';const popup=document.createElement('div');popup.className='road-popup';const title=document.createElement('b');title.textContent=symbol+' '+description(issue);const detail=document.createElement('p');detail.textContent=issue.name+' · '+km(issue.start)+'–'+km(issue.end)+'. Comprueba la señalización antes de seguir esta traza.';popup.append(title,detail,link('Ver vía y etiquetas en OpenStreetMap','https://www.openstreetmap.org/way/'+issue.way),link('Ver este punto en Street View','https://www.google.com/maps/@?api=1&map_action=pano&viewpoint='+encodeURIComponent(issue.p.lat+','+issue.p.lon)));
  const marker=L.marker([issue.p.lat,issue.p.lon],{icon:L.divIcon({className:'road-sign'+(muted(issue)?' road-sign-off':''),html:symbol,iconSize:[34,34],iconAnchor:[17,17]})}).bindPopup(popup).addTo(layer);
  const line=L.polyline(C.section(route,issue.start,issue.end).map(p=>[p.lat,p.lon]),{color,weight:8,opacity:.85,dashArray:red?null:'7 6'}).addTo(layer);
  const li=document.createElement('li'),label=document.createElement('strong'),range=document.createElement('div'),button=document.createElement('button'),ack=document.createElement('button');
  label.textContent=symbol+' '+issue.name;range.textContent=km(issue.start)+'–'+km(issue.end)+' · '+description(issue);
  button.type='button';button.className='btn sm';button.textContent='Ver señal '+(i+1);button.onclick=()=>{RutasMap.seek(Math.max(0,issue.start-20));marker.openPopup();};
  const siblings=report.issues.filter(o=>o.way===issue.way);
  ack.type='button';ack.className='btn sm';
  const whole=siblings.length>1?document.createElement('button'):null;
  if(whole){whole.type='button';whole.className='btn sm';}
  const apply=()=>{saveAcks();for(const fn of painters)fn();updateStatus();alertAt(RutasMap.get().progress);};
  ack.onclick=()=>{setAck(issue,!muted(issue));apply();};
  if(whole)whole.onclick=()=>{const on=!siblings.every(muted);for(const o of siblings)setAck(o,on);apply();};
  const paint=()=>{const off=muted(issue);li.classList.toggle('road-done',off);marker.getElement()?.classList.toggle('road-sign-off',off);line.setStyle({opacity:off?.3:.85,weight:off?4:8});
   ack.textContent=off?'Reactivar':'Marcar revisado';ack.setAttribute('aria-pressed',off?'true':'false');ack.title=off?'Vuelve a avisar de este tramo':'Silencia solo este tramo';
   if(whole){const all=siblings.every(muted);whole.textContent=all?'Reactivar la vía':'Toda la vía ('+siblings.length+')';whole.setAttribute('aria-pressed',all?'true':'false');whole.title=all?'Vuelve a avisar de los '+siblings.length+' tramos de esta vía':'Silencia los '+siblings.length+' tramos que esta ronda hace por esta vía';}};
  painters.push(paint);li.append(label,range,button,ack);if(whole)li.append(whole);li.append(link('Fuente OSM','https://www.openstreetmap.org/way/'+issue.way));$('road-issues').append(li);}
 for(const fn of painters)fn();
 updateStatus();
 $('road-export').disabled=false;alertAt(state.progress);RutasMap.refresh();window.dispatchEvent(new CustomEvent("rutas:roads",{detail:{pts:route.pts,elements:data.elements}}));}
const MIRRORS=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
const ATTEMPT_MS=25000;
function host(url){try{return new URL(url).hostname;}catch{return url;}}
async function ask(query,outer,onTry){
 let last=null;
 for(let i=0;i<MIRRORS.length;i++){
  if(outer.signal.aborted)throw Object.assign(Error('cancelado'),{name:'AbortError'});
  onTry(i,MIRRORS.length,host(MIRRORS[i]));
  const attempt=new AbortController(),relay=()=>attempt.abort();
  outer.signal.addEventListener('abort',relay,{once:true});
  const timer=setTimeout(()=>attempt.abort(),ATTEMPT_MS);
  try{
   const res=await fetch(MIRRORS[i]+'?data='+encodeURIComponent(query),{signal:attempt.signal});
   if(!res.ok)throw Error(host(MIRRORS[i])+' respondió '+res.status+'.');
   const data=await res.json();
   if(data.remark)throw Error(host(MIRRORS[i])+' no pudo completar la consulta.');
   if(!Array.isArray(data.elements)||!data.elements.length)throw Error(host(MIRRORS[i])+' no devolvió ninguna calle de la zona.');
   return data;
  }catch(err){
   if(outer.signal.aborted)throw err;
   last=attempt.signal.aborted?Error('Tiempo agotado en '+host(MIRRORS[i])+'.'):err;
  }finally{clearTimeout(timer);outer.signal.removeEventListener('abort',relay);}
 }
 throw last||Error('Ningún servidor respondió.');
}
async function check(){const state=RutasMap.get();if(!state.route||Roadbook.getRoute().sample)return;const own=++token,route=state.route,box=bounds(route.pts),width=C.distance({lat:box[0],lon:box[1]},{lat:box[0],lon:box[3]}),height=C.distance({lat:box[0],lon:box[1]},{lat:box[2],lon:box[1]});if(width*height>250000000){$('road-status').textContent='La zona es demasiado extensa para esta consulta. Selecciona un segmento más corto.';return;}
 $('road-check').disabled=true;const requestController=new AbortController();controller=requestController;
 try{
  const query='[out:json][timeout:30];way["highway"]('+box.join(',')+');out tags geom;';
  const data=await ask(query,requestController,(i,n,name)=>{$('road-status').textContent='Consultando sentidos de circulación en '+name+(i?' (servidor '+(i+1)+' de '+n+')':'')+'…';});
  if(own!==token)return;
  render(data,route);
  try{localStorage.setItem(key(route.pts),JSON.stringify({saved:Date.now(),data}));}catch{}
 }catch(err){
  if(own===token)$('road-status').textContent=err.name==='AbortError'?'Comprobación cancelada.':'No respondió ninguno de los '+MIRRORS.length+' servidores de OpenStreetMap. '+err.message+' Puedes reintentarlo o usar Cargar datos de calles.';
 }finally{if(own===token){$('road-check').disabled=false;controller=null;}}}
function upcoming(d){return report?.issues.find(i=>!muted(i)&&i.end+10>=d&&i.start-d<=100);}
function alertAt(d){const issue=upcoming(d);$('nav-road-alert').hidden=!issue;if(issue)$('nav-road-alert').textContent=(issue.kind==='opposed'?'⛔ Posible sentido contrario':'⚠ Sentido por comprobar')+' · '+issue.name+(issue.start>d?' · en '+Math.round(issue.start-d)+' m':'')+'. No sigas esta traza sin comprobar la señalización.';}
window.RutasChecks={gpsAlert:d=>{const i=upcoming(d);return i?(i.kind==='opposed'?'Atención, posible sentido contrario. ':'Atención, sentido de circulación por comprobar. ')+i.name+'. Revisa la señalización antes de continuar.':null;}};
$('road-data').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;const state=RutasMap.get();if(!state.route||Roadbook.getRoute().sample){$('road-status').textContent='Carga primero tu GPX.';return;}if(file.size>15000000){$('road-status').textContent='El archivo de calles es demasiado grande (máximo 15 MB).';return;}const own=++token;if(controller)controller.abort();try{const data=JSON.parse(await file.text());if(own!==token)return;if(!Array.isArray(data.elements)||!data.elements.every(w=>w.type==='way'&&Number.isSafeInteger(w.id)&&Array.isArray(w.geometry)&&w.geometry.every(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180)))throw Error('No es un archivo de calles compatible.');render(data,state.route);try{localStorage.setItem(key(state.route.pts),JSON.stringify({saved:Date.now(),data}));}catch{}}catch(err){if(own===token)$('road-status').textContent='No se pudo leer el archivo: '+err.message;}finally{if(own===token)$('road-check').disabled=false;}};
$('road-check').onclick=check;$('road-export').onclick=()=>{if(!report)return;const quote=s=>'"'+String(s??'').replace(/"/g,'""')+'"';const rows=[['calle','km_inicio','km_fin','resultado','revisado','via_osm','fecha_datos_osm']].concat(report.issues.map(i=>[i.name,(i.start/1000).toFixed(3),(i.end/1000).toFixed(3),description(i),muted(i)?'sí':'no','https://www.openstreetmap.org/way/'+i.way,report.osmDate]));const blob=new Blob(['\uFEFF'+rows.map(r=>r.map(quote).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='revision-sentidos.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);};window.addEventListener('rutas:check-route',reset);window.addEventListener('rutas:progress',e=>alertAt(e.detail.distance));reset();
})();
