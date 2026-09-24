/* El simulador solo existia con ?sim en la direccion, y desde el icono del movil no hay
   forma de escribir eso: la aplicacion instalada abre siempre la misma direccion. El
   interruptor vive en Ruta y ajustes, un sitio al que hay que ir a proposito -no se toca
   conduciendo- y desde el que se vuelve.
   La eleccion se recuerda, asi que una vez encendido queda Simular junto a Iniciar
   navegacion en cada apertura y se elige una cosa u otra sin pasar por aqui. Recordado no
   es en marcha: la posicion inventada solo empieza al pulsar Simular.
   Este modulo se carga siempre; el simulador no, hasta que alguien lo enciende. */
(()=>{
'use strict';
const PARAM='sim';
const CLAVE='rutas-modo-simulacion';     // el mismo que usa sim-core.js

function guardado(){try{return localStorage.getItem(CLAVE);}catch(e){return null;}}
function encendido(){
 const S=window.RutasSimCore;
 if(S&&S.simAvailable)return S.simAvailable(location.search,guardado());
 return new URLSearchParams(location.search).has(PARAM)||guardado()==='1';
}

// La eleccion se recuerda, asi que no hay que volver a entrar aqui cada vez. La direccion
// se deja limpia: manda lo guardado, y ?sim sigue valiendo para una vez suelta.
function direccionCon(valor){
 const u=new URL(location.href);
 u.searchParams.delete(PARAM);
 if(valor)u.searchParams.set(PARAM,'1');
 return u.toString();
}

function monta(){
 const cuerpo=document.querySelector('.route-settings-body');
 if(!cuerpo||document.getElementById('sim-mode'))return false;

 const linea=document.createElement('div');
 linea.className='route-setting-line sim-mode-line';

 const etiqueta=document.createElement('label');
 etiqueta.className='switch';
 const casilla=document.createElement('input');
 casilla.type='checkbox';casilla.id='sim-mode';casilla.checked=encendido();
 const texto=document.createElement('span');
 texto.textContent='Modo simulación';
 etiqueta.append(casilla,texto);

 // Sin esto el interruptor no dice lo que hace, y lo que hace es serio.
 const aviso=document.createElement('p');
 aviso.className='hint';
 aviso.textContent='Deja siempre a mano Simular junto a Iniciar navegación, para elegir '+
  'entre recorrer el GPX con una posición inventada o salir con el GPS de verdad. También '+
  'añade las marchas de avance y la vista de calle con fotos. La simulación no arranca sola: '+
  'solo al pulsar Simular, y mientras corre hay una franja roja avisando. Se queda encendido '+
  'hasta que lo apagues aquí mismo.';

 linea.append(etiqueta,aviso);
 cuerpo.append(linea);

 casilla.addEventListener('change',()=>{
  // Recargar es lo unico honesto: el simulador sustituye la geolocalizacion al arrancar,
  // y encenderlo o apagarlo a medias dejaria la pagina en un estado que no es ninguno
  // de los dos.
  try{localStorage.setItem(CLAVE,casilla.checked?'1':'0');}catch(e){}
  // Manda lo guardado, asi que la direccion se queda limpia. Si ya lo estaba, recargar.
  const destino=direccionCon(false);
  if(destino===location.href)location.reload();else location.href=destino;
 });
 return true;
}

// cleanNavigation, que es quien crea Ruta y ajustes, corre en el evento load. Este modulo
// se carga despues que premium.js, asi que su load llega detras; aun asi se reintenta un
// poco, porque depender del orden exacto de dos manejadores es fragil.
function intenta(n){
 if(monta()||n>20)return;
 setTimeout(()=>intenta(n+1),150);
}
addEventListener('load',()=>intenta(0));
if(document.readyState==='complete')intenta(0);

window.RutasSimMode={on:encendido,url:direccionCon,key:CLAVE};
})();
