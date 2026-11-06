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

  function renderSlots(key) {
    var box = $('bk-slots');
    box.innerHTML = '';
    Array.prototype.forEach.call($('bk-days').children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.day === key)); });
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

  fetch(API + '/api/booking/slots').then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || 'Błąd'); return d; }); })
    .then(function (d) {
      if (!d.enabled || !d.slots.length) { fail('Na razie nie ma wolnych terminów. Napisz na jakubskrzypiec.dev@gmail.com, a ustalimy go mailowo.'); return; }
      d.slots.forEach(function (s) { (byDay[dayKey(s.start)] = byDay[dayKey(s.start)] || []).push(s); });
      $('bk-status').textContent = 'Wybierz dzień i godzinę. Rozmowa trwa ok. ' + d.slotMinutes + ' minut.';
      var days = $('bk-days');
      Object.keys(byDay).forEach(function (key, i) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'bk-day'; b.dataset.day = key;
        b.innerHTML = '<span></span><small></small>';
        b.firstChild.textContent = fmtDay(byDay[key][0].start);
        b.lastChild.textContent = fmtDate(byDay[key][0].start);
        b.onclick = function () { renderSlots(key); };
        days.appendChild(b);
        if (i === 0) renderSlots(key);
      });
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
