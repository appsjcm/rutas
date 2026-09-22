const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../marks-core'),N=require('../nav-core');

// Una recta de norte a sur: 1e-5 grados de latitud son unos 1,11 m, comodo para medir.
function recta(n=200){
 const pts=[];
 for(let i=0;i<n;i++)pts.push({lat:41.9+i*1e-4,lon:1.87});
 return N.prepare(pts);
}
const ruta=recta();
const enRuta=d=>N.at(ruta,d);

test('solo se guarda lo que es un punto de verdad',()=>{
 assert.equal(M.normalise({lat:41.9,lon:1.87,kind:'altura'}).kind,'altura');
 assert.equal(M.normalise({lat:'x',lon:1.87}),null);
 assert.equal(M.normalise({lat:95,lon:1.87}),null);
 assert.equal(M.normalise(null),null);
 assert.equal(M.normalise({lat:41.9,lon:1.87,kind:'inventado'}).kind,'nota');
 assert.equal(M.valid({lat:41.9,lon:1.87}),true);
});

test('la nota se limpia y no crece sin limite',()=>{
 const m=M.normalise({lat:41.9,lon:1.87,note:'  gálibo\n  3,2 m  '});
 assert.equal(m.note,'gálibo 3,2 m');
 assert.equal(M.normalise({lat:41.9,lon:1.87,note:'x'.repeat(200)}).note.length,M.NOTE_MAX);
 assert.equal(M.normalise({lat:41.9,lon:1.87}).note,'');
});

test('marcar dos veces el mismo puente no crea dos avisos',()=>{
 let l=M.add([],{lat:41.9,lon:1.87,kind:'altura',note:'3,2 m'});
 assert.equal(l.length,1);
 l=M.add(l,{lat:41.90005,lon:1.87,kind:'altura',note:'3,4 m medidos'});   // a unos 5 m
 assert.equal(l.length,1,'se sustituye, no se duplica');
 assert.equal(l[0].note,'3,4 m medidos','se queda la ultima nota');
 l=M.add(l,{lat:41.90005,lon:1.87,kind:'peso'});                          // mismo sitio, otro tipo
 assert.equal(l.length,2,'altura y peso en el mismo punto son dos avisos distintos');
 l=M.add(l,{lat:41.95,lon:1.87,kind:'altura'});                           // otro puente
 assert.equal(l.length,3);
});

test('lo que no es un punto valido no ensucia la lista',()=>{
 const l=M.add([{lat:41.9,lon:1.87,kind:'altura'}],{lat:'x'});
 assert.equal(l.length,1);
});

test('se borra por identificador',()=>{
 const l=M.add([],{id:'uno',lat:41.9,lon:1.87});
 assert.equal(M.remove(l,'uno').length,0);
 assert.equal(M.remove(l,'otro').length,1);
 assert.equal(M.remove(null,'uno').length,0);
});

test('una marca lejos del recorrido no se ata a el',()=>{
 const cerca=enRuta(500);
 const lejos={lat:cerca.lat,lon:cerca.lon+0.01};      // unos 830 m al este
 const l=M.anchor([{...cerca,kind:'altura'},{...lejos,kind:'peso'}],ruta);
 assert.equal(l.length,1);
 assert.equal(l[0].kind,'altura');
 assert.ok(Math.abs(l[0].d-500)<15,'atada donde esta: '+l[0].d);
});

test('las marcas llegan ordenadas por el recorrido, no por cuando se pusieron',()=>{
 const l=M.anchor([{...enRuta(1500),kind:'peso'},{...enRuta(300),kind:'altura'}],ruta);
 assert.deepEqual(l.map(m=>m.kind),['altura','peso']);
});

