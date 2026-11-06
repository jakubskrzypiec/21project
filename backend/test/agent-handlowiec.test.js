'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'p21-agent-test-'));
process.env.ANTHROPIC_API_KEY = 'test';
const { db, init } = require('../src/db');
init();

const siteAudit = require('../src/services/agents/siteAudit');
const sources = require('../src/services/agents/sources');
const writer = require('../src/services/agents/writer');
const core = require('../src/services/agents/core');
const ai = require('../src/services/ai');
const gmail = require('../src/services/gmail');
const google = require('../src/services/google');
const h = require('../src/services/agents/handlowiec');

const OLD_SITE = `<html><head><title>Home</title></head><body>
  <table><tr><td>a</td></tr></table><table></table><table></table>
  <p>Projektujemy wnętrza od 15 lat.</p><a href="/kontakt">Kontakt</a>
  <p>biuro@pracownia.pl, rodo@pracownia.pl</p><p>© 2014 Pracownia</p>
  <span class="material-icons">handshake</span><div style="display:none">ukryty tekst</div>
  <p>Theme by Kriesi © 2023</p></body></html>`;

test('audyt: rok w stopce bez stopek motywów, brak opisu, wersja mobilna, ukryty tekst', () => {
  const a = siteAudit.analyzeHtml(OLD_SITE, { finalUrl: 'http://pracownia.pl/', ms: 800 });
  assert.equal(a.copyrightYear, 2014);
  assert.equal(a.viewport, false);
  assert.equal(a.https, false);
  assert.equal(a.genericTitle, true);
  assert.ok(!a.text.includes('handshake'));
  assert.ok(!a.text.includes('ukryty tekst'));
  const s = siteAudit.score(a, new Date('2026-11-06'));
  assert.equal(s.quality, 'slaba');
  assert.ok(s.reasons.some((r) => r.includes('2014')));
  assert.ok(s.reasons.some((r) => r.includes('„Home”')));
  assert.equal(siteAudit.pickEmail(a.emails, 'pracownia.pl'), 'biuro@pracownia.pl');
});

test('audyt: porządna strona to oferta panelu, nie nowej strony', () => {
  const a = siteAudit.analyzeHtml(`<html><head><title>Studio Lumo - projektowanie wnętrz Kraków</title>
    <meta name="viewport" content="width=device-width"><meta name="description" content="Projektujemy wnętrza mieszkań i domów w Krakowie.">
    </head><body>${'<p>Realizacje i usługi.</p>'.repeat(200)}<footer>© ${new Date().getFullYear()} Studio Lumo</footer></body></html>`,
  { finalUrl: 'https://lumo.pl/', ms: 500 });
  assert.equal(siteAudit.score(a).quality, 'dobra');
});

test('Homebook: nazwa firmy i miasto z tytułu profilu', () => {
  assert.deepEqual(sources.parseHomebookTitle('MUS ARCHITECTS - Architekt / projektant wnętrz KATOWICE - homebook'),
    { company: 'MUS ARCHITECTS', city: 'Katowice' });
  assert.deepEqual(sources.parseHomebookTitle('Ala Studio - Architekt BIELSKO-BIAŁA - homebook').city, 'Bielsko-Biała');
  assert.equal(sources.parseHomebookTitle('m2b - Architekt / projektant wnętrz Kędzierzyn-Koźle - homebook').city, 'Kędzierzyn-Koźle');
  assert.equal(sources.isCompanySite('https://www.facebook.com/firma'), false);
  assert.equal(sources.isCompanySite('https://pracownia.pl'), true);
});

test('kontrola stylu wyłapuje typowe AI-owe zwroty, formę „Ty” i linki', () => {
  const p = writer.styleCheck('Dzień dobry,\n\nMam nadzieję, że ten mail zastaje Cię w dobrym zdrowiu — wiesz, w dzisiejszych czasach! https://21project.pl', 'Temat');
  assert.ok(p.some((x) => x.includes('mam nadzieję')));
  assert.ok(p.some((x) => x.includes('myślniki')));
  assert.ok(p.some((x) => x.includes('wykrzyknik')));
  assert.ok(p.some((x) => x.includes('https')));
  assert.deepEqual(writer.styleCheck('Dzień dobry,\n\nZobaczyłem stronę Państwa pracowni. Czy mogę przesłać projekt pierwszego ekranu?', 'Pracownia Lumo'), []);
  assert.equal(writer.tidy('A — b!'), 'A, b.');
});

