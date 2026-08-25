'use strict';
const express = require('express');
const { db, logAction } = require('../db');
const outreach = require('../services/outreach');
const ai = require('../services/ai');
const { config } = require('../config');
const { clientIp } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const { status, limit = 100 } = req.query;
  const rows = status
    ? db.prepare(
        `SELECT o.*, l.company, l.domain, l.name AS lead_name FROM outreach o
           LEFT JOIN leads l ON l.id = o.lead_id WHERE o.status = ?
         ORDER BY o.created_at DESC LIMIT ?`
      ).all(status, Number(limit))
    : db.prepare(
        `SELECT o.*, l.company, l.domain, l.name AS lead_name FROM outreach o
           LEFT JOIN leads l ON l.id = o.lead_id ORDER BY o.created_at DESC LIMIT ?`
      ).all(Number(limit));
  res.json({ messages: rows, quota: outreach.quota(), mode: config.outreach.mode, inWindow: outreach.inSendingWindow() });
});

/** Przygotowuje wiadomość (szablon albo AI) — zawsze trafia najpierw do akceptacji. */
router.post('/prepare', async (req, res) => {
  try {
    const msg = await outreach.prepare(Number(req.body?.lead_id), {
      templateId: req.body?.template_id,
      subject: req.body?.subject,
      body: req.body?.body,
      useAi: Boolean(req.body?.use_ai),
      instructions: req.body?.instructions,
      scheduledAt: req.body?.scheduled_at,
    });
    res.status(201).json({ message: msg });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** Masowe przygotowanie wiadomości dla wybranych leadów. */
router.post('/prepare-bulk', async (req, res) => {
  const ids = (req.body?.lead_ids || []).map(Number).filter(Boolean).slice(0, 50);
  const out = [];
  for (const id of ids) {
    try {
      const msg = await outreach.prepare(id, {
        templateId: req.body?.template_id,
        useAi: Boolean(req.body?.use_ai),
        instructions: req.body?.instructions,
      });
      out.push({ lead_id: id, ok: true, id: msg.id });
    } catch (err) {
      out.push({ lead_id: id, ok: false, error: err.message });
    }
  }
  res.json({ results: out, prepared: out.filter((r) => r.ok).length });
});

router.patch('/:id', (req, res) => {
  const msg = db.prepare('SELECT * FROM outreach WHERE id = ?').get(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Nie znaleziono wiadomości.' });
  if (msg.status === 'sent') return res.status(400).json({ error: 'Wysłanej wiadomości nie można już zmienić.' });
  const b = req.body || {};
  db.prepare('UPDATE outreach SET subject=?, body=?, scheduled_at=?, status=? WHERE id=?').run(
    b.subject ?? msg.subject,
    b.body ?? msg.body,
    b.scheduled_at ?? msg.scheduled_at,
    b.status && ['draft', 'queued', 'skipped'].includes(b.status) ? b.status : msg.status,
    msg.id
  );
  res.json({ message: db.prepare('SELECT * FROM outreach WHERE id = ?').get(msg.id) });
});

/** Ręczna wysyłka — to jest ten moment, w którym Ty decydujesz. */
router.post('/:id/send', async (req, res) => {
  try {
    const msg = await outreach.send(Number(req.params.id), { force: true });
    logAction('outreach.send', clientIp(req), { id: msg.id, to: msg.to_email });
    res.json({ message: msg });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/queue', (req, res) => {
  const msg = db.prepare('SELECT * FROM outreach WHERE id = ?').get(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Nie znaleziono wiadomości.' });
  db.prepare("UPDATE outreach SET status='queued', scheduled_at=? WHERE id=?")
    .run(req.body?.scheduled_at || new Date().toISOString(), msg.id);
  res.json({ message: db.prepare('SELECT * FROM outreach WHERE id = ?').get(msg.id) });
});

router.delete('/:id', (req, res) => {
  db.prepare("DELETE FROM outreach WHERE id = ? AND status != 'sent'").run(req.params.id);
  res.json({ ok: true });
});

router.post('/run-queue', async (_req, res) => res.json(await outreach.processQueue()));
router.post('/sync-replies', async (_req, res) => res.json(await outreach.syncReplies()));

/** Podgląd treści bez zapisu — do sprawdzenia szablonu na konkretnym leadzie. */
router.post('/preview', async (req, res) => {
  try {
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(Number(req.body?.lead_id));
    if (!lead) return res.status(404).json({ error: 'Nie znaleziono leada.' });
    if (req.body?.use_ai) {
      if (!ai.enabled()) return res.status(409).json({ error: 'Brak ANTHROPIC_API_KEY — AI wyłączone.' });
      const draft = await ai.draftOutreach(lead, { instructions: req.body?.instructions });
      return res.json({ ...draft, body: outreach.withFooter(draft.body, lead) });
    }
    const tpl = db.prepare('SELECT * FROM templates WHERE id = ?').get(Number(req.body?.template_id));
    if (!tpl) return res.status(404).json({ error: 'Nie znaleziono szablonu.' });
    const vars = outreach.leadVars(lead);
    res.json({
      subject: outreach.render(tpl.subject, vars),
      body: outreach.withFooter(outreach.render(tpl.body, vars), lead),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ------------------------------- szablony ------------------------------- */

router.get('/templates/all', (_req, res) =>
  res.json({ templates: db.prepare('SELECT * FROM templates ORDER BY id').all() }));

router.post('/templates', (req, res) => {
  const { name, subject, body } = req.body || {};
  if (!name || !subject || !body) return res.status(400).json({ error: 'Wymagane: nazwa, temat i treść.' });
  const r = db.prepare('INSERT INTO templates (name, subject, body, created_at) VALUES (?, ?, ?, ?)')
    .run(name, subject, body, new Date().toISOString());
  res.status(201).json({ template: db.prepare('SELECT * FROM templates WHERE id = ?').get(r.lastInsertRowid) });
});

router.patch('/templates/:id', (req, res) => {
  const t = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Nie znaleziono szablonu.' });
  const b = req.body || {};
  db.prepare('UPDATE templates SET name=?, subject=?, body=? WHERE id=?')
    .run(b.name ?? t.name, b.subject ?? t.subject, b.body ?? t.body, t.id);
  res.json({ template: db.prepare('SELECT * FROM templates WHERE id = ?').get(t.id) });
});

router.delete('/templates/:id', (req, res) => {
  db.prepare('DELETE FROM templates WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

/* --------------------------- lista wykluczeń --------------------------- */

router.get('/suppression/all', (_req, res) =>
  res.json({ suppression: db.prepare('SELECT * FROM suppression ORDER BY created_at DESC LIMIT 500').all() }));

router.post('/suppression', (req, res) => {
  const value = String(req.body?.value || '').trim().toLowerCase();
  if (!value) return res.status(400).json({ error: 'Podaj adres e-mail albo domenę.' });
  outreach.suppress(value, req.body?.reason || 'dodane ręcznie');
  res.status(201).json({ ok: true });
});

router.delete('/suppression/:value', (req, res) => {
  db.prepare('DELETE FROM suppression WHERE value = ?').run(String(req.params.value).toLowerCase());
  res.json({ ok: true });
});

module.exports = router;
