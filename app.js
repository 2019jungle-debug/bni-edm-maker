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

// ---- 專業別下拉（標註該專業別的會員，或「招募中」） ----
function memberBySpecialty(spec){
  return Store.getAllSorted().find(m => m.type !== 'divider' && (m.specialty || '') === spec) || null;
}

function buildSpecialtySelect(){
  const sel = document.getElementById('specialtySelect');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '';
  const blank = document.createElement('option');
  blank.value = ''; blank.textContent = '— 請選擇專業別 —';
  sel.appendChild(blank);
  (window.BNI_SPECIALTIES || []).forEach(g => {
    const og = document.createElement('optgroup');
    og.label = g.group;
    g.items.forEach(it => {
      const o = document.createElement('option');
      o.value = it;
      const mem = memberBySpecialty(it);
      o.textContent = it + (mem ? '（' + mem.name + '）' : '（招募中）');
      og.appendChild(o);
    });
    sel.appendChild(og);
  });
  if (prev) sel.value = prev;
}

document.getElementById('specialtySelect').addEventListener('change', function(){
  const spec = this.value;
  if (!spec){ return; }
  const mem = memberBySpecialty(spec);
  if (mem){
    // 已有會員 → 直接帶出整位會員
    loadMemberIntoEditor(mem);
    this.value = spec;   // 保持選取
  } else {
    // 招募中：僅填入專業別，脫離目前會員，作為新增會員的起點
    document.getElementById('specialty').value = spec;
    currentMember = null;
    updateEditingBanner();
    render();
  }
});

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
    if (m.type === 'divider') return;
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

// 活動資訊預設值（會員未填時沿用；日期用 ISO yyyy-mm-dd）
const EV_DEFAULT = {
  evDate: '2026-06-26', evTime: '06:30 – 09:30 AM',
  evNote1: '準備10秒自我介紹 / 入場請著正式服裝',
  evNote2: '入席費 NT.800 元 / 請準備名片50張',
  evPlace: '高雄福華飯店7F金龍廳'
};
// 舊資料相容：把 "06/26" 這種舊格式轉成當年度 ISO
function toISODate(v){
  if (!v) return EV_DEFAULT.evDate;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/(\d{1,2})\s*[\/\-月]\s*(\d{1,2})/);
  if (m) return '2026-' + String(m[1]).padStart(2,'0') + '-' + String(m[2]).padStart(2,'0');
  return EV_DEFAULT.evDate;
}

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
  document.getElementById('evDate').value  = toISODate(m.evDate);
  document.getElementById('evTime').value  = m.evTime  != null ? m.evTime  : EV_DEFAULT.evTime;
  document.getElementById('evNote1').value = m.evNote1 != null ? m.evNote1 : EV_DEFAULT.evNote1;
  document.getElementById('evNote2').value = m.evNote2 != null ? m.evNote2 : EV_DEFAULT.evNote2;
  document.getElementById('evPlace').value = m.evPlace != null ? m.evPlace : EV_DEFAULT.evPlace;
  updateDayDisplay();
  applyShowFlags(m.show);
  photoDataUrl = m.photo || '';
  const thumb = document.getElementById('thumb');
  if (photoDataUrl) thumb.src = photoDataUrl; else thumb.removeAttribute('src');
  setExtraImg('logo', m.logo); setExtraImg('product', m.product); setExtraImg('introImg', m.introImg);
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
    evDate: val('evDate'), evTime: val('evTime'),
    evNote1: val('evNote1'), evNote2: val('evNote2'), evPlace: val('evPlace'),
    show: readShowFlags(),
    photo: photoDataUrl,
    logo: logoDataUrl, product: productDataUrl, introImg: introImgDataUrl
  };
}

function blankMember(){
  return Object.assign({ id:null, name:'', role:'', specialty:'', sloganMain:'', sloganSub:'', usp:'',
           partners:['','',''], general:['','',''], ideal:['','',''], dream:['','',''],
           clients:['','',''], photo:'', logo:'', product:'', introImg:'', present:true,
           show:{ partners:true, general:true, ideal:true, dream:true, clients:true, usp:true } }, EV_DEFAULT);
}

