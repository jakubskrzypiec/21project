'use strict';
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { config } = require('./config');

fs.mkdirSync(config.dataDir, { recursive: true });
const db = new Database(path.join(config.dataDir, 'panel.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- ANALITYKA ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pageviews (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ts           TEXT NOT NULL,
  day          TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  session_id   TEXT NOT NULL,
  path         TEXT NOT NULL,
  title        TEXT,
  referrer     TEXT,
  referrer_host TEXT,
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  device       TEXT,
  browser      TEXT,
  os           TEXT,
  screen_w     INTEGER,
  country      TEXT,
  duration_ms  INTEGER DEFAULT 0,
  scroll_pct   INTEGER DEFAULT 0,
  is_entry     INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_pv_day ON pageviews(day);
CREATE INDEX IF NOT EXISTS idx_pv_session ON pageviews(session_id);
CREATE INDEX IF NOT EXISTS idx_pv_path ON pageviews(path);

CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ts         TEXT NOT NULL,
  day        TEXT NOT NULL,
  session_id TEXT,
  visitor_hash TEXT,
  name       TEXT NOT NULL,
  path       TEXT,
  value      REAL,
  meta       TEXT
);
CREATE INDEX IF NOT EXISTS idx_ev_day ON events(day);
CREATE INDEX IF NOT EXISTS idx_ev_name ON events(name);

-- LEADY I KLIENCI ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  source       TEXT NOT NULL DEFAULT 'manual',   -- form | manual | crawler | import
  status       TEXT NOT NULL DEFAULT 'new',      -- new | contacted | replied | meeting | won | lost | rejected
  name         TEXT,
  company      TEXT,
  email        TEXT,
  phone        TEXT,
  website      TEXT,
  domain       TEXT,
  city         TEXT,
  industry     TEXT,
  message      TEXT,
  notes        TEXT,
  tags         TEXT,
  score        INTEGER DEFAULT 0,
  audit        TEXT,                              -- JSON: wynik analizy strony
  unsubscribed INTEGER NOT NULL DEFAULT 0,
  unsub_token  TEXT,
  last_contacted_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_domain ON leads(domain) WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

CREATE TABLE IF NOT EXISTS suppression (
  value      TEXT PRIMARY KEY,   -- e-mail albo domena, lowercase
  reason     TEXT,
  created_at TEXT NOT NULL
);

-- OUTREACH ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS templates (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  subject    TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outreach (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id      INTEGER REFERENCES leads(id) ON DELETE CASCADE,
  created_at   TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft',   -- draft | queued | sent | failed | skipped
  to_email     TEXT NOT NULL,
  subject      TEXT NOT NULL,
  body         TEXT NOT NULL,
  generated_by TEXT,                             -- template:<id> | ai | manual
  scheduled_at TEXT,
  sent_at      TEXT,
  gmail_id     TEXT,
  gmail_thread_id TEXT,
  error        TEXT
);
CREATE INDEX IF NOT EXISTS idx_outreach_status ON outreach(status);

-- PROJEKTY ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  name        TEXT NOT NULL,
  client      TEXT,
  lead_id     INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'brief',   -- brief | projekt | wdrozenie | testy | live | wstrzymany
  budget      REAL,
  paid        REAL DEFAULT 0,
  currency    TEXT DEFAULT 'PLN',
  deadline    TEXT,
  url         TEXT,
  repo        TEXT,
  description TEXT,
  color       TEXT
);

CREATE TABLE IF NOT EXISTS project_tasks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  done       INTEGER NOT NULL DEFAULT 0,
  due_date   TEXT,
  position   INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- SPOTKANIA ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meetings (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at      TEXT NOT NULL,
  title           TEXT NOT NULL,
  starts_at       TEXT NOT NULL,
  ends_at         TEXT NOT NULL,
  location        TEXT,
  notes           TEXT,
  attendee_email  TEXT,
  lead_id         INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  project_id      INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  google_event_id TEXT,
  status          TEXT NOT NULL DEFAULT 'planned' -- planned | done | cancelled
);
CREATE INDEX IF NOT EXISTS idx_meetings_start ON meetings(starts_at);

-- INTEGRACJE / AUDYT ------------------------------------------------------
CREATE TABLE IF NOT EXISTS oauth_tokens (
  provider      TEXT PRIMARY KEY,
  account_email TEXT,
  access_token  TEXT,
  refresh_token TEXT,
  scope         TEXT,
  expiry_date   INTEGER,
  updated_at    TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  ts     TEXT NOT NULL,
  action TEXT NOT NULL,
  ip     TEXT,
  meta   TEXT
);
`;

function init() {
  db.exec(SCHEMA);
  const count = db.prepare('SELECT COUNT(*) AS n FROM templates').get().n;
  if (count === 0) seedTemplates();
  return db;
}

function seedTemplates() {
  const now = new Date().toISOString();
  const insert = db.prepare(
    'INSERT INTO templates (name, subject, body, created_at) VALUES (?, ?, ?, ?)'
  );
  insert.run(
    'Pierwszy kontakt — strona nieresponsywna',
    'Strona {{company}} na telefonie — trzy rzeczy do poprawy',
    `Dzień dobry{{#firstName}} {{firstName}}{{/firstName}},

nazywam się Jakub Skrzypiec, projektuję strony internetowe dla firm ze Śląska (21project.pl).

Zaglądałem na {{domain}} i zwróciłem uwagę na {{observation}}.

{{pitch}}

Jeśli to temat na teraz, chętnie pokażę na Waszym przykładzie, co zmieniłbym w pierwszej kolejności — bez zobowiązań.

Pozdrawiam,
Jakub Skrzypiec
21 project · 601 863 788 · https://21project.pl`,
    now
  );
  insert.run(
    'Follow-up po 5 dniach',
    'Wracam do tematu strony {{company}}',
    `Dzień dobry{{#firstName}} {{firstName}}{{/firstName}},

odzywam się jeszcze raz w sprawie strony {{domain}} — rozumiem, że temat mógł przepaść w skrzynce.

Jeśli teraz nie jest to priorytet, po prostu dajcie znać, a nie będę wracał.

Pozdrawiam,
Jakub Skrzypiec
21 project · 601 863 788 · https://21project.pl`,
    now
  );
}

const getSetting = (key, fallback = null) => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
};
const setSetting = (key, value) =>
  db
    .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, String(value));

const logAction = (action, ip, meta) =>
  db
    .prepare('INSERT INTO audit_log (ts, action, ip, meta) VALUES (?, ?, ?, ?)')
    .run(new Date().toISOString(), action, ip || null, meta ? JSON.stringify(meta) : null);

module.exports = { db, init, getSetting, setSetting, logAction };
