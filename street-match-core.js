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
// ---- que partes del trazado por calles sirven para navegar ----
// Cuando se usa, la navegacion sigue el trazado por calles y no el GPX: rodea las rotondas y
// da las maniobras viales. Pero tiene que pasar por donde pasa la ronda. Con la ronda larga de
// prueba se acepto uno del que el 38 % del GPX quedaba a mas de 200 m. La cobertura de arriba
// no lo veia: mira 160 muestras, una cada 700 m, y entre dos cabe un callejon sin salida.
// Primero se probo a descartar el trazado entero si se apartaba en algun sitio. Fue peor: un
// solo tramo dudoso en 110 km dejaba toda la ronda navegando por el GPX, que cruza las rotondas
// por el medio. Ahora se navega por calles donde coinciden con el GPX y por el GPX solo en los
// tramos que las calles se saltan.
const RADIO_APARTE=45;   // mas lejos que esto del trazado, ese punto del GPX no esta en el
const MAX_APARTE=100;    // un tramo seguido fuera, mas largo que esto, es una calle que falta;
                         // mas corto es ruido del GPS o una rotonda cortada por el medio
const MIN_CERCA=90;      // % de los metros del GPX cerca para decir que coinciden del todo
const MIN_UTIL=50;       // por debajo, el reconocimiento no ha entendido la ronda: solo GPX

function acumula(path,distance){const cum=[0];for(let i=1;i<path.length;i++)cum.push(cum[i-1]+(distance(path[i-1],path[i])||0));return cum;}
function puntoEn(path,cum,d){
 const n=path.length-1;
 if(!(d>0))return {lat:path[0].lat,lon:path[0].lon};
 if(d>=cum[n])return {lat:path[n].lat,lon:path[n].lon};
 let lo=0,hi=n;while(lo<hi){const m=(lo+hi)>>1;if(cum[m]<d)lo=m+1;else hi=m;}
 const j=Math.max(1,lo),i=j-1,t=(d-cum[i])/((cum[j]-cum[i])||1);
 return {lat:path[i].lat+(path[j].lat-path[i].lat)*t,lon:path[i].lon+(path[j].lon-path[i].lon)*t};
}
function tramoDe(path,cum,a,b){
 const out=[puntoEn(path,cum,a)];
 let lo=0,hi=path.length-1;while(lo<hi){const m=(lo+hi)>>1;if(cum[m]<=a)lo=m+1;else hi=m;}
 for(let i=lo;i<path.length&&cum[i]<b;i++)if(cum[i]>a)out.push({lat:path[i].lat,lon:path[i].lon});
 out.push(puntoEn(path,cum,b));
 return out;
}

