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

// ---- 會員快速帶入 ----
(function fillMembers(){
  const sel = document.getElementById('memberSelect');
  if (!sel) return;
  const blank = document.createElement('option');
  blank.value = ''; blank.textContent = '— 選擇會員自動帶入 —';
  sel.appendChild(blank);
  (window.BNI_MEMBERS || [])
    .slice()
    .sort((a,b) => a.name.localeCompare(b.name, 'zh-Hant'))
    .forEach((m, i) => {
      // 用 name 當索引找回原陣列位置
      const o = document.createElement('option');
      o.value = m.name;
      o.textContent = m.name + '（' + m.specialty + '）';
      sel.appendChild(o);
    });
  sel.addEventListener('change', () => {
    const m = (window.BNI_MEMBERS || []).find(x => x.name === sel.value);
    if (!m) return;
    applyMember(m);
  });
})();

function applyMember(m){
  document.getElementById('name').value = m.name || '';
  document.getElementById('role').value = m.specialty || '';
  document.getElementById('specialty').value = m.specialty || '';
  // 同步專業別下拉
  const spSel = document.getElementById('specialtySelect');
  const opt = [...spSel.options].find(o => o.value === m.specialty);
  spSel.value = opt ? m.specialty : '';
  // 口號 → 副標
  if (m.slogan) document.getElementById('sloganSub').value = m.slogan;
  // 想要引薦的對象 → 一般引薦（前 3 項）
  const gInputs = document.querySelectorAll('#general input');
  gInputs.forEach((inp, i) => { inp.value = (m.referrals && m.referrals[i]) || ''; });
  // 代表性客戶（若有）
  const cInputs = document.querySelectorAll('#clients input');
  cInputs.forEach((inp, i) => { inp.value = (m.clients && m.clients[i]) || ''; });
  render();
  saveData();
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

function render(){
  document.getElementById('pvName').textContent = val('name') || '姓名';
  document.getElementById('pvRole').textContent = val('role') || '職稱';
  document.getElementById('pvMain').textContent = val('sloganMain') || '主標';
  document.getElementById('pvSub').textContent  = val('sloganSub') || '副標';
  document.getElementById('pvSpecialty').textContent = val('specialty') || '—';
  document.getElementById('pvUsp').textContent = val('usp') || '—';

  fillList('pvPartners', readTriple('partners'));
  fillList('pvGeneral',  readTriple('general'));
  fillList('pvIdeal',    readTriple('ideal'));
  fillList('pvDream',    readTriple('dream'));

  // clients as rows
  const cbox = document.getElementById('pvClients');
  cbox.innerHTML = '';
  const clients = readTriple('clients').filter(Boolean);
  (clients.length ? clients : ['—']).forEach(c => {
    const d = document.createElement('div');
    d.className = 'row';
    d.textContent = '· ' + c;
    cbox.appendChild(d);
  });

  // photo
  const ph = document.getElementById('edmPhoto');
  if (photoDataUrl){
    ph.classList.remove('empty');
    ph.innerHTML = '<img src="' + photoDataUrl + '" alt="">';
  } else {
    ph.classList.add('empty');
    ph.innerHTML = '<span>形象照</span>';
  }
}

function val(id){ return document.getElementById(id).value.trim(); }

// bind text inputs
['name','role','specialty','sloganMain','sloganSub','usp']
  .forEach(id => document.getElementById(id).addEventListener('input', render));

/* ============ 範本自動儲存（存在瀏覽器 localStorage） ============ */
const STORE_KEY = 'bni_edm_data_v1';

function collectData(){
  const single = {};
  ['name','role','specialty','sloganMain','sloganSub','usp']
    .forEach(id => single[id] = document.getElementById(id).value);
  return {
    single,
    partners: readTriple('partners'),
    general:  readTriple('general'),
    ideal:    readTriple('ideal'),
    dream:    readTriple('dream'),
    clients:  readTriple('clients'),
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
  if (d.photo){
    photoDataUrl = d.photo;
    const t = document.getElementById('thumb');
    if (t) t.src = d.photo;
  }
  return true;
}

let flashTimer = null;
function flashSaved(){
  const el = document.getElementById('saveStatus');
  if (!el) return;
  el.textContent = '✓ 已自動儲存';
  el.style.opacity = '1';
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { el.style.opacity = '0'; }, 1500);
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
  r.onload = ev => {
    photoDataUrl = ev.target.result;
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

// ---- 縮放 ----
let zoom = 0.7;
const edm = document.getElementById('edm');
function applyZoom(){
  edm.style.transform = 'scale(' + zoom + ')';
  // reserve height so page doesn't jump
  edm.parentElement.style.height = (849 * zoom) + 'px';
  document.getElementById('zoomLabel').textContent = '縮放 ' + Math.round(zoom * 100) + '%';
}
document.getElementById('zoomIn').onclick  = () => { zoom = Math.min(1, zoom + 0.1); applyZoom(); };
document.getElementById('zoomOut').onclick = () => { zoom = Math.max(0.3, zoom - 0.1); applyZoom(); };

// ---- 下載 PNG ----
document.getElementById('download').addEventListener('click', () => {
  const prev = edm.style.transform;
  edm.style.transform = 'scale(1)';           // render at full res
  edm.parentElement.style.height = '849px';
  html2canvas(edm, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
    .then(canvas => {
      const a = document.createElement('a');
      const name = (val('name') || 'BNI') + '_EDM';
      a.download = name + '.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
      edm.style.transform = prev;
      applyZoom();
    })
    .catch(err => {
      alert('下載失敗：' + err.message);
      edm.style.transform = prev;
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

// 開啟頁面時，若瀏覽器有存過範本就自動帶入（覆蓋預設值）
loadData();

applyZoom();
render();
