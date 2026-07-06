/* ============ 會員名冊資料層（Firebase 雲端 / 本機 localStorage 自動切換） ============
   - 若有設定 window.FIREBASE_CONFIG 且載入 Firebase SDK → 使用雲端 Firestore（多人共享、即時同步）
   - 否則 → 使用本機 localStorage（單機，可匯出/匯入 JSON 分享）
   對外 API 皆走記憶體快取 _members，寫入後 _notify() 觸發畫面更新。
============================================================================= */
const Store = {
  _members: [],
  _listeners: [],
  mode: 'local',
  KEY: 'bni_roster_v1',
  _db: null,
  _col: null,

  async init(){
    if (window.FIREBASE_CONFIG && window.firebase && window.firebase.firestore){
      try {
        firebase.initializeApp(window.FIREBASE_CONFIG);
        this._db = firebase.firestore();
        this._col = this._db.collection('members');
        this.mode = 'cloud';
        await this._cloudSeedIfEmpty();
        // 即時監聽
        this._col.onSnapshot(snap => {
          this._members = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
          this._notify();
        });
        return;
      } catch(e){
        console.warn('Firebase 初始化失敗，改用本機儲存', e);
      }
    }
    this.mode = 'local';
    this._load();
  },

  // ---------- 本機 ----------
  _load(){
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw){ this._members = JSON.parse(raw); this._notify(); return; }
    } catch(e){}
    this._members = seedRoster();
    this._persistLocal();
    this._notify();
  },
  _persistLocal(){
    if (this.mode !== 'local') return;
    try { localStorage.setItem(this.KEY, JSON.stringify(this._members)); }
    catch(e){ console.warn('名冊太大，localStorage 無法完整儲存（照片過多）', e); }
  },

  // ---------- 雲端 ----------
  async _cloudSeedIfEmpty(){
    const snap = await this._col.limit(1).get();
    if (!snap.empty) return;
    const seed = seedRoster();
    const batch = this._db.batch();
    seed.forEach(m => {
      const ref = this._col.doc(m.id);
      const data = Object.assign({}, m); delete data.id;
      batch.set(ref, data);
    });
    await batch.commit();
  },

  // ---------- 讀取 ----------
  getAllSorted(){
    return this._members.slice().sort((a,b) => (a.order ?? 9999) - (b.order ?? 9999));
  },
  getById(id){ return this._members.find(m => m.id === id) || null; },

  // ---------- 監聽 ----------
  onChange(cb){ this._listeners.push(cb); },
  _notify(){ this._listeners.forEach(f => { try { f(); } catch(e){ console.error(e); } }); },

  // ---------- 寫入 ----------
  async upsert(m){
    if (!m.id) m.id = 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
    if (m.order == null){
      const maxOrder = this._members.reduce((mx,x) => Math.max(mx, x.order ?? 0), 0);
      m.order = maxOrder + 1;
    }
    if (m.present == null) m.present = true;
    m.updatedAt = Date.now();

    if (this.mode === 'cloud'){
      const data = Object.assign({}, m); delete data.id;
      await this._col.doc(m.id).set(data, { merge:true });
    } else {
      const i = this._members.findIndex(x => x.id === m.id);
      if (i >= 0) this._members[i] = m; else this._members.push(m);
      this._persistLocal(); this._notify();
    }
    return m.id;
  },

  async remove(id){
    if (this.mode === 'cloud'){
      await this._col.doc(id).delete();
    } else {
      this._members = this._members.filter(m => m.id !== id);
      this._persistLocal(); this._notify();
    }
  },

  // 依 id 陣列重設出場順序
  async reorder(idsInOrder){
    idsInOrder.forEach((id, idx) => {
      const m = this.getById(id); if (m) m.order = idx + 1;
    });
    if (this.mode === 'cloud'){
      const batch = this._db.batch();
      idsInOrder.forEach((id, idx) => batch.update(this._col.doc(id), { order: idx + 1 }));
      await batch.commit();
    } else {
      this._persistLocal(); this._notify();
    }
  },

  async setPresent(id, val){
    const m = this.getById(id); if (!m) return;
    m.present = !!val;
    if (this.mode === 'cloud'){
      await this._col.doc(id).update({ present: !!val });
    } else {
      this._persistLocal(); this._notify();
    }
  },

  // ---------- 匯出 / 匯入 ----------
  exportJSON(){
    return JSON.stringify(this.getAllSorted(), null, 2);
  },
  async importJSON(text){
    const arr = JSON.parse(text);
    if (!Array.isArray(arr)) throw new Error('格式不正確：應為會員陣列');
    if (this.mode === 'cloud'){
      const batch = this._db.batch();
      arr.forEach(m => {
        if (!m.id) m.id = 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
        const data = Object.assign({}, m); delete data.id;
        batch.set(this._col.doc(m.id), data, { merge:true });
      });
      await batch.commit();
    } else {
      arr.forEach(m => { if (!m.id) m.id = 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2,7); });
      this._members = arr;
      this._persistLocal(); this._notify();
    }
  }
};

// 由 members.js 的靜態清單建立初始名冊
function seedRoster(){
  const src = window.BNI_MEMBERS || [];
  return src.map((m, i) => ({
    id: 'm_seed_' + i,
    order: i + 1,
    present: true,
    name: m.name || '',
    role: m.specialty || '',
    specialty: m.specialty || '',
    sloganMain: '',
    sloganSub: m.slogan || '',
    usp: '',
    partners: ['', '', ''],
    general: pad3(m.referrals),
    ideal: ['', '', ''],
    dream: ['', '', ''],
    clients: pad3(m.clients),
    photo: ''
  }));
}
function pad3(arr){
  const a = (arr || []).slice(0, 3);
  while (a.length < 3) a.push('');
  return a;
}
