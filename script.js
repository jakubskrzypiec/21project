
document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  body.classList.add('js');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const intro = document.querySelector('.intro');
  const isHome = body.classList.contains('home-page');

  const closeIntro = () => {
    if (!intro) return;
    intro.classList.add('leaving');
    intro.classList.add('done');
    body.classList.remove('is-loading');
    window.setTimeout(() => intro.remove(), 720);
  };

  if (intro) {
    if (!isHome || reduce) {
      intro.remove();
      body.classList.remove('is-loading');
    } else {
      body.classList.add('is-loading');
      requestAnimationFrame(() => intro.classList.add('ready'));
      window.setTimeout(closeIntro, 1250);
      window.setTimeout(closeIntro, 2300);
      intro.addEventListener('click', closeIntro, { once: true });
    }
  }

  const header = document.querySelector('.site-header');
  const updateHeader = () => header && header.classList.toggle('scrolled', window.scrollY > 20);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const navToggle = document.querySelector('.nav-toggle');
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      const open = body.classList.toggle('nav-open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
  }

  document.querySelectorAll('.nav a').forEach((a) => {
    a.addEventListener('click', () => body.classList.remove('nav-open'));
  });

  const reveal = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    reveal.forEach((el) => observer.observe(el));
  } else {
    reveal.forEach((el) => el.classList.add('visible'));
  }
});
