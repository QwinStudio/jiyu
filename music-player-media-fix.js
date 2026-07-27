(()=>{
  if((location.pathname.split('/').pop()||'').toLowerCase()!=='music-player.html')return;
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