test('solo avisa de lo que viene delante y esta cerca',()=>{
 const anclado=M.anchor([{...enRuta(300),kind:'altura'},{...enRuta(1200),kind:'peso'}],ruta);
 const a=M.ahead(anclado,200,300);
 assert.equal(a.length,1);
 assert.equal(a[0].kind,'altura');
 assert.ok(Math.abs(a[0].gap-100)<15,'faltan unos 100 m: '+a[0].gap);
 assert.equal(M.ahead(anclado,400,300).length,0,'lo ya pasado no se repite');
 assert.equal(M.ahead(anclado,1000,300).length,1,'el siguiente aparece a su tiempo');
 assert.equal(M.ahead(null,0).length,0);
});

test('el aviso dice quien lo puso, que no es OpenStreetMap',()=>{
 const m={kind:'altura',note:''};
 assert.equal(M.warning(m,120),'⚠ Paso bajo a 120 m · lo marcaste tú');
 assert.equal(M.warning({kind:'altura',note:'gálibo 3,2 m'},118),'⚠ Paso bajo a 120 m · «gálibo 3,2 m»');
 assert.equal(M.warning({kind:'acceso'},0),'⚠ Prohibido el paso · lo marcaste tú');
 assert.equal(M.warning(null,10),'');
});

test('la voz lo dice corto y dice de donde viene',()=>{
 assert.equal(M.spoken({kind:'estrecho'},80),'Atención: calle estrecha en 80 m, marcado por ti.');
 assert.equal(M.spoken({kind:'peso'},1400),'Atención: límite de peso en 1,4 km, marcado por ti.');
 assert.equal(M.spoken(null,10),'');
});

test('las distancias se redondean: nadie necesita 117 metros',()=>{
 assert.equal(M.metres(117),'120 m');
 assert.equal(M.metres(4),'','debajo de 10 m ya estas encima');
 assert.equal(M.metres(1460),'1,5 km');
 assert.equal(M.metres(1450),'1,4 km');   // 1,45 no es exacto en coma flotante y baja
 assert.equal(M.metres(-1),'');
 assert.equal(M.metres(null),'');
});

test('lo guardado sobrevive a una lista rota',()=>{
 const l=[{lat:41.9,lon:1.87,kind:'altura',note:'a'},{lat:'x'},null];
 const t=M.pack(l);
 assert.equal(M.unpack(t).length,1);
 assert.equal(M.unpack('esto no es json').length,0);
 assert.equal(M.unpack('{"a":1}').length,0);
 assert.equal(M.unpack(null).length,0);
});

test('la descripcion sirve para una lista, con y sin nota',()=>{
 assert.equal(M.describe({kind:'peso',note:'12 t'}),'Límite de peso · 12 t');
 assert.equal(M.describe({kind:'peso'}),'Límite de peso');
 assert.equal(M.kind('altura').badge,'H');
 assert.equal(M.kind('sin-nombre').id,'nota');
});

test('el aviso del conductor se coloca debajo del de OpenStreetMap, no encima',()=>{
 // Rectangulos como los que da el navegador: el escenario empieza en 100 y el aviso vial
 // ocupa de 190 a 250, asi que el del conductor empieza en 158 relativos al escenario.
 const escenario={top:100,bottom:700,height:600};
 assert.equal(M.stackTop({top:190,bottom:250,height:60},escenario),158);
 assert.equal(M.stackTop({top:190,bottom:310,height:120},escenario),218,'si crece, baja mas');
 assert.equal(M.stackTop({top:190,bottom:250,height:60},escenario,20),170);
 // Sin aviso vial no se toca el sitio: manda la hoja de estilo.
 assert.equal(M.stackTop({top:0,bottom:0,height:0},escenario),null);
 assert.equal(M.stackTop(null,escenario),null);
 assert.equal(M.stackTop({height:60},null),null);
});

const G=require('../gpx-core');

