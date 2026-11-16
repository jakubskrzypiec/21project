'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'p21-review-test-'));
const { db, init } = require('../src/db');
init();
const review = require('../src/services/clientReview');

test('adres strony: tylko http(s), bez adresów wewnętrznych', () => {
  assert.equal(review.normalizeUrl('firma.pl'), 'https://firma.pl/');
  assert.equal(review.normalizeUrl('http://localhost:3000'), null);
  assert.equal(review.normalizeUrl('https://192.168.1.10'), null);
  assert.equal(review.normalizeUrl('ftp://x.pl'), null);
});

test('rysunek klienta: przycięty do zrzutu, złe kreski odrzucone', () => {
  const out = JSON.parse(review.cleanDrawing([
    { tool: 'pen', pts: [[-5, 10], [5000, 20]] }, { tool: 'zly', pts: [[1, 1]] }, { tool: 'rect', pts: [[1, 1]] },
  ], { width: 100, height: 50 }));
  assert.deepEqual(out, [{ tool: 'pen', pts: [[0, 10], [100, 20]] }]);
  assert.equal(review.cleanDrawing([], { width: 1, height: 1 }), null);
});

test('link dla klienta i poprawki trafiają do najnowszej gotowej wersji', () => {
  const now = new Date().toISOString();
  const pid = db.prepare("INSERT INTO projects (created_at, updated_at, name) VALUES (?, ?, 'Test')").run(now, now).lastInsertRowid;
  const { token } = review.setSharing(pid, true);
  assert.equal(review.projectByToken(token).id, Number(pid));
  const rid = db.prepare("INSERT INTO review_rounds (project_id, created_at, no, url, status) VALUES (?, ?, 1, 'https://x.pl', 'gotowe')").run(pid, now).lastInsertRowid;
  const sid = db.prepare("INSERT INTO review_shots (round_id, device, idx, label, file, width, height) VALUES (?, 'komputer', 0, 'Góra', 'a.jpg', 1440, 900)").run(rid).lastInsertRowid;
  assert.throws(() => review.submitFeedback(review.projectByToken(token), { items: [] }), /Dodaj komentarz/);
  const r = review.submitFeedback(review.projectByToken(token), {
    items: [{ shot_id: sid, text: 'Większy napis', drawing: [{ tool: 'rect', pts: [[1, 1], [50, 50]] }] }, { shot_id: 9999, text: 'obcy zrzut' }],
    general: 'Dodać telefon',
  });
  assert.equal(r.count, 2);
  assert.equal(review.newFeedbackCount(pid), 2);
  review.setSharing(pid, false);
  assert.equal(review.projectByToken(token), null);
});
