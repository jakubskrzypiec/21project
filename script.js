document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const splash = document.querySelector('.splash');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const closeSplash = () => {
    if (!splash) return;
    splash.classList.add('is-leaving');
    body.classList.remove('is-loading');
    window.setTimeout(() => splash.remove(), 900);
  };

  if (splash) {
    if (reduceMotion) {
      splash.remove();
      body.classList.remove('is-loading');
    } else {
      body.classList.add('is-loading');
      requestAnimationFrame(() => splash.classList.add('is-ready'));
      window.setTimeout(closeSplash, 2850);
      window.setTimeout(closeSplash, 4300);
    }
  }

  const header = document.querySelector('.site-header');
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');

  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const isOpen = body.classList.toggle('nav-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        body.classList.remove('nav-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const updateHeader = () => {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 24);
  };
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });

  const revealItems = document.querySelectorAll('.reveal, .case-row, .service-line, .process-card');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.13, rootMargin: '0px 0px -40px 0px' });

    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  document.querySelectorAll('.faq-button').forEach((button) => {
    button.addEventListener('click', () => {
      const item = button.closest('.faq-item');
      if (!item) return;
      const wasOpen = item.classList.contains('is-open');
      document.querySelectorAll('.faq-item.is-open').forEach((openItem) => openItem.classList.remove('is-open'));
      item.classList.toggle('is-open', !wasOpen);
    });
  });
});
