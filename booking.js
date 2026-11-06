/* Rezerwacja rozmowy na Google Meet (21project.pl/spotkanie/).
   Wolne terminy i zapis rezerwacji obsługuje panel 21 project. */
(function () {
  var script = document.currentScript;
  var API = (script && script.dataset.endpoint || 'https://panel.21project.pl').replace(/\/$/, '');
  var $ = function (id) { return document.getElementById(id); };
  var TZ = 'Europe/Warsaw';
  var dayKey = function (iso) { return new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ }); };
  var fmtDay = function (iso) { return new Date(iso).toLocaleDateString('pl-PL', { timeZone: TZ, weekday: 'long' }); };
  var fmtDate = function (iso) { return new Date(iso).toLocaleDateString('pl-PL', { timeZone: TZ, day: 'numeric', month: 'long' }); };
  var fmtTime = function (iso) { return new Date(iso).toLocaleTimeString('pl-PL', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }); };
  var chosen = null;
  var byDay = {};

  function fail(msg) { $('bk-status').textContent = msg; }

  var keyToParts = function (k) { var a = k.split('-'); return { y: +a[0], m: +a[1], d: +a[2] }; };
  var todayKey = dayKey(new Date().toISOString());
  var view = null;     // { y, m } — wyświetlany miesiąc
  var minView = null;
  var maxView = null;
  var selectedDay = null;

  function renderSlots(key) {
    selectedDay = key;
    var box = $('bk-slots');
    box.innerHTML = '';
    renderMonth();
    var t = $('bk-daytitle');
    t.hidden = false;
    t.textContent = fmtDay(byDay[key][0].start) + ', ' + fmtDate(byDay[key][0].start) + ' · wybierz godzinę';
    byDay[key].forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'bk-slot'; b.textContent = fmtTime(s.start); b.setAttribute('aria-pressed', 'false');
      b.onclick = function () {
        chosen = s;
        Array.prototype.forEach.call(box.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        $('bk-chosen').textContent = 'Wybrany termin: ' + fmtDay(s.start) + ', ' + fmtDate(s.start) + ', godz. ' + fmtTime(s.start) + '.';
        $('bk-form').hidden = false;
        $('bk-name').focus();
      };
      box.appendChild(b);
    });
  }

  /** Kratka miesiąca: od poniedziałku, dni z wolnymi terminami można kliknąć. */
  function renderMonth() {
    var grid = $('bk-grid');
    grid.innerHTML = '';
    ['pn', 'wt', 'śr', 'cz', 'pt', 'sb', 'nd'].forEach(function (d) {
      var h = document.createElement('div'); h.className = 'bk-wd'; h.textContent = d; grid.appendChild(h);
    });
    var first = new Date(Date.UTC(view.y, view.m - 1, 1));
    var lead = (first.getUTCDay() + 6) % 7;
    var days = new Date(Date.UTC(view.y, view.m, 0)).getUTCDate();
    for (var i = 0; i < lead; i++) { var e = document.createElement('div'); e.className = 'bk-cell empty'; grid.appendChild(e); }
    for (var d = 1; d <= days; d++) {
      var key = view.y + '-' + String(view.m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      var free = Boolean(byDay[key]);
      var c = document.createElement(free ? 'button' : 'div');
      c.className = 'bk-cell' + (free ? ' free' : '') + (key === todayKey ? ' today' : '');
      c.textContent = String(d);
      if (free) {
        c.type = 'button';
        c.setAttribute('aria-pressed', String(key === selectedDay));
        c.setAttribute('aria-label', fmtDay(byDay[key][0].start) + ', ' + fmtDate(byDay[key][0].start) + ': ' + byDay[key].length + ' wolnych terminów');
        (function (k) { c.onclick = function () { renderSlots(k); }; })(key);
      }
      grid.appendChild(c);
    }
    $('bk-month').textContent = first.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    var idx = function (v) { return v.y * 12 + v.m; };
    $('bk-prev').disabled = idx(view) <= idx(minView);
    $('bk-next').disabled = idx(view) >= idx(maxView);
  }

  function shift(n) {
    var t = view.y * 12 + (view.m - 1) + n;
    view = { y: Math.floor(t / 12), m: (t % 12) + 1 };
    renderMonth();
  }

  fetch(API + '/api/booking/slots').then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || 'Błąd'); return d; }); })
    .then(function (d) {
      if (!d.enabled || !d.slots.length) { fail('Na razie nie ma wolnych terminów. Napisz na jakubskrzypiec.dev@gmail.com, a ustalimy go mailowo.'); return; }
      d.slots.forEach(function (s) { (byDay[dayKey(s.start)] = byDay[dayKey(s.start)] || []).push(s); });
      var keys = Object.keys(byDay).sort();
      var a = keyToParts(keys[0]); var z = keyToParts(keys[keys.length - 1]);
      minView = { y: a.y, m: a.m }; maxView = { y: z.y, m: z.m }; view = { y: a.y, m: a.m };
      $('bk-status').textContent = 'Wybierz dzień w kalendarzu, a potem godzinę. Rozmowa trwa ok. ' + d.slotMinutes + ' minut.';
      $('bk-cal').hidden = false;
      $('bk-prev').onclick = function () { shift(-1); };
      $('bk-next').onclick = function () { shift(1); };
      renderMonth();
    })
    .catch(function (e) { fail(e.message || 'Nie udało się wczytać terminów. Napisz na jakubskrzypiec.dev@gmail.com.'); });

  $('bk-form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!chosen) return;
    var f = e.target;
    // f.name to nazwa formularza, nie pole — dlatego przez f.elements.
    var v = function (n) { return f.elements[n].value; };
    var btn = f.querySelector('button[type=submit]');
    btn.disabled = true; $('bk-msg').textContent = 'Rezerwuję…';
    fetch(API + '/api/booking', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start: chosen.start, name: v('name'), email: v('email'), company: v('company'), phone: v('phone'), topic: v('topic'), website_url: v('website_url') }),
    }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || 'Błąd'); return d; }); })
      .then(function (d) {
        $('bk-pick').hidden = true; f.hidden = true;
        var done = $('bk-done');
        done.hidden = false;
        done.innerHTML = '<h2>Do zobaczenia.</h2><p></p><p class="bk-note"></p>';
        done.children[1].textContent = 'Rozmowa: ' + fmtDay(d.start) + ', ' + fmtDate(d.start) + ', godz. ' + fmtTime(d.start) + ', na Google Meet.';
        done.children[2].textContent = 'Zaproszenie z linkiem do rozmowy przyjdzie na ' + v('email') + '. Gdyby termin przestał pasować, odpowiedz na to zaproszenie.';
      })
      .catch(function (err) { $('bk-msg').textContent = err.message; btn.disabled = false; });
  });
})();
