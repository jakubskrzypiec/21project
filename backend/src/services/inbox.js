'use strict';
/**
 * Wyławia ze skrzynki zapytania o stronę i zamienia je na kartki na tablicy.
 * Działa na dwa sposoby: ręcznie (przycisk w panelu) i co pół godziny z harmonogramu.
 */
const { db } = require('../db');
const gmailSvc = require('./gmail');
const google = require('./google');
const ai = require('./ai');
const leadFinder = require('./leadFinder');

const now = () => new Date().toISOString();

/* --------------------------- rozpoznawanie treści --------------------------- */

// Sygnały, że ktoś pyta o stronę. Odmiana po polsku bywa kapryśna,
// więc dopasowujemy rdzenie, nie całe słowa.
const SYGNALY = [
  'stron', 'witryn', 'sklep intern', 'landing', 'wizytówk', 'wizytowk',
  'seo', 'pozycjonowan', 'redesign', 'przebudow', 'odśwież', 'odswiez',
  'wycen', 'oferta', 'ofertę', 'oferte', 'współprac', 'wspolprac', 'projekt',
];
// Rzeczy, które te same słowa zawierają, a zapytaniem nie są.
const ANTYSYGNALY = [
  'faktur', 'newsletter', 'wypisz', 'unsubscribe', 'promocj', 'rabat',
  'webinar', 'szkolenie', 'kurs', 'oferta pracy', 'cv', 'rekrutacj',
  'pozycjonowanie twojej', 'oferujemy', 'nasza firma oferuje',
];

function ocenaRegulowa(tekst) {
  const t = tekst.toLowerCase();
  if (ANTYSYGNALY.some((a) => t.includes(a))) return { pasuje: false, powod: 'wygląda na ofertę/newsletter' };
  const trafienia = SYGNALY.filter((s) => t.includes(s));
  const pyta = /\?|proszę o|prosze o|chciał|chcial|potrzebuj|interesuje mnie|ile kosztuje/.test(t);
  return {
    pasuje: trafienia.length >= 1 && pyta,
    trafienia,
    powod: trafienia.length ? `słowa: ${trafienia.slice(0, 4).join(', ')}` : 'brak słów kluczowych',
  };
}

/** Gdy jest klucz do AI, prosimy o ocenę — reguły zostają jako pierwsze sito. */
async function ocenaAi(temat, tresc, nadawca) {
  const raw = await ai.complete({
    system: `Oceniasz wiadomości przychodzące do studia projektującego strony internetowe.
Odpowiadasz wyłącznie JSON-em: {"zapytanie": true|false, "czego_dotyczy": "...", "pilne": true|false}.
"zapytanie" = true tylko wtedy, gdy nadawca pyta o wykonanie strony, sklepu, SEO albo o wycenę
takiej usługi dla siebie. Oferty sprzedażowe kierowane DO studia, newslettery, faktury,
rekrutacja i spam to false. "czego_dotyczy" to jedno zdanie po polsku.`,
    prompt: `Od: ${nadawca}\nTemat: ${temat}\n\n${String(tresc).slice(0, 3000)}`,
    maxTokens: 250,
    temperature: 0.1,
  });
  try {
    return JSON.parse(raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim());
  } catch {
    return null;
  }
}

/* ------------------------------ social media ------------------------------ */

const SOCIAL_RE = {
  facebook: /https?:\/\/(?:www\.|m\.|web\.)?facebook\.com\/[A-Za-z0-9._%\-/]+/i,
  instagram: /https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._%-]+/i,
  linkedin: /https?:\/\/(?:[a-z]{2}\.)?linkedin\.com\/(?:company|in)\/[A-Za-z0-9._%-]+/i,
};

/**
 * Szuka profili społecznościowych nadawcy: najpierw w stopce jego wiadomości
 * (tam zwykle są), a jeśli nic nie ma — na stronie firmy z domeny adresu.
 */
