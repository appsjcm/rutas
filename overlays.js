/* Un solo sitio decide qué aviso se ve sobre el mapa y dónde. Cada módulo enseña u oculta
   el suyo como siempre; aquí se deja pasar el más urgente y se apartan los demás. */
(()=>{
'use strict';
const O=window.RutasOverlayCore,stage=document.getElementById('nav-stage');
if(!O||!stage)return;
const $=id=>document.getElementById(id);

const AVISOS=O.ORDER.slice();
// Mandos que no conviene tapar: si el aviso llegase a ellos, sube.
const MANDOS=['drive-tools','drive-speedo','nav-repeat','drive-speed-limit'];

function pedido(e){return !!(e&&!e.hidden);}           // lo que su módulo quiere enseñar
function medible(e){return !!(e&&e.offsetParent);}

let aplicando=false,firma='';
function repartir(){
 if(aplicando)return;
 aplicando=true;
 try{colocar();}finally{aplicando=false;}
}

function colocar(){
 const conduciendo=stage.classList.contains('driving');
 const elegido=conduciendo?O.choose(AVISOS.map(id=>({id,visible:pedido($(id))}))):null;

 let arriba='';
 if(elegido){
  const e=$(elegido),suelo=stage.getBoundingClientRect().top;
  const bajo=['drive-banner','drive-road-info'].map(id=>{
   const x=$(id);
   return pedido(x)&&medible(x)?x.getBoundingClientRect().bottom-suelo:null;
  });
  let tope=Infinity;
  for(const id of MANDOS){
   const x=$(id);
   if(pedido(x)&&medible(x))tope=Math.min(tope,x.getBoundingClientRect().top-suelo-10);
  }
  const base=O.topUnder(bajo);
  const alto=e?e.getBoundingClientRect().height:0;
  arriba=O.fit(base,alto,Number.isFinite(tope)?tope:null,base)+'px';
 }

 // Escribir lo mismo dispararía otra observación y otro reparto, en bucle.
 const nueva=(elegido||'-')+'@'+arriba;
 if(nueva===firma)return;
 firma=nueva;
 for(const id of AVISOS){
  const e=$(id);
  if(!e)continue;
  e.classList.toggle('overlay-waiting',!!elegido&&id!==elegido);
  if(id===elegido){e.style.top=arriba;e.style.bottom='auto';}
  else{e.style.top='';e.style.bottom='';}
 }
}

const ver=new MutationObserver(()=>{if(!aplicando)requestAnimationFrame(repartir);});
for(const id of AVISOS.concat(['drive-banner','drive-road-info'])){
 const e=$(id);
 if(e)ver.observe(e,{attributes:true,attributeFilter:['hidden','class'],childList:true,subtree:true,characterData:true});
}
new MutationObserver(()=>requestAnimationFrame(repartir)).observe(stage,{attributes:true,attributeFilter:['class']});
window.addEventListener('resize',()=>requestAnimationFrame(repartir));
window.addEventListener('rutas:progress',()=>requestAnimationFrame(repartir));

repartir();
window.RutasOverlays={layout:repartir,showing:()=>firma};
})();
