'use strict';
/* ================= yardımcılar ================= */
const pad = n => String(n).padStart(2, '0');
const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => toISO(new Date());
const parseISO = s => new Date(s + 'T12:00:00');
const addDays = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return toISO(d); };
const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 864e5);
const weekdayOf = s => parseISO(s).getDay();
const fmtLong = s => parseISO(s).toLocaleDateString(LOCALE(), { weekday: 'long', day: 'numeric', month: 'long' });
const fmtDate = s => parseISO(s).toLocaleDateString(LOCALE(), { day: 'numeric', month: 'long', year: 'numeric' });
const fmtMonth = ym => parseISO(ym + '-01').toLocaleDateString(LOCALE(), { month: 'long', year: 'numeric' });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const allProducts = () => PRODUCTS.map(p => ({ ...p, ...(state.productEdits[p.id] || {}) })).concat(state.customProducts || []);
const byId = id => allProducts().find(p => p.id === id);
const uid = pre => pre + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const nightsText = arr => arr.length ? [...arr].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(d => wd(d)).join(', ') : tx('seçilmedi');
const THEME_DEFAULT = { accent: '#70702E', secondary: '#D3A6A3', neutral: '#C7BEB3', bg: '#FFF6FC' };
const THEME_MODES = [['light', 'Açık'], ['dark', 'Koyu'], ['system', 'Sistem']];
const THEME_LABELS = {
  accent:    ['Ana renk',    'Butonlar, tikler, rozetler, seçili gün'],
  secondary: ['Vurgu rengi', 'Retinal gecesi kartı, bilgi kartları, kısmen tamamlanan günler'],
  neutral:   ['Nötr',        'Çizgiler, ayraçlar, soluk metin'],
  bg:        ['Zemin',       'Sayfa arka planı'],
};

