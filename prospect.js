const dns = require('dns').promises;
const cheerio = require('cheerio');

function isPrivateIp(ip) {
  if (!ip) return true;
  if (ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:')) return true;
  const parts = ip.split('.').map(Number);
  if (parts.length === 4 && parts.every(Number.isFinite)) {
    if (parts[0] === 10 || parts[0] === 127) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 0) return true;
  }
  return false;
}

async function validatePublicUrl(input) {
  let raw = String(input || '').trim();
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Dozwolone są tylko adresy http/https.');
  if (!url.hostname || url.hostname === 'localhost') throw new Error('Nieprawidłowa domena.');
  const addresses = await dns.lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(a => isPrivateIp(a.address))) throw new Error('Adres prywatny/lokalny jest niedozwolony.');
  return url;
}

function extractFooterYear($) {
  const footerText = $('footer').text().replace(/\s+/g, ' ');
  const texts = [footerText, $('body').text().slice(-5000)];
  for (const text of texts) {
    const copyright = text.match(/(?:©|copyright)[^0-9]{0,40}((?:19|20)\d{2})/i);
    if (copyright) return Number(copyright[1]);
  }
  const years = (footerText.match(/(?:19|20)\d{2}/g) || []).map(Number).filter(y => y >= 1995 && y <= new Date().getFullYear() + 1);
  return years.length ? Math.max(...years) : null;
}

async function safeFetch(startUrl, maxRedirects = 3) {
  let current = startUrl;
  for (let i = 0; i <= maxRedirects; i++) {
    const safe = await validatePublicUrl(current.toString());
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    let response;
    try {
      response = await fetch(safe, {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'User-Agent': '21project-site-audit/1.0 (+https://21project.pl)',
          'Accept': 'text/html,application/xhtml+xml'
        }
      });
    } finally {
      clearTimeout(timeout);
    }
    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Przekierowanie bez adresu docelowego.');
      if (i === maxRedirects) throw new Error('Za dużo przekierowań.');
      current = new URL(location, safe);
      continue;
    }
    return response;
  }
  throw new Error('Nie udało się pobrać strony.');
}

async function inspectDomain(input) {
  const start = await validatePublicUrl(input);
  const response = await safeFetch(start);
  if (!response.ok) throw new Error(`Strona zwróciła HTTP ${response.status}.`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) throw new Error('Adres nie zwrócił strony HTML.');
  const length = Number(response.headers.get('content-length') || 0);
  if (length > 1_500_000) throw new Error('Strona jest zbyt duża do szybkiej analizy.');
  const html = (await response.text()).slice(0, 1_500_000);
  const $ = cheerio.load(html);
  const finalUrl = response.url || start.toString();
  const footerYear = extractFooterYear($);
  const title = $('title').first().text().trim();
  const description = $('meta[name="description"]').attr('content')?.trim() || '';
  const viewport = $('meta[name="viewport"]').attr('content')?.trim() || '';
  const schema = $('script[type="application/ld+json"]').length > 0;
  const canonical = $('link[rel="canonical"]').attr('href')?.trim() || '';
  const hasHttps = finalUrl.startsWith('https://');

  const issues = [];
  let score = 0;
  if (footerYear && footerYear <= 2020) { issues.push(`Stopka wygląda na nieaktualną (${footerYear}).`); score += 30; }
  if (!title) { issues.push('Brak znacznika title.'); score += 15; }
  if (!description) { issues.push('Brak meta description.'); score += 20; }
  if (!viewport) { issues.push('Brak meta viewport — możliwy problem mobile.'); score += 15; }
  if (!schema) { issues.push('Brak danych strukturalnych Schema.org.'); score += 10; }
  if (!canonical) { issues.push('Brak canonical URL.'); score += 5; }
  if (!hasHttps) { issues.push('Strona nie korzysta z HTTPS.'); score += 15; }
  if (!issues.length) issues.push('Nie wykryto podstawowych problemów technicznych w szybkim audycie.');

  return {
    finalUrl,
    footerYear,
    score: Math.min(100, score),
    hasHttps,
    hasViewport: Boolean(viewport),
    hasTitle: Boolean(title),
    hasDescription: Boolean(description),
    hasSchema: schema,
    hasCanonical: Boolean(canonical),
    title: title.slice(0, 250),
    description: description.slice(0, 500),
    issues
  };
}

module.exports = { inspectDomain, validatePublicUrl };
