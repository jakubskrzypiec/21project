/* Panel 21 project — jeden plik, bez zależności. Widoki dobierane po adresie #/… */
'use strict';

/* ----------------------------- narzędzia ----------------------------- */

const $ = (sel, root = document) => root.querySelector(sel);
const view = $('#view');
const modal = $('#modal');

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/*
 * Sesja jedzie dwoma torami naraz: ciasteczkiem (ustawia je serwer) i tokenem
 * schowanym w przeglądarce. Wystarczy, że dociera którykolwiek — dzięki temu
 * zgubione ciasteczko nie wyrzuca z panelu. Serwer odsyła odnowiony token
 * nagłówkiem, więc zapas nie zestarzeje się w tle.
 */
const TOKEN_KEY = 'p21token';
const czytajToken = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };
const zapiszToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* tryb prywatny */ } };

function naglowki(dodatkowe = {}) {
  const t = czytajToken();
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}), ...dodatkowe };
}

function przyjmijOdnowienie(res) {
  const swiezy = res.headers.get('X-Odnowiony-Token');
  if (swiezy) zapiszToken(swiezy);
}

const POWODY_SESJI = {
  wygasla: 'Sesja wygasła po długiej przerwie.',
  zly_podpis: 'Serwer ma inny klucz sesji niż przy Twoim logowaniu (zniknęła baza z kluczem?).',
  brak_ciastka: 'Przeglądarka nie odesłała ani ciasteczka, ani zapasowego tokenu.',
  nie_admin: 'Token nie należy do konta administratora.',
};

/**
 * Pasek zamiast natychmiastowego przerzucenia na ekran logowania. Zostajesz tam,
 * gdzie byłeś, widzisz powód i sam decydujesz, kiedy się przelogować.
 */
function pokazPasekSesji(powod) {
  if ($('#pasekSesji')) return;
  const pasek = document.createElement('div');
  pasek.id = 'pasekSesji';
  pasek.className = 'notice bad';
  pasek.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:60;margin:0';
  pasek.innerHTML = `<strong>Serwer odrzucił sesję.</strong>
    ${esc(POWODY_SESJI[powod] || ('Powód: ' + (powod || 'nieznany')))}
    Nic nie zginęło — zaloguj się ponownie, kiedy Ci wygodnie.
    <span class="row" style="margin-top:10px">
      <button class="btn sm" id="pasekZaloguj">Zaloguj ponownie</button>
      <button class="btn ghost sm" id="pasekZamknij">Zamknij</button>
    </span>`;
  document.body.append(pasek);
  $('#pasekZaloguj').onclick = () => {
    zapiszToken('');
    location.href = '/admin/login' + (powod ? `?powod=${encodeURIComponent(powod)}` : '');
  };
  $('#pasekZamknij').onclick = () => pasek.remove();
}

