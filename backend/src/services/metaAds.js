'use strict';
/**
 * Kampania reklamowa Meta (FB + IG) widziana z panelu.
 *
 * Dane czytamy wprost z Marketing API — tylko do odczytu, nic tu nie zmienia
 * kampanii ani budżetu. Bez tokenu widok i tak działa: pokazuje stałe ustawienia
 * kampanii i mówi, co wpisać w Railway, żeby pojawiły się liczby.
 */
// Baza ładowana dopiero przy użyciu — dzięki temu liczenie (leady, tempo) testuje się bez SQLite.
const getSetting = (key, fallback) => {
  try { return require('../db').getSetting(key, fallback); } catch { return fallback; }
};

const API = 'https://graph.facebook.com/v21.0';
const CACHE_MS = 10 * 60 * 1000;

// Ustawienia kampanii z 18.11.2026 — to, co faktycznie poszło do Meta.
const DOMYSLNA = {
  campaignId: '120253743872800392',
  nazwa: '21P_LEADY_DARMOWA_KONCEPCJA_LIS2026',
  budzet: 1500,
  start: '2026-11-18',
  koniec: '2026-12-01',
  celKosztuLeada: 60,
};

function ustawienia() {
  return {
    token: process.env.META_ACCESS_TOKEN || '',
    campaignId: process.env.META_CAMPAIGN_ID || getSetting('meta_campaign_id', '') || DOMYSLNA.campaignId,
    budzet: Number(process.env.META_CAMPAIGN_BUDGET || DOMYSLNA.budzet),
    start: DOMYSLNA.start,
    koniec: DOMYSLNA.koniec,
    celKosztuLeada: Number(process.env.META_TARGET_CPL || DOMYSLNA.celKosztuLeada),
    nazwa: DOMYSLNA.nazwa,
  };
}

/** Leady z formularza natywnego Meta raportuje pod kilkoma nazwami — bierzemy pierwszą obecną. */
const TYPY_LEADA = ['lead', 'onsite_conversion.lead_grouped', 'leadgen_grouped', 'offsite_conversion.fb_pixel_lead'];
function liczLeady(actions) {
  if (!Array.isArray(actions)) return 0;
  for (const typ of TYPY_LEADA) {
    const a = actions.find((x) => x.action_type === typ);
    if (a) return Number(a.value) || 0;
  }
  return 0;
}

/** Spłaszcza jeden wiersz insights do liczb, których używa widok. */
function wiersz(i = {}) {
  const wydane = Number(i.spend) || 0;
  const leady = liczLeady(i.actions);
  return {
    wydane,
    wyswietlenia: Number(i.impressions) || 0,
    zasieg: Number(i.reach) || 0,
    klikniecia: Number(i.inline_link_clicks ?? i.clicks) || 0,
    ctr: Number(i.inline_link_click_ctr ?? i.ctr) || 0,
    cpm: Number(i.cpm) || 0,
    leady,
    kosztLeada: leady ? wydane / leady : null,
  };
}

/** Dni do końca i ile wypadałoby wydawać dziennie, żeby zmieścić się w budżecie. */
function tempo(s, wydane, teraz = new Date()) {
  const koniec = new Date(`${s.koniec}T23:59:59`);
  const start = new Date(`${s.start}T00:00:00`);
  const dzien = 86400000;
  const zostaloDni = Math.max(0, Math.ceil((koniec - teraz) / dzien));
  const minelo = Math.min(Math.max(1, Math.ceil((teraz - start) / dzien)), Math.ceil((koniec - start) / dzien));
  return {
    zostaloDni,
    minelo,
    zostaloBudzetu: Math.max(0, s.budzet - wydane),
    srednioDziennie: wydane / minelo,
    procentBudzetu: s.budzet ? Math.min(100, (100 * wydane) / s.budzet) : 0,
  };
}

async function graph(path, params, token) {
  const url = new URL(API + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('access_token', token);
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    const e = new Error(body.error?.message || `Meta API: HTTP ${res.status}`);
    e.code = body.error?.code;
    throw e;
  }
  return body;
}

/**
 * Jeden lead z formularza natywnego → płaski obiekt dla widoku.
 * Nazwy pól standardowych są stałe (full_name, email, phone_number, website);
 * pytania własne Meta nazywa od treści pytania, więc szukamy po fragmencie.
 */
// Meta zwraca nazwy pól w języku formularza („adres e-mail”, „numer telefonu”)
// albo po angielsku (email, phone_number) — rozpoznajemy oba warianty.
const RODZAJE_POL = [
  ['email', /e-?mail/i],
  ['telefon', /phone|telefon/i],
  ['strona', /website|witryn/i],
  ['imie', /full_?name|imi[eę]|nazwisk/i],
  ['zawod', /zajmujesz/i],
  ['maStrone', /stron/i],
];
const rodzajPola = (nazwa) => (RODZAJE_POL.find(([, re]) => re.test(nazwa)) || [null])[0];

