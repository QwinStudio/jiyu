(() => {
  const header = document.querySelector('body.music-dark .nav');
  const menu = header?.querySelector('nav');
  if (!header || !menu) return;

  const style = document.createElement('style');
  style.textContent = `
    body.music-dark .nav nav a{transition:color .28s ease,transform .28s ease!important}
    body.music-dark .nav nav a.active{color:#fff!important;animation:musicNavActive .36s cubic-bezier(.22,.86,.25,1) both}
    body.music-dark .nav .liquid-indicator{border-color:rgba(178,238,255,.7)!important;background:linear-gradient(135deg,rgba(218,248,255,.38),rgba(89,184,225,.22) 48%,rgba(71,105,189,.34))!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.64),inset 0 -1px 0 rgba(88,180,223,.18),0 7px 18px rgba(0,0,0,.26)!important;will-change:left,width,transform;transition:left .46s cubic-bezier(.22,.9,.25,1),width .46s cubic-bezier(.22,.9,.25,1),opacity .2s!important}
    body.music-dark .nav .liquid-indicator:after{animation-duration:3s!important}
    @keyframes musicNavActive{from{opacity:.45;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
    @keyframes musicNavGlow{0%{filter:brightness(.82);transform:scale(.88)}55%{filter:brightness(1.36);transform:scale(1.08)}100%{filter:none;transform:scale(1)}}
  `;
  document.head.append(style);

  let indicator = menu.querySelector('.liquid-indicator');
  if (!indicator) {
    indicator = document.createElement('span');
    indicator.className = 'liquid-indicator';
    menu.prepend(indicator);
  }
  const active = menu.querySelector('a.active');
  if (!active) return;
  const positionIndicator = () => {
    const indicator = menu.querySelector('.liquid-indicator');
    const host = menu.getBoundingClientRect();
    const item = active.getBoundingClientRect();
    indicator.style.left = `${item.left - host.left}px`;
    indicator.style.width = `${item.width}px`;
    indicator.style.opacity = '1';
  };
  requestAnimationFrame(() => requestAnimationFrame(positionIndicator));
  window.addEventListener('resize', positionIndicator, { passive: true });
  window.addEventListener('pageshow', positionIndicator, { passive: true });

  // The general navigation handler can complete the location change before a
  // dark-page indicator has painted. Handle this page in capture phase so the
  // liquid indicator always gets one rendered transition before navigation.
  menu.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || link === active || matchMedia('(max-width:1024px)').matches || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const indicator = menu.querySelector('.liquid-indicator');
    if (indicator) {
      const host = menu.getBoundingClientRect();
      const item = link.getBoundingClientRect();
      indicator.style.left = `${item.left - host.left}px`;
      indicator.style.width = `${item.width}px`;
      indicator.style.animation = 'none';
      requestAnimationFrame(() => { indicator.style.animation = 'musicNavGlow .46s cubic-bezier(.22,.9,.25,1) both'; });
    }
    menu.querySelectorAll('a').forEach(item => item.classList.toggle('active', item === link));
    window.setTimeout(() => { window.location.href = link.href; }, 470);
  }, true);
})();
