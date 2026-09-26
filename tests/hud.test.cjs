const test=require('node:test'),assert=require('node:assert/strict'),H=require('../hud-core');

test('las distancias se anuncian redondeadas, como un navegador de coche',()=>{
 assert.equal(H.step(183),175);        // por debajo de 300 m, escalon de 25
 assert.equal(H.step(97),100);         // por debajo de 100 m, escalon de 10
 assert.equal(H.step(12),10);
 assert.equal(H.step(3),10,'nunca se anuncia menos de 10 m');
 assert.equal(H.step(340),350);        // de 300 a 1000, escalon de 50
 assert.equal(H.step(1234),1200);      // por encima de 1 km, escalon de 100
 assert.equal(H.step(0),0);
 assert.equal(H.step(-4),0);
 assert.equal(H.step(null),0);
});

test('mas de un kilometro se lee en kilometros',()=>{
 assert.equal(H.distance(183),'175 m');
 assert.equal(H.distance(1234),'1,2 km');
 assert.equal(H.distance(1000),'1,0 km');
 assert.equal(H.distance(0),'');
});

test('las indicaciones del GPX pasan de sustantivo a imperativo',()=>{
 // nav-core solo produce estas tres; las del acceso ya vienen en imperativo.
 assert.equal(H.imperative('Giro a la derecha'),'Gira a la derecha');
 assert.equal(H.imperative('Giro a la izquierda'),'Gira a la izquierda');
 assert.equal(H.imperative('Cambio de sentido'),'Cambia de sentido');
 assert.equal(H.imperative('Sal de la rotonda'),'Sal de la rotonda');
 assert.equal(H.imperative('En la rotonda, toma la salida 2'),'En la rotonda, toma la salida 2');
 assert.equal(H.imperative(''),'');
 assert.equal(H.imperative(null),'');
});

test('el orden es el de un GPS: cuanto falta, que hacer, a donde',()=>{
 const b=H.banner({stage:'prepare',gap:183,turn:{symbol:'↱',label:'Giro a la derecha',toRoad:'Carrer Major',d:900}});
 assert.equal(b.lead,'EN 175 m');
 assert.equal(b.action,'Gira a la derecha');
 assert.equal(b.street,'Carrer Major');
 assert.equal(b.arrow,'↱');
 assert.equal(b.tone,'far');
 assert.equal(b.eyebrow,'','la fase no ocupa sitio: ya lo dice la distancia');
});

test('al llegar al punto la distancia se cambia por AHORA',()=>{
 const b=H.banner({stage:'now',gap:8,turn:{label:'Gira a la izquierda',toRoad:'Carrer Nou',d:100}});
 assert.equal(b.lead,'AHORA');
 assert.equal(b.tone,'now');
});

test('cerca del giro cambia el tono sin cambiar el contenido',()=>{
 assert.equal(H.banner({stage:'near',gap:60,turn:{label:'Gira',d:1}}).tone,'near');
 assert.equal(H.banner({stage:'later',gap:600,turn:{label:'Gira',d:1}}).tone,'far');
});

test('sin nombre de calle se dice de donde sale la indicacion',()=>{
 const b=H.banner({stage:'prepare',gap:200,turn:{label:'Gira a la derecha',d:1}});
 assert.equal(b.street,'Según el GPX');
 assert.equal(b.action,'Gira a la derecha','la accion no se sustituye por el matiz');
});

test('una rotonda destaca el numero de salida y su origen vial',()=>{
 const b=H.banner({stage:'near',gap:80,turn:{symbol:'⟲',label:'En la rotonda, toma la salida 3',roundaboutExit:3,roadContext:true,d:200}});
 assert.equal(b.arrow,'⟲');assert.equal(b.exit,3);assert.equal(b.street,'Maniobra vial');
 assert.equal(H.banner({stage:'near',gap:80,turn:{label:'Gira',roundaboutExit:0,d:200}}).exit,null);
});

test('el siguiente giro va en una linea aparte y en pequeno',()=>{
 const b=H.banner({stage:'prepare',gap:200,turn:{label:'Gira a la derecha',toRoad:'Major',d:900},
                   next:{label:'En la rotonda, toma la salida 2',toRoad:'Carrer del Pont',d:1150}});
 assert.equal(b.after,'Después: en la rotonda, toma la salida 2 · Carrer del Pont · a 250 m');
 assert.equal(H.banner({stage:'prepare',gap:200,turn:{label:'Gira',d:1}}).after,'');
 assert.equal(H.after(null,0),'');
});

