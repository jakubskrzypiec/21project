'use strict';
/**
 * Handlowiec — agent cold outreachu.
 *
 * Co 5 minut serwer woła tick(). Agent sam decyduje, co jest do zrobienia:
 *  1. sprawdza odpowiedzi (co 30 min): klasyfikuje je i szykuje szkic odpowiedzi w Gmailu,
 *  2. w dni robocze rano szuka firm, robi audyt stron, odsiewa duplikaty z całego Gmaila
 *     i pisze maile (3 oferty po równo), aż ma plan na cały dzień,
 *  3. w oknie wysyłki wysyła po jednym mailu w losowych odstępach, w limicie dziennym,
 *  4. po N dniach bez odpowiedzi pisze jedno krótkie przypomnienie w tym samym wątku,
 *  5. po zamknięciu okna zapisuje raport dnia, a w poniedziałek rano uczy się na wynikach
 *     i zapisuje nową wersję strategii.
 * Działa, dopóki w panelu nie klikniesz „Zatrzymaj”. Stan trzyma w bazie, więc restart
 * serwera niczego nie przerywa.
 */
const { db } = require('../../db');
const { config } = require('../../config');
const core = require('./core');
const siteAudit = require('./siteAudit');
const sources = require('./sources');
const writer = require('./writer');
const outreach = require('../outreach');
const gmailSvc = require('../gmail');
const google = require('../google');
const ai = require('../ai');

const AGENT = 'handlowiec';
const POSITIVE = ['pilne', 'wazne'];

const DEFAULTS = {
  enabled: false,
  dailyLimit: 30,
  hourlyLimit: 8,
  workdays: [1, 2, 3, 4, 5],
  windowStart: 9,
  windowEnd: 16,
  prospectFrom: 6,
  followUpAfterDays: 6,
  maxFollowUps: 1,
  maxWords: 190,
  model: 'claude-sonnet-5-5',
  unsubscribe: 'none', // none | reply | link — domyślnie bez dopisku (odmowy i tak trafiają na listę wykluczeń)
  autoLearn: true,
  offers: writer.DEFAULT_OFFERS,
  portfolio: writer.DEFAULT_PORTFOLIO,
  hooks: writer.DEFAULT_HOOKS,
  strategy: writer.DEFAULT_STRATEGY,
  styleExample: writer.DEFAULT_STYLE_EXAMPLE,
  positioning: writer.DEFAULT_POSITIONING,
  forbidden: writer.DEFAULT_FORBIDDEN,
  sources: {
    order: ['homebook', 'google'],
    homebook: {
      on: true,
      categories: ['architekci-projektanci-wnetrz', 'architekci-i-projektanci-krajobrazu', 'architekci-budynkow',
        'firmy-remontowe-i-budowlane', 'producenci', 'sklepy', 'artysci-designerzy', 'fotografowie-wnetrz'],
      regions: ['slaskie', 'malopolskie', 'mazowieckie', 'dolnoslaskie', 'wielkopolskie', 'pomorskie', 'lodzkie',
        'zachodniopomorskie', 'lubelskie', 'kujawsko-pomorskie', 'podkarpackie', 'podlaskie', 'swietokrzyskie',
        'warminsko-mazurskie', 'opolskie', 'lubuskie'],
    },
    google: {
      on: true,
      queries: ['projektant wnętrz {city}', 'pracownia architektury {city}', 'stolarz meble na wymiar {city}',
        'firma remontowa {city}', 'projektowanie ogrodów {city}', 'kamieniarstwo {city}'],
      cities: ['Katowice', 'Kraków', 'Warszawa', 'Wrocław', 'Poznań', 'Gdańsk', 'Łódź', 'Gliwice', 'Rzeszów',
        'Lublin', 'Bielsko-Biała', 'Opole', 'Szczecin', 'Bydgoszcz', 'Toruń', 'Kielce', 'Białystok', 'Olsztyn'],
    },
  },
};

const settings = () => {
  const s = core.settings(AGENT, DEFAULTS);
  // Jednorazowo (wersja 2 ustawień): bez dopisku o rezygnacji i dłuższy limit słów na akapit „kim jestem”.
  if (!s.settingsVersion || s.settingsVersion < 2) {
    return core.saveSettings(AGENT, DEFAULTS, { settingsVersion: 2, unsubscribe: 'none', maxWords: Math.max(Number(s.maxWords) || 0, 190) });
  }
  return s;
};
const st = () => core.state(AGENT);
const log = (kind, msg, meta) => core.log(AGENT, kind, msg, meta);
const now = () => new Date();

/* ------------------------------ liczniki ------------------------------ */

function counts(at = now()) {
  const dayStart = core.dayStartIso(at);
  const hourAgo = new Date(at.getTime() - 3600000).toISOString();
  const q = (sql, ...p) => db.prepare(sql).get(...p).n;
  return {
    sentToday: q("SELECT COUNT(*) n FROM outreach WHERE agent=? AND status='sent' AND sent_at>=?", AGENT, dayStart),
    sentHour: q("SELECT COUNT(*) n FROM outreach WHERE agent=? AND status='sent' AND sent_at>=?", AGENT, hourAgo),
    queued: q("SELECT COUNT(*) n FROM outreach WHERE agent=? AND status='agent_queued'", AGENT),
    found: q("SELECT COUNT(*) n FROM leads WHERE agent_stage='found'"),
  };
}

function inWindow(s, at = now()) {
  const l = core.local(at);
  return s.workdays.includes(l.dow) && l.hourFloat >= s.windowStart && l.hourFloat < s.windowEnd;
}

/* ------------------------------ szukanie ------------------------------ */

function knownDomain(domain) {
  return Boolean(db.prepare('SELECT 1 FROM leads WHERE domain = ? LIMIT 1').get(domain));
}

function insertCandidate(c) {
  const domain = siteAudit.hostOf(c.website);
  if (!domain || knownDomain(domain)) return false;
  const ts = core.nowIso();
  db.prepare(`INSERT INTO leads (created_at, updated_at, source, status, company, website, domain, city, industry, notes, agent_stage)
    VALUES (?, ?, 'agent', 'new', ?, ?, ?, ?, ?, ?, 'found')`)
    .run(ts, ts, c.company, c.website, domain, c.city, c.industry, `źródło: ${c.source} ${c.ref || ''}`.trim());
  return true;
}

/** Jedna porcja nowych firm z kolejnego źródła. Źródła wyczerpane zaczynają od nowa po 60 dniach. */
async function findCandidates(s) {
  const state = st();
  const cursors = state.cursors || {};
  for (const name of s.sources.order) {
    const src = s.sources[name];
    if (!src?.on) continue;
    const cur = cursors[name] || {};
    if (cur.doneAt && Date.now() - Date.parse(cur.doneAt) < 60 * 86400000) continue;
    const fn = name === 'homebook' ? sources.homebookBatch : name === 'google' ? sources.cseBatch : null;
    if (!fn) continue;
    try {
      const r = await fn(src, cur.pos || {});
      if (r.disabled) continue;
      let added = 0;
      for (const c of r.candidates) if (insertCandidate(c)) added += 1;
      cursors[name] = { pos: r.cursor, doneAt: r.done ? core.nowIso() : null };
      core.saveState(AGENT, { cursors });
      log('info', `Szukanie (${name}${r.label ? `: ${r.label}` : ''}): ${r.candidates.length} firm, nowych ${added}.`);
      if (added || !r.done) return added;
    } catch (err) {
      log('error', `Źródło ${name}: ${err.message}`);
    }
  }
  if (!state.sourcesEmptyWarned || Date.now() - Date.parse(state.sourcesEmptyWarned) > 86400000) {
    log('warn', 'Wszystkie źródła firm są wyczerpane. Dodaj w ustawieniach nowe kategorie, regiony albo zapytania.');
    core.saveState(AGENT, { sourcesEmptyWarned: core.nowIso() });
  }
  return 0;
}

