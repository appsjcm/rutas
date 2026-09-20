(()=>{
const paths={upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/>',route:'<path d="M5 17V7a3 3 0 0 1 6 0v10a3 3 0 0 0 6 0V7"/><circle cx="5" cy="19" r="2"/><circle cx="17" cy="5" r="2"/>',nav:'<path d="m12 3 8 18-8-5-8 5 8-18Z"/>',export:'<path d="M12 3v12m-5-5 5 5 5-5M4 15v5h16v-5"/>',map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16"/>',add:'<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8m-4-4h8"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3h.01"/>',play:'<path d="m8 5 11 7-11 7V5Z"/>',shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',resume:'<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7m2-5v6l4 2"/>'};
function icon(name){const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 24 24');s.setAttribute('class','ui-icon');s.setAttribute('aria-hidden','true');s.innerHTML=paths[name]||paths.route;return s;}
const brand=document.createElement('span');brand.className='brand-mark';brand.append(icon('route'));document.querySelector('h1').prepend(brand);
Object.entries({nav:'nav',exp:'export',conv:'map',make:'add',help:'help'}).forEach(([id,name])=>document.getElementById('tab-'+id).prepend(icon(name)));
const theme=document.createElement('label');theme.className='theme-control';theme.innerHTML='<select aria-label="Apariencia"><option value="auto">Sistema</option><option value="light">Claro</option><option value="dark">Oscuro</option></select>';document.querySelector('.masthead').append(theme);const select=theme.querySelector('select'),media=matchMedia('(prefers-color-scheme: dark)');try{select.value=localStorage.getItem('rutas-theme')||'auto';}catch{}if(!select.value)select.value='auto';function apply(){document.documentElement.dataset.theme=select.value==='auto'?(media.matches?'dark':'light'):select.value;document.querySelector('meta[name="theme-color"]').content=document.documentElement.dataset.theme==='dark'?'#0c1420':'#f1f5f9';}select.onchange=()=>{apply();try{localStorage.setItem('rutas-theme',select.value);}catch{}};media.addEventListener('change',apply);apply();
function fold(selector,title,name){const content=document.querySelector(selector);if(!content)return;const d=document.createElement('details');d.className='premium-fold';const s=document.createElement('summary');s.append(icon(name),document.createTextNode(title));content.before(d);d.append(s,content);}
fold('.nav-preview','Explorar y simular el recorrido','play');fold('.road-review','Revisar calles y restricciones','shield');fold('.resume-section','Continuar desde otra pasada','resume');
const track=document.getElementById('nav-track'),label=document.querySelector('label[for="nav-track"]'),row=document.createElement('div');row.className='route-selector';label.before(row);row.append(label,track);
const start=document.getElementById('nav-start');start.parentElement.classList.add('nav-actions');start.prepend(icon('nav'));document.getElementById('nav-stage').before(start.parentElement);
const upload=document.getElementById('nav-file').parentElement;upload.prepend(icon('upload'));document.getElementById('nav-fit').prepend(icon('map'));document.getElementById('nav-center').prepend(icon('nav'));

const tabs=[...document.querySelectorAll('[role=tab]')];tabs.forEach((t,i)=>t.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();tabs[next].click();tabs[next].focus();}}));

// Route overview and secondary tools keep the main screen focused on departure.
const body=document.querySelector('.nav-shell>.panel-bd');
const hero=document.createElement('section');hero.className='route-overview';hero.setAttribute('aria-label','Resumen de la ruta');
hero.innerHTML='<div class="route-overview-top"><span class="route-eyebrow">TU PRÓXIMO RECORRIDO</span><span class="route-private">Solo en tu dispositivo</span></div><h2></h2><p></p><div class="route-facts"></div>';
body.prepend(hero);
function prettyName(name){return String(name||'Mi recorrido').replace(/\.gpx$/i,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();}
function overview(){const data=window.Roadbook.getRoute();hero.classList.toggle('has-route',!data.sample);hero.querySelector('h2').textContent=data.sample?'Cada calle, a tu ritmo.':prettyName(data.name);hero.querySelector('p').textContent=data.sample?'Carga una ruta para empezar. Mientras tanto, explora el recorrido de ejemplo.':'Tu recorrido está preparado. Revisa los detalles y sal cuando quieras.';hero.querySelector('.route-private').textContent=data.sample?'Vista de ejemplo':'Solo en tu dispositivo';const route=window.RutasNavCore?window.RutasNavCore.prepare(data.pts):window.RutasMap?.get().route;const facts=hero.querySelector('.route-facts');facts.replaceChildren();if(route){const length=document.createElement('span');length.textContent=(route.total/1000).toLocaleString('es-ES',{maximumFractionDigits:1})+' km';length.prepend(icon('route'));facts.append(length);}const segment=document.createElement('span');segment.textContent=data.tracks.length===1?'1 segmento':data.tracks.length+' opciones de traza';segment.prepend(icon('map'));facts.append(segment);row.hidden=data.tracks.length<2;document.getElementById('nav-name').hidden=true;}
window.addEventListener('rutas:check-route',overview);overview();
const fileTools=document.createElement('section');fileTools.className='route-files';document.getElementById('nav-local').before(fileTools);
['nav-share','share-box','nav-local','nav-forget'].forEach(id=>fileTools.append(document.getElementById(id)));
fold('.route-files','Compartir y gestionar la ruta','export');
const storageSummary=fileTools.parentElement.querySelector('summary');storageSummary.id='route-files-summary';
// All file pickers are also usable without a mouse.
document.querySelectorAll('label.btn:has(input[type=file])').forEach(label=>{label.tabIndex=0;label.setAttribute('role','button');label.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();label.querySelector('input').click();}});});
const roadFold=document.querySelector('.road-review').parentElement;const reviewBadge=document.createElement('span');reviewBadge.className='review-count';roadFold.querySelector('summary').append(reviewBadge);
function reviewCount(){const count=document.querySelectorAll('#road-issues li:not(.road-done)').length;reviewBadge.hidden=!count;reviewBadge.textContent=count+' por revisar';}
new MutationObserver(reviewCount).observe(document.getElementById('road-issues'),{childList:true,subtree:true,attributes:true,attributeFilter:['class']});reviewCount();
// Roving focus keeps the tab bar a single keyboard stop.
function tabFocus(){tabs.forEach(t=>t.tabIndex=t.getAttribute('aria-selected')==='true'?0:-1);}
new MutationObserver(tabFocus).observe(document.querySelector('.tabs'),{subtree:true,attributes:true,attributeFilter:['aria-selected']});tabFocus();

})();
