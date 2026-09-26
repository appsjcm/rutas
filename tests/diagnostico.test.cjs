const test=require('node:test'),assert=require('node:assert/strict');
const D=require('../diagnostico-core');

test('el navegador se resume sin modelo ni nada que identifique',()=>{
 assert.equal(D.navegador('Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'),'iPhone · iOS 18.5 · Safari 18.5');
 assert.equal(D.navegador('Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'),'iPhone · iOS 17.2 · Safari','instalada en inicio no dice Version/');
 assert.equal(D.navegador('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36'),'Android 14 · Chrome 128');
 assert.equal(D.navegador('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0'),'Windows · Edge 128');
 assert.equal(D.navegador('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1'),'iPhone · iOS 18.0 · Chrome 129');
 assert.equal(D.navegador(''),'Otro');
 assert.ok(!/Pixel/.test(D.navegador('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/128.0 Mobile')),'sin el modelo');
});

test('tamaños legibles',()=>{
 assert.equal(D.tamano(0),'1 KB');
 assert.equal(D.tamano(300*1024),'300 KB');
 assert.equal(D.tamano(740000),'723 KB');
 assert.equal(D.tamano(1.6*1048576),'1,6 MB');
 assert.equal(D.tamano(undefined),'desconocido');
});

test('las filas salen siempre, aunque falten datos',()=>{
 const f=D.filas({});
 assert.equal(f.length,9);
 assert.deepEqual(f.map(x=>x[0]),['Versión','Navegador','Instalada en inicio','Almacenamiento','Pantalla encendida','Voz','Permiso de GPS','Conexión','Errores recientes']);
 assert.ok(f.every(([,v])=>typeof v==='string'&&v.length));
});

test('cada dato se dice en castellano llano',()=>{
 const f=Object.fromEntries(D.filas({version:'rutas-guia-v187',instalada:true,usado:740000,persistente:true,pantalla:'off',voces:3,voz:'Mónica (mejorada)',gps:'granted',enLinea:false,errores:[{m:'x'}]}));
 assert.equal(f['Versión'],'rutas-guia-v187');
 assert.equal(f['Instalada en inicio'],'sí');
 assert.equal(f['Almacenamiento'],'723 KB · protegido del borrado');
 assert.equal(f['Pantalla encendida'],'el móvil no lo dejó');
 assert.equal(f['Voz'],'3 en castellano · Mónica (mejorada)');
 assert.equal(f['Permiso de GPS'],'concedido');
 assert.equal(f['Conexión'],'sin conexión');
 assert.equal(f['Errores recientes'],'1');
 assert.equal(Object.fromEntries(D.filas({voces:0}))['Voz'],'ninguna en castellano');
});

test('el texto para copiar lleva las filas y los errores, sin nada de la ruta',()=>{
 const t=D.texto({version:'v1',errores:[{t:'06:52:33',m:'Invalid LatLng object: (NaN, NaN)',f:'navigation.js',l:231}]});
 assert.match(t,/^Diagnóstico de Rutas\nVersión: v1\n/);
 assert.match(t,/· 06:52:33 Invalid LatLng object: \(NaN, NaN\) \(navigation\.js:231\)$/);
 assert.ok(!/lat=|lon=|gpx/i.test(t));
});
