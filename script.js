document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  body.classList.add('js');
  if (!body.classList.contains('home-v51') && !body.classList.contains('site-v52')) {
    body.classList.add('studio-site-v49');
  }
  body.classList.remove('intro-active', 'is-loading');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const headerBrandSlot = document.querySelector('.header-empty');
  if (headerBrandSlot && !headerBrandSlot.querySelector('.studio-brand,.v52-brand')) {
    const brand = document.createElement('a');
    brand.className = 'studio-brand';
    brand.href = 'index.html';
    brand.setAttribute('aria-label', '21project — strona główna');
    brand.innerHTML = '<span>21</span><i></i><b>project</b>';
    headerBrandSlot.appendChild(brand);
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

  const v52Toggle = document.querySelector('.v52-menu');
  const v52Nav = document.querySelector('.v52-nav');
  if (v52Toggle && v52Nav) {
    const closeV52Nav = () => {
      body.classList.remove('nav-open');
      v52Toggle.setAttribute('aria-expanded', 'false');
    };
    v52Toggle.addEventListener('click', () => {
      const open = body.classList.toggle('nav-open');
      v52Toggle.setAttribute('aria-expanded', String(open));
    });
    v52Nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeV52Nav));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeV52Nav();
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) closeV52Nav();
    }, { passive: true });
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

  const stage = document.querySelector('.device-stage');
  const laptop = stage && stage.querySelector('.laptop-mockup');
  if (stage && laptop && !reduce && window.matchMedia('(pointer:fine)').matches) {
    let frame = 0;
    stage.addEventListener('pointermove', event => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = stage.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        laptop.style.transform = `rotateY(${-6 + x * 2.2}deg) rotateX(${1.5 - y * 1.4}deg) translate3d(${x * 3}px,${y * 2}px,0)`;
      });
    }, { passive: true });
    stage.addEventListener('pointerleave', () => {
      laptop.style.transform = '';
    });
  }

  const salesAccordion = document.querySelector('[data-v51-accordion]');
  if (salesAccordion) {
    const faqItems = [...salesAccordion.querySelectorAll('.v51-faq__item')];
    const closeItem = item => {
      const button = item.querySelector('button');
      const answer = item.querySelector(':scope > div');
      item.classList.remove('is-open');
      button?.setAttribute('aria-expanded', 'false');
      if (answer) answer.style.maxHeight = '0px';
    };
    faqItems.forEach(item => {
      const button = item.querySelector('button');
      const answer = item.querySelector(':scope > div');
      if (!button || !answer) return;
      button.addEventListener('click', () => {
        const shouldOpen = !item.classList.contains('is-open');
        faqItems.forEach(closeItem);
        if (shouldOpen) {
          item.classList.add('is-open');
          button.setAttribute('aria-expanded', 'true');
          answer.style.maxHeight = `${answer.scrollHeight}px`;
        }
      });
    });
  }

  const v52Accordion = document.querySelector('[data-v52-accordion]');
  if (v52Accordion) {
    const accordionItems = [...v52Accordion.querySelectorAll(':scope > article')];
    const closeAccordionItem = item => {
      const button = item.querySelector(':scope > button');
      const answer = item.querySelector(':scope > div');
      item.classList.remove('is-open');
      button?.setAttribute('aria-expanded', 'false');
      if (answer) answer.style.maxHeight = '0px';
    };
    accordionItems.forEach(item => {
      const button = item.querySelector(':scope > button');
      const answer = item.querySelector(':scope > div');
      if (!button || !answer) return;
      closeAccordionItem(item);
      button.addEventListener('click', () => {
        const shouldOpen = !item.classList.contains('is-open');
        accordionItems.forEach(closeAccordionItem);
        if (shouldOpen) {
          item.classList.add('is-open');
          button.setAttribute('aria-expanded', 'true');
          answer.style.maxHeight = `${answer.scrollHeight}px`;
        }
      });
    });
    window.addEventListener('resize', () => {
      const openItem = v52Accordion.querySelector(':scope > article.is-open');
      const openAnswer = openItem?.querySelector(':scope > div');
      if (openAnswer) openAnswer.style.maxHeight = `${openAnswer.scrollHeight}px`;
    }, { passive: true });
  }
});
