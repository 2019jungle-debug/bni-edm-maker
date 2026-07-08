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

function renderRoster(){
  const wrap = document.getElementById('rosterList');
  if (!wrap) return;
  buildChainDatalist();
  const list = Store.getAllSorted();
  document.getElementById('rosterCount').textContent = list.filter(m => m.type !== 'divider').length;
  document.getElementById('presentCount').textContent = list.filter(m => m.type !== 'divider' && m.present !== false).length;

  const admin = (typeof isAdmin !== 'undefined') && isAdmin;   // 僅管理者可編輯

  wrap.innerHTML = '';
  list.forEach((m, idx) => {
    const row = document.createElement('div');
    row.draggable = admin;
    row.dataset.id = m.id;
    const adminActs = admin ? (
        '<button data-act="up" title="上移">↑</button>' +
        '<button data-act="down" title="下移">↓</button>' +
        (m.type === 'divider' ? '' : '<button data-act="edit">編輯</button>') +
        (m.type === 'divider' ? '' : '<button data-act="pw" title="會員密碼">🔑</button>') +
        '<button data-act="del" class="del">刪除</button>') : '';

    if (m.type === 'divider'){
      row.className = 'roster-row divider-row';
      const viewBtn = '<button data-act="view" title="檢視分隔頁">👁 檢視</button>';
      row.innerHTML =
        '<span class="drag" title="拖曳調整順序">⠿</span>' +
        '<span class="ord">' + (idx+1) + '</span>' +
        '<label class="present"><input type="checkbox" ' + (m.present !== false ? 'checked' : '') + (admin?'':' disabled') + '><span>放入</span></label>' +
        '<span class="dv-tag">產業鏈分隔頁</span>' +
        (admin
          ? '<span class="dv-fields" style="flex:1;display:flex;gap:6px;flex-wrap:wrap;">' +
              '<input class="dv-title-input" list="chainDatalist" placeholder="產業鏈名稱（主標）" value="' + escapeHtml(m.title || '') + '" style="flex:1;min-width:150px;">' +
              '<input class="dv-sub-input" placeholder="副標（例：產業服務鏈）" value="' + escapeHtml(m.sub == null ? '產業服務鏈' : m.sub) + '" style="flex:1;min-width:130px;">' +
            '</span>'
          : '<span class="dv-fields" style="flex:1;">' +
              '<span class="rspec" style="font-weight:700;color:var(--red-dark);">' + escapeHtml(m.title || '(未命名產業鏈)') + '</span>' +
              (m.sub ? '<span class="rspec" style="color:var(--gold);margin-left:8px;">' + escapeHtml(m.sub) + '</span>' : '') +
            '</span>') +
        '<span class="ract">' + viewBtn + adminActs + '</span>';
      const ti = row.querySelector('.dv-title-input');
      if (ti) ti.addEventListener('change', e => { const item = Store.getById(m.id); if (item){ item.title = e.target.value; Store.upsert(item); } });
      const si = row.querySelector('.dv-sub-input');
      if (si) si.addEventListener('change', e => { const item = Store.getById(m.id); if (item){ item.sub = e.target.value; Store.upsert(item); } });
      const vb = row.querySelector('[data-act=view]');
      if (vb) vb.addEventListener('click', () => previewDivider(m.id));
    } else {
      row.className = 'roster-row';
      row.innerHTML =
        '<span class="drag" title="拖曳調整順序">⠿</span>' +
        '<span class="ord">' + (idx+1) + '</span>' +
        '<label class="present"><input type="checkbox" ' + (m.present !== false ? 'checked' : '') + (admin?'':' disabled') + '><span>出場</span></label>' +
        '<span class="rname">' + escapeHtml(m.name || '(未命名)') + '</span>' +
        '<span class="rspec">' + escapeHtml(m.specialty || '') + '</span>' +
        (admin ? '<span class="rspec pwcell" style="flex:0 0 auto;font-family:monospace;color:#7b52c4;">' + (m.pw ? escapeHtml(m.pw) : '—') + '</span>' : '') +
        '<span class="ract">' + adminActs + '</span>';
      const eb = row.querySelector('[data-act=edit]');
      if (eb) eb.addEventListener('click', () => { loadMemberIntoEditor(Store.getById(m.id)); showView('editor'); });
      const pb = row.querySelector('[data-act=pw]');
      if (pb) pb.addEventListener('click', async () => {
        const item = Store.getById(m.id); if (!item) return;
        if (!item.pw || confirm('「' + item.name + '」目前密碼：' + item.pw + '\n要重新產生一組新密碼嗎？')){
          item.pw = genPw(); await Store.upsert(item);
          alert('「' + item.name + '」的會員密碼：' + item.pw + '\n請把這組密碼給該會員，他登入後只能編輯自己的頁面。');
        }
      });
    }

    const pc = row.querySelector('.present input');
    if (pc && admin) pc.addEventListener('change', e => Store.setPresent(m.id, e.target.checked));
    const ub = row.querySelector('[data-act=up]');   if (ub) ub.addEventListener('click', () => moveMember(m.id, -1));
    const db = row.querySelector('[data-act=down]'); if (db) db.addEventListener('click', () => moveMember(m.id, +1));
    const xb = row.querySelector('[data-act=del]');
    if (xb) xb.addEventListener('click', () => {
      const label = m.type === 'divider' ? ('分隔頁「' + (m.title || '') + '」') : ('「' + (m.name || '此會員') + '」');
      if (confirm('確定刪除' + label + '？')) Store.remove(m.id);
    });

    if (admin){
      row.addEventListener('dragstart', () => { dragId = m.id; row.classList.add('dragging'); });
      row.addEventListener('dragend',   () => row.classList.remove('dragging'));
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
  const ids = Store.getAllSorted().map(m => m.id);
  ids.splice(ids.indexOf(dragId), 1);
  ids.splice(ids.indexOf(targetId), 0, dragId);
  Store.reorder(ids);
  dragId = null;
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
  const hero = document.getElementById('hero');
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
        // 產業鏈分隔頁（使用名冊中自填的名稱）
        document.getElementById('dvTeam').textContent = item.title || '產業鏈';
        document.getElementById('dvSub').textContent = (item.sub != null ? item.sub : (item.title ? '產業服務鏈' : '請準備'));
        hero.style.display = 'none'; intro.style.display = 'none'; divider.style.display = ''; divider.style.zoom = 1;
        await nextFrame();
        const dc = await html2canvas(divider, { scale:2, useCORS:true, backgroundColor:'#ffffff' });
        pptx.addSlide().addImage({ data: dc.toDataURL('image/png'), x:0, y:0, w:13.333, h:7.5 });
        divider.style.display = 'none';
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

      intro.style.display = ''; hero.style.display = 'none'; intro.style.zoom = 1;
      flattenObjectFit(intro);
      c = await html2canvas(intro, { scale:2, useCORS:true, backgroundColor:'#ffffff' });
      unflattenObjectFit(intro);
      pptx.addSlide().addImage({ data: c.toDataURL('image/png'), x:0, y:0, w:13.333, h:7.5 });

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
}

// 檢視某張產業鏈分隔頁：依名冊資料即時渲染實際 PPT 樣式
async function previewDivider(id){
  const item = Store.getById(id); if (!item) return;
  const modal = document.getElementById('dividerPreviewModal');
  const body  = document.getElementById('dividerPreviewBody');
  body.innerHTML = '<div style="color:#666;padding:40px;">產生預覽中…</div>';
  modal.classList.add('show');

  const dv = document.getElementById('dividerSlide');
  document.getElementById('dvTeam').textContent = item.title || '產業鏈';
  document.getElementById('dvSub').textContent  = (item.sub != null ? item.sub : (item.title ? '產業服務鏈' : '請準備'));

  // 暫時移到 body 底下並顯示（避開祖先 display:none 導致擷取空白）
  const parent = dv.parentNode, next = dv.nextSibling;
  const prev = { display: dv.style.display, position: dv.style.position, left: dv.style.left, top: dv.style.top, zoom: dv.style.zoom };
  document.body.appendChild(dv);
  dv.style.display = ''; dv.style.position = 'fixed'; dv.style.left = '-3000px'; dv.style.top = '0'; dv.style.zoom = 1;
  try {
    await new Promise(r => setTimeout(r, 30));
    const c = await html2canvas(dv, { scale:2, useCORS:true, backgroundColor:'#ffffff' });
    body.innerHTML = '';
    const img = new Image();
    img.src = c.toDataURL('image/png');
    img.style.cssText = 'max-width:100%;height:auto;border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,.2);';
    body.appendChild(img);
  } catch(e){
    body.innerHTML = '<div style="color:#c00;padding:30px;">預覽失敗：' + e.message + '</div>';
  } finally {
    dv.style.display = prev.display || 'none';
    dv.style.position = prev.position; dv.style.left = prev.left; dv.style.top = prev.top; dv.style.zoom = prev.zoom;
    if (next) parent.insertBefore(dv, next); else parent.appendChild(dv);
  }
}