async function znajdzSocjale(tresc, domena) {
  const znalezione = {};
  for (const [nazwa, re] of Object.entries(SOCIAL_RE)) {
    const m = String(tresc).match(re);
    if (m) znalezione[nazwa] = m[0];
  }
  if (Object.keys(znalezione).length || !domena) return { socjale: znalezione, strona: null };

  // Domeny poczty publicznej nie prowadzą do strony firmy.
  const PUBLICZNE = ['gmail.com', 'wp.pl', 'o2.pl', 'onet.pl', 'interia.pl', 'op.pl',
    'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'protonmail.com'];
  if (PUBLICZNE.includes(domena)) return { socjale: {}, strona: null };

  try {
    const site = await leadFinder.inspectSite(domena);
    return { socjale: site.socials || {}, strona: site.website, audyt: site };
  } catch {
    return { socjale: {}, strona: null };
  }
}

/* -------------------------------- skanowanie -------------------------------- */

async function scanInbox({ limit = 25, useAi = true } = {}) {
  if (!google.status().connected) return { skipped: 'brak połączenia z Google' };

  const konto = (google.status().account || '').toLowerCase();
  const preset = gmailSvc.VIEWS.klienci;
  const { threads } = await gmailSvc.listThreads({ q: preset.q, labelIds: preset.labelIds, maxResults: limit });

  const juzMamy = new Set(
    db.prepare("SELECT source_ref FROM notes WHERE source_ref IS NOT NULL").all().map((r) => r.source_ref)
  );

  const wynik = { sprawdzone: 0, dodane: 0, pominiete: 0, kartki: [] };

  for (const t of threads) {
    if (juzMamy.has(t.id)) { wynik.pominiete += 1; continue; }
    const nadawca = gmailSvc.addressOf(t.from);
    if (!nadawca || nadawca === konto) { wynik.pominiete += 1; continue; }

    wynik.sprawdzone += 1;

    let pelny;
    try { pelny = await gmailSvc.getThread(t.id); } catch { continue; }
    const pierwsza = pelny.messages.find((m) => gmailSvc.addressOf(m.from) !== konto) || pelny.messages[0];
    const tresc = String(pierwsza.body || t.snippet || '');
    const temat = t.subject || '(bez tematu)';

    const regula = ocenaRegulowa(`${temat}\n${tresc}`);
    let werdykt = { zapytanie: regula.pasuje, czego_dotyczy: null, powod: regula.powod };

    if (useAi && ai.enabled()) {
      const zAi = await ocenaAi(temat, tresc, t.from).catch(() => null);
      if (zAi) werdykt = { ...zAi, powod: 'ocena AI' };
    }
    if (!werdykt.zapytanie) { wynik.pominiete += 1; continue; }

    const domena = nadawca.split('@')[1] || null;
    const { socjale, strona, audyt } = await znajdzSocjale(tresc, domena);

    const kartka = zapiszKartke({
      threadId: t.id, temat, tresc, nadawca,
      nazwaNadawcy: String(t.from).replace(/<.*>/, '').replace(/"/g, '').trim(),
      czegoDotyczy: werdykt.czego_dotyczy, pilne: werdykt.pilne,
      socjale, strona, domena, audyt,
    });
    wynik.dodane += 1;
    wynik.kartki.push({ id: kartka.id, title: kartka.title });
  }

  return wynik;
}

function zapiszKartke(d) {
  const lead = powiazLeada(d);
  const links = { gmail: `https://mail.google.com/mail/u/0/#all/${d.threadId}`, ...d.socjale };
  if (d.strona) links.website = d.strona;

  const tresc = [
    d.czegoDotyczy || null,
    '',
    `Od: ${d.nazwaNadawcy || d.nadawca} <${d.nadawca}>`,
    d.audyt?.score !== undefined ? `Analiza strony: ${d.audyt.score}/100 potencjału` : null,
    '',
    String(d.tresc).replace(/\s+/g, ' ').trim().slice(0, 400) + (d.tresc.length > 400 ? '…' : ''),
  ].filter((l) => l !== null).join('\n').trim();

  const r = db.prepare(
    `INSERT INTO notes (created_at, updated_at, title, body, color, pinned, position,
                        source, source_ref, links, project_id)
     VALUES (?, ?, ?, ?, 'zielona', ?, ?, 'poczta', ?, ?, NULL)`
  ).run(
    now(), now(),
    `Zapytanie: ${d.nazwaNadawcy || d.nadawca}`.slice(0, 200),
    tresc,
    d.pilne ? 1 : 0,
    db.prepare('SELECT COALESCE(MIN(position), 0) - 1 AS p FROM notes').get().p,
    d.threadId,
    JSON.stringify(links)
  );

  const kartka = db.prepare('SELECT * FROM notes WHERE id = ?').get(r.lastInsertRowid);
  if (lead) db.prepare('UPDATE leads SET updated_at = ? WHERE id = ?').run(now(), lead.id);
  return kartka;
}

/** Zapytanie z poczty to też lead — zapisujemy go, żeby nie prowadzić dwóch list. */
function powiazLeada(d) {
  const { upsertLead } = require('../routes/leads.routes');
  try {
    return upsertLead({
      source: 'mail',
      name: d.nazwaNadawcy || null,
      email: d.nadawca,
      website: d.strona || null,
      domain: d.strona ? undefined : null,
      message: String(d.tresc).slice(0, 2000),
      score: 65,
      audit: d.audyt ? JSON.stringify({ ...d.audyt.audit, reasons: d.audyt.reasons, socials: d.socjale }) : null,
    });
  } catch {
    return null;
  }
}

module.exports = { scanInbox, ocenaRegulowa };
