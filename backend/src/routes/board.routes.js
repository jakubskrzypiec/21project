'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const { db } = require('../db');
const { config } = require('../config');
const refresh = require('../services/boardRefresh');
const refreshService = refresh.createService({ db, google: require('../services/google'), ai: require('../services/ai') });

const router = express.Router();
const now = () => new Date().toISOString();

const FILES_DIR = path.join(config.dataDir, 'files');
fs.mkdirSync(FILES_DIR, { recursive: true });

const KOLORY = ['zolta', 'biala', 'zielona', 'rozowa', 'niebieska'];

/**
 * Statusy kartek — kolejność jest jednocześnie kolejnością kolumn na tablicy.
 * „zrobione" jest ostatnie i traktowane jako zamknięte: takie kartki chowają się,
 * dopóki nie klikniesz „Pokaż zrobione".
 */
const STATUSY = [
  'do-zrobienia',
  'czekam-na-materialy',
  'w-trakcie',
  'do-poprawek',
  'wycena-wyslana',
  'czeka-na-odpowiedz',
  'wstrzymane',
  'zrobione',
];
const ZAMKNIETY = 'zrobione';

router.post('/refresh', (req, res) => {
  try {
    const ids = req.body?.ids;
    if (ids !== undefined && (!Array.isArray(ids) || !ids.length || ids.some(x => !Number.isSafeInteger(x)))) {
      return res.status(400).json({ error: 'Nieprawidłowa lista kartek.' });
    }
    res.status(202).json(refreshService.start(ids));
  } catch (err) { res.status(409).json({ error: err.message }); }
});
router.get('/refresh', (_req, res) => {
  const job = db.prepare('SELECT * FROM board_refreshes ORDER BY id DESC LIMIT 1').get();
  res.json({ job: job ? { ...job, results: JSON.parse(job.results) } : null });
});
router.get('/backups', (_req, res) => {
  res.json({ backups: db.prepare('SELECT id, created_at, reason FROM board_backups ORDER BY id DESC LIMIT 100').all() });
});
router.post('/backups', (_req, res) => res.status(201).json({ id: refresh.backup(db, 'Kopia ręczna') }));
router.get('/backups/:id/download', (req, res) => {
  const b = db.prepare('SELECT * FROM board_backups WHERE id=?').get(req.params.id);
  if (!b) return res.status(404).json({ error: 'Nie znaleziono kopii.' });
  res.attachment(`tablica-${b.id}.json`).type('json').send(JSON.stringify({ version: 1, created_at: b.created_at,
    reason: b.reason, notes: JSON.parse(b.snapshot) }, null, 2));
});
router.post('/backups/:id/restore', (req, res) => {
  if (refreshService.isBusy()) return res.status(409).json({ error: 'Poczekaj na zakończenie odświeżania.' });
  const b = db.prepare('SELECT * FROM board_backups WHERE id=?').get(req.params.id);
  if (!b) return res.status(404).json({ error: 'Nie znaleziono kopii.' });
  const restored = db.transaction(() => {
    refresh.backup(db, `Przed przywróceniem kopii ${b.id}`);
    const fields = ['created_at', 'updated_at', 'title', 'body', 'color', 'pinned', 'status', 'done',
      'due_date', 'position', 'project_id', 'source', 'source_ref', 'links', 'contact_emails', 'mail_summary'];
    const statement = db.prepare(`UPDATE notes SET ${fields.map(k => `${k}=?`).join(',')} WHERE id=?`);
    let count = 0;
    for (const n of JSON.parse(b.snapshot)) {
      count += statement.run(...fields.map(k => n[k] ?? null), n.id).changes;
    }
    return count;
  })();
  res.json({ restored });
});

/* ------------------------------- NOTATKI ------------------------------- */

