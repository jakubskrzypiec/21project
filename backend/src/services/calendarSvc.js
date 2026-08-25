'use strict';
const { calendar } = require('./google');
const { config } = require('../config');
const { db } = require('../db');

const CAL = () => config.google.calendarId;

function localMeetings(from, to) {
  return db
    .prepare(
      `SELECT m.*, l.name AS lead_name, l.company AS lead_company, p.name AS project_name
         FROM meetings m
         LEFT JOIN leads l ON l.id = m.lead_id
         LEFT JOIN projects p ON p.id = m.project_id
        WHERE m.starts_at < ? AND m.ends_at > ?
        ORDER BY m.starts_at`
    )
    .all(to, from);
}

/** Spotkania z bazy + wydarzenia z Google Calendar, scalone po google_event_id. */
async function agenda(from, to) {
  const local = localMeetings(from, to);
  let googleEvents = [];
  let googleError = null;
  try {
    const { data } = await calendar().events.list({
      calendarId: CAL(),
      timeMin: new Date(from).toISOString(),
      timeMax: new Date(to).toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    });
    googleEvents = (data.items || []).map((e) => ({
      google_event_id: e.id,
      title: e.summary || '(bez tytułu)',
      starts_at: e.start?.dateTime || e.start?.date,
      ends_at: e.end?.dateTime || e.end?.date,
      location: e.location || null,
      notes: e.description || null,
      attendee_email: (e.attendees || []).map((a) => a.email).join(', ') || null,
      allDay: Boolean(e.start?.date),
      source: 'google',
      htmlLink: e.htmlLink,
    }));
  } catch (err) {
    googleError = err.code === 'GOOGLE_NOT_CONNECTED' ? 'not_connected' : err.message;
  }

  const linked = new Set(local.map((m) => m.google_event_id).filter(Boolean));
  const merged = [
    ...local.map((m) => ({ ...m, source: 'panel' })),
    ...googleEvents.filter((e) => !linked.has(e.google_event_id)),
  ].sort((a, b) => String(a.starts_at).localeCompare(String(b.starts_at)));

  return { events: merged, googleError };
}

async function createMeeting(input) {
  const now = new Date().toISOString();
  let googleEventId = null;
  if (input.syncToGoogle !== false) {
    try {
      const { data } = await calendar().events.insert({
        calendarId: CAL(),
        sendUpdates: input.attendee_email ? 'all' : 'none',
        requestBody: {
          summary: input.title,
          description: input.notes || undefined,
          location: input.location || undefined,
          start: { dateTime: new Date(input.starts_at).toISOString(), timeZone: config.outreach.timezone },
          end: { dateTime: new Date(input.ends_at).toISOString(), timeZone: config.outreach.timezone },
          attendees: input.attendee_email
            ? input.attendee_email.split(',').map((e) => ({ email: e.trim() })).filter((a) => a.email)
            : undefined,
        },
      });
      googleEventId = data.id;
    } catch (err) {
      if (err.code !== 'GOOGLE_NOT_CONNECTED') throw err;
    }
  }
  const res = db
    .prepare(
      `INSERT INTO meetings (created_at, title, starts_at, ends_at, location, notes, attendee_email,
                             lead_id, project_id, google_event_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned')`
    )
    .run(
      now, input.title,
      new Date(input.starts_at).toISOString(), new Date(input.ends_at).toISOString(),
      input.location || null, input.notes || null, input.attendee_email || null,
      input.lead_id || null, input.project_id || null, googleEventId
    );
  return db.prepare('SELECT * FROM meetings WHERE id = ?').get(res.lastInsertRowid);
}

async function updateMeeting(id, patch) {
  const m = db.prepare('SELECT * FROM meetings WHERE id = ?').get(id);
  if (!m) return null;
  const next = { ...m, ...patch };
  db.prepare(
    `UPDATE meetings SET title=?, starts_at=?, ends_at=?, location=?, notes=?, attendee_email=?,
                         lead_id=?, project_id=?, status=? WHERE id=?`
  ).run(
    next.title, new Date(next.starts_at).toISOString(), new Date(next.ends_at).toISOString(),
    next.location || null, next.notes || null, next.attendee_email || null,
    next.lead_id || null, next.project_id || null, next.status || 'planned', id
  );
  if (m.google_event_id) {
    try {
      await calendar().events.patch({
        calendarId: CAL(),
        eventId: m.google_event_id,
        requestBody: {
          summary: next.title,
          description: next.notes || undefined,
          location: next.location || undefined,
          start: { dateTime: new Date(next.starts_at).toISOString(), timeZone: config.outreach.timezone },
          end: { dateTime: new Date(next.ends_at).toISOString(), timeZone: config.outreach.timezone },
          status: next.status === 'cancelled' ? 'cancelled' : undefined,
        },
      });
    } catch (err) {
      if (err.code !== 'GOOGLE_NOT_CONNECTED') throw err;
    }
  }
  return db.prepare('SELECT * FROM meetings WHERE id = ?').get(id);
}

async function deleteMeeting(id) {
  const m = db.prepare('SELECT * FROM meetings WHERE id = ?').get(id);
  if (!m) return false;
  if (m.google_event_id) {
    try {
      await calendar().events.delete({ calendarId: CAL(), eventId: m.google_event_id });
    } catch (err) {
      if (err.code !== 'GOOGLE_NOT_CONNECTED' && err.code !== 404 && err.code !== 410) throw err;
    }
  }
  db.prepare('DELETE FROM meetings WHERE id = ?').run(id);
  return true;
}

/** Wolne okna w godzinach pracy — pomaga szybko zaproponować termin klientowi. */
async function freeSlots({ from, to, slotMinutes = 60, dayStart = 9, dayEnd = 17 }) {
  const { events } = await agenda(from, to);
  const busy = events
    .filter((e) => e.status !== 'cancelled')
    .map((e) => [new Date(e.starts_at).getTime(), new Date(e.ends_at).getTime()]);
  const slots = [];
  const start = new Date(from);
  const end = new Date(to);
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day === 0 || day === 6) continue;
    for (let h = dayStart; h + slotMinutes / 60 <= dayEnd; h += slotMinutes / 60) {
      const s = new Date(d); s.setHours(h, 0, 0, 0);
      const e = new Date(s.getTime() + slotMinutes * 60000);
      if (s < Date.now()) continue;
      const clash = busy.some(([bs, be]) => s.getTime() < be && e.getTime() > bs);
      if (!clash) slots.push({ starts_at: s.toISOString(), ends_at: e.toISOString() });
    }
  }
  return slots.slice(0, 40);
}

module.exports = { agenda, createMeeting, updateMeeting, deleteMeeting, freeSlots, localMeetings };
