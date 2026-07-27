(() => {
  const svg = name => `https://api.iconify.design/lucide:${name}.svg?color=%23eaf6ff`;
  const setIcon = (element, name, label) => {
    if (!element) return;
    if (element.dataset.svgIcon === name && element.querySelector('img.music-svg-icon')) return;
    element.dataset.svgIcon = name;
    if (label) element.setAttribute('aria-label', label);
    element.innerHTML = `<img class="music-svg-icon" src="${svg(name)}" alt="">`;
  };
  const style = document.createElement('style');
  style.textContent = `.music-svg-icon{display:block;width:22px;height:22px;object-fit:contain;pointer-events:none}.music-revive-controls button,.lyrics-mini-controls button{display:grid!important;place-items:center!important}.music-revive-controls button .music-svg-icon{width:23px;height:23px}.music-revive-controls .play .music-svg-icon{width:28px;height:28px;filter:brightness(0) saturate(100%) invert(13%) sepia(20%) saturate(1241%) hue-rotate(148deg) brightness(89%) contrast(92%)}.music-revive-back.music-svg-back{display:grid!important;place-items:center!important;font-size:0!important}.music-revive-back.music-svg-back .music-svg-icon{width:27px;height:27px}.music-revive-desktop-back.music-svg-back{display:inline-flex!important;align-items:center;gap:8px}.music-revive-desktop-back.music-svg-back .music-svg-icon{width:17px;height:17px}.music-mini span.music-svg-fallback{display:grid;place-items:center;color:transparent!important}.music-mini span.music-svg-fallback .music-svg-icon{width:26px;height:26px}.music-lyrics-close.music-svg-close,.music-playlist-close.music-svg-close{display:grid;place-items:center;font-size:0!important}.music-lyrics-close.music-svg-close .music-svg-icon,.music-playlist-close.music-svg-close .music-svg-icon{width:23px;height:23px}.music-external-card em.music-svg-external{font-size:0!important}.music-external-card em.music-svg-external .music-svg-icon{width:18px;height:18px}.music-external-composer header [data-close].music-svg-close{display:grid;place-items:center;font-size:0!important}body.music-dark .nav .menu.music-svg-menu{display:grid!important;place-items:center;font-size:0!important}body.music-dark .nav .menu.music-svg-menu .music-svg-icon{width:25px;height:25px}@media(min-width:1025px){.music-revive-back.music-svg-back,body.music-dark .nav .menu{display:none!important}}@media(max-width:1024px){.music-revive-back.music-svg-back,.music-revive-desktop-back.music-svg-back{display:none!important}}`;
  document.head.append(style);
  const patch = () => {
    const audio = document.querySelector('#music-player audio');
    const controls = document.querySelector('.music-revive-controls');
    if (controls) {
      setIcon(controls.querySelector('.prev'), 'skip-back', 'Previous track');
      setIcon(controls.querySelector('.next'), 'skip-forward', 'Next track');
      setIcon(controls.querySelector('.play'), audio?.paused ? 'play' : 'pause', audio?.paused ? 'Play' : 'Pause');
    }
    document.querySelectorAll('.lyrics-mini-controls').forEach(group => {setIcon(group.querySelector('.lyrics-prev'), 'skip-back', 'Previous track');setIcon(group.querySelector('.lyrics-next'), 'skip-forward', 'Next track');setIcon(group.querySelector('.lyrics-play'), audio?.paused ? 'play' : 'pause', audio?.paused ? 'Play' : 'Pause')});
    document.querySelectorAll('.music-revive-back').forEach(link => {link.classList.add('music-svg-back');setIcon(link, 'chevron-left', link.getAttribute('aria-label') || 'Back')});
    document.querySelectorAll('.music-revive-desktop-back').forEach(link => {if(link.dataset.svgBackReady==='1')return;const label=link.textContent.replace(/^[\s←]+/,'').trim();link.dataset.svgBackReady='1';link.classList.add('music-svg-back');link.innerHTML=`<img class="music-svg-icon" src="${svg('arrow-left')}" alt=""><span>${label}</span>`});
    document.querySelectorAll('.music-mini span').forEach(span => {if(!span.querySelector('img')&&span.textContent.trim()){span.classList.add('music-svg-fallback');setIcon(span,'music-2','Music')}});
    document.querySelectorAll('.music-lyrics-close').forEach(button => {if(button.querySelector('img'))return;button.classList.add('music-svg-close');setIcon(button,'music-2','Close lyrics')});
    document.querySelectorAll('.music-playlist-close').forEach(button => {button.classList.add('music-svg-close');setIcon(button,'x','Close playlist')});
    document.querySelectorAll('[data-pitch="-1"]').forEach(button => setIcon(button,'minus','Lower pitch'));
    document.querySelectorAll('[data-pitch="1"]').forEach(button => setIcon(button,'plus','Raise pitch'));
    document.querySelectorAll('.music-external-card em').forEach(icon => {setIcon(icon,icon.closest('.music-external-compose')?'plus':'external-link','External music');icon.classList.add('music-svg-external')});
    document.querySelectorAll('.music-external-composer header [data-close]').forEach(button => {button.classList.add('music-svg-close');setIcon(button,'x','Close')});
    const menu=document.querySelector('body.music-dark .nav .menu'),drawer=document.querySelector('.mobile-nav');if(menu){menu.classList.add('music-svg-menu');setIcon(menu,drawer?.classList.contains('open')?'x':'menu',drawer?.classList.contains('open')?'Close menu':'Open menu')}
  };
  const bindAudio = () => {const audio=document.querySelector('#music-player audio');if(!audio||audio.dataset.svgIconBound==='1')return;audio.dataset.svgIconBound='1';['play','pause','ended'].forEach(event=>audio.addEventListener(event,patch))};
  const refresh = () => {bindAudio();patch()};
  new MutationObserver(refresh).observe(document.documentElement,{childList:true,subtree:true});
  refresh();
})();

