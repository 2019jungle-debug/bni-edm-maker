/* ============ 本週例會名冊管理 + 一鍵產生 PPT ============ */

function escapeHtml(s){
  return String(s || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}
function dateStamp(){
  const d = new Date();
  const p = n => String(n).padStart(2,'0');
  return d.getFullYear() + p(d.getMonth()+1) + p(d.getDate());
}
// 用 setTimeout（非 requestAnimationFrame）確保分頁切到背景時仍會執行
function nextFrame(){ return new Promise(r => setTimeout(r, 30)); }

let dragId = null;
const collapsedRosterGroups = new Set();

// 產業鏈名稱下拉清單（用富鼎既有團隊名，仍可自行輸入）
function buildChainDatalist(){
  const dl = document.getElementById('chainDatalist');
  if (!dl || dl.dataset.filled) return;
  const seen = new Set();
  (window.BNI_SPECIALTIES || []).forEach(g => {
    [g.group, /鏈$/.test(g.group) ? null : g.group + '產業鏈'].forEach(v => {
      if (v && !seen.has(v)){ seen.add(v); const o = document.createElement('option'); o.value = v; dl.appendChild(o); }
    });
  });
  dl.dataset.filled = '1';
}

function buildSpecDatalist(){
  const dl = document.getElementById('specDatalist');
  if (!dl || dl.dataset.filled) return;
  const seen = new Set();
  (window.BNI_SPECIALTIES || []).forEach(g => (g.items || []).forEach(it => {
    if (!it || seen.has(it)) return;
    seen.add(it);
    const o = document.createElement('option');
    o.value = it;
    dl.appendChild(o);
  }));
  Store.getAllSorted().forEach(m => {
    const it = m && m.type !== 'divider' ? (m.specialty || '') : '';
    if (!it || seen.has(it)) return;
    seen.add(it);
    const o = document.createElement('option');
    o.value = it;
    dl.appendChild(o);
  });
  dl.dataset.filled = '1';
}

function renderRoster(){
  const wrap = document.getElementById('rosterList');
  if (!wrap) return;
  buildChainDatalist();
  buildSpecDatalist();
  const list = Store.getAllSorted();
  document.getElementById('rosterCount').textContent = list.filter(m => m.type !== 'divider').length;
  document.getElementById('presentCount').textContent = list.filter(m => m.type !== 'divider' && m.present !== false).length;

  const admin = (typeof isAdmin !== 'undefined') && isAdmin;   // 僅管理者可編輯

  wrap.innerHTML = '';
  let hiddenByCollapsedGroup = null;
  list.forEach((m, idx) => {
    if (m.type === 'divider'){
      hiddenByCollapsedGroup = collapsedRosterGroups.has(m.id) ? m.id : null;
    } else if (hiddenByCollapsedGroup){
      return;
    }
    const row = document.createElement('div');
    row.draggable = false;
    row.dataset.id = m.id;
    const adminActs = admin ? (
        '<button data-act="up" title="上移">↑</button>' +
        '<button data-act="down" title="下移">↓</button>' +
        (m.type === 'divider' ? '' : '<button data-act="edit">編輯</button>') +
        (m.type === 'divider' ? '' : '<button data-act="pw" title="會員密碼">🔑</button>') +
        '<button data-act="del" class="del">刪除</button>') : '';

    if (m.type === 'divider'){
      row.className = 'roster-row divider-row';
      const collapsed = collapsedRosterGroups.has(m.id);
      const toggleBtn = '<button data-act="toggleGroup" title="' + (collapsed ? '展開此組會員' : '收合此組會員') + '">' + (collapsed ? '展開' : '收合') + '</button>';
      const viewBtn = '<button data-act="view" title="檢視分隔頁">👁 檢視</button>';
      row.innerHTML =
        '<span class="drag" title="拖曳調整順序">⠿</span>' +
        '<span class="ord">' + (idx+1) + '</span>' +
        '<label class="present"><input type="checkbox" ' + (m.present !== false ? 'checked' : '') + (admin?'':' disabled') + '><span>放入</span></label>' +
        '<span class="dv-tag">產業鏈分隔頁</span>' +
        (admin
          ? '<span class="dv-fields" style="flex:1;display:flex;gap:6px;">' +
              '<input class="dv-title-input" list="chainDatalist" placeholder="產業鏈名稱（會覆蓋母片標題）" value="' + escapeHtml(m.title || '') + '" style="flex:1;min-width:180px;">' +
            '</span>'
          : '<span class="dv-fields" style="flex:1;">' +
              '<span class="rspec" style="font-weight:700;color:var(--red-dark);">' + escapeHtml(m.title || '(未命名產業鏈)') + '</span>' +
            '</span>') +
        '<span class="ract">' + toggleBtn + viewBtn + adminActs + '</span>';
      const ti = row.querySelector('.dv-title-input');
      if (ti) ti.addEventListener('change', e => { const item = Store.getById(m.id); if (item){ item.title = e.target.value; Store.upsert(item); } });
      const tb = row.querySelector('[data-act=toggleGroup]');
      if (tb) tb.addEventListener('click', () => {
        if (collapsedRosterGroups.has(m.id)) collapsedRosterGroups.delete(m.id);
        else collapsedRosterGroups.add(m.id);
        renderRoster();
      });
      const vb = row.querySelector('[data-act=view]');
      if (vb) vb.addEventListener('click', () => previewDivider(m.id));
    } else {
      row.className = 'roster-row';
      const withIntro = m.withIntro !== false;   // 預設含介紹頁
      const nameCell = admin
        ? '<input class="rname-input" value="' + escapeHtml(m.name || '') + '" placeholder="會員姓名" style="min-width:86px;max-width:140px;padding:5px 8px;border:1px solid var(--line);border-radius:6px;font-weight:700;font-family:inherit;">'
        : '<span class="rname">' + escapeHtml(m.name || '(未命名)') + '</span>';
      const specCell = admin
        ? '<input class="rspec-input" list="specDatalist" value="' + escapeHtml(m.specialty || '') + '" placeholder="專業別" style="min-width:120px;flex:1;padding:5px 8px;border:1px solid var(--line);border-radius:6px;color:#666;font-size:13px;font-family:inherit;">'
        : '<span class="rspec">' + escapeHtml(m.specialty || '') + '</span>';
      row.innerHTML =
        '<span class="drag" title="拖曳調整順序">⠿</span>' +
        '<span class="ord">' + (idx+1) + '</span>' +
        '<label class="present"><input type="checkbox" ' + (m.present !== false ? 'checked' : '') + (admin?'':' disabled') + '><span>出場</span></label>' +
        '<label class="present with-intro" title="下載 PPT 時是否包含介紹頁"><input type="checkbox" class="withIntro" ' + (withIntro ? 'checked' : '') + (admin?'':' disabled') + '><span>+介紹</span></label>' +
        '<span class="roster-edit-fields" style="display:flex;gap:6px;align-items:center;flex:1;min-width:220px;">' + nameCell + specCell + '</span>' +
        (admin ? '<span class="rspec pwcell" style="flex:0 0 auto;font-family:monospace;color:#7b52c4;">' + (m.pw ? escapeHtml(m.pw) : '—') + '</span>' : '') +
        '<span class="ract">' + adminActs + '</span>';
      const ni = row.querySelector('.rname-input');
      const si = row.querySelector('.rspec-input');
      const saveInlineNameSpec = async () => {
        const item = Store.getById(m.id); if (!item) return;
        const nextName = ni ? ni.value.trim() : item.name;
        const nextSpec = si ? si.value.trim() : item.specialty;
        const prevSpec = item.specialty || '';
        item.name = nextName || item.name || '';
        item.specialty = nextSpec || '';
        if (!item.role || item.role === prevSpec) item.role = item.specialty;
        await Store.upsert(item);
        if (currentMember && currentMember.id === item.id){
          currentMember = item;
          updateEditingBanner();
          render();
        }
        updateAuthUI();
      };
      [ni, si].filter(Boolean).forEach(input => {
        input.addEventListener('change', saveInlineNameSpec);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
      });
      const wi = row.querySelector('.withIntro');
      if (wi && admin) wi.addEventListener('change', async e => {
        const item = Store.getById(m.id); if (!item) return;
        item.withIntro = e.target.checked;
        await Store.upsert(item);
      });
      const eb = row.querySelector('[data-act=edit]');
      if (eb) eb.addEventListener('click', () => { loadMemberIntoEditor(Store.getById(m.id)); showView('editor'); });
      const pb = row.querySelector('[data-act=pw]');
      if (pb) pb.addEventListener('click', async () => {
        const item = Store.getById(m.id); if (!item) return;
        const nextPw = groupPasswordFor(item);
        if (!item.pw || item.pw !== nextPw || confirm('「' + item.name + '」目前同組密碼：' + item.pw + '\n要重新套用同組數字密碼嗎？')){
          item.pw = nextPw; await Store.upsert(item);
          alert('「' + item.name + '」的同組會員密碼：' + item.pw + '\n同一產業鏈組別會使用同一組數字密碼。');
        }
      });
    }

    const pc = row.querySelector('.present input');
    if (pc && admin) pc.addEventListener('change', e => Store.setPresent(m.id, e.target.checked));
    const ub = row.querySelector('[data-act=up]');   if (ub) ub.addEventListener('click', () => m.type === 'divider' ? moveGroup(m.id, -1) : moveMember(m.id, -1));
    const db = row.querySelector('[data-act=down]'); if (db) db.addEventListener('click', () => m.type === 'divider' ? moveGroup(m.id, +1) : moveMember(m.id, +1));
    const xb = row.querySelector('[data-act=del]');
    if (xb) xb.addEventListener('click', () => {
      const label = m.type === 'divider' ? ('分隔頁「' + (m.title || '') + '」') : ('「' + (m.name || '此會員') + '」');
      if (confirm('確定刪除' + label + '？')) Store.remove(m.id);
    });

    if (admin){
      const dragHandle = row.querySelector('.drag');
      if (dragHandle){
        dragHandle.draggable = true;
        dragHandle.addEventListener('dragstart', e => {
          dragId = m.id;
          row.classList.add('dragging');
          if (e.dataTransfer){
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', m.id);
          }
        });
        dragHandle.addEventListener('dragend', () => row.classList.remove('dragging'));
      }
      row.addEventListener('dragover',  e => { e.preventDefault(); row.classList.add('drop-hint'); });
      row.addEventListener('dragleave', () => row.classList.remove('drop-hint'));
      row.addEventListener('drop', e => { e.preventDefault(); row.classList.remove('drop-hint'); onDrop(m.id); });
    }

    wrap.appendChild(row);
  });
}

function moveMember(id, dir){
  const ids = Store.getAllSorted().map(m => m.id);
  const i = ids.indexOf(id), j = i + dir;
  if (j < 0 || j >= ids.length) return;
  ids.splice(i, 1); ids.splice(j, 0, id);
  Store.reorder(ids);
}

function onDrop(targetId){
  if (!dragId || dragId === targetId) return;
  const dragged = Store.getById(dragId);
  if (dragged && dragged.type === 'divider'){
    dropGroupBefore(dragId, targetId);
  } else {
    const ids = Store.getAllSorted().map(m => m.id);
    ids.splice(ids.indexOf(dragId), 1);
    ids.splice(ids.indexOf(targetId), 0, dragId);
    Store.reorder(ids);
  }
  dragId = null;
}

function groupRange(list, dividerId){
  const start = list.findIndex(m => m.id === dividerId);
  if (start < 0 || list[start].type !== 'divider') return null;
  let end = list.length;
  for (let i = start + 1; i < list.length; i++){
    if (list[i].type === 'divider'){ end = i; break; }
  }
  return { start, end };
}

function moveGroup(dividerId, dir){
  const list = Store.getAllSorted();
  const range = groupRange(list, dividerId);
  if (!range) return;
  const group = list.slice(range.start, range.end);
  const remaining = list.slice(0, range.start).concat(list.slice(range.end));
  let insertAt = range.start;
  if (dir < 0){
    let prevStart = -1;
    for (let i = range.start - 1; i >= 0; i--){
      if (list[i].type === 'divider'){ prevStart = i; break; }
    }
    if (prevStart < 0) return;
    insertAt = prevStart;
  } else {
    const nextRange = groupRange(list, list[range.end] && list[range.end].id);
    if (!nextRange) return;
    insertAt = nextRange.end - group.length;
  }
  const next = remaining.slice(0, insertAt).concat(group, remaining.slice(insertAt));
  Store.reorder(next.map(m => m.id));
}

function dropGroupBefore(dividerId, targetId){
  const list = Store.getAllSorted();
  const range = groupRange(list, dividerId);
  if (!range) return;
  const group = list.slice(range.start, range.end);
  const remaining = list.slice(0, range.start).concat(list.slice(range.end));
  const insertAt = remaining.findIndex(m => m.id === targetId);
  if (insertAt < 0) return;
  const next = remaining.slice(0, insertAt).concat(group, remaining.slice(insertAt));
  Store.reorder(next.map(m => m.id));
}

/* ---------- 進度遮罩 ---------- */
function showProgress(title){
  let ov = document.getElementById('progressOverlay');
  if (!ov){
    ov = document.createElement('div');
    ov.id = 'progressOverlay';
    ov.innerHTML = '<div class="pbox"><div class="ptitle"></div><div class="pbar"><div class="pfill"></div></div><div class="ptext"></div></div>';
    document.body.appendChild(ov);
  }
  ov.style.display = 'flex';
  ov.querySelector('.ptitle').textContent = title || '處理中…';
  ov.querySelector('.pfill').style.width = '0%';
  ov.querySelector('.ptext').textContent = '';
  return ov;
}
function setProgress(ov, done, total){
  const pct = Math.round(done / total * 100);
  ov.querySelector('.pfill').style.width = pct + '%';
  ov.querySelector('.ptext').textContent = done + ' / ' + total + ' 位會員（' + (done*2) + ' 張投影片）';
}
function hideProgress(ov){ if (ov) ov.style.display = 'none'; }

/* ---------- 一鍵產生本週 PPT ---------- */
async function generatePPT(){
  const list = Store.getAllSorted().filter(m => m.present !== false);
  if (!list.length){ alert('名冊中沒有勾選「出場」的會員'); return; }
  if (typeof PptxGenJS === 'undefined'){ alert('PPT 元件尚未載入，請重新整理後再試'); return; }

  const overlay = showProgress('產生本週例會 PPT 中…');
  const savedView = currentView;
  const savedMember = currentMember;
  const savedActive = activeFmt;

  // 讓編輯區可被擷取（藏在遮罩後面）
  document.getElementById('view-editor').style.display = '';
  document.getElementById('view-roster').style.display = 'none';
  const hero = document.getElementById('heroMaster') || document.getElementById('hero');
  const intro = document.getElementById('intro');
  const divider = document.getElementById('dividerSlide');

  // 效能優化：擷取時 html2canvas 會複製整份文件，先把不需擷取的重元件（表單、EDM 版面）暫時隱藏
  const hiddenEls = [document.querySelector('#view-editor .panel'),
                     document.getElementById('edm')];
  const prevDisp = hiddenEls.map(el => el ? el.style.display : '');
  hiddenEls.forEach(el => { if (el) el.style.display = 'none'; });

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name:'W16x9', width:13.333, height:7.5 });
  pptx.layout = 'W16x9';

  try {
    for (let i = 0; i < list.length; i++){
      const item = list[i];

      if (item.type === 'divider'){
        // 產業鏈分隔頁：用官方母片圖 + PptxGenJS 原生文字（母片標題已清空，覆蓋可編輯名稱）
        // html2canvas 無法在此環境繪製圖片，故改用 PptxGenJS addImage/addText，畫質更佳
        const slide = pptx.addSlide();
        const bg = (typeof DIVIDER_BG_DATAURL !== 'undefined' && DIVIDER_BG_DATAURL) ? DIVIDER_BG_DATAURL : null;
        if (bg) slide.addImage({ data: bg, x:0, y:0, w:13.333, h:7.5 });
        slide.addText(item.title || '生命健康服務團隊產業鏈', {
          x:0.5, y:2.24, w:12.33, h:2.54, align:'center', valign:'middle',
          fontFace:'Microsoft JhengHei', fontSize:64, bold:true, color:'7A1520',
          charSpacing:2, fit:'shrink'
        });
        setProgress(overlay, i+1, list.length);
        continue;
      }

      loadMemberIntoEditor(item);
      await nextFrame();

      hero.style.display = ''; intro.style.display = 'none'; divider.style.display = 'none'; hero.style.zoom = 1;
      flattenObjectFit(hero);
      let c = await html2canvas(hero, { scale:2, useCORS:true, backgroundColor:'#ffffff' });
      unflattenObjectFit(hero);
      pptx.addSlide().addImage({ data: c.toDataURL('image/png'), x:0, y:0, w:13.333, h:7.5 });

      // 介紹頁：僅當該會員 withIntro !== false 時匯出
      if (item.withIntro !== false){
        intro.style.display = ''; hero.style.display = 'none'; intro.style.zoom = 1;
        flattenObjectFit(intro);
        c = await html2canvas(intro, { scale:2, useCORS:true, backgroundColor:'#ffffff' });
        unflattenObjectFit(intro);
        pptx.addSlide().addImage({ data: c.toDataURL('image/png'), x:0, y:0, w:13.333, h:7.5 });
      }

      setProgress(overlay, i+1, list.length);
    }
    await pptx.writeFile({ fileName: 'BNI富鼎_本週例會_' + dateStamp() + '.pptx' });
  } catch(e){
    alert('產生 PPT 失敗：' + e.message);
    console.error(e);
  } finally {
    divider.style.display = 'none';
    hiddenEls.forEach((el, i) => { if (el) el.style.display = prevDisp[i]; });
    if (savedMember) loadMemberIntoEditor(savedMember); else { currentMember = null; render(); }
    switchFmt(savedActive);
    showView(savedView);
    hideProgress(overlay);
  }
}

