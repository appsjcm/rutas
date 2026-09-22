const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../street-imagery-core');

const P={lat:41.976474,lon:1.873488};
// Desplazamientos comodos: 1e-5 de latitud son ~1,11 m.
const norte=(p,m)=>({lat:p.lat+m/111320,lon:p.lon});
const este=(p,m)=>({lat:p.lat,lon:p.lon+m/(111320*Math.cos(p.lat*Math.PI/180))});
const foto=(o)=>({id:'a',lat:P.lat,lon:P.lon,heading:90,sequenceId:'s1',index:1,
 imageUrl:'x.jpg',capturedAt:'2025-04-02T10:00:00Z',provider:'KartaView',...o});

test('la diferencia angular cruza el cero como debe',()=>{
 assert.equal(S.angleDiff(355,5),10,'355 y 5 estan a 10 grados, no a 350');
 assert.equal(S.angleDiff(5,355),10);
 assert.equal(S.angleDiff(0,180),180);
 assert.equal(S.angleDiff(90,270),180);
 assert.equal(S.angleDiff(10,20),10);
 assert.equal(S.angleDiff(-10,350),0);
 assert.equal(S.angleDiff(null,90),null,'sin rumbo no hay diferencia que medir');
 assert.equal(S.angleDiff(90,undefined),null);
});

test('la distancia se mide en metros y lo invalido queda infinitamente lejos',()=>{
 assert.ok(Math.abs(S.distance(P,norte(P,100))-100)<1);
 assert.ok(Math.abs(S.distance(P,este(P,50))-50)<1);
 assert.equal(S.distance(P,null),Infinity);
 assert.equal(S.distance(P,{lat:'x',lon:1}),Infinity);
});

test('entre dos fotos manda el rumbo, no los metros',()=>{
 // El caso del enunciado: ruta a 90 grados, A mira a 95 y B a 270 pero esta mas cerca.
 const A=foto({id:'A',heading:95,...norte(P,20)});
 const B=foto({id:'B',heading:270,...norte(P,10)});
 assert.equal(S.pick([A,B],P,90,null).id,'A');
});

test('mirando al reves no vale aunque este encima',()=>{
 const contraria=foto({id:'B',heading:270,...norte(P,3)});
 assert.equal(S.usable(contraria,P,90),false,'es la otra mano de la carretera');
 assert.equal(S.pick([contraria],P,90,null),null);
});

test('una foto lejos no es mejor que ninguna foto',()=>{
 const lejos=foto({id:'L',...norte(P,500)});
 assert.equal(S.usable(lejos,P,90),false);
 assert.equal(S.pick([lejos],P,90,null),null,'500 m no es esta calle');
 // El limite se puede mover, pero por defecto es 60 m.
 assert.equal(S.MAX_DIST,60);
 assert.equal(S.usable(foto({...norte(P,55)}),P,90),true);
 assert.equal(S.usable(foto({...norte(P,65)}),P,90),false);
});

test('sin rumbo en la foto no se descarta: no hay con que juzgarla',()=>{
 const sinRumbo=foto({id:'N',heading:null,...norte(P,10)});
 assert.equal(S.usable(sinRumbo,P,90),true);
 assert.equal(S.pick([sinRumbo],P,90,null).id,'N');
});

test('seguir en la misma secuencia desempata, pero no manda sobre todo',()=>{
 const misma=foto({id:'M',sequenceId:'s1',...norte(P,25)});
 const otra=foto({id:'O',sequenceId:'s2',...norte(P,20)});
 // Sin continuidad gana la mas cercana; con ella, la de la secuencia en curso.
 assert.equal(S.pick([misma,otra],P,90,null).id,'O');
 assert.equal(S.pick([misma,otra],P,90,'s1').id,'M');
 // Pero una secuencia en curso no justifica una foto mucho peor.
 const muyLejos=foto({id:'X',sequenceId:'s1',...norte(P,58)});
 assert.equal(S.pick([muyLejos,otra],P,90,'s1').id,'O');
});

