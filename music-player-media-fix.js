(()=>{
  if((location.pathname.split('/').pop()||'').toLowerCase()!=='music-player.html')return;
  // The player is rendered asynchronously by music-revive.js.  Keep the cover
  // backdrop in this player-only enhancement so album/home pages stay untouched.
  const backdropCss=document.createElement('style');
  backdropCss.textContent=`
    body.music-dark.music-player-cover-background{isolation:isolate;background:#05070e!important}
    .music-player-cover-backdrop{position:fixed;inset:-12%;z-index:0;pointer-events:none;
      background-image:var(--music-player-cover-background);background-position:center;
      background-size:cover;background-repeat:no-repeat;filter:blur(46px) saturate(1.18);
      transform:scale(1.12);opacity:.62;transition:background-image .42s ease,opacity .28s ease}
    .music-player-cover-backdrop::after{content:"";position:absolute;inset:0;
      background:linear-gradient(135deg,rgba(3,7,17,.50),rgba(3,7,14,.72))}
    body.music-dark.music-player-cover-background .ambient{opacity:.18!important}
    body.music-dark.music-player-cover-background #music-player{position:relative;z-index:1}
  `;
  document.head.append(backdropCss);
  let backdrop;
  const applyCoverBackdrop=()=>{
    const cover=document.querySelector('#music-player .music-revive-cover img');
    if(!cover?.src)return;
    if(!backdrop){
      backdrop=document.createElement('div');
      backdrop.className='music-player-cover-backdrop';
      backdrop.setAttribute('aria-hidden','true');
      document.body.prepend(backdrop);
    }
    document.body.classList.add('music-player-cover-background');
    backdrop.style.setProperty('--music-player-cover-background',`url("${cover.src.replace(/"/g,'\\"')}")`);
  };
  const coverObserver=new MutationObserver(applyCoverBackdrop);
  coverObserver.observe(document.documentElement,{childList:true,subtree:true});
  applyCoverBackdrop();
  const layoutCss=document.createElement('style');
  layoutCss.textContent=`
    /* Keep the transport actions as one deliberate cluster on every viewport. */
    #music-player.music-revive-player .music-revive-controls{justify-content:center!important;gap:16px!important}
    #music-player.music-revive-player .music-revive-actions{display:flex;align-items:center;gap:10px;margin-top:18px}
    #music-player.music-revive-player .music-revive-actions .music-revive-more,
    #music-player.music-revive-player .music-revive-actions .music-revive-playlist-trigger{margin:0!important}
    #music-player.music-revive-player .music-revive-actions .music-revive-playlist-trigger,
    #music-player.music-revive-player .music-revive-actions .music-revive-more>button{min-height:38px;padding:9px 15px}
    @media(max-width:1024px){
      #music-player.music-revive-player .music-revive-controls{gap:13px!important}
      #music-player.music-revive-player .music-revive-actions{margin-top:15px;gap:8px}
      #music-player.music-revive-player .music-revive-actions .music-revive-playlist-trigger,
      #music-player.music-revive-player .music-revive-actions .music-revive-more>button{min-height:36px;padding:8px 13px}
    }
  `;
  document.head.append(layoutCss);
  const groupPlayerActions=()=>{
    const root=document.querySelector('#music-player.music-revive-player');
    const more=root?.querySelector('.music-revive-more');
    const playlist=root?.querySelector('.music-revive-playlist-trigger');
    if(!root||!more||!playlist||more.parentElement?.classList.contains('music-revive-actions'))return;
    const group=document.createElement('div');
    group.className='music-revive-actions';
    more.parentElement.insertBefore(group,more);
    // Playlist intentionally comes first: it is the most common follow-up action.
    group.append(playlist,more);
  };
  const layoutObserver=new MutationObserver(groupPlayerActions);
  layoutObserver.observe(document.documentElement,{childList:true,subtree:true});
  groupPlayerActions();
  const format=seconds=>{
    const value=Math.max(0,Math.floor(Number(seconds)||0));
    return String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0');
  };
  const enhanced=new WeakSet();
  const enhance=()=>{
    const root=document.querySelector('#music-player');
    const audio=root?.querySelector('audio');
    // The music UI is rebuilt in place. Track the actual <audio>, not its
    // persistent parent container, so the replacement player gets listeners.
    if(!root||!audio||enhanced.has(audio))return;
    enhanced.add(audio);

    const source=audio.getAttribute('src')||'';
    if(!audio.dataset.lyrics&&source){
      audio.dataset.lyrics=source.replace(/\.[a-z0-9]+(?:[?#].*)?$/i,'.lrc');
    }
    const duration=root.querySelector('.music-revive-times span:last-child');
    const update=()=>{
      if(duration&&Number.isFinite(audio.duration)&&audio.duration>0){
        duration.textContent=format(audio.duration);
      }
    };
    ['loadedmetadata','durationchange','loadeddata','canplay','playing'].forEach(name=>audio.addEventListener(name,update));
    audio.preload='auto';
    // Setting src/preload already starts metadata loading. Calling load() here
    // aborts the play request made immediately after selecting a track.
    update();
    [180,650,1600,3200].forEach(delay=>setTimeout(update,delay));
  };
  const observer=new MutationObserver(enhance);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  enhance();
})();
