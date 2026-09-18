'use strict';
/**
 * Briefy klienckie. Zamiast wyciągać od klienta kontekst przez trzy telefony
 * i pięć maili, dostaje link do formularza — a komplet odpowiedzi ląduje na Tablicy.
 */
const express = require('express');
const crypto = require('crypto');
const { db, logAction } = require('../db');
const { clientIp } = require('../middleware/auth');
const { SEKCJE, wszystkiePola } = require('../briefPytania');

const router = express.Router();
const now = () => new Date().toISOString();

router.get('/pytania', (_req, res) => res.json({ sekcje: SEKCJE }));

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM briefy ORDER BY datetime(created_at) DESC LIMIT 100').all();
  res.json({ briefy: rows.map(lekki), nowe: rows.filter((b) => b.status === 'wypelniony' && !b.przeczytany).length });
});

router.get('/:id', (req, res) => {
  const b = db.prepare('SELECT * FROM briefy WHERE id = ?').get(req.params.id);
  if (!b) return res.status(404).json({ error: 'Nie ma takiego briefu.' });
  let odp = {};
  try { odp = JSON.parse(b.odpowiedzi || '{}'); } catch { /* zapis sprzed zmiany formatu */ }
  // Odpowiedzi podpisujemy etykietami z definicji pytań — inaczej panel pokazywałby surowe klucze.
  const pola = wszystkiePola()
    .map((p) => ({ ...p, wartosc: odp[p.id] }))
    .filter((p) => p.wartosc !== undefined && p.wartosc !== '' && !(Array.isArray(p.wartosc) && !p.wartosc.length));
  res.json({ brief: { ...lekki(b), pola } });
});

router.post('/', (req, res) => {
  const etykieta = String(req.body?.etykieta || '').trim().slice(0, 120) || null;
  const token = crypto.randomBytes(16).toString('base64url');
  const r = db.prepare('INSERT INTO briefy (created_at, token, etykieta, lead_id) VALUES (?,?,?,?)')
    .run(now(), token, etykieta, req.body?.leadId || null);
  logAction('brief.utworzony', clientIp(req), { id: r.lastInsertRowid });
  res.status(201).json({ brief: lekki(db.prepare('SELECT * FROM briefy WHERE id = ?').get(r.lastInsertRowid)) });
});

/** Odhaczenie „przeczytane" — żeby świeże briefy przestały świecić po obejrzeniu. */
router.post('/:id/przeczytany', (req, res) => {
  db.prepare('UPDATE briefy SET przeczytany = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM briefy WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

const lekki = (b) => b && {
  id: b.id, token: b.token, etykieta: b.etykieta, status: b.status,
  firma: b.firma, email: b.email, created_at: b.created_at,
  otwarcia: b.otwarcia, otwarty_at: b.otwarty_at, wypelniony_at: b.wypelniony_at,
  przeczytany: Boolean(b.przeczytany),
};

module.exports = router;
