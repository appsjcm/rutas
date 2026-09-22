/* Vista real: abre en Google Maps el punto por el que va la simulación, el próximo giro o
   la próxima parada. Solo lee el estado que ya existe -RutasMap y el núcleo de navegación-;
   no toca el GPS falso, ni el progreso, ni nada del simulador. Sin clave de API ni SDK. */
(()=>{
'use strict';
const V=window.RutasStreetView,C=window.RutasNav;
const panel=document.getElementById('sim-panel');
if(!V||!C||!panel)return;          // solo dentro del simulador
const $=id=>document.getElementById(id);

const bloque=document.createElement('div');
bloque.id='sv-box';
bloque.innerHTML='<span class="sv-title">Vista real</span>'+
 '<div class="sv-buttons">'+
  '<button type="button" id="sv-now">📷 '+V.label('current')+'</button>'+
  '<button type="button" id="sv-turn">↱ '+V.label('turn')+'</button>'+
  '<button type="button" id="sv-stop">⏹ '+V.label('stop')+'</button>'+
  '<button type="button" id="sv-walk" class="sv-second">'+V.label('walk')+' →</button>'+
 '</div>'+
 '<p class="sv-note" id="sv-note"></p>';
panel.append(bloque);

let paseo=null;                    // por dónde va el paseo, aparte del progreso real

// ---- lecturas, todas de solo lectura ----
function estado(){return window.RutasMap?window.RutasMap.get():null;}
function recorrido(){const s=estado();return s&&s.route&&s.route.pts&&s.route.pts.length>1?s.route:null;}
function avance(){const s=estado();return s&&Number.isFinite(s.progress)?s.progress:0;}

// Dónde está el vehículo: la posición real si se está navegando, y si no el punto del
// recorrido por el que va el control.
function aqui(){
 const s=estado();
 if(s&&s.active&&s.location)return {lat:s.location.lat,lon:s.location.lng};
 const r=recorrido();
 return r?C.at(r,avance()):null;
}
// Hacia dónde se circula en ese punto del recorrido, sacado del propio GPX.
function rumboEn(d){
 const r=recorrido();
 if(!r)return null;
 const a=C.at(r,Math.max(0,Math.min(r.total,d)));
 const b=C.at(r,Math.max(0,Math.min(r.total,d+15)));
 return C.distance(a,b)<1?null:C.heading(a,b);
}
function giros(){const r=recorrido();return r?C.turns(r,{minSpeed:0}):[];}
function paradas(){const r=recorrido();try{return recorrido()?C.stops(r):[];}catch{return [];}}

// ---- abrir ----
function abrir(point,heading,boton){
 const u=V.url(point,heading);
 if(!u){nota('No hay un punto válido para abrir.');return;}
 // noopener para que la pestaña de Google no tenga acceso a esta.
 const w=window.open(u,'_blank','noopener,noreferrer');
 if(!w)nota('El navegador ha bloqueado la ventana. Permite las ventanas emergentes para este sitio.');
 else nota('Abierto en Google Maps. Solo se ha compartido ese punto.');
 if(boton)boton.blur();
}
function nota(texto){$('sv-note').textContent=texto;}

// ---- estado de los botones ----
function pinta(){
 const online=navigator.onLine!==false;
 const r=recorrido(), d=avance();
 const g=V.nextTurn(giros(),d), p=V.nextStop(paradas(),d);
 const siguiente=r?V.walk(paseo===null?d:paseo,r.total):null;

 const poner=(id,activo,titulo)=>{
  const b=$(id);if(!b)return;
  b.disabled=!activo;
  b.title=activo?titulo:'';
  b.setAttribute('aria-disabled',String(!activo));
 };
 poner('sv-now',online&&!!aqui(),V.title('current'));
 poner('sv-turn',online&&!!g,g?V.title('turn',(g.toRoad||g.label||'')):'');
 poner('sv-stop',online&&!!p,V.title('stop'));
 poner('sv-walk',online&&siguiente!==null,V.title('walk'));

 if(!online){nota(V.offlineNote(false));return;}
 if(!r){nota('Carga un GPX para poder abrir la calle real.');return;}
 const faltan=[];
 if(!g)faltan.push('giro');
 if(!p)faltan.push('parada');
 nota('Al abrir Google Maps se comparte únicamente ese punto.'+
      (faltan.length?' No queda '+faltan.join(' ni ')+' por delante.':''));
}

// ---- acciones ----
$('sv-now').onclick=e=>{const p=aqui();abrir(p,rumboEn(avance()),e.currentTarget);};
$('sv-turn').onclick=e=>{
 const g=V.nextTurn(giros(),avance());const r=recorrido();
 if(!g||!r)return;
 abrir(C.at(r,g.d),rumboEn(g.d),e.currentTarget);
};
$('sv-stop').onclick=e=>{
 const p=V.nextStop(paradas(),avance());const r=recorrido();
 if(!p||!r)return;
 abrir(p.p||C.at(r,p.d),rumboEn(p.d),e.currentTarget);
};
$('sv-walk').onclick=e=>{
 const r=recorrido();if(!r)return;
 const d=V.walk(paseo===null?avance():paseo,r.total);
 if(d===null)return;
 paseo=d;
 abrir(C.at(r,d),rumboEn(d),e.currentTarget);
 pinta();
};

// El paseo vuelve a empezar donde esté el vehículo cuando cambia la ruta o se rearranca.
window.addEventListener('rutas:route',()=>{paseo=null;pinta();});
window.addEventListener('rutas:check-route',()=>{paseo=null;pinta();});
window.addEventListener('rutas:progress',pinta);
window.addEventListener('online',pinta);
window.addEventListener('offline',pinta);
pinta();

window.RutasStreetViewUI={refresh:pinta,walkAt:()=>paseo,reset(){paseo=null;pinta();}};
})();