test('podział na oferty: dzienne pule i tylko oferty pasujące do strony', () => {
  const s = h.settings();
  assert.equal(h.chooseOffer({ quality: 'dobra' }, s, { panel: 10, pakiet: 2 }), 'pakiet');
  assert.equal(h.chooseOffer({ quality: 'slaba' }, s, { strona: 1, pakiet: 9 }), 'strona');
  assert.equal(h.chooseOffer({ quality: 'slaba' }, s, { strona: 10, pakiet: 10 }), null); // komplet na dziś
  const off = { ...s, offers: { ...s.offers, panel: { ...s.offers.panel, on: false } } };
  assert.equal(h.chooseOffer({ quality: 'dobra' }, off, {}), 'pakiet');
});

test('realizacje wstawia system, a linki w HTML prowadzą wprost na stronę', () => {
  const block = writer.portfolioBlock(writer.DEFAULT_PORTFOLIO, 'panel');
  assert.ok(block.includes('monikaserbista.pl') && block.includes('noreststudio.com'));
  assert.ok(!block.includes('effkoweogrody.pl')); // przy panelu bez Effkowych Ogrodów
  assert.ok(block.endsWith('Więcej realizacji: 21project.pl/realizacje/'));
  const html = gmail.textToHtml('Zobacz 21project.pl/realizacje/. Pisz: biuro@firma.pl');
  assert.ok(html.includes('<a href="https://21project.pl/realizacje/"'));
  assert.ok(html.includes('>21project.pl/realizacje/</a>.'));
  assert.ok(!html.includes('href="https://firma.pl'));
  assert.ok(!html.includes('google.com/url'));
  const raw = Buffer.from(gmail.buildRaw({ to: 'a@b.pl', subject: 'T', body: 'x', html: '<b>x</b>' }), 'base64url').toString();
  assert.ok(raw.includes('multipart/alternative') && raw.includes('text/html') && raw.includes('text/plain'));
});

test('czas lokalny: dzień roboczy i okno wysyłki w strefie Warszawy', () => {
  const l = core.local(new Date('2026-11-06T09:30:00Z'), 'Europe/Warsaw');
  assert.deepEqual([l.day, l.dow, l.hour], ['2026-11-06', 5, 10]);
  const s = h.settings();
  assert.equal(h.inWindow(s, new Date('2026-11-06T09:30:00Z')), true);
  assert.equal(h.inWindow(s, new Date('2026-11-07T09:30:00Z')), false); // sobota
});

