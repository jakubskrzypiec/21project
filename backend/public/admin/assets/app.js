/* Panel 21 project — jeden plik, bez zależności. Widoki dobierane po adresie #/… */
'use strict';

/* ----------------------------- narzędzia ----------------------------- */

const $ = (sel, root = document) => root.querySelector(sel);
const view = $('#view');
const modal = $('#modal');

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function api(path, options = {}) {
  const res = await fetch(`/api/admin${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 401) { location.href = '/admin/login'; throw new Error('Sesja wygasła.'); }
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Błąd ${res.status}`);
  return data;
}

function toast(message, bad = false) {
  const el = document.createElement('div');
  if (bad) el.className = 'bad';
  el.textContent = message;
  $('#toast').append(el);
  setTimeout(() => el.remove(), 4500);
}

const fmtNum = (n) => new Intl.NumberFormat('pl-PL').format(n || 0);
const fmtMoney = (n, cur = 'PLN') =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('pl-PL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const fmtTime = (d) => new Date(d).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
const dayName = (d) => new Date(d).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
const relTime = (d) => {
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60) return 'przed chwilą';
  if (diff < 3600) return `${Math.round(diff / 60)} min temu`;
  if (diff < 86400) return `${Math.round(diff / 3600)} godz. temu`;
  return fmtDate(d);
};

const delta = (n) =>
  n === 0 ? '' : `<span class="delta ${n > 0 ? 'up' : 'down'}">${n > 0 ? '↑' : '↓'} ${Math.abs(n)}%</span>`;

function kpi(value, label, change) {
  return `<div class="card kpi"><div class="value">${value}${change !== undefined ? delta(change) : ''}</div>
    <div class="label">${label}</div></div>`;
}

function chart(points, key = 'views') {
  const max = Math.max(1, ...points.map((p) => p[key]));
  const bars = points
    .map((p) => `<div style="height:${Math.max(2, (p[key] / max) * 100)}%" title="${p.day}: ${p[key]}"></div>`)
    .join('');
  return `<div class="chart">${bars}</div>
    <div class="chartAxis"><span>${points[0]?.day || ''}</span><span>maks. ${max}</span><span>${points.at(-1)?.day || ''}</span></div>`;
}

function table(columns, rows, renderRow) {
  if (!rows.length) return '<div class="empty">Brak danych.</div>';
  return `<div class="tableWrap"><table><thead><tr>${columns.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(renderRow).join('')}</tbody></table></div>`;
}

/* --- Zaznaczanie i kasowanie hurtem ---------------------------------------
   Jeden mechanizm na cały panel. Widok rysuje pole wyboru przy każdej pozycji
   (`pick(id)`), owija listę w `pickGroup(...)`, a po wyrenderowaniu woła
   `bulkWire(...)` z funkcją kasującą pojedynczą pozycję. Kasujemy po kolei
   istniejącymi endpointami — bez nowych tras po stronie serwera. */

const pick = (id) => `<input type="checkbox" class="pick" data-pick="${id}" aria-label="Zaznacz pozycję">`;

/** Owija listę paskiem „zaznacz wszystko / usuń zaznaczone". */
function pickGroup(name, inner) {
  return `<div class="pickGroup" data-pick-group="${name}">
    <div class="bulk">
      <label class="bulk__all"><input type="checkbox" data-pick-all> Zaznacz wszystko</label>
      <span class="bulk__count">nic nie zaznaczono</span>
      <button class="btn ghost sm" data-pick-del disabled>Usuń zaznaczone</button>
    </div>
    ${inner}
  </div>`;
}

/** Podpina zachowanie paska. `del(id)` kasuje jedną pozycję. */
function bulkWire(name, del, { label = 'pozycji' } = {}) {
  const grupa = view.querySelector(`[data-pick-group="${name}"]`);
  if (!grupa) return;
  const all = grupa.querySelector('[data-pick-all]');
  const licznik = grupa.querySelector('.bulk__count');
  const btn = grupa.querySelector('[data-pick-del]');
  const boxes = [...grupa.querySelectorAll('[data-pick]')];
  if (!boxes.length) { grupa.querySelector('.bulk').hidden = true; return; }

  const wybrane = () => boxes.filter((b) => b.checked);
  const odswiez = () => {
    const n = wybrane().length;
    licznik.textContent = n ? `zaznaczono ${n} z ${boxes.length}` : 'nic nie zaznaczono';
    btn.disabled = n === 0;
    all.checked = n === boxes.length;
    all.indeterminate = n > 0 && n < boxes.length;
    boxes.forEach((b) => (b.closest('tr, .pickItem') || b).classList.toggle('picked', b.checked));
  };

  // Pole wyboru nie może otwierać wątku ani kartki, na której siedzi.
  boxes.forEach((b) => { b.onclick = (e) => { e.stopPropagation(); odswiez(); }; });
  all.onclick = () => { boxes.forEach((b) => { b.checked = all.checked; }); odswiez(); };

  btn.onclick = async () => {
    const ids = wybrane().map((b) => b.dataset.pick);
    if (!ids.length) return;
    if (!confirm(`Usunąć ${ids.length} ${label}? Tego nie da się cofnąć.`)) return;
    btn.disabled = true;
    btn.textContent = 'Usuwam…';
    let ok = 0;
    const bledy = [];
    for (const id of ids) {
      try { await del(id); ok += 1; } catch (err) { bledy.push(err.message); }
    }
    toast(bledy.length ? `Usunięto ${ok}, nie udało się ${bledy.length} (${bledy[0]})` : `Usunięto ${ok}.`,
      bledy.length > 0);
    render();
  };

  odswiez();
}

function openModal(title, html, onSubmit) {
  modal.innerHTML = `<h3>${esc(title)}</h3><form id="modalForm">${html}
    <div class="row end" style="margin-top:18px">
      <button type="button" class="btn ghost" id="modalCancel">Anuluj</button>
      <button type="submit" class="btn">Zapisz</button>
    </div></form>`;
  modal.showModal();
  $('#modalCancel').onclick = () => modal.close();
  $('#modalForm').onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
      await onSubmit(data);
      modal.close();
    } catch (err) {
      toast(err.message, true);
    }
  };
}

const STATUS_LABEL = {
  new: 'nowy', contacted: 'napisano', replied: 'odpisał', meeting: 'spotkanie',
  won: 'klient', lost: 'przegrany', rejected: 'wypisany',
};
const STATUS_CLASS = { new: 'new', replied: 'ok', meeting: 'ok', won: 'ok', lost: 'bad', rejected: 'bad', contacted: 'warn' };
const scoreTag = (s) =>
  `<span class="tag ${s >= 55 ? 'bad' : s >= 30 ? 'warn' : ''}">${s}/100</span>`;

/* ------------------------------- widoki ------------------------------- */

const views = {};

/* --- Pulpit --- */
views['/pulpit'] = async () => {
  view.innerHTML = '<div class="empty">Wczytywanie…</div>';
  const d = await api('/dashboard');
  const t = d.traffic;
  const g = d.integrations.google;

  const mailCard = d.mail?.error
    ? `<div class="notice warn">Poczta niepodłączona. <a href="#/ustawienia">Połącz konto Google</a>, żeby widzieć maile tutaj.</div>`
    : `<div class="row"><strong style="font-size:1.6rem">${fmtNum(d.mail.unread)}</strong>
       <span class="muted small">nieprzeczytanych z ${fmtNum(d.mail.total)} w skrzynce</span></div>
       <div class="row" style="margin-top:14px"><a class="btn ghost sm" href="#/poczta">Otwórz pocztę</a></div>`;

  view.innerHTML = `
    <h1 class="page">Pulpit</h1>
    <p class="sub">Ostatnie 30 dni · aktualizacja ${fmtDateTime(new Date())}</p>

    <div class="grid g4">
      ${kpi(fmtNum(t.visitors), 'użytkowników', t.change.visitors)}
      ${kpi(fmtNum(t.views), 'odsłon', t.change.views)}
      ${kpi(`${t.conversionRate}%`, `konwersji (${t.conversions} kontaktów)`)}
      ${kpi(`${d.live.online}`, 'osób na stronie teraz')}
    </div>

    <div class="card" style="margin-top:1px">
      <h3>Ruch dzień po dniu</h3>
      ${chart(d.timeseries)}
    </div>

    <div class="grid g3" style="margin-top:1px">
      <div class="card">
        <h3>Skrzynka</h3>
        ${mailCard}
      </div>
      <div class="card">
        <h3>Nadchodzące spotkania</h3>
        ${d.meetings.events.length
          ? d.meetings.events.map((e) => `<div class="event"><time>${fmtDateTime(e.starts_at)}</time>
              <div><strong>${esc(e.title)}</strong>${e.location ? `<br><span class="muted small">${esc(e.location)}</span>` : ''}</div></div>`).join('')
          : `<div class="empty">Nic nie zaplanowane. <a href="#/kalendarz">Dodaj spotkanie</a></div>`}
      </div>
      <div class="card">
        <h3>Projekty w toku (${d.projects.active})</h3>
        ${d.projects.list.length
          ? d.projects.list.map((p) => `<div class="event"><time>${p.deadline ? fmtDate(p.deadline) : '—'}</time>
              <div><a href="#/projekty/${p.id}"><strong>${esc(p.name)}</strong></a>
              <span class="tag">${esc(p.status)}</span></div></div>`).join('')
          : `<div class="empty">Brak aktywnych projektów. <a href="#/projekty">Dodaj projekt</a></div>`}
        ${d.projects.overdue ? `<div class="notice warn" style="margin-top:14px">${d.projects.overdue} projekt(y) po terminie.</div>` : ''}
      </div>
    </div>

    <div class="grid g2" style="margin-top:1px">
      <div class="card">
        <h3>Najgorętsze leady</h3>
        ${table(['Firma', 'Potencjał', 'Status'], d.leads.hot, (l) => `<tr>
          <td><a href="#/leady/${l.id}">${esc(l.company || l.domain || '—')}</a><br>
            <span class="muted small">${esc(l.email || l.domain || '')}</span></td>
          <td>${scoreTag(l.score)}</td>
          <td><span class="tag ${STATUS_CLASS[l.status] || ''}">${STATUS_LABEL[l.status] || l.status}</span></td></tr>`)}
        <p class="muted small" style="margin-top:14px">${d.leads.newThisWeek} nowych w tym tygodniu.</p>
      </div>
      <div class="card">
        <h3>Najczęściej odwiedzane strony</h3>
        ${table(['Adres', 'Odsłony', 'Śr. czas'], d.top.pages.slice(0, 8), (p) => `<tr>
          <td>${esc(p.path)}</td><td>${fmtNum(p.views)}</td><td>${p.avg_seconds}s</td></tr>`)}
      </div>
    </div>

    ${!g.connected ? `<div class="notice info" style="margin-top:18px">
      Konto Google nie jest połączone — poczta, kalendarz i wysyłka są nieaktywne.
      <a href="#/ustawienia">Połącz teraz</a>.</div>` : ''}
  `;

  if (!d.mail?.error && d.mail?.unread) {
    const b = $('#badgeMail');
    b.textContent = d.mail.unread;
    b.hidden = false;
  }

  odswiezajCo(120);
};

