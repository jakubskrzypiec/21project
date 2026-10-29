/* Voltra Energia: fikcyjna firma instalująca fotowoltaikę, magazyny energii i pompy ciepła. Wszystkie dane są przykładowe. */
(()=>{
const {icon,avatar,pill,pln,nf,esc,kpi,area,bars,donut,legend,barList,kanban,week,drawer,toast,$,$$}=Panel;
const A='#f5b301',B='#60a5fa',C='#a78bfa',D='#34d399';

const reps=[{name:'Łukasz Bielecki',deals:14,val:612000},{name:'Karolina Wrzosek',deals:11,val:498000},{name:'Daniel Pietrzak',deals:8,val:331000},{name:'Iga Malinowska',deals:5,val:204000}];
const srcColor={'Meta Lead Ads':'#1877f2','Google Ads':'#ea4335','Strona':'#64748b','Polecenie':'#16a34a','TikTok':'#e11d48'};
const srcMark={'Meta Lead Ads':'f','Google Ads':'G','Strona':'@','Polecenie':'★','TikTok':'t'};
const src=s=>`<span class="src"><b style="background:${srcColor[s]}">${srcMark[s]}</b>${s}</span>`;

const leads=[
  {name:'Grzegorz Michalak',city:'Wieliczka',prod:'PV 9,6 kWp + magazyn',bill:'520 zł/mies.',roof:'Dachówka, południe',src:'Meta Lead Ads',score:92,rep:'Łukasz Bielecki',sla:'odpowiedź w 2 min',ago:'3 min',state:'Nowy'},
  {name:'Anna Kołodziej',city:'Skawina',prod:'Pompa ciepła 12 kW',bill:'gaz 780 zł/mies.',roof:'—',src:'Google Ads',score:88,rep:'Karolina Wrzosek',sla:'odpowiedź w 4 min',ago:'17 min',state:'Nowy'},
  {name:'Firma Stolbud sp. z o.o.',city:'Niepołomice',prod:'PV 49,5 kWp na hali',bill:'4 900 zł/mies.',roof:'Blacha trapezowa',src:'Strona',score:95,rep:'Łukasz Bielecki',sla:'oddzwonić do 12:00',ago:'42 min',state:'Kwalifikacja'},
  {name:'Robert Szewczyk',city:'Myślenice',prod:'PV 6,2 kWp',bill:'310 zł/mies.',roof:'Blacha, wschód-zachód',src:'Meta Lead Ads',score:64,rep:'Daniel Pietrzak',sla:'w sekwencji mailowej',ago:'1 godz.',state:'Kwalifikacja'},
  {name:'Beata Ostrowska',city:'Bochnia',prod:'Magazyn energii 10 kWh',bill:'ma PV od 2021',roof:'—',src:'Polecenie',score:81,rep:'Iga Malinowska',sla:'audyt jutro 10:00',ago:'2 godz.',state:'Audyt'},
  {name:'Henryk Lis',city:'Kraków, Bieżanów',prod:'PV 8 kWp + pompa ciepła',bill:'640 zł/mies.',roof:'Dachówka, południe',src:'TikTok',score:77,rep:'Karolina Wrzosek',sla:'oferta wysłana',ago:'wczoraj',state:'Oferta'},
  {name:'Monika Adamczyk',city:'Wadowice',prod:'PV 7,2 kWp',bill:'380 zł/mies.',roof:'Papa, płaski',src:'Google Ads',score:58,rep:'Daniel Pietrzak',sla:'w sekwencji mailowej',ago:'wczoraj',state:'Kwalifikacja'},
  {name:'Zbigniew Czarnecki',city:'Limanowa',prod:'Pompa ciepła 9 kW',bill:'węgiel 9 t/rok',roof:'—',src:'Meta Lead Ads',score:73,rep:'Iga Malinowska',sla:'oferta otwarta 3×',ago:'2 dni',state:'Oferta'},
];
const deals=[
  {id:1,col:'qual',name:'Robert Szewczyk',prod:'PV 6,2 kWp',val:28900,rep:'Daniel Pietrzak',p:20},
  {id:2,col:'qual',name:'Monika Adamczyk',prod:'PV 7,2 kWp',val:32400,rep:'Daniel Pietrzak',p:20},
  {id:3,col:'qual',name:'Stolbud sp. z o.o.',prod:'PV 49,5 kWp',val:168000,rep:'Łukasz Bielecki',p:30},
  {id:4,col:'audit',name:'Beata Ostrowska',prod:'Magazyn 10 kWh',val:31500,rep:'Iga Malinowska',p:40},
  {id:5,col:'audit',name:'Krystyna Duda',prod:'PV 10 kWp + magazyn',val:61200,rep:'Karolina Wrzosek',p:45},
  {id:6,col:'offer',name:'Henryk Lis',prod:'PV 8 kWp + pompa ciepła',val:74800,rep:'Karolina Wrzosek',p:60},
  {id:7,col:'offer',name:'Zbigniew Czarnecki',prod:'Pompa ciepła 9 kW',val:42600,rep:'Iga Malinowska',p:55},
  {id:8,col:'offer',name:'Gmina Słomniki',prod:'PV 3× budynek szkoły',val:286000,rep:'Łukasz Bielecki',p:50},
  {id:9,col:'nego',name:'Paweł Domański',prod:'PV 11 kWp + magazyn',val:69300,rep:'Łukasz Bielecki',p:80},
  {id:10,col:'nego',name:'Agro-Mlecz spółdzielnia',prod:'PV 80 kWp',val:248000,rep:'Karolina Wrzosek',p:75},
  {id:11,col:'won',name:'Marcin Zawadzki',prod:'PV 9,6 kWp',val:41200,rep:'Daniel Pietrzak',p:100},
  {id:12,col:'won',name:'Ewelina Sobczak',prod:'Pompa ciepła 12 kW',val:46900,rep:'Karolina Wrzosek',p:100},
];
const cols=[{id:'qual',label:'Kwalifikacja',color:B},{id:'audit',label:'Audyt na miejscu',color:C},{id:'offer',label:'Oferta wysłana',color:A},{id:'nego',label:'Negocjacje',color:'#fb923c'},{id:'won',label:'Umowa',color:D}];

const crews=[{id:'a',name:'Ekipa A · Marek + 2',color:A},{id:'b',name:'Ekipa B · Tomek + 2',color:B},{id:'c',name:'Serwis · Adrian',color:D},{id:'d',name:'Audytorzy · Iga, Daniel',color:C}];
const CR=Object.fromEntries(crews.map(c=>[c.id,c]));
const days=[{name:'Pon',num:26},{name:'Wt',num:27},{name:'Śr',num:28},{name:'Czw',num:29},{name:'Pt',num:30}];
const ev=(day,start,end,title,c,sub)=>({day,start,end,title,sub,color:CR[c].color,crew:c});
const jobs=[
  ev(0,'7:00','15:00','Montaż PV 9,6 kWp','a','Zawadzki · Wieliczka'),ev(0,'8:00','12:00','Montaż pompy ciepła','b','Sobczak · Skawina'),ev(0,'13:00','16:00','Serwis falownika','c','Kowal · Kraków'),
  ev(1,'7:00','16:00','Montaż PV 11 kWp + magazyn','a','Nowak · Bochnia'),ev(1,'9:00','10:30','Audyt dachu','d','Ostrowska · Bochnia'),ev(1,'8:00','15:00','Pompa ciepła 9 kW','b','Rogalski · Myślenice'),
  ev(2,'7:00','11:00','Montaż konstrukcji','a','Stolbud · Niepołomice'),ev(2,'10:00','11:30','Audyt dachu','d','Duda · Zabierzów'),ev(2,'12:00','16:00','Montaż PV 49,5 kWp, dzień 1','a','Stolbud · Niepołomice'),ev(2,'8:00','12:00','Przegląd pomp','c','3 klientów · Kraków'),ev(2,'13:00','15:00','Zgłoszenie do OSD','b','dokumenty'),
  ev(3,'7:00','16:00','Montaż PV 49,5 kWp, dzień 2','a','Stolbud · Niepołomice'),ev(3,'8:00','14:00','Montaż PV 7,2 kWp','b','Kamińska · Wadowice'),ev(3,'15:00','16:30','Audyt dachu','d','Domański · Skawina'),
  ev(4,'7:00','13:00','Odbiór i uruchomienie','a','Stolbud · Niepołomice'),ev(4,'8:00','15:00','Montaż magazynu 10 kWh','b','Ostrowska · Bochnia'),ev(4,'9:00','11:00','Serwis: aplikacja klienta','c','Lis · Kraków'),
];

const mails=[
  {from:'Grzegorz Michalak',subj:'Re: Wstępna oferta fotowoltaiki 9,6 kWp',prev:'Dzięki za szybką odpowiedź. Czy magazyn energii można dołożyć później?',time:'11:48',unread:true,tags:[['Gorący lead','warn'],['Meta Lead Ads','']],body:'Dzień dobry,\n\ndzięki za szybką odpowiedź i wstępne wyliczenie. Czy magazyn energii można dołożyć później, czy lepiej od razu? I ile trwa cały proces do podłączenia przez zakład energetyczny?\n\nPozdrawiam,\nGrzegorz Michalak',ai:'Magazyn można dołożyć później, ale montaż razem z instalacją jest tańszy o ok. 2 400 zł (jeden dojazd, jedna konfiguracja falownika hybrydowego). Cały proces: audyt w 3 dni, montaż w 2–3 tygodnie, zgłoszenie do OSD do 30 dni. Zaproponować audyt w czwartek o 16:00?'},
  {from:'Stolbud sp. z o.o.',subj:'Zapytanie: instalacja na dachu hali',prev:'Prosimy o ofertę na ok. 50 kWp. W załączniku rachunki z ostatnich 12 miesięcy…',time:'10:22',unread:true,tags:[['B2B','info'],['Załącznik','']],body:'Dzień dobry,\n\nprosimy o ofertę instalacji ok. 50 kWp na dachu hali magazynowej (blacha trapezowa, ok. 900 m²). W załączniku rachunki z ostatnich 12 miesięcy.\n\nZ poważaniem,\nAndrzej Stolarczyk, prezes zarządu',ai:'Przy zużyciu 58 MWh/rok optymalna moc to 49,5 kWp (110 paneli 450 W). Szacowany koszt: 168 000 zł netto, zwrot ok. 4,8 roku. Proponuję audyt dachu w środę 4.11 i przygotowanie oferty z wariantem leasingu.'},
  {from:'Hurtownia Solar-Tech',subj:'Potwierdzenie dostawy: 110 paneli, 2 falowniki',prev:'Dostawa na magazyn w Niepołomicach w poniedziałek 2.11 między 8 a 12…',time:'9:15',tags:[['Logistyka','']],body:'Dzień dobry,\n\npotwierdzamy dostawę 110 paneli 450 W oraz 2 falowników 25 kW na adres w Niepołomicach w poniedziałek 2.11, między 8:00 a 12:00.\n\nSolar-Tech'},
  {from:'Henryk Lis',subj:'Pytanie o ofertę',prev:'Otworzyłem ofertę, wygląda dobrze. Czy jest możliwość rozłożenia na raty?',time:'wczoraj',tags:[['Oferta','accent']],body:'Dzień dobry,\n\notworzyłem ofertę, wygląda dobrze. Czy jest możliwość rozłożenia płatności na raty i jak wygląda kwestia dofinansowania?\n\nHenryk Lis'},
  {from:'Tauron Dystrybucja',subj:'Zgłoszenie mikroinstalacji przyjęte',prev:'Zgłoszenie nr MI/2026/10/4471 zostało przyjęte do realizacji…',time:'wczoraj',tags:[['OSD','ok']],body:'Zgłoszenie nr MI/2026/10/4471 (Zawadzki, Wieliczka, 9,6 kWp) zostało przyjęte do realizacji. Wymiana licznika nastąpi w ciągu 30 dni.'},
];

const seq=[
  {d:'Dzień 0 · od razu',t:'Mail: wstępna wycena + SMS od handlowca',s:'Wycena liczona z danych z formularza reklamy',m:['98%','otwarcia']},
  {d:'Dzień 0 · +15 min',t:'Zadanie: telefon',s:'Handlowiec dostaje powiadomienie w aplikacji',m:['71%','dodzwonień']},
  {d:'Dzień 2',t:'Mail: realizacja u sąsiada',s:'Case study z najbliższej miejscowości (dobierane po kodzie pocztowym)',m:['63%','otwarcia']},
  {d:'Dzień 5',t:'Mail: jak działa dofinansowanie',s:'Krótki poradnik + kalkulator zwrotu',m:['54%','otwarcia']},
  {d:'Dzień 9',t:'SMS: wolne terminy audytu',s:'Link do rezerwacji audytu w kalendarzu',m:['22%','rezerwuje']},
];

if(Panel.empty)[reps,leads,deals,jobs,mails].forEach(a=>a.length=0);
const views={
  pulpit:()=>`
    <div class="vhead"><div><h1>Centrum sprzedaży</h1><p>${Panel.empty?'Październik 2026 · brak nowych leadów':'Październik 2026 · 23 nowe leady w tym tygodniu · bez odpowiedzi: 0'}</p></div>
      <div class="vhead-actions"><div class="seg"><button>Tydzień</button><button class="is-on">Miesiąc</button><button>Kwartał</button></div><button class="btn">${icon('file')}Raport</button></div></div>
    <div class="grid g4">
      ${kpi({label:'Sprzedaż (październik)',value:'1,64 mln zł',delta:'27%',ic:'wallet',data:[8,9,9,11,10,12,13,12,14,15,16,18],note:'vs wrzesień'})}
      ${kpi({label:'Leady z reklam',value:'412',delta:'41%',ic:'target',data:[20,22,26,25,30,33,31,36,40,38,44,47],note:'vs wrzesień'})}
      ${kpi({label:'Podpisane umowy',value:'38',delta:'9',ic:'check',data:[2,3,3,2,4,3,4,5,4,5,6,6],note:'więcej niż we wrz.'})}
      ${kpi({label:'Zamontowana moc',value:'312 kWp',delta:'18%',ic:'sun',data:[10,12,11,14,13,15,17,16,18,19,21,22],note:'vs wrzesień'})}
    </div>
    <div class="grid g-main mt">
      <div class="card"><div class="card-head"><div><h3>Leady i umowy</h3><small>tygodniowo, ostatnie 12 tygodni</small></div>${legend([{label:'Leady',color:A},{label:'Audyty',color:B},{label:'Umowy',color:D}])}</div>
        <div class="card-pad">${area({labels:['32','33','34','35','36','37','38','39','40','41','42','43'].map(w=>'tydz. '+w),series:[{color:A,data:[52,58,61,57,66,72,70,81,88,85,96,104]},{color:B,data:[18,21,20,23,26,25,29,31,30,34,36,38]},{color:D,data:[5,6,6,7,8,7,9,9,10,9,11,12]}]})}</div></div>
      <div class="card"><div class="card-head"><h3>Na żywo</h3>${pill('online','ok')}</div><div class="list" style="padding-top:8px">
        <div class="row"><span class="ico warn">${icon('target')}</span><div class="row-main"><b>Nowy lead · Grzegorz M.</b><small>Meta Lead Ads · PV 9,6 kWp · score 92</small></div><span class="time">3 min</span></div>
        <div class="row"><span class="ico accent">${icon('eye')}</span><div class="row-main"><b>Henryk Lis otworzył ofertę</b><small>3. raz · 4 min 20 s na stronie oferty</small></div><span class="time">9 min</span></div>
        <div class="row"><span class="ico ok">${icon('check')}</span><div class="row-main"><b>Umowa podpisana online</b><small>Ewelina Sobczak · 46 900 zł</small></div><span class="time">1 godz.</span></div>
        <div class="row"><span class="ico info">${icon('truck')}</span><div class="row-main"><b>Ekipa A rozpoczęła montaż</b><small>Stolbud · Niepołomice · GPS</small></div><span class="time">2 godz.</span></div>
        <div class="row"><span class="ico">${icon('mail')}</span><div class="row-main"><b>Sekwencja: 27 maili wysłanych</b><small>dzień 2 i dzień 5 · 61% otwarć</small></div><span class="time">dziś</span></div>
      </div></div>
    </div>
    <div class="grid g3 mt">
      <div class="card"><div class="card-head"><h3>Ranking handlowców</h3><small>październik</small></div><div class="list" style="padding-top:6px">${reps.map((r,i)=>`<div class="row"><span class="num muted" style="width:14px">${i+1}</span>${avatar(r.name)}<div class="row-main"><b>${r.name}</b><small>${r.deals} umów</small></div><b class="num">${pln(r.val)}</b></div>`).join('')}</div></div>
      <div class="card"><div class="card-head"><h3>Koszt leada wg kanału</h3><small>30 dni</small></div><div class="card-pad">${barList([{label:'Meta Lead Ads',v:38,color:'#1877f2'},{label:'Google Ads',v:64,color:'#ea4335'},{label:'TikTok',v:29,color:'#e11d48'},{label:'Strona (SEO)',v:12,color:'#64748b'}],v=>v+' zł')}</div></div>
      <div class="card"><div class="card-head"><h3>Struktura sprzedaży</h3></div><div class="card-pad" style="display:flex;align-items:center;gap:18px">${donut({label:'38',sub:'umów',size:150,parts:[{v:21,color:A},{v:9,color:B},{v:5,color:C},{v:3,color:D}]})}<div style="flex:1">${[['Fotowoltaika',A,21],['Pompy ciepła',B,9],['Magazyny',C,5],['B2B',D,3]].map(r=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--line-2);font-size:12.5px"><i style="width:9px;height:9px;border-radius:3px;background:${r[1]}"></i>${r[0]}<b style="margin-left:auto" data-z>${r[2]}</b></div>`).join('')}</div></div></div>
    </div>`,

  leady:el=>{
    el.innerHTML=`<div class="vhead"><div><h1>Leady</h1><p>Formularze z Meta, Google, TikToka i strony trafiają tu w kilka sekund. System ocenia lead, przypisuje handlowca i startuje sekwencję.</p></div>
      <div class="vhead-actions"><button class="btn">${icon('link')}Połączone formularze: 6</button><button class="btn btn-primary">${icon('plus')}Dodaj lead</button></div></div>
      <div class="grid g4" style="margin-bottom:16px">
        ${kpi({label:'Średni czas reakcji',value:'3 min',delta:'było 6 godz.',arrow:'↓',ic:'clock',note:''})}
        ${kpi({label:'Gorące leady (score 80+)',value:'31%',delta:'6 pp',ic:'bolt',note:'vs wrzesień'})}
        ${kpi({label:'Lead → audyt',value:'37%',delta:'12 pp',ic:'target',data:[21,22,25,24,27,29,31,30,33,35,36,37],note:'vs wrzesień'})}
        ${kpi({label:'Bez kontaktu > 24 h',value:'0',delta:'z 46',arrow:'↓',ic:'check',note:'od startu panelu'})}
      </div>
      <div class="card"><div class="toolbar"><input class="input" placeholder="Szukaj po nazwisku, mieście…" style="width:240px"><button class="chip is-on">Wszystkie · 412</button><button class="chip">Nowe · 23</button><button class="chip">Gorące</button><button class="chip">Moje</button><button class="chip">B2B</button></div>
      <div style="overflow-x:auto"><table class="table"><thead><tr><th>Klient</th><th>Zainteresowanie</th><th>Z formularza</th><th>Score</th><th>Handlowiec</th><th>Status</th><th>Źródło</th></tr></thead><tbody>${leads.map((l,i)=>`<tr data-l="${i}"><td><div class="who">${avatar(l.name)}<div><b>${esc(l.name)}</b><small>${l.city} · ${l.ago}</small></div></div></td><td><b style="font-weight:550">${l.prod}</b></td><td><small class="muted">${l.bill}<br>${l.roof}</small></td><td>${score(l.score)}</td><td><span class="src">${avatar(l.rep,'sm')}${l.rep.split(' ')[0]}</span></td><td>${pill(l.sla,l.state==='Nowy'?'warn':l.state==='Oferta'?'accent':'info')}</td><td>${src(l.src)}</td></tr>`).join('')}</tbody></table></div></div>`;
    el.addEventListener('click',e=>{const r=e.target.closest('[data-l]');if(r)openLead(leads[r.dataset.l])});
  },

  sprzedaz:el=>{
    el.innerHTML=`<div class="vhead"><div><h1>Lejek sprzedaży</h1><p>Wartość lejka: <b>${pln(deals.filter(d=>d.col!=='won').reduce((a,d)=>a+d.val,0))}</b> · prognoza na listopad: <b>${pln(Math.round(deals.filter(d=>d.col!=='won').reduce((a,d)=>a+d.val*d.p/100,0)))}</b></p></div>
      <div class="vhead-actions"><div class="seg"><button class="is-on">Wszyscy</button><button>Moje</button></div><button class="btn btn-primary">${icon('plus')}Nowa szansa</button></div></div><div data-board></div>`;
    kanban($('[data-board]',el),{cols,cards:deals,sum:l=>Math.round(l.reduce((a,d)=>a+d.val,0)/1000)+' tys. zł',render:d=>`<b>${esc(d.name)}</b><p>${esc(d.prod)}</p><div class="progress" style="margin-bottom:10px"><i style="width:${d.p}%;background:${cols.find(c=>c.id===d.col).color}"></i></div><div class="kcard-foot"><span class="src">${avatar(d.rep,'sm')}${d.p}%</span><span class="kcard-val num">${pln(d.val)}</span></div>`,onMove:(d,c)=>{d.p=({qual:20,audit:40,offer:60,nego:80,won:100})[c.id];toast(`${d.name} → ${c.label}`,c.id==='won'?'Umowa wysłana do podpisu online · zadanie dla ekipy montażowej':c.id==='audit'?'Klient dostał SMS z wyborem terminu audytu':'Etap zaktualizowany','check');}});
  },

  wyceny:el=>{
    el.innerHTML=`<div class="vhead"><div><h1>Kalkulator ofert</h1><p>Handlowiec ustawia parametry u klienta, a oferta PDF z logo i zdjęciem dachu wychodzi mailem w minutę.</p></div><div class="vhead-actions"><button class="btn">${icon('file')}Szablony ofert</button></div></div>
      <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.2fr)">
        <div class="card card-pad"><div class="sec-title">Dane klienta</div>
          <label class="calc-f"><span>Roczne zużycie prądu <b data-o="kwh"></b></span><input type="range" min="2000" max="15000" step="100" value="6200" data-i="kwh"></label>
          <label class="calc-f"><span>Cena prądu <b data-o="price"></b></span><input type="range" min="0.7" max="1.6" step="0.01" value="1.12" data-i="price"></label>
          <div class="calc-f"><span>Dach</span><div class="seg" data-roof><button class="is-on" data-v="1">Południe</button><button data-v=".9">Wsch.–zach.</button><button data-v=".82">Płaski</button></div></div>
          <div class="calc-f"><span>Magazyn energii 10 kWh</span><button class="switch is-on" data-sw="bat" aria-label="Magazyn energii"></button></div>
          <div class="calc-f"><span>Dofinansowanie</span><button class="switch is-on" data-sw="sub" aria-label="Dofinansowanie"></button></div>
          <div class="calc-f" style="border:0"><span>Klient</span>${Panel.empty?'<span class="muted">wybierz klienta</span>':`<span class="src">${avatar('Grzegorz Michalak','sm')}Grzegorz Michalak · Wieliczka</span>`}</div>
        </div>
        <div class="card card-pad" data-res></div>
      </div>
      <div class="card mt"><div class="card-head"><h3>Ostatnie oferty</h3><small>klient dostaje link, a Ty widzisz, kiedy ją czyta</small></div><div style="overflow-x:auto;padding-top:10px"><table class="table"><thead><tr><th>Klient</th><th>Instalacja</th><th class="right">Wartość</th><th>Wysłana</th><th>Aktywność klienta</th><th>Status</th></tr></thead><tbody>
        <tr><td><div class="who">${avatar('Henryk Lis')}<b>Henryk Lis</b></div></td><td>PV 8 kWp + pompa ciepła</td><td class="right num"><b>${pln(74800)}</b></td><td class="muted">wczoraj</td><td>otwarta 3× · 4 min 20 s</td><td>${pill('Gorąca','warn')}</td></tr>
        <tr><td><div class="who">${avatar('Zbigniew Czarnecki')}<b>Zbigniew Czarnecki</b></div></td><td>Pompa ciepła 9 kW</td><td class="right num"><b>${pln(42600)}</b></td><td class="muted">2 dni temu</td><td>otwarta 1× · pobrano PDF</td><td>${pill('Przeczytana','info')}</td></tr>
        <tr><td><div class="who">${avatar('Ewelina Sobczak')}<b>Ewelina Sobczak</b></div></td><td>Pompa ciepła 12 kW</td><td class="right num"><b>${pln(46900)}</b></td><td class="muted">5 dni temu</td><td>podpisana online</td><td>${pill('Umowa','ok')}</td></tr>
        <tr><td><div class="who">${avatar('Gmina Słomniki')}<b>Gmina Słomniki</b></div></td><td>PV na 3 budynkach</td><td class="right num"><b>${pln(286000)}</b></td><td class="muted">tydzień temu</td><td>nieotwarta · przypomnienie jutro</td><td>${pill('Czeka','')}</td></tr>
      </tbody></table></div></div>`;
    const st={roof:1,bat:true,sub:true};
    const draw=()=>{
      const kwh=+$('[data-i=kwh]',el).value,price=+$('[data-i=price]',el).value;
      $('[data-o=kwh]',el).textContent=nf(kwh)+' kWh';$('[data-o=price]',el).textContent=price.toFixed(2).replace('.',',')+' zł/kWh';
      const kwp=Math.ceil(kwh*1.15/1000/st.roof/0.45)*0.45,panels=Math.round(kwp/0.45);
      let cost=kwp*3900+(st.bat?24500:0);const sub=st.sub?Math.min(cost*.5,(st.bat?16000:0)+6000):0;const net=cost-sub;
      const save=kwh*price*(st.bat?.9:.72);const pay=net/save;
      const yrs=Array.from({length:12},(_,i)=>Math.round(save*(i+1)*Math.pow(1.04,i)-net));
      $('[data-res]',el).innerHTML=`<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap"><div><div class="sec-title" style="margin:0 0 4px">Proponowana instalacja</div><div style="font-size:30px;font-weight:700;letter-spacing:-.03em">${kwp.toFixed(2).replace('.',',')} kWp</div><small class="muted">${panels} paneli 450 W · falownik hybrydowy${st.bat?' · magazyn 10 kWh':''}</small></div>${pill('Wariant rekomendowany','accent')}</div>
        <div class="grid g3 mt" style="gap:10px">${[['Cena brutto',pln(Math.round(cost))],['Dofinansowanie','−'+pln(Math.round(sub))],['Zwrot',pay.toFixed(1).replace('.',',')+' lat']].map(r=>`<div style="padding:12px;border-radius:11px;background:var(--surface-2);border:1px solid var(--line)"><small class="muted">${r[0]}</small><div style="font-size:17px;font-weight:650" class="num">${r[1]}</div></div>`).join('')}</div>
        <div class="sec-title mt">Bilans inwestycji w kolejnych latach</div>${balance(yrs)}
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn btn-primary" data-send>${icon('send')}Wyślij ofertę PDF</button><button class="btn">${icon('eye')}Podgląd</button><span class="muted" style="margin-left:auto;align-self:center;font-size:12.5px">Oszczędność: ~${pln(Math.round(save/12))}/mies.</span></div>`;
    };
    draw();
    el.addEventListener('input',draw);
    el.addEventListener('click',e=>{const r=e.target.closest('[data-roof] button');if(r){$$('[data-roof] button',el).forEach(b=>b.classList.toggle('is-on',b===r));st.roof=+r.dataset.v;draw()}const s=e.target.closest('[data-sw]');if(s){s.classList.toggle('is-on');st[s.dataset.sw]=s.classList.contains('is-on');draw()}if(e.target.closest('[data-send]'))toast('Oferta wysłana','Powiadomimy Cię, gdy klient ją otworzy','send')});
  },

  montaze:el=>{
    el.innerHTML=`<div class="vhead"><div><h1>Harmonogram montaży</h1><p>26 – 30 października · 3 ekipy · 2 audytorów · materiały rezerwowane automatycznie z magazynu</p></div><div class="vhead-actions"><div class="seg"><button>Dzień</button><button class="is-on">Tydzień</button><button>Mapa</button></div><button class="btn btn-primary">${icon('plus')}Zaplanuj montaż</button></div></div>
      <div class="toolbar card" style="border-radius:12px;margin-bottom:14px">${crews.map(c=>`<span class="chip is-on" style="background:color-mix(in srgb,${c.color} 15%,transparent);color:${c.color}"><i style="width:8px;height:8px;border-radius:50%;background:${c.color}"></i>${c.name}</span>`).join('')}<span class="muted" style="margin-left:auto;font-size:12.5px">Klienci dostają SMS dzień przed przyjazdem ekipy</span></div>
      <div class="card" style="overflow:hidden" data-cal></div>
      <div class="grid g3 mt">${Panel.empty?'':[['Stolbud · 49,5 kWp','Montaż dzień 2 z 3',66,A],['Nowak · 11 kWp + magazyn','Czeka na zgłoszenie OSD',85,B],['Rogalski · pompa ciepła','Uruchomiona, protokół podpisany',100,D]].map(r=>`<div class="card card-pad"><div style="display:flex;justify-content:space-between"><b>${r[0]}</b><span class="num muted">${r[2]}%</span></div><small class="muted">${r[1]}</small><div class="progress" style="margin-top:12px"><i style="width:${r[2]}%;background:${r[3]}"></i></div></div>`).join('')}</div>`;
    $('[data-cal]',el).innerHTML=`<div class="cal-wrap"><div class="res" style="--days:${days.length}"><div class="res-h" style="border-left:0"></div>${days.map((d,i)=>`<div class="res-h ${i===2?'today':''}">${d.name}<b>${d.num}</b></div>`).join('')}${crews.map(c=>`<div class="res-crew"><span class="src"><i style="width:9px;height:9px;border-radius:50%;background:${c.color}"></i><strong style="font-weight:600;white-space:nowrap">${c.name.split(' · ')[0]}</strong></span><small>${c.name.split(' · ')[1]||'2 osoby'}</small></div>${days.map((d,i)=>`<div class="${i===2?'res-today':''}">${jobs.filter(j=>j.crew===c.id&&j.day===i).map(j=>`<div class="job" style="--evc:${c.color}" data-j="${jobs.indexOf(j)}"><b>${esc(j.title)}</b><small>${j.start}–${j.end} · ${esc(j.sub)}</small></div>`).join('')}</div>`).join('')}`).join('')}</div></div>`;
    el.addEventListener('click',e=>{const j=e.target.closest('[data-j]');if(j){const x=jobs[j.dataset.j];toast(x.title,x.sub+' · klient dostał SMS z godziną przyjazdu','truck')}});
  },

  poczta:el=>{
    el.innerHTML=`<div class="vhead"><div><h1>Poczta</h1><p>biuro@voltra.pl i skrzynki handlowców · każda wiadomość przypięta do klienta i szansy sprzedaży</p></div><div class="vhead-actions"><button class="btn btn-primary">${icon('send')}Nowa wiadomość</button></div></div>
      <div class="card mail"><div class="mail-folders"><a class="nav-item is-on">${icon('inbox')}Odebrane<span class="nav-count hot">2</span></a><a class="nav-item">${icon('star')}Oznaczone</a><a class="nav-item">${icon('send')}Wysłane</a><a class="nav-item">${icon('zap')}Z sekwencji<span class="nav-count">27</span></a><a class="nav-item">${icon('archive')}Archiwum</a><div class="nav-label" style="margin-top:12px">Skrzynki</div><a class="nav-item">${avatar('Łukasz Bielecki','sm')}Łukasz</a><a class="nav-item">${avatar('Karolina Wrzosek','sm')}Karolina</a></div>
      <div class="mail-list">${mails.map((m,i)=>`<button class="mitem ${m.unread?'unread':''} ${i?'':'is-on'}" data-m="${i}"><div class="mitem-top"><b>${esc(m.from)}</b><span class="time">${m.time}</span></div><div class="mitem-subj">${esc(m.subj)}</div><div class="mitem-prev">${esc(m.prev)}</div><div class="tags">${m.tags.map(t=>pill(t[0],t[1])).join('')}</div></button>`).join('')}</div><div class="mail-read" data-read></div></div>`;
    const open=i=>{const m=mails[i];if(!m){$('[data-read]',el).innerHTML='<div class="empty">Brak wiadomości</div>';return}$$('.mitem',el).forEach((x,k)=>{x.classList.toggle('is-on',k===i);if(k===i)x.classList.remove('unread')});$('[data-read]',el).innerHTML=`<h2>${esc(m.subj)}</h2><div class="mail-meta">${avatar(m.from)}<div class="row-main"><b>${esc(m.from)}</b><small>do: biuro@voltra.pl · ${m.time}</small></div></div><div class="mail-body">${esc(m.body)}</div>${m.ai?`<div class="ai-box"><b>${icon('sparkle')}Szkic odpowiedzi na podstawie oferty i kalendarza</b><p>${esc(m.ai)}</p><div style="display:flex;gap:8px"><button class="btn btn-sm btn-primary" data-use>Wyślij</button><button class="btn btn-sm">Edytuj</button></div></div>`:''}<div class="reply"><div class="reply-box">Odpowiedz…<span class="kbd">R</span></div></div>`};
    open(0);
    el.addEventListener('click',e=>{const b=e.target.closest('[data-m]');if(b)open(+b.dataset.m);if(e.target.closest('[data-use]'))toast('Odpowiedź wysłana','Zaproponowano termin audytu w kalendarzu','send')});
  },

  sekwencje:el=>{
    el.innerHTML=`<div class="vhead"><div><h1>Automatyzacja maili</h1><p>Każdy lead dostaje dopasowaną serię wiadomości, dopóki nie umówi audytu. Odpowiedź klienta zatrzymuje sekwencję.</p></div><div class="vhead-actions"><button class="btn btn-primary">${icon('plus')}Nowa sekwencja</button></div></div>
      <div class="grid g4" style="margin-bottom:16px">
        ${kpi({label:'Aktywni w sekwencjach',value:'186',delta:'24%',ic:'users',note:'vs wrzesień'})}
        ${kpi({label:'Otwarcia',value:'61%',delta:'8 pp',ic:'eye',data:[48,50,52,51,54,55,57,58,59,60,60,61],note:'vs wrzesień'})}
        ${kpi({label:'Odpowiedzi',value:'19%',delta:'5 pp',ic:'msg',note:'vs wrzesień'})}
        ${kpi({label:'Audyty z sekwencji',value:'64',delta:'31%',ic:'cal',note:'vs wrzesień'})}
      </div>
      <div class="grid" style="grid-template-columns:minmax(0,1.25fr) minmax(0,1fr)">
        <div class="card card-pad"><div style="display:flex;justify-content:space-between;align-items:center"><div><h3 style="margin:0;font-size:15px">Lead z reklamy: fotowoltaika</h3><small class="muted">uruchomiona dla <span data-z>1 120</span> leadów · zatrzymuje się po odpowiedzi</small></div>${pill('Aktywna','ok')}</div>
          <div class="flow" style="align-items:stretch">${seq.map((s,i)=>`${i?'<div class="fline" style="margin-left:31px"></div>':''}<div class="fnode ${i?'':'trigger'}" style="width:100%"><span class="ico ${i?'':'accent'}">${icon(['mail','phone','map','file','msg'][i])}</span><div><small style="margin:0 0 2px;color:var(--accent);font-weight:600">${s.d}</small><b>${s.t}</b><small>${s.s}</small></div><div class="fnode-stat"><strong>${s.m[0]}</strong>${s.m[1]}</div></div>`).join('')}</div></div>
        <div class="card"><div class="card-head"><h3>Wszystkie sekwencje</h3></div><div class="list" data-keep style="padding-top:8px">${[['Lead z reklamy: fotowoltaika','5 kroków · 61% otwarć',1],['Lead: pompa ciepła','6 kroków · 58% otwarć',1],['Oferta otwarta, brak decyzji','3 kroki · 27% podpisuje',1],['Po montażu: polecenie znajomego','2 kroki · 41 poleceń',1],['Przegląd roczny instalacji','1 krok · 88% umawia',1],['Klient B2B: hala, magazyn','4 kroki · wersja robocza',0]].map((r,i)=>`<div class="row" style="padding:13px 18px"><span class="ico ${r[2]?'accent':''}">${icon('zap')}</span><div class="row-main"><b>${r[0]}</b><small>${r[1].replace(/ · (.*)/,' · <span data-z>$1</span>')}</small></div><button class="switch ${r[2]?'is-on':''}" data-sw aria-label="Włącz lub wyłącz"></button></div>`).join('')}</div></div>
      </div>`;
    el.addEventListener('click',e=>{const s=e.target.closest('[data-sw]');if(s){s.classList.toggle('is-on');toast(s.classList.contains('is-on')?'Sekwencja włączona':'Sekwencja wstrzymana','Zmiana obowiązuje od następnego leada','zap')}});
  },

  raporty:()=>`
    <div class="vhead"><div><h1>Raporty i ROI kampanii</h1><p>Ile kosztuje lead, audyt i umowa w każdym kanale. Dane z Meta, Google i TikToka łączone z umowami w CRM.</p></div><div class="vhead-actions"><div class="seg"><button>30 dni</button><button class="is-on">2026</button></div><button class="btn">${icon('file')}Eksport CSV</button></div></div>
    <div class="grid g-main">
      <div class="card"><div class="card-head"><div><h3>Przychód z umów wg źródła leada</h3><small>miesięcznie, 2026</small></div>${legend([{label:'Meta',color:'#1877f2'},{label:'Google',color:'#ea4335'},{label:'TikTok',color:'#e11d48'},{label:'Polecenia i SEO',color:D}])}</div><div class="card-pad">${bars({labels:['sty','lut','mar','kwi','maj','cze','lip','sie','wrz','paź'],groups:[{color:D,data:[120,130,160,170,190,180,170,160,210,240]},{color:'#e11d48',data:[0,0,40,70,90,90,80,80,150,190]},{color:'#ea4335',data:[140,150,210,260,290,270,240,230,330,370]},{color:'#1877f2',data:[150,180,280,380,450,420,350,330,600,840]}].map(g=>({...g,data:g.data.map(v=>v*1000)})),fmt:v=>v>=1e6?(v/1e6).toLocaleString('pl-PL')+' mln':v?(v/1000)+' tys.':'0'})}</div></div>
      <div class="card"><div class="card-head"><h3>Zwrot z reklam (ROAS)</h3><small>październik</small></div><div class="card-pad">${barList([{label:'Meta Lead Ads',v:46,color:'#1877f2'},{label:'Google Ads',v:31,color:'#ea4335'},{label:'TikTok',v:22,color:'#e11d48'}],v=>v+'×')}<div class="sec-title mt">Koszt pozyskania umowy</div>${barList([{label:'Meta Lead Ads',v:812,color:'#1877f2'},{label:'Google Ads',v:1240,color:'#ea4335'},{label:'TikTok',v:960,color:'#e11d48'}],v=>pln(v))}</div></div>
    </div>
    <div class="grid g2 mt">
      <div class="card"><div class="card-head"><h3>Lejek: reklama → umowa</h3><small>październik</small></div><div class="card-pad funnel">${[['Leady','412',100],['Kontakt','389',94],['Audyt','152',58],['Oferta','97',42],['Umowa','38',24]].map((r,i,a)=>`<div class="funnel-step"><span>${r[0]}</span><div><div class="funnel-bar" style="width:${r[2]}%;animation-delay:${i*90}ms;opacity:${1-i*.14}">${r[1]}</div></div><span class="muted right">${i?(Math.round(+r[1]/+a[i-1][1]*1000)/10).toLocaleString('pl-PL')+'%':''}</span></div>`).join('')}</div></div>
      <div class="card"><div class="card-head"><h3>Zamontowana moc</h3><small>kWp miesięcznie</small></div><div class="card-pad">${bars({labels:['sty','lut','mar','kwi','maj','cze','lip','sie','wrz','paź'],groups:[{color:D,data:[62,71,118,164,196,188,172,160,264,312]}],h:200})}</div></div>
    </div>`,
};

