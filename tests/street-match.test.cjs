const test=require('node:test'),assert=require('node:assert/strict'),S=require('../street-match-core');
function encode(points){let lastLat=0,lastLon=0,out='';const value=n=>{n=n<0?~(n<<1):n<<1;let s='';while(n>=32){s+=String.fromCharCode((32|n&31)+63);n>>>=5;}return s+String.fromCharCode(n+63);};for(const p of points){const lat=Math.round(p.lat*1e6),lon=Math.round(p.lon*1e6);out+=value(lat-lastLat)+value(lon-lastLon);lastLat=lat;lastLon=lon;}return out;}
const metros=(x,y)=>Math.hypot(x.lat-y.lat,x.lon-y.lon)*100000;
test('decodifica la geometría vial de Valhalla',()=>{const pts=[{lat:41.97697,lon:1.87303},{lat:41.97731,lon:1.87355},{lat:41.978,lon:1.874}];const back=S.decode(encode(pts));assert.equal(back.length,3);assert(Math.abs(back[1].lat-pts[1].lat)<1e-6);assert(Math.abs(back[1].lon-pts[1].lon)<1e-6);});
test('une patas sin duplicar el punto compartido',()=>{const a=[{lat:41,lon:2},{lat:41.001,lon:2}],b=[a[1],{lat:41.002,lon:2.001}],data={trip:{legs:[{shape:encode(a)},{shape:encode(b)}]}};assert.deepEqual(S.extract(data),[a[0],a[1],b[1]]);});
test('separa la geometría de cada pata de la respuesta',()=>{const a=[{lat:41,lon:2},{lat:41.001,lon:2}],b=[{lat:41.002,lon:2},{lat:41.003,lon:2}],data={trip:{legs:[{shape:encode(a)},{shape:encode(b)}]}};const out=S.legs(data);assert.equal(out.length,2);assert.equal(out[0].length,2);assert(Math.abs(out[1][0].lat-b[0].lat)<1e-6);assert.throws(()=>S.legs({trip:{legs:[]}}));});
test('conserva las maniobras viales y la salida real de una rotonda',()=>{
 const pts=[{lat:41,lon:2},{lat:41.001,lon:2.001},{lat:41.002,lon:2.002}];
 const data={trip:{legs:[{shape:encode(pts),maneuvers:[
  {type:26,begin_shape_index:1,roundabout_exit_count:3,street_names:['C-16'],instruction:'Enter the roundabout'},
  {type:10,begin_shape_index:2,begin_street_names:['Carrer Major']}
 ]}]}};
 const [leg]=S.guidedLegs(data);
 assert.equal(leg.path.length,3);assert.equal(leg.maneuvers.length,2);
 assert.equal(leg.maneuvers[0].label,'En la rotonda, toma la salida 3');
 assert.equal(leg.maneuvers[0].symbol,'⟲');assert.equal(leg.maneuvers[0].roundaboutExit,3);assert.equal(leg.maneuvers[0].toRoad,'C-16');
 assert.deepEqual(leg.maneuvers[0].point,leg.path[1]);
 assert.equal(leg.maneuvers[1].toRoad,'Carrer Major');
});
test('coloca las maniobras en orden sobre el camino final',()=>{
 const path=[{lat:41,lon:2},{lat:41,lon:2.001},{lat:41,lon:2},{lat:41,lon:1.999}];
 const values=[
  {...S.roadManeuver({type:10,street_names:['Primera']}),point:{lat:41,lon:2.001}},
  {...S.roadManeuver({type:15,street_names:['Segunda']}),point:{lat:41,lon:2}}
 ];
 const out=S.placeManeuvers(values,path,metros);
 assert.equal(out.length,2);assert.equal(Math.round(out[0].d),100);assert.equal(Math.round(out[1].d),200);
 assert.equal(out[1].toRoad,'Segunda');assert.equal('point' in out[0],false);
});
test('actualiza las rotondas guardadas sin repetir el reconocimiento',()=>{
 const out=S.upgradeManeuvers([{type:26,label:'En la rotonda, toma la salida 4',symbol:'⟳'},{type:27,label:'Sal de la rotonda',symbol:'⟳'},{type:10,label:'Giro'}]);
 assert.equal(out[0].symbol,'⟲');assert.equal(out[0].roundaboutExit,4);
 assert.equal(out[1].symbol,'↗');assert.equal(out[1].roundaboutExit,null);
 assert.equal(out[2].label,'Giro');
});
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