/* --- Ruch --- */
views['/ruch'] = async () => {
  const days = Number(new URLSearchParams(location.hash.split('?')[1]).get('days')) || 30;
  view.innerHTML = '<div class="empty">Wczytywanie…</div>';
  const [s, ts, b, live] = await Promise.all([
    api(`/analytics/summary?days=${days}`),
    api(`/analytics/timeseries?days=${days}`),
    api(`/analytics/breakdown?days=${days}`),
    api('/analytics/live?minutes=30'),
  ]);

  const list = (rows, keyName, valueName, label) =>
    table([label, 'Odsłony'], rows, (r) => `<tr><td>${esc(r[keyName] ?? r.name ?? '—')}</td><td>${fmtNum(r[valueName] ?? r.views ?? r.n)}</td></tr>`);

  view.innerHTML = `
    <h1 class="page">Ruch na stronie</h1>
    <p class="sub">Dane zbierane własnym licznikiem — bez ciasteczek i bez zewnętrznych narzędzi.</p>

    <div class="row" style="margin-bottom:18px">
      ${[7, 30, 90, 365].map((d) => `<a class="btn ${d === days ? '' : 'ghost'} sm" href="#/ruch?days=${d}">${d} dni</a>`).join('')}
    </div>

    <div class="grid g4">
      ${kpi(fmtNum(s.visitors), 'użytkowników', s.change.visitors)}
      ${kpi(fmtNum(s.views), 'odsłon', s.change.views)}
      ${kpi(fmtNum(s.sessions), 'sesji')}
      ${kpi(`${s.avgSeconds}s`, 'średni czas na stronie')}
      ${kpi(`${s.bounceRate}%`, 'odrzuceń (jedna podstrona)')}
      ${kpi(`${s.conversionRate}%`, `konwersji — ${s.conversions} kontaktów`)}
    </div>

    <div class="card" style="margin-top:1px"><h3>Odsłony dzień po dniu</h3>${chart(ts)}</div>

    <div class="grid g2" style="margin-top:1px">
      <div class="card"><h3>Podstrony</h3>
        ${table(['Adres', 'Odsłony', 'Sesje', 'Śr. czas'], b.pages, (p) => `<tr>
          <td>${esc(p.path)}</td><td>${fmtNum(p.views)}</td><td>${fmtNum(p.sessions)}</td><td>${p.avg_seconds}s</td></tr>`)}
      </div>
      <div class="card"><h3>Skąd przychodzą</h3>${list(b.referrers, 'source', 'views', 'Źródło')}</div>
      <div class="card"><h3>Urządzenia</h3>${list(b.devices, 'name', 'views', 'Typ')}</div>
      <div class="card"><h3>Przeglądarki</h3>${list(b.browsers, 'name', 'views', 'Przeglądarka')}</div>
      <div class="card"><h3>Zdarzenia (kliknięcia w kontakt)</h3>${list(b.events, 'name', 'n', 'Zdarzenie')}</div>
      <div class="card"><h3>Kampanie UTM</h3>
        ${b.campaigns.length ? table(['Kampania', 'Źródło', 'Odsłony'], b.campaigns, (c) =>
          `<tr><td>${esc(c.campaign)}</td><td>${esc(c.source)}</td><td>${fmtNum(c.views)}</td></tr>`)
        : '<div class="empty">Brak ruchu z oznaczonych kampanii.</div>'}
      </div>
    </div>

    <h2 class="sec">Na żywo — ostatnie 30 minut (${live.online} os.)</h2>
    <div class="card">
      ${table(['Kiedy', 'Podstrona', 'Źródło', 'Urządzenie'], live.recent, (r) => `<tr>
        <td>${relTime(r.ts)}</td><td>${esc(r.path)}</td>
        <td>${esc(r.referrer_host || 'bezpośrednio')}</td><td>${esc(r.device)}</td></tr>`)}
    </div>`;

  odswiezajCo(120);
};

/* --- Poczta --- */
const MAIL_VIEWS = [
  ['klienci', 'Od ludzi'],
  ['nieprzeczytane', 'Nieprzeczytane'],
  ['wazne', 'Ważne'],
  ['wszystko', 'Cała skrzynka'],
  ['promocje', 'Promocje'],
];

views['/poczta'] = async () => {
  view.innerHTML = '<div class="empty">Wczytywanie skrzynki…</div>';
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const q = params.get('q') || '';
  const mailView = params.get('view') || 'klienci';
  let data;
  try {
    data = await api(`/mail/threads?limit=30&view=${encodeURIComponent(mailView)}${q ? `&q=${encodeURIComponent(q)}` : ''}`);
  } catch (err) {
    view.innerHTML = `<h1 class="page">Poczta</h1>
      <div class="notice warn">${esc(err.message)}</div>
      <a class="btn" href="#/ustawienia">Przejdź do ustawień</a>`;
    return;
  }

  const SUBS = {
    klienci: 'Skrzynka bez promocji, powiadomień i automatów — zostaje korespondencja od ludzi.',
    nieprzeczytane: 'Wszystko, czego jeszcze nie otworzyłeś.',
    wazne: 'Wątki oznaczone gwiazdką — Twoja lista rzeczy do załatwienia.',
    wszystko: 'Pełna skrzynka odbiorcza, łącznie z tym, co odfiltrowuje widok „Od ludzi".',
    promocje: 'To, co Gmail uznał za promocje i newslettery.',
  };

  view.innerHTML = `
    <h1 class="page">Poczta</h1>
    <p class="sub">${q ? `Wyniki wyszukiwania: <strong>${esc(q)}</strong>` : SUBS[mailView] || ''}</p>
    <div class="tabs">
      ${MAIL_VIEWS.map(([key, label]) =>
        `<a href="#/poczta?view=${key}" class="${!q && key === mailView ? 'active' : ''}">${label}</a>`).join('')}
    </div>
    <form class="row" id="mailSearch" style="margin-bottom:18px">
      <input class="inp" name="q" style="max-width:22rem" placeholder="Szukaj (np. from:klient@firma.pl)" value="${esc(q)}">
      <button class="btn sm" type="submit">Szukaj</button>
      ${q ? `<a class="btn ghost sm" href="#/poczta?view=klienci">Wyczyść</a>` : ''}
      <button class="btn ghost sm" type="button" id="newMail">Nowa wiadomość</button>
      <button class="btn ghost sm" type="button" id="btnRefreshMail">Odśwież</button>
      <span class="small muted" id="mailStamp">sprawdzone ${new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</span>
    </form>
    <div class="mailLayout">
      ${pickGroup('watki', `<div class="card" style="padding:0">
        <div class="threadList" id="threads">
          ${data.threads.length ? data.threads.map(threadRow).join('') : pustaSkrzynka(data, mailView, q)}
        </div>
      </div>`)}
      <div class="card" id="threadView"><div class="empty">Wybierz wiadomość z listy.</div></div>
    </div>`;

  $('#mailSearch').onsubmit = (e) => {
    e.preventDefault();
    const value = e.target.q.value.trim();
    location.hash = value ? `#/poczta?q=${encodeURIComponent(value)}` : '#/poczta?view=klienci';
    render();
  };
  $('#newMail').onclick = () => composeModal();
  bulkWire('watki', (id) => api(`/mail/threads/${id}`, { method: 'DELETE' }), { label: 'wątków' });
  $('#btnRefreshMail').onclick = () => render();
  // Nie podmieniamy widoku, gdy czytasz wątek albo masz coś zaznaczone —
  // odświeżenie skasowałoby otwartą wiadomość spod palców.
  odswiezajCo(60, () => !$('#threadView')?.dataset.open && !view.querySelector('[data-pick]:checked'));
  view.querySelectorAll('.threadItem').forEach((el) => {
    el.onclick = (e) => {
      if (e.target.closest('[data-star], .pick')) return;  // gwiazdka i zaznaczanie nie otwierają wątku
      view.querySelectorAll('.threadItem').forEach((x) => x.classList.remove('active'));
      el.classList.add('active');
      openThread(el.dataset.id);
    };
  });

  view.querySelectorAll('[data-star]').forEach((b) => {
    b.onclick = async (e) => {
      e.stopPropagation();
      const on = b.dataset.starred !== '1';
      b.dataset.starred = on ? '1' : '0';
      b.textContent = on ? '★' : '☆';
      b.classList.toggle('on', on);
      try {
        await api(`/mail/threads/${b.dataset.star}/star`, { method: 'POST', body: { starred: on } });
      } catch (err) {
        toast(err.message, true);
      }
    };
  });
};

