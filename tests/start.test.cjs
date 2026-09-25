const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../start-core');

test('una posicion util deja empezar; una mala dice por que',()=>{
 const bueno=S.usable({d:1200,error:8},{accuracy:10});
 assert.equal(bueno.ok,true);
 assert.equal(bueno.motivo,'');
 // Sin motivo, el conductor no sabe si esperar o hacer otra cosa.
 const impreciso=S.usable({d:1200,error:8},{accuracy:120});
 assert.equal(impreciso.ok,false);
 assert.match(impreciso.motivo,/precisión del GPS es de 120 m/);
 assert.match(impreciso.motivo,/elige el punto en el mapa/);
 const lejos=S.usable({d:1200,error:400},{accuracy:10});
 assert.equal(lejos.ok,false);
 assert.match(lejos.motivo,/Estás a 400 m del recorrido/);
});

test('los umbrales tienen valor por defecto y se pueden ajustar',()=>{
 assert.equal(S.MAX_ERROR,60);
 assert.equal(S.MAX_PRECISION,40);
 assert.equal(S.usable({d:0,error:60},{accuracy:40}).ok,true,'justo en el limite vale');
 assert.equal(S.usable({d:0,error:61},{accuracy:40}).ok,false);
 assert.equal(S.usable({d:0,error:41},{accuracy:10}).ok,true);
 assert.equal(S.usable({d:0,error:41},{accuracy:10,maxError:40}).ok,false);
 assert.equal(S.usable({d:0,error:5},{accuracy:50,maxAccuracy:80}).ok,true);
});

test('sin punto o con un punto imposible no se empieza',()=>{
 assert.equal(S.usable(null).ok,false);
 assert.equal(S.usable({}).ok,false);
 assert.equal(S.usable({d:null}).ok,false,'Number(null) es 0: un punto vacio no es el km cero');
 assert.equal(S.usable({d:''}).ok,false);
 assert.equal(S.usable({d:'x'}).ok,false);
 assert.equal(S.usable({d:0,error:5}).ok,true,'el kilometro cero si es un punto');
 // Sin precision conocida no se rechaza: tocar el mapa no trae precision.
 assert.equal(S.usable({d:500,error:10},{}).ok,true);
});

test('el texto dice donde se empieza y sobre que total',()=>{
 assert.equal(S.describe(3400,26000),'Empezarás en 3,4 km de 26,0 km.');
 assert.equal(S.describe(450,26000),'Empezarás en 450 m de 26,0 km.');
 assert.equal(S.describe(0,26000),'Empezarás desde el inicio del recorrido.');
 assert.equal(S.describe(20,26000),'Empezarás desde el inicio del recorrido.','30 m es el inicio');
 assert.match(S.describe(25990,26000),/final del recorrido/);
 assert.equal(S.describe(null,26000),'');
 assert.equal(S.describe(500,null),'Empezarás en 500 m.','sin total, solo el punto');
});

test('empezar a media ronda avisa de lo que queda atras',()=>{
 assert.equal(S.warning(0,26000),'','desde el inicio no hay nada que avisar');
 assert.equal(S.warning(20,26000),'');
 assert.equal(S.warning(3400,26000),'Lo anterior a ese punto quedará sin recorrer.');
 assert.equal(S.warning(25995,26000),'','el final tiene su propio mensaje');
 assert.equal(S.warning(null,26000),'');
});

test('saber si el punto elegido es el principio',()=>{
 assert.equal(S.CERCA,30);
 assert.equal(S.atStart(0),true);
 assert.equal(S.atStart(30),true);
 assert.equal(S.atStart(31),false);
 assert.equal(S.atStart(null),false);
 assert.equal(S.atStart(''),false,'vacio no es el kilometro cero');
});

test('las distancias se leen como en el resto de la aplicacion',()=>{
 assert.equal(S.texto(0),'0 m');
 assert.equal(S.texto(999),'999 m');
 assert.equal(S.texto(1000),'1,0 km');
 assert.equal(S.texto(26000),'26,0 km');
 assert.equal(S.texto(null),'—');
 assert.equal(S.texto('x'),'—');
});

// ---- una ronda pasa dos veces por la misma calle ----
// Quedarse con la pasada mas cercana en linea recta acierta la mitad de las veces.

test('con una sola pasada no se pregunta; con varias sí',()=>{
 assert.equal(S.needsChoice([{d:300}]),false);
 assert.equal(S.needsChoice([{d:300},{d:520}]),true);
 assert.equal(S.needsChoice([]),false);
 assert.equal(S.needsChoice(null),false);
});

test('cada pasada se distingue por su numero y su punto',()=>{
 const c=S.choices([{d:332},{d:527}],878);
 assert.equal(c.length,2);
 assert.equal(c[0].label,'Pasada 1 · 332 m');
 assert.equal(c[1].label,'Pasada 2 · 527 m');
 assert.equal(c[0].d,332);
 assert.match(c[0].title,/Empezarás en 332 m de 878 m/);
 assert.equal(S.choices([{d:1500},{d:12000}],26000)[1].label,'Pasada 2 · 12,0 km');
});

test('lo que no es una pasada no entra en la lista',()=>{
 assert.deepEqual(S.choices(null),[]);
 assert.deepEqual(S.choices([null,{d:'x'},{}]),[]);
 assert.equal(S.choices([{d:0},{d:500}]).length,2,'el kilometro cero es una pasada');
});

test('los textos dicen cuantas hay y que hacer si no hay ninguna',()=>{
 assert.equal(S.askText([{d:1}]),'');
 assert.equal(S.askText([]),'');
 assert.match(S.askText([{d:1},{d:2}]),/pasa 2 veces/);
 assert.match(S.askText([{d:1},{d:2},{d:3}]),/pasa 3 veces/);
 assert.match(S.noneText(),/menos de 60 m/);
});
