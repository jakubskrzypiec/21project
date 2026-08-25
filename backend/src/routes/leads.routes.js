'use strict';
const express = require('express');
const { db, logAction } = require('../db');
const leadFinder = require('../services/leadFinder');
const outreach = require('../services/outreach');
const { clientIp } = require('../middleware/auth');

const router = express.Router();
const now = () => new Date().toISOString();

const STATUSES = ['new', 'contacted', 'replied', 'meeting', 'won', 'lost', 'rejected'];

router.get('/', (req, res) => {
  const { status, q, source, minScore, limit = 100, offset = 0 } = req.query;
  const where = [];
  const params = {};
  if (status && STATUSES.includes(status)) { where.push('status = @status'); params.status = status; }
  if (source) { where.push('source = @source'); params.source = source; }
  if (minScore) { where.push('score >= @minScore'); params.minScore = Number(minScore); }
  if (q) {
    where.push('(name LIKE @q OR company LIKE @q OR email LIKE @q OR domain LIKE @q OR city LIKE @q)');
    params.q = `%${q}%`;
  }
  const sql = `SELECT * FROM leads ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY score DESC, created_at DESC LIMIT @limit OFFSET @offset`;
  const rows = db.prepare(sql).all({ ...params, limit: Math.min(Number(limit), 500), offset: Number(offset) });
  const total = db
    .prepare(`SELECT COUNT(*) AS n FROM leads ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`)
    .get(params).n;
  res.json({ leads: rows.map(hydrate), total });
});

router.get('/stats', (_req, res) => {
  const byStatus = db.prepare('SELECT status, COUNT(*) AS n FROM leads GROUP BY status').all();
  const bySource = db.prepare('SELECT source, COUNT(*) AS n FROM leads GROUP BY source').all();
  const recent = db.prepare('SELECT COUNT(*) AS n FROM leads WHERE created_at >= ?')
    .get(new Date(Date.now() - 30 * 86400000).toISOString()).n;
  res.json({ byStatus, bySource, last30Days: recent });
});

router.get('/:id', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Nie znaleziono leada.' });
  const messages = db.prepare('SELECT * FROM outreach WHERE lead_id = ? ORDER BY created_at DESC').all(lead.id);
  const meetings = db.prepare('SELECT * FROM meetings WHERE lead_id = ? ORDER BY starts_at DESC').all(lead.id);
  res.json({ lead: hydrate(lead), messages, meetings });
});

router.post('/', (req, res) => {
  const b = req.body || {};
  if (!b.email && !b.phone && !b.website) {
    return res.status(400).json({ error: 'Podaj przynajmniej e-mail, telefon albo stronę.' });
  }
  res.status(201).json({ lead: hydrate(upsertLead({ ...b, source: b.source || 'manual' })) });
});

