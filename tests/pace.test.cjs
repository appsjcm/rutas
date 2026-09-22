const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../pace-core'),N=require('../nav-core');

// Una recta con horas: 100 puntos a 11,1 m y 30 s de separacion. Asi la grabacion tarda
// 30 s por cada tramo y los numeros salen a mano.
function grabada(n=100,paso=30){
 const pts=[],t0=Date.parse('2026-09-22T06:00:00Z');
 for(let i=0;i<n;i++)pts.push({lat:41.9+i*1e-4,lon:1.87,time:new Date(t0+i*paso*1000).toISOString()});
 return N.prepare(pts);
}
const ruta=grabada();
const tramo=ruta.total/(ruta.pts.length-1);     // metros entre puntos

test('lee cuanto tardo la grabacion hasta un punto',()=>{
 const cerca=(a,b,msg)=>assert.ok(Math.abs(a-b)<0.01,msg+': '+a+' vs '+b);
 cerca(P.recordedSeconds(ruta,0),0,'el inicio');
 cerca(P.recordedSeconds(ruta,tramo*10),300,'diez tramos de 30 s');
 cerca(P.recordedSeconds(ruta,tramo*10.5),315,'medio tramo se interpola');
 cerca(P.recordedSeconds(ruta,ruta.total),99*30,'el final');
 assert.equal(P.recordedSeconds(null,0),null);
});

test('un GPX sin horas no se puede comparar y se dice',()=>{
 const sinHoras=N.prepare([{lat:41.9,lon:1.87},{lat:41.91,lon:1.87}]);
 assert.equal(P.recordedSeconds(sinHoras,0),null);
 assert.equal(P.pace(sinHoras,0,100,600),null);
 assert.equal(P.label(null),'');
 assert.match(P.detail(null),/no trae horas/);
 assert.equal(P.tone(null),'idle');
});

test('una ronda invertida tambien se compara: solo importa la separacion',()=>{
 const alReves=N.prepare(ruta.pts.slice().reverse());
 assert.ok(Math.abs(P.recordedSeconds(alReves,0))<0.01);
 assert.ok(Math.abs(P.recordedSeconds(alReves,tramo*10)-300)<0.01);
});

test('compara el tramo recorrido, no la jornada entera',()=>{
 // De km 0 a diez tramos la grabacion tardo 300 s; hoy se han gastado 480.
 const p=P.pace(ruta,0,tramo*10,480);
 assert.ok(Math.abs(p.recorded-300)<0.01);
 assert.ok(Math.abs(p.delta-180)<0.01);
 assert.equal(p.behind,true);
 assert.equal(p.ahead,false);
 // Arrancando a mitad solo cuenta lo hecho desde ahi.
 const q=P.pace(ruta,tramo*50,tramo*60,240);
 assert.ok(Math.abs(q.recorded-300)<0.01);
 assert.ok(Math.abs(q.delta+60)<0.01);
});

test('menos de dos minutos es ruido, no retraso',()=>{
 assert.equal(P.pace(ruta,0,tramo*10,300).onTime,true);
 assert.equal(P.pace(ruta,0,tramo*10,400).onTime,true);      // 100 s de mas
 assert.equal(P.pace(ruta,0,tramo*10,421).behind,true);      // 121 s ya si
 assert.equal(P.pace(ruta,0,tramo*10,179).ahead,true);
 assert.equal(P.label(P.pace(ruta,0,tramo*10,300)),'A tiempo');
});

test('el rotulo se lee de reojo y el detalle lo explica',()=>{
 const tarde=P.pace(ruta,0,tramo*10,1020);                   // 720 s de mas
 assert.equal(P.label(tarde),'+12 min');
 assert.equal(P.detail(tarde),'Vas 12 min por detrás de la grabación.');
 assert.equal(P.tone(tarde),'behind');
 const pronto=P.pace(ruta,0,tramo*10,0);
 assert.equal(P.label(pronto),'−5 min');
 assert.equal(P.detail(pronto),'Vas 5 min por delante de la grabación.');
 assert.equal(P.tone(pronto),'ahead');
});

test('las horas largas se dicen en horas y minutos',()=>{
 assert.equal(P.spell(0),'0 min');
 assert.equal(P.spell(59),'1 min');
 assert.equal(P.spell(3600),'1 h');
 assert.equal(P.spell(4500),'1 h 15');
 assert.equal(P.spell(-720),'12 min');
});

test('ir hacia atras por el recorrido no produce un ritmo inventado',()=>{
 assert.equal(P.recordedBetween(ruta,tramo*20,tramo*10),null);
 assert.equal(P.pace(ruta,tramo*20,tramo*10,300),null);
 assert.equal(P.pace(ruta,0,tramo*10,-5),null);
 assert.equal(P.pace(ruta,0,tramo*10,'x'),null);
});
