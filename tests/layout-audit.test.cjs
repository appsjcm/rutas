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

test('lo que vive en una caja que se desplaza se alcanza igual',()=>{
 // El recorrido del DOM marca fixed solo si ademas no hay caja desplazable encima;
 // aqui se comprueba el trato que le da el nucleo a ese dato.
 const fuera=item({rect:caja(900,100,120,44),fixed:true});
 assert.deepEqual(A.judge(fuera),{q:'no se alcanza',name:'boton',grave:true});
 assert.equal(A.judge({...fuera,fixed:false}),null,'si se puede desplazar, no es un fallo');
});

// ---- capas que flotan sobre el mapa ----
// Se comparan cajas enteras porque elementFromPoint solo mira el centro de cada control:
// una tarjeta puede cubrir media barra de botones sin tocar ningun centro, y eso paso.
function marco(l,r,t,b){return {left:l,right:r,top:t,bottom:b,width:r-l,height:b-t};}

test('dos cajas separadas no se solapan, y rozarse tampoco cuenta',()=>{
 assert.equal(A.overlap(marco(0,100,0,50),marco(0,100,60,90)),null,'una debajo de la otra');
 assert.equal(A.overlap(marco(0,100,0,50),marco(120,200,0,50)),null,'una al lado de la otra');
 assert.equal(A.overlap(marco(0,100,0,50),marco(0,100,50,90)),null,'borde con borde no es solape');
 assert.equal(A.overlap(marco(0,100,0,50),marco(0,100,49,90)),null,'un pixel es redondeo');
 assert.equal(A.overlap(null,marco(0,10,0,10)),null);
 assert.equal(A.overlap(marco(0,10,0,10),null),null);
});

test('cuando se solapan dice cuanto',()=>{
 assert.deepEqual(A.overlap(marco(0,100,0,50),marco(50,200,20,90)),{x:50,y:30});
 assert.deepEqual(A.overlap(marco(0,100,0,100),marco(10,20,10,20)),{x:10,y:10},'una dentro de otra');
});

test('manda el z-index para saber cual queda debajo',()=>{
 const arriba={name:'tarjeta',kind:'dato',z:'615',rect:marco(12,230,133,195)};
 const abajo={name:'barra',kind:'mando',z:'530',rect:marco(12,363,142,196)};
 const r=A.panels([arriba,abajo]);
 assert.equal(r.length,1);
 assert.equal(r[0].name,'barra','debajo queda la de menos z');
 assert.equal(r[0].por,'tarjeta');
 assert.equal(r[0].grave,true,'tapar botones es grave');
});

test('a igual z manda el orden del documento',()=>{
 const primera={name:'primera',kind:'mando',z:'500',rect:marco(0,100,0,100)};
 const segunda={name:'segunda',kind:'dato',z:'500',rect:marco(50,150,50,150)};
 const r=A.panels([primera,segunda]);
 assert.equal(r[0].name,'primera','pinta encima la ultima del documento');
 assert.equal(r[0].por,'segunda');
});

test('tapar una advertencia es grave; dos datos rozandose, no',()=>{
 const encima={name:'tarjeta',kind:'dato',z:'615',rect:marco(0,200,0,60)};
 const aviso={name:'aviso de vía',kind:'aviso',z:'510',rect:marco(0,200,40,90)};
 assert.equal(A.panels([encima,aviso])[0].grave,true);
 const dato={name:'velocímetro',kind:'dato',z:'510',rect:marco(0,200,40,90)};
 assert.equal(A.panels([encima,dato])[0].grave,false);
});

test('el caso real que se escapo: la tarjeta tapaba la barra de vistas',()=>{
 // Medido a 375x667 antes de arreglarlo.
 const antes=A.panels([
  {name:'tarjeta de la calle',kind:'dato',z:'615',rect:marco(12,230,133,195)},
  {name:'barra de vistas',kind:'mando',z:'530',rect:marco(12,363,142,196)}
 ]);
 assert.equal(antes.length,1,'debia detectarse');
 assert.equal(antes[0].grave,true);
 assert.deepEqual(antes[0].solape,{x:218,y:53});
 // Y despues del arreglo, con la barra debajo de la tarjeta.
 const despues=A.panels([
  {name:'tarjeta de la calle',kind:'dato',z:'615',rect:marco(12,230,133,195)},
  {name:'barra de vistas',kind:'mando',z:'530',rect:marco(12,363,206,259)}
 ]);
 assert.deepEqual(despues,[],'ya no se tocan');
});

test('el informe junta los solapes con el resto',()=>{
 const r=A.report([],{panels:[
  {name:'tarjeta',kind:'dato',z:'615',rect:marco(0,200,0,60)},
  {name:'barra',kind:'mando',z:'530',rect:marco(0,200,40,90)},
  {name:'panel',kind:'dato',z:'400',rect:marco(0,200,80,120)}
 ]});
 assert.equal(r.limpio,false);
 assert.equal(r.malos.length,1,'solo el que tapa un mando');
 assert.equal(r.avisos.length,1,'el roce entre datos va aparte');
 assert.match(A.line(r.malos[0]),/barra — tapado por tarjeta \(200×20 px\)/);
});

test('sin capas el informe sigue funcionando igual que antes',()=>{
 assert.equal(A.report([]).limpio,true);
 assert.equal(A.report([],{}).limpio,true);
 assert.equal(A.report([],{panels:null}).limpio,true);
 assert.equal(A.report([],{panels:[]}).limpio,true);
});
