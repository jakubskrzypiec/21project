
document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const splash = document.querySelector('.splash');
  const closeSplash = () => {
    if (!splash) return;
    splash.classList.add('is-hidden');
    body.classList.remove('no-scroll');
    window.setTimeout(() => splash.remove(), 750);
  };

  if (splash && !reduceMotion) {
    body.classList.add('no-scroll');
    window.setTimeout(closeSplash, 1350);
    window.setTimeout(closeSplash, 2400);
    splash.addEventListener('click', closeSplash, { once: true });
  } else if (splash) {
    splash.remove();
  }

  const header = document.querySelector('.site-header');
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 12);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = body.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', String(open));
    });

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -50px 0px' });

    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }
});