// Para cada punto del GPX, por donde pasa el trazado cerca de el, en orden. Una ronda pasa
// varias veces por la misma calle, y el trazado tambien, asi que no vale la pasada mas
// cercana: vale la siguiente a la ultima encontrada. NaN donde el trazado no pasa cerca.
function follow(gpx,path,distance,opts){
 const o=opts||{},radio=Number.isFinite(o.radio)&&o.radio>0?o.radio:RADIO_APARTE;
 if(!Array.isArray(gpx)||gpx.length<2||!Array.isArray(path)||path.length<2||typeof distance!=='function')return null;
 if(!path.every(p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)))return null;
 const ref=gpx.find(p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lon));if(!ref)return null;
 const kx=111320*Math.cos(ref.lat*Math.PI/180),ky=110540;
 const X=path.map(p=>p.lon*kx),Y=path.map(p=>p.lat*ky),cum=acumula(path,distance),total=cum[cum.length-1];
 if(!(total>0))return null;
 // Indice por celdas, solo para reencontrar el trazado tras un tramo largo sin verlo.
 const celda=100,grid=new Map();
 for(let j=0;j<path.length-1;j++)
  for(let cx=Math.floor(Math.min(X[j],X[j+1])/celda);cx<=Math.floor(Math.max(X[j],X[j+1])/celda);cx++)
   for(let cy=Math.floor(Math.min(Y[j],Y[j+1])/celda);cy<=Math.floor(Math.max(Y[j],Y[j+1])/celda);cy++){
    const k=cx+':'+cy;let l=grid.get(k);if(!l)grid.set(k,l=[]);l.push(j);
   }
 function proyecta(qx,qy,j){
  const dx=X[j+1]-X[j],dy=Y[j+1]-Y[j],l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((qx-X[j])*dx+(qy-Y[j])*dy)/l)):0;
  return {err:Math.hypot(qx-X[j]-t*dx,qy-Y[j]-t*dy),d:cum[j]+(cum[j+1]-cum[j])*t};
 }
 const pos=new Array(gpx.length).fill(NaN);
 let cd=0,j0=0,sinVer=0,prev=null;
 for(let i=0;i<gpx.length;i++){
  const p=gpx[i];
  // Un punto roto no corta nada: se queda donde iba.
  if(!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lon)){pos[i]=cd;continue;}
  if(prev)sinVer+=distance(prev,p)||0;
  prev=p;
  const qx=p.lon*kx,qy=p.lat*ky,esperado=cd+sinVer,hasta=cd+Math.min(5000,300+3*sinVer);
  while(j0<path.length-2&&cum[j0+1]<cd-50)j0++;
  let best=null;
  for(let j=j0;j<path.length-1&&cum[j]<=hasta;j++){
   const r=proyecta(qx,qy,j);
   if(r.err>radio||r.d<cd-50)continue;
   // Entre dos pasadas cerca, la que toca por orden: 100 m mas adelante pesan como 5 m de error.
   const score=r.err+0.05*Math.abs(r.d-esperado);
   if(!best||score<best.score)best={d:r.d,score};
  }
  if(!best&&sinVer>1000){
   for(let cx=Math.floor((qx-radio)/celda);cx<=Math.floor((qx+radio)/celda);cx++)
    for(let cy=Math.floor((qy-radio)/celda);cy<=Math.floor((qy+radio)/celda);cy++)
     for(const j of grid.get(cx+':'+cy)||[]){
      if(cum[j+1]<cd-50)continue;
      const r=proyecta(qx,qy,j);
      if(r.err<=radio&&r.d>=cd-50&&(!best||r.d<best.d))best={d:r.d};
     }
  }
  if(best){pos[i]=best.d;if(best.d>cd)cd=best.d;sinVer=0;}
 }
 return {pos,cum,total};
}

// Cuanto del GPX queda cerca del trazado, y que tramos no. Cada punto pesa la mitad de lo que
// lo separa de sus vecinos: asi cuenta lo recorrido, no cuantos puntos grabo el movil con el
// camion parado. Se miran los puntos y no las rectas entre ellos: un GPX planificado, con un
// punto en cada cruce, corta las curvas por la recta, y eso no es apartarse.
function apart(gpx,path,distance,opts){
 const vacio={pct:0,tramos:[],largos:[],mayor:0,ok:false};
 const f=follow(gpx,path,distance,opts);
 if(!f)return vacio;
 let total=0,dentro=0,acum=0,abierto=null;const tramos=[];
 for(let i=0;i<gpx.length;i++){
  const p=gpx[i];
  const antes=i?distance(gpx[i-1],p)||0:0,despues=i<gpx.length-1?distance(p,gpx[i+1])||0:0,peso=(antes+despues)/2;
  acum+=antes;total+=peso;
  if(Number.isFinite(f.pos[i])){dentro+=peso;if(abierto){tramos.push(abierto);abierto=null;}continue;}
  if(!abierto)abierto={i0:i,i1:i,desde:acum,hasta:acum};else{abierto.i1=i;abierto.hasta=acum;}
 }
 if(abierto)tramos.push(abierto);
 for(const t of tramos)t.metros=t.hasta-t.desde;
 const largos=tramos.filter(t=>t.metros>MAX_APARTE);
 const mayor=tramos.reduce((m,t)=>Math.max(m,t.metros),0);
 // Hacia abajo: un 89,6 % no es un 90 %.
 const pct=total>0?Math.floor(dentro/total*100):0;
 return {pct,tramos,largos,mayor,ok:pct>=MIN_CERCA&&!largos.length,pos:f.pos,cum:f.cum};
}