test('sin giro a la vista solo se pide seguir',()=>{
 const b=H.banner({stage:'straight',gap:420,turn:null});
 assert.equal(b.action,'Sigue el recorrido');
 assert.equal(b.street,'');
 assert.equal(b.lead,'EN 400 m');
 assert.equal(b.arrow,'↑');
});

test('el acceso y el regreso se distinguen arriba, no en la accion',()=>{
 assert.equal(H.banner({stage:'prepare',gap:100,turn:{label:'Gira',d:1},access:{recovery:false}}).eyebrow,'ACCESO POR CALLES');
 assert.equal(H.banner({stage:'prepare',gap:100,turn:{label:'Gira',d:1},access:{recovery:true}}).eyebrow,'REGRESO AL RECORRIDO');
});

test('sin GPS la cabecera lo dice y no inventa un giro',()=>{
 const b=H.banner({paused:'Sin cobertura GPS ahora mismo.',arrow:'⌖'});
 assert.equal(b.tone,'paused');
 assert.equal(b.lead,'GPS');
 assert.equal(b.eyebrow,'ESPERANDO GPS');
 assert.equal(b.action,'Sin cobertura GPS ahora mismo.');
 assert.equal(b.arrow,'⌖');
 assert.equal(H.banner({paused:true}).action,'Indicaciones pausadas');
});

test('el final es un estado propio',()=>{
 const b=H.banner({end:true,stage:'now',gap:0});
 assert.equal(b.lead,'FIN');
 assert.equal(b.arrow,'✓');
 assert.equal(b.tone,'done');
});

test('al final no se dice completado si faltan tramos',()=>{
 // Decia «Recorrido completado» encima del aviso de que faltaba un tramo.
 const b=H.banner({end:true,missing:'1 tramo sin pasar · 426 m'});
 assert.equal(b.lead,'FIN');
 assert.equal(b.tone,'warning','no es el verde de terminado');
 assert.equal(b.arrow,'!');
 assert.equal(b.action,'1 tramo sin pasar · 426 m');
 assert.ok(!/completado/i.test(b.action+b.street+b.eyebrow),'ni rastro de completado');
 // Dice donde mirar, no que hacer.
 assert.ok(!/vuelve|regresa|da la vuelta/i.test(b.action+b.street));
});

test('sin tramos pendientes el final sigue siendo el de siempre',()=>{
 for(const nada of ['',null,undefined]){
  const b=H.banner({end:true,missing:nada});
  assert.equal(b.tone,'done');
  assert.equal(b.action,'Recorrido completado');
 }
});

test('lo que falta no se cuela antes de llegar al final',()=>{
 const b=H.banner({end:false,missing:'1 tramo sin pasar · 426 m',stage:'far',gap:300,turn:null});
 assert.notEqual(b.tone,'warning');
 assert.ok(!/tramo sin pasar/.test(b.action));
});

test('pantalla y voz comparten el mismo redondeo',()=>{
 // navigation.js construye la frase hablada, pero la distancia sale de aqui:
 // si la pantalla dice 175 m, la voz no puede decir 185 m.
 const s={stage:'prepare',gap:183,turn:{label:'Gira a la derecha',toRoad:'Carrer Major',d:900}};
 assert.equal(H.banner(s).lead,'EN '+H.distance(s.gap));
 assert.equal(H.distance(183),'175 m');
});