function balance(v){
  const w=760,h=180,pl=50,mx=Math.max(...v),mn=Math.min(...v),rng=mx-mn,zero=10+mx/rng*(h-36),bw=(w-pl)/v.length,b=Math.min(34,bw*.6);
  let g=`<line class="grid-line" x1="${pl}" x2="${w}" y1="${zero}" y2="${zero}" style="stroke:var(--ink-4)"/><text x="${pl-8}" y="${zero+4}" text-anchor="end">0</text><text x="${pl-8}" y="16" text-anchor="end">+${Math.round(mx/1000)} tys.</text><text x="${pl-8}" y="${h-26}" text-anchor="end">${Math.round(mn/1000)} tys.</text>`;
  v.forEach((x,i)=>{const hh=Math.abs(x)/rng*(h-36),X=pl+i*bw+(bw-b)/2;g+=`<rect x="${X}" y="${x>=0?zero-hh:zero}" width="${b}" height="${Math.max(1,hh)}" rx="4" fill="${x>=0?A:'var(--bad)'}" opacity="${x>=0?1:.75}"/><text x="${X+b/2}" y="${h-4}" text-anchor="middle">${i+1}. r</text>`});
  return `<svg class="chart" viewBox="0 0 ${w} ${h}">${g}</svg>`;
}
function score(v){const c=v>=80?D:v>=65?A:'#94a3b8';return `<span style="display:inline-flex;align-items:center;gap:8px"><span class="progress" style="width:46px"><i style="width:${v}%;background:${c}"></i></span><b class="num" style="color:${c}">${v}</b></span>`}

