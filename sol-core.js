(function(root){
'use strict';
// Salida y puesta del sol, calculadas en el propio movil: ningun servicio, nada sale de el.
// Sirven para una cosa: saber si es de noche donde se conduce, porque la recogida suele ser
// de noche y un mapa de dia deslumbra en la cabina. Es la aproximacion de la NOAA -ecuacion
// del tiempo y declinacion por el dia del año-; se equivoca en un par de minutos, que para
// decidir entre claro y oscuro sobra.

const RAD=Math.PI/180;
const ZENIT=90.833;          // grados: el borde del sol asomando, con la refraccion del aire

// {rise,set} en milisegundos desde 1970 (UTC), o {polar:'dia'|'noche'} donde ese dia el sol
// no sale o no se pone. null si falta algo.
function sunTimes(date,lat,lon){
 const t=new Date(date).getTime();
 const la=Number(lat),lo=Number(lon);
 if(!Number.isFinite(t)||!Number.isFinite(la)||!Number.isFinite(lo)||Math.abs(la)>90)return null;
 // El dia que cuenta es el de la hora solar del sitio (cuatro minutos por grado de longitud),
 // no el de Greenwich: asi la noche no se parte en dos a medianoche UTC.
 const solar=new Date(t+lo*240000);
 const base=Date.UTC(solar.getUTCFullYear(),solar.getUTCMonth(),solar.getUTCDate());
 const dia=Math.round((base-Date.UTC(solar.getUTCFullYear(),0,1))/86400000);
 const g=2*Math.PI/365*dia;
 const ecuacion=229.18*(0.000075+0.001868*Math.cos(g)-0.032077*Math.sin(g)-0.014615*Math.cos(2*g)-0.040849*Math.sin(2*g));
 const decl=0.006918-0.399912*Math.cos(g)+0.070257*Math.sin(g)-0.006758*Math.cos(2*g)+0.000907*Math.sin(2*g)-0.002697*Math.cos(3*g)+0.00148*Math.sin(3*g);
 const cosH=Math.cos(ZENIT*RAD)/(Math.cos(la*RAD)*Math.cos(decl))-Math.tan(la*RAD)*Math.tan(decl);
 if(cosH>1)return {polar:'noche'};
 if(cosH<-1)return {polar:'dia'};
 const h=Math.acos(cosH)/RAD;
 // Minutos desde la medianoche UTC de ese dia.
 const sale=720-4*(lo+h)-ecuacion,pone=720-4*(lo-h)-ecuacion;
 return {rise:Math.round(base+sale*60000),set:Math.round(base+pone*60000)};
}

function isNight(date,lat,lon){
 const s=sunTimes(date,lat,lon);
 if(!s)return false;
 if(s.polar)return s.polar==='noche';
 const t=new Date(date).getTime();
 return t<s.rise||t>s.set;
}

const api={sunTimes,isNight,ZENIT};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RutasSolCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