// La flecha del cartel se dibuja como icono segun el simbolo (acabado.css). Si un simbolo
// nuevo no tuviera dibujo se veria como caracter suelto: que no pase sin enterarse.
test('todas las maniobras que puede dar la app tienen su icono',()=>{
 const S=require('../street-match-core');
 const simbolos=new Set(['↰','↱','↶','↑','✓','!','⌖']);   // del GPX (nav-core), del cartel y de la navegacion
 for(let type=0;type<=45;type++){
  for(const exit of [0,2]){const m=S.roadManeuver({type,roundabout_exit_count:exit});if(m)simbolos.add(m.symbol);}
 }
 for(const v of S.upgradeManeuvers([{type:26,label:'En la rotonda, toma la salida 3'},{type:27,label:'Sal de la rotonda'}]))simbolos.add(v.symbol);
 for(const s of simbolos)assert.ok(H.maneuverIcon(s),'sin icono: '+s);
 assert.equal(H.maneuverIcon('↰'),'izquierda');
 assert.equal(H.maneuverIcon(' ⟲ '),'rotonda','con espacios alrededor tambien');
 assert.equal(H.maneuverIcon('☃'),'','lo desconocido se queda como caracter');
 assert.equal(H.maneuverIcon(null),'');
 assert.equal(H.maneuverIcon('constructor'),'','no se cuela lo que hereda cualquier objeto');
});

test('lo que queda de ronda se lee de reojo: sin decimales de mas',()=>{
 assert.equal(H.remaining(104210),'104 km');
 assert.equal(H.remaining(10000),'10 km');
 assert.equal(H.remaining(9949),'9,9 km');
 assert.equal(H.remaining(9950),'10 km','sin «10,0 km»');
 assert.equal(H.remaining(1234),'1,2 km');
 assert.equal(H.remaining(995),'1,0 km');
 assert.equal(H.remaining(994),'990 m');
 assert.equal(H.remaining(153),'150 m');
 assert.equal(H.remaining(0),'0 m');
 assert.equal(H.remaining(-5),'0 m');
 assert.equal(H.remaining(undefined),'0 m');
});

// ---- la voz ----
const v=(name,lang,localService=true,def=false)=>({name,lang,localService,default:def,voiceURI:'uri:'+name});
test('en un iPhone con voces descargadas se usa la premium de España',()=>{
 const voces=[v('Mónica','es-ES',true,true),v('Mónica (mejorada)','es-ES'),v('Marisol (prémium)','es-ES'),
  v('Paulina','es-MX'),v('Eddy (Español (España))','es-ES'),v('Grandma (Español (España))','es-ES'),v('Samantha','en-US')];
 assert.equal(H.bestVoice(voces).name,'Marisol (prémium)');
 const nombres=H.spanishVoices(voces).map(x=>x.name);
 assert.deepEqual(nombres,['Marisol (prémium)','Mónica (mejorada)','Mónica','Paulina'],'sin voces de broma ni de otro idioma');
});
test('sin voces descargadas, la basica de España antes que la de otro pais',()=>{
 assert.equal(H.bestVoice([v('Paulina','es-MX',true,true),v('Mónica','es-ES')]).name,'Mónica');
});
test('una voz que necesita conexion no gana a una que funciona sin ella',()=>{
 // Windows: la natural en linea suena mejor, pero sin cobertura se queda muda en la ronda.
 const voces=[v('Microsoft Elvira Online (Natural) - Spanish (Spain)','es-ES',false),v('Microsoft Helena - Spanish (Spain)','es-ES',true)];
 assert.equal(H.bestVoice(voces).name,'Microsoft Helena - Spanish (Spain)');
});
test('la voz que elige quien conduce manda, si sigue en el movil',()=>{
 const voces=[v('Mónica','es-ES'),v('Marisol (prémium)','es-ES'),v('Jorge','es-ES')];
 assert.equal(H.bestVoice(voces,'uri:Jorge').name,'Jorge');
 assert.equal(H.bestVoice(voces,'Jorge').name,'Jorge','tambien por nombre');
 assert.equal(H.bestVoice(voces,'uri:Borrada').name,'Marisol (prémium)','si ya no esta, la mejor');
 assert.equal(H.bestVoice(voces,'uri:Samantha'),H.bestVoice(voces),'una de otro idioma no se acepta');
});
test('sin voces en castellano, ninguna; y entradas raras no rompen nada',()=>{
 assert.equal(H.bestVoice([v('Samantha','en-US')]),null);
 assert.equal(H.bestVoice([]),null);
 assert.equal(H.bestVoice(null),null);
 assert.equal(H.voiceScore({name:'x'}),-1);
 assert.ok(H.voiceScore(v('Mónica','es_ES'))>0,'con guion bajo, como en algunos Android');
});
