const test=require('node:test'),assert=require('node:assert/strict'),A=require('../layout-audit-core');

const VP={vw:400,vh:800};
const caja=(t,l,w,h)=>({top:t,left:l,width:w,height:h,bottom:t+h,right:l+w});
const item=(o)=>({name:'boton',rect:caja(100,100,120,44),vw:VP.vw,vh:VP.vh,fixed:false,scrolls:false,hit:'self',...o});

test('un control visible y sin nada encima no es un problema',()=>{
 assert.equal(A.judge(item()),null);
});

test('un control tapado se senala, y por quien',()=>{
 const m=A.judge(item({hit:'sim-panel'}));
 assert.deepEqual(m,{q:'tapado',name:'boton',por:'sim-panel',grave:true});
});

test('tapado pero se destapa bajando: molesto, no grave',()=>{
 // Contenido de la pagina bajo un panel fijo: basta con desplazar un poco.
 const blando=A.judge(item({hit:'sim-panel',scrolls:true,fixed:false}));
 assert.equal(blando.grave,false);
 // Un control fijo tapado por otro fijo no se destapa nunca, por mucho que se baje.
 const duro=A.judge(item({hit:'sim-panel',scrolls:true,fixed:true}));
 assert.equal(duro.grave,true);
});

test('el informe separa lo grave de lo que solo molesta',()=>{
 const r=A.report([
  item({name:'fijo-tapado',hit:'panel',fixed:true,scrolls:true}),
  item({name:'pagina-tapada',hit:'panel',fixed:false,scrolls:true}),
  item()]);
 assert.deepEqual(r.malos.map(m=>m.name),['fijo-tapado']);
 assert.deepEqual(r.avisos.map(m=>m.name),['pagina-tapada']);
 assert.equal(r.limpio,false);
 assert.match(A.headline(r),/1 problema en 3 controles\. · 1 se destapa bajando/);
});

test('solo avisos blandos cuenta como limpio, pero se dicen',()=>{
 const r=A.report([item({name:'x',hit:'panel',fixed:false,scrolls:true})]);
 assert.equal(r.limpio,true,'nada impide usar la app');
 assert.equal(r.avisos.length,1);
 assert.match(A.headline(r),/Sin problemas.*1 se destapa bajando/);
});

test('que el clic caiga en algo del propio control no es estar tapado',()=>{
 // Pulsar un boton con un <b> dentro devuelve el <b>: lo resuelve quien recorre el DOM.
 assert.equal(A.judge(item({hit:'self'})),null);
});

test('fuera de la ventana solo importa si no se puede desplazar hasta ello',()=>{
 const abajo=item({rect:caja(900,100,120,44)});
 assert.equal(A.judge(abajo),null,'en una pagina que se desplaza, basta con bajar');
 assert.deepEqual(A.judge({...abajo,fixed:true}),{q:'no se alcanza',name:'boton',grave:true});
});

test('cortado por arriba tampoco se alcanza si esta fijo',()=>{
 const cortado=item({rect:caja(-20,100,120,44),fixed:true});
 assert.deepEqual(A.judge(cortado),{q:'no se alcanza',name:'boton',grave:true});
});

test('un pixel de margen no es un fallo',()=>{
 // Pegado al borde inferior exacto: cuenta como dentro.
 assert.equal(A.judge(item({rect:caja(756,100,120,44)})),null);
 assert.equal(A.inside(caja(0,0,400,800),400,800),true);
});

test('lo que no se ve no se juzga',()=>{
 assert.equal(A.judge(item({rect:caja(100,100,0,0)})),null);
 assert.equal(A.judge(item({rect:caja(100,100,1,1)})),null,'un pixel no es un control');
 assert.equal(A.judge(null),null);
 assert.equal(A.big(null),false);
});

test('el informe junta los problemas y cuenta lo revisado',()=>{
 const r=A.report([item(),item({name:'a',hit:'panel'}),item({name:'b',rect:caja(900,0,50,50),fixed:true})]);
 assert.equal(r.revisados,3);
 assert.equal(r.malos.length,2);
 assert.equal(r.limpio,false);
 assert.deepEqual(r.malos.map(m=>m.name),['a','b']);
});

test('una pagina limpia lo dice',()=>{
 const r=A.report([item(),item({name:'otro'})]);
 assert.equal(r.limpio,true);
 assert.equal(A.headline(r),'Sin problemas: 2 controles revisados.');
});

test('el desplazamiento lateral de la pagina tambien es un problema',()=>{
 const r=A.report([item()],{overflowX:true});
 assert.equal(r.limpio,false);
 assert.match(r.malos[0].q,/se desplaza de lado/);
});

test('cada problema se lee en una linea',()=>{
 assert.equal(A.line({q:'tapado',name:'Ampliar mapa',por:'sv-box'}),'Ampliar mapa — tapado por sv-box');
 assert.equal(A.line({q:'no se alcanza',name:'Parar'}),'Parar — no se alcanza');
 assert.equal(A.headline(A.report([item({hit:'x'})])),'1 problema en 1 controles.');
 assert.equal(A.headline(null),'');
});

test('el centro de un rectangulo se redondea a pixel',()=>{
 assert.deepEqual(A.centre(caja(100,100,121,45)),{x:161,y:123});
});

test('una lista vacia no es un fallo',()=>{
 const r=A.report([]);
 assert.equal(r.limpio,true);
 assert.equal(r.revisados,0);
 assert.equal(A.report(null).limpio,true);
});
