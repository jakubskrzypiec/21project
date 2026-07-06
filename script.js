
document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('js');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const splash = document.querySelector('.splash');
  const hideSplash = () => {
    if (!splash) return;
    splash.classList.add('is-hidden');
    document.body.classList.remove('is-loading');
    setTimeout(() => splash.remove(), 650);
  };
  if (splash && !reduce) {
    document.body.classList.add('is-loading');
    requestAnimationFrame(() => splash.classList.add('is-ready'));
    setTimeout(hideSplash, 1850);
    setTimeout(hideSplash, 2800);
    splash.addEventListener('click', hideSplash, { once: true });
  } else if (splash) {
    splash.remove();
  }
  const header = document.querySelector('.site-header');
  const onScroll = () => header && header.classList.toggle('is-scrolled', window.scrollY > 20);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  const menu = document.querySelector('.menu-btn');
  const nav = document.querySelector('.nav');
  if (menu && nav) {
    menu.addEventListener('click', () => {
      const open = document.body.classList.toggle('nav-open');
      menu.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      document.body.classList.remove('nav-open');
      menu.setAttribute('aria-expanded', 'false');
    }));
  }
  document.querySelectorAll('img').forEach(img => {
    img.addEventListener('error', () => img.classList.add('broken'));
  });
  const reveal = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -30px 0px' });
    reveal.forEach(el => io.observe(el));
  } else {
    reveal.forEach(el => el.classList.add('visible'));
  }
});
