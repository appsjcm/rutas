const test=require('node:test'),assert=require('node:assert/strict');
const V=require('../streetview-core'),N=require('../nav-core');

const PUIG={lat:41.976474,lon:1.873488};

test('el enlace es el formato oficial de Maps URLs, sin clave de ningun tipo',()=>{
 const u=V.url(PUIG,90);
 assert.equal(u,'https://www.google.com/maps/@?api=1&map_action=pano'+
  '&viewpoint=41.976474,1.873488&heading=90&pitch=0&fov=90');
 // Lo que no debe aparecer nunca.
 assert.ok(!/key=|token|client=|signature=/i.test(u),'sin clave ni token');
 assert.ok(u.startsWith('https://'),'siempre por https');
});

test('sin rumbo se abre el punto y Google elige la vista',()=>{
 const u=V.url(PUIG,null);
 assert.equal(u,'https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=41.976474,1.873488');
 assert.equal(V.url(PUIG,NaN).includes('heading'),false);
 assert.equal(V.url(PUIG,undefined).includes('heading'),false);
});

test('las coordenadas van con seis decimales, ni mas ni menos',()=>{
 assert.match(V.url({lat:41.9,lon:1.87},0),/viewpoint=41\.900000,1\.870000/);
 // toFixed redondea sobre el binario: 151.2092955 baja a ...295, no sube a ...296.
 assert.match(V.url({lat:-33.8688197,lon:151.2092955},0),/viewpoint=-33\.868820,151\.209295/);
});

test('una coordenada imposible no genera enlace',()=>{
 assert.equal(V.url({lat:95,lon:1.87},0),null);
 assert.equal(V.url({lat:41.9,lon:200},0),null);
 assert.equal(V.url({lat:'x',lon:1.87},0),null);
 assert.equal(V.url({lat:null,lon:null},0),null,'un punto vacio no son las coordenadas 0,0');
 assert.equal(V.url({lat:'',lon:''},0),null);
 assert.equal(V.url({},0),null);
 assert.equal(V.url(null,0),null);
 assert.equal(V.validPoint({lat:0,lon:0}),true,'el punto cero es valido');
});

test('el rumbo se normaliza al rango que acepta Google',()=>{
 assert.equal(V.normaliseHeading(0),0);
 assert.equal(V.normaliseHeading(359.6),360);
 assert.equal(V.normaliseHeading(-90),270);
 assert.equal(V.normaliseHeading(450),90);
 assert.equal(V.normaliseHeading(null),null);
 assert.equal(V.normaliseHeading('x'),null);
});

test('el siguiente giro es el primero que queda por delante',()=>{
 const giros=[{d:100,label:'a'},{d:500,label:'b'},{d:900,label:'c'}];
 assert.equal(V.nextTurn(giros,0).label,'a');
 assert.equal(V.nextTurn(giros,100).label,'b','el que acabas de pasar no cuenta');
 assert.equal(V.nextTurn(giros,499).label,'b');
 assert.equal(V.nextTurn(giros,901),null,'despues del ultimo no hay siguiente');
 assert.equal(V.nextTurn([],0),null);
 assert.equal(V.nextTurn(null,0),null);
});

test('el orden de la lista no importa: manda la distancia',()=>{
 const desordenados=[{d:900},{d:100},{d:500}];
 assert.equal(V.nextTurn(desordenados,200).d,500);
});

test('la siguiente parada funciona igual y con su propia forma',()=>{
 const paradas=[{d:300,seconds:200},{d:1200,seconds:400}];
 assert.equal(V.nextStop(paradas,0).d,300);
 assert.equal(V.nextStop(paradas,300).d,1200);
 assert.equal(V.nextStop(paradas,1500),null);
 assert.equal(V.nextStop([],0),null);
});

test('una ruta sin giros ni paradas no inventa ninguno',()=>{
 assert.equal(V.nextTurn([],0),null);
 assert.equal(V.nextStop([],0),null);
 assert.equal(V.ahead(undefined,0),null);
});

test('el paseo adelanta un tramo y se acaba al final del recorrido',()=>{
 assert.equal(V.walk(0,1000,150),150);
 assert.equal(V.walk(150,1000,150),300);
 assert.equal(V.walk(900,1000,150),null,'no se pasa del final');
 assert.equal(V.walk(0,100,150),null);
 assert.equal(V.walk(0,0),null);
 assert.equal(V.walk(0,null),null);
 assert.equal(V.walk(0,1000),V.STEP);
});

test('el rumbo sale del propio recorrido, no de un invento',()=>{
 // Recta hacia el norte: el rumbo debe ser 0.
 const norte=N.prepare([{lat:41.9,lon:1.87},{lat:41.91,lon:1.87},{lat:41.92,lon:1.87}]);
 const a=N.at(norte,100),b=N.at(norte,115);
 assert.equal(V.normaliseHeading(N.heading(a,b)),0);
 // Recta hacia el este: 90.
 const este=N.prepare([{lat:41.9,lon:1.87},{lat:41.9,lon:1.88},{lat:41.9,lon:1.89}]);
 assert.equal(V.normaliseHeading(N.heading(N.at(este,100),N.at(este,115))),90);
});

