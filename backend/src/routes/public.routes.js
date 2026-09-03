'use strict';
const express = require('express');
const { db, logAction, setSetting } = require('../db');
const { config } = require('../config');
const { clientIp } = require('../middleware/auth');
const { upsertLead } = require('./leads.routes');
const outreach = require('../services/outreach');

const router = express.Router();

/* Prosty limiter dla publicznych końcówek — chroni formularz przed spamem. */
const hits = new Map();
function limit(max, windowMs) {
  return (req, res, next) => {
    const key = `${req.path}|${clientIp(req)}`;
    const now = Date.now();
    const rec = hits.get(key) || { count: 0, reset: now + windowMs };
    if (now > rec.reset) { rec.count = 0; rec.reset = now + windowMs; }
    rec.count += 1;
    hits.set(key, rec);
    if (rec.count > max) return res.status(429).json({ error: 'Za dużo żądań. Spróbuj za chwilę.' });
    next();
  };
}

/** Formularz kontaktowy ze strony — zapisuje leada i (opcjonalnie) wysyła powiadomienie. */
router.post('/api/contact', limit(5, 10 * 60 * 1000), async (req, res) => {
  const b = req.body || {};
  if (b.website_url) return res.json({ ok: true }); // honeypot dla botów
  const name = String(b.name || '').trim().slice(0, 120);
  const contact = String(b.contact || '').trim().slice(0, 160);
  const message = String(b.message || '').trim().slice(0, 4000);
  if (!name || !contact || !message) {
    return res.status(400).json({ error: 'Uzupełnij imię, kontakt i krótki opis.' });
  }

  const isEmail = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(contact);
  const lead = upsertLead({
    source: 'form',
    name,
    email: isEmail ? contact : null,
    phone: isEmail ? null : contact,
    message: [b.plan ? `Pakiet: ${b.plan}` : null, b.date ? `Termin: ${b.date}` : null, message]
      .filter(Boolean).join('\n'),
    score: 60, // zapytanie z formularza jest z definicji cieplejsze niż lead z crawlera
  });

  logAction('contact.submit', clientIp(req), { lead_id: lead.id });

  // Zapytanie jest już zapisane, więc nieudane powiadomienie nie może wywrócić
  // odpowiedzi dla odwiedzającego. Ale nie może też zniknąć bez śladu — inaczej
  // wygasły token Google oznacza ciszę i żadnego sygnału, że coś nie działa.
  try {
    const google = require('../services/google');
    const g = google.status();
    if (!g.connected || !g.account) throw new Error('Konto Google nie jest połączone.');
    const gmail = require('../services/gmail');
    await gmail.sendMessage({
      to: g.account,
      subject: `Nowe zapytanie ze strony: ${name}`,
      body: `Imię: ${name}\nKontakt: ${contact}\nPakiet: ${b.plan || '—'}\nTermin: ${b.date || '—'}\n\n${message}\n\nLead #${lead.id} — ${config.publicUrl}/admin#/leady/${lead.id}`,
    });
    setSetting('powiadomienie_blad', '');
  } catch (err) {
    const opis = err?.message || String(err);
    console.error('[formularz] nie wysłano powiadomienia:', opis);
    logAction('contact.notify_failed', clientIp(req), { lead_id: lead.id, error: opis.slice(0, 300) });
    setSetting('powiadomienie_blad', JSON.stringify({ ts: new Date().toISOString(), error: opis.slice(0, 300) }));
  }

  res.json({ ok: true, message: 'Dziękuję — odezwę się najszybciej, jak się da.' });
});

/** Link wypisania z wiadomości handlowych (jednym kliknięciem, bez logowania). */
router.get('/u/:token', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE unsub_token = ?').get(req.params.token);
  if (lead) {
    db.prepare("UPDATE leads SET unsubscribed = 1, status = 'rejected', updated_at = ? WHERE id = ?")
      .run(new Date().toISOString(), lead.id);
    if (lead.email) outreach.suppress(lead.email, 'wypisanie przez link');
    if (lead.domain) outreach.suppress(lead.domain, 'wypisanie przez link');
    logAction('lead.unsubscribe', clientIp(req), { lead_id: lead.id });
  }
  res
    .type('html')
    .send(`<!doctype html><html lang="pl"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Wypisano z listy — 21 project</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:34rem;margin:15vh auto;padding:0 1.5rem;color:#111}
h1{font-size:1.4rem;margin:0 0 .75rem}a{color:#1d4ed8}</style>
<h1>Gotowe — nie napiszę więcej.</h1>
<p>Adres został dopisany do listy wykluczeń. Jeśli to pomyłka, wystarczy odpisać na moją wiadomość.</p>
<p><a href="${config.siteUrl}">21project.pl</a></p>`);
});

/** Skrypt liczący ruch — wklejany na stronie jednym tagiem. */
router.get('/t.js', (req, res) => {
  res.type('application/javascript').set('Cache-Control', 'public, max-age=3600').send(TRACKER);
});

