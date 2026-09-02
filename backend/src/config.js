'use strict';
require('dotenv').config();
const path = require('path');

const bool = (v, def = false) => (v === undefined ? def : /^(1|true|yes|on)$/i.test(String(v)));
const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  publicUrl: (process.env.PUBLIC_URL || 'http://localhost:4000').replace(/\/$/, ''),
  siteUrl: (process.env.SITE_URL || 'https://21project.pl').replace(/\/$/, ''),
  dataDir: process.env.DATA_DIR || path.join(__dirname, '..', 'data'),

  // Kto może wysyłać zdarzenia analityczne (CORS dla /api/track).
  allowedOrigins: list(process.env.ALLOWED_ORIGINS) .length
    ? list(process.env.ALLOWED_ORIGINS)
    : ['https://21project.pl', 'https://www.21project.pl'],

  admin: {
    email: (process.env.ADMIN_EMAIL || '').toLowerCase().trim(),
    passwordHash: process.env.ADMIN_PASSWORD_HASH || '',
    // Opcjonalna dodatkowa zapora: tylko te adresy IP mogą dotknąć /admin i /api/admin.
    ipAllowlist: list(process.env.ADMIN_IP_ALLOWLIST),
  },

  jwt: {
    secret: process.env.JWT_SECRET || '',
    ttlDays: Number(process.env.SESSION_TTL_DAYS || 30),
    cookieName: 'p21_session',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    scopes: [
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  },

  ai: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
    baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
  },

  leads: {
    userAgent:
      process.env.CRAWLER_USER_AGENT ||
      '21projectBot/1.0 (+https://21project.pl/kontakt.html; kontakt@21project.pl)',
    timeoutMs: Number(process.env.CRAWLER_TIMEOUT_MS || 12000),
    maxBytes: Number(process.env.CRAWLER_MAX_BYTES || 1_500_000),
    respectRobots: bool(process.env.CRAWLER_RESPECT_ROBOTS, true),
    minDelayMs: Number(process.env.CRAWLER_DELAY_MS || 1500),
    googleCseKey: process.env.GOOGLE_CSE_KEY || '',
    googleCseCx: process.env.GOOGLE_CSE_CX || '',
  },

  outreach: {
    // draft   – wiadomości lądują wyłącznie w Kopiach roboczych Gmaila (domyślne, najbezpieczniejsze)
    // approve – kolejka czeka na Twoje kliknięcie „Wyślij”
    // auto    – kolejka wysyła sama w oknie godzinowym
    mode: (process.env.OUTREACH_MODE || 'draft').toLowerCase(),
    dailyLimit: Number(process.env.OUTREACH_DAILY_LIMIT || 20),
    hourlyLimit: Number(process.env.OUTREACH_HOURLY_LIMIT || 5),
    windowStartHour: Number(process.env.OUTREACH_WINDOW_START || 9),
    windowEndHour: Number(process.env.OUTREACH_WINDOW_END || 17),
    workdaysOnly: bool(process.env.OUTREACH_WORKDAYS_ONLY, true),
    fromName: process.env.OUTREACH_FROM_NAME || 'Jakub Skrzypiec — 21 project',
    signature: process.env.OUTREACH_SIGNATURE || '',
    timezone: process.env.TIMEZONE || 'Europe/Warsaw',
  },
};

/**
 * Hasło administratora można podać na dwa sposoby:
 *  - ADMIN_PASSWORD_HASH — gotowy hash z `npm run set-password` (zalecane),
 *  - ADMIN_PASSWORD      — zwykły tekst; hash powstaje przy starcie.
 * Druga droga jest dla wdrożeń, gdzie nie ma jak uruchomić skryptu lokalnie.
 * Samo hasło nigdy nie trafia do bazy ani do logów.
 */
function resolveAdminPassword() {
  if (config.admin.passwordHash) return;
  const plain = process.env.ADMIN_PASSWORD;
  if (!plain) return;
  if (plain.length < 10) throw new Error('ADMIN_PASSWORD musi mieć co najmniej 10 znaków.');
  config.admin.passwordHash = require('bcryptjs').hashSync(plain, 12);
  console.log('Hasło administratora wzięte z ADMIN_PASSWORD i zahaszowane przy starcie.');
}

function assertProductionSecrets() {
  resolveAdminPassword();
  const missing = [];
  if (!config.jwt.secret || config.jwt.secret.length < 32) missing.push('JWT_SECRET (min. 32 znaki)');
  if (!config.admin.email) missing.push('ADMIN_EMAIL');
  if (!config.admin.passwordHash) missing.push('ADMIN_PASSWORD lub ADMIN_PASSWORD_HASH');
  if (missing.length) {
    throw new Error('Brakuje konfiguracji w .env:\n  - ' + missing.join('\n  - '));
  }
}

module.exports = { config, assertProductionSecrets, bool, list };
