(function(root){
'use strict';
// Chequeo antes de salir. Todo lo que el conductor necesita saber con el motor parado:
// si hay ruta, si el GPS va a responder, si habra voz, que parte del mapa sobrevive sin
// cobertura y si las calles estan comprobadas.

// ---------- teselas ----------
// Mismo calculo que usa cualquier mapa de teselas; sirve para saber cuales harian falta.
function tileOf(lat,lon,z){
 const n=Math.pow(2,z),r=lat*Math.PI/180;
 const x=Math.floor((lon+180)/360*n);
 const y=Math.floor((1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*n);
 const tope=n-1;
 return {z,x:Math.min(tope,Math.max(0,x)),y:Math.min(tope,Math.max(0,y))};
}
function keyOf(t){return t.z+'/'+t.x+'/'+t.y;}

// De una URL de tesela guardada saca z/x/y. Vale para .../16/33012/24923.png y con parametros.
function fromUrl(url){
 const m=String(url||'').match(/\/(\d{1,2})\/(\d{1,7})\/(\d{1,7})(?:@\dx)?(?:\.\w+)?(?:\?|$)/);
 return m?m[1]+'/'+m[2]+'/'+m[3]:null;
}
function cachedKeys(urls){
 const out=new Set();
 for(const u of urls||[]){const k=fromUrl(u);if(k)out.add(k);}
 return out;
}

// Zoom al que se conduce, y hasta donde se acepta una tesela mas grande. Ampliar dos
// niveles deja la calle reconocible; tres o mas es un borron de color que no guia a nadie.
const DRIVE_ZOOM=17,SPREAD=2,MAX_ZOOM=19;
function zoomLevels(drive,spread,max){
 drive=Number.isFinite(drive)?drive:DRIVE_ZOOM;
 spread=Number.isFinite(spread)?spread:SPREAD;
 max=Number.isFinite(max)?max:MAX_ZOOM;
 const out=[];
 for(let z=Math.max(0,drive-spread);z<=max;z++)out.push(z);
 return out;
}

// Puntos repartidos por la ruta, con el final siempre dentro: el ultimo tramo cuenta igual.
function sample(pts,limit){
 const list=Array.isArray(pts)?pts:[];
 limit=limit||300;
 const util=list.filter(p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lon));
 if(util.length<=limit)return util;
 const paso=util.length/limit,out=[];
 for(let i=0;i<limit;i++)out.push(util[Math.floor(i*paso)]);
 const fin=util[util.length-1];
 if(out[out.length-1]!==fin)out.push(fin);
 return out;
}

// Teselas que pediria la ruta a un zoom dado. Sirve para saber cuantas harian falta.
function tilesFor(pts,z,limit){
 const out=new Set();
 for(const p of sample(pts,limit||600))out.add(keyOf(tileOf(p.lat,p.lon,z||DRIVE_ZOOM)));
 return [...out];
}

// Un punto esta cubierto si alguna tesela guardada lo contiene a un zoom utilizable:
// la suya, una madre cercana, o una mas detallada de cuando se paso por alli conduciendo.
function seen(lat,lon,have,zooms){
 if(!have||!have.size)return false;
 for(const z of zooms||zoomLevels())if(have.has(keyOf(tileOf(lat,lon,z))))return true;
 return false;
}
function coverage(pts,have,opts){
 const o=opts||{};
 const list=sample(pts,o.limit);
 if(!list.length)return 0;
 const zooms=o.zooms||zoomLevels(o.drive,o.spread,o.max);
 let n=0;
 for(const p of list)if(seen(p.lat,p.lon,have,zooms))n++;
 return n/list.length;
}

// ---------- apartados del chequeo ----------
const OK='ok',AVISO='warn',FALLO='bad';
function pct(r){return Math.round(r*100);}

function routeItem(route){
 if(!route||!route.pts||route.pts.length<2)
  return {id:'ruta',label:'Ruta',state:FALLO,detail:'Carga un GPX antes de salir.'};
 if(route.sample)
  return {id:'ruta',label:'Ruta',state:FALLO,detail:'Esto es el recorrido de ejemplo; carga el tuyo.'};
 const km=Number.isFinite(route.metres)?(route.metres/1000).toFixed(1).replace('.',',')+' km':null;
 return {id:'ruta',label:'Ruta',state:OK,
  detail:[String(route.name||'').replace(/\.gpx$/i,''),km].filter(Boolean).join(' · ')||'Preparada.'};
}

function gpsItem(permission,supported){
 if(supported===false)return {id:'gps',label:'GPS',state:FALLO,detail:'Este navegador no permite acceder al GPS.'};
 if(permission==='denied')return {id:'gps',label:'GPS',state:FALLO,
  detail:'Permiso denegado. Actívalo en los ajustes del navegador.'};
 if(permission==='granted')return {id:'gps',label:'GPS',state:OK,detail:'Permiso concedido.'};
 return {id:'gps',label:'GPS',state:AVISO,detail:'El navegador te pedirá permiso al arrancar.'};
}

function voiceItem(supported,enabled){
 if(!supported)return {id:'voz',label:'Voz',state:AVISO,detail:'Este navegador no lee las indicaciones.'};
 return enabled
  ?{id:'voz',label:'Voz',state:OK,detail:'Avisos por voz activados.'}
  :{id:'voz',label:'Voz',state:AVISO,detail:'Avisos por voz desactivados.'};
}

// Lo que de verdad quiere saber quien sale a una zona sin cobertura.
function mapItem(ratio,online){
 const r=Number.isFinite(ratio)?Math.max(0,Math.min(1,ratio)):0;
 if(r>=.9)return {id:'mapas',label:'Mapas',state:OK,detail:'Ruta disponible sin cobertura.'};
 if(r>=.25)return {id:'mapas',label:'Mapas',state:AVISO,
  detail:'Mapa parcialmente guardado: '+pct(r)+' % de la ruta.'};
 return {id:'mapas',label:'Mapas',state:online===false?FALLO:AVISO,
  detail:online===false
   ?'Esta zona no se ha visto todavía y no hay conexión para cargarla.'
   :'Esta zona no se ha visto todavía; se irá guardando mientras conduces.'};
}

function roadsItem(state,vehicleCount,profiled){
 const n=Number(vehicleCount)||0;
 if(state==='loading')return {id:'calles',label:'Restricciones',state:AVISO,detail:'Comprobando calles y sentidos…'};
 if(state==='error')return {id:'calles',label:'Restricciones',state:AVISO,detail:'No se pudieron cargar los datos de calles.'};
 if(state!=='ready')return {id:'calles',label:'Restricciones',state:AVISO,detail:'Calles y sentidos sin comprobar.'};
 if(n>0)return {id:'calles',label:'Restricciones',state:AVISO,
  detail:n===1?'1 posible incompatibilidad con tu vehículo.':n+' posibles incompatibilidades con tu vehículo.'};
 return {id:'calles',label:'Restricciones',state:OK,
  detail:profiled?'Sin incompatibilidades con tu vehículo.':'Calles y sentidos comprobados.'};
}

function items(state){
 const s=state||{};
 return [routeItem(s.route),
         gpsItem(s.permission,s.geolocation),
         voiceItem(s.voiceSupported,s.voiceEnabled),
         mapItem(s.mapRatio,s.online),
         roadsItem(s.roadState,s.vehicleCount,s.profiled)];
}

// El chequeo informa; no impide salir. Solo la falta de ruta deja el boton sin nada que hacer.
function verdict(list){
 const l=Array.isArray(list)?list:[];
 const fallos=l.filter(i=>i&&i.state===FALLO);
 const avisos=l.filter(i=>i&&i.state===AVISO);
 if(fallos.length)return {tone:FALLO,count:fallos.length,
  headline:fallos.length===1?'Revisa esto antes de salir':'Revisa estas '+fallos.length+' cosas antes de salir'};
 if(avisos.length)return {tone:AVISO,count:avisos.length,headline:'Puedes salir, con estas advertencias'};
 return {tone:OK,count:0,headline:'Todo listo. Buen turno.'};
}

// Con todo en orden el panel se quita solo; si hay algo que leer, espera.
function dwell(tone){return tone===OK?2800:0;}

const api={tileOf,keyOf,fromUrl,cachedKeys,zoomLevels,sample,tilesFor,seen,coverage,
           routeItem,gpsItem,voiceItem,mapItem,roadsItem,items,verdict,dwell,
           DRIVE_ZOOM,SPREAD,MAX_ZOOM,OK,AVISO,FALLO};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RutasCheckCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
