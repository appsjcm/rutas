(function(root){
'use strict';
// Modo de bajo consumo. El GPS, la pantalla encendida y el mapa 3D son lo que gasta en una
// jornada; aqui solo se decide cuando recortar, y que se recorta. Medir el ahorro exige un
// telefono real: esto no lo mide, solo deja de pedir trabajo que no hace falta.

const BAJA=.2,CRITICA=.1,SOSTENIDA=45;   // % de bateria y minutos de navegacion seguida

function minutes(ms){const v=Number(ms);return Number.isFinite(v)&&v>0?Math.floor(v/60000):0;}
function percent(level){
 // Sin dato no es 0 %: leerlo como cero mandaria a modo critico un telefono lleno.
 if(level===null||level===undefined||level==='')return null;
 const v=Number(level);
 return Number.isFinite(v)&&v>=0&&v<=1?Math.round(v*100):null;
}

// Cargando no se ahorra: el camion lleva el movil enchufado casi siempre.
function power(level,charging){
 if(charging)return 'charging';
 const p=percent(level);
 if(p===null)return 'unknown';
 if(p<=CRITICA*100)return 'critical';
 if(p<=BAJA*100)return 'low';
 return 'ok';
}

function decide(state){
 const s=state||{};
 const p=power(s.level,s.charging);
 const mins=minutes(s.elapsed);
 const reasons=[];
 let animations=true,heavy=true;

 if(p==='critical'||p==='low'){reasons.push('battery');animations=false;heavy=false;}
 // Sin bateria que consultar -iPhone no la da- el unico dato fiable es el rato navegando.
 else if(s.navigating&&mins>=SOSTENIDA){reasons.push('sustained');animations=false;}
 if(s.reducedMotion){if(!reasons.includes('motion'))reasons.push('motion');animations=false;}

 return {level:p==='critical'?'critical':(animations?'normal':'saving'),
         animations,heavy,reasons,percent:percent(s.level),minutes:mins};
}

function message(d){
 if(!d||!d.reasons.length)return '';
 if(d.reasons.includes('battery')){
  const p=d.percent===null?'':' ('+d.percent+' %)';
  return 'Batería baja'+p+'. Se reducen las animaciones y el mapa vuelve a 2D.';
 }
 if(d.reasons.includes('sustained'))
  return 'Llevas '+d.minutes+' min navegando. Se reducen las animaciones para gastar menos batería.';
 return '';
}

// Cambia de verdad lo que se hace, o solo cambia el numero de la bateria.
function changed(a,b){
 if(!a||!b)return true;
 return a.animations!==b.animations||a.heavy!==b.heavy||a.level!==b.level;
}

const api={decide,power,message,changed,minutes,percent,BAJA,CRITICA,SOSTENIDA};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RutasPowerCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
