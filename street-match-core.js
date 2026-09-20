(function(root){
'use strict';
function decode(encoded,precision=6){
 if(typeof encoded!=='string'||!encoded)throw Error('La respuesta no contiene una geometría válida.');
 const scale=10**precision,pts=[];let i=0,lat=0,lon=0;
 function value(){let result=0,shift=0,byte;do{if(i>=encoded.length||shift>30)throw Error('La geometría de calles está incompleta.');byte=encoded.charCodeAt(i++)-63;if(byte<0||byte>63)throw Error('La geometría de calles no es válida.');result|=(byte&31)<<shift;shift+=5;}while(byte>=32);return result&1?~(result>>1):result>>1;}
 while(i<encoded.length){lat+=value();lon+=value();const p={lat:lat/scale,lon:lon/scale};if(Math.abs(p.lat)>90||Math.abs(p.lon)>180)throw Error('La geometría de calles contiene coordenadas imposibles.');pts.push(p);}
 if(pts.length<2)throw Error('No se obtuvo un trazado continuo por calles.');
 return pts;
}
function extract(data){
 const legs=data&&data.trip&&Array.isArray(data.trip.legs)?data.trip.legs:[];if(!legs.length)throw Error(data?.error||data?.status_message||'No se encontraron calles próximas al recorrido.');
 const out=[];for(const leg of legs){const pts=decode(leg.shape);for(const p of pts)if(!out.length||Math.abs(out.at(-1).lat-p.lat)>1e-7||Math.abs(out.at(-1).lon-p.lon)>1e-7)out.push(p);}
 if(out.length<2)throw Error('No se obtuvo un trazado continuo por calles.');return out;
}
function legs(data){
 const list=data&&data.trip&&Array.isArray(data.trip.legs)?data.trip.legs:[];
 if(!list.length)throw Error(data?.error||data?.status_message||'No se encontraron calles próximas al recorrido.');
 return list.map(leg=>decode(leg.shape));
}
// OSRM devuelve cada trozo continuo como un "matching" propio, que encaja uno a uno con la
// idea de pata de Valhalla: entre matchings es donde puede haber corte, dentro nunca.
function osrmLegs(data){
 if(!data||data.code!=='Ok'||!Array.isArray(data.matchings)||!data.matchings.length)
  throw Error((data&&data.message)||'El servicio de reserva no reconoció calles próximas.');
 const out=[];
 for(const m of data.matchings)if(m&&typeof m.geometry==='string')out.push(decode(m.geometry,6));
 if(!out.length)throw Error('El servicio de reserva no devolvió ninguna geometría de calles.');
 return out;
}
function osrmRoute(data){
 if(!data||data.code!=='Ok'||!Array.isArray(data.routes)||!data.routes.length||typeof data.routes[0].geometry!=='string')
  throw Error((data&&data.message)||'No se pudo enlazar ese corte por carretera.');
 return decode(data.routes[0].geometry,6);
}
function input(pts,simplify,max=1800){
 if(!Array.isArray(pts)||pts.length<2)return [];
 let out=typeof simplify==='function'?simplify(pts,5):pts.slice();
 if(out.length>max){const picked=[];for(let i=0;i<max;i++)picked.push(out[Math.round(i*(out.length-1)/(max-1))]);out=picked;}
 return out.map(p=>({lat:Number(p.lat),lon:Number(p.lon)})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180);
}
function chunks(points,max=120){const out=[];if(points.length<2)return out;for(let start=0;start<points.length-1;start+=max-1)out.push(points.slice(start,Math.min(points.length,start+max)));return out;}
function merge(lines){const out=[];for(const line of lines)for(const p of line)if(!out.length||Math.abs(out.at(-1).lat-p.lat)>1e-7||Math.abs(out.at(-1).lon-p.lon)>1e-7)out.push(p);return out;}
// Dentro de una pata todo el trazado va sobre asfalto, aunque dos puntos disten cientos de
// metros: una calle recta se representa con dos puntos. Lo unico que puede cruzar edificios es
// la union entre dos patas, asi que el corte se busca ahi y no en la distancia entre puntos.
function joins(legs,distance,max=15){
 const out=[];if(!Array.isArray(legs)||typeof distance!=='function')return out;
 let last=null;
 for(let i=0;i<legs.length;i++){
  const leg=legs[i];if(!Array.isArray(leg)||!leg.length)continue;
  if(last){const metres=distance(last,leg[0]);if(Number.isFinite(metres)&&metres>max)out.push({leg:i,metres,a:last,b:leg[0]});}
  last=leg.at(-1);
 }
 return out;
}
// Monta el camino final: donde hay enlace lo intercala, y donde no lo hay anota una
// interrupcion para que nadie dibuje ni navegue una recta inventada.
function assemble(legs,connectors,distance,max=15){
 const path=[],breaks=[];
 if(!Array.isArray(legs))return {path,breaks};
 for(let i=0;i<legs.length;i++){
  const leg=legs[i];if(!Array.isArray(leg)||!leg.length)continue;
  if(path.length){
   const metres=typeof distance==='function'?distance(path.at(-1),leg[0]):0;
   if(Number.isFinite(metres)&&metres>max){
    const line=connectors&&connectors.get(i);
    if(line&&line.length>1)for(const p of line)push(p);
    else breaks.push(path.length);
   }
  }
  for(const p of leg)push(p);
 }
 return {path,breaks};
 function push(p){if(p&&(!path.length||Math.abs(path.at(-1).lat-p.lat)>1e-7||Math.abs(path.at(-1).lon-p.lon)>1e-7))path.push(p);}
}
function batches(list,size=20){const out=[];for(let i=0;i<list.length;i+=size)out.push(list.slice(i,i+size));return out;}
// Un corte que no se ha podido enlazar nunca se dibuja como recta: el camino se parte ahi.
function split(path,breaks){
 const out=[];if(!Array.isArray(path))return out;
 const cuts=new Set(Array.isArray(breaks)?breaks:[]);
 let cur=[];
 for(let i=0;i<path.length;i++){
  if(cuts.has(i)){if(cur.length>1)out.push(cur);cur=[];}
  cur.push(path[i]);
 }
 if(cur.length>1)out.push(cur);
 return out;
}
function length(pts,distance){let d=0;if(!Array.isArray(pts)||typeof distance!=='function')return 0;for(let i=1;i<pts.length;i++)d+=distance(pts[i-1],pts[i]);return d;}
// La cobertura mide si el GPX queda cerca del trazado, pero no si el trazado recorre todo el
// GPX: una ida y vuelta colapsada en una sola pasada da 100 % de cobertura y la mitad de
// kilometros. Por eso la longitud es la que decide si se puede navegar sobre el.
const MIN_LENGTH_RATIO=.8;
function usable(matchedMetres,originalMetres,min=MIN_LENGTH_RATIO){
 if(!(originalMetres>0)||!(matchedMetres>=0))return {ratio:0,ok:false};
 const ratio=matchedMetres/originalMetres;
 return {ratio,pct:Math.round(ratio*100),ok:ratio>=min};
}
function coverage(samples,path,radius=45){
 if(!samples.length||path.length<2)return 0;const take=samples.length<=160?samples:Array.from({length:160},(_,i)=>samples[Math.round(i*(samples.length-1)/159)]);let hit=0;
 for(const p of take){const kx=111320*Math.cos(p.lat*Math.PI/180),ky=110540;let best=Infinity;for(let i=0;i<path.length-1;i++){const a=path[i],b=path[i+1],x=(a.lon-p.lon)*kx,y=(a.lat-p.lat)*ky,dx=(b.lon-a.lon)*kx,dy=(b.lat-a.lat)*ky,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,-(x*dx+y*dy)/l)):0;best=Math.min(best,Math.hypot(x+t*dx,y+t*dy));if(best<=radius)break;}if(best<=radius)hit++;}
 return Math.round(hit/take.length*100);
}
const api={decode,extract,legs,osrmLegs,osrmRoute,input,chunks,merge,joins,assemble,batches,split,coverage,length,usable,MIN_LENGTH_RATIO};if(typeof module!=='undefined')module.exports=api;else root.RutasStreetCore=api;
})(typeof window!=='undefined'?window:globalThis);