/* --------------------------- kwalifikacja leada --------------------------- */

function skipLead(lead, reason) {
  db.prepare("UPDATE leads SET agent_stage='skipped', agent_note=?, updated_at=? WHERE id=?").run(reason, core.nowIso(), lead.id);
  return { ok: false, reason };
}

/** Czy już kiedykolwiek była korespondencja z tą firmą — w całym Gmailu, z koszem i spamem. */
async function alreadyInGmail(domain, email) {
  const parts = [`"${domain}"`];
  if (email) parts.push(`"${email}"`);
  return gmailSvc.anyThread(parts.join(' OR '));
}

/** Ile pierwszych maili z każdej oferty powstało dziś (w kolejce i wysłanych). */
function offerCountsToday(at = now()) {
  const rows = db.prepare(`SELECT offer, COUNT(*) n FROM outreach WHERE agent=? AND kind='first'
    AND status IN ('agent_queued','sent') AND created_at>=? GROUP BY offer`).all(AGENT, core.dayStartIso(at));
  return Object.fromEntries(rows.map((r) => [r.offer, r.n]));
}

/**
 * Podział na oferty: każda ma swoją dzienną liczbę maili. Firma dostaje ofertę, która do niej
 * pasuje (słaba strona → strona albo pakiet, porządna → panel albo pakiet) i której dzisiejsza
 * pula jeszcze się nie skończyła. Gdy pasujące pule są pełne — zwraca null i firma czeka do jutra.
 */
function chooseOffer(audit, s, today = offerCountsToday()) {
  const fits = audit.quality === 'dobra' ? ['panel', 'pakiet'] : ['strona', 'pakiet'];
  const pool = fits
    .filter((k) => s.offers[k]?.on)
    .map((k) => ({ k, left: (Number(s.offers[k].daily) || 0) - (today[k] || 0), r: Math.random() }))
    .filter((o) => o.left > 0);
  if (!pool.length) return null;
  return pool.sort((a, b) => b.left - a.left || a.r - b.r)[0].k;
}

/** Czy zostało jeszcze miejsce w którejkolwiek puli ofert na dziś. */
function offersLeftToday(s, today = offerCountsToday()) {
  return Object.entries(s.offers).some(([k, o]) => o.on && (Number(o.daily) || 0) - (today[k] || 0) > 0);
}

/** Haczyki: po równo z ostatnich 14 dni, żeby porównanie było uczciwe. */
function chooseHook(s) {
  const since = new Date(Date.now() - 14 * 86400000).toISOString();
  const used = Object.fromEntries(db.prepare(`SELECT hook, COUNT(*) n FROM outreach WHERE agent=? AND kind='first' AND created_at>=? GROUP BY hook`)
    .all(AGENT, since).map((r) => [r.hook, r.n]));
  const on = Object.keys(s.hooks || {}).filter((k) => s.hooks[k]?.on);
  if (!on.length) return null;
  return on.map((k) => ({ k, n: used[k] || 0, r: Math.random() })).sort((a, b) => a.n - b.n || a.r - b.r)[0].k;
}

function activePlaybook() {
  return db.prepare('SELECT * FROM agent_playbooks WHERE agent=? AND active=1 ORDER BY id DESC LIMIT 1').get(AGENT) || null;
}

/** Pisze treść i pilnuje stylu. Gdy brzmi jak AI — jedna poprawka, a potem rezygnacja. */
async function compose(s, userPrompt, { kind = 'first' } = {}) {
  const playbook = activePlaybook();
  const system = writer.systemPrompt({ ...s, maxWords: kind === 'first' ? s.maxWords : 80 }, playbook?.content);
  let prompt = userPrompt;
  let last;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const out = await core.thinkJson(AGENT, {
      system, prompt, maxTokens: 8000, model: s.model || undefined,
      schema: {
        type: 'object',
        properties: {
          subject: { type: 'string', description: 'Temat maila (pusty przy przypomnieniu w wątku).' },
          body: { type: 'string', description: 'Treść maila, akapity oddzielone pustą linią.' },
          angle: { type: 'string', description: 'Jednym zdaniem: jaki problem i efekt wybrałeś.' },
        },
        required: ['subject', 'body'],
      },
    });
    const body = writer.tidy(out.body || '');
    const subject = writer.tidy(out.subject || '').replace(/\.$/, '');
    const problems = writer.styleCheck(body, kind === 'first' ? subject : '', { forbidden: s.forbidden, maxWords: kind === 'first' ? s.maxWords : 90 });
    last = { subject, body, angle: out.angle || null, problems, playbookId: playbook?.id || null };
    if (!problems.length && body && (subject || kind !== 'first')) return last;
    prompt = `${userPrompt}\n\nTwoja poprzednia wersja:\n---\n${body}\n---\nPopraw ją. Problemy: ${problems.join('; ') || 'brak tematu lub treści'}.`;
  }
  const err = new Error(`tekst nie przeszedł kontroli stylu: ${last.problems.join('; ')}`);
  err.draft = last;
  throw err;
}

/** Audyt + duplikaty + wybór oferty + mail do kolejki. */
const FREE_MAIL = /@(gmail\.com|googlemail\.com|wp\.pl|o2\.pl|onet\.pl|onet\.eu|op\.pl|interia\.(pl|eu)|poczta\.fm|vp\.pl|tlen\.pl|gazeta\.pl|outlook\.com|hotmail\.com|live\.com|yahoo\.com|icloud\.com|proton\.me|protonmail\.com|int\.pl|buziaczek\.pl)$/i;

/** „Audyt” firmy bez strony: jedyna pewna obserwacja to brak strony, reszta z notatki z researchu. */
function noSiteAudit(lead) {
  return {
    ok: true, host: null, noOwnSite: true, quality: 'brak', score: 10,
    reasons: ['firma nie ma własnej strony internetowej (nie znalazłem jej w sieci)'],
    note: lead.notes && !/^źródło:/.test(lead.notes) ? lead.notes : null, email: lead.email,
  };
}

async function qualify(lead, s) {
  db.prepare("UPDATE leads SET agent_stage='checking', updated_at=? WHERE id=?").run(core.nowIso(), lead.id);
  if (lead.source === 'import' && !lead.website) return qualifyNoSite(lead, s);
  const audit = await siteAudit.audit(lead.website || lead.domain);
  if (!audit.ok) {
    // Zaimportowana firma ma adres od Ciebie — gdy strona nie działa, traktujemy ją jak firmę bez strony.
    if (lead.source === 'import' && lead.email) return qualifyNoSite(lead, s, `strona ${lead.website} nie działa`);
    return skipLead(lead, audit.reason);
  }
  if (lead.source === 'import' && lead.email && !audit.email) audit.email = lead.email;
  if (audit.host !== lead.domain) {
    if (knownDomain(audit.host)) return skipLead(lead, `przekierowanie na znaną już domenę ${audit.host}`);
    db.prepare('UPDATE leads SET domain=? WHERE id=?').run(audit.host, lead.id);
    lead.domain = audit.host;
  }
  const email = audit.email;
  if (!email) return skipLead(lead, 'brak adresu e-mail na stronie');
  if (db.prepare('SELECT 1 FROM leads WHERE email=? AND id<>?').get(email, lead.id)) return skipLead(lead, 'ten adres e-mail jest już w bazie');
  if (outreach.isSuppressed(email, lead.domain) || outreach.isSuppressed(email, email.split('@')[1])) return skipLead(lead, 'adres na liście wykluczeń');
  if (await alreadyInGmail(lead.domain, email)) return skipLead(lead, 'już była korespondencja w Gmailu');
  return writeFirst(lead, s, audit, email);
}

