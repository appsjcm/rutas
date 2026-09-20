(()=>{
'use strict';
const C=window.RutasNav,S=window.RutasStreetCore,stage=document.getElementById('nav-stage');
const bar=document.createElement('section');bar.id='street-match';bar.hidden=true;bar.innerHTML='<span class="street-match-dot" aria-hidden="true"></span><div><strong>Calles del recorrido</strong><p id="street-match-text" role="status" aria-live="polite"></p><small>Se consultan los puntos del GPX en servicios de OpenStreetMap; el GPX original no se modifica.</small></div><button type="button" class="btn sm" id="street-match-retry" hidden>Reintentar</button>';
stage.after(bar);
const text=document.getElementById('street-match-text'),retry=document.getElementById('street-match-retry');
let controller=null,routeRef=null,layer=null,path=[],run=0,cortesVisibles=0;
function mapKey(matched=false){document.querySelector('.nav-map-key').textContent=matched?'Dorado: calles · gris: GPX · verde: hecho · azul: siguiente':'Gris: recorrido · verde: completado · azul: siguiente tramo';}
function clear(){if(controller)controller.abort();controller=null;run++;const state=RutasMap.get();if(layer&&state.map)state.map.removeLayer(layer);layer=null;path=[];cortesVisibles=0;mapKey();window.dispatchEvent(new CustomEvent('rutas:street-path',{detail:{pts:[]}}));}
function status(kind,message,canRetry=false){bar.hidden=false;bar.dataset.state=kind;text.textContent=message;retry.hidden=!canRetry;}

// Emparejar la traza solo lo hace Valhalla: el OSRM publico limita /match a 10 coordenadas,
// asi que servir de reserva ahi costaria unas 200 peticiones por ruta. Para enlazar cortes,
// en cambio, basta con dos puntos por peticion y si vale como reserva.
const VALHALLA='https://valhalla1.openstreetmap.de',OSRM='https://routing.openstreetmap.de/routed-car';
const MATCHER={
 name:'valhalla1.openstreetmap.de',
 async legs(shape,signal){
  const body={shape,costing:'auto',shape_match:'map_snap',directions_options:{units:'kilometers'},trace_options:{gps_accuracy:20,search_radius:60,breakage_distance:5000}};
  const response=await fetch(VALHALLA+'/trace_route',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal,cache:'no-store'});
  const json=await response.json().catch(()=>null);
  if(!response.ok)throw Error(json?.error||json?.status_message||'respondió '+response.status);
  return S.legs(json);
 }
};
const BRIDGES=[{
 name:'valhalla1.openstreetmap.de',
 // locations = [a1,b1,a2,b2...]: Valhalla devuelve una pata por par consecutivo, asi que las
 // pares son los enlaces pedidos y las impares se descartan. Cinco cortes por peticion: el
 // servicio admite diez localizaciones y cada corte gasta dos.
 async run(group,signal){
  const locations=[];for(const gap of group){locations.push({lat:gap.a.lat,lon:gap.a.lon,type:'break'});locations.push({lat:gap.b.lat,lon:gap.b.lon,type:'break'});}
  const response=await fetch(VALHALLA+'/route',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({locations,costing:'auto',directions_options:{units:'kilometers'}}),signal,cache:'no-store'});
  if(!response.ok)throw Error('respondió '+response.status);
  const shapes=S.legs(await response.json());
  return group.map((gap,i)=>shapes[i*2]);
 }
},{
 name:'routing.openstreetmap.de',
 async run(group,signal){
  const out=[];
  for(const gap of group){
   const coords=gap.a.lon.toFixed(6)+','+gap.a.lat.toFixed(6)+';'+gap.b.lon.toFixed(6)+','+gap.b.lat.toFixed(6);
   const response=await fetch(OSRM+'/route/v1/driving/'+coords+'?geometries=polyline6&overview=full',{signal,cache:'no-store'});
   if(!response.ok)throw Error('respondió '+response.status);
   out.push(S.osrmRoute(await response.json()));
  }
  return out;
 }
}];

