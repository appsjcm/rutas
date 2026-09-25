const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../restrictions-core'),N=require('../nav-core');

// Recta hacia el este de ~n km, un punto cada 50 m.
function recta(km,lat=41.9,lon=1.87){
 const pts=[];const paso=50/(111320*Math.cos(lat*Math.PI/180));
 for(let i=0;i<=km*20;i++)pts.push({lat,lon:lon+i*paso});
 return N.prepare(pts);
}

test('una ruta corta cabe en una sola caja',()=>{
 const b=R.corridor(recta(1));
 assert.equal(b.length,1);
 assert.equal(b[0].length,4);
 assert.ok(b[0][0]<b[0][2]&&b[0][1]<b[0][3],'sur < norte y oeste < este');
});

test('una ruta larga se parte en cajas de unos 2 km',()=>{
 const b=R.corridor(recta(20));
 assert.equal(R.TRAMO,2000);
 assert.ok(b.length>=10&&b.length<=11,'20 km son 10 u 11 cajas, no '+b.length);
});

test('las cajas llevan margen alrededor del trazado',()=>{
 const r=recta(1),b=R.corridor(r)[0];
 const lat=r.pts[0].lat;
 const margenSur=(lat-b[0])*110540, margenNorte=(b[2]-lat)*110540;
 assert.ok(Math.abs(margenSur-R.MARGEN)<2,'margen sur '+margenSur);
 assert.ok(Math.abs(margenNorte-R.MARGEN)<2,'margen norte '+margenNorte);
});

test('las cajas seguidas se tocan: no queda un trozo sin pedir',()=>{
 const b=R.corridor(recta(8));
 for(let i=1;i<b.length;i++)
  assert.ok(b[i][1]<=b[i-1][3],'la caja '+i+' empieza antes de que acabe la anterior');
});

test('un salto largo entre dos puntos no deja el tramo fuera',()=>{
 // Dos puntos separados 5 km, sin nada en medio: el segmento tiene que quedar dentro.
 const r=N.prepare([{lat:41.9,lon:1.87},{lat:41.9,lon:1.93},{lat:41.9,lon:1.94}]);
 const b=R.corridor(r);
 const cubre=lon=>b.some(x=>lon>=x[1]&&lon<=x[3]);
 for(let lon=1.87;lon<=1.94;lon+=0.005)assert.ok(cubre(lon),'lon '+lon.toFixed(3)+' fuera');
});

test('la superficie de una ronda larga se queda muy por debajo del rectangulo que la envuelve',()=>{
 // Una ronda en forma de L: 20 km al este y 20 al norte. El rectangulo seria 20x20 km.
 const pts=[];const lat=41.9,lon=1.87,dLo=50/(111320*Math.cos(lat*Math.PI/180)),dLa=50/110540;
 for(let i=0;i<=400;i++)pts.push({lat,lon:lon+i*dLo});
 for(let i=1;i<=400;i++)pts.push({lat:lat+i*dLa,lon:lon+400*dLo});
 const r=N.prepare(pts),area=R.corridorArea(R.corridor(r));
 assert.ok(area<20e6,'pasillo '+Math.round(area/1e6)+' km2, no los 400 del rectangulo');
 assert.ok(area>0);
});

test('la consulta lleva una caja por tramo y nada mas',()=>{
 const b=R.corridor(recta(5));
 const q=R.corridorQuery(b,60);
 assert.match(q,/^\[out:json\]\[timeout:60\];\(/);
 assert.match(q,/\);out tags geom;$/);
 assert.equal((q.match(/way\["highway"\]\(/g)||[]).length,b.length);
 // Solo los filtros que ya se usaban: highway y la caja. Ningun parametro inventado.
 assert.ok(!/around|poly|key=|token/i.test(q));
});

test('sin ruta no se inventa una zona',()=>{
 assert.deepEqual(R.corridor(null),[]);
 assert.deepEqual(R.corridor({pts:[],cum:[]}),[]);
 assert.deepEqual(R.corridor({pts:[{lat:41.9,lon:1.87}],cum:[0]}),[]);
 assert.equal(R.corridorQuery([]),'');
 assert.equal(R.corridorArea(null),0);
 assert.equal(R.corridorArea([[1,2,3]]),0,'una caja mal formada no suma');
});

test('un punto roto no rompe las cajas',()=>{
 const r=N.prepare([{lat:41.9,lon:1.87},{lat:41.9,lon:1.88},{lat:41.9,lon:1.89}]);
 r.pts[1]={lat:NaN,lon:NaN};
 const b=R.corridor(r);
 assert.equal(b.length,1);
 assert.ok(b[0].every(Number.isFinite));
});

// ---- solo se cambia el rectangulo por el pasillo cuando compra algo ----
// Un rectangulo dice donde esta la zona; la cadena de cajas deja ver por donde pasa la ronda.

test('una ronda urbana sigue pidiendo un solo rectangulo, como siempre',()=>{
 const z=R.zone(recta(3));
 assert.equal(z.tipo,'rectangulo');
 assert.equal(z.boxes.length,1);
});

test('una ronda larga pasa al pasillo, que es cuando el rectangulo fallaba',()=>{
 // En forma de L, 20 + 20 km: el rectangulo seria de 400 km2.
 const pts=[];const lat=41.9,lon=1.87,dLo=50/(111320*Math.cos(lat*Math.PI/180)),dLa=50/110540;
 for(let i=0;i<=400;i++)pts.push({lat,lon:lon+i*dLo});
 for(let i=1;i<=400;i++)pts.push({lat:lat+i*dLa,lon:lon+400*dLo});
 const z=R.zone(N.prepare(pts));
 assert.equal(z.tipo,'pasillo');
 assert.ok(z.boxes.length>10);
});

test('el limite entre los dos esta en 25 km2',()=>{
 assert.equal(R.RECTANGULO_MAX,25e6);
 // Una recta larga tiene un rectangulo estrecho: cabe aunque mida muchos km.
 assert.equal(R.zone(recta(30)).tipo,'rectangulo','30 km en linea recta son un rectangulo fino');
});

test('sin ruta no hay zona que pedir',()=>{
 assert.deepEqual(R.zone(null),{tipo:'ninguna',boxes:[]});
 assert.equal(R.envelope(null),null);
});
