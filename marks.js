/* Puntos negros del conductor: marcar un paso bajo o una calle donde no cabe, y que la
   aplicación lo recuerde y avise antes de llegar la próxima vez. Solo en este dispositivo. */
(()=>{
'use strict';
const M=window.RutasMarksCore,C=window.RutasNav,stage=document.getElementById('nav-stage');
if(!M||!C||!stage)return;
const $=id=>document.getElementById(id);
const CLAVE='rutas-marks-v1';

let list=[],anchored=[],layer=null,routeRef=null,dicho=new Set();

function load(){try{list=M.unpack(localStorage.getItem(CLAVE));}catch{list=[];}}
function save(){try{localStorage.setItem(CLAVE,M.pack(list));}catch{aviso('No se pudo guardar: el almacenamiento del navegador está lleno.');}}

// ---- panel de la lista, dentro de los ajustes de la ruta ----
const card=document.createElement('section');card.id='mark-card';
card.innerHTML='<div class="mark-head"><strong>Tus avisos en la ruta</strong>'+
 '<button type="button" class="btn sm" id="mark-add">Marcar este punto</button></div>'+
 '<p class="hint" id="mark-hint"></p>'+
 '<div id="mark-picker" hidden><div class="mark-kinds" role="group" aria-label="Tipo de aviso"></div>'+
 '<label class="mark-note">Nota (opcional) <input id="mark-note" type="text" maxlength="'+M.NOTE_MAX+'" placeholder="gálibo 3,2 m"></label>'+
 '<div class="btnrow"><button type="button" class="btn primary" id="mark-save">Guardar aviso</button>'+
 '<button type="button" class="btn" id="mark-cancel">Cancelar</button></div></div>'+
 '<ol id="mark-list"></ol>';
stage.before(card);
$('mark-picker').querySelector('.mark-kinds').innerHTML=
 M.KINDS.map((k,i)=>'<button type="button" data-kind="'+k.id+'" aria-pressed="'+(i===0)+'">'+
  '<b>'+k.badge+'</b>'+k.label+'</button>').join('');
let elegido=M.KINDS[0].id;

// ---- aviso en conducción ----
const alerta=document.createElement('div');alerta.id='mark-alert';alerta.hidden=true;
alerta.setAttribute('role','alert');stage.append(alerta);
function aviso(texto){$('mark-hint').textContent=texto;}

// ---- mapa ----
function draw(){
 const state=RutasMap.get();
 if(layer&&state.map)state.map.removeLayer(layer);
 layer=null;
 if(!state.map||!anchored.length)return;
 layer=L.featureGroup();
 for(const m of anchored){
  const k=M.kind(m.kind);
  L.marker([m.lat,m.lon],{icon:L.divIcon({className:'mark-pin',html:k.badge,iconSize:[28,28],iconAnchor:[14,14]}),
   keyboard:false,title:M.describe(m)}).bindPopup(M.describe(m)+'<br><small>Aviso tuyo, no de OpenStreetMap.</small>').addTo(layer);
 }
 layer.addTo(state.map);
}

function relink(){
 const state=RutasMap.get();
 anchored=state.route?M.anchor(list,state.route):[];
 routeRef=state.route;
 draw();
 render();
}

function render(){
 const ol=$('mark-list');
 ol.replaceChildren();
 const sueltos=list.length-anchored.length;
 aviso(list.length
  ?list.length+(list.length===1?' aviso guardado':' avisos guardados')+
   (sueltos>0?' · '+sueltos+' fuera de esta ruta':'')+' · solo en este dispositivo'
  :'Marca un paso bajo, una calle estrecha o un sitio por donde no pasas. La aplicación te lo recordará antes de llegar, aunque OpenStreetMap no lo sepa.');
 for(const m of anchored){
  const li=document.createElement('li');
  const txt=document.createElement('span');
  txt.textContent=M.describe(m)+' · km '+(m.d/1000).toFixed(2).replace('.',',');
  const ver=document.createElement('button');ver.type='button';ver.className='btn sm';ver.textContent='Ver';
  ver.onclick=()=>{try{RutasMap.seek(Math.max(0,m.d-40));}catch{}};
  const del=document.createElement('button');del.type='button';del.className='btn sm';del.textContent='Borrar';
  del.onclick=()=>{list=M.remove(list,m.id);save();relink();};
  li.append(txt,ver,del);
  ol.append(li);
 }
}

// ---- guardar uno nuevo ----
function here(){
 const state=RutasMap.get();
 if(state.active&&state.location)return {lat:state.location.lat,lon:state.location.lng};
 if(state.route)return C.at(state.route,state.progress);
 return null;
}
$('mark-add').onclick=()=>{
 if(!here()){aviso('Carga una ruta antes de marcar un punto.');return;}
 $('mark-picker').hidden=false;$('mark-note').value='';$('mark-note').focus();
};
$('mark-cancel').onclick=()=>{$('mark-picker').hidden=true;};
$('mark-picker').querySelector('.mark-kinds').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 elegido=b.dataset.kind;
 for(const x of $('mark-picker').querySelectorAll('.mark-kinds button'))
  x.setAttribute('aria-pressed',String(x===b));
});
$('mark-save').onclick=()=>{
 const p=here();
 if(!p){aviso('Carga una ruta antes de marcar un punto.');return;}
 list=M.add(list,{...p,kind:elegido,note:$('mark-note').value});
 save();$('mark-picker').hidden=true;relink();
};

