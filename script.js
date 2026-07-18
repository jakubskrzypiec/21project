(() => {
  'use strict';

  const boot = () => {
    const body = document.body;
    body.classList.add('js');
    body.classList.remove('intro-active', 'is-loading');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const headerEmpty = document.querySelector('.header-empty');
    if (headerEmpty && !headerEmpty.querySelector('.site-brand')) {
      headerEmpty.innerHTML = `
        <a class="site-brand" href="index.html" aria-label="21project — strona główna">
          <span class="site-brand__mark" aria-hidden="true">21</span>
          <span class="site-brand__copy"><strong>21project</strong><span>web design & development</span></span>
        </a>`;
    }

    const header = document.querySelector('.site-header');
    const setHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 18);
    setHeader();
    window.addEventListener('scroll', setHeader, { passive: true });

    const toggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav');
    if (toggle && nav) {
      const closeNav = () => {
        body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      };
      toggle.addEventListener('click', () => {
        const open = body.classList.toggle('nav-open');
        toggle.setAttribute('aria-expanded', String(open));
      });
      nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeNav));
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeNav();
      });
    }

    const rotator = document.querySelector('[data-word-rotator]');
    if (rotator && !reduce) {
      const words = ['szablon.', 'przypadek.', 'konkurencja.'];
      let index = 0;
      window.setInterval(() => {
        index = (index + 1) % words.length;
        rotator.animate(
          [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-12px)' }],
          { duration: 220, fill: 'forwards' }
        ).finished.then(() => {
          rotator.textContent = words[index];
          rotator.animate(
            [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }],
            { duration: 300, fill: 'forwards' }
          );
        });
      }, 2800);
    }

    const revealItems = document.querySelectorAll('.reveal,.rw-project,.rw-capability,.rw-process__step,.rw-price-card,.rw-work-card,.rw-article-card');
    if ('IntersectionObserver' in window && !reduce) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, { threshold: .1, rootMargin: '0px 0px -35px 0px' });
      revealItems.forEach((item) => observer.observe(item));
    } else {
      revealItems.forEach((item) => item.classList.add('is-visible'));
    }

    document.querySelectorAll('[data-year]').forEach((node) => {
      node.textContent = String(new Date().getFullYear());
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
