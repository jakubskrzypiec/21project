(()=>{
const tabs=[...document.querySelectorAll('.panel-tabs button')],imgs=[...document.querySelectorAll('.panel-imgs .shot')];
tabs.forEach(b=>b.addEventListener('click',()=>{
  tabs.forEach(t=>t.setAttribute('aria-pressed',String(t===b)));
  imgs.forEach(i=>i.classList.toggle('is-on',i.dataset.id===b.dataset.shot));
}));
})();