/* ================= durum (localStorage) ================= */
const KEY = 'skincare-v1';
const LEGACY_KEY = 'rutin-takip-v1';
function defaultState() {
  return {
    version: 1,
    settings: {
      retinalStartDate: DEFAULT_RETINAL_START,
      f2StartDate: null, f3StartDate: null,
      f2DeferUntil: null, f3DeferUntil: null,
      retinalNights: [1, 4],
      salicylicNight: 0,
      salicylicReenabled: false,
      firstUse: todayStr(),
      lang: 'tr',
      appName: '',
    },
    products: {},          // id -> { status }
    logs: {},              // 'YYYY-MM-DD' -> DayLog
    checks: { derm: [], shopping: [] },
    theme: { ...THEME_DEFAULT, mode: 'light' },
    routineEdits: {},      // key -> { order, hidden, overrides, custom }
    customProducts: [],
    customShopping: [],
    removedShopping: [],
    notes: null,           // ilk açılışta DEFAULT_NOTES ile doldurulur
    productEdits: {},      // temel ürün id -> {name, role, note, group, order, reason, img}
    productImages: {},     // görsel anahtarı -> data URL
    stepImages: {},        // adım id -> data URL
    shoppingEdits: {},     // temel alışveriş id -> {name, where, price}
  };
}
function load() {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY);
    if (raw) {
      const s = JSON.parse(raw), d = defaultState();
      return { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}) }, checks: { ...d.checks, ...(s.checks || {}) }, theme: { ...d.theme, ...(s.theme || {}) } };
    }
  } catch (e) { /* bozuk veri → varsayılan */ }
  return defaultState();
}
let state = load();
if (state.ginzing) { for (const p of PRODUCTS) if (p.status === 'conditional' && state.products[p.id] && !state.products[p.id].decision) state.products[p.id].decision = state.ginzing; }
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* yer yok */ } }
const HEX = /^#[0-9a-f]{6}$/i;
function applyTheme() {
  const root = document.documentElement.style;
  for (const k of Object.keys(THEME_DEFAULT)) {
    const v = HEX.test(state.theme[k] || '') ? state.theme[k] : THEME_DEFAULT[k];
    root.setProperty(`--c-${k}`, v);
  }
  const mode = state.theme.mode || 'light';
  if (mode === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', mode);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = (state.theme.mode === 'dark') ? '#1c1a17' : (state.theme.accent || THEME_DEFAULT.accent);
}

const ui = {
  view: 'today',
  period: new Date().getHours() < 12 ? 'am' : 'pm',
  logDate: todayStr(),
  calMonth: todayStr().slice(0, 7),
  calSel: null,
  refTab: 'notes',
  editToday: false,
  showGone: false,
  filterText: '',
  filterRun: false,
  areaActive: 'ret',
  showFinished: false,
};

/* ================= faz mantığı ================= */
function phaseFor(d) {
  const s = state.settings;
  if (!s.retinalStartDate || d < s.retinalStartDate) return 'EYLUL';
  if (s.f3StartDate && d >= s.f3StartDate) return 'EKIM_F3';
  if (s.f2StartDate && d >= s.f2StartDate) return 'EKIM_F2';
  return 'EKIM_F1';
}
const phase = () => phaseFor(todayStr());
function phaseStart(p) {
  const s = state.settings;
  return p === 'EKIM_F1' ? s.retinalStartDate : p === 'EKIM_F2' ? s.f2StartDate : p === 'EKIM_F3' ? s.f3StartDate : null;
}
function phaseDay(p, d = todayStr()) { const st = phaseStart(p); return st ? daysBetween(st, d) + 1 : null; }
function pendingTransition() {
  const s = state.settings, t = todayStr(), p = phase();
  if (p === 'EKIM_F1' && daysBetween(s.retinalStartDate, t) >= 28 && !(s.f2DeferUntil && t < s.f2DeferUntil)) return 'EKIM_F2';
  if (p === 'EKIM_F2' && daysBetween(s.f2StartDate, t) >= 28 && !(s.f3DeferUntil && t < s.f3DeferUntil)) return 'EKIM_F3';
  return null;
}
function inPatchTest(d) { const f2 = state.settings.f2StartDate; return !!f2 && d >= f2 && d < addDays(f2, 4); }
function phaseLabel(p = phase()) {
  const s = state.settings;
  if (p === 'EYLUL') {
    const g = tx(PHASE_GROUP_LABEL.EYLUL);
    if (!s.retinalStartDate) return `${g} ${tx('fazı')} · ${tx('retinal başlangıcı belirlenmedi')}`;
    const n = daysBetween(todayStr(), s.retinalStartDate);
    return lang() === 'en' ? `${g} phase · ${n} days to retinal` : `${g} fazı · retinale ${n} gün`;
  }
  return lang() === 'en' ? `${tx(PHASES[p].label)} · day ${phaseDay(p)}` : `${PHASES[p].label} · ${phaseDay(p)}. gün`;
}

/* ================= ürün rotasyonu ================= */
const pStatus = p => (state.products[p.id] && state.products[p.id].status) || p.status;
const isGone = p => ['finished', 'removed'].includes(pStatus(p));
const groupList = (g, st) => allProducts().filter(p => p.group === g && pStatus(p) === st).sort((a, b) => a.order - b.order);
const activeOf = g => groupList(g, 'active')[0] || null;
const nextOf = g => groupList(g, 'queued')[0] || null;
function dropProduct(id, status) {
  const p = byId(id);
  state.products[id] = { status };
  let msg = status === 'finished' ? `${p.name} ${tx('bitti, listeden kaldırıldı')}` : `${p.name} ${tx('kaldırıldı')}`;
  if (p.group && !activeOf(p.group)) {
    const nx = nextOf(p.group);
    if (nx) { state.products[nx.id] = { status: 'active' }; msg += ` · ${nx.name} ${tx('aktif oldu')}`; }
  }
  save(); toast(msg);
}
function restoreProduct(id) {
  const p = byId(id);
  delete state.products[id];
  if (p.group) {
    allProducts().filter(q => q.group === p.group && q.id !== id && q.status === 'queued' && pStatus(q) === 'active')
      .forEach(q => { delete state.products[q.id]; });
  }
  save(); toast(`${p.name} ${tx('geri alındı')}`);
}
function addProduct(f) {
  const group = f.group || null;
  const order = group ? Math.max(0, ...allProducts().filter(p => p.group === group).map(p => p.order || 0)) + 1 : undefined;
  const status = group && activeOf(group) ? 'queued' : 'active';
  const id = uid('p_');
  state.customProducts.push({ id, name: f.name, role: f.role || '', note: f.note || '', status, group, order, custom: true, img: id });
  if (f.image) state.productImages[id] = f.image;
  save(); toast(`${f.name} ${tx('eklendi')}`);
}
function setProductStatus(id, status) {
  const p = byId(id); if (!p) return;
  const was = pStatus(p);
  if (status === 'active' && p.group) {
    allProducts().filter(q => q.group === p.group && q.id !== id && pStatus(q) === 'active').forEach(q => { state.products[q.id] = { status: 'queued' }; });
  }
  state.products[id] = { ...(state.products[id] || {}), status };
  if (was === 'active' && status !== 'active' && p.group && !activeOf(p.group)) {
    const nx = nextOf(p.group); if (nx) state.products[nx.id] = { status: 'active' };
  }
  save();
}
function productToToday(id, period) {
  const p = byId(id); if (!p) return;
  const key = routineKey(todayStr(), period), ed = editsForWrite(key);
  const sid = uid('c_');
  ed.custom.push({ id: sid, name: p.name, note: p.note || '', img: p.img || p.id });
  if (ed.order) ed.order.push(sid);
  save(); toast(tx('Bugün listesine eklendi'));
}
const allShopping = () => SHOPPING.filter(s => !state.removedShopping.includes(s.id)).map(s => ({ ...s, ...(state.shoppingEdits[s.id] || {}) })).concat(state.customShopping);

/* ================= günlük adımlar ================= */
const COND_TEXT = { salicylic: 'Sadece salisilik gecesi', salicylic_reenabled: 'Salisilik gecesi (geri açılınca)', f2plus: "F2'den itibaren", retinal: 'Sadece retinal gecelerinde' };
const routineKey = (d, period) => (phaseFor(d) === 'EYLUL' ? 'EYLUL' : 'EKIM') + '_' + period;
const EMPTY_EDITS = () => ({ order: null, hidden: [], overrides: {}, custom: [] });
const editsFor = key => state.routineEdits[key] || EMPTY_EDITS();
function editsForWrite(key) { if (!state.routineEdits[key]) state.routineEdits[key] = EMPTY_EDITS(); return state.routineEdits[key]; }
function decorate(st, d, period, p) {
  const step = { ...st, badges: (st.badges || []).filter(b => !BADGES[b].onlyPhase || BADGES[b].onlyPhase === p) };
  if (st.dynamic === 'moist') {
    const a = activeOf('moist');
    step.name = a ? a.name : tx('Yüz nemlendiricisi');
    step.note = a ? `${tx('Yüz nemlendiricisi · rotasyon')} ${a.order}` : tx('Rotasyonda aktif ürün yok — Envanter');
    step.img = a ? a.img : null;
  }
  if (st.dynamic === 'eye') {
    const a = activeOf('eye'), nx = nextOf('eye');
    const an = a ? a.name : tx('aktif ürün yok');
    step.note = period === 'am' ? (an + (nx ? ` → ${tx('bitince')} ${nx.name}` : '')) : `${tx('Sabahkiyle aynı')} · ${an}`;
    step.img = a ? a.img : null;
  }
  if (st.patchNote && inPatchTest(d)) step.note = st.patchNote;
  return step;
}
function applyEdits(list, key) {
  const ed = editsFor(key);
  let out = list.concat(ed.custom.map(c => ({ ...c, custom: true, badges: [] })));
  out = out.map(s => { const o = ed.overrides[s.id]; return o ? { ...s, name: o.name ? o.name : s.name, note: o.note != null ? o.note : s.note } : s; });
  if (ed.order) {
    const idx = id => { const i = ed.order.indexOf(id); return i < 0 ? 1e6 : i; };
    out = out.map((s, i) => [s, i]).sort((x, y) => (idx(x[0].id) - idx(y[0].id)) || (x[1] - y[1])).map(x => x[0]);
  }
  return out;
}
function stepsFor(d, period) {
  const p = phaseFor(d), wd = weekdayOf(d), s = state.settings, key = routineKey(d, period);
  const base = p === 'EYLUL' ? ROUTINES.EYLUL[period] : ROUTINES.EKIM[period];
  const salTonight = s.salicylicNight !== null && s.salicylicNight === wd;
  const out = [];
  for (const st of base) {
    if (st.when === 'salicylic' && !salTonight) continue;
    if (st.when === 'salicylic_reenabled' && !(s.salicylicReenabled && salTonight)) continue;
    if (st.when === 'f2plus' && p === 'EKIM_F1') continue;
    if (st.when === 'retinal' && !s.retinalNights.includes(wd)) continue;
    out.push(decorate(st, d, period, p));
  }
  const hidden = editsFor(key).hidden;
  return applyEdits(out, key).filter(x => !hidden.includes(x.id) && !(x.custom && !String(x.name || '').trim()));
}
function stepsForEdit(d, period) {
  const p = phaseFor(d), key = routineKey(d, period), hidden = editsFor(key).hidden;
  const base = p === 'EYLUL' ? ROUTINES.EYLUL[period] : ROUTINES.EKIM[period];
  const list = base.map(st => { const x = decorate(st, d, period, p); x.cond = tx(COND_TEXT[st.when] || ''); return x; });
  return applyEdits(list, key).map(x => ({ ...x, hidden: hidden.includes(x.id) }));
}

/* ================= günlük kayıt ================= */
const emptyLog = () => ({ am: [], pm: [], retinalUsed: false, redness: null, pimples: null, stinging: null, note: '' });
const peekLog = d => state.logs[d] || null;
function getLog(d) { if (!state.logs[d]) state.logs[d] = emptyLog(); return state.logs[d]; }
function toggleStep(d, period, id) {
  const log = getLog(d), arr = log[period], i = arr.indexOf(id);
  if (i >= 0) arr.splice(i, 1); else arr.push(id);
  if (id === 'o_pm_retinal') log.retinalUsed = arr.includes(id);
  save();
}
function dayStatus(d) {
  const log = peekLog(d), am = stepsFor(d, 'am'), pm = stepsFor(d, 'pm');
  const doneAm = am.filter(s => log && log.am.includes(s.id)).length;
  const donePm = pm.filter(s => log && log.pm.includes(s.id)).length;
  return {
    am: am.length, pm: pm.length, doneAm, donePm,
    full: (am.length + pm.length) > 0 && doneAm === am.length && donePm === pm.length,
    any: doneAm + donePm > 0,
    retinal: !!(log && log.retinalUsed),
  };
}
function stingingStreak() {
  const t = todayStr();
  const has = d => { const l = peekLog(d); return !!(l && l.stinging === true); };
  const run = end => has(end) && has(addDays(end, -1)) && has(addDays(end, -2));
  const todayLog = peekLog(t);
  const todayCleared = !!(todayLog && todayLog.stinging === false);
  return run(t) || (!todayCleared && run(addDays(t, -1)));
}

/* ================= render ================= */
const NAV_LABELS = { today: 'Bugün', log: 'Günlük', inventory: 'Envanter', calendar: 'Takvim', reference: 'Referans' };
function appName() { return (state.settings.appName || '').trim() || 'Skincare'; }
function render() {
  document.getElementById('hdr-title').textContent = appName();
  document.title = appName();
  document.getElementById('hdr-sub').textContent = `${fmtLong(todayStr())} · ${phaseLabel()}`;
  const views = { today: renderToday, log: renderLog, inventory: renderInventory, calendar: renderCalendar, reference: renderReference, settings: renderSettings };
  const view = document.getElementById('view');
  view.innerHTML = views[ui.view]();
  translateDOM(view);
  document.querySelectorAll('#nav button').forEach(b => { b.classList.toggle('active', b.dataset.view === ui.view); const sp = b.querySelector('span'); if (sp) sp.textContent = tx(NAV_LABELS[b.dataset.view]); });
  const gear = document.querySelector('.icon-btn[data-view="settings"]'); if (gear) { gear.setAttribute('aria-label', tx('Ayarlar')); gear.setAttribute('title', tx('Ayarlar')); }
  document.documentElement.lang = lang();
}

const WATER_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></svg>';
function imgSrc(key, stepId) {
  if (stepId && state.stepImages[stepId]) return state.stepImages[stepId];
  if (key && state.productImages[key]) return state.productImages[key];
  return key && IMAGES[key] ? IMAGES[key] : null;
}
function thumb(key, cls = 'thumb', stepId) {
  const src = imgSrc(key, stepId);
  return src ? `<span class="${cls}"><img src="${src}" alt="" loading="lazy"></span>` : `<span class="${cls} empty">${WATER_ICON}</span>`;
}
function readImageFile(file, max = 320) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const im = new Image();
      im.onload = () => {
        const sc = Math.min(1, max / Math.max(im.width, im.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(im.width * sc)); c.height = Math.max(1, Math.round(im.height * sc));
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', 0.82));
      };
      im.onerror = rej; im.src = r.result;
    };
    r.onerror = rej; r.readAsDataURL(file);
  });
}
function stepRow(s, i, done, period) {
  const badges = s.badges.length
    ? `<span class="badges">${s.badges.map(b => `<button class="badge" data-action="badge" data-b="${b}" aria-label="${esc(tx(BADGES[b].label))}">${esc(tx(BADGES[b].label))}</button>`).join('')}</span>` : '';
  return `<li class="step ${done ? 'done' : ''}" role="checkbox" aria-checked="${done}" tabindex="0" data-action="toggle" data-id="${s.id}" data-period="${period}">
    <span class="check" aria-hidden="true"></span>
    ${thumb(s.img, 'thumb', s.id)}
    <span class="step-text"><span class="name"><span class="num">${i + 1}</span>${esc(tx(s.name))}</span>${s.note ? `<span class="note">${esc(tx(s.note))}</span>` : ''}${badges}</span>
  </li>`;
}

