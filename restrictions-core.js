(function(root){
'use strict';
const C=typeof module!=='undefined'?require('./nav-core'):root.RutasNav;
function rule(tags){const v=tags['oneway:motor_vehicle']??tags.oneway;if(Object.keys(tags).some(k=>k.startsWith('oneway')&&k.includes('conditional'))||v==='reversible'||v==='alternating')return {direction:0,conditional:true};if(v==='no'||v==='0'||v==='false')return {direction:0};if(v==='-1'||v==='reverse')return {direction:-1};if(v==='yes'||v==='1'||v==='true')return {direction:1};return {direction:tags.junction==='roundabout'||tags.highway==='motorway'?1:0};}
function analyze(pts,elements){const route=C.prepare(pts),lat0=pts[0].lat,kx=111320*Math.cos(lat0*Math.PI/180),ky=110540,grid=new Map(),cell=60,ways=new Map();
 const xy=p=>({x:p.lon*kx,y:p.lat*ky});
 for(const w of elements){if(w.type!=='way'||!w.geometry||!w.tags?.highway)continue;ways.set(w.id,w);for(let i=1;i<w.geometry.length;i++){const a=xy(w.geometry[i-1]),b=xy(w.geometry[i]),dx=b.x-a.x,dy=b.y-a.y;if(!dx&&!dy)continue;const s={a,dx,dy,len:dx*dx+dy*dy,way:w,heading:C.heading(w.geometry[i-1],w.geometry[i]),rule:rule(w.tags)};for(let x=Math.floor((Math.min(a.x,b.x)-20)/cell);x<=Math.floor((Math.max(a.x,b.x)+20)/cell);x++)for(let y=Math.floor((Math.min(a.y,b.y)-20)/cell);y<=Math.floor((Math.max(a.y,b.y)+20)/cell);y++){const key=x+':'+y;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(s);}}}
 const hits=[];let sampled=0,matched=0,ambiguous=0;
 for(let d=8;d<route.total-8;d+=8){sampled++;const p=C.at(route,d),a=C.at(route,d-7),b=C.at(route,d+7);if(C.distance(a,b)<7)continue;const h=C.heading(a,b),q=xy(p),byWay=new Map();for(const s of grid.get(Math.floor(q.x/cell)+':'+Math.floor(q.y/cell))||[]){const t=Math.max(0,Math.min(1,((q.x-s.a.x)*s.dx+(q.y-s.a.y)*s.dy)/s.len)),dist=Math.hypot(q.x-s.a.x-t*s.dx,q.y-s.a.y-t*s.dy);if(dist>16)continue;const delta=Math.abs(((h-s.heading+540)%360)-180),axis=Math.min(delta,180-delta);if(axis>35)continue;const candidate={s,dist,delta,score:dist+axis*.08};if(!byWay.has(s.way.id)||byWay.get(s.way.id).score>candidate.score)byWay.set(s.way.id,candidate);}
 const list=[...byWay.values()].sort((a,b)=>a.score-b.score);if(!list.length)continue;matched++;const best=list[0],s=best.s,opposed=s.rule.direction===1?best.delta>140:s.rule.direction===-1?best.delta<40:false;
 if(!opposed&&!s.rule.conditional)continue;
 const nearby=list[1]&&list[1].score-best.score<5; if(nearby)ambiguous++;
 const kind=s.rule.conditional?'conditional':nearby?'ambiguous':'opposed';hits.push({d,p,way:s.way.id,name:s.way.tags.name||s.way.tags.ref||'Vía sin nombre',distance:best.dist,kind,tags:s.way.tags});
 }
 const groups=[];for(const h of hits){const last=groups.at(-1);if(last&&last.way===h.way&&last.kind===h.kind&&h.d-last.end<=24){last.end=h.d;last.count++;last.maxOffset=Math.max(last.maxOffset,h.distance);}else groups.push({way:h.way,name:h.name,start:h.d,end:h.d,count:1,p:h.p,kind:h.kind,maxOffset:h.distance,tags:h.tags});}
 return {issues:groups.filter(g=>g.count>=3&&g.end-g.start>=16).map(g=>({...g,start:Math.max(0,g.start-4),end:Math.min(route.total,g.end+4)})),sampled,matched,ambiguous,total:route.total};
}
const api={rule,analyze};if(typeof module!=='undefined')module.exports=api;else root.RutasRestrictions=api;
})(typeof window!=='undefined'?window:globalThis);
