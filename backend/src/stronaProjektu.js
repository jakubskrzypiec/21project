'use strict';
/**
 * Strona projektu widziana przez klienta (link /projekt/<token>, bez logowania).
 * Pokazuje etap i termin, zrzuty sekcji z ostatniej rundy, pozwala rysować po nich
 * i pisać poprawki. Wersja robocza zapisuje się w przeglądarce, żeby klient nie
 * stracił pracy przy przypadkowym zamknięciu karty.
 */
const esc = (t) => String(t == null ? '' : t)
  .replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ETAPY = [['brief', 'Brief'], ['projekt', 'Projekt'], ['wdrozenie', 'Kodowanie'], ['testy', 'Testy i poprawki'], ['live', 'Strona online']];

const STYL = `
:root{--bg:#040605;--card:#0d0f0e;--line:rgba(255,255,255,.11);--ink:#fff;--ink2:#cfd2d0;--ink3:#8c918f;--red:#ff453a;--ok:#6ec89b}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 'General Sans',Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
body::before{content:'';position:fixed;inset:auto -20% -45% -20%;height:80vh;z-index:-1;pointer-events:none;
  background:radial-gradient(55% 60% at 30% 100%,rgba(255,255,255,.09),transparent 70%)}
.wrap{max-width:1100px;margin:0 auto;padding:clamp(20px,4vw,56px) 16px 140px}
.brand{font-weight:600;letter-spacing:-.02em;margin-bottom:34px;color:var(--ink2)}
h1{margin:0 0 6px;font-weight:500;letter-spacing:-.045em;line-height:1.02;font-size:clamp(34px,6vw,60px)}
.meta{color:var(--ink3);margin:0 0 26px}
.card{background:rgba(255,255,255,.035);border:1px solid var(--line);border-radius:22px;padding:22px 24px;margin:0 0 16px}
.kick{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);margin:0 0 12px}
.steps{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.step{height:6px;border-radius:99px;background:rgba(255,255,255,.12)}
.step.on{background:#fff}
.stepNames{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:10px;font-size:12.5px;color:var(--ink3)}
.stepNames .on{color:#fff;font-weight:500}
.note{white-space:pre-wrap;color:var(--ink2);margin:0}
.how{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:0 0 26px}
.how div{border:1px solid var(--line);border-radius:16px;padding:14px 16px;font-size:14px;color:var(--ink2)}
.how b{display:block;color:#fff;font-weight:500;margin-bottom:2px}
.devices{display:inline-flex;gap:4px;padding:4px;border:1px solid var(--line);border-radius:99px;margin:6px 0 18px}
.devices button{border:0;background:none;color:var(--ink3);padding:8px 16px;border-radius:99px;font:inherit;font-size:14px;cursor:pointer}
.devices button.on{background:#fff;color:#000}
.shot{margin:0 0 26px}
.shot__head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 10px}
.shot__title{font-weight:500;font-size:18px;letter-spacing:-.02em}
.tools{display:flex;gap:4px;flex-wrap:wrap}
.tools button{border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--ink2);border-radius:99px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer}
.tools button.on{background:#fff;color:#000;border-color:#fff}
.stage{position:relative;border-radius:16px;overflow:hidden;border:1px solid var(--line);background:#111;line-height:0}
.shot--telefon .stage{max-width:420px;margin:0 auto}
.stage img{width:100%;height:auto;display:block;user-select:none;-webkit-user-drag:none}
.stage canvas,.stage svg{position:absolute;inset:0;width:100%;height:100%}
.stage canvas{touch-action:pan-y}
.stage.drawing canvas{touch-action:none;cursor:crosshair}
textarea{width:100%;min-height:84px;margin-top:10px;padding:12px 14px;border-radius:14px;border:1px solid var(--line);background:rgba(255,255,255,.04);
  color:#fff;font:inherit;font-size:15px;resize:vertical}
textarea:focus{outline:0;border-color:rgba(255,255,255,.35)}
.prev{margin-top:10px;display:grid;gap:6px}
.prev div{font-size:13.5px;color:var(--ink2);border-left:2px solid var(--line);padding:2px 0 2px 10px;white-space:pre-wrap}
.chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:99px;margin-right:6px;background:rgba(255,255,255,.1);color:var(--ink2)}
.chip.ok{background:rgba(110,200,155,.15);color:var(--ok)}
.bar{position:fixed;left:0;right:0;bottom:0;padding:12px 16px calc(12px + env(safe-area-inset-bottom));background:rgba(4,6,5,.86);backdrop-filter:blur(12px);
  border-top:1px solid var(--line);display:flex;justify-content:center}
.bar__in{width:min(1100px,100%);display:flex;align-items:center;justify-content:space-between;gap:12px}
.bar__info{color:var(--ink3);font-size:14px}
.btn{border:0;border-radius:99px;background:#fff;color:#000;padding:13px 26px;font:inherit;font-weight:500;cursor:pointer;transition:transform .15s}
.btn:active{transform:scale(.96)}
.btn:disabled{opacity:.45;cursor:not-allowed}
.empty{color:var(--ink3);text-align:center;padding:40px 0}
.thanks{text-align:center;padding:30px 10px}
.thanks h2{font-weight:500;letter-spacing:-.03em;font-size:30px;margin:0 0 6px}
@media (max-width:700px){.how{grid-template-columns:1fr}.stepNames{font-size:10.5px}.card{padding:18px}}
@keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.wrap>*{animation:rise .6s cubic-bezier(.2,.8,.2,1) both}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
`;

