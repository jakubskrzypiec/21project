document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  body.classList.add('js-ready');

  const intro = document.querySelector('.intro');
  const hideIntro = () => {
    if (!intro) return;
    intro.classList.add('is-hidden');
    body.classList.remove('is-loading');
    window.setTimeout(() => intro.remove(), 650);
  };
  if (intro && !reduceMotion) {
    body.classList.add('is-loading');
    requestAnimationFrame(() => intro.classList.add('is-ready'));
    window.setTimeout(hideIntro, 1650);
    window.setTimeout(hideIntro, 2600);
    intro.addEventListener('click', hideIntro, { once: true });
  } else if (intro) {
    intro.remove();
  }

  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const open = body.classList.toggle('nav-open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
      body.classList.remove('nav-open');
      navToggle.setAttribute('aria-expanded', 'false');
    }));
  }

  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -30px 0px' });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }
});
