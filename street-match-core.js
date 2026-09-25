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
// Valhalla ya conoce la maniobra real de cada cruce. Se conserva una versión breve para
// la pantalla y el punto exacto de la geometría para colocarla después de unir las patas.
function roadManeuver(value){
 const m=value||{},type=Number(m.type),exit=Number(m.roundabout_exit_count)||0;
 const actions={
  9:['Giro suave a la derecha','↱'],10:['Giro a la derecha','↱'],11:['Giro cerrado a la derecha','↱'],
  12:['Cambio de sentido','↶'],13:['Cambio de sentido','↶'],
  14:['Giro cerrado a la izquierda','↰'],15:['Giro a la izquierda','↰'],16:['Giro suave a la izquierda','↰'],
  17:['Toma la incorporación','↑'],18:['Toma la incorporación a la derecha','↱'],19:['Toma la incorporación a la izquierda','↰'],
  20:['Toma la salida a la derecha','↱'],21:['Toma la salida a la izquierda','↰'],
  22:['Continúa recto','↑'],23:['Mantente a la derecha','↱'],24:['Mantente a la izquierda','↰'],
  25:['Incorpórate a la vía','↑'],
  26:[exit?'En la rotonda, toma la salida '+exit:'Entra en la rotonda','⟲'],27:['Sal de la rotonda','↗'],
  28:['Sube al ferry','↑'],29:['Sal del ferry','↑'],
  37:['Incorpórate por la derecha','↱'],38:['Incorpórate por la izquierda','↰']
 };
 const action=actions[type];if(!action)return null;
 const names=Array.isArray(m.begin_street_names)&&m.begin_street_names.length?m.begin_street_names:m.street_names;
 const toRoad=Array.isArray(names)?String(names.find(Boolean)||''):'';
 return {type,label:action[0],symbol:action[1],toRoad,roadContext:true,source:'valhalla',roundaboutExit:type===26&&exit?exit:null,
  instruction:String(m.instruction||''),voice:String(m.verbal_pre_transition_instruction||m.verbal_transition_alert_instruction||'')};
}
function guidedLegs(data){
 const list=data&&data.trip&&Array.isArray(data.trip.legs)?data.trip.legs:[];
 if(!list.length)throw Error(data?.error||data?.status_message||'No se encontraron calles próximas al recorrido.');
 return list.map(leg=>{
  const path=decode(leg.shape),maneuvers=[];
  for(const raw of Array.isArray(leg.maneuvers)?leg.maneuvers:[]){
   const guide=roadManeuver(raw),index=Number(raw.begin_shape_index);
   if(guide&&Number.isInteger(index)&&index>=0&&index<path.length)maneuvers.push({...guide,point:path[index]});
  }
  return {path,maneuvers};
 });
}
// Al montar el camino pueden aparecer conectores entre patas. Las coordenadas de las
// maniobras siguen siendo válidas: se buscan hacia delante para respetar las calles repetidas.
function placeManeuvers(values,path,distance,tolerance=70){
 if(!Array.isArray(values)||!Array.isArray(path)||path.length<2||typeof distance!=='function')return [];
 const cum=[0];for(let i=1;i<path.length;i++)cum.push(cum[i-1]+distance(path[i-1],path[i]));
 const out=[];let cursor=0;
 for(const value of values){
  if(!value?.point)continue;let best=-1,error=Infinity;
  for(let i=cursor;i<path.length;i++){
   const gap=distance(value.point,path[i]);if(gap<error){error=gap;best=i;if(gap<.2)break;}
  }
  if(best<0||!Number.isFinite(error)||error>tolerance)continue;
  cursor=best;const turn={...value,d:cum[best]};delete turn.point;
  const previous=out.at(-1);
  if(previous&&Math.abs(previous.d-turn.d)<8&&previous.label===turn.label)continue;
  out.push(turn);
 }
 return out;
}
function upgradeManeuvers(values){
 return (Array.isArray(values)?values:[]).map(value=>{
  const type=Number(value?.type);
  if(type===26){const found=String(value.label||'').match(/salida\s+(\d+)/i),exit=Number(value.roundaboutExit)||Number(found?.[1])||null;return {...value,symbol:'⟲',roundaboutExit:exit};}
  if(type===27)return {...value,symbol:'↗',roundaboutExit:null};
  return value;
 });
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
// Donde se aparta el trazado por calles del GPX. Cuando el trazado es fiable, la navegacion
// lo sigue a el y no al GPX, asi que tiene que pasar por donde pasa la ronda. No bastaba con
// que fuera continuo y midiera parecido: con una ronda de 111 km se acepto uno de 108 km del
// que solo el 7 % del GPX quedaba a menos de 15 m, y el 38 % a mas de 200 m. La cobertura de
// arriba no lo veia: mira 160 muestras, una cada 700 m en esa ronda, y un callejon sin salida
// que el reconocimiento se salte cabe entre dos.
// Aqui se miran todos los puntos del GPX, con un indice por celdas para que no cueste. Los
// puntos y no las rectas entre ellos: un GPX planificado, con un punto en cada cruce, corta
// las curvas por la recta, y eso no es apartarse.
const RADIO_APARTE=45;   // mas lejos que esto del trazado, ese punto del GPX no esta en el
const MAX_APARTE=100;    // un tramo seguido fuera, mas largo que esto, es una calle que falta
const MIN_CERCA=90;      // % de los metros del GPX que tienen que quedar cerca
function apart(gpx,path,distance,opts){
 const o=opts||{},radio=Number.isFinite(o.radio)&&o.radio>0?o.radio:RADIO_APARTE;
 const vacio={pct:0,tramos:[],mayor:0,ok:false};
 if(!Array.isArray(gpx)||gpx.length<2||!Array.isArray(path)||path.length<2||typeof distance!=='function')return vacio;
 const ref=gpx.find(p=>p&&Number.isFinite(p.lat));if(!ref)return vacio;
 const kx=111320*Math.cos(ref.lat*Math.PI/180),ky=110540,celda=100,grid=new Map();
 const xy=p=>({x:p.lon*kx,y:p.lat*ky});
 const seg=[];
 for(let i=0;i<path.length-1;i++){
  const a=xy(path[i]),b=xy(path[i+1]);
  if(![a.x,a.y,b.x,b.y].every(Number.isFinite))continue;
  const s={a,dx:b.x-a.x,dy:b.y-a.y};s.l=s.dx*s.dx+s.dy*s.dy;seg.push(s);
  for(let cx=Math.floor(Math.min(a.x,b.x)/celda);cx<=Math.floor(Math.max(a.x,b.x)/celda);cx++)
   for(let cy=Math.floor(Math.min(a.y,b.y)/celda);cy<=Math.floor(Math.max(a.y,b.y)/celda);cy++){
    const k=cx+':'+cy;let l=grid.get(k);if(!l)grid.set(k,l=[]);l.push(s);
   }
 }
 if(!seg.length)return vacio;
 function cerca(p){
  const q=xy(p);
  for(let cx=Math.floor((q.x-radio)/celda);cx<=Math.floor((q.x+radio)/celda);cx++)
   for(let cy=Math.floor((q.y-radio)/celda);cy<=Math.floor((q.y+radio)/celda);cy++)
    for(const s of grid.get(cx+':'+cy)||[]){
     const t=s.l?Math.max(0,Math.min(1,((q.x-s.a.x)*s.dx+(q.y-s.a.y)*s.dy)/s.l)):0;
     if(Math.hypot(q.x-s.a.x-t*s.dx,q.y-s.a.y-t*s.dy)<=radio)return true;
    }
  return false;
 }
 // Cada punto pesa la mitad de lo que lo separa de sus vecinos: asi cuenta lo recorrido, no
 // cuantos puntos grabo el movil mientras el camion estaba parado.
 let total=0,dentro=0,acum=0,abierto=null;const tramos=[];
 for(let i=0;i<gpx.length;i++){
  const p=gpx[i];
  const antes=i?distance(gpx[i-1],p)||0:0,despues=i<gpx.length-1?distance(p,gpx[i+1])||0:0,peso=(antes+despues)/2;
  acum+=antes;total+=peso;
  if(!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lon)||cerca(p)){
   dentro+=peso;
   if(abierto){tramos.push(abierto);abierto=null;}
   continue;
  }
  if(!abierto)abierto={desde:acum,hasta:acum};else abierto.hasta=acum;
 }
 if(abierto)tramos.push(abierto);
 for(const t of tramos)t.metros=t.hasta-t.desde;
 const mayor=tramos.reduce((m,t)=>Math.max(m,t.metros),0);
 // Hacia abajo: un 89,6 % no es un 90 %.
 const pct=total>0?Math.floor(dentro/total*100):0;
 return {pct,tramos,mayor,ok:pct>=MIN_CERCA&&mayor<=MAX_APARTE};
}
function metrosTexto(m){return m>=1000?(m/1000).toFixed(1).replace('.',',')+' km':Math.round(m)+' m';}
// Lo que se le dice a quien conduce: donde, y cuanto. Sin tecnicismos.
function apartText(r){
 if(!r||r.ok)return '';
 const partes=[],largos=(r.tramos||[]).filter(t=>t.metros>MAX_APARTE);
 if(largos.length){
  const m=largos.reduce((a,b)=>b.metros>a.metros?b:a);
  partes.push(largos.length===1
   ?'Este trazado se salta un tramo de tu GPX de '+metrosTexto(m.metros)+', en el km '+(m.desde/1000).toFixed(1).replace('.',',')+'.'
   :'Este trazado se salta '+largos.length+' tramos de tu GPX; el mayor, de '+metrosTexto(m.metros)+', en el km '+(m.desde/1000).toFixed(1).replace('.',',')+'.');
 }
 if(r.pct<MIN_CERCA)partes.push('Solo el '+r.pct+' % de tu GPX queda a menos de '+RADIO_APARTE+' m de él.');
 return partes.join(' ');
}

const api={decode,extract,legs,guidedLegs,roadManeuver,placeManeuvers,upgradeManeuvers,osrmLegs,osrmRoute,input,chunks,merge,joins,assemble,batches,split,coverage,length,usable,MIN_LENGTH_RATIO,
           apart,apartText,RADIO_APARTE,MAX_APARTE,MIN_CERCA};if(typeof module!=='undefined')module.exports=api;else root.RutasStreetCore=api;
})(typeof window!=='undefined'?window:globalThis);