router.patch('/:id', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Nie znaleziono leada.' });
  const b = req.body || {};
  if (b.status && !STATUSES.includes(b.status)) return res.status(400).json({ error: 'Nieznany status.' });
  const fields = ['name', 'company', 'email', 'phone', 'website', 'city', 'industry', 'notes', 'tags', 'status', 'score'];
  const next = { ...lead };
  for (const f of fields) if (b[f] !== undefined) next[f] = b[f];
  db.prepare(
    `UPDATE leads SET name=@name, company=@company, email=@email, phone=@phone, website=@website,
       city=@city, industry=@industry, notes=@notes, tags=@tags, status=@status, score=@score, updated_at=@updated_at
     WHERE id=@id`
  ).run({ ...next, updated_at: now() });
  res.json({ lead: hydrate(db.prepare('SELECT * FROM leads WHERE id = ?').get(lead.id)) });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

/** Analiza pojedynczej strony bez zapisywania — podgląd przed dodaniem. */
router.post('/inspect', async (req, res) => {
  try {
    const result = await leadFinder.inspectSite(String(req.body?.url || '').trim());
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** Analiza listy adresów i zapis tych, które przekroczyły próg. */
router.post('/scan', async (req, res) => {
  const urls = (req.body?.urls || []).map((u) => String(u).trim()).filter(Boolean).slice(0, 50);
  const minScore = Number(req.body?.minScore ?? 25);
  const city = req.body?.city || null;
  const industry = req.body?.industry || null;
  if (!urls.length) return res.status(400).json({ error: 'Podaj listę adresów.' });

  const results = [];
  for (const url of urls) {
    try {
      const site = await leadFinder.inspectSite(url);
      const keep = site.score >= minScore;
      if (keep) {
        upsertLead({
          source: 'crawler',
          company: site.company,
          email: site.email,
          phone: site.phone,
          website: site.website,
          domain: site.domain,
          city, industry,
          score: site.score,
          audit: JSON.stringify({ ...site.audit, reasons: site.reasons, socials: site.socials, builtBy: site.builtBy }),
          notes: site.builtBy ? `Stronę robił: ${site.builtBy}` : null,
        });
      }
      results.push({ url, ok: true, saved: keep, score: site.score, domain: site.domain, email: site.email, reasons: site.reasons });
    } catch (err) {
      results.push({ url, ok: false, error: err.message });
    }
  }
  logAction('leads.scan', clientIp(req), { count: urls.length });
  res.json({ results, saved: results.filter((r) => r.saved).length });
});

/** Zbiera domeny z podanej strony-listingu (katalog firm, ranking, lista wystawców). */
router.post('/harvest', async (req, res) => {
  try {
    const domains = await leadFinder.harvestLinks(String(req.body?.url || '').trim(), {
      limit: Math.min(Number(req.body?.limit) || 40, 100),
    });
    res.json({ domains });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** Wyszukiwanie w Google Programmable Search (jeśli skonfigurowane). */
router.post('/search', async (req, res) => {
  try {
    const items = await leadFinder.searchWeb(String(req.body?.query || ''), { num: 10 });
    res.json({ items });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ------------------------------ pomocnicze ------------------------------ */

function hydrate(lead) {
  if (!lead) return lead;
  let audit = null;
  try { audit = lead.audit ? JSON.parse(lead.audit) : null; } catch { audit = null; }
  return { ...lead, audit, tags: lead.tags ? lead.tags.split(',').map((t) => t.trim()).filter(Boolean) : [] };
}

function upsertLead(input) {
  const domain =
    input.domain ||
    (input.website ? (() => { try { return new URL(input.website.startsWith('http') ? input.website : 'https://' + input.website).hostname.replace(/^www\./, ''); } catch { return null; } })() : null);

  const existing = domain
    ? db.prepare('SELECT * FROM leads WHERE domain = ?').get(domain)
    : input.email
      ? db.prepare('SELECT * FROM leads WHERE email = ?').get(String(input.email).toLowerCase())
      : null;

  const tags = Array.isArray(input.tags) ? input.tags.join(',') : input.tags || null;

  if (existing) {
    db.prepare(
      `UPDATE leads SET
         name = COALESCE(@name, name), company = COALESCE(@company, company),
         email = COALESCE(@email, email), phone = COALESCE(@phone, phone),
         website = COALESCE(@website, website), city = COALESCE(@city, city),
         industry = COALESCE(@industry, industry), message = COALESCE(@message, message),
         notes = COALESCE(@notes, notes), tags = COALESCE(@tags, tags),
         score = COALESCE(@score, score), audit = COALESCE(@audit, audit), updated_at = @updated_at
       WHERE id = @id`
    ).run({
      id: existing.id,
      name: input.name || null, company: input.company || null,
      email: input.email ? String(input.email).toLowerCase() : null,
      phone: input.phone || null, website: input.website || null, city: input.city || null,
      industry: input.industry || null, message: input.message || null, notes: input.notes || null,
      tags, score: input.score ?? null, audit: input.audit || null, updated_at: now(),
    });
    return db.prepare('SELECT * FROM leads WHERE id = ?').get(existing.id);
  }

  const res = db.prepare(
    `INSERT INTO leads (created_at, updated_at, source, status, name, company, email, phone, website,
                        domain, city, industry, message, notes, tags, score, audit)
     VALUES (@created_at, @updated_at, @source, @status, @name, @company, @email, @phone, @website,
             @domain, @city, @industry, @message, @notes, @tags, @score, @audit)`
  ).run({
    created_at: now(), updated_at: now(),
    source: input.source || 'manual', status: input.status || 'new',
    name: input.name || null, company: input.company || null,
    email: input.email ? String(input.email).toLowerCase() : null,
    phone: input.phone || null, website: input.website || null, domain,
    city: input.city || null, industry: input.industry || null,
    message: input.message || null, notes: input.notes || null, tags,
    score: input.score ?? 0, audit: input.audit || null,
  });
  return db.prepare('SELECT * FROM leads WHERE id = ?').get(res.lastInsertRowid);
}

module.exports = router;
module.exports.upsertLead = upsertLead;
module.exports.hydrate = hydrate;
