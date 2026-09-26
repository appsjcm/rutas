(function(root){
'use strict';
// Cabecera de conduccion. Un GPS de coche dice tres cosas y en este orden: cuanto falta,
// que hacer, y a donde. Lo demas -la fase, los matices- no cabe a 90 km/h ni a 20.

// Distancias redondeadas como las dice un navegador: nadie anuncia "en 183 metros".
// La voz usa este mismo escalon, asi que pantalla y voz no se contradicen.
function step(m){
 const v=Number(m);
 if(!Number.isFinite(v)||v<=0)return 0;
 if(v>=1000)return Math.round(v/100)*100;
 if(v>=300)return Math.round(v/50)*50;
 if(v>=100)return Math.round(v/25)*25;
 return Math.max(10,Math.round(v/10)*10);
}
function distance(m){
 const v=step(m);
 if(!v)return '';
 return v>=1000?(v/1000).toFixed(1).replace('.',',')+' km':v+' m';
}

// Lo que queda de ronda, en la cabina: se lee de reojo, asi que sin decimales de mas.
// «104,21 km» no cabia en la fila de datos con el movil en horizontal, y a cien kilometros
// los diez metros no le sirven a nadie. Como los navegadores de siempre: metros por debajo
// del kilometro, un decimal hasta diez y kilometros enteros a partir de ahi.
function remaining(m){
 const v=Math.max(0,Number(m)||0);
 if(v<995)return Math.round(v/10)*10+' m';
 if(v<9950)return (v/1000).toFixed(1).replace('.',',')+' km';
 return Math.round(v/1000)+' km';
}

// La voz de las paradas de la ronda: una vez al acercarse -unos veinte segundos antes, y nunca
// a menos de 150 m- y otra al llegar. Al llegar dice cuanto duro esa parada en la ronda grabada,
// que es lo que no se sabe de memoria. st es lo que da stopProgress; key, para no repetirlo.
function stopVoice(st,speed){
 if(!st||!st.next||!Number.isFinite(st.gap))return null;
 const n=st.done+1,cual='Parada '+n+' de '+st.total;
 if(st.gap<=40){
  const min=Math.round((Number(st.next.seconds)||0)/60);
  return {key:n+':llegada',text:cual+'.'+(min>=1?' En la grabación duró '+min+(min===1?' minuto.':' minutos.'):'')};
 }
 const aviso=Math.max(150,Math.min(500,Math.max(0,Number(speed)||0)*20));
 return st.gap<=aviso?{key:n+':aviso',text:cual+' en '+distance(st.gap)+'.'}:null;
}

// La misma parada en el panel: a cuanto esta la siguiente y, ya en ella, cuanto duro en la
// grabacion. Las distancias, redondeadas como las dice la voz.
function stopLine(st){
 if(!st||!st.total)return '';
 if(!st.next)return 'Paradas completadas: '+st.total+' de '+st.total;
 const n=st.done+1;
 if(Number(st.gap)<=40){
  const min=Math.round((Number(st.next.seconds)||0)/60);
  return 'En la parada '+n+' de '+st.total+(min>=1?' · '+min+' min en la grabación':'');
 }
 return 'Parada '+n+' de '+st.total+' a '+distance(st.gap);
}

function lower(s){
 const t=String(s||'');
 return t?t.charAt(0).toLowerCase()+t.slice(1):'';
}

// Lo que viene despues va en una linea aparte y pequena: orienta, no manda.
function after(next,fromD){
 if(!next||!next.label)return '';
 const partes=['Después: '+lower(imperative(next.label))];
 if(next.toRoad)partes.push(next.toRoad);
 const d=distance(Number(next.d)-Number(fromD));
 if(d)partes.push('a '+d);
 return partes.join(' · ');
}

// Las indicaciones sacadas del GPX vienen como sustantivo -«Giro a la derecha»-; un GPS
// las da en imperativo. Son las mismas dos conversiones que ya hace la voz, en un solo sitio.
function imperative(label){
 const t=String(label||'').trim();
 if(!t)return '';
 const l=t.toLowerCase().replace(/^giro a /,'gira a ').replace(/^cambio de sentido$/,'cambia de sentido');
 return l.charAt(0).toUpperCase()+l.slice(1);
}

const SIN_NOMBRE='Según el GPX';

function banner(state){
 const s=state||{};

 if(s.paused)return {tone:'paused',arrow:s.arrow||'!',exit:null,eyebrow:'ESPERANDO GPS',
  lead:'GPS',action:s.paused===true?'Indicaciones pausadas':String(s.paused),street:'',after:''};

// Al final, «Recorrido completado» solo si es verdad. Con tramos saltados el cartel decia
 // completado justo encima del aviso de que faltaban: dos cosas contrarias en la misma
 // pantalla, y la que se lee de un vistazo era la falsa. No manda volver; dice donde mirar.
 if(s.end&&s.missing)return {tone:'warning',arrow:'!',exit:null,eyebrow:'FINAL DEL RECORRIDO',
  lead:'FIN',action:String(s.missing),street:'Marcados en rojo en el mapa',after:''};
 if(s.end)return {tone:'done',arrow:'✓',exit:null,eyebrow:'',
  lead:'FIN',action:'Recorrido completado',street:'Final del recorrido',after:''};

 const eyebrow=s.access?(s.access.recovery?'REGRESO AL RECORRIDO':'ACCESO POR CALLES'):'';
 const ahora=s.stage==='now';
 const turn=s.turn;

 if(!turn)return {tone:ahora?'now':'far',arrow:'↑',exit:null,eyebrow,
  lead:ahora?'AHORA':(distance(s.gap)?'EN '+distance(s.gap):''),
  action:'Sigue el recorrido',street:'',after:''};

 return {
  tone:ahora?'now':(s.stage==='near'?'near':'far'),
  arrow:turn.symbol||'↑',
  exit:Number.isSafeInteger(turn.roundaboutExit)&&turn.roundaboutExit>0?turn.roundaboutExit:null,
  eyebrow,
  lead:ahora?'AHORA':(distance(s.gap)?'EN '+distance(s.gap):''),
  action:imperative(turn.label)||'Sigue el recorrido',
  street:turn.toRoad||(turn.roadContext?'Maniobra vial':SIN_NOMBRE),
  after:after(s.next,turn.d)
 };
}

// La flecha del cartel era un caracter -↰, ↱, ⟲- y cada tipo de letra lo dibuja a su manera:
// fino, desigual, a veces con otra altura que el resto. acabado.css la dibuja como icono segun
// este nombre. Un simbolo que no este aqui se sigue viendo como caracter, que es mejor que nada.
const ICONOS_MANIOBRA={'↑':'recto','↰':'izquierda','↱':'derecha','↶':'cambio','⟲':'rotonda',
 '↗':'salida','✓':'llegada','!':'aviso','⌖':'buscando'};
function maneuverIcon(symbol){return Object.prototype.hasOwnProperty.call(ICONOS_MANIOBRA,String(symbol||'').trim())?ICONOS_MANIOBRA[String(symbol).trim()]:'';}

// ---- la voz de las indicaciones ----
// El navegador no elige voz: con el idioma puesto, el movil usa la basica. En iPhone, las voces
// "mejoradas" o "premium" que se descargan en Ajustes suenan mucho mejor y no se usaban. Se
// elige la mejor en castellano con este orden: de España antes que de otros paises; premium y
// mejoradas antes que la basica; y las que funcionan sin conexion antes que las que la
// necesitan, porque en la ronda no siempre hay cobertura y una voz en linea se queda muda.
// Fuera las voces de broma que trae el sistema (Eddy, Flo, Grandma...).
const VOCES_DE_BROMA=/\b(eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley|albert|bahh|bells|boing|bubbles|cellos|jester|organ|superstar|trinoids|whisper|wobble|zarvox)\b|abuel|bad news|good news|pipe organ/i;
function voiceScore(v){
 if(!v||typeof v.lang!=='string')return -1;
 const lang=v.lang.replace('_','-').toLowerCase(),nombre=String(v.name||'');
 if(!/^es(-|$)/.test(lang)||VOCES_DE_BROMA.test(nombre))return -1;
 let p=lang==='es-es'?100:lang==='es'?70:60;
 if(/premium|prémium/i.test(nombre))p+=30;
 else if(/enhanced|mejorada|natural|neural/i.test(nombre))p+=20;
 if(v.localService)p+=25;
 if(v.default)p+=1;
 return p;
}
function spanishVoices(voices){
 return (Array.isArray(voices)?voices:Array.from(voices||[])).filter(v=>voiceScore(v)>=0)
  .sort((a,b)=>voiceScore(b)-voiceScore(a)||String(a.name).localeCompare(String(b.name)));
}
// La que haya elegido quien conduce, si sigue en el movil; si no, la mejor.
function bestVoice(voices,preferida){
 const lista=spanishVoices(voices);
 if(preferida){const f=lista.find(v=>v.voiceURI===preferida||v.name===preferida);if(f)return f;}
 return lista[0]||null;
}

const api={step,distance,remaining,stopVoice,stopLine,after,banner,lower,imperative,maneuverIcon,voiceScore,spanishVoices,bestVoice,SIN_NOMBRE,ICONOS_MANIOBRA};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RutasHudCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