/** Firma bez strony (z importu): duplikaty po adresie, a po domenie tylko gdy to nie darmowa poczta. */
async function qualifyNoSite(lead, s, why) {
  const email = String(lead.email || '').toLowerCase();
  if (!email) return skipLead(lead, 'brak adresu e-mail w imporcie');
  const domain = FREE_MAIL.test(email) ? null : email.split('@')[1];
  if (outreach.isSuppressed(email, domain || '')) return skipLead(lead, 'adres na liście wykluczeń');
  const seen = domain ? await alreadyInGmail(domain, email) : await gmailSvc.anyThread(`"${email}"`);
  if (seen) return skipLead(lead, 'już była korespondencja w Gmailu');
  const audit = noSiteAudit(lead);
  if (why) audit.reasons = [`firma podaje stronę, ale ${why} — klient trafia w pustkę`];
  return writeFirst(lead, s, audit, email);
}

async function writeFirst(lead, s, audit, email) {
  const { text, emails, ...auditStored } = audit;
  db.prepare('UPDATE leads SET email=?, score=?, audit=?, updated_at=? WHERE id=?')
    .run(email, audit.score, JSON.stringify({ ...auditStored, emails: emails || [email] }), core.nowIso(), lead.id);
  lead.email = email;

  const offerKey = chooseOffer(audit, s);
  if (!offerKey) {
    const reason = Object.values(s.offers).some((o) => o.on) ? 'pasujące oferty mają na dziś komplet — czeka do jutra' : 'wszystkie oferty są wyłączone';
    db.prepare("UPDATE leads SET agent_stage='parked', agent_note=?, updated_at=? WHERE id=?").run(reason, core.nowIso(), lead.id);
    return { ok: false, parked: true, reason };
  }
  db.prepare("UPDATE leads SET agent_stage='writing', updated_at=? WHERE id=?").run(core.nowIso(), lead.id);
  const hookKey = chooseHook(s);

  let draft;
  try {
    draft = await compose(s, writer.firstPrompt(lead, audit, s.offers[offerKey], s.hooks?.[hookKey]));
  } catch (err) {
    return skipLead(lead, err.message.slice(0, 300));
  }
  const body = writer.withPortfolio(draft.body, writer.portfolioBlock(s.portfolio, offerKey));
  db.prepare(`INSERT INTO outreach (lead_id, created_at, status, to_email, subject, body, generated_by, agent, offer, kind, playbook_id, hook)
    VALUES (?, ?, 'agent_queued', ?, ?, ?, 'agent', ?, ?, 'first', ?, ?)`)
    .run(lead.id, core.nowIso(), email, draft.subject, body, AGENT, offerKey, draft.playbookId, hookKey);
  db.prepare("UPDATE leads SET agent_stage='queued', agent_note=?, updated_at=? WHERE id=?")
    .run(`oferta: ${offerKey}; haczyk: ${hookKey || '—'}${draft.angle ? `; ${draft.angle}` : ''}`, core.nowIso(), lead.id);
  log('action', `Napisałem maila do ${lead.company || lead.domain} (${s.offers[offerKey].name}).`, { leadId: lead.id, offer: offerKey, hook: hookKey });
  return { ok: true, offer: offerKey, hook: hookKey };
}

/* ------------------------------ follow-upy ------------------------------ */

async function planFollowUps(s, limit) {
  if (limit <= 0 || s.maxFollowUps <= 0) return 0;
  const cutoff = new Date(Date.now() - s.followUpAfterDays * 86400000).toISOString();
  const due = db.prepare(`SELECT o.* FROM outreach o JOIN leads l ON l.id=o.lead_id
    WHERE o.agent=? AND o.kind='first' AND o.status='sent' AND o.sent_at<=? AND o.replied_at IS NULL AND COALESCE(o.bounced,0)=0
      AND l.unsubscribed=0 AND l.status='contacted'
      AND (SELECT COUNT(*) FROM outreach f WHERE f.parent_id=o.id) < ?
    ORDER BY o.sent_at LIMIT ?`).all(AGENT, cutoff, s.maxFollowUps, limit);
  let made = 0;
  for (const first of due) {
    const lead = db.prepare('SELECT * FROM leads WHERE id=?').get(first.lead_id);
    const offer = s.offers[first.offer] || Object.values(s.offers)[0];
    try {
      const d = await compose(s, writer.followUpPrompt(first, offer, lead), { kind: 'followup' });
      db.prepare(`INSERT INTO outreach (lead_id, created_at, status, to_email, subject, body, generated_by, agent, offer, kind, parent_id, playbook_id, gmail_thread_id)
        VALUES (?, ?, 'agent_queued', ?, ?, ?, 'agent', ?, ?, 'followup', ?, ?, ?)`)
        .run(lead.id, core.nowIso(), first.to_email, `Re: ${first.subject.replace(/^re:\s*/i, '')}`, d.body, AGENT, first.offer, first.id, d.playbookId, first.gmail_thread_id);
      made += 1;
    } catch (err) {
      // Nieudane przypomnienie oznaczamy, żeby nie próbować w kółko.
      db.prepare(`INSERT INTO outreach (lead_id, created_at, status, to_email, subject, body, generated_by, agent, offer, kind, parent_id, error)
        VALUES (?, ?, 'skipped', ?, ?, '', 'agent', ?, ?, 'followup', ?, ?)`)
        .run(lead.id, core.nowIso(), first.to_email, `Re: ${first.subject}`, AGENT, first.offer, first.id, err.message.slice(0, 300));
      log('error', `Przypomnienie do ${lead.domain}: ${err.message}`);
    }
  }
  if (made) log('action', `Przygotowałem ${made} przypomnień (follow-up).`);
  return made;
}

/* -------------------------------- wysyłka -------------------------------- */

function footer(s, lead) {
  let f = `\n\n${writer.SIGNATURE}`;
  if (s.unsubscribe === 'reply') f += '\n\nJeśli nie chcą Państwo więcej wiadomości ode mnie, wystarczy odpisać „nie”.';
  if (s.unsubscribe === 'link') f += `\n\nNie chcą Państwo więcej wiadomości? ${config.publicUrl}/u/${outreach.unsubToken(lead)}`;
  return f;
}

