'use strict';
const express = require('express');
const gmail = require('../services/gmail');
const google = require('../services/google');
const ai = require('../services/ai');

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
  const { q, label, pageToken } = req.query;
  const data = await gmail.listThreads({
    q: q || undefined,
    labelIds: label ? [label] : ['INBOX'],
    maxResults: Math.min(Number(req.query.limit) || 25, 50),
    pageToken,
  });
  res.json(data);
}));

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

router.get('/google/status', (_req, res) => res.json({ ...google.status(), ai: ai.enabled() }));

router.post('/google/disconnect', (_req, res) => {
  google.disconnect();
  res.json({ ok: true });
});

function extractAddress(from = '') {
  const m = from.match(/<([^>]+)>/);
  return m ? m[1] : from.trim();
}

module.exports = router;
