// ===== State & Utils =====
let DATA = [];
let STATE = { q: '', cat: '', grade: '', track: '', sort: 'title', tags: [], tagMode: 'any', onlyFavs: false, teacher: false };

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
function normalize(str){ return (str||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,''); }
function escReg(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function isExternal(p){ return /^https?:\/\//i.test(p); }

function setState(patch, pushUrl=true){
  STATE = { ...STATE, ...patch };
  const params = new URLSearchParams();
  if(STATE.q) params.set('q', STATE.q);
  if(STATE.cat) params.set('c', STATE.cat);
  if(STATE.grade) params.set('g', STATE.grade);
  if(STATE.track) params.set('tr', STATE.track);
  if(STATE.sort && STATE.sort !== 'title') params.set('s', STATE.sort);
  if(STATE.onlyFavs) params.set('f','1');
  if(STATE.tags.length) params.set('tags', STATE.tags.join(','));
  if(STATE.tagMode!=='any') params.set('tm', STATE.tagMode);
  if(STATE.teacher) params.set('teacher','1');
  const url = params.toString() ? `?${params.toString()}` : location.pathname;
  if(pushUrl) history.replaceState(null, '', url);
  applyBranding();
  computeSuggestions();
  renderSuggestions();
  render();
  renderSuggestions();
}
function parseParams(){
  const p = new URLSearchParams(location.search);
  STATE.q = p.get('q')||'';
  STATE.cat = p.get('c')||'';
  STATE.grade = p.get('g')||'';
  STATE.track = p.get('tr')||'';
  STATE.sort = p.get('s')||'title';
  STATE.onlyFavs = p.get('f') === '1';
  STATE.tags = (p.get('tags')||'').split(',').filter(Boolean);
  STATE.tagMode = p.get('tm') || 'any';
  STATE.teacher = p.get('teacher') === '1' || (localStorage.getItem('mt-teacher')==='1');
}

// ===== Favorites & Recents =====
const FAVORITES_KEY = 'mt-favs';
const RECENTS_KEY = 'mt-recents';
function getFavs(){ return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY)||'[]')); }
function setFavs(set){ localStorage.setItem(FAVORITES_KEY, JSON.stringify([...set])); }
function getRecents(){ return JSON.parse(localStorage.getItem(RECENTS_KEY)||'[]'); }
function pushRecent(path){ const arr = getRecents().filter(p=>p!==path); arr.unshift(path); localStorage.setItem(RECENTS_KEY, JSON.stringify(arr.slice(0,8))); }
document.addEventListener('click', e=>{ const a=e.target.closest('a[href]'); if(a && a.getAttribute('target')==='_blank'){ const p=a.getAttribute('href'); pushRecent(p); bumpUsage(p); } });

// ===== Filtering =====
function tagMatch(itemTags, selected, mode){
  if(!selected.length) return true;
  if(!itemTags || !itemTags.length) return false;
  const set = new Set(itemTags);
  if(mode==='any') return selected.some(t=>set.has(t));
  // all
  return selected.every(t=>set.has(t));
}

function filterData(){
  const term = normalize(STATE.q);
  const favs = getFavs();
  return DATA.filter(it => {
    // teacher mode hides GVCN unless enabled
    if (!STATE.teacher && it.category === 'gvcn') return false;
    const okCat = !STATE.cat || it.category === STATE.cat;
    const okGrade = !STATE.grade || it.grade === STATE.grade;
    const okTrack = !STATE.track || it.track === STATE.track;
    const okFav = !STATE.onlyFavs || favs.has(it.path);
    const okTags = tagMatch(it.tags||[], STATE.tags, STATE.tagMode);
    const hay = normalize(it.title + ' ' + (it.tags||[]).join(' ') + ' ' + ((it.extra && it.extra.headings || []).join(' ')) + ' ' + ((it.extra && it.extra.keywords || []).join(' ')));
    const okTerm = !term || hay.includes(term);
    return okCat && okGrade && okTrack && okFav && okTags && okTerm;
  }).sort((a,b)=>{
    const s = STATE.sort;
    if(s === 'title') return a.title.localeCompare(b.title, 'vi');
    if(s === '-title') return b.title.localeCompare(a.title, 'vi');
    if(s === 'updatedAt') return new Date(a.updatedAt) - new Date(b.updatedAt);
    if(s === '-updatedAt') return new Date(b.updatedAt) - new Date(a.updatedAt);
    return 0;
  });
}


