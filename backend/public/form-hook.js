/**
 * Podpina formularz kontaktowy 21project.pl pod backend panelu.
 * Wklej na stronie PO motion.js:
 *   <script defer src="https://panel.21project.pl/form-hook.js" data-endpoint="https://panel.21project.pl"></script>
 * Gdy backend nie odpowiada, formularz wraca do starego zachowania (mailto),
 * więc zapytanie nigdy nie przepada.
 */
(function () {
  var script = document.currentScript;
  var endpoint = (script && script.dataset.endpoint) ||
    (script && script.src.replace(/\/form-hook\.js.*$/, '')) || '';

  document.querySelectorAll('form.contactForm').forEach(function (form) {
    // Pułapka na boty — człowiek tego pola nie zobaczy i nie wypełni.
    if (!form.querySelector('[name="website_url"]')) {
      var trap = document.createElement('input');
      trap.name = 'website_url';
      trap.tabIndex = -1;
      trap.autocomplete = 'off';
      trap.setAttribute('aria-hidden', 'true');
      trap.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0';
      form.append(trap);
    }

    form.addEventListener('submit', function (event) {
      var note = form.querySelector('.formNote');
      var value = function (name) {
        return form.elements[name] ? String(form.elements[name].value).trim() : '';
      };
      if (!value('name') || !value('contact') || !value('message')) return; // walidację robi motion.js

      event.preventDefault();
      event.stopImmediatePropagation();

      var button = form.querySelector('button[type="submit"]');
      if (button) button.disabled = true;
      if (note) {
        note.textContent = 'Wysyłam zapytanie…';
        note.classList.remove('isOk');
      }

      fetch(endpoint + '/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: value('name'), contact: value('contact'), plan: value('plan'),
          date: value('date'), message: value('message'), website_url: value('website_url'),
        }),
      })
        .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, d: d }; }); })
        .then(function (r) {
          if (!r.ok) throw new Error(r.d.error || 'Nie udało się wysłać.');
          form.reset();
          if (note) {
            note.textContent = r.d.message || 'Dziękuję — odezwę się najszybciej, jak się da.';
            note.classList.add('isOk');
          }
          if (window.p21) window.p21.event('form_submit');
          if (button) button.disabled = false;
        })
        .catch(function () {
          // Awaria backendu: wracamy do wysyłki mailem, żeby nic nie zginęło.
          if (note) note.textContent = 'Otwieram Twój program pocztowy z gotową wiadomością…';
          if (button) button.disabled = false;
          form.submit();
        });
    }, true);
  });
})();
