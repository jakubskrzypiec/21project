'use strict';
/**
 * Strona projektu dla klienta: link bez logowania, zrzuty sekcji strony w rundach
 * i poprawki klienta (tekst + rysunki). Zrzuty robi osobny proces (captureWorker.js),
 * uruchamiany na jedno zadanie i ubijany po limicie czasu — przeglądarka nigdy nie
 * pracuje w procesie panelu, więc nie może zawiesić logowania.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { fork } = require('node:child_process');
const { db } = require('../db');
const { config } = require('../config');

const SHOTS_DIR = path.join(config.dataDir, 'review');
const CAPTURE_TIMEOUT_MS = 4 * 60_000;
const now = () => new Date().toISOString();

const running = new Map(); // round_id → proces

function projectByToken(token) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(String(token || ''))) return null;
  return db.prepare('SELECT * FROM projects WHERE share_token = ? AND share_on = 1').get(token) || null;
}

/** Włącza link dla klienta (token tworzony raz i potem stały) albo go wyłącza. */
function setSharing(projectId, on) {
  const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!p) throw new Error('Nie znaleziono projektu.');
  const token = p.share_token || crypto.randomBytes(18).toString('base64url');
  db.prepare('UPDATE projects SET share_token = ?, share_on = ?, updated_at = ? WHERE id = ?').run(token, on ? 1 : 0, now(), p.id);
  return { token, on: Boolean(on), url: `${config.publicUrl}/projekt/${token}` };
}

/** Nowy token — stary link przestaje działać. */
function resetToken(projectId) {
  const token = crypto.randomBytes(18).toString('base64url');
  db.prepare('UPDATE projects SET share_token = ?, updated_at = ? WHERE id = ?').run(token, now(), projectId);
  return token;
}

function normalizeUrl(u) {
  const s = String(u || '').trim();
  if (!s || (/^[a-z][a-z0-9+.-]*:/i.test(s) && !/^https?:\/\//i.test(s))) return null;
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const url = new URL(withProto);
    if (!/^https?:$/.test(url.protocol)) return null;
    // Bez adresów wewnętrznych: zrzuty robi serwer, więc nie może zaglądać do własnej sieci.
    const localOk = process.env.REVIEW_ALLOW_LOCAL === '1' && config.env !== 'production'; // tylko do testów lokalnych
    if (!localOk && /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[?::1\]?)/i.test(url.hostname) || (!localOk && /^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname))) return null;
    return url.href;
  } catch { return null; }
}

/** Startuje nową rundę zrzutów. Zwraca od razu; panel odpytuje stan rundy. */
function startRound(projectId, rawUrl) {
  const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!p) throw new Error('Nie znaleziono projektu.');
  const url = normalizeUrl(rawUrl || p.url);
  if (!url) throw new Error('Podaj poprawny adres strony (np. https://twoja-strona.pl).');
  const busy = db.prepare("SELECT id FROM review_rounds WHERE project_id = ? AND status = 'robie'").get(p.id);
  if (busy && running.has(busy.id)) throw new Error('Zrzuty dla tego projektu właśnie się robią.');
  if (busy) db.prepare("UPDATE review_rounds SET status='blad', error='przerwane (restart serwera)' WHERE id = ?").run(busy.id);
  if (running.size >= 2) throw new Error('Robię już zrzuty innych projektów — spróbuj za minutę.');

  const no = (db.prepare('SELECT MAX(no) n FROM review_rounds WHERE project_id = ?').get(p.id).n || 0) + 1;
  const r = db.prepare('INSERT INTO review_rounds (project_id, created_at, no, url, status) VALUES (?, ?, ?, ?, ?)')
    .run(p.id, now(), no, url, 'robie');
  const roundId = Number(r.lastInsertRowid);
  if (!p.url) db.prepare('UPDATE projects SET url = ? WHERE id = ?').run(url, p.id);

  const dir = path.join(SHOTS_DIR, String(p.id), String(roundId));
  fs.mkdirSync(dir, { recursive: true });
  const child = fork(path.join(__dirname, '..', 'captureWorker.js'), [String(roundId), url, dir], {
    stdio: 'inherit', execArgv: ['--max-old-space-size=256'],
  });
  running.set(roundId, child);
  const fail = (msg) => db.prepare("UPDATE review_rounds SET status='blad', error=? WHERE id=? AND status='robie'").run(String(msg).slice(0, 400), roundId);
  const timer = setTimeout(() => { fail('zrzuty trwały za długo (limit 4 min)'); child.kill('SIGKILL'); }, CAPTURE_TIMEOUT_MS);
  child.on('message', (m) => {
    if (m?.type === 'done') saveShots(roundId, m.shots);
    else if (m?.type === 'error') fail(m.error);
  });
  child.on('exit', (code) => {
    clearTimeout(timer);
    running.delete(roundId);
    if (code) fail(`proces zrzutów zakończył się błędem (${code})`);
  });
  return { id: roundId, no, url, status: 'robie' };
}

function saveShots(roundId, shots) {
  const ins = db.prepare('INSERT INTO review_shots (round_id, device, idx, label, file, width, height) VALUES (?, ?, ?, ?, ?, ?, ?)');
  db.transaction(() => {
    for (const s of shots) ins.run(roundId, s.device, s.idx, s.label || null, s.file, s.width, s.height);
    db.prepare("UPDATE review_rounds SET status = ? , error = ? WHERE id = ?")
      .run(shots.length ? 'gotowe' : 'blad', shots.length ? null : 'nie znalazłem sekcji na stronie', roundId);
  })();
}

