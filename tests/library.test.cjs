const test=require('node:test'),assert=require('node:assert/strict'),L=require('../library-core');
const pts=[{lat:41.976,lon:1.873},{lat:41.978,lon:1.875}];
const ruta=(extra={})=>({id:'a',title:'Ronda Nord',tracks:[{pts}],selected:0,km:12.5,updated:1000,...extra});

test('acepta un registro completo y rechaza los rotos',()=>{
 assert.equal(L.valid(ruta()),true);
 for(const mal of [null,{},{tracks:[]},{tracks:[{pts:[]}]},{tracks:[{pts:[pts[0]]}]},{tracks:[{}]},
  {tracks:[{pts:[{lat:91,lon:2},{lat:41,lon:2}]}]},{tracks:[{pts:[{lat:41,lon:181},{lat:41,lon:2}]}]},
  {tracks:[{pts:[{lat:'41',lon:2},{lat:41,lon:2}]}]},{tracks:[{pts:[{lat:NaN,lon:2},{lat:41,lon:2}]}]}])
  assert.equal(L.valid(mal),false);
});

test('descarta de la lista lo que no se puede abrir',()=>{
 const lista=[ruta(),ruta({id:'b',title:''}),ruta({id:'c',km:'12'}),ruta({id:'d',updated:null}),
  ruta({id:'e',tracks:[{pts:[]}]}),null,'no es un registro'];
 const limpia=L.usable(lista);
 assert.equal(limpia.length,1);
 assert.equal(limpia[0].id,'a');
 assert.deepEqual(L.usable(null),[]);
});

test('busca sin acentos ni mayusculas y ordena por fecha',()=>{
 const lista=[ruta({id:'a',title:'Ronda Nord',updated:100}),
              ruta({id:'b',title:'Recogida Avinyó',updated:300}),
              ruta({id:'c',title:'RONDA SUD',updated:200})];
 assert.deepEqual(L.search(lista,'').map(r=>r.id),['b','c','a']);      // mas reciente primero
 assert.deepEqual(L.search(lista,'ronda').map(r=>r.id),['c','a']);
 assert.deepEqual(L.search(lista,'RONDA').map(r=>r.id),['c','a']);
 assert.deepEqual(L.search(lista,'avinyo').map(r=>r.id),['b']);        // sin acento encuentra "Avinyó"
 assert.deepEqual(L.search(lista,'  nord ').map(r=>r.id),['a']);
 assert.deepEqual(L.search(lista,'zzz'),[]);
});

test('conserva el nombre puesto a mano al volver a guardar',()=>{
 assert.equal(L.title('18_sept.gpx',null),'18_sept');
 assert.equal(L.title('ronda.GPX',undefined),'ronda');
 assert.equal(L.title('ronda.gpx',{title:'Ronda de Hicham'}),'Ronda de Hicham');
 assert.equal(L.title('ronda.gpx',{title:'   '}),'ronda');
 assert.equal(L.title('',null),'Mi ruta');
 assert.equal(L.title(null,null),'Mi ruta');
 assert.equal(L.title('x'.repeat(200),null).length,80);
});

test('la huella depende de las coordenadas y no del nombre',()=>{
 const a=L.fingerprint([{pts}]),b=L.fingerprint([{pts:pts.slice()}]);
 assert.equal(a,b);                                   // misma ronda, misma ficha
 assert.notEqual(a,L.fingerprint([{pts:pts.slice().reverse()}]));
 assert.notEqual(a,L.fingerprint([{pts},{pts}]));
 assert.equal(L.fingerprint(null),'[]');
});

test('el segmento elegido nunca se sale del rango guardado',()=>{
 const tres=[{pts},{pts},{pts}];
 assert.equal(L.selection(2,tres),2);
 assert.equal(L.selection(9,tres),0);
 assert.equal(L.selection(-1,tres),0);
 assert.equal(L.selection(1.5,tres),0);
 assert.equal(L.selection(1,[{pts}]),0);
 assert.equal(L.selection(1,null),0);
});
