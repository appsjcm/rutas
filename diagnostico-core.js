(function(root){
'use strict';
// Diagnostico: lo que hace falta saber del movil cuando algo falla y no se esta delante. Nada de
// la ruta ni de la posicion: version, navegador, almacenamiento, pantalla, voz, GPS y los
// ultimos errores. Aqui, sin DOM, lo que se puede probar: como se resume el navegador y como se
// escribe el texto que se copia.

function numero(v){const n=Number(v);return Number.isFinite(n)?n:NaN;}

// "iPhone · iOS 18.5 · Safari", "Android 14 · Chrome 128", "Windows · Edge 128". Del agente de
// usuario solo se saca eso: ni modelo exacto ni nada que identifique a nadie.
function navegador(ua){
 const u=String(ua||'');
 let sistema='Otro';
 let m;
 if((m=u.match(/(iPhone|iPad|iPod).*? OS (\d+)[_.](\d+)/)))sistema=m[1]+' · iOS '+m[2]+'.'+m[3];
 else if((m=u.match(/Android (\d+(?:\.\d+)?)/)))sistema='Android '+m[1];
 else if(/Windows/.test(u))sistema='Windows';
 else if(/Mac OS X|Macintosh/.test(u))sistema='Mac';
 else if(/Linux/.test(u))sistema='Linux';
 let nav='';
 if((m=u.match(/Edg(?:A|iOS)?\/(\d+)/)))nav='Edge '+m[1];
 else if((m=u.match(/(?:CriOS|Chrome)\/(\d+)/)))nav='Chrome '+m[1];
 else if((m=u.match(/(?:FxiOS|Firefox)\/(\d+)/)))nav='Firefox '+m[1];
 else if(/Safari\//.test(u)&&(m=u.match(/Version\/(\d+(?:\.\d+)?)/)))nav='Safari '+m[1];
 else if(/(iPhone|iPad|iPod)/.test(u))nav='Safari';   // aplicacion instalada: sin "Version/"
 return nav?sistema+' · '+nav:sistema;
}

function tamano(bytes){
 const b=numero(bytes);
 if(!(b>=0))return 'desconocido';
 if(b<1024*1024)return Math.max(1,Math.round(b/1024))+' KB';
 return (b/1048576).toFixed(1).replace('.',',')+' MB';
}

function siNo(v){return v===true?'sí':v===false?'no':'desconocido';}

const PANTALLA={on:'se mantuvo encendida',off:'el móvil no lo dejó',unsupported:'este navegador no lo permite',pending:'esperando respuesta',idle:'aún no se ha navegado'};
function pantalla(estado){return PANTALLA[estado]||'aún no se ha navegado';}

const PERMISO={granted:'concedido',denied:'denegado',prompt:'se pedirá al arrancar'};
function permiso(estado){return PERMISO[estado]||'desconocido';}

// Las filas que se ven, en orden. d es lo que se haya podido averiguar; lo que falte sale como
// desconocido en vez de romper.
function filas(d){
 const x=d||{};
 const errores=Array.isArray(x.errores)?x.errores:[];
 return [
  ['Versión',x.version||'desconocida'],
  ['Navegador',navegador(x.ua)],
  ['Instalada en inicio',siNo(x.instalada)],
  ['Almacenamiento',tamano(x.usado)+(x.persistente===true?' · protegido del borrado':x.persistente===false?' · sin proteger del borrado':'')],
  ['Pantalla encendida',pantalla(x.pantalla)],
  ['Voz',Number.isFinite(x.voces)?(x.voces?x.voces+' en castellano · '+(x.voz||'automática'):'ninguna en castellano'):'desconocida'],
  ['Permiso de GPS',permiso(x.gps)],
  ['Conexión',x.enLinea===false?'sin conexión':'con conexión'],
  ['Errores recientes',errores.length?String(errores.length):'ninguno']
 ];
}
function errorTexto(e){
 if(!e)return '';
 const donde=e.f?(e.f+(e.l?':'+e.l:'')):'';
 return (e.t?e.t+' ':'')+String(e.m||'error')+(donde?' ('+donde+')':'');
}
// El texto que se copia para mandarlo: las filas y, debajo, los errores.
function texto(d){
 const x=d||{};
 const lineas=['Diagnóstico de Rutas'].concat(filas(x).map(([k,v])=>k+': '+v));
 const errores=Array.isArray(x.errores)?x.errores:[];
 for(const e of errores)lineas.push('  · '+errorTexto(e));
 return lineas.join('\n');
}

const api={navegador,tamano,siNo,pantalla,permiso,filas,errorTexto,texto};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RutasDiagnosticoCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