test('los avisos viajan dentro del GPX como waypoints normales',()=>{
 const marcas=[{lat:41.976474,lon:1.873488,kind:'altura',label:'Paso bajo',note:'gálibo 3,2 m'},
               {lat:41.98,lon:1.88,kind:'acceso',label:'Prohibido el paso'}];
 const xml=G.build('Ronda',[{lat:41.9,lon:1.87},{lat:41.91,lon:1.87}],marcas);
 assert.match(xml,/<wpt lat="41\.9764740" lon="1\.8734880">/);
 assert.match(xml,/<name>Paso bajo<\/name>/);
 assert.match(xml,/<desc>gálibo 3,2 m<\/desc>/);
 assert.match(xml,/<type>rutas:altura<\/type>/);
 assert.ok(xml.indexOf('<wpt')<xml.indexOf('<trk>'),'los waypoints van antes de la traza');
 assert.match(xml,/<trkpt /,'la traza sigue estando');
});

test('un GPX sin avisos sale exactamente como antes',()=>{
 const pts=[{lat:41.9,lon:1.87},{lat:41.91,lon:1.87}];
 assert.equal(G.build('Ronda',pts),G.build('Ronda',pts,[]));
 assert.equal(G.build('Ronda',pts).includes('<wpt'),false);
 assert.equal(G.build('Ronda',pts,null).includes('<wpt'),false);
});

test('una coordenada imposible no llega al archivo',()=>{
 const xml=G.build('Ronda',[{lat:41.9,lon:1.87},{lat:41.91,lon:1.87}],
  [{lat:95,lon:1.87,kind:'altura'},{lat:'x',lon:1.87},null]);
 assert.equal(xml.includes('<wpt'),false);
});

test('al volver del archivo solo se reconocen los avisos propios',()=>{
 const leidos=M.fromWaypoints([
  {lat:41.97,lon:1.87,type:'rutas:altura',desc:'gálibo 3,2 m'},
  {lat:41.98,lon:1.88,type:'rutas:acceso'},
  {lat:41.99,lon:1.89,type:'Restaurante'},          // waypoint ajeno: no es un aviso
  {lat:41.99,lon:1.89},                             // sin tipo tampoco
  {lat:'x',lon:1.89,type:'rutas:peso'}]);           // sin coordenada valida
 assert.deepEqual(leidos.map(m=>m.kind),['altura','acceso']);
 assert.equal(leidos[0].note,'gálibo 3,2 m');
 assert.deepEqual(M.fromWaypoints(null),[]);
});

test('importar no duplica lo que ya tenias en el mismo sitio',()=>{
 const mios=M.add([],{lat:41.97,lon:1.87,kind:'altura',note:'mío'});
 const r=M.merge(mios,[{lat:41.97005,lon:1.87,kind:'altura',note:'del compañero'},
                       {lat:42.10,lon:1.90,kind:'peso'}]);
 assert.equal(r.seen,2);
 assert.equal(r.added,1,'el del mismo puente sustituye, no suma');
 assert.equal(r.list.length,2);
 assert.equal(r.list.find(m=>m.kind==='altura').note,'del compañero');
 assert.deepEqual(M.merge(null,null),{list:[],added:0,seen:0});
});

test('un aviso da la vuelta completa sin perder nada',()=>{
 const original=M.add([],{lat:41.976474,lon:1.873488,kind:'estrecho',note:'no pasa el camión'});
 const conEtiqueta=original.map(m=>({...m,label:M.kind(m.kind).label}));
 const xml=G.build('Ronda',[{lat:41.9,lon:1.87},{lat:41.91,lon:1.87}],conEtiqueta);
 // Lo que el lector de GPX del navegador sacaria de ese <wpt>:
 const leido=M.fromWaypoints([{lat:41.976474,lon:1.873488,type:'rutas:estrecho',desc:'no pasa el camión'}]);
 assert.equal(leido.length,1);
 assert.equal(leido[0].kind,'estrecho');
 assert.equal(leido[0].note,'no pasa el camión');
 assert.match(xml,/<type>rutas:estrecho<\/type>/);
});
