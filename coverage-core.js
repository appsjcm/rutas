(function(root){
'use strict';
// Que no se quede una calle sin pasar. El avance de la navegacion es un solo numero que
// solo sube -progress = max(progress, d)-, asi que saltarse un tramo no deja rastro: la
// ronda figura igual de completa. En una recogida puerta a puerta eso significa volver.
//
// Aqui se apunta por donde se ha pasado de verdad, como una lista de tramos cubiertos
// sobre el eje de distancia del GPX. Que la ronda repita calles no importa: cada pasada
// es un intervalo distinto de ese eje.

// Entre dos posiciones seguidas puede haber un hueco sin que nadie se haya saltado nada:
// el GPS se pierde unos segundos, o el camion va rapido. Por debajo de esto se da por
// recorrido lo de en medio.
const MAX_SALTO=150;
// Y un hueco no se cuenta como tramo sin pasar hasta que es lo bastante largo. Avisar de
// cuarenta metros que son ruido de GPS es la forma de que el aviso deje de leerse.
const MIN_HUECO=80;

function num(v){
 if(v===null||v===undefined||v==='')return NaN;
 const n=Number(v);
 return Number.isFinite(n)?n:NaN;
}
function limpia(list){
 const out=[];
 for(const it of (Array.isArray(list)?list:[])){
  if(!it)continue;
  const a=num(it[0]),b=num(it[1]);
  if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a)continue;
  out.push([a,b]);
 }
 return out.sort((x,y)=>x[0]-y[0]);
}

// Añade un tramo recorrido y funde lo que se toque, para que la lista no crezca sin fin:
// una ronda de 26 km a una posicion por segundo son miles de tramos, y casi todos seguidos.
function add(list,from,to){
 const f=num(from),t=num(to);
 const base=limpia(list);
 if(!Number.isFinite(f)||!Number.isFinite(t))return base;
 let a=Math.min(f,t),b=Math.max(f,t);
 if(b<=a)return base;
 const out=[];
 for(const it of base){
  if(it[1]<a||it[0]>b){out.push(it);continue;}
  a=Math.min(a,it[0]);b=Math.max(b,it[1]);
 }
 out.push([a,b]);
 return out.sort((x,y)=>x[0]-y[0]);
}

// Un paso de la navegacion: se venia de `prev` y ahora se esta en `now`. Si el salto es
// razonable se da por recorrido lo de en medio; si no, solo cuenta el punto actual y lo
// saltado queda como hueco, que es justo lo que hay que detectar.
function step(list,prev,now,opts){
 const n=num(now);
 if(!Number.isFinite(n))return limpia(list);
 const o=opts||{};
 const salto=Number.isFinite(num(o.maxJump))?num(o.maxJump):MAX_SALTO;
 const p=num(prev);
 if(!Number.isFinite(p))return add(list,n,n+0.001);
 if(n<p)return add(list,n,n+0.001);          // hacia atras no se recorre nada nuevo
 if(n-p<=salto)return add(list,p,n);
 return add(list,n,n+0.001);
}

// Los huecos que cuentan son los que tienen recorrido a los dos lados: eso es haberse
// saltado algo. Lo que queda por delante del punto mas lejano no es un tramo sin pasar,
// es ronda sin terminar, y decir lo contrario seria mentir.
function gaps(list,min){
 const base=limpia(list);
 const umbral=Number.isFinite(num(min))&&num(min)>=0?num(min):MIN_HUECO;
 const out=[];
 for(let i=1;i<base.length;i++){
  const desde=base[i-1][1],hasta=base[i][0];
  if(hasta-desde>umbral)out.push([desde,hasta]);
 }
 return out;
}

function metres(list){
 let t=0;
 for(const [a,b] of limpia(list))t+=b-a;
 return t;
}
function longest(gapsList){
 let mejor=null;
 for(const g of limpia(gapsList))if(!mejor||g[1]-g[0]>mejor[1]-mejor[0])mejor=g;
 return mejor;
}

function texto(m){
 const v=Math.round(num(m)||0);
 return v>=1000?(v/1000).toFixed(1).replace('.',',')+' km':v+' m';
}
// "2 tramos sin pasar · 180 m". Vacio cuando no hay nada que decir: un cartel que dice
// "0 tramos" es ruido.
function summary(gapsList){
 const g=limpia(gapsList);
 if(!g.length)return '';
 const total=metres(g);
 return g.length+(g.length===1?' tramo sin pasar · ':' tramos sin pasar · ')+texto(total);
}
function voice(gapsList){
 const g=limpia(gapsList);
 if(!g.length)return '';
 return g.length===1?'Atención. Te has dejado un tramo sin pasar, de '+texto(metres(g))+'.'
  :'Atención. Te has dejado '+g.length+' tramos sin pasar, '+texto(metres(g))+' en total.';
}

// Se guarda junto a la huella de la ruta, como el avance. Se redondea a metros: con
// centimetros la lista ocupa el triple y no aporta nada.
function pack(list){
 return limpia(list).map(([a,b])=>[Math.round(a),Math.round(b)]);
}
function unpack(raw){
 if(typeof raw==='string'){
  try{raw=JSON.parse(raw);}catch(e){return [];}
 }
 return limpia(raw);
}

const api={add,step,gaps,metres,longest,summary,voice,texto,pack,unpack,limpia,
           MAX_SALTO,MIN_HUECO};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RutasCoverageCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
