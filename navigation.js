const menu=document.querySelector('.menu-toggle'),header=document.querySelector('header');
menu.addEventListener('click',()=>{const open=header.classList.toggle('menu-open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Zamknij menu':'Otwórz menu');});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){header.classList.remove('menu-open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Otwórz menu');}});
const current=location.pathname.split('/').pop();document.querySelectorAll('nav a').forEach(a=>{if(a.getAttribute('href')===current)a.setAttribute('aria-current','page');});