// ---- apart: donde se aparta el trazado por calles del GPX ----
const NC=require('../nav-core');
const KXa=111320*Math.cos(41.9*Math.PI/180),KYa=110540;
const en=(x,y)=>({lat:41.9+y/KYa,lon:1.87+x/KXa});
// GPX recto hacia el este, un punto cada 10 m.
const recto=(desde,hasta,y=0,paso=10)=>{const l=[];for(let x=desde;x<=hasta;x+=paso)l.push(en(x,y));return l;};

test('un trazado que sigue el GPX no se aparta',()=>{
 const gpx=recto(0,2000),r=S.apart(gpx,recto(0,2000,8,25),NC.distance);
 assert.equal(r.ok,true);assert.equal(r.pct,100);assert.deepEqual(r.tramos,[]);assert.equal(S.apartText(r),'');
});

test('un callejon sin salida que el trazado se salta se detecta',()=>{
 // El GPX entra 200 m en un callejon a los 1000 m y vuelve; el trazado sigue recto.
 const gpx=[...recto(0,1000),...Array.from({length:20},(_,i)=>en(1000,(i+1)*10)),...Array.from({length:20},(_,i)=>en(1000,190-i*10)),...recto(1010,2000)];
 const r=S.apart(gpx,recto(0,2000),NC.distance);
 assert.equal(r.ok,false);
 assert.equal(r.tramos.length,1);
 // Fuera quedan los puntos a mas de 45 m: de 50 a 200 y vuelta, unos 300 m de GPX.
 assert.ok(r.mayor>250&&r.mayor<320,'tramo de '+r.mayor);
 assert.ok(r.pct>=80,'el resto si esta cerca: '+r.pct);
 assert.match(S.apartText(r),/se salta un tramo de tu GPX de (29\d|30\d) m, en el km 1,[01]\./);
});

test('un trazado que va por otro sitio dice cuanto se aparta',()=>{
 const r=S.apart(recto(0,3000),recto(0,3000,300),NC.distance);
 assert.equal(r.ok,false);assert.equal(r.pct,0);
 assert.match(S.apartText(r),/se salta un tramo de tu GPX de 3,0 km, en el km 0,0\. Solo el 0 % de tu GPX queda a menos de 45 m de él\./);
});

test('muchos desvios cortos tambien cuentan, por el porcentaje',()=>{
 // Cada 200 m, 60 m del GPX a 60 m del trazado: ninguno pasa de 100 m, pero suman el 30 %.
 const gpx=[];for(let x=0;x<=4000;x+=10)gpx.push(en(x,(x%200)<60?60:0));
 const r=S.apart(gpx,recto(0,4000),NC.distance);
 assert.ok(r.mayor<=S.MAX_APARTE,'ningun tramo largo: '+r.mayor);
 assert.equal(r.ok,false);assert.ok(r.pct<S.MIN_CERCA);
 assert.match(S.apartText(r),/^Solo el \d+ % de tu GPX/);
});

test('un GPX con pocos puntos que corta las curvas no se da por apartado',()=>{
 // Un punto cada 500 m sobre una curva cerrada: las rectas entre ellos se separan de la
 // carretera mas de 45 m, pero los puntos estan en ella.
 const curva=[];for(let a=0;a<=Math.PI;a+=Math.PI/200)curva.push(en(Math.cos(a)*1000,Math.sin(a)*1000));
 const escaso=curva.filter((_,i)=>i%25===0);
 assert.ok(NC.distance(escaso[0],escaso[1])>300);
 assert.equal(S.apart(escaso,curva,NC.distance).ok,true);
});

test('lo que cuenta son los metros recorridos, no los puntos grabados parado',()=>{
 // 300 puntos en el mismo sitio, lejos del trazado (el camion parado en un patio), y 2 km bien.
 const gpx=[...recto(0,1000),...Array.from({length:300},()=>en(1000,80)),...recto(1000,2000)];
 const r=S.apart(gpx,recto(0,2000),NC.distance);
 assert.ok(r.pct>=95,'pct '+r.pct);
});

test('apart no se rompe con entradas raras',()=>{
 const vacio={pct:0,tramos:[],mayor:0,ok:false};
 assert.deepEqual(S.apart(null,recto(0,100),NC.distance),vacio);
 assert.deepEqual(S.apart(recto(0,100),[en(0,0)],NC.distance),vacio);
 assert.deepEqual(S.apart(recto(0,100),recto(0,100),null),vacio);
 assert.deepEqual(S.apart(recto(0,100),[{lat:NaN,lon:1},{lat:NaN,lon:2}],NC.distance),vacio);
 assert.equal(S.apart([...recto(0,100),{lat:NaN,lon:NaN},...recto(110,200)],recto(0,200),NC.distance).ok,true);
 assert.equal(S.apartText(null),'');
});
