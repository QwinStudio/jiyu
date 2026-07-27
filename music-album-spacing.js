(()=>{
  if((location.pathname.split('/').pop()||'').toLowerCase()!=='music-album.html')return;
  // music-revive renders the album contents into this root.  The root must
  // carry its layout class as well, otherwise the cover loses its max width
  // and expands to the full viewport.
  const albumRoot=document.querySelector('#music-album');
  albumRoot?.classList.add('music-revive-album');
  const style=document.createElement('style');
  style.textContent='@media(max-width:1200px){.music-revive-album{padding-top:18px!important}.music-revive-album-hero{margin-top:0!important;gap:24px!important}.music-revive-album .music-revive-art{margin-top:0!important}}@media(max-width:1024px){body.music-album-dock-hidden .mobile-dock{opacity:0!important;pointer-events:none!important;transform:translate(-50%,calc(100% + 34px))!important;transition:transform .34s cubic-bezier(.22,.9,.25,1),opacity .24s ease!important}}';
  document.head.append(style);
  requestAnimationFrame(()=>requestAnimationFrame(()=>document.body.classList.add('music-album-dock-hidden')));
})();