async function sendOne(msg, s) {
  const lead = db.prepare('SELECT * FROM leads WHERE id=?').get(msg.lead_id);
  const fail = (status, error) => {
    db.prepare('UPDATE outreach SET status=?, error=? WHERE id=?').run(status, String(error).slice(0, 500), msg.id);
    return { ok: false, error };
  };
  if (!lead || lead.unsubscribed || outreach.isSuppressed(msg.to_email, lead.domain)) return fail('skipped', 'adres na liście wykluczeń');

  const text = `${msg.body}${footer(s, lead)}`;
  const opts = { to: msg.to_email, subject: msg.subject, body: text, html: gmailSvc.textToHtml(text) };
  if (msg.kind === 'followup') {
    const parent = db.prepare('SELECT * FROM outreach WHERE id=?').get(msg.parent_id);
    if (!parent || parent.replied_at || parent.bounced) return fail('skipped', 'firma już odpowiedziała albo adres nie istnieje');
    const account = (google.status().account || '').toLowerCase();
    const thread = await gmailSvc.getThreadMeta(parent.gmail_thread_id);
    if (thread.some((m) => !gmailSvc.addressOf(m.from).includes(account))) {
      db.prepare('UPDATE outreach SET replied_at=? WHERE id=?').run(core.nowIso(), parent.id);
      return fail('skipped', 'w wątku jest już odpowiedź');
    }
    // Odpowiedź mogła przyjść poza wątkiem: z innego adresu tej firmy albo w nowej wiadomości.
    const since = Math.floor(Date.parse(parent.sent_at) / 1000);
    const who = FREE_MAIL.test(msg.to_email) ? `from:${msg.to_email}` : `from:(${msg.to_email} OR @${msg.to_email.split('@')[1]})`;
    if (await gmailSvc.anyThread(`${who} after:${since}`)) {
      db.prepare('UPDATE outreach SET replied_at=? WHERE id=?').run(core.nowIso(), parent.id);
      log('info', `Bez przypomnienia do ${msg.to_email}: firma odezwała się poza wątkiem. Sprawdź skrzynkę.`);
      return fail('skipped', 'firma odpisała poza wątkiem');
    }
    const lastMsg = thread[thread.length - 1];
    Object.assign(opts, { threadId: parent.gmail_thread_id, inReplyTo: lastMsg?.messageId, references: lastMsg?.messageId });
  }
  try {
    const sent = await gmailSvc.sendMessage(opts);
    const ts = core.nowIso();
    db.prepare("UPDATE outreach SET status='sent', sent_at=?, gmail_id=?, gmail_thread_id=?, error=NULL WHERE id=?").run(ts, sent.id, sent.threadId, msg.id);
    db.prepare("UPDATE leads SET status=CASE WHEN status='new' THEN 'contacted' ELSE status END, agent_stage='contacted', last_contacted_at=?, updated_at=? WHERE id=?").run(ts, ts, lead.id);
    log('action', `Wysłałem ${msg.kind === 'followup' ? 'przypomnienie' : 'maila'} do ${lead.company || lead.domain} <${msg.to_email}>.`, { outreachId: msg.id, offer: msg.offer });
    return { ok: true };
  } catch (err) {
    log('error', `Wysyłka do ${msg.to_email}: ${err.message}`);
    return fail('failed', err.message);
  }
}

/** Wysyła następny mail, jeśli przyszła jego pora. Odstępy losowe, rozłożone na całe okno. */
async function sendNext(s, at = now()) {
  const c = counts(at);
  if (c.sentToday >= s.dailyLimit || c.sentHour >= s.hourlyLimit) return null;
  const state = st();
  if (state.nextSendAt && Date.parse(state.nextSendAt) > at.getTime()) return null;
  const msg = db.prepare(`SELECT * FROM outreach WHERE agent=? AND status='agent_queued'
    ORDER BY CASE kind WHEN 'followup' THEN 0 ELSE 1 END, id LIMIT 1`).get(AGENT);
  if (!msg) return null;
  const r = await sendOne(msg, s);
  const left = Math.max(1, s.dailyLimit - c.sentToday - (r.ok ? 1 : 0));
  const windowLeftMs = Math.max(0, (s.windowEnd - core.local(at).hourFloat) * 3600000);
  const gap = Math.max(4 * 60000, (windowLeftMs / left) * (0.6 + Math.random() * 0.6));
  core.saveState(AGENT, { nextSendAt: new Date(at.getTime() + gap).toISOString() });
  return r;
}

/* ------------------------------- odpowiedzi ------------------------------- */

const REPLY_SYSTEM = `Jesteś asystentem sprzedaży studia 21 Project (strony internetowe z SEO i widocznością w AI,
panele administracyjne, kampanie reklamowe). Dostajesz odpowiedź firmy na naszego maila.
Kategorie:
- "pilne": chce rozmowy, wyceny, terminu albo pyta o konkret, trzeba odpisać dziś,
- "wazne": zainteresowanie lub pytanie, warto odpisać w 1–2 dni,
- "zwykle": neutralna odpowiedź, podziękowanie, „może kiedyś”,
- "odmowa": nie jest zainteresowana albo prosi o niepisanie,
- "automat": autoresponder, urlop, zmiana adresu.
Szkic odpowiedzi pisz po polsku, formą Pan/Pani/Państwo, krótko, konkretnie, bez wykrzykników
i długich myślników, bez podpisu (dokłada go system). Przy „odmowa” podziękuj w jednym zdaniu.
Przy „automat” szkic zostaw pusty. Nie wymyślaj cen ani terminów — zaproponuj krótką rozmowę.
Zwróć JSON: {"category": "...", "summary": "jedno zdanie po polsku", "optOut": true/false, "draft": "..."}`;

function threadText(thread) {
  return thread.messages.map((m) => `Od: ${m.from}\nData: ${m.date}\n${String(m.body || '').slice(0, 3000)}`).join('\n\n---\n\n').slice(0, 12000);
}

