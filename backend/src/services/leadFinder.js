'use strict';
const dns = require('dns').promises;
const net = require('net');
const { config } = require('../config');

const UA = config.leads.userAgent;
const robotsCache = new Map();
const lastHit = new Map();

/* ----------------------------- bezpieczeństwo ----------------------------- */

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 10 || a === 127 || a === 0 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  const s = ip.toLowerCase();
  return s === '::1' || s.startsWith('fc') || s.startsWith('fd') || s.startsWith('fe80');
}

/** Zapora SSRF: tylko publiczne adresy http(s). */
async function assertPublicUrl(url) {
  const u = new URL(url);
  if (!/^https?:$/.test(u.protocol)) throw new Error('Dozwolone są tylko adresy http(s).');
  const records = await dns.lookup(u.hostname, { all: true });
  if (!records.length) throw new Error('Domena nie ma adresu IP.');
  if (records.some((r) => isPrivateIp(r.address))) throw new Error('Adres wskazuje na sieć prywatną — pomijam.');
  return u;
}

async function politeDelay(host) {
  const last = lastHit.get(host) || 0;
  const wait = config.leads.minDelayMs - (Date.now() - last);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastHit.set(host, Date.now());
}

async function robotsAllows(u) {
  if (!config.leads.respectRobots) return true;
  const key = u.origin;
  if (!robotsCache.has(key)) {
    let rules = [];
    try {
      const res = await fetchText(`${u.origin}/robots.txt`, 4000);
      let applies = false;
      for (const line of res.text.split('\n')) {
        const [rawK, ...rest] = line.split('#')[0].split(':');
        const k = (rawK || '').trim().toLowerCase();
        const v = rest.join(':').trim();
        if (k === 'user-agent') applies = v === '*' || UA.toLowerCase().includes(v.toLowerCase());
        else if (applies && k === 'disallow' && v) rules.push(v);
      }
    } catch { rules = []; }
    robotsCache.set(key, rules);
  }
  const rules = robotsCache.get(key);
  return !rules.some((r) => r === '/' || u.pathname.startsWith(r));
}

async function fetchText(url, timeoutMs = config.leads.timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    const text = buf.subarray(0, config.leads.maxBytes).toString('utf8');
    return {
      text,
      status: res.status,
      finalUrl: res.url,
      bytes: buf.length,
      ms: Date.now() - started,
      headers: res.headers,
    };
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------ parsowanie -------------------------------- */

const stripTags = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const PHONE_RE = /(?:\+48[\s-]?)?(?:\d{3}[\s-]?\d{3}[\s-]?\d{3}|\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})/g;
const NIP_RE = /NIP[:\s]*((?:\d[\s-]?){10})/i;

/** Wycina obszar stopki — tam firmy trzymają kontakt i podpis wykonawcy strony. */
function footerHtml(html) {
  const byTag = html.match(/<footer[\s\S]*?<\/footer>/gi);
  if (byTag) return byTag.join('\n');
  const byClass = html.match(/<(div|section)[^>]*(?:class|id)="[^"]*(footer|stopka|kontakt|contact)[^"]*"[\s\S]{0,8000}?<\/\1>/gi);
  if (byClass) return byClass.join('\n');
  return html.slice(-12000);
}

function uniq(arr) { return [...new Set(arr)]; }

const JUNK_EMAIL = /(example|sentry|wixpress|\.png|\.jpg|\.webp|@2x|domain\.com|twoj|your)/i;

