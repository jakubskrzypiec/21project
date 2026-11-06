'use strict';
/**
 * Publiczny kalendarz spotkań (21project.pl/spotkanie/).
 *
 * Wolne terminy liczymy z Twojego Kalendarza Google (freebusy — widzi wszystkie wydarzenia,
 * także te dodane poza panelem) i spotkań zapisanych w panelu. Rezerwacja tworzy wydarzenie
 * z linkiem Google Meet i wysyła klientowi zaproszenie z Google.
 */
const crypto = require('crypto');
const { db, getSetting, setSetting } = require('../db');
const { config } = require('../config');
const google = require('./google');

const DEFAULTS = {
  enabled: true,
  title: 'Rozmowa z 21 Project',
  workdays: [1, 2, 3, 4, 5],
  dayStart: 10,
  dayEnd: 16,
  slotMinutes: 30,
  bufferMinutes: 15,
  minNoticeHours: 12,
  horizonDays: 14,
};

const TZ = () => config.outreach.timezone;

function settings() {
  try { return { ...DEFAULTS, ...JSON.parse(getSetting('booking:settings') || '{}') }; } catch { return { ...DEFAULTS }; }
}

function saveSettings(patch) {
  const next = { ...settings(), ...patch };
  setSetting('booking:settings', JSON.stringify(next));
  return next;
}

/** Przesunięcie strefy (w minutach) dla danej chwili, np. +60 zimą w Warszawie. */
function tzOffsetMinutes(date, tz = TZ()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - date.getTime()) / 60000);
}

/** Godzina lokalna (np. 10:30 w Warszawie danego dnia) → chwila w UTC. Poprawnie przy zmianie czasu. */
function zonedToUtc(y, m, d, h, min, tz = TZ()) {
  const guess = new Date(Date.UTC(y, m - 1, d, h, min));
  const off = tzOffsetMinutes(guess, tz);
  const t = new Date(guess.getTime() - off * 60000);
  const off2 = tzOffsetMinutes(t, tz);
  return off2 === off ? t : new Date(guess.getTime() - off2 * 60000);
}

function localDate(date, tz = TZ()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(date).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, dow: { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[p.weekday] };
}

/** Zajęte okna: Google (freebusy) + spotkania z panelu. */
async function busyIntervals(from, to) {
  const busy = db.prepare("SELECT starts_at, ends_at FROM meetings WHERE status != 'cancelled' AND starts_at < ? AND ends_at > ?")
    .all(to.toISOString(), from.toISOString())
    .map((m) => [Date.parse(m.starts_at), Date.parse(m.ends_at)]);
  const { data } = await google.calendar().freebusy.query({
    requestBody: { timeMin: from.toISOString(), timeMax: to.toISOString(), timeZone: TZ(), items: [{ id: config.google.calendarId }] },
  });
  for (const cal of Object.values(data.calendars || {})) {
    for (const b of cal.busy || []) busy.push([Date.parse(b.start), Date.parse(b.end)]);
  }
  return busy;
}

/** Wszystkie kandydujące terminy (bez sprawdzania zajętości) — osobno, żeby dało się testować. */
function candidateSlots(s, now = new Date()) {
  const out = [];
  const earliest = now.getTime() + s.minNoticeHours * 3600000;
  for (let i = 0; i <= s.horizonDays; i += 1) {
    const day = localDate(new Date(now.getTime() + i * 86400000));
    if (!s.workdays.includes(day.dow)) continue;
    for (let min = s.dayStart * 60; min + s.slotMinutes <= s.dayEnd * 60; min += s.slotMinutes) {
      const start = zonedToUtc(day.y, day.m, day.d, Math.floor(min / 60), min % 60);
      if (start.getTime() < earliest) continue;
      out.push({ start, end: new Date(start.getTime() + s.slotMinutes * 60000) });
    }
  }
  // Ten sam dzień może wypaść dwa razy przy przejściu przez północ UTC — usuwamy powtórki.
  const seen = new Set();
  return out.filter((x) => (seen.has(+x.start) ? false : seen.add(+x.start)));
}

function isFree(slot, busy, bufferMinutes) {
  const b = bufferMinutes * 60000;
  return !busy.some(([bs, be]) => slot.start.getTime() < be + b && slot.end.getTime() > bs - b);
}