router.get('/notes', (req, res) => {
  const showDone = req.query.done === '1';
  const rows = db
    .prepare(
      `SELECT n.*, p.name AS project_name FROM notes n
         LEFT JOIN projects p ON p.id = n.project_id
        WHERE (@showDone = 1 OR n.status != @zamkniety)
        ORDER BY n.pinned DESC, n.position, n.updated_at DESC`
    )
    .all({ showDone: showDone ? 1 : 0, zamkniety: ZAMKNIETY });

  const fileCounts = db
    .prepare('SELECT note_id, COUNT(*) AS n FROM files WHERE note_id IS NOT NULL GROUP BY note_id')
    .all();
  const counts = new Map(fileCounts.map((r) => [r.note_id, r.n]));

  const licznik = Object.fromEntries(STATUSY.map((st) => [st, 0]));
  db.prepare('SELECT status, COUNT(*) AS n FROM notes GROUP BY status')
    .all().forEach((r) => { if (r.status in licznik) licznik[r.status] = r.n; });

  res.json({
    notes: rows.map((n) => ({
      ...n,
      files: counts.get(n.id) || 0,
      links: (() => { try { return n.links ? JSON.parse(n.links) : null; } catch { return null; } })(),
      mail_summary: (() => { try { return JSON.parse(n.mail_summary || 'null'); } catch { return null; } })(),
    })),
    statusy: STATUSY,
    licznik,
    doneCount: licznik[ZAMKNIETY],
  });
});

