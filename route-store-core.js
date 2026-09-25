(function(root){
'use strict';
// Guardar la ultima ruta en el propio movil, en poco sitio. Y, al final, los datos de calles
// del comprobador de sentidos, con la misma codificacion.
//
// Se guardaba como JSON punto a punto -{"lat":…,"lon":…,"ele":null,"time":"2026-…Z"}-, unos
// 155 caracteres por punto. Una ronda de 110 km y 18 500 puntos son 2,9 millones de
// caracteres, 5,8 MB tal como los cuenta el navegador, y el almacen de un iPhone ronda los
// 5 MB: la ruta no se podia guardar y habia que volver a cargar el GPX en cada apertura.
//
// Aqui cada coordenada se guarda como diferencia con la anterior, en enteros, con el mismo
// alfabeto de caracteres que el enlace de compartir. Pero sin perder nada de lo que importa:
// - Coordenadas a 7 decimales exactos, que son los que usa la huella de la ruta. Con menos,
//   la huella cambiaria al recuperarla y se perderian el avance guardado, el registro de
//   tramos y los avisos marcados como revisados, que van todos ligados a ella.
// - Horas al milisegundo: de ellas salen las paradas y el ritmo.
// - Altitud al centimetro, si la hay.
// Y sin las operaciones de 32 bits del enlace de compartir, que a 7 decimales desbordarian
// con longitudes por encima de 107 grados.

const F=1e7;       // 7 decimales: los mismos que usa fingerprint() en nav-core
const FE=100;      // altitud al centimetro
const BASE=63;     // caracteres del 63 al 126: sin comillas ni saltos de linea

// Zigzag y trozos de 5 bits con aritmetica normal, valida hasta 2^53.
function enc(v){
 let z=v<0?(-v)*2-1:v*2,out='';
 while(z>=32){out+=String.fromCharCode(BASE+32+(z%32));z=Math.floor(z/32);}
 return out+String.fromCharCode(BASE+z);
}
function dec(str,c){
 let z=0,mult=1,b;
 do{
  if(c.i>=str.length)throw Error('Ruta guardada incompleta.');
  b=str.charCodeAt(c.i++)-BASE;
  if(b<0||b>63)throw Error('Ruta guardada con datos invalidos.');
  z+=(b%32)*mult;mult*=32;
  if(mult>9007199254740992)throw Error('Ruta guardada con un numero imposible.');
 }while(b>=32);
 return z%2?-(z+1)/2:z/2;
}

// El entero sale del propio toFixed(7), que es lo que mira la huella: asi el redondeo es
// exactamente el mismo y no el de multiplicar por 1e7 en coma flotante.
function fijo(x){
 const s=Number(x).toFixed(7),neg=s[0]==='-';
 const partes=(neg?s.slice(1):s).split('.');
 const n=Number(partes[0])*F+Number(partes[1]);
 return neg?-n:n;
}

function packNumbers(list,escala){
 // Una lista de numeros o null: los null van aparte, por su posicion.
 let prev=0,s='';const nulos=[];
 list.forEach((v,i)=>{
  if(!Number.isFinite(v)){nulos.push(i);s+=enc(0);return;}
  const n=Math.round(v*escala);s+=enc(n-prev);prev=n;
 });
 return {s,nulos};
}
function unpackNumbers(s,n,escala,nulos){
 const c={i:0},out=new Array(n),huecos=new Set(nulos||[]);let prev=0;
 for(let i=0;i<n;i++){
  const d=dec(s,c);
  if(huecos.has(i)){out[i]=null;continue;}
  prev+=d;out[i]=prev/escala;
 }
 return out;
}

// Los trozos del GPX -<trkseg>- son los mismos puntos cortados en tramos seguidos: asi los
// arma el lector de GPX (index.html). Guardarlos otra vez duplicaba la ruta entera; basta
// con cuanto mide cada trozo. Si alguna vez no fueran tramos seguidos de los mismos puntos,
// esa pista se guarda como antes, sin perder nada.
// Se compara por valor, no por identidad: una ruta recuperada de un guardado antiguo pasa
// por JSON y sus trozos son copias de los puntos, no los mismos objetos. Comparando por
// identidad, esa ruta caia siempre en la via de reserva y se guardaba igual de grande -medido:
// 2,88 millones de caracteres "compactos", los mismos que antes-.
function mismoPunto(a,b){
 if(a===b)return true;
 if(!a||!b)return false;
 return a.lat===b.lat&&a.lon===b.lon&&(a.time??null)===(b.time??null)&&(a.ele??null)===(b.ele??null);
}
function trozosSeguidos(pts,parts){
 if(!Array.isArray(parts))return null;
 let i=0;const largos=[];
 for(const parte of parts){
  if(!Array.isArray(parte))return null;
  for(const q of parte){if(!mismoPunto(pts[i++],q))return null;}
  largos.push(parte.length);
 }
 return i===pts.length?largos:null;
}

function packTrack(t){
 const pts=Array.isArray(t&&t.pts)?t.pts:[];
 const largos=t&&t.parts!==undefined?trozosSeguidos(pts,t.parts):[pts.length];
 if(!largos)return {antiguo:t};
 let pa=0,po=0,p='';const lz=[],oz=[];
 pts.forEach((q,i)=>{
  const a=fijo(q.lat),o=fijo(q.lon);p+=enc(a-pa)+enc(o-po);pa=a;po=o;
  // Un punto a menos de medio centimetro al oeste o al sur del cero da "-0.0000000" con
  // toFixed(7), y eso cuenta en la huella: el entero no guarda el signo, asi que va aparte.
  if(Number(q.lat).toFixed(7)==='-0.0000000')lz.push(i);
  if(Number(q.lon).toFixed(7)==='-0.0000000')oz.push(i);
 });
 const out={n:String((t&&t.name)||''),c:pts.length,p};
 if(largos.length!==1||largos[0]!==pts.length)out.ps=largos;
 if(lz.length)out.lz=lz;
 if(oz.length)out.oz=oz;
 const ms=pts.map(q=>q&&q.time!=null&&q.time!==''?Date.parse(q.time):NaN);
 if(ms.some(Number.isFinite)){
  const base=ms.find(Number.isFinite);
  const r=packNumbers(ms.map(m=>Number.isFinite(m)?m-base:NaN),1);
  out.b=base;out.t=r.s;if(r.nulos.length)out.th=r.nulos;
 }
 const ele=pts.map(q=>q&&Number.isFinite(q.ele)?q.ele:NaN);
 if(ele.some(Number.isFinite)){
  const r=packNumbers(ele,FE);
  out.e=r.s;if(r.nulos.length)out.eh=r.nulos;
 }
 return out;
}
function unpackTrack(o){
 if(o&&o.antiguo)return o.antiguo;
 if(!o||typeof o.p!=='string'||!Number.isInteger(o.c)||o.c<0)throw Error('Ruta guardada no valida.');
 const c={i:0},pts=[];let a=0,b=0;
 for(let i=0;i<o.c;i++){
  a+=dec(o.p,c);b+=dec(o.p,c);
  const lat=a/F,lon=b/F;
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)
   throw Error('Ruta guardada con coordenadas imposibles.');
  pts.push({lat,lon,ele:null,time:null});
 }
 if(c.i!==o.p.length)throw Error('Ruta guardada con datos de mas.');
 for(const i of Array.isArray(o.lz)?o.lz:[])if(pts[i])pts[i].lat=-1e-9;
 for(const i of Array.isArray(o.oz)?o.oz:[])if(pts[i])pts[i].lon=-1e-9;
 if(typeof o.t==='string'&&Number.isFinite(o.b)){
  const rel=unpackNumbers(o.t,o.c,1,o.th);
  rel.forEach((v,i)=>{if(v!==null)pts[i].time=new Date(o.b+v).toISOString();});
 }
 if(typeof o.e==='string'){
  const ele=unpackNumbers(o.e,o.c,FE,o.eh);
  ele.forEach((v,i)=>{pts[i].ele=v;});
 }
 // Los trozos se rehacen con los mismos objetos punto, como hace el lector de GPX.
 const largos=Array.isArray(o.ps)?o.ps:[pts.length];
 const parts=[];let desde=0;
 for(const n of largos){
  if(!Number.isInteger(n)||n<0||desde+n>pts.length)throw Error('Ruta guardada con trozos imposibles.');
  parts.push(pts.slice(desde,desde+n));desde+=n;
 }
 if(desde!==pts.length)throw Error('Ruta guardada con trozos que no cuadran.');
 return {name:String(o.n||''),pts,parts};
}

// {name, tracks:[{name, pts}], selected} -> texto, y vuelta.
function pack(data){
 const tracks=Array.isArray(data&&data.tracks)?data.tracks:[];
 return JSON.stringify({v:2,name:String((data&&data.name)||''),
  // Tal cual venga: restoreLocal ya comprueba que sea un indice valido.
  selected:data&&data.selected!==undefined?data.selected:0,
  tracks:tracks.map(packTrack)});
}
function unpack(text){
 let o;
 try{o=typeof text==='string'?JSON.parse(text):text;}catch(e){throw Error('Ruta guardada ilegible.');}
 if(!o||typeof o!=='object')throw Error('Ruta guardada ilegible.');
 // Lo guardado antes de este formato: la lista de puntos tal cual. Se sigue leyendo.
 if(o.v!==2)return {name:o.name,tracks:o.tracks,selected:o.selected,antiguo:true};
 return {name:o.name,tracks:(Array.isArray(o.tracks)?o.tracks:[]).map(unpackTrack),selected:o.selected};
}

// ---- datos de calles del comprobador de sentidos ----
// Lo que devuelve Overpass -{elements:[{type:'way',id,tags,geometry:[{lat,lon}]}], osm3s}-
// guardado igual que la ruta: cada via como diferencias enteras a 7 decimales, que son los
// que trae OpenStreetMap, asi que vuelve exactamente igual. Lo que no usa nadie -el recuadro
// "bounds" de cada via- no se guarda. Que vias se guardan lo decide nearRoute(), en
// restrictions-core.js.
function packRoads(data){
 const ways=[];
 for(const w of Array.isArray(data&&data.elements)?data.elements:[]){
  if(!w||w.type!=='way'||!Number.isSafeInteger(w.id)||!Array.isArray(w.geometry))continue;
  let pa=0,po=0,g='';
  for(const q of w.geometry){const a=fijo(q.lat),o=fijo(q.lon);g+=enc(a-pa)+enc(o-po);pa=a;po=o;}
  ways.push([w.id,w.tags||{},w.geometry.length,g]);
 }
 const out={v:2,ways};
 if(data&&data.osm3s)out.osm3s=data.osm3s;
 return out;
}
function unpackRoads(o){
 if(!o||o.v!==2||!Array.isArray(o.ways))throw Error('Datos de calles guardados no validos.');
 const elements=o.ways.map(r=>{
  if(!Array.isArray(r)||r.length!==4||!Number.isSafeInteger(r[0])||!Number.isInteger(r[2])||r[2]<0||typeof r[3]!=='string')
   throw Error('Datos de calles guardados no validos.');
  const c={i:0},geometry=[];let a=0,b=0;
  for(let i=0;i<r[2];i++){
   a+=dec(r[3],c);b+=dec(r[3],c);
   const lat=a/F,lon=b/F;
   if(Math.abs(lat)>90||Math.abs(lon)>180)throw Error('Datos de calles con coordenadas imposibles.');
   geometry.push({lat,lon});
  }
  if(c.i!==r[3].length)throw Error('Datos de calles con datos de mas.');
  return {type:'way',id:r[0],tags:r[1]&&typeof r[1]==='object'?r[1]:{},geometry};
 });
 const data={elements};
 if(o.osm3s)data.osm3s=o.osm3s;
 return data;
}

const api={pack,unpack,packTrack,unpackTrack,packRoads,unpackRoads,enc,dec,fijo,F,FE};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RutasRouteStore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
