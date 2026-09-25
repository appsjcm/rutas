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

const api={step,distance,after,banner,lower,imperative,SIN_NOMBRE};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RutasHudCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
