

window.NB = window.NB || {};
NB.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
NB.ymd = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
NB.parseYmd = s => { const p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]).getTime(); };
NB.startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

NB.store = (function () {
  const KEY = 'neobridge-data-v1';
  const COLS = ['babies', 'logs', 'alerts', 'belt'];
  const subs = [];
  let mode = 'local', db = null, error = '';
  const lastBeltWrite = {};

  const empty = () => ({ babies: {}, logs: {}, alerts: {}, belt: {} });
  const clean = o => JSON.parse(JSON.stringify(o));
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.babies) return s; } catch (e) {} return null; }
  function saveLocal() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function emit() { subs.forEach(f => { try { f(state); } catch (e) { console.error(e); } }); }

  let state = load();
  if (!state) { state = seed(); saveLocal(); }

  // Other tabs in the same browser (demo mode) get live updates
  window.addEventListener('storage', e => {
    if (mode === 'local' && e.key === KEY) { const s = load(); if (s) { state = s; emit(); } }
  });

  function upsert(col, doc) {
    doc = clean(doc);
    if (!doc.id) doc.id = NB.uid();
    if (!doc.ts) doc.ts = Date.now();
    state[col][doc.id] = doc;
    if (mode === 'cloud') db.collection(col).doc(doc.id).set(doc).catch(err => console.error(err));
    saveLocal(); emit();
    return doc;
  }
  function patch(col, id, fields) {
    const d = state[col][id]; if (!d) return null;
    return upsert(col, Object.assign({}, d, fields));
  }
  function setBelt(babyId, r) {
    const doc = clean(Object.assign({ id: babyId, babyId }, r));
    const prev = state.belt[babyId];
    state.belt[babyId] = doc;
    if (mode === 'cloud') {
      // Write to the cloud at most every 10 s, but at once when an alarm starts/stops
      const now = Date.now();
      const changed = !prev || prev.apnea !== doc.apnea || (prev.t < NB.LIMITS.coldRed) !== (doc.t < NB.LIMITS.coldRed);
      if (changed || !lastBeltWrite[babyId] || now - lastBeltWrite[babyId] > 10000) {
        lastBeltWrite[babyId] = now;
        db.collection('belt').doc(babyId).set(doc).catch(console.error);
      }
    }
    saveLocal(); emit();
  }

  async function commitAll(ops) { // ops: [{type:'set'|'delete', col, id, doc}]
    for (let i = 0; i < ops.length; i += 400) {
      const batch = db.batch();
      ops.slice(i, i + 400).forEach(o => {
        const ref = db.collection(o.col).doc(o.id);
        if (o.type === 'set') batch.set(ref, o.doc); else batch.delete(ref);
      });
      await batch.commit();
    }
  }
  const setOps = s => COLS.flatMap(c => Object.values(s[c]).map(d => ({ type: 'set', col: c, id: d.id, doc: d })));

  async function reset() {
    const fresh = seed();
    if (mode === 'cloud') {
      const del = COLS.flatMap(c => Object.keys(state[c]).map(id => ({ type: 'delete', col: c, id })));
      await commitAll(del.concat(setOps(fresh)));
    }
    state = fresh; saveLocal(); emit();
  }

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src));
      document.head.appendChild(s);
    });
  }
  async function initCloud(cfg) {
    const V = '10.12.2';
    await loadScript(`https://www.gstatic.com/firebasejs/${V}/firebase-app-compat.js`);
    await loadScript(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore-compat.js`);
    firebase.initializeApp(cfg);
    db = firebase.firestore();
    try { await db.enablePersistence({ synchronizeTabs: true }); } catch (e) { console.warn('Offline cache off:', e.code); }
    const snap = await db.collection('babies').limit(1).get();
    mode = 'cloud';
    if (snap.empty) await commitAll(setOps(seed()));
    COLS.forEach(c => db.collection(c).onSnapshot(s => {
      const m = {}; s.forEach(d => { m[d.id] = d.data(); });
      state[c] = m; saveLocal(); emit();
    }, err => { console.error(c, err); error = err.message; emit(); }));
  }

  async function init() {
    const cfg = window.NB_CONFIG && NB_CONFIG.firebase;
    if (cfg && cfg.projectId) {
      try { await initCloud(cfg); } catch (e) { console.error(e); mode = 'local'; error = e.message; }
    }
    emit();
  }

  // ---------- Demo data ----------
  function seed() {
    const s = empty(), T = NB.startOfToday(), D = NB.DAY, now = Date.now();
    const list = [
      { id: 'kavi', name: 'Kavi', mother: 'Priya', birthAgo: 24, disAgo: 8, gestWeeks: 32, birthWeight: 1.45, w0: 1.52, gain: 0.020, kmc: 6, visits: ['v1', 'v2'] },
      { id: 'anbu', name: 'Anbu', mother: 'Revathi', birthAgo: 14, disAgo: 5, gestWeeks: 34, birthWeight: 1.80, w0: 1.78, gain: 0.015, flat: 3, kmc: 2, visits: ['v1'], noCheck: true },
      { id: 'meena', name: 'Meena', mother: 'Selvi', birthAgo: 16, disAgo: 7, gestWeeks: 35, birthWeight: 2.00, w0: 1.95, gain: 0.022, kmc: 9, visits: ['v1'] },
      { id: 'ravi', name: 'Ravi', mother: 'Kalai', birthAgo: 33, disAgo: 20, gestWeeks: 33, birthWeight: 1.70, w0: 1.72, gain: 0.024, kmc: 10, visits: ['v1', 'v2', 'rop'] },
      { id: 'divya', name: 'Divya', mother: 'Deepa', birthAgo: 26, disAgo: 12, gestWeeks: 31, birthWeight: 1.40, w0: 1.46, gain: 0.021, kmc: 8, visits: ['v1', 'v2'] }
    ];
    const log = o => { o.id = NB.uid() + Math.random().toString(36).slice(2, 5); s.logs[o.id] = o; };
    list.forEach(x => {
      const dis = T - x.disAgo * D;
      s.babies[x.id] = {
        id: x.id, name: x.name, mother: x.mother, motherPhone: '',
        ashaName: 'Lakshmi', ashaPhone: '',
        birthDate: NB.ymd(T - x.birthAgo * D), dischargeDate: NB.ymd(dis),
        gestWeeks: x.gestWeeks, birthWeight: x.birthWeight, ts: dis
      };
      let kg = x.w0;
      for (let d = 0; d <= x.disAgo; d++) {
        if (d > 0 && !(x.flat && d > x.disAgo - x.flat)) kg += x.gain;
        log({ babyId: x.id, type: 'weight', kg: Math.round(kg * 100) / 100, ts: dis + d * D + 7 * 3600000 });
      }
      const todayTs = Math.max(T + 60000, now - 3600000);
      log({ babyId: x.id, type: 'kmc', hours: x.kmc, ts: todayTs });
      for (let f = 0; f < 4; f++) log({ babyId: x.id, type: 'feed', ts: Math.max(T + 60000 * (f + 2), now - (f + 1) * 2.5 * 3600000) });
      if (!x.noCheck) {
        const ans = {}; NB.SIGNS.forEach(sg => { ans[sg.key] = false; });
        log({ babyId: x.id, type: 'check', answers: ans, level: 'GREEN', ts: Math.max(T + 60000, now - 2 * 3600000) });
      }
      const dueOf = { v1: dis + D, v2: dis + 8 * D, rop: NB.parseYmd(NB.ymd(T - x.birthAgo * D)) + 28 * D };
      x.visits.forEach(k => log({ babyId: x.id, type: 'visit', key: k, ts: dueOf[k] + 10 * 3600000 }));
    });
    return s;
  }

  return {
    get: () => state, subscribe: f => subs.push(f),
    upsert, patch, setBelt, reset, init,
    get mode() { return mode; }, get error() { return error; }
  };
})();
