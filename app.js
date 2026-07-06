/* ============ BNI 富鼎分會 EDM 製作工具 ============ */

// ---- 建立三格輸入欄位 ----
function buildTriple(containerId, placeholders){
  const box = document.getElementById(containerId);
  placeholders.forEach((ph, i) => {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = ph;
    inp.dataset.slot = i;
    inp.addEventListener('input', render);
    box.appendChild(inp);
  });
}

const defaults = {
  partners: ['心理諮商師', '', ''],
  general:  ['', '', ''],
  ideal:    ['獵頭／招募顧問', '', ''],
  dream:    ['私立職業訓練中心主管', '', ''],
  clients:  ['', '', '']
};

buildTriple('partners', ['合作對象 1', '合作對象 2', '合作對象 3']);
buildTriple('general',  ['一般引薦 1', '一般引薦 2', '一般引薦 3']);
buildTriple('ideal',    ['理想引薦 1', '理想引薦 2', '理想引薦 3']);
buildTriple('dream',    ['夢幻引薦 1', '夢幻引薦 2', '夢幻引薦 3']);
buildTriple('clients',  ['代表客戶 1', '代表客戶 2', '代表客戶 3']);

// 套用預設值
Object.keys(defaults).forEach(id => {
  const inputs = document.querySelectorAll('#' + id + ' input');
  defaults[id].forEach((v, i) => { if (inputs[i]) inputs[i].value = v; });
});

// ---- 專業別下拉 ----
(function fillSpecialties(){
  const sel = document.getElementById('specialtySelect');
  const blank = document.createElement('option');
  blank.value = ''; blank.textContent = '— 請選擇專業別 —';
  sel.appendChild(blank);
  (window.BNI_SPECIALTIES || []).forEach(g => {
    const og = document.createElement('optgroup');
    og.label = g.group;
    g.items.forEach(it => {
      const o = document.createElement('option');
      o.value = it; o.textContent = it;
      og.appendChild(o);
    });
    sel.appendChild(og);
  });
  sel.addEventListener('change', () => {
    if (sel.value) document.getElementById('specialty').value = sel.value;
    render();
  });
})();

// ---- 會員快速選擇（從名冊 Store 帶入並進入編輯） ----
let currentMember = null;   // 目前正在編輯的名冊會員（null = 尚未對應名冊）

function buildMemberSelect(){
  const sel = document.getElementById('memberSelect');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '';
  const blank = document.createElement('option');
  blank.value = ''; blank.textContent = '— 選擇會員自動帶入 —';
  sel.appendChild(blank);
  Store.getAllSorted().forEach(m => {
    const o = document.createElement('option');
    o.value = m.id;
    o.textContent = m.name + '（' + (m.specialty || '') + '）';
    sel.appendChild(o);
  });
  if (prev) sel.value = prev;
}

document.getElementById('memberSelect').addEventListener('change', e => {
  const m = Store.getById(e.target.value);
  if (m) loadMemberIntoEditor(m);
});

// 活動資訊預設值（會員未填時沿用）
const EV_DEFAULT = {
  evDate: '06/26', evDay: '週四', evTime: '06:30 – 09:30 AM',
  evNote1: '準備10秒自我介紹 / 入場請著正式服裝',
  evNote2: '入席費 NT.800 元 / 請準備名片50張',
  evPlace: '高雄福華飯店7F金龍廳'
};