router.post('/notes', (req, res) => {
  const b = req.body || {};
  if (!String(b.title || '').trim() && !String(b.body || '').trim()) {
    return res.status(400).json({ error: 'Notatka musi mieć tytuł albo treść.' });
  }
  const pos = db.prepare('SELECT COALESCE(MIN(position), 0) - 1 AS p FROM notes').get().p;
  const status = STATUSY.includes(b.status) ? b.status : 'do-zrobienia';
  let emails;
  try { emails = refresh.parseEmails(b.contact_emails).join(', '); }
  catch (err) { return res.status(400).json({ error: err.message }); }
  const r = db
    .prepare(
      `INSERT INTO notes (created_at, updated_at, title, body, color, pinned, status, done,
                          due_date, position, project_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(now(), now(), String(b.title || '').slice(0, 200) || null, b.body || null,
      KOLORY.includes(b.color) ? b.color : 'zolta', b.pinned ? 1 : 0,
      status, status === ZAMKNIETY ? 1 : 0,
      b.due_date || null, pos, b.project_id || null);
  db.prepare('UPDATE notes SET contact_emails=? WHERE id=?').run(emails, r.lastInsertRowid);
  res.status(201).json({ note: db.prepare('SELECT * FROM notes WHERE id = ?').get(r.lastInsertRowid) });
});

router.patch('/notes/:id', (req, res) => {
  const n = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!n) return res.status(404).json({ error: 'Nie ma takiej notatki.' });
  const b = req.body || {};
  let emails = n.contact_emails;
  try { if (b.contact_emails !== undefined) emails = refresh.parseEmails(b.contact_emails).join(', '); }
  catch (err) { return res.status(400).json({ error: err.message }); }
  // Status jest źródłem prawdy; pole done trzymamy zgodne, żeby stary kod nie kłamał.
  let status = STATUSY.includes(b.status) ? b.status : n.status;
  if (b.status === undefined && b.done !== undefined) status = b.done ? ZAMKNIETY : 'do-zrobienia';

  const next = {
    title: b.title !== undefined ? String(b.title).slice(0, 200) : n.title,
    body: b.body !== undefined ? b.body : n.body,
    color: KOLORY.includes(b.color) ? b.color : n.color,
    pinned: b.pinned !== undefined ? (b.pinned ? 1 : 0) : n.pinned,
    status,
    done: status === ZAMKNIETY ? 1 : 0,
    due_date: b.due_date !== undefined ? b.due_date : n.due_date,
    project_id: b.project_id !== undefined ? b.project_id : n.project_id,
  };
  db.prepare(
    `UPDATE notes SET title=?, body=?, color=?, pinned=?, status=?, done=?, due_date=?,
                      project_id=?, updated_at=? WHERE id=?`
  ).run(next.title, next.body, next.color, next.pinned, next.status, next.done, next.due_date,
    next.project_id, now(), n.id);
  db.prepare('UPDATE notes SET contact_emails=?, mail_summary=? WHERE id=?')
    .run(emails, emails !== n.contact_emails ? null : n.mail_summary, n.id);
  res.json({ note: db.prepare('SELECT * FROM notes WHERE id = ?').get(n.id) });
});

router.delete('/notes/:id', (req, res) => {
  db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

/** Przesuwanie kartki w lewo/prawo na tablicy.
 *  Tablica jest jedną listą, więc sąsiada szukamy wśród wszystkich kartek
 *  o tym samym przypięciu — status nie dzieli już kolejności. */
router.post('/notes/:id/move', (req, res) => {
  const dir = req.body?.direction === 'up' ? -1 : 1;
  const n = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!n) return res.status(404).json({ error: 'Nie ma takiej notatki.' });
  const neighbour = db
    .prepare(
      `SELECT * FROM notes WHERE pinned = ? AND position ${dir < 0 ? '<' : '>'} ?
        ORDER BY position ${dir < 0 ? 'DESC' : 'ASC'} LIMIT 1`
    )
    .get(n.pinned, n.position);
  if (!neighbour) return res.json({ ok: true, moved: false });
  const swap = db.transaction(() => {
    db.prepare('UPDATE notes SET position = ? WHERE id = ?').run(neighbour.position, n.id);
    db.prepare('UPDATE notes SET position = ? WHERE id = ?').run(n.position, neighbour.id);
  });
  swap();
  res.json({ ok: true, moved: true });
});

/* -------------------------------- PLIKI -------------------------------- */

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, FILES_DIR),
    filename: (_req, file, cb) => {
      // Nazwa na dysku jest losowa — oryginalna trafia do bazy. Dzięki temu
      // żadna nazwa przysłana z zewnątrz nie może wyjść poza katalog plików.
      const ext = path.extname(file.originalname).slice(0, 10).replace(/[^.\w]/g, '');
      cb(null, crypto.randomBytes(16).toString('hex') + ext);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024, files: 10 },
});

const decodeName = (name) => {
  // Multer podaje nazwę w latin1; polskie znaki wracają dopiero po przekodowaniu.
  try { return Buffer.from(name, 'latin1').toString('utf8'); } catch { return name; }
};

router.get('/files', (req, res) => {
  const { folder, note_id: noteId, project_id: projectId } = req.query;
  const where = [];
  const params = {};
  if (folder) { where.push('folder = @folder'); params.folder = folder; }
  if (noteId) { where.push('note_id = @noteId'); params.noteId = Number(noteId); }
  if (projectId) { where.push('project_id = @projectId'); params.projectId = Number(projectId); }
  const rows = db
    .prepare(`SELECT * FROM files ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC`)
    .all(params);
  const folders = db
    .prepare('SELECT folder, COUNT(*) AS n, SUM(size) AS bytes FROM files GROUP BY folder ORDER BY folder')
    .all();
  res.json({ files: rows, folders });
});

router.post('/files', upload.array('files', 10), (req, res) => {
  const folder = String(req.body?.folder || 'Ogólne').trim().slice(0, 80) || 'Ogólne';
  const noteId = req.body?.note_id ? Number(req.body.note_id) : null;
  const projectId = req.body?.project_id ? Number(req.body.project_id) : null;
  if (!req.files?.length) return res.status(400).json({ error: 'Nie wybrano żadnego pliku.' });

  const insert = db.prepare(
    `INSERT INTO files (created_at, folder, original_name, stored_name, mime, size, note_id, project_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const saved = req.files.map((f) => {
    const r = insert.run(now(), folder, decodeName(f.originalname).slice(0, 250),
      f.filename, f.mimetype, f.size, noteId, projectId);
    return db.prepare('SELECT * FROM files WHERE id = ?').get(r.lastInsertRowid);
  });
  res.status(201).json({ files: saved });
});

router.get('/files/:id/download', (req, res) => {
  const f = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
  if (!f) return res.status(404).json({ error: 'Nie ma takiego pliku.' });
  const full = path.join(FILES_DIR, path.basename(f.stored_name));
  if (!fs.existsSync(full)) return res.status(410).json({ error: 'Plik zniknął z dysku.' });
  res.download(full, f.original_name);
});

router.patch('/files/:id', (req, res) => {
  const f = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
  if (!f) return res.status(404).json({ error: 'Nie ma takiego pliku.' });
  const folder = String(req.body?.folder || f.folder).trim().slice(0, 80) || 'Ogólne';
  db.prepare('UPDATE files SET folder = ? WHERE id = ?').run(folder, f.id);
  res.json({ file: db.prepare('SELECT * FROM files WHERE id = ?').get(f.id) });
});

router.delete('/files/:id', (req, res) => {
  const f = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
  if (!f) return res.json({ ok: true });
  try { fs.unlinkSync(path.join(FILES_DIR, path.basename(f.stored_name))); } catch { /* już go nie ma */ }
  db.prepare('DELETE FROM files WHERE id = ?').run(f.id);
  res.json({ ok: true });
});

module.exports = router;
