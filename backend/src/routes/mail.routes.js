'use strict';
const express = require('express');
const gmail = require('../services/gmail');
const google = require('../services/google');
const ai = require('../services/ai');
const { db, getSetting, setSetting } = require('../db');

const router = express.Router();

const guard = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (err) {
    const code = err.code === 'GOOGLE_NOT_CONNECTED' ? 409 : err.status || err.code === 401 ? 401 : 500;
    res.status(Number.isInteger(code) ? code : 500).json({ error: err.message, code: err.code || null });
  }
};

router.get('/threads', guard(async (req, res) => {
  const { q, label, pageToken, view } = req.query;
  const preset = gmail.VIEWS[view] || gmail.VIEWS.klienci;

  const data = await gmail.listThreads({
    // Własne wyszukiwanie ma pierwszeństwo nad gotowym widokiem.
    q: q ? q : preset.q,
    labelIds: label ? [label] : (q ? undefined : preset.labelIds || undefined),
    maxResults: Math.min(Number(req.query.limit) || 25, 50),
    pageToken,
  });

  res.json({ ...data, threads: withKnownSenders(data.threads), view: view || 'klienci' });
}));

/**
 * Dokleja informację, czy nadawca jest już w bazie jako lead, klient albo
 * uczestnik projektu — w liście widać wtedy od razu, kto pisze.
 */
function withKnownSenders(threads) {
  if (!threads.length) return threads;
  const addresses = [...new Set(threads.map((t) => gmail.addressOf(t.from)).filter(Boolean))];
  if (!addresses.length) return threads;

  const placeholders = addresses.map(() => '?').join(',');
  const known = new Map();
  db.prepare(
    `SELECT id, email, company, name, status FROM leads WHERE LOWER(email) IN (${placeholders})`
  ).all(...addresses).forEach((l) => known.set(String(l.email).toLowerCase(), l));

  // Adres nieznany wprost bywa znany po domenie — biuro@firma.pl przy kontakcie jan@firma.pl.
  const byDomain = new Map();
  db.prepare("SELECT id, domain, company, status FROM leads WHERE domain IS NOT NULL")
    .all().forEach((l) => byDomain.set(String(l.domain).toLowerCase(), l));

  return threads.map((t) => {
    const addr = gmail.addressOf(t.from);
    const hit = known.get(addr) || byDomain.get(addr.split('@')[1] || '');
    return hit
      ? { ...t, known: { leadId: hit.id, label: hit.company || hit.name || hit.domain, status: hit.status } }
      : t;
  });
}

router.get('/labels', guard(async (_req, res) => res.json({ labels: await gmail.labels() })));
router.get('/unread', guard(async (_req, res) => res.json(await gmail.unreadCount())));

router.get('/threads/:id', guard(async (req, res) => res.json(await gmail.getThread(req.params.id))));

router.post('/threads/:id/read', guard(async (req, res) => {
  await gmail.modifyThread(req.params.id, [], ['UNREAD']);
  res.json({ ok: true });
}));

router.post('/threads/:id/unread', guard(async (req, res) => {
  await gmail.modifyThread(req.params.id, ['UNREAD'], []);
  res.json({ ok: true });
}));

router.post('/threads/:id/archive', guard(async (req, res) => {
  await gmail.modifyThread(req.params.id, [], ['INBOX']);
  res.json({ ok: true });
}));

router.post('/threads/:id/star', guard(async (req, res) => {
  const on = req.body?.starred !== false;
  await gmail.modifyThread(req.params.id, on ? ['STARRED'] : [], on ? [] : ['STARRED']);
  res.json({ ok: true });
}));

router.delete('/threads/:id', guard(async (req, res) => {
  await gmail.trashThread(req.params.id);
  res.json({ ok: true });
}));

router.post('/send', guard(async (req, res) => {
  const { to, subject, body, cc } = req.body || {};
  if (!to || !subject || !body) return res.status(400).json({ error: 'Wymagane: odbiorca, temat i treść.' });
  res.json(await gmail.sendMessage({ to, subject, body, cc }));
}));

router.post('/threads/:id/reply', guard(async (req, res) => {
  const { body } = req.body || {};
  if (!body) return res.status(400).json({ error: 'Treść odpowiedzi jest pusta.' });
  const thread = await gmail.getThread(req.params.id);
  const last = thread.messages[thread.messages.length - 1];
  const to = req.body.to || extractAddress(last.from);
  const subject = last.subject.startsWith('Re:') ? last.subject : `Re: ${last.subject}`;
  res.json(await gmail.sendMessage({
    to, subject, body,
    threadId: req.params.id,
    inReplyTo: last.messageId,
    references: [last.references, last.messageId].filter(Boolean).join(' '),
  }));
}));

router.post('/threads/:id/summary', guard(async (req, res) => {
  if (!ai.enabled()) return res.status(409).json({ error: 'Brak ANTHROPIC_API_KEY — streszczenia wyłączone.' });
  const thread = await gmail.getThread(req.params.id);
  res.json({ summary: await ai.summarizeThread(thread.messages) });
}));

/* ------------------------ połączenie z kontem Google ------------------------ */

router.get('/google/status', (_req, res) => {
  // `connected` mówi tylko tyle, że mamy zapisany token — nie, że Google go
  // jeszcze uznaje. Dokładamy ostatni błąd powiadomienia z formularza, bo to
  // jedyny sygnał, że wysyłka przestała działać.
  let ostatniBlad = null;
  try { ostatniBlad = JSON.parse(getSetting('powiadomienie_blad', '') || 'null'); } catch { /* stary zapis */ }
  res.json({ ...google.status(), ai: ai.enabled(), ostatniBlad });
});

/** Wysyła próbną wiadomość na Twój własny adres — sprawdza całą drogę naraz. */
router.post('/test', async (_req, res) => {
  const g = google.status();
  if (!g.connected || !g.account) {
    return res.status(400).json({ error: 'Konto Google nie jest połączone.' });
  }
  try {
    await gmail.sendMessage({
      to: g.account,
      subject: 'Test powiadomień z panelu 21 project',
      body: 'Jeśli czytasz tę wiadomość, powiadomienia z formularza kontaktowego działają.\n\n'
        + `Wysłane z panelu ${new Date().toLocaleString('pl-PL')}.`,
    });
    setSetting('powiadomienie_blad', '');
    res.json({ ok: true, account: g.account });
  } catch (err) {
    const opis = err?.message || String(err);
    setSetting('powiadomienie_blad', JSON.stringify({ ts: new Date().toISOString(), error: opis.slice(0, 300) }));
    res.status(502).json({ error: opis.slice(0, 300) });
  }
});

router.post('/google/disconnect', (_req, res) => {
  google.disconnect();
  res.json({ ok: true });
});

function extractAddress(from = '') {
  const m = from.match(/<([^>]+)>/);
  return m ? m[1] : from.trim();
}

module.exports = router;