test('ida y vuelta por la misma calle se distinguen por el rumbo',()=>{
 const ida=foto({id:'ida',heading:90,...este(P,8)});
 const vuelta=foto({id:'vuelta',heading:270,...este(P,5)});
 assert.equal(S.pick([ida,vuelta],P,90,null).id,'ida');
 assert.equal(S.pick([ida,vuelta],P,270,null).id,'vuelta');
});

test('mientras se siga cerca de la secuencia no hace falta buscar otra',()=>{
 const seq=[foto({id:'1',index:1,...norte(P,0)}),foto({id:'2',index:2,...norte(P,15)}),
            foto({id:'3',index:3,...norte(P,30)})];
 assert.equal(S.bestInSequence(seq,norte(P,14),90).id,'2');
 assert.equal(S.leftSequence(seq,norte(P,14),90),false);
 assert.equal(S.leftSequence(seq,norte(P,400),90),true,'ya no estamos en esa secuencia');
});

test('se puede recorrer la secuencia a mano, sin salirse por los extremos',()=>{
 const seq=[foto({id:'1',index:1}),foto({id:'2',index:2}),foto({id:'3',index:3})];
 assert.equal(S.neighbour(seq,seq[1],1).id,'3');
 assert.equal(S.neighbour(seq,seq[1],-1).id,'1');
 assert.equal(S.neighbour(seq,seq[2],1),null);
 assert.equal(S.neighbour(seq,seq[0],-1),null);
 assert.equal(S.neighbour(seq,null,1),null);
 assert.equal(S.neighbour([],seq[0],1),null);
});

test('la secuencia se ordena por su indice, no por como llegue',()=>{
 const s=S.sortSequence([foto({id:'c',index:3}),foto({id:'a',index:1}),foto({id:'b',index:2})]);
 assert.deepEqual(s.map(p=>p.id),['a','b','c']);
 assert.deepEqual(S.sortSequence(null),[]);
});

test('no se cambia de foto por avanzar dos metros',()=>{
 assert.equal(S.shouldRefresh(null,P),true,'la primera vez siempre');
 assert.equal(S.shouldRefresh(P,norte(P,5)),false);
 assert.equal(S.shouldRefresh(P,norte(P,25)),true);
 assert.equal(S.MIN_MOVE,20);
});

test('se lee una respuesta real de KartaView',()=>{
 const crudo={id:'1947282169',sequence_id:'8857577',sequence_index:'256',
  lat:'41.387293',lng:'2.168229',heading:'243.06',
  name:'storage13/files/photo/2024/5/1/proc/x.jpg',
  lth_name:'storage13/files/photo/2024/5/1/lth/x.jpg',
  th_name:'storage13/files/photo/2024/5/1/th/x.jpg',
  shot_date:'2024-05-01 08:34:21.000',username:'toni-serra',projection:'PLANE'};
 const f=S.fromKartaView(crudo);
 assert.equal(f.id,'kv:1947282169');
 assert.ok(Math.abs(f.lat-41.387293)<1e-6);
 assert.ok(Math.abs(f.lon-2.168229)<1e-6);
 assert.equal(f.heading,243.06);
 assert.equal(f.sequenceId,'8857577');
 assert.equal(f.index,256);
 assert.equal(f.imageUrl,'https://kartaview.org/storage13/files/photo/2024/5/1/lth/x.jpg');
 assert.equal(f.provider,'KartaView');
 assert.match(f.attribution,/toni-serra/);
 assert.match(f.attribution,/CC BY-SA/);
});