/**
 * Skrypt podpinający formularz kontaktowy ze strony.
 * Wystawiamy pojedynczy plik, a nie cały katalog public/ — inaczej panel
 * spod /admin byłby dostępny bez logowania.
 */
router.get('/form-hook.js', (_req, res) => {
  res.type('application/javascript').set('Cache-Control', 'public, max-age=3600');
  res.sendFile(require('path').join(__dirname, '..', '..', 'public', 'form-hook.js'));
});

const TRACKER = `(function(){
  var endpoint = (document.currentScript && document.currentScript.dataset.endpoint) ||
    (document.currentScript && document.currentScript.src.replace(/\\/t\\.js.*$/, '')) || '';
  if (navigator.doNotTrack === '1') return;
  var sid = sessionStorage.getItem('p21sid');
  if (!sid) { sid = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('p21sid', sid); }
  var params = new URLSearchParams(location.search);
  var start = Date.now(), maxScroll = 0;

  function post(data) {
    data.sid = sid; data.path = location.pathname;
    var payload = JSON.stringify(data);
    if (navigator.sendBeacon) navigator.sendBeacon(endpoint + '/api/track', new Blob([payload], { type: 'application/json' }));
    else fetch(endpoint + '/api/track', { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(function(){});
  }

  // Licznik ładuje się jako async i może wystartować przed końcem parsowania,
  // a wtedy document.title bywa jeszcze pusty. Odsłonę zgłaszamy po zbudowaniu strony.
  function gdyGotowe(fn) {
    if (document.readyState !== 'loading') fn(); else addEventListener('DOMContentLoaded', fn);
  }

  gdyGotowe(function () { post({ type: 'pageview', title: document.title, referrer: document.referrer,
    utm_source: params.get('utm_source'), utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'), screen_w: window.innerWidth,
    entry: !sessionStorage.getItem('p21seen') ? 1 : 0 });
    sessionStorage.setItem('p21seen', '1');
  });

  addEventListener('scroll', function () {
    var h = document.documentElement.scrollHeight - innerHeight;
    if (h > 0) maxScroll = Math.max(maxScroll, Math.round((scrollY / h) * 100));
  }, { passive: true });

  addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') post({ type: 'duration', duration_ms: Date.now() - start, scroll_pct: maxScroll });
  });

  addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a, button[type="submit"]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('tel:') === 0) post({ type: 'event', name: 'phone_click' });
    else if (href.indexOf('mailto:') === 0) post({ type: 'event', name: 'mail_click' });
    else if (/kontakt/.test(href)) post({ type: 'event', name: 'contact_click' });
  }, true);

  document.addEventListener('submit', function (e) {
    if (e.target && e.target.classList.contains('contactForm')) post({ type: 'event', name: 'form_submit' });
  }, true);

  window.p21 = { event: function (name, meta) { post({ type: 'event', name: name, meta: meta }); } };
})();`;

/* ------------------------------ wycena dla klienta ------------------------ */
/**
 * Strona wyceny pod losowym adresem. Nie wymaga logowania — klient ma ją otworzyć
 * z maila jednym kliknięciem — ale token jest nie do zgadnięcia, a strona nosi
 * noindex, żeby oferta nie trafiła do wyszukiwarki.
 */
const esc = (t) => String(t == null ? '' : t)
  .replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const zl = (n) => new Intl.NumberFormat('pl-PL').format(Math.round(Number(n) || 0)) + ' zł';
