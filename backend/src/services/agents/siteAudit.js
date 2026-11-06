'use strict';
/**
 * Audyt strony firmy. Te same reguły, których używałem przy ręcznych partiach maili:
 * agent może pisać tylko o rzeczach, które naprawdę widać na stronie. Lepiej przemilczeć
 * problem, niż napisać firmie coś nieprawdziwego.
 */
const { config } = require('../../config');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const BAD_EMAIL = ['example', 'sentry', 'wixpress', 'domain.', '@2x', '@3x', '.png', '.jpg', '.webp', '.svg', '.gif',
  'jkowalski', 'your@', 'email@', 'twojmail', 'godaddy', 'u003e', 'noreply', 'no-reply', 'name@', 'adres@', 'mail@mail'];
// Biblioteki i motywy, których stopki z rokiem nie są stopką firmy.
const LIB = /eden|jquery|bootstrap|license|licensed|\bmit\b|fontawesome|font awesome|swiper|slick|isotope|twitter|google|wordpress\.org|theme by|kriesi|themefusion|elementor/i;
const OLD_BUILDERS = ['wix', 'jimdo', 'weebly', 'site123', 'webnode', 'strikingly', 'mozello', 'blogspot', 'sites.google', 'cba.pl', 'prv.pl', 'webwave'];
// Strona na darmowej subdomenie = firma nie ma własnej strony.
const FREE_HOSTS = /\.(wixsite\.com|business\.site|webnode\.(page|pl|com)|mozello\.(pl|com)|wordpress\.com|blogspot\.com|jimdosite\.com|site123\.me|weebly\.com|cba\.pl|prv\.pl)$/i;
const SOCIAL = /(^|\.)(facebook\.com|fb\.com|instagram\.com|linktr\.ee)$/i;
const PLACEHOLDERS = ['lorem ipsum', 'Sample Page', 'Hello world', 'Przykładowa strona', 'Witaj, świecie', 'Your Company',
  'yourdomain', 'Twoja firma', 'Przykładowy tekst', 'Warning:', 'Deprecated:', 'Fatal error'];

function hostOf(url) {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase().replace(/^www\./, '');
  } catch { return null; }
}

const decode = (s) => String(s)
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&copy;/g, '©');

async function get(url, timeoutMs = config.leads.timeoutMs) {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'user-agent': UA, accept: 'text/html,*/*', 'accept-language': 'pl,en;q=0.8' },
    });
    const buf = await res.arrayBuffer();
    const body = Buffer.from(buf.slice(0, config.leads.maxBytes)).toString('utf8');
    return { code: res.status, url: res.url || url, ms: Date.now() - started, body };
  } catch (err) {
    return { code: 0, url, ms: Date.now() - started, body: '', error: err.message };
  }
}

