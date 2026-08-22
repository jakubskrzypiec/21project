(() => {
  const start = () => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const mobileLayout = window.matchMedia('(max-width: 700px)').matches;
    const safeMotion = !reduceMotion && !mobileLayout;
    const allowParallax = !reduceMotion && !coarsePointer && window.innerWidth > 900;
    const revealTargets = [...document.querySelectorAll('[data-reveal]')];

    if (!safeMotion || !('IntersectionObserver' in window)) {
      revealTargets.forEach((el) => el.classList.add('is-visible'));
    } else {
      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -3% 0px' });
      revealTargets.forEach((el) => observer.observe(el));
      setTimeout(() => {
        revealTargets.forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.top < innerHeight * 1.05 && r.bottom > -40) el.classList.add('is-visible');
        });
      }, 700);
    }

    const parallaxTargets = [...document.querySelectorAll('[data-parallax]')];
    let frame = 0;
    const clamp = (min,v,max) => Math.max(min,Math.min(max,v));
    const updateScroll = () => {
      frame = 0;
      const vh = innerHeight;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
      root.style.setProperty('--page-progress',(scrollY/maxScroll).toFixed(4));
      if (!allowParallax) {
        parallaxTargets.forEach((el)=>el.style.setProperty('--parallax-y','0px'));
        return;
      }
      parallaxTargets.forEach((el)=>{
        const r=el.getBoundingClientRect();
        if (r.bottom < -vh*.4 || r.top > vh*1.4) return;
        const strength=Number(el.dataset.parallax||20);
        const distance=(vh*.5-(r.top+r.height*.5))/vh;
        const offset=clamp(-Math.abs(strength),distance*strength*1.5,Math.abs(strength));
        el.style.setProperty('--parallax-y',`${offset.toFixed(2)}px`);
      });
    };
    const requestScroll=()=>{if(!frame) frame=requestAnimationFrame(updateScroll)};
    addEventListener('scroll',requestScroll,{passive:true});
    addEventListener('resize',requestScroll,{passive:true});
    addEventListener('load',requestScroll,{once:true});
    updateScroll();

    if (!reduceMotion && !coarsePointer) {
      document.querySelectorAll('.projectVisual').forEach((visual)=>{
        visual.addEventListener('pointermove',(event)=>{
          const r=visual.getBoundingClientRect();
          visual.style.setProperty('--pointer-x',(((event.clientX-r.left)/r.width)-.5).toFixed(3));
          visual.style.setProperty('--pointer-y',(((event.clientY-r.top)/r.height)-.5).toFixed(3));
        });
        visual.addEventListener('pointerleave',()=>{
          visual.style.setProperty('--pointer-x','0');
          visual.style.setProperty('--pointer-y','0');
        });
      });
    }

    const form=document.querySelector('.contactForm');
    const note=form&&form.querySelector('.formNote');
    if(form&&note){
      form.addEventListener('submit',(event)=>{
        event.preventDefault();
        const value=(name)=>form.elements[name]?form.elements[name].value.trim():'';
        const name=value('name'), contact=value('contact'), message=value('message');
        if(!name||!contact||!message){
          note.textContent='Uzupełnij imię, kontakt i krótki opis — resztą zajmę się ja.';
          note.classList.remove('isOk');
          const missing=!name?'name':(!contact?'contact':'message');
          if(form.elements[missing]) form.elements[missing].focus();
          return;
        }
        const plan=value('plan'), date=value('date');
        const subject='Zapytanie ze strony 21project.pl — '+plan;
        const body=['Imię i nazwisko: '+name,'Kontakt: '+contact,'Pakiet: '+plan,date?'Planowany termin: '+date:null,'',message].filter((x)=>x!==null).join('\n');
        note.textContent='Otwieram Twój program pocztowy z gotową wiadomością…';
        note.classList.add('isOk');
        location.href='mailto:jakubskrzypiec.dev@gmail.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
      });
    }

    const burger=document.querySelector('.burger');
    const menu=document.getElementById('mobileMenu');
    if(burger&&menu){
      let timer=0;
      const setMenu=(open)=>{
        clearTimeout(timer);
        burger.setAttribute('aria-expanded',String(open));
        burger.setAttribute('aria-label',open?'Zamknij menu':'Otwórz menu');
        document.body.classList.toggle('menuOpen',open);
        if(open){
          menu.hidden=false;
          requestAnimationFrame(()=>menu.classList.add('isOpen'));
        } else {
          menu.classList.remove('isOpen');
          timer=setTimeout(()=>{if(!menu.classList.contains('isOpen')) menu.hidden=true},reduceMotion?0:340);
        }
      };
      burger.addEventListener('click',()=>setMenu(burger.getAttribute('aria-expanded')!=='true'));
      menu.querySelectorAll('a').forEach((a)=>a.addEventListener('click',()=>setMenu(false)));
      document.addEventListener('keydown',(e)=>{if(e.key==='Escape'&&burger.getAttribute('aria-expanded')==='true'){setMenu(false);burger.focus()}});
      addEventListener('resize',()=>{if(innerWidth>1100&&burger.getAttribute('aria-expanded')==='true')setMenu(false)});
    }

    document.querySelectorAll('.faqList details,.pageFaq details').forEach((detail)=>{
      detail.addEventListener('toggle',()=>{
        if(!detail.open)return;
        const scope=detail.closest('.faqList,.pageFaq');
        scope?.querySelectorAll('details').forEach((other)=>{if(other!==detail)other.open=false});
      });
    });
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();