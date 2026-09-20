(function(root){
'use strict';
const rad=Math.PI/180;
function distance(a,b){const x=(b.lon-a.lon)*rad,y=(b.lat-a.lat)*rad;return 12742000*Math.asin(Math.min(1,Math.sqrt(Math.sin(y/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(x/2)**2)));}
function prepare(pts){const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+distance(pts[i-1],pts[i]));return {pts,cum,total:cum[cum.length-1]||0};}
function at(r,d){d=Math.max(0,Math.min(r.total,d));let lo=0,hi=r.pts.length-1;while(lo<hi){const m=(lo+hi)>>1;if(r.cum[m]<d)lo=m+1;else hi=m;}const j=Math.max(1,lo),i=j-1,a=r.pts[i],b=r.pts[j]||a,t=(d-r.cum[i])/(r.cum[j]-r.cum[i]||1);return {lat:a.lat+(b.lat-a.lat)*t,lon:a.lon+(b.lon-a.lon)*t};}
function heading(a,b){const y=Math.sin((b.lon-a.lon)*rad)*Math.cos(b.lat*rad),x=Math.cos(a.lat*rad)*Math.sin(b.lat*rad)-Math.sin(a.lat*rad)*Math.cos(b.lat*rad)*Math.cos((b.lon-a.lon)*rad);return (Math.atan2(y,x)/rad+360)%360;}
function match(r,p,progress,forward=200,expected=progress,course=null){let best=null;const kx=111320*Math.cos(p.lat*rad),ky=110540;for(let i=0;i<r.pts.length-1;i++){if(r.cum[i+1]<progress-30||r.cum[i]>progress+forward)continue;const a=r.pts[i],b=r.pts[i+1],x=(a.lon-p.lon)*kx,y=(a.lat-p.lat)*ky,dx=(b.lon-a.lon)*kx,dy=(b.lat-a.lat)*ky;const t=Math.max(0,Math.min(1,-(x*dx+y*dy)/(dx*dx+dy*dy||1)));const d=r.cum[i]+(r.cum[i+1]-r.cum[i])*t;if(d<progress-30||d>progress+forward)continue;const error=Math.hypot(x+t*dx,y+t*dy),score=error+Math.abs(d-expected)*0.03+(Number.isFinite(course)?Math.abs(((heading(a,b)-course+540)%360)-180)*0.035:0);if(!best||score<best.score)best={d,error,score};}return best;}

function section(r,from,to){const out=[at(r,from)];for(let i=0;i<r.pts.length;i++)if(r.cum[i]>from&&r.cum[i]<to)out.push(r.pts[i]);out.push(at(r,to));return out;}
function indexAt(r,d){let lo=0,hi=r.pts.length-1;while(lo<hi){const m=(lo+hi)>>1;if(r.cum[m]<d)lo=m+1;else hi=m;}return lo;}
function speedAt(r,d){const k=indexAt(r,d),i=Math.max(0,k-8),j=Math.min(r.pts.length-1,k+8),a=Date.parse(r.pts[i]?.time),b=Date.parse(r.pts[j]?.time);if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a)return NaN;return (r.cum[j]-r.cum[i])/((b-a)/1000)*3.6;}
const TURN_MIN_SPEED=5,TURN_MIN_GAP=60;
function turns(r,{minSpeed=TURN_MIN_SPEED,minGap=TURN_MIN_GAP}={}){const candidates=[];for(let d=25;d<r.total-25;d+=5){const a=at(r,d-25),b=at(r,d),c=at(r,d+25);if(distance(a,b)<10||distance(b,c)<10)continue;const angle=((heading(b,c)-heading(a,b)+540)%360)-180;if(Math.abs(angle)<48)continue;if(minSpeed>0){const v=speedAt(r,d);if(Number.isFinite(v)&&v<minSpeed)continue;}const item={d,angle,label:Math.abs(angle)>135?'Cambio de sentido':angle>0?'Giro a la derecha':'Giro a la izquierda',symbol:Math.abs(angle)>135?'↶':angle>0?'↱':'↰'};const last=candidates.at(-1);if(last&&d-last.end<40&&(Math.sign(last.angle)===Math.sign(angle)||(Math.abs(last.angle)>135&&Math.abs(angle)>135))){last.end=d;if(Math.abs(angle)>Math.abs(last.angle))Object.assign(last,item);}else if(last&&minGap>0&&d-last.d<minGap){if(Math.abs(angle)>Math.abs(last.angle)){Object.assign(last,item);last.end=d;}}else candidates.push({...item,end:d});}return candidates;}
function guidance(turns,d,total,speed=0){
 const index=turns.findIndex(t=>t.d+15>=d),turn=index<0?null:turns[index],gap=turn?Math.max(0,turn.d-d):Math.max(0,total-d);
 const v=Number.isFinite(speed)?Math.max(0,speed):0;
 const stage=!turn?'straight':gap<=Math.max(15,Math.min(30,v*2))?'now':gap<=Math.max(50,Math.min(100,v*5))?'near':gap<=Math.max(150,Math.min(300,v*12))?'prepare':'later';
 return {index,turn,next:turn?turns[index+1]||null:null,gap,stage,completed:index<0?turns.length:index};
}
function encodeSigned(v){let r=v<0?~(v<<1):(v<<1),out='';while(r>=0x20){out+=String.fromCharCode((0x20|(r&0x1f))+63);r>>>=5;}return out+String.fromCharCode(r+63);}
function decodeSigned(str,c){let r=0,shift=0,b;do{if(c.i>=str.length)throw Error('Enlace incompleto.');b=str.charCodeAt(c.i++)-63;r|=(b&0x1f)<<shift;shift+=5;}while(b>=0x20);return (r&1)?~(r>>1):(r>>1);}
function simplify(pts,eps){const n=pts.length;if(n<3||!(eps>0))return pts.slice();
 const lat0=pts[n>>1].lat*rad,kx=111320*Math.cos(lat0),ky=110540,X=new Float64Array(n),Y=new Float64Array(n);
 for(let i=0;i<n;i++){X[i]=pts[i].lon*kx;Y[i]=pts[i].lat*ky;}
 const keep=new Uint8Array(n);keep[0]=keep[n-1]=1;const stack=[[0,n-1]];
 while(stack.length){const [i,j]=stack.pop();if(j-i<2)continue;
  const x1=X[i],y1=Y[i],dx=X[j]-x1,dy=Y[j]-y1,L2=dx*dx+dy*dy;let bi=-1,bd=-1;
  for(let k=i+1;k<j;k++){let d;if(L2===0)d=Math.hypot(X[k]-x1,Y[k]-y1);
   else{let t=((X[k]-x1)*dx+(Y[k]-y1)*dy)/L2;t=t<0?0:t>1?1:t;d=Math.hypot(X[k]-(x1+t*dx),Y[k]-(y1+t*dy));}
   if(d>bd){bd=d;bi=k;}}
  if(bd>eps){keep[bi]=1;stack.push([i,bi],[bi,j]);}}
 const out=[];for(let i=0;i<n;i++)if(keep[i])out.push(pts[i]);return out;}
function packRoute(name,pts){const f=1e5;let plat=0,plon=0,p='';
 for(const q of pts){const lat=Math.round(q.lat*f),lon=Math.round(q.lon*f);p+=encodeSigned(lat-plat)+encodeSigned(lon-plon);plat=lat;plon=lon;}
 const body={v:1,n:String(name||'Ruta').slice(0,80),p};
 const stamped=pts.every(q=>Number.isFinite(Date.parse(q?.time)));
 if(stamped){const base=Math.round(Date.parse(pts[0].time)/1000);let prev=0,t='';
  for(const q of pts){const sec=Math.round(Date.parse(q.time)/1000)-base;t+=encodeSigned(sec-prev);prev=sec;}
  body.b=base;body.t=t;}
 return JSON.stringify(body);}
function unpackRoute(text){let body;try{body=JSON.parse(text);}catch{throw Error('El enlace no se entiende.');}
 if(!body||body.v!==1||typeof body.p!=='string')throw Error('El enlace no es de una ruta compatible.');
 const f=1e5,c={i:0},pts=[];let lat=0,lon=0;
 while(c.i<body.p.length){lat+=decodeSigned(body.p,c);lon+=decodeSigned(body.p,c);
  const la=lat/f,lo=lon/f;
  if(!Number.isFinite(la)||!Number.isFinite(lo)||Math.abs(la)>90||Math.abs(lo)>180)throw Error('El enlace trae coordenadas imposibles.');
  pts.push({lat:la,lon:lo,ele:null,time:null});
  if(pts.length>200000)throw Error('El enlace trae demasiados puntos.');}
 if(pts.length<2)throw Error('El enlace no trae ningun recorrido.');
 if(typeof body.t==='string'&&Number.isFinite(body.b)){const d={i:0};let sec=0;
  for(let k=0;k<pts.length&&d.i<body.t.length;k++){sec+=decodeSigned(body.t,d);
   const ms=(body.b+sec)*1000;if(Number.isFinite(ms)&&Math.abs(ms)<8.64e15)pts[k].time=new Date(ms).toISOString();}}
 return {name:String(body.n||'Ruta compartida').slice(0,80),pts};}
function remainingSeconds(r,d){const last=r.pts.length-1,t0=Date.parse(r.pts[0]?.time),tN=Date.parse(r.pts[last]?.time);if(!Number.isFinite(t0)||!Number.isFinite(tN)||tN<=t0)return null;const tk=Date.parse(r.pts[indexAt(r,Math.max(0,Math.min(r.total,d)))]?.time);return Number.isFinite(tk)?Math.max(0,(tN-tk)/1000):null;}
const STOP_RADIUS=40,STOP_SECONDS=180;
function stops(r,{radius=STOP_RADIUS,minSeconds=STOP_SECONDS}={}){const out=[];let i=0;while(i<r.pts.length){let j=i;while(j+1<r.pts.length&&distance(r.pts[i],r.pts[j+1])<radius)j++;const a=Date.parse(r.pts[i]?.time),b=Date.parse(r.pts[j]?.time);if(j>i&&Number.isFinite(a)&&Number.isFinite(b)&&(b-a)/1000>=minSeconds){const k=(i+j)>>1;out.push({index:k,start:r.cum[i],end:r.cum[j],d:r.cum[k],seconds:(b-a)/1000,p:{lat:r.pts[k].lat,lon:r.pts[k].lon}});i=j+1;}else i++;}return out;}
function stopProgress(stops,d){let done=0;while(done<stops.length&&stops[done].end<=d+15)done++;return {done,total:stops.length,next:stops[done]||null,gap:stops[done]?Math.max(0,stops[done].d-d):null};}
function fingerprint(r){let hash=2166136261;for(const p of r.pts){const value=p.lat.toFixed(7)+','+p.lon.toFixed(7)+';';for(let i=0;i<value.length;i++)hash=Math.imul(hash^value.charCodeAt(i),16777619);}return r.pts.length+'-'+(hash>>>0).toString(16);}
function nearbyPasses(r,p){const hits=[];for(let i=0;i<r.pts.length-1;i++){const lo=r.cum[i],hi=r.cum[i+1],m=match({pts:r.pts.slice(i,i+2),cum:[lo,hi],total:hi},p,lo,hi-lo,lo);if(m&&m.error<60)hits.push(m);}hits.sort((a,b)=>a.error-b.error);const chosen=[];for(const h of hits){if(chosen.every(c=>Math.abs(c.d-h.d)>80))chosen.push(h);if(chosen.length===5)break;}return chosen.sort((a,b)=>a.d-b.d);}
const api={distance,prepare,at,heading,match,section,turns,guidance,fingerprint,nearbyPasses,speedAt,stops,stopProgress,remainingSeconds,simplify,packRoute,unpackRoute,TURN_MIN_SPEED,TURN_MIN_GAP,STOP_RADIUS,STOP_SECONDS};if(typeof module!=='undefined')module.exports=api;else root.RutasNav=api;
})(typeof window!=='undefined'?window:globalThis);
