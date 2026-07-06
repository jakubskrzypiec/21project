document.documentElement.classList.add('js');
document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const splash = document.querySelector('.splash');
  const closeSplash = () => {
    if (!splash) return;
    splash.classList.add('is-leaving');
    body.classList.remove('no-scroll');
    setTimeout(() => splash.remove(), 650);
  };
  if (splash && !reduce) {
    body.classList.add('no-scroll');
    requestAnimationFrame(() => splash.classList.add('is-ready'));
    setTimeout(closeSplash, 1550);
    setTimeout(closeSplash, 2500);
    splash.addEventListener('click', closeSplash, { once:true });
  } else if (splash) {
    splash.remove();
  }

  const header = document.querySelector('.site-header');
  const updateHeader = () => header && header.classList.toggle('is-scrolled', window.scrollY > 16);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive:true });

  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const open = body.classList.toggle('nav-open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      body.classList.remove('nav-open');
      navToggle.setAttribute('aria-expanded', 'false');
    }));
  }

  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .12, rootMargin: '0px 0px -30px 0px' });
    reveals.forEach(el => observer.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('is-visible'));
  }
});
