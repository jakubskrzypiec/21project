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
  setSessionCookie(res, signSession(email));
  logAction('login.ok', clientIp(req), { email });
  res.json({ ok: true, email });
});

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAdmin, (req, res) => {
  res.json({ email: req.admin.email });
});

module.exports = router;
