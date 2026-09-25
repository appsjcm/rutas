(function(root){
'use strict';
// Empezar la ronda donde uno quiera. La maquinaria ya existia -el deslizador de explorar,
// "Buscar mi pasada"- pero vivia dentro de Ruta y ajustes y desde la pantalla principal no
// se veia. Aqui viven las reglas y los textos, sin DOM, para poder probarlos.

const MAX_ERROR=60;      // mas lejos del trazado que esto, el punto no es de la ruta
const MAX_PRECISION=40;  // con peor precision que esta no se distingue una calle de otra
const CERCA=30;          // a menos de esto del principio, es el principio

function num(v){
 if(v===null||v===undefined||v==='')return NaN;
 const n=Number(v);
 return Number.isFinite(n)?n:NaN;
}
function texto(m){
 const v=num(m);
 if(!Number.isFinite(v))return '—';
 const r=Math.round(v);
 return r>=1000?(r/1000).toFixed(1).replace('.',',')+' km':r+' m';
}

// Si la posicion sirve para elegir un punto de la ruta, y si no, por que. Decirlo importa:
// "no se pudo" sin motivo deja al conductor sin saber si esperar o hacer otra cosa.
function usable(hit,opts){
 const o=opts||{};
 const maxError=Number.isFinite(num(o.maxError))?num(o.maxError):MAX_ERROR;
 const maxPrec=Number.isFinite(num(o.maxAccuracy))?num(o.maxAccuracy):MAX_PRECISION;
 const prec=num(o.accuracy);
 if(Number.isFinite(prec)&&prec>maxPrec)
  return {ok:false,motivo:'La precisión del GPS es de '+texto(prec)+'. Espera a tener mejor señal o elige el punto en el mapa.'};
 if(!hit||!Number.isFinite(num(hit.d)))
  return {ok:false,motivo:'No se pudo situar ese punto en el recorrido.'};
 const err=num(hit.error);
 if(Number.isFinite(err)&&err>maxError)
  return {ok:false,motivo:'Estás a '+texto(err)+' del recorrido. Acércate o elige el punto en el mapa.'};
 return {ok:true,motivo:''};
}

// "Empezarás en 3,4 km de 26,0 km". Con el total delante se sabe si es media ronda o el
// final, que es lo que se quiere comprobar antes de salir.
function describe(d,total){
 const v=num(d),t=num(total);
 if(!Number.isFinite(v))return '';
 if(!Number.isFinite(t)||t<=0)return 'Empezarás en '+texto(v)+'.';
 if(v<=CERCA)return 'Empezarás desde el inicio del recorrido.';
 if(t-v<=CERCA)return 'Ese punto es el final del recorrido. Elige otro si quieres recorrerlo.';
 return 'Empezarás en '+texto(v)+' de '+texto(t)+'.';
}

// Al inicio no hace falta avisar de nada; a media ronda si, porque lo de antes queda sin
// recorrer y el registro de tramos lo va a decir.
function warning(d,total){
 const v=num(d),t=num(total);
 if(!Number.isFinite(v)||v<=CERCA)return '';
 if(Number.isFinite(t)&&t-v<=CERCA)return '';
 return 'Lo anterior a ese punto quedará sin recorrer.';
}

function atStart(d){const v=num(d);return Number.isFinite(v)&&v<=CERCA;}

// Una ronda de recogida pasa dos veces por la misma calle, asi que un toque en el mapa
// puede caer entre dos pasadas. Quedarse con la mas cercana en linea recta acierta la
// mitad de las veces: hay que preguntar. nav-core.nearbyPasses da las candidatas.
function needsChoice(passes){
 return (Array.isArray(passes)?passes:[]).length>1;
}
// "Pasada 2 · 530 m": el numero dice cual del recorrido, y los metros donde cae.
function choices(passes,total){
 const l=(Array.isArray(passes)?passes:[]).filter(p=>p&&Number.isFinite(num(p.d)));
 return l.map((p,i)=>({
  d:num(p.d),
  label:'Pasada '+(i+1)+' · '+texto(num(p.d)),
  title:describe(num(p.d),total)
 }));
}
function askText(passes){
 const n=(Array.isArray(passes)?passes:[]).length;
 if(n<2)return '';
 return 'Ahí el recorrido pasa '+n+' veces. Elige por cuál vas.';
}
function noneText(){
 return 'No hay ninguna pasada a menos de 60 m de ese punto. Prueba en otro sitio del trazado.';
}

const api={usable,describe,warning,atStart,texto,num,
           needsChoice,choices,askText,noneText,
           MAX_ERROR,MAX_PRECISION,CERCA};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RutasStartCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