// ===== QR, Playlist, Suggestions, Branding, Metadata warn =====
const PLAY_KEY = 'mt-playlist';
const BRAND_COLOR_KEY = 'mt-brand-color';
const BRAND_LOGO_KEY = 'mt-logo-url';
const USAGE_KEY = 'mt-usage';
const SUGGEST_DATE_KEY = 'mt-suggest-date';

function getPlaylist(){ return JSON.parse(localStorage.getItem(PLAY_KEY)||'[]'); }
function setPlaylist(arr){ localStorage.setItem(PLAY_KEY, JSON.stringify(arr)); }
function getUsage(){ return JSON.parse(localStorage.getItem(USAGE_KEY)||'{}'); }
function bumpUsage(path){
  const u = getUsage(); u[path] = (u[path]||0) + 1; localStorage.setItem(USAGE_KEY, JSON.stringify(u));
}

function renderPlaylistList(){
  const list = getPlaylist();
  const el = $('#playlistList');
  el.innerHTML = list.map((p,i)=>{
    const it = DATA.find(d=>d.path===p);
    if(!it) return `<div data-idx="${i}" class="pal-item"><em>(thiếu) ${p}</em></div>`;
    return `<div data-idx="${i}" class="pal-item"><strong>${it.title}</strong> <em>${it.category.toUpperCase()}</em></div>`;
  }).join('') || '<div style="color:var(--muted)">Chưa có mục nào. Dùng nút ➕ trên từng công cụ để thêm.</div>';
}

function openQR(path){
  const dlg = $('#qrDlg'); const wrap = $('#qrWrap');
  let urlStr = path; if (!isExternal(path)){ const u = new URL(location.href); u.pathname = u.pathname.replace(/\/$/, '/') + path; urlStr = u.toString(); } const url = { toString:()=>urlStr };
  if (!navigator.onLine) {
    wrap.innerHTML = `<div style="text-align:center;color:var(--muted)">Cần kết nối mạng để tạo QR.<br>${url.toString()}</div>`;
  } else {
    const qs = new URLSearchParams({ data: url.toString(), size: '220x220', qzone: '2', margin: '0' }).toString();
    wrap.innerHTML = `<img alt="QR" src="https://api.qrserver.com/v1/create-qr-code/?${qs}" width="220" height="220">`;
  }
  dlg.showModal();
  $('#qrCopyBtn').onclick = async ()=>{ try{ await navigator.clipboard.writeText(url.toString()); }catch{ alert(val); } };
  $('#qrPrintBtn').onclick = ()=>{ const w = window.open('', '_blank'); w.document.write(`<img src="${wrap.querySelector('img')?wrap.querySelector('img').src:''}" style="width:240px;height:240px">`); w.document.close(); w.focus(); w.print(); };
  $('#qrCloseBtn').onclick = ()=> dlg.close();
}

function applyBranding(){
  const color = localStorage.getItem(BRAND_COLOR_KEY);
  if (color){ document.documentElement.style.setProperty('--brand', color); }
  const logoUrl = localStorage.getItem(BRAND_LOGO_KEY);
  if (logoUrl){ const img = document.querySelector('.brand img'); if (img) img.src = logoUrl; }
}

function computeSuggestions(){
  // Gợi ý 5 công cụ theo khối đang chọn + lịch sử dùng
  const today = new Date().toISOString().slice(0,10);
  const last = localStorage.getItem(SUGGEST_DATE_KEY);
  if (last === today) return; // đã tính cho hôm nay
  const u = getUsage();
  let items = DATA.filter(it => it.category==='lop');
  if (STATE.grade) items = items.filter(it => it.grade === STATE.grade);
  // sort by usage desc
  items.sort((a,b)=> (u[b.path]||0) - (u[a.path]||0));
  const picks = items.slice(0,5).map(it => it.path);
  localStorage.setItem('mt-suggest', JSON.stringify(picks));
  localStorage.setItem(SUGGEST_DATE_KEY, today);
}

