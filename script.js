
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
    setTimeout(closeSplash, 1650);
    setTimeout(closeSplash, 2600);
    splash.addEventListener('click', closeSplash, { once: true });
  } else if (splash) {
    splash.remove();
  }

  const phrases = [
    'wygląda lepiej niż konkurencja.',
    'buduje zaufanie od pierwszego ekranu.',
    'prowadzi klienta do kontaktu.',
    'nie wygląda jak gotowy szablon.'
  ];
  const rotator = document.querySelector('[data-rotator]');
  if (rotator && !reduce) {
    let i = 0;
    setInterval(() => {
      i = (i + 1) % phrases.length;
      rotator.animate(
        [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(18px)' }],
        { duration: 240, easing: 'ease', fill: 'forwards' }
      ).onfinish = () => {
        rotator.textContent = phrases[i];
        rotator.animate(
          [{ opacity: 0, transform: 'translateY(-18px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: 380, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' }
        );
      };
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