// 把一位名冊會員載入左側編輯表單
function loadMemberIntoEditor(m){
  currentMember = m;
  document.getElementById('name').value = m.name || '';
  document.getElementById('role').value = m.role || m.specialty || '';
  document.getElementById('specialty').value = m.specialty || '';
  document.getElementById('sloganMain').value = m.sloganMain || '';
  document.getElementById('sloganSub').value = m.sloganSub || m.slogan || '';
  document.getElementById('usp').value = m.usp || '';
  const spSel = document.getElementById('specialtySelect');
  const opt = [...spSel.options].find(o => o.value === m.specialty);
  spSel.value = opt ? m.specialty : '';
  applyTriple('partners', m.partners);
  applyTriple('general',  m.general || m.referrals);
  applyTriple('ideal',    m.ideal);
  applyTriple('dream',    m.dream);
  applyTriple('clients',  m.clients);
  // 活動資訊（會員自訂，否則用預設）
  document.getElementById('evDate').value  = m.evDate  != null ? m.evDate  : EV_DEFAULT.evDate;
  document.getElementById('evDay').value   = m.evDay   != null ? m.evDay   : EV_DEFAULT.evDay;
  document.getElementById('evTime').value  = m.evTime  != null ? m.evTime  : EV_DEFAULT.evTime;
  document.getElementById('evNote1').value = m.evNote1 != null ? m.evNote1 : EV_DEFAULT.evNote1;
  document.getElementById('evNote2').value = m.evNote2 != null ? m.evNote2 : EV_DEFAULT.evNote2;
  document.getElementById('evPlace').value = m.evPlace != null ? m.evPlace : EV_DEFAULT.evPlace;
  document.getElementById('showReferrals').checked = m.showReferrals !== false;
  document.getElementById('showClients').checked = m.showClients !== false;
  photoDataUrl = m.photo || '';
  const thumb = document.getElementById('thumb');
  if (photoDataUrl) thumb.src = photoDataUrl; else thumb.removeAttribute('src');
  updateEditingBanner();
  render();
}

// 從目前表單讀成一個會員物件（保留既有 id/order/present）
function readEditorAsMember(){
  const base = currentMember || {};
  return {
    id: base.id || null,
    order: base.order,
    present: base.present !== false,
    name: val('name'),
    role: val('role'),
    specialty: val('specialty'),
    sloganMain: val('sloganMain'),
    sloganSub: val('sloganSub'),
    usp: val('usp'),
    partners: readTriple('partners'),
    general:  readTriple('general'),
    ideal:    readTriple('ideal'),
    dream:    readTriple('dream'),
    clients:  readTriple('clients'),
    evDate: val('evDate'), evDay: val('evDay'), evTime: val('evTime'),
    evNote1: val('evNote1'), evNote2: val('evNote2'), evPlace: val('evPlace'),
    showReferrals: document.getElementById('showReferrals').checked,
    showClients: document.getElementById('showClients').checked,
    photo: photoDataUrl
  };
}

function blankMember(){
  return Object.assign({ id:null, name:'', role:'', specialty:'', sloganMain:'', sloganSub:'', usp:'',
           partners:['','',''], general:['','',''], ideal:['','',''], dream:['','',''],
           clients:['','',''], photo:'', present:true,
           showReferrals:true, showClients:true }, EV_DEFAULT);
}

async function saveEditorToRoster(){
  const m = readEditorAsMember();
  if (!m.name.trim()){ alert('請先填寫姓名，才能儲存到名冊'); return; }
  const id = await Store.upsert(m);
  currentMember = Store.getById(id) || m;
  updateEditingBanner();
  flashSaved('✓ 已儲存到名冊');
}

function updateEditingBanner(){
  const el = document.getElementById('editingBanner');
  if (!el) return;
  if (currentMember && currentMember.id){
    el.innerHTML = '正在編輯名冊會員：<b>' + (currentMember.name || '(未命名)') + '</b>';
    el.style.display = '';
  } else {
    el.innerHTML = '目前為草稿（尚未存入名冊）';
    el.style.display = '';
  }
}

// ---- 讀取一組三格值 ----
function readTriple(id){
  return [...document.querySelectorAll('#' + id + ' input')]
    .map(i => i.value.trim());
}

function fillList(ulId, values){
  const ul = document.getElementById(ulId);
  ul.innerHTML = '';
  const has = values.filter(Boolean);
  (has.length ? has : ['—']).forEach(v => {
    const li = document.createElement('li');
    li.textContent = v;
    ul.appendChild(li);
  });
}

// ---- 主渲染 ----
let photoDataUrl = '';