function extractContacts(scopeHtml, fullHtml) {
  const scopeText = stripTags(scopeHtml);
  const mailtos = uniq([...fullHtml.matchAll(/mailto:([^"'?>\s]+)/gi)].map((m) => decodeURIComponent(m[1])));
  const emails = uniq([...mailtos, ...(scopeText.match(EMAIL_RE) || [])])
    .map((e) => e.toLowerCase().trim())
    .filter((e) => !JUNK_EMAIL.test(e));
  const tels = uniq([...fullHtml.matchAll(/tel:([+0-9\s()-]{7,})/gi)].map((m) => m[1]));
  const nipRaw = (scopeText.match(NIP_RE) || stripTags(fullHtml).match(NIP_RE) || [])[1];
  const nip = nipRaw ? nipRaw.replace(/\D/g, '') : null;
  const phones = uniq([...tels, ...(scopeText.match(PHONE_RE) || [])])
    .map((p) => p.replace(/[\s()-]/g, ''))
    .filter((p) => {
      const digits = p.replace(/\D/g, '');
      // NIP i REGON łatwo pomylić z numerem telefonu — odsiewamy je.
      return digits.length >= 9 && !(nip && nip.includes(digits));
    });
  const socials = {};
  for (const [key, re] of Object.entries({
    facebook: /https?:\/\/(?:www\.)?facebook\.com\/[A-Za-z0-9._%-]+/i,
    instagram: /https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._%-]+/i,
    linkedin: /https?:\/\/(?:[a-z]{2}\.)?linkedin\.com\/(?:company|in)\/[A-Za-z0-9._%-]+/i,
  })) {
    const m = fullHtml.match(re);
    if (m) socials[key] = m[0];
  }
  // Podpis wykonawcy strony: „realizacja: …", „wykonanie: …", „projekt strony: …".
  const credit = scopeText.match(
    /(?:realizacja|wykonanie|projekt(?:owanie)? strony|created by|made by|design(?:ed)? by)[:\s]{1,3}([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż0-9 .&_-]{2,40})/i
  );
  return { emails, phones, nip, socials, credit: credit ? credit[1].trim() : null };
}

/** Sygnały techniczne i SEO — z nich powstaje ocena „jak bardzo ta firma potrzebuje nowej strony". */
function auditHtml(html, meta) {
  const head = html.slice(0, 40000);
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.trim() || null;
  const desc =
    (head.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || [])[1] ||
    (head.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i) || [])[1] || null;
  const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => stripTags(m[1]));
  const imgs = html.match(/<img[^>]*>/gi) || [];
  const imgsNoAlt = imgs.filter((i) => !/alt\s*=/.test(i)).length;
  const words = stripTags(html).split(/\s+/).filter(Boolean).length;

  const tech = [];
  if (/wp-content|wp-includes/i.test(html)) tech.push('WordPress');
  if (/cdn\.shopify|shopify/i.test(html)) tech.push('Shopify');
  if (/wixstatic|wix\.com/i.test(html)) tech.push('Wix');
  if (/squarespace/i.test(html)) tech.push('Squarespace');
  if (/webflow/i.test(html)) tech.push('Webflow');
  if (/joomla/i.test(html)) tech.push('Joomla');
  if (/prestashop/i.test(html)) tech.push('PrestaShop');
  if (/idosell|shoper|sky-shop/i.test(html)) tech.push('platforma sklepowa PL');
  if (/gtag\(|googletagmanager|google-analytics/i.test(html)) tech.push('Google Analytics');
  if (/facebook\.net\/.*fbevents/i.test(html)) tech.push('Meta Pixel');

  return {
    title,
    titleLength: title ? title.length : 0,
    description: desc,
    descriptionLength: desc ? desc.length : 0,
    h1Count: h1.length,
    h1: h1.slice(0, 3),
    hasViewport: /<meta[^>]+name=["']viewport["']/i.test(head),
    hasCanonical: /rel=["']canonical["']/i.test(head),
    hasOg: /property=["']og:/i.test(head),
    hasSchema: /application\/ld\+json/i.test(html),
    hasFavicon: /rel=["'][^"']*icon/i.test(head),
    hasFlash: /\.swf|<embed/i.test(html),
    images: imgs.length,
    imagesWithoutAlt: imgsNoAlt,
    modernImages: /\.webp|\.avif/i.test(html),
    lazyImages: /loading=["']lazy["']/i.test(html),
    words,
    tech: uniq(tech),
    https: meta.https,
    pageBytes: meta.bytes,
    responseMs: meta.ms,
    statusCode: meta.status,
  };
}

/**
 * 0–100. Im wyżej, tym większa szansa, że firmie realnie przyda się nowa strona.
 * Punktujemy braki, które sam naprawiasz w ofercie (mobile, SEO, wydajność, wygląd).
 */
function scoreLead(a) {
  let score = 0;
  const reasons = [];
  const add = (n, why) => { score += n; reasons.push(why); };

  if (!a.hasViewport) add(22, 'brak meta viewport — strona nie jest responsywna');
  if (!a.https) add(15, 'brak HTTPS');
  if (a.hasFlash) add(10, 'przestarzały kod (embed/Flash)');
  if (!a.title) add(12, 'brak tagu title');
  else if (a.titleLength < 25 || a.titleLength > 65) add(6, `title poza zakresem (${a.titleLength} zn.)`);
  if (!a.description) add(10, 'brak meta description');
  else if (a.descriptionLength < 70 || a.descriptionLength > 165) add(4, `description poza zakresem (${a.descriptionLength} zn.)`);
  if (a.h1Count === 0) add(8, 'brak nagłówka H1');
  if (a.h1Count > 1) add(4, `${a.h1Count} nagłówków H1`);
  if (!a.hasSchema) add(5, 'brak danych strukturalnych schema.org');
  if (!a.hasOg) add(4, 'brak Open Graph — linki źle wyglądają w social mediach');
  if (!a.hasCanonical) add(3, 'brak linku canonical');
  if (!a.modernImages) add(6, 'zdjęcia w starych formatach (brak WebP/AVIF)');
  if (!a.lazyImages && a.images > 8) add(4, 'brak lazy-loadingu przy wielu zdjęciach');
  if (a.imagesWithoutAlt > 3) add(4, `${a.imagesWithoutAlt} zdjęć bez atrybutu alt`);
  if (a.pageBytes > 2_500_000) add(8, `ciężka strona (${Math.round(a.pageBytes / 1024)} kB HTML)`);
  if (a.responseMs > 1500) add(6, `wolna odpowiedź serwera (${a.responseMs} ms)`);
  if (a.words < 250) add(6, 'bardzo mało treści — słaby materiał pod SEO');
  if (a.tech.includes('Wix')) add(5, 'strona na Wixie');
  if (!a.tech.includes('Google Analytics')) add(3, 'brak analityki — firma nie mierzy ruchu');

  return { score: Math.min(100, score), reasons };
}

/** Pełna analiza jednej strony: kontakt ze stopki + audyt + ocena. */
async function inspectSite(inputUrl) {
  const url = inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`;
  const u = await assertPublicUrl(url);
  if (!(await robotsAllows(u))) throw new Error('robots.txt zabrania pobierania tej strony.');
  await politeDelay(u.hostname);

  const res = await fetchText(u.toString());
  if (res.status >= 400) throw new Error(`Strona zwróciła status ${res.status}.`);
  const html = res.text;
  const finalUrl = new URL(res.finalUrl || u.toString());

  const foot = footerHtml(html);
  const contacts = extractContacts(foot, html);
  const audit = auditHtml(html, {
    https: finalUrl.protocol === 'https:',
    bytes: res.bytes,
    ms: res.ms,
    status: res.status,
  });
  const { score, reasons } = scoreLead(audit);

  const company =
    audit.title?.split(/[|–—-]/).map((s) => s.trim()).filter(Boolean).pop() ||
    finalUrl.hostname.replace(/^www\./, '');

  return {
    website: finalUrl.origin + (finalUrl.pathname === '/' ? '' : finalUrl.pathname),
    domain: finalUrl.hostname.replace(/^www\./, ''),
    company,
    email: contacts.emails[0] || null,
    emails: contacts.emails,
    phone: contacts.phones[0] || null,
    phones: contacts.phones,
    nip: contacts.nip,
    socials: contacts.socials,
    builtBy: contacts.credit,
    audit,
    score,
    reasons,
    checkedAt: new Date().toISOString(),
  };
}

/** Zbiera adresy domen z listingu (katalog firm, lista podwykonawców itp.). */
async function harvestLinks(listingUrl, { limit = 40 } = {}) {
  const u = await assertPublicUrl(listingUrl);
  await politeDelay(u.hostname);
  const { text } = await fetchText(u.toString());
  const hrefs = [...text.matchAll(/href=["'](https?:\/\/[^"'#]+)["']/gi)].map((m) => m[1]);
  const skip = /(facebook|instagram|linkedin|twitter|x\.com|youtube|google|tiktok|wikipedia|allegro|olx|maps\.)/i;
  const domains = uniq(
    hrefs
      .map((h) => { try { return new URL(h).hostname.replace(/^www\./, ''); } catch { return null; } })
      .filter((d) => d && d !== u.hostname.replace(/^www\./, '') && !skip.test(d))
  );
  return domains.slice(0, limit);
}

/** Opcjonalne wyszukiwanie przez Google Programmable Search (klucz w .env). */
async function searchWeb(query, { num = 10, start = 1 } = {}) {
  const { googleCseKey: key, googleCseCx: cx } = config.leads;
  if (!key || !cx) throw new Error('Brak GOOGLE_CSE_KEY / GOOGLE_CSE_CX w .env — wyszukiwanie wyłączone.');
  const url = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=${encodeURIComponent(query)}&num=${num}&start=${start}&hl=pl&gl=pl`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google CSE: ${res.status}`);
  const data = await res.json();
  return (data.items || []).map((i) => ({ title: i.title, link: i.link, snippet: i.snippet }));
}

module.exports = {
  inspectSite, harvestLinks, searchWeb, assertPublicUrl, scoreLead, stripTags,
  // wystawione na potrzeby testów offline:
  footerHtml, extractContacts, auditHtml,
};