test('pełny cykl: szukanie, duplikat z Gmaila, mail, wysyłka, odpowiedź ze szkicem i stop follow-upu', async (t) => {
  const sent = [];
  const drafts = [];
  let aiCalls = 0;
  t.mock.method(google, 'status', () => ({ connected: true, account: 'jakub@21project.pl' }));
  t.mock.method(sources, 'homebookBatch', async () => ({
    candidates: [
      { website: 'https://stara-pracownia.pl', company: 'Stara Pracownia', city: 'Katowice', industry: 'projektowanie wnętrz', source: 'homebook' },
      { website: 'https://juz-pisalismy.pl', company: 'Już Pisaliśmy', city: 'Kraków', industry: 'projektowanie wnętrz', source: 'homebook' },
    ],
    cursor: { combo: 1, page: 0 }, done: true, label: 'test',
  }));
  t.mock.method(siteAudit, 'audit', async (url) => {
    const host = siteAudit.hostOf(url);
    const a = siteAudit.analyzeHtml(OLD_SITE.replaceAll('pracownia.pl', host), { finalUrl: `http://${host}/`, ms: 900 });
    return { ok: true, host, ...a, ...siteAudit.score(a), email: siteAudit.pickEmail(a.emails, host) };
  });
  t.mock.method(gmail, 'anyThread', async (q) => q.includes('juz-pisalismy.pl'));
  t.mock.method(gmail, 'sendMessage', async (m) => { sent.push(m); return { id: `m${sent.length}`, threadId: `t${sent.length}` }; });
  t.mock.method(gmail, 'createDraft', async (d) => { drafts.push(d); return { id: 'd1' }; });
  t.mock.method(ai, 'call', async ({ system }) => {
    aiCalls += 1;
    if (system.includes('Kategorie')) {
      return { text: JSON.stringify({ category: 'pilne', summary: 'Chce wyceny strony.', optOut: false, draft: 'Dziękuję za odpowiedź. Czy pasuje Państwu krótka rozmowa w czwartek?' }), usage: { input_tokens: 100, output_tokens: 50 } };
    }
    // Pierwsza wersja z błędem stylu — agent musi ją poprawić.
    const body = aiCalls === 1
      ? 'Dzień dobry,\n\nW dzisiejszych czasach strona to podstawa!'
      : 'Dzień dobry,\n\nW stopce Państwa strony widnieje rok 2014, a w Google tytuł to tylko „Home”.\n\nKlient z polecenia i tak sprawdza stronę, a coraz częściej pyta ChatGPT, kogo wybrać.\n\n[REALIZACJE]\n\nMogę bezpłatnie przygotować projekt pierwszego ekranu nowej strony.\n\nJeśli byliby Państwo zainteresowani, wystarczy krótka odpowiedź na tego maila.';
    return { text: JSON.stringify({ subject: 'Strona Starej Pracowni', body, angle: 'projekt pierwszego ekranu' }), usage: { input_tokens: 800, output_tokens: 200 } };
  });

  const realNow = Date.now;
  const fixed = Date.parse('2026-11-06T09:00:00Z'); // piątek, 10:00 w Warszawie
  Date.now = () => fixed;
  const RealDate = Date;
  global.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed; } };
  try {
    // Zatrzymany agent przy ręcznym przebiegu niczego nie pisze ani nie wysyła.
    h.saveSettings({ enabled: false });
    const r0 = await h.tick({ force: true });
    assert.equal(r0.written, undefined);
    assert.equal(sent.length, 0);
    h.saveSettings({ enabled: true });
    const r = await h.tick();
    assert.equal(r.written, 1, JSON.stringify(r));
    const skipped = db.prepare("SELECT agent_note FROM leads WHERE domain='juz-pisalismy.pl'").get();
    assert.equal(skipped.agent_note, 'już była korespondencja w Gmailu');
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, 'biuro@stara-pracownia.pl');
    assert.ok(sent[0].body.endsWith('wystarczy odpisać „nie”.'));
    assert.ok(sent[0].body.includes('Pozdrawiam\n21 Project\n21project.pl'));
    assert.ok(!/[—!]/.test(sent[0].body));
    const msg = db.prepare("SELECT * FROM outreach WHERE agent='handlowiec' AND kind='first'").get();
    assert.equal(msg.status, 'sent');
    assert.ok(['strona', 'pakiet'].includes(msg.offer));
    assert.ok(['projekt', 'audyt'].includes(msg.hook));
    assert.ok(msg.body.includes('Kilka moich realizacji:\nmonikaserbista.pl'));
    assert.ok(sent[0].html.includes('href="https://21project.pl/realizacje/"'));

    // Następny przebieg nie wysyła od razu: odstęp między mailami.
    const r2 = await h.tick();
    assert.equal(r2.sent, null);

    // Odpowiedź firmy: klasyfikacja, szkic w wątku, lead „replied”, follow-up już nie powstanie.
    t.mock.method(gmail, 'getThreadMeta', async () => [
      { id: 'm1', from: 'Jakub <jakub@21project.pl>', internalDate: fixed, messageId: '<a@x>' },
      { id: 'r1', from: 'Anna <biuro@stara-pracownia.pl>', internalDate: fixed + 3600000, messageId: '<b@x>', snippet: 'Poproszę wycenę' },
    ]);
    t.mock.method(gmail, 'getThread', async () => ({ messages: [
      { from: 'jakub@21project.pl', date: '', body: msg.body, messageId: '<a@x>' },
      { from: 'biuro@stara-pracownia.pl', date: '', body: 'Poproszę wycenę', messageId: '<b@x>' },
    ] }));
    t.mock.method(gmail, 'listThreads', async () => ({ threads: [] }));
    const rr = await h.checkReplies(h.settings());
    assert.equal(rr.found, 1);
    const reply = db.prepare('SELECT * FROM agent_replies').get();
    assert.equal(reply.category, 'pilne');
    assert.equal(drafts[0].threadId, 't1');
    assert.equal(drafts[0].inReplyTo, '<b@x>');
    assert.equal(db.prepare('SELECT status FROM leads WHERE id=?').get(msg.lead_id).status, 'replied');

    const st = h.stats();
    assert.equal(st.allTime.sent, 1);
    assert.equal(st.allTime.positive, 1);
    assert.ok(st.usage.calls >= 3);
  } finally {
    global.Date = RealDate;
    Date.now = realNow;
  }
});