function openLead(l){
  drawer(`<div class="drawer-head">${avatar(l.name,'lg')}<div><h2>${esc(l.name)}</h2><small>${l.city} · ${src(l.src)}</small></div><button class="icon-btn" style="margin-left:auto" data-close aria-label="Zamknij">✕</button></div>
  <div class="drawer-body">
    <div style="display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap"><button class="btn btn-sm btn-primary">${icon('phone')}Zadzwoń</button><button class="btn btn-sm">${icon('cal')}Umów audyt</button><button class="btn btn-sm" onclick="location.hash='#/wyceny'">${icon('euro')}Wycena</button></div>
    <div class="card card-pad" style="display:flex;align-items:center;gap:14px;margin-bottom:18px;padding:14px"><div style="font-size:30px;font-weight:700;color:${l.score>=80?D:A}" class="num">${l.score}</div><div><b>Ocena leada</b><small class="muted" style="display:block">wysoki rachunek, własny dom, dach na południe, kontakt w godzinach pracy</small></div></div>
    <div class="sec-title">Odpowiedzi z formularza reklamy</div>
    <dl class="dl"><dt>Interesuje go</dt><dd>${l.prod}</dd><dt>Rachunek</dt><dd>${l.bill}</dd><dt>Dach</dt><dd>${l.roof}</dd><dt>Kiedy montaż</dt><dd>w ciągu 3 miesięcy</dd><dt>Handlowiec</dt><dd>${l.rep} <small class="muted">(przypisany automatycznie: region)</small></dd></dl>
    <div class="sec-title">Co się wydarzyło</div>
    <ul class="timeline"><li><b>Lead z formularza</b><small>${l.ago} temu · kampania „Jesień: prąd taniej o 90%”</small></li><li><b>Mail z wstępną wyceną wysłany automatycznie</b><small>otwarty po 6 min</small></li><li><b>SMS od handlowca</b><small>„Dzień dobry, tu ${l.rep.split(' ')[0]} z Voltra…”</small></li><li><b>Zadanie: telefon</b><small>przypisane do: ${l.rep}</small></li></ul>
  </div>`);
}

