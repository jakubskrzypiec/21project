(()=>{
const items=document.querySelectorAll('.work,.plan,.step,.studio-item,.social-card,.contact-card,.cap');
if(!('IntersectionObserver' in window)){items.forEach(el=>el.classList.add('is-in'));return;}
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-in');io.unobserve(e.target);}}),{threshold:.2});
items.forEach(el=>io.observe(el));
})();