/** Widoczny tekst: bez skryptów, styli, komentarzy i elementów ukrytych. */
function visibleText(html) {
  let s = html.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<(script|style|noscript|template|svg)[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  s = s.replace(/<([a-z0-9]+)[^>]+(display:\s*none|visibility:\s*hidden|aria-hidden="true"|class="[^"]*(screen-reader|sr-only|hidden)[^"]*")[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  // Ikony z fontów (material icons) wyglądają w kodzie jak słowa — wycinamy je.
  s = s.replace(/<(i|span)[^>]+class=["'][^"']*(material-icons|material-symbols|icon)[^"']*["'][^>]*>[^<]*<\/\1>/gi, ' ');
  return decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function extractEmails(html) {
  const s = decode(html).replace(/\s?\[(at|małpa)\]\s?|\s?\((at|małpa)\)\s?/gi, '@');
  const found = new Set((s.match(EMAIL) || []).map((e) => e.toLowerCase().replace(/\.$/, '')));
  return [...found].filter((e) => !BAD_EMAIL.some((b) => e.includes(b)));
}

/** Najlepszy adres do pierwszego maila: z domeny firmy, ogólny (biuro/kontakt) przed osobistym. */
function pickEmail(emails, domain) {
  if (!emails.length) return null;
  const rank = (e) => {
    const [local, d] = e.split('@');
    let r = 0;
    if (domain && d === domain) r -= 10;
    if (/^(biuro|kontakt|info|office|hello|studio|pracownia|projekty|zapytania)$/.test(local)) r -= 5;
    if (/^(rodo|iod|faktury|ksiegowosc|praca|rekrutacja|admin|webmaster)/.test(local)) r += 20;
    return r;
  };
  return [...emails].sort((a, b) => rank(a) - rank(b))[0];
}

function copyrightYear(text) {
  const years = [];
  for (const m of text.matchAll(/(©|\(c\)|copyright|ⓒ)([^©ⓒ]{0,15})/gi)) {
    // Kontekst: 40 znaków przed © (tam stoi „Theme by …”) i krótki fragment po nim.
    if (LIB.test(text.slice(Math.max(0, m.index - 40), m.index) + m[0])) continue;
    const ys = [...m[0].matchAll(/(?<!\d)((?:19|20)\d\d)(?!\d)/g)].map((x) => Number(x[1]));
    if (ys.length) years.push(Math.max(...ys));
  }
  for (const m of text.matchAll(/((?:19|20)\d\d)\s*©/g)) years.push(Number(m[1]));
  return years.length ? Math.max(...years) : null;
}

async function robotsAllows(origin) {
  if (!config.leads.respectRobots) return true;
  const r = await get(`${origin}/robots.txt`, 6000);
  if (r.code !== 200) return true;
  let applies = false;
  for (const raw of r.body.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const [k, ...v] = line.split(':');
    const val = v.join(':').trim();
    if (/^user-agent$/i.test(k)) applies = val === '*' || /21project/i.test(val);
    else if (applies && /^disallow$/i.test(k) && val === '/') return false;
  }
  return true;
}

/** Analiza samego HTML-a — osobno, żeby dało się ją testować bez sieci. */
function analyzeHtml(html, { finalUrl = '', ms = 0 } = {}) {
  const low = html.toLowerCase();
  const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleM ? decode(titleM[1]).replace(/\s+/g, ' ').trim() : '';
  const parts = title.split(/\s[-–|»]\s/).map((p) => p.trim().toLowerCase()).filter(Boolean);
  const descM = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const text = visibleText(html);
  const gen = (html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i) || [])[1] || null;
  const jq = (low.match(/jquery[.-]?(\d\.\d+(?:\.\d+)?)(?:\.min)?\.js/) || [])[1] || null;
  return {
    finalUrl,
    https: finalUrl.startsWith('https://'),
    responseMs: ms,
    size: html.length,
    title,
    noTitle: !title,
    genericTitle: ['home', 'strona główna', 'start', 'index', 'portfolio', 'home page', 'strona glowna'].includes(title.toLowerCase())
      || /kolejna witryna wordpress|just another wordpress/i.test(title),
    dupTitle: parts.length >= 2 && parts[0] === parts[1],
    description: descM ? decode(descM[1]).trim() : '',
    viewport: /name=["']?viewport/i.test(html),
    copyrightYear: copyrightYear(text),
    generator: gen ? gen.slice(0, 40) : null,
    jquery: jq,
    flash: low.includes('.swf'),
    tables: (low.match(/<table/g) || []).length,
    builder: OLD_BUILDERS.find((b) => low.includes(b)) || null,
    schemaLocal: /"@type"\s*:\s*"(LocalBusiness|ProfessionalService|HomeAndConstructionBusiness|Organization)"/i.test(html),
    ogTags: /property=["']og:/i.test(html),
    h1: (low.match(/<h1[\s>]/g) || []).length,
    placeholders: PLACEHOLDERS.filter((p) => text.toLowerCase().includes(p.toLowerCase())),
    text: text.slice(0, 1500),
    emails: extractEmails(html),
  };
}

/**
 * Ocena i obserwacje. `reasons` to zdania, które agent może wprost wykorzystać w mailu —
 * opisane po ludzku i tylko takie, które da się sprawdzić. Im wyższy `score`,
 * tym bardziej strona potrzebuje odświeżenia.
 */
function score(a, now = new Date()) {
  const reasons = [];
  let s = 0;
  const year = now.getFullYear();
  if (!a.https) { s += 3; reasons.push('strona nie ma szyfrowanego połączenia (przeglądarka pokazuje „niezabezpieczona”)'); }
  if (!a.viewport) { s += 3; reasons.push('strona nie dopasowuje się do telefonu, trzeba ją powiększać palcami'); }
  if (a.copyrightYear && a.copyrightYear <= year - 4) {
    s += a.copyrightYear <= year - 8 ? 3 : 2;
    reasons.push(`w stopce strony widnieje rok ${a.copyrightYear}, co sugeruje, że strona długo nie była odświeżana`);
  }
  if (a.flash) { s += 3; reasons.push('część strony korzysta z technologii Flash, której przeglądarki już nie wyświetlają'); }
  // Tabele bywają w treści (cenniki), więc to tylko sygnał do oceny, nie zdanie do maila.
  if (a.tables >= 3 && !a.viewport) s += 2;
  if (a.jquery && a.jquery.startsWith('1.')) s += 1;
  if (a.builder) s += 1;
  const wp = a.generator && a.generator.match(/WordPress (\d+)\./);
  if (wp && Number(wp[1]) < 6) { s += 2; reasons.push('silnik strony od dawna nie był aktualizowany'); }
  if (a.noTitle) { s += 2; reasons.push('strona nie ma tytułu, więc Google nie wie, jak ją opisać w wynikach'); }
  else if (a.genericTitle) { s += 2; reasons.push(`tytuł strony w Google to tylko „${a.title}”, bez nazwy firmy i usług`); }
  else if (a.dupTitle) { s += 1; reasons.push(`tytuł strony powtarza tę samą nazwę („${a.title}”) zamiast mówić, czym się Państwo zajmują`); }
  if (!a.description) { s += 1; reasons.push('Google nie dostaje opisu strony, więc w wynikach pokazuje przypadkowy fragment tekstu'); }
  // Brak danych strukturalnych ma prawie każda strona — to obserwacja zapasowa, nie główna.
  const fallback = !a.schemaLocal ? ['wyszukiwarki AI (np. ChatGPT) mają mało informacji o firmie, więc raczej jej nie polecą, gdy ktoś zapyta o takie usługi w tym mieście'] : [];
  if (a.responseMs > 6000) { s += 1; reasons.push(`strona ładuje się ponad ${Math.round(a.responseMs / 1000)} s`); }
  if (a.placeholders.length) { s += 2; reasons.push(`na stronie został tekst przykładowy z szablonu („${a.placeholders[0]}”)`); }
  if (a.size < 3000) { s += 1; reasons.push('strona jest prawie pusta'); }
  return { score: s, reasons, fallbackReasons: fallback, quality: s >= 3 ? 'slaba' : 'dobra' };
}

/** Pełny audyt adresu: strona główna + podstrona kontaktowa (po adresy e-mail). */
async function audit(url) {
  const host = hostOf(url);
  if (!host) return { ok: false, reason: 'niepoprawny adres strony' };
  if (SOCIAL.test(host)) return { ok: true, host, noOwnSite: true, kind: 'social', quality: 'brak', score: 10, reasons: ['firma nie ma własnej strony, tylko profil w mediach społecznościowych'], emails: [] };

  let r = await get(`https://${host}`);
  if (!r.code || r.code >= 400) {
    const r2 = await get(`http://${host}`);
    if (r2.code && r2.code < 400) r = r2;
  }
  if (!r.code || r.code >= 400 || r.body.length < 300) return { ok: false, host, reason: `strona nie odpowiada (${r.code || r.error || 'brak odpowiedzi'})` };
  if (/Just a moment|cf-browser-verification|captcha/i.test(r.body.slice(0, 4000))) return { ok: false, host, reason: 'strona blokuje automatyczne odczyty' };

  const origin = new URL(r.url).origin;
  if (!(await robotsAllows(origin))) return { ok: false, host, reason: 'robots.txt nie pozwala czytać strony' };

  const a = analyzeHtml(r.body, { finalUrl: r.url, ms: r.ms });
  const finalHost = hostOf(r.url) || host;

  // Kontakt: zwykle tam są adresy, których nie ma na stronie głównej.
  const links = [...r.body.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => m[1]).filter((l) => /kontakt|contact/i.test(l)).slice(0, 2);
  for (const l of links) {
    try {
      const u = new URL(l, r.url);
      if (hostOf(u.href) !== finalHost) continue;
      const k = await get(u.href, 10000);
      if (k.code === 200) a.emails = [...new Set([...a.emails, ...extractEmails(k.body)])];
    } catch { /* zły link — pomijamy */ }
  }

  const sc = score(a);
  const noOwnSite = FREE_HOSTS.test(finalHost);
  if (noOwnSite) {
    sc.reasons.unshift('strona stoi na darmowym adresie kreatora, a nie na własnej domenie firmy');
    sc.score += 3;
    sc.quality = 'slaba';
  }
  return { ok: true, host: finalHost, noOwnSite, ...a, ...sc, email: pickEmail(a.emails, finalHost) };
}

module.exports = { audit, analyzeHtml, score, extractEmails, pickEmail, hostOf, visibleText, copyrightYear, get, UA };
