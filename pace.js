/* Ritmo contra la grabación: si hoy vas por delante o por detrás de la ronda registrada.
   Se compara desde que arrancó el GPS, no la jornada, para que un descanso no lo falsee. */
(()=>{
'use strict';
const P=window.RutasPaceCore;
const eta=document.querySelector('.drive-eta');
if(!P||!eta)return;
const $=id=>document.getElementById(id);

const celda=document.createElement('div');celda.className='drive-stat drive-pace';
celda.innerHTML='<small>Ritmo</small><b id="drive-pace">—</b>';
eta.append(celda);
const valor=$('drive-pace');

let desde=null,inicio=0;

function limpiar(){desde=null;inicio=0;valor.textContent='—';celda.dataset.tone='idle';celda.title='';}

function pinta(d){
 const state=window.RutasMap&&window.RutasMap.get();
 // Solo mientras se navega de verdad: explorando no hay con qué comparar.
 if(!state||!state.active||!state.route||desde===null){limpiar();return;}
 const p=P.pace(state.route,desde,d,(Date.now()-inicio)/1000);
 valor.textContent=P.label(p)||'—';
 celda.dataset.tone=P.tone(p);
 celda.title=P.detail(p);
}

window.addEventListener('rutas:progress',e=>{
 const state=window.RutasMap&&window.RutasMap.get();
 if(!state||!state.active){limpiar();return;}
 const d=e.detail&&Number.isFinite(e.detail.distance)?e.detail.distance:state.progress;
 // El punto de partida es donde estaba el vehículo al arrancar, no el inicio del GPX.
 if(desde===null){desde=d;inicio=Date.now();}
 pinta(d);
});
window.addEventListener('rutas:route',limpiar);
window.addEventListener('rutas:check-route',limpiar);
document.addEventListener('click',e=>{
 const t=e.target;
 if(!t||typeof t.closest!=='function')return;
 if(t.closest('#nav-stop')||t.closest('#nav-focus-stop'))limpiar();
},true);

limpiar();
window.RutasPace={get:()=>({from:desde,since:inicio}),reset:limpiar};
})();
