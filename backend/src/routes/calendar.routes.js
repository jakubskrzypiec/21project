'use strict';
const express = require('express');
const cal = require('../services/calendarSvc');

const router = express.Router();

const guard = (h) => async (req, res) => {
  try { await h(req, res); } catch (err) { res.status(400).json({ error: err.message, code: err.code || null }); }
};

router.get('/', guard(async (req, res) => {
  const from = req.query.from || new Date(Date.now() - 7 * 86400000).toISOString();
  const to = req.query.to || new Date(Date.now() + 60 * 86400000).toISOString();
  res.json(await cal.agenda(from, to));
}));

router.get('/upcoming', guard(async (_req, res) => {
  const { events, googleError } = await cal.agenda(new Date().toISOString(), new Date(Date.now() + 14 * 86400000).toISOString());
  res.json({ events: events.slice(0, 8), googleError });
}));

router.get('/free-slots', guard(async (req, res) => {
  const from = req.query.from || new Date().toISOString();
  const to = req.query.to || new Date(Date.now() + 14 * 86400000).toISOString();
  res.json({ slots: await cal.freeSlots({ from, to, slotMinutes: Number(req.query.minutes) || 60 }) });
}));

router.post('/', guard(async (req, res) => {
  const b = req.body || {};
  if (!b.title || !b.starts_at) return res.status(400).json({ error: 'Wymagany tytuł i data rozpoczęcia.' });
  const ends = b.ends_at || new Date(new Date(b.starts_at).getTime() + 3600000).toISOString();
  res.status(201).json({ meeting: await cal.createMeeting({ ...b, ends_at: ends }) });
}));

router.patch('/:id', guard(async (req, res) => {
  const m = await cal.updateMeeting(Number(req.params.id), req.body || {});
  if (!m) return res.status(404).json({ error: 'Nie znaleziono spotkania.' });
  res.json({ meeting: m });
}));

router.delete('/:id', guard(async (req, res) => {
  const ok = await cal.deleteMeeting(Number(req.params.id));
  res.status(ok ? 200 : 404).json({ ok });
}));

module.exports = router;
