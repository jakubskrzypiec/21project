'use strict';
const crypto = require('crypto');
const { db } = require('../db');
const { config } = require('../config');
const gmailSvc = require('./gmail');
const google = require('./google');

/* ------------------------------ szablony ------------------------------ */

/** Proste podstawienia: {{pole}} oraz warunkowe {{#pole}}…{{/pole}}. */
function render(template, vars) {
  return String(template)
    .replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, inner) => (vars[key] ? inner : ''))
    .replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] == null ? '' : String(vars[key])));
}

function leadVars(lead) {
  const audit = lead.audit ? JSON.parse(lead.audit) : {};
  const reasons = audit.reasons || [];
  return {
    name: lead.name || '',
    firstName: (lead.name || '').split(' ')[0] || '',
    company: lead.company || lead.domain || 'Państwa firmy',
    // W szablonach {{domain}} czyta się jak nazwa strony — gdy jej nie znamy,
    // podstawiamy cokolwiek sensownego, żeby zdanie się nie rozpadło.
    domain: lead.domain || lead.website || lead.company || 'Państwa stronę',
    website: lead.website || '',
    city: lead.city || '',
    observation: reasons[0] || 'kilka rzeczy do poprawy po stronie technicznej',
    pitch: reasons.slice(0, 2).map((r) => `• ${r}`).join('\n') || '',
    score: lead.score ?? '',
  };
}

/* ------------------------------ wypisanie ----------------------------- */

function unsubToken(lead) {
  if (lead.unsub_token) return lead.unsub_token;
  const token = crypto.randomBytes(16).toString('base64url');
  db.prepare('UPDATE leads SET unsub_token = ? WHERE id = ?').run(token, lead.id);
  return token;
}

function withFooter(body, lead) {
  const link = `${config.publicUrl}/u/${unsubToken(lead)}`;
  const sig = config.outreach.signature ? `\n\n${config.outreach.signature}` : '';
  return `${body}${sig}

—
Piszę w sprawie współpracy jako Jakub Skrzypiec, 21 project (21project.pl), Śląsk.
Nie chcesz więcej wiadomości ode mnie? Kliknij: ${link} — dopiszę adres do listy wykluczeń.`;
}

function isSuppressed(email, domain) {
  if (!email) return true;
  const row = db
    .prepare('SELECT value FROM suppression WHERE value = ? OR value = ?')
    .get(String(email).toLowerCase(), String(domain || '').toLowerCase());
  return Boolean(row);
}

function suppress(value, reason) {
  db.prepare('INSERT OR REPLACE INTO suppression (value, reason, created_at) VALUES (?, ?, ?)')
    .run(String(value).toLowerCase(), reason || null, new Date().toISOString());
}

/* ------------------------------ kolejka ------------------------------- */

function sentCount(sinceIso) {
  return db.prepare("SELECT COUNT(*) AS n FROM outreach WHERE status = 'sent' AND sent_at >= ?").get(sinceIso).n;
}

function quota() {
  const dayAgo = new Date(Date.now() - 86400000).toISOString();
  const hourAgo = new Date(Date.now() - 3600000).toISOString();
  const day = sentCount(dayAgo);
  const hour = sentCount(hourAgo);
  return {
    day, hour,
    dayLimit: config.outreach.dailyLimit,
    hourLimit: config.outreach.hourlyLimit,
    dayLeft: Math.max(0, config.outreach.dailyLimit - day),
    hourLeft: Math.max(0, config.outreach.hourlyLimit - hour),
  };
}

function inSendingWindow(now = new Date()) {
  const local = new Date(now.toLocaleString('en-US', { timeZone: config.outreach.timezone }));
  const day = local.getDay();
  if (config.outreach.workdaysOnly && (day === 0 || day === 6)) return false;
  const h = local.getHours();
  return h >= config.outreach.windowStartHour && h < config.outreach.windowEndHour;
}

/** Tworzy wiadomość dla leada — z szablonu albo z AI. Nie wysyła. */
async function prepare(leadId, { templateId, subject, body, useAi, instructions, scheduledAt } = {}) {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
  if (!lead) throw new Error('Nie ma takiego leada.');
  if (!lead.email) throw new Error('Lead nie ma adresu e-mail — uzupełnij go najpierw.');
  if (lead.unsubscribed) throw new Error('Ten lead wypisał się z wiadomości.');
  if (isSuppressed(lead.email, lead.domain)) throw new Error('Adres jest na liście wykluczeń.');

  let generatedBy = 'manual';
  let finalSubject = subject;
  let finalBody = body;

  if (useAi) {
    const ai = require('./ai');
    const draft = await ai.draftOutreach(lead, { instructions });
    finalSubject = draft.subject;
    finalBody = draft.body;
    generatedBy = 'ai';
  } else if (templateId) {
    const tpl = db.prepare('SELECT * FROM templates WHERE id = ?').get(templateId);
    if (!tpl) throw new Error('Nie ma takiego szablonu.');
    const vars = leadVars(lead);
    finalSubject = render(tpl.subject, vars);
    finalBody = render(tpl.body, vars);
    generatedBy = `template:${tpl.id}`;
  }
  if (!finalSubject || !finalBody) throw new Error('Brak tematu lub treści wiadomości.');

  const res = db
    .prepare(
      `INSERT INTO outreach (lead_id, created_at, status, to_email, subject, body, generated_by, scheduled_at)
       VALUES (?, ?, 'draft', ?, ?, ?, ?, ?)`
    )
    .run(lead.id, new Date().toISOString(), lead.email, finalSubject, finalBody, generatedBy, scheduledAt || null);

  return db.prepare('SELECT * FROM outreach WHERE id = ?').get(res.lastInsertRowid);
}

