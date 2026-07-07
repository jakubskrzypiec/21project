document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  body.classList.add('js');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const intro = document.querySelector('.intro-screen');
  const closeIntro = () => {
    if (!intro) return;
    intro.classList.add('is-done');
    body.classList.remove('is-loading');
    setTimeout(() => intro.remove(), 850);
  };
  if (intro && !reduce) {
    body.classList.add('is-loading');
    requestAnimationFrame(() => intro.classList.add('is-ready'));
    setTimeout(closeIntro, 1850);
    setTimeout(closeIntro, 2800);
    intro.addEventListener('click', closeIntro, { once: true });
  } else if (intro) {
    intro.remove();
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
      }, 220);
    }, 3200);
  }

  const header = document.querySelector('.site-header');
  const setHeader = () => header && header.classList.toggle('is-scrolled', window.scrollY > 20);
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
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeNav();
    });
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