/* Skrypt strony klienta — zwykły JS, bez bibliotek. */
const SKRYPT = String.raw`
const D = JSON.parse(document.getElementById('dane').textContent);
const KEY = 'p21-poprawki-' + D.token;
const RED = '#ff453a';
let draft = {};
try { draft = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch {}
draft.shots = draft.shots || {}; draft.general = draft.general || '';
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(draft)); } catch {} ; info(); };
const $ = (s, r = document) => r.querySelector(s);
const coarse = matchMedia('(pointer:coarse)').matches;

function strokeSvg(st, w) {
  const p = st.pts;
  if (st.tool === 'pen') return '<polyline points="' + p.map((q) => q.join(',')).join(' ') + '" fill="none" stroke="' + RED + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"/>';
  const [a, b] = [p[0], p[p.length - 1]];
  if (st.tool === 'rect') return '<rect x="' + Math.min(a[0], b[0]) + '" y="' + Math.min(a[1], b[1]) + '" width="' + Math.abs(b[0] - a[0]) + '" height="' + Math.abs(b[1] - a[1]) + '" fill="none" stroke="' + RED + '" stroke-width="' + w + '" rx="' + w + '"/>';
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]); const L = w * 5;
  const h1 = [b[0] - L * Math.cos(ang - 0.5), b[1] - L * Math.sin(ang - 0.5)];
  const h2 = [b[0] - L * Math.cos(ang + 0.5), b[1] - L * Math.sin(ang + 0.5)];
  return '<g stroke="' + RED + '" stroke-width="' + w + '" stroke-linecap="round" fill="none"><line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"/><polyline points="' + h1.join(',') + ' ' + b.join(',') + ' ' + h2.join(',') + '"/></g>';
}

function shotCard(s) {
  const prev = D.feedback.filter((f) => f.shot_id === s.id);
  const el = document.createElement('section');
  el.className = 'shot shot--' + s.device;
  el.innerHTML = '<div class="shot__head"><div class="shot__title"></div><div class="tools">'
    + '<button data-t="pen">✏️ Pisak</button><button data-t="rect">▭ Ramka</button><button data-t="arrow">↗ Strzałka</button>'
    + (coarse ? '<button data-t="none">✋ Przewijaj</button>' : '') + '<button data-u>Cofnij</button><button data-c>Wyczyść</button></div></div>'
    + '<div class="stage"><img alt="" loading="lazy" width="' + s.width + '" height="' + s.height + '"><svg viewBox="0 0 ' + s.width + ' ' + s.height + '" preserveAspectRatio="none"></svg><canvas></canvas></div>'
    + '<textarea placeholder="Co zmienić w tej sekcji? Np. „inne zdjęcie”, „większy napis”, „dodać numer telefonu”"></textarea>'
    + (prev.length ? '<div class="prev">' + prev.map((f) => '<div><span class="chip ' + (f.status === 'poprawione' ? 'ok' : '') + '">' + (f.status === 'poprawione' ? 'poprawione' : 'wysłane') + '</span></div>').join('') + '</div>' : '');
  el.querySelector('.shot__title').textContent = s.label || ('Sekcja ' + (s.idx + 1));
  prev.forEach((f, i) => { const d = el.querySelectorAll('.prev div')[i]; d.append(document.createTextNode(f.text || '(zaznaczenie na zrzucie)')); });
  const img = el.querySelector('img'); img.src = D.base + '/zrzut/' + s.id;
  const svg = el.querySelector('svg'); const cv = el.querySelector('canvas'); const stage = el.querySelector('.stage');
  const ta = el.querySelector('textarea');
  const st = draft.shots[s.id] = draft.shots[s.id] || { text: '', strokes: [] };
  ta.value = st.text || '';
  ta.oninput = () => { st.text = ta.value; save(); };
  const W = Math.max(3, Math.round(s.width / 260));
  // Wcześniejsze zaznaczenia na szaro, bieżące na czerwono.
  const old = prev.filter((f) => f.drawing).map((f) => f.drawing.map((x) => strokeSvg(x, W)).join('')).join('');
  const draw = (extra) => { svg.innerHTML = (old ? '<g opacity=".35">' + old + '</g>' : '') + st.strokes.concat(extra ? [extra] : []).map((x) => strokeSvg(x, W)).join(''); };
  draw();
  let tool = coarse ? 'none' : 'pen';
  const setTool = (t) => { tool = t; el.querySelectorAll('[data-t]').forEach((b) => b.classList.toggle('on', b.dataset.t === t)); stage.classList.toggle('drawing', t !== 'none'); };
  setTool(tool);
  el.querySelectorAll('[data-t]').forEach((b) => { b.onclick = () => setTool(b.dataset.t); });
  el.querySelector('[data-u]').onclick = () => { st.strokes.pop(); draw(); save(); };
  el.querySelector('[data-c]').onclick = () => { if (st.strokes.length && confirm('Wyczyścić rysunki w tej sekcji?')) { st.strokes = []; draw(); save(); } };
  const pt = (e) => { const r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) * s.width / r.width), Math.round((e.clientY - r.top) * s.height / r.height)]; };
  let cur = null;
  cv.addEventListener('pointerdown', (e) => {
    if (tool === 'none') return;
    e.preventDefault(); cv.setPointerCapture(e.pointerId);
    cur = { tool, pts: [pt(e)] };
  });
  cv.addEventListener('pointermove', (e) => {
    if (!cur) return;
    const p = pt(e);
    if (cur.tool === 'pen') { const l = cur.pts[cur.pts.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) > W) cur.pts.push(p); }
    else cur.pts[1] = p;
    draw(cur);
  });
  const end = () => { if (!cur) return; if (cur.tool === 'pen' || cur.pts.length > 1) st.strokes.push(cur); cur = null; draw(); save(); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  return el;
}

function info() {
  const n = Object.values(draft.shots).filter((x) => (x.text || '').trim() || (x.strokes || []).length).length + ((draft.general || '').trim() ? 1 : 0);
  const i = $('#info'); if (i) i.textContent = n ? 'Poprawki w ' + n + (n === 1 ? ' miejscu' : ' miejscach') + ' — zapisane w tej przeglądarce' : 'Zaznacz coś na zrzucie albo dopisz komentarz';
  const b = $('#send'); if (b) b.disabled = !n;
}

function render(device) {
  const box = $('#shots'); box.innerHTML = '';
  D.shots.filter((s) => s.device === device).forEach((s) => box.append(shotCard(s)));
  document.querySelectorAll('.devices button').forEach((b) => b.classList.toggle('on', b.dataset.d === device));
}

if (D.shots.length) {
  document.querySelectorAll('.devices button').forEach((b) => { b.onclick = () => render(b.dataset.d); });
  render('komputer');
  const g = $('#general'); g.value = draft.general; g.oninput = () => { draft.general = g.value; save(); };
  info();
  $('#send').onclick = async () => {
    const btn = $('#send'); btn.disabled = true; btn.textContent = 'Wysyłam…';
    const items = Object.entries(draft.shots).map(([id, x]) => ({ shot_id: Number(id), text: x.text, drawing: x.strokes }))
      .filter((x) => (x.text || '').trim() || (x.drawing || []).length);
    try {
      const r = await fetch(D.base + '/poprawki', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items, general: draft.general }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Nie udało się wysłać.');
      try { localStorage.removeItem(KEY); } catch {}
      document.querySelector('main').innerHTML = '<div class="card thanks"><h2>Dziękuję, poprawki dotarły.</h2><p class="meta">Dostałem powiadomienie. Po wprowadzeniu zmian zobaczysz tutaj nową wersję, a przy Twoich uwagach pojawi się „poprawione”.</p></div>';
      $('.bar').remove(); scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { alert(err.message); btn.disabled = false; btn.textContent = 'Wyślij poprawki'; }
  };
}
`;

