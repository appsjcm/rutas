const test=require('node:test'),assert=require('node:assert/strict'),S=require('../street-match-core');
function encode(points){let lastLat=0,lastLon=0,out='';const value=n=>{n=n<0?~(n<<1):n<<1;let s='';while(n>=32){s+=String.fromCharCode((32|n&31)+63);n>>>=5;}return s+String.fromCharCode(n+63);};for(const p of points){const lat=Math.round(p.lat*1e6),lon=Math.round(p.lon*1e6);out+=value(lat-lastLat)+value(lon-lastLon);lastLat=lat;lastLon=lon;}return out;}
const metros=(x,y)=>Math.hypot(x.lat-y.lat,x.lon-y.lon)*100000;
test('decodifica la geometría vial de Valhalla',()=>{const pts=[{lat:41.97697,lon:1.87303},{lat:41.97731,lon:1.87355},{lat:41.978,lon:1.874}];const back=S.decode(encode(pts));assert.equal(back.length,3);assert(Math.abs(back[1].lat-pts[1].lat)<1e-6);assert(Math.abs(back[1].lon-pts[1].lon)<1e-6);});
test('une patas sin duplicar el punto compartido',()=>{const a=[{lat:41,lon:2},{lat:41.001,lon:2}],b=[a[1],{lat:41.002,lon:2.001}],data={trip:{legs:[{shape:encode(a)},{shape:encode(b)}]}};assert.deepEqual(S.extract(data),[a[0],a[1],b[1]]);});
test('separa la geometría de cada pata de la respuesta',()=>{const a=[{lat:41,lon:2},{lat:41.001,lon:2}],b=[{lat:41.002,lon:2},{lat:41.003,lon:2}],data={trip:{legs:[{shape:encode(a)},{shape:encode(b)}]}};const out=S.legs(data);assert.equal(out.length,2);assert.equal(out[0].length,2);assert(Math.abs(out[1][0].lat-b[0].lat)<1e-6);assert.throws(()=>S.legs({trip:{legs:[]}}));});
test('limita una traza grande conservando sus extremos',()=>{const pts=Array.from({length:5000},(_,i)=>({lat:41+i/1e6,lon:2}));const out=S.input(pts,p=>p,1800);assert.equal(out.length,1800);assert.deepEqual(out[0],pts[0]);assert.deepEqual(out.at(-1),pts.at(-1));});
test('divide recorridos largos solapando el punto de unión',()=>{const pts=Array.from({length:250},(_,i)=>({lat:41+i/1e5,lon:2})),chunks=S.chunks(pts,120);assert.deepEqual(chunks.map(x=>x.length),[120,120,12]);assert.equal(chunks[0].at(-1),chunks[1][0]);assert.equal(chunks[1].at(-1),chunks[2][0]);assert.equal(S.merge(chunks).length,250);});
test('calcula qué parte del GPX queda cerca del trazado vial',()=>{const road=[{lat:41,lon:2},{lat:41.01,lon:2}],near=[{lat:41.001,lon:2.0001},{lat:41.005,lon:2},{lat:41.009,lon:1.9999}],far=near.map(p=>({...p,lon:p.lon+.02}));assert.equal(S.coverage(near,road),100);assert.equal(S.coverage(far,road),0);});
test('una recta larga dentro de una pata no es un corte',()=>{const recta=[{lat:41,lon:2},{lat:41,lon:2.005}];assert.equal(S.joins([recta],metros).length,0);const {path,breaks}=S.assemble([recta],null,metros);assert.equal(breaks.length,0);assert.deepEqual(path,recta);});
test('la unión entre dos patas separadas sí es un corte',()=>{const a=[{lat:41,lon:2},{lat:41,lon:2.001}],b=[{lat:41,lon:2.01},{lat:41,lon:2.011}];const cortes=S.joins([a,b],metros);assert.equal(cortes.length,1);assert.equal(cortes[0].leg,1);assert.equal(Math.round(cortes[0].metres),900);assert.equal(S.joins([a,b],metros,1000).length,0);});
test('con enlace se intercala y sin enlace se anota la interrupción',()=>{const a=[{lat:41,lon:2},{lat:41,lon:2.001}],b=[{lat:41,lon:2.01},{lat:41,lon:2.011}];const enlace=[{lat:41,lon:2.001},{lat:41.0005,lon:2.005},{lat:41,lon:2.01}];const unido=S.assemble([a,b],new Map([[1,enlace]]),metros);assert.equal(unido.breaks.length,0);assert.equal(unido.path.length,5);const roto=S.assemble([a,b],null,metros);assert.deepEqual(roto.breaks,[2]);const piezas=S.split(roto.path,roto.breaks);assert.equal(piezas.length,2);assert.deepEqual(piezas[0],a);assert.deepEqual(piezas[1],b);});
test('agrupa los cortes para pedirlos de pocas veces',()=>{const list=Array.from({length:45},(_,i)=>i);assert.deepEqual(S.batches(list,20).map(x=>x.length),[20,20,5]);});
test('mide la longitud de un trazado',()=>{const recta=[{lat:41,lon:2},{lat:41,lon:2.001},{lat:41,lon:2.002}];assert.equal(Math.round(S.length(recta,metros)),200);assert.equal(S.length([],metros),0);assert.equal(S.length(recta,null),0);});
test('un trazado que pierde kilometros no sirve para navegar',()=>{
 // el caso real: cobertura alta pero la mitad de los kilometros, porque se colapsaron las pasadas
 assert.equal(S.usable(12280,26350).ok,false);
 assert.equal(S.usable(12280,26350).pct,47);
 assert.equal(S.usable(22970,26350).ok,true);
 assert.equal(S.usable(22970,26350).pct,87);
 assert.equal(S.usable(26350,26350).ok,true);
 assert.equal(S.usable(0,0).ok,false);
 assert.equal(S.usable(100,0).ok,false);});
test('lee las patas del servicio de reserva',()=>{const a=[{lat:41,lon:2},{lat:41.001,lon:2}],b=[{lat:41.01,lon:2},{lat:41.011,lon:2}];
 const data={code:'Ok',matchings:[{geometry:encode(a)},{geometry:encode(b)}]};
 const out=S.osrmLegs(data);
 assert.equal(out.length,2);assert(Math.abs(out[1][0].lat-b[0].lat)<1e-6);
 // cada matching es un trozo continuo: el corte esta entre ellos, y joins lo ve
 assert.equal(S.joins(out,metros).length,1);
 for(const mal of [null,{code:'NoMatch',message:'sin calles'},{code:'Ok',matchings:[]},{code:'Ok',matchings:[{}]}])assert.throws(()=>S.osrmLegs(mal));});
test('lee un enlace del servicio de reserva',()=>{const linea=[{lat:41,lon:2},{lat:41.002,lon:2.001}];
 assert.equal(S.osrmRoute({code:'Ok',routes:[{geometry:encode(linea)}]}).length,2);
 for(const mal of [null,{code:'Ok',routes:[]},{code:'Ok',routes:[{}]},{code:'NoRoute'}])assert.throws(()=>S.osrmRoute(mal));});