function renderSuggestions(){
  const picks = JSON.parse(localStorage.getItem('mt-suggest')||'[]');
  if (!picks.length){ $('#suggest').innerHTML=''; return; }
  const links = picks.map(p => {
    const it = DATA.find(d=>d.path===p); if(!it) return '';
    return `<a href="${it.path}" target="_blank" rel="noopener">${it.title}</a>`;
  }).join('');
  $('#suggest').innerHTML = `<div class="row"><strong>Gợi ý hôm nay:</strong> ${links}</div>`;
}

// Metadata warning helper
function metaWarn(it){
  const miss = [];
  if (it.category==='lop'){
    if (!it.grade) miss.push('grade');
    if (!it.track) miss.push('track');
  }
  if (!it.tags || !it.tags.length) miss.push('tags');
  return miss.length ? ` <span class="warn">Thiếu meta: ${miss.join(', ')}</span>` : '';
}

// ===== Highlight helper =====
function hl(text, term){ if(!term) return text; const t=escReg(term); return text.replace(new RegExp(t,'ig'), m=>`<mark>${m}</mark>`); }

// ===== Render =====
function render(){
  // controls sync
  $('#q').value = STATE.q;
  $('#sort').value = STATE.sort;
  $('#onlyFavs').checked = STATE.onlyFavs;
  $('#teacherBtn').textContent = STATE.teacher ? '👩‍🏫 Teacher ON' : '👩‍🏫 Teacher';
  $$('.segments .seg').forEach(btn => btn.classList.toggle('is-active', (btn.dataset.cat||'') === (STATE.cat||'')));
  $$('#gradeTabs .tab').forEach(btn => btn.classList.toggle('is-active', btn.dataset.grade === STATE.grade));
  $$('#trackSegs .seg').forEach(btn => btn.classList.toggle('is-active', btn.dataset.track === STATE.track));

  const filtered = filterData();
  $('#stats').textContent = `Có ${filtered.length}/${DATA.length} công cụ` +
    (STATE.cat?` • ${STATE.cat.toUpperCase()}`:'') +
    (STATE.grade?` • Khối ${STATE.grade}`:'') +
    (STATE.track?` • ${STATE.track==='dai-so'?'Đại số':'Hình học'}`:'') +
    (STATE.onlyFavs?' • ⭐':'') +
    (STATE.tags.length?` • Tags(${STATE.tagMode}): ${STATE.tags.join(', ')}`:'');

  // tag chipbar (Top 16) with multi-select
  const tagCount = new Map();
  for(const it of DATA){ (it.tags||[]).forEach(t => tagCount.set(t, (tagCount.get(t)||0)+1)); }
  const popular = Array.from(tagCount.entries()).sort((a,b)=>b[1]-a[1]).slice(0,16);
  $('#chipbar').innerHTML = `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
    <strong>Tags:</strong>
    <button class="chip" data-tag="__clear">Bỏ chọn</button>
    <button class="chip" data-tag-mode="any" ${STATE.tagMode==='any'?'style="outline:2px solid var(--brand)"':''}>Khớp bất kỳ</button>
    <button class="chip" data-tag-mode="all" ${STATE.tagMode==='all'?'style="outline:2px solid var(--brand)"':''}>Khớp tất cả</button>
    ${popular.map(([t,c])=>`<button class="chip ${STATE.tags.includes(t)?'is-active':''}" data-tag="${t}">#${t} (${c})</button>`).join('')}
  </div>`;

  // recents
  const rec = getRecents().map(p => DATA.find(d => d.path===p)).filter(Boolean).slice(0,8);
  $('#recents').innerHTML = rec.length ? `<h4>Gần đây</h4><div class="row">${
    rec.map(it=>`<a href="${it.path}" target="_blank" rel="noopener">${it.title}</a>`).join('')
  }</div>` : '';

  // cards
  const favs = getFavs();
  $('#list').innerHTML = filtered.map(it => `
    <article class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        <h3><a href="${it.path}" target="_blank" rel="noopener">${hl(it.title, STATE.q)}</a></h3>
        <div style="display:flex;gap:6px;align-items:center">
          ${isExternal(it.path)?`<button class="btn ghost" data-preview="${it.path}" title="Xem trong trang">👁</button>`:""}
          <button class="btn ghost" data-qr="${it.path}" title="QR nhanh">QR</button>
          <button class="btn ghost" data-add="${it.path}" title="Thêm vào Playlist">➕</button>
          <button class="btn ghost" data-share="${it.path}" title="Sao chép liên kết">🔗</button>
          <button class="btn ghost" data-fav="${it.path}" title="Ghim/Yêu thích">${favs.has(it.path)?'⭐':'☆'}</button>
        </div>
      </div>
      <div class="meta">Danh mục: <strong>${(it.category||'').toUpperCase()}</strong>${ metaWarn(it) +
        it.grade?` • Khối ${it.grade}`:''}${it.track?` • ${it.track==='dai-so'?'Đại số':'Hình học'}`:''} • Cập nhật: ${new Date(it.updatedAt).toLocaleDateString('vi-VN')}</div>
      ${(it.tags && it.tags.length) ? `<div class="badges">${it.tags.map(t=>`<span class="badge">#${hl(t, STATE.q)}</span>`).join('')}</div>` : ''}
    </article>
  `).join('');

  // playlist & qr handlers
  $('#list').addEventListener('click', (e)=>{
    const q = e.target.closest('button[data-qr]'); if(q){ openQR(q.dataset.qr); return; }
    const pv = e.target.closest('button[data-preview]'); if(pv){ const url=pv.dataset.preview; const dlg=$('#webDlg'); const ifr=$('#webFrame'); const a=$('#webOpenNew'); ifr.src=url; a.href=url; dlg.showModal(); return; }
    const add = e.target.closest('button[data-add]'); if(add){ const arr = getPlaylist(); if(!arr.includes(add.dataset.add)){ arr.push(add.dataset.add); setPlaylist(arr); } alert('Đã thêm vào Playlist'); renderPlaylistList(); return; }
  });

  // bind fav & share (delegate)
  $('#list').onclick = async (e)=>{
    const share = e.target.closest('button[data-share]');
    if(share){
      let val = share.dataset.share;
      if (!isExternal(val)) { const url = new URL(location.href); url.pathname = url.pathname.replace(/\/$/, '/') + val; val = url.toString(); }
      try{
        await navigator.clipboard.writeText(val);
        share.textContent = '✅'; setTimeout(()=>share.textContent='🔗', 1200);
      }catch{ alert(val); }
      return;
    }
    const btn = e.target.closest('button[data-fav]'); if(!btn) return;
    const favs2 = getFavs(); const p = btn.dataset.fav;
    if (favs2.has(p)) favs2.delete(p); else favs2.add(p);
    setFavs(favs2); render();
  };

  // autosuggest
  renderSuggest(filtered);
}

// ===== Autosuggest =====
let suggestBox;
function ensureSuggestBox(){ if (suggestBox) return; suggestBox = document.createElement('div'); suggestBox.className='suggest'; document.querySelector('.input-group').appendChild(suggestBox); }
function renderSuggest(items){
  ensureSuggestBox();
  if (!STATE.q) { suggestBox.innerHTML=''; return; }
  const top = items.slice(0,8);
  suggestBox.innerHTML = top.map(it => `
    <div class="sg-item" data-path="${it.path}">
      <strong>${hl(it.title, STATE.q)}</strong>
      <span>${(it.tags||[]).slice(0,3).map(t=>'#'+hl(t, STATE.q)).join(' ')}</span>
    </div>`).join('');
}
document.addEventListener('click', (e)=>{ const el=e.target.closest('.sg-item'); if (el){ window.open(el.dataset.path, '_blank'); } });

// ===== Command Palette =====
function openPalette(){
  const dlg=document.createElement('dialog'); dlg.className='palette';
  dlg.innerHTML = `<input id="pal-q" type="text" placeholder="Tìm công cụ… (gõ để lọc)" autofocus><div id="pal-list"></div>`;
  document.body.appendChild(dlg); dlg.showModal();
  const palq=dlg.querySelector('#pal-q'); const pall=dlg.querySelector('#pal-list');
  function rerender(){
    const term = palq.value.trim().toLowerCase();
    const items = filterData().filter(it => (it.title + ' ' + (it.tags||[]).join(' ')).toLowerCase().includes(term)).slice(0,30);
    pall.innerHTML = items.map(it=>`<div class="pal-item" data-path="${it.path}"><strong>${hl(it.title, term)}</strong> <em>• ${it.category.toUpperCase()}</em></div>`).join('');
  }
  palq.addEventListener('input', rerender);
  pall.addEventListener('click', e=>{ const it=e.target.closest('.pal-item'); if(!it) return; window.open(it.dataset.path,'_blank'); dlg.close(); dlg.remove(); });
  dlg.addEventListener('close', ()=> dlg.remove());
  rerender();
}

// ===== Events & Shortcuts =====
function bindEvents(){
  // search debounce
  let t; $('#q').addEventListener('input', e=>{ clearTimeout(t); t=setTimeout(()=> setState({ q:e.target.value }), 120); });
  $('#sort').addEventListener('change', e=> setState({ sort:e.target.value }));
  $('#onlyFavs').addEventListener('change', e=> setState({ onlyFavs:e.target.checked }));

  $$('.segments .seg').forEach(btn => btn.addEventListener('click', ()=> setState({ cat: btn.dataset.cat||'' })));
  $$('#gradeTabs .tab').forEach(btn => btn.addEventListener('click', ()=> setState({ grade: btn.dataset.grade||'' })));
  $$('#trackSegs .seg').forEach(btn => btn.addEventListener('click', ()=> setState({ track: btn.dataset.track||'' })));
  $('#chipbar').addEventListener('click', e=>{
    const btn=e.target.closest('.chip'); if(!btn) return;
    if (btn.dataset.tagMode){ setState({ tagMode: btn.dataset.tagMode }); return; }
    const tag = btn.dataset.tag;
    if(tag === '__clear') setState({ tags: [] });
    else {
      const next = new Set(STATE.tags);
      if(next.has(tag)) next.delete(tag); else next.add(tag);
      setState({ tags: [...next] });
    }
  });

  // theme & palette & PWA install
  const root=document.documentElement;
  $('#themeToggle').addEventListener('click', ()=>{ const isDark=root.classList.toggle('dark'); localStorage.setItem('theme', isDark? 'dark':'light'); });
  $('#openPalette').addEventListener('click', openPalette);
  const saved=localStorage.getItem('theme'); if(saved === 'dark') root.classList.add('dark');
  let deferredPrompt=null;
  window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); deferredPrompt=e; $('#installBtn').style.display='inline-flex'; });
  $('#installBtn').addEventListener('click', async ()=>{ if(deferredPrompt){ deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; } });

  // share current filters
  refreshViewMenu();
  $('#saveViewBtn').addEventListener('click', ()=>{
    const name = prompt('Tên bộ lọc (ví dụ: Lớp 10 – Hình học)');
    if(!name) return;
    const views = getViews().filter(v => v.name !== name);
    views.push({ name, state: STATE });
    setViews(views); refreshViewMenu(); alert('Đã lưu!');
  });
  $('#applyViewBtn').addEventListener('click', ()=>{
    const name = $('#viewMenu').value; if(!name) return;
    const v = getViews().find(x => x.name === name); if(!v) return;
    setState(v.state);
  });
  $('#delViewBtn').addEventListener('click', ()=>{
    const name = $('#viewMenu').value; if(!name) return;
    const views = getViews().filter(v => v.name !== name); setViews(views); refreshViewMenu();
  });
  $('#precacheBtn').addEventListener('click', precacheAll);
  $('#openFavsBtn').addEventListener('click', openFavorites);
  $('#resetBtn').addEventListener('click', resetAll);
  $('#voiceBtn').addEventListener('click', startVoice);

  // Menu toggle (compact)
  $('#menuToggle').addEventListener('click', ()=>{ const tb=document.querySelector('.toolbar'); const on=!tb.classList.contains('compact'); setCompact(on); });

  // Branding
  $('#brandBtn').addEventListener('click', ()=>{ applyBranding(); $('#brandDlg').showModal(); const color=localStorage.getItem('mt-brand-color')||'#2563eb'; const logo=localStorage.getItem('mt-logo-url')||''; $('#brandColor').value=color; $('#logoUrl').value=logo; });
  $('#brandSave').addEventListener('click', ()=>{ localStorage.setItem('mt-brand-color', $('#brandColor').value); localStorage.setItem('mt-logo-url', $('#logoUrl').value); applyBranding(); alert('Đã lưu thương hiệu!'); });
  $('#brandReset').addEventListener('click', ()=>{ localStorage.removeItem('mt-brand-color'); localStorage.removeItem('mt-logo-url'); applyBranding(); });
  $('#brandClose').addEventListener('click', ()=> $('#brandDlg').close());

  // Playlist controls
  $('#playlistBtn').addEventListener('click', ()=>{ renderPlaylistList(); $('#playlistDlg').showModal(); });
  $('#playCloseBtn').addEventListener('click', ()=> $('#playlistDlg').close());
  $('#playRemoveBtn').addEventListener('click', ()=>{ const sel = $('#playlistList .pal-item.selected'); if(!sel) return; const idx=+sel.dataset.idx; const arr=getPlaylist(); arr.splice(idx,1); setPlaylist(arr); renderPlaylistList(); });
  $('#playlistList').addEventListener('click', e=>{ $$('#playlistList .pal-item').forEach(x=>x.classList.remove('selected')); const it=e.target.closest('.pal-item'); if(it) it.classList.add('selected'); });
  $('#playUpBtn').addEventListener('click', ()=>{ const sel=$('#playlistList .pal-item.selected'); if(!sel) return; const idx=+sel.dataset.idx; if(idx<=0) return; const arr=getPlaylist(); const [x]=arr.splice(idx,1); arr.splice(idx-1,0,x); setPlaylist(arr); renderPlaylistList(); $$('#playlistList .pal-item')[idx-1].classList.add('selected'); });
  $('#playDownBtn').addEventListener('click', ()=>{ const sel=$('#playlistList .pal-item.selected'); if(!sel) return; const idx=+sel.dataset.idx; const arr=getPlaylist(); if(idx>=arr.length-1) return; const [x]=arr.splice(idx,1); arr.splice(idx+1,0,x); setPlaylist(arr); renderPlaylistList(); $$('#playlistList .pal-item')[idx+1].classList.add('selected'); });
  $('#playStartBtn').addEventListener('click', ()=>{ const arr=getPlaylist(); if(!arr.length) return; window.open(arr[0], '_blank'); });
  $('#playOpenAllBtn').addEventListener('click', ()=>{ const arr=getPlaylist().slice(0,10); if(!arr.length){ alert('Playlist trống'); return; } arr.forEach(p=>window.open(p,'_blank')); });
  $('#playClearBtn').addEventListener('click', ()=>{ if(confirm('Xóa playlist?')){ setPlaylist([]); renderPlaylistList(); } });
  $('#shareBtn').addEventListener('click', async ()=>{
    const url = location.href;
    try {
      if (navigator.share) { await navigator.share({ title: document.title, url }); }
      else { await navigator.clipboard.writeText(url); alert('Đã sao chép liên kết!'); }
    } catch {}
  });

  // random tool
  $('#randomBtn').addEventListener('click', ()=>{
    const filtered = filterData();
    if(!filtered.length) return;
    const it = filtered[Math.floor(Math.random()*filtered.length)];
    window.open(it.path, '_blank');
  });

  // print
  $('#printBtn').addEventListener('click', ()=> window.print());

  // export/import favorites
  $('#exportBtn').addEventListener('click', ()=>{
    const data = { favorites: [...getFavs()], recents: getRecents() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'math-tools-favs.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $('#importFile').addEventListener('change', async (e)=>{
    const file = e.target.files[0]; if(!file) return;
    const text = await file.text();
    try{
      const obj = JSON.parse(text);
      if (obj.favorites) localStorage.setItem('mt-favs', JSON.stringify(obj.favorites));
      if (obj.recents) localStorage.setItem('mt-recents', JSON.stringify(obj.recents));
      applyBranding();
  computeSuggestions();
  renderSuggestions();
  render();
  renderSuggestions();
      alert('Đã nhập ⭐ và gần đây!');
    }catch{ alert('File không hợp lệ'); }
    e.target.value='';
  });

  // teacher mode (simple PIN)
  $('#teacherBtn').addEventListener('click', ()=>{
    if (STATE.teacher){ STATE.teacher=false; localStorage.removeItem('mt-teacher'); setState({}); return; }
    const pin = prompt('Nhập PIN GVCN:');
    if (pin && pin.trim().toLowerCase() === 'thayluc'){ STATE.teacher=true; localStorage.setItem('mt-teacher','1'); setState({}); }
    else if(pin!==null){ alert('Sai PIN'); }
  });

  // shortcuts
  document.addEventListener('keydown', (e)=>{
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') { e.preventDefault(); $('#q').focus(); }
    if (e.key === 'Escape') setState({ q:'', tags:[], cat:'', grade:'', track:'', onlyFavs:false });
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey))) { e.preventDefault(); openPalette(); }
  });
}


// ===== Saved Views =====
const VIEWS_KEY = 'mt-views';
function getViews(){ try{ return JSON.parse(localStorage.getItem(VIEWS_KEY)||'[]'); }catch{ return []; } }
function setViews(v){ localStorage.setItem(VIEWS_KEY, JSON.stringify(v)); }
function refreshViewMenu(){
  const sel = $('#viewMenu'); if(!sel) return;
  const vs = getViews();
  sel.innerHTML = `<option value="">— Chọn bộ lọc đã lưu —</option>` + vs.map(v=>`<option value="${v.name}">${v.name}</option>`).join('');
}

// ===== Precache All Tools (offline) =====
async function precacheAll(){
  if(!('caches' in window)) { alert('Trình duyệt không hỗ trợ Cache API'); return; }
  const paths = DATA.map(d => d.path).filter(p => !isExternal(p));
  const batchSize = 20;
  const cache = await caches.open('mth-v1');
  for (let i=0; i<paths.length; i+=batchSize){
    const batch = paths.slice(i, i+batchSize);
    try { await Promise.all(batch.map(p => fetch(p).then(resp => cache.put(p, resp)))); } catch {}
  }
  alert('Đã tải offline xong (nếu có lỗi sẽ bỏ qua).');
}

// ===== Voice Search =====
function startVoice(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert('Trình duyệt chưa hỗ trợ Voice. Thử Chrome nhé thầy.'); return; }
  const rec = new SR(); rec.lang = 'vi-VN'; rec.interimResults = false; rec.maxAlternatives = 1;
  rec.onresult = (e)=>{ const txt = e.results[0][0].transcript || ''; setState({ q: txt }); };
  rec.onerror = ()=>{};
  rec.start();
}

// ===== Open Favorites =====
function openFavorites(){
  const favs = [...getFavs()].slice(0,10); // tránh mở quá nhiều tab
  if (!favs.length) { alert('Chưa có ⭐ nào'); return; }
  favs.forEach(p => window.open(p, '_blank'));
}

// ===== Reset filters =====
function resetAll(){ setState({ q:'', tags:[], cat:'', grade:'', track:'', onlyFavs:false }); }



const COMPACT_KEY = 'mt-compact';
function setCompact(on){
  const tb = document.querySelector('.toolbar');
  if (!tb) return;
  tb.classList.toggle('compact', !!on);
  const btn = document.getElementById('menuToggle');
  if (btn) btn.textContent = on ? '☰ Mở menu' : '☰ Menu';
  localStorage.setItem(COMPACT_KEY, on ? '1' : '0');
}
function initCompact(){
  const saved = localStorage.getItem(COMPACT_KEY) === '1';
  setCompact(saved);
}

// ===== Boot =====
async function boot(){
  parseParams();
  bindEvents();
  initCompact();
  try{ const res = await fetch('manifest.json', { cache: 'no-store' }); DATA = await res.json(); } catch(err){ DATA=[]; console.error('Load manifest error', err); }
  applyBranding();
  computeSuggestions();
  renderSuggestions();
  render();
  renderSuggestions();
  renderSuggest(filterData());
}
boot();

// SW update toast reload
window.addEventListener('load', ()=>{
  const btn = document.getElementById('reloadBtn'); if(!btn) return;
  btn.addEventListener('click', ()=> location.reload());
  refreshViewMenu();
});

$('#webClose') && ($('#webClose').onclick = ()=> $('#webDlg').close());