// 產業鏈分隔頁項目（放在名冊中，PPT 產生時變成一張分隔投影片）
function blankDivider(){
  return { id:null, type:'divider', title:'', present:true, order:null };
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

// 日期輔助：ISO(yyyy-mm-dd) → MM/DD 與 週X
function mmdd(iso){
  if (!iso) return '';
  const p = iso.split('-');
  return p.length >= 3 ? (p[1] + '/' + p[2]) : iso;
}
function weekdayZh(iso){
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  return '週' + '日一二三四五六'[d.getDay()];
}

// 讀取各類「顯示」勾選狀態
function readShowFlags(){
  const s = {};
  document.querySelectorAll('.showFlag').forEach(cb => s[cb.dataset.key] = cb.checked);
  return s;
}

function currentData(){
  const iso = val('evDate');
  return {
    name: val('name'), role: val('role'), specialty: val('specialty'),
    main: val('sloganMain'), sub: val('sloganSub'), usp: val('usp'),
    date: mmdd(iso), day: weekdayZh(iso), time: val('evTime'),
    note1: val('evNote1'), note2: val('evNote2'), place: val('evPlace'),
    partners: readTriple('partners'), general: readTriple('general'),
    ideal: readTriple('ideal'), dream: readTriple('dream'), clients: readTriple('clients'),
    show: readShowFlags()
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
  });
  // 各列：值為空 或 該類未勾選顯示 → 隱藏
  root.querySelectorAll('.ref-row, .ref-item').forEach(row => {
    const v = row.querySelector('.val');
    if (!v) return;
    const key = v.dataset.inline || v.dataset.f;   // partners/general/ideal/dream/clients/usp
    const empty = !v.textContent.trim();
    const shown = d.show[key] !== false;
    row.classList.toggle('hide', empty || !shown);
  });
  // 引薦容器若無任何可見列 → 收起整個容器
  ['.edm-refs', '.tr-refs', '.td-refs', '.tn-refs', '.tg-refs'].forEach(sel => {
    const c = root.querySelector(sel);
    if (!c) return;
    const anyVisible = [...c.querySelectorAll('.ref-row, .ref-item')].some(r => !r.classList.contains('hide'));
    c.style.display = anyVisible ? '' : 'none';
  });
  // 照片
  root.querySelectorAll('[data-photo]').forEach(p => {
    if (photoDataUrl){ p.classList.remove('empty'); p.innerHTML = '<img src="' + photoDataUrl + '" alt="">'; }
    else { p.classList.add('empty'); p.innerHTML = '<span>' + p.dataset.photo + '</span>'; }
  });
}