function stronaProjektu(project, rounds, { base, token }) {
  const round = rounds.find((r) => r.status === 'gotowe') || null;
  const etap = ETAPY.findIndex(([k]) => k === project.status);
  const wstrzymany = project.status === 'wstrzymany';
  const allFeedback = round ? round.feedback : [];
  const dane = {
    token, base,
    shots: round ? round.shots : [],
    feedback: allFeedback.filter((f) => f.shot_id).map((f) => ({ shot_id: f.shot_id, text: f.text, status: f.status, drawing: f.drawing })),
  };
  const general = allFeedback.filter((f) => !f.shot_id);
  const json = JSON.stringify(dane).replace(/</g, '\\u003c');
  const termin = project.deadline ? new Date(project.deadline).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const hasMobile = dane.shots.some((s) => s.device === 'telefon');

  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${esc(project.name)} · 21 project</title>
<link rel="preload" href="/admin/assets/general-sans-500.woff2" as="font" type="font/woff2" crossorigin>
<style>@font-face{font-family:'General Sans';src:url('/admin/assets/general-sans-400.woff2') format('woff2');font-weight:400;font-display:swap}
@font-face{font-family:'General Sans';src:url('/admin/assets/general-sans-500.woff2') format('woff2');font-weight:500 700;font-display:swap}${STYL}</style></head>
<body><main class="wrap">
  <div class="brand">21 project</div>
  <h1>${esc(project.name)}</h1>
  <p class="meta">${esc(project.client || '')}${project.client && termin ? ' · ' : ''}${termin ? `planowane zakończenie: ${esc(termin)}` : ''}</p>

  <div class="card">
    <p class="kick">Etap projektu${wstrzymany ? ' · wstrzymany' : ''}</p>
    <div class="steps">${ETAPY.map((_, i) => `<div class="step ${i <= etap ? 'on' : ''}"></div>`).join('')}</div>
    <div class="stepNames">${ETAPY.map(([, n], i) => `<span class="${i === etap ? 'on' : ''}">${n}</span>`).join('')}</div>
  </div>
  ${project.client_note ? `<div class="card"><p class="kick">Od Jakuba</p><p class="note">${esc(project.client_note)}</p></div>` : ''}

  ${round ? `
  <div class="how">
    <div><b>1. Zaznacz</b>Rysuj po zrzucie pisakiem, ramką albo strzałką.</div>
    <div><b>2. Opisz</b>Pod każdą sekcją napisz, co zmienić.</div>
    <div><b>3. Wyślij</b>Jednym przyciskiem na dole. Wersja robocza zapisuje się sama.</div>
  </div>
  <p class="kick">Wersja ${round.no} · ${esc(new Date(round.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' }))}</p>
  ${hasMobile ? '<div class="devices"><button data-d="komputer">Komputer</button><button data-d="telefon">Telefon</button></div>' : ''}
  <div id="shots"></div>
  <div class="card">
    <p class="kick">Uwagi ogólne</p>
    ${general.length ? `<div class="prev" style="margin:0 0 6px">${general.map((f) => `<div><span class="chip ${f.status === 'poprawione' ? 'ok' : ''}">${f.status === 'poprawione' ? 'poprawione' : 'wysłane'}</span>${esc(f.text)}</div>`).join('')}</div>` : ''}
    <textarea id="general" placeholder="Wszystko, co nie dotyczy jednej sekcji: kolory, teksty, zdjęcia do podmiany…"></textarea>
  </div>` : '<div class="card empty">Pierwsza wersja do obejrzenia pojawi się tutaj wkrótce. Wyślę Ci wiadomość, kiedy będzie gotowa.</div>'}
</main>
${round ? '<div class="bar"><div class="bar__in"><span class="bar__info" id="info"></span><button class="btn" id="send" disabled>Wyślij poprawki</button></div></div>' : ''}
<script type="application/json" id="dane">${json}</script>
<script>${SKRYPT}</script>
</body></html>`;
}

module.exports = { stronaProjektu };
