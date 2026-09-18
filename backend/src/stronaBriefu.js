'use strict';
/**
 * Strona briefu widziana przez klienta. To jest materiał firmowy — klient ogląda
 * ją zaraz po podpisaniu i wyrabia sobie zdanie o tym, jak wygląda współpraca.
 * Dlatego nie jest to goły formularz: prowadzi sekcjami, tłumaczy po co pyta
 * i zapisuje kopię roboczą w przeglądarce, żeby nikt nie stracił pracy.
 */
const { SEKCJE } = require('./briefPytania');

const esc = (t) => String(t == null ? '' : t)
  .replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const STYL = `
:root{--ink:#111;--muted:#6b6b6b;--linia:#e6e6e6;--tlo:#fff;--papier:#fafafa;--akcent:#111}
*{box-sizing:border-box}
body{margin:0;background:var(--papier);color:var(--ink);
  font:16px/1.65 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:720px;margin:0 auto;padding:clamp(22px,5vw,64px) clamp(16px,4vw,28px)}
.marka{font-weight:700;letter-spacing:-.02em;font-size:1.1rem;margin-bottom:28px}
.marka span{color:var(--muted);font-weight:400}
h1{font-size:clamp(1.7rem,4.6vw,2.4rem);line-height:1.12;letter-spacing:-.03em;margin:0 0 10px}
.lead{color:var(--muted);margin:0 0 8px}
.czas{display:inline-block;margin:0 0 30px;padding:5px 12px;border:1px solid var(--linia);
  border-radius:999px;font-size:.8rem;color:var(--muted)}
section.sek{background:var(--tlo);border:1px solid var(--linia);border-radius:14px;
  padding:clamp(20px,4vw,32px);margin:0 0 16px}
.sek__no{font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:0 0 6px}
h2{font-size:1.2rem;letter-spacing:-.02em;margin:0 0 6px}
.sek__opis{color:var(--muted);font-size:.93rem;margin:0 0 22px}
label.pole{display:block;margin:0 0 18px}
label.pole>b{display:block;font-weight:600;font-size:.93rem;margin:0 0 7px}
input[type=text],input[type=email],textarea,select{width:100%;padding:12px 14px;border:1px solid var(--linia);
  border-radius:9px;background:var(--tlo);color:var(--ink);font:inherit;font-size:.97rem}
textarea{min-height:104px;resize:vertical}
input:focus,textarea:focus,select:focus{outline:2px solid var(--ink);outline-offset:1px;border-color:var(--ink)}
.chipy{display:flex;flex-wrap:wrap;gap:8px}
.chip{position:relative}
.chip input{position:absolute;opacity:0;pointer-events:none}
.chip span{display:inline-block;padding:9px 15px;border:1px solid var(--linia);border-radius:999px;
  cursor:pointer;font-size:.9rem;transition:.15s}
.chip input:checked+span{background:var(--ink);color:var(--tlo);border-color:var(--ink)}
.chip input:focus-visible+span{outline:2px solid var(--ink);outline-offset:2px}
table.oceny{width:100%;border-collapse:collapse}
table.oceny td{padding:11px 0;border-bottom:1px solid var(--linia);font-size:.94rem}
table.oceny td:last-child{text-align:right;white-space:nowrap}
table.oceny tr:last-child td{border-bottom:0}
.skala{display:inline-flex;gap:5px}
.skala label{cursor:pointer}
.skala input{position:absolute;opacity:0;pointer-events:none}
.skala span{display:grid;place-items:center;width:34px;height:34px;border:1px solid var(--linia);
  border-radius:8px;font-size:.88rem;transition:.15s}
.skala input:checked+span{background:var(--ink);color:var(--tlo);border-color:var(--ink)}
.skala input:focus-visible+span{outline:2px solid var(--ink);outline-offset:2px}
.legenda{color:var(--muted);font-size:.8rem;margin:14px 0 0}
.stopa{position:sticky;bottom:0;background:linear-gradient(transparent,var(--papier) 26%);
  padding:22px 0 8px;margin-top:8px}
button.wyslij{width:100%;padding:16px;border:0;border-radius:999px;background:var(--ink);color:var(--tlo);
  font:inherit;font-weight:600;font-size:1rem;cursor:pointer}
button.wyslij:disabled{opacity:.55;cursor:default}
.info{margin:10px 0 0;text-align:center;color:var(--muted);font-size:.84rem;min-height:1.3em}
.info.zle{color:#b23b3b}
.gotowe{background:var(--tlo);border:1px solid var(--linia);border-radius:14px;
  padding:clamp(26px,6vw,48px);text-align:center}
.gotowe h1{margin-bottom:12px}
.numer{white-space:nowrap;font-weight:600;color:var(--ink);text-decoration:none;border-bottom:1px solid var(--linia)}
.numer:hover{border-color:var(--ink)}
.stopka{margin-top:26px;color:var(--muted);font-size:.83rem;text-align:center}
.stopka a{color:var(--muted)}
@media(prefers-color-scheme:dark){:root{--ink:#f2f2f2;--muted:#9b9b9b;--linia:#2c2c2c;--tlo:#151515;--papier:#0e0e0e}}
`;

