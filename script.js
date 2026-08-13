const menuButton = document.querySelector('.menu');
const nav = document.querySelector('.nav');

menuButton.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuButton.classList.toggle('active', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otwórz menu');
});

nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menuButton.classList.remove('active');
  menuButton.setAttribute('aria-expanded', 'false');
}));

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(element => observer.observe(element));

document.querySelectorAll('.device-showcase').forEach(stage => {
  stage.addEventListener('mousemove', event => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = stage.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    stage.style.setProperty('--desk-x', `${x * 8}px`);
    stage.style.setProperty('--desk-y', `${y * 6}px`);
    stage.style.setProperty('--phone-x', `${x * -18}px`);
    stage.style.setProperty('--phone-y', `${y * -12}px`);
    stage.style.setProperty('--tilt', `${x * 1.3}deg`);
  });
  stage.addEventListener('mouseleave', () => {
    ['--desk-x','--desk-y','--phone-x','--phone-y','--tilt'].forEach(property => stage.style.removeProperty(property));
  });
});

document.querySelector('#contact-form').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const subject = `Zapytanie 21project — ${data.get('service')}`;
  const body = [`Imię / firma: ${data.get('name')}`, `E-mail: ${data.get('email')}`, `Telefon: ${data.get('phone') || 'nie podano'}`, `Usługa: ${data.get('service')}`, '', data.get('message')].join('\n');
  location.href = `mailto:jakubskrzypiec.dev@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
