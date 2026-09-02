'use strict';
const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { logAction } = require('../db');

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

/**
 * Flagi ciasteczka muszą być identyczne przy ustawianiu, odświeżaniu i kasowaniu —
 * przeglądarka traktuje ciasteczka różniące się flagami jak osobne wpisy i przy
 * niezgodności zostaje jej stary, nieważny egzemplarz.
 */
function cookieOpts(secure) {
  return { httpOnly: true, sameSite: 'lax', secure, path: '/' };
}

/**
 * O HTTPS decyduje faktyczne żądanie, nie sam PUBLIC_URL. Gdy PUBLIC_URL zostanie
 * na hostingu nieustawiony, ciasteczko bez flagi `secure` nadal dociera, ale
 * ustawione odwrotnie — `secure` przy połączeniu po HTTP — przepada bez śladu.
 */
function czySecure(req) {
  if (req && (req.secure || req.headers['x-forwarded-proto'] === 'https')) return true;
  return config.publicUrl.startsWith('https://');
}

function setSessionCookie(res, token, req) {
  res.cookie(config.jwt.cookieName, token, {
    ...cookieOpts(czySecure(req || res.req)),
    maxAge: config.jwt.ttlDays * 24 * 3600 * 1000,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(config.jwt.cookieName, cookieOpts(czySecure(res.req)));
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
  const zCiastka = req.cookies?.[config.jwt.cookieName];
  const token = zCiastka || bearer(req);
  if (!token) return deny(req, res, 'brak_ciastka');
  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch (err) {
    // Rozróżnienie jest istotne: „expired" to normalny koniec sesji, a „invalid
    // signature" znaczy, że klucz podpisujący jest inny niż przy logowaniu —
    // czyli baza z kluczem zniknęła między restartami.
    return deny(req, res, err.name === 'TokenExpiredError' ? 'wygasla' : 'zly_podpis');
  }
  if (payload.role !== 'admin' || payload.sub !== config.admin.email) return deny(req, res, 'nie_admin');
  req.admin = { email: payload.sub };

  // Sesja przesuwana: dopóki korzystasz z panelu, ważność biegnie od nowa.
  // Bez tego ciasteczko wygasało co do sekundy po SESSION_TTL_DAYS od logowania,
  // niezależnie od tego, czy panel był używany codziennie.
  const zostalo = payload.exp * 1000 - Date.now();
  if (zostalo < (config.jwt.ttlDays * 24 * 3600 * 1000) / 2) {
    const swiezy = signSession(payload.sub);
    if (zCiastka) setSessionCookie(res, swiezy, req);
    // Panel czyta ten nagłówek i podmienia token u siebie, więc oba tory
    // — ciasteczko i nagłówek Authorization — odnawiają się tak samo.
    res.set('X-Odnowiony-Token', swiezy);
  }
  return next();
}

function bearer(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

function deny(req, res, powod = 'brak_ciastka') {
  // Każde odrzucenie ląduje w dzienniku z powodem — inaczej „znowu mnie wylogowało"
  // nie da się odróżnić od zwykłego wejścia na panel bez zalogowania.
  try { logAction('sesja.odrzucona', clientIp(req), { powod, sciezka: req.originalUrl }); }
  catch { /* dziennik nie może blokować odpowiedzi */ }
  // Do przeglądarki wysyłamy ekran logowania, do wywołań API — czysty błąd 401.
  const isApi = req.originalUrl.startsWith('/api/');
  if (!isApi && req.accepts(['html', 'json']) === 'html') return res.redirect('/admin/login');
  return res.status(401).json({ error: 'Wymagane logowanie.', powod });
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
