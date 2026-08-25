'use strict';
const crypto = require('crypto');
const { db } = require('../db');

/**
 * Identyfikator odwiedzającego bez ciasteczek: sól zmienia się co dobę,
 * więc hasha nie da się połączyć z konkretną osobą ani śledzić dłużej niż jeden dzień.
 * Dzięki temu panel nie wymaga banera zgód na cookies.
 */
let dailySalt = { day: '', salt: '' };
function visitorHash(ip, ua) {
  const day = new Date().toISOString().slice(0, 10);
  if (dailySalt.day !== day) dailySalt = { day, salt: crypto.randomBytes(32).toString('hex') };
  return crypto.createHash('sha256').update(`${dailySalt.salt}|${ip}|${ua}`).digest('hex').slice(0, 32);
}

function parseUa(ua = '') {
  const s = ua.toLowerCase();
  const isBot = /(bot|crawler|spider|preview|monitor|curl|wget|headless)/.test(s);
  const device = /(ipad|tablet)/.test(s) ? 'tablet' : /(mobi|android|iphone)/.test(s) ? 'mobile' : 'desktop';
  const browser =
    /edg\//.test(s) ? 'Edge' :
    /opr\/|opera/.test(s) ? 'Opera' :
    /chrome\//.test(s) && !/edg\//.test(s) ? 'Chrome' :
    /firefox\//.test(s) ? 'Firefox' :
    /safari\//.test(s) ? 'Safari' : 'Inna';
  const os =
    /windows/.test(s) ? 'Windows' :
    /android/.test(s) ? 'Android' :
    /(iphone|ipad|ios)/.test(s) ? 'iOS' :
    /mac os/.test(s) ? 'macOS' :
    /linux/.test(s) ? 'Linux' : 'Inny';
  return { device, browser, os, isBot };
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
}

function normalizePath(p) {
  if (!p) return '/';
  const clean = String(p).split('#')[0].split('?')[0];
  return clean.startsWith('/') ? clean.slice(0, 300) : '/' + clean.slice(0, 300);
}

function recordPageview(payload, ctx) {
  const now = new Date();
  const ua = ctx.ua || '';
  const { device, browser, os, isBot } = parseUa(ua);
  if (isBot) return { skipped: 'bot' };

  const referrer = payload.referrer || null;
  const rHost = hostOf(referrer);
  const selfHost = hostOf(ctx.origin || '') || '';

  db.prepare(
    `INSERT INTO pageviews
      (ts, day, visitor_hash, session_id, path, title, referrer, referrer_host,
       utm_source, utm_medium, utm_campaign, device, browser, os, screen_w, country, is_entry)
     VALUES (@ts, @day, @visitor_hash, @session_id, @path, @title, @referrer, @referrer_host,
       @utm_source, @utm_medium, @utm_campaign, @device, @browser, @os, @screen_w, @country, @is_entry)`
  ).run({
    ts: now.toISOString(),
    day: now.toISOString().slice(0, 10),
    visitor_hash: visitorHash(ctx.ip, ua),
    session_id: String(payload.sid || '').slice(0, 64) || 'nieznana',
    path: normalizePath(payload.path),
    title: (payload.title || '').slice(0, 200) || null,
    referrer: rHost && rHost !== selfHost ? String(referrer).slice(0, 500) : null,
    referrer_host: rHost && rHost !== selfHost ? rHost : null,
    utm_source: (payload.utm_source || '').slice(0, 80) || null,
    utm_medium: (payload.utm_medium || '').slice(0, 80) || null,
    utm_campaign: (payload.utm_campaign || '').slice(0, 120) || null,
    device, browser, os,
    screen_w: Number(payload.screen_w) || null,
    country: (ctx.country || '').slice(0, 2) || null,
    is_entry: payload.entry ? 1 : 0,
  });
  return { ok: true };
}

