'use strict';
const express = require('express');
const { db, getSetting, stanDysku } = require('../db');
const analytics = require('../services/analytics');
const cal = require('../services/calendarSvc');
const google = require('../services/google');
const gmail = require('../services/gmail');
const outreach = require('../services/outreach');
const ai = require('../services/ai');

const router = express.Router();

/**
 * Stan formularza kontaktowego widoczny wprost na pulpicie.
 * Zapytanie zapisuje się nawet wtedy, gdy powiadomienie na maila nie wyszło,
 * więc „brak maila" i „brak zapytania" to dwie różne awarie — i pulpit musi
 * je rozróżniać, zamiast milczeć i kazać zgadywać.
 */
function stanFormularza() {
  const ostatni = db.prepare(
    "SELECT id, name, created_at FROM leads WHERE source = 'form' ORDER BY datetime(created_at) DESC LIMIT 1"
  ).get() || null;
  const od = (dni) => db.prepare(
    "SELECT COUNT(*) AS n FROM leads WHERE source = 'form' AND created_at >= ?"
  ).get(new Date(Date.now() - dni * 86400000).toISOString()).n;
  let blad = null;
  try { blad = JSON.parse(getSetting('powiadomienie_blad', '') || 'null'); } catch { /* stary zapis */ }
  return { ostatni, w7dni: od(7), w30dni: od(30), blad };
}

/** Jeden strzał na wejściu do panelu — wszystko, co widać na pulpicie. */
router.get('/', async (_req, res) => {
  const days = 30;
  const out = {
    traffic: analytics.summary(days),
    timeseries: analytics.timeseries(days),
    live: analytics.live(30),
    top: analytics.breakdown(days),
    leads: {
      byStatus: db.prepare('SELECT status, COUNT(*) AS n FROM leads GROUP BY status').all(),
      hot: db.prepare(
        "SELECT id, company, domain, email, score, status FROM leads WHERE status IN ('new','contacted','replied') ORDER BY score DESC LIMIT 8"
      ).all(),
      newThisWeek: db.prepare('SELECT COUNT(*) AS n FROM leads WHERE created_at >= ?')
        .get(new Date(Date.now() - 7 * 86400000).toISOString()).n,
    },
    projects: {
      active: db.prepare("SELECT COUNT(*) AS n FROM projects WHERE status NOT IN ('live','wstrzymany')").get().n,
      list: db.prepare(
        "SELECT id, name, client, status, deadline FROM projects WHERE status NOT IN ('live','wstrzymany') ORDER BY COALESCE(deadline,'9999') LIMIT 6"
      ).all(),
      overdue: db.prepare(
        "SELECT COUNT(*) AS n FROM projects WHERE deadline < ? AND status NOT IN ('live','wstrzymany')"
      ).get(new Date().toISOString().slice(0, 10)).n,
    },
    outreach: { quota: outreach.quota(), inWindow: outreach.inSendingWindow() },
    integrations: { google: google.status(), ai: ai.enabled() },
    formularz: stanFormularza(),
    serwer: stanDysku(),
  };

  try {
    const upcoming = await cal.agenda(new Date().toISOString(), new Date(Date.now() + 14 * 86400000).toISOString());
    out.meetings = { events: upcoming.events.slice(0, 6), googleError: upcoming.googleError };
  } catch (err) {
    out.meetings = { events: [], googleError: err.message };
  }

  try {
    out.mail = await gmail.unreadCount();
  } catch (err) {
    out.mail = { error: err.code === 'GOOGLE_NOT_CONNECTED' ? 'not_connected' : err.message };
  }

  res.json(out);
});

module.exports = router;
