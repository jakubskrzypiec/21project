'use strict';
/**
 * Wyceny. Każde „bezpłatna wycena" ze strony kończyło się pisaniem oferty od zera
 * w mailu. Tutaj składasz ją z pozycji, a klient dostaje link do strony z ofertą —
 * dzięki czemu widać też, czy w ogóle ją otworzył.
 */
const express = require('express');
const crypto = require('crypto');
const { db, logAction } = require('../db');
const { clientIp } = require('../middleware/auth');

const router = express.Router();
const now = () => new Date().toISOString();

/** Punkt wyjścia zgodny z cennikiem na stronie — panel podpowiada, nie narzuca. */
const PAKIETY = [
  { nazwa: 'Landing page', cena: 1500, opis: 'Jedna dopracowana strona: oferta, realizacje, kontakt. Indywidualny projekt, wersja mobilna, formularz, podstawowe SEO techniczne.' },
  { nazwa: 'Strona firmowa', cena: 2000, opis: 'Landing plus do trzech podstron. Lepsza struktura treści i miejsce na portfolio.' },
  { nazwa: 'Strona z SEO', cena: 3000, opis: 'Rozbudowana witryna z podstronami usługowymi i lokalnymi, przygotowana pod ruch z Google.' },
  { nazwa: 'Audyt i optymalizacja SEO', cena: 1000, opis: 'Poprawki techniczne, metadane, nagłówki, linkowanie wewnętrzne i indeksacja istniejącej strony.' },
  { nazwa: 'Dodatkowa podstrona', cena: 300, opis: 'Kolejna podstrona usługowa lub lokalna w ramach tego samego projektu.' },
  { nazwa: 'Wersja obcojęzyczna', cena: 800, opis: 'Druga wersja językowa z osobnymi adresami i oznaczeniami języka. Tłumaczenie po stronie klienta.' },
  { nazwa: 'Projekt wizytówki', cena: 200, opis: 'Awers i rewers, pliki PDF gotowe do druku. Druk osobno — wycena zależy od nakładu i papieru.' },
  { nazwa: 'Druk wizytówek — pośrednictwo', cena: 0, opis: 'Zamówienie w drukarni, pilnowanie plików i terminu. Cenę wpisz po ustaleniu nakładu i papieru.' },
  { nazwa: 'Opieka techniczna (rok)', cena: 600, opis: 'Aktualizacje, kopie zapasowe i drobne poprawki treści przez dwanaście miesięcy.' },
];

router.get('/pakiety', (_req, res) => res.json({ pakiety: PAKIETY }));

router.get('/', (req, res) => {
  const { lead } = req.query;
  const rows = lead
    ? db.prepare('SELECT * FROM wyceny WHERE lead_id = ? ORDER BY datetime(created_at) DESC').all(lead)
    : db.prepare('SELECT * FROM wyceny ORDER BY datetime(created_at) DESC LIMIT 100').all();
  res.json({ wyceny: rows.map(rozpakuj) });
});

router.post('/', (req, res) => {
  const b = req.body || {};
  const pozycje = Array.isArray(b.pozycje) ? b.pozycje
    .map((p) => ({
      nazwa: String(p.nazwa || '').trim().slice(0, 160),
      opis: String(p.opis || '').trim().slice(0, 600),
      cena: Number(p.cena) || 0,
    }))
    .filter((p) => p.nazwa) : [];
  if (!pozycje.length) return res.status(400).json({ error: 'Wycena musi mieć co najmniej jedną pozycję.' });

  const suma = pozycje.reduce((s, p) => s + p.cena, 0);
  const token = crypto.randomBytes(16).toString('base64url');
  const dni = Number(b.wazneDni) || 14;

  const r = db.prepare(
    'INSERT INTO wyceny (created_at, lead_id, token, klient, firma, pozycje, suma, termin, wazna_do, notatka, status)'
    + ' VALUES (?,?,?,?,?,?,?,?,?,?,?)'
  ).run(
    now(), b.leadId || null, token,
    String(b.klient || '').trim().slice(0, 160) || null,
    String(b.firma || '').trim().slice(0, 160) || null,
    JSON.stringify(pozycje), suma,
    String(b.termin || '').trim().slice(0, 120) || null,
    new Date(Date.now() + dni * 86400000).toISOString(),
    String(b.notatka || '').trim().slice(0, 2000) || null,
    'robocza'
  );
  logAction('wycena.utworzona', clientIp(req), { id: r.lastInsertRowid, suma });
  res.status(201).json({ wycena: rozpakuj(db.prepare('SELECT * FROM wyceny WHERE id = ?').get(r.lastInsertRowid)) });
});

router.patch('/:id', (req, res) => {
  const dozwolone = ['robocza', 'wyslana', 'przyjeta', 'odrzucona'];
  const stan = String(req.body?.status || '').trim();
  if (!dozwolone.includes(stan)) return res.status(400).json({ error: `Dozwolone stany: ${dozwolone.join(', ')}.` });
  const info = db.prepare('UPDATE wyceny SET status = ? WHERE id = ?').run(stan, req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Nie ma takiej wyceny.' });
  res.json({ wycena: rozpakuj(db.prepare('SELECT * FROM wyceny WHERE id = ?').get(req.params.id)) });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM wyceny WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

function rozpakuj(w) {
  if (!w) return w;
  let pozycje = [];
  try { pozycje = JSON.parse(w.pozycje); } catch { /* zapis sprzed zmiany formatu */ }
  return { ...w, pozycje };
}

module.exports = { router, PAKIETY, rozpakuj };