function render(){
  const d = currentData();
  paintTemplate(document.getElementById('edm'), d);

  // 16:9 版面照片
  setPhoto('heroPhoto', '形象照');
  setPhoto('introPhoto', '照片');

  // ---- 形象頁 16:9 ----
  document.getElementById('hRole').textContent = val('role') || '職稱';
  document.getElementById('hName').textContent = val('name') || '姓名';
  document.getElementById('hSpec').textContent = val('specialty') || '專業別';
  document.getElementById('hSlogan').textContent = val('usp') || val('sloganSub') || val('sloganMain') || '您的獨特銷售主張';
  document.getElementById('hPartners').textContent = readTriple('partners').filter(Boolean).join('、');
  paintImg('heroLogo', logoDataUrl);
  paintImg('heroProduct', productDataUrl);

  // ---- 介紹頁 16:9 ----
  paintImg('introImgLayer', introImgDataUrl);
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

/* ============ 產業鏈（團隊）對照 ============ */
function teamOf(spec){
  const groups = window.BNI_SPECIALTIES || [];
  for (const g of groups){ if (g.items.includes(spec)) return g.group; }
  return '';
}

/* ============ 宣傳文自動生成（套用富鼎格式 + emoji） ============ */
function genPromo(){
  const d = currentData();
  const iso = val('evDate');
  const yr = (iso.split('-')[0]) || '';
  const dayChar = (d.day || '').replace('週', '');
  const dateLine = (yr && d.date) ? (yr + '.' + d.date.replace('/', '.') + (dayChar ? ('（' + dayChar + '）') : '')) : (d.date || '');
  const name = d.name || '（姓名）';
  const spec = d.specialty || d.role || '';
  const topic = [d.main, d.sub].filter(Boolean).join('');
  const sloganLine = [d.main, d.sub].filter(Boolean).join('，');
  const refs = [];
  [d.partners, d.general, d.ideal, d.dream].forEach(a => (a || []).forEach(x => { if (x && !refs.includes(x)) refs.push(x); }));
  const refLines = refs.length
    ? refs.slice(0, 6).map((r, i) => '行業' + (i + 1) + '：' + r).join('\n')
    : '（尚未填寫引薦對象）';
  const intro = d.usp
    ? d.usp
    : ('本週由' + (spec ? spec + '代表 ' : '') + name + '，帶來精彩的專題分享，值得您把握！');

  let s = '';
  s += '🎬 富鼎鈦金名人堂專題簡報\n';
  s += '📆 ' + dateLine + '\n';
  s += '⏰ 早上 ' + (d.time || '06:30－09:30') + '\n';
  s += '👉 地點：' + (d.place || '') + '\n\n';
  if (topic) s += '📑 「' + topic + '」\n';
  s += '🗣 ' + (spec ? spec + '－' : '') + name + '\n\n';
  s += '✨ ' + intro + '\n\n';
  if (sloganLine) s += '💯 Slogan：\n「' + sloganLine + '」\n\n';
  s += '🗣 積極邀請合作的行業別：\n' + refLines + '\n\n';
  s += '🔥 心動不如馬上行動，趕快手刀報名' + (d.date ? d.date + ' ' : '') + '專題簡報！\n';
  s += '富鼎富鼎，又富又鼎 💪';
  return s;
}

// 內嵌區塊（表單最下方）
document.getElementById('genPromoBtn').addEventListener('click', () => {
  document.getElementById('promoOut').value = genPromo();
  flashSaved('✓ 已生成宣傳文');
});
document.getElementById('copyPromoBtn').addEventListener('click', async () => {
  const t = document.getElementById('promoOut');
  if (!t.value.trim()) t.value = genPromo();
  await copyText(t.value, () => flashSaved('✓ 已複製宣傳文'));
});

// 彈出視窗（預覽區旁的「✨ 宣傳文」按鈕）
async function copyText(text, onOk){
  try { await navigator.clipboard.writeText(text); onOk && onOk(); }
  catch(e){ const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); onOk && onOk(); }
}
function openPromoModal(){
  const txt = genPromo();
  document.getElementById('promoModalText').value = txt;
  document.getElementById('promoOut').value = txt;   // 同步內嵌區
  document.getElementById('promoModalStatus').textContent = '';
  document.getElementById('promoModal').classList.add('show');
}
function closePromoModal(){ document.getElementById('promoModal').classList.remove('show'); }
document.getElementById('openPromoBtn').addEventListener('click', openPromoModal);
document.getElementById('promoClose').addEventListener('click', closePromoModal);
document.getElementById('promoModal').addEventListener('click', e => { if (e.target.id === 'promoModal') closePromoModal(); });
document.getElementById('promoModalRegen').addEventListener('click', () => {
  document.getElementById('promoModalText').value = genPromo();
  document.getElementById('promoModalStatus').textContent = '已重新生成';
});
document.getElementById('promoModalCopy').addEventListener('click', () => {
  copyText(document.getElementById('promoModalText').value, () => {
    document.getElementById('promoModalStatus').textContent = '✓ 已複製，可貼到 LINE / FB';
  });
});

// 更新「星期（自動）」顯示
function updateDayDisplay(){
  const el = document.getElementById('evDayDisplay');
  if (el) el.value = weekdayZh(val('evDate'));
}

// bind text inputs
['name','role','specialty','sloganMain','sloganSub','usp',
 'evTime','evNote1','evNote2','evPlace']
  .forEach(id => document.getElementById(id).addEventListener('input', render));
// 日期：選日曆 → 自動帶出星期
document.getElementById('evDate').addEventListener('change', () => { updateDayDisplay(); render(); scheduleSave(); });
// 各類「顯示」勾選
document.querySelectorAll('.showFlag').forEach(cb =>
  cb.addEventListener('change', () => { render(); scheduleSave(); }));

