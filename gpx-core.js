(function(root){
'use strict';
function escapeXml(value){return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');}
function safeName(value){return String(value||'ruta').replace(/\.gpx$/i,'').trim().slice(0,100)||'ruta';}
function filename(value){const name=safeName(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'ruta';return name+'.gpx';}
// Los avisos del conductor viajan dentro del GPX como waypoints normales: asi llegan al
// companero por WhatsApp y los lee tambien OsmAnd o un Garmin, no solo esta aplicacion.
// El tipo va en <type> con prefijo propio; el nombre y la nota quedan legibles para todos.
function waypoints(marks){
 const out=[];
 for(const m of Array.isArray(marks)?marks:[]){
  if(!m||!Number.isFinite(m.lat)||!Number.isFinite(m.lon))continue;
  if(Math.abs(m.lat)>90||Math.abs(m.lon)>180)continue;
  out.push('  <wpt lat="'+m.lat.toFixed(7)+'" lon="'+m.lon.toFixed(7)+'">');
  out.push('    <name>'+escapeXml(m.label||'Aviso')+'</name>');
  if(m.note)out.push('    <desc>'+escapeXml(m.note)+'</desc>');
  out.push('    <type>rutas:'+escapeXml(m.kind||'nota')+'</type>');
  out.push('  </wpt>');
 }
 return out;
}

function build(name,pts,marks){
 if(!Array.isArray(pts)||pts.length<2)throw Error('La ruta necesita al menos dos puntos.');
 const title=safeName(name),body=[],wpts=waypoints(marks);
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
  (wpts.length?wpts.join('\n')+'\n':'')+
  '  <trk>\n    <name>'+escapeXml(title)+'</name>\n    <trkseg>\n'+body.join('\n')+'\n    </trkseg>\n  </trk>\n</gpx>\n';
}
// Mide que le falta a una grabacion. Un hueco con el vehiculo quieto es una parada normal
// -contenedor, descanso-; uno con el vehiculo en marcha es informacion perdida, y lo que se
// dibuje ahi sera una reconstruccion, no el recorrido real.
function quality(parts,distance,opts){
 const minSeconds=(opts&&opts.minSeconds)||30,movingKmh=(opts&&opts.movingKmh)||4;
 const out={segments:0,points:0,metres:0,timed:false,cadence:0,
            stopped:{count:0,seconds:0},lost:{count:0,cuts:0,inner:0,seconds:0,metres:0},worst:[]};
 const list=Array.isArray(parts)?parts.filter(p=>Array.isArray(p)&&p.length):[];
 if(!list.length||typeof distance!=='function')return out;
 out.segments=list.length;
 let timed=0;
 function check(a,b,cut){
  const ta=Date.parse(a&&a.time),tb=Date.parse(b&&b.time);
  if(!Number.isFinite(ta)||!Number.isFinite(tb))return;
  const seconds=(tb-ta)/1000;
  if(!(seconds>minSeconds))return;
  const metres=distance(a,b),kmh=metres/seconds*3.6;
  if(kmh>=movingKmh){
   out.lost.count++;out.lost.seconds+=seconds;out.lost.metres+=metres;
   if(cut)out.lost.cuts++;else out.lost.inner++;
   out.worst.push({metres,seconds,kmh,cut});
  }else{out.stopped.count++;out.stopped.seconds+=seconds;}
 }
 for(let s=0;s<list.length;s++){
  const pts=list[s];out.points+=pts.length;
  for(const p of pts)if(Number.isFinite(Date.parse(p&&p.time)))timed++;
  for(let i=1;i<pts.length;i++){out.metres+=distance(pts[i-1],pts[i]);check(pts[i-1],pts[i],false);}
  if(s)check(list[s-1][list[s-1].length-1],pts[0],true);
 }
 out.timed=timed>out.points/2;
 out.cadence=out.points>list.length?out.metres/(out.points-list.length):0;
 out.worst.sort((a,b)=>b.metres-a.metres);out.worst=out.worst.slice(0,5);
 return out;
}
const api={build,waypoints,filename,safeName,escapeXml,quality};if(typeof module==='object'&&module.exports)module.exports=api;else root.RutasGPX=api;
})(typeof globalThis!=='undefined'?globalThis:this);
