(() => {
  const start = () => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealTargets = [...document.querySelectorAll('[data-reveal]')];

    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealTargets.forEach((element) => element.classList.add('is-visible'));
    } else {
      const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      revealTargets.forEach((element) => revealObserver.observe(element));
    }

    const parallaxTargets = [...document.querySelectorAll('[data-parallax]')];
    const whyCards = [...document.querySelectorAll('.whyCard')];
    let frame = 0;

    const clamp = (min, value, max) => Math.max(min, Math.min(max, value));

    const updateScroll = () => {
      frame = 0;
      if (reduceMotion) return;

      const viewportHeight = window.innerHeight;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - viewportHeight);
      root.style.setProperty('--page-progress', (window.scrollY / maxScroll).toFixed(4));

      revealTargets.forEach((element) => {
        if (element.classList.contains('is-visible')) return;
        const rect = element.getBoundingClientRect();
        if (rect.top < viewportHeight * .92 && rect.bottom > 0) element.classList.add('is-visible');
      });

      parallaxTargets.forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.bottom < -viewportHeight * .4 || rect.top > viewportHeight * 1.4) return;
        const strength = Number(element.dataset.parallax || 20);
        const distance = (viewportHeight * .5 - (rect.top + rect.height * .5)) / viewportHeight;
        const offset = clamp(-Math.abs(strength), distance * strength * 1.75, Math.abs(strength));
        element.style.setProperty('--parallax-y', `${offset.toFixed(2)}px`);
      });

      if (whyCards.length) {
        const stacked = window.innerWidth > 1100;
        whyCards.forEach((card, index) => {
          const next = whyCards[index + 1];
          if (!stacked || !next) {
            card.style.setProperty('--card-scale', '1');
            card.style.setProperty('--card-dim', '0');
            return;
          }
          const height = card.offsetHeight || 1;
          const bottom = card.getBoundingClientRect().top + height;
          const covered = clamp(0, (bottom - next.getBoundingClientRect().top) / height, 1);
          card.style.setProperty('--card-scale', (1 - covered * .055).toFixed(4));
          card.style.setProperty('--card-dim', (covered * .55).toFixed(3));
        });
      }
    };

    const requestScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateScroll);
    };

    window.addEventListener('scroll', requestScroll, { passive: true });
    window.addEventListener('resize', requestScroll);
    updateScroll();

    if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
      document.querySelectorAll('.projectVisual').forEach((visual) => {
        visual.addEventListener('pointermove', (event) => {
          const rect = visual.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - .5;
          const y = (event.clientY - rect.top) / rect.height - .5;
          visual.style.setProperty('--pointer-x', x.toFixed(3));
          visual.style.setProperty('--pointer-y', y.toFixed(3));
        });
        visual.addEventListener('pointerleave', () => {
          visual.style.setProperty('--pointer-x', '0');
          visual.style.setProperty('--pointer-y', '0');
        });
      });
    }

    document.querySelectorAll('.faqList details').forEach((detail) => {
      detail.addEventListener('toggle', () => {
        if (!detail.open) return;
        document.querySelectorAll('.faqList details').forEach((other) => {
          if (other !== detail) other.open = false;
        });
      });
    });
  };

  if (document.readyState === 'complete') {
    window.setTimeout(start, 1200);
  } else {
    window.addEventListener('load', () => window.setTimeout(start, 1200), { once: true });
  }
})();