function poleHtml(p) {
  const wym = p.wymagane ? ' required' : '';
  if (p.typ === 'obszar') {
    return `<label class="pole"><b>${esc(p.etykieta)}${p.wymagane ? ' *' : ''}</b>
      <textarea name="${esc(p.id)}" placeholder="${esc(p.placeholder || '')}"${wym}></textarea></label>`;
  }
  if (p.typ === 'wybor') {
    return `<label class="pole"><b>${esc(p.etykieta)}</b><select name="${esc(p.id)}">
      <option value="">— wybierz —</option>
      ${p.opcje.map((o) => `<option>${esc(o)}</option>`).join('')}</select></label>`;
  }
  if (p.typ === 'wielokrotny') {
    return `<div class="pole"><b style="display:block;font-weight:600;font-size:.93rem;margin:0 0 9px">${esc(p.etykieta)}</b>
      <div class="chipy">${p.opcje.map((o, i) => `<label class="chip">
        <input type="checkbox" name="${esc(p.id)}" value="${esc(o)}" id="${esc(p.id)}_${i}">
        <span>${esc(o)}</span></label>`).join('')}</div></div>`;
  }
  const typ = p.typ === 'email' ? 'email' : 'text';
  return `<label class="pole"><b>${esc(p.etykieta)}${p.wymagane ? ' *' : ''}</b>
    <input type="${typ}" name="${esc(p.id)}" placeholder="${esc(p.placeholder || '')}"${wym}></label>`;
}

function sekcjaHtml(s, nr) {
  const srodek = s.typ === 'tabela'
    ? `<table class="oceny"><tbody>${s.wiersze.map((w) => `<tr>
        <td>${esc(w.etykieta)}</td>
        <td><span class="skala">${[1, 2, 3, 4, 5].map((n) => `<label>
          <input type="radio" name="priorytet_${esc(w.id)}" value="${n}"><span>${n}</span></label>`).join('')}</span></td>
      </tr>`).join('')}</tbody></table>
      <p class="legenda">1 — to dla nas mało ważne · 5 — to jest najważniejsze</p>`
    : s.pola.map(poleHtml).join('');
  return `<section class="sek">
    <p class="sek__no">${String(nr).padStart(2, '0')}</p>
    <h2>${esc(s.tytul)}</h2>
    ${s.opis ? `<p class="sek__opis">${esc(s.opis)}</p>` : ''}
    ${srodek}
  </section>`;
}