function currentData(){
  return {
    name: val('name'), role: val('role'), specialty: val('specialty'),
    main: val('sloganMain'), sub: val('sloganSub'), usp: val('usp'),
    date: val('evDate'), day: val('evDay'), time: val('evTime'),
    note1: val('evNote1'), note2: val('evNote2'), place: val('evPlace'),
    partners: readTriple('partners'), general: readTriple('general'),
    ideal: readTriple('ideal'), dream: readTriple('dream'), clients: readTriple('clients'),
    showReferrals: document.getElementById('showReferrals').checked,
    showClients: document.getElementById('showClients').checked
  };
}

// 用 data-* 屬性通用填入任一模板
function paintTemplate(root, d){
  root.querySelectorAll('[data-f]').forEach(el => {
    el.textContent = d[el.dataset.f] || '';
  });
  root.querySelectorAll('[data-inline]').forEach(el => {
    const arr = (d[el.dataset.inline] || []).filter(Boolean);
    el.textContent = arr.join('、');
    // 若該引薦列沒有內容則整列隱藏
    const row = el.closest('.ref-row, .ref-item');
    if (row && !el.hasAttribute('data-f')) row.classList.toggle('hide', arr.length === 0);
  });
  // 照片
  root.querySelectorAll('[data-photo]').forEach(p => {
    if (photoDataUrl){ p.classList.remove('empty'); p.innerHTML = '<img src="' + photoDataUrl + '" alt="">'; }
    else { p.classList.add('empty'); p.innerHTML = '<span>' + p.dataset.photo + '</span>'; }
  });
  // 區塊顯示/隱藏
  root.querySelectorAll('[data-block=referrals]').forEach(b => b.style.display = d.showReferrals ? '' : 'none');
  root.querySelectorAll('[data-block=clients]').forEach(b => b.style.display = d.showClients ? '' : 'none');
}

function render(){
  const d = currentData();
  paintTemplate(document.getElementById('tplDark'), d);
  paintTemplate(document.getElementById('tplNavy'), d);
  paintTemplate(document.getElementById('tplGreen'), d);

  // 16:9 版面照片
  setPhoto('heroPhoto', '形象照');
  setPhoto('introPhoto', '照片');

  // ---- 形象頁 16:9 ----
  document.getElementById('hRole').textContent = val('role') || '職稱';
  document.getElementById('hName').textContent = val('name') || '姓名';
  document.getElementById('hSpec').textContent = val('specialty') || '專業別';
  document.getElementById('hSlogan').textContent = val('sloganSub') || val('sloganMain') || '您的口號標語';

  // ---- 介紹頁 16:9 ----
  document.getElementById('iName').textContent = val('name') || '姓名';
  document.getElementById('iSpec').textContent = val('specialty') || '專業別';
  fillList('iPartners', readTriple('partners'));
  fillList('iGeneral',  readTriple('general'));
  fillList('iIdeal',    readTriple('ideal'));
  fillList('iDream',    readTriple('dream'));
  fillList('iClients',  readTriple('clients'));
  document.getElementById('iUsp').textContent = val('usp') || '—';
}

function setPhoto(id, placeholder){
  const ph = document.getElementById(id);
  if (!ph) return;
  if (photoDataUrl){
    ph.classList.remove('empty');
    ph.innerHTML = '<img src="' + photoDataUrl + '" alt="">';
  } else {
    ph.classList.add('empty');
    ph.innerHTML = '<span>' + placeholder + '</span>';
  }
}

function val(id){ return document.getElementById(id).value.trim(); }

// bind text inputs
['name','role','specialty','sloganMain','sloganSub','usp',
 'evDate','evTime','evNote1','evNote2','evPlace']
  .forEach(id => document.getElementById(id).addEventListener('input', render));
['evDay','showReferrals','showClients']
  .forEach(id => document.getElementById(id).addEventListener('change', () => { render(); scheduleSave(); }));

/* ============ 範本自動儲存（存在瀏覽器 localStorage） ============ */
const STORE_KEY = 'bni_edm_data_v1';