async function api(path, options = {}) {
  const res = await fetch(`/api/admin${path}`, {
    ...options,
    headers: naglowki(options.headers),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  przyjmijOdnowienie(res);
  if (res.status === 401) {
    // Nie wyrzucamy z panelu. Wyrzucenie w trakcie pracy gubi to, co robiłeś,
    // i niczego nie tłumaczy — a 401 potrafi przyjść z jednego zepsutego wywołania,
    // podczas gdy reszta sesji jest w porządku. Pokazujemy pasek i decydujesz sam.
    const powod = await res.json().then((d) => d.powod).catch(() => '');
    pokazPasekSesji(powod);
    const e = new Error('Sesja odrzucona przez serwer.');
    e.sesja = true;
    throw e;
  }
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
function bulkWire(name, del, { label = 'pozycji', visibleOnly = false } = {}) {
  const grupa = view.querySelector(`[data-pick-group="${name}"]`);
  if (!grupa) return;
  const all = grupa.querySelector('[data-pick-all]');
  const licznik = grupa.querySelector('.bulk__count');
  const btn = grupa.querySelector('[data-pick-del]');
  const boxes = [...grupa.querySelectorAll('[data-pick]')];
  if (!boxes.length) { grupa.querySelector('.bulk').hidden = true; return; }

  const visible = () => boxes.filter(b => !visibleOnly || !b.closest('.pickItem')?.hidden);
  const wybrane = () => visible().filter((b) => b.checked);
  const odswiez = () => {
    if (visibleOnly) boxes.filter(b => b.closest('.pickItem')?.hidden).forEach(b => { b.checked = false; });
    const n = wybrane().length;
    const total = visible().length;
    licznik.textContent = n ? `zaznaczono ${n} z ${total}` : 'nic nie zaznaczono';
    btn.disabled = n === 0;
    all.checked = total > 0 && n === total;
    all.indeterminate = n > 0 && n < total;
    boxes.forEach((b) => (b.closest('tr, .pickItem') || b).classList.toggle('picked', b.checked));
  };

  // Pole wyboru nie może otwierać wątku ani kartki, na której siedzi.
  boxes.forEach((b) => { b.onclick = (e) => { e.stopPropagation(); odswiez(); }; });
  all.onclick = () => { visible().forEach((b) => { b.checked = all.checked; }); odswiez(); };

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
  return odswiez;
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
/**
 * Panel wylogowuje i rozłącza Google z jednego powodu naraz: hosting kasuje
 * katalog z bazą przy wdrożeniu, a razem z nią klucz podpisujący sesje i token
 * Google. Licznik uruchomień to rozstrzyga — na trwałym dysku rośnie.
 */
function bannerDysku(s) {
  if (!s) return '';
  // Licznik większy od jednego to dowód, że katalog przetrwał restart — wtedy nie ma o czym mówić.
  if (s.liczbaStartow > 1) return '';

  // Klucz w zmiennych środowiskowych ratuje same zalogowania, ale nie dane.
  // Token Google, leady, projekty i notatki nadal leżą w bazie na dysku.
  if (s.kluczZEnv) {
    return `<div class="notice warn">
      <strong>Sprawdź, czy dysk na dane jest trwały.</strong>
      Klucz sesji jest ustawiony na stałe, więc wylogowywanie masz już z głowy.
      Ale baza wystartowała jako pusta — jeśli powtórzy się to po następnym wdrożeniu,
      znaczy że katalog z danymi jest kasowany razem z kontenerem, a wtedy przy każdej
      aktualizacji tracisz leady, projekty, notatki i połączenie z Google.<br>
      Na hostingu dysk ma być podmontowany dokładnie pod <code>/app/data</code>.
      Jeśli już jest, ten komunikat zniknie sam po najbliższym restarcie.
    </div>`;
  }

  return `<div class="notice bad">
    <strong>Panel może Cię wylogowywać przy każdym wdrożeniu.</strong>
    Baza na serwerze jest świeża (pierwsze uruchomienie), a klucz sesji nie jest
    ustawiony na stałe w zmiennych środowiskowych — więc przy restarcie losuje się
    nowy i wszystkie zalogowania przestają być ważne. Tą samą drogą znika token
    Google, stąd „konto niepołączone" i pusta Poczta.<br>
    Dwie rzeczy do zrobienia na hostingu: podmontuj trwały dysk pod
    <code>/app/data</code> i ustaw zmienną <code>JWT_SECRET</code> na stałą,
    losową wartość (co najmniej 32 znaki).
  </div>`;
}

/** Polska odmiana przez liczbę: 1 zapytanie, 2 zapytania, 5 zapytań. */
function odmien(n, jeden, kilka, wiele) {
  const d = n % 10, s = n % 100;
  if (n === 1) return jeden;
  if (d >= 2 && d <= 4 && (s < 12 || s > 14)) return kilka;
  return wiele;
}

/**
 * Formularz milczy z dwóch różnych powodów i pulpit musi je rozdzielić:
 * albo nikt nie wysłał zapytania (wtedy nie ma czego naprawiać), albo zapytanie
 * przyszło, ale powiadomienie na maila nie wyszło. Bez tego jedyny sygnał
 * „coś nie działa" był schowany w Ustawieniach, których nikt nie otwiera.
 */
function bannerFormularza(f) {
  if (!f) return '';
  const ostatnie = f.ostatni
    ? `Ostatnie zapytanie: <strong>${esc(f.ostatni.name || 'bez nazwy')}</strong>,
       ${fmtDateTime(f.ostatni.created_at)} (<a href="#/leady/${f.ostatni.id}">otwórz</a>).`
    : 'Z formularza nie przyszło jeszcze żadne zapytanie.';

  if (f.blad?.error) {
    return `<div class="notice bad">
      <strong>Powiadomienie z formularza nie doszło na maila.</strong>
      Ostatnia nieudana próba: ${fmtDateTime(f.blad.ts)} — ${esc(f.blad.error)}<br>
      Same zapytania są zapisane w <a href="#/leady">Leadach</a>, więc nic nie przepadło.
      Najczęstsza przyczyna to wygasłe połączenie z Google —
      <a href="#/ustawienia">połącz konto ponownie</a> i wyślij próbną wiadomość.<br>
      ${ostatnie}
    </div>`;
  }
  if (!f.ostatni) {
    return `<div class="notice warn">
      <strong>Formularz nie dostał jeszcze żadnego zapytania.</strong>
      To nie musi znaczyć awarii — przy obecnym ruchu bywa cicho.
      Żeby sprawdzić samą drogę wysyłki, wejdź w <a href="#/ustawienia">Ustawienia</a>
      i kliknij „Wyślij próbną wiadomość".
    </div>`;
  }
  const opis = (n) => `${n} ${odmien(n, 'zapytanie', 'zapytania', 'zapytań')}`;
  return `<p class="sub" style="margin-top:-6px">Formularz działa — ${opis(f.w7dni)} w ciągu 7 dni,
    ${opis(f.w30dni)} w ciągu 30 dni. ${ostatnie}</p>`;
}

/**
 * Opinie w wizytówce Google są jedyną dźwignią lokalnego pakietu, na którą kod nie ma
 * wpływu — dlatego panel po prostu pilnuje, żeby o nie poprosić. Najlepszy moment to
 * kilka dni po oddaniu projektu, kiedy klient jeszcze pamięta, jak to szło.
 */
function wiadomoscOOpinie(projekt, link) {
  const klient = (projekt.client || '').split(' ')[0];
  return `Cześć${klient ? ' ' + klient : ''},\n\n`
    + `mam nadzieję, że strona sprawdza się w praktyce. Mam do Ciebie jedną prośbę: `
    + `jeśli współpraca była w porządku, będę bardzo wdzięczny za krótką opinię w Google. `
    + `Dla jednoosobowej firmy takiej jak moja to naprawdę duża różnica.\n\n`
    + (link ? `Zajmie to minutę: ${link}\n\n` : `Wyślę Ci link, wystarczy że dasz znać.\n\n`)
    + `Dzięki i odzywaj się śmiało, gdyby coś było potrzebne.\n\nJakub`;
}

function kartaOpinii(o) {
  if (!o) return '';
  if (!o.oddane) return '';
  const naglowek = `<div class="row" style="justify-content:space-between;align-items:baseline">
      <h3 style="margin:0">Opinie od klientów</h3>
      <span class="muted small">${o.zebrane} z ${o.oddane} oddanych projektów</span></div>`;

  if (!o.czekaja.length) {
    return `<div class="card" style="margin-top:1px">${naglowek}
      <p class="muted small" style="margin-top:12px">Nikogo nie trzeba teraz prosić — wszystkie oddane
      projekty są już oznaczone. Panel przypomni sam trzy dni po zamknięciu kolejnego.</p></div>`;
  }

  const brakLinku = !o.linkOpinii ? `<div class="notice warn" style="margin-top:12px">
      Nie masz zapisanego adresu do wystawiania opinii. Wklej go w
      <a href="#/ustawienia">Ustawieniach</a>, a trafi prosto do gotowej wiadomości.</div>` : '';

  const pozycje = o.czekaja.map((p) => `<div class="event" data-opinia="${p.id}">
      <time>${fmtDate(p.updated_at)}</time>
      <div style="flex:1">
        <a href="#/projekty/${p.id}"><strong>${esc(p.name)}</strong></a>
        ${p.client ? `<br><span class="muted small">${esc(p.client)}</span>` : ''}
        <div class="row" style="margin-top:8px;gap:8px;flex-wrap:wrap">
          <button class="btn sm" data-kopiuj="${p.id}">Skopiuj wiadomość</button>
          <button class="btn ghost sm" data-stan="poproszona" data-pid="${p.id}">Poproszono</button>
          <button class="btn ghost sm" data-stan="otrzymana" data-pid="${p.id}">Mam opinię</button>
          <button class="btn ghost sm" data-stan="odmowa" data-pid="${p.id}">Odpuszczam</button>
        </div>
      </div></div>`).join('');

  return `<div class="card" style="margin-top:1px">${naglowek}
    <p class="muted small" style="margin:10px 0 4px">Te projekty są oddane i nikt jeszcze nie był proszony o opinię.</p>
    ${brakLinku}${pozycje}</div>`;
}

function wireOpinie(o) {
  if (!o || !o.czekaja?.length) return;
  const wgId = (id) => o.czekaja.find((p) => String(p.id) === String(id));

  view.querySelectorAll('[data-kopiuj]').forEach((b) => {
    b.onclick = async () => {
      const tekst = wiadomoscOOpinie(wgId(b.dataset.kopiuj), o.linkOpinii);
      try {
        await navigator.clipboard.writeText(tekst);
        toast('Wiadomość skopiowana — wklej ją klientowi.');
      } catch {
        // Schowek bywa zablokowany poza HTTPS albo bez zgody — wtedy pokazujemy tekst do ręcznego zaznaczenia.
        openModal('Wiadomość do klienta',
          `<label class="f">Skopiuj i wyślij<textarea class="inp" name="tresc" style="min-height:11rem">${esc(tekst)}</textarea></label>`,
          () => {});
      }
    };
  });

  view.querySelectorAll('[data-stan]').forEach((b) => {
    b.onclick = async () => {
      const stan = b.dataset.stan;
      const dalej = async (tresc) => {
        await api(`/projects/${b.dataset.pid}/opinia`, { method: 'POST', body: { status: stan, tresc } });
        toast(stan === 'otrzymana' ? 'Zapisane — prześlij mi tę opinię, wrzucę ją na stronę.' : 'Zapisane.');
        render();
      };
      if (stan !== 'otrzymana') return dalej(null);
      openModal('Treść opinii',
        '<label class="f">Wklej, co napisał klient<textarea class="inp" name="tresc" style="min-height:8rem" '
        + 'placeholder="Pełna treść opinii — przyda się na stronie."></textarea></label>',
        (dane) => dalej(dane.tresc));
    };
  });
}

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
    <p class="sub">Ostatnie 30 dni · aktualizacja ${fmtDateTime(new Date())}${
      d.serwer?.wersja ? ` · wersja na serwerze <code>${esc(d.serwer.wersja)}</code>` : ''}</p>
    ${bannerFormularza(d.formularz)}
    ${bannerDysku(d.serwer)}

    <div class="grid g4">
      ${kpi(fmtNum(t.visitors), 'użytkowników', t.change.visitors)}
      ${kpi(fmtNum(t.views), 'odsłon', t.change.views)}
      ${kpi(`${t.conversionRate}%`, `konwersji (${t.conversions} realnych kontaktów)`)}
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

    ${kartaOpinii(d.opinie)}

    ${!g.connected ? `<div class="notice info" style="margin-top:18px">
      Konto Google nie jest połączone — poczta, kalendarz i wysyłka są nieaktywne.
      <a href="#/ustawienia">Połącz teraz</a>.</div>` : ''}
  `;

  wireOpinie(d.opinie);

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
      ${kpi(`${s.conversionRate}%`, `konwersji — ${s.conversions} realnych kontaktów`)}
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
      <div class="card"><h3>Zdarzenia (contact_click = wejście w Kontakt; form_submit, phone_click, mail_click = konwersje)</h3>${list(b.events, 'name', 'n', 'Zdarzenie')}</div>
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
  ['wszystko', 'Wszystko'],
  ['odebrane', 'Odebrane'],
  ['wyslane', 'Wysłane'],
  ['klienci', 'Od ludzi'],
  ['nieprzeczytane', 'Nieprzeczytane'],
  ['wazne', 'Ważne'],
  ['promocje', 'Promocje'],
  ['kosz', 'Kosz i spam'],
];

views['/poczta'] = async () => {
  view.innerHTML = '<div class="empty">Wczytywanie skrzynki…</div>';
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const q = params.get('q') || '';
  const mailView = params.get('view') || 'wszystko';
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
    wszystko: 'Całe konto — odebrane, zarchiwizowane, wszystkie etykiety. Bez Twojej własnej korespondencji wychodzącej; rozmowy, w których ktoś odpisał, zostają.',
    odebrane: 'Sama skrzynka odbiorcza, bez archiwum.',
    wyslane: 'Wiadomości wysłane z Twojego konta.',
    klienci: 'Skrzynka odbiorcza bez promocji, powiadomień i automatów — zostaje korespondencja od ludzi.',
    nieprzeczytane: 'Wszystko, czego jeszcze nie otworzyłeś.',
    wazne: 'Wątki oznaczone gwiazdką — Twoja lista rzeczy do załatwienia.',
    promocje: 'To, co Gmail uznał za promocje i newslettery.',
    kosz: 'Spam i kosz — jedyne, czego nie ma w widoku „Wszystko".',
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
      ${q ? `<a class="btn ghost sm" href="#/poczta?view=wszystko">Wyczyść</a>` : ''}
      <button class="btn ghost sm" type="button" id="newMail">Nowa wiadomość</button>
      <button class="btn ghost sm" type="button" id="btnRefreshMail">Odśwież</button>
      <span class="small muted" id="mailStamp">sprawdzone ${new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}${
        data.ukryte ? ` · ukryto ${data.ukryte} automat(y)` : ''}</span>
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
    location.hash = value ? `#/poczta?q=${encodeURIComponent(value)}` : '#/poczta?view=wszystko';
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
      Zajrzyj do widoku <a href="#/poczta?view=wszystko">Wszystko</a> — jeśli tam są, to kwestia filtra.
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
        <button class="btn ghost sm" id="btnWycena">Wystaw wycenę</button>
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
  $('#btnWycena').onclick = () => kreatorWyceny(l);
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

/* --- Agenci AI: Handlowiec ------------------------------------------------
   Jeden ekran do kontroli agenta: przycisk start/stop, wyniki, odpowiedzi
   z gotowymi szkicami, kolejka maili, strategia (z historią wersji) i ustawienia. */

const OFERTA = { strona: 'Strona + SEO/AI', panel: 'Panel', pakiet: 'Pakiet: klienci' };
const KAT_ODP = {
  pilne: ['pilne', 'bad'], wazne: ['ważne', 'warn'], zwykle: ['zwykłe', ''], odmowa: ['odmowa', ''],
  automat: ['automat', ''], bounce: ['nie doszedł', 'bad'],
};
const ETAP = {
  found: 'znaleziona', checking: 'sprawdzam', writing: 'piszę', queued: 'mail w kolejce',
  contacted: 'napisano', skipped: 'pominięta',
};
const STAN_MAILA = { agent_queued: ['w kolejce', 'warn'], sent: ['wysłany', 'ok'], failed: ['błąd', 'bad'], skipped: ['pominięty', ''] };
const proc = (a, b) => (b ? `${Math.round((100 * (a || 0)) / b)}%` : '—');
const gmailLink = (threadId) => (threadId ? `https://mail.google.com/mail/u/0/#all/${threadId}` : null);
const lines = (v) => String(v || '').split('\n').map((x) => x.trim()).filter(Boolean);

views['/agenci'] = async () => {
  const tab = new URLSearchParams(location.hash.split('?')[1] || '').get('tab') || 'przeglad';
  view.innerHTML = '<div class="empty">Wczytywanie…</div>';
  const d = await api('/agents/handlowiec');
  const { status: s, settings: cfg, stats: st } = d;

  const braki = [];
  if (!s.checks.ai) braki.push('brak klucza <code>ANTHROPIC_API_KEY</code> w zmiennych serwera (Railway → Variables)');
  if (!s.checks.google) braki.push('Gmail nie jest połączony (Ustawienia → Połącz Google)');

  const stan = s.enabled
    ? (!s.checks.ai || !s.checks.google ? '<span class="tag bad">włączony, ale zablokowany</span>'
      : s.alive ? '<span class="tag ok">pracuje</span>' : '<span class="tag warn">włączony, ale serwer nie odpowiada</span>')
    : '<span class="tag">zatrzymany</span>';
  const TABS = [['przeglad', 'Przegląd'], ['odpowiedzi', 'Odpowiedzi'], ['maile', 'Maile'], ['firmy', 'Firmy'],
    ['strategia', 'Strategia i nauka'], ['ustawienia', 'Ustawienia'], ['dziennik', 'Dziennik']];

  view.innerHTML = `
    <div class="row" style="justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:14px">
      <div><h1 class="page">Handlowiec</h1>
        <p class="sub" style="margin-bottom:0">Agent cold outreachu: szuka firm, pisze i wysyła maile, pilnuje odpowiedzi i uczy się co tydzień.</p></div>
      <div class="row" style="gap:10px">${stan}
        <button class="btn ghost sm" id="agRun">Przebieg teraz</button>
        ${s.enabled ? '<button class="btn danger" id="agStop">Zatrzymaj</button>' : '<button class="btn" id="agStart">Uruchom</button>'}
      </div>
    </div>
    <p class="small muted" style="margin:10px 0 18px">Ostatni przebieg: ${s.lastTickAt ? relTime(s.lastTickAt) : 'jeszcze nie było'}
      · okno wysyłki: ${cfg.windowStart}:00–${cfg.windowEnd}:00, ${s.inWindow ? 'otwarte' : 'zamknięte'}
      ${s.nextSendAt && s.enabled ? `· następny mail ok. ${fmtTime(s.nextSendAt)}` : ''}
      ${s.checks.googleAccount ? `· wysyła z ${esc(s.checks.googleAccount)}` : ''}</p>
    ${braki.length ? `<div class="notice warn">${braki.map((b) => `• ${b}`).join('<br>')}</div>` : ''}
    <nav class="tabs">${TABS.map(([k, n]) => `<a href="#/agenci?tab=${k}" class="${k === tab ? 'active' : ''}">${n}</a>`).join('')}</nav>
    <div id="agTab"></div>`;

  const run = async (path, msg) => {
    try { const r = await api(path, { method: 'POST' }); toast(msg(r)); render(); } catch (err) { toast(err.message, true); }
  };
  $('#agStart')?.addEventListener('click', () => run('/agents/handlowiec/start', () => 'Agent pracuje. Zatrzymasz go tym samym przyciskiem.'));
  $('#agStop')?.addEventListener('click', () => { if (confirm('Zatrzymać agenta? Kolejka zostanie, wznowisz go jednym kliknięciem.')) run('/agents/handlowiec/stop', () => 'Agent zatrzymany.'); });
  $('#agRun').onclick = async (e) => {
    e.target.disabled = true; e.target.textContent = 'Pracuję…';
    await run('/agents/handlowiec/run', (r) => r.skipped ? `Pominięto: ${r.skipped}` : `Gotowe: napisane ${r.written || 0}, wysłane ${r.sent?.ok ? 1 : 0}, nowe odpowiedzi ${r.replies?.found || 0}.`);
  };

  const box = $('#agTab');
  const T = { przeglad, odpowiedzi, maile, firmy, strategia, ustawienia, dziennik }[tab] || przeglad;
  await T(box, d);
  if (tab === 'przeglad' || tab === 'dziennik') odswiezajCo(60);
};

async function przeglad(box, { stats: st, settings: cfg }) {
  const a = st.last30;
  const offers = Object.keys(OFERTA).map((k) => ({ k, ...(st.offers30.find((o) => o.offer === k) || {}), on: cfg.offers[k]?.on }));
  const days = st.daily.length ? st.daily : [{ day: '—', sent: 0, replies: 0 }];
  const { log } = await api('/agents/handlowiec/log?kind=report&limit=1');
  box.innerHTML = `
    <div class="grid g4">
      ${kpi(`${st.today.sentToday}/${cfg.dailyLimit}`, 'wysłane dziś')}
      ${kpi(fmtNum(st.today.queued), 'gotowe w kolejce')}
      ${kpi(fmtNum(a.sent), 'pierwszych maili (30 dni)')}
      ${kpi(proc(a.replies, a.sent), `odpowiedzi (${a.replies || 0})`)}
      ${kpi(fmtNum(a.positive), 'zainteresowanych (pilne + ważne)')}
      ${kpi(fmtNum(a.followups), 'przypomnień wysłanych')}
      ${kpi(`${fmtNum(a.bounces)} / ${fmtNum(a.failed)}`, 'zwroty / błędy wysyłki')}
      ${kpi(`${st.usage.pln} zł`, `koszt AI, 30 dni (${fmtNum(st.usage.calls)} wywołań)`)}
    </div>
    ${log[0] ? `<div class="notice info" style="margin-top:20px">${esc(log[0].message)}</div>` : ''}
    <h2 class="sec">Wysłane dziennie (30 dni)</h2>
    <div class="card">${chart(days, 'sent')}</div>
    <h2 class="sec">Oferty: test A/B/C (30 dni)</h2>
    <div class="card" style="padding:0">${table(['Oferta', 'Wysłane', 'Odpowiedzi', 'Zainteresowani', 'Odmowy', 'Zwroty', 'Stan'], offers, (o) => `<tr>
      <td><strong>${OFERTA[o.k]}</strong></td><td>${fmtNum(o.sent)}</td><td>${fmtNum(o.replies)} <span class="muted small">${proc(o.replies, o.sent)}</span></td>
      <td>${fmtNum(o.positive)} <span class="muted small">${proc(o.positive, o.sent)}</span></td><td>${fmtNum(o.refusals)}</td><td>${fmtNum(o.bounces)}</td>
      <td>${o.on ? '<span class="tag ok">włączona</span>' : '<span class="tag">wyłączona</span>'}</td></tr>`)}</div>
    <div class="grid g2" style="margin-top:20px">
      <div class="card"><h3>Branże</h3>${table(['Branża', 'Wysłane', 'Odp.', 'Zaint.'], st.byIndustry, (r) => `<tr>
        <td class="small">${esc(r.industry)}</td><td>${r.sent}</td><td>${r.replies} <span class="muted small">${proc(r.replies, r.sent)}</span></td><td>${r.positive}</td></tr>`)}</div>
      <div class="card"><h3>Lejek firm i powody pominięcia</h3>
        <p class="small">${st.funnel.map((f) => `${ETAP[f.stage] || esc(f.stage || '—')}: <strong>${fmtNum(f.n)}</strong>`).join(' · ') || 'Agent jeszcze nie szukał firm.'}</p>
        ${table(['Dlaczego pominięta', 'Ile'], st.skipReasons, (r) => `<tr><td class="small">${esc(r.reason || '—')}</td><td>${r.n}</td></tr>`)}</div>
    </div>
    <h2 class="sec">Próbny mail</h2>
    <p class="sub">Wpisz adres dowolnej strony. Agent zrobi audyt i napisze maila tak, jak zrobiłby to naprawdę. Nic nie zostanie wysłane.</p>
    <form class="row" id="agPrev" style="flex-wrap:wrap;gap:10px">
      <input class="inp" name="url" style="max-width:22rem;margin:0" placeholder="np. pracownia.pl" required>
      <select class="inp" name="offer" style="max-width:14rem;margin:0"><option value="">oferta: wybór agenta</option>
        ${Object.entries(OFERTA).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select>
      <button class="btn sm">Napisz próbny mail</button>
    </form>
    <div id="agPrevOut" style="margin-top:16px"></div>`;
  $('#agPrev').onsubmit = async (e) => {
    e.preventDefault();
    const out = $('#agPrevOut');
    out.innerHTML = '<div class="empty">Audyt strony i pisanie… (do minuty)</div>';
    try {
      const r = await api('/agents/handlowiec/preview', { method: 'POST', body: { url: e.target.url.value, offer: e.target.offer.value } });
      out.innerHTML = `<div class="card">
        <p class="small muted">Strona ${esc(r.audit.host)}: ${r.audit.quality === 'dobra' ? 'porządna' : 'do poprawy'} (${r.audit.score} pkt) · oferta: ${OFERTA[r.offer]} · adres: ${esc(r.audit.email || 'nie znaleziono')}<br>
        Obserwacje: ${r.audit.reasons.map(esc).join('; ') || 'brak'}<br>Haczyk: ${esc(r.angle || '—')}</p>
        <p><strong>${esc(r.subject)}</strong></p>
        <pre style="white-space:pre-wrap;font:inherit">${esc(r.body)}</pre></div>`;
    } catch (err) { out.innerHTML = `<div class="notice bad">${esc(err.message)}</div>`; }
  };
}

async function odpowiedzi(box) {
  const all = new URLSearchParams(location.hash.split('?')[1] || '').get('all');
  const { replies } = await api(`/agents/handlowiec/replies${all ? '?all=1' : ''}`);
  box.innerHTML = `
    <p class="sub">Firmy, które odpisały. Agent ocenił, jak pilna jest sprawa, i zapisał szkic odpowiedzi w Gmailu, w tym samym wątku. Nic nie wysyła sam: przeczytaj, popraw i wyślij z Gmaila.
      <a href="#/agenci?tab=odpowiedzi${all ? '' : '&all=1'}">${all ? 'Pokaż tylko nowe' : 'Pokaż też obsłużone'}</a></p>
    ${replies.length ? replies.map((r) => {
      const [nazwa, klasa] = KAT_ODP[r.category] || [r.category, ''];
      const link = gmailLink(r.thread_id);
      return `<div class="card" style="margin-bottom:1px">
        <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
          <span><span class="tag ${klasa}">${nazwa}</span> <strong>${esc(r.company || r.domain || r.from_addr)}</strong>
            <span class="muted small">${esc(r.from_addr || '')} · ${fmtDateTime(r.received_at)} · ${OFERTA[r.offer] || ''}</span></span>
          <span class="row" style="gap:8px">${link ? `<a class="btn sm" href="${link}" target="_blank" rel="noopener">Otwórz w Gmailu</a>` : ''}
            ${r.status === 'nowa' ? `<button class="btn ghost sm" data-done="${r.id}">Obsłużone</button>` : '<span class="muted small">obsłużone</span>'}</span>
        </div>
        <p style="margin:.6rem 0 .3rem">${esc(r.summary || r.snippet || '')}</p>
        ${r.draft_body ? `<details><summary class="small muted">Szkic odpowiedzi (jest już w Gmailu)</summary>
          <pre style="white-space:pre-wrap;font:inherit;font-size:.88rem">${esc(r.draft_body)}</pre></details>` : ''}
      </div>`;
    }).join('') : '<div class="empty">Brak nowych odpowiedzi.</div>'}`;
  box.querySelectorAll('[data-done]').forEach((b) => {
    b.onclick = async () => { await api(`/agents/handlowiec/replies/${b.dataset.done}`, { method: 'PATCH', body: { status: 'obsluzona' } }); render(); };
  });
}

async function maile(box) {
  const { messages } = await api('/agents/handlowiec/messages?limit=150');
  box.innerHTML = `<p class="sub">Ostatnie maile agenta: w kolejce, wysłane i pominięte. Kliknij temat, żeby przeczytać treść.</p>
    <div class="card" style="padding:0">${table(['Kiedy', 'Firma', 'Temat', 'Oferta', 'Stan', ''], messages, (m) => {
      const [n, k] = STAN_MAILA[m.status] || [m.status, ''];
      return `<tr>
        <td class="small muted">${fmtDateTime(m.sent_at || m.created_at)}</td>
        <td class="small">${esc(m.company || m.domain || '')}<br><span class="muted">${esc(m.to_email)}</span></td>
        <td class="small"><a href="#" data-show="${m.id}">${esc(m.subject)}</a>${m.kind === 'followup' ? ' <span class="tag">przypomnienie</span>' : ''}</td>
        <td class="small">${OFERTA[m.offer] || ''}</td>
        <td><span class="tag ${k}">${n}</span>${m.reply_category ? ` <span class="tag ${(KAT_ODP[m.reply_category] || [])[1] || ''}">${(KAT_ODP[m.reply_category] || [m.reply_category])[0]}</span>` : ''}
          ${m.error && m.status !== 'sent' ? `<br><span class="muted small">${esc(m.error)}</span>` : ''}</td>
        <td>${m.status === 'agent_queued' ? `<button class="btn ghost sm" data-drop="${m.id}">Nie wysyłaj</button>` : ''}</td></tr>`;
    })}</div>`;
  box.querySelectorAll('[data-show]').forEach((a) => {
    a.onclick = (e) => {
      e.preventDefault();
      const m = messages.find((x) => String(x.id) === a.dataset.show);
      openModal(m.subject, `<p class="small muted">Do: ${esc(m.to_email)} · ${OFERTA[m.offer] || ''}</p>
        <pre style="white-space:pre-wrap;font:inherit">${esc(m.body)}</pre>
        ${gmailLink(m.gmail_thread_id) ? `<p><a href="${gmailLink(m.gmail_thread_id)}" target="_blank" rel="noopener">Otwórz wątek w Gmailu</a></p>` : ''}`, async () => {});
    };
  });
  box.querySelectorAll('[data-drop]').forEach((b) => {
    b.onclick = async () => { await api(`/agents/handlowiec/messages/${b.dataset.drop}`, { method: 'DELETE' }); toast('Usunięte z kolejki.'); render(); };
  });
}

async function firmy(box) {
  const stage = new URLSearchParams(location.hash.split('?')[1] || '').get('stage') || '';
  const { leads } = await api(`/agents/handlowiec/leads${stage ? `?stage=${stage}` : ''}`);
  box.innerHTML = `<p class="sub">Firmy, które agent znalazł i sprawdził.
    ${['', ...Object.keys(ETAP)].map((k) => `<a href="#/agenci?tab=firmy${k ? `&stage=${k}` : ''}" style="margin-left:10px;${k === stage ? 'font-weight:600' : ''}">${k ? ETAP[k] : 'wszystkie'}</a>`).join('')}</p>
    <div class="card" style="padding:0">${table(['Firma', 'Miasto / branża', 'Ocena strony', 'Etap', 'Uwagi'], leads, (l) => `<tr>
      <td class="small"><a href="#/leady/${l.id}">${esc(l.company || l.domain)}</a><br><span class="muted">${esc(l.domain || '')} ${esc(l.email || '')}</span></td>
      <td class="small">${esc(l.city || '—')}<br><span class="muted">${esc(l.industry || '')}</span></td>
      <td>${l.score ? scoreTag(l.score * 10 > 100 ? 100 : l.score * 10) : '—'}</td>
      <td><span class="tag">${ETAP[l.agent_stage] || esc(l.agent_stage || '')}</span></td>
      <td class="small muted">${esc(l.agent_note || '')}</td></tr>`)}</div>`;
}

async function strategia(box, { settings: cfg, playbook }) {
  const { playbooks } = await api('/agents/handlowiec/playbooks');
  box.innerHTML = `
    <p class="sub">Strategia to stała instrukcja sprzedażowa, którą ustawiasz sam. Wnioski to to, czego agent nauczył się na wynikach:
      co poniedziałek o 6:20 analizuje odpowiedzi z 4 tygodni i zapisuje nową wersję. Możesz ją poprawić albo wrócić do starszej.</p>
    <div class="grid g2">
      <div class="card"><h3>Strategia sprzedażowa (od Ciebie)</h3>
        <textarea class="inp" id="agStrategy" style="min-height:22rem">${esc(cfg.strategy)}</textarea>
        <div class="row" style="margin-top:10px;gap:8px"><button class="btn sm" id="agSaveStrategy">Zapisz strategię</button>
          <button class="btn ghost sm" id="agResetStrategy">Przywróć domyślną</button></div></div>
      <div class="card"><h3>Aktualne wnioski agenta ${playbook ? `(wersja #${playbook.id}, ${fmtDate(playbook.created_at)})` : ''}</h3>
        <textarea class="inp" id="agPlaybook" style="min-height:22rem" placeholder="Jeszcze nie ma wniosków. Pojawią się po pierwszym tygodniu wysyłki (min. 20 maili).">${esc(playbook?.content || '')}</textarea>
        <div class="row" style="margin-top:10px;gap:8px"><button class="btn sm" id="agSavePlaybook">Zapisz jako nową wersję</button>
          <button class="btn ghost sm" id="agLearn">Ucz się teraz</button></div></div>
    </div>
    <h2 class="sec">Historia wersji</h2>
    ${playbooks.length ? playbooks.map((p) => `<div class="card" style="margin-bottom:1px">
      <div class="row" style="justify-content:space-between"><span><strong>#${p.id}</strong> <span class="muted small">${fmtDateTime(p.created_at)} · ${p.source === 'auto' ? 'nauka agenta' : 'Twoja zmiana'}</span>
        ${p.active ? ' <span class="tag ok">aktywna</span>' : ''}</span>
        ${p.active ? '' : `<button class="btn ghost sm" data-act="${p.id}">Włącz tę wersję</button>`}</div>
      ${p.summary ? `<p class="small" style="white-space:pre-wrap">${esc(p.summary)}</p>` : ''}
      <details><summary class="small muted">Treść</summary><pre style="white-space:pre-wrap;font:inherit;font-size:.88rem">${esc(p.content)}</pre></details>
    </div>`).join('') : '<div class="empty">Brak wersji.</div>'}`;
  const patch = (body, msg) => api('/agents/handlowiec/settings', { method: 'PATCH', body }).then(() => { toast(msg); render(); }).catch((e) => toast(e.message, true));
  $('#agSaveStrategy').onclick = () => patch({ strategy: $('#agStrategy').value }, 'Strategia zapisana. Działa od następnego maila.');
  $('#agResetStrategy').onclick = async () => {
    if (!confirm('Przywrócić domyślną strategię?')) return;
    await api('/agents/handlowiec/settings/reset', { method: 'POST', body: { fields: ['strategy'] } }); render();
  };
  $('#agSavePlaybook').onclick = async () => {
    try { await api('/agents/handlowiec/playbooks', { method: 'POST', body: { content: $('#agPlaybook').value } }); toast('Zapisano nową wersję wniosków.'); render(); }
    catch (err) { toast(err.message, true); }
  };
  $('#agLearn').onclick = async (e) => {
    e.target.disabled = true; e.target.textContent = 'Analizuję…';
    try { await api('/agents/handlowiec/learn', { method: 'POST' }); toast('Nowe wnioski zapisane.'); } catch (err) { toast(err.message, true); }
    render();
  };
  box.querySelectorAll('[data-act]').forEach((b) => {
    b.onclick = async () => { await api(`/agents/handlowiec/playbooks/${b.dataset.act}/activate`, { method: 'POST' }); toast('Włączono.'); render(); };
  });
}

async function ustawienia(box, { settings: cfg }) {
  const DNI = [[1, 'pn'], [2, 'wt'], [3, 'śr'], [4, 'cz'], [5, 'pt'], [6, 'sb'], [7, 'nd']];
  const num = (name, label, hint = '') => `<label class="f">${label}<input type="number" min="0" name="${name}" value="${esc(cfg[name])}">${hint ? `<span class="small muted">${hint}</span>` : ''}</label>`;
  const hb = cfg.sources.homebook;
  const gg = cfg.sources.google;
  box.innerHTML = `<form id="agCfg">
    <div class="grid g2">
      <div class="card"><h3>Tempo wysyłki</h3>
        ${num('dailyLimit', 'Maili dziennie (z przypomnieniami)', 'Bezpiecznie dla zwykłego Gmaila: do 30–40.')}
        ${num('hourlyLimit', 'Maks. na godzinę')}
        <div class="row" style="gap:12px">${num('windowStart', 'Wysyłka od godziny')}${num('windowEnd', 'do godziny')}</div>
        <label class="f">Dni wysyłki<span class="row" style="gap:12px;margin-top:8px">${DNI.map(([n, l]) => `<label class="small"><input type="checkbox" name="day" value="${n}" ${cfg.workdays.includes(n) ? 'checked' : ''}> ${l}</label>`).join('')}</span></label>
        <div class="row" style="gap:12px">${num('followUpAfterDays', 'Przypomnienie po (dniach)')}${num('maxFollowUps', 'Ile przypomnień (0 = bez)')}</div>
        ${num('maxWords', 'Maks. słów w mailu')}
        <label class="f">Rezygnacja z wiadomości<select name="unsubscribe">
          <option value="reply" ${cfg.unsubscribe === 'reply' ? 'selected' : ''}>dopisek „wystarczy odpisać nie”</option>
          <option value="link" ${cfg.unsubscribe === 'link' ? 'selected' : ''}>link do wypisania</option>
          <option value="none" ${cfg.unsubscribe === 'none' ? 'selected' : ''}>bez dopisku</option></select></label>
        <label class="f"><input type="checkbox" name="autoLearn" ${cfg.autoLearn ? 'checked' : ''} style="display:inline;width:auto"> Nowe wnioski z nauki włączają się same (bez tego czekają na Twoją akceptację)</label>
        <label class="f">Model AI<input name="model" value="${esc(cfg.model || '')}"></label>
      </div>
      <div class="card"><h3>Oferty (agent dzieli maile po równo, z wagami)</h3>
        ${Object.entries(cfg.offers).map(([k, o]) => `<div style="margin-bottom:18px">
          <div class="row" style="gap:12px;align-items:center"><label class="small"><input type="checkbox" name="on_${k}" ${o.on ? 'checked' : ''}> <strong>${esc(o.name)}</strong></label>
            <label class="small">waga <input type="number" step="0.5" min="0" name="w_${k}" value="${esc(o.weight)}" style="width:4.5rem;display:inline"></label></div>
          <p class="small muted" style="margin:.3rem 0">Dla: ${esc(o.for)}</p>
          <textarea class="inp" name="d_${k}" style="min-height:8rem">${esc(o.desc)}</textarea></div>`).join('')}
      </div>
      <div class="card"><h3>Źródła firm</h3>
        <label class="small"><input type="checkbox" name="hbOn" ${hb.on ? 'checked' : ''}> Homebook</label>
        <label class="f">Kategorie (po jednej w linii)<textarea class="inp" name="hbCat" style="min-height:7rem">${esc(hb.categories.join('\n'))}</textarea></label>
        <label class="f">Województwa<textarea class="inp" name="hbReg" style="min-height:7rem">${esc(hb.regions.join('\n'))}</textarea></label>
        <label class="small"><input type="checkbox" name="ggOn" ${gg.on ? 'checked' : ''}> Wyszukiwanie Google</label>
        <label class="f">Zapytania ({city} = miasto)<textarea class="inp" name="ggQ" style="min-height:7rem">${esc(gg.queries.join('\n'))}</textarea></label>
        <label class="f">Miasta<textarea class="inp" name="ggC" style="min-height:7rem">${esc(gg.cities.join('\n'))}</textarea></label>
      </div>
      <div class="card"><h3>Zakazane zwroty (brzmią jak AI)</h3>
        <textarea class="inp" name="forbidden" style="min-height:22rem">${esc(cfg.forbidden.join('\n'))}</textarea>
        <p class="small muted">Mail z takim zwrotem, długim myślnikiem albo wykrzyknikiem wraca do poprawki, a jeśli dalej nie przejdzie kontroli, nie zostaje wysłany.</p>
      </div>
    </div>
    <div class="row" style="margin-top:18px;gap:10px"><button class="btn">Zapisz ustawienia</button>
      <button type="button" class="btn ghost" id="agReset">Przywróć domyślne oferty, źródła i zwroty</button></div>
  </form>`;
  $('#agCfg').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const body = {
      dailyLimit: f.dailyLimit.value, hourlyLimit: f.hourlyLimit.value, windowStart: f.windowStart.value, windowEnd: f.windowEnd.value,
      followUpAfterDays: f.followUpAfterDays.value, maxFollowUps: f.maxFollowUps.value, maxWords: f.maxWords.value,
      workdays: [...f.querySelectorAll('[name=day]:checked')].map((x) => Number(x.value)),
      unsubscribe: f.unsubscribe.value, autoLearn: f.autoLearn.checked, model: f.model.value.trim(),
      forbidden: lines(f.forbidden.value),
      offers: Object.fromEntries(Object.keys(cfg.offers).map((k) => [k, { on: f[`on_${k}`].checked, weight: f[`w_${k}`].value, desc: f[`d_${k}`].value }])),
      sources: {
        homebook: { on: f.hbOn.checked, categories: lines(f.hbCat.value), regions: lines(f.hbReg.value) },
        google: { on: f.ggOn.checked, queries: lines(f.ggQ.value), cities: lines(f.ggC.value) },
      },
    };
    try { await api('/agents/handlowiec/settings', { method: 'PATCH', body }); toast('Ustawienia zapisane.'); render(); }
    catch (err) { toast(err.message, true); }
  };
  $('#agReset').onclick = async () => {
    if (!confirm('Przywrócić domyślne oferty, źródła i listę zwrotów?')) return;
    await api('/agents/handlowiec/settings/reset', { method: 'POST', body: { fields: ['offers', 'sources', 'forbidden'] } });
    toast('Przywrócono.'); render();
  };
}

async function dziennik(box) {
  const { log } = await api('/agents/handlowiec/log?limit=200');
  const KL = { error: 'bad', warn: 'warn', alert: 'bad', report: 'ok', action: '', info: '' };
  const NAZWA = { error: 'błąd', warn: 'uwaga', alert: 'pilne', report: 'raport', action: 'zrobione', info: 'info' };
  box.innerHTML = `<p class="sub">Wszystko, co agent zrobił, po kolei. Odświeża się co minutę.</p>
    <div class="card" style="padding:0">${table(['Kiedy', 'Co', ''], log, (r) => `<tr>
      <td class="small muted" style="white-space:nowrap">${fmtDateTime(r.ts)}</td>
      <td><span class="tag ${KL[r.kind] || ''}">${NAZWA[r.kind] || esc(r.kind)}</span></td>
      <td class="small" style="white-space:pre-wrap">${esc(r.message)}</td></tr>`)}</div>`;
}

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


/* --- Briefy od klientów ----------------------------------------------------
   Zamiast wyciągać kontekst przez trzy telefony i pięć maili, klient dostaje link
   do formularza. Komplet odpowiedzi ląduje tutaj, przy kartkach i plikach — czyli
   tam, gdzie i tak zaglądasz, zaczynając projekt. */

const STAN_BRIEFU = { wyslany: 'wysłany', otwarty: 'otwarty przez klienta', wypelniony: 'wypełniony' };
const KLASA_BRIEFU = { wypelniony: 'ok', otwarty: 'warn' };

function sekcjaBriefow(dane) {
  const b = dane?.briefy || [];
  return `
    <h2 class="sec">Briefy od klientów${dane?.nowe ? ` <span class="tag ok">${dane.nowe} nowe</span>` : ''}</h2>
    <p class="sub">Wysyłasz link, klient opisuje styl, kolory, inspiracje i priorytety. Wypełniony brief wraca tutaj.</p>
    <div class="row" style="margin-bottom:14px"><button class="btn sm" id="btnNowyBrief">Nowy brief</button></div>
    ${b.length ? `<div class="card">${table(['Klient', 'Stan', 'Kiedy', 'Akcje'], b, (x) => `<tr${
        x.status === 'wypelniony' && !x.przeczytany ? ' style="font-weight:600"' : ''}>
      <td>${x.firma
          ? `<a href="#" data-brief="${x.id}">${esc(x.firma)}</a><br><span class="muted small">${esc(x.email || '')}</span>`
          : `${esc(x.etykieta || 'bez nazwy')}<br><span class="muted small">czeka na wypełnienie</span>`}</td>
      <td><span class="tag ${KLASA_BRIEFU[x.status] || ''}">${STAN_BRIEFU[x.status] || x.status}</span>
        ${x.otwarcia ? `<br><span class="muted small">otwarty ${x.otwarcia}×</span>` : ''}</td>
      <td class="small">${fmtDate(x.wypelniony_at || x.created_at)}</td>
      <td>${x.status === 'wypelniony'
          ? `<button class="btn ghost sm" data-brief="${x.id}">Zobacz odpowiedzi</button>
             <button class="btn ghost sm" data-plik="${x.id}" data-firma="${esc(x.firma || '')}">Pobierz</button>`
          : `<button class="btn ghost sm" data-linkbrief="${esc(x.token)}">Kopiuj link</button>`}
        <button class="btn ghost sm" data-delbrief="${x.id}">Usuń</button></td></tr>`)}</div>`
      : '<div class="empty">Nie ma jeszcze żadnego briefu. Kliknij „Nowy brief", a dostaniesz link do wysłania klientowi.</div>'}
  `;
}

function wireBriefy() {
  const nowy = $('#btnNowyBrief');
  if (nowy) nowy.onclick = () => openModal('Nowy brief',
    `<label class="f">Dla kogo? <span class="muted small">(tylko dla Ciebie, klient tego nie widzi)</span>
      <input class="inp" name="etykieta" placeholder="np. Pracownia Kowalska" autofocus></label>`,
    async (d) => {
      const { brief } = await api('/briefs', { method: 'POST', body: { etykieta: d.etykieta } });
      const adres = `${location.origin}/brief/${brief.token}`;
      try { await navigator.clipboard.writeText(adres); toast('Link skopiowany — wyślij go klientowi.'); }
      catch { toast('Brief utworzony.'); }
      render();
    });

  view.querySelectorAll('[data-linkbrief]').forEach((el) => {
    el.onclick = async () => {
      const adres = `${location.origin}/brief/${el.dataset.linkbrief}`;
      try { await navigator.clipboard.writeText(adres); toast('Link skopiowany.'); }
      catch { openModal('Link do briefu', `<label class="f">Skopiuj i wyślij<input class="inp" value="${esc(adres)}"></label>`, () => {}); }
    };
  });

  view.querySelectorAll('[data-brief]').forEach((el) => {
    el.onclick = async (e) => {
      e.preventDefault();
      const { brief } = await api(`/briefs/${el.dataset.brief}`);
      pokazBrief(brief);
      if (!brief.przeczytany) {
        await api(`/briefs/${brief.id}/przeczytany`, { method: 'POST' }).catch(() => {});
      }
    };
  });

  view.querySelectorAll('[data-plik]').forEach((el) => {
    el.onclick = async () => {
      // Zwykły odnośnik nie dołożyłby nagłówka z sesją, więc pobieramy przez fetch
      // i dopiero gotowy plik podsuwamy przeglądarce.
      try {
        const res = await fetch(`/api/admin/briefs/${el.dataset.plik}/plik`, { headers: naglowki() });
        if (!res.ok) throw new Error('Nie udało się pobrać pliku.');
        const tekst = await res.text();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([tekst], { type: 'text/markdown;charset=utf-8' }));
        a.download = `brief-${(el.dataset.firma || 'klient').toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.md`;
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        toast('Ściąga pobrana.');
      } catch (err) { toast(err.message, true); }
    };
  });

  view.querySelectorAll('[data-delbrief]').forEach((el) => {
    el.onclick = async () => {
      if (!confirm('Usunąć ten brief razem z odpowiedziami?')) return;
      await api(`/briefs/${el.dataset.delbrief}`, { method: 'DELETE' });
      toast('Usunięte.'); render();
    };
  });
}

/** Odpowiedzi grupujemy sekcjami tak samo jak w formularzu — czyta się je wtedy jak dokument, nie jak zrzut bazy. */
function pokazBrief(b) {
  const sekcje = [];
  for (const p of b.pola) {
    if (!sekcje.length || sekcje[sekcje.length - 1].tytul !== p.sekcja) sekcje.push({ tytul: p.sekcja, pola: [] });
    sekcje[sekcje.length - 1].pola.push(p);
  }
  const wartosc = (p) => {
    if (p.typ === 'ocena') {
      const n = Number(p.wartosc) || 0;
      return `<span style="letter-spacing:2px">${'●'.repeat(n)}${'○'.repeat(5 - n)}</span> <span class="muted small">${n}/5</span>`;
    }
    if (Array.isArray(p.wartosc)) return p.wartosc.map((v) => `<span class="tag">${esc(v)}</span>`).join(' ');
    const t = String(p.wartosc);
    if (/^https?:\/\//i.test(t)) return `<a href="${esc(t)}" target="_blank" rel="noopener">${esc(t)}</a>`;
    return esc(t).replace(/\n/g, '<br>');
  };
  modal.innerHTML = `<h3>${esc(b.firma || 'Brief')}</h3>
    <p class="muted small" style="margin:-6px 0 18px">${esc(b.email || '')}${
      b.wypelniony_at ? ' · wypełniony ' + fmtDateTime(b.wypelniony_at) : ''}</p>
    <div style="max-height:62vh;overflow:auto;padding-right:6px">
      ${sekcje.map((s) => `<h4 class="sec" style="margin:18px 0 8px">${esc(s.tytul)}</h4>
        ${s.pola.map((p) => `<div style="margin:0 0 12px">
          <div class="muted small">${esc(p.etykieta)}</div>
          <div>${wartosc(p)}</div></div>`).join('')}`).join('')}
    </div>
    <div class="row end" style="margin-top:18px"><button class="btn" id="zamknijBrief">Zamknij</button></div>`;
  modal.showModal();
  $('#zamknijBrief').onclick = () => modal.close();
}

views['/notatnik'] = async () => {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const showDone = params.get('done') === '1';
  const folder = params.get('folder') || '';
  view.innerHTML = '<div class="empty">Wczytywanie…</div>';

  const [{ notes, doneCount, licznik }, filesData, briefy] = await Promise.all([
    api(`/board/notes${showDone ? '?done=1' : ''}`),
    api(`/board/files${folder ? `?folder=${encodeURIComponent(folder)}` : ''}`),
    api('/briefs').catch(() => ({ briefy: [], nowe: 0 })),
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
        <button class="btn ghost sm" id="btnRefreshBoard">Wczytaj zapisane zmiany</button>
        <button class="btn ghost sm" id="btnBoardBackups">Kopie i przywracanie</button>
      </div>
    </div>

    <div class="boardTools">
      <label>Szukaj klienta<input class="inp" id="boardSearch" placeholder="Nazwa, e-mail lub treść"></label>
      <label for="boardFilter">Pokaż<select class="inp" id="boardFilter" aria-label="Pokaż">
        <option value="all">Wszystkie kartki</option><option value="mine">Ruch po mojej stronie</option>
        <option value="waiting">Czekam na klienta</option><option value="review">Do sprawdzenia / brak adresu</option>
        <option value="due">Z terminem</option>
      </select></label>
    </div>
    <p class="small muted">Aktualizacja z Gmaila: napisz w czacie „zaktualizuj tablicę”. Asystent przeczyta wątki i zapisze ustalenia tutaj. „Wczytaj zapisane zmiany” odświeża widok, nie analizuje poczty.</p>
    ${notes.length ? pickGroup('notatki', `
      <div class="notes" id="boardCards">${notes.map(noteCard).join('')}</div>`) : `
      <div class="empty">
        Tablica jest pusta. Pierwsza kartka to zwykle lista rzeczy, o których łatwo zapomnieć.
      </div>`}

    ${sekcjaBriefow(briefy)}

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

  const refreshSelection = bulkWire('notatki', (id) => api(`/board/notes/${id}`, { method: 'DELETE' }), { label: 'kartek', visibleOnly: true });
  wireBriefy();
  bulkWire('pliki', (id) => api(`/board/files/${id}`, { method: 'DELETE' }), { label: 'plików' });

  $('#btnNewNote').onclick = () => noteModal();
  $('#btnBoardBackups').onclick = boardBackups;
  $('#btnRefreshBoard').onclick = () => render();
  const filterCards = () => {
    const query = $('#boardSearch').value.toLocaleLowerCase('pl');
    const filter = $('#boardFilter').value;
    for (const n of notes) {
      const card = view.querySelector(`[data-card-id="${n.id}"]`);
      const a = n.mail_summary;
      const searchable = [n.title, n.body, n.contact_emails, a?.summary, a?.next_step].join(' ').toLocaleLowerCase('pl');
      const match = filter === 'all' || (filter === 'mine' && (a?.owner === 'Jakub' || ['do-zrobienia','do-poprawek','w-trakcie'].includes(n.status)))
        || (filter === 'waiting' && (a?.owner === 'Klient' || CZEKA_NA_KLIENTA.includes(n.status)))
        || (filter === 'review' && (!n.contact_emails || !a || a.needs_review))
        || (filter === 'due' && (n.due_date || a?.due_date));
      if (card) card.hidden = !match || !searchable.includes(query);
    }
    refreshSelection?.();
  };
  $('#boardSearch').oninput = filterCards;
  $('#boardFilter').onchange = filterCards;


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

function noteMailSummary(a) {
  if (!a) return '<div class="note__mail small">Jeszcze nie sprawdzono korespondencji.</div>';
  return `<section class="note__mail" aria-label="Ustalenia z Gmaila">
    <div class="note__eyebrow">Z Gmaila ${a.needs_review ? '· DO SPRAWDZENIA' : ''}</div>
    <p>${esc(a.summary)}</p>
    <div class="note__next"><b>Ruch: ${esc(a.owner)}</b><br>${esc(a.next_step)}</div>
    ${a.due_date ? `<p><b>Termin z maila: ${esc(fmtDate(a.due_date))}</b></p>` : ''}
    <details><summary>Dowody i zakres sprawdzenia</summary>
      <p class="small">${a.manual ? 'Ustalenia zapisane po przeglądzie korespondencji.' : `Sprawdzono ${a.message_count} wiadomości / ${a.thread_count} wątków.`}
      Ostatni kontakt: ${esc(fmtDateTime(a.last_contact))}. Aktualizacja: ${esc(fmtDateTime(a.checked_at))}.</p>
      ${a.manual ? '' : '<p class="small">Treści wiadomości odczytane w całości. Załączniki: sprawdzono nazwy, bez analizy zawartości.</p>'}
      ${(a.sources || []).map((url,i) => `<p><a target="_blank" rel="noopener" href="${esc(url)}">Wątek Gmail ${i+1}</a></p>`).join('')}
      ${(a.evidence || []).map(e => `<blockquote><a target="_blank" rel="noopener"
        href="https://mail.google.com/mail/u/0/#all/${encodeURIComponent(e.thread_id)}">${esc(e.date)}</a><br>${esc(e.quote)}</blockquote>`).join('')}
    </details>
  </section>`;
}

async function downloadBoardBackup(id) {
  const res = await fetch(`/api/admin/board/backups/${id}/download`, { headers: naglowki() });
  if (!res.ok) throw new Error('Nie udało się pobrać kopii.');
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a'); link.href = url; link.download = `tablica-${id}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function boardBackups() {
  const { backups } = await api('/board/backups');
  modal.innerHTML = `<h3>Kopie tablicy</h3>
    <p class="small muted">Każda edycja kartki zapisuje wcześniej kopię wszystkich kartek. Kopie zostają na serwerze; możesz też pobrać JSON na swój dysk.
    Przywracanie cofa treść i ustawienia istniejących kartek. Nie usuwa nowych kartek i nie odtwarza usuniętych. Pliki i briefy są poza tą kopią.</p>
    <button class="btn sm" id="newBoardBackup">Utwórz i pobierz kopię</button>
    <div class="backupList">${backups.map(b => `<div class="backupRow"><div><b>${esc(fmtDateTime(b.created_at))}</b>
      <br><span class="small">${esc(b.reason)}</span></div><div class="row">
      <button class="btn ghost sm" data-backup-download="${b.id}">Pobierz</button>
      <button class="btn ghost sm" data-backup-restore="${b.id}">Przywróć</button></div></div>`).join('') || '<p>Nie ma jeszcze kopii.</p>'}</div>
    <div class="row end"><button class="btn" id="closeBoardBackups">Zamknij</button></div>`;
  if (!modal.open) modal.showModal();
  $('#closeBoardBackups').onclick = () => modal.close();
  $('#newBoardBackup').onclick = async () => {
    try { const { id } = await api('/board/backups', { method: 'POST', body: {} }); await downloadBoardBackup(id); await boardBackups(); }
    catch (err) { toast(err.message, true); }
  };
  modal.querySelectorAll('[data-backup-download]').forEach(b => { b.onclick = () => downloadBoardBackup(b.dataset.backupDownload).catch(err => toast(err.message, true)); });
  modal.querySelectorAll('[data-backup-restore]').forEach(b => { b.onclick = async () => {
    if (!confirm('Przywrócić istniejące kartki do tej wersji? Bieżący stan zostanie najpierw zapisany jako nowa kopia.')) return;
    b.disabled = true;
    try {
      const { restored } = await api(`/board/backups/${b.dataset.backupRestore}/restore`, { method: 'POST', body: {} });
      modal.close(); toast(`Przywrócono ${restored} kartek.`); render();
    } catch (err) { toast(err.message, true); b.disabled = false; }
  }; });
}

function noteCard(n) {
  const status = n.status || 'do-zrobienia';
  const zrobiona = status === 'zrobione';
  const czeka = CZEKA_NA_KLIENTA.includes(status);
  const przeterminowana = n.due_date && !zrobiona && n.due_date < new Date().toISOString().slice(0, 10);
  return `<article data-card-id="${n.id}" class="note pickItem note--${esc(n.color)} ${zrobiona ? 'note--done' : ''}">
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
    ${n.contact_emails ? `<div class="note__contact">${esc(n.contact_emails)}</div>` : '<div class="note__contact">E-mail klienta można dodać w edycji</div>'}
    ${noteMailSummary(n.mail_summary)}
    ${n.body ? `<div class="note__manual"><b>Moje notatki</b><pre class="note__body">${esc(n.body)}</pre></div>` : ''}
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
    <label class="f">Moje notatki — odświeżanie ich nie nadpisuje<textarea name="body" placeholder="Twoje ustalenia, pomysły, zadania…">${esc(note?.body || '')}</textarea></label>
    <label class="f">Potwierdzone adresy klienta (przecinki oddzielają adresy)<input name="contact_emails"
      value="${esc(note?.contact_emails || '')}" placeholder="np. studio@firma.pl"></label>
    <p class="small muted">Dodaj również starszy adres klienta, jeśli korespondencja była prowadzona na kilku skrzynkach.</p>
    ${isEdit ? `<details open><summary>Ustalenia z korespondencji</summary>
      <p class="small muted">Wypełniane po przeczytaniu maili. Twoje notatki pozostają osobno.</p>
      <label class="f">Na czym stanęło<textarea name="mail_summary_text">${esc(note?.mail_summary?.summary || '')}</textarea></label>
      <label class="f">Następny krok<textarea name="mail_next_step">${esc(note?.mail_summary?.next_step || '')}</textarea></label>
      <label class="f">Ruch po stronie<select name="mail_owner">${['Jakub','Klient','Do ustalenia'].map(x => `<option ${note?.mail_summary?.owner === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label class="f">Ostatni kontakt<input type="date" name="mail_last_contact" value="${esc(note?.mail_summary?.last_contact?.slice(0,10) || '')}"></label>
      <label class="f">Termin wynikający z maila<input type="date" name="mail_due_date" value="${esc(note?.mail_summary?.due_date || '')}"></label>
      <label class="f">Linki do wątków Gmaila — każdy w osobnej linii<textarea name="mail_sources">${esc((note?.mail_summary?.sources || []).join('\n'))}</textarea></label>
      <label class="f">Pewność ustaleń<select name="mail_needs_review"><option value="0">Potwierdzone w korespondencji</option><option value="1" ${note?.mail_summary?.needs_review ? 'selected' : ''}>Do sprawdzenia</option></select></label>
    </details>` : ''}
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
      if (isEdit) {
        body.expected_updated_at = note.updated_at;
        if (data.mail_summary_text?.trim()) body.mail_summary = {
          summary: data.mail_summary_text, next_step: data.mail_next_step, owner: data.mail_owner,
          due_date: data.mail_due_date || null, last_contact: data.mail_last_contact || null,
          needs_review: data.mail_needs_review === '1', sources: data.mail_sources.split(/\r?\n/).map(x => x.trim()).filter(Boolean)
        };
      }
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


/* --- Wyceny ---------------------------------------------------------------
   Każde „bezpłatna wycena" ze strony kończyło się pisaniem oferty od zera w mailu.
   Tutaj składasz ją z pozycji, a klient dostaje link do strony z ofertą — więc
   widać też, czy w ogóle ją otworzył, zamiast wnioskować z ciszy. */

const STAN_WYCENY = { robocza: 'robocza', wyslana: 'wysłana', otwarta: 'otwarta przez klienta', przyjeta: 'przyjęta', odrzucona: 'odrzucona' };
const KLASA_WYCENY = { otwarta: 'ok', przyjeta: 'ok', odrzucona: 'bad', wyslana: 'warn' };
const zl = (n) => new Intl.NumberFormat('pl-PL').format(Math.round(Number(n) || 0)) + ' zł';

async function kreatorWyceny(lead) {
  const { pakiety } = await api('/quotes/pakiety');
  const wiersze = pakiety.map((p, i) => `
    <label class="f" style="display:flex;gap:10px;align-items:flex-start;margin:0 0 10px">
      <input type="checkbox" name="poz${i}" value="1" style="margin-top:5px">
      <span style="flex:1">
        <strong>${esc(p.nazwa)}</strong>
        <small class="muted" style="display:block">${esc(p.opis)}</small>
      </span>
      <input class="inp" name="cena${i}" type="number" min="0" step="50" value="${p.cena}" style="width:100px">
    </label>`).join('');

  openModal(`Wycena${lead ? ' dla ' + (lead.company || lead.name || '') : ''}`, `
    <p class="muted small" style="margin:0 0 14px">Zaznacz pozycje i popraw ceny, jeśli trzeba. Klient dostanie link do strony z ofertą.</p>
    ${wiersze}
    <label class="f">Własna pozycja (opcjonalnie)
      <input class="inp" name="wlasnaNazwa" placeholder="np. Integracja z kalendarzem rezerwacji"></label>
    <div class="row" style="gap:10px">
      <label class="f" style="flex:1">Cena własnej pozycji
        <input class="inp" name="wlasnaCena" type="number" min="0" step="50" placeholder="0"></label>
      <label class="f" style="flex:1">Ważna przez (dni)
        <input class="inp" name="wazneDni" type="number" min="1" max="90" value="14"></label>
    </div>
    <label class="f">Proponowany termin
      <input class="inp" name="termin" placeholder="np. wrzesień, 10 dni roboczych"></label>
    <label class="f">Uwagi dla klienta
      <textarea class="inp" name="notatka" style="min-height:5rem" placeholder="Co jest po Twojej stronie, co po jego."></textarea></label>
  `, async (d) => {
    const pozycje = pakiety
      .map((p, i) => (d[`poz${i}`] ? { nazwa: p.nazwa, opis: p.opis, cena: Number(d[`cena${i}`]) || 0 } : null))
      .filter(Boolean);
    if (d.wlasnaNazwa?.trim()) {
      pozycje.push({ nazwa: d.wlasnaNazwa.trim(), opis: '', cena: Number(d.wlasnaCena) || 0 });
    }
    if (!pozycje.length) throw new Error('Zaznacz przynajmniej jedną pozycję.');
    const { wycena } = await api('/quotes', { method: 'POST', body: {
      leadId: lead?.id || null, klient: lead?.name || null, firma: lead?.company || null,
      pozycje, termin: d.termin, notatka: d.notatka, wazneDni: Number(d.wazneDni) || 14,
    } });
    toast(`Wycena na ${zl(wycena.suma)} gotowa.`);
    location.hash = '#/wyceny';
    render();
  });
}

views['/wyceny'] = async () => {
  view.innerHTML = '<div class="empty">Wczytywanie…</div>';
  const { wyceny } = await api('/quotes');

  view.innerHTML = `
    <h1 class="page">Wyceny</h1>
    <p class="sub">Oferty wysłane klientom. Widać, którą otworzyli.</p>
    <div class="row" style="margin-bottom:18px"><button class="btn" id="nowaWycena">Nowa wycena</button></div>
    ${wyceny.length ? pickGroup('wyceny', `<div class="card">${
      table(['', 'Klient', 'Zakres', 'Kwota', 'Stan', 'Akcje'], wyceny, (w) => `<tr>
        <td>${pick(w.id)}</td>
        <td><strong>${esc(w.firma || w.klient || '—')}</strong><br>
          <span class="muted small">${fmtDate(w.created_at)}${w.wazna_do ? ' · ważna do ' + fmtDate(w.wazna_do) : ''}</span></td>
        <td class="small">${w.pozycje.map((p) => esc(p.nazwa)).join('<br>')}</td>
        <td><strong>${zl(w.suma)}</strong></td>
        <td><span class="tag ${KLASA_WYCENY[w.status] || ''}">${STAN_WYCENY[w.status] || w.status}</span>
          ${w.otwarcia ? `<br><span class="muted small">otwarta ${w.otwarcia}×</span>` : ''}</td>
        <td><button class="btn ghost sm" data-link="${esc(w.token)}" data-id="${w.id}" data-stan="${esc(w.status)}">Kopiuj link</button>
          <button class="btn ghost sm" data-wyslana="${w.id}">Wysłana</button>
          <button class="btn ghost sm" data-przyjeta="${w.id}">Przyjęta</button></td></tr>`)
    }</div>`) : '<div class="empty">Nie ma jeszcze żadnej wyceny. Zacznij od „Nowa wycena" albo od karty leada.</div>'}
  `;

  $('#nowaWycena').onclick = () => kreatorWyceny(null);

  view.querySelectorAll('[data-link]').forEach((b) => {
    b.onclick = async () => {
      const adres = `${location.origin}/wycena/${b.dataset.link}`;
      try { await navigator.clipboard.writeText(adres); toast('Link skopiowany — wyślij go klientowi.'); }
      catch { openModal('Link do wyceny', `<label class="f">Skopiuj i wyślij<input class="inp" value="${esc(adres)}"></label>`, () => {}); }
      // Skopiowanie linku jest w praktyce wysłaniem. Bez tego wycena zostawała
      // „robocza" i nigdy nie przeskakiwała na „otwarta", więc śledzenie nie działało.
      if (b.dataset.stan === 'robocza') {
        await api(`/quotes/${b.dataset.id}`, { method: 'PATCH', body: { status: 'wyslana' } }).catch(() => {});
        render();
      }
    };
  });
  for (const [atrybut, stan] of [['data-wyslana', 'wyslana'], ['data-przyjeta', 'przyjeta']]) {
    view.querySelectorAll(`[${atrybut}]`).forEach((b) => {
      b.onclick = async () => {
        await api(`/quotes/${b.getAttribute(atrybut)}`, { method: 'PATCH', body: { status: stan } });
        toast('Zapisane.'); render();
      };
    });
  }
  bulkWire('wyceny', (id) => api(`/quotes/${id}`, { method: 'DELETE' }), { label: 'wycen' });
};

/* --- Ustawienia --- */
views['/ustawienia'] = async () => {
  view.innerHTML = '<div class="empty">Wczytywanie…</div>';
  const [g, opinieUst] = await Promise.all([
    api('/mail/google/status'),
    api('/projects/ustawienia/link-opinii').catch(() => ({ link: '' })),
  ]);
  const linkOpinii = opinieUst.link || '';
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
      <h3>Opinie w wizytówce Google</h3>
      <p class="small muted">Adres, pod którym klient wystawia opinię. Znajdziesz go w profilu firmy w Google:
        <strong>Poproś o opinie</strong> — Google wygeneruje krótki link. Panel wkleja go potem
        w gotową wiadomość do klienta.</p>
      <form id="formLinkOpinii" class="row" style="margin-top:12px;gap:8px;flex-wrap:wrap">
        <input class="inp" name="link" type="url" placeholder="https://g.page/r/..." style="flex:1;min-width:260px"
          value="${esc(linkOpinii)}">
        <button class="btn sm" type="submit">Zapisz</button>
      </form>
    </div>

    <div class="card">
      <h3>Konto Google (poczta i kalendarz)</h3>
      ${g.wygasl ? `<div class="notice bad">
        <strong>Połączenie wygasło.</strong>
        ${g.account ? `Konto <strong>${esc(g.account)}</strong> było połączone, ale Google odrzuca zapisany klucz` : 'Google odrzuca zapisany klucz'}
        ${g.wygaslOd ? `(od ${fmtDateTime(g.wygaslOd)})` : ''}. Poczta, kalendarz i powiadomienia z formularza są nieczynne,
        dopóki nie połączysz konta ponownie.<br><br>
        <strong>Jeśli powtarza się to mniej więcej co tydzień</strong>, przyczyna jest jedna: w Google Cloud
        ekran zgody stoi w trybie <em>Testing</em>, a w nim klucze odświeżające tracą ważność po 7 dniach.
        Wejdź w Google Cloud Console → <em>APIs &amp; Services</em> → <em>OAuth consent screen</em>
        i opublikuj aplikację (<em>Publish app</em>). Ostrzeżenie o niezweryfikowanej aplikacji przy logowaniu
        jest w porządku — to Twoja własna aplikacja i Twoje własne konto.
      </div>
      <button class="btn" id="btnConnect">Połącz konto Google ponownie</button>`
      : g.connected
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
  const formLink = $('#formLinkOpinii');
  if (formLink) formLink.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const { link } = await api('/projects/ustawienia/link-opinii', { method: 'POST', body: { link: e.target.link.value.trim() } });
      toast(link ? 'Adres do opinii zapisany.' : 'Adres do opinii wyczyszczony.');
    } catch (err) { toast(err.message, true); }
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
  await fetch('/api/auth/logout', { method: 'POST', headers: naglowki() });
  zapiszToken('');
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
    const res = await fetch('/api/auth/me', { headers: naglowki() });
    przyjmijOdnowienie(res);
    if (!res.ok) {
      const powod = await res.json().then((d) => d.powod).catch(() => '');
      zapiszToken('');
      location.href = '/admin/login' + (powod ? `?powod=${encodeURIComponent(powod)}` : '');
      return;
    }
    $('#whoami').textContent = (await res.json()).email;
  } catch {
    location.href = '/admin/login';
    return;
  }
  render();
})();
