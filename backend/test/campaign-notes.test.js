'use strict';
// Zapis statusu i notatki leada — baza podmieniona na atrapę w pamięci,
// żeby test działał także tam, gdzie natywny SQLite się nie buduje.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const wiersze = new Map();
const atrapa = {
  db: {
    prepare(sql) {
      return {
        get: (id) => wiersze.get(id),
        run: (id, status, notatka, updated_at) => { wiersze.set(id, { status, notatka, updated_at }); },
      };
    },
  },
  getSetting: (_k, f) => f,
};
const dbPath = require.resolve(path.join(__dirname, '..', 'src', 'db.js'));
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: atrapa };

let express;
try { express = require('express'); } catch { express = null; }

test('PATCH zapisuje status i notatkę, odrzuca złe dane', { skip: !express && 'brak express (npm ci)' }, async () => {
  const app = express(); app.use(express.json());
  app.use('/k', require('../src/routes/campaign.routes'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/k`;
  const patch = (id, body) => fetch(`${base}/leady/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    let r = await patch('123456789', { status: 'spotkanie' });
    assert.equal(r.status, 200);
    r = await patch('123456789', { notatka: 'Meet we wtorek 10:00' });
    const j = await r.json();
    assert.equal(j.status, 'spotkanie');
    assert.equal(j.notatka, 'Meet we wtorek 10:00');
    assert.equal((await patch('123456789', { status: 'cokolwiek' })).status, 400);
    assert.equal((await patch('abc', { status: 'nowy' })).status, 400);
  } finally { server.close(); }
});

test('lista etapów zaczyna się od „nowy”', () => {
  assert.equal(require('../src/routes/campaign.routes').STATUSY[0], 'nowy');
});
