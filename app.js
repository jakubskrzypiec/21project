(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];

  const menuBtn = $('.menu-btn');
  const nav = $('.nav');
  if (menuBtn && nav) menuBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });

  $$('.faq-q').forEach(btn => btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const open = item.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  }));

  const params = new URLSearchParams(location.search);
  const tracking = {
    sessionId: getSession(),
    referrer: document.referrer,
    pagePath: location.pathname,
    utmSource: params.get('utm_source') || '',
    utmMedium: params.get('utm_medium') || '',
    utmCampaign: params.get('utm_campaign') || ''
  };
  function getSession(){
    let id = localStorage.getItem('21p_session');
    if (!id) { id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; localStorage.setItem('21p_session', id); }
    return id;
  }
  function track(eventType='pageview'){
    fetch('/api/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...tracking,eventType,path:location.pathname}),keepalive:true}).catch(()=>{});
  }
  if (localStorage.getItem('21p_analytics_consent') === 'yes') track('pageview');

  $$('.track-cta').forEach(el => el.addEventListener('click', () => {
    if (localStorage.getItem('21p_analytics_consent') === 'yes') track('cta_click');
  }));

  const cookie = $('.cookie');
  if (cookie && !localStorage.getItem('21p_analytics_consent')) cookie.classList.add('show');
  $('#cookie-yes')?.addEventListener('click',()=>{localStorage.setItem('21p_analytics_consent','yes');cookie?.classList.remove('show');track('pageview')});
  $('#cookie-no')?.addEventListener('click',()=>{localStorage.setItem('21p_analytics_consent','no');cookie?.classList.remove('show')});

  $$('.lead-form').forEach(form => form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = $('.form-status', form);
    const btn = $('button[type="submit"]', form);
    status.className = 'form-status'; status.textContent = 'Wysyłanie…'; btn.disabled = true;
    const raw = Object.fromEntries(new FormData(form).entries());
    raw.consent = Boolean($('input[name="consent"]', form)?.checked);
    Object.assign(raw, {...tracking, sessionId: localStorage.getItem('21p_analytics_consent') === 'yes' ? tracking.sessionId : ''});
    try {
      const r = await fetch('/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(raw)});
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Nie udało się wysłać formularza.');
      form.reset(); status.className='form-status ok'; status.textContent='Dzięki — wiadomość została zapisana. Odezwę się możliwie szybko.';
    } catch(err) { status.className='form-status error'; status.textContent=err.message; }
    finally { btn.disabled=false; }
  }));
})();
