const test=require('node:test'),assert=require('node:assert/strict'),C=require('../checklist-core');

const PUIG={lat:41.976474,lon:1.873488};
const k=(p,z)=>C.keyOf(C.tileOf(p.lat,p.lon,z));

test('calcula la tesela de una coordenada conocida',()=>{
 // Puig-reig, zoom 17. Comprobado aparte con la formula de la wiki de OpenStreetMap.
 assert.deepEqual(C.tileOf(41.976474,1.873488,17),{z:17,x:66218,y:48667});
 assert.deepEqual(C.tileOf(0,0,1),{z:1,x:1,y:1});
 assert.deepEqual(C.tileOf(0,-180,1),{z:1,x:0,y:1});
});

test('lee z/x/y de las teselas ya guardadas',()=>{
 assert.equal(C.fromUrl('https://tile.openstreetmap.org/17/66218/48667.png'),'17/66218/48667');
 assert.equal(C.fromUrl('https://tile.openstreetmap.org/17/66218/48667.png?v=2'),'17/66218/48667');
 assert.equal(C.fromUrl('https://ejemplo.org/estilo/liberty'),null);
 assert.equal(C.fromUrl(null),null);
 assert.deepEqual([...C.cachedKeys(['https://t/16/1/2.png','mal','https://t/16/3/4.png'])],['16/1/2','16/3/4']);
});

test('los zoom aceptados van del de conduccion menos dos al maximo del mapa',()=>{
 assert.deepEqual(C.zoomLevels(),[15,16,17,18,19]);
 assert.deepEqual(C.zoomLevels(16,1,17),[15,16,17]);
 assert.deepEqual(C.zoomLevels(1,5,2),[0,1,2]);
});

test('acepta la tesela exacta, una madre cercana o una mas detallada',()=>{
 assert.ok(C.seen(PUIG.lat,PUIG.lon,new Set([k(PUIG,17)])),'la exacta');
 assert.ok(C.seen(PUIG.lat,PUIG.lon,new Set([k(PUIG,15)])),'dos niveles arriba: borrosa pero legible');
 assert.ok(C.seen(PUIG.lat,PUIG.lon,new Set([k(PUIG,18)])),'mas detallada, de cuando se conducia');
 // Este era el fallo: seis teselas de z13 daban la ruta por guardada entera.
 assert.ok(!C.seen(PUIG.lat,PUIG.lon,new Set([k(PUIG,13)])),'z13 ampliado a z17 es un borron');
 assert.ok(!C.seen(PUIG.lat,PUIG.lon,new Set([k(PUIG,14)])),'tres niveles ya no guian');
 assert.ok(!C.seen(PUIG.lat,PUIG.lon,new Set()));
});

test('una ruta larga se muestrea sin dejar fuera el final',()=>{
 const pts=[];
 for(let i=0;i<5000;i++)pts.push({lat:41.9+i*1e-5,lon:1.87});
 const m=C.sample(pts,50);
 assert.ok(m.length>=50&&m.length<=51,'muestreados '+m.length);
 assert.equal(m[m.length-1],pts[pts.length-1]);
 assert.deepEqual(C.sample([{lat:1,lon:2},{lat:NaN,lon:2}],10),[{lat:1,lon:2}]);
 assert.deepEqual(C.sample(null,10),[]);
});

test('no pide mas teselas de la cuenta por larga que sea la ruta',()=>{
 const pts=[];
 for(let i=0;i<5000;i++)pts.push({lat:41.9+i*1e-5,lon:1.87+i*1e-5});
 const t=C.tilesFor(pts,17,50);
 assert.ok(t.length<=51,'pedidas '+t.length);
 assert.ok(t.length>1);
 assert.deepEqual(C.tilesFor([],17),[]);
 assert.deepEqual(C.tilesFor([PUIG],17),['17/66218/48667']);
});

