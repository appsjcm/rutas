/* Que todo lo que se publica se pueda leer como JavaScript.
   Esto existe porque un parentesis de mas dentro del <script> de index.html dejo sin
   funcionar el mecanismo de actualizacion entero -la aplicacion seguia abriendose, asi
   que no se notaba- y ninguna prueba lo vio: las demas solo cargan los modulos -core.
   La lista sale del propio SHELL del service worker, asi que no hay una segunda lista
   que mantener, y de paso se comprueba que ese SHELL no nombra ficheros que no existen. */
const test=require('node:test'),assert=require('node:assert/strict');

// En el navegador las fuentes las deja preparadas el runner; bajo node se leen del disco.
function fuentes(){
 if(globalThis.__fuentes)return globalThis.__fuentes;
 const fs=require('fs'),path=require('path'),raiz=path.join(__dirname,'..');
 const sw=fs.readFileSync(path.join(raiz,'sw.js'),'utf8');
 const out={'sw.js':sw,'index.html':fs.readFileSync(path.join(raiz,'index.html'),'utf8')};
 for(const f of listaDelShell(sw))out[f]=fs.readFileSync(path.join(raiz,f),'utf8');
 return out;
}
function listaDelShell(sw){
 const m=sw.match(/const SHELL=\[([^\]]*)\]/);
 if(!m)return [];
 return m[1].split(',')
  .map(s=>s.trim().replace(/^['"]|['"]$/g,''))
  .filter(s=>s.endsWith('.js')&&!s.startsWith('vendor/'));
}

// Los <script> sin src que van dentro del HTML. Son los que nadie comprueba.
function guionesDe(html){
 return [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
}
function seLee(codigo){
 try{new Function(codigo);return null;}
 catch(e){return e.message;}
}

test('el SHELL del service worker nombra ficheros que existen',()=>{
 const f=fuentes();
 const lista=listaDelShell(f['sw.js']);
 assert.ok(lista.length>20,'el SHELL debe traer los modulos: '+lista.length);
 for(const ruta of lista)
  assert.equal(typeof f[ruta],'string',ruta+' esta en el SHELL pero no se pudo leer');
});

test('todos los .js publicados se leen como JavaScript',()=>{
 const f=fuentes();
 const malos=[];
 for(const ruta of listaDelShell(f['sw.js'])){
  const fallo=seLee(f[ruta]);
  if(fallo)malos.push(ruta+': '+fallo);
 }
 const fallo=seLee(f['sw.js']);
 if(fallo)malos.push('sw.js: '+fallo);
 assert.deepEqual(malos,[],'hay ficheros que no parsean');
});

test('los <script> de dentro de index.html tambien se leen',()=>{
 const f=fuentes();
 const guiones=guionesDe(f['index.html']);
 assert.ok(guiones.length>0,'index.html debe traer algun script inline');
 const malos=[];
 guiones.forEach((src,i)=>{const fallo=seLee(src);if(fallo)malos.push('bloque '+(i+1)+': '+fallo);});
 assert.deepEqual(malos,[],'hay scripts inline que no parsean');
});

test('el mecanismo de actualizacion sigue entero',()=>{
 const html=fuentes()['index.html'];
 // Sin registro no hay aplicacion sin conexion.
 assert.match(html,/serviceWorker\.register\(/,'falta el registro del service worker');
 // Sin update() una PWA instalada puede pasar dias sin enterarse de que hay version nueva:
 // el navegador no vuelve a pedir sw.js si nadie navega. Fue justo lo que pasaba.
 assert.match(html,/\.update\(\)/,'nadie busca actualizaciones');
 // Sin esto la version nueva se queda esperando turno para siempre.
 assert.match(html,/skip-waiting/,'no se activa la version que espera');
 // Y hay que mirarlo al volver a la aplicacion, no solo al abrirla.
 assert.match(html,/visibilitychange/,'no se mira al volver a la aplicacion');
});

test('el service worker sabe decir que version sirve',()=>{
 const sw=fuentes()['sw.js'];
 assert.match(sw,/rutasVersion/,'sin esto no se puede comprobar que version lleva el movil');
 assert.match(sw,/const VERSION='rutas-[^']+'/,'la version debe tener nombre propio');
});