// El trazado por calles con el GPX metido en los tramos largos que se salta. Cada union es la
// perpendicular desde el ultimo punto del GPX que aun estaba cerca, asi que mide como mucho
// RADIO_APARTE. Devuelve los puntos y de donde sale cada seccion, para recolocar las maniobras.
function splice(gpx,path,distance,r){
 if(!Array.isArray(gpx)||!Array.isArray(path)||!r||!Array.isArray(r.pos)||!Array.isArray(r.cum)||!Array.isArray(r.largos)||typeof distance!=='function')return null;
 const cum=r.cum,total=cum[cum.length-1],n=gpx.length,out=[],secciones=[];let o=0;
 function mete(p){
  const q={lat:p.lat,lon:p.lon},u=out[out.length-1];
  if(u){const d=distance(u,q)||0;if(d<.01)return;o+=d;}
  out.push(q);
 }
 function calles(a,b){
  if(!(b>=a))return;
  const pts=tramoDe(path,cum,a,b);mete(pts[0]);const desde=o;
  for(let k=1;k<pts.length;k++)mete(pts[k]);
  secciones.push({tipo:'calles',a,b,desde,hasta:o});
 }
 function delGpx(i0,i1,t){
  const pts=[];for(let i=i0;i<=i1;i++){const p=gpx[i];if(p&&Number.isFinite(p.lat)&&Number.isFinite(p.lon))pts.push(p);}
  if(!pts.length)return;
  mete(pts[0]);const desde=o;
  for(let k=1;k<pts.length;k++)mete(pts[k]);
  secciones.push({tipo:'gpx',desde,hasta:o,km:t.desde,metros:t.metros});
 }
 let ultimo=0,acabado=false;
 for(const t of r.largos){
  const ia=t.i0-1,ib=t.i1+1;
  if(ia>=0){const pa=Math.max(ultimo,r.pos[ia]);calles(ultimo,pa);ultimo=pa;}
  delGpx(Math.max(0,ia),Math.min(n-1,ib),t);
  if(ib<n)ultimo=Math.max(ultimo,r.pos[ib]);else acabado=true;
 }
 if(!acabado)calles(ultimo,total);
 return out.length>1?{pts:out,secciones}:null;
}
// Las maniobras de Valhalla van en metros del trazado por calles: las de las secciones que se
// quedan se recolocan y las de lo que se ha quitado, fuera.
function spliceTurns(turns,secciones){
 const out=[];
 for(const t of Array.isArray(turns)?turns:[]){
  if(!t||!Number.isFinite(t.d))continue;
  const s=(secciones||[]).find(s=>s.tipo==='calles'&&t.d>=s.a&&t.d<=s.b);
  if(s)out.push({...t,d:s.desde+(t.d-s.a)});
 }
 return out;
}

function metrosTexto(m){return m>=1000?(m/1000).toFixed(1).replace('.',',')+' km':Math.round(m)+' m';}
function kmTexto(m){return (m/1000).toFixed(1).replace('.',',');}
// Lo que se le dice a quien conduce: donde y cuanto, sin tecnicismos.
function spliceText(r){
 const l=(r&&r.largos)||[];
 if(!l.length)return '';
 const m=l.reduce((a,b)=>b.metros>a.metros?b:a);
 return l.length===1
  ?'En un tramo de '+metrosTexto(m.metros)+', en el km '+kmTexto(m.desde)+', se sigue tu GPX: las calles reconocidas no pasan por ahí.'
  :'En '+l.length+' tramos se sigue tu GPX porque las calles reconocidas no pasan por ahí; el mayor, de '+metrosTexto(m.metros)+', en el km '+kmTexto(m.desde)+'.';
}
function apartText(r){
 if(!r||r.pct>=MIN_UTIL)return '';
 return 'Las calles reconocidas solo coinciden con el '+r.pct+' % de tu GPX: no se usan para navegar.';
}

const api={decode,extract,legs,guidedLegs,roadManeuver,placeManeuvers,upgradeManeuvers,osrmLegs,osrmRoute,input,chunks,merge,joins,assemble,batches,split,coverage,length,usable,MIN_LENGTH_RATIO,
           follow,apart,splice,spliceTurns,spliceText,apartText,RADIO_APARTE,MAX_APARTE,MIN_CERCA,MIN_UTIL};if(typeof module!=='undefined')module.exports=api;else root.RutasStreetCore=api;
})(typeof window!=='undefined'?window:globalThis);
