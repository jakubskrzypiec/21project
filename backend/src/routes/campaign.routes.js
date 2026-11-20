'use strict';
const express = require('express');
const metaAds = require('../services/metaAds');

const router = express.Router();

/** Etapy pracy z leadem — kolejność = kolejność w panelu. */
const STATUSY = ['nowy', 'nie_odbiera', 'zadzwoniono', 'spotkanie', 'wycena', 'klient', 'odpada'];

/** Stan kampanii Meta. `?odswiez=1` pomija 10-minutową pamięć podręczną. */
router.get('/', async (req, res) => {
  try {
    const dane = await metaAds.pobierz({ odswiez: req.query.odswiez === '1' });
    // Dokładamy nasze uwagi do leadów (status + notatka) z bazy panelu.
    if (Array.isArray(dane.leady) && dane.leady.length) {
      const { db } = require('../db');
      const q = db.prepare('SELECT status, notatka, updated_at FROM meta_lead_notes WHERE lead_id = ?');
      dane.leady = dane.leady.map((l) => {
        const n = q.get(String(l.id));
        return { ...l, status: n?.status || 'nowy', notatka: n?.notatka || '', notatkaZmieniona: n?.updated_at || null };
      });
    }
    res.json({ ...dane, statusy: STATUSY });
  } catch (err) {
    res.status(502).json({ error: `Nie udało się pobrać danych z Meta: ${err.message}` });
  }
});

/** Zapis statusu i notatki jednego leada. */
router.patch('/leady/:id', (req, res) => {
  const id = String(req.params.id || '').trim();
  if (!/^\d{5,30}$/.test(id)) return res.status(400).json({ error: 'Nieprawidłowy identyfikator leada.' });
  const status = req.body?.status;
  const notatka = req.body?.notatka;
  if (status !== undefined && !STATUSY.includes(status)) return res.status(400).json({ error: 'Nieznany status.' });
  if (notatka !== undefined && (typeof notatka !== 'string' || notatka.length > 5000)) {
    return res.status(400).json({ error: 'Notatka może mieć najwyżej 5000 znaków.' });
  }
  const { db } = require('../db');
  const teraz = new Date().toISOString();
  const byl = db.prepare('SELECT status, notatka FROM meta_lead_notes WHERE lead_id = ?').get(id);
  const nowy = { status: status ?? byl?.status ?? 'nowy', notatka: notatka ?? byl?.notatka ?? '' };
  db.prepare(`INSERT INTO meta_lead_notes (lead_id, status, notatka, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(lead_id) DO UPDATE SET status = excluded.status, notatka = excluded.notatka, updated_at = excluded.updated_at`)
    .run(id, nowy.status, nowy.notatka, teraz);
  res.json({ ok: true, ...nowy, updated_at: teraz });
});

module.exports = router;
module.exports.STATUSY = STATUSY;
