'use strict';
const express = require('express');
const analytics = require('../services/analytics');
const { clientIp } = require('../middleware/auth');

const router = express.Router();

/** Publiczny odbiornik zdarzeń ze strony. Nie wymaga logowania, ale sprawdza Origin. */
router.post('/track', (req, res) => {
  const ctx = {
    ip: clientIp(req),
    ua: req.headers['user-agent'] || '',
    origin: req.headers.origin || req.headers.referer || '',
    country: req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'] || '',
  };
  const body = req.body || {};
  try {
    const type = body.type || 'pageview';
    if (type === 'pageview') analytics.recordPageview(body, ctx);
    else if (type === 'duration') analytics.recordDuration(body, ctx);
    else analytics.recordEvent(body, ctx);
  } catch { /* analityka nigdy nie może wywrócić żądania */ }
  res.status(204).end();
});

/* --------------------------- odczyt dla panelu --------------------------- */

const days = (req) => Math.min(Math.max(Number(req.query.days) || 30, 1), 365);

router.get('/admin/analytics/summary', (req, res) => res.json(analytics.summary(days(req))));
router.get('/admin/analytics/timeseries', (req, res) => res.json(analytics.timeseries(days(req))));
router.get('/admin/analytics/breakdown', (req, res) => res.json(analytics.breakdown(days(req))));
router.get('/admin/analytics/live', (req, res) => res.json(analytics.live(Number(req.query.minutes) || 30)));

module.exports = router;
