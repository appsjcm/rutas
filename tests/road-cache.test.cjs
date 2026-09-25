const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../restrictions-core'),N=require('../nav-core'),S=require('../route-store-core');

// Lo que se guarda de una consulta de calles: solo las vias cerca de la ruta, en formato
// compacto. Lo que importa es que el comprobador diga exactamente lo mismo con lo guardado
// que con la respuesta entera de Overpass.

const LAT=41.9,KX=111320*Math.cos(LAT*Math.PI/180),KY=110540;
const siete=x=>+x.toFixed(7);                    // OpenStreetMap trae 7 decimales
// Un punto a (este, norte) metros del origen.
const en=(x,y,lat0=LAT,lon0=1.87)=>({lat:siete(lat0+y/KY),lon:siete(lon0+x/KX)});
const via=(id,tags,geometry)=>({type:'way',id,tags:{highway:'residential',...tags},geometry});
// Recorrido en L: 600 m al este, 400 m al norte y 300 m al este otra vez, un punto cada 20 m.
function ele(){
 const pts=[];
 for(let x=0;x<=600;x+=20)pts.push(en(x,0));
 for(let y=20;y<=400;y+=20)pts.push(en(600,y));
 for(let x=620;x<=900;x+=20)pts.push(en(x,400));
 return pts;
}
function calles(){
 return [
  via(1,{name:'Carrer Major',oneway:'-1'},[en(-50,0),en(300,0),en(650,0)]),     // el recorrido va al reves
  via(2,{name:'Carrer Paral·lel'},[en(0,12),en(600,12)]),                        // a 12 m: duda entre dos
  via(3,{name:'Carrer de Dalt'},[en(0,30),en(600,30)]),                          // a 30 m: no se usa, se guarda
  via(4,{name:'Avinguda',maxheight:'3'},[en(600,-30),en(600,200),en(600,450)]),  // altura maxima
  via(5,{name:'Travessera'},[en(300,-200),en(300,200)]),                         // cruza el recorrido
  via(6,{name:'Carrer Lluny'},[en(0,200),en(500,200)]),                          // a 200 m: fuera
  via(7,{name:'Carretera'},[en(3000,3000),en(4000,3000)]),                       // a kilometros: fuera
  {type:'way',id:8,tags:{building:'yes'},geometry:[en(100,2),en(120,2)]},        // no es una calle
  via(9,{name:'Un punt'},[en(200,0)]),                                           // sin tramos
  via(10,{name:'Carrer Final',oneway:'yes'},[en(600,400),en(950,400)])
 ];
}

test('se guardan las vias cerca de la ruta y se descartan las lejanas',()=>{
 const ids=R.nearRoute(ele(),calles()).map(w=>w.id);
 assert.deepEqual(ids,[1,2,3,4,5,10]);
});

test('el margen de lo guardado cubre de sobra lo que mira el comprobador',()=>{
 // analyze y roadContext miran vias a 16 m y las muestras de nearRoute van cada 5 m.
 assert.ok(R.CERCA_RUTA>=16+2.5+10,'margen '+R.CERCA_RUTA);
});

test('una via justo dentro del margen se guarda y una justo fuera no',()=>{
 const pts=ele();
 const dentro=via(20,{},[en(100,R.CERCA_RUTA-1),en(200,R.CERCA_RUTA-1)]);
 const fuera=via(21,{},[en(100,-(R.CERCA_RUTA+1)),en(200,-(R.CERCA_RUTA+1))]);
 assert.deepEqual(R.nearRoute(pts,[dentro,fuera]).map(w=>w.id),[20]);
});

test('una via larga que solo roza la ruta en un extremo se guarda entera',()=>{
 const larga=via(30,{},[en(100,10),en(100,3000),en(5000,3000)]);
 const [w]=R.nearRoute(ele(),[larga]);
 assert.equal(w,larga,'el mismo objeto, sin recortar');
});

