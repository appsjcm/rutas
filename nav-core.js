(function(root){
'use strict';
const rad=Math.PI/180;
function distance(a,b){const x=(b.lon-a.lon)*rad,y=(b.lat-a.lat)*rad;return 12742000*Math.asin(Math.min(1,Math.sqrt(Math.sin(y/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(x/2)**2)));}
function prepare(pts){const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+distance(pts[i-1],pts[i]));return {pts,cum,total:cum[cum.length-1]||0};}
function at(r,d){d=Math.max(0,Math.min(r.total,d));let lo=0,hi=r.pts.length-1;while(lo<hi){const m=(lo+hi)>>1;if(r.cum[m]<d)lo=m+1;else hi=m;}const j=Math.max(1,lo),i=j-1,a=r.pts[i],b=r.pts[j]||a,t=(d-r.cum[i])/(r.cum[j]-r.cum[i]||1);return {lat:a.lat+(b.lat-a.lat)*t,lon:a.lon+(b.lon-a.lon)*t};}
function heading(a,b){const y=Math.sin((b.lon-a.lon)*rad)*Math.cos(b.lat*rad),x=Math.cos(a.lat*rad)*Math.sin(b.lat*rad)-Math.sin(a.lat*rad)*Math.cos(b.lat*rad)*Math.cos((b.lon-a.lon)*rad);return (Math.atan2(y,x)/rad+360)%360;}
function match(r,p,progress,forward=200,expected=progress){let best=null;const kx=111320*Math.cos(p.lat*rad),ky=110540;for(let i=0;i<r.pts.length-1;i++){if(r.cum[i+1]<progress-30||r.cum[i]>progress+forward)continue;const a=r.pts[i],b=r.pts[i+1],x=(a.lon-p.lon)*kx,y=(a.lat-p.lat)*ky,dx=(b.lon-a.lon)*kx,dy=(b.lat-a.lat)*ky;const t=Math.max(0,Math.min(1,-(x*dx+y*dy)/(dx*dx+dy*dy||1)));const d=r.cum[i]+(r.cum[i+1]-r.cum[i])*t;if(d<progress-30||d>progress+forward)continue;const error=Math.hypot(x+t*dx,y+t*dy),score=error+Math.abs(d-expected)*0.03;if(!best||score<best.score)best={d,error,score};}return best;}

function section(r,from,to){const out=[at(r,from)];for(let i=0;i<r.pts.length;i++)if(r.cum[i]>from&&r.cum[i]<to)out.push(r.pts[i]);out.push(at(r,to));return out;}
function turns(r){const candidates=[];for(let d=25;d<r.total-25;d+=5){const a=at(r,d-25),b=at(r,d),c=at(r,d+25);if(distance(a,b)<10||distance(b,c)<10)continue;const angle=((heading(b,c)-heading(a,b)+540)%360)-180;if(Math.abs(angle)<48)continue;const item={d,angle,label:Math.abs(angle)>135?'Cambio de sentido':angle>0?'Giro a la derecha':'Giro a la izquierda',symbol:Math.abs(angle)>135?'↶':angle>0?'↱':'↰'};const last=candidates.at(-1);if(last&&d-last.end<40){last.end=d;if(Math.abs(angle)>Math.abs(last.angle))Object.assign(last,item);}else candidates.push({...item,end:d});}return candidates;}
const api={distance,prepare,at,heading,match,section,turns};if(typeof module!=='undefined')module.exports=api;else root.RutasNav=api;
})(typeof window!=='undefined'?window:globalThis);
