
document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  body.classList.add('js-ready');

  const splash = document.querySelector('.splash');
  const isHome = body.classList.contains('home-page');

  const closeSplash = () => {
    if (!splash) return;
    splash.classList.add('is-leaving');
    body.classList.remove('is-loading');
    window.setTimeout(() => splash.remove(), 650);
  };

  if (splash) {
    if (!isHome || reduceMotion) {
      splash.remove();
      body.classList.remove('is-loading');
    } else {
      body.classList.add('is-loading');
      requestAnimationFrame(() => splash.classList.add('is-ready'));
      window.setTimeout(closeSplash, 2050);
      window.setTimeout(closeSplash, 2900);
      splash.addEventListener('click', closeSplash, { once: true });
    }
  }

  const header = document.querySelector('.site-header');
  const updateHeader = () => {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 20);
  };
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const open = body.classList.toggle('nav-open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        body.classList.remove('nav-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });

  const revealItems = document.querySelectorAll('.reveal, .case-row, .service-card, .process-card, .offer-box, .inner-card, .contact-page-main, .side-box, .case-visual, .note-box');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -30px 0px' });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  document.querySelectorAll('.faq-button').forEach((button) => {
    button.addEventListener('click', () => {
      const item = button.closest('.faq-item');
      if (!item) return;
      item.classList.toggle('is-open');
    });
  });
});
