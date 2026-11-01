'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'p21-board-test-'));
process.env.DATA_DIR = temp;
const { db, init } = require('../src/db');
init();
const { parseEmails, manualSummary } = require('../src/services/boardRefresh');
const summary = { summary: 'Koncepcja uzgodniona, jeszcze niewysłana.', next_step: 'Wysłać koncepcję do 6 listopada.',
  owner: 'Jakub', due_date: '2026-11-06', last_contact: '2026-10-30', needs_review: false,
  sources: ['https://mail.google.com/mail/u/0/#all/test'] };
let server, base;
test.before(async () => {
  const app = require('express')(); app.use(require('express').json());
  app.use('/board', require('../src/routes/board.routes'));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/board`;
});
function addNote() {
  const id = db.prepare(`INSERT INTO notes (created_at,updated_at,title,body,status,contact_emails)
    VALUES ('2026-10-30','2026-10-30','Klient','Moja ręczna notatka','do-zrobienia','client@example.com')`).run().lastInsertRowid;
  return db.prepare('SELECT * FROM notes WHERE id=?').get(id);
}
const patch = (n, body) => fetch(base + `/notes/${n.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
test('dokładne adresy oraz poprawne daty i linki Gmaila', () => {
  assert.deepEqual(parseEmails('A@example.com, a@example.com'), ['a@example.com']);
  assert.throws(() => parseEmails('a@example.com OR from:everybody'));
  assert.ok(manualSummary(summary).checked_at);
  assert.throws(() => manualSummary({ ...summary, due_date: '2026-02-30' }));
  assert.throws(() => manualSummary({ ...summary, sources: ['javascript:alert(1)'] }));
  assert.throws(() => manualSummary({ ...summary, sources: ['https://mail.google.com.evil.example/'] }));
});
test('zapis i odczyt ustaleń zachowuje ręczne notatki oraz tworzy kopię', async () => {
  const n = addNote();
  assert.equal((await patch(n, { expected_updated_at: n.updated_at, mail_summary: summary })).status, 200);
  const stored = db.prepare('SELECT * FROM notes WHERE id=?').get(n.id);
  assert.equal(stored.body, n.body);
  assert.equal(JSON.parse(stored.mail_summary).next_step, summary.next_step);
  const copy = db.prepare('SELECT * FROM board_backups ORDER BY id DESC LIMIT 1').get();
  assert.equal(JSON.parse(copy.snapshot).find(x => x.id === n.id).mail_summary, null);
  const { notes } = await (await fetch(base + '/notes')).json();
  assert.equal(notes.find(x => x.id === n.id).mail_summary.manual, true);
});
test('stary formularz i błędne dane nie nadpisują nowszych notatek', async () => {
  const n = addNote();
  db.prepare('UPDATE notes SET updated_at=?,body=? WHERE id=?').run('2026-11-01', 'Nowsze notatki', n.id);
  assert.equal((await patch(n, { expected_updated_at: n.updated_at, body: 'Stare notatki' })).status, 409);
  assert.equal((await patch(n, { mail_summary: { ...summary, due_date: 'błąd' } })).status, 400);
  assert.equal(db.prepare('SELECT body FROM notes WHERE id=?').get(n.id).body, 'Nowsze notatki');
});
test('pobranie i przywrócenie kopii zabezpiecza bieżący stan i pozostawia nowe kartki', async () => {
  const n = addNote();
  const { id } = await (await fetch(base + '/backups', { method: 'POST' })).json();
  const copy = await (await fetch(base + `/backups/${id}/download`)).json();
  assert.ok(copy.notes.some(x => x.id === n.id));
  await patch(n, { mail_summary: summary });
  const newer = addNote();
  assert.equal((await fetch(base + `/backups/${id}/restore`, { method: 'POST' })).status, 200);
  assert.equal(db.prepare('SELECT mail_summary FROM notes WHERE id=?').get(n.id).mail_summary, null);
  assert.ok(db.prepare('SELECT * FROM notes WHERE id=?').get(newer.id));
  const undo = db.prepare('SELECT * FROM board_backups ORDER BY id DESC LIMIT 1').get();
  assert.equal(JSON.parse(JSON.parse(undo.snapshot).find(x => x.id === n.id).mail_summary).summary, summary.summary);
});
test('stary przycisk nie uruchamia analizy ani nie wymaga klucza', async () => {
  const r = await fetch(base + '/refresh', { method: 'POST' });
  assert.equal(r.status, 410);
  assert.match((await r.json()).error, /asystenta w czacie/);
});
test.after(async () => { await new Promise(resolve => server.close(resolve)); db.close(); fs.rmSync(temp, {recursive:true,force:true}); });
