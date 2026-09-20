(()=>{
'use strict';
const C=window.RutasNav,S=window.RutasStreetCore,stage=document.getElementById('nav-stage');
const bar=document.createElement('section');bar.id='street-match';bar.hidden=true;bar.innerHTML='<span class="street-match-dot" aria-hidden="true"></span><div><strong>Calles del recorrido</strong><p id="street-match-text" role="status" aria-live="polite"></p><small>Se consulta una traza simplificada en Valhalla/OSM; el GPX original no se modifica.</small></div><button type="button" class="btn sm" id="street-match-retry" hidden>Reintentar</button>';
stage.after(bar);
const text=document.getElementById('street-match-text'),retry=document.getElementById('street-match-retry');
let controller=null,routeRef=null,layer=null,path=[],run=0;
function mapKey(matched=false){document.querySelector('.nav-map-key').textContent=matched?'Dorado: calles · gris: GPX · verde: hecho · azul: siguiente':'Gris: recorrido · verde: completado · azul: siguiente tramo';}
function clear(){if(controller)controller.abort();controller=null;run++;const state=RutasMap.get();if(layer&&state.map)state.map.removeLayer(layer);layer=null;path=[];mapKey();window.dispatchEvent(new CustomEvent('rutas:street-path',{detail:{pts:[]}}));}
function status(kind,message,canRetry=false){bar.hidden=false;bar.dataset.state=kind;text.textContent=message;retry.hidden=!canRetry;}
const VALHALLA='https://valhalla1.openstreetmap.de';
// Cada peticion lleva varios cortes: locations = [a1,b1,a2,b2...] y Valhalla devuelve una pata
// por cada par consecutivo, asi que las pares son los enlaces pedidos y las impares se descartan.
async function bridgeGaps(list,signal,onProgress){
 const found=new Map();const groups=S.batches(list,20);
 for(let g=0;g<groups.length;g++){onProgress(g+1,groups.length);await resolve(groups[g]);}
 return found;
 async function resolve(group){
  if(!group.length)return;
  const locations=[];for(const gap of group){locations.push({lat:gap.a.lat,lon:gap.a.lon,type:'break'});locations.push({lat:gap.b.lat,lon:gap.b.lon,type:'break'});}
  try{
   const response=await fetch(VALHALLA+'/route',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({locations,costing:'auto',directions_options:{units:'kilometers'}}),signal,cache:'no-store'});
   if(!response.ok)throw Error('respuesta '+response.status);
   const shapes=S.legs(await response.json());
   group.forEach((gap,i)=>{const line=shapes[i*2];if(line&&line.length>1)found.set(gap.leg,line);});
  }catch(error){
   if(error.name==='AbortError')throw error;
   if(group.length===1)return;                       // ese corte se queda sin enlazar
   const half=Math.ceil(group.length/2);
   await resolve(group.slice(0,half));await resolve(group.slice(half));
  }
 }
}
async function match(force=false){
 const state=RutasMap.get(),data=Roadbook.getRoute();
 if(!state.route||data.sample||state.mode==='access'){clear();bar.hidden=true;routeRef=state.route?.pts||null;return;}
 if(!force&&routeRef===data.pts)return;clear();routeRef=data.pts;const own=++run,input=S.input(data.pts,null);
 if(input.length<2){status('error','No hay puntos suficientes para reconocer las calles.');return;}
 const chunks=S.chunks(input,60);status('loading','Buscando las calles y carreteras que pasan por los puntos del GPX…');controller=new AbortController();
 try{
  const piezasVia=[];for(let i=0;i<chunks.length;i++){if(chunks.length>1)status('loading','Reconociendo calles · tramo '+(i+1)+' de '+chunks.length+'…');const body={shape:chunks[i],costing:'auto',shape_match:'map_snap',directions_options:{units:'kilometers'},trace_options:{gps_accuracy:20,search_radius:60,breakage_distance:5000}};const response=await fetch('https://valhalla1.openstreetmap.de/trace_route',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal,cache:'no-store'});const json=await response.json().catch(()=>null);if(!response.ok)throw Error(json?.error||json?.status_message||'El servicio de calles respondió '+response.status+'.');for(const leg of S.legs(json))piezasVia.push(leg);}
  if(own!==run||Roadbook.getRoute().pts!==routeRef)return;
  let cortes=S.joins(piezasVia,C.distance);const detectados=cortes.length;
  let connectors=null;
  if(cortes.length){
   connectors=await bridgeGaps(cortes,controller.signal,(i,n)=>status('loading','Enlazando cortes por carretera · lote '+i+' de '+n+'…'));
   if(own!==run||Roadbook.getRoute().pts!==routeRef)return;
  }
  const {path:matched,breaks}=S.assemble(piezasVia,connectors,C.distance);
  if(matched.length<2)throw Error('No se obtuvo un trazado continuo por calles.');
  const pct=S.coverage(input,matched);if(pct<25)throw Error('No se pudo asociar esta traza con suficientes calles cercanas.');
  const medida=S.usable(S.length(matched,C.distance),S.length(data.pts,C.distance));
  path=matched;const continuo=breaks.length===0,enlazados=detectados-breaks.length,fiable=continuo&&medida.ok;
  // Un corte sin enlazar jamás se cruza con una recta: el camino se dibuja a trozos.
  const piezas=continuo?[matched]:S.split(matched,breaks);
  layer=L.featureGroup().addTo(state.map);
  for(const pieza of piezas)L.polyline(pieza.map(p=>[p.lat,p.lon]),{color:'#d88922',weight:14,opacity:.72,lineCap:'round',lineJoin:'round',interactive:false,className:'street-matched-line'}).addTo(layer);
  layer.bringToBack();
  const used=fiable?RutasMap.useStreetPath(path):false;mapKey(true);
  status(fiable?'ready':'warn',
   (continuo?'Trazado vial continuo · ':'Trazado vial con interrupciones · ')+pct+' % de los puntos quedan cerca de una calle reconocida.'
   +(enlazados>0?' '+enlazados+(enlazados===1?' corte enlazado':' cortes enlazados')+' por carretera.':'')
   +(continuo?'':' Quedan '+breaks.length+(breaks.length===1?' corte sin enlazar, dibujado como interrupción en vez de como recta.':' cortes sin enlazar, dibujados como interrupciones en vez de como rectas.'))
   +(medida.ok?'':' Solo cubre el '+medida.pct+' % de los kilómetros del GPX: al reconocer las calles se han perdido pasadas repetidas.')
   +(fiable?' Simulación y navegación preparadas sobre estas calles.':' La navegación sigue el GPX original.'),
   !fiable);
  cortesVisibles=breaks.length;window.dispatchEvent(new CustomEvent('rutas:street-path',{detail:{pts:path,coverage:pct,navigation:used,bridges:enlazados,gaps:breaks.length,pieces:piezas.length,lengthPct:medida.pct}}));
 }catch(error){if(error.name!=='AbortError'&&own===run)status('error','No se pudo dibujar el trazado por calles. '+error.message+' El GPX original sigue disponible.',true);}
 finally{if(own===run)controller=null;}
}
retry.onclick=()=>match(true);window.addEventListener('rutas:check-route',()=>match());window.addEventListener('pagehide',clear);let cortesVisibles=0;window.RutasStreetMatch={get:()=>({pts:path.slice(),active:!!layer,gaps:cortesVisibles})};match();
})();