test('se lee una respuesta real de Panoramax',()=>{
 const crudo={id:'b4b710c7-d46c-4c81-b85a-0fe3317b849a',
  collection:'6e702976-580b-419c-8fb3-cf7bd364e6f8',
  geometry:{type:'Point',coordinates:[2.16937665,41.38700085]},
  properties:{datetime:'2022-12-03T09:40:58+00:00','view:azimuth':225,
   'geovisio:rank_in_collection':12,'geovisio:producer':'MapComplete',
   license:'CC-BY-SA-4.0'},
  assets:{hd:{href:'https://x/hd.jpg'},sd:{href:'https://x/sd.jpg'},thumb:{href:'https://x/th.jpg'}}};
 const f=S.fromPanoramax(crudo);
 assert.equal(f.id,'px:b4b710c7-d46c-4c81-b85a-0fe3317b849a');
 assert.equal(f.heading,225);
 assert.equal(f.index,12);
 assert.equal(f.sequenceId,'6e702976-580b-419c-8fb3-cf7bd364e6f8');
 assert.equal(f.imageUrl,'https://x/sd.jpg','se prefiere la media, no la enorme');
 assert.equal(f.provider,'Panoramax');
 assert.match(f.attribution,/MapComplete/);
 assert.match(f.attribution,/CC-BY-SA-4\.0/);
});

test('una respuesta rota no produce una foto a medias',()=>{
 assert.equal(S.fromKartaView(null),null);
 assert.equal(S.fromKartaView({id:1,lat:'x',lng:'y'}),null);
 assert.equal(S.fromKartaView({id:1,lat:'41.3',lng:'2.1'}),null,'sin imagen no sirve');
 assert.equal(S.fromPanoramax(null),null);
 assert.equal(S.fromPanoramax({id:1,geometry:null}),null);
 assert.equal(S.fromPanoramax({id:1,geometry:{coordinates:[2,41]},assets:{}}),null);
});

test('los dos proveedores salen con el mismo modelo',()=>{
 const kv=S.fromKartaView({id:'1',lat:'41.3',lng:'2.1',heading:'90',name:'a.jpg'});
 const px=S.fromPanoramax({id:'2',geometry:{coordinates:[2.1,41.3]},
  properties:{'view:azimuth':90},assets:{sd:{href:'b.jpg'}}});
 const claves=o=>Object.keys(o).sort().join(',');
 assert.equal(claves(kv),claves(px),'el resto de la app no debe notar la diferencia');
});

test('la caja que se manda al proveedor es pequeña y solo lleva el punto',()=>{
 const b=S.bbox(P,60);
 assert.equal(b.length,4);
 const [oeste,sur,esteB,norteB]=b;
 assert.ok(oeste<P.lon&&esteB>P.lon&&sur<P.lat&&norteB>P.lat);
 // Unos 120 m de lado: nada que permita reconstruir un recorrido.
 assert.ok(S.distance({lat:sur,lon:oeste},{lat:norteB,lon:oeste})<130);
 assert.equal(S.bbox(null,60),null);
 assert.equal(S.bbox({lat:'x',lon:1},60),null);
});

test('el pie de foto dice el proveedor, la distancia y el año',()=>{
 const f=foto({...norte(P,14),capturedAt:'2025-04-02T10:00:00Z'});
 assert.equal(S.caption(f,P),'KartaView · imagen a 14 m · 2025');
 assert.equal(S.caption(foto({capturedAt:null}),P),'KartaView · imagen a 0 m');
 assert.equal(S.caption(null,P),'');
});

test('los estados son frases, no errores tecnicos',()=>{
 assert.equal(S.status('searching'),'Buscando imágenes de calle…');
 assert.equal(S.status('none'),'Sin imágenes de calle en este tramo');
 assert.equal(S.status('offline'),'Vista de calle necesita conexión');
 assert.ok(!/error|fetch|4\d\d|5\d\d/i.test(S.status('none')));
});

test('la cache no crece sin limite',()=>{
 const m=new Map();
 for(let i=0;i<40;i++)m.set('k'+i,i);
 S.trim(m,10);
 assert.equal(m.size,10);
 assert.equal(m.has('k39'),true,'se queda lo ultimo');
 assert.equal(m.has('k0'),false,'se suelta lo viejo');
 S.trim(null,10);
});

test('sin candidatos no se inventa ninguno',()=>{
 assert.equal(S.pick([],P,90,null),null);
 assert.equal(S.pick(null,P,90,null),null);
 assert.equal(S.bestInSequence(null,P,90),null);
 assert.equal(S.leftSequence([],P,90),true);
});
