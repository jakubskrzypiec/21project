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
const { parseEmails, chunks, collect, validateAnalysis, createService } = require('../src/services/boardRefresh');

const message = (id, body, date = 1000) => ({ id, threadId: 'thread1', internalDate: date,
  date: '2026-10-30', from: 'client@example.com', to: 'owner@example.com', subject: 'Projekt', body });
const analysis = { summary: 'Koncepcja do przygotowania.', next_step: 'Przygotować koncepcję.', owner: 'Jakub',
  status: 'do-zrobienia', due_date: '2026-11-06', needs_review: false,
  evidence: [{ message_id: 'm1', quote: 'Przygotuję projekt do 6 listopada.' }] };

test('adresy są dokładne, deduplikowane; zapytania Gmaila nie mogą być adresem', () => {
  assert.deepEqual(parseEmails('Client@Example.com; client@example.com, old@example.com'), ['client@example.com', 'old@example.com']);
  assert.throws(() => parseEmails('client@example.com OR from:anybody'));
});

test('długie maile są dzielone bez utraty końcówki i starszych wiadomości', () => {
  const body = 'A'.repeat(60000) + 'OBIETNICA_NA_KONCU';
  const parts = chunks([message('old', body), message('new', 'Nowa odpowiedź')], 10000);
  assert.ok(parts.length > 6);
  assert.ok(parts.join('').includes('OBIETNICA_NA_KONCU'));
  assert.ok(parts.join('').includes('Nowa odpowiedź'));
  assert.ok(parts.every(p => p.length <= 10000));
});

test('wynik bez rzeczywistego cytatu, z nieprawidłową datą lub statusem jest odrzucany', () => {
  const messages = [message('m1', analysis.evidence[0].quote)];
  assert.equal(validateAnalysis(structuredClone(analysis), messages).evidence[0].thread_id, 'thread1');
  assert.throws(() => validateAnalysis({ ...analysis, due_date: '2026-02-30' }, messages));
  assert.throws(() => validateAnalysis({ ...analysis, status: 'unknown' }, messages));
  assert.throws(() => validateAnalysis({ ...analysis, evidence: [{ message_id: 'm1', quote: 'Projekt wysłany.' }] }, messages));
});

test('pełne wyszukiwanie paginuje, scala wątki, ignoruje szkice i zachowuje link HTML', async () => {
  const requests = [];
  const api = { users: { messages: { list: async args => {
    requests.push(args);
    return { data: args.pageToken ? { messages: [{ threadId: 't2' }] } : {
      messages: [{ threadId: 't1' }, { threadId: 't1' }], nextPageToken: 'page2' } };
  } }, threads: { get: async ({ id }) => ({ data: { messages: [
    { id, internalDate: id === 't1' ? '1000' : '2000', labelIds: ['SENT'], payload: {
      mimeType: 'text/html', headers: [{ name: 'Subject', value: 'Projekt' }],
      body: { data: Buffer.from('<a href="https://example.com/project">Zobacz projekt</a>').toString('base64url') } } },
    { id: 'draft', labelIds: ['DRAFT'] },
  ] } }) } } };
  const mail = await collect(api, ['client@example.com']);
  assert.equal(mail.length, 2);
  assert.equal(requests[1].pageToken, 'page2');
  assert.ok(requests[0].q.includes('in:anywhere'));
  assert.ok(requests[0].q.includes('from:client@example.com'));
  assert.ok(requests[0].q.includes('to:client@example.com'));
  assert.ok(mail[0].body.includes('https://example.com/project'));
});

