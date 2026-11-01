'use strict';

const EMAIL = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;

function parseEmails(value = '') {
  const emails = [...new Set(String(value).split(/[\s,;]+/).filter(Boolean).map(x => x.toLowerCase()))];
  if (emails.length > 12 || emails.some(x => !EMAIL.test(x))) {
    throw new Error('Podaj do 12 pełnych adresów e-mail, oddzielonych przecinkiem.');
  }
  return emails;
}

function backup(db, reason) {
  const snapshot = JSON.stringify(db.prepare('SELECT * FROM notes ORDER BY id').all());
  const r = db.prepare('INSERT INTO board_backups (created_at, reason, snapshot) VALUES (?, ?, ?)')
    .run(new Date().toISOString(), reason, snapshot);
  return Number(r.lastInsertRowid);
}

function manualSummary(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Nieprawidłowe ustalenia z poczty.');
  const text = (key, max) => {
    if (typeof value[key] !== 'string' || value[key].length > max) throw new Error('Nieprawidłowe pole: ' + key);
    return value[key].trim();
  };
  const summary = text('summary', 6000);
  const next = text('next_step', 2000);
  if (!summary || !next || !['Jakub', 'Klient', 'Do ustalenia'].includes(value.owner)) throw new Error('Uzupełnij stan, następny krok i odpowiedzialną osobę.');
  const date = key => {
    const d = value[key] || null;
    if (d && (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !Number.isFinite(Date.parse(d)) || new Date(d).toISOString().slice(0, 10) !== d)) throw new Error('Nieprawidłowa data.');
    return d;
  };
  const sources = value.sources || [];
  if (!Array.isArray(sources) || sources.length > 12 || sources.some(s => typeof s !== 'string'
      || s.length > 600 || !/^https:\/\/mail\.google\.com\//i.test(s))) throw new Error('Podaj poprawne odnośniki do Gmaila.');
  return { manual: true, summary, next_step: next, owner: value.owner, last_contact: date('last_contact'),
    due_date: date('due_date'), checked_at: new Date().toISOString(), needs_review: value.needs_review === true,
    sources: [...new Set(sources)] };
}

module.exports = { parseEmails, backup, manualSummary };