async function availableSlots(now = new Date()) {
  const s = settings();
  if (!s.enabled) return { enabled: false, slots: [] };
  if (!google.status().connected) throw new Error('Kalendarz jest chwilowo niedostępny. Proszę napisać na jakubskrzypiec.dev@gmail.com.');
  const cands = candidateSlots(s, now);
  if (!cands.length) return { enabled: true, slots: [] };
  const busy = await busyIntervals(cands[0].start, cands[cands.length - 1].end);
  return {
    enabled: true,
    slotMinutes: s.slotMinutes,
    timezone: TZ(),
    slots: cands.filter((c) => isFree(c, busy, s.bufferMinutes)).map((c) => ({ start: c.start.toISOString(), end: c.end.toISOString() })),
  };
}

const clean = (v, n) => String(v || '').replace(/[\r\n]+/g, ' ').trim().slice(0, n);

/** Rezerwacja: sprawdza termin jeszcze raz, tworzy wydarzenie z Meet i zapisuje spotkanie i leada. */
async function book(input, now = new Date()) {
  const s = settings();
  if (!s.enabled) throw new Error('Rezerwacja spotkań jest teraz wyłączona.');
  const name = clean(input.name, 120);
  const email = clean(input.email, 160).toLowerCase();
  const company = clean(input.company, 160);
  const phone = clean(input.phone, 40);
  const topic = String(input.topic || '').trim().slice(0, 1500);
  if (!name || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) throw new Error('Podaj imię i poprawny adres e-mail.');
  const start = new Date(input.start);
  if (Number.isNaN(+start)) throw new Error('Wybierz termin z listy.');
  const slot = candidateSlots(s, now).find((c) => +c.start === +start);
  if (!slot) throw new Error('Ten termin nie jest dostępny. Wybierz inny.');
  const busy = await busyIntervals(slot.start, slot.end);
  if (!isFree(slot, busy, s.bufferMinutes)) throw new Error('Ktoś właśnie zajął ten termin. Wybierz inny.');

  const description = [
    `Spotkanie umówione przez stronę 21project.pl/spotkanie/.`,
    `Imię: ${name}`, `E-mail: ${email}`, company && `Firma: ${company}`, phone && `Telefon: ${phone}`,
    topic && `\nTemat:\n${topic}`,
  ].filter(Boolean).join('\n');

  const { data: ev } = await google.calendar().events.insert({
    calendarId: config.google.calendarId,
    conferenceDataVersion: 1,
    sendUpdates: 'all',
    requestBody: {
      summary: `${s.title}${company ? `: ${company}` : `: ${name}`}`,
      description,
      start: { dateTime: slot.start.toISOString(), timeZone: TZ() },
      end: { dateTime: slot.end.toISOString(), timeZone: TZ() },
      attendees: [{ email, displayName: name }],
      conferenceData: { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } },
      reminders: { useDefault: true },
    },
  });
  const meet = ev.hangoutLink || (ev.conferenceData?.entryPoints || []).find((e) => e.entryPointType === 'video')?.uri || null;

  // Lead: istniejący po adresie albo nowy ze źródłem „spotkanie”.
  const ts = new Date().toISOString();
  let lead = db.prepare('SELECT * FROM leads WHERE email = ?').get(email);
  if (!lead) {
    const id = db.prepare(`INSERT INTO leads (created_at, updated_at, source, status, name, company, email, phone, notes)
      VALUES (?, ?, 'booking', 'meeting', ?, ?, ?, ?, ?)`).run(ts, ts, name, company || null, email, phone || null, topic || null).lastInsertRowid;
    lead = { id };
  } else {
    db.prepare("UPDATE leads SET status = CASE WHEN status IN ('won','lost') THEN status ELSE 'meeting' END, updated_at=? WHERE id=?").run(ts, lead.id);
  }
  const m = db.prepare(`INSERT INTO meetings (created_at, title, starts_at, ends_at, location, notes, attendee_email, lead_id, google_event_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned')`)
    .run(ts, ev.summary, slot.start.toISOString(), slot.end.toISOString(), meet, description, email, lead.id, ev.id).lastInsertRowid;

  try {
    require('./agents/core').log('handlowiec', 'alert',
      `Nowe spotkanie: ${name}${company ? ` (${company})` : ''}, ${slot.start.toLocaleString('pl-PL', { timeZone: TZ(), dateStyle: 'full', timeStyle: 'short' })}. Zaproszenie z linkiem Meet poszło do ${email}.`,
      { meetingId: m, leadId: lead.id });
  } catch { /* dziennik agenta jest dodatkiem */ }

  return { start: slot.start.toISOString(), end: slot.end.toISOString(), meet, title: ev.summary };
}

module.exports = { settings, saveSettings, availableSlots, book, candidateSlots, isFree, zonedToUtc, DEFAULTS };
