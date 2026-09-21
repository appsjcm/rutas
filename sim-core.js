(function(root){
'use strict';
const rad=Math.PI/180;

// Avanzar por el recorrido a una velocidad dada durante un intervalo.
function advance(distance,speedKmh,seconds){
 const d=Number.isFinite(distance)?distance:0;
 const v=Math.max(0,Number(speedKmh)||0),t=Math.max(0,Number(seconds)||0);
 return d+v/3.6*t;
}

// Desplaza un punto perpendicularmente al rumbo: asi se simula salirse de la ruta sin
// inventar una calle, que es lo que interesa para probar la deteccion de desvio.
function sidestep(a,b,metres){
 const m=Number(metres)||0;
 if(!a||!b||!m)return a?{lat:a.lat,lon:a.lon}:a;
 const kx=111320*Math.cos(a.lat*rad),ky=110540;
 let dx=(b.lon-a.lon)*kx,dy=(b.lat-a.lat)*ky;
 const len=Math.hypot(dx,dy);
 if(!len)return {lat:a.lat,lon:a.lon};
 dx/=len;dy/=len;
 return {lat:a.lat+(dx*m)/ky,lon:a.lon+(-dy*m)/kx};
}

// Ruido de posicion. El generador se inyecta para que las pruebas sean deterministas.
function jitter(p,metres,rnd){
 const m=Math.max(0,Number(metres)||0);
 if(!p||!m)return p?{lat:p.lat,lon:p.lon}:p;
 const r=typeof rnd==='function'?rnd:Math.random;
 const angle=r()*2*Math.PI,radius=Math.sqrt(r())*m;
 const kx=111320*Math.cos(p.lat*rad),ky=110540;
 return {lat:p.lat+(Math.sin(angle)*radius)/ky,lon:p.lon+(Math.cos(angle)*radius)/kx};
}

// Calidades de senal. "malo" reproduce un valle o un patio cubierto: precision pobre y
// huecos frecuentes, que es justo donde la navegacion se rompia antes.
const QUALITY={
 bueno:{label:'Buena',accuracy:6,jitter:3,dropEvery:0},
 regular:{label:'Irregular',accuracy:28,jitter:18,dropEvery:8},
 malo:{label:'Mala',accuracy:65,jitter:45,dropEvery:3}
};
function quality(name){return QUALITY[name]||QUALITY.bueno;}
function drops(tick,dropEvery){
 const n=Number(dropEvery)||0,t=Number(tick)||0;
 return n>0&&t>0&&t%n===0;
}

// Velocidad aparente que se entrega al navegador, en m/s.
function speedOf(kmh){const v=Math.max(0,Number(kmh)||0);return v/3.6;}

const api={advance,sidestep,jitter,quality,drops,speedOf,QUALITY};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RutasSimCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
