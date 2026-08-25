(() => {
  const start = () => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 900;

    const assignReveal = (selector, type) => {
      document.querySelectorAll(selector).forEach((element, index) => {
        if (element.hasAttribute('data-reveal')) return;
        element.setAttribute('data-reveal', type);
        if (type === 'row' || type === 'card') {
          element.style.setProperty('--delay', `${Math.min(index % 5, 4) * 55}ms`);
        }
      });
    };

    if (document.body.classList.contains('pageBody')) {
      assignReveal('.pageHeroInner > div:first-child, .pageSectionHead > div, .pageSticky, .contactHeroGrid > h1, .contactIdentity, .contactFormIntro', 'clip');
      assignReveal('.pageHeroInner > div:last-child, .pageSectionHead > p, .contactHeroAside, .pageCtaInner', 'slide');
      assignReveal('.portfolioWide, .pageCard, .pageFaq details', 'card');
      assignReveal('.pageRow, .pageFacts li, .contactLinks > *, .contactPageForm label', 'row');
    }

    assignReveal('footer .footerPortfolioLink, footer .footerTop > img, footer .footerTop > p, footer .footerContact, footer .footerTop > nav, footer .footerBottom', 'row');

    const revealTargets = [...document.querySelectorAll('[data-reveal]')];

    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealTargets.forEach((element) => element.classList.add('is-visible'));
    } else {
      const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      revealTargets.forEach((element) => revealObserver.observe(element));
    }

    const parallaxTargets = [...document.querySelectorAll('[data-parallax]')];
    let frame = 0;

    const clamp = (min, value, max) => Math.max(min, Math.min(max, value));

    const updateScroll = () => {
      frame = 0;
      if (reduceMotion) return;

      const viewportHeight = window.innerHeight;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - viewportHeight);
      root.style.setProperty('--page-progress', (window.scrollY / maxScroll).toFixed(4));

      revealTargets.forEach((element) => {
        if (element.classList.contains('is-visible')) return;
        const rect = element.getBoundingClientRect();
        if (rect.top < viewportHeight * .92 && rect.bottom > 0) element.classList.add('is-visible');
      });

      parallaxTargets.forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.bottom < -viewportHeight * .4 || rect.top > viewportHeight * 1.4) return;
        const strength = Number(element.dataset.parallax || 20);
        const distance = (viewportHeight * .5 - (rect.top + rect.height * .5)) / viewportHeight;
        const offset = clamp(-Math.abs(strength), distance * strength * 1.75, Math.abs(strength));
        element.style.setProperty('--parallax-y', `${offset.toFixed(2)}px`);
      });

    };

    const requestScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateScroll);
    };

    window.addEventListener('scroll', requestScroll, { passive: true });
    window.addEventListener('resize', requestScroll);
    window.addEventListener('load', requestScroll, { once: true });
    updateScroll();

    const markTilt = document.querySelector('.markTilt');
    const heroSection = document.querySelector('.hero');

    if (markTilt && heroSection && !reduceMotion && window.matchMedia('(pointer: fine)').matches) {
      heroSection.addEventListener('pointermove', (event) => {
        const rect = heroSection.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        markTilt.style.setProperty('--tx', x.toFixed(3));
        markTilt.style.setProperty('--ty', y.toFixed(3));
      });
      heroSection.addEventListener('pointerleave', () => {
        markTilt.style.setProperty('--tx', '0');
        markTilt.style.setProperty('--ty', '0');
      });
    }

    if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
      document.querySelectorAll('.projectVisual').forEach((visual) => {
        visual.addEventListener('pointermove', (event) => {
          const rect = visual.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - .5;
          const y = (event.clientY - rect.top) / rect.height - .5;
          visual.style.setProperty('--pointer-x', x.toFixed(3));
          visual.style.setProperty('--pointer-y', y.toFixed(3));
        });
        visual.addEventListener('pointerleave', () => {
          visual.style.setProperty('--pointer-x', '0');
          visual.style.setProperty('--pointer-y', '0');
        });
      });
    }

    const form = document.querySelector('.contactForm');
    const formNote = form && form.querySelector('.formNote');

    if (form && formNote) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const value = (field) => (form.elements[field] ? form.elements[field].value.trim() : '');
        const name = value('name');
        const contact = value('contact');
        const message = value('message');

        if (!name || !contact || !message) {
          formNote.textContent = 'Uzupe\u0142nij imi\u0119, kontakt i kr\u00f3tki opis \u2014 reszt\u0105 zajm\u0119 si\u0119 ja.';
          formNote.classList.remove('isOk');
          const missing = !name ? 'name' : (!contact ? 'contact' : 'message');
          if (form.elements[missing]) form.elements[missing].focus();
          return;
        }

        const plan = value('plan');
        const date = value('date');
        const subject = 'Zapytanie ze strony 21project.pl \u2014 ' + plan;
        const body = [
          'Imi\u0119 i nazwisko: ' + name,
          'Kontakt: ' + contact,
          'Pakiet: ' + plan,
          date ? 'Planowany termin: ' + date : null,
          '',
          message,
        ].filter((line) => line !== null).join('\n');

        formNote.textContent = 'Otwieram Tw\u00f3j program pocztowy z gotow\u0105 wiadomo\u015bci\u0105\u2026';
        formNote.classList.add('isOk');
        window.location.href = 'mailto:jakubskrzypiec.dev@gmail.com' +
          '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(body);
      });
    }
    /* Ten sam bezpiecznik co w script.js: jeśli po trzech sekundach coś nadal
       czeka na odsłonięcie, pokazujemy to bez animacji. */
    window.setTimeout(() => {
      document.querySelectorAll('[data-reveal]:not(.is-visible), .reveal:not(.is-in)').forEach((el) => {
        el.classList.add(el.hasAttribute('data-reveal') ? 'is-visible' : 'is-in');
      });
    }, 3000);


    const burger = document.querySelector('.burger');
    const menu = document.getElementById('mobileMenu');

    if (burger && menu) {
      let openFrame = 0;

      const setMenu = (open) => {
        window.cancelAnimationFrame(openFrame);
        burger.setAttribute('aria-expanded', String(open));
        burger.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otw\u00f3rz menu');
        document.body.classList.toggle('menuOpen', open);
        if (open) {
          menu.hidden = false;
          openFrame = window.requestAnimationFrame(() => menu.classList.add('isOpen'));
        } else {
          menu.classList.remove('isOpen');
          if (reduceMotion) {
            menu.hidden = true;
          } else {
            window.setTimeout(() => {
              if (!menu.classList.contains('isOpen')) menu.hidden = true;
            }, 340);
          }
        }
      };

      burger.addEventListener('click', () => {
        setMenu(burger.getAttribute('aria-expanded') !== 'true');
      });
      menu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => setMenu(false));
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
          setMenu(false);
          burger.focus();
        }
      });
      window.addEventListener('resize', () => {
        if (window.innerWidth > 900 && burger.getAttribute('aria-expanded') === 'true') setMenu(false);
      });
    }

    document.querySelectorAll('.faqList details').forEach((detail) => {
      detail.addEventListener('toggle', () => {
        if (!detail.open) return;
        document.querySelectorAll('.faqList details').forEach((other) => {
          if (other !== detail) other.open = false;
        });
      });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