function recordEvent(payload, ctx) {
  const now = new Date();
  if (parseUa(ctx.ua).isBot) return { skipped: 'bot' };
  db.prepare(
    `INSERT INTO events (ts, day, session_id, visitor_hash, name, path, value, meta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    now.toISOString(),
    now.toISOString().slice(0, 10),
    String(payload.sid || '').slice(0, 64) || null,
    visitorHash(ctx.ip, ctx.ua || ''),
    String(payload.name || 'event').slice(0, 60),
    normalizePath(payload.path),
    payload.value === undefined ? null : Number(payload.value) || 0,
    payload.meta ? JSON.stringify(payload.meta).slice(0, 2000) : null
  );
  return { ok: true };
}

function recordDuration(payload, ctx) {
  if (!payload.sid || !payload.path) return { skipped: 'brak-danych' };
  db.prepare(
    `UPDATE pageviews SET duration_ms = MAX(duration_ms, ?), scroll_pct = MAX(scroll_pct, ?)
      WHERE id = (SELECT id FROM pageviews WHERE session_id = ? AND path = ? ORDER BY id DESC LIMIT 1)`
  ).run(
    Math.min(Number(payload.duration_ms) || 0, 3_600_000),
    Math.min(Math.max(Number(payload.scroll_pct) || 0, 0), 100),
    String(payload.sid),
    normalizePath(payload.path)
  );
  return { ok: true };
}

/* -------------------------- odczyt statystyk -------------------------- */

function range(days) {
  const to = new Date();
  const from = new Date(to.getTime() - (days - 1) * 86400000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function summary(days = 30) {
  const { from, to } = range(days);
  const prevFrom = new Date(new Date(from).getTime() - days * 86400000).toISOString().slice(0, 10);

  const totals = (a, b) =>
    db.prepare(
      `SELECT COUNT(*) AS views,
              COUNT(DISTINCT visitor_hash) AS visitors,
              COUNT(DISTINCT session_id) AS sessions,
              COALESCE(AVG(NULLIF(duration_ms,0)),0) AS avg_ms
         FROM pageviews WHERE day BETWEEN ? AND ?`
    ).get(a, b);

  const cur = totals(from, to);
  const prev = totals(prevFrom, from);

  const bounce = db.prepare(
    `SELECT COUNT(*) AS single FROM (
        SELECT session_id FROM pageviews WHERE day BETWEEN ? AND ?
        GROUP BY session_id HAVING COUNT(*) = 1)`
  ).get(from, to).single;

  const conversions = db.prepare(
    `SELECT COUNT(*) AS n FROM events WHERE day BETWEEN ? AND ?
       AND name IN ('form_submit','contact_click','phone_click','mail_click')`
  ).get(from, to).n;

  return {
    range: { from, to, days },
    views: cur.views,
    visitors: cur.visitors,
    sessions: cur.sessions,
    avgSeconds: Math.round(cur.avg_ms / 1000),
    bounceRate: cur.sessions ? Math.round((bounce / cur.sessions) * 100) : 0,
    conversions,
    conversionRate: cur.sessions ? Number(((conversions / cur.sessions) * 100).toFixed(1)) : 0,
    change: {
      views: pct(cur.views, prev.views),
      visitors: pct(cur.visitors, prev.visitors),
    },
  };
}

const pct = (now, before) => (before ? Math.round(((now - before) / before) * 100) : now ? 100 : 0);

function timeseries(days = 30) {
  const { from, to } = range(days);
  const rows = db.prepare(
    `SELECT day, COUNT(*) AS views, COUNT(DISTINCT visitor_hash) AS visitors,
            COUNT(DISTINCT session_id) AS sessions
       FROM pageviews WHERE day BETWEEN ? AND ? GROUP BY day ORDER BY day`
  ).all(from, to);
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(new Date(from).getTime() + i * 86400000).toISOString().slice(0, 10);
    out.push(byDay.get(d) || { day: d, views: 0, visitors: 0, sessions: 0 });
  }
  return out;
}

function breakdown(days = 30) {
  const { from, to } = range(days);
  const q = (sql, limit = 12) => db.prepare(sql).all(from, to, limit);
  return {
    pages: q(
      `SELECT path, COUNT(*) AS views, COUNT(DISTINCT session_id) AS sessions,
              ROUND(COALESCE(AVG(NULLIF(duration_ms,0)),0)/1000) AS avg_seconds
         FROM pageviews WHERE day BETWEEN ? AND ?
         GROUP BY path ORDER BY views DESC LIMIT ?`
    ),
    referrers: q(
      `SELECT COALESCE(referrer_host,'wejście bezpośrednie') AS source, COUNT(*) AS views
         FROM pageviews WHERE day BETWEEN ? AND ?
         GROUP BY source ORDER BY views DESC LIMIT ?`
    ),
    campaigns: q(
      `SELECT COALESCE(utm_campaign,'—') AS campaign, COALESCE(utm_source,'—') AS source, COUNT(*) AS views
         FROM pageviews WHERE day BETWEEN ? AND ? AND (utm_source IS NOT NULL OR utm_campaign IS NOT NULL)
         GROUP BY campaign, source ORDER BY views DESC LIMIT ?`
    ),
    devices: q(
      `SELECT device AS name, COUNT(*) AS views FROM pageviews WHERE day BETWEEN ? AND ?
         GROUP BY device ORDER BY views DESC LIMIT ?`, 5
    ),
    browsers: q(
      `SELECT browser AS name, COUNT(*) AS views FROM pageviews WHERE day BETWEEN ? AND ?
         GROUP BY browser ORDER BY views DESC LIMIT ?`, 6
    ),
    events: q(
      `SELECT name, COUNT(*) AS n FROM events WHERE day BETWEEN ? AND ?
         GROUP BY name ORDER BY n DESC LIMIT ?`
    ),
  };
}

function live(minutes = 30) {
  const since = new Date(Date.now() - minutes * 60000).toISOString();
  return {
    online: db.prepare('SELECT COUNT(DISTINCT session_id) AS n FROM pageviews WHERE ts >= ?').get(since).n,
    recent: db.prepare(
      `SELECT ts, path, referrer_host, device, country FROM pageviews WHERE ts >= ?
         ORDER BY ts DESC LIMIT 40`
    ).all(since),
  };
}

module.exports = { recordPageview, recordEvent, recordDuration, summary, timeseries, breakdown, live };
