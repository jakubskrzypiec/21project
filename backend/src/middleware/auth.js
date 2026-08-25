'use strict';
const jwt = require('jsonwebtoken');
const { config } = require('../config');

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || '';
}

function signSession(email) {
  return jwt.sign({ sub: email, role: 'admin' }, config.jwt.secret, {
    expiresIn: `${config.jwt.ttlDays}d`,
  });
}

function setSessionCookie(res, token) {
  res.cookie(config.jwt.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.publicUrl.startsWith('https://'),
    maxAge: config.jwt.ttlDays * 24 * 3600 * 1000,
    path: '/',
  });
}

function clearSessionCookie(res) {
  res.clearCookie(config.jwt.cookieName, { path: '/' });
}

/** Opcjonalna zapora po IP — działa tylko, gdy ADMIN_IP_ALLOWLIST jest ustawione. */
function ipAllowlist(req, res, next) {
  const allow = config.admin.ipAllowlist;
  if (!allow.length) return next();
  const ip = clientIp(req).replace(/^::ffff:/, '');
  if (allow.includes(ip)) return next();
  return res.status(403).json({ error: 'Adres IP spoza listy dozwolonych.' });
}

/** Wymaga zalogowanego administratora. */
function requireAdmin(req, res, next) {
  const token = req.cookies?.[config.jwt.cookieName] || bearer(req);
  if (!token) return deny(req, res);
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    if (payload.role !== 'admin' || payload.sub !== config.admin.email) return deny(req, res);
    req.admin = { email: payload.sub };
    return next();
  } catch {
    return deny(req, res);
  }
}

function bearer(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

function deny(req, res) {
  // Do przeglądarki wysyłamy ekran logowania, do wywołań API — czysty błąd 401.
  const isApi = req.originalUrl.startsWith('/api/');
  if (!isApi && req.accepts(['html', 'json']) === 'html') return res.redirect('/admin/login');
  return res.status(401).json({ error: 'Wymagane logowanie.' });
}

/** Prosty licznik nieudanych logowań w pamięci procesu. */
const attempts = new Map();
function loginThrottle(req, res, next) {
  const ip = clientIp(req);
  const rec = attempts.get(ip);
  const now = Date.now();
  if (rec && rec.blockedUntil > now) {
    const secs = Math.ceil((rec.blockedUntil - now) / 1000);
    return res.status(429).json({ error: `Za dużo prób. Spróbuj ponownie za ${secs} s.` });
  }
  req.recordLoginFailure = () => {
    const cur = attempts.get(ip) || { count: 0, blockedUntil: 0 };
    cur.count += 1;
    if (cur.count >= 5) {
      cur.blockedUntil = now + Math.min(15 * 60_000, 30_000 * 2 ** (cur.count - 5));
      cur.count = 5;
    }
    attempts.set(ip, cur);
  };
  req.recordLoginSuccess = () => attempts.delete(ip);
  next();
}

module.exports = {
  clientIp,
  signSession,
  setSessionCookie,
  clearSessionCookie,
  requireAdmin,
  ipAllowlist,
  loginThrottle,
};
