const menu=document.querySelector('.menu-toggle'),header=document.querySelector('header'),root=document.documentElement;
function setMenu(open){header.classList.toggle('menu-open',open);root.classList.toggle('menu-lock',open);if(menu){menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Zamknij menu':'Otwórz menu');}}
if(menu){menu.addEventListener('click',()=>setMenu(!header.classList.contains('menu-open')));
document.querySelectorAll('header nav a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));
addEventListener('resize',()=>{if(innerWidth>700)setMenu(false);});}
document.addEventListener('keydown',e=>{if(e.key==='Escape')setMenu(false);});
