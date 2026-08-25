/**
 * Podpina formularz kontaktowy 21project.pl pod backend panelu.
 * Wklej na stronie PO motion.js:
 *   <script defer src="https://panel.21project.pl/form-hook.js" data-endpoint="https://panel.21project.pl"></script>
 *
 * Nasłuch jest podpięty do dokumentu w fazie przechwytywania, bo motion.js
 * rejestruje swój nasłuch bezpośrednio na formularzu i — jako wcześniej wczytany —
 * uruchamia się pierwszy. Przechwytywanie na dokumencie wyprzedza nasłuchy elementu.
 *
 * Gdy backend nie odpowiada, oddajemy zdarzenie z powrotem do motion.js,
 * czyli formularz wraca do starego zachowania z mailto. Zapytanie nigdy nie przepada.
 */
(function () {
  var script = document.currentScript;
  var endpoint = (script && script.dataset.endpoint) ||
    (script && script.src.replace(/\/form-hook\.js.*$/, '')) || '';

  // Pułapka na boty — człowiek tego pola nie zobaczy i nie wypełni.
  document.querySelectorAll('form.contactForm').forEach(function (form) {
    if (form.querySelector('[name="website_url"]')) return;
    var trap = document.createElement('input');
    trap.name = 'website_url';
    trap.tabIndex = -1;
    trap.autocomplete = 'off';
    trap.setAttribute('aria-hidden', 'true');
    trap.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0';
    form.append(trap);
  });

  function onSubmit(event) {
    var form = event.target;
    if (!form || !form.classList || !form.classList.contains('contactForm')) return;

    var value = function (name) {
      return form.elements[name] ? String(form.elements[name].value).trim() : '';
    };
    // Puste pola zostawiamy motion.js — ono pokazuje komunikat i ustawia kursor.
    if (!value('name') || !value('contact') || !value('message')) return;

    event.preventDefault();
    event.stopPropagation();

    var note = form.querySelector('.formNote');
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
        date: value('date'), message: value('message'), website_url: value('website_url')
      })
    })
      .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, data: d }; }); })
      .then(function (r) {
        if (!r.ok) throw new Error(r.data && r.data.error);
        form.reset();
        if (note) {
          note.textContent = (r.data && r.data.message) || 'Dziękuję — odezwę się najszybciej, jak się da.';
          note.classList.add('isOk');
        }
        // Zdarzenie form_submit liczy już t.js na poziomie dokumentu — drugie
        // wywołanie zawyżałoby konwersję dwukrotnie.
        if (button) button.disabled = false;
      })
      .catch(function () {
        // Awaria panelu: wypinamy się i oddajemy formularz staremu obiegowi (mailto).
        document.removeEventListener('submit', onSubmit, true);
        if (button) button.disabled = false;
        if (form.requestSubmit) form.requestSubmit(); else form.submit();
      });
  }

  document.addEventListener('submit', onSubmit, true);
})();
