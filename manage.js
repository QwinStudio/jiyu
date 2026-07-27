if (sessionStorage.getItem('jiyuAdmin') !== '1') location.replace('login.html');

const $ = selector => document.querySelector(selector);
const status = $('#status');
let content = null;
let library = [];
let filter = 'all';

const escapeHtml = value => String(value || '').replace(/[&<>'"]/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' })[char]);
function tell(message, error = false) { status.textContent = message; status.style.color = error ? '#b64141' : ''; }

async function api(action, data = {}) {
  const response = await fetch('/api/admin', { method:'POST', headers:{'Content-Type':'application/json; charset=utf-8'}, body:JSON.stringify({action, ...data}) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw Error(result.error || '操作失败');
  content = result.data;
  render();
  return result.data;
}

function render() {
  if (!content) return;
  const videoCount = (content.content.videos || []).length + (content.extraVideos.videos || []).length;
  const noteCount = (content.content.notes || []).length;
  const albumCount = (content.albums.albums || []).length;
  $('#stats').innerHTML = [['视频',videoCount],['笔记',noteCount],['影集',albumCount],['当前版本',content.config.version || '—']].map(([name,value]) => `<div class="stat"><span>${name}</span><b>${escapeHtml(value)}</b></div>`).join('');
  library = [
    ...(content.content.videos || []).map(item => ({...item, type:'video', source:'base'})),
    ...(content.extraVideos.videos || []).map(item => ({...item, type:'video', source:'extra'})),
    ...(content.content.notes || []).map(item => ({...item, id:item.file, type:'note', source:'base'})),
    ...(content.albums.albums || []).map(item => ({...item, type:'album', source:'base'}))
  ];
  paintRows();
}

function paintRows() {
  const rows = library.filter(item => filter === 'all' || item.type === filter);
  $('#library-rows').innerHTML = rows.length ? rows.map(item => `
    <div class="library-row">
      <input class="library-check" type="checkbox" data-type="${item.type}" data-source="${item.source}" data-id="${escapeHtml(item.id)}" aria-label="选择 ${escapeHtml(item.title)}">
      <div><b>${escapeHtml(item.title || item.id)}</b><br><small>${({video:'视频',note:'笔记',album:'影集'})[item.type]} · ${escapeHtml(item.date || '')}</small></div>
      <div class="row-actions"><button data-edit="${escapeHtml(item.id)}" data-type="${item.type}" data-source="${item.source}">编辑</button><button data-move="up" data-id="${escapeHtml(item.id)}" data-type="${item.type}" data-source="${item.source}" aria-label="上移">↑</button><button data-move="down" data-id="${escapeHtml(item.id)}" data-type="${item.type}" data-source="${item.source}" aria-label="下移">↓</button><button class="danger" data-delete="${escapeHtml(item.id)}" data-type="${item.type}" data-source="${item.source}">删除</button></div>
    </div>`).join('') : '<p class="hint">此分类暂无内容。</p>';
  document.querySelectorAll('[data-edit]').forEach(button => button.onclick = () => editItem(button.dataset));
  document.querySelectorAll('[data-move]').forEach(button => button.onclick = () => moveItem(button.dataset));
  document.querySelectorAll('[data-delete]').forEach(button => button.onclick = () => deleteItems([{type:button.dataset.type, source:button.dataset.source, id:button.dataset.delete}]));
}

async function editItem(meta) {
  const item = library.find(entry => entry.id === meta.edit && entry.type === meta.type && entry.source === meta.source);
  if (!item) return;
  const title = prompt('编辑标题', item.title || '');
  if (title === null || !title.trim()) return;
  const payload = { type:meta.type, source:meta.source, id:item.id, title:title.trim() };
  if (meta.type === 'video') { const date = prompt('创作时间', item.date || ''); if (date !== null) payload.date = date; }
  if (meta.type === 'album') { const place = prompt('地点', item.place || ''); if (place !== null) payload.place = place; }
  if (meta.type === 'note') { const body = prompt('笔记正文（留空保留原正文）', ''); if (body) payload.body = body; }
  try { await api('updateItem', payload); tell('内容已更新。'); } catch (error) { tell(error.message, true); }
}

async function moveItem(meta) {
  try { await api('reorderItem', { type:meta.type, source:meta.source, id:meta.id, direction:meta.move }); tell('顺序已更新。'); } catch (error) { tell(error.message, true); }
}

async function deleteItems(items) {
  if (!items.length || !confirm(`确定删除选中的 ${items.length} 项内容吗？此操作不可撤销。`)) return;
  try { for (const item of items) await api('deleteItem', {type:item.type, source:item.source, id:item.id}); tell('内容已删除。'); } catch (error) { tell(error.message, true); }
}

async function load() {
  try { const response = await fetch('/api/admin'); if (!response.ok) throw Error(); content = await response.json(); render(); tell('本地内容服务已就绪。'); }
  catch { tell('无法连接本地服务。请运行 start-local-server.ps1 后访问本页。', true); }
}

$('#video-form').onsubmit = async event => { event.preventDefault(); try { await api('addVideo', Object.fromEntries(new FormData(event.target))); event.target.reset(); tell('视频已保存。'); } catch (error) { tell(error.message, true); } };
$('#note-form').onsubmit = async event => { event.preventDefault(); try { await api('addNote', Object.fromEntries(new FormData(event.target))); event.target.reset(); tell('笔记已保存。'); } catch (error) { tell(error.message, true); } };
$('#version-form').onsubmit = async event => { event.preventDefault(); try { await api('setVersion', Object.fromEntries(new FormData(event.target))); tell('版本号已更新。'); } catch (error) { tell(error.message, true); } };
document.querySelectorAll('[data-action]').forEach(button => button.onclick = async () => { try { button.disabled = true; await api(button.dataset.action); tell(button.dataset.action === 'syncAlbums' ? '影集与缩略图已同步。' : '搜索索引已更新。'); } catch (error) { tell(error.message, true); } finally { button.disabled = false; } });
document.querySelectorAll('[data-filter]').forEach(button => button.onclick = () => { filter = button.dataset.filter; paintRows(); });
$('#batch-delete').onclick = () => deleteItems([...document.querySelectorAll('.library-check:checked')].map(box => ({type:box.dataset.type, source:box.dataset.source, id:box.dataset.id})));

document.querySelectorAll('[data-action="syncMusic"]').forEach(button => button.onclick = async () => {
  try {
    button.disabled = true;
    await api('syncMusic');
    tell('\u97f3\u4e50\u4e13\u8f91\u5df2\u540c\u6b65\uff0c\u8f6e\u64ad\u5361\u7247\u5df2\u81ea\u52a8\u66f4\u65b0\u3002');
  } catch (error) {
    tell(error.message, true);
  } finally {
    button.disabled = false;
  }
});
$('#theme').onclick = () => document.body.classList.toggle('dark');
load();
