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
const metros=(a,b)=>Math.hypot(a.lat-b.lat,a.lon-b.lon)*111320;
const en=(k)=>new Date(Date.UTC(2026,8,18,19,0,k)).toISOString();
test('separa las paradas normales de la informacion perdida',()=>{
 // parado: 300 s y 6 m de deriva. perdido: 90 s y 800 m, o sea circulando.
 const parte=[{lat:41,lon:2,time:en(0)},{lat:41.000054,lon:2,time:en(300)},{lat:41.00724,lon:2,time:en(390)}];
 const q=G.quality([parte],metros);
 assert.equal(q.stopped.count,1);assert.equal(q.stopped.seconds,300);
 assert.equal(q.lost.count,1);assert.equal(q.lost.inner,1);assert.equal(q.lost.cuts,0);
 assert.equal(Math.round(q.lost.metres),800);assert.equal(q.lost.seconds,90);
 assert.equal(q.timed,true);assert.equal(q.segments,1);});
test('el corte entre dos segmentos cuenta como perdido si el vehiculo iba en marcha',()=>{
 const a=[{lat:41,lon:2,time:en(0)},{lat:41.0009,lon:2,time:en(20)}];
 const b=[{lat:41.008,lon:2,time:en(80)},{lat:41.0089,lon:2,time:en(100)}];
 const q=G.quality([a,b],metros);
 assert.equal(q.segments,2);assert.equal(q.lost.cuts,1);assert.equal(q.lost.inner,0);
 assert.equal(Math.round(q.lost.metres),790);
 // si en ese mismo corte no se movio, es una pausa manual y no cuenta como perdida
 const quieto=[{lat:41.0009,lon:2,time:en(80)},{lat:41.0018,lon:2,time:en(100)}];
 assert.equal(G.quality([a,quieto],metros).lost.cuts,0);
 assert.equal(G.quality([a,quieto],metros).stopped.count,1);});
test('sin marcas de tiempo no inventa diagnostico',()=>{
 const q=G.quality([[{lat:41,lon:2},{lat:41.01,lon:2}]],metros);
 assert.equal(q.timed,false);assert.equal(q.lost.count,0);assert.equal(q.stopped.count,0);
 assert(q.metres>1000);});
test('mide la cadencia y ordena los peores tramos perdidos',()=>{
 // intervalos cortos normales salvo uno: 100 s y 1 km, que es el unico tramo perdido
 const parte=[{lat:41,lon:2,time:en(0)},{lat:41.00018,lon:2,time:en(10)},{lat:41.00036,lon:2,time:en(20)},{lat:41.00936,lon:2,time:en(120)},{lat:41.00954,lon:2,time:en(130)}];
 const q=G.quality([parte],metros);
 assert.equal(q.lost.count,1);
 assert(q.cadence>200&&q.cadence<320);
 assert.equal(q.worst.length,1);assert.equal(Math.round(q.worst[0].metres),1002);assert.equal(q.worst[0].cut,false);});
test('devuelve un informe vacio sin reventar con entradas raras',()=>{
 for(const mal of [null,[],[[]],[[{lat:41,lon:2}]]])assert.equal(G.quality(mal,metros).lost.count,0);
 assert.equal(G.quality([[{lat:41,lon:2},{lat:41.01,lon:2}]],null).segments,0);});

