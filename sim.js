/* Simulador de conduccion. Solo se carga con ?sim=1: nunca debe activarse por accidente
   en un vehiculo, porque sustituye la posicion real por una inventada. */
(()=>{
'use strict';
if(!new URLSearchParams(location.search).has('sim'))return;
const C=window.RutasNav,S=window.RutasSimCore;
if(!C||!S)return;

const real={
 watch:navigator.geolocation.watchPosition.bind(navigator.geolocation),
 clear:navigator.geolocation.clearWatch.bind(navigator.geolocation),
 current:navigator.geolocation.getCurrentPosition.bind(navigator.geolocation)
};
const subs=new Map();
let nextId=1,timer=null,running=false,distance=0,tick=0,last=null,realFetch=null;

// ---- interfaz ----
const banner=document.createElement('div');banner.id='sim-banner';banner.hidden=true;
banner.textContent='SIMULACIÓN · la posición no es real';
const panel=document.createElement('section');panel.id='sim-panel';
panel.innerHTML=
 '<button type="button" id="sim-toggle" aria-expanded="true" aria-controls="sim-body">'
 +'<b>Simulador de conducción</b><span id="sim-state">parado</span><i aria-hidden="true"></i></button>'
 +'<div id="sim-body">'
 +'<label class="sim-speed-row">Velocidad<span class="sim-opts sim-speedbox" id="sim-speed">'
 +'<button type="button" id="sim-slower" aria-label="Más despacio">−</button>'
 +'<output id="sim-speed-value">50</output>'
 +'<button type="button" id="sim-faster" aria-label="Más rápido">+</button>'
 +'<i>km/h</i></span></label>'
 +'<label>Señal GPS<span class="sim-opts" id="sim-quality">'
 +'<button type="button" data-q="bueno" aria-pressed="true">Buena</button><button type="button" data-q="regular">Irregular</button><button type="button" data-q="malo">Mala</button>'
 +'</span></label>'
 +'<label>Desvío<span class="sim-opts" id="sim-drift">'
 +'<button type="button" data-d="0" aria-pressed="true">En ruta</button><button type="button" data-d="50">50</button><button type="button" data-d="100">100</button>'
 +'<i>m</i></span></label>'
 +'<label class="sim-check"><input type="checkbox" id="sim-offline"><span>Simular sin Internet</span></label>'
 +'<div class="sim-actions"><button type="button" class="btn primary" id="sim-go">Simular</button>'
 +'<button type="button" class="btn" id="sim-stop" disabled>Parar</button></div>'
 +'<p id="sim-info">Carga un GPX y pulsa Simular. La posición la genera esta página.</p>'
 +'</div>';
document.body.append(banner,panel);

const $=id=>document.getElementById(id);
// El panel flota sobre la pagina y tapaba los mandos que tiene debajo -la pestaña Guia,
// el conmutador 2D/Satelite/3D, Ampliar mapa-. Se pliega, y la eleccion se recuerda.
const ABIERTO='rutas-sim-abierto';
function plegar(abierto){
 panel.dataset.open=abierto?'yes':'no';
 $('sim-toggle').setAttribute('aria-expanded',String(abierto));
 $('sim-body').hidden=!abierto;
 try{localStorage.setItem(ABIERTO,abierto?'1':'0');}catch{}
}
$('sim-toggle').onclick=()=>plegar(panel.dataset.open!=='yes');
(function(){let v='1';try{v=localStorage.getItem(ABIERTO)??'1';}catch{}plegar(v!=='0');})();
let speed=50,cal=S.quality('bueno'),drift=0;

function pick(group,attr,set){
 $(group).addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  for(const other of $(group).querySelectorAll('button'))other.setAttribute('aria-pressed',other===b?'true':'false');
  set(b.dataset[attr]);
 });
}
function pintaVelocidad(){
 $('sim-speed-value').textContent=speed;
 $('sim-slower').disabled=S.atFloor(speed);
 $('sim-faster').disabled=S.atCeiling(speed);
}
// Se puede cambiar en marcha: cada paso lee la velocidad del momento.
function cambiaVelocidad(dir){speed=S.stepSpeed(speed,dir);pintaVelocidad();}
$('sim-slower').onclick=()=>cambiaVelocidad(-1);
$('sim-faster').onclick=()=>cambiaVelocidad(1);
pintaVelocidad();
pick('sim-quality','q',q=>{cal=S.quality(q);});
pick('sim-drift','d',d=>{drift=Number(d);});

// ---- geolocalizacion sustituida ----
navigator.geolocation.watchPosition=(ok,fail,opt)=>{
 const id=nextId++;
 subs.set(id,{ok,fail,realId:running?null:real.watch(ok,fail,opt)});
 return id;
};
navigator.geolocation.clearWatch=id=>{
 const s=subs.get(id);
 if(s){if(s.realId!=null)real.clear(s.realId);subs.delete(id);return;}
 real.clear(id);
};
navigator.geolocation.getCurrentPosition=(ok,fail,opt)=>{
 if(running&&last){ok(fix(last,C.heading(last,last)));return;}
 real.current(ok,fail,opt);
};

