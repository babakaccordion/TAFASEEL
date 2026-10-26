// Tafaseel Web (PWA) - Arabic RTL
const STORAGE_KEY = 'tafaseel_state_v1';
let state = { instruments: [], dressTypes: [], musicians: [], gigs: [], notes: [], counters: { inst:0, dress:0, mus:0, gig:0, note:0 } };

const defaultInstruments = ["قربة","ترمبيت","طبل","ترمبون","كلارنيت","ساكسفون","كورنيت","طبلة","عصا","مزهر","يرغول","مطرب","رديد"];
const defaultDress = ["مراسم","أردني","فلسطيني","سوري","كاجوال","بدلات رسمي"];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { state = JSON.parse(raw); }
    else { seed(); }
  } catch (e) { seed(); }
  if (!state.counters) state.counters = { inst:0, dress:0, mus:0, gig:0, note:0 };
  if (!state.instruments || !state.instruments.length) seedInst();
  if (!state.dressTypes || !state.dressTypes.length) seedDress();
}
function seedInst() { defaultInstruments.forEach(n => addInstrument(n, true)); }
function seedDress() { defaultDress.forEach(n => addDressType(n, true)); }
function seed() {
  state = { instruments: [], dressTypes: [], musicians: [], gigs: [], notes: [], counters: { inst:0, dress:0, mus:0, gig:0, note:0 } };
  seedInst(); seedDress();
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function nextId(kind) { state.counters[kind]++; return state.counters[kind]; }

function addInstrument(name, silent=false) {
  if (state.instruments.some(i=>i.name===name)) return;
  state.instruments.push({id: nextId('inst'), name});
  if (!silent) { saveState(); toast('تمت إضافة الآلة'); renderSettings(); }
}
function deleteInstrument(id) {
  state.instruments = state.instruments.filter(i=>i.id!==id);
  state.musicians.forEach(m=>{ if(m.instrumentId===id) m.instrumentId=null; });
  saveState(); toast('تم الحذف'); renderSettings();
}
function addDressType(name, silent=false) {
  if (state.dressTypes.some(d=>d.name===name)) return;
  state.dressTypes.push({id: nextId('dress'), name});
  if (!silent) { saveState(); toast('تمت الإضافة'); renderSettings(); }
}
function deleteDressType(id) {
  state.dressTypes = state.dressTypes.filter(d=>d.id!==id);
  state.gigs.forEach(g=>{ if(g.dressTypeId===id) g.dressTypeId=null; });
  saveState(); toast('تم الحذف'); renderSettings();
}

function addMusician(data) {
  const m = { id: nextId('mus'), name: data.name, instrumentId: data.instrumentId, phone: data.phone, notes: data.notes };
  state.musicians.push(m); saveState(); toast('تمت إضافة العازف'); return m.id;
}
function updateMusician(id, data) {
  const m = state.musicians.find(x=>x.id===id);
  if (!m) return;
  Object.assign(m, data); saveState(); toast('تم التحديث');
}
function deleteMusician(id) {
  state.musicians = state.musicians.filter(m=>m.id!==id);
  state.gigs.forEach(g=>{ g.musicians = g.musicians.filter(x=>x.musicianId!==id); });
  saveState(); toast('تم الحذف');
}

function addGig(data) {
  const g = { id: nextId('gig'), name: data.name, date: data.date, start: data.start, end: data.end, location: data.location, dressTypeId: data.dressTypeId, price: data.price, notes: data.notes, musicians: data.musicians || [] };
  state.gigs.push(g); saveState(); toast('تمت إضافة الحفلة'); return g.id;
}
function updateGig(id, data) {
  const g = state.gigs.find(x=>x.id===id);
  if (!g) return;
  Object.assign(g, data); saveState(); toast('تم التحديث');
}
function deleteGig(id) {
  state.gigs = state.gigs.filter(g=>g.id!==id);
  saveState(); toast('تم الحذف');
}

function addNote(data) {
  state.notes.push({ id: nextId('note'), scope: data.scope, refId: data.refId, title: data.title, content: data.content, createdAt: new Date().toLocaleString('ar') });
  saveState(); toast('تمت إضافة الملاحظة');
}

function instrName(id) { const i = state.instruments.find(x=>x.id===id); return i?i.name:'—'; }
function dressName(id) { const d = state.dressTypes.find(x=>x.id===id); return d?d.name:'—'; }
function musicianName(id) { const m = state.musicians.find(x=>x.id===id); return m?m.name:'—'; }
function fmtMoney(v) { return (Number(v)||0).toLocaleString('ar', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' د.أ'; }
function today() { return new Date().toISOString().slice(0,10); }

// Navigation
let currentScreen = 'dashboard';
const screens = ['dashboard','gigs','musicians','settings','notes'];
function navigate(name) {
  currentScreen = name;
  document.querySelectorAll('section[id^="screen-"]').forEach(s => { s.style.display = 'none'; });
  const el = document.getElementById('screen-'+name);
  if (el) el.style.display = 'block';
  document.querySelectorAll('.bottom-nav button').forEach(b => {
    b.classList.toggle('active', b.dataset.screen===name);
  });
  renderCurrent();
}
function renderCurrent() {
  if (currentScreen==='dashboard') renderDashboard();
  else if (currentScreen==='gigs') renderGigs();
  else if (currentScreen==='musicians') renderMusicians();
  else if (currentScreen==='settings') renderSettings();
  else if (currentScreen==='notes') renderNotes();
}

// Dashboard
let chartIncome, chartDress, chartMonth;
function renderDashboard() {
  const upcoming = state.gigs.filter(g=>g.date>=today()).length;
  const completed = state.gigs.filter(g=>g.date<today()).length;
  const totalIncome = state.gigs.reduce((a,g)=>a+(Number(g.price)||0),0);
  document.getElementById('stat-gigs').textContent = state.gigs.length;
  document.getElementById('stat-upcoming').textContent = upcoming;
  document.getElementById('stat-completed').textContent = completed;
  document.getElementById('stat-musicians').textContent = state.musicians.length;
  document.getElementById('stat-income').textContent = fmtMoney(totalIncome);

  // income by musician
  const incomeMap = {};
  state.musicians.forEach(m=>{ incomeMap[m.id]=0; });
  state.gigs.forEach(g=> (g.musicians||[]).forEach(gm=>{ if (incomeMap[gm.musicianId]!==undefined) incomeMap[gm.musicianId]+=Number(gm.fee)||0; }));
  const incomeLabels = state.musicians.map(m=>m.name);
  const incomeData = state.musicians.map(m=>incomeMap[m.id]||0);
  // dress
  const dressMap = {};
  state.dressTypes.forEach(d=>{ dressMap[d.id]=0; });
  state.gigs.forEach(g=>{ if (g.dressTypeId && dressMap[g.dressTypeId]!==undefined) dressMap[g.dressTypeId]++; });
  const dressLabels = state.dressTypes.map(d=>d.name);
  const dressData = state.dressTypes.map(d=>dressMap[d.id]||0);
  // month
  const monthMap = {};
  state.gigs.forEach(g=>{ const m=g.date.slice(0,7); monthMap[m]=(monthMap[m]||0)+1; });
  const monthLabels = Object.keys(monthMap).sort();
  const monthData = monthLabels.map(m=>monthMap[m]);

  if (chartIncome) chartIncome.destroy();
  if (chartDress) chartDress.destroy();
  if (chartMonth) chartMonth.destroy();
  const ctx1 = document.getElementById('chart-income');
  if (ctx1) chartIncome = new Chart(ctx1, { type:'doughnut', data:{ labels: incomeLabels.length?incomeLabels:['لا بيانات'], datasets:[{ data: incomeData.length?incomeData:[1], backgroundColor: palette(incomeLabels.length||1) }] }, options:{ plugins:{ legend:{ position:'bottom' } } } });
  const ctx2 = document.getElementById('chart-dress');
  if (ctx2) chartDress = new Chart(ctx2, { type:'doughnut', data:{ labels: dressLabels.length?dressLabels:['لا بيانات'], datasets:[{ data: dressData.length?dressData:[1], backgroundColor: palette(dressLabels.length||1) }] }, options:{ plugins:{ legend:{ position:'bottom' } } } });
  const ctx3 = document.getElementById('chart-month');
  if (ctx3) chartMonth = new Chart(ctx3, { type:'bar', data:{ labels: monthLabels.length?monthLabels:['لا بيانات'], datasets:[{ label:'حفلات', data: monthData.length?monthData:[0], backgroundColor:'#7B1F3A' }] }, options:{ plugins:{ legend:{ display:false } }, scales:{ y:{ beginAtZero:true } } } });

  // recent gigs
  const recent = [...state.gigs].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
  const tbody = document.getElementById('recent-tbody');
  if (tbody) tbody.innerHTML = recent.map(g=>`<tr><td>${g.name}</td><td>${g.date}</td><td>${g.location||''}</td><td>${dressName(g.dressTypeId)}</td><td>${fmtMoney(g.price)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">لا توجد حفلات</td></tr>';
}
function palette(n) {
  const base = ['#7B1F3A','#C9A227','#2A9D8F','#E07A5F','#8AB17D','#B5838D','#6D8B74','#D4A373'];
  const out=[]; for(let i=0;i<n;i++) out.push(base[i%base.length]); return out;
}

// Gigs
function renderGigs() {
  const q = (document.getElementById('gig-search')?.value||'').toLowerCase();
  const status = document.getElementById('gig-filter')?.value||'الكل';
  let gigs = [...state.gigs];
  if (q) gigs = gigs.filter(g=> (g.name||'').toLowerCase().includes(q) || (g.location||'').toLowerCase().includes(q));
  if (status==='قادمة') gigs = gigs.filter(g=>g.date>=today());
  if (status==='مكتملة') gigs = gigs.filter(g=>g.date<today());
  gigs.sort((a,b)=>b.date.localeCompare(a.date));
  const tbody = document.getElementById('gigs-tbody');
  if (!tbody) return;
  tbody.innerHTML = gigs.map(g=>{
    const fees = (g.musicians||[]).reduce((a,x)=>a+(Number(x.fee)||0),0);
    return `<tr>
      <td>${g.name}</td><td>${g.date}</td><td>${g.start||''} - ${g.end||''}</td><td>${g.location||''}</td><td>${dressName(g.dressTypeId)}</td><td>${fmtMoney(g.price)}</td><td>${fmtMoney(fees)}</td>
      <td>
        <button class="btn btn-secondary" style="padding:6px 10px;font-size:13px" onclick="editGig(${g.id})">تعديل</button>
        <button class="btn btn-danger" style="padding:6px 10px;font-size:13px" onclick="confirmDeleteGig(${g.id})">حذف</button>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="8" class="empty">لا توجد حفلات</td></tr>';
}
function confirmDeleteGig(id) {
  if (confirm('هل تريد حذف هذه الحفلة؟')) { deleteGig(id); renderGigs(); renderDashboard(); }
}
function openGigModal(gig=null) {
  const modal = document.getElementById('gig-modal');
  modal.dataset.editId = gig?gig.id:'';
  document.getElementById('gig-name').value = gig?gig.name:'';
  document.getElementById('gig-date').value = gig?gig.date:today();
  document.getElementById('gig-start').value = gig?gig.start:'18:00';
  document.getElementById('gig-end').value = gig?gig.end:'21:00';
  document.getElementById('gig-location').value = gig?gig.location:'';
  document.getElementById('gig-dress').innerHTML = '<option value="">— غير محدد —</option>' + state.dressTypes.map(d=>`<option value="${d.id}" ${gig&&gig.dressTypeId===d.id?'selected':''}>${d.name}</option>`).join('');
  document.getElementById('gig-price').value = gig?gig.price:0;
  document.getElementById('gig-notes').value = gig?gig.notes:'';
  // musicians
  const list = document.getElementById('gig-musicians-list');
  const assigned = gig?gig.musicians:[];
  list.innerHTML = state.musicians.map(m=>{
    const a = assigned.find(x=>x.musicianId===m.id);
    return `<label style="display:flex;align-items:center;gap:8px;padding:6px 0">
      <input type="checkbox" data-mid="${m.id}" ${a?'checked':''} onchange="toggleGigMus(this)">
      <span style="flex:1">${m.name} (${instrName(m.instrumentId)})</span>
      <input type="number" data-fee="${m.id}" value="${a?a.fee:0}" step="0.01" style="width:100px" ${a?'':'disabled'}>
    </label>`;
  }).join('') || '<div class="empty">لا يوجد عازفون. أضف من شاشة العازفين.</div>';
  modal.classList.add('show');
}
function toggleGigMus(cb) {
  const fee = document.querySelector(`input[data-fee="${cb.dataset.mid}"]`);
  if (fee) fee.disabled = !cb.checked;
}
function closeGigModal() { document.getElementById('gig-modal').classList.remove('show'); }
function saveGig() {
  const name = document.getElementById('gig-name').value.trim();
  if (!name) { toast('اسم الحفلة مطلوب'); return; }
  const musicians = [];
  document.querySelectorAll('#gig-musicians-list input[type="checkbox"]').forEach(cb=>{
    if (cb.checked) {
      const mid = Number(cb.dataset.mid);
      const fee = Number(document.querySelector(`input[data-fee="${mid}"]`).value)||0;
      musicians.push({musicianId: mid, fee});
    }
  });
  const data = {
    name,
    date: document.getElementById('gig-date').value,
    start: document.getElementById('gig-start').value,
    end: document.getElementById('gig-end').value,
    location: document.getElementById('gig-location').value.trim(),
    dressTypeId: Number(document.getElementById('gig-dress').value)||null,
    price: Number(document.getElementById('gig-price').value)||0,
    notes: document.getElementById('gig-notes').value.trim(),
    musicians
  };
  const editId = document.getElementById('gig-modal').dataset.editId;
  if (editId) { updateGig(Number(editId), data); } else { addGig(data); }
  closeGigModal(); renderGigs(); renderDashboard();
}
function editGig(id) {
  const g = state.gigs.find(x=>x.id===id);
  if (g) openGigModal(g);
}

// Musicians
function renderMusicians() {
  const q = (document.getElementById('mus-search')?.value||'').toLowerCase();
  let ms = state.musicians;
  if (q) ms = ms.filter(m=> (m.name||'').toLowerCase().includes(q) || instrName(m.instrumentId).toLowerCase().includes(q));
  const container = document.getElementById('musicians-list');
  if (!container) return;
  container.innerHTML = ms.map(m=>{
    const total = state.gigs.reduce((a,g)=> a + (g.musicians||[]).filter(x=>x.musicianId===m.id).reduce((b,x)=>b+(Number(x.fee)||0),0), 0);
    const count = state.gigs.filter(g=>(g.musicians||[]).some(x=>x.musicianId===m.id)).length;
    return `<div class="list-item">
      <div>
        <div class="title">${m.name}</div>
        <div class="sub">${instrName(m.instrumentId)} · ${count} حفلة · ${fmtMoney(total)}</div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-secondary" style="padding:6px 10px;font-size:13px" onclick="openMusicianDetail(${m.id})">عرض</button>
        <button class="btn btn-secondary" style="padding:6px 10px;font-size:13px" onclick="editMusician(${m.id})">تعديل</button>
        <button class="btn btn-danger" style="padding:6px 10px;font-size:13px" onclick="confirmDeleteMusician(${m.id})">حذف</button>
      </div>
    </div>`;
  }).join('') || '<div class="empty">لا يوجد عازفون</div>';
}
function confirmDeleteMusician(id) {
  if (confirm('هل تريد حذف هذا العازف؟')) { deleteMusician(id); renderMusicians(); renderDashboard(); }
}
function openMusicianModal(m=null) {
  const modal = document.getElementById('musician-modal');
  modal.dataset.editId = m?m.id:'';
  document.getElementById('mus-name').value = m?m.name:'';
  document.getElementById('mus-instrument').innerHTML = '<option value="">— اختر آلة —</option>' + state.instruments.map(i=>`<option value="${i.id}" ${m&&m.instrumentId===i.id?'selected':''}>${i.name}</option>`).join('');
  document.getElementById('mus-phone').value = m?m.phone||'':'';
  document.getElementById('mus-notes').value = m?m.notes||'':'';
  modal.classList.add('show');
}
function closeMusicianModal() { document.getElementById('musician-modal').classList.remove('show'); }
function saveMusician() {
  const name = document.getElementById('mus-name').value.trim();
  if (!name) { toast('الاسم مطلوب'); return; }
  const data = {
    name,
    instrumentId: Number(document.getElementById('mus-instrument').value)||null,
    phone: document.getElementById('mus-phone').value.trim()||null,
    notes: document.getElementById('mus-notes').value.trim()||null
  };
  const editId = document.getElementById('musician-modal').dataset.editId;
  if (editId) { updateMusician(Number(editId), data); } else { addMusician(data); }
  closeMusicianModal(); renderMusicians(); renderDashboard();
}
function editMusician(id) {
  const m = state.musicians.find(x=>x.id===id);
  if (m) openMusicianModal(m);
}

// Musician detail
function openMusicianDetail(id) {
  const m = state.musicians.find(x=>x.id===id);
  if (!m) return;
  navigate('musicianDetail');
  const gigs = state.gigs.filter(g=>(g.musicians||[]).some(x=>x.musicianId===m.id)).map(g=>{
    const gm = g.musicians.find(x=>x.musicianId===m.id);
    return { gig: g, fee: gm?gm.fee:0 };
  });
  const total = gigs.reduce((a,x)=>a+(Number(x.fee)||0),0);
  const avg = gigs.length? total/gigs.length : 0;
  const container = document.getElementById('musician-detail-content');
  container.innerHTML = `
    <div class="card">
      <div class="section-title">${m.name}</div>
      <div style="color:var(--muted)">الآلة: ${instrName(m.instrumentId)} · الهاتف: ${m.phone||'—'}</div>
      ${m.notes?`<div style="margin-top:6px">${m.notes}</div>`:''}
    </div>
    <div class="stat-grid">
      <div class="stat"><div class="label">عدد الحفلات</div><div class="value">${gigs.length}</div></div>
      <div class="stat"><div class="label">إجمالي الدخل</div><div class="value">${fmtMoney(total)}</div></div>
      <div class="stat"><div class="label">متوسط الأجر</div><div class="value">${fmtMoney(avg)}</div></div>
    </div>
    <div class="card">
      <div class="section-title">جميع الحفلات</div>
      <table><thead><tr><th>التاريخ</th><th>المكان</th><th>نوع اللباس</th><th>الأجر</th></tr></thead>
      <tbody>${gigs.map(x=>`<tr><td>${x.gig.date}</td><td>${x.gig.location||''}</td><td>${dressName(x.gig.dressTypeId)}</td><td>${fmtMoney(x.fee)}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">لا توجد حفلات</td></tr>'}</tbody></table>
    </div>
    <button class="btn btn-secondary btn-block" onclick="navigate('musicians')" style="margin-top:8px">← رجوع</button>
  `;
}

// Settings
function renderSettings() {
  const instList = document.getElementById('inst-list');
  if (instList) instList.innerHTML = state.instruments.map(i=>`
    <div class="list-item">
      <div class="title">${i.name}</div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-secondary" style="padding:6px 10px;font-size:13px" onclick="editInstrument(${i.id})">تعديل</button>
        <button class="btn btn-danger" style="padding:6px 10px;font-size:13px" onclick="confirmDeleteInstrument(${i.id})">حذف</button>
      </div>
    </div>`).join('') || '<div class="empty">لا توجد آلات</div>';
  const dressList = document.getElementById('dress-list');
  if (dressList) dressList.innerHTML = state.dressTypes.map(d=>`
    <div class="list-item">
      <div class="title">${d.name}</div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-secondary" style="padding:6px 10px;font-size:13px" onclick="editDress(${d.id})">تعديل</button>
        <button class="btn btn-danger" style="padding:6px 10px;font-size:13px" onclick="confirmDeleteDress(${d.id})">حذف</button>
      </div>
    </div>`).join('') || '<div class="empty">لا توجد أنواع</div>';
}
function confirmDeleteInstrument(id){ if(confirm('هل تريد الحذف؟')){ deleteInstrument(id); } }
function confirmDeleteDress(id){ if(confirm('هل تريد الحذف؟')){ deleteDressType(id); } }
function editInstrument(id) {
  const i = state.instruments.find(x=>x.id===id);
  const name = prompt('اسم الآلة:', i?i.name:'');
  if (name && name.trim()) { i.name = name.trim(); saveState(); renderSettings(); toast('تم التحديث'); }
}
function editDress(id) {
  const d = state.dressTypes.find(x=>x.id===id);
  const name = prompt('اسم نوع اللباس:', d?d.name:'');
  if (name && name.trim()) { d.name = name.trim(); saveState(); renderSettings(); toast('تم التحديث'); }
}
function addInstrumentPrompt() {
  const name = prompt('اسم آلة جديدة:');
  if (name && name.trim()) addInstrument(name.trim());
  renderSettings();
}
function addDressPrompt() {
  const name = prompt('اسم نوع لباس جديد:');
  if (name && name.trim()) addDressType(name.trim());
  renderSettings();
}

// Notes
function renderNotes() {
  const filter = document.getElementById('notes-filter')?.value||'الكل';
  const scopeKey = {'الكل':null,'عامة':'general','حفلة':'gig','عازف':'musician'}[filter];
  let ns = state.notes;
  if (scopeKey) ns = ns.filter(n=>n.scope===scopeKey);
  const container = document.getElementById('notes-list');
  if (!container) return;
  container.innerHTML = ns.map(n=>`
    <div class="list-item" style="flex-direction:column;align-items:stretch">
      <div style="display:flex;justify-content:space-between">
        <div class="title">${n.title||('['+n.scope+']')}</div>
        <button class="btn btn-danger" style="padding:4px 8px;font-size:12px" onclick="deleteNote(${n.id})">حذف</button>
      </div>
      <div class="sub" style="margin-top:4px">${n.content}</div>
      <div class="sub" style="margin-top:2px;font-size:11px">${n.createdAt}</div>
    </div>`).join('') || '<div class="empty">لا توجد ملاحظات</div>';
}
function deleteNote(id) {
  if (!confirm('هل تريد حذف هذه الملاحظة؟')) return;
  state.notes = state.notes.filter(n=>n.id!==id); saveState(); renderNotes(); toast('تم الحذف');
}
function addNoteForm() {
  const scopeSel = document.getElementById('note-scope').value;
  const scope = {'عامة':'general','حفلة':'gig','عازف':'musician'}[scopeSel];
  const ref = document.getElementById('note-ref').value.trim();
  const refId = ref && /^\d+$/.test(ref) ? Number(ref) : null;
  if (scope!=='general' && refId===null) { toast('أدخل معرّف الحفلة/العازف'); return; }
  const content = document.getElementById('note-content').value.trim();
  if (!content) { toast('المحتوى مطلوب'); return; }
  addNote({ scope, refId, title: document.getElementById('note-title').value.trim(), content });
  document.getElementById('note-content').value='';
  document.getElementById('note-title').value='';
  renderNotes();
}

// Export
function exportMusicianPDF(id) {
  const m = state.musicians.find(x=>x.id===id);
  const gigs = state.gigs.filter(g=>(g.musicians||[]).some(x=>x.musicianId===m.id)).map(g=>{
    const gm = g.musicians.find(x=>x.musicianId===m.id); return {gig:g, fee: gm?gm.fee:0};
  });
  const total = gigs.reduce((a,x)=>a+(Number(x.fee)||0),0);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text('تفاصيل', 105, 15, {align:'center'});
  doc.text('تقرير العازف', 105, 25, {align:'center'});
  let y=40;
  doc.text('الاسم: '+m.name, 10, y); y+=8;
  doc.text('الآلة: '+(instrName(m.instrumentId)), 10, y); y+=8;
  doc.text('الهاتف: '+(m.phone||'—'), 10, y); y+=8;
  doc.text('إجمالي الدخل: '+fmtMoney(total), 10, y); y+=8;
  doc.text('عدد الحفلات: '+gigs.length, 10, y); y+=12;
  doc.text('الحفلات', 10, y); y+=8;
  gigs.forEach(x=>{ doc.text(`${x.gig.date} - ${x.gig.location||''} - ${fmtMoney(x.fee)}`, 10, y); y+=7; });
  doc.save(`musician_${id}.pdf`);
}
function exportGigPDF(id) {
  const g = state.gigs.find(x=>x.id===id);
  const fees = (g.musicians||[]).reduce((a,x)=>a+(Number(x.fee)||0),0);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text('تفاصيل', 105, 15, {align:'center'});
  doc.text('تقرير الحفلة', 105, 25, {align:'center'});
  let y=40;
  doc.text('اسم الحفلة: '+g.name, 10, y); y+=8;
  doc.text('التاريخ: '+g.date, 10, y); y+=8;
  doc.text('المكان: '+(g.location||'—'), 10, y); y+=8;
  doc.text('نوع اللباس: '+dressName(g.dressTypeId), 10, y); y+=8;
  doc.text('سعر الحفلة: '+fmtMoney(g.price), 10, y); y+=8;
  doc.text('إجمالي أجر العازفين: '+fmtMoney(fees), 10, y); y+=8;
  doc.text('الصافي: '+fmtMoney((Number(g.price)||0)-fees), 10, y); y+=12;
  doc.text('العازفون', 10, y); y+=8;
  (g.musicians||[]).forEach(gm=>{ doc.text(`${musicianName(gm.musicianId)} - ${fmtMoney(gm.fee)}`, 10, y); y+=7; });
  doc.save(`gig_${id}.pdf`);
}
function exportMusicianXLSX(id) {
  const m = state.musicians.find(x=>x.id===id);
  const gigs = state.gigs.filter(g=>(g.musicians||[]).some(x=>x.musicianId===m.id)).map(g=>{
    const gm = g.musicians.find(x=>x.musicianId===m.id); return {gig:g, fee: gm?gm.fee:0};
  });
  const total = gigs.reduce((a,x)=>a+(Number(x.fee)||0),0);
  const wb = XLSX.utils.book_new();
  const rows = [['تفاصيل - تقرير العازف']];
  rows.push(['الاسم', m.name]);
  rows.push(['الآلة', instrName(m.instrumentId)]);
  rows.push(['الهاتف', m.phone||'']);
  rows.push(['إجمالي الدخل', total]);
  rows.push(['عدد الحفلات', gigs.length]);
  rows.push([]);
  rows.push(['التاريخ','المكان','نوع اللباس','الأجر']);
  gigs.forEach(x=>rows.push([x.gig.date, x.gig.location||'', dressName(x.gig.dressTypeId), x.fee||0]));
  rows.push([]);
  rows.push(['الإجمالي', total]);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!dir'] = 'rtl';
  XLSX.utils.book_append_sheet(wb, ws, 'العازف');
  XLSX.writeFile(wb, `musician_${id}.xlsx`);
}
function exportGigXLSX(id) {
  const g = state.gigs.find(x=>x.id===id);
  const fees = (g.musicians||[]).reduce((a,x)=>a+(Number(x.fee)||0),0);
  const wb = XLSX.utils.book_new();
  const rows = [['تفاصيل - تقرير الحفلة']];
  rows.push(['اسم الحفلة', g.name]);
  rows.push(['التاريخ', g.date]);
  rows.push(['الوقت', `${g.start||''} - ${g.end||''}`]);
  rows.push(['المكان', g.location||'']);
  rows.push(['نوع اللباس', dressName(g.dressTypeId)]);
  rows.push(['سعر الحفلة', g.price||0]);
  rows.push(['إجمالي أجر العازفين', fees]);
  rows.push([]);
  rows.push(['العازف','الآلة','الأجر']);
  (g.musicians||[]).forEach(gm=>rows.push([musicianName(gm.musicianId), instrName(state.musicians.find(m=>m.id===gm.musicianId)?.instrumentId), gm.fee||0]));
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!dir'] = 'rtl';
  XLSX.utils.book_append_sheet(wb, ws, 'الحفلة');
  XLSX.writeFile(wb, `gig_${id}.xlsx`);
}

// Toast
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2200);
}

// Init
loadState();
window.addEventListener('DOMContentLoaded', () => {
  navigate('dashboard');
  // register SW
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
});
