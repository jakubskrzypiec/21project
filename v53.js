document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  body.classList.add('has-js');

  const menuButton = document.querySelector('.x-menu');
  const navigation = document.querySelector('.x-nav');

  if (menuButton && navigation) {
    const closeMenu = () => {
      body.classList.remove('menu-open');
      menuButton.setAttribute('aria-expanded', 'false');
    };

    menuButton.addEventListener('click', () => {
      const open = body.classList.toggle('menu-open');
      menuButton.setAttribute('aria-expanded', String(open));
    });

    navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeMenu();
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 860) closeMenu();
    }, { passive: true });
  }

  const revealElements = document.querySelectorAll('[data-reveal]');
  if (!reducedMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealElements.forEach(element => observer.observe(element));
  } else {
    revealElements.forEach(element => element.classList.add('is-visible'));
  }

  const accordions = document.querySelectorAll('[data-x-accordion]');
  accordions.forEach(accordion => {
    const items = [...accordion.querySelectorAll(':scope > article')];

    const closeItem = item => {
      const trigger = item.querySelector(':scope > button');
      const panel = item.querySelector(':scope > div');
      item.classList.remove('is-open');
      trigger?.setAttribute('aria-expanded', 'false');
      if (panel) panel.style.maxHeight = '0px';
    };

    items.forEach(item => {
      const trigger = item.querySelector(':scope > button');
      const panel = item.querySelector(':scope > div');
      if (!trigger || !panel) return;
      closeItem(item);

      trigger.addEventListener('click', () => {
        const shouldOpen = !item.classList.contains('is-open');
        items.forEach(closeItem);
        if (!shouldOpen) return;
        item.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
        panel.style.maxHeight = `${panel.scrollHeight}px`;
      });
    });

    window.addEventListener('resize', () => {
      const openItem = accordion.querySelector(':scope > article.is-open');
      const panel = openItem?.querySelector(':scope > div');
      if (panel) panel.style.maxHeight = `${panel.scrollHeight}px`;
    }, { passive: true });
  });
});
