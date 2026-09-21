/* Perfil de vehiculo: preajustes guardados y un aviso de incompatibilidades antes de arrancar. */
(()=>{
'use strict';
const V=window.RutasVehicleCore;
const campos=document.querySelector('.road-vehicle');
if(!V||!campos)return;
const $=id=>document.getElementById(id);

// ---- preajustes sobre los tres campos ----
const chips=document.createElement('div');chips.className='veh-presets';chips.setAttribute('role','group');
chips.setAttribute('aria-label','Tipo de vehículo');
chips.innerHTML=V.PRESETS.map(p=>'<button type="button" data-id="'+p.id+'">'+p.label+'</button>').join('');
const resumen=document.createElement('p');resumen.className='veh-summary';resumen.setAttribute('role','status');
campos.prepend(chips);chips.after(resumen);

// ---- aviso en la ficha de la ruta: se ve arriba, antes de salir, no enterrado en ajustes ----
const aviso=document.createElement('button');aviso.type='button';aviso.id='veh-alert';aviso.hidden=true;
aviso.addEventListener('click',()=>{                     // lleva a la lista de avisos concretos
 const lista=$('road-issues');if(!lista)return;
 for(let n=lista.parentNode;n;n=n.parentNode)if(n.tagName==='DETAILS')n.open=true;
 lista.scrollIntoView({behavior:'smooth',block:'center'});
});
// La cabecera de la ruta la construye otro modulo despues que este, asi que se busca cada vez.
// La ficha grande vive dentro de «Ruta y ajustes», plegada: alli el conductor no la veria.
function coloca(){
 const barra=document.querySelector('.nav-homebar');   // cabecera siempre visible de la ruta
 if(barra){if(aviso.previousElementSibling!==barra){barra.after(aviso);aviso.classList.remove('on-hero');}return true;}
 const ficha=document.querySelector('.route-overview');
 if(ficha){if(aviso.parentElement!==ficha){ficha.append(aviso);aviso.classList.add('on-hero');}return true;}
 if(aviso.parentElement)return true;
 const fila=$('nav-start')&&$('nav-start').closest('.btnrow');
 if(fila)fila.before(aviso);
 return !!aviso.parentElement;
}

let issues=null;

function perfil(){
 const api=window.RutasVehicle;
 if(api&&typeof api.get==='function')return V.normalise(api.get());
 const out={};
 for(const f of V.FIELDS){const el=$('veh-'+f);if(el)out[f]=el.value;}
 return V.normalise(out);
}

function pinta(){
 const p=perfil(),activo=V.detect(p);
 for(const b of chips.querySelectorAll('button'))b.setAttribute('aria-pressed',b.dataset.id===activo?'true':'false');
 const medidas=V.describe(p);
 const s=V.summary(V.incompatibilities(issues),p);
 const comprobado=issues!==null;
 resumen.textContent=medidas?medidas+' · '+(comprobado?s.text:'sin comprobar todavía'):s.text;
 resumen.dataset.tone=medidas&&comprobado?s.tone:'idle';
 const mostrar=comprobado&&s.tone==='warn';
 if(mostrar||aviso.parentElement)coloca();
 aviso.hidden=!mostrar;
 aviso.textContent=mostrar?'⚠ '+s.text+' · ver cuáles':'';
}

chips.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 const id=b.dataset.id;
 if(id==='personalizado'){                       // deja lo puesto y cede el turno a los campos
  for(const f of V.FIELDS){const el=$('veh-'+f);if(el&&!el.value){el.focus();break;}}
  pinta();return;
 }
 const api=window.RutasVehicle;
 if(api&&typeof api.set==='function')api.set(V.dimsOf(id));
 pinta();
});

for(const f of V.FIELDS){
 const el=$('veh-'+f);
 if(el)el.addEventListener('change',()=>setTimeout(pinta,0));
}
window.addEventListener('rutas:road-issues',e=>{issues=e.detail?e.detail.issues:null;pinta();});
window.addEventListener('rutas:check-route',()=>{issues=null;pinta();});
pinta();
})();
