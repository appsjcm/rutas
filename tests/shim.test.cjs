/* Comprueba el assert que usa el runner del navegador.
   Aqui NO se usa el propio shim para dar los veredictos: si el shim estuviera roto y no
   saltara nunca, una prueba escrita con el pasaria vacia y diria que todo va bien. Cada
   caso decide con un throw pelado.
   Y cuando esto corre bajo node, cada caso se contrasta ademas con el assert de verdad,
   asi que una divergencia con node se ve aqui y no en la carretera. */
const test=require('node:test');
const shim=require('./assert-shim');

// En el navegador require('node:assert/strict') devuelve el propio shim; solo sirve de
// contraste cuando es el de node de verdad.
let real=null;
try{
 const a=require('node:assert/strict');
 if(a!==shim&&typeof process!=='undefined'&&process.versions&&process.versions.node)real=a;
}catch(e){}

function salta(fn){try{fn();return false;}catch(e){return true;}}
function exige(condicion,texto){if(!condicion)throw new Error(texto);}

// Cada caso: [descripcion, funcion que usa el assert, si debe saltar]
function revisa(casos){
 for(const c of casos){
  const [texto,usa,debeSaltar]=c;
  const conShim=salta(()=>usa(shim));
  exige(conShim===debeSaltar,
   texto+': el shim '+(conShim?'salto':'no salto')+' y debia '+(debeSaltar?'saltar':'no saltar'));
  if(real){
   const conReal=salta(()=>usa(real));
   exige(conReal===conShim,
    texto+': node '+(conReal?'salta':'no salta')+' y el shim '+(conShim?'salta':'no salta'));
  }
 }
}

test('equal compara como node: estricto y con Object.is',()=>{
 revisa([
  ['1 vs 1',            a=>a.equal(1,1),           false],
  ['1 vs 2',            a=>a.equal(1,2),           true],
  ['"1" vs 1 no mezcla', a=>a.equal('1',1),         true],
  ['NaN es NaN',        a=>a.equal(NaN,NaN),       false],
  ['0 no es -0',        a=>a.equal(0,-0),          true],
  ['null no es undefined',a=>a.equal(null,undefined),true],
  ['notEqual al reves', a=>a.notEqual(1,1),        true],
  ['notEqual bien',     a=>a.notEqual(1,2),        false]
 ]);
});

test('ok rechaza todo lo que es falso, incluido lo que parece vacio',()=>{
 revisa([
  ['ok(1)',     a=>a.ok(1),         false],
  ['ok("x")',   a=>a.ok('x'),       false],
  ['ok([])',    a=>a.ok([]),        false],
  ['ok({})',    a=>a.ok({}),        false],
  ['ok(false)', a=>a.ok(false),     true],
  ['ok(0)',     a=>a.ok(0),         true],
  ['ok("")',    a=>a.ok(''),        true],
  ['ok(null)',  a=>a.ok(null),      true],
  ['ok(undefined)',a=>a.ok(undefined),true],
  ['ok(NaN)',   a=>a.ok(NaN),       true]
 ]);
});

test('assert llamado como funcion hace de ok',()=>{
 exige(salta(()=>shim(false))===true,'assert(false) debia saltar');
 exige(salta(()=>shim(true))===false,'assert(true) no debia saltar');
});

test('deepEqual mira dentro y no perdona una clave de mas',()=>{
 revisa([
  ['objetos iguales',   a=>a.deepEqual({a:1,b:[1,2]},{a:1,b:[1,2]}), false],
  ['anidado igual',     a=>a.deepEqual([{x:1}],[{x:1}]),             false],
  ['valor distinto',    a=>a.deepEqual({a:1},{a:2}),                 true],
  ['clave de mas',      a=>a.deepEqual({a:1},{a:1,b:2}),             true],
  ['clave undefined cuenta',a=>a.deepEqual({a:undefined},{}),        true],
  ['longitud distinta', a=>a.deepEqual([1,2],[1,2,3]),               true],
  ['objeto no es array',a=>a.deepEqual({0:1,length:1},[1]),          true],
  ['NaN dentro',        a=>a.deepEqual({a:NaN},{a:NaN}),             false],
  ['0 y -0 dentro',     a=>a.deepEqual({a:0},{a:-0}),                true],
  ['fechas iguales',    a=>a.deepEqual(new Date(5),new Date(5)),     false],
  ['fechas distintas',  a=>a.deepEqual(new Date(5),new Date(6)),     true],
  ['regexp igual',      a=>a.deepEqual(/a/g,/a/g),                   false],
  ['regexp con otra bandera',a=>a.deepEqual(/a/g,/a/i),              true],
  ['notDeepEqual bien', a=>a.notDeepEqual({a:1},{a:2}),              false],
  ['notDeepEqual al reves',a=>a.notDeepEqual({a:1},{a:1}),           true]
 ]);
});

test('deepEqual no se cuelga con referencias circulares',()=>{
 const a1={n:1};a1.yo=a1;
 const b1={n:1};b1.yo=b1;
 exige(salta(()=>shim.deepEqual(a1,b1))===false,'dos circulares iguales no debian saltar');
});

test('match exige una cadena de verdad y el patron',()=>{
 revisa([
  ['encaja',        a=>a.match('hola mundo',/mundo/), false],
  ['no encaja',     a=>a.match('hola',/adios/),       true],
  ['numero no vale',a=>a.match(123,/1/),              true],
  ['null no vale',  a=>a.match(null,/x/),             true],
  ['doesNotMatch bien',a=>a.doesNotMatch('hola',/adios/),false],
  ['doesNotMatch al reves',a=>a.doesNotMatch('hola',/ho/),true]
 ]);
});

test('throws distingue no saltar, saltar mal y saltar bien',()=>{
 revisa([
  ['no salto nada',   a=>a.throws(()=>{}),                            true],
  ['salta y basta',   a=>a.throws(()=>{throw new Error('boom');}),    false],
  ['mensaje encaja',  a=>a.throws(()=>{throw new Error('boom');},/boom/), false],
  ['mensaje no encaja',a=>a.throws(()=>{throw new Error('boom');},/otra/), true],
  ['tipo encaja',     a=>a.throws(()=>{throw new TypeError('t');},TypeError), false],
  ['tipo no encaja',  a=>a.throws(()=>{throw new RangeError('r');},TypeError), true],
  ['doesNotThrow bien',a=>a.doesNotThrow(()=>1),                      false],
  ['doesNotThrow al reves',a=>a.doesNotThrow(()=>{throw new Error('x');}), true]
 ]);
});

test('fail siempre salta',()=>{
 exige(salta(()=>shim.fail())===true,'fail() debia saltar');
});

test('el mensaje del fallo dice que llego y que se esperaba',()=>{
 let texto='';
 try{shim.equal(3,4);}catch(e){texto=e.message;}
 exige(/3/.test(texto)&&/4/.test(texto),'el mensaje debia traer los dos valores: '+texto);
 exige(/AssertionError/.test((()=>{try{shim.ok(false);}catch(e){return e.name;}return '';})()),
  'el error debia llamarse AssertionError');
});
