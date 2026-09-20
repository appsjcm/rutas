const test=require('node:test'),assert=require('node:assert/strict'),G=require('../gpx-core');
test('genera un GPX 1.1 válido con coordenadas, altura, tiempo y nombre escapado',()=>{
 const xml=G.build('Ronda & reparto',[{lat:41.1,lon:2.2,ele:13.45,time:'2026-09-20T10:00:00+02:00',name:'Parada <1>'},{lat:41.2,lon:2.3,ele:null,time:null}]);
 assert.match(xml,/xmlns="http:\/\/www\.topografix\.com\/GPX\/1\/1"/);
 assert.match(xml,/<name>Ronda &amp; reparto<\/name>/);
 assert.match(xml,/<trkpt lat="41\.1000000" lon="2\.2000000">/);
 assert.match(xml,/<ele>13\.45<\/ele>/);
 assert.match(xml,/<time>2026-09-20T08:00:00\.000Z<\/time>/);
 assert.match(xml,/<name>Parada &lt;1&gt;<\/name>/);
 assert.equal((xml.match(/<trkpt /g)||[]).length,2);
});
test('el nombre del archivo siempre termina en .gpx y elimina caracteres problemáticos',()=>{
 assert.equal(G.filename('Ronda mañána / norte.gpx'),'Ronda-manana-norte.gpx');
 assert.equal(G.filename(''),'ruta.gpx');
});
test('rechaza recorridos insuficientes o coordenadas imposibles',()=>{
 assert.throws(()=>G.build('x',[{lat:41,lon:2}]),/dos puntos/);
 assert.throws(()=>G.build('x',[{lat:91,lon:2},{lat:41,lon:2}]),/no válidas/);
});