/* ---------- 匯出 / 匯入 JSON ---------- */
function exportRoster(){
  const blob = new Blob([Store.exportJSON()], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'BNI富鼎_名冊_' + dateStamp() + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}
function importRoster(file){
  const r = new FileReader();
  r.onload = async ev => {
    try { await Store.importJSON(ev.target.result); alert('匯入完成'); }
    catch(e){ alert('匯入失敗：' + e.message); }
  };
  r.readAsText(file);
}

/* ---------- 綁定按鈕 ---------- */
function openAddMember(){
  document.getElementById('addName').value = '';
  document.getElementById('addSpec').value = '';
  document.getElementById('addStatus').textContent = '';
  // 填入專業別選單（datalist）
  const dl = document.getElementById('specDatalist');
  if (dl && !dl.dataset.filled){
    (window.BNI_SPECIALTIES || []).forEach(g => g.items.forEach(it => {
      const o = document.createElement('option'); o.value = it; dl.appendChild(o);
    }));
    dl.dataset.filled = '1';
  }
  document.getElementById('addMemberModal').classList.add('show');
  setTimeout(() => document.getElementById('addName').focus(), 50);
}
function closeAddMember(){ document.getElementById('addMemberModal').classList.remove('show'); }

function buildNewMember(){
  const name = document.getElementById('addName').value.trim();
  const spec = document.getElementById('addSpec').value.trim();
  if (!name){ document.getElementById('addName').focus(); alert('請輸入姓名'); return null; }
  const m = blankMember();
  m.name = name;
  m.specialty = spec;
  m.role = spec;
  return m;
}

(function wireRoster(){
  const nb = document.getElementById('newMemberBtn');
  if (nb) nb.addEventListener('click', openAddMember);

  const nd = document.getElementById('newDividerBtn');
  if (nd) nd.addEventListener('click', async () => {
    // 排到最前面，讓使用者立刻看到（再自行拖到想要的位置）
    const minOrder = Store.getAllSorted().reduce((mn, x) => Math.min(mn, x.order != null ? x.order : 0), 0);
    const d = blankDivider();
    d.order = minOrder - 1;
    await Store.upsert(d);
    if (typeof renderRoster === 'function') renderRoster();
    const listEl = document.getElementById('rosterList');
    if (listEl) listEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // 聚焦到新分隔頁的名稱輸入框
    setTimeout(() => {
      const first = document.querySelector('.divider-row .dv-title-input');
      if (first) first.focus();
    }, 300);
  });

  document.getElementById('addClose').addEventListener('click', closeAddMember);
  document.getElementById('addCancel').addEventListener('click', closeAddMember);
  document.getElementById('addMemberModal').addEventListener('click', e => { if (e.target.id === 'addMemberModal') closeAddMember(); });

  // 快速建立：加入名冊，停留在名冊頁
  document.getElementById('addCreate').addEventListener('click', async () => {
    const m = buildNewMember(); if (!m) return;
    await Store.upsert(m);
    document.getElementById('addStatus').textContent = '✓ 已新增：' + m.name;
    document.getElementById('addName').value = '';
    document.getElementById('addSpec').value = '';
    document.getElementById('addName').focus();
    if (typeof renderRoster === 'function') renderRoster();
  });

  // 建立並前往完整編輯頁
  document.getElementById('addCreateEdit').addEventListener('click', async () => {
    const m = buildNewMember(); if (!m) return;
    const id = await Store.upsert(m);
    closeAddMember();
    const fresh = Store.getById(id) || m;
    loadMemberIntoEditor(fresh);
    showView('editor');
    window.scrollTo(0, 0);
  });

  const dp = document.getElementById('downloadPPTBtn');
  if (dp) dp.addEventListener('click', generatePPT);

  const ex = document.getElementById('exportBtn');
  if (ex) ex.addEventListener('click', exportRoster);

  const imBtn = document.getElementById('importBtn');
  const imInput = document.getElementById('importFile');
  if (imBtn && imInput){
    imBtn.addEventListener('click', () => imInput.click());
    imInput.addEventListener('change', e => { if (e.target.files[0]) importRoster(e.target.files[0]); });
  }

  // 分隔頁檢視 modal 關閉
  const dpc = document.getElementById('dividerPreviewClose');
  if (dpc) dpc.addEventListener('click', closeDividerPreview);
  const dpm = document.getElementById('dividerPreviewModal');
  if (dpm) dpm.addEventListener('click', e => { if (e.target.id === 'dividerPreviewModal') closeDividerPreview(); });
})();

function closeDividerPreview(){
  const m = document.getElementById('dividerPreviewModal');
  if (m) m.classList.remove('show');
  const body = document.getElementById('dividerPreviewBody');
  if (body) body.innerHTML = '';   // 清掉 clone
}

// 母片為官方固定圖，僅產業鏈名稱（主標）可編輯覆蓋
function paintDivider(item){
  document.getElementById('dvTeam').textContent = item.title || '生命健康服務團隊產業鏈';
}

// 檢視某張產業鏈分隔頁：clone 原始 DOM 放進彈窗（不動原本的 #dividerSlide）
function previewDivider(id){
  const item = Store.getById(id); if (!item) return;
  const modal = document.getElementById('dividerPreviewModal');
  const body  = document.getElementById('dividerPreviewBody');
  const dvOrig = document.getElementById('dividerSlide');

  // clone 完整 DOM，並套用當前產業鏈名稱
  // 注意：原始 #dividerSlide 的 CSS 是靠 id 選擇器，clone 移除 id 後樣式不會套用，
  // 因此明確給 clone 母片尺寸與定位樣式。
  const clone = dvOrig.cloneNode(true);
  clone.id = 'dividerSlideClone';
  clone.removeAttribute('style');
  const teamEl = clone.querySelector('#dvTeam') || clone.querySelector('.dv-team');
  if (teamEl){ teamEl.textContent = item.title || '生命健康服務團隊產業鏈'; teamEl.removeAttribute('id'); }
  const img = clone.querySelector('.dv-bgimg');
  if (img){ img.removeAttribute('style'); img.style.cssText = 'position:absolute;top:0;left:0;width:960px;height:540px;z-index:1;display:block;'; }
  if (teamEl){
    teamEl.style.cssText = 'position:absolute;top:161px;left:56px;right:56px;height:183px;z-index:3;display:flex;align-items:center;justify-content:center;white-space:nowrap;font-family:"Noto Sans TC",sans-serif;font-weight:900;font-size:66px;line-height:1.06;letter-spacing:2px;color:#7a1520;text-shadow:0 1px 1px rgba(0,0,0,.08);';
  }
  clone.style.cssText = 'width:960px;height:540px;position:relative;overflow:hidden;transform-origin:top center;font-family:"Noto Sans TC",sans-serif;background:#faf6ee;box-shadow:0 20px 60px rgba(0,0,0,.22);display:block;flex:0 0 auto;';

  body.innerHTML = '';
  body.appendChild(clone);
  modal.classList.add('show');

  // 依彈窗實際寬度縮放
  // 先立即套用一次備援值，避免 flex 尚未計算 clientWidth 時整張母片超出彈窗
  clone.style.zoom = 0.93;
  const applyZoom = () => {
    const avail = body.clientWidth - 4;
    if (avail > 0) clone.style.zoom = Math.min(1, avail / 960);
  };
  // 兩次量測（rAF 對背景分頁可能不跑，setTimeout 保證）
  setTimeout(applyZoom, 0);
  setTimeout(applyZoom, 80);
}
