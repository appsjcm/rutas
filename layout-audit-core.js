(function(root){
'use strict';
// Auditor de pantalla. Tres veces seguidas el fallo reportado fue el mismo: un control
// tapado por otro, o fuera de la pantalla en un tamaño que no se habia probado. Esto lo
// busca solo. La parte que decide vive aqui, sin DOM, para poder probarla.

const MIN=1;     // un borde justo en el limite no es un fallo, es redondeo

function big(r){return !!r&&r.width>MIN&&r.height>MIN;}
function inside(r,vw,vh){
 return r.top>=0&&r.left>=0&&r.bottom<=vh+MIN&&r.right<=vw+MIN;
}
function centre(r){return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};}

// item: {name, rect, vw, vh, fixed, hit, scrolls}
// hit es 'self' si el clic cae en el propio control o en algo suyo, y si no el nombre de
// quien lo recibe. fixed marca lo que no se puede alcanzar desplazando la pagina, y
// scrolls si la pagina se puede desplazar.
//
// Un control de la pagina tapado por un panel fijo se destapa bajando un poco: es molesto,
// pero se sale. Uno fijo tapado por otro fijo no se destapa nunca. Distinguirlos es lo que
// separa una herramienta util de una que grita por todo y acaba ignorandose.
function judge(item){
 if(!item||!big(item.rect))return null;
 if(!inside(item.rect,item.vw,item.vh)){
  return item.fixed?{q:'no se alcanza',name:item.name,grave:true}:null;
 }
 if(item.hit&&item.hit!=='self'){
  const grave=!!item.fixed||!item.scrolls;
  return {q:'tapado',name:item.name,por:item.hit,grave};
 }
 return null;
}

// ---- capas que flotan sobre el mapa ----
// elementFromPoint solo ve el centro de cada control, asi que una tarjeta que cubre media
// barra de botones pasaba desapercibida si los centros quedaban libres. Eso fue justo lo
// que paso: la tarjeta de la calle tapaba 2D, Satelite y 3D y el auditor decia "sin
// problemas". Aqui se comparan las cajas enteras.
function overlap(a,b){
 if(!a||!b)return null;
 const x=Math.min(a.right,b.right)-Math.max(a.left,b.left);
 const y=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
 return x>MIN&&y>MIN?{x:Math.round(x),y:Math.round(y)}:null;
}
// Tapar una advertencia o unos botones es grave; dos paneles de datos rozandose, no tanto.
const TAPAR_ES_GRAVE=['aviso','mando'];
// list: [{name, rect, z, kind}] en orden del documento.
function panels(list){
 const p=(Array.isArray(list)?list:[]).filter(x=>x&&big(x.rect));
 const out=[];
 for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++){
  const o=overlap(p[i].rect,p[j].rect);
  if(!o)continue;
  const za=Number(p[i].z)||0,zb=Number(p[j].z)||0;
  // A igual z manda el orden del documento: pinta encima el ultimo.
  const arriba=za===zb?j:(za>zb?i:j);
  const abajo=arriba===i?j:i;
  out.push({q:'tapado por otro panel',name:p[abajo].name,por:p[arriba].name,
            solape:o,grave:TAPAR_ES_GRAVE.indexOf(p[abajo].kind)>=0});
 }
 return out;
}

function report(items,extra){
 const lista=Array.isArray(items)?items:[];
 const malos=[],avisos=[];
 for(const it of lista){
  const m=judge(it);
  if(!m)continue;
  (m.grave?malos:avisos).push(m);
 }
 const o=extra||{};
 for(const m of panels(o.panels))(m.grave?malos:avisos).push(m);
 if(o.overflowX)malos.push({q:'la página se desplaza de lado',name:'documento',grave:true});
 return {malos,avisos,revisados:lista.length,limpio:malos.length===0};
}

function line(m){
 if(m.q==='tapado por otro panel')
  return m.name+' — tapado por '+m.por+' ('+m.solape.x+'×'+m.solape.y+' px)';
 return m.q==='tapado'?m.name+' — tapado por '+m.por:m.name+' — '+m.q;
}
function headline(r){
 if(!r)return '';
 const sueltos=(r.avisos||[]).length;
 const cola=sueltos?' · '+sueltos+(sueltos===1?' se destapa bajando':' se destapan bajando'):'';
 if(r.limpio)return 'Sin problemas: '+r.revisados+' controles revisados.'+cola;
 return r.malos.length+(r.malos.length===1?' problema':' problemas')+' en '+r.revisados+' controles.'+cola;
}

const api={judge,report,line,headline,big,inside,centre,overlap,panels,MIN};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RutasLayoutAuditCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
