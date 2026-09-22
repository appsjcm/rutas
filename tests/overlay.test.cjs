const test=require('node:test'),assert=require('node:assert/strict'),O=require('../overlay-core');

const todos=[{id:'nav-road-alert',visible:true},
             {id:'mark-alert',visible:true},
             {id:'route-recovery',visible:true}];

test('con varios avisos a la vez manda el desvio',()=>{
 // Si te has salido del recorrido, lo demas ya no es lo que toca decidir.
 assert.equal(O.choose(todos),'route-recovery');
});

test('sin desvio manda el aviso de la via, y luego el del conductor',()=>{
 assert.equal(O.choose([{id:'nav-road-alert',visible:true},{id:'mark-alert',visible:true}]),'nav-road-alert');
 assert.equal(O.choose([{id:'mark-alert',visible:true}]),'mark-alert');
 assert.equal(O.choose([{id:'nav-road-alert',visible:false},{id:'mark-alert',visible:true}]),'mark-alert');
});

test('sin nada que enseñar no se enseña nada',()=>{
 assert.equal(O.choose([{id:'mark-alert',visible:false}]),null);
 assert.equal(O.choose([]),null);
 assert.equal(O.choose(null),null);
});

test('un identificador desconocido no se cuela por delante',()=>{
 assert.equal(O.choose([{id:'otro',visible:true},{id:'mark-alert',visible:true}]),'mark-alert');
 assert.equal(O.choose([{id:'otro',visible:true}]),null);
});

test('el orden se puede cambiar sin tocar la logica',()=>{
 assert.equal(O.choose(todos,['mark-alert','route-recovery']),'mark-alert');
});

test('el aviso va debajo de lo que ya ocupa arriba',()=>{
 assert.equal(O.topUnder([139,210],10),220);      // la cabecera y la ficha de la via
 assert.equal(O.topUnder([139],10),149);
 assert.equal(O.topUnder([],10),10);
 assert.equal(O.topUnder([139,null,NaN],10),149);
 assert.equal(O.topUnder(null),10);
});

test('si llegase a los mandos sube, pero nunca por encima de la cabecera',()=>{
 assert.equal(O.fit(300,100,500,149),300,'si cabe no se mueve');
 assert.equal(O.fit(300,100,350,149),250,'sube lo justo');
 assert.equal(O.fit(300,300,350,149),149,'no cabe de ninguna manera: se queda arriba del todo');
 assert.equal(O.fit(300,100,null,149),300,'sin limite no se toca');
});