test('entradas raras no rompen nada',()=>{
 assert.deepEqual(R.nearRoute(null,calles()),[]);
 assert.deepEqual(R.nearRoute([en(0,0)],calles()),[]);
 assert.deepEqual(R.nearRoute(ele(),null),[]);
 assert.deepEqual(R.nearRoute(ele(),[null,{type:'node',id:1},{type:'way',id:2,tags:{highway:'x'}},
  via(3,{},[{lat:NaN,lon:1},en(0,0)])]),[]);
 // Todos los puntos iguales: la ruta no mide nada.
 assert.deepEqual(R.nearRoute([en(0,0),en(0,0)],calles()),[]);
});

// Lo que devuelve el comprobador, sin los objetos de la via -que tras guardarse son copias-.
function informe(pts,elementos,perfil){
 const r=N.prepare(pts),giros=N.turns(r);
 return JSON.stringify({a:R.analyze(pts,elementos,perfil),c:R.roadContext(pts,elementos),g:R.enrichTurns(r,giros,elementos)});
}
function guardaYRecupera(pts,elementos){
 const guardado=JSON.stringify(S.packRoads({elements:R.nearRoute(pts,elementos)}));
 return S.unpackRoads(JSON.parse(guardado)).elements;
}

test('con lo guardado el comprobador dice exactamente lo mismo',()=>{
 const pts=ele(),todo=calles(),perfil={height:3.5};
 const completo=informe(pts,todo,perfil);
 assert.equal(informe(pts,guardaYRecupera(pts,todo),perfil),completo);
 // Y el caso tiene chicha: hay contramano, duda, altura y nombres de calle.
 const a=R.analyze(pts,todo,perfil),kinds=new Set(a.issues.map(i=>i.kind));
 assert.ok(kinds.has('opposed')||kinds.has('ambiguous'),'sentido: '+[...kinds]);
 assert.ok(kinds.has('height'),'altura: '+[...kinds]);
 assert.ok(R.roadContext(pts,todo).some(r=>r.name==='Carrer Final'));
});

// Numeros pseudoaleatorios con semilla, para que la prueba siempre sea la misma.
function azar(semilla){let a=semilla>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}

test('con cientos de calles al azar alrededor, el resultado tambien es identico',()=>{
 for(const semilla of [1,2,3]){
  const r=azar(semilla),pts=[];let x=0,y=0,rumbo=0;
  for(let i=0;i<300;i++){rumbo+=(r()-.5)*.6;x+=15*Math.cos(rumbo);y+=15*Math.sin(rumbo);pts.push(en(x,y));}
  const ruta=N.prepare(pts),todo=[];
  const TAGS=[{oneway:'yes'},{oneway:'-1'},{oneway:'no'},{maxheight:'3.2'},{maxweight:'7'},{access:'private'},{},{junction:'roundabout'}];
  for(let id=1;id<=400;id++){
   const d=r()*ruta.total,c=N.at(ruta,d),c2=N.at(ruta,Math.min(ruta.total,d+10));
   const h=Math.atan2((c2.lat-c.lat)*KY,(c2.lon-c.lon)*KX);
   // La mitad, calles paralelas a la ruta a entre 0 y 70 m; la otra mitad, en cualquier sentido.
   const paralela=r()<.5,lejos=paralela?(r()-.5)*140:(r()-.5)*400,giro=paralela?h:r()*Math.PI*2;
   let px=(c.lon-1.87)*KX-Math.sin(h)*lejos,py=(c.lat-LAT)*KY+Math.cos(h)*lejos;const g=[en(px,py)];
   for(let k=1+Math.floor(r()*4);k>0;k--){const l=10+r()*80;px+=l*Math.cos(giro);py+=l*Math.sin(giro);g.push(en(px,py));}
   todo.push(via(id,{name:'Calle '+id,...TAGS[id%TAGS.length]},g));
  }
  const perfil={height:3.5,weight:12};
  const guardado=guardaYRecupera(pts,todo);
  assert.ok(guardado.length<todo.length,'algo se descarta ('+guardado.length+' de '+todo.length+')');
  assert.ok(R.analyze(pts,todo,perfil).issues.length>0,'semilla '+semilla+' sin avisos: la prueba no probaria nada');
  assert.equal(informe(pts,guardado,perfil),informe(pts,todo,perfil),'semilla '+semilla);
 }
});