/* ============ 範本自動儲存（存在瀏覽器 localStorage） ============ */
const STORE_KEY = 'bni_edm_data_v1';

const SINGLE_FIELDS = ['name','role','specialty','sloganMain','sloganSub','usp',
                       'evDate','evTime','evNote1','evNote2','evPlace'];

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
    show:     readShowFlags(),
    photo:    photoDataUrl,
    logo:     logoDataUrl,
    product:  productDataUrl,
    introImg: introImgDataUrl
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
  applyShowFlags(d.show);
  updateDayDisplay();
  if (d.photo){
    photoDataUrl = d.photo;
    const t = document.getElementById('thumb');
    if (t) t.src = d.photo;
  }
  setExtraImg('logo', d.logo); setExtraImg('product', d.product); setExtraImg('introImg', d.introImg);
  return true;
}

// 還原額外素材圖到變數與縮圖
function setExtraImg(key, url){
  const cfg = EXTRA_IMGS.find(c => c.key === key); if (!cfg) return;
  cfg.set(url || '');
  const th = document.getElementById(cfg.thumb);
  if (th){ if (url) th.src = url; else th.removeAttribute('src'); }
}

// 套用各類顯示勾選（未指定則預設顯示）
function applyShowFlags(show){
  document.querySelectorAll('.showFlag').forEach(cb => {
    const v = show && show[cb.dataset.key];
    cb.checked = (v !== false);   // undefined 或 true → 勾選
  });
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

/* ---- 額外素材圖：公司 Logo / 產品方形照 / 介紹頁圖 ---- */
let logoDataUrl = '', productDataUrl = '', introImgDataUrl = '';
const EXTRA_IMGS = [
  { key:'logo',     get:()=>logoDataUrl,     set:v=>logoDataUrl=v,     input:'logoUpload',    thumb:'logoThumb',    remove:'logoRemove',    maxW:400,  fmt:'image/png'  },
  { key:'product',  get:()=>productDataUrl,  set:v=>productDataUrl=v,  input:'productUpload', thumb:'productThumb', remove:'productRemove', maxW:600,  fmt:'image/jpeg' },
  { key:'introImg', get:()=>introImgDataUrl, set:v=>introImgDataUrl=v, input:'introUpload',   thumb:'introThumb',   remove:'introRemove',   maxW:1280, fmt:'image/jpeg' }
];
function compressImageAs(dataUrl, maxW, fmt, quality){
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxW){ h = Math.round(h * maxW / w); w = maxW; }
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      try { resolve(cv.toDataURL(fmt, quality)); } catch(e){ resolve(dataUrl); }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
EXTRA_IMGS.forEach(cfg => {
  const inp = document.getElementById(cfg.input);
  const th = document.getElementById(cfg.thumb);
  const rm = document.getElementById(cfg.remove);
  if (inp) inp.addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = async ev => {
      cfg.set(await compressImageAs(ev.target.result, cfg.maxW, cfg.fmt, 0.85));
      if (th) th.src = cfg.get();
      render(); saveData();
    };
    r.readAsDataURL(f);
  });
  if (rm) rm.addEventListener('click', () => {
    cfg.set(''); if (inp) inp.value=''; if (th) th.removeAttribute('src');
    render(); saveData();
  });
});
// 把某 dataUrl 套進畫布元素（有圖顯示 img，無圖 empty）
function paintImg(id, url){
  const el = document.getElementById(id); if (!el) return;
  if (url){ el.classList.remove('empty'); el.innerHTML = '<img src="' + url + '" alt="">'; }
  else { el.classList.add('empty'); if (id==='introImgLayer') el.innerHTML='<span>上傳 25 秒輔助圖片（將鋪滿整頁）</span>'; else el.innerHTML=''; }
}

