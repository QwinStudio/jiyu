(()=>{
  if((location.pathname.split('/').pop()||'').toLowerCase()!=='music-player.html')return;
  const style=document.createElement('style');
  style.textContent='.music-lyrics-mode{background:radial-gradient(circle at 12% 100%,#263957 0,transparent 56%),linear-gradient(150deg,#10182c,#04060d)!important}.music-lyrics-mode .music-lyrics-sheet{padding-left:clamp(18px,4vw,48px)!important;padding-right:clamp(18px,4vw,48px)!important;box-sizing:border-box;overflow-x:visible!important}.music-lyrics-sheet p{letter-spacing:-.025em!important;filter:blur(4px)!important}.music-lyrics-sheet p[data-distance="1"]{filter:blur(1.2px)!important}.music-lyrics-sheet p[data-distance="2"]{filter:blur(2.4px)!important}.music-lyrics-sheet p[data-distance="3"],.music-lyrics-sheet p[data-distance="4"]{filter:blur(3.5px)!important}.music-lyrics-sheet p.active{filter:none!important;transform:scale(1.012)!important}.music-lyrics-controls{display:flex;align-items:center;gap:7px;margin-left:auto}.music-lyrics-controls button{display:grid;place-items:center;width:38px;height:38px;padding:0;border:1px solid rgba(255,255,255,.2);border-radius:50%;background:rgba(255,255,255,.08);color:#fff;font-size:15px;cursor:pointer}.music-lyrics-controls .lyrics-play{width:44px;height:44px;background:#e8faff;color:#102333;font-size:17px}@media(max-width:1024px){.music-lyrics-mode .music-lyrics-sheet{padding-left:18px!important;padding-right:18px!important}.music-lyrics-header{gap:10px}.music-lyrics-controls{gap:5px}.music-lyrics-controls button{width:34px;height:34px;font-size:13px}.music-lyrics-controls .lyrics-play{width:38px;height:38px;font-size:15px}.music-lyrics-header>div{min-width:0}.music-lyrics-header strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:115px}}';
  document.head.append(style);
  const controlsStyle=document.createElement('style');
  controlsStyle.textContent='.music-lyrics-controls{gap:10px!important}.music-lyrics-controls button{width:42px!important;height:42px!important;border-color:rgba(255,255,255,.28)!important;background:rgba(255,255,255,.06)!important;font-size:0!important}.music-lyrics-controls button img{display:block;width:20px;height:20px;pointer-events:none;filter:brightness(0) invert(1)}.music-lyrics-controls .lyrics-play{width:58px!important;height:58px!important;background:#e8faff!important}.music-lyrics-controls .lyrics-play img{width:25px;height:25px;filter:brightness(0) saturate(100%) invert(13%) sepia(20%) saturate(1241%) hue-rotate(148deg) brightness(89%) contrast(92%)}@media(max-width:1024px){.music-lyrics-controls{gap:7px!important}.music-lyrics-controls button{width:36px!important;height:36px!important}.music-lyrics-controls button img{width:17px;height:17px}.music-lyrics-controls .lyrics-play{width:46px!important;height:46px!important}.music-lyrics-controls .lyrics-play img{width:21px;height:21px}}';
  document.head.append(controlsStyle);

  const attach=mode=>{
    if(mode.dataset.lyricsControlsReady==='1')return;
    const root=document.querySelector('#music-player'),audio=root?.querySelector('audio'),header=mode.querySelector('.music-lyrics-header');
    if(!audio||!header)return;
    mode.dataset.lyricsControlsReady='1';
    const controls=document.createElement('div');
    controls.className='music-lyrics-controls';
    const icon=name=>`<img src="https://cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/${name}.svg" alt="">`;
    controls.innerHTML=`<button type="button" class="lyrics-prev" aria-label="Previous">${icon('skip-back')}</button><button type="button" class="lyrics-play" aria-label="Play">${icon('play')}</button><button type="button" class="lyrics-next" aria-label="Next">${icon('skip-forward')}</button>`;
    header.append(controls);
    const play=controls.querySelector('.lyrics-play');
    const sync=()=>{play.innerHTML=icon(audio.paused?'play':'pause')};
    controls.querySelector('.lyrics-prev').onclick=()=>root.querySelector('.music-revive-controls .prev')?.click();
    controls.querySelector('.lyrics-next').onclick=()=>root.querySelector('.music-revive-controls .next')?.click();
    play.onclick=()=>audio.paused?audio.play():audio.pause();
    audio.addEventListener('play',sync);audio.addEventListener('pause',sync);sync();
  };
  const observer=new MutationObserver(()=>document.querySelectorAll('.music-lyrics-mode').forEach(attach));
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.querySelectorAll('.music-lyrics-mode').forEach(attach);
})();