async function handleReply(o, thread, incoming, s) {
  const isBounce = /mailer-daemon|postmaster/i.test(incoming.from);
  if (isBounce) {
    db.prepare('UPDATE outreach SET bounced=1, reply_category=? WHERE id=?').run('bounce', o.id);
    outreach.suppress(o.to_email, 'adres nie istnieje (zwrot)');
    db.prepare("INSERT OR IGNORE INTO agent_replies (created_at, outreach_id, lead_id, thread_id, gmail_message_id, from_addr, received_at, snippet, category, summary, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'bounce', 'Mail nie doszedł — adres nie istnieje.', 'obsluzona')")
      .run(core.nowIso(), o.id, o.lead_id, o.gmail_thread_id, incoming.id, incoming.from, new Date(incoming.internalDate).toISOString(), incoming.snippet || '');
    log('warn', `Zwrot: ${o.to_email} nie istnieje. Dodałem do wykluczeń.`);
    return;
  }
  const full = await gmailSvc.getThread(o.gmail_thread_id);
  const r = await core.thinkJson(AGENT, {
    system: REPLY_SYSTEM, prompt: threadText(full), maxTokens: 8000, model: s.model || undefined,
    schema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['pilne', 'wazne', 'zwykle', 'odmowa', 'automat'] },
        summary: { type: 'string' }, optOut: { type: 'boolean' }, draft: { type: 'string' },
      },
      required: ['category', 'summary', 'optOut', 'draft'],
    },
  });
  const category = ['pilne', 'wazne', 'zwykle', 'odmowa', 'automat'].includes(r.category) ? r.category : 'zwykle';
  let draftId = null;
  const draftBody = category === 'automat' ? '' : writer.tidy(r.draft || '');
  if (draftBody) {
    const last = full.messages[full.messages.length - 1];
    const d = await gmailSvc.createDraft({
      to: gmailSvc.addressOf(incoming.from), subject: `Re: ${(o.subject || '').replace(/^re:\s*/i, '')}`,
      body: `${draftBody}\n\n${writer.SIGNATURE}`, threadId: o.gmail_thread_id, inReplyTo: last.messageId, references: last.messageId,
    });
    draftId = d.id;
  }
  const ts = core.nowIso();
  db.prepare(`INSERT OR IGNORE INTO agent_replies (created_at, outreach_id, lead_id, thread_id, gmail_message_id, from_addr, received_at, snippet, category, summary, draft_body, gmail_draft_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(ts, o.id, o.lead_id, o.gmail_thread_id, incoming.id, incoming.from, new Date(incoming.internalDate).toISOString(),
      incoming.snippet || '', category, r.summary || '', draftBody, draftId, category === 'automat' ? 'obsluzona' : 'nowa');
  if (category !== 'automat') {
    // Odpowiedź zatrzymuje przypomnienia — także na pierwszym mailu, jeśli przyszła pod follow-upem.
    const rootId = o.parent_id || o.id;
    db.prepare('UPDATE outreach SET replied_at=?, reply_category=? WHERE id IN (?, ?)').run(ts, category, o.id, rootId);
    db.prepare("UPDATE outreach SET status='skipped', error='firma odpowiedziała' WHERE parent_id=? AND status='agent_queued'").run(rootId);
    db.prepare("UPDATE leads SET status=CASE WHEN status IN ('new','contacted') THEN ? ELSE status END, updated_at=? WHERE id=?")
      .run(category === 'odmowa' ? 'rejected' : 'replied', ts, o.lead_id);
  }
  if (r.optOut || category === 'odmowa') outreach.suppress(o.to_email, 'odmowa w odpowiedzi na maila');
  log(category === 'pilne' ? 'alert' : 'action', `Odpowiedź od ${incoming.from} [${category}]: ${r.summary || ''}`, { outreachId: o.id, category });
}

async function checkReplies(s) {
  if (!google.status().connected) return { skipped: 'brak Google' };
  const account = (google.status().account || '').toLowerCase();
  const since = new Date(Date.now() - 40 * 86400000).toISOString();
  const sent = db.prepare(`SELECT * FROM outreach WHERE agent=? AND status='sent' AND gmail_thread_id IS NOT NULL
      AND sent_at>=? AND replied_at IS NULL AND COALESCE(bounced,0)=0 ORDER BY sent_at DESC`).all(AGENT, since);
  const seenThreads = new Set();
  let found = 0;
  for (const o of sent) {
    if (seenThreads.has(o.gmail_thread_id)) continue;
    seenThreads.add(o.gmail_thread_id);
    try {
      const msgs = await gmailSvc.getThreadMeta(o.gmail_thread_id);
      const sentAt = Date.parse(o.sent_at) - 60000;
      const incoming = msgs.filter((m) => m.internalDate > sentAt && !gmailSvc.addressOf(m.from).includes(account)
        && !db.prepare('SELECT 1 FROM agent_replies WHERE gmail_message_id=?').get(m.id));
      if (!incoming.length) continue;
      const latest = db.prepare("SELECT * FROM outreach WHERE gmail_thread_id=? AND status='sent' ORDER BY sent_at DESC LIMIT 1").get(o.gmail_thread_id) || o;
      for (const m of incoming) { await handleReply(latest, null, m, s); found += 1; }
    } catch (err) {
      log('error', `Sprawdzanie wątku ${o.to_email}: ${err.message}`);
    }
  }
  // Zwroty, które Gmail wrzucił do osobnego wątku: szukamy w nich adresów z ostatnich wysyłek.
  try {
    const recent = db.prepare(`SELECT * FROM outreach WHERE agent=? AND status='sent' AND COALESCE(bounced,0)=0 AND sent_at>=?`)
      .all(AGENT, new Date(Date.now() - 7 * 86400000).toISOString());
    if (recent.length) {
      const { threads } = await gmailSvc.listThreads({ q: 'from:(mailer-daemon OR postmaster) newer_than:7d', maxResults: 20 });
      for (const t of threads) {
        const full = await gmailSvc.getThread(t.id);
        const text = full.messages.map((m) => m.body).join('\n').toLowerCase();
        for (const o of recent) {
          if (o.bounced || !text.includes(o.to_email.toLowerCase())) continue;
          const m = full.messages[0];
          if (db.prepare('SELECT 1 FROM agent_replies WHERE gmail_message_id=?').get(m.id)) continue;
          await handleReply(o, null, { id: m.id, from: m.from, internalDate: m.internalDate, snippet: '' }, s);
          o.bounced = 1;
          found += 1;
        }
      }
    }
  } catch (err) {
    log('error', `Szukanie zwrotów: ${err.message}`);
  }
  core.saveState(AGENT, { lastReplyCheck: core.nowIso() });
  return { checked: seenThreads.size, found };
}

/* --------------------------------- nauka --------------------------------- */

function offerStats(sinceIso) {
  return db.prepare(`SELECT offer,
      COUNT(*) sent,
      SUM(CASE WHEN replied_at IS NOT NULL THEN 1 ELSE 0 END) replies,
      SUM(CASE WHEN reply_category IN ('pilne','wazne') THEN 1 ELSE 0 END) positive,
      SUM(CASE WHEN reply_category='odmowa' THEN 1 ELSE 0 END) refusals,
      SUM(CASE WHEN bounced=1 THEN 1 ELSE 0 END) bounces
    FROM outreach WHERE agent=? AND kind='first' AND status='sent' AND sent_at>=? GROUP BY offer`).all(AGENT, sinceIso);
}

const LEARN_SYSTEM = `Jesteś szefem sprzedaży małego studia internetowego. Analizujesz wyniki cold maili z ostatnich tygodni
i piszesz krótką instrukcję dla handlowca na następny tydzień. Opierasz się wyłącznie na danych.
Przy małej liczbie odpowiedzi mów ostrożnie i zaproponuj jeden test zamiast rewolucji.`;

async function learn({ force = false } = {}) {
  const s = settings();
  core.saveState(AGENT, { activity: 'learning', learningAt: core.nowIso() });
  const since = new Date(Date.now() - 28 * 86400000).toISOString();
  const total = db.prepare("SELECT COUNT(*) n FROM outreach WHERE agent=? AND kind='first' AND status='sent' AND sent_at>=?").get(AGENT, since).n;
  if (total < 20 && !force) {
    log('info', `Nauka pominięta: w 4 tygodnie wysłano dopiero ${total} maili (potrzeba min. 20).`);
    return { skipped: 'za mało danych', total };
  }
  const stats = offerStats(since);
  const pick = (sql) => db.prepare(sql).all(AGENT, since).map((m) => `[${m.offer}${m.reply_category ? `, odpowiedź: ${m.reply_category}` : ''}] Temat: ${m.subject}\n${m.body}`);
  const good = pick("SELECT * FROM outreach WHERE agent=? AND kind='first' AND sent_at>=? AND reply_category IN ('pilne','wazne') ORDER BY sent_at DESC LIMIT 6");
  const bad = pick("SELECT * FROM outreach WHERE agent=? AND kind='first' AND sent_at>=? AND replied_at IS NULL AND status='sent' ORDER BY RANDOM() LIMIT 8");
  const refused = pick("SELECT * FROM outreach WHERE agent=? AND kind='first' AND sent_at>=? AND reply_category='odmowa' ORDER BY sent_at DESC LIMIT 4");
  const prev = activePlaybook();
  const prompt = `Statystyki ofert (ostatnie 4 tygodnie):
${JSON.stringify(stats)}

Obecna strategia handlowca:
${s.strategy}

Dotychczasowe wnioski:
${prev?.content || '(brak)'}

Maile z pozytywną odpowiedzią:
${good.join('\n\n') || '(brak)'}

Maile z odmową:
${refused.join('\n\n') || '(brak)'}

Losowe maile bez odpowiedzi:
${bad.join('\n\n') || '(brak)'}

Zwróć JSON:
{"playbook": "nowe wnioski dla handlowca, maks. 180 słów, konkretne reguły: co robić, czego unikać, 3 przykładowe tematy",
 "summary": "3–5 zdań dla właściciela firmy: co działa, co nie, co zmieniasz i dlaczego",
 "ownerTips": ["1–3 rzeczy, które właściciel może zrobić, żeby wyniki były lepsze"]}`;
  const r = await core.thinkJson(AGENT, {
    system: LEARN_SYSTEM, prompt, maxTokens: 12000, model: s.model || undefined,
    schema: {
      type: 'object',
      properties: { playbook: { type: 'string' }, summary: { type: 'string' }, ownerTips: { type: 'array', items: { type: 'string' } } },
      required: ['playbook', 'summary'],
    },
  });
  if (!r.playbook) throw new Error('Brak nowych wniosków w odpowiedzi modelu.');
  const summary = [r.summary, ...(r.ownerTips || []).map((t) => `• ${t}`)].filter(Boolean).join('\n');
  const tx = db.transaction(() => {
    if (s.autoLearn) db.prepare('UPDATE agent_playbooks SET active=0 WHERE agent=?').run(AGENT);
    return db.prepare('INSERT INTO agent_playbooks (created_at, agent, source, content, summary, stats, active) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(core.nowIso(), AGENT, 'auto', String(r.playbook).trim(), summary, JSON.stringify({ total, stats }), s.autoLearn ? 1 : 0).lastInsertRowid;
  });
  const id = tx();
  log('report', `Cotygodniowa nauka: ${s.autoLearn ? 'nowa strategia działa od teraz' : 'nowa strategia czeka na Twoją akceptację'}.\n${summary}`, { playbookId: id });
  return { id, summary, active: s.autoLearn };
}

function savePlaybook(content) {
  const tx = db.transaction(() => {
    db.prepare('UPDATE agent_playbooks SET active=0 WHERE agent=?').run(AGENT);
    return db.prepare("INSERT INTO agent_playbooks (created_at, agent, source, content, active) VALUES (?, ?, 'manual', ?, 1)")
      .run(core.nowIso(), AGENT, String(content).trim()).lastInsertRowid;
  });
  const id = tx();
  log('info', 'Strategia zmieniona ręcznie w panelu.', { playbookId: id });
  return id;
}

function activatePlaybook(id) {
  const p = db.prepare('SELECT * FROM agent_playbooks WHERE id=? AND agent=?').get(id, AGENT);
  if (!p) throw new Error('Nie ma takiej wersji strategii.');
  db.transaction(() => {
    db.prepare('UPDATE agent_playbooks SET active=0 WHERE agent=?').run(AGENT);
    db.prepare('UPDATE agent_playbooks SET active=1 WHERE id=?').run(id);
  })();
  log('info', `Włączona wersja strategii #${id}.`);
}

