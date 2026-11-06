'use strict';
const express = require('express');
const { db, logAction } = require('../db');
const core = require('../services/agents/core');
const handlowiec = require('../services/agents/handlowiec');
const { clientIp } = require('../middleware/auth');

const router = express.Router();
const wrap = (fn) => async (req, res) => {
  try { res.json(await fn(req, res)); } catch (err) { res.status(400).json({ error: err.message }); }
};

/** Lista agentów — na razie jeden, ale mapa i spotkania czytają stąd wszystkich. */
router.get('/', wrap(() => ({
  agents: [{ id: handlowiec.AGENT, name: 'Handlowiec', role: 'Cold outreach: szuka firm, pisze i wysyła maile, pilnuje odpowiedzi.', ...handlowiec.status() }],
})));

/** Lekki stan dla mapy: co robi, liczby z dziś i kilka ostatnich czynności. */
router.get('/handlowiec/live', wrap(() => {
  const s = handlowiec.settings();
  return {
    status: handlowiec.status(),
    today: handlowiec.today(),
    dailyLimit: s.dailyLimit,
    windowStart: s.windowStart,
    windowEnd: s.windowEnd,
    recent: core.recentLog(handlowiec.AGENT, { limit: 40 }).filter((r) => r.kind !== 'info').slice(0, 8),
  };
}));

router.get('/handlowiec', wrap(() => ({
  status: handlowiec.status(),
  settings: handlowiec.settings(),
  stats: handlowiec.stats(),
  playbook: handlowiec.activePlaybook(),
})));

router.get('/handlowiec/log', wrap((req) => ({ log: core.recentLog(handlowiec.AGENT, { limit: Math.min(Number(req.query.limit) || 100, 500), kind: req.query.kind || undefined }) })));

router.post('/handlowiec/start', wrap((req) => { handlowiec.start(); logAction('agent.start', clientIp(req), { agent: 'handlowiec' }); return { status: handlowiec.status() }; }));
router.post('/handlowiec/stop', wrap((req) => { handlowiec.stop(); logAction('agent.stop', clientIp(req), { agent: 'handlowiec' }); return { status: handlowiec.status() }; }));

/** Jeden przebieg na żądanie. Zatrzymany agent tylko sprawdza odpowiedzi — niczego nie wysyła. */
router.post('/handlowiec/run', wrap(() => handlowiec.tick({ force: true })));

