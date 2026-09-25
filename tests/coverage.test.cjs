const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../coverage-core');

test('añadir tramos los funde en vez de acumular miles',()=>{
 let l=C.add([],0,100);
 assert.deepEqual(l,[[0,100]]);
 l=C.add(l,100,200);
 assert.deepEqual(l,[[0,200]],'seguidos se juntan en uno');
 l=C.add(l,50,150);
 assert.deepEqual(l,[[0,200]],'dentro no cambia nada');
 l=C.add(l,400,500);
 assert.deepEqual(l,[[0,200],[400,500]],'separados quedan aparte');
 l=C.add(l,180,420);
 assert.deepEqual(l,[[0,500]],'lo de en medio los une');
});

test('el orden en que llegan no importa',()=>{
 let l=C.add([],400,500);
 l=C.add(l,0,100);
 l=C.add(l,200,300);
 assert.deepEqual(l,[[0,100],[200,300],[400,500]]);
});

test('lo que no es un tramo no entra',()=>{
 assert.deepEqual(C.add([],5,5),[],'sin longitud no es un tramo');
 assert.deepEqual(C.add([],10,5),[[5,10]],'al reves se endereza');
 assert.deepEqual(C.add([],null,100),[]);
 assert.deepEqual(C.add([],'',100),[],'cadena vacia no es cero');
 assert.deepEqual(C.add([],NaN,100),[]);
 assert.deepEqual(C.add(null,0,10),[[0,10]]);
 assert.deepEqual(C.add([[0,'x'],[1,2]],5,6),[[1,2],[5,6]],'la basura se descarta');
});

test('un paso normal da por recorrido lo de en medio',()=>{
 const l=C.step([[0,100]],100,140);
 assert.deepEqual(l,[[0,140]]);
});

test('un salto grande no se da por recorrido: eso es el hueco que hay que ver',()=>{
 const l=C.step([[0,100]],100,600);
 assert.equal(l.length,2,'queda un hueco');
 assert.deepEqual(l[0],[0,100]);
 assert.ok(l[1][0]===600,'solo cuenta donde esta ahora');
 assert.ok(C.gaps(l).length===1,'y el hueco se ve');
});

test('el umbral del salto se puede ajustar y tiene un valor por defecto',()=>{
 assert.equal(C.MAX_SALTO,150);
 assert.deepEqual(C.step([[0,100]],100,240),[[0,240]],'140 no pasa de 150: se recorre');
 assert.deepEqual(C.step([[0,100]],100,251),[[0,100],[251,251.001]],'151 sí pasa: queda hueco');
 assert.deepEqual(C.step([[0,100]],100,200),[[0,200]],'100 de salto sí se recorre');
 assert.deepEqual(C.step([[0,100]],100,200,{maxJump:50}),[[0,100],[200,200.001]],'con 50 ya no');
});

test('el primer paso y los pasos hacia atras no inventan recorrido',()=>{
 const primero=C.step([],null,300);
 assert.equal(primero.length,1);
 assert.ok(primero[0][1]-primero[0][0]<1,'solo el punto, no de cero a 300');
 const atras=C.step([[0,500]],500,200);
 assert.deepEqual(atras,[[0,500]],'volver sobre lo andado no añade nada');
 assert.deepEqual(C.step([[0,10]],0,null),[[0,10]],'sin posicion no se toca');
});

test('solo son huecos los que tienen recorrido a los dos lados',()=>{
 // Lo que queda por delante no es un tramo saltado, es ronda sin terminar.
 assert.deepEqual(C.gaps([[0,500]]),[],'parar a la mitad no es haberse saltado nada');
 assert.deepEqual(C.gaps([[200,500]]),[],'empezar mas adelante tampoco');
 assert.deepEqual(C.gaps([[0,200],[500,900]]),[[200,500]],'saltarse el medio si');
});

test('los huecos pequeños no molestan; los grandes si',()=>{
 assert.equal(C.MIN_HUECO,80);
 assert.deepEqual(C.gaps([[0,200],[240,500]]),[],'40 m son ruido de GPS');
 assert.deepEqual(C.gaps([[0,200],[300,500]]),[[200,300]],'100 m ya es un tramo');
 assert.deepEqual(C.gaps([[0,200],[240,500]],10),[[200,240]],'el umbral se puede bajar');
});

test('varios huecos salen todos y en orden',()=>{
 const g=C.gaps([[0,100],[300,400],[800,1000]]);
 assert.deepEqual(g,[[100,300],[400,800]]);
 assert.equal(C.metres(g),600);
 assert.deepEqual(C.longest(g),[400,800]);
 assert.equal(C.longest([]),null);
});

test('el resumen se lee de un vistazo y calla cuando no hay nada',()=>{
 assert.equal(C.summary([]),'');
 assert.equal(C.summary(null),'','sin datos no se inventa un cartel');
 assert.equal(C.summary([[100,300]]),'1 tramo sin pasar · 200 m');
 assert.equal(C.summary([[100,300],[400,800]]),'2 tramos sin pasar · 600 m');
 assert.equal(C.summary([[0,1500]]),'1 tramo sin pasar · 1,5 km');
});

test('la voz avisa sin dar una orden que no toca',()=>{
 assert.equal(C.voice([]),'');
 assert.match(C.voice([[100,300]]),/un tramo sin pasar, de 200 m/);
 assert.match(C.voice([[100,300],[400,800]]),/2 tramos sin pasar, 600 m/);
 // No debe decirle al conductor que de la vuelta: eso lo decide quien conduce.
 assert.ok(!/vuelve|regresa|da la vuelta/i.test(C.voice([[100,300]])));
});

