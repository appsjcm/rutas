(()=>{
'use strict';
const C=window.RutasNav,stage=document.getElementById('nav-stage');
const card=document.createElement('section');card.id='segment-order';card.hidden=true;card.innerHTML='<div><strong>Recorrido unido</strong><p id="segment-order-text"></p></div><div id="segment-order-flow" aria-label="Orden de los segmentos"></div>';
stage.before(card);
let group=null,matched=false;
function clear(){const state=RutasMap.get();if(group&&state.map)state.map.removeLayer(group);group=null;card.hidden=true;}
function render(){
 clear();const state=RutasMap.get(),data=Roadbook.getRoute(),parts=data.parts||[];
 if(data.sample||state.mode==='access'||parts.length<2)return;
 group=L.layerGroup().addTo(state.map);const flow=document.getElementById('segment-order-flow');flow.replaceChildren();let largestGap=0;
 parts.forEach((part,index)=>{if(part.length<2)return;const number=index+1,marker=L.marker([part[0].lat,part[0].lon],{zIndexOffset:850,icon:L.divIcon({className:'segment-pin',html:'<span>'+number+'</span>',iconSize:[32,32],iconAnchor:[16,16]})}).bindTooltip('Inicio del segmento '+number,{direction:'top',offset:[0,-14]});group.addLayer(marker);const pill=document.createElement('span');pill.textContent=number;flow.append(pill);if(index<parts.length-1){const arrow=document.createElement('b');arrow.textContent='→';arrow.setAttribute('aria-hidden','true');flow.append(arrow);const a=part.at(-1),b=parts[index+1][0],gap=C.distance(a,b);largestGap=Math.max(largestGap,gap);if(gap>8&&!matched)group.addLayer(L.polyline([[a.lat,a.lon],[b.lat,b.lon]],{color:'#a55b18',weight:3,opacity:.8,dashArray:'5 7',interactive:false}).bindTooltip('Enlace sin puntos entre los segmentos '+number+' y '+(number+1)));}});
 const detail=largestGap>50?(matched?'Los saltos de la grabación se enlazan visualmente por las calles reconocidas en dorado.':'Buscando por qué calles se enlazan los segmentos…'):'La navegación empieza en el segmento 1 y continúa por todos en el orden del archivo.';document.getElementById('segment-order-text').textContent=parts.length+' segmentos · '+detail;card.hidden=false;
}
window.addEventListener('rutas:check-route',render);window.addEventListener('rutas:street-path',e=>{matched=!!(e.detail?.pts?.length>1);render();});window.addEventListener('pagehide',clear);render();
})();
