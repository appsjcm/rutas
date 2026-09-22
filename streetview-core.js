(function(root){
'use strict';
// Ver la calle de verdad en Google, sin clave de API ni SDK: se construye un enlace y se
// abre fuera. Google documenta este formato como "Maps URLs" y dice expresamente que no
// hace falta clave. Aqui no se consulta nada a Google: no se puede saber si hay panoramica
// en un punto sin credenciales, asi que no se promete. Se abre la ubicacion y Google enseña
// lo que tenga.
// https://developers.google.com/maps/documentation/urls/get-started

const BASE='https://www.google.com/maps/@?api=1&map_action=pano';
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

const api={url,validPoint,numero,normaliseHeading,nextTurn,nextStop,ahead,walk,label,title,offlineNote,
           BASE,PRECISION,FOV,STEP};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RutasStreetView=api;
})(typeof globalThis!=='undefined'?globalThis:this);