/** Odpowiedzi z listy wyboru Meta oddaje jako klucze („nie_mam_strony”) — robimy z nich zdanie. */
const ladnie = (v) => {
  const s = String(v || '').replace(/_/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
};

function lead(l, nazwaReklamy) {
  const wynik = { imie: '', email: '', telefon: '', strona: '', zawod: '', maStrone: '' };
  const inne = [];
  for (const f of l.field_data || []) {
    const wartosc = (f.values || []).join(', ');
    const rodzaj = rodzajPola(f.name || '');
    if (rodzaj && !wynik[rodzaj]) wynik[rodzaj] = ['zawod', 'maStrone'].includes(rodzaj) ? ladnie(wartosc) : wartosc.trim();
    // Wszystko, czego nie rozpoznaliśmy, i tak trafia do widoku — nic nie ginie.
    else if (!rodzaj && wartosc) inne.push({ pytanie: String(f.name).replace(/_/g, ' '), odpowiedz: ladnie(wartosc) });
  }
  return {
    id: l.id,
    kiedy: l.created_time,
    ...wynik,
    inne,
    reklama: nazwaReklamy || l.ad_name || '',
    platforma: l.platform || '',
  };
}

/** Leady wszystkich reklam kampanii. Brak uprawnienia nie psuje reszty zakładki. */
async function pobierzLeady(reklamy, token) {
  try {
    const listy = await Promise.all(reklamy.map((a) => graph(`/${a.id}/leads`, {
      fields: 'id,created_time,field_data,ad_name,platform', limit: '200',
    }, token).then((r) => (r.data || []).map((l) => lead(l, a.name)))));
    return { leady: listy.flat().sort((a, b) => String(b.kiedy).localeCompare(String(a.kiedy))), leadyBlad: null };
  } catch (err) {
    return { leady: [], leadyBlad: err.message };
  }
}

let cache = null;

async function pobierz({ odswiez = false } = {}) {
  const s = ustawienia();
  const baza = {
    nazwa: s.nazwa, campaignId: s.campaignId, budzet: s.budzet,
    start: s.start, koniec: s.koniec, celKosztuLeada: s.celKosztuLeada,
    linkMenedzera: `https://adsmanager.facebook.com/adsmanager/manage/campaigns?selected_campaign_ids=${s.campaignId}`,
    linkLeadow: 'https://business.facebook.com/latest/leads_center',
  };
  if (!s.token) {
    return { ...baza, polaczono: false, tempo: tempo(s, 0) };
  }
  if (!odswiez && cache && cache.campaignId === s.campaignId && Date.now() - cache.ts < CACHE_MS) {
    return cache.dane;
  }

  const pola = 'spend,impressions,reach,clicks,inline_link_clicks,ctr,inline_link_click_ctr,cpm,actions';
  const [kampania, suma, dzienne, reklamy] = await Promise.all([
    graph(`/${s.campaignId}`, { fields: 'name,effective_status,lifetime_budget,start_time,stop_time' }, s.token),
    graph(`/${s.campaignId}/insights`, { fields: pola, date_preset: 'maximum' }, s.token),
    graph(`/${s.campaignId}/insights`, { fields: 'spend,actions', date_preset: 'maximum', time_increment: '1', limit: '100' }, s.token),
    graph(`/${s.campaignId}/ads`, {
      fields: `id,name,effective_status,insights.date_preset(maximum){${pola}}`, limit: '50',
    }, s.token),
  ]);
  const { leady, leadyBlad } = await pobierzLeady(reklamy.data || [], s.token);

  const razem = wiersz(suma.data?.[0]);
  const budzet = kampania.lifetime_budget ? Number(kampania.lifetime_budget) / 100 : s.budzet;
  const dane = {
    ...baza,
    polaczono: true,
    nazwa: kampania.name || s.nazwa,
    status: kampania.effective_status || null,
    budzet,
    start: (kampania.start_time || s.start).slice(0, 10),
    koniec: (kampania.stop_time || s.koniec).slice(0, 10),
    razem,
    dni: (dzienne.data || []).map((d) => ({ day: d.date_start, wydane: Number(d.spend) || 0, leady: liczLeady(d.actions) })),
    reklamy: (reklamy.data || []).map((a) => ({
      nazwa: a.name, status: a.effective_status, ...wiersz(a.insights?.data?.[0]),
    })),
    leady,
    leadyBlad,
    pobrano: new Date().toISOString(),
  };
  dane.tempo = tempo({ ...s, budzet, start: dane.start, koniec: dane.koniec }, razem.wydane);
  cache = { ts: Date.now(), campaignId: s.campaignId, dane };
  return dane;
}

module.exports = { pobierz, liczLeady, wiersz, tempo, lead, DOMYSLNA };
