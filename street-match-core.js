(function(root){
'use strict';
function decode(encoded,precision=6){
 if(typeof encoded!=='string'||!encoded)throw Error('La respuesta no contiene una geometría válida.');
 const scale=10**precision,pts=[];let i=0,lat=0,lon=0;
 function value(){let result=0,shift=0,byte;do{if(i>=encoded.length||shift>30)throw Error('La geometría de calles está incompleta.');byte=encoded.charCodeAt(i++)-63;if(byte<0||byte>63)throw Error('La geometría de calles no es válida.');result|=(byte&31)<<shift;shift+=5;}while(byte>=32);return result&1?~(result>>1):result>>1;}
 while(i<encoded.length){lat+=value();lon+=value();const p={lat:lat/scale,lon:lon/scale};if(Math.abs(p.lat)>90||Math.abs(p.lon)>180)throw Error('La geometría de calles contiene coordenadas imposibles.');pts.push(p);}
 if(pts.length<2)throw Error('No se obtuvo un trazado continuo por calles.');
 return pts;
}
function extract(data){
 const legs=data&&data.trip&&Array.isArray(data.trip.legs)?data.trip.legs:[];if(!legs.length)throw Error(data?.error||data?.status_message||'No se encontraron calles próximas al recorrido.');
 const out=[];for(const leg of legs){const pts=decode(leg.shape);for(const p of pts)if(!out.length||Math.abs(out.at(-1).lat-p.lat)>1e-7||Math.abs(out.at(-1).lon-p.lon)>1e-7)out.push(p);}
 if(out.length<2)throw Error('No se obtuvo un trazado continuo por calles.');return out;
}
function input(pts,simplify,max=1800){
 if(!Array.isArray(pts)||pts.length<2)return [];
 let out=typeof simplify==='function'?simplify(pts,5):pts.slice();
 if(out.length>max){const picked=[];for(let i=0;i<max;i++)picked.push(out[Math.round(i*(out.length-1)/(max-1))]);out=picked;}
 return out.map(p=>({lat:Number(p.lat),lon:Number(p.lon)})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180);
}
function chunks(points,max=120){const out=[];if(points.length<2)return out;for(let start=0;start<points.length-1;start+=max-1)out.push(points.slice(start,Math.min(points.length,start+max)));return out;}
function merge(lines){const out=[];for(const line of lines)for(const p of line)if(!out.length||Math.abs(out.at(-1).lat-p.lat)>1e-7||Math.abs(out.at(-1).lon-p.lon)>1e-7)out.push(p);return out;}
function coverage(samples,path,radius=45){
 if(!samples.length||path.length<2)return 0;const take=samples.length<=160?samples:Array.from({length:160},(_,i)=>samples[Math.round(i*(samples.length-1)/159)]);let hit=0;
 for(const p of take){const kx=111320*Math.cos(p.lat*Math.PI/180),ky=110540;let best=Infinity;for(let i=0;i<path.length-1;i++){const a=path[i],b=path[i+1],x=(a.lon-p.lon)*kx,y=(a.lat-p.lat)*ky,dx=(b.lon-a.lon)*kx,dy=(b.lat-a.lat)*ky,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,-(x*dx+y*dy)/l)):0;best=Math.min(best,Math.hypot(x+t*dx,y+t*dy));if(best<=radius)break;}if(best<=radius)hit++;}
 return Math.round(hit/take.length*100);
}
const api={decode,extract,input,chunks,merge,coverage};if(typeof module!=='undefined')module.exports=api;else root.RutasStreetCore=api;
})(typeof window!=='undefined'?window:globalThis);
