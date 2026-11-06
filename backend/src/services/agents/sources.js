'use strict';
/**
 * Skąd agent bierze nowe firmy. Każde źródło pamięta, gdzie skończyło (kursor w stanie
 * agenta), więc po restarcie serwera nie zaczyna od początku i nie mieli tych samych stron.
 */
const { config } = require('../../config');
const { get, hostOf } = require('./siteAudit');

// Katalogi, portale i media społecznościowe — to nie są strony firm.
const NOT_COMPANY = /(^|\.)(homebook\.pl|facebook\.com|instagram\.com|youtube\.com|linkedin\.com|pinterest\.\w+|olx\.pl|allegro\.pl|oferteo\.pl|panoramafirm\.pl|pkt\.pl|gowork\.pl|houzz\.\w+|fixly\.pl|google\.\w+|tiktok\.com|twitter\.com|x\.com|wikipedia\.org|rankingpro\.pl|aleo\.com|biznesfinder\.pl|zumi\.pl|firmy\.net|cylex\.pl|yelp\.\w+|booksy\.com|znanylekarz\.pl|otodom\.pl|morizon\.pl|archello\.com|behance\.net|muratorplus\.pl|budowlaneabc\.pl)$/i;

const INDUSTRY = {
  'architekci-projektanci-wnetrz': 'projektowanie wnętrz',
  'architekci-i-projektanci-krajobrazu': 'projektowanie ogrodów',
  'architekci-budynkow': 'architektura',
  'firmy-remontowe-i-budowlane': 'remonty i budownictwo',
  producenci: 'producent wyposażenia',
  sklepy: 'sklep wnętrzarski',
  'artysci-designerzy': 'design i rękodzieło',
  'fotografowie-wnetrz': 'fotografia wnętrz',
  'mlodzi-projektanci': 'projektowanie wnętrz',
};

const isCompanySite = (url) => {
  const h = hostOf(url);
  return Boolean(h) && !NOT_COMPANY.test(h);
};

/** Imię firmy i miasto z tytułu profilu: „NAZWA - Architekt / projektant wnętrz KATOWICE - homebook”. */
function parseHomebookTitle(title) {
  const t = String(title || '').replace(/\s+/g, ' ').trim();
  const parts = t.split(' - ');
  const company = parts[0] || null;
  const mid = parts.length >= 3 ? parts.slice(1, -1).join(' - ') : '';
  // Miasto to końcowe słowa pisane wielką literą: „… wnętrz KATOWICE” albo „… wnętrz Kędzierzyn-Koźle”.
  const cityM = mid.match(/((?:\p{Lu}[\p{L}-]*\s?)+)$/u);
  let city = cityM ? cityM[1].trim().replace(/^((Architekt|Projektant|Firma|Producent|Sklep|Fotograf|Artysta|Designer|Wykonawca|Ogrody)\S*\s+)+/i, '') : null;
  if (city && city === city.toUpperCase()) {
    city = city.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (c) => c.toUpperCase());
  }
  return { company, city };
}

/**
 * Jedna porcja z Homebooka: przechodzi kolejne kombinacje kategoria × województwo
 * i kolejne strony listy. Zwraca kandydatów i nowy kursor.
 */
async function homebookBatch(src, cursor = {}, { maxProfiles = 25 } = {}) {
  const combos = [];
  for (const c of src.categories || []) for (const r of src.regions || []) combos.push(`${c}-${r}`);
  if (!combos.length) return { candidates: [], cursor, done: true };
  let { combo = 0, page = 0 } = cursor;
  if (combo >= combos.length) return { candidates: [], cursor: { combo, page }, done: true };

  const slug = combos[combo];
  const base = `https://www.homebook.pl/specjalisci/${slug}`;
  const list = await get(page ? `${base}?pindex=${page}` : base, 15000);
  const pages = Number((list.body.match(/class="last"><span>z (\d+)<\/span>/) || [])[1] || 1);
  const profiles = [...new Set([...list.body.matchAll(/href="(\/profil\/\d+\/[^"]+)"/g)].map((m) => m[1]))].slice(0, maxProfiles);
  const category = Object.keys(INDUSTRY).find((k) => slug.startsWith(k));

  const candidates = [];
  for (const p of profiles) {
    const prof = await get(`https://www.homebook.pl${p}`, 15000);
    const site = (prof.body.match(/href="(https?:\/\/[^"]+)"[^>]*class="website"/) || [])[1];
    const title = (prof.body.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    const { company, city } = parseHomebookTitle(title.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))));
    if (site && isCompanySite(site)) {
      candidates.push({ website: site, company, city, industry: INDUSTRY[category] || null, source: 'homebook', ref: p });
    }
    await new Promise((r) => setTimeout(r, config.leads.minDelayMs));
  }

  page += 1;
  if (page >= pages || !profiles.length) { combo += 1; page = 0; }
  return { candidates, cursor: { combo, page }, done: combo >= combos.length, label: slug };
}

/** Google Custom Search: zapytania „{branża} {miasto}”, po 10 wyników na stronę, maks. 3 strony. */
async function cseBatch(src, cursor = {}) {
  const key = config.leads.googleCseKey;
  const cx = config.leads.googleCseCx;
  if (!key || !cx) return { candidates: [], cursor, done: true, disabled: true };
  const queries = [];
  for (const q of src.queries || []) for (const c of src.cities || ['']) queries.push(q.replace('{city}', c).trim());
  let { q = 0, start = 1 } = cursor;
  if (q >= queries.length) return { candidates: [], cursor: { q, start }, done: true };

  const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(queries[q])}&num=10&start=${start}&gl=pl&lr=lang_pl`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Google Custom Search ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const items = data.items || [];
  const city = (src.cities || []).find((c) => c && queries[q].includes(c)) || null;
  const candidates = items
    .filter((it) => isCompanySite(it.link))
    .map((it) => ({ website: it.link, company: (it.title || '').split(/\s[-–|]\s/)[0].slice(0, 80) || null, city, industry: src.industry || null, source: 'google', ref: queries[q] }));

  start += 10;
  if (start > 21 || items.length < 10) { q += 1; start = 1; }
  return { candidates, cursor: { q, start }, done: q >= queries.length, label: queries[q] || '' };
}

module.exports = { homebookBatch, cseBatch, parseHomebookTitle, isCompanySite, INDUSTRY };
