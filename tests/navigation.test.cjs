const test=require('node:test'),assert=require('node:assert/strict'),N=require('../nav-core');
test('interpolación y límites del recorrido',()=>{const r=N.prepare([{lat:41,lon:2},{lat:41.001,lon:2}]);assert(r.total>110&&r.total<112);assert.equal(N.at(r,-1).lat,41);assert.equal(N.at(r,r.total+1).lat,41.001);assert(Math.abs(N.at(r,r.total/2).lat-41.0005)<1e-9);});
test('una pasada posterior por la misma calle no adelanta el progreso',()=>{const pts=[{lat:41,lon:2},{lat:41.01,lon:2},{lat:41,lon:2},{lat:41.01,lon:2}],r=N.prepare(pts);const m=N.match(r,{lat:41.0005,lon:2},0);assert(m.d<100);const later=N.match(r,{lat:41.0005,lon:2},r.cum[2]);assert(later.d>=r.cum[2]);});
test('posición fuera de ruta no se confunde con un punto cercano',()=>{const r=N.prepare([{lat:41,lon:2},{lat:41.001,lon:2}]);assert(N.match(r,{lat:41,lon:2.01},0).error>800);});
test('puntos duplicados mantienen resultados finitos',()=>{const r=N.prepare([{lat:41,lon:2},{lat:41,lon:2},{lat:41.001,lon:2}]);assert(Number.isFinite(N.at(r,0).lat));assert(Number.isFinite(N.match(r,{lat:41,lon:2},0).d));});
test('indicaciones identifican un giro a la derecha',()=>{const r=N.prepare([{lat:41,lon:2},{lat:41.002,lon:2},{lat:41.002,lon:2.002}]);assert(N.turns(r).some(t=>t.label==='Giro a la derecha'));});
test('tramo resaltado conserva vértices intermedios',()=>{const pts=[{lat:41,lon:2},{lat:41.001,lon:2.001},{lat:41.002,lon:2}],r=N.prepare(pts),s=N.section(r,20,r.total-20);assert(s.some(p=>p===pts[1]));});
test('simulación completa con repetición de calles alcanza el final',()=>{const pts=[{lat:41,lon:2},{lat:41.003,lon:2},{lat:41,lon:2},{lat:41,lon:2.004},{lat:41.003,lon:2.004}],r=N.prepare(pts);let p=0,last=N.at(r,0);for(let d=0;d<=r.total+10;d+=10){const q=N.at(r,Math.min(d,r.total)),m=N.match(r,q,p,250,p+N.distance(last,q));assert(m&&m.error<5);p=Math.max(p,m.d);last=q;}assert(r.total-p<1);});
test('las indicaciones ignoran los giros registrados en parado',()=>{const geo=[{lat:41,lon:2},{lat:41.002,lon:2},{lat:41.002,lon:2.002}];const stamp=(p,k)=>({...p,time:new Date(Date.UTC(2024,0,1,0,0,k)).toISOString()});const parado=N.prepare(geo.map((p,k)=>stamp(p,k*1800))),marcha=N.prepare(geo.map((p,k)=>stamp(p,k*8)));assert.equal(N.turns(parado).length,0);assert(N.turns(marcha).some(t=>t.label==='Giro a la derecha'));assert(N.turns(parado,{minSpeed:0}).some(t=>t.label==='Giro a la derecha'));});
test('sin marcas de tiempo el filtro de velocidad no descarta giros',()=>{const r=N.prepare([{lat:41,lon:2},{lat:41.002,lon:2},{lat:41.002,lon:2.002}]);assert(N.turns(r).length>0);});
test('giros encadenados se anuncian una sola vez',()=>{const pts=[];let lat=41,lon=2;for(let i=0;i<8;i++){pts.push({lat,lon});if(i%2===0)lat+=0.00036;else lon+=0.00048;}const r=N.prepare(pts),crudo=N.turns(r,{minGap:0}),limpio=N.turns(r);assert(crudo.length>=2);assert(limpio.length<crudo.length);for(let i=1;i<limpio.length;i++)assert(limpio[i].d-limpio[i-1].d>=60);});
test('aviso de giro pasa por preparación, cercanía y ahora',()=>{const ts=[{d:300,label:'Giro a la derecha'},{d:600,label:'Giro a la izquierda'}];assert.equal(N.guidance(ts,160,1000).stage,'prepare');assert.equal(N.guidance(ts,260,1000).stage,'near');assert.equal(N.guidance(ts,290,1000).stage,'now');assert.equal(N.guidance(ts,305,1000).index,0);assert.equal(N.guidance(ts,320,1000).index,1);assert.equal(N.guidance(ts,620,1000).completed,2);});
test('velocidad adelanta avisos sin saltar de indicación',()=>{const ts=[{d:300}];assert.equal(N.guidance(ts,70,1000,20).stage,'prepare');assert.equal(N.guidance(ts,70,1000,0).stage,'later');});
test('las paradas largas se detectan y las breves no',()=>{const pts=[],stamp=k=>new Date(Date.UTC(2024,0,1,0,0,k)).toISOString();let t=0;
 for(let i=0;i<4;i++)pts.push({lat:41+i*0.0002,lon:2,time:stamp(t+=20)});
 for(let i=0;i<10;i++)pts.push({lat:41.0006,lon:2.000002,time:stamp(t+=40)});
 for(let i=0;i<4;i++)pts.push({lat:41.001+i*0.0002,lon:2,time:stamp(t+=20)});
 for(let i=0;i<3;i++)pts.push({lat:41.0018,lon:2.000002,time:stamp(t+=20)});
 for(let i=0;i<4;i++)pts.push({lat:41.002+i*0.0002,lon:2,time:stamp(t+=20)});
 const r=N.prepare(pts),s=N.stops(r);
 assert.equal(s.length,1);
 assert(s[0].seconds>=360);
 assert(Number.isFinite(s[0].d)&&s[0].d>0);});
