(function(root){
'use strict';
// Sobre el mapa pueden coincidir el aviso de sentidos, el que marco el conductor y la
// tarjeta de desvio. Apilarlos no cabe: con la cabecera, la hoja de datos y los mandos no
// hay sitio en un telefono, y al volante tampoco se atienden tres cosas a la vez. Se enseña
// la mas urgente y las demas esperan; ninguna se pierde, porque todas se vuelven a evaluar
// en cada actualizacion de la posicion.

// De mas urgente a menos: si te has salido, lo demas ya no es lo que toca decidir.
const ORDER=['route-recovery','nav-road-alert','mark-alert'];

function choose(items,order){
 const prioridad=Array.isArray(order)&&order.length?order:ORDER;
 const vivos=new Map();
 for(const it of Array.isArray(items)?items:[])if(it&&it.visible)vivos.set(it.id,it);
 for(const id of prioridad)if(vivos.has(id))return id;
 return null;
}

// Debajo de lo que ya ocupa la parte de arriba, con un respiro.
function topUnder(bottoms,gap){
 const hueco=Number.isFinite(gap)?gap:10;
 let y=0;
 for(const b of Array.isArray(bottoms)?bottoms:[])if(Number.isFinite(b)&&b>y)y=b;
 return Math.round(y+hueco);
}

// Si aun asi llegase a los mandos, se sube; nunca por encima de la cabecera.
function fit(top,height,limit,min){
 const t=Number(top)||0,h=Number(height)||0;
 const suelo=Number.isFinite(min)?min:0;
 if(!Number.isFinite(limit)||t+h<=limit)return Math.round(t);
 return Math.round(Math.max(suelo,limit-h));
}

const api={choose,topUnder,fit,ORDER};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RutasOverlayCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
