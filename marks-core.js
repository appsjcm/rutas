(function(root){
'use strict';
const N=typeof module==='object'&&module.exports?require('./nav-core'):root.RutasNav;
// Puntos negros del conductor. OpenStreetMap casi nunca trae alturas ni pesos en calles de
// pueblo -medido: cero en los 26 km de una ronda real-, asi que el perfil de vehiculo rara
// vez salta. Quien conduce la ronda si sabe donde no cabe: esto guarda lo que el marca y se
// lo devuelve el proximo dia, antes de llegar.

const KINDS=[
 {id:'altura',  badge:'H', label:'Paso bajo',          voice:'paso bajo'},
 {id:'peso',    badge:'T', label:'Límite de peso',     voice:'límite de peso'},
 {id:'estrecho',badge:'A', label:'Calle estrecha',     voice:'calle estrecha'},
 {id:'acceso',  badge:'X', label:'Prohibido el paso',  voice:'paso prohibido'},
 {id:'nota',    badge:'i', label:'Nota',               voice:'aviso'}
];
const NOTE_MAX=80,SAME_SPOT=20,OFF_ROUTE=35,WINDOW=300;

function kind(id){return KINDS.find(k=>k.id===id)||KINDS[KINDS.length-1];}

function normalise(raw){
 if(!raw||typeof raw!=='object')return null;
 const lat=Number(raw.lat),lon=Number(raw.lon);
 if(!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lon)||Math.abs(lon)>180)return null;
 const nota=String(raw.note==null?'':raw.note).replace(/\s+/g,' ').trim().slice(0,NOTE_MAX);
 const creado=Number(raw.created);
 return {id:String(raw.id||'')||('m'+Math.random().toString(36).slice(2,10)),
         lat:Math.round(lat*1e6)/1e6,lon:Math.round(lon*1e6)/1e6,
         kind:kind(raw.kind).id,note:nota,
         created:Number.isFinite(creado)&&creado>0?creado:Date.now()};
}
function valid(m){return !!normalise(m);}

// Marcar dos veces el mismo puente no crea dos avisos: se queda el ultimo, con su nota.
function add(list,raw,gap){
 const m=normalise(raw);
 if(!m)return Array.isArray(list)?list.slice():[];
 const radio=Number.isFinite(gap)?gap:SAME_SPOT;
 const fuera=(Array.isArray(list)?list:[]).filter(o=>{
  const p=normalise(o);
  return !(p&&p.kind===m.kind&&N.distance(p,m)<=radio);
 });
 fuera.push(m);
 return fuera;
}
function remove(list,id){return (Array.isArray(list)?list:[]).filter(m=>m&&m.id!==id);}

// Cada marca se ata al recorrido una vez: despues saber cual viene es solo restar.
function anchor(list,route,maxOff){
 const tope=Number.isFinite(maxOff)?maxOff:OFF_ROUTE;
 if(!route||!route.pts||route.pts.length<2)return [];
 const out=[];
 for(const raw of Array.isArray(list)?list:[]){
  const m=normalise(raw);
  if(!m)continue;
  const hit=N.match(route,m,0,route.total);
  if(!hit||hit.error>tope)continue;
  out.push({...m,d:hit.d,error:hit.error});
 }
 return out.sort((a,b)=>a.d-b.d);
}

// Lo que viene delante, en orden y sin lo ya pasado.
function ahead(anchored,progress,window){
 const desde=Number(progress)||0,ancho=Number.isFinite(window)?window:WINDOW;
 return (Array.isArray(anchored)?anchored:[])
  .filter(m=>m&&Number.isFinite(m.d)&&m.d>desde&&m.d<=desde+ancho)
  .map(m=>({...m,gap:m.d-desde}))
  .sort((a,b)=>a.gap-b.gap);
}

// Debajo de diez metros ya estas encima: decir «a 0 m» solo estorba.
function metres(m){
 const v=Number(m);
 if(!Number.isFinite(v)||v<10)return '';
 return v<1000?Math.round(v/10)*10+' m':(v/1000).toFixed(1).replace('.',',')+' km';
}
function describe(m){
 const k=kind(m&&m.kind);
 return m&&m.note?k.label+' · '+m.note:k.label;
}
// El aviso dice de donde sale: no es OpenStreetMap, lo marco quien conduce.
function warning(m,gap){
 if(!m)return '';
 const d=metres(gap==null?m.gap:gap);
 const k=kind(m.kind);
 return '⚠ '+k.label+(d?' a '+d:'')+' · '+(m.note?'«'+m.note+'»':'lo marcaste tú');
}
function spoken(m,gap){
 if(!m)return '';
 const d=metres(gap==null?m.gap:gap);
 return 'Atención: '+kind(m.kind).voice+(d?' en '+d:'')+', marcado por ti.';
}

// Vuelta atras: los waypoints con tipo propio se reconocen como avisos; los demas no se
// tocan, porque un waypoint cualquiera de un GPX ajeno no es un aviso de nadie.
const PREFIX='rutas:';
function fromWaypoints(wpts){
 const out=[];
 for(const w of Array.isArray(wpts)?wpts:[]){
  if(!w)continue;
  const tipo=String(w.type||'');
  if(tipo.slice(0,PREFIX.length)!==PREFIX)continue;
  const m=normalise({lat:w.lat,lon:w.lon,kind:tipo.slice(PREFIX.length),note:w.desc||''});
  if(m)out.push(m);
 }
 return out;
}
// Al importar no se pisa lo propio a lo bruto: vale la misma regla que al marcar a mano.
function merge(list,incoming){
 let out=Array.isArray(list)?list.slice():[];
 let nuevos=0;
 for(const m of Array.isArray(incoming)?incoming:[]){
  const antes=out.length;
  out=add(out,m);
  if(out.length>antes)nuevos++;
 }
 return {list:out,added:nuevos,seen:(Array.isArray(incoming)?incoming:[]).length};
}

function pack(list){
 return JSON.stringify((Array.isArray(list)?list:[]).map(normalise).filter(Boolean));
}
function unpack(text){
 try{
  const raw=JSON.parse(text);
  return (Array.isArray(raw)?raw:[]).map(normalise).filter(Boolean);
 }catch{return [];}
}

const api={KINDS,kind,normalise,valid,add,remove,anchor,ahead,describe,warning,spoken,fromWaypoints,merge,
           metres,pack,unpack,NOTE_MAX,SAME_SPOT,OFF_ROUTE,WINDOW};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RutasMarksCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
