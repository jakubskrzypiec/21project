'use strict';
const express = require('express');
const { db } = require('../db');

const router = express.Router();
const now = () => new Date().toISOString();
const STATUSES = ['brief', 'projekt', 'wdrozenie', 'testy', 'live', 'wstrzymany'];

router.get('/', (req, res) => {
  const { status } = req.query;
  const rows = status
    ? db.prepare('SELECT * FROM projects WHERE status = ? ORDER BY COALESCE(deadline, updated_at)').all(status)
    : db.prepare('SELECT * FROM projects ORDER BY CASE status WHEN \'wstrzymany\' THEN 1 ELSE 0 END, COALESCE(deadline, updated_at)').all();
  res.json({ projects: rows.map(withProgress) });
});

router.get('/summary', (_req, res) => {
  const byStatus = db.prepare('SELECT status, COUNT(*) AS n FROM projects GROUP BY status').all();
  const money = db.prepare(
    "SELECT COALESCE(SUM(budget),0) AS budget, COALESCE(SUM(paid),0) AS paid FROM projects WHERE status != 'wstrzymany'"
  ).get();
  const upcoming = db.prepare(
    "SELECT id, name, deadline FROM projects WHERE deadline IS NOT NULL AND status NOT IN ('live','wstrzymany') ORDER BY deadline LIMIT 5"
  ).all();
  const overdue = db.prepare(
    "SELECT COUNT(*) AS n FROM projects WHERE deadline < ? AND status NOT IN ('live','wstrzymany')"
  ).get(now().slice(0, 10)).n;
  res.json({ byStatus, money, upcoming, overdue });
});

router.get('/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Nie znaleziono projektu.' });
  res.json({
    project: withProgress(project),
    tasks: db.prepare('SELECT * FROM project_tasks WHERE project_id = ? ORDER BY done, position, id').all(project.id),
    notes: db.prepare('SELECT * FROM project_notes WHERE project_id = ? ORDER BY created_at DESC').all(project.id),
    meetings: db.prepare('SELECT * FROM meetings WHERE project_id = ? ORDER BY starts_at DESC').all(project.id),
  });
});

router.post('/', (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'Nazwa projektu jest wymagana.' });
  if (b.status && !STATUSES.includes(b.status)) return res.status(400).json({ error: 'Nieznany status.' });
  const r = db.prepare(
    `INSERT INTO projects (created_at, updated_at, name, client, lead_id, status, budget, paid, currency,
                           deadline, url, repo, description, color)
     VALUES (@created_at, @updated_at, @name, @client, @lead_id, @status, @budget, @paid, @currency,
             @deadline, @url, @repo, @description, @color)`
  ).run({
    created_at: now(), updated_at: now(),
    name: b.name, client: b.client || null, lead_id: b.lead_id || null,
    status: b.status || 'brief', budget: b.budget ?? null, paid: b.paid ?? 0,
    currency: b.currency || 'PLN', deadline: b.deadline || null, url: b.url || null,
    repo: b.repo || null, description: b.description || null, color: b.color || null,
  });
  // Domyślna lista kroków — dokładnie ten proces, który opisujesz klientom na stronie.
  if (b.withDefaultTasks !== false) {
    const tasks = ['Brief i zebranie materiałów', 'Projekt makiety', 'Akceptacja projektu', 'Kodowanie',
      'Wersja mobilna', 'SEO techniczne i meta', 'Testy i poprawki', 'Publikacja i przekazanie'];
    const ins = db.prepare('INSERT INTO project_tasks (project_id, title, position, created_at) VALUES (?, ?, ?, ?)');
    tasks.forEach((t, i) => ins.run(r.lastInsertRowid, t, i, now()));
  }
  res.status(201).json({ project: withProgress(db.prepare('SELECT * FROM projects WHERE id = ?').get(r.lastInsertRowid)) });
});

router.patch('/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Nie znaleziono projektu.' });
  const b = req.body || {};
  if (b.status && !STATUSES.includes(b.status)) return res.status(400).json({ error: 'Nieznany status.' });
  const next = { ...p, ...pick(b, ['name', 'client', 'lead_id', 'status', 'budget', 'paid', 'currency', 'deadline', 'url', 'repo', 'description', 'color']) };
  db.prepare(
    `UPDATE projects SET name=@name, client=@client, lead_id=@lead_id, status=@status, budget=@budget,
       paid=@paid, currency=@currency, deadline=@deadline, url=@url, repo=@repo, description=@description,
       color=@color, updated_at=@updated_at WHERE id=@id`
  ).run({ ...next, updated_at: now() });
  res.json({ project: withProgress(db.prepare('SELECT * FROM projects WHERE id = ?').get(p.id)) });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

/* ------------------------------- zadania ------------------------------- */

router.post('/:id/tasks', (req, res) => {
  const title = String(req.body?.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Treść zadania jest wymagana.' });
  const pos = db.prepare('SELECT COALESCE(MAX(position),0)+1 AS p FROM project_tasks WHERE project_id = ?').get(req.params.id).p;
  const r = db.prepare('INSERT INTO project_tasks (project_id, title, due_date, position, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(req.params.id, title, req.body?.due_date || null, pos, now());
  res.status(201).json({ task: db.prepare('SELECT * FROM project_tasks WHERE id = ?').get(r.lastInsertRowid) });
});

router.patch('/:id/tasks/:taskId', (req, res) => {
  const t = db.prepare('SELECT * FROM project_tasks WHERE id = ? AND project_id = ?').get(req.params.taskId, req.params.id);
  if (!t) return res.status(404).json({ error: 'Nie znaleziono zadania.' });
  const next = { ...t, ...pick(req.body || {}, ['title', 'done', 'due_date', 'position']) };
  db.prepare('UPDATE project_tasks SET title=?, done=?, due_date=?, position=? WHERE id=?')
    .run(next.title, next.done ? 1 : 0, next.due_date || null, next.position || 0, t.id);
  db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now(), req.params.id);
  res.json({ task: db.prepare('SELECT * FROM project_tasks WHERE id = ?').get(t.id) });
});

router.delete('/:id/tasks/:taskId', (req, res) => {
  db.prepare('DELETE FROM project_tasks WHERE id = ? AND project_id = ?').run(req.params.taskId, req.params.id);
  res.json({ ok: true });
});

router.post('/:id/notes', (req, res) => {
  const body = String(req.body?.body || '').trim();
  if (!body) return res.status(400).json({ error: 'Notatka jest pusta.' });
  const r = db.prepare('INSERT INTO project_notes (project_id, body, created_at) VALUES (?, ?, ?)')
    .run(req.params.id, body, now());
  res.status(201).json({ note: db.prepare('SELECT * FROM project_notes WHERE id = ?').get(r.lastInsertRowid) });
});

router.delete('/:id/notes/:noteId', (req, res) => {
  db.prepare('DELETE FROM project_notes WHERE id = ? AND project_id = ?').run(req.params.noteId, req.params.id);
  res.json({ ok: true });
});

function withProgress(p) {
  if (!p) return p;
  const t = db.prepare('SELECT COUNT(*) AS all_n, SUM(done) AS done_n FROM project_tasks WHERE project_id = ?').get(p.id);
  return {
    ...p,
    tasksTotal: t.all_n || 0,
    tasksDone: t.done_n || 0,
    progress: t.all_n ? Math.round(((t.done_n || 0) / t.all_n) * 100) : 0,
  };
}

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

module.exports = router;
