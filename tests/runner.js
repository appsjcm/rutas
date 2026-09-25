/* Hace correr los .cjs de node dentro del navegador. Tres piezas: un require que devuelve
   los modulos ya cargados como scripts, un assert compatible con node:assert/strict, y un
   test que apunta los casos en vez de imprimirlos. No duplica ni un caso de prueba. */
(()=>{
'use strict';

// Los -core.js se cargan como scripts normales y se quedan en window. Con que nombre se
// registra cada uno se descubre mirando que clave nueva aparece: asi no hay una tabla que
// mantener a mano y que se quede vieja al primer modulo nuevo.
const MODULOS=['nav-core','gpx-core','restrictions-core','street-match-core','streetview-core',
 'coverage-core','start-core',
 'vehicle-core','checklist-core','power-core','hud-core','marks-core','pace-core',
 'overlay-core','recovery-core','access-core','library-core','sim-core',
 'layout-audit-core','street-imagery-core'];
const FICHEROS=['access','checklist','coverage','fuentes','gpx','hud','layout-audit','library','marks',
 'navigation','overlay','pace','power','recovery','restrictions','shim','sim','street-imagery',
 'start','street-match','streetview','vehicle'];

const exportado=new Map();
const fallosDeCarga=new Map();

// Un sello por carga de pagina. Sin el, el <script src> de los modulos lo sirve el cache
// del navegador y se prueba la version de ayer creyendo que es la de ahora -medido: las
// pruebas nuevas fallaban contra un sim-core.js viejo mientras el del servidor ya estaba
// bien-. Una suite que prueba codigo que no es el de disco es peor que ninguna.
const SELLO='?v='+Date.now();

function cargarScript(src){
 return new Promise((ok,mal)=>{
  const s=document.createElement('script');
  s.src=src;s.onload=()=>ok();s.onerror=()=>mal(Error('no se pudo cargar '+src));
  document.head.append(s);
 });
}
// fuentes.test.cjs comprueba que todo lo publicado se lee como JavaScript. Bajo node lee
// del disco; aqui hay que traerlo por red, y eso no se puede hacer dentro de una prueba
// sincrona, asi que se deja preparado antes de empezar.
async function cargarFuentes(){
 const out={};
 async function trae(ruta){
  const r=await fetch('../'+ruta+SELLO,{cache:'no-store'});
  if(!r.ok)throw Error(ruta+' respondio '+r.status);
  out[ruta]=await r.text();
 }
 try{
  await trae('sw.js');
  await trae('index.html');
  await trae('reparar.html');
  const m=out['sw.js'].match(/const SHELL=\[([^\]]*)\]/);
  const lista=m?m[1].split(',').map(x=>x.trim().replace(/^['"]|['"]$/g,''))
   .filter(x=>x.endsWith('.js')&&!x.startsWith('vendor/')):[];
  for(const f of lista){try{await trae(f);}catch(e){}}
 }catch(e){if(window.console)console.debug('[pruebas] fuentes',e&&e.message);}
 window.__fuentes=out;
}
async function cargarModulos(){
 for(const nombre of MODULOS){
  const antes=new Set(Object.keys(window));
  try{
   await cargarScript('../'+nombre+'.js'+SELLO);
   const nuevas=Object.keys(window).filter(k=>!antes.has(k)&&/^Rutas/.test(k));
   if(!nuevas.length)throw Error('no registro ningun objeto global');
   exportado.set(nombre,window[nuevas[nuevas.length-1]]);
  }catch(e){fallosDeCarga.set(nombre,e.message||String(e));}
 }
}

// ---- require ----
function require(ruta){
 const limpio=String(ruta).replace(/^\.\.\//,'').replace(/\.js$/,'');
 if(limpio==='node:test')return test;
 if(limpio==='node:assert/strict'||limpio==='node:assert'||limpio==='assert')return assert;
 if(limpio==='./assert-shim'||limpio==='assert-shim')return assert;
 if(exportado.has(limpio))return exportado.get(limpio);
 if(fallosDeCarga.has(limpio))throw Error('el modulo '+limpio+' no cargo: '+fallosDeCarga.get(limpio));
 throw Error('require desconocido: '+ruta);
}

// ---- assert ----
// Vive en assert-shim.js para poder probarlo; shim.test.cjs lo revisa sin usarlo para
// dar sus propios veredictos.
const assert=window.RutasAssertShim;

// ---- test ----
let recogiendo=null;
function test(nombre,fn){
 if(typeof nombre==='function'){fn=nombre;nombre='(sin nombre)';}
 if(!recogiendo)throw Error('test() fuera de un fichero');
 recogiendo.push({nombre:String(nombre),fn});
}
test.test=test;test.it=test;
test.skip=(n)=>{if(recogiendo)recogiendo.push({nombre:String(n),saltado:true});};
test.todo=test.skip;

// ---- pasar un fichero ----
async function pasarFichero(nombre){
 const salida={nombre,casos:[],error:null};
 let codigo;
 try{
  const r=await fetch(nombre+'.test.cjs'+SELLO,{cache:'no-store'});
  if(!r.ok)throw Error('respondio '+r.status);
  codigo=await r.text();
 }catch(e){salida.error='no se pudo leer: '+(e.message||e);return salida;}

 const cola=[];recogiendo=cola;
 const module={exports:{}};
 try{
  new Function('require','module','exports',codigo)(require,module,module.exports);
 }catch(e){
  salida.error='no se pudo preparar: '+(e&&e.message||e);
  recogiendo=null;return salida;
 }
 recogiendo=null;

 for(const caso of cola){
  if(caso.saltado){salida.casos.push({nombre:caso.nombre,pasa:true,saltado:true});continue;}
  try{caso.fn();salida.casos.push({nombre:caso.nombre,pasa:true});}
  catch(e){salida.casos.push({nombre:caso.nombre,pasa:false,detalle:(e&&e.message||String(e))});}
 }
 return salida;
}

// ---- lo que se ve ----
const $=id=>document.getElementById(id);
const lista=$('lista'),titular=$('titular'),detalle=$('detalle');
let ultimo=null,soloFallos=false;

function pinta(informes,enCurso){
 lista.replaceChildren();
 let pasan=0,fallan=0;
 for(const inf of informes){
  const malos=inf.casos.filter(c=>!c.pasa).length+(inf.error?1:0);
  pasan+=inf.casos.filter(c=>c.pasa).length;fallan+=malos;
  if(soloFallos&&!malos)continue;
  const d=document.createElement('details');
  d.className='fichero '+(malos?'mal':'ok');
  if(malos)d.open=true;
  const s=document.createElement('summary');
  const marca=document.createElement('span');marca.className='marca';marca.textContent=malos?'✕':'✓';
  const nom=document.createElement('span');nom.textContent=inf.nombre;
  const cuenta=document.createElement('span');cuenta.className='cuenta';
  cuenta.textContent=inf.error?'no cargó':(inf.casos.length+' · '+malos+' fallan');
  s.append(marca,nom,cuenta);d.append(s);
  if(inf.error){
   const p=document.createElement('div');p.className='caso falla';p.textContent=inf.error;d.append(p);
  }
  for(const c of inf.casos){
   if(soloFallos&&c.pasa)continue;
   const li=document.createElement('div');
   li.className='caso '+(c.pasa?'pasa':'falla');
   li.textContent=(c.pasa?'✓ ':'✕ ')+c.nombre;
   if(!c.pasa){const pre=document.createElement('pre');pre.textContent=c.detalle;li.append(pre);}
   d.append(li);
  }
  lista.append(d);
 }
 const total=pasan+fallan;
 titular.textContent=enCurso?('Pasando pruebas… '+total):
  (fallan?(fallan+' de '+total+' fallan'):(total+' pruebas pasan'));
 titular.dataset.tono=enCurso?'':(fallan?'mal':'ok');
 detalle.textContent=enCurso?' ':
  (informes.length+' ficheros · '+MODULOS.length+' módulos'+
   (fallosDeCarga.size?' · '+fallosDeCarga.size+' módulo(s) sin cargar':''));
 const barra=document.querySelector('#progreso i');
 if(barra)barra.style.width=Math.round(100*informes.length/FICHEROS.length)+'%';
 return {pasan,fallan,total};
}

function informeEnTexto(informes,r){
 const l=['Rutas · comprobaciones en el navegador',
  (r.fallan?r.fallan+' de '+r.total+' fallan':r.total+' pruebas pasan'),''];
 for(const inf of informes){
  const malos=inf.casos.filter(c=>!c.pasa);
  if(inf.error){l.push('✕ '+inf.nombre+': '+inf.error);continue;}
  l.push((malos.length?'✕ ':'✓ ')+inf.nombre+' ('+inf.casos.length+')');
  for(const c of malos)l.push('    ✕ '+c.nombre+'\n      '+String(c.detalle).replace(/\n/g,'\n      '));
 }
 return l.join('\n');
}

async function pasarTodo(){
 for(const b of ['otra-vez','solo-fallos','copiar'])$(b).disabled=true;
 const informes=[];
 pinta(informes,true);
 for(const f of FICHEROS){
  informes.push(await pasarFichero(f));
  pinta(informes,true);
  await new Promise(r=>setTimeout(r,0));
 }
 const r=pinta(informes,false);
 ultimo={informes,r};
 for(const b of ['otra-vez','solo-fallos','copiar'])$(b).disabled=false;
 window.RutasPruebas={informes,pasan:r.pasan,fallan:r.fallan,total:r.total,
  texto:()=>informeEnTexto(informes,r)};
 return r;
}

$('otra-vez').onclick=()=>pasarTodo();
$('solo-fallos').onclick=e=>{
 soloFallos=!soloFallos;
 e.currentTarget.textContent=soloFallos?'Ver todas':'Ver solo los fallos';
 if(ultimo)pinta(ultimo.informes,false);
};
$('copiar').onclick=async e=>{
 if(!ultimo)return;
 const boton=e.currentTarget;
 try{await navigator.clipboard.writeText(informeEnTexto(ultimo.informes,ultimo.r));boton.textContent='Copiado';}
 catch{boton.textContent='No se pudo copiar';}
 setTimeout(()=>{boton.textContent='Copiar informe';},1800);
};

if(!assert){
 document.getElementById('titular').textContent='No cargó assert-shim.js';
 document.getElementById('titular').dataset.tono='mal';
}else cargarFuentes().then(cargarModulos).then(()=>{
 if(fallosDeCarga.size)console.warn('[pruebas] modulos sin cargar',Array.from(fallosDeCarga));
 return pasarTodo();
});
})();
