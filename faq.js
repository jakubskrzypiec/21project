(()=>{
document.querySelectorAll('.faq-item').forEach(it=>{
  const b=it.querySelector('.faq-q');
  b.addEventListener('click',()=>{const o=it.classList.toggle('is-open');b.setAttribute('aria-expanded',String(o));});
});
const f=document.querySelector('#contact-form');
if(f)f.addEventListener('submit',e=>{
  e.preventDefault();
  const d=Object.fromEntries(new FormData(f));
  const body='Imię: '+d.name+'\nKontakt: '+d.contact+'\nPakiet: '+(d.plan||'-')+'\n\n'+d.message;
  location.href='mailto:jakubskrzypiec.dev@gmail.com?subject='+encodeURIComponent('Nowa strona — '+d.name)+'&body='+encodeURIComponent(body);
});
})();
