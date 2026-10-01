/* Registro automatico de lo recorrido mientras el navegador usa el GPS. */
(()=>{
'use strict';
const C=window.RutasViajeCore,G=window.RutasGPX;if(!C||!G)return;
const KEY='rutas-viaje-v1';let points=[],active=false,pending=null,meta={},lastArrival=null,box,status,buttons=[];
function save(){try{localStorage.setItem(KEY,JSON.stringify({points,meta,updated:Date.now()}));}catch{}}
function restore(){try{const v=JSON.parse(localStorage.getItem(KEY)||'{}');if(Array.isArray(v.points)){points=v.points.filter(C.valid).slice(-C.MAX);meta=v.meta||{};}}catch{}}
function routeName(){try{return window.Roadbook?.getRoute()?.name||'recorrido';}catch{return 'recorrido';}}
function render(){const s=C.summary(points);if(status)status.textContent=s.points<2?'Todavía no hay un recorrido real guardado.':'Último recorrido: '+(s.metres/1000).toLocaleString('es-ES',{maximumFractionDigits:1})+' km · '+s.points.toLocaleString('es-ES')+' puntos GPS.';for(const b of buttons)b.disabled=s.points<2;window.dispatchEvent(new CustomEvent('rutas:trip-state',{detail:s}));}
function download(text,type,name){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);}
function gpx(){if(points.length<2)return false;download(G.build('Recorrido real · '+(meta.name||routeName()),points),'application/gpx+xml',C.filename(meta.name||routeName(),'gpx'));return true;}
function report(detail){if(points.length<2)return false;const d=detail||lastArrival||{},track=C.summary(points);download(C.csv({name:meta.name||routeName(),total:d.total||meta.total,missing:d.falta||'',track}),'text/csv;charset=utf-8',C.filename(meta.name||routeName(),'csv'));return true;}
function shareGpx(){if(points.length<2)return false;const text=G.build('Recorrido real · '+(meta.name||routeName()),points);if(typeof File==='function'){const file=new File([text],C.filename(meta.name||routeName(),'gpx'),{type:'application/gpx+xml'});if(navigator.share&&navigator.canShare?.({files:[file]})){navigator.share({title:'Recorrido real',files:[file]}).catch(()=>{});return true;}}return gpx();}
window.addEventListener('rutas:navigation-start',e=>{if(window.RutasSim?.get?.().running)return;const d=e.detail||{};pending={name:d.name||routeName(),total:Number(d.total)||0,started:new Date().toISOString()};active=true;});
window.addEventListener('rutas:gps-fix',e=>{if(!active)return;const fix=e.detail||{},clean=C.clean(fix);if(!clean||Number(clean.accuracy)>100)return;if(pending){points=[];meta=pending;pending=null;}if(C.append(points,clean)){save();render();}});
window.addEventListener('rutas:navigation-stop',()=>{if(!active)return;active=false;if(pending){pending=null;return;}meta.ended=new Date().toISOString();save();render();});
window.addEventListener('rutas:arrived',e=>{lastArrival=e.detail||{};save();});
function mount(){const host=document.querySelector('.route-settings-body');if(!host)return setTimeout(mount,80);box=document.createElement('section');box.className='route-journey';box.innerHTML='<div><small>RECORRIDO REAL</small><h3>Registro de la ronda</h3><p class="hint"></p></div><div class="btnrow"><button type="button" class="btn sm">Compartir GPX realizado</button><button type="button" class="btn sm">Guardar informe CSV</button></div>';status=box.querySelector('p');buttons=[...box.querySelectorAll('button')];buttons[0].onclick=shareGpx;buttons[1].onclick=()=>report();host.append(box);render();}
restore();addEventListener('load',mount,{once:true});
window.RutasViaje={get:()=>({points:points.slice(),meta:{...meta},active,summary:C.summary(points)}),gpx,shareGpx,report,setArrival:d=>{lastArrival=d;}};
})();