test('guardar y recuperar deja la lista igual, redondeada a metros',()=>{
 const l=[[0.4,100.6],[300.2,400.9]];
 assert.deepEqual(C.pack(l),[[0,101],[300,401]]);
 // El marcador de "estoy aqui" tras un salto mide un milimetro: redondeado se quedaria en
 // longitud cero y se perderia al recargar, cambiando el hueco.
 assert.deepEqual(C.pack([[700,700.001]]),[[700,701]],'no se pierde el punto');
 assert.deepEqual(C.unpack(C.pack([[700,700.001]])),[[700,701]]);
 const saltado=C.step([[0,400]],400,700);
 assert.deepEqual(C.gaps(C.unpack(C.pack(saltado))),C.gaps(saltado),
  'guardar y recuperar no cambia los huecos');
 assert.deepEqual(C.unpack(C.pack(l)),[[0,101],[300,401]]);
 assert.deepEqual(C.unpack(JSON.stringify(C.pack(l))),[[0,101],[300,401]]);
 assert.deepEqual(C.unpack('esto no es json'),[],'un guardado roto no rompe nada');
 assert.deepEqual(C.unpack(null),[]);
 assert.deepEqual(C.unpack(undefined),[]);
});

test('una ronda que repite calle no se confunde: cada pasada es su tramo',()=>{
 // Calle arriba (0-300), la misma calle abajo (300-600), y la siguiente (600-900).
 let l=[];
 for(let d=0;d<=900;d+=30)l=C.step(l,d?d-30:null,d);
 assert.deepEqual(C.gaps(l),[],'pasando por todo no hay huecos');
 assert.ok(Math.abs(C.metres(l)-900)<1);
});

test('el caso que importa: saltarse una calle de la ronda',()=>{
 let l=[];
 // Se recorre hasta 400, se salta de 400 a 700, y se sigue hasta 1000.
 for(let d=0;d<=400;d+=25)l=C.step(l,d?d-25:null,d);
 l=C.step(l,400,700);
 for(let d=725;d<=1000;d+=25)l=C.step(l,d-25,d);
 const g=C.gaps(l);
 assert.equal(g.length,1);
 assert.deepEqual(g[0],[400,700]);
 assert.equal(C.summary(g),'1 tramo sin pasar · 300 m');
});

// ---- el registro es de una ronda, no de siempre ----
// Sin esto, despues de la primera vuelta completa todo quedaria cubierto y saltarse una
// calle mañana no se notaria: la funcion dejaria de servir justo cuando hace falta.

test('la fecha es la local, no la de Greenwich',()=>{
 // Una ronda que sale a las seis de la mañana es de hoy, no de ayer.
 const seis=new Date(2026,8,25,6,0,0);       // 25 de septiembre de 2026, hora local
 assert.equal(C.today(seis),'2026-09-25');
 assert.equal(C.today(new Date(2026,0,5,23,30)),'2026-01-05','mes y dia con dos cifras');
 assert.equal(C.today(new Date('fecha mala')),'');
 assert.match(C.today(),/^\d{4}-\d{2}-\d{2}$/,'sin argumento, hoy');
});

test('lo guardado de otro dia no cuenta',()=>{
 const l=[[0,200],[500,900]];
 const guardado=C.packDay(l,'2026-09-25');
 assert.deepEqual(C.unpackDay(guardado,'2026-09-25'),l,'el mismo dia sí');
 assert.deepEqual(C.unpackDay(guardado,'2026-09-26'),[],'el dia siguiente, a cero');
 assert.deepEqual(C.unpackDay(JSON.stringify(guardado),'2026-09-25'),l,'tambien como texto');
});

test('un guardado viejo o roto no tapa huecos',()=>{
 // Antes se guardaba una lista suelta, sin dia: no se puede saber de cuando es.
 assert.deepEqual(C.unpackDay([[0,900]],'2026-09-25'),[],'la lista suelta se descarta');
 assert.deepEqual(C.unpackDay('[[0,900]]','2026-09-25'),[]);
 assert.deepEqual(C.unpackDay('esto no es json','2026-09-25'),[]);
 assert.deepEqual(C.unpackDay(null,'2026-09-25'),[]);
 assert.deepEqual(C.unpackDay({t:[[0,900]]},'2026-09-25'),[],'sin dia no vale');
 assert.deepEqual(C.unpackDay({d:'',t:[[0,900]]},''),[],'dia vacio tampoco');
});

test('empezar desde el principio es empezar la ronda de nuevo',()=>{
 assert.equal(C.INICIO,50);
 assert.equal(C.newRound(0),true);
 assert.equal(C.newRound(49),true);
 assert.equal(C.newRound(50),false,'justo en el umbral ya no');
 assert.equal(C.newRound(300),false,'continuar a media ronda no borra nada');
 assert.equal(C.newRound(300,{inicio:400}),true,'el umbral se puede ajustar');
 assert.equal(C.newRound(null),false,'sin dato no se borra nada');
 assert.equal(C.newRound(''),false);
 assert.equal(C.newRound('x'),false);
});

test('una segunda vuelta completa no puede esconder un salto',()=>{
 // La vuelta de ayer cubria todo; hoy se empieza de cero y se salta un tramo.
 const ayer=C.packDay([[0,1000]],'2026-09-24');
 let hoy=C.unpackDay(ayer,'2026-09-25');
 assert.deepEqual(hoy,[],'lo de ayer no cuenta');
 for(let d=0;d<=400;d+=25)hoy=C.step(hoy,d?d-25:null,d);
 hoy=C.step(hoy,400,700);
 for(let d=725;d<=1000;d+=25)hoy=C.step(hoy,d-25,d);
 assert.deepEqual(C.gaps(hoy),[[400,700]],'el salto de hoy se ve igual');
});