function shotFile(shot) {
  const round = db.prepare('SELECT * FROM review_rounds WHERE id = ?').get(shot.round_id);
  const file = path.join(SHOTS_DIR, String(round.project_id), String(round.id), path.basename(shot.file));
  return file.startsWith(SHOTS_DIR) && fs.existsSync(file) ? file : null;
}

const parseDrawing = (d) => { try { return d ? JSON.parse(d) : null; } catch { return null; } };

/** Wszystko o stronie klienta dla jednego projektu (panel i strona klienta). */
function reviewData(projectId) {
  const rounds = db.prepare('SELECT * FROM review_rounds WHERE project_id = ? ORDER BY no DESC').all(projectId);
  const ids = rounds.map((r) => r.id);
  const q = (sql) => (ids.length ? db.prepare(sql.replace('@IDS', ids.map(() => '?').join(','))).all(...ids) : []);
  const shots = q('SELECT * FROM review_shots WHERE round_id IN (@IDS) ORDER BY device, idx');
  const feedback = q('SELECT * FROM review_feedback WHERE round_id IN (@IDS) ORDER BY created_at, id')
    .map((f) => ({ ...f, drawing: parseDrawing(f.drawing) }));
  return rounds.map((r) => ({
    ...r,
    shots: shots.filter((s) => s.round_id === r.id).map(({ file, ...s }) => s),
    feedback: feedback.filter((f) => f.round_id === r.id),
  }));
}

function newFeedbackCount(projectId) {
  return db.prepare(`SELECT COUNT(*) n FROM review_feedback f JOIN review_rounds r ON r.id = f.round_id
    WHERE r.project_id = ? AND f.status = 'nowa'`).get(projectId).n;
}

/** Sprawdza i skraca rysunek klienta: tylko kreski w granicach zrzutu, z limitem punktów. */
function cleanDrawing(raw, shot) {
  if (!Array.isArray(raw) || !raw.length) return null;
  const TOOLS = ['pen', 'rect', 'arrow'];
  let points = 0;
  const out = [];
  for (const st of raw.slice(0, 80)) {
    if (!st || !TOOLS.includes(st.tool) || !Array.isArray(st.pts)) continue;
    const pts = [];
    for (const p of st.pts.slice(0, 600)) {
      const x = Math.round(Number(p?.[0])); const y = Math.round(Number(p?.[1]));
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      pts.push([Math.max(0, Math.min(shot.width, x)), Math.max(0, Math.min(shot.height, y))]);
    }
    if (pts.length < (st.tool === 'pen' ? 1 : 2)) continue;
    points += pts.length;
    if (points > 8000) break;
    out.push({ tool: st.tool, pts });
  }
  return out.length ? JSON.stringify(out) : null;
}

/**
 * Poprawki od klienta. items: [{ shot_id, text, drawing }], general: tekst ogólny.
 * Zapisuje tylko do najnowszej gotowej rundy projektu.
 */
function submitFeedback(project, body) {
  const round = db.prepare("SELECT * FROM review_rounds WHERE project_id = ? AND status = 'gotowe' ORDER BY no DESC LIMIT 1").get(project.id);
  if (!round) throw new Error('Ten projekt nie ma jeszcze zrzutów do skomentowania.');
  const shots = new Map(db.prepare('SELECT * FROM review_shots WHERE round_id = ?').all(round.id).map((s) => [s.id, s]));
  const submission = crypto.randomBytes(8).toString('hex');
  const ins = db.prepare('INSERT INTO review_feedback (round_id, shot_id, submission, created_at, text, drawing) VALUES (?, ?, ?, ?, ?, ?)');
  let count = 0;
  const sections = new Set();
  db.transaction(() => {
    for (const it of (Array.isArray(body.items) ? body.items : []).slice(0, 60)) {
      const shot = shots.get(Number(it?.shot_id));
      if (!shot) continue;
      const text = String(it.text || '').trim().slice(0, 4000) || null;
      const drawing = cleanDrawing(it.drawing, shot);
      if (!text && !drawing) continue;
      ins.run(round.id, shot.id, submission, now(), text, drawing);
      count += 1;
      sections.add(shot.label || `sekcja ${shot.idx + 1}`);
    }
    const general = String(body.general || '').trim().slice(0, 6000);
    if (general) { ins.run(round.id, null, submission, now(), general, null); count += 1; }
  })();
  if (!count) throw new Error('Dodaj komentarz albo zaznacz coś na zrzucie, zanim wyślesz.');
  return { count, sections: [...sections], round };
}

function setFeedbackStatus(projectId, feedbackId, status) {
  const ok = ['nowa', 'poprawione'].includes(status) ? status : 'poprawione';
  db.prepare(`UPDATE review_feedback SET status = ? WHERE id = ? AND round_id IN
    (SELECT id FROM review_rounds WHERE project_id = ?)`).run(ok, feedbackId, projectId);
}

function deleteRound(projectId, roundId) {
  const r = db.prepare('SELECT * FROM review_rounds WHERE id = ? AND project_id = ?').get(roundId, projectId);
  if (!r) return;
  db.prepare('DELETE FROM review_rounds WHERE id = ?').run(r.id);
  fs.rmSync(path.join(SHOTS_DIR, String(projectId), String(r.id)), { recursive: true, force: true });
}

module.exports = {
  projectByToken, setSharing, resetToken, startRound, reviewData, shotFile, submitFeedback,
  setFeedbackStatus, newFeedbackCount, deleteRound, normalizeUrl, cleanDrawing, SHOTS_DIR,
};
