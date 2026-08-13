const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('.nav');

menuButton?.addEventListener('click', () => {
  const open = nav.classList.toggle('nav-open');
  menuButton.classList.toggle('menu-button-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otwórz menu');
});

nav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    nav.classList.remove('nav-open');
    menuButton?.classList.remove('menu-button-open');
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Otwórz menu');
  });
});

document.querySelector('.contact-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const subject = `Zapytanie ze strony 21project — ${data.get('service')}`;
  const body = [
    `Imię i firma: ${data.get('name')}`,
    `E-mail: ${data.get('email')}`,
    `Telefon: ${data.get('phone') || 'nie podano'}`,
    `Usługa: ${data.get('service')}`,
    '',
    data.get('message')
  ].join('\n');
  window.location.href = `mailto:jakubskrzypiec.dev@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
