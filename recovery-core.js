(function(root){
'use strict';
// Tarjeta de desvio. Quien conduce tiene tres segundos y una mano: un titular que diga
// que ha pasado, una linea que diga que se puede hacer, y dos decisiones del mismo tamano.

function metres(m){
 if(m===null||m===undefined||m==='')return '—';   // sin dato no se escribe «0 m», que seria mentira
 const v=Number(m);
 if(!Number.isFinite(v)||v<0)return '—';
 return v<1000?Math.round(v)+' m':(v/1000).toFixed(1).replace('.',',')+' km';
}

const AVISO='Cálculo para coche: revisa las señales.';

function card(state){
 const s=state||{};
 switch(s.phase){
  case 'searching':
   return {phase:'searching',busy:true,
    head:'Buscando el mejor punto para volver…',
    lead:'Se calcula un regreso por calles hasta un punto más adelante del recorrido.',
    primary:'Buscando…',secondary:'Cancelar',note:''};
  case 'error':
   return {phase:'error',busy:false,
    head:'No se ha podido calcular el regreso',
    lead:s.message||'Inténtalo de nuevo o sigue sin recalcular.',
    primary:'Reintentar',secondary:'Seguir sin recalcular',note:''};
  default:
   return {phase:'offer',busy:false,
    head:'Te has salido '+metres(s.gap),
    // El progreso es lo que mas preocupa al volante: se dice en la misma linea.
    lead:'Puedes volver dentro de '+metres(s.ahead)+' sin perder el progreso.',
    primary:'Volver a la ruta',secondary:'Seguir sin recalcular',note:AVISO};
 }
}

// Un fallo de red se cuenta como fallo de red, no como un mensaje tecnico.
function failure(error){
 if(error&&error.name==='AbortError')return 'El cálculo ha tardado demasiado.';
 const m=error&&error.message;
 return m||'No se encontró un regreso por calles hasta el recorrido.';
}

const api={metres,card,failure,AVISO};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RutasRecoveryCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