// This file is loaded only by music.html, music-album.html and music-player.html.
// Align the mobile search and drawer controls without touching site-wide navigation.
(() => {
  const style = document.createElement('style');
  style.textContent = `
    @media (max-width: 1024px) {
      body.music-dark .nav > .mobile-actions {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      body.music-dark .nav > .mobile-actions .search-trigger,
      body.music-dark .nav > .mobile-actions .menu {
        display: grid !important;
        place-items: center !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 0 !important;
        line-height: 1 !important;
        text-align: center !important;
      }
      body.music-dark .nav > .mobile-actions .search-trigger img {
        display: block !important;
        width: 18px !important;
        height: 18px !important;
        margin: 0 !important;
        transform: none !important;
      }
      body.music-dark .nav > .mobile-actions .menu::before,
      body.music-dark .nav > .mobile-actions .menu::after { content: none !important; display: none !important; }
      body.music-dark .nav > .mobile-actions .menu img { display:block !important; width:18px !important; height:18px !important; margin:0 !important; }
    }
  `;
  document.head.append(style);
})();

// Keep the album-owned markup, with only music-specific data (back target and
// SVG menu glyph) applied after app.js has finished its common setup.
(() => {
  const header=document.querySelector('body.music-dark .nav');
  if(!header)return;
  const page=(location.pathname.split('/').pop()||'music.html').toLowerCase();
  const logo=header.querySelector(':scope > .logo');
  if(logo&&page==='music-player.html'){
    logo.href=`music-album.html?album=${encodeURIComponent(new URLSearchParams(location.search).get('album')||'')}`;
  }
  // Desktop subpages use the same quiet text return affordance as the album
  // chapter page.  Mobile keeps the circular logo-back control supplied by app.js.
  if((page==='music-album.html'||page==='music-player.html')&&!document.querySelector('.music-album-nav-return')){
    const album=new URLSearchParams(location.search).get('album')||'';
    const target=page==='music-player.html'
      ?`music-album.html?album=${encodeURIComponent(album)}`
      :'music.html';
    const language=localStorage.getItem('jiyuLang')||'zhs';
    const label=language==='en'?'Back':language==='zht'?'返回':'返回';
    const back=document.createElement('a');
    back.className='music-album-nav-return';
    back.href=target;
    back.innerHTML=`<img src="https://api.iconify.design/lucide:arrow-left.svg?color=%23eaf6ff" alt=""> <span>${label}</span>`;
    const main=document.querySelector('main');
    if(main) main.insertBefore(back,main.firstChild);
  }
  const menu=header.querySelector(':scope .menu'),drawer=document.querySelector('.mobile-nav');
  // Width alone is unreliable on scaled desktop displays: a desktop browser can
  // report <=1024 CSS pixels.  Use the actual input capability to decide whether
  // the hamburger belongs to the interface.
  const syncDesktopMenu=()=>{
    if(!menu)return;
    const desktop=matchMedia('(hover:hover) and (pointer:fine)').matches;
    menu.hidden=desktop;
    menu.setAttribute('aria-hidden',desktop?'true':'false');
  };
  syncDesktopMenu();
  addEventListener('resize',syncDesktopMenu,{passive:true});
  if(menu&&drawer){
    const paint=()=>{
      const open=drawer.classList.contains('open');
      menu.setAttribute('aria-label',open?'关闭导航':'打开导航');
      menu.innerHTML=`<img class="music-svg-icon" src="https://api.iconify.design/lucide:${open?'x':'menu'}.svg?color=%23ffffff" alt="">`;
    };
    menu.onclick=event=>{event.preventDefault();event.stopPropagation();drawer.classList.toggle('open');paint()};
    drawer.addEventListener('click',event=>{if(event.target===drawer){drawer.classList.remove('open');paint()}});
    document.addEventListener('pointerdown',event=>{if(drawer.classList.contains('open')&&!drawer.contains(event.target)&&!menu.contains(event.target)){drawer.classList.remove('open');paint()}});
    paint();
  }
  const style=document.createElement('style');
  style.textContent='body.music-dark .music-revive-back,body.music-dark .music-revive-desktop-back{display:none!important}.music-album-nav-return{position:fixed;z-index:24;top:108px;left:max(28px,calc((100vw - 1160px)/2));display:inline-flex;align-items:center;gap:8px;color:#eaf6ff;text-decoration:none;font:600 12px "HarmonyOS Sans",sans-serif;letter-spacing:.06em;opacity:.76;transition:opacity .2s,transform .2s}.music-album-nav-return img{width:16px;height:16px;object-fit:contain}.music-album-nav-return:hover{opacity:1;transform:translateX(-3px)}@media(max-width:1024px){.music-album-nav-return{display:none!important}}@media(hover:hover) and (pointer:fine){body.music-dark .nav .menu,body.music-dark .nav .mobile-actions .menu{display:none!important}}';
  document.head.append(style);
})();

