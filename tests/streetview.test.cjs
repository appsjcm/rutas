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
