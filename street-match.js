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
async function match(force=false){
 const state=RutasMap.get(),data=Roadbook.getRoute();
 if(!state.route||data.sample||state.mode==='access'){clear();bar.hidden=true;routeRef=state.route?.pts||null;return;}
 if(!force&&routeRef===state.route.pts)return;clear();routeRef=state.route.pts;const own=++run,input=S.input(state.route.pts,C.simplify);
 if(input.length<2){status('error','No hay puntos suficientes para reconocer las calles.');return;}
 const chunks=S.chunks(input);status('loading','Buscando las calles y carreteras que pasan por los puntos del GPX…');controller=new AbortController();
 try{
  const lines=[];for(let i=0;i<chunks.length;i++){if(chunks.length>1)status('loading','Reconociendo calles · tramo '+(i+1)+' de '+chunks.length+'…');const body={shape:chunks[i],costing:'auto',shape_match:'map_snap',directions_options:{units:'kilometers'},trace_options:{gps_accuracy:20,search_radius:60,breakage_distance:5000}};const response=await fetch('https://valhalla1.openstreetmap.de/trace_route',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal,cache:'no-store'});const json=await response.json().catch(()=>null);if(!response.ok)throw Error(json?.error||json?.status_message||'El servicio de calles respondió '+response.status+'.');lines.push(S.extract(json));}
  const matched=S.merge(lines);if(own!==run||RutasMap.get().route?.pts!==routeRef)return;const pct=S.coverage(input,matched);if(pct<25)throw Error('No se pudo asociar esta traza con suficientes calles cercanas.');
  path=matched;layer=L.polyline(path.map(p=>[p.lat,p.lon]),{color:'#d88922',weight:14,opacity:.72,lineCap:'round',lineJoin:'round',interactive:false,className:'street-matched-line'}).addTo(state.map);layer.bringToBack();
  mapKey(true);status('ready','Trazado vial visible · '+pct+' % de los puntos quedan cerca de una calle reconocida.');window.dispatchEvent(new CustomEvent('rutas:street-path',{detail:{pts:path,coverage:pct}}));
 }catch(error){if(error.name!=='AbortError'&&own===run)status('error','No se pudo dibujar el trazado por calles. '+error.message+' El GPX original sigue disponible.',true);}
 finally{if(own===run)controller=null;}
}
retry.onclick=()=>match(true);window.addEventListener('rutas:check-route',()=>match());window.addEventListener('pagehide',clear);window.RutasStreetMatch={get:()=>({pts:path.slice(),active:!!layer})};match();
})();
