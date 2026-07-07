
document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  body.classList.add('js');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const splash = document.querySelector('.splash');
  const closeSplash = () => {
    if (!splash) return;
    splash.classList.add('done');
    body.classList.remove('is-loading');
    setTimeout(() => splash.remove(), 800);
  };
  if (splash && !reduce) {
    body.classList.add('is-loading');
    requestAnimationFrame(() => splash.classList.add('ready'));
    setTimeout(closeSplash, 2400);
    setTimeout(closeSplash, 3600);
    splash.addEventListener('click', closeSplash, { once: true });
  } else if (splash) {
    splash.remove();
  }

  const phrases = [
    'wygląda lepiej niż konkurencja.',
    'prowadzi klienta do kontaktu.',
    'buduje zaufanie od pierwszego ekranu.'
  ];
  const rotator = document.querySelector('[data-rotator]');
  if (rotator && !reduce) {
    let i = 0;
    setInterval(() => {
      i = (i + 1) % phrases.length;
      rotator.classList.add('is-changing');
      window.setTimeout(() => {
        rotator.textContent = phrases[i];
        rotator.classList.remove('is-changing');
      }, 260);
    }, 3300);
  }

  const header = document.querySelector('.site-header');
  const setHeader = () => header && header.classList.toggle('is-scrolled', window.scrollY > 20);
  setHeader();
  window.addEventListener('scroll', setHeader, { passive: true });

  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = body.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      body.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    }));
  }

  const items = document.querySelectorAll('.reveal,.editorial-item,.price-row,.work-card');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: .14, rootMargin: '0px 0px -40px 0px' });
    items.forEach(item => io.observe(item));
  } else {
    items.forEach(item => item.classList.add('is-visible'));
  }
});
