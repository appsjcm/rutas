(function(root){
'use strict';
// Fotografias reales de la calle durante la simulacion. Aqui solo vive lo que se puede
// decidir sin red: cuanto se parece una foto al punto y al rumbo por el que se circula,
// cual se elige, cuando vale la pena buscar otra y como se lee cada proveedor.
//
// Los dos proveedores devuelven formas distintas; el resto de la aplicacion no tiene por
// que enterarse. Todo sale de aqui con el mismo modelo:
//   {id, lat, lon, heading, imageUrl, thumbUrl, sequenceId, index, capturedAt,
//    attribution, provider}

const MAX_DIST=60;        // mas lejos que esto ya no es "esta calle"
const MAX_ANGLE=135;      // mirando al reves: es la otra mano de la carretera, no esta
const HEADING_WEIGHT=0.5; // 180 grados de desvio cuestan lo mismo que 90 metros
const SEQUENCE_BONUS=10;  // seguir en la misma secuencia vale diez metros
const MIN_MOVE=20;        // por debajo de esto no se cambia de foto: solo parpadearia
const CACHE_MAX=24;       // fotos guardadas en memoria

function num(v){
 if(v===null||v===undefined||v==='')return NaN;
 const n=Number(v);
 return Number.isFinite(n)?n:NaN;
}

// Distancia en metros. La misma cuenta plana que usa el resto de la app: a estas
// distancias la diferencia con la formula esferica es de centimetros.
function distance(a,b){
 if(!a||!b)return Infinity;
 const la=num(a.lat),lo=num(a.lon),lb=num(b.lat),lob=num(b.lon);
 if(!Number.isFinite(la)||!Number.isFinite(lo)||!Number.isFinite(lb)||!Number.isFinite(lob))return Infinity;
 const kx=111320*Math.cos((la+lb)/2*Math.PI/180),ky=110540;
 return Math.hypot((lob-lo)*kx,(lb-la)*ky);
}

// Diferencia angular minima: 355 y 5 estan a 10 grados, no a 350.
function angleDiff(a,b){
 const x=num(a),y=num(b);
 if(!Number.isFinite(x)||!Number.isFinite(y))return null;
 return Math.abs(((x-y+540)%360)-180);
}

// Cuanto "cuesta" una foto, en metros equivalentes. Menos es mejor.
function score(photo,point,heading,prevSequenceId,opts){
 const o=opts||{};
 const d=distance(photo,point);
 if(!Number.isFinite(d))return Infinity;
 let total=d;
 const dif=angleDiff(photo&&photo.heading,heading);
 if(dif!==null)total+=dif*(Number.isFinite(o.headingWeight)?o.headingWeight:HEADING_WEIGHT);
 const bonus=Number.isFinite(o.sequenceBonus)?o.sequenceBonus:SEQUENCE_BONUS;
 if(prevSequenceId&&photo&&photo.sequenceId===prevSequenceId)total-=bonus;
 return total;
}

// Una foto mirando hacia el otro lado de la carretera no sirve aunque este pegada: es la
// vuelta, no la ida. Sin rumbo conocido no se descarta, porque no hay con que juzgarla.
function usable(photo,point,heading,opts){
 const o=opts||{};
 const max=Number.isFinite(o.maxDist)?o.maxDist:MAX_DIST;
 if(!photo||!Number.isFinite(distance(photo,point))||distance(photo,point)>max)return false;
 const dif=angleDiff(photo.heading,heading);
 const tope=Number.isFinite(o.maxAngle)?o.maxAngle:MAX_ANGLE;
 return dif===null||dif<=tope;
}

function pick(candidates,point,heading,prevSequenceId,opts){
 let mejor=null,mejorScore=Infinity;
 for(const c of Array.isArray(candidates)?candidates:[]){
  if(!usable(c,point,heading,opts))continue;
  const s=score(c,point,heading,prevSequenceId,opts);
  if(s<mejorScore){mejor=c;mejorScore=s;}
 }
 return mejor;
}

// ---- secuencias ----
// Mientras el vehiculo siga cerca de una secuencia ya descargada se avanza por ella, sin
// volver a preguntar al servidor en cada actualizacion del GPS.
function bestInSequence(seq,point,heading,opts){
 return pick(seq,point,heading,seq&&seq.length?seq[0].sequenceId:null,opts);
}
function leftSequence(seq,point,heading,opts){
 return !bestInSequence(seq,point,heading,opts);
}
function neighbour(seq,photo,step){
 const lista=Array.isArray(seq)?seq:[];
 if(!photo)return null;
 const i=lista.findIndex(p=>p&&p.id===photo.id);
 if(i<0)return null;
 const j=i+(Number(step)<0?-1:1);
 return j>=0&&j<lista.length?lista[j]:null;
}
function sortSequence(seq){
 return (Array.isArray(seq)?seq.slice():[]).sort((a,b)=>{
  const x=num(a.index),y=num(b.index);
  if(Number.isFinite(x)&&Number.isFinite(y))return x-y;
  return 0;
 });
}

// ---- cuando merece la pena mover la imagen ----
function shouldRefresh(lastPoint,point,minMove){
 if(!lastPoint)return true;
 const m=Number.isFinite(minMove)?minMove:MIN_MOVE;
 return distance(lastPoint,point)>=m;
}

// ---- lectura de cada proveedor ----
// KartaView 1.0: las coordenadas y el rumbo vienen como texto, y las imagenes son rutas
// relativas al sitio. Comprobado contra respuestas reales.
const KV_BASE='https://kartaview.org/';
function fromKartaView(item){
 if(!item)return null;
 const lat=num(item.lat),lon=num(item.lng);
 if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;
 if(!item.name&&!item.lth_name)return null;
 const h=num(item.heading);
 return {
  id:'kv:'+String(item.id),
  lat,lon,
  heading:Number.isFinite(h)?h:null,
  imageUrl:KV_BASE+(item.lth_name||item.name),
  thumbUrl:item.th_name?KV_BASE+item.th_name:null,
  sequenceId:item.sequence_id?String(item.sequence_id):null,
  index:Number.isFinite(num(item.sequence_index))?num(item.sequence_index):null,
  capturedAt:item.shot_date||item.date_added||null,
  attribution:item.username?'© '+item.username+' · KartaView (CC BY-SA)':'KartaView (CC BY-SA)',
  provider:'KartaView'
 };
}

// Panoramax: STAC. El rumbo esta en view:azimuth y el orden dentro de la secuencia en
// geovisio:rank_in_collection. Cada foto trae su licencia y su autor.
function fromPanoramax(f){
 if(!f||!f.geometry||!Array.isArray(f.geometry.coordinates))return null;
 const lon=num(f.geometry.coordinates[0]),lat=num(f.geometry.coordinates[1]);
 if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;
 const a=f.assets||{},p=f.properties||{};
 const img=(a.sd&&a.sd.href)||(a.hd&&a.hd.href)||(a.thumb&&a.thumb.href);
 if(!img)return null;
 const h=num(p['view:azimuth']);
 const autor=p['geovisio:producer'];
 const lic=p.license;
 return {
  id:'px:'+String(f.id),
  lat,lon,
  heading:Number.isFinite(h)?h:null,
  imageUrl:img,
  thumbUrl:(a.thumb&&a.thumb.href)||null,
  sequenceId:f.collection?String(f.collection):null,
  index:Number.isFinite(num(p['geovisio:rank_in_collection']))?num(p['geovisio:rank_in_collection']):null,
  capturedAt:p.datetime||null,
  attribution:[autor?'© '+autor:null,'Panoramax',lic||null].filter(Boolean).join(' · '),
  provider:'Panoramax'
 };
}

// ---- textos ----
function metres(m){
 const v=num(m);
 if(!Number.isFinite(v)||v<0)return '';
 return v<1000?Math.round(v)+' m':(v/1000).toFixed(1).replace('.',',')+' km';
}
function year(iso){
 const t=String(iso||'').match(/^(\d{4})/);
 return t?t[1]:'';
}
// "KartaView · imagen a 14 m · 2025"
function caption(photo,point){
 if(!photo)return '';
 const partes=[photo.provider];
 const d=metres(distance(photo,point));
 if(d)partes.push('imagen a '+d);
 const a=year(photo.capturedAt);
 if(a)partes.push(a);
 return partes.join(' · ');
}
function status(kind,extra){
 switch(kind){
  case 'searching':return 'Buscando imágenes de calle…';
  case 'none':return 'Sin imágenes de calle en este tramo';
  case 'offline':return 'Vista de calle necesita conexión';
  case 'found':return extra||'';
  default:return '';
 }
}

// ---- caja de busqueda minima que se manda al proveedor ----
// Solo sale del dispositivo un cuadrado pequeño alrededor del punto. Ni el GPX, ni el
// nombre del archivo, ni las paradas, ni nada mas.
function bbox(point,metres){
 if(!point)return null;
 const lat=num(point.lat),lon=num(point.lon);
 if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;
 const m=Number.isFinite(metres)&&metres>0?metres:MAX_DIST;
 const dLat=m/111320,dLon=m/(111320*Math.cos(lat*Math.PI/180)||1);
 const r=n=>Number(n.toFixed(6));
 return [r(lon-dLon),r(lat-dLat),r(lon+dLon),r(lat+dLat)];
}

// ---- cache pequeña en memoria ----
function trim(map,max){
 const tope=Number.isFinite(max)?max:CACHE_MAX;
 if(!map||typeof map.size!=='number')return;
 while(map.size>tope){
  const primera=map.keys().next();
  if(primera.done)break;
  map.delete(primera.value);
 }
}

const api={distance,angleDiff,score,usable,pick,bestInSequence,leftSequence,neighbour,
           sortSequence,shouldRefresh,fromKartaView,fromPanoramax,metres,year,caption,
           status,bbox,trim,num,
           MAX_DIST,MAX_ANGLE,HEADING_WEIGHT,SEQUENCE_BONUS,MIN_MOVE,CACHE_MAX,KV_BASE};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RutasStreetImageryCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
