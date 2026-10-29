/* Silnik paneli demonstracyjnych: układ, nawigacja, wykresy, kanban, kalendarz, szuflada, paleta poleceń.
   Każdy panel woła Panel.mount(config) ze swoimi danymi i widokami. */
(()=>{
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const shot=new URLSearchParams(location.search).has('shot');

const P='fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
const I={
  home:'<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  cal:'<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 6.5 8.5 6 8.5-6"/>',
  zap:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  file:'<path d="M6 2.5h8l4.5 4.5V21a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5zM14 2.5V7h4.5M9 13h6M9 17h4"/>',
  set:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  bell:'<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  phone:'<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2"/>',
  msg:'<path d="M21 12a8 8 0 0 1-11.8 7L3 21l2-6A8 8 0 1 1 21 12z"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  star:'<path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1 6.3L12 17.5 6.5 20.4l1-6.3L3 9.7l6.2-.9z"/>',
  wallet:'<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M3 10h18M16 15h2M6 6l9-3 1 3"/>',
  inbox:'<path d="M3 13h5l1.5 3h5L16 13h5M5.5 5h13L21 13v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z"/>',
  send:'<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>',
  archive:'<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  map:'<path d="M9 4 3 6.5v13.5L9 17.5l6 2.5 6-2.5V4l-6 2.5zM9 4v13.5M15 6.5V20"/>',
  truck:'<path d="M2 6h12v10H2zM14 9h4l4 4v3h-8M6.5 19.5a2 2 0 1 0 0-.1M17.5 19.5a2 2 0 1 0 0-.1"/>',
  sparkle:'<path d="M12 3c.5 4 2 5.5 6 6-4 .5-5.5 2-6 6-.5-4-2-5.5-6-6 4-.5 5.5-2 6-6zM19 15c.2 1.6.9 2.3 2.5 2.5-1.6.2-2.3.9-2.5 2.5-.2-1.6-.9-2.3-2.5-2.5 1.6-.2 2.3-.9 2.5-2.5z"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  filter:'<path d="M3 5h18l-7 8.5V20l-4-2v-4.5z"/>',
  heart:'<path d="M12 20s-8-4.6-8-10.4A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8 2.6C20 15.4 12 20 12 20z"/>',
  bolt:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  layers:'<path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5"/>',
  tool:'<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  euro:'<path d="M18 6.5A7 7 0 1 0 18 17.5M4 10.5h10M4 13.5h10"/>',
  eye:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
};
const icon=(n,cls='')=>`<svg class="${cls}" viewBox="0 0 24 24" ${P} aria-hidden="true">${I[n]||''}</svg>`;

const palette=['#0f766e','#7c3aed','#db2777','#ea580c','#2563eb','#059669','#ca8a04','#475569','#be123c','#0891b2'];
const initials=n=>n.split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
const colorOf=n=>palette[[...n].reduce((a,c)=>a+c.charCodeAt(0),0)%palette.length];
const avatar=(n,cls='')=>`<span class="avatar ${cls}" style="background:${colorOf(n)}" title="${esc(n)}">${initials(n)}</span>`;
const pln=(v,d=0)=>v.toLocaleString('pl-PL',{minimumFractionDigits:d,maximumFractionDigits:d})+' zł';
const nf=v=>v.toLocaleString('pl-PL');
const pill=(t,k='')=>`<span class="pill ${k}"><i></i>${esc(t)}</span>`;

/* wykresy w SVG */
function path(pts){return pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ')}
function smooth(pts){
  if(pts.length<3)return path(pts);
  let d='M'+pts[0][0]+' '+pts[0][1];
  for(let i=0;i<pts.length-1;i++){
    const [x0,y0]=pts[i-1]||pts[i],[x1,y1]=pts[i],[x2,y2]=pts[i+1],[x3,y3]=pts[i+2]||pts[i+1];
    const c1x=x1+(x2-x0)/6,c1y=y1+(y2-y0)/6,c2x=x2-(x3-x1)/6,c2y=y2-(y3-y1)/6;
    d+=` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }
  return d;
}
function spark(data,color='var(--accent)'){
  const w=96,h=36,mx=Math.max(...data),mn=Math.min(...data);
  const pts=data.map((v,i)=>[i*w/(data.length-1),h-3-(v-mn)/(mx-mn||1)*(h-8)]);
  const id='g'+Math.random().toString(36).slice(2,8);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".25"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path d="${smooth(pts)} L${w} ${h} L0 ${h}Z" fill="url(#${id})"/><path d="${smooth(pts)}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/></svg>`;
}
function area({series,labels,h=240,fmt=nf,ticks=4}){
  const w=760,pl=44,pb=26,pt=10,iw=w-pl-8,ih=h-pb-pt;
  const mx=Math.max(...series.flatMap(s=>s.data))*1.12;
  const step=Math.pow(10,Math.floor(Math.log10(mx/ticks)));const t=Math.ceil(mx/ticks/step)*step;
  const top=t*ticks;
  let g='';
  for(let i=0;i<=ticks;i++){const y=pt+ih-i*ih/ticks;g+=`<line class="grid-line" x1="${pl}" x2="${w}" y1="${y}" y2="${y}"/><text x="${pl-10}" y="${y+4}" text-anchor="end">${fmt(i*t)}</text>`}
  const n=labels.length,xs=i=>pl+i*iw/(n-1);
  const every=Math.ceil(n/8);
  labels.forEach((l,i)=>{if(i%every===0||i===n-1)g+=`<text x="${xs(i)}" y="${h-6}" text-anchor="middle">${l}</text>`});
  series.forEach((s,k)=>{
    const pts=s.data.map((v,i)=>[xs(i),pt+ih-v/top*ih]);
    const id='a'+k+Math.random().toString(36).slice(2,7);
    g+=`<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.color}" stop-opacity="${s.fill===false?0:.22}"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></linearGradient></defs>`;
    g+=`<path d="${smooth(pts)} L${xs(n-1)} ${pt+ih} L${pl} ${pt+ih}Z" fill="url(#${id})"/>`;
    g+=`<path d="${smooth(pts)}" fill="none" stroke="${s.color}" stroke-width="${s.dash?1.6:2.2}" ${s.dash?'stroke-dasharray="4 4"':''} stroke-linecap="round" class="draw"/>`;
    if(!s.dash){const [lx,ly]=pts[n-1];g+=`<circle cx="${lx}" cy="${ly}" r="4.5" fill="var(--surface)" stroke="${s.color}" stroke-width="2.2"/>`}
  });
  return `<svg class="chart" viewBox="0 0 ${w} ${h}">${g}</svg>`;
}
function bars({groups,labels,h=220,fmt=nf,stacked=true}){
  const w=760,pl=44,pb=26,pt=10,iw=w-pl-8,ih=h-pb-pt,n=labels.length;
  const tot=labels.map((_,i)=>groups.reduce((a,g)=>a+g.data[i],0));
  const mx=(stacked?Math.max(...tot):Math.max(...groups.flatMap(g=>g.data)))*1.1;
  const step=Math.pow(10,Math.floor(Math.log10(mx/4)));const t=Math.ceil(mx/4/step)*step,top=t*4;
  let g='';
  for(let i=0;i<=4;i++){const y=pt+ih-i*ih/4;g+=`<line class="grid-line" x1="${pl}" x2="${w}" y1="${y}" y2="${y}"/><text x="${pl-10}" y="${y+4}" text-anchor="end">${fmt(i*t)}</text>`}
  const bw=iw/n,b=Math.min(28,bw*.56);
  labels.forEach((l,i)=>{
    const x=pl+i*bw+(bw-b)/2;let y=pt+ih;
    groups.forEach((gr,k)=>{const hh=gr.data[i]/top*ih;y-=hh;const last=k===groups.length-1;g+=`<rect x="${x}" y="${y}" width="${b}" height="${Math.max(0,hh-(last?0:1.5))}" rx="${last?5:2}" fill="${gr.color}"><animate attributeName="height" from="0" to="${Math.max(0,hh-(last?0:1.5))}" dur=".7s" fill="freeze"/><animate attributeName="y" from="${pt+ih}" to="${y}" dur=".7s" fill="freeze"/></rect>`});
    g+=`<text x="${x+b/2}" y="${h-6}" text-anchor="middle">${l}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${w} ${h}">${g}</svg>`;
}
function donut({parts,size=170,label,sub}){
  const r=62,c=2*Math.PI*r,tot=parts.reduce((a,p)=>a+p.v,0);let off=0,g='';
  parts.forEach(p=>{const len=p.v/tot*c;g+=`<circle r="${r}" cx="85" cy="85" fill="none" stroke="${p.color}" stroke-width="18" stroke-dasharray="${Math.max(0,len-2)} ${c}" stroke-dashoffset="${-off}" transform="rotate(-90 85 85)"/>`;off+=len});
  return `<svg viewBox="0 0 170 170" width="${size}" height="${size}" style="flex:none"><circle r="${r}" cx="85" cy="85" fill="none" stroke="var(--line-2)" stroke-width="18"/>${g}<text x="85" y="82" text-anchor="middle" style="font-size:24px;font-weight:650;fill:var(--ink);letter-spacing:-.03em">${label}</text><text x="85" y="102" text-anchor="middle" style="font-size:11px;fill:var(--ink-3)">${sub}</text></svg>`;
}
function legend(items){return `<div class="legend">${items.map(i=>`<span><i style="background:${i.color}"></i>${esc(i.label)}</span>`).join('')}</div>`}
function barList(rows,fmt=nf){const mx=Math.max(...rows.map(r=>r.v));return rows.map((r,i)=>`<div class="bar-row"><span>${r.label}</span><div class="bar-track"><div class="bar-fill" style="width:${r.v/mx*100}%;animation-delay:${i*60}ms;${r.color?'background:'+r.color:''}"></div></div><span class="right num">${fmt(r.v)}</span></div>`).join('')}

function kpi({label,value,delta,down,ic,data,arrow,note='vs poprz. okres'}){
  return `<div class="card kpi"><div class="kpi-label">${icon(ic)}${label}</div><div class="kpi-row"><div><div class="kpi-value num">${value}</div><div class="delta ${down?'down':''}">${arrow||(down?'↓':'↑')} ${delta} <span>${note}</span></div></div>${data?spark(data,down?'var(--bad)':'var(--accent)'):''}</div></div>`;
}

/* kanban z przeciąganiem */
function kanban(el,{cols,cards,render,onMove,sum}){
  el.innerHTML=`<div class="board">${cols.map(c=>`<div class="col" data-col="${c.id}"><div class="col-head"><i style="background:${c.color}"></i>${c.label} <small data-cnt></small><span class="sum" data-sum></span></div><div class="col-body"></div></div>`).join('')}</div>`;
  function draw(){
    cols.forEach(c=>{
      const col=$(`[data-col="${c.id}"]`,el),list=cards.filter(k=>k.col===c.id);
      $('.col-body',col).innerHTML=list.map(k=>`<div class="kcard" draggable="true" data-id="${k.id}">${render(k)}</div>`).join('');
      $('[data-cnt]',col).textContent=list.length;
      if(sum)$('[data-sum]',col).textContent=sum(list);
    });
  }
  draw();
  let drag=null;
  el.addEventListener('dragstart',e=>{const k=e.target.closest('.kcard');if(!k)return;drag=k.dataset.id;k.classList.add('is-drag');e.dataTransfer.effectAllowed='move'});
  el.addEventListener('dragend',e=>{e.target.closest('.kcard')?.classList.remove('is-drag');$$('.col',el).forEach(c=>c.classList.remove('is-over'))});
  el.addEventListener('dragover',e=>{const c=e.target.closest('.col');if(!c)return;e.preventDefault();$$('.col',el).forEach(x=>x.classList.toggle('is-over',x===c))});
  el.addEventListener('drop',e=>{const c=e.target.closest('.col');if(!c||!drag)return;e.preventDefault();const k=cards.find(x=>String(x.id)===drag);const from=k.col;k.col=c.dataset.col;draw();if(from!==k.col&&onMove)onMove(k,cols.find(x=>x.id===k.col));drag=null});
  return {draw};
}

/* kalendarz tygodniowy: events = {day, start:'9:30', end:'10:15', title, sub, color} */
function week(el,{days,events,from=8,to=19,today,now,hh=56,onClick}){
  const toMin=t=>{const [h,m]=t.split(':').map(Number);return h*60+m};
  let html=`<div class="cal-wrap"><div class="cal" style="--days:${days.length};--hh:${hh}px"><div class="cal-head" style="border-right:0"></div>`;
  html+=days.map((d,i)=>`<div class="cal-head ${i===today?'today':''}">${d.name}<b>${d.num}</b></div>`).join('');
  html+=`<div class="cal-times">${Array.from({length:to-from},(_,i)=>`<span>${i?from+i+':00':''}</span>`).join('')}</div>`;
  days.forEach((d,i)=>{
    html+=`<div class="cal-day" style="height:${(to-from)*hh}px">`;
    const list=events.filter(e=>e.day===i).sort((a,b)=>toMin(a.start)-toMin(b.start)),ends=[];
    const ov=e=>list.some(o=>o!==e&&toMin(o.start)<toMin(e.end)&&toMin(e.start)<toMin(o.end));
    list.forEach(e=>{
      const top=(toMin(e.start)-from*60)/60*hh,height=Math.max(24,(toMin(e.end)-toMin(e.start))/60*hh-3);
      let l=ends.findIndex(t=>t<=toMin(e.start));if(l<0)l=ends.length;ends[l]=toMin(e.end);
      const lane=ov(e)?`left:calc(${Math.min(l,1)*50}% + ${l?2:4}px);right:auto;width:calc(50% - 6px);`:'';
      html+=`<div class="ev" data-ev="${events.indexOf(e)}" style="top:${top+1}px;height:${height}px;--evc:${e.color};${lane}"><b>${esc(e.title)}</b>${height>34?`<small>${e.start}–${e.end}${e.sub?' · '+esc(e.sub):''}</small>`:''}</div>`;
    });
    if(i===today&&now){const t=(toMin(now)-from*60)/60*hh;html+=`<div class="now-line" style="top:${t}px"></div>`}
    html+=`</div>`;
  });
  el.innerHTML=html+'</div></div>';
  if(onClick)el.addEventListener('click',e=>{const v=e.target.closest('.ev');if(v)onClick(events[v.dataset.ev])});
}

/* szuflada, toasty, paleta */
function drawer(html){$('.drawer-inner').innerHTML=html;$('.drawer').classList.add('is-on');$('.scrim').classList.add('is-on')}
function closeDrawer(){$('.drawer').classList.remove('is-on');$('.scrim').classList.remove('is-on');$('.palette').classList.remove('is-on');$('.pop').classList.remove('is-on')}
function toast(title,sub,ic='check'){
  if(shot)return;
  const t=document.createElement('div');t.className='toast';
  t.innerHTML=`<span class="ico accent">${icon(ic)}</span><div><b>${esc(title)}</b><small>${esc(sub)}</small></div>`;
  $('.toasts').append(t);setTimeout(()=>{t.style.transition='opacity .4s,transform .4s';t.style.opacity=0;t.style.transform='translateY(8px)';setTimeout(()=>t.remove(),400)},4200);
}

function mount(cfg){
  document.documentElement.dataset.theme=cfg.theme||'light';
  document.documentElement.style.setProperty('--accent',cfg.accent);
  if(cfg.accentInk)document.documentElement.style.setProperty('--accent-ink',cfg.accentInk);
  if(cfg.accentSoft)document.documentElement.style.setProperty('--accent-soft',cfg.accentSoft);
  if(shot)document.body.classList.add('shot');
  const navItems=cfg.nav.flatMap(g=>g.items);
  document.body.insertAdjacentHTML('afterbegin',`
  <div class="app">
    <aside class="side" aria-label="Menu panelu">
      <div class="ws"><span class="ws-logo">${cfg.brand.logo}</span><div><b>${cfg.brand.name}</b><small>${cfg.brand.sub}</small></div></div>
      ${cfg.nav.map(g=>`<div class="nav-group">${g.group?`<div class="nav-label">${g.group}</div>`:''}${g.items.map(n=>`<a class="nav-item" href="#/${n.id}" data-nav="${n.id}">${icon(n.icon)}${n.label}${n.count?`<span class="nav-count ${n.hot?'hot':''}">${n.count}</span>`:''}</a>`).join('')}</div>`).join('')}
      <div class="side-foot">${cfg.sideCard||''}<div class="me">${avatar(cfg.user.name)}<div><b>${cfg.user.name}</b><small>${cfg.user.role}</small></div></div></div>
    </aside>
    <div class="main">
      <div class="top">
        <button class="icon-btn menu-btn" aria-label="Menu">${icon('menu')}</button>
        <div class="crumbs">${cfg.brand.name} <span>/</span> <b data-crumb></b></div>
        <button class="search" data-palette>${icon('search')}Szukaj klientów, wizyt, maili…<span class="kbd">⌘K</span></button>
        <button class="icon-btn" data-bell aria-label="Powiadomienia">${icon('bell')}<span class="dot"></span></button>
        <button class="btn btn-primary hide-m" data-new>${icon('plus')}${cfg.newLabel||'Nowy'}</button>
      </div>
      <div class="view-host"></div>
    </div>
  </div>
  <div class="scrim"></div>
  <aside class="drawer" aria-label="Szczegóły"><div class="drawer-inner" style="display:contents"></div></aside>
  <div class="palette" role="dialog" aria-label="Szukaj"><input placeholder="Wpisz nazwisko, telefon albo komendę…"><ul></ul></div>
  <div class="pop" aria-label="Powiadomienia"><div class="card-head" style="padding-bottom:8px"><h3>Powiadomienia</h3><a class="link" href="#">Oznacz jako przeczytane</a></div><div class="list">${(cfg.notifications||[]).map(n=>`<div class="row"><span class="ico ${n.k||'accent'}">${icon(n.icon)}</span><div class="row-main"><b>${n.t}</b><small>${n.s}</small></div><span class="time">${n.time}</span></div>`).join('')}</div></div>
  <div class="toasts"></div>
  ${cfg.ribbon?`<div class="demo-ribbon">${cfg.ribbon}</div>`:''}`);

  const host=$('.view-host');
  function go(){
    const id=(location.hash.replace('#/','')||cfg.home).split('?')[0];
    const v=cfg.views[id]?id:cfg.home;
    $$('[data-nav]').forEach(a=>a.classList.toggle('is-on',a.dataset.nav===v));
    $('[data-crumb]').textContent=navItems.find(n=>n.id===v)?.label||'';
    host.innerHTML=`<div class="view" data-view="${v}"></div>`;
    const el=$('.view',host);
    const out=cfg.views[v](el);
    if(typeof out==='string')el.innerHTML=out;
    cfg.after?.[v]?.(el);
    document.body.classList.remove('nav-open');
    window.scrollTo(0,0);
  }
  addEventListener('hashchange',go);go();

  $('.scrim').addEventListener('click',closeDrawer);
  addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer();if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openPalette()}});
  document.addEventListener('click',e=>{const c=e.target.closest('[data-close]');if(c)closeDrawer()});
  $('.menu-btn').addEventListener('click',()=>document.body.classList.toggle('nav-open'));
  $('[data-bell]').addEventListener('click',e=>{e.stopPropagation();$('.pop').classList.toggle('is-on');$('[data-bell] .dot')?.remove()});
  document.addEventListener('click',e=>{if(!e.target.closest('.pop'))$('.pop').classList.remove('is-on')});
  $('[data-new]').addEventListener('click',()=>cfg.onNew?.());

  const pal=$('.palette'),pin=$('input',pal),pul=$('ul',pal);
  const entries=[...navItems.map(n=>({label:'Przejdź: '+n.label,ic:n.icon,go:'#/'+n.id,hint:'Widok'})),...(cfg.searchable||[])];
  function list(q=''){const f=entries.filter(e=>e.label.toLowerCase().includes(q.toLowerCase())).slice(0,9);pul.innerHTML=f.map((e,i)=>`<li><button class="${i?'':'is-on'}" data-go="${e.go}">${e.av?avatar(e.av,'sm'):`<span class="ico" style="width:26px;height:26px">${icon(e.ic||'arrow')}</span>`}${esc(e.label)}<small>${e.hint||''}</small></button></li>`).join('')||'<li class="empty">Brak wyników</li>'}
  function openPalette(){pal.classList.add('is-on');$('.scrim').classList.add('is-on');pin.value='';list();setTimeout(()=>pin.focus(),30)}
  $('[data-palette]').addEventListener('click',openPalette);
  pin.addEventListener('input',()=>list(pin.value));
  pin.addEventListener('keydown',e=>{if(e.key==='Enter'){$('button',pul)?.click()}});
  pul.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(!b)return;closeDrawer();location.hash=b.dataset.go.replace(/^#/,'');});

  if(!shot&&cfg.live){let i=0;setTimeout(function tick(){const l=cfg.live[i++%cfg.live.length];toast(l.t,l.s,l.ic);setTimeout(tick,16000)},6000)}
}

window.Panel={mount,icon,avatar,pill,pln,nf,esc,spark,area,bars,donut,legend,barList,kpi,kanban,week,drawer,closeDrawer,toast,colorOf,$,$$};
})();
