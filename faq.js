(()=>{
document.querySelectorAll('.faq-item').forEach(it=>{
  const b=it.querySelector('.faq-q');
  b.addEventListener('click',()=>{const o=it.classList.toggle('is-open');b.setAttribute('aria-expanded',String(o));});
});

/* Formularz kontaktowy: wysyłka prosto do panelu (panel.21project.pl). Bez poczty jako zapasu. */
const f=document.querySelector('#contact-form');
if(f){
  const API='https://panel.21project.pl';
  const note=f.querySelector('.formNote'),btn=f.querySelector('button[type="submit"]');
  const say=(t,ok)=>{if(!note)return;note.textContent=t;note.classList.toggle('isOk',!!ok);note.classList.toggle('isErr',!ok&&!!t);};
  const FAIL='Nie udało się wysłać zapytania. Napisz na jakubskrzypiec.dev@gmail.com lub zadzwoń: +48 601 863 788.';
  f.addEventListener('submit',async e=>{
    e.preventDefault();
    if(btn&&btn.disabled)return;
    const d=Object.fromEntries(new FormData(f));
    if(btn)btn.disabled=true;
    say('Wysyłam zapytanie…',false);note&&note.classList.remove('isErr');
    try{
      const ctrl=new AbortController(),to=setTimeout(()=>ctrl.abort(),15000);
      const r=await fetch(API+'/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},signal:ctrl.signal,
        body:JSON.stringify({name:d.name||'',contact:d.contact||'',plan:d.plan||'',date:'',message:d.message||'',website_url:d.website_url||''})});
      clearTimeout(to);
      const j=await r.json().catch(()=>({}));
      if(!r.ok){const m=new Error(j&&j.error?j.error:FAIL);m.userSafe=!!(j&&j.error);throw m;}
      f.reset();
      say(j.message||'Dziękuję — odezwę się najszybciej, jak się da.',true);
    }catch(err){
      say(err&&err.userSafe?err.message:FAIL,false);
    }finally{
      if(btn)btn.disabled=false;
    }
  });
}
})();