/** Pusta lista bez wyjaśnienia to najgorszy możliwy komunikat — mówimy, z którego
 *  konta czytamy i co najczęściej jest przyczyną. */
function pustaSkrzynka(data, mailView, q) {
  if (q) return `<div class="empty">Nic nie pasuje do „${esc(q)}".</div>`;
  const konto = data.account ? `<strong>${esc(data.account)}</strong>` : 'nieznanego konta';
  return `<div class="empty" style="text-align:left;padding:18px 16px;line-height:1.6">
    Czytam skrzynkę ${konto} i nic tu nie ma.
    ${mailView === 'wszystko' ? `
      <br><span class="small muted">Jeśli w Gmailu maile są, to znaczy, że panel jest połączony z inną skrzynką
      niż ta, którą oglądasz. Sprawdź adres w <a href="#/ustawienia">Ustawieniach</a>.</span>`
    : `<br><span class="small muted">Widok „Od ludzi" odsiewa promocje, powiadomienia i automaty.
      Zajrzyj do <a href="#/poczta?view=wszystko">Całej skrzynki</a> — jeśli tam są, to kwestia filtra.
      Jeśli i tam pusto, panel czyta inną skrzynkę niż myślisz: adres jest w
      <a href="#/ustawienia">Ustawieniach</a>.</span>`}
  </div>`;
}

function threadRow(t) {
  return `<div class="threadItem pickItem ${t.unread ? 'unread' : ''}" data-id="${t.id}">
    <div class="row" style="justify-content:space-between;flex-wrap:nowrap">
      <span class="row" style="gap:8px;flex-wrap:nowrap">${pick(t.id)}
        <strong class="small">${esc(nameOf(t.from))}</strong></span>
      <span class="row" style="gap:8px;flex-wrap:nowrap">
        <span class="muted small">${relTime(t.internalDate)}</span>
        <button class="star ${t.starred ? 'on' : ''}" data-star="${t.id}" data-starred="${t.starred ? 1 : 0}"
                title="Oznacz jako ważne">${t.starred ? '★' : '☆'}</button>
      </span>
    </div>
    <div class="t"><strong>${esc(t.subject)}</strong></div>
    ${t.known ? `<a class="tag ok" href="#/leady/${t.known.leadId}">${esc(t.known.label)}</a>` : ''}
    <div class="muted small">${esc(String(t.snippet || '').slice(0, 90))}</div>
  </div>`;
}

const nameOf = (from = '') => from.replace(/<.*>/, '').replace(/"/g, '').trim() || from;
const addrOf = (from = '') => (from.match(/<([^>]+)>/) || [null, from])[1];

async function openThread(id) {
  const box = $('#threadView');
  box.dataset.open = id;
  box.innerHTML = '<div class="empty">Wczytywanie…</div>';
  const t = await api(`/mail/threads/${id}`);
  api(`/mail/threads/${id}/read`, { method: 'POST' }).catch(() => {});
  const last = t.messages.at(-1);

  box.innerHTML = `
    <div class="row" style="justify-content:space-between;margin-bottom:.75rem">
      <h3 style="margin:0;text-transform:none;letter-spacing:0;font-size:1rem;color:var(--ink)">${esc(last.subject || '(bez tematu)')}</h3>
      <div class="row">
        <button class="btn ghost sm" id="btnSummary">Streść AI</button>
        <button class="btn ghost sm" id="btnArchive">Archiwizuj</button>
        <button class="btn ghost sm" id="btnLead">Zapisz jako lead</button>
      </div>
    </div>
    <div id="summaryBox"></div>
    ${t.messages.map((m) => `<div class="msg">
      <div class="row" style="justify-content:space-between">
        <strong class="small">${esc(m.from)}</strong><span class="muted small">${fmtDateTime(m.internalDate)}</span>
      </div>
      <pre>${esc(m.body || '(pusta treść)')}</pre>
      ${m.attachments.length ? `<div class="muted small" style="margin-top:8px">Załączniki: ${m.attachments.map((a) => esc(a.filename)).join(', ')}</div>` : ''}
    </div>`).join('')}
    <form id="replyForm">
      <label class="f">Odpowiedz
        <textarea name="body" required placeholder="Twoja odpowiedź…"></textarea>
      </label>
      <div class="row end"><button class="btn" type="submit">Wyślij odpowiedź</button></div>
    </form>`;

  $('#replyForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    try {
      await api(`/mail/threads/${id}/reply`, { method: 'POST', body: { body: e.target.body.value } });
      toast('Odpowiedź wysłana.');
      openThread(id);
    } catch (err) { toast(err.message, true); btn.disabled = false; }
  };
  $('#btnArchive').onclick = async () => {
    await api(`/mail/threads/${id}/archive`, { method: 'POST' });
    toast('Zarchiwizowano.');
    render();
  };
  $('#btnSummary').onclick = async (e) => {
    e.target.disabled = true;
    try {
      const { summary } = await api(`/mail/threads/${id}/summary`, { method: 'POST' });
      $('#summaryBox').innerHTML = `<div class="notice info"><pre style="margin:0;white-space:pre-wrap;font:inherit">${esc(summary)}</pre></div>`;
    } catch (err) { toast(err.message, true); }
    e.target.disabled = false;
  };
  $('#btnLead').onclick = async () => {
    const first = t.messages[0];
    try {
      await api('/leads', { method: 'POST', body: {
        source: 'manual', name: nameOf(first.from), email: addrOf(first.from),
        message: String(first.body || '').slice(0, 2000), score: 50,
      }});
      toast('Zapisano jako lead.');
    } catch (err) { toast(err.message, true); }
  };
}

function composeModal(prefill = {}) {
  openModal('Nowa wiadomość', `
    <label class="f">Do<input name="to" required value="${esc(prefill.to || '')}"></label>
    <label class="f">Temat<input name="subject" required value="${esc(prefill.subject || '')}"></label>
    <label class="f">Treść<textarea name="body" required>${esc(prefill.body || '')}</textarea></label>`,
    async (data) => {
      await api('/mail/send', { method: 'POST', body: data });
      toast('Wysłano.');
    });
}

/* --- Kalendarz --- */
views['/kalendarz'] = async () => {
  view.innerHTML = '<div class="empty">Wczytywanie…</div>';
  const from = new Date(); from.setHours(0, 0, 0, 0);
  const to = new Date(Date.now() + 45 * 86400000);
  const { events, googleError } = await api(`/calendar?from=${from.toISOString()}&to=${to.toISOString()}`);

  const byDay = {};
  for (const e of events) (byDay[String(e.starts_at).slice(0, 10)] ||= []).push(e);

  view.innerHTML = `
    <div class="row" style="justify-content:space-between;align-items:flex-start">
      <div><h1 class="page">Kalendarz spotkań</h1>
      <p class="sub">Spotkania z panelu i wydarzenia z Google Calendar w jednej osi czasu.</p></div>
      <div class="row">
        <button class="btn ghost sm" id="btnSlots">Wolne terminy</button>
        <button class="btn" id="btnNewMeeting">Nowe spotkanie</button>
      </div>
    </div>
    ${googleError === 'not_connected'
      ? '<div class="notice warn">Google Calendar niepodłączony — widzisz tylko spotkania zapisane w panelu. <a href="#/ustawienia">Połącz</a>.</div>'
      : googleError ? `<div class="notice bad">Google Calendar: ${esc(googleError)}</div>` : ''}
    <div id="slotsBox"></div>
    ${Object.keys(byDay).length
      ? pickGroup('spotkania', Object.entries(byDay).map(([day, list]) => `<div class="day">
          <h4>${dayName(day)}</h4>
          ${list.map((e) => `<div class="event pickItem">
            ${e.id && e.source === 'panel' ? pick(e.id) : '<span class="pick pick--brak" title="Wydarzenie z Google — usuń je w Kalendarzu Google"></span>'}
            <time>${e.allDay ? 'cały dzień' : fmtTime(e.starts_at)}</time>
            <div style="flex:1">
              <strong>${esc(e.title)}</strong>
              <span class="tag">${e.source === 'google' ? 'Google' : 'panel'}</span>
              ${e.location ? `<br><span class="muted small">${esc(e.location)}</span>` : ''}
              ${e.attendee_email ? `<br><span class="muted small">${esc(e.attendee_email)}</span>` : ''}
              ${e.notes ? `<br><span class="muted small">${esc(String(e.notes).slice(0, 160))}</span>` : ''}
            </div>
            ${e.id && e.source === 'panel' ? `<button class="btn ghost sm" data-del="${e.id}">Usuń</button>` : ''}
          </div>`).join('')}
        </div>`).join(''))
      : '<div class="empty">Brak spotkań w najbliższych 45 dniach.</div>'}`;

  $('#btnNewMeeting').onclick = () => meetingModal();
  bulkWire('spotkania', (id) => api(`/calendar/${id}`, { method: 'DELETE' }), { label: 'spotkań' });
  $('#btnSlots').onclick = async () => {
    const { slots } = await api('/calendar/free-slots');
    $('#slotsBox').innerHTML = `<div class="card" style="margin-bottom:18px"><h3>Wolne okna (najbliższe 2 tygodnie, dni robocze 9–17)</h3>
      <div class="row">${slots.slice(0, 18).map((s) =>
        `<span class="tag">${fmtDateTime(s.starts_at)}</span>`).join('') || 'Brak wolnych okien.'}</div></div>`;
  };
  view.querySelectorAll('[data-del]').forEach((b) => {
    b.onclick = async () => {
      if (!confirm('Usunąć to spotkanie?')) return;
      await api(`/calendar/${b.dataset.del}`, { method: 'DELETE' });
      toast('Usunięto.');
      render();
    };
  });
};