function editRow(s, i, n, key) {
  return `<li class="step edit ${s.hidden ? 'is-hidden' : ''}"><label class="thumb pick" title="Fotoğraf seç">${imgSrc(s.img, s.id) ? `<img src="${imgSrc(s.img, s.id)}" alt="">` : WATER_ICON}<input type="file" accept="image/*" data-action="step-image" data-id="${s.id}" hidden></label><div class="step-text">
    <input class="edit-in" data-action="step-field" data-key="${key}" data-id="${s.id}" data-k="name" value="${esc(s.name)}" placeholder="Ürün / adım adı" aria-label="Adım adı">
    <input class="edit-in sub" data-action="step-field" data-key="${key}" data-id="${s.id}" data-k="note" value="${esc(s.note || '')}" placeholder="Not (uygulama detayı)" aria-label="Not">
    ${s.cond ? `<span class="small muted">${esc(s.cond)}</span>` : ''}${s.hidden ? '<span class="small muted"> · Gizli</span>' : ''}</div>
    <div class="step-tools">
      <button class="tool" data-action="step-move" data-key="${key}" data-id="${s.id}" data-n="-1" ${i === 0 ? 'disabled' : ''} aria-label="Yukarı">▲</button>
      <button class="tool" data-action="step-move" data-key="${key}" data-id="${s.id}" data-n="1" ${i === n - 1 ? 'disabled' : ''} aria-label="Aşağı">▼</button>
      ${s.hidden ? `<button class="tool" data-action="step-unhide" data-key="${key}" data-id="${s.id}" aria-label="Geri ekle">↺</button>` : `<button class="tool del" data-action="step-hide" data-key="${key}" data-id="${s.id}" aria-label="Kaldır">✕</button>`}
      ${state.stepImages[s.id] ? `<button class="tool" data-action="step-image-clear" data-id="${s.id}" aria-label="Fotoğrafı kaldır" title="Fotoğrafı kaldır">🖼✕</button>` : ''}
    </div></li>`;
}
function renderToday() {
  const t = todayStr(), p = phase(), per = ui.period, s = state.settings;
  let h = '';
  const pend = pendingTransition();
  if (pend) h += `<div class="card warn"><p>${esc(tx(TRANSITION_TEXT[pend]))}</p><div class="row">
    <button class="btn primary" data-action="phase-change" data-target="${pend}" data-dir="next">Bir sonraki faza geç</button>
    <button class="btn" data-action="defer-transition" data-target="${pend}">Bir hafta ertele</button></div></div>`;
  if (stingingStreak()) h += `<div class="card danger"><p>${esc(tx(STINGING_WARNING))}</p></div>`;
  h += `<div class="seg"><button class="${per === 'am' ? 'on' : ''}" data-action="period" data-p="am">Sabah</button><button class="${per === 'pm' ? 'on' : ''}" data-action="period" data-p="pm">Akşam</button></div>`;
  if (per === 'pm') {
    if (p !== 'EYLUL') {
      const isR = s.retinalNights.includes(weekdayOf(t));
      h += isR
        ? `<div class="card secondary retinal-card"><div class="big">Retinal gecesi</div><div class="small muted">${tx('Retinal geceleri')}: ${esc(nightsText(s.retinalNights))}</div></div>`
        : `<div class="card retinal-card"><div class="big">Bu gece retinal yok</div><div class="small muted">${tx('Retinal geceleri')}: ${esc(nightsText(s.retinalNights))}</div></div>`;
      if (inPatchTest(t)) h += `<div class="card info"><strong>${tx('Yama testi')} (${lang() === 'en' ? `night ${phaseDay('EKIM_F2')}/4` : `${phaseDay('EKIM_F2')}/4. gece`}):</strong> ${esc(tx(PATCH_TEST_TEXT))}</div>`;
    } else if (s.salicylicNight === weekdayOf(t)) {
      h += `<div class="card info"><strong>Bu gece salisilik asit gecesi.</strong> Sadece burun ve T bölgesi.</div>`;
    }
  }
  const key = routineKey(t, per);
  h += `<div class="list-head"><span class="small muted">${ui.editToday ? 'Düzenleme: ad, not, sıra. Değişiklikler anında kaydedilir.' : tx(PHASE_GROUP_LABEL[p === 'EYLUL' ? 'EYLUL' : 'EKIM']) + ' ' + tx('rutini') + ' · ' + tx(per === 'am' ? 'sabah' : 'akşam')}</span><button class="btn sm ${ui.editToday ? 'primary' : ''}" data-action="edit-today">${ui.editToday ? 'Bitti' : 'Düzenle'}</button></div>`;
  if (ui.editToday) {
    const list = stepsForEdit(t, per);
    h += `<ul class="steps editing">${list.map((st, i) => editRow(st, i, list.length, key)).join('')}</ul>`;
    h += `<div class="row"><button class="btn" data-action="step-add" data-key="${key}">+ Adım ekle</button><button class="btn" data-action="step-reset" data-key="${key}">Varsayılana dön</button></div>`;
  } else {
    const steps = stepsFor(t, per), log = peekLog(t) || emptyLog();
    h += `<ul class="steps">${steps.map((st, i) => stepRow(st, i, log[per].includes(st.id), per)).join('')}</ul>`;
  }
  const ds = dayStatus(t);
  h += `<div class="card summary">
    <div class="stat">${ds.doneAm}/${ds.am}<span>Sabah</span></div>
    <div class="stat">${ds.donePm}/${ds.pm}<span>Akşam</span></div>
    <div class="stat">${ds.full ? 'Tamamlandı' : ds.any ? 'Devam ediyor' : 'Başlanmadı'}<span>Bugün</span></div>
  </div>`;
  return h;
}

function renderLog() {
  const d = ui.logDate, t = todayStr(), log = peekLog(d) || emptyLog();
  const scale = (k, label) => `<div class="field"><label>${label} <span class="muted small">(0-3)</span></label><div class="scale">${[0, 1, 2, 3].map(v =>
    `<button class="${log[k] != null && Math.min(3, log[k]) === v ? 'on' : ''}" data-action="log-set" data-k="${k}" data-v="${v}">${v}</button>`).join('')}</div></div>`;
  let h = `<div class="card datenav"><button class="btn" data-action="log-day" data-n="-1" aria-label="Önceki gün">‹</button><div class="label">${esc(fmtLong(d))}${d === t ? '<div class="small muted">Bugün</div>' : ''}</div><button class="btn" data-action="log-day" data-n="1" ${d >= t ? 'disabled' : ''} aria-label="Sonraki gün">›</button></div>`;
  h += `<div class="card">${scale('redness', 'Kızarıklık')}${scale('pimples', 'Sivilcelenme')}
    <div class="field"><label>Batma / yanma</label><div class="scale">
      <button class="${log.stinging === false ? 'on' : ''}" data-action="log-set" data-k="stinging" data-v="false">Yok</button>
      <button class="${log.stinging === true ? 'on' : ''}" data-action="log-set" data-k="stinging" data-v="true">Var</button></div></div>
    <div class="field"><label>Not</label><textarea data-action="log-note" placeholder="Serbest not">${esc(log.note)}</textarea></div>
    <p class="small muted" style="margin-top:10px">Aynı değere tekrar dokununca seçim kaldırılır.</p></div>`;
  if (d === t && stingingStreak()) h += `<div class="card danger"><p>${esc(tx(STINGING_WARNING))}</p></div>`;
  const ds = dayStatus(d);
  h += `<div class="card small"><strong>${tx('Bu günün rutini:')}</strong> ${tx('Sabah')} ${ds.doneAm}/${ds.am} · ${tx('Akşam')} ${ds.donePm}/${ds.pm} · Retinal: ${tx(ds.retinal ? 'kullanıldı' : 'yok')}</div>`;
  h += `<p class="small muted" style="padding:0 4px">Amaç: dermatolog randevusuna veri götürmek ve retinal toleransını izlemek.</p>`;
  return h;
}

function productCard(p, actions = '') {
  const st = pStatus(p);
  const tag = p.group ? `<span class="tag">${p.group === 'moist' ? tx('rotasyon') + ' ' + p.order : tx('göz')}</span>` : '';
  return `<div class="prod">${thumb(p.img || p.id, 'thumb lg')}<div class="prod-body"><div class="prod-name">${esc(p.name)}${tag}</div>${p.role ? `<div class="prod-role">${esc(tx(p.role))}</div>` : ''}${p.note ? `<div class="prod-note">${esc(tx(p.note))}</div>` : ''}${st === 'giveaway' && p.reason ? `<div class="prod-note">${tx('Elenme sebebi:')} ${esc(tx(state.products[p.id]?.reason || p.reason))}</div>` : ''}${actions ? `<div class="row">${actions}</div>` : ''}</div></div>`;
}

