(()=>{
  if((location.pathname.split('/').pop()||'').toLowerCase()!=='music-player.html')return;

  const parse=raw=>String(raw||'').split(/\r?\n/).map(line=>{
    const match=line.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
    return match?{at:Number(match[1])*60+Number(match[2]),text:match[3].trim()}:null;
  }).filter(Boolean);
  const format=seconds=>`${Math.max(0,Number(seconds||0)).toFixed(1).replace(/\.0$/,'')}s`;
  const style=document.createElement('style');
  style.textContent='.music-lyrics-mode .music-lyrics-sheet{height:calc(100vh - 130px);margin:0!important;padding:42vh 0!important;overflow-y:auto;overscroll-behavior:contain;scroll-snap-type:y proximity;scrollbar-width:none;touch-action:pan-y}.music-lyrics-mode .music-lyrics-sheet::-webkit-scrollbar{display:none}.music-lyrics-sheet p{scroll-snap-align:center;transform:scale(.91);opacity:.24;filter:blur(9px);transition:color .34s ease,opacity .34s ease,filter .34s ease,transform .34s ease!important}.music-lyrics-sheet p[data-distance="1"]{opacity:.5;filter:blur(3px);transform:scale(.96)}.music-lyrics-sheet p[data-distance="2"]{opacity:.34;filter:blur(6px);transform:scale(.93)}.music-lyrics-sheet p[data-distance="3"],.music-lyrics-sheet p[data-distance="4"]{opacity:.22;filter:blur(8px)}.music-lyrics-sheet p.active{opacity:1!important;filter:none!important;transform:scale(1.018)!important}.music-lyric-duration{position:absolute;z-index:4;margin-left:14px;padding:5px 8px;border:1px solid rgba(255,255,255,.2);border-radius:999px;background:rgba(7,13,27,.72);box-shadow:0 8px 24px rgba(0,0,0,.25);color:#c7f6ff;font:600 11px "HarmonyOS Sans",sans-serif;letter-spacing:.04em;opacity:0;transform:translateY(-50%) scale(.9);pointer-events:none;transition:opacity .18s ease,transform .18s ease}.music-lyric-duration.show{opacity:1;transform:translateY(-50%) scale(1)}@media(max-width:1024px){.music-lyrics-mode .music-lyrics-sheet{height:calc(100vh - 112px);padding:40vh 0!important}.music-lyrics-sheet p{padding-right:40px}}';
  document.head.append(style);

  const attach=async mode=>{
    if(mode.dataset.interactiveLyricsReady==='1')return;
    const root=document.querySelector('#music-player'),audio=root?.querySelector('audio'),sheet=mode.querySelector('.music-lyrics-sheet');
    if(!audio||!sheet)return;
    mode.dataset.interactiveLyricsReady='1';
    const source=audio.dataset.lyrics||'';
    const lines=source?parse(await fetch(source).then(response=>response.ok?response.text():'').catch(()=>'')):[];
    const lyricNodes=[...sheet.querySelectorAll('[data-line]')];
    if(!lines.length||!lyricNodes.length)return;

    let active=-1,manualUntil=0,hideTimer=0;
    const badge=document.createElement('span');
    badge.className='music-lyric-duration';
    mode.append(badge);
    const placeBadge=(node,duration)=>{
      const nodeBox=node.getBoundingClientRect(),modeBox=mode.getBoundingClientRect();
      badge.textContent=format(duration);
      badge.style.left=`${Math.min(modeBox.width-54,Math.max(12,nodeBox.right-modeBox.left))}px`;
      badge.style.top=`${nodeBox.top-modeBox.top+nodeBox.height/2}px`;
      badge.classList.add('show');
      clearTimeout(hideTimer);
      hideTimer=setTimeout(()=>badge.classList.remove('show'),2000);
    };
    const center=node=>{
      if(Date.now()<manualUntil)return;
      sheet.scrollTo({top:Math.max(0,node.offsetTop+node.offsetHeight/2-sheet.clientHeight/2),behavior:'smooth'});
    };
    const update=()=>{
      let index=0;
      lines.forEach((line,current)=>{if(audio.currentTime>=line.at)index=current});
      const activeTime=lines[index]?.at;
      let groupStart=index;
      while(groupStart>0&&lines[groupStart-1]?.at===activeTime)groupStart--;
      const activeKey=`${activeTime}:${groupStart}`;
      if(activeKey===active)return;
      active=activeKey;
      const focusedNode=lyricNodes.find(node=>Number(node.dataset.sourceIndex??lyricNodes.indexOf(node))===index)||lyricNodes[index];
      const bilingualGroup=focusedNode?.dataset.bilingualGroup||'';
      lyricNodes.forEach((node,current)=>{
        const sourceIndex=Number(node.dataset.sourceIndex??current);
        const distance=Math.abs(sourceIndex-groupStart);
        node.classList.toggle('active',bilingualGroup?node.dataset.bilingualGroup===bilingualGroup:lines[sourceIndex]?.at===activeTime);
        node.dataset.distance=String(Math.min(distance,4));
      });
      center(lyricNodes.find(node=>Number(node.dataset.sourceIndex??lyricNodes.indexOf(node))===groupStart)||lyricNodes[groupStart]);
    };
    lyricNodes.forEach((node,index)=>node.addEventListener('click',()=>{
      const sourceIndex=Number(node.dataset.sourceIndex??index);
      const line=lines[sourceIndex];
      if(!line)return;
      manualUntil=0;
      audio.currentTime=line.at;
      const next=lines[sourceIndex+1]?.at;
      placeBadge(node,Number.isFinite(next)?next-line.at:Math.max(0,audio.duration-line.at));
      update();
    }));
    sheet.addEventListener('pointerdown',()=>{manualUntil=Date.now()+5000},{passive:true});
    audio.addEventListener('timeupdate',update);
    audio.addEventListener('loadedmetadata',update);
    audio.addEventListener('bilinguallyricsready',()=>{active='';update()});
    update();
  };

  const observer=new MutationObserver(()=>document.querySelectorAll('.music-lyrics-mode').forEach(attach));
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.querySelectorAll('.music-lyrics-mode').forEach(attach);
})();