// Music intentionally uses the same navigation owner as Album: app.js builds
// the header, drawer, settings and Dock once for every page.  Do not replace
// that header here; replacing it was the source of the two competing layouts.
(() => {
  const oldHeader = document.querySelector('body.music-dark .nav');
  // This alternate header builder is kept only for explicit debugging.  It
  // must never auto-run: app.js already owns the shared Album-style header.
  if (!oldHeader || document.body.dataset.enableLegacyMusicHeader !== '1') return;
  const page = (location.pathname.split('/').pop() || 'music.html').toLowerCase();
  const isSubpage = page === 'music-album.html' || page === 'music-player.html';
  const drawer = document.querySelector('.mobile-nav');
  const search = oldHeader.querySelector('.search-trigger');
  const settings = oldHeader.querySelector('.settings-trigger');
  const join = oldHeader.querySelector('.join');
  const originalLogo = oldHeader.querySelector('.logo');
  const links = [...oldHeader.querySelectorAll(':scope > nav > a')].map(link => ({
    href: link.getAttribute('href'), text: link.textContent, active: link.classList.contains('active')
  }));
  const header = document.createElement('header');
  header.className = 'nav music-clean-nav';
  // Wide mouse/trackpad windows count as desktop even on touch-capable PCs.
  const desktopPointer = window.innerWidth > 1180 || matchMedia('(hover:hover) and (pointer:fine)').matches;
  header.classList.toggle('music-pointer-desktop', desktopPointer);
  header.dataset.musicNavClean = '1';
  const parent = page === 'music-player.html'
    ? `music-album.html?album=${encodeURIComponent(new URLSearchParams(location.search).get('album') || '')}`
    : 'music.html';
  const logo = document.createElement('a');
  logo.className = `logo${isSubpage ? ' music-clean-back' : ''}`;
  logo.href = isSubpage ? parent : (originalLogo?.getAttribute('href') || 'index.html');
  logo.innerHTML = isSubpage ? '<span class="music-clean-back-icon"></span><span class="music-clean-back-text">返回上一级</span>' : 'JIYU<span>Gebit</span>';
  const nav = document.createElement('nav');
  links.forEach(data => {
    const link = document.createElement('a');
    link.href = data.href;
    link.textContent = data.text;
    link.className = data.active ? 'active' : '';
    nav.append(link);
  });
  const actions = document.createElement('div');
  actions.className = 'mobile-actions';
  header.append(logo, nav);
  if (join) header.append(join);
  if (search) actions.append(search);
  if (settings) actions.append(settings);
  const menu = document.createElement('button');
  menu.className = 'menu music-clean-menu';
  menu.type = 'button';
  menu.setAttribute('aria-label', 'Menu');
  const setMenu = open => {
    menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.innerHTML = `<img src="https://api.iconify.design/lucide:${open ? 'x' : 'menu'}.svg?color=%23ffffff" alt="">`;
  };
  setMenu(false);
  actions.append(menu);
  header.append(actions);
  oldHeader.replaceWith(header);
  const style = document.createElement('style');
  style.textContent = `
    body.music-dark .music-clean-nav{background:rgba(19,22,23,.7)!important;border-color:rgba(255,255,255,.14)!important;box-shadow:none!important}
    body.music-dark .music-clean-nav .logo,body.music-dark .music-clean-nav nav a{color:#e9ecec!important}
    body.music-dark .music-clean-nav .logo>span{color:#7bd9ef!important}
    body.music-dark .music-clean-nav nav a.active{background:transparent!important;color:#fff!important}
    .music-clean-nav nav{position:relative}
    .music-clean-nav .liquid-indicator{position:absolute;z-index:0;top:2px;height:calc(100% - 4px);border:1px solid rgba(255,255,255,.38);border-radius:999px;background:rgba(255,255,255,.12);box-shadow:inset 0 1px 0 rgba(255,255,255,.15),0 6px 16px rgba(0,0,0,.2);transition:left .46s cubic-bezier(.22,.9,.25,1),width .46s cubic-bezier(.22,.9,.25,1);pointer-events:none}
    .music-clean-nav.music-nav-arrival .liquid-indicator{animation:musicNavArrival .46s cubic-bezier(.22,.9,.25,1) both}@keyframes musicNavArrival{from{opacity:0;transform:scale(.78);filter:blur(4px)}to{opacity:1;transform:scale(1);filter:blur(0)}}
    .music-clean-nav nav a{position:relative;z-index:1}
    .music-clean-nav .music-clean-menu img{display:block;width:25px;height:25px}
    body.music-dark .music-clean-nav.music-pointer-desktop .mobile-actions{display:contents!important}body.music-dark .music-clean-nav.music-pointer-desktop .music-clean-menu{display:none!important}.music-clean-nav.music-pointer-desktop .music-clean-back{font:600 14px "HarmonyOS Sans",sans-serif!important;letter-spacing:.04em}.music-clean-nav.music-pointer-desktop .music-clean-back-icon{display:inline-block;width:17px;height:17px;margin-right:8px;vertical-align:-3px;background:url('https://api.iconify.design/lucide:arrow-left.svg?color=%23e9ecec') center/contain no-repeat}.music-clean-nav.music-pointer-desktop .music-clean-back-text{color:#e9ecec!important}
    body.music-dark .music-clean-nav:not(.music-pointer-desktop){background:transparent!important;border-color:transparent!important;box-shadow:none!important}.music-clean-nav:not(.music-pointer-desktop)>.logo,.music-clean-nav:not(.music-pointer-desktop)>.mobile-actions{background:linear-gradient(135deg,rgba(34,43,45,.78),rgba(12,18,19,.72))!important;border-color:rgba(255,255,255,.17)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 9px 22px rgba(0,0,0,.28)!important}.music-clean-nav:not(.music-pointer-desktop)>.mobile-actions{display:flex!important;align-items:center!important}.music-clean-nav:not(.music-pointer-desktop) .mobile-actions .search-trigger,.music-clean-nav:not(.music-pointer-desktop) .mobile-actions .menu{display:grid!important;place-items:center;color:#fff!important;background:transparent!important}.music-clean-nav:not(.music-pointer-desktop) .music-clean-menu{display:grid!important;place-items:center!important}.music-clean-nav:not(.music-pointer-desktop) .music-clean-back{position:relative!important;display:grid!important;place-items:center!important;width:58px!important;height:58px!important;padding:0!important;border-radius:50%!important;font-size:0!important}.music-clean-nav:not(.music-pointer-desktop) .music-clean-back-icon{display:block!important;width:24px!important;height:24px!important;background:url('https://api.iconify.design/lucide:chevron-left.svg?color=%23ffffff') center/contain no-repeat}.music-clean-nav:not(.music-pointer-desktop) .music-clean-back-text{display:none!important}
    body.music-dark .music-revive-back,body.music-dark .music-revive-desktop-back{display:none!important}
  `;
  document.head.append(style);
  let indicator = document.createElement('span');
  indicator.className = 'liquid-indicator';
  nav.prepend(indicator);
  const place = (link, animate) => {
    if (!link) return;
    const host = nav.getBoundingClientRect(), rect = link.getBoundingClientRect();
    if (!animate) indicator.style.transition = 'none';
    indicator.style.left = `${rect.left - host.left}px`;
    indicator.style.width = `${rect.width}px`;
    if (!animate) requestAnimationFrame(() => { indicator.style.transition = ''; });
  };
  place(nav.querySelector('.active'), false);
  if (sessionStorage.getItem('jiyuMusicNavArrival') === '1') {
    sessionStorage.removeItem('jiyuMusicNavArrival');
    header.classList.add('music-nav-arrival');
    setTimeout(() => header.classList.remove('music-nav-arrival'), 500);
  }
  addEventListener('resize', () => place(nav.querySelector('.active'), false), { passive: true });
  nav.addEventListener('click', event => {
    const target = event.target.closest('a[href]');
    if (!target || target.classList.contains('active') || !desktopPointer || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    nav.querySelectorAll('a').forEach(link => link.classList.toggle('active', link === target));
    place(target, true);
    setTimeout(() => location.assign(target.href), 480);
  });
  menu.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    if (!drawer) return;
    drawer.classList.toggle('open');
    setMenu(drawer.classList.contains('open'));
  });
  if (drawer) drawer.addEventListener('click', event => {
    if (event.target === drawer) { drawer.classList.remove('open'); setMenu(false); }
  });
  document.addEventListener('pointerdown', event => {
    if (!drawer || !drawer.classList.contains('open') || drawer.contains(event.target) || menu.contains(event.target)) return;
    drawer.classList.remove('open');
    setMenu(false);
  });
})();