function renderInventory() {
  const P = allProducts();
  const active = P.filter(p => pStatus(p) === 'active');
  const queued = P.filter(p => pStatus(p) === 'queued').sort((x, y) => String(x.group + x.order).localeCompare(String(y.group + y.order)));
  const giveaway = P.filter(p => pStatus(p) === 'giveaway');
  const gone = P.filter(isGone);
  const conditionals = P.filter(p => p.status === 'conditional' && !isGone(p));
  const rotation = groupList('moist', 'active').concat(groupList('moist', 'queued')).map(p => p.name).join(' → ');
  const rm = id => `<button class="btn sm" data-action="prod-edit" data-id="${id}">Düzenle</button><button class="btn sm" data-action="prod-remove" data-id="${id}">Kaldır</button>`;
  const mv = (id, st) => `<button class="btn sm" data-action="prod-status" data-id="${id}" data-s="${st}">${st === 'queued' ? 'Sıraya al' : 'Kullanıma al'}</button>`;
  let h = `<div class="card"><h2>Kullanımda</h2>${active.map(p => productCard(p, `<button class="btn sm primary" data-action="prod-finish" data-id="${p.id}">Bitti</button>${mv(p.id, 'queued')}${rm(p.id)}`)).join('') || '<p class="muted">Aktif ürün yok.</p>'}</div>`;
  h += `<div class="card"><h2>Sırada</h2><p class="small muted">${tx('Nemlendirici rotasyonu')}: ${esc(rotation || '—')}. ${tx('"Bitti" işaretlenince sıradaki otomatik aktif olur.')}</p>${queued.map(p => productCard(p, `${mv(p.id, 'active')}${rm(p.id)}`)).join('') || '<p class="muted">Sırada ürün yok.</p>'}</div>`;
  for (const cp of conditionals) {
    const dec = (state.products[cp.id] || {}).decision;
    h += `<div class="card"><h2>Karar bekliyor</h2>${productCard(cp, `<button class="btn sm" data-action="prod-edit" data-id="${cp.id}">Düzenle</button>`)}`;
    if (!dec) {
      h += `<p class="small">Kutuda şunları ara:</p><div class="inci-chips">${GINZING_CHECK.map(w => `<code>${esc(w)}</code>`).join('')}</div>
      <div class="row"><button class="btn" data-action="ginzing" data-id="${cp.id}" data-v="ok">Hiçbiri yok → kullanılabilir</button><button class="btn" data-action="ginzing" data-id="${cp.id}" data-v="out">Var → elenecek</button></div>`;
    } else {
      h += `<p class="small">${dec === 'ok' ? tx('Karar: kullanılabilir.') + (cp.group ? ' ' + tx('Rotasyona eklendi.') : '') : tx('Karar: elenecek. "Verilecek" listesine taşındı.')}</p><div class="row"><button class="btn sm" data-action="ginzing" data-id="${cp.id}" data-v="reset">Kararı sıfırla</button>${rm(cp.id)}</div>`;
    }
    h += `</div>`;
  }
  if (giveaway.length) h += `<div class="card"><h2>Verilecek / kullanılmayacak</h2>${giveaway.map(p => productCard(p, `${mv(p.id, 'active')}${rm(p.id)}`)).join('')}</div>`;
  h += `<div class="row" style="margin-top:12px"><button class="btn primary" data-action="prod-add">+ Ürün ekle</button>${gone.length ? `<button class="btn" data-action="toggle-gone">${tx('Kaldırılanlar')} (${gone.length}) ${ui.showGone ? '▴' : '▾'}</button>` : ''}</div>`;
  if (ui.showGone && gone.length) h += `<div class="card"><h2>Kaldırılanlar</h2>${gone.map(p => productCard(p, `<button class="btn sm" data-action="prod-restore" data-id="${p.id}">Geri al</button>`)).join('')}</div>`;
  const done = state.checks.shopping, items = allShopping(), total = items.reduce((x, s) => x + (Number(s.price) || 0), 0);
  h += `<div class="card"><h2>${esc(tx(SHOPPING_TITLE))}</h2>${items.map(s => `<div class="check-item ${done.includes(s.id) ? 'done' : ''}" role="checkbox" aria-checked="${done.includes(s.id)}" tabindex="0" data-action="check" data-list="shopping" data-id="${s.id}"><span class="check"></span>${thumb(s.img)}<div class="ci-text">${esc(s.name)}<div class="ci-sub">${esc(s.where || '')}${s.where ? ' · ' : ''}$${s.price}</div></div><span class="ci-x"><button class="tool" data-action="shop-edit" data-id="${s.id}" aria-label="Düzenle">✎</button><button class="tool del" data-action="shop-remove" data-id="${s.id}" aria-label="Listeden çıkar">✕</button></span></div>`).join('') || '<p class="muted">Liste boş.</p>'}
    <div class="total"><span>Toplam</span><span>≈ $${total}</span></div>
    <div class="row"><button class="btn sm" data-action="shop-add">+ Ürün ekle</button></div>
    <p class="small muted" style="margin-top:10px">${esc(tx(SHOPPING_NOTE))}</p></div>`;
  return h;
}
function productModal(p) {
  ui.pendingImage = undefined;
  const cur = p ? imgSrc(p.img || p.id) : null;
  const v = k => esc(p ? (p[k] || '') : '');
  return `<h2>${p ? 'Ürünü düzenle' : 'Ürün ekle'}</h2>
    <div class="img-pick"><span class="thumb lg" id="np-preview">${cur ? `<img src="${cur}" alt="">` : WATER_ICON}</span>
      <div class="row" style="margin:0"><label class="btn sm">Fotoğraf seç<input type="file" accept="image/*" data-action="pick-image" hidden></label><button class="btn sm" data-action="clear-image" ${cur ? '' : 'disabled'}>Fotoğrafı kaldır</button></div></div>
    <div class="field"><label for="np-name">Ürün adı</label><input class="edit-in" id="np-name" value="${v('name')}" placeholder="ör. Nemlendirici krem"></div>
    <div class="field"><label for="np-role">Rol <span class="muted small">(isteğe bağlı)</span></label><input class="edit-in sub" id="np-role" value="${v('role')}" placeholder="ör. Akşam temizleyici"></div>
    <div class="field"><label for="np-note">Not <span class="muted small">(isteğe bağlı)</span></label><input class="edit-in sub" id="np-note" value="${v('note')}" placeholder="Uygulama notu"></div>
    ${p && pStatus(p) === 'giveaway' ? `<div class="field"><label for="np-reason">Elenme sebebi</label><input class="edit-in sub" id="np-reason" value="${v('reason')}"></div>` : ''}
    ${p ? `<div class="field"><label for="np-status">Durum</label><select id="np-status">${[['active', 'Kullanımda'], ['queued', 'Sırada'], ['giveaway', 'Verilecek']].concat(pStatus(p) === 'conditional' ? [['conditional', 'Karar bekliyor']] : []).map(([k, l]) => `<option value="${k}" ${pStatus(p) === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>` : ''}
    <div class="field"><label for="np-group">Rotasyon</label><select id="np-group"><option value="" ${!p || !p.group ? 'selected' : ''}>Yok</option><option value="moist" ${p && p.group === 'moist' ? 'selected' : ''}>Yüz nemlendiricisi rotasyonu</option><option value="eye" ${p && p.group === 'eye' ? 'selected' : ''}>Göz kremi rotasyonu</option></select></div>
    <p class="small muted">Rotasyona eklenen ürün, aktif ürün bitince sırayla devreye girer ve Bugün listesinde adı görünür.</p>
    ${p ? `<div class="field"><label>Bugün listesine ekle</label><div class="row" style="margin:0"><button class="btn sm" data-action="prod-to-today" data-id="${p.id}" data-period="am">Sabaha ekle</button><button class="btn sm" data-action="prod-to-today" data-id="${p.id}" data-period="pm">Akşama ekle</button></div><div class="hint">Mevcut faz grubunun listesine adım olarak eklenir; Bugün → Düzenle ile taşınır veya silinir.</div></div>` : ''}
    <div class="row"><button class="btn primary" data-action="prod-save" ${p ? `data-id="${p.id}"` : ''}>${p ? 'Kaydet' : 'Ekle'}</button><button class="btn" data-action="close-modal">Vazgeç</button></div>`;
}
function saveProductForm(id) {
  const name = document.getElementById('np-name').value.trim();
  if (!name) { toast(tx('Ürün adı gerekli')); return false; }
  const f = { name, role: document.getElementById('np-role').value.trim(), note: document.getElementById('np-note').value.trim(), group: document.getElementById('np-group').value || null };
  const reasonEl = document.getElementById('np-reason'); if (reasonEl) f.reason = reasonEl.value.trim();
  if (!id) { addProduct({ ...f, image: ui.pendingImage || null }); return true; }
  const p = byId(id), key = p.img || p.id;
  if (f.group && f.group !== p.group) f.order = Math.max(0, ...allProducts().filter(q => q.group === f.group).map(q => q.order || 0)) + 1;
  const c = state.customProducts.find(q => q.id === id);
  if (c) Object.assign(c, f); else state.productEdits[id] = { ...(state.productEdits[id] || {}), ...f, img: key };
  const stEl = document.getElementById('np-status');
  if (stEl && stEl.value !== pStatus(p)) setProductStatus(id, stEl.value);
  if (ui.pendingImage === null) delete state.productImages[key];
  else if (typeof ui.pendingImage === 'string') state.productImages[key] = ui.pendingImage;
  save(); toast(tx('Kaydedildi')); return true;
}
function shoppingModal(s) {
  const v = k => esc(s ? (s[k] ?? '') : '');
  return `<h2>${s ? 'Kalemi düzenle' : 'Alışveriş listesine ekle'}</h2>
    <div class="field"><label for="ns-name">Ürün</label><input class="edit-in" id="ns-name" value="${v('name')}" placeholder="Ürün adı"></div>
    <div class="field"><label for="ns-where">Nereden <span class="muted small">(isteğe bağlı)</span></label><input class="edit-in sub" id="ns-where" value="${v('where')}" placeholder="ör. Sephora"></div>
    <div class="field"><label for="ns-price">Fiyat ($)</label><input class="edit-in sub" id="ns-price" type="number" inputmode="decimal" value="${v('price')}" placeholder="0"></div>
    <div class="row"><button class="btn primary" data-action="shop-save" ${s ? `data-id="${s.id}"` : ''}>${s ? 'Kaydet' : 'Ekle'}</button><button class="btn" data-action="close-modal">Vazgeç</button></div>`;
}

function renderCalendar() {
  const [y, m] = ui.calMonth.split('-').map(Number);
  const first = new Date(y, m - 1, 1), days = new Date(y, m, 0).getDate();
  const offset = (first.getDay() + 6) % 7, t = todayStr(), fu = state.settings.firstUse;
  let cells = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(w => `<div class="wd">${w}</div>`).join('');
  for (let i = 0; i < offset; i++) cells += '<div class="cell empty"></div>';
  let total = 0, done = 0, ret = 0;
  for (let d = 1; d <= days; d++) {
    const ds = `${y}-${pad(m)}-${pad(d)}`, future = ds > t;
    const st = future ? null : dayStatus(ds);
    if (st && ds >= fu) { total++; if (st.full) done++; }
    if (st && st.retinal) ret++;
    const cls = [st && st.full ? 'full' : st && st.any ? 'partial' : '', ds === t ? 'today' : '', ds === ui.calSel ? 'sel' : ''].join(' ');
    cells += `<button class="cell ${cls}" data-action="cal-sel" data-d="${ds}" ${future ? 'disabled' : ''}><span class="n">${d}</span>${st && st.retinal ? '<span class="r">R</span>' : ''}</button>`;
  }
  let t30 = 0, d30 = 0, r30 = 0;
  for (let i = 0; i < 30; i++) { const ds = addDays(t, -i); if (ds < fu) break; const st = dayStatus(ds); t30++; if (st.full) d30++; if (st.retinal) r30++; }
  const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';
  let h = `<div class="card datenav"><button class="btn" data-action="cal-month" data-n="-1" aria-label="Önceki ay">‹</button><div class="label">${esc(fmtMonth(ui.calMonth))}</div><button class="btn" data-action="cal-month" data-n="1" ${ui.calMonth >= t.slice(0, 7) ? 'disabled' : ''} aria-label="Sonraki ay">›</button></div>`;
  h += `<div class="card"><div class="cal-grid">${cells}</div><div class="legend"><span><i style="background:var(--accent)"></i>Tamamlandı</span><span><i style="background:var(--secondary)"></i>Kısmen</span><span><b>R</b> retinal kullanıldı</span></div></div>`;
  h += `<div class="card"><h2>Uyum</h2><div class="stats">
    <div class="stat"><b>${pct(done, total)}</b><span>${tx('Bu ay')} · ${done}/${total} ${tx('gün')}</span></div>
    <div class="stat"><b>${pct(d30, t30)}</b><span>${tx('Son 30 gün')} · ${d30}/${t30} ${tx('gün')}</span></div>
    <div class="stat"><b>${ret}</b><span>Retinal gecesi (bu ay)</span></div>
    <div class="stat"><b>${r30}</b><span>Retinal gecesi (son 30 gün)</span></div></div>
    <p class="small muted" style="margin-top:10px">${tx('Uyum: sabah ve akşam listesinin tamamı tiklenen günlerin oranı.')} ${tx('İlk kullanım')}: ${esc(fmtDate(fu))}.</p></div>`;
  if (ui.calSel) {
    const ds = dayStatus(ui.calSel), log = peekLog(ui.calSel);
    const sym = log ? [log.redness !== null ? `${tx('Kızarıklık')} ${log.redness}` : null, log.pimples != null ? `${tx('Sivilcelenme')} ${Math.min(3, log.pimples)}` : null, log.stinging !== null ? `${tx('Batma')} ${tx(log.stinging ? 'var' : 'yok')}` : null].filter(Boolean).join(' · ') : '';
    h += `<div class="card"><h2>${esc(fmtLong(ui.calSel))}</h2><p class="small">${tx('Sabah')} ${ds.doneAm}/${ds.am} · ${tx('Akşam')} ${ds.donePm}/${ds.pm} · Retinal: ${tx(ds.retinal ? 'kullanıldı' : 'yok')} · ${tx('Faz')}: ${tx(PHASES[phaseFor(ui.calSel)].label)}</p>${sym ? `<p class="small">${esc(sym)}</p>` : ''}${log && log.note ? `<p class="small muted">${esc(log.note)}</p>` : ''}<div class="row"><button class="btn sm" data-action="cal-open-log" data-d="${ui.calSel}">Günlüğü aç</button></div></div>`;
  }
  return h;
}

function faceSVG(active) {
  const st = id => AREA_MAP.find(a => a.id === id)[active];
  const r = (id, shape) => shape.replace(/^<(\w+)/, `<$1 class="region ${st(id)}" data-region="${id}"`);
  return `<svg viewBox="0 0 320 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Uygulama alanı haritası">
    <ellipse class="face" cx="160" cy="195" rx="122" ry="160"/>
    ${r('forehead', '<path d="M50 132 C58 72 108 46 160 46 C212 46 262 72 270 132 L184 132 L184 118 L136 118 L136 132 Z"><title>Alın</title></path>')}
    ${r('glabella', '<rect x="136" y="118" width="48" height="34" rx="8"><title>Glabella / kaş arası</title></rect>')}
    ${r('tzone', '<path d="M144 152 L176 152 L184 226 Q160 236 136 226 Z"><title>Burun üstü / T bölgesi</title></path>')}
    ${r('orbital', '<ellipse cx="62" cy="152" rx="14" ry="22"><title>Dış göz kenarı (orbital kemik)</title></ellipse>')}
    ${r('orbital', '<ellipse cx="258" cy="152" rx="14" ry="22"><title>Dış göz kenarı (orbital kemik)</title></ellipse>')}
    ${r('eyelid', '<ellipse cx="105" cy="152" rx="26" ry="12"><title>Göz kapağı</title></ellipse>')}
    ${r('eyelid', '<ellipse cx="215" cy="152" rx="26" ry="12"><title>Göz kapağı</title></ellipse>')}
    ${r('cheeks', '<ellipse cx="92" cy="218" rx="30" ry="42"><title>Yanaklar</title></ellipse>')}
    ${r('cheeks', '<ellipse cx="228" cy="218" rx="30" ry="42"><title>Yanaklar</title></ellipse>')}
    ${r('alar', '<ellipse cx="128" cy="224" rx="11" ry="16"><title>Burun kanadı kıvrımları</title></ellipse>')}
    ${r('alar', '<ellipse cx="192" cy="224" rx="11" ry="16"><title>Burun kanadı kıvrımları</title></ellipse>')}
    ${r('chin', '<ellipse cx="160" cy="320" rx="42" ry="22"><title>Çene</title></ellipse>')}
    <path class="guide" d="M72 118 Q100 106 128 112"/><path class="guide" d="M192 112 Q220 106 248 118"/>
    <circle cx="105" cy="152" r="4" fill="var(--muted)"/><circle cx="215" cy="152" r="4" fill="var(--muted)"/>
    <path class="guide" d="M128 274 Q160 286 192 274"/>
  </svg>`;
}

function ensureNotes() {
  if (!Array.isArray(state.notes)) { state.notes = DEFAULT_NOTES.map((n, i) => ({ id: 'n_' + i, title: n.title, body: n.body })); save(); }
}
function renderReference() {
  const tabs = [['notes', 'Notlar'], ['filter', 'Ürün filtresi'], ['area', 'Alan haritası']];
  let h = `<div class="chips scroll">${tabs.map(([k, l]) => `<button class="chip tab ${ui.refTab === k ? 'on' : ''}" data-action="ref-tab" data-t="${k}">${l}</button>`).join('')}</div>`;
  if (ui.refTab === 'notes') {
    ensureNotes();
    h += `<div class="list-head"><span class="small muted">Başlık ve metin doğrudan düzenlenir, anında kaydedilir.</span><button class="btn sm primary" data-action="note-add">+ Not ekle</button></div>`;
    h += state.notes.map(n => `<div class="card note"><div class="note-head"><input class="edit-in title" data-action="note-field" data-id="${n.id}" data-k="title" value="${esc(n.title)}" placeholder="Başlık" aria-label="Not başlığı"><button class="tool del" data-action="note-del" data-id="${n.id}" aria-label="Notu sil">✕</button></div><textarea class="note-body" data-action="note-field" data-id="${n.id}" data-k="body" placeholder="Not" rows="${Math.min(18, (n.body || '').split('\n').length + 1)}">${esc(n.body)}</textarea></div>`).join('') || '<p class="muted">Not yok.</p>';
  } else if (ui.refTab === 'filter') {
    h += `<div class="card"><h2>Ürün değerlendirme filtresi</h2><p class="small muted">INCI listesini yapıştır. Basit metin eşleşmesi; kırmızı bayrak = eleme, sarı bayrak = uyarı.</p>
      <textarea data-action="filter-text" placeholder="Aqua, Glycerin, Niacinamide, Parfum, …">${esc(ui.filterText)}</textarea>
      <div class="row"><button class="btn primary" data-action="filter-run">Kontrol et</button><button class="btn" data-action="filter-clear">Temizle</button></div>`;
    if (ui.filterRun) {
      const items = ui.filterText.split(/[,\n;]+/).map(s => s.trim()).filter(Boolean);
      const cls = s => RED_FLAGS.some(f => s.toLowerCase().includes(f.toLowerCase())) ? 'red' : YELLOW_FLAGS.some(f => s.toLowerCase().includes(f.toLowerCase())) ? 'yellow' : '';
      const reds = items.filter(s => cls(s) === 'red').length, yellows = items.filter(s => cls(s) === 'yellow').length;
      h += `<div class="card ${reds ? 'danger' : yellows ? 'warn' : 'ok'}" style="margin-top:12px"><strong>${items.length} ${tx('bileşen')} · ${reds} ${tx('kırmızı')} · ${yellows} ${tx('sarı')}</strong>${reds ? '<p class="small">Kırmızı bayrak var: elenecek.</p>' : yellows ? `<p class="small">${esc(tx(YELLOW_FLAG_NOTE))}</p>` : '<p class="small">Bayrak yok. Manuel kontrol sorularına geç.</p>'}</div>`;
      if (items.length) h += `<ul class="flag-list">${items.map(s => `<li class="${cls(s)}">${esc(s)}</li>`).join('')}</ul>`;
    }
    h += `</div>`;
    h += `<div class="card"><h3>Kırmızı bayrak</h3><div class="inci-chips">${RED_FLAGS.map(w => `<code>${esc(w)}</code>`).join('')}</div><h3>Sarı bayrak (uyarı, eleme değil)</h3><div class="inci-chips">${YELLOW_FLAGS.map(w => `<code>${esc(w)}</code>`).join('')}</div><p class="small muted">${esc(tx(YELLOW_FLAG_NOTE))}</p></div>`;
    h += `<div class="card"><h2>Manuel kontrol soruları</h2><ol class="q">${FILTER_QUESTIONS.map(q => `<li>${esc(tx(q))}</li>`).join('')}</ol></div>`;
  } else if (ui.refTab === 'area') {
    const mark = v => `<span class="mark ${v}">${v === 'ok' ? '✓' : v === 'warn' ? '!' : '✕'}</span>`;
    h += `<div class="card"><h2>Uygulama alanı haritası</h2><div class="seg small">${Object.entries(AREA_ACTIVES).map(([k, l]) => `<button class="${ui.areaActive === k ? 'on' : ''}" data-action="area-active" data-a="${k}">${l}</button>`).join('')}</div>
      <div class="face-wrap">${faceSVG(ui.areaActive)}</div>
      <div class="legend"><span><i style="background:var(--ok);opacity:.6"></i>Sürülür</span><span><i style="background:var(--warn);opacity:.6"></i>İnce veya atla</span><span><i style="background:var(--danger);opacity:.5"></i>Sürülmez</span></div>
      <div class="table-wrap"><table class="area-table"><thead><tr><th>Bölge</th><th>Azelaik</th><th>Retinal</th><th>Salisilik</th></tr></thead><tbody>
      ${AREA_MAP.map(a => `<tr><td>${a.bold ? `<b>${esc(a.name)}</b>` : esc(a.name)}</td><td class="c">${mark(a.aza)}</td><td class="c">${mark(a.ret)}${a.ret === 'warn' ? '<div class="small muted">ince veya atla</div>' : ''}</td><td class="c">${mark(a.sal)}</td></tr>`).join('')}
      </tbody></table></div></div>`;
    h += `<div class="card info"><p class="small">${esc(tx(AREA_NOTE))}</p></div>`;
  }
  h += `<p class="disclaimer">${esc(tx(DISCLAIMER))}</p>`;
  return h;
}

function weekdayChips(id, selected, action = 'chip') {
  const order = [1, 2, 3, 4, 5, 6, 0];
  return `<div class="chips" id="${id}">${order.map(d => `<button class="chip ${selected.includes(d) ? 'on' : ''}" data-action="${action}" data-d="${d}" aria-pressed="${selected.includes(d)}">${wd(d)}</button>`).join('')}</div>`;
}

function renderSettings() {
  const s = state.settings, p = phase(), idx = PHASE_ORDER.indexOf(p);
  const prev = idx > 0 ? PHASE_ORDER[idx - 1] : null, next = idx < PHASE_ORDER.length - 1 ? PHASE_ORDER[idx + 1] : null;
  const t = todayStr();
  let h = `<div class="card"><h2>Faz</h2>
    <div class="setting"><div class="lbl">${esc(tx(PHASES[p].label))} — ${esc(tx(PHASES[p].desc))}</div><div class="hint">${esc(phaseLabel())}. ${tx('Faz, retinal başlangıç tarihi ve onaylanan geçişlerden hesaplanır; otomatik ilerlemez.')}</div>
    <div class="row">${prev ? `<button class="btn" data-action="phase-change" data-target="${prev}" data-dir="back">${lang() === 'en' ? `‹ Back to ${esc(tx(PHASES[prev].label))}` : `‹ ${esc(PHASES[prev].label)}'e dön`}</button>` : ''}${next ? `<button class="btn" data-action="phase-change" data-target="${next}" data-dir="next">${lang() === 'en' ? `Move to ${esc(tx(PHASES[next].label))} ›` : `${esc(PHASES[next].label)}'e geç ›`}</button>` : ''}</div>
    ${p !== 'EYLUL' ? `<div class="hint" style="margin-top:8px">İrritasyon olursa bir önceki faza dönmek normal akışın parçası.</div>` : ''}</div>
    <div class="setting"><label class="lbl" for="rsd">Retinal başlangıç tarihi</label><div class="hint">Faz sayacı bu tarihe göre işler. Alevlenme varsa ertele.</div><input type="date" id="rsd" data-action="set-retinal-start" value="${s.retinalStartDate || ''}"></div>
    ${s.f2StartDate ? `<div class="setting"><div class="lbl">${tx('F2 başlangıcı')}: ${esc(fmtDate(s.f2StartDate))}</div>${s.f3StartDate ? `<div class="hint">${tx('F3 başlangıcı')}: ${esc(fmtDate(s.f3StartDate))}</div>` : ''}</div>` : ''}
  </div>`;
  h += `<div class="card"><h2>Retinal geceleri</h2><div class="setting"><div class="hint">Öneri — F1: haftada 2 · F2: gün aşırı · F3: haftada 5'e kadar. Seçim sana ait.</div>${weekdayChips('night-chips', s.retinalNights, 'toggle-night')}</div></div>`;
  h += `<div class="card"><h2>Salisilik asit gecesi</h2><div class="setting"><div class="hint">${esc(tx(SALICYLIC_HINT))}</div>
    <select data-action="set-salicylic"><option value="" ${s.salicylicNight === null ? 'selected' : ''}>Yok</option>${[1, 2, 3, 4, 5, 6, 0].map(d => `<option value="${d}" ${s.salicylicNight === d ? 'selected' : ''}>${wdLong(d)}</option>`).join('')}</select></div>`;
  if (p !== 'EYLUL') {
    const allowed = !SALICYLIC_REENABLE_DATE || t >= SALICYLIC_REENABLE_DATE;
    h += `<div class="setting"><label class="switch"><span><span class="lbl">${esc(tx(SALICYLIC_REENABLE_LABEL))}</span><div class="hint">${allowed ? esc(tx(SALICYLIC_REENABLE_DONE)) : (lang() === 'en' ? `Can be enabled from ${esc(fmtDate(SALICYLIC_REENABLE_DATE))}.` : `${esc(fmtDate(SALICYLIC_REENABLE_DATE))} tarihinden itibaren açılabilir.`)}</div></span><input type="checkbox" data-action="toggle-sal-reenable" ${s.salicylicReenabled ? 'checked' : ''} ${allowed ? '' : 'disabled'}></label></div>`;
  }
  h += `</div>`;
  h += `<div class="card"><h2>${tx('Dil')} / Language</h2><div class="setting"><div class="seg small">${LANGS.map(([k, l]) => `<button class="${lang() === k ? 'on' : ''}" data-action="set-lang" data-m="${k}">${l}</button>`).join('')}</div></div>
    <div class="setting"><label class="lbl" for="app-name">${tx('Uygulama adı')}</label><div class="hint">${tx('Başlıkta görünen ad.')}</div><input class="edit-in" id="app-name" data-action="set-app-name" value="${esc(s.appName || '')}" placeholder="Skincare"></div></div>`;
  h += `<div class="card"><h2>Renkler</h2><p class="small muted">Dört ana renk; diğer tonlar bunlardan türetilir. Koyu görünümde zemin koyulaşır, ana renk açılır.</p>
    <div class="setting"><div class="lbl">Görünüm</div><div class="seg small" style="margin-top:8px">${THEME_MODES.map(([k, l]) => `<button class="${(state.theme.mode || 'light') === k ? 'on' : ''}" data-action="theme-mode" data-m="${k}">${l}</button>`).join('')}</div></div>
    <div class="palette">${Object.keys(THEME_DEFAULT).map(k => `<i style="background:${esc(state.theme[k])}"></i>`).join('')}</div>
    ${Object.keys(THEME_DEFAULT).map(k => `<label class="color-row"><span><span class="lbl">${THEME_LABELS[k][0]}</span><div class="hint">${THEME_LABELS[k][1]}</div></span><span class="swatch"><code>${esc((state.theme[k] || '').toUpperCase())}</code><input type="color" data-action="set-color" data-k="${k}" value="${esc((state.theme[k] || THEME_DEFAULT[k]).toLowerCase())}" aria-label="${THEME_LABELS[k][0]}"></span></label>`).join('')}
    <div class="row"><button class="btn" data-action="theme-reset">Varsayılan renklere dön</button></div></div>`;
  h += `<div class="card"><h2>Veri</h2><p class="small muted">Tüm veri bu cihazda, tarayıcının yerel deposunda tutulur. Hiçbir yere gönderilmez.</p>
    <div class="row"><button class="btn" data-action="export">Dışa aktar</button><button class="btn" data-action="import">İçe aktar</button><button class="btn danger" data-action="reset">Sıfırla</button></div></div>`;
  h += `<p class="disclaimer">${esc(tx(DISCLAIMER))}</p>`;
  return h;
}

/* ================= modal ================= */
function openModal(html) { const r = document.getElementById('modal-root'); r.innerHTML = `<div class="sheet-bg" data-action="close-modal"><div class="sheet">${html}</div></div>`; translateDOM(r); }
function closeModal() { document.getElementById('modal-root').innerHTML = ''; }

function badgeModal(b) {
  const B = BADGES[b];
  return `<h2>${esc(tx(B.label))}</h2><p>${esc(tx(B.text))}</p><div class="row">${B.link === 'area' ? `<button class="btn primary" data-action="open-area">Alan haritasını aç</button>` : ''}<button class="btn" data-action="close-modal">Kapat</button></div>`;
}

function phaseModal(target, dir) {
  const back = dir === 'back', t = todayStr();
  let h = `<h2>${tx(back ? 'Bir önceki faza dön' : 'Faz geçişi')}: ${esc(tx(PHASES[target].label))}</h2><p class="muted small">${esc(tx(PHASES[target].desc))}</p>`;
  if (target === 'EYLUL') {
    h += `<p>Retinal başlangıç tarihi bir hafta ileri alınacak: <strong>${esc(fmtDate(addDays(t, 7)))}</strong>${esc(tx(PHASE_BACK_TO_START_TEXT))}</p>`;
  } else {
    const sug = RETINAL_SUGGESTION[target];
    h += `<p>${tx('Önerilen sıklık:')} <strong>${esc(tx(sug.text))}</strong>${tx('. Retinal gecelerini seç:')}</p>${weekdayChips('modal-nights', sug.nights)}`;
    if (target === 'EKIM_F1' && !back) h += `<p class="small muted">${tx('Retinal başlangıç tarihi bugün')} (${esc(fmtDate(t))}) ${tx('olarak kaydedilir.')}</p>`;
    if (target === 'EKIM_F2' && !back) h += `<div class="card info"><strong>${tx('Yama testi')}:</strong> ${esc(tx(PATCH_TEST_TEXT))}</div>`;
    if (back) h += `<p class="small muted">Geçiş önerisi bir hafta boyunca tekrar gösterilmez.</p>`;
  }
  h += `<div class="row"><button class="btn primary" data-action="confirm-phase" data-target="${target}" data-dir="${dir}">Onayla</button><button class="btn" data-action="close-modal">Vazgeç</button></div>`;
  return h;
}

function confirmPhase(target, dir) {
  const s = state.settings, t = todayStr();
  const nights = [...document.querySelectorAll('#modal-nights .chip.on')].map(b => +b.dataset.d);
  if (dir === 'back') {
    if (target === 'EYLUL') s.retinalStartDate = addDays(t, 7);
    else if (target === 'EKIM_F1') { s.f2StartDate = null; s.f2DeferUntil = addDays(t, 7); }
    else if (target === 'EKIM_F2') { s.f3StartDate = null; s.f3DeferUntil = addDays(t, 7); }
  } else {
    if (target === 'EKIM_F1') { s.retinalStartDate = t; s.f2StartDate = null; s.f3StartDate = null; }
    else if (target === 'EKIM_F2') { s.f2StartDate = t; s.f2DeferUntil = null; }
    else if (target === 'EKIM_F3') { s.f3StartDate = t; s.f3DeferUntil = null; }
  }
  if (target !== 'EYLUL') s.retinalNights = nights;
  save(); closeModal(); render();
  toast(`${tx(PHASES[target].label)} ${tx('fazı etkin')}`);
}

function dataModal(kind) {
  if (kind === 'export') {
    return `<h2>Dışa aktar</h2><p class="small muted">Aşağıdaki metni kopyalayıp sakla. İçe aktar ile geri yüklenebilir.</p><textarea id="export-json" readonly style="min-height:160px;font-family:monospace;font-size:.75rem">${esc(JSON.stringify(state))}</textarea><div class="row"><button class="btn primary" data-action="copy-json">Kopyala</button><button class="btn" data-action="close-modal">Kapat</button></div>`;
  }
  return `<h2>İçe aktar</h2><p class="small muted">Daha önce dışa aktarılan metni yapıştır. Mevcut veri üzerine yazılır.</p><textarea id="import-json" style="min-height:160px;font-family:monospace;font-size:.75rem"></textarea><div class="row"><button class="btn primary" data-action="import-confirm">İçe aktar</button><button class="btn" data-action="close-modal">Vazgeç</button></div>`;
}

/* ================= toast ================= */
let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast'); msg = tx(msg);
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

/* ================= olaylar ================= */
function nav(view) { ui.view = view; ui.editToday = false; render(); window.scrollTo(0, 0); }
let noteTimer;

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action, d = el.dataset, t = todayStr();
  switch (a) {
    case 'nav': nav(d.view); break;
    case 'period': ui.period = d.p; render(); break;
    case 'toggle': toggleStep(t, d.period, d.id); render(); break;
    case 'badge': openModal(badgeModal(d.b)); break;
    case 'open-area': closeModal(); ui.refTab = 'area'; nav('reference'); break;
    case 'close-modal': if (e.target === el || e.target.closest('.btn') === el) closeModal(); break;
    case 'phase-change': openModal(phaseModal(d.target, d.dir)); break;
    case 'confirm-phase': confirmPhase(d.target, d.dir); break;
    case 'defer-transition': {
      const k = d.target === 'EKIM_F2' ? 'f2DeferUntil' : 'f3DeferUntil';
      state.settings[k] = addDays(t, 7); save(); render(); toast(`${tx('Bir hafta ertelendi')} · ${fmtDate(state.settings[k])}`); break;
    }
    case 'chip': el.classList.toggle('on'); el.setAttribute('aria-pressed', el.classList.contains('on')); break;
    case 'toggle-night': {
      const day = +d.d, arr = state.settings.retinalNights, i = arr.indexOf(day);
      if (i >= 0) arr.splice(i, 1); else arr.push(day);
      save(); render(); break;
    }
    case 'log-day': { const nd = addDays(ui.logDate, +d.n); if (nd <= t) { ui.logDate = nd; render(); } break; }
    case 'log-set': {
      const log = getLog(ui.logDate), v = d.v === 'true' ? true : d.v === 'false' ? false : d.v === 'null' ? null : +d.v;
      log[d.k] = (v !== null && log[d.k] === v) ? null : v; save(); render(); break;
    }
    case 'prod-finish': dropProduct(d.id, 'finished'); render(); break;
    case 'prod-remove': dropProduct(d.id, 'removed'); render(); break;
    case 'prod-restore': restoreProduct(d.id); render(); break;
    case 'toggle-gone': ui.showGone = !ui.showGone; render(); break;
    case 'prod-add': openModal(productModal()); setTimeout(() => document.getElementById('np-name')?.focus(), 50); break;
    case 'prod-edit': openModal(productModal(byId(d.id))); break;
    case 'prod-status': setProductStatus(d.id, d.s); render(); toast(tx(d.s === 'queued' ? 'Sıraya alındı' : 'Kullanıma alındı')); break;
    case 'prod-to-today': productToToday(d.id, d.period); closeModal(); nav('today'); ui.period = d.period; render(); break;
    case 'prod-save': if (saveProductForm(d.id)) { closeModal(); render(); } break;
    case 'clear-image': { ui.pendingImage = null; const pv = document.getElementById('np-preview'); if (pv) pv.innerHTML = WATER_ICON; el.disabled = true; break; }
    case 'shop-remove': {
      const ci = state.customShopping.findIndex(s => s.id === d.id);
      if (ci >= 0) state.customShopping.splice(ci, 1); else if (!state.removedShopping.includes(d.id)) state.removedShopping.push(d.id);
      save(); render(); toast(tx('Listeden çıkarıldı')); break;
    }
    case 'shop-add': openModal(shoppingModal()); setTimeout(() => document.getElementById('ns-name')?.focus(), 50); break;
    case 'shop-edit': openModal(shoppingModal(allShopping().find(s => s.id === d.id))); break;
    case 'shop-save': {
      const name = document.getElementById('ns-name').value.trim();
      if (!name) { toast(tx('Ürün adı gerekli')); break; }
      const f = { name, where: document.getElementById('ns-where').value.trim(), price: Number(document.getElementById('ns-price').value) || 0 };
      if (!d.id) state.customShopping.push({ id: uid('s_'), ...f });
      else { const c = state.customShopping.find(s => s.id === d.id); if (c) Object.assign(c, f); else state.shoppingEdits[d.id] = f; }
      save(); closeModal(); render(); break;
    }
    case 'edit-today': ui.editToday = !ui.editToday; render(); break;
    case 'step-add': {
      const ed = editsForWrite(d.key); const id = uid('c_');
      ed.custom.push({ id, name: '', note: '' });
      if (ed.order) ed.order.push(id);
      save(); render();
      setTimeout(() => document.querySelector(`input[data-id="${id}"][data-k="name"]`)?.focus(), 50); break;
    }
    case 'step-hide': {
      const ed = editsForWrite(d.key); const ci = ed.custom.findIndex(c => c.id === d.id);
      if (ci >= 0) ed.custom.splice(ci, 1); else if (!ed.hidden.includes(d.id)) ed.hidden.push(d.id);
      save(); render(); break;
    }
    case 'step-image-clear': delete state.stepImages[d.id]; save(); render(); break;
    case 'step-unhide': { const ed = editsForWrite(d.key); ed.hidden = ed.hidden.filter(x => x !== d.id); save(); render(); break; }
    case 'step-move': {
      const ed = editsForWrite(d.key); const ids = stepsForEdit(t, ui.period).map(s => s.id);
      const i = ids.indexOf(d.id), j = i + (+d.n);
      if (i < 0 || j < 0 || j >= ids.length) break;
      [ids[i], ids[j]] = [ids[j], ids[i]]; ed.order = ids; save(); render(); break;
    }
    case 'step-reset': if (confirm(tx('Bu listedeki düzenlemeler silinecek. Emin misin?'))) { delete state.routineEdits[d.key]; save(); render(); } break;
    case 'log-pimple': { const log = getLog(ui.logDate); log.pimples = Math.max(0, (log.pimples || 0) + (+d.n)); save(); render(); break; }
    case 'note-add': { ensureNotes(); const id = uid('n_'); state.notes.unshift({ id, title: '', body: '' }); save(); render(); setTimeout(() => document.querySelector(`input[data-id="${id}"]`)?.focus(), 50); break; }
    case 'note-del': if (confirm(tx('Not silinsin mi?'))) { state.notes = state.notes.filter(n => n.id !== d.id); save(); render(); } break;
    case 'theme-mode': state.theme.mode = d.m; applyTheme(); save(); render(); break;
    case 'set-lang': state.settings.lang = d.m; save(); render(); break;
    case 'ginzing': {
      const cp = byId(d.id); if (!cp) break;
      if (d.v === 'reset') delete state.products[d.id];
      else if (d.v === 'ok') state.products[d.id] = { status: cp.group && activeOf(cp.group) ? 'queued' : 'active', decision: 'ok' };
      else state.products[d.id] = { status: 'giveaway', reason: 'Kutu kontrolü: sitrus uçucu yağı / alerjen bulundu', decision: 'out' };
      save(); render(); break;
    }
    case 'check': {
      const arr = state.checks[d.list], i = arr.indexOf(d.id);
      if (i >= 0) arr.splice(i, 1); else arr.push(d.id);
      save(); render(); break;
    }
    case 'cal-month': {
      const [y, m] = ui.calMonth.split('-').map(Number);
      const nd = new Date(y, m - 1 + (+d.n), 1); const ym = `${nd.getFullYear()}-${pad(nd.getMonth() + 1)}`;
      if (ym <= t.slice(0, 7)) { ui.calMonth = ym; ui.calSel = null; render(); } break;
    }
    case 'cal-sel': ui.calSel = ui.calSel === d.d ? null : d.d; render(); break;
    case 'cal-open-log': ui.logDate = d.d; nav('log'); break;
    case 'ref-tab': ui.refTab = d.t; render(); break;
    case 'area-active': ui.areaActive = d.a; render(); break;
    case 'filter-run': ui.filterRun = true; render(); break;
    case 'filter-clear': ui.filterText = ''; ui.filterRun = false; render(); break;
    case 'export': openModal(dataModal('export')); break;
    case 'import': openModal(dataModal('import')); break;
    case 'copy-json': {
      const ta = document.getElementById('export-json'); ta.select();
      (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject()).then(() => toast(tx('Kopyalandı')), () => { try { document.execCommand('copy'); toast(tx('Kopyalandı')); } catch (err) { toast(tx('Kopyalanamadı, metni elle seç')); } });
      break;
    }
    case 'import-confirm': {
      try {
        const obj = JSON.parse(document.getElementById('import-json').value);
        if (!obj || typeof obj !== 'object' || !obj.settings) throw new Error('format');
        localStorage.setItem(KEY, JSON.stringify(obj)); state = load(); applyTheme(); closeModal(); render(); toast(tx('Veri içe aktarıldı'));
      } catch (err) { toast(tx('Geçersiz veri')); }
      break;
    }
    case 'theme-reset': state.theme = { ...THEME_DEFAULT, mode: state.theme.mode || 'light' }; applyTheme(); save(); render(); toast(tx('Varsayılan renkler')); break;
    case 'reset': if (confirm(tx('Tüm veri silinecek. Emin misin?'))) { localStorage.removeItem(KEY); state = defaultState(); save(); applyTheme(); render(); toast(tx('Sıfırlandı')); } break;
  }
});

