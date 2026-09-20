(function(root){
'use strict';
function escapeXml(value){return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');}
function safeName(value){return String(value||'ruta').replace(/\.gpx$/i,'').trim().slice(0,100)||'ruta';}
function filename(value){const name=safeName(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'ruta';return name+'.gpx';}
function build(name,pts){
 if(!Array.isArray(pts)||pts.length<2)throw Error('La ruta necesita al menos dos puntos.');
 const title=safeName(name),body=[];
 for(const p of pts){
  if(!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lon)||Math.abs(p.lat)>90||Math.abs(p.lon)>180)throw Error('La ruta contiene coordenadas no válidas.');
  body.push('      <trkpt lat="'+p.lat.toFixed(7)+'" lon="'+p.lon.toFixed(7)+'">');
  if(Number.isFinite(p.ele))body.push('        <ele>'+Number(p.ele).toFixed(2)+'</ele>');
  if(p.time){const stamp=Date.parse(p.time);if(Number.isFinite(stamp))body.push('        <time>'+new Date(stamp).toISOString()+'</time>');}
  if(p.name)body.push('        <name>'+escapeXml(p.name)+'</name>');
  body.push('      </trkpt>');
 }
 return '<?xml version="1.0" encoding="UTF-8"?>\n'+
  '<gpx version="1.1" creator="Rutas" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">\n'+
  '  <metadata><name>'+escapeXml(title)+'</name></metadata>\n'+
  '  <trk>\n    <name>'+escapeXml(title)+'</name>\n    <trkseg>\n'+body.join('\n')+'\n    </trkseg>\n  </trk>\n</gpx>\n';
}
const api={build,filename,safeName,escapeXml};if(typeof module==='object'&&module.exports)module.exports=api;else root.RutasGPX=api;
})(typeof globalThis!=='undefined'?globalThis:this);
