(function(root){
'use strict';
// Lo que se guarda en la biblioteca vuelve de IndexedDB, que puede traer registros de una
// version vieja, a medio escribir o manipulados. Nada se abre sin pasar por aqui.
function point(p){return !!p&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180;}
function valid(record){
 return !!record&&Array.isArray(record.tracks)&&record.tracks.length>0
  &&record.tracks.every(t=>!!t&&Array.isArray(t.pts)&&t.pts.length>1&&t.pts.every(point));
}
function usable(list){
 return (Array.isArray(list)?list:[]).filter(r=>valid(r)&&typeof r.title==='string'&&r.title.length>0
  &&Number.isFinite(r.km)&&Number.isFinite(r.updated));
}
// Busqueda sin acentos ni mayusculas: quien guarda "Ronda Nord" la encuentra con "nord".
function fold(text){
 return String(text==null?'':text).normalize('NFD').replace(/[̀-ͯ]/g,'').toLocaleLowerCase('es').trim();
}
function search(list,query){
 const needle=fold(query);
 return usable(list).filter(r=>!needle||fold(r.title).includes(needle)).sort((a,b)=>b.updated-a.updated);
}
function title(name,existing){
 if(existing&&typeof existing.title==='string'&&existing.title.trim())return existing.title;
 const clean=String(name==null?'':name).replace(/\.gpx$/i,'').trim().slice(0,80);
 return clean||'Mi ruta';
}
// El indice de deduplicacion son las coordenadas, no el nombre: la misma ronda guardada dos
// veces con otro titulo no debe ocupar dos fichas.
function fingerprint(tracks){
 return JSON.stringify((Array.isArray(tracks)?tracks:[]).map(t=>(t&&Array.isArray(t.pts)?t.pts:[]).map(p=>[p.lat,p.lon])));
}
function selection(index,tracks){
 const total=Array.isArray(tracks)?tracks.length:0;
 return Number.isInteger(index)&&index>0&&index<total?index:0;
}
const api={point,valid,usable,fold,search,title,fingerprint,selection};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RutasLibraryCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
