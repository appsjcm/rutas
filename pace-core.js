(function(root){
'use strict';
// Ritmo contra la grabacion. El GPX de una ronda ya sabe cuanto se tarda entre dos puntos
// -paradas incluidas-, asi que se puede decir si hoy se va por delante o por detras sin
// inventar ninguna estimacion. Se compara el tramo recorrido desde que arranco el GPS,
// no la jornada entera: asi un descanso con el GPS parado no ensucia el numero.

const DEAD_BAND=120;   // menos de dos minutos no es ir con retraso, es ruido

// Segundos de grabacion desde el inicio hasta la distancia d. Vale con el GPX invertido,
// donde las horas van hacia atras, porque solo importa cuanto separa a los dos puntos.
function recordedSeconds(route,d){
 if(!route||!route.pts||route.pts.length<2)return null;
 const t0=Date.parse(route.pts[0]&&route.pts[0].time);
 if(!Number.isFinite(t0))return null;
 const x=Math.max(0,Math.min(route.total,Number(d)||0));
 // El tiempo entre dos puntos se reparte por distancia, igual que at() hace con la
 // posicion. Quedarse con el punto mas cercano saltaria de golpe lo que separe a dos
 // puntos, que en una grabacion con huecos son minutos enteros.
 let lo=0,hi=route.pts.length-1;
 while(lo<hi){const m=(lo+hi)>>1;if(route.cum[m]<x)lo=m+1;else hi=m;}
 const j=Math.max(1,lo),i=j-1;
 const ta=Date.parse(route.pts[i]&&route.pts[i].time),tb=Date.parse(route.pts[j]&&route.pts[j].time);
 if(!Number.isFinite(ta)||!Number.isFinite(tb))return null;
 const span=route.cum[j]-route.cum[i];
 const f=span>0?Math.max(0,Math.min(1,(x-route.cum[i])/span)):0;
 return Math.abs(ta+(tb-ta)*f-t0)/1000;
}

// Cuanto tardo la grabacion en ese mismo tramo.
function recordedBetween(route,fromD,toD){
 const a=recordedSeconds(route,fromD),b=recordedSeconds(route,toD);
 if(a===null||b===null)return null;
 const v=b-a;
 // Medio segundo de margen: la interpolacion deja ruido de coma flotante, pero ir hacia
 // atras por el recorrido de verdad no es un ritmo y no se inventa.
 return v>=-0.5?Math.max(0,v):null;
}

function pace(route,fromD,toD,elapsed){
 const grabado=recordedBetween(route,fromD,toD);
 const gastado=Number(elapsed);
 if(grabado===null||!Number.isFinite(gastado)||gastado<0)return null;
 const delta=gastado-grabado;
 return {recorded:grabado,elapsed:gastado,delta,
         behind:delta>DEAD_BAND,ahead:delta<-DEAD_BAND,
         onTime:Math.abs(delta)<=DEAD_BAND};
}

function spell(seconds){
 const s=Math.round(Math.abs(Number(seconds)||0));
 const m=Math.round(s/60);
 if(m<60)return m+' min';
 const h=Math.floor(m/60),r=m%60;
 return r?h+' h '+String(r).padStart(2,'0'):h+' h';
}

// Corto, porque se lee de reojo.
function label(p){
 if(!p)return '';
 if(p.onTime)return 'A tiempo';
 return (p.delta>0?'+':'−')+spell(p.delta);
}
function detail(p){
 if(!p)return 'La ronda grabada no trae horas: no hay con qué comparar.';
 if(p.onTime)return 'Vas al ritmo de la grabación.';
 return p.delta>0?'Vas '+spell(p.delta)+' por detrás de la grabación.'
                 :'Vas '+spell(p.delta)+' por delante de la grabación.';
}
function tone(p){
 if(!p)return 'idle';
 return p.onTime?'ok':(p.delta>0?'behind':'ahead');
}

const api={recordedSeconds,recordedBetween,pace,label,detail,tone,spell,DEAD_BAND};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RutasPaceCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
