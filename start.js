/* Elegir dónde empezar la ronda, desde la pantalla principal. Tres formas: desde el
   inicio, desde donde estás, o tocando el recorrido en el mapa. Lo unico que hace es mover
   el cursor de la vista previa; quien arranca sigue siendo «Iniciar navegación». */
(()=>{
'use strict';
const S=window.RutasStartCore,N=window.RutasNav;
if(!S||!N)return;
const $=id=>document.getElementById(id);

const caja=document.createElement('section');
caja.id='inicio-caja';
caja.innerHTML='<span class="inicio-titulo">Empezar en</span>'+
 '<div class="inicio-opciones" role="group" aria-label="Dónde empezar el recorrido">'+
  '<button type="button" id="inicio-cero">El inicio</button>'+
  '<button type="button" id="inicio-aqui">Donde estoy</button>'+
  '<button type="button" id="inicio-mapa">Tocar el mapa</button>'+
 '</div>'+
 '<p class="inicio-estado" id="inicio-estado" role="status"></p>'+
 '<div class="inicio-pasadas" id="inicio-pasadas"></div>';

function coloca(){
 const fila=$('nav-start')&&$('nav-start').closest('.btnrow');
 if(!fila)return false;
 if(caja.previousElementSibling!==fila)fila.after(caja);
 return true;
}

function mapa(){const s=window.RutasMap&&window.RutasMap.get();return s&&s.map?s:null;}
function di(texto,tono){
 const e=$('inicio-estado');
 if(!e)return;
 e.textContent=texto||'';
 if(tono)e.dataset.tono=tono;else e.removeAttribute('data-tono');
}

// Solo mueve el cursor: arrancar lo sigue haciendo «Iniciar navegación», que es donde la
// gente espera que se arranque.
function elige(d,comoSeLlego){
 const s=mapa();
 if(!s||!s.route)return;
 try{window.RutasMap.seek(d);}catch(e){return;}
 const aviso=S.warning(d,s.route.total);
 di(S.describe(d,s.route.total)+(aviso?' '+aviso:''),S.atStart(d)?'':'medio');
 if(comoSeLlego==='mapa'||comoSeLlego==='gps'){
  const escenario=$('nav-stage');
  if(escenario)escenario.scrollIntoView({block:'center',behavior:'smooth'});
 }
}

function limpiaPasadas(){const e=$('inicio-pasadas');if(e)e.replaceChildren();}

// Una ronda de recogida pasa dos veces por la misma calle: quedarse con la mas cercana en
// linea recta acierta la mitad de las veces. Si hay varias, se pregunta.
function resuelve(punto,comoSeLlego,precision){
 const s=mapa();
 if(!s||!s.route)return;
 limpiaPasadas();
 const pasadas=N.nearbyPasses(s.route,punto);
 if(!pasadas.length){di(S.noneText(),'mal');return;}
 if(Number.isFinite(precision)){
  const v=S.usable(pasadas[0],{accuracy:precision});
  if(!v.ok){di(v.motivo,'mal');return;}
 }
 if(!S.needsChoice(pasadas)){elige(pasadas[0].d,comoSeLlego);return;}
 di(S.askText(pasadas));
 const caja2=$('inicio-pasadas');
 for(const c of S.choices(pasadas,s.route.total)){
  const b=document.createElement('button');
  b.type='button';b.textContent=c.label;b.title=c.title;
  b.onclick=()=>{limpiaPasadas();elige(c.d,comoSeLlego);};
  caja2.append(b);
 }
}

function navegando(){const s=mapa();return !!(s&&s.active);}
function bloqueado(){
 if(!navegando())return false;
 di('Detén el GPS para elegir otro punto de inicio.','mal');
 return true;
}

// ---- desde el inicio ----
caja.querySelector('#inicio-cero').onclick=()=>{
 if(bloqueado())return;
 limpiaPasadas();
 elige(0,'boton');
};

// ---- desde donde estoy ----
caja.querySelector('#inicio-aqui').onclick=()=>{
 if(bloqueado())return;
 const s=mapa();
 if(!s||!s.route){di('Carga un recorrido primero.','mal');return;}
 if(!navigator.geolocation){di('Este navegador no permite acceder al GPS.','mal');return;}
 const boton=$('inicio-aqui');
 boton.disabled=true;di('Buscando tu posición…');
 navigator.geolocation.getCurrentPosition(pos=>{
  boton.disabled=false;
  const actual=mapa();
  if(!actual||!actual.route)return;
  const c=pos.coords;
  resuelve({lat:c.latitude,lon:c.longitude},'gps',c.accuracy);
 },err=>{
  boton.disabled=false;
  di(err&&err.code===1?'Permiso de ubicación denegado. Actívalo en los ajustes del navegador.'
    :'No se pudo obtener tu posición. Elige el punto en el mapa.','mal');
 },{enableHighAccuracy:true,maximumAge:0,timeout:20000});
};

// ---- tocando el recorrido ----
let eligiendo=false,mapaClic=null;
function cancela(nota){
 if(mapaClic)mapaClic.off('click',toca);
 mapaClic=null;eligiendo=false;
 // cancela() puede llegar por un evento antes de que la caja este en la pagina.
 const b=$('inicio-mapa');
 if(b){b.textContent='Tocar el mapa';b.setAttribute('aria-pressed','false');}
 const escenario=$('nav-stage');
 if(escenario)escenario.classList.remove('inicio-eligiendo');
 if(nota)di(nota);
}
function toca(e){
 const s=mapa();
 if(!s||!s.route){cancela();return;}
 cancela();
 resuelve({lat:e.latlng.lat,lon:e.latlng.lng},'mapa');
}
caja.querySelector('#inicio-mapa').onclick=()=>{
 if(bloqueado())return;
 if(eligiendo){cancela('Selección cancelada.');return;}
 const s=mapa();
 if(!s||!s.route){di('Carga un recorrido primero.','mal');return;}
 // El toque y la línea solo coinciden en el mapa plano.
 const tres=$('map-3d');
 if(tres&&tres.getAttribute('aria-pressed')==='true'){const dos=$('map-2d');if(dos)dos.click();}
 eligiendo=true;mapaClic=s.map;mapaClic.on('click',toca);
 const b=$('inicio-mapa');
 b.textContent='Toca el recorrido';b.setAttribute('aria-pressed','true');
 const escenario=$('nav-stage');
 if(escenario)escenario.classList.add('inicio-eligiendo');
 di('Toca cualquier punto de la línea para empezar ahí.');
};

window.addEventListener('keydown',e=>{if(e.key==='Escape'&&eligiendo)cancela('Selección cancelada.');});
window.addEventListener('rutas:route',()=>{cancela();di('');limpiaPasadas();});
window.addEventListener('rutas:check-route',()=>{cancela();di('');limpiaPasadas();});
window.addEventListener('rutas:visible',()=>{coloca();});

function arranca(){
 if(!coloca())return false;
 const s=mapa();
 if(s&&s.route&&Number.isFinite(s.progress)&&s.progress>S.CERCA)
  di(S.describe(s.progress,s.route.total)+' '+S.warning(s.progress,s.route.total),'medio');
 return true;
}
(function intenta(n){ if(arranca()||n>20)return; setTimeout(()=>intenta(n+1),150); })(0);
addEventListener('load',()=>{coloca();});

window.RutasStart={choose:elige,at:()=>{const s=mapa();return s?s.progress:null;}};
})();
