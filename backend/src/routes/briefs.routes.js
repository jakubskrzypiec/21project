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

/**
 * Brief jako plik do pracy. Panel jest dobry do przejrzenia, ale przy projektowaniu
 * wygodniej mieć ściągę obok edytora — stąd Markdown: czyta się go wszędzie, wkleja
 * do czegokolwiek i nie wymaga otwierania panelu przy każdym pytaniu o kolor.
 *
 * Na górze skrót decyzji projektowych, żeby nie przewijać całości za każdym razem.
 */
router.get('/:id/plik', (req, res) => {
  const b = db.prepare('SELECT * FROM briefy WHERE id = ?').get(req.params.id);
  if (!b) return res.status(404).json({ error: 'Nie ma takiego briefu.' });
  if (b.status !== 'wypelniony') return res.status(409).json({ error: 'Ten brief nie został jeszcze wypełniony.' });

  let odp = {};
  try { odp = JSON.parse(b.odpowiedzi || '{}'); } catch { /* zapis sprzed zmiany formatu */ }
  const pola = wszystkiePola();
  const wartosc = (id) => {
    const v = odp[id];
    if (v === undefined || v === '' || (Array.isArray(v) && !v.length)) return null;
    return Array.isArray(v) ? v.join(', ') : String(v);
  };

  const L = [];
  const data = b.wypelniony_at ? new Date(b.wypelniony_at).toLocaleDateString('pl-PL') : '';
  L.push(`# Brief — ${odp.firma || b.etykieta || 'bez nazwy'}`, '');
  L.push(`Wypełniony ${data} · ${odp.email || ''}${odp.telefon ? ' · ' + odp.telefon : ''}`, '');

  // --- ściąga ---
  L.push('## Ściąga', '');
  const skrot = [
    ['Styl', wartosc('styl')],
    ['Kolory', wartosc('kolory')],
    ['Czcionki', wartosc('czcionki') + (wartosc('czcionki_opis') ? ` — ${wartosc('czcionki_opis')}` : '')],
    ['Czego unikać', wartosc('czego_nie')],
    ['Logo', wartosc('logo')],
    ['Zdjęcia', wartosc('zdjecia')],
    ['Teksty', wartosc('teksty')],
    ['Termin', wartosc('termin')],
  ].filter(([, v]) => v && v !== 'null');
  for (const [k, v] of skrot) L.push(`- **${k}:** ${v}`);
  L.push('');

  // Priorytety posortowane — to jest ta informacja, dla której robi się tabelę.
  const priorytety = pola.filter((p) => p.typ === 'ocena')
    .map((p) => ({ etykieta: p.etykieta, n: Number(odp[p.id]) || 0 }))
    .filter((p) => p.n)
    .sort((a, b2) => b2.n - a.n);
  if (priorytety.length) {
    L.push('### Priorytety klienta (od najważniejszego)', '');
    for (const p of priorytety) L.push(`- ${'●'.repeat(p.n)}${'○'.repeat(5 - p.n)}  ${p.etykieta} (${p.n}/5)`);
    L.push('');
  }

  const inspiracje = [
    [wartosc('inspiracja_1'), wartosc('inspiracja_1_co')],
    [wartosc('inspiracja_2'), wartosc('inspiracja_2_co')],
  ].filter(([u]) => u);
  if (inspiracje.length || wartosc('antyprzyklad')) {
    L.push('### Inspiracje', '');
    for (const [u, co] of inspiracje) L.push(`- ${u}${co ? ` — ${co}` : ''}`);
    if (wartosc('antyprzyklad')) L.push(`- NIE: ${wartosc('antyprzyklad')}`);
    L.push('');
  }

  // --- pełne odpowiedzi, sekcja po sekcji ---
  L.push('---', '', '## Pełne odpowiedzi', '');
  let sekcja = null;
  for (const p of pola) {
    if (p.typ === 'ocena') continue;              // priorytety są już wyżej, w czytelnej formie
    const v = wartosc(p.id);
    if (!v) continue;
    if (p.sekcja !== sekcja) { sekcja = p.sekcja; L.push(`### ${sekcja}`, ''); }
    L.push(`**${p.etykieta}**`, '', v.split('\n').map((x) => x.trim()).join('  \n'), '');
  }

  const nazwa = `brief-${(odp.firma || 'klient').toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.md`;
  res.set('Content-Type', 'text/markdown; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="${nazwa}"`);
  res.send(L.join('\n'));
});

module.exports = router;