function fix(p,heading){
 return {coords:{latitude:p.lat,longitude:p.lon,accuracy:cal.accuracy,altitude:null,
   altitudeAccuracy:null,heading:Number.isFinite(heading)?heading:null,speed:S.speedOf(speed)},
  timestamp:Date.now()};
}
function send(pos){for(const s of subs.values()){try{s.ok(pos);}catch{}}}
function sendError(){
 const err={code:2,message:'Simulación: sin cobertura',PERMISSION_DENIED:1,POSITION_UNAVAILABLE:2,TIMEOUT:3};
 for(const s of subs.values()){try{if(s.fail)s.fail(err);}catch{}}
}

// ---- sin Internet ----
$('sim-offline').onchange=e=>{
 const on=e.target.checked;
 if(on){
  if(!realFetch){realFetch=window.fetch.bind(window);
   window.fetch=()=>Promise.reject(new TypeError('Simulación: sin Internet'));}
  try{Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false});}catch{}
  window.dispatchEvent(new Event('offline'));
 }else{
  if(realFetch){window.fetch=realFetch;realFetch=null;}
  try{delete navigator.onLine;}catch{}
  window.dispatchEvent(new Event('online'));
 }
};

// ---- bucle ----
const STEP=1000;
function paso(){
 const state=RutasMap.get(),route=state&&state.route;
 if(!route||route.total<1){info('No hay recorrido cargado.');return;}
 distance=S.advance(distance,speed,STEP/1000);
 if(distance>=route.total){info('Final del recorrido alcanzado.');parar();return;}
 const aqui=C.at(route,distance),delante=C.at(route,Math.min(route.total,distance+12));
 last=aqui;
 tick++;
 if(S.drops(tick,cal.dropEvery)){sendError();info(pos()+' · sin señal');return;}
 const p=S.jitter(S.sidestep(aqui,delante,drift),cal.jitter);
 send(fix(p,C.heading(aqui,delante)));
 info(pos()+(drift?' · desviado '+drift+' m':''));
}
function pos(){
 const route=RutasMap.get().route;
 return (distance/1000).toFixed(2).replace('.',',')+' de '+(route.total/1000).toFixed(2).replace('.',',')+' km';
}
function info(t){$('sim-info').textContent=t;}

function arrancar(opts){
 if(opts&&Number.isFinite(Number(opts.speed))){speed=Number(opts.speed);pintaVelocidad();}
 const state=RutasMap.get();
 if(!state||!state.route||state.route.total<1){info('Carga un GPX antes de simular.');return;}
 running=true;tick=0;
 distance=Number.isFinite(state.progress)&&state.progress>0?state.progress:0;
 for(const s of subs.values())if(s.realId!=null){real.clear(s.realId);s.realId=null;}
 banner.hidden=false;panel.dataset.running='yes';
 $('sim-go').disabled=true;$('sim-stop').disabled=false;$('sim-state').textContent='en marcha';
 timer=setInterval(paso,STEP);paso();
 plegar(false);
 abrirMapa(state);
}
// Simular es para ver la ruta en marcha, asi que arranca la navegacion y abre el mapa:
// tener que pulsar despues "Iniciar navegacion" y "Ampliar mapa" sobraba.
function abrirMapa(state){
 const stage=document.getElementById('nav-stage');
 if(!stage)return;
 if(!state.active){const b=document.getElementById('nav-start');if(b)b.click();}
 stage.scrollIntoView({block:'center',behavior:'smooth'});
 const ampliar=()=>{
  if(document.body.classList.contains('map-focus'))return true;
  const foco=document.getElementById('nav-focus');
  // El boton solo existe cuando ya hay posicion y la vista de conduccion esta montada.
  if(foco&&!foco.hidden&&foco.offsetParent){foco.click();return true;}
  return false;
 };
 if(ampliar())return;
 let intentos=0;
 const espera=setInterval(()=>{
  if(!running||ampliar()||++intentos>20)clearInterval(espera);
 },250);
}
function parar(){
 running=false;if(timer)clearInterval(timer);timer=null;
 banner.hidden=true;delete panel.dataset.running;
 $('sim-go').disabled=false;$('sim-stop').disabled=true;$('sim-state').textContent='parado';
 for(const s of subs.values())if(s.realId==null){try{s.realId=real.watch(s.ok,s.fail);}catch{}}
}
$('sim-go').onclick=arrancar;
$('sim-stop').onclick=parar;
window.addEventListener('pagehide',parar);
window.RutasSim={start:arrancar,stop:parar,get:()=>({running,distance,speed,drift,quality:cal.label})};
})();
