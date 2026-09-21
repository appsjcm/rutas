const test=require('node:test'),assert=require('node:assert/strict'),S=require('../sim-core');
const metros=(a,b)=>{const r=Math.PI/180,kx=111320*Math.cos(a.lat*r),ky=110540;
 return Math.hypot((b.lon-a.lon)*kx,(b.lat-a.lat)*ky);};

test('avanza segun la velocidad y el tiempo',()=>{
 assert.equal(S.advance(0,36,10),100);              // 36 km/h = 10 m/s
 assert.equal(S.advance(500,72,5),600);
 assert.equal(S.advance(100,0,10),100);             // parado no avanza
 assert.equal(S.advance(0,50,0),0);
 for(const mal of [[NaN,50,1],[0,-50,1],[0,50,-1]])assert(Number.isFinite(S.advance(...mal)));
});

test('el desvio se aparta en perpendicular a la marcha',()=>{
 const a={lat:41.976,lon:1.873},b={lat:41.980,lon:1.873};   // rumbo norte
 const fuera=S.sidestep(a,b,100);
 assert(Math.abs(metros(a,fuera)-100)<1);                   // se aparta 100 m
 assert(Math.abs(fuera.lat-a.lat)<1e-6);                    // sin avanzar hacia el norte
 assert(fuera.lon!==a.lon);                                 // el desplazamiento es en longitud
 // 50 m se aparta la mitad, y hacia el mismo lado
 const mitad=S.sidestep(a,b,50);
 assert(Math.abs(metros(a,mitad)-50)<1);
 assert.equal(Math.sign(mitad.lon-a.lon),Math.sign(fuera.lon-a.lon));
 // sin desvio, o sin rumbo, devuelve el punto tal cual
 assert.deepEqual(S.sidestep(a,b,0),{lat:a.lat,lon:a.lon});
 assert.deepEqual(S.sidestep(a,a,100),{lat:a.lat,lon:a.lon});
});

test('el ruido se queda dentro del radio pedido y es reproducible',()=>{
 const p={lat:41.976,lon:1.873};
 let i=0;const secuencia=[0.25,0.81,0.5,0.04,0.99,0.36];
 const rnd=()=>secuencia[i++%secuencia.length];
 for(let k=0;k<30;k++){const q=S.jitter(p,40,()=>Math.random());assert(metros(p,q)<=40.5);}
 i=0;const a=S.jitter(p,40,rnd);i=0;const b=S.jitter(p,40,rnd);
 assert.deepEqual(a,b);                                     // mismo generador, mismo resultado
 assert.deepEqual(S.jitter(p,0,rnd),{lat:p.lat,lon:p.lon}); // sin ruido no mueve
});

test('las calidades de senal describen valle y campo abierto',()=>{
 assert.equal(S.quality('bueno').dropEvery,0);              // no se pierde ni una
 assert(S.quality('malo').accuracy>S.quality('regular').accuracy);
 assert(S.quality('malo').dropEvery<S.quality('regular').dropEvery); // falla mas a menudo
 assert.equal(S.quality('inventada').label,'Buena');        // valor desconocido cae en buena
 assert.equal(S.quality(undefined).label,'Buena');
});

test('los huecos de senal caen con la cadencia indicada',()=>{
 const perdidos=[];for(let t=1;t<=12;t++)if(S.drops(t,3))perdidos.push(t);
 assert.deepEqual(perdidos,[3,6,9,12]);
 assert.equal(S.drops(5,0),false);                          // cadencia cero no pierde nada
 assert.equal(S.drops(0,3),false);
});

test('la velocidad se entrega en metros por segundo',()=>{
 assert.equal(S.speedOf(36),10);
 assert.equal(S.speedOf(0),0);
 assert.equal(S.speedOf(-10),0);
 assert.equal(S.speedOf('80'),80/3.6);
});