test('sin marcas de tiempo no se inventan paradas',()=>{const r=N.prepare([{lat:41,lon:2},{lat:41,lon:2.000002},{lat:41.002,lon:2}]);assert.equal(N.stops(r).length,0);});
test('el contador de paradas avanza con el recorrido',()=>{const s=[{d:100,start:90,end:110},{d:500,start:490,end:510},{d:900,start:890,end:910}];
 assert.deepEqual([N.stopProgress(s,0).done,N.stopProgress(s,150).done,N.stopProgress(s,1000).done],[0,1,3]);
 assert.equal(N.stopProgress(s,0).next.d,100);
 assert.equal(N.stopProgress(s,0).gap,100);
 assert.equal(N.stopProgress(s,1000).next,null);});
test('el tiempo restante sale de las horas del propio recorrido',()=>{const stamp=k=>new Date(Date.UTC(2024,0,1,0,0,k)).toISOString();
 const pts=[{lat:41,lon:2,time:stamp(0)},{lat:41.002,lon:2,time:stamp(600)},{lat:41.004,lon:2,time:stamp(1800)}];
 const r=N.prepare(pts);
 assert.equal(N.remainingSeconds(r,0),1800);
 assert.equal(N.remainingSeconds(r,r.total),0);
 assert(N.remainingSeconds(r,r.total/2)<1800);
 assert.equal(N.remainingSeconds(N.prepare([{lat:41,lon:2},{lat:41.002,lon:2}]),0),null);});
test('una ruta cabe en un enlace y vuelve igual',()=>{const stamp=k=>new Date(Date.UTC(2024,0,1,0,0,k)).toISOString();
 const pts=[{lat:41.97680,lon:1.87315,time:stamp(0)},{lat:41.97522,lon:1.87251,time:stamp(45)},{lat:41.98746,lon:1.88545,time:stamp(300)}];
 const back=N.unpackRoute(N.packRoute('Ronda de prueba',pts));
 assert.equal(back.name,'Ronda de prueba');
 assert.equal(back.pts.length,3);
 for(let i=0;i<3;i++){assert(Math.abs(back.pts[i].lat-pts[i].lat)<1e-5);assert(Math.abs(back.pts[i].lon-pts[i].lon)<1e-5);assert.equal(back.pts[i].time,pts[i].time);}});
test('sin horas el enlace sigue siendo valido',()=>{const pts=[{lat:41,lon:2},{lat:41.002,lon:2.002}];
 const back=N.unpackRoute(N.packRoute('',pts));assert.equal(back.pts.length,2);assert.equal(back.pts[0].time,null);});
test('un enlace manipulado se rechaza en vez de cargarse',()=>{
 for(const bad of ['','no es json','{}','{"v":9,"p":"abc"}','{"v":1,"p":""}',JSON.stringify({v:1,p:N.packRoute('x',[{lat:41,lon:2},{lat:41.001,lon:2}])})])
  assert.throws(()=>N.unpackRoute(bad));
 assert.throws(()=>N.unpackRoute(JSON.stringify({v:1,n:'x',p:'~~~~~~~~'})));});
test('simplificar respeta los extremos y afloja la traza',()=>{const pts=[];for(let i=0;i<200;i++)pts.push({lat:41+i*0.00002,lon:2+(i%2)*0.0000045});
 const s=N.simplify(pts,3);
 assert(s.length<pts.length);assert.equal(s[0],pts[0]);assert.equal(s.at(-1),pts.at(-1));
 assert.equal(N.simplify(pts,0).length,pts.length);});
