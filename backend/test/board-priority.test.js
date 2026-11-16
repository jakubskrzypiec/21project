'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../public/admin/assets/boardPriority.js');

const DZIS = '2026-11-16'; // poniedziałek

test('dni robocze pomijają weekend', () => {
  assert.equal(P.dniRobocze('2026-11-13', DZIS), 1); // pt → pn
  assert.equal(P.dniRobocze('2026-11-09', DZIS), 5);
  assert.equal(P.dniRobocze(DZIS, DZIS), 0);
});

test('kolejność: po terminie > termin blisko > mój ruch > przypomnienie; klient bez ciszy czeka', () => {
  const notes = [
    { id: 1, title: 'czeka 2 dni', status: 'czeka-na-odpowiedz', mail_summary: { owner: 'Klient', last_contact: '2026-11-12' } },
    { id: 2, title: 'cisza 6 dni', status: 'czeka-na-odpowiedz', mail_summary: { owner: 'Klient', last_contact: '2026-11-06' } },
    { id: 3, title: 'mój ruch', status: 'w-trakcie', mail_summary: { owner: 'Jakub', last_contact: '2026-11-13' } },
    { id: 4, title: 'termin jutro', status: 'w-trakcie', due_date: '2026-11-17', mail_summary: { owner: 'Klient', last_contact: '2026-11-15' } },
    { id: 5, title: 'po terminie', status: 'do-poprawek', due_date: '2026-11-12' },
    { id: 6, title: 'wstrzymane', status: 'wstrzymane', due_date: '2026-11-10' },
    { id: 7, title: 'zrobione', status: 'zrobione' },
  ];
  const s = P.uloz(notes, DZIS);
  assert.deepEqual(s.ruch.map((x) => x.n.id), [5, 4, 3, 2]);
  assert.deepEqual(s.czeka.map((x) => x.n.id), [1]);
  assert.deepEqual(s.spokoj.map((x) => x.n.id), [6]);
  assert.deepEqual(s.zrobione.map((x) => x.n.id), [7]);
  assert.match(s.ruch[3].o.powod, /Przypomnij się/);
  assert.equal(s.ruch[1].o.powod, 'Termin jutro');
});

test('przypięta kartka jest na górze swojej sekcji', () => {
  const s = P.uloz([
    { id: 1, status: 'do-poprawek', due_date: '2026-11-10' },
    { id: 2, status: 'w-trakcie', pinned: 1, mail_summary: { owner: 'Jakub' } },
  ], DZIS);
  assert.deepEqual(s.ruch.map((x) => x.n.id), [2, 1]);
});

test('„Do ustalenia” ląduje w Twoim ruchu z prośbą o ustalenie kroku', () => {
  const o = P.ocen({ id: 1, status: 'do-zrobienia', mail_summary: { owner: 'Do ustalenia' } }, DZIS);
  assert.equal(o.sekcja, 'ruch');
  assert.equal(o.powod, 'Ustal następny krok');
});