const NUM = ['dailyLimit', 'hourlyLimit', 'windowStart', 'windowEnd', 'prospectFrom', 'followUpAfterDays', 'maxFollowUps', 'maxWords'];
router.patch('/handlowiec/settings', wrap((req) => {
  const b = req.body || {};
  const patch = {};
  for (const k of NUM) {
    if (b[k] === undefined) continue;
    const n = Number(b[k]);
    if (!Number.isFinite(n) || n < 0) throw new Error(`Niepoprawna wartość: ${k}`);
    patch[k] = n;
  }
  if (patch.dailyLimit > 100) throw new Error('Limit dzienny powyżej 100 maili to proszenie się o blokadę konta Gmail.');
  if (patch.windowStart !== undefined && patch.windowEnd !== undefined && patch.windowStart >= patch.windowEnd) throw new Error('Okno wysyłki: początek musi być przed końcem.');
  if (Array.isArray(b.workdays)) patch.workdays = b.workdays.map(Number).filter((d) => d >= 1 && d <= 7);
  for (const k of ['strategy', 'model', 'styleExample', 'positioning']) if (typeof b[k] === 'string') patch[k] = b[k];
  if (Array.isArray(b.forbidden)) patch.forbidden = b.forbidden.map(String).map((x) => x.trim()).filter(Boolean);
  if (['reply', 'link', 'none'].includes(b.unsubscribe)) patch.unsubscribe = b.unsubscribe;
  if (typeof b.autoLearn === 'boolean') patch.autoLearn = b.autoLearn;
  if (b.offers && typeof b.offers === 'object') {
    patch.offers = {};
    for (const [k, v] of Object.entries(b.offers)) {
      if (!['strona', 'panel', 'pakiet'].includes(k)) continue;
      patch.offers[k] = {};
      if (typeof v.on === 'boolean') patch.offers[k].on = v.on;
      if (v.daily !== undefined) patch.offers[k].daily = Math.min(100, Math.max(0, Math.round(Number(v.daily) || 0)));
      for (const f of ['name', 'desc', 'for']) if (typeof v[f] === 'string') patch.offers[k][f] = v[f];
    }
  }
  if (Array.isArray(b.portfolio)) {
    patch.portfolio = b.portfolio.slice(0, 10).map((p) => ({
      url: String(p.url || '').trim().replace(/^https?:\/\//i, '').replace(/^www\./i, ''),
      offers: (Array.isArray(p.offers) ? p.offers : ['strona', 'panel', 'pakiet']).filter((o) => ['strona', 'panel', 'pakiet'].includes(o)),
    })).filter((p) => /^[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?$/i.test(p.url));
  }
  if (b.hooks && typeof b.hooks === 'object') {
    patch.hooks = {};
    for (const [k, v] of Object.entries(b.hooks)) {
      if (!['projekt', 'audyt'].includes(k)) continue;
      patch.hooks[k] = {};
      if (typeof v.on === 'boolean') patch.hooks[k].on = v.on;
      if (typeof v.text === 'string' && v.text.trim()) patch.hooks[k].text = v.text.trim();
    }
  }
  if (b.sources && typeof b.sources === 'object') {
    patch.sources = {};
    for (const name of ['homebook', 'google']) {
      const v = b.sources[name];
      if (!v) continue;
      patch.sources[name] = {};
      if (typeof v.on === 'boolean') patch.sources[name].on = v.on;
      for (const f of ['categories', 'regions', 'queries', 'cities']) {
        if (Array.isArray(v[f])) patch.sources[name][f] = v[f].map(String).map((x) => x.trim()).filter(Boolean);
      }
    }
  }
  return { settings: handlowiec.saveSettings(patch) };
}));

/** Przywraca domyślne oferty / strategię / listę zakazanych zwrotów. */
router.post('/handlowiec/settings/reset', wrap((req) => {
  const which = (req.body?.fields || []).filter((f) => ['offers', 'strategy', 'forbidden', 'sources', 'portfolio', 'hooks', 'styleExample', 'positioning'].includes(f));
  const patch = Object.fromEntries(which.map((f) => [f, handlowiec.DEFAULTS[f]]));
  return { settings: handlowiec.saveSettings(patch) };
}));

router.post('/handlowiec/preview', wrap(async (req) => {
  if (!req.body?.url) throw new Error('Podaj adres strony.');
  return handlowiec.preview(String(req.body.url), req.body.offer);
}));

router.post('/handlowiec/import', wrap((req) => {
  const text = String(req.body?.text || '');
  if (!text.trim()) throw new Error('Wklej listę firm albo wybierz plik CSV.');
  if (text.length > 2_000_000) throw new Error('Plik jest za duży (maks. ok. 1000 firm naraz).');
  return handlowiec.importLeads(text);
}));

router.post('/handlowiec/test-send', wrap(async (req) => {
  const b = req.body || {};
  return handlowiec.sendTests({
    url: b.url ? String(b.url).trim() : null,
    company: b.company ? String(b.company).trim() : null,
    city: b.city ? String(b.city).trim() : null,
    industry: b.industry ? String(b.industry).trim() : null,
    note: b.note ? String(b.note).trim() : null,
  });
}));

router.get('/handlowiec/messages', wrap((req) => {
  const status = req.query.status;
  const rows = db.prepare(`SELECT o.id, o.created_at, o.status, o.to_email, o.subject, o.body, o.offer, o.kind, o.sent_at,
      o.replied_at, o.reply_category, o.bounced, o.error, o.gmail_thread_id, l.company, l.domain, l.city, l.industry
    FROM outreach o LEFT JOIN leads l ON l.id=o.lead_id
    WHERE o.agent='handlowiec' ${status ? 'AND o.status=@status' : ''}
    ORDER BY COALESCE(o.sent_at, o.created_at) DESC LIMIT @limit`).all({ status, limit: Math.min(Number(req.query.limit) || 60, 300) });
  return { messages: rows };
}));

router.delete('/handlowiec/messages/:id', wrap((req) => {
  db.prepare("UPDATE outreach SET status='skipped', error='usunięte z kolejki w panelu' WHERE id=? AND agent='handlowiec' AND status='agent_queued'").run(req.params.id);
  return { ok: true };
}));

router.get('/handlowiec/replies', wrap((req) => {
  const rows = db.prepare(`SELECT r.*, o.subject, o.offer, o.to_email, l.company, l.domain FROM agent_replies r
    LEFT JOIN outreach o ON o.id=r.outreach_id LEFT JOIN leads l ON l.id=r.lead_id
    ${req.query.all ? '' : "WHERE r.status='nowa'"}
    ORDER BY CASE r.category WHEN 'pilne' THEN 0 WHEN 'wazne' THEN 1 WHEN 'zwykle' THEN 2 ELSE 3 END, r.created_at DESC LIMIT 200`).all();
  return { replies: rows };
}));

router.patch('/handlowiec/replies/:id', wrap((req) => {
  const status = ['nowa', 'obsluzona'].includes(req.body?.status) ? req.body.status : 'obsluzona';
  db.prepare('UPDATE agent_replies SET status=? WHERE id=?').run(status, req.params.id);
  return { ok: true };
}));

router.get('/handlowiec/leads', wrap((req) => {
  const stage = req.query.stage;
  const rows = db.prepare(`SELECT id, created_at, updated_at, company, domain, email, city, industry, score, agent_stage, agent_note, status
    FROM leads WHERE source='agent' ${stage ? 'AND agent_stage=@stage' : ''} ORDER BY updated_at DESC LIMIT 200`).all({ stage });
  return { leads: rows };
}));

router.get('/handlowiec/playbooks', wrap(() => ({
  playbooks: db.prepare("SELECT * FROM agent_playbooks WHERE agent='handlowiec' ORDER BY id DESC LIMIT 30").all(),
})));
router.post('/handlowiec/playbooks', wrap((req) => {
  if (!String(req.body?.content || '').trim()) throw new Error('Wpisz treść strategii.');
  return { id: handlowiec.savePlaybook(req.body.content) };
}));
router.post('/handlowiec/playbooks/:id/activate', wrap((req) => { handlowiec.activatePlaybook(Number(req.params.id)); return { ok: true }; }));
router.post('/handlowiec/learn', wrap(() => handlowiec.learn({ force: true })));

module.exports = router;