test('huella distingue ruta invertida para no recuperar otra pasada',()=>{const pts=[{lat:41,lon:2},{lat:41.001,lon:2}];assert.notEqual(N.fingerprint(N.prepare(pts)),N.fingerprint(N.prepare(pts.slice().reverse())));});
test('buscar pasada ofrece distintos puntos del recorrido repetido',()=>{const r=N.prepare([{lat:41,lon:2},{lat:41.003,lon:2},{lat:41,lon:2}]);const c=N.nearbyPasses(r,{lat:41.001,lon:2});assert.equal(c.length,2);assert(c[1].d-c[0].d>100);});
test('rumbo diferencia ida y vuelta coincidentes',()=>{const r=N.prepare([{lat:41,lon:2},{lat:41.001,lon:2},{lat:41,lon:2}]),p={lat:41.0008,lon:2};const north=N.match(r,p,100,150,111,0),south=N.match(r,p,100,150,111,180);assert(north.d<r.cum[1]);assert(south.d>r.cum[1]);});
test('el regreso propone un punto futuro sin retroceder',()=>{const r=N.prepare([{lat:41,lon:2},{lat:41.003,lon:2},{lat:41.003,lon:2.004},{lat:41.006,lon:2.004}]),progress=120,p={lat:41.002,lon:2.002};const out=N.rejoin(r,p,progress);assert(out);assert(out.d>=progress+100);assert(out.d<=progress+1500);assert(out.ahead>0);assert(Number.isFinite(out.target.lat)&&Number.isFinite(out.target.lon));});
test('el regreso no salta a una vuelta lejana cuando existe otra cercana en el orden',()=>{const pts=[{lat:41,lon:2},{lat:41.004,lon:2},{lat:41.004,lon:2.004},{lat:41,lon:2.004},{lat:41,lon:2},{lat:41.004,lon:2}],r=N.prepare(pts),out=N.rejoin(r,{lat:41.002,lon:2.001},100,{minAhead:100,maxAhead:1500});assert(out);assert(out.d<r.cum[4]);});
test('la ronda invertida conserva paradas y duración disponible',()=>{const pts=[{lat:41,lon:2,time:'2026-01-01T10:00:00Z'},{lat:41,lon:2,time:'2026-01-01T10:04:00Z'},{lat:41.002,lon:2,time:'2026-01-01T10:08:00Z'}],a=N.prepare(pts),b=N.prepare(pts.slice().reverse());assert.equal(N.stops(a).length,1);assert.equal(N.stops(b).length,1);assert.equal(N.remainingSeconds(a,0),480);assert.equal(N.remainingSeconds(b,0),480);assert.equal(N.remainingSeconds(b,b.total),0);});
test('un enlace con símbolos inválidos no se interpreta como una ruta',()=>{assert.throws(()=>N.unpackRoute(JSON.stringify({v:1,p:'!!??'})),/inválidos/);});
test('solo la denegación de permiso termina la navegación',()=>{
 assert.equal(N.gpsFatal(1),true);                 // PERMISSION_DENIED
 assert.equal(N.gpsFatal(2),false);                // POSITION_UNAVAILABLE: tunel, valle
 assert.equal(N.gpsFatal(3),false);                // TIMEOUT
 assert.equal(N.gpsFatal(undefined),false);
 assert.match(N.gpsPause(3),/tarda en responder/);
 assert.match(N.gpsPause(2),/recorrido sigue activo/);
});
test('el trazado por calles hereda las horas del GPX',()=>{
 const en=k=>new Date(Date.UTC(2026,0,1,0,0,k)).toISOString();
 // el original para 600 s a mitad de camino: esa parada debe notarse en el traslado
 const gpx=[{lat:41,lon:2,time:en(0)},{lat:41.001,lon:2,time:en(60)},{lat:41.001,lon:2,time:en(660)},{lat:41.002,lon:2,time:en(720)}];
 const calles=[{lat:41,lon:2},{lat:41.0005,lon:2},{lat:41.001,lon:2},{lat:41.0015,lon:2},{lat:41.002,lon:2}];
 const out=N.transferTimes(gpx,calles);
 assert.equal(out.length,5);
 assert.equal(out[0].time,en(0));
 assert.equal(Date.parse(out[4].time),Date.parse(en(720)));
 for(let i=1;i<out.length;i++)assert(Date.parse(out[i].time)>=Date.parse(out[i-1].time));
 // a mitad de distancia el camion acaba de llegar a la parada: 60 s transcurridos,
 // pero le quedan 660 porque la espera de 10 minutos sigue por delante
 const r=N.prepare(out);
 assert.equal(Date.parse(out[2].time)-Date.parse(en(0)),60000);
 assert.equal(N.remainingSeconds(r,r.cum[2]),660);
 // el resultado sirve para la hora de llegada
 assert.equal(N.remainingSeconds(r,0),720);
});
test('sin horas o con datos raros devuelve el trazado intacto',()=>{
 const calles=[{lat:41,lon:2},{lat:41.002,lon:2}];
 assert.equal(N.transferTimes([{lat:41,lon:2},{lat:41.002,lon:2}],calles),calles);
 assert.equal(N.transferTimes(null,calles),calles);
 assert.equal(N.transferTimes([{lat:41,lon:2,time:'x'}],calles),calles);
 assert.deepEqual(N.transferTimes([{lat:41,lon:2,time:'2026-01-01T00:00:00Z'},{lat:41.002,lon:2,time:'2026-01-01T00:00:00Z'}],calles),calles);
});
test('el avance se conserva al cambiar de trazado a mitad de ronda',()=>{
 // el trazado por calles mide algo menos que el GPX: la mitad sigue siendo la mitad
 assert.equal(N.remapProgress(13175,26350,24870),12435);
 assert.equal(N.remapProgress(0,26350,24870),0);
 assert.equal(N.remapProgress(26350,26350,24870),24870);
 assert.equal(N.remapProgress(99999,26350,24870),24870);   // nunca pasa del final
 assert.equal(N.remapProgress(-5,26350,24870),0);
 for(const mal of [[1,0,100],[1,100,0],[NaN,100,100]])assert.equal(N.remapProgress(...mal),0);
});