test('el formato compacto devuelve las vias exactamente iguales',()=>{
 const datos={elements:[
  {type:'way',id:123456789012,bounds:{minlat:1,minlon:2,maxlat:3,maxlon:4},tags:{highway:'primary',name:'Ctra. de Berga','maxspeed:hgv':'70'},
   geometry:[{lat:41.9744390,lon:1.8706510},{lat:41.9744391,lon:1.8706509},{lat:-33.8688197,lon:151.2092955}]},
  {type:'way',id:2,tags:{highway:'service'},geometry:[{lat:40.4167754,lon:-3.7037902},{lat:40.4167754,lon:0.0000001},{lat:0,lon:-0.0000001}]},
  {type:'way',id:3,geometry:[]}
 ],osm3s:{timestamp_osm_base:'2026-09-25T12:09:21Z',copyright:'ODbL'}};
 const vuelta=S.unpackRoads(JSON.parse(JSON.stringify(S.packRoads(datos))));
 assert.deepEqual(vuelta.osm3s,datos.osm3s);
 assert.equal(vuelta.elements.length,3);
 datos.elements.forEach((w,i)=>{
  const v=vuelta.elements[i];
  assert.equal(v.type,'way');assert.equal(v.id,w.id);
  assert.deepEqual(v.tags,w.tags||{});
  assert.deepEqual(v.geometry,w.geometry,'via '+w.id);
  assert.equal(v.bounds,undefined,'el recuadro no se guarda');
 });
});

test('el formato compacto ocupa mucho menos que la respuesta de Overpass',()=>{
 const w=[];for(let i=0;i<100;i++){const g=[];for(let k=0;k<30;k++)g.push(en(i*10+k*7,k*9));w.push(via(i+1,{},g));}
 const antes=JSON.stringify({elements:w}).length,despues=JSON.stringify(S.packRoads({elements:w})).length;
 assert.ok(despues*3<antes,antes+' -> '+despues);
});

test('se ignora lo que no es una via con geometria',()=>{
 const o=S.packRoads({elements:[null,{type:'node',id:1,lat:1,lon:2},{type:'way',id:1.5,geometry:[]},{type:'way',id:4},via(5,{},[en(0,0),en(10,0)])]});
 assert.deepEqual(o.ways.map(r=>r[0]),[5]);
 assert.deepEqual(S.packRoads(null),{v:2,ways:[]});
});

test('lo guardado roto se rechaza en vez de dar calles falsas',()=>{
 const bueno=S.packRoads({elements:[via(5,{},[en(0,0),en(10,0),en(20,5)])]});
 const con=(cambio)=>{const o=JSON.parse(JSON.stringify(bueno));cambio(o);return o;};
 assert.throws(()=>S.unpackRoads(null));
 assert.throws(()=>S.unpackRoads(con(o=>{delete o.v;})));
 assert.throws(()=>S.unpackRoads(con(o=>{o.ways[0][3]=o.ways[0][3].slice(0,-2);})),/incompleta|mas|invalid/i);
 assert.throws(()=>S.unpackRoads(con(o=>{o.ways[0][3]+='?';})));
 assert.throws(()=>S.unpackRoads(con(o=>{o.ways[0][2]=2;})),/de mas/);
 assert.throws(()=>S.unpackRoads(con(o=>{o.ways[0]=[5,{},1];})));
 assert.throws(()=>S.unpackRoads(con(o=>{o.ways[0][3]=' '+o.ways[0][3];})),/invalid/i);
 assert.doesNotThrow(()=>S.unpackRoads(bueno));
});
