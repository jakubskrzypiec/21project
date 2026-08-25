/* =========================================================
   21 project — assets/js/script.js
   ========================================================= */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  /* Bezpiecznik odsłaniający treść. Świadomie POZA ready(): gdy jakiś skrypt
     zewnętrzny się nie wczytuje, DOMContentLoaded potrafi się opóźnić o sekundy,
     a wtedy bezpiecznik w środku ready() też by czekał. Pusta strona jest
     gorsza niż strona bez animacji. */
  window.setTimeout(function () {
    [].slice.call(document.querySelectorAll('.reveal:not(.is-in)')).forEach(function (el) {
      el.classList.add('is-in');
    });
  }, 3000);

  ready(function () {

    /* Ujednolicone reveal na wszystkich podstronach / case studies. */
    var autoRevealSelectors = [
      '.cs-hero .shell > *',
      '.cs-nav__item',
      '.cs-cta .shell > *',
      '.footer__inner > *',
      '.footer__bottom > *',
      '.legal > *'
    ];
    autoRevealSelectors.forEach(function (selector) {
      [].slice.call(document.querySelectorAll(selector)).forEach(function (el) {
        if (!el.classList.contains('reveal')) el.classList.add('reveal');
      });
    });

    /* ---------------------------------------------------
       1. Wejście hero — sekwencja
       --------------------------------------------------- */
    var hero = document.getElementById('hero');
    if (hero) {
      // start dopiero gdy fonty gotowe, żeby tekst nie „skakał”
      var start = function () { raf(function () { hero.classList.add('is-ready'); }); };
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(start);
        setTimeout(start, 900);            // bezpiecznik
      } else { start(); }
    }

    /* ---------------------------------------------------
       2. Nagłówki — reveal linia po linii
       --------------------------------------------------- */
    function splitLines(el) {
      if (el.dataset.split === 'done') return;
      var text = el.textContent.replace(/\s+/g, ' ').trim();
      var words = text.split(' ');
      el.textContent = '';

      var probe = [];
      words.forEach(function (w, i) {
        var s = document.createElement('span');
        s.className = 'w';
        s.textContent = w + (i < words.length - 1 ? ' ' : '');
        el.appendChild(s);
        probe.push(s);
      });

      // grupowanie po pozycji pionowej
      var lines = [], cur = null, top = null;
      probe.forEach(function (s) {
        var t = Math.round(s.offsetTop);
        if (top === null || Math.abs(t - top) > 4) { cur = []; lines.push(cur); top = t; }
        cur.push(s);
      });

      el.textContent = '';
      lines.forEach(function (group, i) {
        var ln = document.createElement('span');
        ln.className = 'ln';
        var inner = document.createElement('span');
        inner.style.transitionDelay = (i * 85) + 'ms';
        group.forEach(function (s) { inner.appendChild(document.createTextNode(s.textContent)); });
        ln.appendChild(inner);
        el.appendChild(ln);
      });
      el.dataset.split = 'done';
    }

    var headings = [].slice.call(document.querySelectorAll('h2, .case__info h3'));
    if (!reduce) {
      headings.forEach(splitLines);
      window.addEventListener('resize', debounce(function () {
        headings.forEach(function (h) {
          h.dataset.split = '';
          h.textContent = h.textContent;   // scal z powrotem
          splitLines(h);
          if (h.classList.contains('is-in')) h.classList.add('is-in');
        });
      }, 260));
    }

    /* ---------------------------------------------------
       3. Reveal przy scrollu
       --------------------------------------------------- */
    var items = [].slice.call(document.querySelectorAll('.reveal, h2, .case__info h3'));

    if ('IntersectionObserver' in window && !reduce) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var el = e.target;
          var sibs = [].slice.call(el.parentElement ? el.parentElement.children : [])
            .filter(function (n) { return n.classList.contains('reveal'); });
          var i = Math.max(0, Math.min(sibs.indexOf(el), 5));
          el.style.transitionDelay = (i * 90) + 'ms';
          el.classList.add('is-in');
          io.unobserve(el);
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -9% 0px' });
      items.forEach(function (el) { io.observe(el); });

      // bezpiecznik: nic nie może zostać trwale ukryte przez maskę
      setTimeout(function () {
        items.forEach(function (el) {
          var r = el.getBoundingClientRect();
          if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-in');
        });
      }, 2500);
    } else {
      items.forEach(function (el) { el.classList.add('is-in'); });
    }

    /* ---------------------------------------------------
       4. Parallax: hero + zrzuty realizacji
       --------------------------------------------------- */
    var media = document.querySelector('[data-hero-media]');
    var copy = document.querySelector('[data-hero-copy]');
    var shots = [].slice.call(document.querySelectorAll('.browser img, .phone'));
    var bar = document.querySelector('.progress span');
    var header = document.querySelector('.header');
    var ticking = false;

    function frame() {
      ticking = false;
      var y = window.pageYOffset || document.documentElement.scrollTop;
      var vh = window.innerHeight;

      if (header) header.classList.toggle('is-stuck', y > 20);

      if (bar) {
        var max = document.documentElement.scrollHeight - vh;
        bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
      }

      if (reduce) return;

      if (media && y < vh * 1.2) {
        media.style.transform = 'translate3d(-50%,calc(-50% + ' + (y * 0.16) + 'px),0)';
      }
      if (copy && y < vh) {
        var p = Math.min(y / (vh * 0.75), 1);
        copy.style.opacity = String(1 - p);
        copy.style.transform = 'translate3d(0,' + (y * 0.24) + 'px,0)';
      }

      shots.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -120 || r.top > vh + 120) return;
        var mid = (r.top + r.height / 2 - vh / 2) / vh;   // -1 .. 1
        var amt = el.classList.contains('phone') ? -26 : -18;
        el.style.transform = 'translate3d(0,' + (mid * amt) + 'px,0)';
      });
    }

    function onScroll() { if (!ticking) { ticking = true; raf(frame); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    frame();

    /* ---------------------------------------------------
       5. Liczniki
       --------------------------------------------------- */
    var stats = [].slice.call(document.querySelectorAll('[data-count]'));
    if (stats.length && 'IntersectionObserver' in window) {
      var so = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var el = e.target;
          so.unobserve(el);
          var end = parseFloat(el.dataset.count);
          if (reduce) { el.textContent = String(end); return; }
          var t0 = null, dur = 1300;
          (function step(t) {
            if (!t0) t0 = t;
            var p = Math.min((t - t0) / dur, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = String(Math.round(end * eased));
            if (p < 1) raf(step);
          })(performance.now ? performance.now() : Date.now());
        });
      }, { threshold: 0.5 });
      stats.forEach(function (el) { so.observe(el); });
    }

    /* ---------------------------------------------------
       5b. Proces — podświetlanie aktywnego kroku
       --------------------------------------------------- */
    var steps = [].slice.call(document.querySelectorAll('[data-step]'));
    if (steps.length && 'IntersectionObserver' in window) {
      var po = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          e.target.classList.toggle('is-active', e.isIntersecting);
        });
      }, { threshold: 0.45, rootMargin: '-12% 0px -22% 0px' });
      steps.forEach(function (el) { po.observe(el); });
    } else {
      steps.forEach(function (el) { el.classList.add('is-active'); });
    }

    /* ---------------------------------------------------
       6. Menu mobilne
       --------------------------------------------------- */
    /* Menu telefonowe — ten sam pasek i ten sam mechanizm co na pozostałych
       podstronach; wcześniej realizacje miały własny, rozwijany nav. */
    var burger = document.querySelector('.burger');
    var menu = document.getElementById('mobileMenu');

    if (burger && menu) {
      var setMenu = function (open) {
        burger.setAttribute('aria-expanded', String(open));
        burger.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otw\u00f3rz menu');
        document.body.classList.toggle('menuOpen', open);
        if (open) {
          menu.hidden = false;
          window.requestAnimationFrame(function () { menu.classList.add('isOpen'); });
        } else {
          menu.classList.remove('isOpen');
          window.setTimeout(function () {
            if (!menu.classList.contains('isOpen')) menu.hidden = true;
          }, 340);
        }
      };

      burger.addEventListener('click', function () {
        setMenu(burger.getAttribute('aria-expanded') !== 'true');
      });
      Array.prototype.forEach.call(menu.querySelectorAll('a'), function (link) {
        link.addEventListener('click', function () { setMenu(false); });
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') setMenu(false);
      });
      window.addEventListener('resize', function () {
        if (window.innerWidth > 900 && burger.getAttribute('aria-expanded') === 'true') setMenu(false);
      });
    }

    /* ---------------------------------------------------
       7. Rok w stopce
       --------------------------------------------------- */
    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

    /* ---------------------------------------------------
       8. Formularz -> mailto
       --------------------------------------------------- */
    var form = document.getElementById('form');
    var note = document.getElementById('form-note');
    if (form && note) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = form.elements.name.value.trim();
        var contact = form.elements.contact.value.trim();
        var plan = form.elements.plan.value;
        var message = form.elements.message.value.trim();

        if (!name || !contact || !message) {
          note.textContent = 'Uzupełnij imię, kontakt i wiadomość — resztą zajmę się ja.';
          note.classList.remove('is-ok');
          return;
        }
        var subject = 'Zapytanie ze strony 21project.pl — pakiet ' + plan;
        var body = 'Imię i nazwisko: ' + name + '\nKontakt: ' + contact +
                   '\nPakiet: ' + plan + '\n\n' + message;

        note.textContent = 'Otwieram Twój program pocztowy z gotową wiadomością…';
        note.classList.add('is-ok');
        window.location.href = 'mailto:jakubskrzypiec.dev@gmail.com' +
          '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(body);
      });
    }

  });

  function debounce(fn, ms) {
    var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }
})();