function meetingModal(prefill = {}) {
  const start = prefill.starts_at || new Date(Date.now() + 86400000).toISOString().slice(0, 16);
  openModal('Nowe spotkanie', `
    <label class="f">Tytuł<input name="title" required value="${esc(prefill.title || 'Rozmowa o projekcie')}"></label>
    <label class="f">Start<input type="datetime-local" name="starts_at" required value="${start}"></label>
    <label class="f">Czas trwania
      <select name="minutes"><option value="30">30 minut</option><option value="60" selected>1 godzina</option>
      <option value="90">1,5 godziny</option></select></label>
    <label class="f">Miejsce / link<input name="location" placeholder="Google Meet, biuro, telefon"></label>
    <label class="f">E-mail uczestnika (dostanie zaproszenie)<input name="attendee_email" type="email" value="${esc(prefill.attendee_email || '')}"></label>
    <label class="f">Notatki<textarea name="notes" style="min-height:5rem"></textarea></label>`,
    async (data) => {
      const startsAt = new Date(data.starts_at).toISOString();
      await api('/calendar', { method: 'POST', body: {
        title: data.title, starts_at: startsAt,
        ends_at: new Date(new Date(startsAt).getTime() + Number(data.minutes) * 60000).toISOString(),
        location: data.location, attendee_email: data.attendee_email, notes: data.notes,
        lead_id: prefill.lead_id || null, project_id: prefill.project_id || null,
      }});
      toast('Spotkanie dodane.');
      render();
    });
}

/* --- Projekty --- */
views['/projekty'] = async () => {
  view.innerHTML = '<div class="empty">Wczytywanie…</div>';
  const [{ projects }, summary] = await Promise.all([api('/projects'), api('/projects/summary')]);

  view.innerHTML = `
    <div class="row" style="justify-content:space-between;align-items:flex-start">
      <div><h1 class="page">Projekty</h1><p class="sub">Wszystkie zlecenia, etapy i terminy.</p></div>
      <button class="btn" id="btnNewProject">Nowy projekt</button>
    </div>
    <div class="grid g4">
      ${kpi(fmtNum(projects.filter((p) => !['live', 'wstrzymany'].includes(p.status)).length), 'w toku')}
      ${kpi(fmtMoney(summary.money.budget), 'wartość zleceń')}
      ${kpi(fmtMoney(summary.money.paid), 'zapłacone')}
      ${kpi(fmtNum(summary.overdue), 'po terminie')}
    </div>
    ${pickGroup('projekty', `<div class="grid g2" style="margin-top:1px">
      ${projects.length ? projects.map((p) => `<div class="card pickItem">
        <div class="row" style="justify-content:space-between">
          <span class="row" style="gap:8px">${pick(p.id)}
            <a href="#/projekty/${p.id}"><strong>${esc(p.name)}</strong></a></span>
          <span class="tag ${p.status === 'live' ? 'ok' : p.status === 'wstrzymany' ? 'bad' : ''}">${esc(p.status)}</span>
        </div>
        <p class="muted small" style="margin:.35rem 0">${esc(p.client || 'bez klienta')} ·
          ${p.deadline ? `termin ${fmtDate(p.deadline)}` : 'bez terminu'} ·
          ${p.budget ? fmtMoney(p.budget, p.currency) : 'brak budżetu'}</p>
        <div class="bar"><i style="width:${p.progress}%"></i></div>
        <p class="muted small" style="margin:.35rem 0 0">${p.tasksDone}/${p.tasksTotal} zadań · ${p.progress}%</p>
      </div>`).join('') : '<div class="empty">Nie masz jeszcze żadnego projektu.</div>'}
    </div>`)}`;

  $('#btnNewProject').onclick = () => projectModal();
  bulkWire('projekty', (id) => api(`/projects/${id}`, { method: 'DELETE' }), { label: 'projektów' });
};

function projectModal() {
  openModal('Nowy projekt', `
    <label class="f">Nazwa<input name="name" required placeholder="np. Strona dla Kowalski Wnętrza"></label>
    <label class="f">Klient<input name="client"></label>
    <label class="f">Etap<select name="status">
      ${['brief', 'projekt', 'wdrozenie', 'testy', 'live', 'wstrzymany'].map((s) => `<option>${s}</option>`).join('')}
    </select></label>
    <label class="f">Budżet (zł)<input name="budget" type="number" step="100"></label>
    <label class="f">Termin<input name="deadline" type="date"></label>
    <label class="f">Adres strony<input name="url" placeholder="https://"></label>
    <label class="f">Opis<textarea name="description" style="min-height:5rem"></textarea></label>`,
    async (data) => {
      const { project } = await api('/projects', { method: 'POST', body: { ...data, budget: data.budget ? Number(data.budget) : null } });
      toast('Projekt utworzony z listą kroków.');
      location.hash = `#/projekty/${project.id}`;
      render();
    });
}