function stronaFormularza(brief, siteUrl) {
  const kto = brief.etykieta ? ` dla ${esc(brief.etykieta)}` : '';
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Brief projektowy — 21 project</title>
<style>${STYL}</style></head><body><div class="wrap">
<div class="marka">21 project <span>· Jakub Skrzypiec</span></div>
<h1>Zanim zacznę projektować${kto}</h1>
<p class="lead">Im więcej tu napiszesz, tym mniej będzie rund poprawek — a strona od pierwszej wersji
będzie bliżej tego, o co Ci chodzi. Nie musisz znać się na projektowaniu; wystarczy, że wiesz, co Ci się podoba.</p>
<p class="czas">Około 10 minut · zapisuje się na bieżąco</p>
<form id="brief" novalidate>
  ${SEKCJE.map((s, i) => sekcjaHtml(s, i + 1)).join('')}
  <div class="stopa">
    <button class="wyslij" type="submit">Wyślij brief</button>
    <p class="info" id="info" role="status" aria-live="polite"></p>
  </div>
</form>
<p class="stopka">21 project · <a href="${esc(siteUrl)}">21project.pl</a> · Ta strona jest widoczna tylko pod tym adresem.</p>
</div>
<script>
(function () {
  var form = document.getElementById('brief');
  var info = document.getElementById('info');
  var KLUCZ = 'brief-' + location.pathname;

  // Kopia robocza w przeglądarce. Brief wypełnia się z przerwami — bez tego
  // zamknięta karta oznacza wypełnianie wszystkiego od nowa i porzucony formularz.
  function zapiszKopie() {
    try {
      var dane = {};
      new FormData(form).forEach(function (v, k) {
        if (dane[k] === undefined) dane[k] = v;
        else if (Array.isArray(dane[k])) dane[k].push(v);
        else dane[k] = [dane[k], v];
      });
      localStorage.setItem(KLUCZ, JSON.stringify(dane));
    } catch (e) { /* tryb prywatny — trudno */ }
  }
  function wczytajKopie() {
    try {
      var dane = JSON.parse(localStorage.getItem(KLUCZ) || '{}');
      Object.keys(dane).forEach(function (k) {
        var wartosci = [].concat(dane[k]);
        var pola = form.querySelectorAll('[name="' + CSS.escape(k) + '"]');
        pola.forEach(function (el) {
          if (el.type === 'checkbox' || el.type === 'radio') el.checked = wartosci.indexOf(el.value) !== -1;
          else el.value = wartosci[0] || '';
        });
      });
    } catch (e) { /* nic nie szkodzi */ }
  }
  wczytajKopie();
  form.addEventListener('input', zapiszKopie);
  form.addEventListener('change', zapiszKopie);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var brak = [];
    form.querySelectorAll('[required]').forEach(function (el) { if (!el.value.trim()) brak.push(el); });
    if (brak.length) {
      info.textContent = 'Uzupełnij jeszcze: ' + brak.map(function (el) {
        return el.closest('label').querySelector('b').textContent.replace(' *', '');
      }).join(', ') + '.';
      info.className = 'info zle';
      brak[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      brak[0].focus({ preventScroll: true });
      return;
    }
    var dane = {};
    new FormData(form).forEach(function (v, k) {
      if (dane[k] === undefined) dane[k] = v;
      else if (Array.isArray(dane[k])) dane[k].push(v);
      else dane[k] = [dane[k], v];
    });
    var btn = form.querySelector('button');
    btn.disabled = true;
    info.className = 'info';
    info.textContent = 'Wysyłam…';
    fetch(location.pathname, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ odpowiedzi: dane })
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (w) {
        if (!w.ok) throw new Error(w.d && w.d.error);
        try { localStorage.removeItem(KLUCZ); } catch (e) {}
        location.reload();
      })
      .catch(function (err) {
        btn.disabled = false;
        info.className = 'info zle';
        info.textContent = (err && err.message) || 'Nie udało się wysłać. Sprawdź połączenie i spróbuj jeszcze raz.';
      });
  });
})();
</script></body></html>`;
}

function stronaPodziekowania(brief, siteUrl) {
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Brief wysłany — 21 project</title>
<style>${STYL}</style></head><body><div class="wrap">
<div class="marka">21 project <span>· Jakub Skrzypiec</span></div>
<div class="gotowe">
  <h1>Mam wszystko. Dzięki.</h1>
  <p class="lead">Brief${brief.firma ? ' od ' + esc(brief.firma) : ''} dotarł
  ${brief.wypelniony_at ? esc(new Date(brief.wypelniony_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })) : ''}.
  Przejrzę go i odezwę się z pierwszymi pytaniami albo od razu z kierunkiem.</p>
  <p class="lead" style="margin-top:18px">Gdyby coś jeszcze przyszło Ci do głowy — po prostu napisz
  albo zadzwoń: <a class="numer" href="tel:+48601863788">601&nbsp;863&nbsp;788</a>.</p>
</div>
<p class="stopka">21 project · <a href="${esc(siteUrl)}">21project.pl</a></p>
</div></body></html>`;
}

module.exports = { stronaFormularza, stronaPodziekowania };
