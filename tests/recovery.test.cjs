const test=require('node:test'),assert=require('node:assert/strict'),R=require('../recovery-core');

test('las distancias se leen de un vistazo',()=>{
 assert.equal(R.metres(84),'84 m');
 assert.equal(R.metres(84.6),'85 m');
 assert.equal(R.metres(1000),'1,0 km');   // un decimal siempre, como el resto de la app
 assert.equal(R.metres(1350),'1,4 km');
 assert.equal(R.metres(-5),'—');
 assert.equal(R.metres(null),'—');
});

test('el titular dice cuanto te has salido, no «fuera del recorrido»',()=>{
 const c=R.card({gap:84,ahead:350});
 assert.equal(c.head,'Te has salido 84 m');
 assert.equal(c.lead,'Puedes volver dentro de 350 m sin perder el progreso.');
 assert.equal(c.phase,'offer');
 assert.equal(c.busy,false);
 assert.equal(c.note,R.AVISO);
});

test('las dos salidas son decisiones, no una accion y una cruz',()=>{
 const c=R.card({gap:84,ahead:350});
 assert.equal(c.primary,'Volver a la ruta');
 assert.equal(c.secondary,'Seguir sin recalcular');
});

test('mientras calcula lo dice y no deja pulsar dos veces',()=>{
 const c=R.card({phase:'searching'});
 assert.equal(c.head,'Buscando el mejor punto para volver…');
 assert.equal(c.busy,true);
 assert.equal(c.secondary,'Cancelar');
 assert.equal(c.note,'');
});

test('si falla ofrece reintentar sin cerrar la puerta a seguir',()=>{
 const c=R.card({phase:'error',message:'El cálculo ha tardado demasiado.'});
 assert.equal(c.head,'No se ha podido calcular el regreso');
 assert.equal(c.lead,'El cálculo ha tardado demasiado.');
 assert.equal(c.primary,'Reintentar');
 assert.equal(c.secondary,'Seguir sin recalcular');
 assert.equal(c.busy,false);
 assert.match(R.card({phase:'error'}).lead,/Inténtalo de nuevo/);
});

test('un fallo de red se cuenta en castellano, no con el nombre del error',()=>{
 assert.equal(R.failure({name:'AbortError'}),'El cálculo ha tardado demasiado.');
 assert.equal(R.failure({message:'El servicio no responde.'}),'El servicio no responde.');
 assert.match(R.failure(null),/No se encontró un regreso/);
 assert.match(R.failure({}),/No se encontró un regreso/);
});

test('sin datos la tarjeta no inventa distancias',()=>{
 const c=R.card({});
 assert.equal(c.head,'Te has salido —');
 assert.equal(c.lead,'Puedes volver dentro de — sin perder el progreso.');
 assert.equal(R.card().phase,'offer');
});
