/* Diagnostico, en la Guia: lo que hace falta saber del movil cuando algo falla y no se esta
   delante. Se rellena al abrirlo y se puede copiar para mandarlo. Nada de la ruta ni de la
   posicion. */
(()=>{
'use strict';
const D=window.RutasDiagnosticoCore;
const version=document.getElementById('app-version');
if(!D||!version)return;

const caja=document.createElement('details');
caja.className='diagnostico';
caja.innerHTML='<summary>Diagnóstico</summary><p class="diag-nota">Si algo falla, copia esto y mándalo. No incluye nada de tu ruta ni de tu posición.</p>'+
 '<dl class="diag-datos"></dl><ol class="diag-errores"></ol><button type="button" class="btn sm" id="diag-copiar">Copiar diagnóstico</button><span class="diag-copiado" role="status"></span>';
version.after(caja);
const datos=caja.querySelector('.diag-datos'),lista=caja.querySelector('.diag-errores'),copiar=caja.querySelector('#diag-copiar'),aviso=caja.querySelector('.diag-copiado');
let ultimo=null;

async function reune(){
 const d={ua:navigator.userAgent,enLinea:navigator.onLine};
 const v=version.querySelector('b');d.version=v?v.textContent.trim():'';
 try{d.instalada=(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;}catch{}
 try{if(navigator.storage&&navigator.storage.estimate){const e=await navigator.storage.estimate();d.usado=e.usage;}}catch{}
 try{if(navigator.storage&&navigator.storage.persisted)d.persistente=await navigator.storage.persisted();}catch{}
 try{d.pantalla=window.RutasMap&&window.RutasMap.screenLock?window.RutasMap.screenLock():'idle';}catch{}
 try{const H=window.RutasHudCore,vs=window.speechSynthesis?speechSynthesis.getVoices():[];if(H&&H.spanishVoices){d.voces=H.spanishVoices(vs).length;const e=window.RutasVoz&&window.RutasVoz.elegida();d.voz=e?e.name:'';}}catch{}
 try{if(navigator.permissions&&navigator.permissions.query)d.gps=(await navigator.permissions.query({name:'geolocation'})).state;}catch{}
 d.errores=(window.__rutasErrores||[]).slice(-8);
 return d;
}
async function pinta(){
 const d=await reune();ultimo=d;
 datos.replaceChildren();
 for(const [k,v] of D.filas(d)){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=v;datos.append(dt,dd);}
 lista.replaceChildren();
 for(const e of d.errores){const li=document.createElement('li');li.textContent=D.errorTexto(e);lista.append(li);}
 lista.hidden=!d.errores.length;
}
caja.addEventListener('toggle',()=>{if(caja.open)pinta();});
copiar.onclick=async()=>{
 const d=ultimo||await reune(),t=D.texto(d);
 let ok=false;
 try{if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(t);ok=true;}}catch{}
 if(!ok){
  // Sin portapapeles (algunos navegadores lo niegan): se selecciona el texto para copiarlo a mano.
  const area=document.createElement('textarea');area.value=t;area.setAttribute('readonly','');area.style.cssText='position:fixed;opacity:0;left:0;top:0';
  document.body.append(area);area.select();try{ok=document.execCommand('copy');}catch{}area.remove();
 }
 aviso.textContent=ok?'Copiado.':'No se pudo copiar: haz una captura de pantalla.';
 setTimeout(()=>{aviso.textContent='';},4000);
};
window.RutasDiagnostico={reune,texto:async()=>D.texto(await reune())};
})();