test('la cobertura es la fraccion del recorrido que se veria sin cobertura',()=>{
 const pts=[{lat:41.97,lon:1.87},{lat:41.98,lon:1.88},{lat:41.99,lon:1.89},{lat:42.0,lon:1.9}];
 const have=new Set(pts.slice(0,2).map(p=>k(p,17)));
 assert.equal(C.coverage(pts,have),.5);
 assert.equal(C.coverage(pts,new Set()),0);
 assert.equal(C.coverage([],new Set(['17/1/1'])),0);
 assert.equal(C.coverage(null,new Set(['17/1/1'])),0);
});

test('la ruta de ejemplo no es una ruta para salir',()=>{
 assert.equal(C.routeItem({pts:[1,2],sample:true}).state,'bad');
 assert.equal(C.routeItem(null).state,'bad');
 assert.equal(C.routeItem({pts:[1]}).state,'bad');
 const ok=C.routeItem({pts:[1,2],name:'HICHAM.gpx',metres:26350});
 assert.equal(ok.state,'ok');
 assert.equal(ok.detail,'HICHAM · 26,4 km');        // la cabecera tampoco muestra la extension
});

test('distingue permiso concedido, por pedir y denegado',()=>{
 assert.equal(C.gpsItem('granted').state,'ok');
 assert.equal(C.gpsItem('prompt').state,'warn');
 assert.equal(C.gpsItem('denied').state,'bad');
 assert.equal(C.gpsItem(undefined).state,'warn');       // Safari no contesta: se asume que preguntara
 assert.equal(C.gpsItem('granted',false).state,'bad');  // navegador sin GPS
});

test('avisa de lo que sobrevive sin cobertura, no de si hay red ahora',()=>{
 assert.equal(C.mapItem(1,true).detail,'Ruta disponible sin cobertura.');
 assert.equal(C.mapItem(.95,false).state,'ok');         // guardada: da igual que no haya red
 assert.equal(C.mapItem(.5).detail,'Mapa parcialmente guardado: 50 % de la ruta.');
 assert.equal(C.mapItem(.5).state,'warn');
 assert.equal(C.mapItem(0,true).state,'warn');          // con red se ira guardando
 assert.equal(C.mapItem(0,false).state,'bad');          // sin red y sin mapa: eso si importa
 assert.match(C.mapItem(0,false).detail,/no hay conexión/);
});

test('el apartado de calles cuenta lo del vehiculo, no lo de los sentidos',()=>{
 assert.equal(C.roadsItem('ready',0,true).detail,'Sin incompatibilidades con tu vehículo.');
 assert.equal(C.roadsItem('ready',0,false).detail,'Calles y sentidos comprobados.');
 assert.equal(C.roadsItem('ready',1,true).detail,'1 posible incompatibilidad con tu vehículo.');
 assert.equal(C.roadsItem('ready',4,true).state,'warn');
 assert.equal(C.roadsItem('loading').state,'warn');
 assert.equal(C.roadsItem('idle').detail,'Calles y sentidos sin comprobar.');
 assert.equal(C.roadsItem('error').state,'warn');
});

test('el chequeo lista los apartados en orden',()=>{
 const l=C.items({route:{pts:[1,2],name:'R',metres:1000},permission:'granted',
                  voiceSupported:true,voiceEnabled:true,mapRatio:1,online:true,
                  roadState:'ready',vehicleCount:0,profiled:true});
 assert.deepEqual(l.map(i=>i.id),['ruta','gps','voz','mapas','calles','avisos']);
 assert.ok(l.every(i=>i.state==='ok'));
 assert.equal(C.verdict(l).tone,'ok');
 assert.equal(C.verdict(l).headline,'Todo listo. Buen turno.');
});

