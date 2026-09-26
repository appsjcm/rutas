(()=>{
const paths={upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/>',route:'<path d="M5 17V7a3 3 0 0 1 6 0v10a3 3 0 0 0 6 0V7"/><circle cx="5" cy="19" r="2"/><circle cx="17" cy="5" r="2"/>',nav:'<path d="m12 3 8 18-8-5-8 5 8-18Z"/>',export:'<path d="M12 3v12m-5-5 5 5 5-5M4 15v5h16v-5"/>',map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16"/>',add:'<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8m-4-4h8"/>',settings:'<path d="M4 6h7m4 0h5M4 12h2m4 0h10M4 18h9m4 0h3"/><circle cx="13" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="15" cy="18" r="2"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3h.01"/>',play:'<path d="m8 5 11 7-11 7V5Z"/>',shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',resume:'<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7m2-5v6l4 2"/>'};
function icon(name){const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 24 24');s.setAttribute('class','ui-icon');s.setAttribute('aria-hidden','true');s.innerHTML=paths[name]||paths.route;return s;}
const brand=document.createElement('span');brand.className='brand-mark';brand.append(icon('route'));document.querySelector('h1').prepend(brand);
Object.entries({nav:'nav',exp:'export',conv:'map',make:'add',help:'help'}).forEach(([id,name])=>document.getElementById('tab-'+id).prepend(icon(name)));
const theme=document.createElement('label');theme.className='theme-control';theme.innerHTML='<select aria-label="Apariencia"><option value="auto">Automático</option><option value="light">Claro</option><option value="dark">Oscuro</option></select>';document.querySelector('.masthead').append(theme);const select=theme.querySelector('select'),media=matchMedia('(prefers-color-scheme: dark)');try{select.value=localStorage.getItem('rutas-theme')||'auto';}catch{}if(!select.value)select.value='auto';select.title='Automático: oscuro si el móvil está en oscuro o si es de noche donde estás, por la hora del sol calculada en el propio móvil';
// De noche -y la recogida suele serlo- oscuro aunque el movil este en claro: el mapa de dia
// deslumbra en la cabina. La hora del sol se calcula aqui, con la posicion del GPS o, sin ella,
// con el principio de la ruta; sin ninguna de las dos, con el centro de la peninsula.
function dondeEstoy(){try{const s=window.RutasMap&&window.RutasMap.get&&window.RutasMap.get(),l=s&&s.location;if(l&&Number.isFinite(l.lat)&&Number.isFinite(l.lng))return [l.lat,l.lng];const p=s&&s.route&&s.route.pts&&s.route.pts[0];if(p&&Number.isFinite(p.lat)&&Number.isFinite(p.lon))return [p.lat,p.lon];}catch{}return [40.4,-3.7];}
function deNoche(){const S=window.RutasSolCore;if(!S)return false;const [lat,lon]=dondeEstoy();return S.isNight(Date.now(),lat,lon);}
function apply(){document.documentElement.dataset.theme=select.value==='auto'?(media.matches||deNoche()?'dark':'light'):select.value;document.querySelector('meta[name="theme-color"]').content=document.documentElement.dataset.theme==='dark'?'#0c1420':'#f1f5f9';}select.onchange=()=>{apply();try{localStorage.setItem('rutas-theme',select.value);}catch{}};media.addEventListener('change',apply);apply();addEventListener('load',apply);setInterval(()=>{if(select.value==='auto')apply();},60000);
function fold(selector,title,name){const content=document.querySelector(selector);if(!content)return;const d=document.createElement('details');d.className='premium-fold';const s=document.createElement('summary');s.append(icon(name),document.createTextNode(title));content.before(d);d.append(s,content);}
fold('.nav-preview','Explorar y simular el recorrido','play');fold('.road-review','Revisar calles y restricciones','shield');fold('.resume-section','Continuar desde otra pasada','resume');
const track=document.getElementById('nav-track'),label=document.querySelector('label[for="nav-track"]'),row=document.createElement('div');row.className='route-selector';label.before(row);row.append(label,track);
const start=document.getElementById('nav-start');start.parentElement.classList.add('nav-actions');start.prepend(icon('nav'));document.getElementById('nav-stage').before(start.parentElement);
const upload=document.getElementById('nav-file').parentElement;upload.prepend(icon('upload'));document.getElementById('nav-fit').prepend(icon('map'));document.getElementById('nav-center').prepend(icon('nav'));

const tabs=[...document.querySelectorAll('[role=tab]')].filter(t=>!t.hidden);tabs.forEach((t,i)=>t.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();tabs[next].click();tabs[next].focus();}}));

// En móvil, las herramientas largas se leen como un menú: una tarjeta abierta cada vez.
// En escritorio las mismas tarjetas siguen visibles en sus dos columnas.
for(const selector of ['#p-exp','#p-make']){
 const panels=[...document.querySelectorAll(selector+' .panel')];
 panels.forEach((panel,index)=>{
  const head=panel.querySelector(':scope > .panel-hd'),title=head?.querySelector('h2');if(!head||!title)return;
  panel.classList.add('mobile-fold');panel.classList.toggle('mobile-collapsed',index>0);
  const toggle=document.createElement('button');toggle.type='button';toggle.className='mobile-panel-toggle';toggle.setAttribute('aria-expanded',String(index===0));toggle.setAttribute('aria-label',(index?'Abrir ':'Cerrar ')+title.textContent);toggle.textContent='⌄';
  toggle.onclick=()=>{const opening=panel.classList.contains('mobile-collapsed');if(opening)for(const other of panels){if(other===panel)continue;other.classList.add('mobile-collapsed');const button=other.querySelector('.mobile-panel-toggle');if(button){button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Abrir '+other.querySelector('.panel-hd h2')?.textContent);}}panel.classList.toggle('mobile-collapsed',!opening);toggle.setAttribute('aria-expanded',String(opening));toggle.setAttribute('aria-label',(opening?'Cerrar ':'Abrir ')+title.textContent);if(opening&&matchMedia('(max-width:700px)').matches)setTimeout(()=>panel.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}),20);};
  head.append(toggle);
 });
}

// Route overview and secondary tools keep the main screen focused on departure.
const body=document.querySelector('.nav-shell>.panel-bd');
const hero=document.createElement('section');hero.className='route-overview';hero.setAttribute('aria-label','Resumen de la ruta');
hero.innerHTML='<div class="route-overview-top"><span class="route-eyebrow">TU PRÓXIMO RECORRIDO</span><span class="route-private">Solo en tu dispositivo</span></div><h2></h2><p></p><div class="route-facts"></div>';
body.prepend(hero);
let homeTitle=null,homeMeta=null,settingsLabel=null;
function prettyName(name){return String(name||'Mi recorrido').replace(/\.gpx$/i,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();}
// Lo que se quiere saber de un vistazo antes de salir: cuantas paradas y cuanto dura la ronda,
// segun las horas del GPX. Sin horas no hay ni lo uno ni lo otro y se queda como estaba.
function resumenRonda(data){try{const N=window.RutasNav;if(!N||!Array.isArray(data.pts)||data.pts.length<2)return '';const n=N.stops(N.prepare(data.pts)).length,t0=Date.parse(data.pts[0]?.time),t1=Date.parse(data.pts.at(-1)?.time),seg=Number.isFinite(t0)&&Number.isFinite(t1)?Math.abs(t1-t0)/1000:NaN,partes=[];if(n)partes.push(n+(n===1?' parada':' paradas'));if(seg>=60&&seg<2*86400){const m=Math.round(seg/60);partes.push(m<60?m+' min':Math.floor(m/60)+' h '+String(m%60).padStart(2,'0')+' min');}return partes.length?' · '+partes.join(' · '):'';}catch(e){return '';}}
function overview(){const data=window.Roadbook.getRoute(),title=data.sample?'Ruta de ejemplo':prettyName(data.name);hero.classList.toggle('has-route',!data.sample);hero.querySelector('h2').textContent=data.sample?'Cada calle, a tu ritmo.':title;hero.querySelector('p').textContent=data.sample?'Carga una ruta para empezar. Mientras tanto, explora el recorrido de ejemplo.':'Tu recorrido está preparado. Revisa los detalles y sal cuando quieras.';hero.querySelector('.route-private').textContent=data.sample?'Vista de ejemplo':'Solo en tu dispositivo';const route=window.RutasNavCore?window.RutasNavCore.prepare(data.pts):window.RutasMap?.get().route;const facts=hero.querySelector('.route-facts');facts.replaceChildren();if(route){const length=document.createElement('span');length.textContent=(route.total/1000).toLocaleString('es-ES',{maximumFractionDigits:1})+' km';length.prepend(icon('route'));facts.append(length);if(homeMeta)homeMeta.textContent=length.textContent+(data.sample?' · ejemplo':(resumenRonda(data)||' · lista para navegar'));}if(homeTitle)homeTitle.textContent=title;if(settingsLabel)settingsLabel.textContent=data.sample?'Cargar ruta':'Ruta y ajustes';const segment=document.createElement('span');segment.textContent=data.tracks.length===1?'1 segmento':data.tracks.length+' opciones de traza';segment.prepend(icon('map'));facts.append(segment);row.hidden=data.tracks.length<2;document.getElementById('nav-name').hidden=true;}
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

// La pantalla principal queda dedicada al mapa. El resto sigue disponible en un único panel.
function cleanNavigation(){
 const panel=document.querySelector('.nav-shell'),body=panel.querySelector('.panel-bd'),stage=document.getElementById('nav-stage'),actions=document.querySelector('.nav-actions'),message=document.getElementById('nav-message'),arrival=document.getElementById('arrival-card');
 if(!stage||!actions||body.classList.contains('nav-clean'))return;body.classList.add('nav-clean');panel.classList.add('nav-clean-shell');
 const home=document.createElement('section');home.className='nav-homebar';home.innerHTML='<div><small>RECORRIDO ACTUAL</small><h3></h3><p></p></div><button type="button" class="btn" id="nav-settings-open"></button>';homeTitle=home.querySelector('h3');homeMeta=home.querySelector('p');const open=home.querySelector('button');open.append(icon('settings'),document.createElement('span'));settingsLabel=open.querySelector('span');
 const settings=document.createElement('details');settings.className='premium-fold route-settings';const summary=document.createElement('summary');summary.append(icon('settings'),document.createTextNode('Ruta y ajustes'));const content=document.createElement('div');content.className='route-settings-body';const settingsHead=document.createElement('header');settingsHead.className='route-settings-header';settingsHead.innerHTML='<div><small>CONFIGURACIÓN</small><h3>Ruta y ajustes</h3></div><button type="button" class="btn sm">Cerrar</button>';content.append(settingsHead);settings.append(summary,content);
 const voice=actions.querySelector('.switch');if(voice){const preference=document.createElement('div');preference.className='route-setting-line';preference.append(voice);content.append(preference);}
 const fixed=new Set([stage,actions,message,arrival]);for(const node of [...body.children])if(!fixed.has(node))content.append(node);
 body.replaceChildren(home);if(arrival)body.append(arrival);body.append(stage,actions,message,settings);
 const motion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',mobile=matchMedia('(max-width:700px)');
 const bodyLock=()=>document.body.classList.toggle('route-settings-open',settings.open&&mobile.matches);
 const openSettings=()=>{settings.open=true;bodyLock();if(!mobile.matches)settings.scrollIntoView({behavior:motion(),block:'start'});settingsHead.querySelector('button').focus({preventScroll:true});};
 const closeSettings=(returnFocus=true)=>{settings.open=false;bodyLock();if(!mobile.matches)home.scrollIntoView({behavior:motion(),block:'start'});if(returnFocus)open.focus({preventScroll:true});};
 open.onclick=openSettings;settingsHead.querySelector('button').onclick=()=>closeSettings();
 settings.addEventListener('toggle',bodyLock);settings.addEventListener('click',e=>{if(e.target===settings)closeSettings();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&settings.open)closeSettings();});
 mobile.addEventListener('change',bodyLock);tabs.forEach(t=>t.addEventListener('click',()=>{if(t.id!=='tab-nav'&&settings.open)closeSettings(false);}));
 overview();setTimeout(()=>window.dispatchEvent(new Event('rutas:visible')),50);
}
addEventListener('load',cleanNavigation,{once:true});

})();