const dzien = (t) => (t ? new Date(t).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

router.get('/wycena/:token', limit(60, 10 * 60 * 1000), (req, res) => {
  const w = db.prepare('SELECT * FROM wyceny WHERE token = ?').get(req.params.token);
  if (!w) return res.status(404).type('html').send(stronaBledu('Nie ma takiej wyceny.',
    'Sprawdź, czy adres nie został ucięty przy kopiowaniu.'));

  const wygasla = w.wazna_do && new Date(w.wazna_do) < new Date();
  // Pierwsze wejście przestawia stan na „otwarta" — dzięki temu w panelu widać,
  // czy klient w ogóle zajrzał, zamiast zgadywać po ciszy.
  db.prepare('UPDATE wyceny SET otwarcia = otwarcia + 1, otwarta_at = COALESCE(otwarta_at, ?),'
    + " status = CASE WHEN status = 'wyslana' THEN 'otwarta' ELSE status END WHERE id = ?")
    .run(new Date().toISOString(), w.id);

  let pozycje = [];
  try { pozycje = JSON.parse(w.pozycje); } catch { /* zapis sprzed zmiany formatu */ }

  res.type('html').send(`<!doctype html><html lang="pl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Wycena — 21 project</title>
<style>
:root{--ink:#111;--muted:#6b6b6b;--linia:#e6e6e6;--tlo:#fff;--papier:#fafafa}
*{box-sizing:border-box}
body{margin:0;background:var(--papier);color:var(--ink);
  font:16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,system-ui,sans-serif;
  -webkit-font-smoothing:antialiased}
.wrap{max-width:760px;margin:0 auto;padding:clamp(24px,6vw,72px) clamp(18px,5vw,32px)}
.karta{background:var(--tlo);border:1px solid var(--linia);border-radius:14px;padding:clamp(22px,5vw,44px)}
.gora{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;flex-wrap:wrap;margin-bottom:28px}
.marka{font-weight:700;letter-spacing:-.02em;font-size:1.15rem}
.marka span{color:var(--muted);font-weight:400}
h1{font-size:clamp(1.6rem,4.2vw,2.3rem);line-height:1.15;letter-spacing:-.03em;margin:0 0 6px}
.pod{color:var(--muted);margin:0 0 30px}
table{width:100%;border-collapse:collapse;margin:0 0 8px}
th{text-align:left;font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);
  font-weight:600;padding:0 0 10px;border-bottom:1px solid var(--linia)}
th:last-child,td:last-child{text-align:right;white-space:nowrap}
td{padding:16px 0;border-bottom:1px solid var(--linia);vertical-align:top}
td small{display:block;color:var(--muted);font-size:.86rem;margin-top:4px}
.suma{display:flex;justify-content:space-between;align-items:baseline;margin-top:22px;
  padding-top:18px;border-top:2px solid var(--ink);font-size:1.35rem;font-weight:700}
.info{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin:30px 0 0;
  padding-top:24px;border-top:1px solid var(--linia)}
.info div b{display:block;font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:4px}
.notatka{margin-top:26px;padding:18px;background:var(--papier);border-radius:10px;white-space:pre-wrap}
.akcje{margin-top:32px;display:flex;gap:12px;flex-wrap:wrap}
.btn{display:inline-block;padding:14px 24px;border-radius:999px;text-decoration:none;font-weight:600;font-size:.94rem}
.btn.ciemny{background:var(--ink);color:#fff}
.btn.jasny{border:1px solid var(--linia);color:var(--ink)}
.uwaga{margin-top:24px;padding:14px 18px;border-radius:10px;background:#fff4f4;border:1px solid #f0d4d4;color:#8a2a2a}
.stopka{margin-top:26px;color:var(--muted);font-size:.84rem;text-align:center}
.stopka a{color:var(--muted)}
@media(prefers-color-scheme:dark){:root{--ink:#f2f2f2;--muted:#9b9b9b;--linia:#2c2c2c;--tlo:#151515;--papier:#0e0e0e}
  .uwaga{background:#2a1414;border-color:#4a2222;color:#f0b4b4}}
</style></head><body><div class="wrap"><div class="karta">
  <div class="gora">
    <div class="marka">21 project <span>· Jakub Skrzypiec</span></div>
    <div style="color:var(--muted);font-size:.86rem">Wycena z ${esc(dzien(w.created_at))}</div>
  </div>
  <h1>Wycena${w.firma ? ' dla ' + esc(w.firma) : (w.klient ? ' dla ' + esc(w.klient) : '')}</h1>
  <p class="pod">Poniżej proponowany zakres i cena. Wszystko jest do rozmowy — jeśli coś jest zbędne, wyrzucamy.</p>
  ${wygasla ? '<div class="uwaga"><strong>Ta wycena straciła ważność.</strong> Odezwij się, przygotuję aktualną — ceny zwykle się nie zmieniają.</div>' : ''}
  <table><thead><tr><th>Zakres</th><th>Cena</th></tr></thead><tbody>
    ${pozycje.map((p) => `<tr><td><strong>${esc(p.nazwa)}</strong>${p.opis ? `<small>${esc(p.opis)}</small>` : ''}</td><td>${zl(p.cena)}</td></tr>`).join('')}
  </tbody></table>
  <div class="suma"><span>Razem</span><span>${zl(w.suma)}</span></div>
  <div class="info">
    ${w.termin ? `<div><b>Proponowany termin</b>${esc(w.termin)}</div>` : ''}
    ${w.wazna_do ? `<div><b>Wycena ważna do</b>${esc(dzien(w.wazna_do))}</div>` : ''}
    <div><b>Płatność</b>Zaliczka 50% na start, reszta po publikacji</div>
  </div>
  ${w.notatka ? `<div class="notatka">${esc(w.notatka)}</div>` : ''}
  <div class="akcje">
    <a class="btn ciemny" href="mailto:jakubskrzypiec.dev@gmail.com?subject=${encodeURIComponent('Wycena — ' + (w.firma || w.klient || ''))}">Odpisz na wycenę</a>
    <a class="btn jasny" href="tel:+48601863788">601 863 788</a>
  </div>
</div>
<p class="stopka">21 project · <a href="${esc(config.siteUrl)}">21project.pl</a> · Ta strona jest widoczna tylko pod tym adresem.</p>
</div></body></html>`);
});

function stronaBledu(tytul, opis) {
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>${esc(tytul)}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;
background:#fafafa;color:#111;font:16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;text-align:center;padding:24px}
h1{font-size:1.5rem;margin:0 0 8px}p{color:#6b6b6b;margin:0}</style></head>
<body><div><h1>${esc(tytul)}</h1><p>${esc(opis)}</p></div></body></html>`;
}

module.exports = router;
