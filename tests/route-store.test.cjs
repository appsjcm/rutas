const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../route-store-core'),N=require('../nav-core');

// Una ronda con curvas, horas al milisegundo y algun hueco, como sale de un GPX de movil.
function ronda(n,opciones){
 const o=opciones||{};const pts=[];let lat=41.970054,lon=1.87,r=0,t=Date.parse('2026-09-26T05:00:01.200Z');
 for(let i=0;i<n;i++){
  r+=Math.sin(i/40)*0.05;lat+=Math.cos(r)*0.000054;lon+=Math.sin(r)*0.000072;t+=1200;
  pts.push({lat:+lat.toFixed(6),lon:+lon.toFixed(6),ele:o.ele?+(500+Math.sin(i/9)*20).toFixed(1):null,
   time:o.sinHora&&i%7===0?null:new Date(t).toISOString()});
 }
 return pts;
}

test('la huella de la ruta sale identica al recuperarla',()=>{
 // De la huella dependen el avance guardado, el registro de tramos y los avisos revisados.
 const pts=ronda(3000);
 const vuelta=S.unpack(S.pack({name:'R',tracks:[{name:'T',pts}],selected:0})).tracks[0].pts;
 assert.equal(N.fingerprint(N.prepare(vuelta)),N.fingerprint(N.prepare(pts)));
});

test('las coordenadas vuelven iguales a siete decimales, tambien las calculadas',()=>{
 // Las del ajuste a calles no vienen redondeadas a 6 decimales: tienen muchos mas.
 const pts=[{lat:41.97005412345678,lon:1.8712345678901,time:null},{lat:-33.86881969999,lon:151.20929549999,time:null},
  {lat:0.00000005,lon:-0.00000005,time:null},{lat:41.97005415,lon:1.87000005,time:null}];
 const vuelta=S.unpackTrack(S.packTrack({name:'',pts})).pts;
 pts.forEach((p,i)=>{
  assert.equal(vuelta[i].lat.toFixed(7),p.lat.toFixed(7),'lat '+i);
  assert.equal(vuelta[i].lon.toFixed(7),p.lon.toFixed(7),'lon '+i);
 });
});

test('las horas vuelven al milisegundo, y las que faltan siguen faltando',()=>{
 const pts=ronda(500,{sinHora:true});
 const vuelta=S.unpackTrack(S.packTrack({name:'',pts})).pts;
 pts.forEach((p,i)=>{
  if(p.time===null)assert.equal(vuelta[i].time,null,'punto '+i+' sin hora');
  else assert.equal(Date.parse(vuelta[i].time),Date.parse(p.time),'punto '+i);
 });
});

test('la altitud vuelve al centimetro si la hay, y no se inventa si no',()=>{
 const con=ronda(200,{ele:true});
 const v1=S.unpackTrack(S.packTrack({name:'',pts:con})).pts;
 con.forEach((p,i)=>assert.ok(Math.abs(v1[i].ele-p.ele)<0.006,'ele '+i));
 const sin=ronda(200);
 const v2=S.unpackTrack(S.packTrack({name:'',pts:sin})).pts;
 assert.ok(v2.every(p=>p.ele===null),'sin altitud no aparece ninguna');
});

test('varias pistas, sus nombres y la elegida se conservan',()=>{
 const data={name:'Ronda del lunes',selected:1,tracks:[{name:'Ida',pts:ronda(50)},{name:'Vuelta',pts:ronda(80)}]};
 const v=S.unpack(S.pack(data));
 assert.equal(v.name,'Ronda del lunes');
 assert.equal(v.selected,1);
 assert.deepEqual(v.tracks.map(t=>t.name),['Ida','Vuelta']);
 assert.deepEqual(v.tracks.map(t=>t.pts.length),[50,80]);
});

test('una ronda de 18 500 puntos cabe de sobra en el almacen de un iPhone',()=>{
 // Como la arma el lector de GPX: los puntos en pts y otra vez en parts. Esa duplicacion es
 // la que llevaba la ronda real a 2,9 millones de caracteres.
 const pts=ronda(18500);
 const antes=JSON.stringify({name:'R',tracks:[{name:'T',pts,parts:[pts]}],selected:0}).length;
 const ahora=S.pack({name:'R',tracks:[{name:'T',pts,parts:[pts]}],selected:0}).length;
 // El navegador cuenta dos bytes por caracter; el iPhone da unos 5 MB.
 assert.ok(antes*2>5e6,'el formato antiguo no cabia: '+(antes*2/1e6).toFixed(1)+' MB');
 assert.ok(ahora*2<0.5e6,'el nuevo ocupa '+(ahora*2/1e6).toFixed(2)+' MB');
 assert.ok(antes/ahora>10,'al menos diez veces menos: '+(antes/ahora).toFixed(0));
});