/* ============ 版面切換 / 縮放 / 下載 ============ */
// 6 個主題都用同一個 #edm 元素，切換 theme class；hero/intro 為獨立 16:9 元素
// A4 主題 exportScale 4.13 → 600×849 輸出 ≈ 2480×3508（A4 300dpi）
const A4X = 4.13;
const FORMATS = {
  themeBlack:   { el:'edm', theme:'theme-black',   w:600, h:849, label:'尊爵黑金', zoom:1, exportScale:A4X },
  themeBlue:    { el:'edm', theme:'theme-blue',    w:600, h:849, label:'深藍專業', zoom:1, exportScale:A4X },
  themeGreen:   { el:'edm', theme:'theme-green',   w:600, h:849, label:'自然清新', zoom:1, exportScale:A4X },
  themeRed:     { el:'edm', theme:'theme-red',     w:600, h:849, label:'活力紅動', zoom:1, exportScale:A4X },
  themeAi:      { el:'edm', theme:'theme-ai',      w:600, h:849, label:'科技未來', zoom:1, exportScale:A4X },
  themeMinimal: { el:'edm', theme:'theme-minimal', w:600, h:849, label:'優雅極簡', zoom:1, exportScale:A4X },
  hero:  { el:'hero',  w:960, h:540, label:'形象頁', zoom:1, exportScale:2 },
  intro: { el:'intro', w:960, h:540, label:'介紹頁', zoom:1, exportScale:2 }
};
const CANVAS_ELS = ['edm', 'hero', 'intro'];
let activeFmt = 'themeBlack';
let zoom = FORMATS.themeBlack.zoom;

function activeEl(){ return document.getElementById(FORMATS[activeFmt].el); }

function applyZoom(){
  const el = activeEl();
  el.style.zoom = zoom;
  document.getElementById('zoomLabel').textContent = '縮放 ' + Math.round(zoom * 100) + '%';
}

function switchFmt(fmt){
  activeFmt = fmt;
  const f = FORMATS[fmt];
  // 只顯示對應的畫布元素
  CANVAS_ELS.forEach(id => {
    const e = document.getElementById(id);
    if (e) e.style.display = (id === f.el) ? '' : 'none';
  });
  // 若是主題，套用 theme class 到 #edm
  if (f.theme){
    const edm = document.getElementById('edm');
    edm.className = 'canvas tpl ' + f.theme;
  }
  document.querySelectorAll('.fmt-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.fmt === fmt);
  });
  zoom = f.zoom;
  applyZoom();
  document.getElementById('download').textContent = '⬇ 下載' + f.label + ' (PNG)';
}

document.querySelectorAll('.fmt-tab').forEach(b => {
  b.addEventListener('click', () => switchFmt(b.dataset.fmt));
});

document.getElementById('zoomIn').onclick  = () => { zoom = Math.min(1.5, zoom + 0.1); applyZoom(); };
document.getElementById('zoomOut').onclick = () => { zoom = Math.max(0.3, zoom - 0.1); applyZoom(); };

// ---- 下載目前版面 PNG ----
document.getElementById('download').addEventListener('click', async () => {
  const el = activeEl();
  const f = FORMATS[activeFmt];
  const prev = el.style.zoom;
  el.style.zoom = 1;                          // 用原始解析度輸出
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch(e){}
  html2canvas(el, { scale: f.exportScale || 2, useCORS: true, backgroundColor: null })
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
  setExtraImg('logo',''); setExtraImg('product',''); setExtraImg('introImg','');
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
  buildSpecialtySelect();
  Store.onChange(() => {
    buildMemberSelect();
    buildSpecialtySelect();
    if (currentView === 'roster' && typeof renderRoster === 'function') renderRoster();
    // 若正在編輯的會員被雲端更新，同步 currentMember 參照
    if (currentMember && currentMember.id){
      const fresh = Store.getById(currentMember.id);
      if (fresh) currentMember = fresh;
    }
    updateCloudBadge();
  });
  loadData();            // 還原個人草稿（個人卡片用途）
  updateDayDisplay();
  render();
  switchFmt('themeBlack');
  updateEditingBanner();
  updateCloudBadge();
})();

function updateCloudBadge(){
  const el = document.getElementById('cloudBadge');
  if (!el) return;
  if (Store.mode === 'cloud'){ el.textContent = '☁ 雲端同步中'; el.style.color = '#2e9e5b'; }
  else { el.textContent = '💾 本機儲存（未接雲端）'; el.style.color = '#b8912f'; }
}
