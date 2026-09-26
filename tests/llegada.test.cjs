const test=require('node:test'),assert=require('node:assert/strict'),L=require('../llegada-core');

const HORA=3600*1000;
const INICIO=Date.UTC(2026,8,26,4,0);
const base={total:104210,from:0,since:INICIO,now:INICIO+6*HORA+12*60000,stops:14,pace:{delta:-480,onTime:false}};

test('la ronda entera: cuanto, en cuanto tiempo, paradas y ritmo',()=>{
 const r=L.resumen(base);
 assert.equal(r.titulo,'Ronda terminada');
 assert.deepEqual(r.filas,[['Recorrido','104 km en 6 h 12 min'],['Paradas','14 de 14'],['Ritmo','8 min por delante de la grabación']]);
 assert.equal(r.aviso,'');
});

test('arrancando a mitad de ronda se dice desde donde, y solo cuenta lo de hoy',()=>{
 const r=L.resumen({...base,from:12300,stopsDone:10});
 assert.deepEqual(r.filas.slice(0,3),[['Recorrido','92 km en 6 h 12 min'],['Desde','el km 12,3'],['Paradas','10 de 14']]);
 assert.equal(L.resumen({...base,from:300}).filas[0][1],'104 km en 6 h 12 min','unos metros del inicio es el inicio');
 assert.equal(L.resumen({...base,from:300}).filas.some(f=>f[0]==='Desde'),false);
});

test('el ritmo se dice en pasado y en palabras',()=>{
 assert.equal(L.ritmo({delta:30,onTime:true}),'Al ritmo de la grabación');
 assert.equal(L.ritmo({delta:754,onTime:false}),'13 min por detrás de la grabación');
 assert.equal(L.ritmo({delta:-3900,onTime:false}),'1 h 05 min por delante de la grabación');
 assert.equal(L.ritmo(null),'','sin horas en el GPX no hay ritmo');
});

test('lo que falta no se calla: se da como aviso',()=>{
 assert.equal(L.resumen({...base,falta:'2 tramos sin pasar · 350 m'}).aviso,'2 tramos sin pasar · 350 m');
});

test('sin datos de tiempo, paradas o ritmo, se dice lo que hay',()=>{
 const r=L.resumen({total:1133,from:null,since:null,now:Date.now(),stops:0,pace:null});
 assert.deepEqual(r.filas,[['Recorrido','1,1 km']]);
 assert.deepEqual(L.resumen(null).filas,[['Recorrido','0 m']]);
 assert.equal(L.resumen({...base,since:base.now-10000}).filas[0][1],'104 km','diez segundos no es una duracion');
});

test('duraciones y distancias como en el resto de la app',()=>{
 assert.equal(L.duracion(45*60),'45 min');
 assert.equal(L.duracion(2*3600),'2 h');
 assert.equal(L.duracion(2*3600+5*60),'2 h 05 min');
 assert.equal(L.distancia(850),'850 m');
 assert.equal(L.distancia(9449),'9,4 km');
 assert.equal(L.distancia(104210),'104 km');
});