test('lo guardado con el formato antiguo se sigue leyendo',()=>{
 const viejo={name:'Vieja',tracks:[{name:'T',pts:ronda(10)}],selected:0};
 const v=S.unpack(JSON.stringify(viejo));
 assert.equal(v.antiguo,true);
 assert.equal(v.tracks[0].pts.length,10);
 assert.equal(v.tracks[0].pts[3].lat,viejo.tracks[0].pts[3].lat);
});

test('coordenadas extremas no desbordan',()=>{
 // Con operaciones de 32 bits, 7 decimales desbordan por encima de 107 grados de longitud.
 const pts=[{lat:-89.9999999,lon:-179.9999999,time:null},{lat:89.9999999,lon:179.9999999,time:null},
  {lat:0,lon:0,time:null},{lat:-89.9999999,lon:179.9999999,time:null}];
 const v=S.unpackTrack(S.packTrack({name:'',pts})).pts;
 pts.forEach((p,i)=>{assert.equal(v[i].lat.toFixed(7),p.lat.toFixed(7));assert.equal(v[i].lon.toFixed(7),p.lon.toFixed(7));});
});

test('un guardado roto falla con un error, no con una ruta inventada',()=>{
 const bueno=S.packTrack({name:'',pts:ronda(20)});
 assert.throws(()=>S.unpackTrack({...bueno,p:bueno.p.slice(0,-3)}),/incompleta|invalidos|de mas/);
 assert.throws(()=>S.unpackTrack({...bueno,p:bueno.p+'@@@'}),/de mas|invalidos/);
 assert.throws(()=>S.unpackTrack({...bueno,c:-1}),/no valida/);
 assert.throws(()=>S.unpack('esto no es json'),/ilegible/);
 assert.throws(()=>S.unpack(null),/ilegible/);
});

test('el codificador ida y vuelta, numero a numero',()=>{
 for(const v of [0,1,-1,31,32,-32,1e7,-1e7,1800000000,-1800000000,2**40,-(2**40)]){
  const c={i:0};assert.equal(S.dec(S.enc(v),c),v,'valor '+v);
 }
});

test('los trozos del GPX vuelven igual, con los mismos puntos',()=>{
 const a=ronda(30),b=ronda(40),c=ronda(20);
 const pts=[].concat(a,b,c);
 const v=S.unpackTrack(S.packTrack({name:'',pts,parts:[a,b,c]}));
 assert.deepEqual(v.parts.map(x=>x.length),[30,40,20]);
 // Como en el lector de GPX, los trozos son los mismos objetos que pts.
 assert.equal(v.parts[1][0],v.pts[30]);
 assert.equal(v.parts[2][19],v.pts[89]);
});

test('una pista de un solo trozo no guarda la lista de trozos',()=>{
 const pts=ronda(50);
 const o=S.packTrack({name:'',pts,parts:[pts]});
 assert.equal(o.ps,undefined,'no hace falta: es un solo trozo');
 assert.deepEqual(S.unpackTrack(o).parts.map(x=>x.length),[50]);
});

test('si los trozos no fueran los mismos puntos, esa pista se guarda como antes',()=>{
 // Puntos de verdad distintos: ronda() es determinista y con los mismos valores coincidirian.
 const pts=ronda(20),otros=ronda(20).map(p=>({...p,lat:p.lat+0.01}));
 const o=S.packTrack({name:'rara',pts,parts:[otros]});
 assert.ok(o.antiguo,'no se arriesga: se guarda tal cual');
 const v=S.unpack(S.pack({name:'R',tracks:[{name:'rara',pts,parts:[otros]}],selected:0}));
 assert.equal(v.tracks[0].pts.length,20);
 assert.equal(v.tracks[0].parts[0][5].lat,otros[5].lat,'los trozos originales, intactos');
});

