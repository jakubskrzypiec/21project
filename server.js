require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const { createDb } = require('./lib/db');
const { signSession, verifySession } = require('./lib/auth');
const { inspectDomain } = require('./lib/prospect');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'jakubskrzypiec.dev@gmail.com';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
const SESSION_SECRET = process.env.SESSION_SECRET || 'CHANGE-ME-IN-ENV-AT-LEAST-32-CHARS';
const db = createDb(process.env.DATABASE_PATH || './data/21project.db');

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  }
}));
app.use(cookieParser());
app.use(express.json({ limit: '300kb' }));
app.use(express.urlencoded({ extended: false, limit: '300kb' }));

const publicLimiter = rateLimit({ windowMs: 60_000, limit: 100, standardHeaders: 'draft-7', legacyHeaders: false });
const formLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 12, standardHeaders: 'draft-7', legacyHeaders: false });
const loginLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });
app.use('/api/', publicLimiter);

function text(value, max = 5000) {
  return String(value ?? '').trim().slice(0, max);
}
function emailOk(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function getSource(referrer, utmSource) {
  if (utmSource) return utmSource;
  if (!referrer) return 'direct';
  try { return new URL(referrer).hostname.replace(/^www\./, ''); } catch { return 'referral'; }
}
function deviceFromUa(ua = '') {
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  if (/mobile|iphone|android/i.test(ua)) return 'mobile';
  return 'desktop';
}
function adminAuth(req, res, next) {
  const session = verifySession(req.cookies.admin_session, SESSION_SECRET);
  if (!session || session.sub !== ADMIN_EMAIL) return res.status(401).json({ error: 'Brak autoryzacji.' });
  req.admin = session;
  next();
}

app.post('/api/track', (req, res) => {
  const sessionId = text(req.body.sessionId, 120);
  const eventType = text(req.body.eventType || 'pageview', 50);
  const pagePath = text(req.body.path || '/', 400);
  const referrer = text(req.body.referrer, 1000);
  const utmSource = text(req.body.utmSource, 200);
  const utmMedium = text(req.body.utmMedium, 200);
  const utmCampaign = text(req.body.utmCampaign, 200);
  if (!sessionId || !['pageview', 'form_submit', 'cta_click'].includes(eventType)) return res.status(400).json({ error: 'Nieprawidłowe zdarzenie.' });
  db.prepare(`INSERT INTO analytics_events
    (session_id,event_type,path,referrer,source,utm_source,utm_medium,utm_campaign,device_type)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(
      sessionId, eventType, pagePath, referrer, getSource(referrer, utmSource), utmSource, utmMedium, utmCampaign, deviceFromUa(req.get('user-agent'))
    );
  res.status(204).end();
});

app.post('/api/leads', formLimiter, async (req, res) => {
  const honeypot = text(req.body.website, 100);
  if (honeypot) return res.status(200).json({ ok: true });
  const name = text(req.body.name, 120);
  const company = text(req.body.company, 180);
  const email = text(req.body.email, 200).toLowerCase();
  const phone = text(req.body.phone, 80);
  const service = text(req.body.service, 120);
  const budget = text(req.body.budget, 120);
  const message = text(req.body.message, 6000);
  const consent = req.body.consent === true || req.body.consent === 'true' || req.body.consent === 'on';
  const sessionId = text(req.body.sessionId, 120);
  const referrer = text(req.body.referrer, 1000);
  const pagePath = text(req.body.pagePath, 400);
  const utmSource = text(req.body.utmSource, 200);
  const utmMedium = text(req.body.utmMedium, 200);
  const utmCampaign = text(req.body.utmCampaign, 200);

  if (!name || !emailOk(email) || !message || !consent) {
    return res.status(400).json({ error: 'Uzupełnij imię, poprawny e-mail, opis projektu i zgodę.' });
  }
  const result = db.prepare(`INSERT INTO leads
    (name,company,email,phone,service,budget,message,consent,status,source,referrer,utm_source,utm_medium,utm_campaign,page_path)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      name, company, email, phone, service, budget, message, 1, 'nowy', getSource(referrer, utmSource), referrer, utmSource, utmMedium, utmCampaign, pagePath
    );
  if (sessionId) {
    db.prepare(`INSERT INTO analytics_events
      (session_id,event_type,path,referrer,source,utm_source,utm_medium,utm_campaign,device_type)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(
        sessionId, 'form_submit', pagePath, referrer, getSource(referrer, utmSource), utmSource, utmMedium, utmCampaign, deviceFromUa(req.get('user-agent'))
      );
  }

  // Opcjonalne powiadomienie. Brak klucza nie blokuje formularza.
  if (process.env.RESEND_API_KEY && process.env.NOTIFY_EMAIL && process.env.FROM_EMAIL) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.FROM_EMAIL,
          to: [process.env.NOTIFY_EMAIL],
          subject: `Nowy lead 21project: ${company || name}`,
          text: `Imię: ${name}\nFirma: ${company}\nE-mail: ${email}\nTelefon: ${phone}\nUsługa: ${service}\nBudżet: ${budget}\n\n${message}`
        })
      });
    } catch (error) {
      console.warn('Powiadomienie e-mail nie zostało wysłane:', error.message);
    }
  }
  res.status(201).json({ ok: true, id: result.lastInsertRowid });
});

app.post('/api/admin/login', loginLimiter, async (req, res) => {
  const email = text(req.body.email, 200).toLowerCase();
  const password = text(req.body.password, 500);
  if (!ADMIN_PASSWORD_HASH) return res.status(503).json({ error: 'Najpierw ustaw ADMIN_PASSWORD_HASH w pliku .env.' });
  const valid = email === ADMIN_EMAIL.toLowerCase() && await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  if (!valid) return res.status(401).json({ error: 'Nieprawidłowy login lub hasło.' });
  const token = signSession(ADMIN_EMAIL, SESSION_SECRET, 12);
  res.cookie('admin_session', token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: 12 * 3600_000, path: '/' });
  res.json({ ok: true });
});
app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('admin_session', { path: '/' });
  res.json({ ok: true });
});
app.get('/api/admin/me', adminAuth, (req, res) => res.json({ email: ADMIN_EMAIL }));

app.get('/api/admin/stats', adminAuth, (req, res) => {
  const periodStats = (days) => db.prepare(`
    SELECT COUNT(DISTINCT CASE WHEN event_type='pageview' THEN session_id END) visitors,
           SUM(CASE WHEN event_type='pageview' THEN 1 ELSE 0 END) pageviews
    FROM analytics_events WHERE created_at >= datetime('now', ?)
  `).get(`-${days} days`);
  const today = db.prepare(`SELECT COUNT(DISTINCT CASE WHEN event_type='pageview' THEN session_id END) visitors,
    SUM(CASE WHEN event_type='pageview' THEN 1 ELSE 0 END) pageviews FROM analytics_events WHERE date(created_at)=date('now')`).get();
  const d7 = periodStats(7);
  const d30 = periodStats(30);
  const series = db.prepare(`SELECT date(created_at) day, COUNT(DISTINCT session_id) visitors,
    SUM(CASE WHEN event_type='pageview' THEN 1 ELSE 0 END) pageviews
    FROM analytics_events WHERE created_at >= datetime('now','-29 days') GROUP BY date(created_at) ORDER BY day`).all();
  const topPages = db.prepare(`SELECT path, COUNT(*) pageviews, COUNT(DISTINCT session_id) visitors FROM analytics_events
    WHERE event_type='pageview' AND created_at >= datetime('now','-30 days') GROUP BY path ORDER BY pageviews DESC LIMIT 10`).all();
  const sources = db.prepare(`SELECT COALESCE(NULLIF(source,''),'direct') source, COUNT(DISTINCT session_id) visitors FROM analytics_events
    WHERE event_type='pageview' AND created_at >= datetime('now','-30 days') GROUP BY source ORDER BY visitors DESC LIMIT 10`).all();
  const devices = db.prepare(`SELECT device_type device, COUNT(DISTINCT session_id) visitors FROM analytics_events
    WHERE event_type='pageview' AND created_at >= datetime('now','-30 days') GROUP BY device_type ORDER BY visitors DESC`).all();
  const leadCount = db.prepare(`SELECT COUNT(*) count FROM leads WHERE created_at >= datetime('now','-30 days')`).get().count;
  const visitors30 = Number(d30.visitors || 0);
  const conversion = visitors30 ? Number(((leadCount / visitors30) * 100).toFixed(1)) : 0;
  res.json({ today, d7, d30, series, topPages, sources, devices, leadCount, conversion });
});

app.get('/api/admin/leads', adminAuth, (req, res) => {
  const status = text(req.query.status, 40);
  const q = text(req.query.q, 120);
  let sql = `SELECT l.*, (SELECT COUNT(*) FROM lead_notes n WHERE n.lead_id=l.id) note_count FROM leads l WHERE 1=1`;
  const args = [];
  if (status && status !== 'all') { sql += ' AND status=?'; args.push(status); }
  if (q) { sql += ' AND (name LIKE ? OR company LIKE ? OR email LIKE ? OR phone LIKE ?)'; const s=`%${q}%`; args.push(s,s,s,s); }
  sql += ' ORDER BY created_at DESC LIMIT 500';
  res.json(db.prepare(sql).all(...args));
});
app.get('/api/admin/leads/:id/notes', adminAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM lead_notes WHERE lead_id=? ORDER BY created_at DESC').all(Number(req.params.id)));
});
app.post('/api/admin/leads/:id/notes', adminAuth, (req, res) => {
  const note = text(req.body.note, 5000);
  if (!note) return res.status(400).json({ error: 'Notatka jest pusta.' });
  db.prepare('INSERT INTO lead_notes (lead_id,note) VALUES (?,?)').run(Number(req.params.id), note);
  res.json({ ok: true });
});
app.patch('/api/admin/leads/:id', adminAuth, (req, res) => {
  const allowed = ['nowy','kontakt','oferta','follow-up','wygrany','przegrany'];
  const status = text(req.body.status, 40);
  const followUp = text(req.body.followUpAt, 40) || null;
  if (status && !allowed.includes(status)) return res.status(400).json({ error: 'Nieprawidłowy status.' });
  db.prepare(`UPDATE leads SET status=COALESCE(?,status), follow_up_at=?, updated_at=datetime('now') WHERE id=?`).run(status || null, followUp, Number(req.params.id));
  res.json({ ok: true });
});
app.get('/api/admin/leads.csv', adminAuth, (req, res) => {
  const rows = db.prepare('SELECT id,name,company,email,phone,service,budget,status,source,follow_up_at,created_at,message FROM leads ORDER BY created_at DESC').all();
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const headers = Object.keys(rows[0] || {id:'',name:'',company:'',email:'',phone:'',service:'',budget:'',status:'',source:'',follow_up_at:'',created_at:'',message:''});
  const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="21project-leady.csv"');
  res.send(csv);
});

app.get('/api/admin/prospects', adminAuth, (req, res) => {
  const oldOnly = req.query.old === '1';
  const noSeo = req.query.noSeo === '1';
  const q = text(req.query.q, 120);
  let sql = 'SELECT * FROM prospects WHERE 1=1';
  const args = [];
  if (oldOnly) sql += ' AND footer_year IS NOT NULL AND footer_year <= 2020';
  if (noSeo) sql += ' AND (has_description=0 OR has_schema=0 OR has_title=0)';
  if (q) { sql += ' AND (company LIKE ? OR domain LIKE ? OR city LIKE ? OR email LIKE ?)'; const s=`%${q}%`; args.push(s,s,s,s); }
  sql += ' ORDER BY score DESC, updated_at DESC LIMIT 1000';
  res.json(db.prepare(sql).all(...args));
});
app.post('/api/admin/prospects', adminAuth, (req, res) => {
  let domain = text(req.body.domain, 500).toLowerCase().replace(/\/$/, '');
  if (!domain) return res.status(400).json({ error: 'Podaj domenę.' });
  const stmt = db.prepare(`INSERT INTO prospects (company,domain,city,industry,email,phone,source,status,notes)
    VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(domain) DO UPDATE SET
    company=COALESCE(excluded.company,company), city=COALESCE(excluded.city,city), industry=COALESCE(excluded.industry,industry),
    email=COALESCE(excluded.email,email), phone=COALESCE(excluded.phone,phone), source=COALESCE(excluded.source,source), updated_at=datetime('now')`);
  const info = stmt.run(text(req.body.company,200) || null, domain, text(req.body.city,120)||null, text(req.body.industry,160)||null, text(req.body.email,200)||null, text(req.body.phone,100)||null, text(req.body.source,200)||'ręcznie', 'nowy', text(req.body.notes,3000)||null);
  res.json({ ok: true, id: info.lastInsertRowid });
});
app.post('/api/admin/prospects/import', adminAuth, (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows.slice(0, 1000) : [];
  const stmt = db.prepare(`INSERT INTO prospects (company,domain,city,industry,email,phone,source,status,notes)
    VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(domain) DO UPDATE SET
    company=COALESCE(excluded.company,company), city=COALESCE(excluded.city,city), industry=COALESCE(excluded.industry,industry),
    email=COALESCE(excluded.email,email), phone=COALESCE(excluded.phone,phone), updated_at=datetime('now')`);
  let imported = 0;
  const tx = db.transaction(() => {
    for (const row of rows) {
      const domain = text(row.domain || row.www || row.url, 500).toLowerCase().replace(/\/$/, '');
      if (!domain) continue;
      stmt.run(text(row.company || row.firma,200)||null, domain, text(row.city || row.miasto,120)||null, text(row.industry || row.branza,160)||null, text(row.email,200)||null, text(row.phone || row.telefon,100)||null, text(row.source || row.zrodlo,200)||'CSV', 'nowy', text(row.notes || row.notatki,3000)||null);
      imported++;
    }
  });
  tx();
  res.json({ ok: true, imported });
});
app.patch('/api/admin/prospects/:id', adminAuth, (req, res) => {
  const status = text(req.body.status, 50) || null;
  const notes = req.body.notes !== undefined ? text(req.body.notes, 6000) : null;
  const follow = req.body.followUpAt !== undefined ? (text(req.body.followUpAt, 40) || null) : null;
  db.prepare(`UPDATE prospects SET status=COALESCE(?,status), notes=COALESCE(?,notes), follow_up_at=?, updated_at=datetime('now') WHERE id=?`).run(status, notes, follow, Number(req.params.id));
  res.json({ ok: true });
});
app.post('/api/admin/prospects/:id/check', adminAuth, async (req, res) => {
  const prospect = db.prepare('SELECT * FROM prospects WHERE id=?').get(Number(req.params.id));
  if (!prospect) return res.status(404).json({ error: 'Nie znaleziono firmy.' });
  try {
    const result = await inspectDomain(prospect.domain);
    db.prepare(`UPDATE prospects SET footer_year=?,score=?,last_checked_at=datetime('now'),has_https=?,has_viewport=?,has_title=?,has_description=?,has_schema=?,has_canonical=?,issues_json=?,updated_at=datetime('now') WHERE id=?`).run(
      result.footerYear, result.score, result.hasHttps?1:0, result.hasViewport?1:0, result.hasTitle?1:0, result.hasDescription?1:0, result.hasSchema?1:0, result.hasCanonical?1:0, JSON.stringify(result.issues), prospect.id
    );
    db.prepare(`INSERT INTO prospect_checks (prospect_id,footer_year,score,final_url,issues_json,result_json) VALUES (?,?,?,?,?,?)`).run(
      prospect.id, result.footerYear, result.score, result.finalUrl, JSON.stringify(result.issues), JSON.stringify(result)
    );
    res.json(result);
  } catch (error) {
    res.status(422).json({ error: error.name === 'AbortError' ? 'Timeout podczas analizy strony.' : error.message });
  }
});
app.post('/api/admin/prospects/:id/draft-email', adminAuth, (req, res) => {
  const p = db.prepare('SELECT * FROM prospects WHERE id=?').get(Number(req.params.id));
  if (!p) return res.status(404).json({ error: 'Nie znaleziono firmy.' });
  let issues = [];
  try { issues = JSON.parse(p.issues_json || '[]'); } catch {}
  const observation = issues.filter(i => !i.startsWith('Nie wykryto')).slice(0,2).join(' Dodatkowo: ');
  const intro = observation || 'zwróciłem uwagę, że obecna strona może mocniej prowadzić użytkownika do kontaktu i lepiej wykorzystać SEO';
  const draft = `Dzień dobry,\n\ntrafiłem na stronę ${p.company || p.domain} i ${intro.charAt(0).toLowerCase()+intro.slice(1)}.\n\nZajmuję się projektowaniem i przebudową stron dla firm. Mogę przygotować wstępny kierunek zmian bez zobowiązań, żeby pokazać, jak można odświeżyć stronę i poprawić jej widoczność w Google.\n\nJeśli temat jest aktualny, chętnie podeślę konkretną propozycję.\n\nPozdrawiam,\nJakub Skrzypiec\n21project\n601 863 788`;
  res.json({ subject: `Pomysł na odświeżenie strony ${p.company || ''}`.trim(), draft });
});

// Czytelne adresy bez .html
const prettyRoutes = {
  '/oferta': 'oferta.html', '/realizacje': 'realizacje.html', '/kontakt': 'kontakt.html', '/seo': 'seo.html',
  '/landing-page': 'landing-page.html', '/strony-internetowe': 'strony-internetowe.html', '/polityka-prywatnosci': 'polityka-prywatnosci.html',
  '/strony-internetowe-katowice': 'strony-internetowe-katowice.html', '/strony-internetowe-ruda-slaska': 'strony-internetowe-ruda-slaska.html',
  '/strony-internetowe-chorzow': 'strony-internetowe-chorzow.html', '/strony-internetowe-zory': 'strony-internetowe-zory.html',
  '/strony-internetowe-mikolow': 'strony-internetowe-mikolow.html', '/strony-internetowe-bytom': 'strony-internetowe-bytom.html',
  '/strony-internetowe-czestochowa': 'strony-internetowe-czestochowa.html',
  '/case-monika-serbista': 'case-monika-serbista.html', '/case-to-oni-projektuja': 'case-to-oni-projektuja.html',
  '/case-maciejewska-design': 'case-maciejewska-design.html', '/case-werka-bramy': 'case-werka-bramy.html', '/case-drg-auto': 'case-drg-auto.html'
};
for (const [route, file] of Object.entries(prettyRoutes)) app.get(route, (req,res) => res.sendFile(path.join(__dirname,'public',file)));
app.get('/admin', (req,res) => res.sendFile(path.join(__dirname,'public/admin/index.html')));
app.get('/admin/login', (req,res) => res.sendFile(path.join(__dirname,'public/admin/login.html')));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));

app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public/404.html')));

app.listen(PORT, () => {
  console.log(`21project działa na ${BASE_URL} (port ${PORT})`);
  if (!ADMIN_PASSWORD_HASH) console.warn('UWAGA: ADMIN_PASSWORD_HASH nie jest ustawiony — panel nie pozwoli się zalogować.');
});