/* --------------------------------- raporty -------------------------------- */

function dailyReport(at = now()) {
  const dayStart = core.dayStartIso(at);
  const q = (sql) => db.prepare(sql).get(AGENT, dayStart).n;
  const r = {
    day: core.local(at).day,
    sent: q("SELECT COUNT(*) n FROM outreach WHERE agent=? AND status='sent' AND kind='first' AND sent_at>=?"),
    followups: q("SELECT COUNT(*) n FROM outreach WHERE agent=? AND status='sent' AND kind='followup' AND sent_at>=?"),
    replies: q("SELECT COUNT(*) n FROM agent_replies r JOIN outreach o ON o.id=r.outreach_id WHERE o.agent=? AND r.created_at>=? AND r.category NOT IN ('bounce','automat')"),
    positive: q("SELECT COUNT(*) n FROM agent_replies r JOIN outreach o ON o.id=r.outreach_id WHERE o.agent=? AND r.created_at>=? AND r.category IN ('pilne','wazne')"),
    bounces: q("SELECT COUNT(*) n FROM agent_replies r JOIN outreach o ON o.id=r.outreach_id WHERE o.agent=? AND r.created_at>=? AND r.category='bounce'"),
    checked: db.prepare("SELECT COUNT(*) n FROM leads WHERE updated_at>=? AND agent_stage IN ('skipped','queued','contacted')").get(dayStart).n,
  };
  const msg = `Raport dnia ${r.day}: wysłane ${r.sent} maili i ${r.followups} przypomnień, sprawdzone ${r.checked} firm, `
    + `odpowiedzi ${r.replies} (w tym ${r.positive} z zainteresowaniem), zwroty ${r.bounces}.`;
  log('report', msg, r);
  return r;
}

/* ---------------------------------- cykl ---------------------------------- */

async function tick({ force = false } = {}) {
  return core.exclusive(AGENT, async () => {
    const s = settings();
    const at = now();
    core.saveState(AGENT, { lastTickAt: at.toISOString() });
    if (!s.enabled && !force) return { skipped: 'agent zatrzymany' };

    const problems = [];
    if (!ai.enabled()) problems.push('brak ANTHROPIC_API_KEY');
    if (!google.status().connected) problems.push('Gmail nie jest połączony');
    if (problems.length) {
      const state = st();
      if (!state.lastWarnAt || Date.now() - Date.parse(state.lastWarnAt) > 3600000) {
        log('error', `Nie mogę pracować: ${problems.join(', ')}.`);
        core.saveState(AGENT, { lastWarnAt: core.nowIso() });
      }
      return { skipped: problems.join(', ') };
    }

    const out = {};
    const doing = (activity) => core.saveState(AGENT, { activity });
    const state = st();
    doing('replies');
    if (force || !state.lastReplyCheck || Date.now() - Date.parse(state.lastReplyCheck) > 30 * 60000) {
      out.replies = await checkReplies(s);
    }

    // Zatrzymany agent nigdy nie szuka firm ani nie wysyła — ręczny przebieg tylko sprawdza odpowiedzi.
    if (!s.enabled) return out;

    const l = core.local(at);
    if (s.workdays.includes(l.dow) && l.hourFloat >= Math.min(s.prospectFrom, s.windowStart) && l.hourFloat < s.windowEnd) {
      const c = counts(at);
      let need = s.dailyLimit - c.sentToday - c.queued;
      if (need > 0) {
        doing('writing');
        need -= await planFollowUps(s, Math.min(need, 5));
      }
      let written = 0;
      // Najwyżej kilka firm na przebieg, żeby jeden przebieg nie trwał godzinę.
      // Firmy odłożone wczoraj (pełna pula oferty) wracają rano na początek kolejki.
      db.prepare("UPDATE leads SET agent_stage='found' WHERE agent_stage='parked' AND updated_at<?").run(core.dayStartIso(at));
      for (let i = 0; i < 6 && need > 0 && offersLeftToday(s); i += 1) {
        const NEXT = "SELECT * FROM leads WHERE agent_stage='found' ORDER BY CASE source WHEN 'import' THEN 0 ELSE 1 END, id LIMIT 1";
        let lead = db.prepare(NEXT).get();
        if (!lead) {
          doing('searching');
          if (!(await findCandidates(s))) break;
          lead = db.prepare(NEXT).get();
          if (!lead) break;
        }
        try {
          doing('writing');
          const r = await qualify(lead, s);
          if (r.ok) { written += 1; need -= 1; }
        } catch (err) {
          skipLead(lead, `błąd: ${err.message}`.slice(0, 300));
          log('error', `Kwalifikacja ${lead.domain}: ${err.message}`);
        }
      }
      out.written = written;
    }

    if (inWindow(s, at)) { doing('sending'); out.sent = await sendNext(s, at); }

    if (s.workdays.includes(l.dow) && l.hourFloat >= s.windowEnd && st().lastReportDay !== l.day) {
      dailyReport(at);
      core.saveState(AGENT, { lastReportDay: l.day, nextSendAt: null });
    }
    return out;
  });
}

