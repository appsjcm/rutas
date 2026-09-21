const test=require('node:test'),assert=require('node:assert/strict'),V=require('../vehicle-core');

test('los preajustes traen medidas creibles de reparto',()=>{
 assert.deepEqual(V.dimsOf('camion12'),{height:3.6,width:2.55,weight:12});
 assert.deepEqual(V.dimsOf('furgoneta'),{height:2.6,width:2.1,weight:3.5});
 assert.deepEqual(V.dimsOf('ninguno'),{});
 assert.deepEqual(V.dimsOf('personalizado'),{});      // lo rellena quien conduce
 assert.equal(V.preset('inventado').id,'ninguno');
});

test('solo sobreviven medidas creibles',()=>{
 assert.deepEqual(V.normalise({height:3.6,width:2.55,weight:12}),{height:3.6,width:2.55,weight:12});
 assert.deepEqual(V.normalise({height:'3,6'}),{height:3.6});      // coma decimal española
 assert.deepEqual(V.normalise({height:0,width:-2,weight:'x'}),{});
 assert.deepEqual(V.normalise({height:99}),{});                   // 99 m no es un camión
 assert.deepEqual(V.normalise({weight:120}),{});
 assert.deepEqual(V.normalise(null),{});
 assert.deepEqual(V.normalise({height:3.666}),{height:3.67});     // dos decimales bastan
});

test('reconoce que preajuste corresponde al perfil guardado',()=>{
 assert.equal(V.detect({height:3.6,width:2.55,weight:12}),'camion12');
 assert.equal(V.detect({height:2.6,width:2.1,weight:3.5}),'furgoneta');
 assert.equal(V.detect({height:3.9,width:2.55,weight:12}),'personalizado');
 assert.equal(V.detect({height:3.6}),'personalizado');            // incompleto no es preajuste
 assert.equal(V.detect({}),'ninguno');
 assert.equal(V.detect(null),'ninguno');
});

test('describe el vehiculo como se lee en una ficha',()=>{
 assert.equal(V.describe({height:3.6,width:2.55,weight:18}),'3,6 m alto · 2,55 m ancho · 18 t');
 assert.equal(V.describe({weight:12}),'12 t');
 assert.equal(V.describe({}),'');
 assert.equal(V.describe(null),'');
});

test('cuenta solo los avisos que dependen del vehiculo',()=>{
 const avisos=[{kind:'opposed'},{kind:'height'},{kind:'ambiguous'},{kind:'weight'},
               {kind:'access'},{kind:'conditional'},{kind:'limit-variable'},{kind:'width'}];
 assert.equal(V.incompatibilities(avisos),5);          // height, weight, access, limit-variable, width
 assert.equal(V.incompatibilities([{kind:'opposed'},{kind:'ambiguous'}]),0);
 assert.equal(V.incompatibilities(null),0);
});

test('el resumen distingue sin medidas, sin avisos y con avisos',()=>{
 const camion={height:3.6,width:2.55,weight:12};
 assert.equal(V.summary(0,{}).tone,'idle');
 assert.match(V.summary(3,{}).text,/Añade las medidas/);          // sin perfil no se afirma nada
 assert.equal(V.summary(3,{}).count,0);
 assert.equal(V.summary(0,camion).tone,'ok');
 const tres=V.summary(3,camion);
 assert.equal(tres.tone,'warn');assert.equal(tres.count,3);
 assert.equal(tres.text,'3 posibles incompatibilidades con tu vehículo');
 assert.equal(V.summary(1,camion).text,'1 posible incompatibilidad con tu vehículo');
});
