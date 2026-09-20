(function(root){
'use strict';
const C=typeof module!=='undefined'?require('./nav-core'):root.RutasNav;
function rule(tags){const v=tags['oneway:motor_vehicle']??tags.oneway;if(Object.keys(tags).some(k=>k.startsWith('oneway')&&k.includes('conditional'))||v==='reversible'||v==='alternating')return {direction:0,conditional:true};if(v==='no'||v==='0'||v==='false')return {direction:0};if(v==='-1'||v==='reverse')return {direction:-1};if(v==='yes'||v==='1'||v==='true')return {direction:1};return {direction:tags.junction==='roundabout'||tags.highway==='motorway'?1:0};}
function metresOf(v){if(v==null)return null;const t=String(v).trim().toLowerCase();if(!t||t==='default'||t==='none'||t==='unsigned'||t==='below_default')return null;const ft=t.match(/^(\d+(?:\.\d+)?)\s*'\s*(?:(\d+(?:\.\d+)?)\s*")?$/);if(ft)return +(( +ft[1]*0.3048+(+(ft[2]||0))*0.0254).toFixed(2));const m=t.match(/^(\d+(?:[.,]\d+)?)\s*(m|meters?|metres?)?$/);return m?parseFloat(m[1].replace(',','.')):null;}
function tonnesOf(v){if(v==null)return null;const t=String(v).trim().toLowerCase();if(!t||t==='default'||t==='none'||t==='unsigned')return null;const lb=t.match(/^(\d+(?:\.\d+)?)\s*lbs?$/);if(lb)return +(+lb[1]*0.000453592).toFixed(2);const kg=t.match(/^(\d+(?:\.\d+)?)\s*kg$/);if(kg)return +(+kg[1]/1000).toFixed(2);const m=t.match(/^(\d+(?:[.,]\d+)?)\s*(t|tonnes?|tons?)?$/);return m?parseFloat(m[1].replace(',','.')):null;}
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
const api={rule,analyze,enrichTurns,vehicle,metresOf,tonnesOf,indexWays};if(typeof module!=='undefined')module.exports=api;else root.RutasRestrictions=api;
})(typeof window!=='undefined'?window:globalThis);