function start() { core.saveSettings(AGENT, DEFAULTS, { enabled: true }); log('info', 'Agent uruchomiony z panelu.'); }
function stop() { core.saveSettings(AGENT, DEFAULTS, { enabled: false }); log('info', 'Agent zatrzymany z panelu.'); }

/** Próbny mail dla podanej strony — bez zapisu i bez wysyłki. Do sprawdzania jakości. */
async function preview(url, offerKey) {
  const s = settings();
  const audit = await siteAudit.audit(url);
  if (!audit.ok) throw new Error(`Audyt nieudany: ${audit.reason}`);
  const key = offerKey && s.offers[offerKey] ? offerKey
    : (chooseOffer(audit, s, {}) || (audit.quality === 'dobra' ? 'panel' : 'strona'));
  const hookKey = chooseHook(s);
  const lead = { company: null, domain: audit.host, website: url, industry: null, city: null };
  const draft = await compose(s, writer.firstPrompt(lead, audit, s.offers[key], s.hooks?.[hookKey]));
  const body = `${writer.withPortfolio(draft.body, writer.portfolioBlock(s.portfolio, key))}${footer(s, { id: 0, unsub_token: 'podglad' })}`;
  return { offer: key, hook: hookKey, audit: { host: audit.host, quality: audit.quality, score: audit.score, reasons: audit.reasons, email: audit.email, title: audit.title },
    subject: draft.subject, body, html: gmailSvc.textToHtml(body), angle: draft.angle };
}

/* ---------------------------------- import ---------------------------------- */

const COLS = {
  company: /^(firma|nazwa|nazwa firmy|company)$/i,
  email: /^(e-?mail|mail|adres e-?mail)$/i,
  city: /^(miasto|miejscowość|miejscowosc|city)$/i,
  industry: /^(branża|branza|kategoria|industry)$/i,
  website: /^(strona|www|website|url)$/i,
  phone: /^(telefon|tel|phone)$/i,
  notes: /^(notatka|uwagi|opis|note|notes)$/i,
};