function addNote() {
  return Number(db.prepare(`INSERT INTO notes (created_at,updated_at,title,body,status,contact_emails)
    VALUES ('2026-10-30','2026-10-30','Klient','Moja ręczna notatka','czeka-na-odpowiedz','client@example.com')`).run().lastInsertRowid);
}
const google = { status: () => ({ connected: true }), gmail: () => ({}) };
const ai = { enabled: () => true, complete: () => {} };
async function finished() {
  for (let i = 0; i < 100; i++) {
    const job = db.prepare('SELECT * FROM board_refreshes ORDER BY id DESC LIMIT 1').get();
    if (job && job.status !== 'running') return job;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  throw new Error('Job did not finish');
}

test('aktualizacja zachowuje ręczne notatki i termin, tworzy kopię przed zapisem', async () => {
  const id = addNote();
  const service = createService({ db, google, ai, collectMail: async () => [message('m1', 'Treść')],
    analyzeMail: async () => structuredClone(analysis) });
  const job = service.start([id]);
  await finished();
  const note = db.prepare('SELECT * FROM notes WHERE id=?').get(id);
  assert.equal(note.body, 'Moja ręczna notatka');
  assert.equal(note.status, 'do-zrobienia');
  assert.equal(note.due_date, null);
  assert.equal(JSON.parse(note.mail_summary).due_date, '2026-11-06');
  const old = JSON.parse(db.prepare('SELECT snapshot FROM board_backups WHERE id=?').get(job.backup_id).snapshot).find(n => n.id === id);
  assert.equal(old.status, 'czeka-na-odpowiedz');
  assert.equal(old.mail_summary, null);
});

test('ręczna edycja w czasie analizy wygrywa z automatyczną aktualizacją', async () => {
  const id = addNote();
  const service = createService({ db, google, ai, collectMail: async () => [message('m1', 'Treść')],
    analyzeMail: async () => {
      db.prepare('UPDATE notes SET body=? WHERE id=?').run('Nowa ręczna notatka', id);
      return structuredClone(analysis);
    } });
  service.start([id]);
  const job = await finished();
  assert.equal(JSON.parse(job.results)[0].state, 'conflict');
  assert.equal(db.prepare('SELECT body FROM notes WHERE id=?').get(id).body, 'Nowa ręczna notatka');
  assert.equal(db.prepare('SELECT mail_summary FROM notes WHERE id=?').get(id).mail_summary, null);
});

test('niepewny wynik nie zmienia statusu; błąd poczty nie nadpisuje kartki', async () => {
  const id = addNote();
  const service = createService({ db, google, ai, collectMail: async () => [message('m1', 'Treść')],
    analyzeMail: async () => ({ ...analysis, needs_review: true }) });
  service.start([id]); await finished();
  assert.equal(db.prepare('SELECT status FROM notes WHERE id=?').get(id).status, 'czeka-na-odpowiedz');
  const before = db.prepare('SELECT * FROM notes WHERE id=?').get(id);
  const failing = createService({ db, google, ai, collectMail: async () => { throw new Error('Brak połączenia'); } });
  failing.start([id]); await finished();
  assert.deepEqual(db.prepare('SELECT * FROM notes WHERE id=?').get(id), before);
});

test('API kopii: pobranie i przywrócenie, kopia przed cofnięciem, nowa kartka pozostaje', async () => {
  const express = require('express');
  const app = express(); app.use(express.json()); app.use('/board', require('../src/routes/board.routes'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/board`;
  try {
    const id = addNote();
    const { id: backupId } = await (await fetch(base + '/backups', { method: 'POST' })).json();
    const exported = await (await fetch(base + `/backups/${backupId}/download`)).json();
    assert.ok(exported.notes.some(n => n.id === id));
    db.prepare('UPDATE notes SET body=? WHERE id=?').run('Zmiana', id);
    const newer = addNote();
    const response = await fetch(base + `/backups/${backupId}/restore`, { method: 'POST' });
    assert.equal(response.status, 200);
    assert.equal(db.prepare('SELECT body FROM notes WHERE id=?').get(id).body, 'Moja ręczna notatka');
    assert.ok(db.prepare('SELECT * FROM notes WHERE id=?').get(newer));
    const undo = db.prepare('SELECT * FROM board_backups ORDER BY id DESC LIMIT 1').get();
    assert.equal(JSON.parse(undo.snapshot).find(n => n.id === id).body, 'Zmiana');
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test.after(() => { db.close(); fs.rmSync(temp, { recursive: true, force: true }); });
