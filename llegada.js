/* Ronda terminada: al llegar al final, un resumen de lo hecho. navigation.js avisa con
   'rutas:arrived' y los datos de la navegacion; esto solo lo ensena. */
(()=>{
'use strict';
const L=window.RutasLlegadaCore;
if(!L)return;

const caja=document.createElement('dialog');
caja.className='llegada';
caja.setAttribute('aria-labelledby','llegada-titulo');
caja.innerHTML='<span class="llegada-icono" aria-hidden="true"></span><h2 id="llegada-titulo">Ronda terminada</h2>'+
 '<dl class="llegada-datos"></dl><p class="llegada-aviso" hidden></p>'+
 '<div class="llegada-acciones"><button type="button" class="btn" id="llegada-compartir">Compartir recorrido real</button>'+
 '<button type="button" class="btn" id="llegada-informe">Guardar informe CSV</button></div>'+
 '<button type="button" class="btn primary" id="llegada-cerrar">Cerrar</button>';
document.body.append(caja);
const datos=caja.querySelector('.llegada-datos'),aviso=caja.querySelector('.llegada-aviso'),
 compartir=caja.querySelector('#llegada-compartir'),informe=caja.querySelector('#llegada-informe');
let actual=null;

function pinta(r){
 caja.querySelector('#llegada-titulo').textContent=r.titulo;
 datos.replaceChildren();
 for(const [k,v] of r.filas){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=v;datos.append(dt,dd);}
 aviso.textContent=r.aviso;aviso.hidden=!r.aviso;
}
function cierra(){try{caja.close();}catch{caja.removeAttribute('open');}}

window.addEventListener('rutas:arrived',e=>{
 actual=e.detail||{};
 window.RutasViaje?.setArrival?.(actual);
 pinta(L.resumen(actual));
 const puede=(window.RutasViaje?.get?.().summary?.points||0)>1;
 compartir.disabled=informe.disabled=!puede;
 try{if(!caja.open)caja.showModal();}catch{caja.setAttribute('open','');}
});
compartir.onclick=()=>window.RutasViaje?.shareGpx?.();
informe.onclick=()=>window.RutasViaje?.report?.(actual);
caja.querySelector('#llegada-cerrar').onclick=cierra;
// Tocar fuera de la tarjeta tambien cierra: nadie deberia tener que buscar el boton.
// El propio <dialog> tambien recibe los toques en su margen interior: solo cierra lo de fuera.
caja.addEventListener('click',e=>{if(e.target!==caja)return;const r=caja.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)cierra();});

window.RutasLlegada={pinta,cierra};
})();