// This is deliberately last: it wins over legacy music navigation rules while
// remaining isolated to the three pages that import this file.
(() => {
  const style = document.createElement('style');
  style.textContent = `@media (max-width:1024px){
    body.music-dark .nav > .mobile-actions{display:flex!important;align-items:center!important;justify-content:center!important}
    body.music-dark .nav > .mobile-actions .search-trigger,
    body.music-dark .nav > .mobile-actions .menu{display:grid!important;place-items:center!important;box-sizing:border-box!important;margin:0!important;padding:0!important;line-height:1!important;text-align:center!important}
    body.music-dark .nav > .mobile-actions .search-trigger img{display:block!important;width:18px!important;height:18px!important;margin:0!important;transform:none!important}
    body.music-dark .nav > .mobile-actions .menu::before,body.music-dark .nav > .mobile-actions .menu::after{content:none!important;display:none!important}
    body.music-dark .nav > .mobile-actions .menu img{display:block!important;width:18px!important;height:18px!important;margin:0!important;transform:none!important}
  }`;
  document.head.append(style);

  const keepMobileMenuVisible = () => {
    if (!matchMedia('(max-width: 1024px)').matches) return;
    const menu = document.querySelector('body.music-dark .nav .menu');
    if (!menu) return;
    menu.hidden = false;
    menu.removeAttribute('aria-hidden');
  };
  keepMobileMenuVisible();
  addEventListener('resize', keepMobileMenuVisible, { passive: true });
})();
