(()=>{
'use strict';
const C=window.RutasNav,G=window.RutasGPX,stage=document.getElementById('nav-stage');
const card=document.createElement('section');card.id='segment-order';card.hidden=true;card.innerHTML='<div><strong id="segment-order-title">Recorrido unido</strong><p id="segment-order-text"></p><p id="segment-order-loss"></p></div><div id="segment-order-flow" aria-label="Orden de los segmentos"></div>';
stage.before(card);
let group=null,matched=false;
function clear(){const state=RutasMap.get();if(group&&state.map)state.map.removeLayer(group);group=null;card.hidden=true;}
function render(){
 clear();const state=RutasMap.get(),data=Roadbook.getRoute(),parts=data.parts||[];
 if(data.sample||state.mode==='access')return;
 const q=G&&typeof G.quality==='function'?G.quality(parts,C.distance):null;
 const falta=q&&q.timed&&q.lost.count>0;
 if(parts.length<2&&!falta)return;
 group=L.layerGroup().addTo(state.map);const flow=document.getElementById('segment-order-flow');flow.replaceChildren();let largestGap=0;
 document.getElementById('segment-order-title').textContent=parts.length>1?'Recorrido unido':'Grabación incompleta';
 parts.forEach((part,index)=>{if(part.length<2)return;const number=index+1,marker=L.marker([part[0].lat,part[0].lon],{zIndexOffset:850,icon:L.divIcon({className:'segment-pin',html:'<span>'+number+'</span>',iconSize:[32,32],iconAnchor:[16,16]})}).bindTooltip('Inicio del segmento '+number,{direction:'top',offset:[0,-14]});group.addLayer(marker);const pill=document.createElement('span');pill.textContent=number;flow.append(pill);if(index<parts.length-1){const arrow=document.createElement('b');arrow.textContent='→';arrow.setAttribute('aria-hidden','true');flow.append(arrow);const a=part.at(-1),b=parts[index+1][0],gap=C.distance(a,b);largestGap=Math.max(largestGap,gap);if(gap>8&&!matched)group.addLayer(L.polyline([[a.lat,a.lon],[b.lat,b.lon]],{color:'#a55b18',weight:3,opacity:.8,dashArray:'5 7',interactive:false}).bindTooltip('Enlace sin puntos entre los segmentos '+number+' y '+(number+1)));}});
 const detail=largestGap>50?(matched?'Los saltos de la grabación se enlazan visualmente por las calles reconocidas en dorado.':'Buscando por qué calles se enlazan los segmentos…'):'La navegación empieza en el segmento 1 y continúa por todos en el orden del archivo.';
 document.getElementById('segment-order-text').textContent=parts.length>1?parts.length+' segmentos · '+detail:'Un solo segmento grabado.';
 const loss=document.getElementById('segment-order-loss');
 if(falta){
  const min=Math.round(q.lost.seconds/60),km=q.lost.metres/1000;
  const cuanto=min>=1?min+(min===1?' minuto':' minutos'):Math.round(q.lost.seconds)+' segundos';
  const donde=q.lost.cuts&&q.lost.inner?q.lost.cuts+(q.lost.cuts===1?' corte entre segmentos y ':' cortes entre segmentos y ')+q.lost.inner+(q.lost.inner===1?' hueco interno':' huecos internos')
   :q.lost.cuts?q.lost.cuts+(q.lost.cuts===1?' corte entre segmentos':' cortes entre segmentos')
   :q.lost.inner+(q.lost.inner===1?' hueco interno':' huecos internos');
  loss.textContent='Faltan '+cuanto+' y '+(km<1?Math.round(q.lost.metres)+' m':km.toFixed(1).replace('.',',')+' km')+' sin registrar con el vehículo en marcha: '+donde+'. Lo que se dibuje ahí es una reconstrucción por carretera, no el recorrido real.';
  loss.hidden=false;card.dataset.loss='yes';
 }else{loss.textContent='';loss.hidden=true;delete card.dataset.loss;}
 card.hidden=false;
}
window.addEventListener('rutas:check-route',render);window.addEventListener('rutas:street-path',e=>{matched=!!(e.detail?.pts?.length>1);render();});window.addEventListener('pagehide',clear);render();
})();
