'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const { config } = require('../config');
const { logAction } = require('../db');
const {
  signSession, setSessionCookie, clearSessionCookie, requireAdmin, loginThrottle, clientIp,
} = require('../middleware/auth');

const router = express.Router();

router.post('/login', loginThrottle, async (req, res) => {
  const email = String(req.body?.email || '').toLowerCase().trim();
  const password = String(req.body?.password || '');
  const ok =
    email === config.admin.email &&
    config.admin.passwordHash &&
    (await bcrypt.compare(password, config.admin.passwordHash));

  if (!ok) {
    req.recordLoginFailure();
    logAction('login.failed', clientIp(req), { email });
    return res.status(401).json({ error: 'Nieprawidłowy e-mail lub hasło.' });
  }

  req.recordLoginSuccess();
  const token = signSession(email);
  setSessionCookie(res, token, req);
  logAction('login.ok', clientIp(req), { email });
  // Token wraca też w treści odpowiedzi. Panel chowa go u siebie i dokłada do
  // każdego żądania — dzięki temu zgubione ciasteczko (inna domena, ustawienia
  // przeglądarki, restart) nie kończy się wylogowaniem.
  res.json({ ok: true, email, token });
});

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAdmin, (req, res) => {
  res.json({ email: req.admin.email });
});

module.exports = router;
