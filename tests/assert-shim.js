/* El assert que usa el runner del navegador, con el comportamiento de node:assert/strict.
   Vive aparte para poder probarlo: un assert demasiado blando haria pasar la suite entera
   sin comprobar nada, que es peor que no tener suite. Lo comprueba shim.test.cjs. */
(function(root){
'use strict';

function ver(v){
 if(typeof v==='string')return JSON.stringify(v);
 if(typeof v==='bigint')return String(v)+'n';
 if(typeof v==='number'&&Object.is(v,-0))return '-0';
 if(v===undefined||typeof v==='function'||typeof v==='symbol')return String(v);
 try{const t=JSON.stringify(v);return t===undefined?String(v):t;}catch(e){return String(v);}
}
function falla(mensaje,extra){
 const e=Error(mensaje+(extra?'\n'+extra:''));
 e.name='AssertionError';
 throw e;
}

// Igualdad profunda como la de node: Object.is para lo primitivo -NaN es NaN, +0 no es
// -0-, mismo prototipo, y las mismas claves propias enumerables.
function deepIgual(a,b,vistos){
 if(Object.is(a,b))return true;
 if(typeof a!=='object'||typeof b!=='object'||a===null||b===null)return false;
 if(Object.getPrototypeOf(a)!==Object.getPrototypeOf(b))return false;
 vistos=vistos||new Map();
 if(vistos.get(a)===b)return true;                 // referencias circulares
 vistos.set(a,b);
 if(a instanceof Date)return a.getTime()===b.getTime();
 if(a instanceof RegExp)return a.source===b.source&&a.flags===b.flags;
 if(Array.isArray(a)){
  if(a.length!==b.length)return false;
  for(let i=0;i<a.length;i++)if(!deepIgual(a[i],b[i],vistos))return false;
  return true;
 }
 if(typeof Map==='function'&&a instanceof Map){
  if(a.size!==b.size)return false;
  for(const par of a){if(!b.has(par[0])||!deepIgual(par[1],b.get(par[0]),vistos))return false;}
  return true;
 }
 if(typeof Set==='function'&&a instanceof Set){
  if(a.size!==b.size)return false;
  for(const v of a)if(!b.has(v))return false;
  return true;
 }
 const ka=Object.keys(a),kb=Object.keys(b);
 if(ka.length!==kb.length)return false;
 for(const k of ka){
  if(!Object.prototype.hasOwnProperty.call(b,k))return false;
  if(!deepIgual(a[k],b[k],vistos))return false;
 }
 return true;
}

function ok(valor,mensaje){
 if(!valor)falla(mensaje||('se esperaba algo cierto, llego '+ver(valor)));
}

const assert=function(valor,mensaje){ok(valor,mensaje);};
assert.ok=ok;
assert.equal=function(a,e,m){if(!Object.is(a,e))falla(m||'no son iguales','  llego:    '+ver(a)+'\n  esperaba: '+ver(e));};
assert.strictEqual=assert.equal;
assert.notEqual=function(a,e,m){if(Object.is(a,e))falla(m||('no debia ser '+ver(e)));};
assert.notStrictEqual=assert.notEqual;
assert.deepEqual=function(a,e,m){if(!deepIgual(a,e))falla(m||'no son iguales en profundidad','  llego:    '+ver(a)+'\n  esperaba: '+ver(e));};
assert.deepStrictEqual=assert.deepEqual;
assert.notDeepEqual=function(a,e,m){if(deepIgual(a,e))falla(m||'no debian ser iguales en profundidad');};
assert.notDeepStrictEqual=assert.notDeepEqual;
assert.match=function(cadena,re,m){
 if(typeof cadena!=='string')falla(m||('match esperaba una cadena, llego '+ver(cadena)));
 if(!re.test(cadena))falla(m||'no encaja con la expresion','  cadena: '+ver(cadena)+'\n  patron: '+String(re));
};
assert.doesNotMatch=function(cadena,re,m){
 if(typeof cadena!=='string')falla(m||('doesNotMatch esperaba una cadena, llego '+ver(cadena)));
 if(re.test(cadena))falla(m||'no debia encajar con '+String(re));
};
assert.throws=function(fn,esperado,m){
 let salto=null,hubo=false;
 try{fn();}catch(e){salto=e;hubo=true;}
 if(!hubo)falla(m||'se esperaba una excepcion y no la hubo');
 if(esperado instanceof RegExp){
  const texto=salto&&salto.message!==undefined?String(salto.message):String(salto);
  if(!esperado.test(texto))
   falla(m||'la excepcion no encaja','  mensaje: '+ver(texto)+'\n  patron:  '+String(esperado));
 }else if(typeof esperado==='function'){
  // Como en node: un constructor de error se comprueba con instanceof; cualquier otra
  // funcion hace de validador, y devolver false rechaza.
  const esClase=esperado===Error||esperado.prototype instanceof Error;
  if(esClase){if(!(salto instanceof esperado))falla(m||'la excepcion no es del tipo esperado');}
  else if(esperado(salto)===false)falla(m||'el validador rechazo la excepcion');
 }else if(esperado&&typeof esperado==='object'){
  for(const k of Object.keys(esperado)){
   const quiere=esperado[k],tiene=salto?salto[k]:undefined;
   const bien=quiere instanceof RegExp?quiere.test(String(tiene)):deepIgual(tiene,quiere);
   if(!bien)falla(m||('la excepcion no trae '+k+' esperado'),'  llego:    '+ver(tiene)+'\n  esperaba: '+ver(quiere));
  }
 }
};
assert.doesNotThrow=function(fn,m){try{fn();}catch(e){falla(m||('no debia saltar: '+(e&&e.message||e)));}};
assert.fail=function(m){falla(m||'fail()');};

// deepIgual y ver se exponen para poder probarlos sueltos.
assert._deepIgual=deepIgual;
assert._ver=ver;

if(typeof module==='object'&&module.exports)module.exports=assert;else root.RutasAssertShim=assert;
})(typeof globalThis!=='undefined'?globalThis:this);