async function bridgeGaps(list,signal,onProgress){
 const found=new Map(),groups=S.batches(list,5);const usados=new Set();
 for(let g=0;g<groups.length;g++){onProgress(g+1,groups.length);await resolve(groups[g]);}
 return {found,usados};
 async function resolve(group){
  if(!group.length)return;
  for(const bridge of BRIDGES){
   try{
    const lines=await bridge.run(group,signal);
    let alguno=false;
    group.forEach((gap,i)=>{const line=lines[i];if(line&&line.length>1){found.set(gap.leg,line);alguno=true;}});
    if(alguno){usados.add(bridge.name);return;}
   }catch(error){if(error.name==='AbortError')throw error;}
  }
  if(group.length>1){const half=Math.ceil(group.length/2);await resolve(group.slice(0,half));await resolve(group.slice(half));}
 }
}

async function match(force=false){
 const state=RutasMap.get(),data=Roadbook.getRoute();
 if(!state.route||data.sample||state.mode==='access'){clear();bar.hidden=true;routeRef=state.route?.pts||null;return;}
 if(!force&&routeRef===data.pts)return;clear();routeRef=data.pts;const own=++run,input=S.input(data.pts,null);
 if(input.length<2){status('error','No hay puntos suficientes para reconocer las calles.');return;}
 const chunks=S.chunks(input,60);status('loading','Buscando las calles y carreteras que pasan por los puntos del GPX…');controller=new AbortController();
 try{
  const piezasVia=[];
  for(let i=0;i<chunks.length;i++){
   if(own!==run)return;
   status('loading','Reconociendo calles · tramo '+(i+1)+' de '+chunks.length+'…');
   try{for(const leg of await MATCHER.legs(chunks[i],controller.signal))piezasVia.push(leg);}
   catch(error){if(error.name==='AbortError')throw error;throw Error(MATCHER.name+' '+error.message);}
  }
  if(own!==run||Roadbook.getRoute().pts!==routeRef)return;

  const cortes=S.joins(piezasVia,C.distance),detectados=cortes.length;
  let connectors=null,puentesDe=new Set();
  if(cortes.length){
   const salida=await bridgeGaps(cortes,controller.signal,(i,n)=>status('loading','Enlazando cortes por carretera · lote '+i+' de '+n+'…'));
   connectors=salida.found;puentesDe=salida.usados;
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
  const reserva=puentesDe.has(BRIDGES[1].name);
  status(fiable?'ready':'warn',
   (continuo?'Trazado vial continuo · ':'Trazado vial con interrupciones · ')+pct+' % de los puntos quedan cerca de una calle reconocida.'
   +(reserva?' Algún corte se enlazó con '+BRIDGES[1].name+', el servicio de reserva.':'')
   +(enlazados>0?' '+enlazados+(enlazados===1?' corte enlazado':' cortes enlazados')+' por carretera.':'')
   +(continuo?'':' Quedan '+breaks.length+(breaks.length===1?' corte sin enlazar, dibujado como interrupción en vez de como recta.':' cortes sin enlazar, dibujados como interrupciones en vez de como rectas.'))
   +(medida.ok?'':' Solo cubre el '+medida.pct+' % de los kilómetros del GPX: al reconocer las calles se han perdido pasadas repetidas.')
   +(fiable?' Simulación y navegación preparadas sobre estas calles.':' La navegación sigue el GPX original.'),
   !fiable);
  cortesVisibles=breaks.length;
  window.dispatchEvent(new CustomEvent('rutas:street-path',{detail:{pts:path,coverage:pct,navigation:used,bridges:enlazados,gaps:breaks.length,pieces:piezas.length,lengthPct:medida.pct,source:MATCHER.name,bridgedBy:[...puentesDe]}}));
 }catch(error){if(error.name!=='AbortError'&&own===run)status('error','No se pudo dibujar el trazado por calles. '+error.message+' El GPX original sigue disponible.',true);}
 finally{if(own===run)controller=null;}
}
retry.onclick=()=>match(true);window.addEventListener('rutas:check-route',()=>match());window.addEventListener('pagehide',clear);
window.RutasStreetMatch={get:()=>({pts:path.slice(),active:!!layer,gaps:cortesVisibles})};
match();
})();