Panel.mount({
  theme:'dark',accent:A,accentInk:'#17130a',accentSoft:'#2a2410',home:'pulpit',newLabel:'Nowy lead',
  brand:{name:'Voltra Energia',sub:'Fotowoltaika · pompy ciepła',logo:'V'},
  user:{name:'Łukasz Bielecki',role:'Dyrektor sprzedaży'},
  nav:[
    {items:[{id:'pulpit',label:'Centrum sprzedaży',icon:'home'},{id:'leady',label:'Leady',icon:'target',count:23,hot:true},{id:'sprzedaz',label:'Lejek sprzedaży',icon:'layers'},{id:'wyceny',label:'Kalkulator ofert',icon:'euro'},{id:'poczta',label:'Poczta',icon:'mail',count:2}]},
    {group:'Realizacja',items:[{id:'montaze',label:'Montaże',icon:'truck'}]},
    {group:'Marketing',items:[{id:'sekwencje',label:'Automatyzacja maili',icon:'zap'},{id:'raporty',label:'Raporty i ROI',icon:'chart'}]},
  ],
  sideCard:`<div class="side-card"><b>Cel na październik</b><p>1,64 z 1,8 mln zł sprzedaży</p><div class="progress"><i style="width:91%"></i></div></div>`,
  views,
  after:{},
  searchable:[...leads.map(l=>({label:l.name+' · '+l.prod,av:l.name,hint:'Lead',go:'#/leady'})),...deals.map(d=>({label:d.name+' · '+pln(d.val),av:d.name,hint:'Szansa',go:'#/sprzedaz'}))],
  notifications:[{icon:'target',t:'Nowy gorący lead (92)',s:'Grzegorz Michalak · PV 9,6 kWp',time:'3 min',k:'warn'},{icon:'eye',t:'Henryk Lis otworzył ofertę',s:'3. raz w ciągu doby',time:'9 min',k:'accent'},{icon:'check',t:'Umowa podpisana',s:'Ewelina Sobczak · 46 900 zł',time:'1 godz.',k:'ok'},{icon:'truck',t:'Dostawa materiałów potwierdzona',s:'Solar-Tech · pon 2.11',time:'2 godz.',k:'info'}],
  live:[{t:'Nowy lead z Meta Lead Ads',s:'Kraków · PV 8 kWp · score 86',ic:'target'},{t:'Klient otworzył ofertę',s:'Monika Adamczyk · PV 7,2 kWp',ic:'eye'},{t:'Audyt zarezerwowany z SMS',s:'Robert Szewczyk · pt 14:00',ic:'cal'}],
  onNew:()=>{location.hash='#/leady'},
  ribbon:'Panel demonstracyjny 21 project · marka i dane fikcyjne <a href="/saas/voltra-energia/">Zobacz case study</a>',
});
})();