/** Faktyczna wysyłka jednej wiadomości (albo zapis do Kopii roboczych w trybie draft). */
async function send(outreachId, { force = false } = {}) {
  const msg = db.prepare('SELECT * FROM outreach WHERE id = ?').get(outreachId);
  if (!msg) throw new Error('Nie ma takiej wiadomości.');
  if (msg.status === 'sent') return msg;

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(msg.lead_id);
  if (lead?.unsubscribed || isSuppressed(msg.to_email, lead?.domain)) {
    db.prepare("UPDATE outreach SET status='skipped', error='adres na liście wykluczeń' WHERE id=?").run(msg.id);
    throw new Error('Adres jest na liście wykluczeń — nie wysyłam.');
  }

  const q = quota();
  if (!force && (q.dayLeft <= 0 || q.hourLeft <= 0)) {
    throw new Error(`Limit wysyłki wyczerpany (dziś ${q.day}/${q.dayLimit}, w tej godzinie ${q.hour}/${q.hourLimit}).`);
  }

  const body = withFooter(msg.body, lead || { id: msg.lead_id });

  try {
    if (config.outreach.mode === 'draft' && !force) {
      const draft = await gmailSvc.createDraft({ to: msg.to_email, subject: msg.subject, body });
      db.prepare("UPDATE outreach SET status='draft', gmail_id=?, error='zapisano w Kopiach roboczych Gmaila' WHERE id=?")
        .run(draft.id, msg.id);
      return db.prepare('SELECT * FROM outreach WHERE id = ?').get(msg.id);
    }
    const sent = await gmailSvc.sendMessage({ to: msg.to_email, subject: msg.subject, body });
    const now = new Date().toISOString();
    db.prepare("UPDATE outreach SET status='sent', sent_at=?, gmail_id=?, gmail_thread_id=?, error=NULL WHERE id=?")
      .run(now, sent.id, sent.threadId, msg.id);
    if (lead) {
      db.prepare("UPDATE leads SET status = CASE WHEN status='new' THEN 'contacted' ELSE status END, last_contacted_at=?, updated_at=? WHERE id=?")
        .run(now, now, lead.id);
    }
    return db.prepare('SELECT * FROM outreach WHERE id = ?').get(msg.id);
  } catch (err) {
    db.prepare("UPDATE outreach SET status='failed', error=? WHERE id=?").run(String(err.message).slice(0, 500), msg.id);
    throw err;
  }
}

/** Wywoływane przez harmonogram: wysyła to, co zaplanowane i dozwolone. */
async function processQueue() {
  if (config.outreach.mode !== 'auto') return { skipped: 'tryb ' + config.outreach.mode };
  if (!google.status().connected) return { skipped: 'brak połączenia z Google' };
  if (!inSendingWindow()) return { skipped: 'poza oknem wysyłki' };

  const q = quota();
  const limit = Math.min(q.dayLeft, q.hourLeft);
  if (limit <= 0) return { skipped: 'limit wyczerpany' };

  const due = db
    .prepare(
      `SELECT * FROM outreach WHERE status = 'queued'
         AND (scheduled_at IS NULL OR scheduled_at <= ?)
       ORDER BY COALESCE(scheduled_at, created_at) LIMIT ?`
    )
    .all(new Date().toISOString(), limit);

  const results = [];
  for (const msg of due) {
    try {
      await send(msg.id, { force: true });
      results.push({ id: msg.id, ok: true });
    } catch (err) {
      results.push({ id: msg.id, ok: false, error: err.message });
    }
    await new Promise((r) => setTimeout(r, 20000 + Math.random() * 40000)); // odstęp jak przy ręcznym pisaniu
  }
  return { sent: results.filter((r) => r.ok).length, results };
}

/** Sprawdza, czy ktoś odpisał na wysłane wiadomości i podnosi status leada. */
async function syncReplies() {
  if (!google.status().connected) return { skipped: 'brak połączenia z Google' };
  const sent = db
    .prepare("SELECT * FROM outreach WHERE status='sent' AND gmail_thread_id IS NOT NULL AND sent_at >= ?")
    .all(new Date(Date.now() - 45 * 86400000).toISOString());
  let replied = 0;
  for (const msg of sent) {
    try {
      const thread = await gmailSvc.getThread(msg.gmail_thread_id);
      const account = google.status().account || '';
      const gotReply = thread.messages.some((m) => !m.from.toLowerCase().includes(account.toLowerCase()));
      if (gotReply && msg.lead_id) {
        const now = new Date().toISOString();
        db.prepare("UPDATE leads SET status = CASE WHEN status IN ('new','contacted') THEN 'replied' ELSE status END, updated_at=? WHERE id=?")
          .run(now, msg.lead_id);
        replied += 1;
      }
    } catch { /* wątek mógł zostać usunięty — pomijamy */ }
  }
  return { checked: sent.length, replied };
}

module.exports = {
  render, leadVars, prepare, send, processQueue, syncReplies,
  quota, inSendingWindow, isSuppressed, suppress, unsubToken, withFooter,
};