test('el veredicto pone por delante lo que impide salir',()=>{
 const bien={state:'ok'},aviso={state:'warn'},fallo={state:'bad'};
 assert.equal(C.verdict([bien,aviso]).tone,'warn');
 assert.equal(C.verdict([bien,aviso]).headline,'Puedes salir, con estas advertencias');
 assert.equal(C.verdict([bien,aviso,fallo]).tone,'bad');
 assert.equal(C.verdict([bien,aviso,fallo]).headline,'Revisa esto antes de salir');
 assert.equal(C.verdict([fallo,fallo]).headline,'Revisa estas 2 cosas antes de salir');
 assert.equal(C.verdict(null).tone,'ok');
});

test('solo espera un toque lo que impide salir; lo demas se quita solo',()=>{
 // La navegacion ya ha arrancado cuando se lee la tarjeta: pedir un toque por una
 // advertencia es pedirselo a alguien que ya esta saliendo.
 assert.ok(C.dwell('ok')>=2000&&C.dwell('ok')<=3500);
 assert.ok(C.dwell('warn')>=5000&&C.dwell('warn')<=8000,'da tiempo a leerlo y se va');
 assert.ok(C.dwell('warn')>C.dwell('ok'),'una advertencia se lee mas despacio');
 assert.equal(C.dwell('bad'),0,'sin ruta o sin permiso hay algo que hacer antes de moverse');
});

test('el chequeo cuenta tambien los avisos que marco quien conduce',()=>{
 assert.equal(C.marksItem(3,5).detail,'3 avisos tuyos en esta ruta.');
 assert.equal(C.marksItem(1,1).detail,'1 aviso tuyo en esta ruta.');
 assert.equal(C.marksItem(0,4).detail,'Ninguno en esta ruta; tienes 4 guardados en otras.');
 assert.match(C.marksItem(0,0).detail,/Ninguno marcado todavía/);
 // No tener avisos propios no es un problema: no debe ensuciar el veredicto.
 assert.equal(C.marksItem(0,0).state,'ok');
 assert.equal(C.marksItem(3,5).state,'ok');
});

test('los avisos propios entran como sexto apartado, al final',()=>{
 const l=C.items({route:{pts:[1,2],name:'R',metres:1000},permission:'granted',
                  voiceSupported:true,voiceEnabled:true,mapRatio:1,online:true,
                  roadState:'ready',vehicleCount:0,profiled:true,marksHere:2,marksTotal:3});
 assert.deepEqual(l.map(i=>i.id),['ruta','gps','voz','mapas','calles','avisos']);
 assert.equal(l[5].detail,'2 avisos tuyos en esta ruta.');
 assert.equal(C.verdict(l).tone,'ok','todo en orden sigue siendo todo en orden');
});

// ---- la pantalla encendida ----
test('si la pantalla queda encendida, se dice y no se preocupa a nadie',()=>{
 const i=C.screenItem('on');
 assert.equal(i.id,'pantalla');assert.equal(i.state,'ok');
});
test('si el movil no deja mantenerla encendida, se avisa y se dice que ajuste tocar',()=>{
 for(const s of ['off','unsupported']){
  const i=C.screenItem(s);
  assert.equal(i.state,'warn',s);
  assert.match(i.detail,/Bloqueo automático en «Nunca»/);
 }
});
test('mientras no se sabe, la pantalla no sale en el chequeo',()=>{
 assert.equal(C.screenItem('pending'),null);
 assert.equal(C.screenItem(undefined),null);
 const base={route:{pts:[1,2],name:'R',metres:1000},permission:'granted',voiceSupported:true,voiceEnabled:true,
  mapRatio:1,online:true,roadState:'ready',vehicleCount:0,profiled:true};
 assert.deepEqual(C.items({...base,screen:'pending'}).map(i=>i.id),['ruta','gps','voz','mapas','calles','avisos']);
 const l=C.items({...base,screen:'off'});
 assert.equal(l.at(-1).id,'pantalla','al final, cuando se sabe');
 assert.equal(C.verdict(l).tone,'warn','sale con advertencia, no se bloquea la salida');
});
