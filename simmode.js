/* El simulador solo existe con ?sim en la direccion, y desde el icono del movil no hay
   forma de escribir eso: la aplicacion instalada abre siempre la misma direccion. Esto
   pone el interruptor dentro de Ruta y ajustes, que es un sitio al que hay que ir a
   proposito -no se toca conduciendo- y desde el que se puede volver.
   Se carga siempre; el simulador sigue sin cargarse hasta que alguien lo enciende. */
(()=>{
'use strict';
const PARAM='sim';

function encendido(){return new URLSearchParams(location.search).has(PARAM);}

function direccionCon(valor){
 const u=new URL(location.href);
 if(valor)u.searchParams.set(PARAM,'1');else u.searchParams.delete(PARAM);
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
 aviso.textContent='Recorre el GPX con una posición inventada, sin conducir: añade Simular '+
  'junto a Iniciar navegación, las marchas de avance y la vista de calle con fotos. '+
  'Sustituye el GPS, así que no debe usarse al volante. Se apaga desde aquí mismo.';

 linea.append(etiqueta,aviso);
 cuerpo.append(linea);

 casilla.addEventListener('change',()=>{
  // Recargar es lo unico honesto: el simulador sustituye la geolocalizacion al arrancar,
  // y encenderlo o apagarlo a medias dejaria la pagina en un estado que no es ninguno
  // de los dos.
  location.href=direccionCon(casilla.checked);
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

window.RutasSimMode={on:encendido,url:direccionCon};
})();
