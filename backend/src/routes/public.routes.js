'use strict';
const express = require('express');
const { db, logAction } = require('../db');
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

  try {
    const google = require('../services/google');
    if (google.status().connected && google.status().account) {
      const gmail = require('../services/gmail');
      await gmail.sendMessage({
        to: google.status().account,
        subject: `Nowe zapytanie ze strony: ${name}`,
        body: `Imię: ${name}\nKontakt: ${contact}\nPakiet: ${b.plan || '—'}\nTermin: ${b.date || '—'}\n\n${message}\n\nLead #${lead.id} — ${config.publicUrl}/admin#/leady/${lead.id}`,
      });
    }
  } catch { /* brak powiadomienia nie może zablokować zapisu zapytania */ }

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

module.exports = router;