// ---- avisar antes de llegar ----
function check(d){
 const proximo=M.ahead(anchored,d,M.WINDOW)[0];
 alerta.hidden=!proximo;
 if(!proximo)return;
 alerta.textContent=M.warning(proximo);
 alerta.dataset.kind=proximo.kind;
 // Una vez por marca y por vuelta: repetirlo cada segundo seria insoportable.
 if(proximo.gap<=200&&!dicho.has(proximo.id)){
  dicho.add(proximo.id);
  const voz=$('nav-voice');
  if(voz&&voz.checked&&window.speechSynthesis){
   const u=new SpeechSynthesisUtterance(M.spoken(proximo));u.lang='es-ES';
   try{window.speechSynthesis.speak(u);}catch{}
  }
 }
}

window.addEventListener('rutas:progress',e=>{
 const state=RutasMap.get();
 if(state.route!==routeRef)relink();
 check(e.detail&&Number.isFinite(e.detail.distance)?e.detail.distance:state.progress);
});
// Un GPX compartido trae los avisos de quien lo mando: se anaden a los propios sin pisarlos.
let entrantes=null;
window.addEventListener('rutas:waypoints',e=>{
 const leidos=M.fromWaypoints(e.detail&&e.detail.waypoints);
 if(leidos.length)entrantes=leidos;
});
function absorb(){
 if(!entrantes)return;
 const r=M.merge(list,entrantes);
 entrantes=null;
 list=r.list;save();relink();
 if(r.added)aviso(r.added+(r.added===1?' aviso nuevo':' avisos nuevos')+' del archivo compartido · '+
  (r.seen-r.added>0?(r.seen-r.added)+' ya los tenías · ':'')+'solo en este dispositivo');
}
window.addEventListener('rutas:route',()=>{dicho=new Set();setTimeout(()=>{relink();absorb();},0);});
window.addEventListener('rutas:check-route',()=>{dicho=new Set();alerta.hidden=true;});
window.addEventListener('rutas:navigation-path',()=>setTimeout(relink,0));

load();setTimeout(relink,0);
window.RutasMarks={all:()=>list.slice(),anchored:()=>anchored.slice(),
 // Al compartir el GPX solo viajan los avisos de esta ruta: los de otra zona no le sirven a nadie.
 forExport:()=>anchored.map(m=>({...m,label:M.kind(m.kind).label})),
 add(m){list=M.add(list,m);save();relink();return list.length;},
 clear(){list=[];save();relink();}};
})();