document.addEventListener('change', e => {
  const el = e.target, a = el.dataset.action, s = state.settings;
  if (a === 'pick-image' || a === 'step-image') {
    const f = el.files && el.files[0]; if (!f) return;
    readImageFile(f).then(url => {
      if (a === 'step-image') { state.stepImages[el.dataset.id] = url; save(); render(); toast(tx('Fotoğraf eklendi')); }
      else { ui.pendingImage = url; const pv = document.getElementById('np-preview'); if (pv) pv.innerHTML = `<img src="${url}" alt="">`; const cb = document.querySelector('[data-action="clear-image"]'); if (cb) cb.disabled = false; }
    }).catch(() => toast(tx('Görsel okunamadı')));
    return;
  }
  if (a === 'set-retinal-start') {
    const v = el.value || null; s.retinalStartDate = v;
    if (v) { if (s.f2StartDate && s.f2StartDate < v) s.f2StartDate = null; if (s.f3StartDate && s.f3StartDate < v) s.f3StartDate = null; }
    save(); render();
  } else if (a === 'set-salicylic') { s.salicylicNight = el.value === '' ? null : +el.value; save(); render(); }
  else if (a === 'toggle-sal-reenable') { s.salicylicReenabled = el.checked; save(); render(); }
  else if (a === 'set-color') { state.theme[el.dataset.k] = el.value; applyTheme(); save(); render(); }
  else if (a === 'step-field' || a === 'note-field') { applyEditField(el); clearTimeout(noteTimer); save(); }
  else if (a === 'set-app-name') { s.appName = el.value.trim(); save(); render(); }
});

