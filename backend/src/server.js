'use strict';
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const cron = require('node-cron');

const { config, assertProductionSecrets } = require('./config');
const { init, logAction, ensureJwtSecret } = require('./db');
const { requireAdmin, ipAllowlist, clientIp } = require('./middleware/auth');
const google = require('./services/google');
const outreach = require('./services/outreach');

init();
config.jwt.secret = ensureJwtSecret(config.jwt.secret);
try {
  assertProductionSecrets();
} catch (err) {
  // Brak ustawień to najczęstszy problem przy pierwszym wdrożeniu —
  // ma być widać, czego brakuje, a nie ślad po stosie wywołań.
  console.error(`\n${err.message}\n\nWzór ustawień znajdziesz w pliku .env.example.\n`);
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '256kb' }));
app.use(cookieParser());

/* Nagłówki bezpieczeństwa — panel nie ma być indeksowany ani osadzany w ramce. */
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Robots-Tag': 'noindex, nofollow',
  });
  next();
});

/* CORS wyłącznie dla publicznych końcówek wywoływanych ze strony. */
const PUBLIC_CORS = ['/api/track', '/api/contact', '/t.js'];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && PUBLIC_CORS.some((p) => req.path.startsWith(p)) && config.allowedOrigins.includes(origin)) {
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      // navigator.sendBeacon zawsze wysyła żądanie w trybie "include", więc bez tego
      // nagłówka przeglądarka odrzuca każdą odsłonę. Te końcówki i tak nie czytają
      // ciasteczka sesji — ono ma SameSite=lax i nie wychodzi poza panel.
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    });
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

/* ------------------------------- publiczne ------------------------------- */
app.get('/health', (_req, res) => res.json({ ok: true, uptime: Math.round(process.uptime()) }));
app.use('/', require('./routes/public.routes'));
app.use('/api', require('./routes/analytics.routes'));   // POST /api/track
app.use('/api/auth', require('./routes/auth.routes'));

/* --------------------------- OAuth Google (admin) ------------------------- */
const oauthStates = new Map();

app.get('/api/google/connect', ipAllowlist, requireAdmin, (req, res) => {
  if (!google.isConfigured()) {
    return res.status(409).json({ error: 'Uzupełnij GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI w .env.' });
  }
  const state = require('crypto').randomBytes(16).toString('hex');
  oauthStates.set(state, Date.now() + 10 * 60 * 1000);
  res.json({ url: google.authUrl(state) });
});

app.get('/api/google/callback', ipAllowlist, requireAdmin, async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.redirect('/admin#/ustawienia?google=blad');
  const exp = oauthStates.get(state);
  oauthStates.delete(state);
  if (!exp || exp < Date.now()) return res.status(400).send('Sesja autoryzacji wygasła — spróbuj jeszcze raz.');
  try {
    const { email } = await google.exchangeCode(String(code));
    logAction('google.connected', clientIp(req), { email });
    res.redirect('/admin#/ustawienia?google=ok');
  } catch (err) {
    res.status(400).send(`Nie udało się połączyć konta Google: ${err.message}`);
  }
});

/* ------------------------------- panel ---------------------------------- */
app.get('/admin/login', ipAllowlist, (_req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'login.html')));

app.use('/admin/assets', ipAllowlist, express.static(path.join(__dirname, '..', 'public', 'admin', 'assets')));

app.use('/api/admin', ipAllowlist, requireAdmin);
app.use('/api/admin/dashboard', require('./routes/dashboard.routes'));
app.use('/api/admin/leads', require('./routes/leads.routes'));
app.use('/api/admin/projects', require('./routes/projects.routes'));
app.use('/api/admin/mail', require('./routes/mail.routes'));
app.use('/api/admin/calendar', require('./routes/calendar.routes'));
app.use('/api/admin/outreach', require('./routes/outreach.routes'));

app.use('/admin', ipAllowlist, requireAdmin, express.static(path.join(__dirname, '..', 'public', 'admin')));
app.get('/admin{/*splat}', ipAllowlist, requireAdmin, (_req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'index.html')));

app.use((req, res) => res.status(404).json({ error: 'Nie ma takiego adresu.', path: req.path }));

app.use((err, _req, res, _next) => {
  console.error('[błąd]', err);
  res.status(500).json({ error: config.env === 'production' ? 'Błąd serwera.' : err.message });
});

/* ----------------------------- harmonogram ------------------------------ */
function schedule() {
  // Kolejka wysyłki — co 15 minut, ale sama sprawdza tryb, okno godzinowe i limity.
  cron.schedule('*/15 * * * *', async () => {
    try {
      const r = await outreach.processQueue();
      if (r.sent) console.log(`[kolejka] wysłano ${r.sent} wiadomości`);
    } catch (err) { console.error('[kolejka]', err.message); }
  }, { timezone: config.outreach.timezone });

  // Odpowiedzi od leadów — dwa razy dziennie.
  cron.schedule('0 8,16 * * *', async () => {
    try {
      const r = await outreach.syncReplies();
      if (r.replied) console.log(`[odpowiedzi] ${r.replied} leadów odpisało`);
    } catch (err) { console.error('[odpowiedzi]', err.message); }
  }, { timezone: config.outreach.timezone });
}

if (require.main === module) {
  schedule();
  app.listen(config.port, () => {
    console.log(`21project panel → ${config.publicUrl} (port ${config.port}, tryb ${config.env})`);
    console.log(`   panel:  ${config.publicUrl}/admin`);
    console.log(`   licznik: ${config.publicUrl}/t.js`);
    if (!google.status().connected) console.log('   uwaga: konto Google nie jest połączone (Ustawienia → Połącz Google)');
  });
}

module.exports = app;
