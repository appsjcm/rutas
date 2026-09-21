(function(root){
'use strict';
// Medidas habituales en reparto y recogida. "Personalizado" no lleva medidas: las pone quien
// conduce, porque un camion con caja o grua no se parece a ningun preajuste.
const PRESETS=[
 {id:'ninguno',label:'Sin definir'},
 {id:'furgoneta',label:'Furgoneta',height:2.6,width:2.1,weight:3.5},
 {id:'camion12',label:'Camión 12 t',height:3.6,width:2.55,weight:12},
 {id:'camion18',label:'Camión 18 t',height:4,width:2.55,weight:18},
 {id:'personalizado',label:'Personalizado'}
];
const FIELDS=['height','width','weight'];
const LIMITS={height:{max:6},width:{max:4},weight:{max:80}};

function preset(id){return PRESETS.find(p=>p.id===id)||PRESETS[0];}

// Solo sobreviven medidas creibles: un cero o un texto no definen un vehiculo.
function normalise(raw){
 const out={};if(!raw||typeof raw!=='object')return out;
 for(const f of FIELDS){
  const v=typeof raw[f]==='string'?Number(raw[f].replace(',','.')):Number(raw[f]);
  if(Number.isFinite(v)&&v>0&&v<=LIMITS[f].max)out[f]=Math.round(v*100)/100;
 }
 return out;
}
function dimsOf(id){const p=preset(id);return normalise({height:p.height,width:p.width,weight:p.weight});}
function same(a,b){
 const x=normalise(a),y=normalise(b);
 return FIELDS.every(f=>(x[f]===undefined&&y[f]===undefined)||x[f]===y[f]);
}
// Que preajuste describe el perfil guardado: asi la interfaz marca el correcto al abrir.
function detect(profile){
 const p=normalise(profile);
 if(!Object.keys(p).length)return 'ninguno';
 const hit=PRESETS.find(x=>x.id!=='ninguno'&&x.id!=='personalizado'&&same(p,x));
 return hit?hit.id:'personalizado';
}
function num(v){return String(v).replace('.',',');}
function describe(profile){
 const p=normalise(profile),partes=[];
 if(p.height)partes.push(num(p.height)+' m alto');
 if(p.width)partes.push(num(p.width)+' m ancho');
 if(p.weight)partes.push(num(p.weight)+' t');
 return partes.join(' · ');
}

// Avisos que dependen del vehiculo, frente a los de sentido de circulacion.
const VEHICLE_KINDS=new Set(['height','weight','width','access','limit-variable']);
function incompatibilities(issues){
 return (Array.isArray(issues)?issues:[]).filter(i=>i&&VEHICLE_KINDS.has(i.kind)).length;
}
function summary(count,profile){
 const n=Number(count)||0;
 if(!Object.keys(normalise(profile)).length)
  return {count:0,text:'Añade las medidas de tu vehículo para comprobar alturas, pesos y accesos.',tone:'idle'};
 if(!n)return {count:0,text:'Sin incompatibilidades detectadas con tu vehículo.',tone:'ok'};
 return {count:n,tone:'warn',
  text:n===1?'1 posible incompatibilidad con tu vehículo':n+' posibles incompatibilidades con tu vehículo'};
}

const api={PRESETS,FIELDS,preset,dimsOf,normalise,same,detect,describe,incompatibilities,summary,VEHICLE_KINDS};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RutasVehicleCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