function applyEditField(el) {
  if (el.dataset.action === 'step-field') {
    const ed = editsForWrite(el.dataset.key), id = el.dataset.id, k = el.dataset.k;
    const c = ed.custom.find(x => x.id === id);
    if (c) c[k] = el.value; else ed.overrides[id] = { ...(ed.overrides[id] || {}), [k]: el.value };
  } else {
    const n = (state.notes || []).find(x => x.id === el.dataset.id);
    if (n) { n[el.dataset.k] = el.value; if (el.tagName === 'TEXTAREA') { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }
  }
}
document.addEventListener('input', e => {
  const el = e.target, a = el.dataset.action, s = state.settings;
  if (a === 'log-note') { const d = ui.logDate; clearTimeout(noteTimer); noteTimer = setTimeout(() => { getLog(d).note = el.value; save(); }, 300); }
  else if (a === 'filter-text') { ui.filterText = el.value; }
  else if (a === 'step-field' || a === 'note-field') { applyEditField(el); clearTimeout(noteTimer); noteTimer = setTimeout(save, 300); }
  else if (a === 'set-color') { state.theme[el.dataset.k] = el.value; applyTheme(); }
  else if (a === 'set-app-name') { s.appName = el.value.trim(); document.getElementById('hdr-title').textContent = appName(); clearTimeout(noteTimer); noteTimer = setTimeout(save, 300); }
});

document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="checkbox"][data-action]')) { e.preventDefault(); e.target.click(); }
  if (e.key === 'Escape') closeModal();
});

/* gün değişince (uygulama açık kalmışsa) yenile */
let lastDay = todayStr();
setInterval(() => { if (todayStr() !== lastDay) { lastDay = todayStr(); ui.logDate = lastDay; ui.period = new Date().getHours() < 12 ? 'am' : 'pm'; render(); } }, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

/* PWA */
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !location.hostname.includes('claude')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

applyTheme();
render();