/** Wklejona tabela (CSV ze średnikami/przecinkami albo z arkusza, z tabulatorami) → wiersze. */
function parseTable(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n').filter((l) => l.trim());
  if (!lines.length) return [];
  const sep = ['\t', ';', ','].map((c) => [c, lines[0].split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
  const split = (line) => {
    const out = []; let cur = ''; let q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === sep && !q) { out.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    out.push(cur.trim());
    return out;
  };
  const first = split(lines[0]);
  const header = first.map((h) => Object.keys(COLS).find((k) => COLS[k].test(h.trim())) || null);
  const hasHeader = header.some(Boolean);
  const order = hasHeader ? header : ['company', 'email', 'city', 'industry', 'website', 'notes'];
  return (hasHeader ? lines.slice(1) : lines).map((l) => {
    const cells = split(l);
    const row = {};
    order.forEach((k, i) => { if (k && cells[i]) row[k] = cells[i]; });
    // Adres e-mail rozpoznajemy też wtedy, gdy stoi w innej kolumnie.
    if (!row.email) row.email = cells.find((c) => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(c));
    return row;
  });
}

function importLeads(text) {
  const rows = parseTable(text);
  const result = { added: 0, skipped: [] };
  const ts = core.nowIso();
  for (const r of rows.slice(0, 1000)) {
    const email = String(r.email || '').trim().toLowerCase();
    const label = r.company || email || '(pusty wiersz)';
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) { result.skipped.push({ firma: label, powod: 'brak poprawnego adresu e-mail' }); continue; }
    const website = r.website && !/^(brak|nie ma|-|—)$/i.test(r.website) ? r.website.trim() : null;
    const domain = website ? siteAudit.hostOf(website) : (FREE_MAIL.test(email) ? null : email.split('@')[1]);
    if (db.prepare('SELECT 1 FROM leads WHERE email=?').get(email)) { result.skipped.push({ firma: label, powod: 'ten adres jest już w bazie' }); continue; }
    if (domain && knownDomain(domain)) { result.skipped.push({ firma: label, powod: `domena ${domain} jest już w bazie` }); continue; }
    if (outreach.isSuppressed(email, domain || '')) { result.skipped.push({ firma: label, powod: 'na liście wykluczeń' }); continue; }
    db.prepare(`INSERT INTO leads (created_at, updated_at, source, status, company, email, phone, website, domain, city, industry, notes, tags, agent_stage)
      VALUES (?, ?, 'import', 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'found')`)
      .run(ts, ts, r.company || null, email, r.phone || null, website, domain, r.city || null, r.industry || null, r.notes || null, website ? 'import' : 'import,bez-strony');
    result.added += 1;
  }
  log('action', `Import listy: dodano ${result.added} firm, pominięto ${result.skipped.length}. Zajmę się nimi przed firmami z Homebooka.`);
  return result;
}

/* ------------------------------ maile testowe ------------------------------ */

/**
 * Trzy maile testowe — po jednym z każdej oferty — wysłane na Twoje konto Gmail.
 * Firma to podana strona albo opis firmy bez strony. Nic nie trafia do kolejki ani statystyk.
 */
async function sendTests(opts = {}) {
  core.saveState(AGENT, { testingAt: core.nowIso() });
  try {
    return await sendTestsInner(opts);
  } catch (err) {
    log('error', `Maile testowe (${opts.url || opts.company || '—'}) nie wyszły: ${err.message}`);
    throw err;
  } finally {
    core.saveState(AGENT, { testingAt: null });
  }
}

async function sendTestsInner({ url, company, city, industry, note } = {}) {
  const s = settings();
  const account = google.status().account;
  if (!account) throw new Error('Gmail nie jest połączony.');
  let audit;
  const lead = { company: company || null, city: city || null, industry: industry || null, notes: note || null, email: account };
  if (url) {
    audit = await siteAudit.audit(url);
    if (!audit.ok) throw new Error(`Audyt nieudany: ${audit.reason}`);
    lead.domain = audit.host; lead.website = url;
  } else {
    if (!company) throw new Error('Podaj stronę albo nazwę firmy bez strony.');
    audit = noSiteAudit(lead);
  }
  const hooks = Object.keys(s.hooks || {}).filter((k) => s.hooks[k]?.on);
  const out = [];
  const keys = Object.keys(s.offers);
  for (const [i, key] of keys.entries()) {
    const hookKey = hooks[i % Math.max(1, hooks.length)] || null;
    const draft = await compose(s, writer.firstPrompt(lead, audit, s.offers[key], s.hooks?.[hookKey]));
    const body = `${writer.withPortfolio(draft.body, writer.portfolioBlock(s.portfolio, key))}${footer(s, { id: 0, unsub_token: 'test' })}`;
    const subject = `[TEST: ${s.offers[key].name}] ${draft.subject}`;
    await gmailSvc.sendMessage({ to: account, subject, body, html: gmailSvc.textToHtml(body) });
    out.push({ offer: key, hook: hookKey, subject, body, html: gmailSvc.textToHtml(body) });
  }
  log('action', `Wysłałem 3 maile testowe na ${account} (${url || company}).`);
  return { to: account, mails: out };
}

/* -------------------------------- statystyki ------------------------------- */

function stats() {
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const allTime = '1970-01-01';
  const one = (sql, ...p) => db.prepare(sql).get(...p);
  const totals = (since) => one(`SELECT
      SUM(CASE WHEN status='sent' AND kind='first' THEN 1 ELSE 0 END) sent,
      SUM(CASE WHEN status='sent' AND kind='followup' THEN 1 ELSE 0 END) followups,
      SUM(CASE WHEN kind='first' AND replied_at IS NOT NULL THEN 1 ELSE 0 END) replies,
      SUM(CASE WHEN kind='first' AND reply_category IN ('pilne','wazne') THEN 1 ELSE 0 END) positive,
      SUM(CASE WHEN kind='first' AND reply_category='odmowa' THEN 1 ELSE 0 END) refusals,
      SUM(CASE WHEN bounced=1 THEN 1 ELSE 0 END) bounces,
      SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) failed
    FROM outreach WHERE agent=? AND created_at>=?`, AGENT, since);
  const daily = db.prepare(`SELECT substr(sent_at,1,10) day, COUNT(*) sent,
      SUM(CASE WHEN replied_at IS NOT NULL THEN 1 ELSE 0 END) replies
    FROM outreach WHERE agent=? AND status='sent' AND sent_at>=? GROUP BY day ORDER BY day`).all(AGENT, since30);
  const byIndustry = db.prepare(`SELECT COALESCE(l.industry,'nieznana') industry, COUNT(*) sent,
      SUM(CASE WHEN o.replied_at IS NOT NULL THEN 1 ELSE 0 END) replies,
      SUM(CASE WHEN o.reply_category IN ('pilne','wazne') THEN 1 ELSE 0 END) positive
    FROM outreach o JOIN leads l ON l.id=o.lead_id WHERE o.agent=? AND o.kind='first' AND o.status='sent'
    GROUP BY industry ORDER BY sent DESC LIMIT 12`).all(AGENT);
  const replyCats = db.prepare(`SELECT r.category, COUNT(*) n FROM agent_replies r JOIN outreach o ON o.id=r.outreach_id
    WHERE o.agent=? GROUP BY r.category`).all(AGENT);
  const funnel = db.prepare(`SELECT agent_stage stage, COUNT(*) n FROM leads WHERE source='agent' GROUP BY agent_stage`).all();
  const skipReasons = db.prepare(`SELECT agent_note reason, COUNT(*) n FROM leads WHERE agent_stage='skipped'
    GROUP BY CASE WHEN agent_note LIKE 'strona nie odpowiada%' THEN 'strona nie odpowiada' WHEN agent_note LIKE 'błąd%' THEN 'błąd' ELSE agent_note END
    ORDER BY n DESC LIMIT 8`).all();
  return {
    today: { ...counts(), ...one(`SELECT SUM(CASE WHEN kind='followup' THEN 1 ELSE 0 END) followups FROM outreach WHERE agent=? AND status='sent' AND sent_at>=?`, AGENT, core.dayStartIso()) },
    last30: totals(since30), allTime: totals(allTime),
    offers30: offerStats(since30), offersAll: offerStats(allTime),
    hooks30: db.prepare(`SELECT hook, COUNT(*) sent, SUM(CASE WHEN replied_at IS NOT NULL THEN 1 ELSE 0 END) replies,
        SUM(CASE WHEN reply_category IN ('pilne','wazne') THEN 1 ELSE 0 END) positive
      FROM outreach WHERE agent=? AND kind='first' AND status='sent' AND sent_at>=? GROUP BY hook`).all(AGENT, since30),
    offersToday: offerCountsToday(),
    daily, byIndustry, replyCats, funnel, skipReasons,
    usage: core.usageSummary(AGENT, 30),
  };
}

/**
 * Co agent robi w tej chwili — dla mapy w panelu. Gdy akurat trwa przebieg, bierzemy to,
 * co sam zgłosił; między przebiegami wynika to z planu dnia.
 */
function activityNow(s, state, at = now()) {
  if (state.testingAt && Date.now() - Date.parse(state.testingAt) < 5 * 60000) return 'testing';
  if (!s.enabled) return 'stopped';
  if (!ai.enabled() || !google.status().connected) return 'blocked';
  if (state.learningAt && Date.now() - Date.parse(state.learningAt) < 10 * 60000) return 'learning';
  if (state.testingAt && Date.now() - Date.parse(state.testingAt) < 5 * 60000) return 'testing';
  if (core.isRunning(AGENT) && state.activity) return state.activity;
  const l = core.local(at);
  if (!s.workdays.includes(l.dow)) return 'weekend';
  if (inWindow(s, at)) {
    const c = counts(at);
    return c.sentToday >= s.dailyLimit ? 'done' : 'sending';
  }
  if (l.hourFloat >= Math.min(s.prospectFrom, s.windowStart) && l.hourFloat < s.windowStart) return 'writing';
  return l.hourFloat >= s.windowEnd ? 'done' : 'sleeping';
}

function today(at = now()) {
  const dayStart = core.dayStartIso(at);
  const one = (sql, ...p) => db.prepare(sql).get(...p).n;
  return {
    ...counts(at),
    replies: one("SELECT COUNT(*) n FROM agent_replies WHERE created_at>=? AND category NOT IN ('bounce','automat')", dayStart),
    waiting: one("SELECT COUNT(*) n FROM agent_replies WHERE status='nowa' AND category IN ('pilne','wazne')"),
    checked: one("SELECT COUNT(*) n FROM leads WHERE source='agent' AND updated_at>=? AND agent_stage IN ('skipped','queued','contacted')", dayStart),
  };
}

function status() {
  const s = settings();
  const state = st();
  const lastTick = state.lastTickAt ? Date.parse(state.lastTickAt) : 0;
  return {
    enabled: s.enabled,
    activity: activityNow(s, state),
    alive: Date.now() - lastTick < 15 * 60000,
    lastTickAt: state.lastTickAt || null,
    nextSendAt: state.nextSendAt || null,
    inWindow: inWindow(s),
    checks: {
      ai: ai.enabled(),
      google: google.status().connected,
      googleAccount: google.status().account || null,
      cse: Boolean(config.leads.googleCseKey && config.leads.googleCseCx),
    },
    cursors: state.cursors || {},
  };
}

module.exports = {
  AGENT, DEFAULTS, settings, saveSettings: (patch) => core.saveSettings(AGENT, DEFAULTS, patch),
  tick, start, stop, status, today, activityNow, importLeads, parseTable, sendTests, stats, preview, learn, savePlaybook, activatePlaybook, activePlaybook,
  checkReplies, dailyReport, chooseOffer, chooseHook, offerCountsToday, counts, inWindow, sendNext, qualify, compose, POSITIVE,
};
