(()=>{
  const style=document.createElement('style');
  style.textContent='.music-admin-album{display:grid;grid-template-columns:76px minmax(0,1fr) auto;gap:14px;align-items:center;padding:14px 0;border-top:1px solid rgba(38,89,101,.11)}.music-admin-album img,.music-admin-cover-fallback{width:76px;height:76px;border-radius:15px;object-fit:cover;background:linear-gradient(135deg,#213b45,#6d8b95)}.music-admin-copy b{font-size:16px}.music-admin-copy small{display:block;margin-top:4px;color:#698087}.music-admin-tracks{grid-column:2/-1;display:grid;gap:7px}.music-admin-track{display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:12px;background:rgba(46,101,112,.06)}.music-admin-track span{min-width:25px;color:#698087;font-size:12px}.music-admin-track strong{flex:1;font-size:13px}.music-admin-track small{color:#698087}.music-admin-track button{width:auto;padding:6px 9px;font-size:11px}.dark .music-admin-track{background:rgba(255,255,255,.06)}.dark .music-admin-copy small,.dark .music-admin-track small,.dark .music-admin-track span{color:#aabfc3}@media(max-width:640px){.music-admin-album{grid-template-columns:58px minmax(0,1fr)}.music-admin-album img,.music-admin-cover-fallback{width:58px;height:58px;border-radius:13px}.music-admin-album>.row-actions{grid-column:2}.music-admin-tracks{grid-column:1/-1}.music-admin-track{flex-wrap:wrap}.music-admin-track small{width:100%;padding-left:35px}}';
  document.head.append(style);

  const list=document.querySelector('#music-album-rows');
  if(!list)return;
  const escape=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const renderMusic=()=>{
    const albums=content?.music?.albums||[];
    list.innerHTML=albums.length?albums.map(album=>{
      const cover=album.cover?'<img src="'+escape(encodeURI(album.cover))+'" alt="">':'<div class="music-admin-cover-fallback" aria-hidden="true"></div>';
      const tracks=(album.tracks||[]).map((track,index)=>'<div class="music-admin-track"><span>'+String(index+1).padStart(2,'0')+'</span><strong>'+escape(track.title)+'</strong><small>'+escape(track.artist||album.artist||'')+' · '+escape(track.duration||'--:--')+'</small><button type="button" data-music-edit="'+escape(track.id)+'" data-album="'+escape(album.id)+'">&#32534;&#36753;</button><button type="button" data-music-move="up" data-id="'+escape(track.id)+'" data-album="'+escape(album.id)+'">&#8593;</button><button type="button" data-music-move="down" data-id="'+escape(track.id)+'" data-album="'+escape(album.id)+'">&#8595;</button><button type="button" class="danger" data-music-delete="'+escape(track.id)+'" data-album="'+escape(album.id)+'">&#21024;&#38500;</button></div>').join('')||'<p class="hint">&#26242;&#26080;&#27468;&#26354;</p>';
      return '<section class="music-admin-album"><div>'+cover+'</div><div class="music-admin-copy"><b>'+escape(album.title)+'</b><small>'+escape(album.artist||'')+' · '+escape(album.year||'')+' · '+String((album.tracks||[]).length)+' &#39318;</small></div><div class="row-actions"><button type="button" data-album-edit="'+escape(album.id)+'">&#32534;&#36753;&#19987;&#36753;</button></div><div class="music-admin-tracks">'+tracks+'</div></section>';
    }).join(''):'<p class="hint">&#35831;&#20808;&#28857;&#20987;&#8220;&#21516;&#27493;&#19987;&#36753;&#8221;&#25195;&#25551;&#38899;&#20048;&#25991;&#20214;&#22841;&#12290;</p>';

    list.querySelectorAll('[data-album-edit]').forEach(button=>button.onclick=async()=>{
      const album=albums.find(item=>item.id===button.dataset.albumEdit);
      if(!album)return;
      const title=prompt('\u4e13\u8f91\u6807\u9898',album.title||''); if(title===null)return;
      const artist=prompt('\u827a\u4eba',album.artist||''); if(artist===null)return;
      const year=prompt('\u5e74\u4efd',album.year||''); if(year===null)return;
      try{await api('updateMusicAlbum',{id:album.id,title:title.trim()||album.title,artist:artist.trim(),year:year.trim()});tell('\u4e13\u8f91\u5df2\u66f4\u65b0\u3002')}catch(error){tell(error.message,true)}
    });
    list.querySelectorAll('[data-music-edit]').forEach(button=>button.onclick=async()=>{
      const album=albums.find(item=>item.id===button.dataset.album); const track=album?.tracks?.find(item=>item.id===button.dataset.musicEdit); if(!track)return;
      const title=prompt('\u6b4c\u66f2\u6807\u9898',track.title||'');if(title===null)return;
      const artist=prompt('\u827a\u4eba',track.artist||album.artist||'');if(artist===null)return;
      const duration=prompt('\u65f6\u957f',track.duration||'--:--');if(duration===null)return;
      try{await api('updateItem',{type:'music',source:album.id,id:track.id,title:title.trim()||track.title,artist:artist.trim(),duration:duration.trim()});tell('\u6b4c\u66f2\u5df2\u66f4\u65b0\u3002')}catch(error){tell(error.message,true)}
    });
    list.querySelectorAll('[data-music-move]').forEach(button=>button.onclick=async()=>{
      try{await api('reorderItem',{type:'music',source:button.dataset.album,id:button.dataset.id,direction:button.dataset.musicMove});tell('\u987a\u5e8f\u5df2\u66f4\u65b0\u3002')}catch(error){tell(error.message,true)}
    });
    list.querySelectorAll('[data-music-delete]').forEach(button=>button.onclick=async()=>{
      if(!confirm('\u786e\u5b9a\u4ece\u5217\u8868\u4e2d\u5220\u9664\u8fd9\u9996\u6b4c\u66f2\u5417\uff1f'))return;
      try{await api('deleteItem',{type:'music',source:button.dataset.album,id:button.dataset.musicDelete});tell('\u6b4c\u66f2\u5df2\u5220\u9664\u3002')}catch(error){tell(error.message,true)}
    });
  };

  const previousRender=render;
  render=()=>{previousRender();renderMusic()};
  document.querySelectorAll('[data-action="syncMusic"],[data-action="syncLyrics"]').forEach(button=>button.onclick=async()=>{
    const isLyrics=button.dataset.action==='syncLyrics';
    try{button.disabled=true;await api(isLyrics?'syncLyrics':'syncMusic');tell(isLyrics?'\u6b4c\u8bcd\u5df2\u6309\u6b4c\u66f2\u6587\u4ef6\u540d\u81ea\u52a8\u540c\u6b65\u3002':'\u97f3\u4e50\u4e13\u8f91\u548c\u6b4c\u66f2\u5df2\u540c\u6b65\u3002')}catch(error){tell(error.message,true)}finally{button.disabled=false}
  });
  if(content)render();
})();
