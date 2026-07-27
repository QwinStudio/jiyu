(()=>{
  if((location.pathname.split('/').pop()||'').toLowerCase()!=='music-player.html')return;
  const style=document.createElement('style');
  style.textContent='@media(max-width:1024px){body.music-player-dock-hidden .music-mini{right:18px!important;bottom:calc(18px + env(safe-area-inset-bottom))!important}}';
  document.head.append(style);
})();