views['/projekty/:id'] = async (id) => {
  view.innerHTML = '<div class="empty">Wczytywanie…</div>';
  const { project: p, tasks, notes, meetings } = await api(`/projects/${id}`);

  view.innerHTML = `
    <a class="small muted" href="#/projekty">← wszystkie projekty</a>
    <div class="row" style="justify-content:space-between;align-items:flex-start;margin-top:.5rem">
      <div><h1 class="page">${esc(p.name)}</h1>
        <p class="sub">${esc(p.client || 'bez klienta')} · ${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.url)}</a>` : 'brak adresu'}</p></div>
      <div class="row">
        <select class="inp" id="statusSel" style="width:auto;margin:0">
          ${['brief', 'projekt', 'wdrozenie', 'testy', 'live', 'wstrzymany'].map((s) =>
            `<option ${s === p.status ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
        <button class="btn ghost sm" id="btnMeeting">Spotkanie</button>
        <button class="btn danger sm" id="btnDelete">Usuń</button>
      </div>
    </div>

    <div class="grid g4">
      ${kpi(`${p.progress}%`, `postęp — ${p.tasksDone}/${p.tasksTotal} zadań`)}
      ${kpi(p.budget ? fmtMoney(p.budget, p.currency) : '—', 'budżet')}
      ${kpi(p.paid ? fmtMoney(p.paid, p.currency) : '0 zł', 'zapłacone')}
      ${kpi(p.deadline ? fmtDate(p.deadline) : '—', 'termin')}
    </div>

    <div class="grid g2" style="margin-top:1px">
      <div class="card">
        <h3>Zadania</h3>
        <div id="taskList">${tasks.map((t) => `<label class="row" style="padding:.35rem 0;gap:.6rem">
          <input type="checkbox" data-task="${t.id}" ${t.done ? 'checked' : ''}>
          <span style="${t.done ? 'text-decoration:line-through;color:var(--ink-3)' : ''}">${esc(t.title)}</span>
          <button class="btn ghost sm" style="margin-left:auto" data-deltask="${t.id}">×</button>
        </label>`).join('') || '<div class="empty">Brak zadań.</div>'}</div>
        <form class="row" id="taskForm" style="margin-top:14px">
          <input class="inp" name="title" style="flex:1;margin:0" placeholder="Nowe zadanie" required>
          <button class="btn sm">Dodaj</button>
        </form>
      </div>
      <div class="card">
        <h3>Notatki</h3>
        <div>${notes.map((n) => `<div class="msg"><div class="muted small">${fmtDateTime(n.created_at)}</div>
          <pre>${esc(n.body)}</pre></div>`).join('') || '<div class="empty">Brak notatek.</div>'}</div>
        <form id="noteForm" style="margin-top:8px">
          <textarea class="inp" name="body" style="min-height:5rem" placeholder="Ustalenia, hasła, uwagi klienta…" required></textarea>
          <div class="row end" style="margin-top:8px"><button class="btn sm">Zapisz notatkę</button></div>
        </form>
      </div>
    </div>

    ${meetings.length ? `<h2 class="sec">Spotkania</h2><div class="card">
      ${meetings.map((m) => `<div class="event"><time>${fmtDateTime(m.starts_at)}</time>
        <div><strong>${esc(m.title)}</strong></div></div>`).join('')}</div>` : ''}

    ${p.description ? `<h2 class="sec">Opis</h2><div class="card"><pre style="white-space:pre-wrap;font:inherit;margin:0">${esc(p.description)}</pre></div>` : ''}`;

  $('#statusSel').onchange = async (e) => {
    await api(`/projects/${id}`, { method: 'PATCH', body: { status: e.target.value } });
    toast('Etap zmieniony.');
  };
  $('#btnDelete').onclick = async () => {
    if (!confirm(`Usunąć projekt „${p.name}" wraz z zadaniami i notatkami?`)) return;
    await api(`/projects/${id}`, { method: 'DELETE' });
    location.hash = '#/projekty';
    render();
  };
  $('#btnMeeting').onclick = () => meetingModal({ title: `Spotkanie — ${p.name}`, project_id: p.id });
  $('#taskForm').onsubmit = async (e) => {
    e.preventDefault();
    await api(`/projects/${id}/tasks`, { method: 'POST', body: { title: e.target.title.value } });
    render();
  };
  $('#noteForm').onsubmit = async (e) => {
    e.preventDefault();
    await api(`/projects/${id}/notes`, { method: 'POST', body: { body: e.target.body.value } });
    render();
  };
  view.querySelectorAll('[data-task]').forEach((cb) => {
    cb.onchange = async () => {
      await api(`/projects/${id}/tasks/${cb.dataset.task}`, { method: 'PATCH', body: { done: cb.checked } });
      render();
    };
  });
  view.querySelectorAll('[data-deltask]').forEach((b) => {
    b.onclick = async (e) => {
      e.preventDefault();
      await api(`/projects/${id}/tasks/${b.dataset.deltask}`, { method: 'DELETE' });
      render();
    };
  });
};

/* --- Leady --- */
views['/leady'] = async () => {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const status = params.get('status') || '';
  const q = params.get('q') || '';
  view.innerHTML = '<div class="empty">Wczytywanie…</div>';
  const { leads, total } = await api(`/leads?${new URLSearchParams({ status, q, limit: 200 })}`);

  view.innerHTML = `
    <div class="row" style="justify-content:space-between;align-items:flex-start">
      <div><h1 class="page">Leady</h1><p class="sub">${total} kontaktów — z formularza, z poczty i dodanych ręcznie.</p></div>
      <div class="row">
        <button class="btn" id="btnNewLead">Dodaj ręcznie</button>
      </div>
    </div>
    <form class="row" id="leadFilter" style="margin-bottom:18px">
      <input class="inp" name="q" style="max-width:18rem;margin:0" placeholder="Szukaj firmy, domeny, maila" value="${esc(q)}">
      <select class="inp" name="status" style="width:auto;margin:0">
        <option value="">wszystkie statusy</option>
        ${Object.entries(STATUS_LABEL).map(([k, v]) => `<option value="${k}" ${k === status ? 'selected' : ''}>${v}</option>`).join('')}
      </select>
      <button class="btn sm">Filtruj</button>
    </form>
    ${pickGroup('leady', `<div class="card" style="padding:0">
      ${table(['', 'Firma', 'Kontakt', 'Potencjał', 'Status', 'Źródło', 'Dodany', ''], leads, (l) => `<tr>
        <td>${pick(l.id)}</td>
        <td><a href="#/leady/${l.id}"><strong>${esc(l.company || l.name || l.domain || '—')}</strong></a>
          ${l.domain ? `<br><span class="muted small">${esc(l.domain)}</span>` : ''}</td>
        <td class="small">${esc(l.email || '')}${l.phone ? `<br>${esc(l.phone)}` : ''}</td>
        <td>${scoreTag(l.score)}</td>
        <td><span class="tag ${STATUS_CLASS[l.status] || ''}">${STATUS_LABEL[l.status] || l.status}</span></td>
        <td class="small muted">${esc(l.source)}</td>
        <td class="small muted">${fmtDate(l.created_at)}</td>
        <td><button class="btn ghost sm" data-dellead="${l.id}">Usuń</button></td></tr>`)}
    </div>`)}`;

  bulkWire('leady', (id) => api(`/leads/${id}`, { method: 'DELETE' }), { label: 'leadów' });
  view.querySelectorAll('[data-dellead]').forEach((b) => {
    b.onclick = async () => {
      if (!confirm('Usunąć tego leada?')) return;
      await api(`/leads/${b.dataset.dellead}`, { method: 'DELETE' });
      toast('Usunięto.');
      render();
    };
  });

  $('#leadFilter').onsubmit = (e) => {
    e.preventDefault();
    location.hash = `#/leady?${new URLSearchParams({ q: e.target.q.value, status: e.target.status.value })}`;
    render();
  };
  $('#btnNewLead').onclick = () => openModal('Nowy lead', `
    <label class="f">Firma<input name="company"></label>
    <label class="f">Osoba<input name="name"></label>
    <label class="f">E-mail<input name="email" type="email"></label>
    <label class="f">Telefon<input name="phone"></label>
    <label class="f">Strona<input name="website" placeholder="https://"></label>
    <label class="f">Miasto<input name="city"></label>
    <label class="f">Notatka<textarea name="notes" style="min-height:4rem"></textarea></label>`,
    async (data) => { await api('/leads', { method: 'POST', body: data }); toast('Lead dodany.'); render(); });
};

views['/leady/:id'] = async (id) => {
  view.innerHTML = '<div class="empty">Wczytywanie…</div>';
  const { lead: l, messages, meetings } = await api(`/leads/${id}`);
  const a = l.audit || {};

  view.innerHTML = `
    <a class="small muted" href="#/leady">← wszystkie leady</a>
    <div class="row" style="justify-content:space-between;align-items:flex-start;margin-top:.5rem">
      <div>
        <h1 class="page">${esc(l.company || l.name || l.domain || 'Lead')}</h1>
        <p class="sub">${l.website ? `<a href="${esc(l.website)}" target="_blank" rel="noopener">${esc(l.website)}</a> · ` : ''}
          ${esc(l.email || 'brak maila')} ${l.phone ? `· ${esc(l.phone)}` : ''}</p>
      </div>
      <div class="row">
        <select class="inp" id="statusSel" style="width:auto;margin:0">
          ${Object.entries(STATUS_LABEL).map(([k, v]) => `<option value="${k}" ${k === l.status ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
        <button class="btn ghost sm" id="btnMeeting">Spotkanie</button>
        <button class="btn sm" id="btnWrite">Napisz wiadomość</button>
      </div>
    </div>

    ${l.unsubscribed ? '<div class="notice bad">Ten kontakt wypisał się z wiadomości — nie wysyłaj mu nic więcej.</div>' : ''}

    <div class="grid g2">
      <div class="card">
        <h3>Analiza strony — ${l.score}/100 potencjału</h3>
        ${a.reasons?.length
          ? `<ul style="margin:0;padding-left:1.1rem;line-height:1.75;font-size:.87rem">
              ${a.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>`
          : '<div class="empty">Brak automatycznej analizy — dodaj adres strony i uruchom skanowanie.</div>'}
        ${a.tech?.length ? `<p class="muted small" style="margin-top:14px">Technologie: ${a.tech.map((t) => `<span class="tag">${esc(t)}</span>`).join(' ')}</p>` : ''}
        ${a.builtBy ? `<p class="muted small">Stronę robił: <strong>${esc(a.builtBy)}</strong></p>` : ''}
      </div>
      <div class="card">
        <h3>Dane</h3>
        <table><tbody>
          <tr><td class="muted">Źródło</td><td>${esc(l.source)}</td></tr>
          <tr><td class="muted">Dodany</td><td>${fmtDateTime(l.created_at)}</td></tr>
          <tr><td class="muted">Ostatni kontakt</td><td>${l.last_contacted_at ? fmtDateTime(l.last_contacted_at) : 'nigdy'}</td></tr>
          <tr><td class="muted">Miasto</td><td>${esc(l.city || '—')}</td></tr>
          <tr><td class="muted">Branża</td><td>${esc(l.industry || '—')}</td></tr>
        </tbody></table>
        ${l.message ? `<h3 style="margin-top:18px">Wiadomość z formularza</h3><pre style="white-space:pre-wrap;font:inherit;font-size:.87rem">${esc(l.message)}</pre>` : ''}
        <form id="notesForm" style="margin-top:18px">
          <label class="f">Notatki<textarea name="notes" style="min-height:5rem">${esc(l.notes || '')}</textarea></label>
          <div class="row end"><button class="btn sm">Zapisz</button></div>
        </form>
      </div>
    </div>

    <h2 class="sec">Wiadomości do tego leada</h2>
    <div class="card" style="padding:0">
      ${table(['Kiedy', 'Temat', 'Status', ''], messages, (m) => `<tr>
        <td class="small muted">${fmtDateTime(m.created_at)}</td>
        <td>${esc(m.subject)}<br><span class="muted small">${esc(String(m.body).slice(0, 90))}…</span></td>
        <td><span class="tag ${m.status === 'sent' ? 'ok' : m.status === 'failed' ? 'bad' : ''}">${esc(m.status)}</span></td>
        <td>${m.status !== 'sent' ? `<button class="btn sm" data-send="${m.id}">Wyślij</button>` : ''}</td></tr>`)}
    </div>

    ${meetings.length ? `<h2 class="sec">Spotkania</h2><div class="card">
      ${meetings.map((m) => `<div class="event"><time>${fmtDateTime(m.starts_at)}</time><div>${esc(m.title)}</div></div>`).join('')}
    </div>` : ''}`;

  $('#statusSel').onchange = async (e) => {
    await api(`/leads/${id}`, { method: 'PATCH', body: { status: e.target.value } });
    toast('Status zmieniony.');
  };
  $('#notesForm').onsubmit = async (e) => {
    e.preventDefault();
    await api(`/leads/${id}`, { method: 'PATCH', body: { notes: e.target.notes.value } });
    toast('Notatki zapisane.');
  };
  $('#btnMeeting').onclick = () => meetingModal({
    title: `Rozmowa — ${l.company || l.name || l.domain}`, lead_id: l.id, attendee_email: l.email || '',
  });
  $('#btnWrite').onclick = () => writeModal(l);
  view.querySelectorAll('[data-send]').forEach((b) => {
    b.onclick = async () => {
      if (!confirm('Wysłać tę wiadomość teraz?')) return;
      try {
        await api(`/outreach/${b.dataset.send}/send`, { method: 'POST' });
        toast('Wysłano.');
        render();
      } catch (err) { toast(err.message, true); }
    };
  });
};

async function writeModal(lead) {
  const { templates } = await api('/outreach/templates/all');
  openModal(`Wiadomość do: ${lead.company || lead.email}`, `
    <label class="f">Sposób
      <select name="mode" id="modeSel">
        <option value="ai">Napisz przez AI na podstawie analizy strony</option>
        ${templates.map((t) => `<option value="${t.id}">Szablon: ${esc(t.name)}</option>`).join('')}
      </select></label>
    <label class="f">Wskazówki dla AI (opcjonalnie)
      <input name="instructions" placeholder="np. wspomnij, że jestem ze Śląska i robię strony dla architektów"></label>
    <div class="row"><button type="button" class="btn ghost sm" id="btnPreview">Pokaż podgląd</button></div>
    <div id="previewBox" style="margin-top:14px"></div>
    <label class="f" style="margin-top:14px">Temat<input name="subject" id="subjInp"></label>
    <label class="f">Treść<textarea name="body" id="bodyInp" style="min-height:11rem"></textarea></label>
    <p class="small muted">Wiadomość zapisuje się jako szkic. Wysyłasz ją dopiero jednym kliknięciem
    na karcie leada albo w zakładce Wysyłka. Stopka z linkiem wypisania dokleja się automatycznie.</p>`,
    async (data) => {
      await api('/outreach/prepare', { method: 'POST', body: {
        lead_id: lead.id, subject: data.subject, body: data.body,
      }});
      toast('Szkic zapisany.');
      render();
    });

  $('#btnPreview').onclick = async (e) => {
    e.target.disabled = true;
    const mode = $('#modeSel').value;
    try {
      const p = await api('/outreach/preview', { method: 'POST', body: {
        lead_id: lead.id,
        use_ai: mode === 'ai',
        template_id: mode === 'ai' ? null : Number(mode),
        instructions: $('#modalForm').instructions.value,
      }});
      $('#subjInp').value = p.subject;
      $('#bodyInp').value = p.body;
      $('#previewBox').innerHTML = '<div class="notice info">Podgląd wstawiony niżej — możesz go poprawić przed zapisaniem.</div>';
    } catch (err) { toast(err.message, true); }
    e.target.disabled = false;
  };
}

/* --- Wysyłka --- */
views['/wysylka'] = async () => {
  view.innerHTML = '<div class="empty">Wczytywanie…</div>';
  const [{ messages, quota, mode, inWindow }, { templates }, { suppression }] = await Promise.all([
    api('/outreach'), api('/outreach/templates/all'), api('/outreach/suppression/all'),
  ]);

  const MODE_INFO = {
    draft: 'Tryb <strong>szkic</strong>: wiadomości lądują w Kopiach roboczych Gmaila. Nic nie wychodzi bez Ciebie.',
    approve: 'Tryb <strong>akceptacja</strong>: wiadomość wychodzi dopiero, gdy klikniesz „Wyślij”.',
    auto: 'Tryb <strong>automat</strong>: kolejka sama wysyła w oknie godzinowym, z limitami.',
  };

  view.innerHTML = `
    <h1 class="page">Wysyłka do potencjalnych klientów</h1>
    <p class="sub">Kolejka wiadomości, szablony i lista wykluczeń.</p>

    <div class="notice info">${MODE_INFO[mode] || mode}</div>
    <div class="grid g4">
      ${kpi(`${quota.day}/${quota.dayLimit}`, 'wysłane dziś')}
      ${kpi(`${quota.hour}/${quota.hourLimit}`, 'w tej godzinie')}
      ${kpi(inWindow ? 'tak' : 'nie', 'okno wysyłki otwarte')}
      ${kpi(fmtNum(suppression.length), 'adresów wykluczonych')}
    </div>

    <h2 class="sec">Kolejka i historia</h2>
    ${pickGroup('kolejka', `<div class="card" style="padding:0">
      ${table(['', 'Kiedy', 'Do kogo', 'Temat', 'Status', 'Akcje'], messages, (m) => `<tr>
        <td>${pick(m.id)}</td>
        <td class="small muted">${fmtDateTime(m.created_at)}</td>
        <td class="small">${esc(m.company || m.lead_name || m.to_email)}<br><span class="muted">${esc(m.to_email)}</span></td>
        <td class="small">${esc(m.subject)}</td>
        <td><span class="tag ${m.status === 'sent' ? 'ok' : m.status === 'failed' ? 'bad' : m.status === 'queued' ? 'warn' : ''}">${esc(m.status)}</span>
          ${m.error ? `<br><span class="muted small">${esc(m.error)}</span>` : ''}</td>
        <td class="row">${m.status !== 'sent' ? `
          <button class="btn sm" data-send="${m.id}">Wyślij</button>
          <button class="btn ghost sm" data-del="${m.id}">Usuń</button>` : ''}</td></tr>`)}
    </div>`)}

    <h2 class="sec">Szablony</h2>
    ${pickGroup('szablony', `<div class="grid g2">
      ${templates.map((t) => `<div class="card pickItem">
        <div class="row" style="justify-content:space-between">
          <span class="row" style="gap:8px">${pick(t.id)} <strong>${esc(t.name)}</strong></span>
          <button class="btn ghost sm" data-deltpl="${t.id}">Usuń</button>
        </div>
        <p class="muted small" style="margin:.4rem 0">${esc(t.subject)}</p>
        <pre style="white-space:pre-wrap;font:inherit;font-size:.82rem;color:var(--ink-3);max-height:9rem;overflow:auto">${esc(t.body)}</pre>
      </div>`).join('')}
    </div>`)}
    <div class="row" style="margin-top:14px"><button class="btn ghost" id="btnNewTpl">Nowy szablon</button></div>

    <h2 class="sec">Lista wykluczeń</h2>
    <p class="sub">Adresy i domeny, do których nigdy nie wyślę wiadomości. Wypisanie przez link trafia tu automatycznie.</p>
    ${pickGroup('wykluczenia', `<div class="card" style="padding:0">
      ${table(['', 'Adres / domena', 'Powód', 'Kiedy', ''], suppression, (s) => `<tr>
        <td>${pick(esc(s.value))}</td>
        <td>${esc(s.value)}</td><td class="small muted">${esc(s.reason || '')}</td>
        <td class="small muted">${fmtDate(s.created_at)}</td>
        <td><button class="btn ghost sm" data-unsup="${esc(s.value)}">Usuń</button></td></tr>`)}
    </div>`)}
    <form class="row" id="supForm" style="margin-top:14px">
      <input class="inp" name="value" style="max-width:20rem;margin:0" placeholder="adres@firma.pl albo firma.pl" required>
      <button class="btn sm">Dodaj do wykluczeń</button>
    </form>`;

  bulkWire('kolejka', (id) => api(`/outreach/${id}`, { method: 'DELETE' }), { label: 'wiadomości' });
  bulkWire('szablony', (id) => api(`/outreach/templates/${id}`, { method: 'DELETE' }), { label: 'szablonów' });
  bulkWire('wykluczenia', (v) => api(`/outreach/suppression/${encodeURIComponent(v)}`, { method: 'DELETE' }),
    { label: 'wykluczeń' });
  view.querySelectorAll('[data-send]').forEach((b) => {
    b.onclick = async () => {
      if (!confirm('Wysłać tę wiadomość teraz?')) return;
      try { await api(`/outreach/${b.dataset.send}/send`, { method: 'POST' }); toast('Wysłano.'); render(); }
      catch (err) { toast(err.message, true); }
    };
  });
  view.querySelectorAll('[data-del]').forEach((b) => {
    b.onclick = async () => { await api(`/outreach/${b.dataset.del}`, { method: 'DELETE' }); render(); };
  });
  view.querySelectorAll('[data-deltpl]').forEach((b) => {
    b.onclick = async () => {
      if (!confirm('Usunąć szablon?')) return;
      await api(`/outreach/templates/${b.dataset.deltpl}`, { method: 'DELETE' });
      render();
    };
  });
  view.querySelectorAll('[data-unsup]').forEach((b) => {
    b.onclick = async () => {
      await api(`/outreach/suppression/${encodeURIComponent(b.dataset.unsup)}`, { method: 'DELETE' });
      render();
    };
  });
  $('#supForm').onsubmit = async (e) => {
    e.preventDefault();
    await api('/outreach/suppression', { method: 'POST', body: { value: e.target.value.value } });
    toast('Dodano do wykluczeń.');
    render();
  };
  $('#btnNewTpl').onclick = () => openModal('Nowy szablon', `
    <label class="f">Nazwa<input name="name" required></label>
    <label class="f">Temat<input name="subject" required placeholder="Strona {{company}} — trzy rzeczy do poprawy"></label>
    <label class="f">Treść<textarea name="body" required style="min-height:12rem"></textarea></label>
    <p class="small muted">Dostępne pola: {{name}}, {{firstName}}, {{company}}, {{domain}}, {{website}}, {{city}},
    {{observation}}, {{pitch}}, {{score}}. Fragment warunkowy: {{#name}}…{{/name}}.</p>`,
    async (data) => { await api('/outreach/templates', { method: 'POST', body: data }); toast('Szablon zapisany.'); render(); });
};

/* --- Tablica: kartki i pliki --- */

const KOLORY = [
  ['zolta', 'żółta'], ['biala', 'biała'], ['zielona', 'zielona'],
  ['rozowa', 'różowa'], ['niebieska', 'niebieska'],
];

/* Kolejność decyduje o kolejności na liście statusów. */
const STATUSY = [
  ['do-zrobienia', 'Do zrobienia'],
  ['czekam-na-materialy', 'Czekam na materiały'],
  ['w-trakcie', 'W trakcie'],
  ['do-poprawek', 'Do poprawek'],
  ['wycena-wyslana', 'Wycena wysłana'],
  ['czeka-na-odpowiedz', 'Czeka na odpowiedź'],
  ['wstrzymane', 'Wstrzymane'],
  ['zrobione', 'Zrobione'],
];
/* Statusy, w których piłka jest po stronie klienta — plakietka na bursztynowo. */
const CZEKA_NA_KLIENTA = ['czekam-na-materialy', 'wycena-wyslana', 'czeka-na-odpowiedz'];
const nazwaStatusu = (k) => (STATUSY.find(([key]) => key === k) || [, k])[1];

views['/notatnik'] = async () => {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const showDone = params.get('done') === '1';
  const folder = params.get('folder') || '';
  view.innerHTML = '<div class="empty">Wczytywanie…</div>';

  const [{ notes, doneCount, licznik }, filesData] = await Promise.all([
    api(`/board/notes${showDone ? '?done=1' : ''}`),
    api(`/board/files${folder ? `?folder=${encodeURIComponent(folder)}` : ''}`),
  ]);
  const { files, folders } = filesData;

  view.innerHTML = `
    <div class="row" style="justify-content:space-between;align-items:flex-start">
      <div>
        <h1 class="page">Tablica</h1>
        <p class="sub">Kartki z tym, co do zrobienia, i pliki pod ręką. Wszystko zapisuje się od razu.</p>
        ${podsumowanieStatusow(licznik, showDone)}
      </div>
      <div class="row">
        <a class="btn ghost sm" href="#/notatnik${showDone ? '' : '?done=1'}">
          ${showDone ? 'Ukryj zrobione' : `Pokaż zrobione (${doneCount})`}</a>
        <button class="btn" id="btnNewNote">Nowa kartka</button>
      </div>
    </div>

    ${notes.length ? pickGroup('notatki', `
      <div class="notes">${notes.map(noteCard).join('')}</div>`) : `
      <div class="empty">
        Tablica jest pusta. Pierwsza kartka to zwykle lista rzeczy, o których łatwo zapomnieć.
      </div>`}

    <h2 class="sec">Pliki</h2>
    <p class="sub">Umowy, logotypy, materiały od klientów. Do 25 MB na plik.</p>

    <div class="row" style="margin-bottom:14px">
      <a class="btn ${folder ? 'ghost' : ''} sm" href="#/notatnik">Wszystkie (${folders.reduce((n, f) => n + f.n, 0)})</a>
      ${folders.map((f) => `<a class="btn ${folder === f.folder ? '' : 'ghost'} sm"
        href="#/notatnik?folder=${encodeURIComponent(f.folder)}">${esc(f.folder)} (${f.n})</a>`).join('')}
    </div>

    <form class="card" id="uploadForm" style="margin-bottom:14px">
      <div class="row">
        <input class="inp" name="folder" style="max-width:14rem;margin:0" placeholder="Folder (np. nazwa klienta)"
               value="${esc(folder)}" list="folderList">
        <datalist id="folderList">${folders.map((f) => `<option value="${esc(f.folder)}">`).join('')}</datalist>
        <label class="filePick">
          <input type="file" name="files" id="filePicker" multiple required>
          <span id="filePickLabel">Wybierz pliki</span>
        </label>
        <button class="btn sm" type="submit">Wgraj</button>
      </div>
      <p class="small muted" style="margin:10px 0 0">Pusty folder trafi do „Ogólne".</p>
    </form>

    ${pickGroup('pliki', `<div class="card" style="padding:0">
      ${table(['', 'Nazwa', 'Folder', 'Rozmiar', 'Dodany', ''], files, (f) => `<tr>
        <td>${pick(f.id)}</td>
        <td><a href="/api/admin/board/files/${f.id}/download">${esc(f.original_name)}</a></td>
        <td class="small muted">${esc(f.folder)}</td>
        <td class="small muted">${fmtBytes(f.size)}</td>
        <td class="small muted">${fmtDate(f.created_at)}</td>
        <td><button class="btn ghost sm" data-delfile="${f.id}">Usuń</button></td></tr>`)}
    </div>`)}`;

  bulkWire('notatki', (id) => api(`/board/notes/${id}`, { method: 'DELETE' }), { label: 'kartek' });
  bulkWire('pliki', (id) => api(`/board/files/${id}`, { method: 'DELETE' }), { label: 'plików' });

  $('#btnNewNote').onclick = () => noteModal();


  view.querySelectorAll('[data-note-edit]').forEach((b) => {
    b.onclick = async () => {
      const n = notes.find((x) => String(x.id) === b.dataset.noteEdit);
      noteModal(n);
    };
  });
  view.querySelectorAll('[data-note-status]').forEach((sel) => {
    sel.onchange = async () => {
      await api(`/board/notes/${sel.dataset.noteStatus}`, { method: 'PATCH', body: { status: sel.value } });
      toast(`Przeniesione: ${nazwaStatusu(sel.value)}`);
      render();
    };
  });
  view.querySelectorAll('[data-note-pin]').forEach((b) => {
    b.onclick = async () => {
      await api(`/board/notes/${b.dataset.notePin}`, { method: 'PATCH', body: { pinned: b.dataset.pinned !== '1' } });
      render();
    };
  });
  view.querySelectorAll('[data-note-del]').forEach((b) => {
    b.onclick = async () => {
      if (!confirm('Usunąć tę kartkę?')) return;
      await api(`/board/notes/${b.dataset.noteDel}`, { method: 'DELETE' });
      render();
    };
  });
  view.querySelectorAll('[data-note-move]').forEach((b) => {
    b.onclick = async () => {
      await api(`/board/notes/${b.dataset.noteMove}/move`, { method: 'POST', body: { direction: b.dataset.dir } });
      render();
    };
  });
  view.querySelectorAll('[data-delfile]').forEach((b) => {
    b.onclick = async () => {
      if (!confirm('Usunąć plik na stałe?')) return;
      await api(`/board/files/${b.dataset.delfile}`, { method: 'DELETE' });
      render();
    };
  });

  // Natywna kontrolka pliku pisze po angielsku i nie da się jej przetłumaczyć —
  // chowamy ją i pokazujemy własną etykietę z liczbą wybranych plików.
  $('#filePicker').onchange = (e) => {
    const n = e.target.files.length;
    $('#filePickLabel').textContent = n === 0 ? 'Wybierz pliki'
      : n === 1 ? e.target.files[0].name
      : `wybrano ${n} plików`;
  };

  $('#uploadForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Wgrywam…';
    try {
      // Pliki idą formularzem, nie JSON-em — dlatego z pominięciem api().
      const res = await fetch('/api/admin/board/files', { method: 'POST', body: new FormData(e.target) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Błąd ${res.status}`);
      toast(`Wgrano ${data.files.length} plik(ów).`);
      render();
    } catch (err) {
      toast(err.message, true);
      btn.disabled = false;
      btn.textContent = 'Wgraj';
    }
  };
};

/** Jedna linijka nad tablicą: ile kartek w jakim statusie, bez dzielenia listy. */
function podsumowanieStatusow(licznik, showDone) {
  const czesci = STATUSY
    .filter(([k]) => (licznik[k] || 0) > 0 && (showDone || k !== 'zrobione'))
    .map(([k, l]) => `<span class="statusSum ${CZEKA_NA_KLIENTA.includes(k) ? 'statusSum--czeka' : ''}">
      <b>${licznik[k]}</b> ${l.toLowerCase()}</span>`);
  return czesci.length ? `<p class="statusSums">${czesci.join('')}</p>` : '';
}

function noteCard(n) {
  const status = n.status || 'do-zrobienia';
  const zrobiona = status === 'zrobione';
  const czeka = CZEKA_NA_KLIENTA.includes(status);
  const przeterminowana = n.due_date && !zrobiona && n.due_date < new Date().toISOString().slice(0, 10);
  return `<article class="note pickItem note--${esc(n.color)} ${zrobiona ? 'note--done' : ''}">
    <div class="note__top">
      ${pick(n.id)}
      <select class="note__status ${czeka ? 'note__status--czeka' : ''} ${zrobiona ? 'note__status--zrobione' : ''}"
              data-note-status="${n.id}" title="Zmień status">
        ${STATUSY.map(([k, l]) => `<option value="${k}" ${k === status ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
      <button class="note__pin ${n.pinned ? 'on' : ''}" data-note-pin="${n.id}" data-pinned="${n.pinned}"
              title="Przypnij na górze">${n.pinned ? '📌' : '📍'}</button>
    </div>
    ${n.title ? `<h3 class="note__title">${esc(n.title)}</h3>` : ''}
    ${n.body ? `<pre class="note__body">${esc(n.body)}</pre>` : ''}
    ${noteLinks(n.links)}
    <div class="note__foot">
      ${n.source === 'poczta' ? '<span class="tag">z poczty</span>' : ''}
      ${n.due_date ? `<span class="tag ${przeterminowana ? 'bad' : ''}">${fmtDate(n.due_date)}</span>` : ''}
      ${n.project_name ? `<span class="tag">${esc(n.project_name)}</span>` : ''}
      ${n.files ? `<span class="tag">${n.files} plik(ów)</span>` : ''}
      <span class="note__actions">
        <button data-note-move="${n.id}" data-dir="up" title="Wyżej">↑</button>
        <button data-note-move="${n.id}" data-dir="down" title="Niżej">↓</button>
        <button data-note-edit="${n.id}" title="Edytuj">edytuj</button>
        <button data-note-del="${n.id}" title="Usuń">usuń</button>
      </span>
    </div>
  </article>`;
}

/** Odnośniki dopisane przez skanowanie poczty: wątek, strona, social media. */
function noteLinks(links) {
  if (!links) return '';
  const ETYKIETY = {
    gmail: ['Wątek w Gmailu', '✉'], website: ['Strona', '🌐'],
    facebook: ['Facebook', 'f'], instagram: ['Instagram', 'ig'], linkedin: ['LinkedIn', 'in'],
  };
  const items = Object.entries(links)
    .filter(([k, v]) => v && ETYKIETY[k])
    .map(([k, v]) => `<a class="noteLink" href="${esc(v)}" target="_blank" rel="noopener"
      title="${ETYKIETY[k][0]}"><span>${ETYKIETY[k][1]}</span>${ETYKIETY[k][0]}</a>`);
  return items.length ? `<div class="note__links">${items.join('')}</div>` : '';
}

async function noteModal(note) {
  const { projects } = await api('/projects');
  const isEdit = Boolean(note);
  openModal(isEdit ? 'Edytuj kartkę' : 'Nowa kartka', `
    <label class="f">Tytuł<input name="title" value="${esc(note?.title || '')}" placeholder="np. Strona dla Meblarni"></label>
    <label class="f">Treść<textarea name="body" placeholder="Co trzeba zrobić…">${esc(note?.body || '')}</textarea></label>
    <label class="f">Status<select name="status">
      ${STATUSY.map(([k, l]) => `<option value="${k}" ${(note?.status || 'do-zrobienia') === k ? 'selected' : ''}>${l}</option>`).join('')}
    </select></label>
    <label class="f">Kolor kartki<select name="color">
      ${KOLORY.map(([k, l]) => `<option value="${k}" ${note?.color === k ? 'selected' : ''}>${l}</option>`).join('')}
    </select></label>
    <label class="f">Termin<input type="date" name="due_date" value="${esc(note?.due_date || '')}"></label>
    <label class="f">Powiązany projekt<select name="project_id">
      <option value="">— brak —</option>
      ${projects.map((p) => `<option value="${p.id}" ${String(note?.project_id) === String(p.id) ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
    </select></label>`,
    async (data) => {
      const body = { ...data, project_id: data.project_id || null, due_date: data.due_date || null };
      if (isEdit) await api(`/board/notes/${note.id}`, { method: 'PATCH', body });
      else await api('/board/notes', { method: 'POST', body });
      toast(isEdit ? 'Zapisane.' : 'Kartka dodana.');
      render();
    });
}

const fmtBytes = (b) => {
  if (!b) return '—';
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return Math.round(b / 1024) + ' kB';
  return (b / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
};

/* --- Ustawienia --- */
views['/ustawienia'] = async () => {
  view.innerHTML = '<div class="empty">Wczytywanie…</div>';
  const g = await api('/mail/google/status');
  const snippet = `<script defer src="${location.origin}/t.js"><\/script>`;

  view.innerHTML = `
    <h1 class="page">Ustawienia</h1>
    <p class="sub">Integracje i wdrożenie licznika na stronie.</p>

    ${g.ostatniBlad?.error ? `<div class="notice bad">
      <strong>Powiadomienie z formularza nie doszło.</strong>
      Ostatnia nieudana próba: ${fmtDateTime(g.ostatniBlad.ts)} — ${esc(g.ostatniBlad.error)}<br>
      Zapytanie samo w sobie jest zapisane w <a href="#/leady">Leadach</a>, więc nic nie przepadło.
      Najczęstsza przyczyna to wygasłe połączenie z Google — połącz konto ponownie i wyślij próbną wiadomość.
    </div>` : ''}

    <div class="card">
      <h3>Konto Google (poczta i kalendarz)</h3>
      ${g.connected
        ? `<p>Połączone jako <strong>${esc(g.account || 'nieznane konto')}</strong>
             <span class="muted small">· ostatnia aktualizacja ${fmtDateTime(g.updatedAt)}</span></p>
           <div class="row" style="margin-top:10px">
             <button class="btn sm" id="btnTestMail">Wyślij próbną wiadomość</button>
             <button class="btn ghost sm" id="btnDisconnect">Odłącz konto</button>
           </div>
           <p class="small muted" style="margin:10px 0 0">Próbna wiadomość idzie na Twój własny adres tą samą drogą,
             co powiadomienia z formularza — jeśli dojdzie, formularz też działa.</p>`
        : g.configured
          ? `<p class="muted small">Poczta, kalendarz i wysyłka wymagają połączenia z Twoim kontem Google.</p>
             <button class="btn" id="btnConnect">Połącz konto Google</button>`
          : `<div class="notice warn">Uzupełnij w pliku <code>.env</code>: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
             i GOOGLE_REDIRECT_URI, potem zrestartuj serwer. Instrukcja krok po kroku jest w README backendu.</div>`}
    </div>

    <div class="card" style="margin-top:1px">
      <h3>Generowanie treści przez AI</h3>
      <p>${g.ai ? '<span class="tag ok">włączone</span> — panel może pisać spersonalizowane wiadomości i streszczać wątki.'
        : '<span class="tag warn">wyłączone</span> — dodaj ANTHROPIC_API_KEY w pliku .env, żeby włączyć.'}</p>
    </div>

    <div class="card" style="margin-top:1px">
      <h3>Licznik ruchu — wklej na stronie</h3>
      <p class="muted small">Jedna linia przed <code>&lt;/body&gt;</code> na każdej podstronie 21project.pl.
      Licznik nie używa ciasteczek i respektuje ustawienie „Do Not Track”.</p>
      <pre class="inp" style="overflow:auto">${esc(snippet)}</pre>
      <button class="btn ghost sm" id="btnCopy">Kopiuj</button>
    </div>

    <div class="card" style="margin-top:1px">
      <h3>Formularz kontaktowy</h3>
      <p class="muted small">Żeby zapytania ze strony trafiały prosto tutaj, formularz ma wysyłać dane na
      <code>POST ${location.origin}/api/contact</code>. Gotowy skrypt znajdziesz w pliku
      <code>backend/public/form-hook.js</code> — wystarczy go podpiąć na stronie.</p>
    </div>`;

  const btnConnect = $('#btnConnect');
  if (btnConnect) btnConnect.onclick = async () => {
    const { url } = await fetch('/api/google/connect').then((r) => r.json());
    if (url) location.href = url; else toast('Brak konfiguracji Google w .env', true);
  };
  const btnDisconnect = $('#btnDisconnect');
  if (btnDisconnect) btnDisconnect.onclick = async () => {
    if (!confirm('Odłączyć konto Google? Poczta i kalendarz przestaną działać.')) return;
    await api('/mail/google/disconnect', { method: 'POST' });
    render();
  };
  const btnTest = $('#btnTestMail');
  if (btnTest) btnTest.onclick = async () => {
    btnTest.disabled = true;
    btnTest.textContent = 'Wysyłam…';
    try {
      const r = await api('/mail/test', { method: 'POST' });
      toast(`Wysłane na ${r.account}. Sprawdź skrzynkę.`);
      render();
    } catch (err) {
      toast(err.message, true);
      render();
    }
  };
  $('#btnCopy').onclick = () => {
    navigator.clipboard.writeText(snippet).then(() => toast('Skopiowano.'));
  };
};

/* ------------------------------- router ------------------------------- */

/* Widok renderuje się tylko przy zmianie adresu, więc panel zostawiony otwarty
   pokazywał stan sprzed godzin. Widoki, które żyją własnym życiem — poczta,
   ruch, pulpit — zamawiają odświeżanie co kilkadziesiąt sekund. */
let timerOdswiezania = null;

function odswiezajCo(sekundy, wolno = () => true) {
  clearInterval(timerOdswiezania);
  timerOdswiezania = setInterval(() => {
    if (document.hidden) return;    // karta w tle — szkoda łącza
    if (modal.open) return;         // otwarte okienko
    if (!wolno()) return;           // widok mówi, że akurat nie pora
    render();
  }, sekundy * 1000);
}

async function render() {
  clearInterval(timerOdswiezania);
  timerOdswiezania = null;
  const raw = (location.hash || '#/pulpit').slice(1).split('?')[0];
  const parts = raw.split('/').filter(Boolean);
  let handler = views[`/${parts.join('/')}`];
  let arg;
  if (!handler && parts.length === 2) {
    handler = views[`/${parts[0]}/:id`];
    arg = parts[1];
  }
  if (!handler) handler = views['/pulpit'];

  document.querySelectorAll('#nav a').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('href').startsWith(`#/${parts[0] || 'pulpit'}`));
  });

  try {
    await handler(arg);
  } catch (err) {
    view.innerHTML = `<div class="notice bad">${esc(err.message)}</div>`;
  }
}

addEventListener('hashchange', render);

$('#logout').onclick = async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  location.href = '/admin/login';
};

/* Domyślnie panel wygląda jak strona — jasno. Wybór zapamiętuje przeglądarka. */
const themeBtn = $('#themeToggle');
function applyTheme(mode) {
  if (mode === 'dark') document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;
  themeBtn.textContent = mode === 'dark' ? 'Jasny' : 'Ciemny';
  try { localStorage.setItem('p21theme', mode); } catch { /* tryb prywatny */ }
}
themeBtn.onclick = () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
applyTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

(async function boot() {
  try {
    const me = await fetch('/api/auth/me').then((r) => (r.ok ? r.json() : Promise.reject()));
    $('#whoami').textContent = me.email;
  } catch {
    location.href = '/admin/login';
    return;
  }
  render();
})();