test('un punto casi en el meridiano de Greenwich conserva la huella',()=>{
 // toFixed(7) de -0.00000004 es "-0.0000000": el signo cuenta en la huella.
 const pts=[{lat:41.5,lon:0.0001,time:null},{lat:41.5,lon:-0.00000004,time:null},
  {lat:-0.00000003,lon:-0.00000001,time:null},{lat:41.5,lon:-0.0001,time:null}];
 const v=S.unpackTrack(S.packTrack({name:'',pts})).pts;
 pts.forEach((p,i)=>{
  assert.equal(v[i].lat.toFixed(7),p.lat.toFixed(7),'lat '+i);
  assert.equal(v[i].lon.toFixed(7),p.lon.toFixed(7),'lon '+i);
 });
 assert.equal(N.fingerprint(N.prepare(v)),N.fingerprint(N.prepare(pts)));
});

test('la pista elegida se guarda tal como venga',()=>{
 assert.equal(S.unpack(S.pack({name:'',tracks:[],selected:2})).selected,2);
 assert.equal(S.unpack(S.pack({name:'',tracks:[]})).selected,0);
});

test('trozos que no cuadran con los puntos se rechazan',()=>{
 const o=S.packTrack({name:'',pts:ronda(10)});
 assert.throws(()=>S.unpackTrack({...o,ps:[4,4]}),/no cuadran/);
 assert.throws(()=>S.unpackTrack({...o,ps:[4,40]}),/imposibles/);
 assert.throws(()=>S.unpackTrack({...o,ps:[-1,11]}),/imposibles/);
});

test('una ruta que viene de un guardado antiguo tambien se compacta',()=>{
 // Tras pasar por JSON, los trozos son copias de los puntos, no los mismos objetos: asi es
 // como llega una ruta recuperada del formato antiguo. Comparando por identidad caia en la
 // via de reserva y se guardaba igual de grande.
 const pts=ronda(2000);
 const copia=JSON.parse(JSON.stringify({name:'T',pts,parts:[pts]}));
 assert.notEqual(copia.parts[0][5],copia.pts[5],'son objetos distintos');
 const o=S.packTrack(copia);
 assert.equal(o.antiguo,undefined,'no debe caer en la reserva');
 assert.ok(JSON.stringify(o).length<JSON.stringify(copia).length/10,'y ocupa mucho menos');
});

// El trazado ajustado a las calles (street-match.js) se guarda con packTrack: solo lat y lon.
test('el trazado de calles vuelve igual, sin campos de mas y con la misma huella',()=>{
 const trazado=[];
 // Como los da el reconocimiento de calles: 6 decimales.
 for(let i=0;i<500;i++)trazado.push({lat:Math.round((41.97+i*0.00013)*1e6)/1e6,lon:Math.round((1.87+Math.sin(i/9)*0.002)*1e6)/1e6});
 // Y puntos intermedios calculados, con todos los decimales, uno justo al oeste de Greenwich.
 trazado.push({lat:41.9701234567891,lon:1.8712345678912},{lat:41.97,lon:-0.00000001},{lat:41.97,lon:0.0000003});
 const vuelta=S.unpackTrack(JSON.parse(JSON.stringify(S.packTrack({pts:trazado})))).pts.map(p=>({lat:p.lat,lon:p.lon}));
 assert.equal(vuelta.length,trazado.length);
 assert.deepEqual(vuelta.slice(0,500),trazado.slice(0,500),'los de 6 decimales, exactos');
 assert.equal(N.fingerprint(N.prepare(vuelta)),N.fingerprint(N.prepare(trazado)),'misma huella');
 assert.deepEqual(Object.keys(vuelta[0]),['lat','lon']);
});

test('una linea de puntos va y vuelve, y si esta rota se rechaza',()=>{
 const l=[{lat:41.9744390,lon:1.8706510},{lat:-33.8688197,lon:151.2092955},{lat:0,lon:-179.9999999}];
 const g=S.packLine(l);
 assert.deepEqual(S.unpackLine(g,3),l);
 assert.deepEqual(S.unpackLine('',0),[]);
 assert.throws(()=>S.unpackLine(g,2),/de mas/);
 assert.throws(()=>S.unpackLine(g,4),/incompleta/);
 assert.throws(()=>S.unpackLine(g,-1));
 assert.throws(()=>S.unpackLine(null,0));
});
