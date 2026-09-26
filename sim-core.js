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

// Escalones de velocidad: finos al ritmo de una ronda de recogida -donde importa ver como
// se comportan los avisos parando y arrancando- y gruesos en carretera, para adelantar
// recorrido sin esperar. Una escalera explicita se lee mejor que una formula.
const SPEEDS=[5,10,15,20,30,40,50,60,80,100,120,160,200];

// Por debajo del primer escalon, detenido: una ronda de recogida es parar en cada contenedor,
// y parado es cuando el GPS baila sin que nadie se mueva. Hay que poder verlo.
function stepSpeed(current,direction){
 const v=Number(current);
 const dir=Number(direction)<0?-1:1;
 if(!Number.isFinite(v))return SPEEDS[0];
 if(dir>0){
  for(const s of SPEEDS)if(s>v)return s;      // vale aunque el valor no este en la escalera
  return SPEEDS[SPEEDS.length-1];
 }
 for(let i=SPEEDS.length-1;i>=0;i--)if(SPEEDS[i]<v)return SPEEDS[i];
 return 0;
}
function atFloor(v){return Number(v)<=0;}
function atCeiling(v){return Number(v)>=SPEEDS[SPEEDS.length-1];}

// Marchas con nombre. Subir la escalera de una en una para pasar de un ritmo de recogida
// a recorrer un GPX largo son ocho pulsaciones; esto es una. Lento es el ritmo real de una
// ronda puerta a puerta, rapido sirve para ver la ronda entera de un vistazo.
const PACES=[{key:'lento',label:'Lento',speed:10},
             {key:'normal',label:'Normal',speed:50},
             {key:'rapido',label:'Rápido',speed:120}];
function paceSpeed(key){
 const p=PACES.find(x=>x.key===key);
 return p?p.speed:null;
}
// Que marcha esta puesta, o ninguna si se ha ajustado a mano con - y +. Number(null) es 0,
// que es un numero finito, asi que un valor vacio entraria como si fuera una velocidad.
function paceOf(speed){
 if(speed===null||speed===undefined||speed==='')return null;
 const v=Number(speed);
 if(!Number.isFinite(v))return null;
 const p=PACES.find(x=>x.speed===v);
 return p?p.key:null;
}

// El simulador esta disponible si lo pide la direccion -?sim, como siempre- o si se dejo
// encendido en los ajustes. Disponible no es en marcha: la posicion inventada solo empieza
// al pulsar Simular, nunca al abrir, y mientras corre hay una franja roja avisando. Lo que
// no puede pasar por descuido dentro de un vehiculo es que se ponga a correr sola, y eso
// sigue sin poder pasar.
const SIM_KEY='rutas-modo-simulacion';
function simAvailable(search,stored){
 try{if(new URLSearchParams(search||'').has('sim'))return true;}catch(e){}
 return stored==='1';
}

const api={advance,sidestep,jitter,quality,drops,speedOf,stepSpeed,atFloor,atCeiling,
           paceOf,paceSpeed,SPEEDS,PACES,QUALITY,
           simAvailable,SIM_KEY};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RutasSimCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
