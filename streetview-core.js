(function(root){
'use strict';
// Ver la calle de verdad en Google, sin clave de API ni SDK: se construye un enlace y se
// abre fuera. Google documenta este formato como "Maps URLs" y dice expresamente que no
// hace falta clave. Aqui no se consulta nada a Google: no se puede saber si hay panoramica
// en un punto sin credenciales, asi que no se promete. Se abre la ubicacion y Google enseña
// lo que tenga.
// https://developers.google.com/maps/documentation/urls/get-started

const BASE='https://www.google.com/maps/@?api=1&map_action=pano';
const EMBED='https://maps.google.com/maps';
const PRECISION=6;          // ~0,1 m: de sobra, y no manda mas detalle del necesario
const FOV=90;               // el que Google usa por defecto

// Number(null) y Number('') son 0, asi que un punto vacio pasaria por las coordenadas 0,0
// -en mitad del Atlantico- en vez de no hacer nada. Se exige un numero de verdad.
function numero(v){
 if(v===null||v===undefined||v==='')return NaN;
 const n=Number(v);
 return Number.isFinite(n)?n:NaN;
}
function validPoint(p){
 if(!p)return false;
 const lat=numero(p.lat),lon=numero(p.lon);
 return Number.isFinite(lat)&&Math.abs(lat)<=90&&Number.isFinite(lon)&&Math.abs(lon)<=180;
}

// Google acepta de -180 a 360; se normaliza a 0-360 y entero, que es lo que hace falta.
function normaliseHeading(h){
 // Sin rumbo, poner 0 seria apuntar al norte y llamarlo dato.
 const v=numero(h);
 if(!Number.isFinite(v))return null;
 return Math.round(((v%360)+360)%360);
}

// Solo viajan a Google las dos coordenadas del punto elegido y, si se sabe, hacia donde
// mira. Ni el GPX, ni las horas, ni el resto del recorrido.
function url(point,heading){
 if(!validPoint(point))return null;
 const lat=Number(point.lat).toFixed(PRECISION),lon=Number(point.lon).toFixed(PRECISION);
 let out=BASE+'&viewpoint='+lat+','+lon;
 const h=normaliseHeading(heading);
 if(h!==null)out+='&heading='+h+'&pitch=0&fov='+FOV;
 return out;
}

// Vista incrustada sin clave que Google redirige a su reproductor /maps/embed.
// Conservamos el enlace normal como alternativa visible por compatibilidad.
function embedUrl(point,heading){
 if(!validPoint(point))return null;
 const lat=Number(point.lat).toFixed(PRECISION),lon=Number(point.lon).toFixed(PRECISION);
 const h=normaliseHeading(heading);
 return EMBED+'?layer=c&cbll='+lat+','+lon+'&cbp=11,'+(h===null?0:h)+',0,0,0&source=embed&output=svembed';
}

// Ajusta el toque del usuario al punto más cercano de la línea GPX. Así no hace falta
// acertar exactamente con un trazo de pocos píxeles en la pantalla del móvil.
function routePosition(route,point){
 if(!route||!Array.isArray(route.pts)||route.pts.length<2||!route.cum||!validPoint(point))return null;
 const rad=Math.PI/180,kx=111320*Math.cos(Number(point.lat)*rad),ky=110540;
 let best=null;
 for(let i=0;i<route.pts.length-1;i++){
  const a=route.pts[i],b=route.pts[i+1];
  const x=(a.lon-point.lon)*kx,y=(a.lat-point.lat)*ky;
  const dx=(b.lon-a.lon)*kx,dy=(b.lat-a.lat)*ky;
  const t=Math.max(0,Math.min(1,-(x*dx+y*dy)/(dx*dx+dy*dy||1)));
  const error=Math.hypot(x+t*dx,y+t*dy);
  if(!best||error<best.error)best={d:route.cum[i]+(route.cum[i+1]-route.cum[i])*t,error,
   point:{lat:a.lat+(b.lat-a.lat)*t,lon:a.lon+(b.lon-a.lon)*t},segment:i};
 }
 return best;
}

function ahead(list,progress,key){
 const d=Number(progress)||0;
 const campo=key||'d';
 let mejor=null;
 for(const x of Array.isArray(list)?list:[]){
  if(!x||!Number.isFinite(x[campo])||x[campo]<=d)continue;
  if(!mejor||x[campo]<mejor[campo])mejor=x;
 }
 return mejor;
}
function nextTurn(turns,progress){return ahead(turns,progress);}
function nextStop(stops,progress){return ahead(stops,progress);}

// Paseo: cada pulsacion adelanta un tramo. Nunca se abre nada solo.
const STEP=150;
function walk(from,total,step){
 const t=Number(total);
 if(!Number.isFinite(t)||t<=0)return null;
 const paso=Number.isFinite(step)&&step>0?step:STEP;
 const d=(Number(from)||0)+paso;
 return d>=t?null:d;      // al final del recorrido ya no hay siguiente vista
}

// Texto honesto: no se sabe si hay panoramica, asi que no se dice que la haya.
function label(kind){
 return {current:'Calle actual',turn:'Próximo giro',stop:'Próxima parada',walk:'Siguiente vista'}[kind]||'Ver calle real';
}
function title(kind,extra){
 const base='Abrir esta ubicación en Google Maps / Street View';
 return extra?base+' · '+extra:base;
}
function offlineNote(online){
 return online===false?'Street View necesita conexión.':'';
}

const api={url,embedUrl,validPoint,numero,normaliseHeading,routePosition,nextTurn,nextStop,ahead,walk,label,title,offlineNote,
           BASE,EMBED,PRECISION,FOV,STEP};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RutasStreetView=api;
})(typeof globalThis!=='undefined'?globalThis:this);
