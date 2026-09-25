(function(root){
'use strict';
const C=typeof module!=='undefined'?require('./nav-core'):root.RutasNav;
function rule(tags){const v=tags['oneway:motor_vehicle']??tags.oneway;if(Object.keys(tags).some(k=>k.startsWith('oneway')&&k.includes('conditional'))||v==='reversible'||v==='alternating')return {direction:0,conditional:true};if(v==='no'||v==='0'||v==='false')return {direction:0};if(v==='-1'||v==='reverse')return {direction:-1};if(v==='yes'||v==='1'||v==='true')return {direction:1};return {direction:tags.junction==='roundabout'||tags.highway==='motorway'?1:0};}
function metresOf(v){if(v==null)return null;const t=String(v).trim().toLowerCase();if(!t||t==='default'||t==='none'||t==='unsigned'||t==='below_default')return null;const ft=t.match(/^(\d+(?:\.\d+)?)\s*'\s*(?:(\d+(?:\.\d+)?)\s*")?$/);if(ft)return +(( +ft[1]*0.3048+(+(ft[2]||0))*0.0254).toFixed(2));const m=t.match(/^(\d+(?:[.,]\d+)?)\s*(m|meters?|metres?)?$/);return m?parseFloat(m[1].replace(',','.')):null;}
function tonnesOf(v){if(v==null)return null;const t=String(v).trim().toLowerCase();if(!t||t==='default'||t==='none'||t==='unsigned')return null;const lb=t.match(/^(\d+(?:\.\d+)?)\s*lbs?$/);if(lb)return +(+lb[1]*0.000453592).toFixed(2);const kg=t.match(/^(\d+(?:\.\d+)?)\s*kg$/);if(kg)return +(+kg[1]/1000).toFixed(2);const m=t.match(/^(\d+(?:[.,]\d+)?)\s*(t|tonnes?|tons?)?$/);return m?parseFloat(m[1].replace(',','.')):null;}
function speedLimit(v){if(v==null)return null;const t=String(v).trim().toLowerCase();if(!t||t.includes('@')||/^(none|signals|variable|walk|national|urban|rural)/.test(t))return null;const m=t.match(/^(\d+(?:[.,]\d+)?)\s*(km\/?h|kph|mph)?$/);if(!m)return null;const n=parseFloat(m[1].replace(',','.'))*(m[2]==='mph'?1.609344:1);return n>=5&&n<=160?Math.round(n):null;}
const LIMITS=[{kind:'height',keys:['maxheight:hgv','maxheight'],parse:metresOf,field:'height',label:'Altura máxima',unit:'m'},
 {kind:'weight',keys:['maxweight:hgv','maxweight'],parse:tonnesOf,field:'weight',label:'Peso máximo',unit:'t'},
 {kind:'width',keys:['maxwidth:hgv','maxwidth'],parse:metresOf,field:'width',label:'Anchura máxima',unit:'m'}];
function vehicle(tags,profile){const out=[];profile=profile||{};
 for(const L of LIMITS){const key=L.keys.find(k=>tags[k]!=null);if(!key)continue;const limit=L.parse(tags[key]),mine=Number(profile[L.field]);
  if(limit==null||!Number.isFinite(mine)||mine<=0)continue;
  if(mine>limit)out.push({kind:L.kind,detail:L.label+' '+limit+' '+L.unit+'; tu vehículo '+mine+' '+L.unit});}
 const blocked=v=>v==='no'||v==='private';
 const accessKey=['hgv','motor_vehicle','vehicle','access'].find(k=>tags[k]!=null);
 if(accessKey&&blocked(tags[accessKey]))out.push({kind:'access',detail:'Acceso restringido ('+accessKey+'='+tags[accessKey]+')'});
 if(Object.keys(tags).some(k=>/^max(height|weight|width|length)\b/.test(k)&&k.includes('conditional')))out.push({kind:'limit-variable',detail:'Límite dimensional variable según condiciones'});
 return out;}
function indexWays(elements,lat0,cell=60,pad=20){const kx=111320*Math.cos(lat0*Math.PI/180),ky=110540,grid=new Map();
 const xy=p=>({x:p.lon*kx,y:p.lat*ky});
 for(const w of elements){if(w.type!=='way'||!w.geometry||!w.tags?.highway)continue;
  for(let i=1;i<w.geometry.length;i++){const a=xy(w.geometry[i-1]),b=xy(w.geometry[i]),dx=b.x-a.x,dy=b.y-a.y;
   if(!dx&&!dy)continue;
   const seg={a,dx,dy,len:dx*dx+dy*dy,way:w,heading:C.heading(w.geometry[i-1],w.geometry[i]),rule:rule(w.tags)};
   for(let x=Math.floor((Math.min(a.x,b.x)-pad)/cell);x<=Math.floor((Math.max(a.x,b.x)+pad)/cell);x++)
    for(let y=Math.floor((Math.min(a.y,b.y)-pad)/cell);y<=Math.floor((Math.max(a.y,b.y)+pad)/cell);y++){
     const key=x+':'+y;let arr=grid.get(key);if(!arr)grid.set(key,arr=[]);arr.push(seg);}}}
 return {kx,ky,xy,near(q){return grid.get(Math.floor(q.x/cell)+':'+Math.floor(q.y/cell))||[];}};}
function analyze(pts,elements,profile){const route=C.prepare(pts),index=indexWays(elements,pts[0].lat),xy=index.xy;
 const hits=[];let sampled=0,matched=0,ambiguous=0;
 for(let d=8;d<route.total-8;d+=8){sampled++;const p=C.at(route,d),a=C.at(route,d-7),b=C.at(route,d+7);if(C.distance(a,b)<7)continue;const h=C.heading(a,b),q=xy(p),byWay=new Map();for(const s of index.near(q)){const t=Math.max(0,Math.min(1,((q.x-s.a.x)*s.dx+(q.y-s.a.y)*s.dy)/s.len)),dist=Math.hypot(q.x-s.a.x-t*s.dx,q.y-s.a.y-t*s.dy);if(dist>16)continue;const delta=Math.abs(((h-s.heading+540)%360)-180),axis=Math.min(delta,180-delta);if(axis>35)continue;const candidate={s,dist,delta,score:dist+axis*.08};if(!byWay.has(s.way.id)||byWay.get(s.way.id).score>candidate.score)byWay.set(s.way.id,candidate);}
 const list=[...byWay.values()].sort((a,b)=>a.score-b.score);if(!list.length)continue;matched++;const best=list[0],s=best.s,opposed=s.rule.direction===1?best.delta>140:s.rule.direction===-1?best.delta<40:false;
 const flags=[];
 if(opposed)flags.push({kind:'opposed'});else if(s.rule.conditional)flags.push({kind:'conditional'});
 for(const v of vehicle(s.way.tags,profile))flags.push(v);
 if(!flags.length)continue;
 const nearby=list[1]&&list[1].score-best.score<5; if(nearby)ambiguous++;
 const name=s.way.tags.name||s.way.tags.ref||'Vía sin nombre';
 for(const f of flags)hits.push({d,p,way:s.way.id,name,distance:best.dist,kind:f.kind==='opposed'&&nearby?'ambiguous':f.kind,detail:f.detail||null,uncertain:!!nearby,tags:s.way.tags});
 }
 const groups=[];for(const h of hits){const last=groups.find(g=>g.way===h.way&&g.kind===h.kind&&h.d-g.end<=24);if(last){last.end=h.d;last.count++;last.maxOffset=Math.max(last.maxOffset,h.distance);}else groups.push({way:h.way,name:h.name,start:h.d,end:h.d,count:1,p:h.p,kind:h.kind,detail:h.detail,uncertain:h.uncertain,maxOffset:h.distance,tags:h.tags});}
 const ONEWAY=new Set(['opposed','ambiguous','conditional']);
 const solid=g=>ONEWAY.has(g.kind)?g.count>=3&&g.end-g.start>=16:g.count>=2&&g.end-g.start>=8;
 return {issues:groups.filter(solid).sort((a,b)=>a.start-b.start).map(g=>({...g,start:Math.max(0,g.start-4),end:Math.min(route.total,g.end+4)})),sampled,matched,ambiguous,total:route.total};
}
function roadContext(pts,elements){const route=C.prepare(pts),index=indexWays(elements,pts[0].lat),runs=[];
 function at(d){const p=C.at(route,d),a=C.at(route,Math.max(0,d-8)),b=C.at(route,Math.min(route.total,d+8));if(C.distance(a,b)<3)return null;const h=C.heading(a,b),q=index.xy(p),byWay=new Map();
  for(const s of index.near(q)){const t=Math.max(0,Math.min(1,((q.x-s.a.x)*s.dx+(q.y-s.a.y)*s.dy)/(s.len||1))),dist=Math.hypot(q.x-s.a.x-t*s.dx,q.y-s.a.y-t*s.dy);if(dist>16)continue;const delta=Math.abs(((h-s.heading+540)%360)-180),axis=Math.min(delta,180-delta);if(axis>35)continue;const score=dist+axis*.08,c={s,dist,delta,score};if(!byWay.has(s.way.id)||byWay.get(s.way.id).score>score)byWay.set(s.way.id,c);}
  const list=[...byWay.values()].sort((x,y)=>x.score-y.score);if(!list.length)return null;const best=list[0],tags=best.s.way.tags||{},opposed=best.s.rule.direction===1?best.delta>140:best.s.rule.direction===-1?best.delta<40:false,uncertain=!!(list[1]&&list[1].score-best.score<5);
  const flow=opposed?(uncertain?'ambiguous':'opposed'):best.s.rule.conditional?'conditional':best.s.rule.direction?'oneway':'twoway';
  return {d,way:best.s.way.id,name:tags.name||tags.ref||'Vía sin nombre',ref:tags.ref||'',highway:tags.highway||'',flow,uncertain,maxspeed:tags['maxspeed:hgv']||tags.maxspeed||'',lanes:tags.lanes||'',surface:tags.surface||'',p};}
 const step=12,distances=[0];for(let d=step;d<route.total;d+=step)distances.push(d);distances.push(route.total);
 for(const d of distances){const hit=at(d);if(!hit)continue;const last=runs.at(-1);if(last&&last.way===hit.way&&last.flow===hit.flow&&d-last.end<=step*2){last.end=d;last.p=hit.p;}else runs.push({...hit,start:d,end:d});}
 return runs.map(r=>({...r,start:Math.max(0,r.start-step/2),end:Math.min(route.total,r.end+step/2)}));
}
function enrichTurns(route,turns,elements){
 if(!turns.length)return [];
 const index=indexWays(elements,route.pts[0].lat);
 function roadAt(d){const p=C.at(route,d),h=C.heading(C.at(route,Math.max(0,d-8)),C.at(route,Math.min(route.total,d+8))),q=index.xy(p),byWay=new Map();
  for(const s of index.near(q)){const t=Math.max(0,Math.min(1,((q.x-s.a.x)*s.dx+(q.y-s.a.y)*s.dy)/(s.len||1))),
   error=Math.hypot(q.x-s.a.x-t*s.dx,q.y-s.a.y-t*s.dy);
   if(error>14)continue;
   const delta=Math.abs(((s.heading-h+540)%360)-180),axis=Math.min(delta,180-delta);
   if(axis>30)continue;
   const score=error+axis*.08;
   if(!byWay.has(s.way.id)||byWay.get(s.way.id).score>score)byWay.set(s.way.id,{score,way:s.way});}
  const sorted=[...byWay.values()].sort((a,b)=>a.score-b.score);
  return sorted.length&&(!sorted[1]||sorted[1].score-sorted[0].score>4)?sorted[0].way:null;}
 return turns.map(t=>{const before=roadAt(Math.max(0,t.d-30)),after=roadAt(Math.min(route.total,t.d+30));if(!before||!after)return {...t};const from=before.tags.name||before.tags.ref,to=after.tags.name||after.tags.ref;if(!from||!to)return {...t};const same=from===to,label=same&&Math.abs(t.angle)<120?(t.angle>0?'Curva a la derecha':'Curva a la izquierda'):t.label;return {...t,label,fromRoad:from,toRoad:to,roadContext:true};});
}
// ---- que zona se pide a Overpass ----
// Antes se pedian todas las vias de un unico rectangulo que envolvia la ruta. Para una ronda
// larga eso es enorme: con una de 108 km el rectangulo media 218 km2 y traia 6024 vias y
// 7 MB -mas de lo que cabe en el almacen de un iPhone, unos 5 MB-, de las que el comprobador
// solo usaba 652, las que pasan a menos de 16 m. Y por encima de 250 km2 no se comprobaba
// nada. Ahora se piden cajas pequeñas a lo largo del recorrido: medido con la misma ronda,
// 55 cajas, 63 km2, 1463 vias y 2,3 MB, sin que falte ninguna de las 652.
// Se descarto pedir un pasillo con around: una linea de 1254 puntos seguia ejecutandose en
// el servidor a los tres minutos.
const TRAMO=2000, MARGEN=120;
function corridor(route,opts){
 const o=opts||{};
 const L=Number.isFinite(o.tramo)&&o.tramo>0?o.tramo:TRAMO;
 const m=Number.isFinite(o.margen)&&o.margen>=0?o.margen:MARGEN;
 if(!route||!Array.isArray(route.pts)||route.pts.length<2||!Array.isArray(route.cum))return [];
 const out=[];let s=90,w=180,n=-90,e=-180,desde=route.cum[0]||0;
 const cierra=()=>{
  if(s>n||w>e)return;
  const dLa=m/110540,dLo=m/(111320*Math.cos(((s+n)/2)*Math.PI/180));
  out.push([s-dLa,w-dLo,n+dLa,e+dLo].map(v=>+v.toFixed(6)));
  s=90;w=180;n=-90;e=-180;
 };
 for(let i=0;i<route.pts.length;i++){
  const p=route.pts[i];
  if(!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lon))continue;
  s=Math.min(s,p.lat);n=Math.max(n,p.lat);w=Math.min(w,p.lon);e=Math.max(e,p.lon);
  if(route.cum[i]-desde>=L&&i<route.pts.length-1){
   cierra();desde=route.cum[i];
   // El punto de corte abre tambien la caja siguiente: si no, el trozo entre los dos
   // ultimos puntos de una caja y el primero de la otra quedaria fuera de ambas.
   s=n=p.lat;w=e=p.lon;
  }
 }
 cierra();
 return out;
}
// Superficie total, en m2, para el mismo limite de antes: una consulta desmesurada se
// niega en vez de colgar el servidor publico.
function corridorArea(boxes){
 let t=0;
 for(const b of Array.isArray(boxes)?boxes:[]){
  if(!Array.isArray(b)||b.length!==4)continue;
  const alto=(b[2]-b[0])*110540,ancho=(b[3]-b[1])*111320*Math.cos(((b[0]+b[2])/2)*Math.PI/180);
  if(alto>0&&ancho>0)t+=alto*ancho;
 }
 return t;
}
// Que zona se pide, segun el tamaño de la ronda. Un unico rectangulo es lo mas discreto:
// dice donde esta la zona, no por donde pasa la ronda. Por eso se sigue usando siempre que
// sea razonable -hasta 25 km2, una ronda urbana holgada- y el pasillo de cajas solo cuando
// el rectangulo seria desmesurado, que es justo cuando fallaba o no cabia en el movil. La
// cadena de cajas tampoco lleva puntos ni horas del GPX, pero si deja ver el trazado a
// grandes rasgos: se paga solo donde compra algo.
const RECTANGULO_MAX=25e6;
function envelope(route,margen){
 const m=Number.isFinite(margen)&&margen>=0?margen:MARGEN;
 if(!route||!Array.isArray(route.pts)||route.pts.length<2)return null;
 let s=90,w=180,n=-90,e=-180;
 for(const p of route.pts){
  if(!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lon))continue;
  s=Math.min(s,p.lat);n=Math.max(n,p.lat);w=Math.min(w,p.lon);e=Math.max(e,p.lon);
 }
 if(s>n||w>e)return null;
 const dLa=m/110540,dLo=m/(111320*Math.cos(((s+n)/2)*Math.PI/180));
 return [s-dLa,w-dLo,n+dLa,e+dLo].map(v=>+v.toFixed(6));
}
function zone(route,opts){
 const unico=envelope(route,opts&&opts.margen);
 if(!unico)return {tipo:'ninguna',boxes:[]};
 if(corridorArea([unico])<=RECTANGULO_MAX)return {tipo:'rectangulo',boxes:[unico]};
 return {tipo:'pasillo',boxes:corridor(route,opts)};
}

function corridorQuery(boxes,timeout){
 const l=(Array.isArray(boxes)?boxes:[]).filter(b=>Array.isArray(b)&&b.length===4);
 if(!l.length)return '';
 return '[out:json][timeout:'+(Number.isFinite(timeout)?timeout:60)+'];('+
  l.map(b=>'way["highway"]('+b.join(',')+');').join('')+');out tags geom;';
}

const api={rule,analyze,roadContext,enrichTurns,vehicle,metresOf,tonnesOf,speedLimit,indexWays,
           corridor,corridorArea,corridorQuery,envelope,zone,TRAMO,MARGEN,RECTANGULO_MAX};if(typeof module!=='undefined')module.exports=api;else root.RutasRestrictions=api;
})(typeof window!=='undefined'?window:globalThis);
