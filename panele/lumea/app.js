/* Lumea Clinic: fikcyjna klinika fizjoterapii i medycyny estetycznej. Wszystkie dane są przykładowe. */
(()=>{
const {icon,avatar,pill,pln,nf,esc,kpi,area,bars,donut,legend,barList,kanban,week,drawer,toast,$,$$}=Panel;

const staff=[
  {id:'aw',name:'dr Anna Wrona',role:'Medycyna estetyczna',color:'#0f766e'},
  {id:'pm',name:'Paweł Mazur',role:'Fizjoterapia',color:'#2563eb'},
  {id:'ok',name:'Ola Kaczmarek',role:'Kosmetologia',color:'#db2777'},
  {id:'ks',name:'Kamil Sowa',role:'Fizjoterapia sportowa',color:'#ca8a04'},
];
const S=Object.fromEntries(staff.map(s=>[s.id,s]));

const patients=[
  {name:'Katarzyna Nowicka',phone:'+48 512 *** 214',mail:'k.nowicka@…',svc:'Mezoterapia igłowa',who:'aw',visits:9,ltv:6840,last:'21 paź',next:'30 paź, 10:00',status:'Aktywny',src:'Instagram',tags:['VIP','Pakiet 6x']},
  {name:'Tomasz Wilk',phone:'+48 603 *** 908',mail:'t.wilk@…',svc:'Terapia manualna',who:'pm',visits:14,ltv:3920,last:'27 paź',next:'29 paź, 16:30',status:'Aktywny',src:'Google',tags:['Kręgosłup']},
  {name:'Magdalena Sikora',phone:'+48 698 *** 311',mail:'m.sikora@…',svc:'Peeling kawitacyjny',who:'ok',visits:4,ltv:1180,last:'14 paź',next:'—',status:'Do przypomnienia',src:'Meta Ads',tags:['Nowa']},
  {name:'Jakub Dąbrowski',phone:'+48 501 *** 772',mail:'j.dabrowski@…',svc:'Rehabilitacja kolana',who:'ks',visits:11,ltv:2860,last:'26 paź',next:'28 paź, 15:00',status:'Aktywny',src:'Polecenie',tags:['Po operacji','Sport']},
  {name:'Ewa Zając',phone:'+48 667 *** 045',mail:'e.zajac@…',svc:'Kwas hialuronowy',who:'aw',visits:6,ltv:7450,last:'9 paź',next:'4 lis, 12:00',status:'Aktywny',src:'Instagram',tags:['VIP']},
  {name:'Michał Król',phone:'+48 790 *** 133',mail:'m.krol@…',svc:'Fala uderzeniowa',who:'pm',visits:3,ltv:540,last:'2 wrz',next:'—',status:'Uśpiony',src:'Google',tags:[]},
  {name:'Natalia Pawlak',phone:'+48 535 *** 620',mail:'n.pawlak@…',svc:'Laseroterapia',who:'ok',visits:7,ltv:2310,last:'24 paź',next:'31 paź, 9:00',status:'Aktywny',src:'Meta Ads',tags:['Pakiet 6x']},
  {name:'Piotr Grabowski',phone:'+48 609 *** 457',mail:'p.grabowski@…',svc:'Masaż sportowy',who:'ks',visits:2,ltv:360,last:'19 paź',next:'—',status:'Do przypomnienia',src:'Booksy',tags:['Nowy']},
  {name:'Agnieszka Lewandowska',phone:'+48 724 *** 589',mail:'a.lewandowska@…',svc:'Toksyna botulinowa',who:'aw',visits:5,ltv:4980,last:'16 paź',next:'13 lis, 11:30',status:'Aktywny',src:'Polecenie',tags:['VIP']},
  {name:'Bartosz Kamiński',phone:'+48 518 *** 266',mail:'b.kaminski@…',svc:'Terapia manualna',who:'pm',visits:8,ltv:2240,last:'22 paź',next:'2 lis, 8:30',status:'Aktywny',src:'Google',tags:['Barki']},
];
const P=Object.fromEntries(patients.map(p=>[p.name,p]));

const days=[{name:'Pon',num:26},{name:'Wt',num:27},{name:'Śr',num:28},{name:'Czw',num:29},{name:'Pt',num:30},{name:'Sob',num:31}];
const ev=(day,start,end,title,who,sub,lane)=>({day,start,end,title,who,sub:sub||S[who].role,color:S[who].color,lane});
const events=[
  ev(0,'8:00','9:00','Bartosz Kamiński','pm','Terapia manualna',0),ev(0,'9:00','10:00','Ewa Zając','aw','Konsultacja',1),ev(0,'10:30','11:30','Natalia Pawlak','ok','Laseroterapia',0),ev(0,'12:00','13:00','Jakub Dąbrowski','ks','Rehabilitacja',1),ev(0,'14:00','15:30','Katarzyna Nowicka','aw','Mezoterapia',0),ev(0,'16:00','17:00','Tomasz Wilk','pm','',1),
  ev(1,'8:30','9:30','Michał Król','pm','Fala uderzeniowa',0),ev(1,'9:30','11:00','Agnieszka Lewandowska','aw','Toksyna botulinowa',1),ev(1,'11:30','12:30','Piotr Grabowski','ks','Masaż sportowy',0),ev(1,'13:00','14:00','Magdalena Sikora','ok','Peeling kawitacyjny',1),ev(1,'15:00','16:00','Tomasz Wilk','pm','Terapia manualna',0),ev(1,'16:30','18:00','Szkolenie zespołu','aw','Sala konferencyjna',1),
  ev(2,'8:00','9:00','Natalia Pawlak','ok','Laseroterapia',0),ev(2,'9:00','10:30','Ewa Zając','aw','Kwas hialuronowy',1),ev(2,'10:30','11:30','Bartosz Kamiński','pm','Terapia manualna',0),ev(2,'11:00','12:00','Konsultacja online','aw','Google Meet',1),ev(2,'12:30','13:30','Agnieszka Lewandowska','ok','Oczyszczanie',0),ev(2,'15:00','16:00','Jakub Dąbrowski','ks','Rehabilitacja kolana',1),ev(2,'16:00','17:00','Piotr Grabowski','ks','Masaż sportowy',0),
  ev(3,'8:00','9:30','Katarzyna Nowicka','aw','Mezoterapia',0),ev(3,'10:00','11:00','Michał Król','pm','',1),ev(3,'11:30','12:30','Magdalena Sikora','ok','Peeling',0),ev(3,'13:00','14:00','Jakub Dąbrowski','ks','',1),ev(3,'16:30','17:30','Tomasz Wilk','pm','Terapia manualna',0),
  ev(4,'9:00','10:00','Natalia Pawlak','ok','Laseroterapia',0),ev(4,'10:00','11:30','Katarzyna Nowicka','aw','Mezoterapia igłowa',1),ev(4,'12:00','13:00','Bartosz Kamiński','pm','',0),ev(4,'14:00','15:00','Ewa Zając','aw','Kontrola',1),ev(4,'15:30','16:30','Piotr Grabowski','ks','',0),
  ev(5,'9:00','10:30','Dzień otwarty','ok','Zabiegi pokazowe',0),ev(5,'10:30','12:00','Agnieszka Lewandowska','aw','Konsultacja',1),
];

const leads=[
  {id:1,col:'new',name:'Julia Wójcik',svc:'Konsultacja: kwas hialuronowy',src:'Meta Ads',val:1200,ago:'4 min'},
  {id:2,col:'new',name:'Krzysztof Baran',svc:'Ból kręgosłupa lędźwiowego',src:'Google',val:900,ago:'38 min'},
  {id:3,col:'new',name:'Oliwia Szymańska',svc:'Pakiet laseroterapii',src:'Instagram',val:2400,ago:'1 godz.'},
  {id:4,col:'contact',name:'Marek Jasiński',svc:'Rehabilitacja barku',src:'Formularz',val:1500,ago:'wczoraj'},
  {id:5,col:'contact',name:'Paulina Mazur',svc:'Mezoterapia igłowa',src:'Meta Ads',val:1800,ago:'wczoraj'},
  {id:6,col:'booked',name:'Dawid Kowalczyk',svc:'Fala uderzeniowa ×5',src:'Google',val:1100,ago:'2 dni'},
  {id:7,col:'booked',name:'Zuzanna Kubiak',svc:'Konsultacja estetyczna',src:'Polecenie',val:3200,ago:'2 dni'},
  {id:8,col:'booked',name:'Adam Lis',svc:'Masaż sportowy ×4',src:'Booksy',val:720,ago:'3 dni'},
  {id:9,col:'won',name:'Monika Witkowska',svc:'Pakiet 6x mezoterapia',src:'Meta Ads',val:4200,ago:'3 dni'},
  {id:10,col:'won',name:'Rafał Walczak',svc:'Terapia manualna ×8',src:'Google',val:1760,ago:'5 dni'},
  {id:11,col:'lost',name:'Sylwia Górska',svc:'Toksyna botulinowa',src:'Instagram',val:1300,ago:'6 dni'},
];
const cols=[{id:'new',label:'Nowe',color:'#2563eb'},{id:'contact',label:'W kontakcie',color:'#ca8a04'},{id:'booked',label:'Umówiona konsultacja',color:'#7c3aed'},{id:'won',label:'Pacjent',color:'#0f766e'},{id:'lost',label:'Utracone',color:'#9aa6b2'}];
const srcColor={'Meta Ads':'#1877f2','Google':'#ea4335','Instagram':'#d6249f','Formularz':'#475569','Polecenie':'#0f766e','Booksy':'#111'};
const srcMark={'Meta Ads':'f','Google':'G','Instagram':'ig','Formularz':'@','Polecenie':'★','Booksy':'b'};
const src=s=>`<span class="src"><b style="background:${srcColor[s]}">${srcMark[s]}</b>${s}</span>`;

const mails=[
  {from:'Julia Wójcik',subj:'Pytanie o konsultację przed zabiegiem',prev:'Dzień dobry, zobaczyłam Państwa reklamę i chciałabym zapytać, czy przed…',time:'11:32',unread:true,tags:[['Lead','info'],['Meta Ads','']],body:'Dzień dobry,\n\nzobaczyłam Państwa reklamę na Instagramie i chciałabym zapytać, czy przed zabiegiem z kwasem hialuronowym jest potrzebna osobna konsultacja? I czy da się ją umówić w tym tygodniu po 16:00?\n\nPozdrawiam,\nJulia Wójcik',ai:'Konsultacja jest wymagana i trwa 30 minut (150 zł, odliczane od ceny zabiegu). Wolne terminy po 16:00: czwartek 29.10 o 17:30 z dr Anną Wroną oraz piątek 30.10 o 16:30.'},
  {from:'Tomasz Wilk',subj:'Re: Zmiana terminu wizyty',prev:'Czy mogę przesunąć czwartkową wizytę na późniejszą godzinę? Wypadło mi…',time:'10:05',unread:true,tags:[['Pacjent','accent']],body:'Dzień dobry,\n\nczy mogę przesunąć czwartkową wizytę na późniejszą godzinę? Wypadło mi spotkanie w pracy. Najlepiej po 17:00.\n\nDziękuję,\nTomasz',ai:'Paweł Mazur ma wolne okno w czwartek 29.10 o 17:30. Mogę przesunąć wizytę i wysłać nowe potwierdzenie SMS.'},
  {from:'Medica Hurt',subj:'Faktura FV/10/2026/1182',prev:'W załączeniu przesyłamy fakturę za dostawę preparatów z dnia 24.10…',time:'9:41',tags:[['Faktura','']],body:'Dzień dobry,\n\nw załączeniu przesyłamy fakturę za dostawę preparatów z dnia 24.10.2026. Termin płatności: 14 dni.\n\nZespół Medica Hurt'},
  {from:'Katarzyna Nowicka',subj:'Dziękuję za ostatni zabieg!',prev:'Efekt jest super, koleżanka też chciałaby się umówić. Czy mają Państwo…',time:'wczoraj',tags:[['Polecenie','ok']],body:'Dzień dobry,\n\nefekt jest super! Koleżanka też chciałaby się umówić. Czy mają Państwo jakiś rabat dla osób z polecenia?\n\nKasia'},
  {from:'Google Business',subj:'Nowa opinia ★★★★★',prev:'Natalia P. dodała opinię: „Profesjonalna obsługa, czysto i miło…”',time:'wczoraj',tags:[['Opinia','ok']],body:'Natalia P. dodała nową opinię o Lumea Clinic:\n\n★★★★★ „Profesjonalna obsługa, czysto i miło. Przypomnienie SMS dzień wcześniej bardzo się przydało.”'},
  {from:'Piotr Grabowski',subj:'Pakiet masaży — płatność',prev:'Czy pakiet można opłacić w ratach albo przelewem po pierwszej wizycie?',time:'pon',tags:[['Pacjent','accent']],body:'Dzień dobry,\n\nczy pakiet 4 masaży można opłacić przelewem po pierwszej wizycie?\n\nPiotr'},
];

const autos=[
  {on:true,name:'Przypomnienie o wizycie',desc:'SMS 24 h i 2 h przed wizytą',runs:'1 284',stat:'−64% nieobecności',ic:'clock'},
  {on:true,name:'Prośba o opinię Google',desc:'Mail 3 h po zabiegu',runs:'412',stat:'+186 opinii',ic:'star'},
  {on:true,name:'Nowy lead z reklamy',desc:'Meta / Google → CRM → mail powitalny',runs:'318',stat:'odpowiedź w 2 min',ic:'zap'},
  {on:true,name:'Powrót po serii zabiegów',desc:'Mail 30 dni po ostatniej wizycie',runs:'96',stat:'31% wraca',ic:'heart'},
  {on:false,name:'Urodziny pacjenta',desc:'Życzenia + kod −15%',runs:'58',stat:'wstrzymana',ic:'sparkle'},
];

if(Panel.empty)[patients,events,leads,mails].forEach(a=>a.length=0);
const visitsToday=events.filter(e=>e.day===2);

const views={
  pulpit:()=>`
    <div class="vhead"><div><h1>Dzień dobry, Marta</h1><p>${Panel.empty?'Środa, 28 października · brak wizyt na dziś':'Środa, 28 października · 7 wizyt dziś, 2 nowe zapytania czekają na odpowiedź'}</p></div>
      <div class="vhead-actions"><div class="seg"><button>7 dni</button><button class="is-on">30 dni</button><button>Rok</button></div><button class="btn">${icon('file')}Eksport</button></div></div>
    <div class="grid g4">
      ${kpi({label:'Przychód (30 dni)',value:pln(86420),delta:'12,4%',ic:'wallet',data:[40,44,41,48,52,50,55,58,57,63,66,71]})}
      ${kpi({label:'Wizyty (30 dni)',value:'412',delta:'8,1%',ic:'cal',data:[20,22,19,24,26,25,28,27,30,31,30,33]})}
      ${kpi({label:'Nowi pacjenci',value:'47',delta:'21%',ic:'users',data:[2,3,2,4,3,5,4,6,5,7,6,8]})}
      ${kpi({label:'Nieobecności',value:'2,1%',delta:'3,8 pp',arrow:'↓',ic:'clock',data:[9,8,8,7,6,5,5,4,3,3,2,2],note:'od startu SMS'})}
    </div>
    <div class="grid g-main mt">
      <div class="card"><div class="card-head"><div><h3>Przychód dzienny</h3><small>Październik vs wrzesień</small></div>${legend([{label:'Październik',color:'var(--accent)'},{label:'Wrzesień',color:'#b4b8bf'}])}</div>
        <div class="card-pad">${area({labels:Array.from({length:28},(_,i)=>i+1+'.10'),series:[{color:'#b4b8bf',dash:true,fill:false,data:[2100,2300,1900,2600,2800,1200,0,2400,2500,2700,2300,3000,1500,0,2600,2900,2700,3100,3300,1700,0,2800,3000,2900,3400,3200,1600,0].map(v=>v||900)},{color:'var(--accent)',data:[2400,2800,2300,3100,3300,1600,900,2900,3200,3000,3500,3700,1900,900,3300,3500,3400,3900,4100,2100,900,3600,3800,3500,4300,4000,2200,3700]}],fmt:v=>v>=1000?(v/1000)+' tys.':v})}</div></div>
      <div class="card"><div class="card-head"><h3>Dziś w gabinetach</h3><a class="link" href="#/kalendarz">Kalendarz →</a></div>
        <div class="list" style="padding-top:8px">${visitsToday.slice(0,6).map(e=>`<div class="row"><span class="time num" style="width:40px">${e.start}</span><span style="width:3px;align-self:stretch;border-radius:3px;background:${e.color}"></span><div class="row-main"><b>${esc(e.title)}</b><small>${esc(e.sub)} · ${S[e.who].name}</small></div>${e.start<'11:40'?pill('Odbyta','ok'):e.start<'12:00'?pill('Trwa','warn'):pill('Potwierdzona','accent')}</div>`).join('')}</div></div>
    </div>
    <div class="grid g3 mt">
      <div class="card"><div class="card-head"><h3>Skąd przychodzą pacjenci</h3><small>30 dni</small></div><div class="card-pad">${barList([{label:'Meta Ads',v:142,color:'#1877f2'},{label:'Google',v:118,color:'#ea4335'},{label:'Instagram',v:86,color:'#d6249f'},{label:'Polecenia',v:64,color:'var(--accent)'},{label:'Booksy',v:31,color:'#475569'}])}</div></div>
      <div class="card"><div class="card-head"><h3>Obłożenie specjalistów</h3><small>ten tydzień</small></div><div class="card-pad">${barList(staff.map((s,i)=>({label:s.name.replace('dr ',''),v:[94,88,79,72][i],color:s.color})),v=>v+'%')}</div></div>
      <div class="card"><div class="card-head"><h3>Automatyzacje dziś</h3><a class="link" href="#/automatyzacje">Zarządzaj →</a></div><div class="list" style="padding-top:6px">
        <div class="row"><span class="ico accent">${icon('msg')}</span><div class="row-main"><b>38 przypomnień SMS</b><small>36 potwierdzonych, 2 bez odpowiedzi</small></div></div>
        <div class="row"><span class="ico ok">${icon('star')}</span><div class="row-main"><b>9 próśb o opinię</b><small>4 nowe opinie ★★★★★</small></div></div>
        <div class="row"><span class="ico info">${icon('zap')}</span><div class="row-main"><b>5 leadów obsłużonych</b><small>średnio 2 min do pierwszej odpowiedzi</small></div></div>
        <div class="row"><span class="ico warn">${icon('phone')}</span><div class="row-main"><b>2 zadania: zadzwoń</b><small>brak potwierdzenia wizyty</small></div></div>
      </div></div>
    </div>`,

  kalendarz:el=>{
    el.innerHTML=`<div class="vhead"><div><h1>Kalendarz wizyt</h1><p>26 – 31 października 2026 · 4 specjalistów · 3 gabinety</p></div>
      <div class="vhead-actions"><div class="seg"><button>Dzień</button><button class="is-on">Tydzień</button><button>Miesiąc</button></div><button class="btn">Dziś</button><button class="btn btn-primary" data-book>${icon('plus')}Umów wizytę</button></div></div>
      <div class="toolbar card" style="border-radius:12px;margin-bottom:14px">${staff.map(s=>`<button class="chip is-on" data-staff="${s.id}" style="--accent:${s.color};background:color-mix(in srgb,${s.color} 12%,transparent);color:${s.color}">${avatar(s.name,'sm')}${s.name}</button>`).join('')}<span class="muted" style="margin-left:auto;font-size:12.5px">${icon('link','')}</span><span class="muted" style="font-size:12.5px">Rezerwacje online włączone · lumea.pl/umow</span></div>
      <div class="card" style="overflow:hidden" data-cal></div>`;
    const draw=()=>{const on=$$('[data-staff].is-on',el).map(b=>b.dataset.staff);week($('[data-cal]',el),{days,events:events.filter(e=>on.includes(e.who)),today:2,now:'11:40',from:8,to:18,onClick:e=>openPatient(e.title,e)})};
    draw();
    el.addEventListener('click',e=>{const b=e.target.closest('[data-staff]');if(b){b.classList.toggle('is-on');b.style.opacity=b.classList.contains('is-on')?1:.45;draw()}if(e.target.closest('[data-book]'))toast('Wizyta zarezerwowana','Pacjent dostał SMS z potwierdzeniem','cal')});
  },

  pacjenci:el=>{
    el.innerHTML=`<div class="vhead"><div><h1>Pacjenci</h1><p>${Panel.empty?'0':'1 248'} kartotek · historia wizyt, zgody RODO, notatki i płatności w jednym miejscu</p></div>
      <div class="vhead-actions"><button class="btn">${icon('file')}Import z Booksy</button><button class="btn btn-primary">${icon('plus')}Dodaj pacjenta</button></div></div>
      <div class="card"><div class="toolbar"><input class="input" placeholder="Szukaj po nazwisku lub telefonie…" style="width:260px" data-q><button class="chip is-on" data-f="">Wszyscy</button><button class="chip" data-f="Aktywny">Aktywni</button><button class="chip" data-f="Do przypomnienia">Do przypomnienia</button><button class="chip" data-f="Uśpiony">Uśpieni</button><span class="muted" style="margin-left:auto;font-size:12.5px">${icon('filter')}</span></div>
      <div style="overflow-x:auto"><table class="table"><thead><tr><th>Pacjent</th><th>Ostatni zabieg</th><th>Prowadzący</th><th class="right">Wizyty</th><th class="right">Wartość</th><th>Następna wizyta</th><th>Status</th><th>Źródło</th></tr></thead><tbody data-rows></tbody></table></div></div>`;
    let f='',q='';
    const st={'Aktywny':'ok','Do przypomnienia':'warn','Uśpiony':''};
    const draw=()=>{$('[data-rows]',el).innerHTML=patients.filter(p=>(!f||p.status===f)&&p.name.toLowerCase().includes(q)).map(p=>`<tr data-p="${esc(p.name)}"><td><div class="who">${avatar(p.name)}<div><b>${esc(p.name)}</b><small>${p.phone}</small></div></div></td><td>${p.svc}<br><small class="muted">${p.last}</small></td><td><span class="src">${avatar(S[p.who].name,'sm')}${S[p.who].name}</span></td><td class="right num">${p.visits}</td><td class="right num"><b>${pln(p.ltv)}</b></td><td class="num">${p.next}</td><td>${pill(p.status,st[p.status])}</td><td>${src(p.src)}</td></tr>`).join('')||'<tr><td colspan="8" class="empty">Brak wyników</td></tr>'};
    draw();
    el.addEventListener('click',e=>{const c=e.target.closest('[data-f]');if(c){$$('[data-f]',el).forEach(x=>x.classList.toggle('is-on',x===c));f=c.dataset.f;draw()}const r=e.target.closest('[data-p]');if(r)openPatient(r.dataset.p)});
    $('[data-q]',el).addEventListener('input',e=>{q=e.target.value.toLowerCase();draw()});
  },

  leady:el=>{
    const sum=list=>pln(list.reduce((a,k)=>a+k.val,0));
    el.innerHTML=`<div class="vhead"><div><h1>Leady</h1><p>Zapytania z reklam Meta i Google, Instagrama i formularza trafiają tu same. Przeciągnij kartę, aby zmienić etap.</p></div>
      <div class="vhead-actions"><div class="seg"><button class="is-on">Tablica</button><button>Lista</button></div><button class="btn btn-primary">${icon('plus')}Dodaj lead</button></div></div>
      <div class="grid g4" style="margin-bottom:16px">
        ${kpi({label:'Nowe leady (30 dni)',value:'186',delta:'34%',ic:'target',data:[3,4,5,4,6,7,6,8,9,8,10,11]})}
        ${kpi({label:'Czas do 1. odpowiedzi',value:'2 min',delta:'było 5 godz.',arrow:'↓',ic:'clock',note:''})}
        ${kpi({label:'Konwersja na pacjenta',value:'38%',delta:'9 pp',ic:'users',data:[22,24,25,27,28,30,31,33,34,35,37,38]})}
        ${kpi({label:'Koszt pozyskania',value:'41 zł',delta:'18%',arrow:'↓',ic:'wallet',note:'vs wrzesień'})}
      </div><div data-board></div>`;
    kanban($('[data-board]',el),{cols,cards:leads,sum,render:k=>`<div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(k.name)}</b><span class="time">${k.ago}</span></div><p>${esc(k.svc)}</p><div class="kcard-foot">${src(k.src)}<span class="kcard-val num">${pln(k.val)}</span></div>`,onMove:(k,c)=>toast(`${k.name} → ${c.label}`,c.id==='booked'?'Wysłano SMS z potwierdzeniem konsultacji':c.id==='won'?'Utworzono kartotekę pacjenta':'Etap zaktualizowany','check')});
  },

  poczta:el=>{
    el.innerHTML=`<div class="vhead"><div><h1>Poczta</h1><p>recepcja@lumea.pl · wiadomości są połączone z kartoteką pacjenta</p></div><div class="vhead-actions"><button class="btn btn-primary">${icon('send')}Nowa wiadomość</button></div></div>
      <div class="card mail"><div class="mail-folders">
        <a class="nav-item is-on">${icon('inbox')}Odebrane<span class="nav-count hot">2</span></a><a class="nav-item">${icon('star')}Oznaczone</a><a class="nav-item">${icon('send')}Wysłane</a><a class="nav-item">${icon('file')}Szkice<span class="nav-count">1</span></a><a class="nav-item">${icon('archive')}Archiwum</a>
        <div class="nav-label" style="margin-top:12px">Etykiety</div><a class="nav-item"><span class="pill info" style="height:10px;width:10px;padding:0"></span>Leady</a><a class="nav-item"><span class="pill accent" style="height:10px;width:10px;padding:0"></span>Pacjenci</a><a class="nav-item"><span class="pill" style="height:10px;width:10px;padding:0"></span>Faktury</a>
      </div><div class="mail-list">${mails.map((m,i)=>`<button class="mitem ${m.unread?'unread':''} ${i?'':'is-on'}" data-m="${i}"><div class="mitem-top"><b>${esc(m.from)}</b><span class="time">${m.time}</span></div><div class="mitem-subj">${esc(m.subj)}</div><div class="mitem-prev">${esc(m.prev)}</div><div class="tags">${m.tags.map(t=>pill(t[0],t[1])).join('')}</div></button>`).join('')}</div><div class="mail-read" data-read></div></div>`;
    const open=i=>{const m=mails[i];if(!m){$('[data-read]',el).innerHTML='<div class="empty">Brak wiadomości</div>';return}$$('.mitem',el).forEach((x,k)=>{x.classList.toggle('is-on',k===i);if(k===i)x.classList.remove('unread')});$('[data-read]',el).innerHTML=`<h2>${esc(m.subj)}</h2><div class="mail-meta">${avatar(m.from)}<div class="row-main"><b>${esc(m.from)}</b><small>do: recepcja@lumea.pl · ${m.time}</small></div>${P[m.from]?`<button class="btn btn-sm" data-pat="${esc(m.from)}">${icon('user')}Kartoteka</button>`:''}</div><div class="mail-body">${esc(m.body)}</div>${m.ai?`<div class="ai-box"><b>${icon('sparkle')}Sugerowana odpowiedź</b><p>${esc(m.ai)}</p><div style="display:flex;gap:8px"><button class="btn btn-sm btn-primary" data-use>Użyj odpowiedzi</button><button class="btn btn-sm">Zaproponuj termin</button></div></div>`:''}<div class="reply"><div class="reply-box">Odpowiedz ${esc(m.from.split(' ')[0])}…<span class="kbd">R</span></div></div>`};
    open(0);
    el.addEventListener('click',e=>{const b=e.target.closest('[data-m]');if(b)open(+b.dataset.m);const p=e.target.closest('[data-pat]');if(p)openPatient(p.dataset.pat);if(e.target.closest('[data-use]'))toast('Odpowiedź wysłana','Lead przeniesiony do etapu „W kontakcie”','send')});
  },

  automatyzacje:el=>{
    el.innerHTML=`<div class="vhead"><div><h1>Automatyzacje</h1><p>Powtarzalna praca recepcji dzieje się sama: przypomnienia, opinie, powitania i powroty pacjentów.</p></div><div class="vhead-actions"><button class="btn btn-primary">${icon('plus')}Nowa automatyzacja</button></div></div>
      <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.3fr)">
        <div class="card"><div class="list" data-keep>${autos.map((a,i)=>`<div class="row" style="padding:14px 18px"><span class="ico ${a.on?'accent':''}">${icon(a.ic)}</span><div class="row-main"><b>${a.name}</b><small>${a.desc} · <span data-z>${a.runs}</span> uruchomień</small></div><span class="pill ${a.on?'ok':''}">${a.stat}</span><button class="switch ${a.on?'is-on':''}" data-sw="${i}" aria-label="Włącz lub wyłącz"></button></div>`).join('')}</div></div>
        <div class="card card-pad"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div><h3 style="margin:0;font-size:15px">Przypomnienie o wizycie</h3><small class="muted" data-z>Aktywna od marca · 1 284 uruchomień</small></div>${pill('Działa','ok')}</div>
          <div class="flow">
            <div class="fnode trigger"><span class="ico accent">${icon('cal')}</span><div><b>Wizyta zarezerwowana</b><small>Kalendarz, rezerwacja online lub Booksy</small></div></div>
            <div class="fline"></div>
            <div class="fnode"><span class="ico">${icon('msg')}</span><div><b>SMS: potwierdzenie rezerwacji</b><small>„Dzień dobry {imię}, potwierdzamy wizytę {data}…”</small></div><div class="fnode-stat"><strong>99%</strong>dostarczone</div></div>
            <div class="fline"></div>
            <div class="fnode"><span class="ico">${icon('clock')}</span><div><b>Czekaj do 24 h przed wizytą</b><small>pomija noce i niedziele</small></div></div>
            <div class="fline"></div>
            <div class="fnode"><span class="ico">${icon('msg')}</span><div><b>SMS: odpisz TAK, aby potwierdzić</b><small>link do zmiany terminu w treści</small></div><div class="fnode-stat"><strong>94%</strong>potwierdza</div></div>
            <div class="fbranch"><span class="fbranch-label" style="left:calc(25% + 8px)">potwierdził</span><span class="fbranch-label" style="right:calc(25% + 8px)">brak odpowiedzi 4 h</span>
              <div class="fnode"><span class="ico ok">${icon('star')}</span><div><b>Po wizycie: prośba o opinię</b><small>mail 3 h po zabiegu</small></div></div>
              <div class="fnode"><span class="ico warn">${icon('phone')}</span><div><b>Zadanie: zadzwoń</b><small>przypisz do recepcji</small></div></div>
            </div>
          </div></div>
      </div>
      <div class="card mt"><div class="card-head"><h3>Kampanie mailowe</h3><a class="link" href="#">Wszystkie kampanie →</a></div><div style="overflow-x:auto;padding-top:10px"><table class="table"><thead><tr><th>Kampania</th><th>Odbiorcy</th><th class="right">Otwarcia</th><th class="right">Kliknięcia</th><th class="right">Rezerwacje</th><th>Status</th></tr></thead><tbody>
        <tr><td><b>Jesienna pielęgnacja skóry: −20% na peelingi</b></td><td>Pacjentki kosmetologii · 642</td><td class="right num">58%</td><td class="right num">14%</td><td class="right num"><b>37</b></td><td>${pill('Wysłana','ok')}</td></tr>
        <tr><td><b>Ból pleców przy biurku? Pakiet 5 terapii</b></td><td>Fizjoterapia · 418</td><td class="right num">49%</td><td class="right num">11%</td><td class="right num"><b>22</b></td><td>${pill('Wysłana','ok')}</td></tr>
        <tr><td><b>Grudniowe vouchery prezentowe</b></td><td>Wszyscy pacjenci · 1 248</td><td class="right num">—</td><td class="right num">—</td><td class="right num">—</td><td>${pill('Zaplanowana · 1 gru','info')}</td></tr>
      </tbody></table></div></div>`;
    el.addEventListener('click',e=>{const s=e.target.closest('[data-sw]');if(s){s.classList.toggle('is-on');toast(autos[s.dataset.sw].name,s.classList.contains('is-on')?'Automatyzacja włączona':'Automatyzacja wstrzymana','zap')}});
  },

  raporty:()=>`
    <div class="vhead"><div><h1>Raporty</h1><p>Przychody, usługi i skuteczność reklam. Dane od stycznia 2026.</p></div><div class="vhead-actions"><div class="seg"><button>Kwartał</button><button class="is-on">Rok</button></div><button class="btn">${icon('file')}PDF dla księgowej</button></div></div>
    <div class="grid g-main">
      <div class="card"><div class="card-head"><div><h3>Przychód wg działu</h3><small>miesięcznie, 2026</small></div>${legend([{label:'Medycyna estetyczna',color:'#0f766e'},{label:'Fizjoterapia',color:'#2563eb'},{label:'Kosmetologia',color:'#db2777'}])}</div><div class="card-pad">${bars({labels:['sty','lut','mar','kwi','maj','cze','lip','sie','wrz','paź'],groups:[{color:'#2563eb',data:[18,19,21,22,22,20,17,16,23,25].map(v=>v*1000)},{color:'#db2777',data:[11,12,14,15,17,16,14,13,17,19].map(v=>v*1000)},{color:'#0f766e',data:[24,26,29,31,34,30,27,26,36,42].map(v=>v*1000)}],fmt:v=>v?(v/1000)+' tys.':'0'})}</div></div>
      <div class="card"><div class="card-head"><h3>Struktura przychodu</h3><small>październik</small></div><div class="card-pad" style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">${donut({label:'86 tys.',sub:'zł w październiku',parts:[{v:42,color:'#0f766e'},{v:25,color:'#2563eb'},{v:19,color:'#db2777'}]})}<div style="flex:1;min-width:150px">${[['Medycyna estetyczna','#0f766e','48,6%'],['Fizjoterapia','#2563eb','28,9%'],['Kosmetologia','#db2777','22,5%']].map(r=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--line-2)"><i style="width:9px;height:9px;border-radius:3px;background:${r[1]}"></i>${r[0]}<b style="margin-left:auto" class="num" data-z>${r[2]}</b></div>`).join('')}</div></div></div>
    </div>
    <div class="grid g2 mt">
      <div class="card"><div class="card-head"><h3>Lejek: od reklamy do pacjenta</h3><small>30 dni</small></div><div class="card-pad funnel">${[['Kliknięcia reklam','8420',100],['Leady','186',72],['Konsultacje','104',52],['Pacjenci','71',38]].map((r,i)=>`<div class="funnel-step"><span>${r[0]}</span><div><div class="funnel-bar" style="width:${r[2]}%;animation-delay:${i*90}ms;opacity:${1-i*.18}">${r[1]}</div></div><span class="muted right">${i?(Math.round(+r[1].replace(/\s/g,'')/[8420,186,104][i-1]*1000)/10).toLocaleString('pl-PL')+'%':''}</span></div>`).join('')}</div></div>
      <div class="card"><div class="card-head"><h3>Najlepiej sprzedające się usługi</h3><small>październik</small></div><div class="card-pad">${barList([{label:'Mezoterapia igłowa',v:14800},{label:'Kwas hialuronowy',v:12600},{label:'Terapia manualna',v:11200},{label:'Laseroterapia',v:8900},{label:'Rehabilitacja',v:7400}],v=>pln(v))}</div></div>
    </div>`,

  integracje:()=>`
    <div class="vhead"><div><h1>Integracje i zespół</h1><p>Panel łączy narzędzia, z których klinika już korzysta. Każdy w zespole widzi tylko to, czego potrzebuje.</p></div></div>
    <div class="grid g3">${[['Google Calendar','Dwustronna synchronizacja grafiku','#4285f4','G',1],['Gmail / poczta firmowa','Skrzynka recepcji w panelu','#ea4335','M',1],['Meta Lead Ads','Leady z Facebooka i Instagrama','#1877f2','f',1],['Google Ads','Konwersje i koszt pozyskania','#fbbc04','A',1],['SMSAPI','Przypomnienia i potwierdzenia SMS','#0f766e','S',1],['Przelewy24','Zadatki za rezerwacje online','#d13239','P',1],['Booksy','Import historii wizyt','#111111','b',1],['Google Business','Opinie i statystyki wizytówki','#34a853','★',1],['Fakturownia','Faktury po zabiegu','#475569','F',0]].map(r=>`<div class="card card-pad" style="display:flex;gap:14px;align-items:center"><span class="ico" style="background:${r[2]};color:#fff;font-weight:700;width:40px;height:40px;border-radius:11px">${r[3]}</span><div class="row-main"><b>${r[0]}</b><small>${r[1]}</small></div>${r[4]?pill('Połączono','ok'):'<button class="btn btn-sm">Połącz</button>'}</div>`).join('')}</div>
    <div class="card mt"><div class="card-head"><h3>Zespół i uprawnienia</h3><button class="btn btn-sm">${icon('plus')}Zaproś</button></div><div style="overflow-x:auto;padding-top:10px"><table class="table"><thead><tr><th>Osoba</th><th>Rola</th><th>Kalendarz</th><th>Pacjenci</th><th>Finanse</th><th>Ostatnio</th></tr></thead><tbody>
      <tr><td><div class="who">${avatar('Marta Zielińska')}<div><b>Marta Zielińska</b><small>manager</small></div></div></td><td>${pill('Administrator','accent')}</td><td>Pełny</td><td>Pełny</td><td>Pełny</td><td class="muted">teraz</td></tr>
      ${staff.map(s=>`<tr><td><div class="who">${avatar(s.name)}<div><b>${s.name}</b><small>${s.role}</small></div></div></td><td>${pill('Specjalista','')}</td><td>Własny</td><td>Swoi pacjenci</td><td class="muted">—</td><td class="muted">${['5 min','1 godz.','wczoraj','2 godz.'][staff.indexOf(s)]}</td></tr>`).join('')}
    </tbody></table></div></div>`,
};

function openPatient(name,e){
  const p=P[name];
  if(!p){drawer(`<div class="drawer-head">${avatar(name,'lg')}<div><h2>${esc(name)}</h2><small>${e?esc(e.sub)+' · '+e.start+'–'+e.end:''}</small></div><button class="icon-btn" style="margin-left:auto" data-close aria-label="Zamknij">✕</button></div><div class="drawer-body"><p class="muted">Wydarzenie wewnętrzne kliniki.</p></div>`);return}
  drawer(`<div class="drawer-head">${avatar(p.name,'lg')}<div><h2>${esc(p.name)}</h2><small>Pacjent od 2024 · ${p.visits} wizyt · ${src(p.src)}</small></div><button class="icon-btn" style="margin-left:auto" data-close aria-label="Zamknij">✕</button></div>
  <div class="drawer-body">
    <div style="display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap"><button class="btn btn-sm btn-primary">${icon('cal')}Umów wizytę</button><button class="btn btn-sm">${icon('msg')}SMS</button><button class="btn btn-sm">${icon('mail')}Mail</button><button class="btn btn-sm">${icon('phone')}Zadzwoń</button></div>
    <div class="grid g3" style="gap:10px;margin-bottom:20px"><div class="card card-pad" style="padding:12px"><small class="muted">Wartość</small><div style="font-weight:650;font-size:17px" class="num">${pln(p.ltv)}</div></div><div class="card card-pad" style="padding:12px"><small class="muted">Wizyty</small><div style="font-weight:650;font-size:17px">${p.visits}</div></div><div class="card card-pad" style="padding:12px"><small class="muted">Nieobecności</small><div style="font-weight:650;font-size:17px">0</div></div></div>
    <dl class="dl"><dt>Telefon</dt><dd>${p.phone}</dd><dt>E-mail</dt><dd>${p.mail}</dd><dt>Prowadzący</dt><dd>${S[p.who].name}</dd><dt>Następna wizyta</dt><dd>${p.next}</dd><dt>Tagi</dt><dd>${p.tags.map(t=>`<span class="tag">${t}</span>`).join(' ')||'—'}</dd><dt>Zgody</dt><dd>${pill('RODO','ok')} ${pill('SMS','ok')} ${pill('Marketing','ok')}</dd></dl>
    <div class="sec-title">Notatka</div>
    <div class="card card-pad" style="padding:12px 14px;background:var(--warn-soft);border-color:transparent;font-size:13px;margin-bottom:20px">Preferuje terminy po 16:00. Wrażliwa skóra: przed zabiegiem test płatkowy.</div>
    <div class="sec-title">Historia</div>
    <ul class="timeline"><li><b>${p.svc}</b><small>${p.last} · ${S[p.who].name} · opłacono kartą</small></li><li><b>SMS: przypomnienie o wizycie</b><small>potwierdzone odpowiedzią TAK</small></li><li><b>Opinia Google ★★★★★</b><small>po prośbie z automatyzacji</small></li><li><b>Konsultacja</b><small>sierpień 2026</small></li><li><b>Pierwszy kontakt</b><small>lead z: ${p.src}</small></li></ul>
  </div>`);
}

Panel.mount({
  theme:'light',accent:'#0f766e',accentSoft:'#e3f1ee',home:'pulpit',newLabel:'Umów wizytę',
  brand:{name:'Lumea Clinic',sub:'Kraków · Kazimierz',logo:'L'},
  user:{name:'Marta Zielińska',role:'Manager kliniki'},
  nav:[
    {items:[{id:'pulpit',label:'Pulpit',icon:'home'},{id:'kalendarz',label:'Kalendarz',icon:'cal',count:7},{id:'pacjenci',label:'Pacjenci',icon:'users'},{id:'leady',label:'Leady',icon:'target',count:3,hot:true},{id:'poczta',label:'Poczta',icon:'mail',count:2}]},
    {group:'Wzrost',items:[{id:'automatyzacje',label:'Automatyzacje',icon:'zap'},{id:'raporty',label:'Raporty',icon:'chart'}]},
    {group:'Klinika',items:[{id:'integracje',label:'Integracje i zespół',icon:'layers'}]},
  ],
  sideCard:`<div class="side-card"><b>Rezerwacje online</b><p>12 wizyt umówionych dziś przez stronę</p><div class="progress"><i style="width:68%"></i></div></div>`,
  views,
  searchable:[...patients.map(p=>({label:p.name,av:p.name,hint:'Pacjent',go:'#/pacjenci'})),...leads.map(l=>({label:l.name+' · '+l.svc,av:l.name,hint:'Lead',go:'#/leady'}))],
  notifications:[{icon:'target',t:'Nowy lead: Julia Wójcik',s:'Meta Ads · konsultacja: kwas hialuronowy',time:'4 min',k:'info'},{icon:'msg',t:'Tomasz Wilk prosi o zmianę terminu',s:'odpowiedź na SMS',time:'1 godz.',k:'warn'},{icon:'star',t:'Nowa opinia ★★★★★',s:'Google · Natalia P.',time:'wczoraj',k:'ok'},{icon:'wallet',t:'Zadatek opłacony',s:'Zuzanna Kubiak · 150 zł',time:'wczoraj',k:'accent'}],
  live:[{t:'Nowy lead z Meta Ads',s:'Weronika S. · pakiet laseroterapii',ic:'target'},{t:'Wizyta potwierdzona SMS-em',s:'Bartosz Kamiński · jutro 8:30',ic:'check'},{t:'Rezerwacja online',s:'Konsultacja estetyczna · pt 16:30',ic:'cal'}],
  onNew:()=>{location.hash='#/kalendarz';setTimeout(()=>toast('Wybierz wolne okno w kalendarzu','albo wyślij pacjentowi link do rezerwacji','cal'),300)},
  ribbon:'Panel demonstracyjny 21 project · marka i dane fikcyjne <a href="/saas/lumea-clinic/">Zobacz case study</a>',
});
})();
