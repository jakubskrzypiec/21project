(()=>{
const dlg=document.querySelector('.video-dialog');if(!dlg)return;
const vid=dlg.querySelector('video'),tabs=[...dlg.querySelectorAll('[data-v]')];
function load(kind){
  tabs.forEach(t=>t.setAttribute('aria-pressed',String(t.dataset.v===kind)));
  dlg.classList.toggle('is-mobile',kind==='mobile');
  vid.src=vid.dataset[kind];vid.load();
  const p=vid.play();if(p&&p.catch)p.catch(()=>{});
}
document.querySelectorAll('[data-open-video]').forEach(b=>b.addEventListener('click',()=>{dlg.showModal();load('desktop');}));
tabs.forEach(t=>t.addEventListener('click',()=>load(t.dataset.v)));
function close(){vid.pause();dlg.close();}
dlg.querySelector('.vd-close').addEventListener('click',close);
dlg.addEventListener('click',e=>{if(e.target!==dlg)return;const r=dlg.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();});
dlg.addEventListener('close',()=>vid.pause());
})();