test('una ronda invertida mira hacia donde se circula ahora',()=>{
 const pts=[{lat:41.9,lon:1.87},{lat:41.91,lon:1.87},{lat:41.92,lon:1.87}];
 const alReves=N.prepare(pts.slice().reverse());
 assert.equal(V.normaliseHeading(N.heading(N.at(alReves,100),N.at(alReves,115))),180);
});

test('la vista incrustada lleva punto y rumbo sin compartir la ruta',()=>{
 const u=V.embedUrl(PUIG,90);
 assert.equal(u,'https://maps.google.com/maps?layer=c&cbll=41.976474,1.873488&cbp=11,90,0,0,0&source=embed&output=svembed');
 assert.ok(!/key=|token|track|gpx/i.test(u));
 assert.match(V.embedUrl(PUIG,null),/cbp=11,0,0,0,0/);
 assert.equal(V.embedUrl(null,90),null);
});

test('un toque en el mapa se ajusta al punto más cercano de la ruta',()=>{
 const route=N.prepare([{lat:41.9,lon:1.87},{lat:41.9,lon:1.88},{lat:41.91,lon:1.88}]);
 const hit=V.routePosition(route,{lat:41.9002,lon:1.875});
 assert.ok(hit);
 assert.ok(hit.error<25,'el error se mide en metros');
 assert.ok(Math.abs(hit.point.lat-41.9)<1e-6);
 assert.ok(Math.abs(hit.point.lon-1.875)<1e-6);
 assert.ok(hit.d>400&&hit.d<430,'conserva la posición dentro del recorrido');
});

test('un toque inválido no inventa un punto de la ruta',()=>{
 assert.equal(V.routePosition(null,{lat:41.9,lon:1.87}),null);
 assert.equal(V.routePosition({pts:[],cum:[]},{lat:41.9,lon:1.87}),null);
 assert.equal(V.routePosition({pts:[{},{}],cum:[0,1]},null),null);
});

test('los textos no prometen lo que no se puede saber',()=>{
 assert.match(V.title('current'),/Abrir esta ubicación en Google Maps/);
 assert.ok(!/disponible/i.test(V.title('current')),'no se afirma que haya panoramica');
 assert.equal(V.label('current'),'Calle actual');
 assert.equal(V.label('turn'),'Próximo giro');
 assert.equal(V.label('stop'),'Próxima parada');
 assert.equal(V.label('walk'),'Siguiente vista');
 assert.equal(V.offlineNote(false),'Street View necesita conexión.');
 assert.equal(V.offlineNote(true),'');
});

// ---- tocar cualquier punto del mapa ----
{
 const KX=111320*Math.cos(41.9*Math.PI/180),KY=110540;
 const en=(x,y)=>({lat:41.9+y/KY,lon:1.87+x/KX});
 const ruta=N.prepare([en(0,0),en(500,0),en(500,500)]);

 test('un toque encima de la ruta se ajusta a ella y guarda en que punto cae',()=>{
  const r=V.pick(ruta,en(200,12),30);
  assert.equal(r.onRoute,true);
  assert.ok(Math.abs(r.d-200)<1,'a los 200 m: '+r.d);
  assert.ok(N.distance(r.point,en(200,0))<0.5,'sobre la linea');
 });

 test('un toque lejos de la ruta se abre justo donde se ha tocado',()=>{
  const toque=en(200,120),r=V.pick(ruta,toque,30);
  assert.equal(r.onRoute,false);
  assert.equal(r.d,null);
  assert.deepEqual(r.point,{lat:toque.lat,lon:toque.lon});
 });

 test('el radio de ajuste manda: a mas zoom, hay que tocar mas cerca',()=>{
  const toque=en(300,50);
  assert.equal(V.pick(ruta,toque,60).onRoute,true,'con 60 m de radio, se ajusta');
  assert.equal(V.pick(ruta,toque,40).onRoute,false,'con 40 m, no');
 });

 test('sin ruta, o sin radio, se abre donde se toca; y lo roto no abre nada',()=>{
  const toque=en(10,10);
  assert.equal(V.pick(null,toque,30).onRoute,false);
  assert.equal(V.pick(ruta,toque,0).onRoute,false);
  assert.equal(V.pick(ruta,toque,NaN).onRoute,false);
  assert.equal(V.pick(ruta,{lat:null,lon:2},30),null);
  assert.equal(V.pick(ruta,{lat:95,lon:2},30),null);
 });

 test('de un punto del mapa solo sale hacia Google la coordenada, sin rumbo',()=>{
  const r=V.pick(ruta,en(200,120),30),u=V.url(r.point,null);
  assert.ok(u.includes('viewpoint='+r.point.lat.toFixed(6)+','+r.point.lon.toFixed(6)));
  assert.ok(!/heading=/.test(u),'sin rumbo inventado');
 });
}