const SINGLE_FIELDS = ['name','role','specialty','sloganMain','sloganSub','usp',
                       'evDate','evDay','evTime','evNote1','evNote2','evPlace'];

function collectData(){
  const single = {};
  SINGLE_FIELDS.forEach(id => single[id] = document.getElementById(id).value);
  return {
    single,
    partners: readTriple('partners'),
    general:  readTriple('general'),
    ideal:    readTriple('ideal'),
    dream:    readTriple('dream'),
    clients:  readTriple('clients'),
    showReferrals: document.getElementById('showReferrals').checked,
    showClients:   document.getElementById('showClients').checked,
    photo:    photoDataUrl
  };
}

function saveData(){
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(collectData()));
    flashSaved();
  } catch(e){ /* 照片太大或無 localStorage，靜默略過 */ }
}

function applyTriple(id, arr){
  const inputs = document.querySelectorAll('#' + id + ' input');
  (arr || []).forEach((v, i) => { if (inputs[i]) inputs[i].value = v; });
}

function loadData(){
  let raw;
  try { raw = localStorage.getItem(STORE_KEY); } catch(e){ return false; }
  if (!raw) return false;
  let d;
  try { d = JSON.parse(raw); } catch(e){ return false; }
  Object.keys(d.single || {}).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = d.single[id];
  });
  applyTriple('partners', d.partners);
  applyTriple('general',  d.general);
  applyTriple('ideal',    d.ideal);
  applyTriple('dream',    d.dream);
  applyTriple('clients',  d.clients);
  if (typeof d.showReferrals === 'boolean') document.getElementById('showReferrals').checked = d.showReferrals;
  if (typeof d.showClients === 'boolean') document.getElementById('showClients').checked = d.showClients;
  if (d.photo){
    photoDataUrl = d.photo;
    const t = document.getElementById('thumb');
    if (t) t.src = d.photo;
  }
  return true;
}

let flashTimer = null;
function flashSaved(msg){
  const el = document.getElementById('saveStatus');
  if (!el) return;
  el.textContent = msg || '✓ 已自動儲存';
  el.style.opacity = '1';
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { el.style.opacity = '0'; }, 1800);
}

// 壓縮上傳照片，避免存進雲端/瀏覽器時過大
function compressImage(dataUrl, maxW, quality){
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxW){ h = Math.round(h * maxW / w); w = maxW; }
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      try { resolve(cv.toDataURL('image/jpeg', quality)); }
      catch(e){ resolve(dataUrl); }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// 任一欄位變動 → 存檔（延遲避免頻繁寫入）
let saveTimer = null;
function scheduleSave(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveData, 400);
}
document.addEventListener('input', scheduleSave);
document.getElementById('specialtySelect').addEventListener('change', scheduleSave);

// ---- 照片上傳 ----
document.getElementById('photo').addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = async ev => {
    photoDataUrl = await compressImage(ev.target.result, 640, 0.82);
    document.getElementById('thumb').src = photoDataUrl;
    render();
    saveData();
  };
  r.readAsDataURL(f);
});

// ---- 移除照片 ----
document.getElementById('removePhoto').addEventListener('click', () => {
  photoDataUrl = '';
  document.getElementById('photo').value = '';
  document.getElementById('thumb').removeAttribute('src');
  render();
  saveData();
});

/* ============ 版面切換 / 縮放 / 下載 ============ */
const FORMATS = {
  tplDark:  { w:600, h:849, label:'深金聚光', zoom:1 },
  tplNavy:  { w:600, h:849, label:'深藍典雅', zoom:1 },
  tplGreen: { w:960, h:640, label:'綠意自然', zoom:1 },
  hero:     { w:960, h:540, label:'形象頁',  zoom:1 },
  intro:    { w:960, h:540, label:'介紹頁',  zoom:1 }
};
let activeFmt = 'tplDark';
let zoom = FORMATS.tplDark.zoom;

function activeEl(){ return document.getElementById(activeFmt); }

