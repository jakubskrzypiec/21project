
const header=document.getElementById('siteHeader');
const menuBtn=document.getElementById('menuBtn');
const nav=document.getElementById('mainNav');
const setHeader=()=>header&&header.classList.toggle('scrolled',window.scrollY>20);
setHeader(); window.addEventListener('scroll',setHeader,{passive:true});

if(menuBtn&&nav){
  menuBtn.addEventListener('click',()=>{
    const open=nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded',String(open));
    document.body.classList.toggle('menu-open',open);
  });
  nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
    nav.classList.remove('open');document.body.classList.remove('menu-open');menuBtn.setAttribute('aria-expanded','false');
  }));
}

const els=document.querySelectorAll('.reveal');
if('IntersectionObserver' in window){
  const io=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target);}
    });
  },{threshold:.12,rootMargin:'0px 0px -30px 0px'});
  els.forEach((el,i)=>{el.style.transitionDelay=`${Math.min(i%4,3)*65}ms`;io.observe(el);});
}else els.forEach(el=>el.classList.add('visible'));

// small premium parallax only on precise pointer devices
if(matchMedia('(pointer:fine)').matches){
  const hv=document.querySelector('.hero-visual');
  if(hv){
    hv.addEventListener('mousemove',e=>{
      const r=hv.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
      const laptop=hv.querySelector('.laptop'), phone=hv.querySelector('.phone');
      if(laptop) laptop.style.transform=`translate(${x*5}px,${y*4}px)`;
      if(phone) phone.style.transform=`translate(${x*-7}px,${y*-5}px)`;
    });
    hv.addEventListener('mouseleave',()=>{
      const laptop=hv.querySelector('.laptop'),phone=hv.querySelector('.phone');
      if(laptop) laptop.style.transform=''; if(phone) phone.style.transform='';
    });
  }
}