// ---- el avance guardado, sobre la linea de ahora ----
{
 const KX=111320*Math.cos(41.9*Math.PI/180),KY=110540;
 const en=(x,y)=>({lat:41.9+y/KY,lon:1.87+x/KX});
 // El GPX va en zigzag (mide mas); el trazado por calles, recto por la misma calle.
 const gpx=[],calles=[];
 for(let x=0;x<=5000;x+=10){gpx.push(en(x,(x/10)%2?6:-6));calles.push(en(x,0));}
 const G=N.prepare(gpx),P=N.prepare(calles);
 const guardado=(r,d)=>{const p=N.at(r,d);return {d,total:r.total,lat:+p.lat.toFixed(6),lon:+p.lon.toFixed(6)};};

 test('el avance guardado sobre la misma linea vale tal cual',()=>{
  assert.equal(N.carryProgress(P,guardado(P,3200)),3200);
  assert.equal(N.carryProgress(P,{d:3200}),3200,'lo guardado antes, sin total, tambien');
 });

 test('el avance guardado sobre las calles cae en el mismo sitio del GPX',()=>{
  assert.ok(G.total>P.total*1.05,'el GPX mide mas: '+Math.round(G.total)+' / '+Math.round(P.total));
  const d=N.carryProgress(G,guardado(P,3200));
  const donde=N.at(G,d),alli=en(3200,0);
  assert.ok(N.distance(donde,alli)<15,'a '+Math.round(N.distance(donde,alli))+' m del punto guardado');
  // Y al reves.
  const v=N.carryProgress(P,guardado(G,d));
  assert.ok(Math.abs(v-3200)<15,'vuelta: '+v);
 });

 test('en una calle por la que se pasa dos veces, se queda con la pasada que toca',()=>{
  // Ida y vuelta por la misma calle: el punto de los 1000 m se pisa a 1000 m y a 9000 m.
  const ida=[];for(let x=0;x<=5000;x+=10)ida.push(en(x,0));
  const vuelta=[];for(let x=5000;x>=0;x-=10)vuelta.push(en(x,3));
  const R=N.prepare([...ida,...vuelta]);
  const larga=N.prepare([...ida.map((p,i)=>i%2?{...p,lat:p.lat+8/KY}:p),...vuelta]);
  const d=N.carryProgress(larga,guardado(R,9000));
  assert.ok(d>larga.total/2,'en la vuelta, no en la ida: '+Math.round(d)+' de '+Math.round(larga.total));
 });

 test('sin el punto guardado se traslada en proporcion, y lo roto no da un numero',()=>{
  const d=N.carryProgress(G,{d:P.total/2,total:P.total});
  assert.ok(Math.abs(d-G.total/2)<1);
  assert.ok(Number.isNaN(N.carryProgress(G,null)));
  assert.ok(Number.isNaN(N.carryProgress(G,{d:'x'})));
 });
}
