(() => {
  const start = () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const revealTargets = document.querySelectorAll(
    '.sectionHead, .project, .plan, .whyCopy, .whyVisual, .processGrid li, .supportNote, .faqCopy, .contactHeading, .contactForm'
  );

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealTargets.forEach((element) => element.classList.add('isVisible'));
  } else {
    revealTargets.forEach((element) => element.classList.add('reveal'));
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('isVisible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    revealTargets.forEach((element) => revealObserver.observe(element));
  }

  const floatingDevices = [...document.querySelectorAll('.floatDevice')];
  let frame = 0;

  const updateParallax = () => {
    frame = 0;
    if (reduceMotion) return;
    const viewportCenter = window.innerHeight / 2;
    floatingDevices.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      if (rect.bottom < -120 || rect.top > window.innerHeight + 120) return;
      const elementCenter = rect.top + rect.height / 2;
      const distance = (viewportCenter - elementCenter) / window.innerHeight;
      const direction = index % 2 === 0 ? 1 : -1;
      const offset = Math.max(-34, Math.min(34, distance * 54 * direction));
      element.style.setProperty('--float-y', `${offset.toFixed(2)}px`);
    });
  };

  const requestParallax = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(updateParallax);
  };

  window.addEventListener('scroll', requestParallax, { passive: true });
  window.addEventListener('resize', requestParallax);
  updateParallax();

  if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.projectVisual').forEach((visual) => {
      visual.addEventListener('pointermove', (event) => {
        const rect = visual.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        visual.style.setProperty('--ry', `${(x * 2.2).toFixed(2)}deg`);
        visual.style.setProperty('--rx', `${(-y * 2.2).toFixed(2)}deg`);
      });
      visual.addEventListener('pointerleave', () => {
        visual.style.setProperty('--ry', '0deg');
        visual.style.setProperty('--rx', '0deg');
      });
    });
  }
  };

  if (document.readyState === 'complete') {
    window.setTimeout(start, 100);
  } else {
    window.addEventListener('load', () => window.setTimeout(start, 100), { once: true });
  }
})();
