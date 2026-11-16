'use strict';
/**
 * Zrzuty sekcji strony dla strony projektu klienta. Uruchamiany przez
 * services/clientReview.js jako osobny proces na jedno zadanie:
 *   node captureWorker.js <round_id> <url> <katalog>
 * Robi zdjęcia kolejnych sekcji (nagłówek, oferta, realizacje… stopka) w wersji na
 * komputer i na telefon, zapisuje JPG-i i odsyła listę rodzicowi. Potem kończy pracę.
 */
const path = require('node:path');

const [, , roundId, url, dir] = process.argv;
// Czekamy na doręczenie wiadomości — inaczej process.exit mógłby ją uciąć.
const send = (m) => new Promise((resolve) => { try { if (process.send) process.send(m, () => resolve()); else resolve(); } catch { resolve(); } });

const DEVICES = [
  { name: 'komputer', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, maxChunk: 2200 },
  { name: 'telefon', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, maxChunk: 1800,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
];

/** Znajduje sekcje strony w przeglądarce. Zwraca prostokąty w pikselach strony. */
function findSections() {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.height >= 60 && r.width >= innerWidth * 0.5 && cs.display !== 'none' && cs.visibility !== 'hidden' && cs.position !== 'fixed';
  };
  const kids = (el) => [...el.children].filter((c) => !['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'LINK'].includes(c.tagName) && visible(c));
  const pageH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
  // Schodzimy przez opakowania (#app, .wrapper), dopóki jedno dziecko zajmuje prawie całą stronę.
  let root = document.body;
  for (let i = 0; i < 6; i += 1) {
    const k = kids(root);
    if (k.length === 1 && k[0].getBoundingClientRect().height > pageH * 0.7) root = k[0];
    else break;
  }
  let blocks = [];
  for (const el of kids(root)) {
    // <main> z kilkoma sekcjami rozbijamy na te sekcje.
    const inner = kids(el);
    if ((el.tagName === 'MAIN' || el.getBoundingClientRect().height > pageH * 0.6) && inner.length > 1) blocks.push(...inner);
    else blocks.push(el);
  }
  const label = (el, i) => {
    const t = el.tagName;
    const names = `${el.id || ''} ${typeof el.className === 'string' ? el.className : ''}`;
    if (t === 'FOOTER' || /footer|stopka/i.test(names)) return 'Stopka';
    if (t === 'HEADER' || t === 'NAV' || /header|navbar|navigation/i.test(names)) return i === 0 ? 'Nagłówek' : 'Menu';
    if (/hero/i.test(names) || i === 0) {
      const h1 = el.querySelector('h1');
      if (h1 && h1.textContent.trim()) return h1.textContent.replace(/\s+/g, ' ').trim().slice(0, 60);
    }
    const h = el.querySelector('h1,h2,h3');
    const txt = (el.getAttribute('aria-label') || (h && h.textContent) || '').replace(/\s+/g, ' ').trim();
    return txt ? txt.slice(0, 60) : (i === 0 ? 'Góra strony' : `Sekcja ${i + 1}`);
  };
  blocks = blocks.map((el, i) => {
    const r = el.getBoundingClientRect();
    return { top: Math.max(0, Math.round(r.top + scrollY)), height: Math.round(r.height), label: label(el, i) };
  }).filter((b) => b.height >= 40).sort((a, b) => a.top - b.top);
  // Małe paski (np. cienki baner) doklejamy do następnej sekcji.
  const merged = [];
  for (const b of blocks) {
    const last = merged[merged.length - 1];
    if (last && (last.height < 140 || b.top < last.top + last.height - 20)) {
      const bottom = Math.max(last.top + last.height, b.top + b.height);
      // Cienki pasek (np. menu) nie nadaje nazwy — bierzemy nazwę treści pod nim.
      if (last.height < 140) last.label = b.label;
      last.height = bottom - last.top;
    } else merged.push({ ...b });
  }
  return { sections: merged, pageH, width: document.documentElement.clientWidth };
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    const step = Math.round(innerHeight * 0.8);
    for (let y = 0, i = 0; i < 60 && y < document.documentElement.scrollHeight; i += 1, y += step) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 160));
    }
    scrollTo(0, 0);
  });
}

async function shootDevice(browser, dev) {
  const ctx = await browser.newContext({
    viewport: dev.viewport, deviceScaleFactor: dev.deviceScaleFactor, isMobile: dev.isMobile,
    hasTouch: Boolean(dev.hasTouch), userAgent: dev.userAgent, locale: 'pl-PL', reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load', timeout: 45_000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await autoScroll(page);
  // Animacje „pojaw się przy przewijaniu” zatrzymujemy w stanie końcowym.
  await page.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important;scroll-behavior:auto!important}' }).catch(() => {});
  await page.waitForTimeout(900);
  let { sections, pageH, width } = await page.evaluate(findSections);
  if (!sections.length) sections = [{ top: 0, height: pageH, label: 'Strona' }];

  const shots = [];
  for (const s of sections.slice(0, 14)) {
    const end = Math.min(s.top + s.height, pageH);
    for (let y = s.top, part = 0; y < end && shots.length < 30; y += dev.maxChunk, part += 1) {
      const h = Math.min(dev.maxChunk, end - y);
      if (h < 40) break;
      const idx = shots.length;
      const file = `${dev.name}-${String(idx).padStart(2, '0')}.jpg`;
      await page.screenshot({ path: path.join(dir, file), type: 'jpeg', quality: 78, fullPage: true, clip: { x: 0, y, width, height: h } });
      shots.push({ device: dev.name, idx, label: part ? `${s.label} (cd.)` : s.label, file,
        width: Math.round(width * dev.deviceScaleFactor), height: Math.round(h * dev.deviceScaleFactor) });
    }
  }
  await ctx.close();
  return shots;
}

(async () => {
  let browser;
  try {
    const { chromium } = require('playwright');
    browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const shots = [];
    for (const dev of DEVICES) shots.push(...await shootDevice(browser, dev));
    await send({ type: 'done', roundId: Number(roundId), shots });
  } catch (err) {
    await send({ type: 'error', error: /Executable doesn't exist|browserType\.launch/i.test(err.message)
      ? 'na serwerze brakuje przeglądarki do zrzutów' : err.message.split('\n')[0] });
  } finally {
    await browser?.close().catch(() => {});
    process.exit(0);
  }
})();
