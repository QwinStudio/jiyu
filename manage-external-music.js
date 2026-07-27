(()=>{
  const dialog=document.querySelector('#external-music-dialog'),form=document.querySelector('#external-music-form'),open=document.querySelector('#open-external-music'),rows=document.querySelector('#external-music-rows');
  if(!dialog||!form||!open||!rows)return;
  const esc=value=>String(value||'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const close=()=>dialog.close();
  const fill=item=>{form.reset();Object.entries(item||{}).forEach(([key,value])=>{const input=form.elements.namedItem(key);if(input)input.value=value??''});};
  const openFor=item=>{fill(item);dialog.showModal();form.elements.title.focus();};
  open.addEventListener('click',()=>openFor());
  dialog.querySelectorAll('.external-dialog-close').forEach(button=>button.addEventListener('click',close));
  dialog.addEventListener('click',event=>{if(event.target===dialog)close()});
  const paint=()=>{
    const items=content?.externalMusic?.items||[];
    rows.innerHTML=items.length?items.map(item=>`<div class="external-music-row"><span class="external-platform-dot" style="--accent:${esc(item.accent||'#4fc3f7')}"></span><div><b>${esc(item.title)}</b><small>${esc(item.artist||'未知艺人')} · ${esc(item.platform||'外链音乐')}</small></div><div class="row-actions"><button type="button" data-external-edit="${esc(item.id)}">编辑</button><button type="button" class="danger" data-external-delete="${esc(item.id)}">删除</button></div></div>`).join(''):'<p class="hint">还没有外链音乐。添加后会在音乐首页以独立卡片出现。</p>';
    rows.querySelectorAll('[data-external-edit]').forEach(button=>button.onclick=()=>openFor(items.find(item=>item.id===button.dataset.externalEdit)));
    rows.querySelectorAll('[data-external-delete]').forEach(button=>button.onclick=async()=>{if(!confirm('确定删除这张外链音乐卡片吗？'))return;try{await api('deleteExternalMusic',{id:button.dataset.externalDelete});tell('外链音乐已删除。')}catch(error){tell(error.message,true)}});
  };
  const previousRender=render; render=()=>{previousRender();paint()}; if(content)paint();
  form.addEventListener('submit',async event=>{event.preventDefault();const payload=Object.fromEntries(new FormData(form));const editing=Boolean(payload.id);try{await api(editing?'updateExternalMusic':'addExternalMusic',payload);close();tell(editing?'外链音乐已更新。':'外链音乐已添加。')}catch(error){tell(error.message,true)}});
})();
