document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  body.classList.add('js');
  body.classList.remove('intro-active', 'is-loading');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const phrases = [
    'wygląda jak mocna marka.',
    'prowadzi klienta do kontaktu.',
    'buduje zaufanie od pierwszego ekranu.'
  ];

  const rotator = document.querySelector('[data-rotator]');
  if (rotator && !reduce) {
    let index = 0;
    window.setInterval(() => {
      index = (index + 1) % phrases.length;
      rotator.classList.add('is-changing');
      window.setTimeout(() => {
        rotator.textContent = phrases[index];
        rotator.classList.remove('is-changing');
      }, 220);
    }, 3200);
  }

  const header = document.querySelector('.site-header');
  const updateHeader = () => {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 24);
  };
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

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

    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeNav));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeNav();
    });
  }

  const items = document.querySelectorAll(
    '.reveal,.editorial-item,.price-row,.work-card,.seo-case-card'
  );

  if ('IntersectionObserver' in window && !reduce) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });

    items.forEach(item => observer.observe(item));
  } else {
    items.forEach(item => item.classList.add('is-visible'));
  }
});
