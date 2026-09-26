(function(root){
'use strict';
// El resumen al terminar la ronda: cuanto se ha hecho, en cuanto tiempo, las paradas y como
// ha ido contra la grabacion. Solo lo medido en esta navegacion -desde que se pulso Iniciar-;
// si se arranco a mitad de ronda, se dice desde que kilometro. La parte que decide va aqui,
// sin pantalla, para poder probarla.

function duracion(segundos){
 const m=Math.round(Math.max(0,Number(segundos)||0)/60);
 if(m<60)return m+' min';
 const h=Math.floor(m/60),r=m%60;
 return r?h+' h '+String(r).padStart(2,'0')+' min':h+' h';
}
function distancia(metros){
 const v=Math.max(0,Number(metros)||0);
 if(v<995)return Math.round(v/10)*10+' m';
 if(v<9950)return (v/1000).toFixed(1).replace('.',',')+' km';
 return Math.round(v/1000)+' km';
}
// pace: lo que da RutasPaceCore.pace ({delta, onTime}), o null si el GPX no trae horas.
function ritmo(pace){
 if(!pace||!Number.isFinite(Number(pace.delta)))return '';
 if(pace.onTime)return 'Al ritmo de la grabación';
 return duracion(Math.abs(pace.delta))+(pace.delta<0?' por delante':' por detrás')+' de la grabación';
}

// d: {total, from, since, now, stops, stopsDone, pace, falta}. Devuelve el titulo, las filas y un aviso.
function resumen(d){
 const o=d||{};
 const total=Math.max(0,Number(o.total)||0);
 const desde=Number.isFinite(Number(o.from))&&o.from!==null?Math.min(total,Math.max(0,Number(o.from))):0;
 const seg=Number(o.since)>0?(Number(o.now)-Number(o.since))/1000:NaN;   // sin hora de arranque, sin duracion
 const tiempo=Number.isFinite(seg)&&seg>=30?duracion(seg):'';
 const filas=[['Recorrido',distancia(total-desde)+(tiempo?' en '+tiempo:'')]];
 // Arrancar a unos metros del inicio es arrancar en el inicio.
 if(desde>=500)filas.push(['Desde','el km '+(desde/1000).toFixed(1).replace('.',',')]);
 // Las de esta navegacion: arrancando a mitad de ronda, las de antes no se han hecho hoy.
 const paradas=Math.max(0,Math.round(Number(o.stops)||0));
 const hechas=Number.isFinite(Number(o.stopsDone))&&o.stopsDone!==null?Math.min(paradas,Math.max(0,Math.round(Number(o.stopsDone)))):paradas;
 if(paradas)filas.push(['Paradas',hechas+' de '+paradas]);
 const r=ritmo(o.pace);
 if(r)filas.push(['Ritmo',r]);
 return {titulo:'Ronda terminada',filas,aviso:typeof o.falta==='string'?o.falta:''};
}

const api={resumen,duracion,distancia,ritmo};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RutasLlegadaCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
