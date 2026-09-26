/* La voz de las indicaciones. El navegador no elige voz y el movil usaba la basica aunque tuviera
   descargada una mejorada o premium. Aqui se elige la mejor en castellano (hud-core.js,
   bestVoice) y, en "Ruta y ajustes", se puede escoger otra y probarla. Toda frase que diga la
   aplicacion -indicaciones, tramos sin pasar, marcas- sale con esa voz, la diga quien la diga. */
(()=>{
'use strict';
const H=window.RutasHudCore,S=window.speechSynthesis;
if(!H||!H.bestVoice||!S||!window.SpeechSynthesisUtterance)return;
const CLAVE='rutas-voz';
let preferida=null;
try{preferida=localStorage.getItem(CLAVE);}catch{}
const voces=()=>{try{return S.getVoices()||[];}catch{return [];}};
const elegida=()=>H.bestVoice(voces(),preferida);

// Cada frase se crea en su modulo con el idioma puesto; aqui se le pone la voz al decirla.
const decir=S.speak.bind(S);
S.speak=u=>{
 try{if(u&&!u.voice){const v=elegida();if(v){u.voice=v;u.lang=v.lang;}}}catch{}
 return decir(u);
};

// ---- el selector, debajo de "Avisos por voz" ----
const interruptor=document.getElementById('nav-voice'),linea=interruptor&&interruptor.closest('label');
if(!linea)return;
const caja=document.createElement('div');
caja.className='voz-elegir';caja.hidden=true;
caja.innerHTML='<label for="voz-lista">Voz</label><select id="voz-lista"></select>'+
 '<button type="button" class="btn sm" id="voz-probar">Probar</button>';
const lista=caja.querySelector('select'),probar=caja.querySelector('#voz-probar');
// premium.js lleva el interruptor a su propia fila dentro de "Ruta y ajustes", y puede hacerlo
// despues de que se cargue esto: el selector va siempre tras la fila donde este el interruptor.
function coloca(){
 const fila=interruptor.closest('.route-setting-line')||interruptor.closest('label');
 if(fila&&caja.previousElementSibling!==fila)fila.after(caja);
}

function pinta(){
 coloca();
 const todas=voces(),es=H.spanishVoices(todas),mejor=H.bestVoice(todas,null);
 lista.replaceChildren();
 const auto=document.createElement('option');
 auto.value='';auto.textContent='Automática'+(mejor?' · '+mejor.name:'');
 lista.append(auto);
 for(const v of es){
  const o=document.createElement('option');
  o.value=v.voiceURI;
  o.textContent=v.name+(v.lang.replace('_','-').toLowerCase()==='es-es'?'':' · '+v.lang)+(v.localService?'':' · necesita conexión');
  lista.append(o);
 }
 lista.value=preferida&&es.some(v=>v.voiceURI===preferida)?preferida:'';
 // Sin voces en castellano no hay nada que elegir: el selector no se enseña.
 caja.hidden=!es.length;
}
lista.onchange=()=>{
 preferida=lista.value||null;
 try{preferida?localStorage.setItem(CLAVE,preferida):localStorage.removeItem(CLAVE);}catch{}
 probar.click();
};
probar.onclick=()=>{
 try{S.cancel();const u=new SpeechSynthesisUtterance('En doscientos metros, gira a la derecha.');u.lang='es-ES';S.speak(u);}catch{}
};
pinta();
// Chrome y Safari cargan la lista de voces un poco despues.
if(S.addEventListener)S.addEventListener('voiceschanged',pinta);
setTimeout(pinta,1500);
addEventListener('load',pinta);
// Y al abrir la hoja, por si se construyo mas tarde.
new MutationObserver(()=>{if(document.body.classList.contains('route-settings-open'))coloca();}).observe(document.body,{attributes:true,attributeFilter:['class']});
window.RutasVoz={elegida,pinta};
})();