function applyZoom(){
  const el = activeEl();
  // 用 CSS zoom（會撐開版面尺寸），超出寬度時預覽區可左右捲動
  el.style.zoom = zoom;
  document.getElementById('zoomLabel').textContent = '縮放 ' + Math.round(zoom * 100) + '%';
}

function switchFmt(fmt){
  activeFmt = fmt;
  // 顯示/隱藏三個版面
  Object.keys(FORMATS).forEach(k => {
    document.getElementById(k).style.display = (k === fmt) ? '' : 'none';
  });
  // 分頁按鈕樣式
  document.querySelectorAll('.fmt-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.fmt === fmt);
  });
  zoom = FORMATS[fmt].zoom;
  applyZoom();
  document.getElementById('download').textContent = '⬇ 下載' + FORMATS[fmt].label + ' (PNG)';
}

document.querySelectorAll('.fmt-tab').forEach(b => {
  b.addEventListener('click', () => switchFmt(b.dataset.fmt));
});

document.getElementById('zoomIn').onclick  = () => { zoom = Math.min(1.5, zoom + 0.1); applyZoom(); };
document.getElementById('zoomOut').onclick = () => { zoom = Math.max(0.3, zoom - 0.1); applyZoom(); };

// ---- 下載目前版面 PNG ----
document.getElementById('download').addEventListener('click', () => {
  const el = activeEl();
  const f = FORMATS[activeFmt];
  const prev = el.style.zoom;
  el.style.zoom = 1;                          // 用原始解析度輸出
  html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
    .then(canvas => {
      const a = document.createElement('a');
      a.download = (val('name') || 'BNI') + '_' + f.label + '.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
      el.style.zoom = prev;
      applyZoom();
    })
    .catch(err => {
      alert('下載失敗：' + err.message);
      el.style.zoom = prev;
      applyZoom();
    });
});

// ---- 清空 ----
document.getElementById('reset').addEventListener('click', () => {
  if (!confirm('確定要清空所有欄位嗎？（也會清除瀏覽器中儲存的範本）')) return;
  document.querySelectorAll('input[type=text], textarea').forEach(i => i.value = '');
  document.getElementById('specialtySelect').value = '';
  photoDataUrl = '';
  document.getElementById('thumb').removeAttribute('src');
  try { localStorage.removeItem(STORE_KEY); } catch(e){}
  render();
});

/* ============ 檢視切換（個人編輯 / 本週簡報） ============ */
let currentView = 'editor';
function showView(name){
  currentView = name;
  document.getElementById('view-editor').style.display = (name === 'editor') ? '' : 'none';
  document.getElementById('view-roster').style.display = (name === 'roster') ? '' : 'none';
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === name);
  });
  if (name === 'roster' && typeof renderRoster === 'function') renderRoster();
}
document.querySelectorAll('.nav-btn').forEach(b => {
  b.addEventListener('click', () => showView(b.dataset.view));
});

// 編輯區「儲存到名冊」按鈕
const saveRosterBtn = document.getElementById('saveToRoster');
if (saveRosterBtn) saveRosterBtn.addEventListener('click', saveEditorToRoster);

/* ============ 啟動 ============ */
(async function init(){
  await Store.init();
  buildMemberSelect();
  Store.onChange(() => {
    buildMemberSelect();
    if (currentView === 'roster' && typeof renderRoster === 'function') renderRoster();
    // 若正在編輯的會員被雲端更新，同步 currentMember 參照
    if (currentMember && currentMember.id){
      const fresh = Store.getById(currentMember.id);
      if (fresh) currentMember = fresh;
    }
    updateCloudBadge();
  });
  loadData();            // 還原個人草稿（個人卡片用途）
  render();
  switchFmt('tplDark');
  updateEditingBanner();
  updateCloudBadge();
})();

function updateCloudBadge(){
  const el = document.getElementById('cloudBadge');
  if (!el) return;
  if (Store.mode === 'cloud'){ el.textContent = '☁ 雲端同步中'; el.style.color = '#2e9e5b'; }
  else { el.textContent = '💾 本機儲存（未接雲端）'; el.style.color = '#b8912f'; }
}
