const test=require('node:test'),assert=require('node:assert/strict'),P=require('../power-core');

test('cargando no se ahorra: el camion lleva el movil enchufado',()=>{
 assert.equal(P.power(.05,true),'charging');
 assert.equal(P.decide({level:.05,charging:true}).animations,true);
 assert.equal(P.decide({level:.05,charging:true}).heavy,true);
});

test('los tramos de bateria estan donde se dice',()=>{
 assert.equal(P.power(.5,false),'ok');
 assert.equal(P.power(.21,false),'ok');
 assert.equal(P.power(.2,false),'low');
 assert.equal(P.power(.11,false),'low');
 assert.equal(P.power(.1,false),'critical');
 assert.equal(P.power(null,false),'unknown');      // iPhone no da la bateria
 assert.equal(P.power(undefined,undefined),'unknown');
});

test('con bateria baja se quitan animaciones y se sale del 3D',()=>{
 const d=P.decide({level:.17,charging:false,navigating:true});
 assert.equal(d.level,'saving');
 assert.equal(d.animations,false);
 assert.equal(d.heavy,false);
 assert.deepEqual(d.reasons,['battery']);
 assert.equal(d.percent,17);
});

test('por debajo del 10 % el aviso cambia de tono',()=>{
 assert.equal(P.decide({level:.08,charging:false}).level,'critical');
 assert.equal(P.decide({level:.15,charging:false}).level,'saving');
});

test('sin dato de bateria vale el rato navegando, y solo recorta animaciones',()=>{
 const corto=P.decide({navigating:true,elapsed:30*60000});
 assert.equal(corto.animations,true);
 assert.deepEqual(corto.reasons,[]);
 const largo=P.decide({navigating:true,elapsed:46*60000});
 assert.equal(largo.animations,false);
 assert.equal(largo.heavy,true,'el 3D se respeta: no hay motivo para quitarlo');
 assert.deepEqual(largo.reasons,['sustained']);
 // El reloj solo cuenta si se esta navegando de verdad.
 assert.deepEqual(P.decide({navigating:false,elapsed:90*60000}).reasons,[]);
});

test('la bateria manda sobre el reloj',()=>{
 const d=P.decide({level:.12,charging:false,navigating:true,elapsed:90*60000});
 assert.deepEqual(d.reasons,['battery']);
 assert.equal(d.heavy,false);
});

test('si el sistema pide menos movimiento se respeta siempre',()=>{
 const d=P.decide({level:.9,charging:false,reducedMotion:true});
 assert.equal(d.animations,false);
 assert.equal(d.heavy,true,'reducir movimiento no es ahorrar bateria');
 assert.deepEqual(d.reasons,['motion']);
});

test('el aviso explica el motivo en una linea',()=>{
 assert.equal(P.message(P.decide({level:.17,charging:false})),
  'Batería baja (17 %). Se reducen las animaciones y el mapa vuelve a 2D.');
 assert.equal(P.message(P.decide({navigating:true,elapsed:50*60000})),
  'Llevas 50 min navegando. Se reducen las animaciones para gastar menos batería.');
 assert.equal(P.message(P.decide({level:.9,charging:false})),'');
 assert.equal(P.message(null),'');
});

test('solo se repinta cuando cambia lo que se hace, no el porcentaje',()=>{
 const a=P.decide({level:.17,charging:false});
 const b=P.decide({level:.16,charging:false});
 assert.equal(P.changed(a,b),false,'del 17 al 16 % no cambia nada de lo que se hace');
 const c=P.decide({level:.08,charging:false});
 assert.equal(P.changed(b,c),true,'pasar a critico si');
 assert.equal(P.changed(null,a),true);
});

test('los minutos se cuentan hacia abajo y nunca en negativo',()=>{
 assert.equal(P.minutes(59999),0);
 assert.equal(P.minutes(60000),1);
 assert.equal(P.minutes(-5),0);
 assert.equal(P.minutes(null),0);
 assert.equal(P.percent(.176),18);
 assert.equal(P.percent(2),null);
 assert.equal(P.percent(null),null);
});
