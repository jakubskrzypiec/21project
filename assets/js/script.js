/* 21 project — assets/js/script.js */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {

    /* --- sticky header state --- */
    var header = document.querySelector('.header');
    var onScroll = function () {
      if (header) header.classList.toggle('is-stuck', window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    /* --- mobile nav --- */
    var burger = document.getElementById('burger');
    var nav = document.getElementById('nav');

    if (burger && nav) {
      var setNav = function (open) {
        nav.classList.toggle('is-open', open);
        if (header) header.classList.toggle('is-open', open);
        burger.setAttribute('aria-expanded', String(open));
        document.body.style.overflow = open ? 'hidden' : '';
      };

      burger.addEventListener('click', function () {
        setNav(burger.getAttribute('aria-expanded') !== 'true');
      });

      nav.addEventListener('click', function (e) {
        if (e.target.closest('a')) setNav(false);
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') setNav(false);
      });

      window.addEventListener('resize', function () {
        if (window.innerWidth > 760) setNav(false);
      });
    }

    /* --- scroll reveal --- */
    var items = document.querySelectorAll('.reveal');

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var siblings = Array.prototype.slice.call(
            el.parentElement ? el.parentElement.children : []
          ).filter(function (n) { return n.classList.contains('reveal'); });
          var i = Math.min(siblings.indexOf(el), 5);
          el.style.transitionDelay = (i > 0 ? i * 90 : 0) + 'ms';
          el.classList.add('is-in');
          io.unobserve(el);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

      items.forEach(function (el) { io.observe(el); });
    } else {
      items.forEach(function (el) { el.classList.add('is-in'); });
    }

    /* --- footer year --- */
    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

    /* --- contact form -> mailto (static site, no backend) --- */
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
        var body =
          'Imię i nazwisko: ' + name + '\n' +
          'Kontakt: ' + contact + '\n' +
          'Pakiet: ' + plan + '\n\n' +
          message;

        note.textContent = 'Otwieram Twój program pocztowy z gotową wiadomością…';
        note.classList.add('is-ok');

        window.location.href =
          'mailto:jakubskrzypiec.dev@gmail.com' +
          '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(body);
      });
    }

  });
})();
