/* Modo de bajo consumo mientras se conduce. Decide poco y a destiempo largo:
   solo se reevalúa al cambiar la batería, al arrancar o parar el GPS, y una vez por minuto. */
(()=>{
'use strict';
const P=window.RutasPowerCore;
if(!P)return;
const $=id=>document.getElementById(id);

let bateria=null,desde=0,navegando=false,ultima=null,reloj=null,avisado='';

const menosMovimiento=()=>{
 try{return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch{return false;}
};

function estado(){
 return {level:bateria?bateria.level:null,
         charging:bateria?bateria.charging:undefined,
         navigating:navegando,
         elapsed:navegando&&desde?Date.now()-desde:0,
         reducedMotion:menosMovimiento()};
}

function avisar(texto){
 if(!texto||texto===avisado)return;
 avisado=texto;
 const caja=$('nav-message');
 if(caja)caja.textContent=texto;
}

function aplicar(forzar){
 const d=P.decide(estado());
 if(!forzar&&!P.changed(ultima,d)){ultima=d;return d;}
 ultima=d;
 document.body.classList.toggle('low-power',!d.animations);
 document.body.classList.toggle('low-power-critical',d.level==='critical');
 // Volver a 2D una sola vez por cambio de estado: si el conductor reactiva el 3D, se respeta.
 if(!d.heavy&&window.Rutas3D&&window.Rutas3D.get().active){const b=$('map-2d');if(b)b.click();}
 if(d.reasons.length)avisar(P.message(d));else avisado='';
 window.dispatchEvent(new CustomEvent('rutas:power',{detail:d}));
 return d;
}

function tic(){if(!document.hidden)aplicar(false);}
function vigilar(){if(reloj)return;reloj=setInterval(tic,60000);}
function soltar(){clearInterval(reloj);reloj=null;}

// ---- de donde salen los datos ----
if(navigator.getBattery)navigator.getBattery().then(b=>{
 bateria=b;
 for(const ev of ['levelchange','chargingchange'])b.addEventListener(ev,()=>aplicar(false));
 aplicar(false);
}).catch(()=>{});

document.addEventListener('click',e=>{
 const t=e.target;
 if(!t||typeof t.closest!=='function')return;
 if(t.closest('#nav-start')){navegando=true;desde=Date.now();vigilar();setTimeout(()=>aplicar(false),0);}
 else if(t.closest('#nav-stop')||t.closest('#nav-focus-stop')){navegando=false;desde=0;soltar();setTimeout(()=>aplicar(true),0);}
},true);

document.addEventListener('visibilitychange',()=>{if(!document.hidden)aplicar(false);});
try{matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>aplicar(false));}catch{}

aplicar(true);
window.RutasPower={state:()=>ultima,check:()=>aplicar(false),
 // Para poder probar sin descargar un teléfono de verdad.
 simulate(b){bateria=b;return aplicar(false);},
 driving(on,since){navegando=!!on;desde=since||Date.now();return aplicar(false);}};
})();
