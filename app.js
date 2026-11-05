// ================== NeoBridge app ==================
(function () {
  'use strict';
  const S = NB.store, DAY = NB.DAY, CFG = window.NB_CONFIG || {};
  const root = document.getElementById('app');

  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) {}
    return null;
  }

  const ui = {
    role: ls('nb-role'), babyId: ls('nb-baby'), viewBaby: null, lang: ls('nb-lang') || 'ta',
    view: null, check: null, result: null, logForm: null, alertId: null, editId: null,
    toast: '', belt: NB.belt.status, unseen: null, pending: false, confirmReset: false
  };

  // ---------- helpers ----------
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const st = () => S.get();
  const vals = o => Object.values(o || {});
  const babies = () => vals(st().babies).sort((a, b) => a.name.localeCompare(b.name));
  const babyOf = id => st().babies[id];
  const logsOf = (id, type) => vals(st().logs).filter(l => l.babyId === id && (!type || l.type === type)).sort((a, b) => b.ts - a.ts);
  const tamil = () => ui.lang === 'ta' && ui.role === 'mother'; // staff screens stay in English
  const L = (en, ta) => (tamil() && ta) ? ta : en;
  const B = (en, ta) => (tamil() && ta) ? `${esc(ta)}<span class="sub">${esc(en)}</span>` : esc(en);
  const fmtTime = ts => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const fmtDate = ms => new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  function ago(ts) {
    const m = Math.round((Date.now() - ts) / 60000);
    if (m < 1) return 'just now'; if (m < 60) return m + ' min ago';
    const h = Math.round(m / 60); if (h < 24) return h + ' h ago';
    return Math.round(h / 24) + ' d ago';
  }
  const dayAtHome = b => Math.max(1, Math.floor((NB.startOfToday() - NB.parseYmd(b.dischargeDate)) / DAY) + 1);
  const dayOfLife = b => Math.floor((NB.startOfToday() - NB.parseYmd(b.birthDate)) / DAY) + 1;
  const tel = n => 'tel:' + String(n || '').replace(/[^0-9+]/g, '');
  const wa = (n, text) => {
    let d = String(n || '').replace(/[^0-9]/g, '');
    if (d.length === 10) d = (CFG.countryCode || '91') + d;
    return 'https://wa.me/' + d + '?text=' + encodeURIComponent(text);
  };

  const ICONS = {
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5"/>',
    home: '<path d="M3 11l9-8 9 8v10H3z"/>',
    list: '<path d="M4 4h16v16H4zM8 9h8M8 13h8M8 17h5"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6M12 17h.01"/>',
    bt: '<path d="M7 7l10 10-5 5V2l5 5L7 17"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z"/>',
    warn: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    speaker: '<path d="M11 5L6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M17 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    hosp: '<path d="M3 21h18M5 21V7l7-4 7 4v14M10 9h4M12 7v4M10 21v-5h4v5"/>'
  };
  const ic = n => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;
  const LOGO = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#16243A"/><path d="M12 42c6-14 34-14 40 0" fill="none" stroke="#FAF6F0" stroke-width="5" stroke-linecap="round"/><circle cx="32" cy="24" r="6" fill="#E8876C"/></svg>';

  const LEVELS = {
    RED: { cls: 'red', en: 'Go to hospital now', ta: 'உடனே மருத்துவமனைக்குச் செல்லுங்கள்', short: 'Red' },
    AMBER: { cls: 'amber', en: 'Watch closely', ta: 'கவனமாக கண்காணியுங்கள்', short: 'Amber' },
    GREEN: { cls: 'green', en: 'All okay today', ta: 'இன்று நலமாக உள்ளது', short: 'Green' }
  };

  // ---------- sound + vibration ----------
  let actx = null, alarmTimer = null;
  function audioInit() {
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) {}
  }
  function beep(ms, f) {
    if (!actx) return;
    try {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'square'; o.frequency.value = f; g.gain.value = 0.12;
      o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + ms / 1000);
    } catch (e) {}
  }
  function buzz(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }
  function startAlarm() {
    stopAlarm();
    const ring = () => { beep(350, 880); setTimeout(() => beep(350, 660), 420); buzz([500, 250, 500]); };
    ring(); alarmTimer = setInterval(ring, 1400);
  }
  function stopAlarm() { if (alarmTimer) clearInterval(alarmTimer); alarmTimer = null; buzz(0); }
  function ping() { beep(200, 990); setTimeout(() => beep(200, 990), 300); setTimeout(() => beep(300, 740), 600); buzz([300, 150, 300]); }

  function toast(msg) {
    ui.toast = msg; render();
    clearTimeout(toast.t); toast.t = setTimeout(() => { ui.toast = ''; render(); }, 3500);
  }

  // ---------- alerts ----------
  function openAlertFor(babyId) {
    return vals(st().alerts).filter(a => a.babyId === babyId && !a.resolved).sort((a, b) => b.ts - a.ts)[0];
  }
  function raiseAlert(babyId, a, source) {
    const reasons = a.reasons.filter(r => r.level === 'RED');
    const existing = openAlertFor(babyId);
    if (existing && Date.now() - existing.ts < 30 * 60000) {
      // keep one alert, but add any new reasons to it
      const known = new Set(existing.reasons.map(r => r.code || r.en));
      const extra = reasons.filter(r => !known.has(r.code || r.en));
      if (extra.length) S.patch('alerts', existing.id, { reasons: existing.reasons.concat(extra), seen: false, motherAck: false, ts: Date.now() });
      else return existing;
      if (ui.role === 'mother' && ui.babyId === babyId && ui.view !== 'm-alert') { ui.alertId = existing.id; go('m-alert'); startAlarm(); }
      return existing;
    }
    const al = S.upsert('alerts', { babyId, level: 'RED', reasons, source, seen: false, resolved: false, motherAck: false });
    if (ui.role === 'mother' && ui.babyId === babyId) {
      ui.alertId = al.id; go('m-alert'); startAlarm();
      NB.voice.speak(NB.ADVICE.RED[0][1], NB.ADVICE.RED[0][0], ui.lang);
    }
    return al;
  }
  function checkBeltAlert() {
    if (ui.role !== 'mother' || !ui.babyId) return;
    const b = babyOf(ui.babyId); if (!b) return;
    const a = NB.assess(b, st());
    if (a.reasons.some(r => r.level === 'RED' && /^belt-/.test(r.code))) raiseAlert(b.id, a, 'belt');
  }

  // ---------- shared pieces ----------
  const modeChip = () => S.mode === 'cloud' ? '<span class="tag ok">Cloud sync</span>' : '<span class="tag">Demo mode</span>';
  const langBtn = () => `<button class="pill" data-act="lang" aria-label="Change language">${ui.lang === 'ta' ? 'தமிழ் · EN' : 'EN · தமிழ்'}</button>`;
  function backbar(title, sub, act) {
    return `<header class="top"><button class="iconbtn" data-act="${act}" aria-label="Back">${ic('back')}</button>
      <div class="grow"><p class="h2">${title}</p>${sub ? `<p class="muted">${sub}</p>` : ''}</div>${langBtn()}</header>`;
  }
  function motherTabs(active) {
    const it = [['m-home', 'home', 'Home', 'முகப்பு'], ['check', 'mic', 'Check', 'சோதனை'], ['m-logs', 'list', 'Logs', 'பதிவுகள்'], ['m-help', 'help', 'Help', 'உதவி']];
    return `<nav class="tabs" aria-label="Main">${it.map(([v, i, en, ta]) =>
      `<button class="${active === v ? 'on' : ''}" data-act="${v === 'check' ? 'startCheck' : 'nav:' + v}">${ic(i)}<span>${L(en, ta)}</span></button>`).join('')}</nav>`;
  }
  function staffTabs(active) {
    const it = [['a-list', 'users', 'Babies'], ['a-alerts', 'warn', 'Alerts'], ['a-settings', 'gear', 'Settings']];
    const n = vals(st().alerts).filter(a => !a.resolved).length;
    return `<nav class="tabs" aria-label="Main">${it.map(([v, i, en]) =>
      `<button class="${active === v ? 'on' : ''}" data-act="nav:${v}">${ic(i)}<span>${en}${v === 'a-alerts' && n ? ` (${n})` : ''}</span></button>`).join('')}</nav>`;
  }
  const levelPill = (lv, txt) => `<span class="lvl ${LEVELS[lv].cls}">${txt || LEVELS[lv].short}</span>`;
  function reasonList(reasons, withInfo) {
    const rs = reasons.filter(r => withInfo || r.level !== 'INFO');
    if (!rs.length) return '';
    return `<ul class="reasons">${rs.map(r => `<li class="${r.level.toLowerCase()}">${B(r.en, r.ta)}</li>`).join('')}</ul>`;
  }

  function weightChart(b) {
    const ws = logsOf(b.id, 'weight').slice().reverse();
    if (ws.length < 2) return `<p class="note">${L('Add at least 2 weights to see the chart.', 'வரைபடம் காண குறைந்தது 2 எடைகள் சேர்க்கவும்.')}</p>`;
    const W = 340, H = 170, P = { l: 40, r: 12, t: 14, b: 26 };
    const t0 = ws[0].ts, t1 = Math.max(ws[ws.length - 1].ts, t0 + DAY);
    const exp = ws[0].kg * (1 + 0.015 * (t1 - t0) / DAY); // about 15 g per kg per day
    const kgs = ws.map(w => w.kg);
    const min = Math.min(...kgs) - 0.05, max = Math.max(Math.max(...kgs), exp) + 0.05;
    const x = t => P.l + (t - t0) / (t1 - t0) * (W - P.l - P.r);
    const y = k => P.t + (max - k) / (max - min) * (H - P.t - P.b);
    const pts = ws.map(w => `${x(w.ts).toFixed(1)},${y(w.kg).toFixed(1)}`).join(' ');
    const last = ws[ws.length - 1];
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight from ${ws[0].kg} kg to ${last.kg} kg">
      <line x1="${P.l}" y1="${H - P.b}" x2="${W - P.r}" y2="${H - P.b}" stroke="#E4DACB"/>
      <line x1="${P.l}" y1="${y(exp)}" x2="${W - P.r}" y2="${y(exp)}" stroke="#F2EBE1"/>
      <line x1="${x(t0)}" y1="${y(ws[0].kg)}" x2="${x(t1)}" y2="${y(exp)}" stroke="#6B7280" stroke-width="2" stroke-dasharray="5 5"/>
      <polyline points="${pts}" fill="none" stroke="#B8492F" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${x(last.ts)}" cy="${y(last.kg)}" r="5" fill="#B8492F"/>
      <text x="4" y="${y(max - 0.05) + 4}" class="ct">${(max - 0.05).toFixed(2)}</text>
      <text x="4" y="${y(min + 0.05) + 4}" class="ct">${(min + 0.05).toFixed(2)}</text>
      <text x="${P.l}" y="${H - 6}" class="ct">${fmtDate(t0)}</text>
      <text x="${W - P.r}" y="${H - 6}" class="ct" text-anchor="end">${fmtDate(last.ts)}</text>
    </svg>
    <div class="legend"><span><i class="sw coral"></i>${L('Baby’s weight (kg)', 'குழந்தையின் எடை (கிலோ)')}</span><span><i class="sw dash"></i>${L('Expected gain', 'எதிர்பார்க்கும் வளர்ச்சி')}</span></div>`;
  }

  function beltCard(b) {
    const s = ui.belt, r = st().belt[b.id];
    const live = r && Date.now() - r.ts < NB.LIMITS.beltFreshMs;
    if (s === 'off' || s === 'connecting') {
      return `<section class="card">
        <p class="h3">${ic('bt')} ${B('NeoBelt not connected', 'நியோபெல்ட் இணைக்கப்படவில்லை')}</p>
        <div class="btnrow">
          <button class="btn dark" data-act="beltConnect">${s === 'connecting' ? 'Connecting…' : L('Connect NeoBelt', 'பெல்ட்டை இணை')}</button>
          <button class="btn ghost" data-act="beltSim">${L('Use demo belt', 'டெமோ பெல்ட்')}</button>
        </div>
        ${navigator.bluetooth ? '' : '<p class="note">Bluetooth works in Chrome on Android or a laptop, opened from an https:// link. You can still use the demo belt.</p>'}
      </section>`;
    }
    const pausing = live && r.br === 0 && !r.apnea && r.ps;
    return `<section class="card ${live && r.apnea ? 'danger' : ''}">
      <div class="row"><p class="h3">${ic('bt')} ${s === 'sim' ? 'Demo belt (simulated)' : s === 'reconnecting' ? 'Reconnecting to NeoBelt…' : 'NeoBelt connected'}</p>
        <button class="link" data-act="beltOff">${L('Disconnect', 'துண்டி')}</button></div>
      <div class="stats">
        <div><b>${live ? r.br : '–'}</b><span>${L('breaths / min', 'மூச்சு / நிமிடம்')}</span></div>
        <div><b>${live && r.t ? r.t.toFixed(1) + '°C' : '–'}</b><span>${L('skin temp', 'தோல் வெப்பம்')}</span></div>
        <div><b>${live ? (r.pauses || 0) : '–'}</b><span>${L('pauses today', 'இன்று இடைவெளி')}</span></div>
      </div>
      ${live && r.apnea ? `<p class="alertline">${ic('warn')} ${L('Breathing pause detected', 'மூச்சு நின்றது')}</p>` : ''}
      ${pausing ? `<p class="note">Breathing paused for ${r.ps} s… alarm at 20 s</p>` : ''}
      ${live ? `<p class="muted small">Updated ${fmtTime(r.ts)}</p>` : '<p class="muted small">Waiting for readings…</p>'}
      ${s === 'sim' ? `<div class="chips">
        <button class="chip" data-act="simPause">Simulate breathing pause</button>
        <button class="chip" data-act="simCold">Simulate cold baby</button>
        <button class="chip" data-act="simNormal">Back to normal</button></div>` : ''}
    </section>`;
  }

  // ---------- screens ----------
  const V = {};

  V.role = () => `<main class="screen welcome">
    <div class="logo">${LOGO}</div>
    <h1>NeoBridge</h1>
    <p class="muted center">Hospital-to-home care for preterm and low-birth-weight babies</p>
    <div class="stack">
      <button class="btn big dark" data-act="role:mother">${ic('home')}<span>I am a parent<span class="sub">நான் பெற்றோர்</span></span></button>
      <button class="btn big" data-act="role:asha">${ic('users')}<span>I am an ASHA worker<span class="sub">நான் ஆஷா பணியாளர்</span></span></button>
      <button class="btn big" data-act="role:doctor">${ic('hosp')}<span>I am SNCU staff<span class="sub">மருத்துவமனை பணியாளர்</span></span></button>
    </div>
    <p class="note center">${S.mode === 'cloud' ? 'Cloud sync is on: all phones share the same data.' : 'Demo mode: data stays in this browser. Tip: open a second tab as ASHA to watch alerts arrive live.'}</p>
    ${S.error ? `<p class="note err">Cloud sync problem: ${esc(S.error)}</p>` : ''}
  </main>`;

  V['m-pick'] = () => `<main class="screen">
    ${backbar(L('Which baby is yours?', 'உங்கள் குழந்தை யார்?'), '', 'switchRole')}
    <div class="stack">${babies().map(b => `<button class="baby" data-act="pick:${esc(b.id)}">
      <span class="avatar">${esc(b.name[0])}</span>
      <span class="grow"><b>${esc(b.name)}</b><span class="muted">Mother: ${esc(b.mother)} · day ${dayAtHome(b)} at home</span></span></button>`).join('')}</div>
  </main>`;

  V['m-home'] = () => {
    const b = babyOf(ui.babyId); if (!b) return V['m-pick']();
    const a = NB.assess(b, st()), lv = LEVELS[a.level];
    const target = CFG.kmcTargetHours || 12, pct = Math.min(100, Math.round(a.kmcToday / target * 100));
    const next = a.followUps.find(f => f.status !== 'done');
    const al = openAlertFor(b.id);
    const lastW = a.weights[a.weights.length - 1];
    return `<main class="screen">
      <header class="top"><div class="grow"><p class="brand">NeoBridge</p><p class="muted">${L('Hello', 'வணக்கம்')}, ${esc(b.mother)}</p></div>${modeChip()}${langBtn()}</header>
      ${al ? `<button class="banner red" data-act="openMyAlert">${ic('warn')} ${L('Red alert is open. Tap to see what to do.', 'அவசர எச்சரிக்கை. என்ன செய்வது என்று பார்க்க தொடுங்கள்.')}</button>` : ''}
      <section class="card hero ${lv.cls}">
        <div class="row"><div><p class="h1">${esc(b.name)}</p><p class="muted light">${L('Day', 'நாள்')} ${dayAtHome(b)} ${L('at home', 'வீட்டில்')} · ${L('born at', 'பிறப்பு')} ${esc(b.gestWeeks)} ${L('weeks', 'வாரம்')}</p></div>
          <p class="big">${lastW ? lastW.kg.toFixed(2) + ' kg' : ''}</p></div>
        <p class="status">${B(lv.en, lv.ta)}</p>
        ${reasonList(a.reasons, true)}
      </section>
      ${beltCard(b)}
      <section class="card">
        <div class="row"><p class="h3">${L('Skin-to-skin today', 'இன்று தோலோடு தோல்')}</p><p>${a.kmcToday} / ${target} h</p></div>
        <div class="bar"><i style="width:${pct}%"></i></div>
      </section>
      ${next ? `<section class="card row">${ic('cal')}<div class="grow"><p class="h3">${esc(next.en)}</p><p class="muted">${next.status === 'overdue' ? 'Overdue since' : next.status === 'today' ? 'Due today' : 'Due'} ${fmtDate(next.due)} · ASHA ${esc(b.ashaName || '')}</p></div></section>` : ''}
      <button class="btn big coral" data-act="startCheck">${ic('mic')}<span>${L('Start today’s check', 'இன்றைய சோதனையைத் தொடங்கு')}</span></button>
      ${motherTabs('m-home')}
    </main>`;
  };

  V['m-check'] = () => {
    const b = babyOf(ui.babyId), c = ui.check;
    if (!b || !c) return V['m-home']();
    const mic = NB.voice.canListen ? `<button class="mic ${c.listening ? 'on' : ''}" data-act="${c.step === 'free' ? 'checkFree' : 'checkMic'}" aria-label="Speak your answer">${ic('mic')}</button>` : '';
    if (c.step === 'free') {
      return `<main class="screen">${backbar(L('Daily check', 'தினசரி சோதனை'), L('Tell us in your own words', 'உங்கள் வார்த்தைகளில் சொல்லுங்கள்'), 'nav:m-home')}
        <section class="qcard"><p class="q-ta">இன்று ${esc(b.name)} எப்படி இருக்கிறது? பால், மூச்சு, உடல் சூடு பற்றி சொல்லுங்கள்.</p>
        <p class="q-en">How is ${esc(b.name)} today? Tell us about feeding, breathing and warmth.</p></section>
        ${c.heard ? `<p class="heard">${L('Heard', 'கேட்டது')}: “${esc(c.heard)}”</p>` : ''}
        ${c.msg ? `<p class="note">${esc(c.msg)}</p>` : ''}
        <div class="micwrap">${mic}<p class="center">${c.busy ? 'Understanding…' : c.listening ? L('Listening… speak now', 'கேட்கிறது… பேசுங்கள்') : L('Tap the mic and speak', 'மைக்கைத் தொட்டு பேசுங்கள்')}</p></div>
        <button class="btn ghost" data-act="checkSkip">${L('Skip, answer the questions instead', 'தவிர், கேள்விகளுக்கு பதில் சொல்')}</button>
      </main>`;
    }
    const n = NB.SIGNS.length, s = NB.SIGNS[c.i], sug = c.suggest[s.key];
    return `<main class="screen">${backbar(L('Daily check', 'தினசரி சோதனை'), `${L('Question', 'கேள்வி')} ${c.i + 1} / ${n}`, 'nav:m-home')}
      <div class="bar"><i style="width:${Math.round(c.i / n * 100)}%"></i></div>
      <section class="qcard">
        <p class="q-ta">${esc(s.q_ta)}</p><p class="q-en">${esc(s.q_en)}</p>
        <button class="link" data-act="checkSpeak">${ic('speaker')} ${L('Hear again', 'மீண்டும் கேள்')}</button>
      </section>
      ${sug === true || sug === false ? `<p class="heard">AI understood: <b>${sug ? 'Yes' : 'No'}</b>. Please tap to confirm.</p>` : ''}
      ${c.heard ? `<p class="heard">${L('Heard', 'கேட்டது')}: “${esc(c.heard)}”</p>` : ''}
      ${c.msg ? `<p class="note">${esc(c.msg)}</p>` : ''}
      <div class="yn">
        <button class="btn yes ${sug === true ? 'sel' : ''}" data-act="checkAns:yes">ஆமாம்<span class="sub">Yes</span></button>
        <button class="btn no ${sug === false ? 'sel' : ''}" data-act="checkAns:no">இல்லை<span class="sub">No</span></button>
      </div>
      ${mic ? `<div class="micwrap">${mic}<p class="center small">${c.listening ? L('Listening… say ஆமாம் or இல்லை', 'கேட்கிறது… ஆமாம் அல்லது இல்லை சொல்லுங்கள்') : L('Or tap the mic and say ஆமாம் / இல்லை', 'அல்லது மைக்கைத் தொட்டு ஆமாம் / இல்லை சொல்லுங்கள்')}</p></div>` : ''}
      ${c.i > 0 ? `<button class="link center" data-act="checkPrev">${L('Previous question', 'முந்தைய கேள்வி')}</button>` : ''}
    </main>`;
  };

  V['m-result'] = () => {
    const b = babyOf(ui.babyId), a = ui.result;
    if (!b || !a) return V['m-home']();
    const lv = LEVELS[a.level];
    return `<main class="screen">
      <section class="card hero ${lv.cls}"><p class="muted light">${L('Result for', 'முடிவு')} ${esc(b.name)}</p><p class="h1">${B(lv.en, lv.ta)}</p>${reasonList(a.reasons)}</section>
      <section class="card"><p class="h3">${L('What to do', 'என்ன செய்ய வேண்டும்')}</p>
        <ol class="advice">${NB.ADVICE[a.level].map(x => `<li>${B(x[0], x[1])}</li>`).join('')}</ol></section>
      <p class="note">Checked against WHO newborn danger signs. NeoBridge helps you decide when to get help; it does not replace a doctor.</p>
      <button class="btn big dark" data-act="nav:m-home">${L('Done', 'முடிந்தது')}</button>
    </main>`;
  };

  V['m-alert'] = () => {
    const b = babyOf(ui.babyId), al = st().alerts[ui.alertId] || openAlertFor(ui.babyId);
    if (!b || !al) return V['m-home']();
    const num = CFG.emergencyNumber || '108';
    const msg = `NeoBridge RED alert: ${b.name} (mother ${b.mother}). ${al.reasons.map(r => r.en).join('; ')}. Please call now.`;
    return `<main class="screen alertscreen">
      <section class="redtop"><p class="tagline">${ic('warn')} RED ALERT</p>
        <p class="h1">${tamil() ? '' : 'Take '}${esc(b.name)} ${L('to the hospital now', 'யை இப்போதே மருத்துவமனைக்கு அழைத்துச் செல்லுங்கள்')}</p>
        ${reasonList(al.reasons)}</section>
      <section class="card"><p class="h3">${L('What to do right now', 'இப்போது செய்ய வேண்டியது')}</p>
        <ol class="advice">${NB.ADVICE.RED.map(x => `<li>${B(x[0], x[1])}</li>`).join('')}</ol></section>
      <a class="btn big dark" href="${tel(num)}">${ic('phone')}<span>${L('Call', 'அழை')} ${esc(num)} ${L('ambulance', 'ஆம்புலன்ஸ்')}</span></a>
      ${b.ashaPhone ? `<div class="btnrow"><a class="btn ghost" href="${tel(b.ashaPhone)}">${ic('phone')} Call ASHA</a><a class="btn ghost" href="${wa(b.ashaPhone, msg)}" target="_blank" rel="noopener">${ic('chat')} WhatsApp ASHA</a></div>`
        : '<p class="note">Add the ASHA’s phone number (ASHA view › baby › Edit) to show Call / WhatsApp buttons here.</p>'}
      <section class="card soft"><p class="small"><b>${L('Who has been told', 'யாருக்கு தெரிவிக்கப்பட்டது')}</b></p>
        <p class="small">${ic('check')} ASHA ${esc(b.ashaName || '')} and SNCU dashboards · ${fmtTime(al.ts)}</p>
        ${al.source === 'belt' ? `<p class="small">${ic('check')} Belt buzzer sounding at home</p>` : ''}</section>
      <div class="btnrow">
        <button class="btn ghost" data-act="alarmStop">${L('Stop sound', 'ஒலியை நிறுத்து')}</button>
        <button class="btn coral" data-act="alertAck">${L('We are going to hospital', 'மருத்துவமனைக்குச் செல்கிறோம்')}</button>
      </div>
    </main>`;
  };

  V['m-logs'] = () => {
    const b = babyOf(ui.babyId); if (!b) return V['m-pick']();
    const a = NB.assess(b, st()), f = ui.logForm;
    const recent = logsOf(b.id).filter(l => l.type !== 'visit').slice(0, 8);
    const label = l => l.type === 'feed' ? L('Feed', 'பால்') : l.type === 'kmc' ? `${L('Skin-to-skin', 'தோலோடு தோல்')} · ${l.hours} h`
      : l.type === 'weight' ? `${L('Weight', 'எடை')} · ${l.kg} kg` : `${L('Daily check', 'தினசரி சோதனை')} · ${l.level || ''}`;
    const lastW = a.weights[a.weights.length - 1];
    return `<main class="screen">
      <header class="top"><div class="grow"><p class="h2">${esc(b.name)} · ${L('logs', 'பதிவுகள்')}</p><p class="muted">${L('Today', 'இன்று')} · ${L('day', 'நாள்')} ${dayAtHome(b)}</p></div>${langBtn()}</header>
      <div class="grid3">
        <button class="btn dark tall" data-act="logFeed">${ic('plus')}<span>${L('Feed', 'பால்')}</span></button>
        <button class="btn dark tall" data-act="logOpen:kmc">${ic('plus')}<span>${L('Skin-to-skin', 'தோலோடு தோல்')}</span></button>
        <button class="btn dark tall" data-act="logOpen:weight">${ic('plus')}<span>${L('Weight', 'எடை')}</span></button>
      </div>
      ${f === 'kmc' ? `<section class="card"><p class="h3">${L('How many hours of skin-to-skin?', 'எத்தனை மணி நேரம் தோலோடு தோல்?')}</p>
        <div class="chips">${[1, 2, 3, 4].map(h => `<button class="chip big" data-act="logKmc:${h}">${h} h</button>`).join('')}</div>
        <button class="link" data-act="logOpen:">Cancel</button></section>` : ''}
      ${f === 'weight' ? `<form class="card" data-form="saveWeight"><label class="h3" for="wkg">${L('Weight in kg (e.g. 1.70)', 'எடை கிலோவில் (உ.தா. 1.70)')}</label>
        <input id="wkg" name="kg" type="number" inputmode="decimal" step="0.01" min="0.5" max="6" required placeholder="${lastW ? lastW.kg.toFixed(2) : '1.50'}">
        <div class="btnrow"><button class="btn coral" type="submit">Save</button><button class="btn ghost" type="button" data-act="logOpen:">Cancel</button></div></form>` : ''}
      <div class="grid3">
        <div class="stat"><b>${a.feedsToday}</b><span>${L('feeds today', 'இன்று பால்')}</span></div>
        <div class="stat"><b>${a.kmcToday} h</b><span>${L('skin-to-skin', 'தோலோடு தோல்')}</span></div>
        <div class="stat"><b>${lastW ? lastW.kg.toFixed(2) : '–'}</b><span>${L('kg weight', 'கிலோ எடை')}</span></div>
      </div>
      <section class="card"><p class="h3">${L('Weight since discharge', 'வெளியேறியதிலிருந்து எடை')}</p>${weightChart(b)}</section>
      <section class="card"><p class="h3">${L('Recent', 'சமீபத்தியவை')}</p>
        ${recent.map(l => `<div class="row line"><span>${esc(label(l))}</span><span class="muted">${fmtTime(l.ts)}${l.ts < NB.startOfToday() ? ' · ' + fmtDate(l.ts) : ''}</span></div>`).join('') || '<p class="muted">Nothing yet</p>'}
      </section>
      ${motherTabs('m-logs')}
    </main>`;
  };

  V['m-help'] = () => {
    const b = babyOf(ui.babyId), num = CFG.emergencyNumber || '108';
    return `<main class="screen">
      <header class="top"><div class="grow"><p class="h2">${L('Help', 'உதவி')}</p></div>${langBtn()}</header>
      <a class="btn big coral" href="${tel(num)}">${ic('phone')}<span>${L('Emergency: call', 'அவசரம்: அழை')} ${esc(num)}</span></a>
      <section class="card"><p class="h3">${L('Go to hospital at once if you see any of these', 'இவற்றில் ஏதேனும் இருந்தால் உடனே மருத்துவமனைக்குச் செல்லுங்கள்')}</p>
        <ul class="reasons">${NB.SIGNS.map(s => `<li class="red">${B(s.en, s.ta)}</li>`).join('')}
        <li class="red">${B('Breathing stops for 20 seconds or more', '20 விநாடிக்கு மேல் மூச்சு நிற்பது')}</li></ul>
        <p class="note">Based on WHO / IMNCI danger signs for young infants.</p></section>
      ${b && b.ashaPhone ? `<a class="btn ghost" href="${tel(b.ashaPhone)}">${ic('phone')} Call ASHA ${esc(b.ashaName || '')}</a>` : ''}
      <section class="card"><p class="h3">Settings</p>
        <div class="stack">
          <button class="btn ghost" data-act="lang">${L('Language: Tamil + English', 'மொழி: தமிழ் + ஆங்கிலம்')} (${ui.lang === 'ta' ? 'Tamil first' : 'English only'})</button>
          <button class="btn ghost" data-act="changeBaby">Choose a different baby</button>
          <button class="btn ghost" data-act="switchRole">Switch role (parent / ASHA / SNCU)</button>
        </div>
        <p class="muted small">${S.mode === 'cloud' ? 'Cloud sync is on.' : 'Demo mode: data is saved in this browser.'}</p></section>
      ${motherTabs('m-help')}
    </main>`;
  };

  // ---------- staff (ASHA / SNCU) ----------
  function staffHeader() {
    const isAsha = ui.role === 'asha';
    const all = babies().map(b => NB.assess(b, st()));
    const c = l => all.filter(a => a.level === l).length;
    return `<header class="staffhead"><div class="row"><div><p class="h1">${isAsha ? 'Hi, ASHA worker' : 'SNCU dashboard'}</p>
      <p class="muted light">${babies().length} babies at home${isAsha ? ' · Ward 4' : ''}</p></div>${modeChip()}</div>
      <div class="chips"><span class="lvl red">${c('RED')} Red</span><span class="lvl amber">${c('AMBER')} Amber</span><span class="lvl green">${c('GREEN')} Green</span></div></header>`;
  }
  function alertCards(list) {
    return list.map(al => {
      const b = babyOf(al.babyId); if (!b) return '';
      return `<section class="card danger"><div class="row"><p class="h3">${ic('warn')} RED · ${esc(b.name)}</p><span class="muted">${fmtTime(al.ts)} · ${ago(al.ts)}</span></div>
        ${reasonList(al.reasons)}
        <p class="small">${al.motherAck ? 'Mother says: going to hospital' : 'Mother has not replied yet'} · source: ${al.source === 'belt' ? 'NeoBelt' : 'daily check'}</p>
        <div class="btnrow">
          <button class="btn dark" data-act="openBaby:${esc(b.id)}">Open</button>
          ${b.motherPhone ? `<a class="btn ghost" href="${tel(b.motherPhone)}">${ic('phone')} Call</a>` : ''}
          ${al.seen ? `<button class="btn ghost" data-act="resolve:${esc(al.id)}">Mark handled</button>` : `<button class="btn ghost" data-act="seen:${esc(al.id)}">Seen</button>`}
        </div></section>`;
    }).join('');
  }

  V['a-list'] = () => {
    const rows = babies().map(b => ({ b, a: NB.assess(b, st()) })).sort((x, y) => y.a.score - x.a.score);
    const unseen = vals(st().alerts).filter(a => !a.seen && !a.resolved).sort((a, b) => b.ts - a.ts);
    return `<main class="screen staff">
      ${staffHeader()}
      ${alertCards(unseen)}
      <p class="label">SORTED BY RISK SCORE</p>
      <div class="stack">${rows.map(({ b, a }) => {
        const top = a.reasons.find(r => r.level === 'RED') || a.reasons.find(r => r.level === 'AMBER') || a.reasons.find(r => r.level === 'INFO');
        const r = st().belt[b.id], live = r && Date.now() - r.ts < NB.LIMITS.beltFreshMs;
        return `<button class="baby ${a.level === 'RED' ? 'redline' : ''}" data-act="openBaby:${esc(b.id)}">
          <span class="score ${LEVELS[a.level].cls}">${a.score}</span>
          <span class="grow"><b>${esc(b.name)} · ${LEVELS[a.level].short}</b><span class="muted">${top ? esc(top.en) : 'All checks fine'}</span></span>
          ${live ? '<span class="dot" title="Belt live"></span>' : ''}</button>`;
      }).join('')}</div>
      <button class="btn ghost" data-act="editBaby:new">${ic('plus')} Register a baby going home</button>
      ${staffTabs('a-list')}
    </main>`;
  };

  V['a-alerts'] = () => {
    const open = vals(st().alerts).filter(a => !a.resolved).sort((a, b) => b.ts - a.ts);
    const done = vals(st().alerts).filter(a => a.resolved).sort((a, b) => b.ts - a.ts).slice(0, 10);
    return `<main class="screen staff">${staffHeader()}
      <p class="label">OPEN ALERTS</p>${alertCards(open) || '<p class="muted">No open alerts.</p>'}
      ${done.length ? `<p class="label">HANDLED</p>${done.map(al => { const b = babyOf(al.babyId); return `<div class="card row"><span>${esc(b ? b.name : '?')} · ${esc(al.reasons.map(r => r.en).join(', '))}</span><span class="muted">${fmtDate(al.ts)} ${fmtTime(al.ts)}</span></div>`; }).join('')}` : ''}
      ${staffTabs('a-alerts')}</main>`;
  };

  V['a-baby'] = () => {
    const b = babyOf(ui.viewBaby); if (!b) return V['a-list']();
    const a = NB.assess(b, st()), lv = LEVELS[a.level];
    const r = st().belt[b.id], live = r && Date.now() - r.ts < NB.LIMITS.beltFreshMs;
    const al = openAlertFor(b.id);
    const lastW = a.weights[a.weights.length - 1];
    const chk = logsOf(b.id, 'check')[0];
    return `<main class="screen staff">
      <header class="top"><button class="iconbtn" data-act="nav:a-list" aria-label="Back">${ic('back')}</button>
        <div class="grow"><p class="h2">Baby ${esc(b.name)}</p><p class="muted">Mother: ${esc(b.mother)} · day ${dayAtHome(b)} at home · day ${dayOfLife(b)} of life</p></div>
        ${levelPill(a.level, `${lv.short} · ${a.score}`)}</header>
      ${al ? alertCards([al]) : ''}
      <section class="card dark"><p class="label light">${live ? 'LIVE FROM NEOBELT · ' + fmtTime(r.ts) : r ? 'NEOBELT LAST SEEN ' + ago(r.ts).toUpperCase() : 'NEOBELT NOT CONNECTED'}</p>
        <div class="stats light"><div><b>${live ? r.br : '–'}</b><span>breaths / min</span></div>
        <div><b>${live && r.t ? r.t.toFixed(1) + '°C' : '–'}</b><span>skin temp</span></div>
        <div><b>${live ? r.pauses || 0 : '–'}</b><span>pauses today</span></div></div></section>
      <section class="card"><p class="h3">Why this colour</p>${reasonList(a.reasons, true) || '<p class="muted">No danger signs. All checks fine.</p>'}</section>
      <section class="card"><p class="h3">Last daily check ${chk ? '· ' + ago(chk.ts) : ''}</p>
        ${chk ? NB.SIGNS.map(s => `<div class="row line"><span>${esc(s.en)}</span><b class="${chk.answers[s.key] ? 'tred' : 'muted'}">${chk.answers[s.key] ? 'Yes' : 'No'}</b></div>`).join('') : '<p class="muted">No check yet.</p>'}</section>
      <div class="grid3">
        <div class="stat"><b>${lastW ? lastW.kg.toFixed(2) : '–'}</b><span>kg now</span></div>
        <div class="stat"><b>${a.kmcToday} h</b><span>skin-to-skin today</span></div>
        <div class="stat"><b>${a.feedsToday}</b><span>feeds today</span></div>
      </div>
      <section class="card"><p class="h3">Weight</p>${weightChart(b)}</section>
      <section class="card"><p class="h3">Follow-up</p>
        ${a.followUps.map(f => `<div class="row line"><span>${esc(f.en)}<span class="muted small"> · due ${fmtDate(f.due)}</span></span>
          ${f.status === 'done' ? '<b class="tgreen">Done</b>' : `<button class="chip ${f.status === 'overdue' ? 'warnchip' : ''}" data-act="visitDone:${esc(b.id)}|${f.key}">${f.status === 'overdue' ? 'Overdue · mark done' : 'Mark done'}</button>`}</div>`).join('')}</section>
      <div class="btnrow">
        ${b.motherPhone ? `<a class="btn coral" href="${tel(b.motherPhone)}">${ic('phone')} Call ${esc(b.mother)}</a><a class="btn ghost" href="${wa(b.motherPhone, 'Hello ' + b.mother + ', this is your ASHA worker from NeoBridge about ' + b.name + '.')}" target="_blank" rel="noopener">${ic('chat')} WhatsApp</a>` : '<p class="note">Add the mother’s phone number to call or WhatsApp her.</p>'}
      </div>
      <button class="btn ghost" data-act="editBaby:${esc(b.id)}">Edit baby details</button>
      ${staffTabs('a-list')}
    </main>`;
  };

  V['a-edit'] = () => {
    const isNew = ui.editId === 'new';
    const b = isNew ? { name: '', mother: '', motherPhone: '', ashaName: 'Lakshmi', ashaPhone: '', birthDate: NB.ymd(Date.now() - 10 * DAY), dischargeDate: NB.ymd(Date.now()), gestWeeks: 33, birthWeight: 1.6 } : babyOf(ui.editId);
    if (!b) return V['a-list']();
    const f = (id, label, val, type, extra) => `<label for="${id}">${label}</label><input id="${id}" name="${id}" type="${type || 'text'}" value="${esc(val)}" ${extra || ''}>`;
    return `<main class="screen staff">
      ${backbar(isNew ? 'Register a baby' : 'Edit ' + esc(b.name), '', isNew ? 'nav:a-list' : 'nav:a-baby')}
      <form class="card form" data-form="saveBaby">
        ${f('name', 'Baby’s name', b.name, 'text', 'required')}
        ${f('mother', 'Mother’s name', b.mother, 'text', 'required')}
        ${f('motherPhone', 'Mother’s phone (10 digits)', b.motherPhone, 'tel', 'inputmode="tel"')}
        ${f('ashaName', 'ASHA worker’s name', b.ashaName)}
        ${f('ashaPhone', 'ASHA worker’s phone (10 digits)', b.ashaPhone, 'tel', 'inputmode="tel"')}
        ${f('birthDate', 'Date of birth', b.birthDate, 'date', 'required')}
        ${f('dischargeDate', 'Date of discharge from SNCU', b.dischargeDate, 'date', 'required')}
        ${f('gestWeeks', 'Born at (weeks of pregnancy)', b.gestWeeks, 'number', 'min="22" max="42" required')}
        ${f('birthWeight', 'Birth weight (kg)', b.birthWeight, 'number', 'step="0.01" min="0.4" max="5" required')}
        ${isNew ? f('w0', 'Weight at discharge (kg)', '', 'number', 'step="0.01" min="0.4" max="5" required') : ''}
        <button class="btn big coral" type="submit">Save</button>
      </form>
    </main>`;
  };

  V['a-settings'] = () => `<main class="screen staff">${staffHeader()}
    <section class="card"><p class="h3">Settings</p><div class="stack">
      <button class="btn ghost" data-act="switchRole">Switch role (parent / ASHA / SNCU)</button>
      <button class="btn ghost" data-act="reset">${ui.confirmReset ? 'Tap again to confirm: reset all demo data' : 'Reset demo data'}</button>
    </div>
    <p class="muted small">${S.mode === 'cloud' ? 'Cloud sync is on (Firebase).' : 'Demo mode: data is saved in this browser only. See README to turn on cloud sync.'}</p>
    ${S.error ? `<p class="note err">Cloud problem: ${esc(S.error)}</p>` : ''}</section>
    ${staffTabs('a-settings')}</main>`;

  // ---------- render ----------
  function typing() { const a = document.activeElement; return a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName); }
  function render() {
    if (typing()) { ui.pending = true; return; }
    ui.pending = false;
    const fn = V[ui.view] || V.role;
    root.innerHTML = fn() + (ui.toast ? `<div class="toast" role="status">${esc(ui.toast)}</div>` : '');
  }
  document.addEventListener('focusout', () => setTimeout(() => { if (ui.pending && !typing()) render(); }, 50));
  function go(view) { ui.view = view; ui.logForm = null; ui.confirmReset = false; render(); window.scrollTo(0, 0); }

  // ---------- daily check ----------
  function speakQuestion() {
    const c = ui.check; if (!c || c.step !== 'q') return;
    const s = NB.SIGNS[c.i]; NB.voice.speak(s.q_ta, s.q_en, ui.lang);
  }
  function answer(val) {
    const c = ui.check; if (!c) return;
    c.answers[NB.SIGNS[c.i].key] = val; c.heard = ''; c.msg = '';
    if (c.i + 1 >= NB.SIGNS.length) return finishCheck();
    c.i++; render(); speakQuestion();
  }
  function finishCheck() {
    const b = babyOf(ui.babyId), c = ui.check;
    const log = S.upsert('logs', { type: 'check', babyId: b.id, answers: c.answers });
    const a = NB.assess(b, st());
    S.patch('logs', log.id, { level: a.level });
    ui.check = null; ui.result = a;
    if (a.level === 'RED') { raiseAlert(b.id, a, 'check'); return; }
    go('m-result');
    const adv = NB.ADVICE[a.level][0]; NB.voice.speak(adv[1], adv[0], ui.lang);
  }

  // ---------- actions ----------
  const A = {
    role(r) { ui.role = r; ls('nb-role', r); ui.unseen = null; if (r === 'mother') go(ui.babyId && babyOf(ui.babyId) ? 'm-home' : 'm-pick'); else go('a-list'); },
    pick(id) { ui.babyId = id; ls('nb-baby', id); go('m-home'); },
    lang() { ui.lang = ui.lang === 'ta' ? 'en' : 'ta'; ls('nb-lang', ui.lang); render(); },
    nav(v) { go(v); },
    switchRole() { stopAlarm(); NB.belt.disconnect(); ui.role = null; ls('nb-role', null); go('role'); },
    changeBaby() { NB.belt.disconnect(); go('m-pick'); },
    startCheck() {
      ui.check = { step: NB.voice.hasAI() ? 'free' : 'q', i: 0, answers: {}, suggest: {}, heard: '', msg: '', listening: false, busy: false };
      go('m-check'); speakQuestion();
    },
    checkAns(v) { answer(v === 'yes'); },
    checkPrev() { const c = ui.check; if (c && c.i > 0) { c.i--; c.heard = ''; c.msg = ''; render(); speakQuestion(); } },
    checkSpeak() { speakQuestion(); },
    checkSkip() { const c = ui.check; if (c) { c.step = 'q'; c.heard = ''; c.msg = ''; render(); speakQuestion(); } },
    checkMic() {
      const c = ui.check; if (!c || c.listening) return;
      if (window.speechSynthesis) speechSynthesis.cancel();
      c.listening = true; c.msg = ''; render();
      NB.voice.listen(ui.lang === 'ta' ? 'ta-IN' : 'en-IN').then(alts => {
        if (ui.check !== c) return;
        c.listening = false; c.heard = alts[0] || '';
        const yn = NB.voice.yesNo(alts);
        if (yn === null) { c.msg = L('Not sure what you said. Please tap Yes or No.', 'புரியவில்லை. ஆமாம் அல்லது இல்லை என்பதைத் தொடுங்கள்.'); render(); }
        else { render(); setTimeout(() => { if (ui.check === c) answer(yn); }, 700); }
      }).catch(e => { if (ui.check !== c) return; c.listening = false; c.msg = e.message; render(); });
    },
    checkFree() {
      const c = ui.check; if (!c || c.listening || c.busy) return;
      c.listening = true; c.msg = ''; render();
      NB.voice.listen(ui.lang === 'ta' ? 'ta-IN' : 'en-IN').then(alts => {
        if (ui.check !== c) return;
        c.listening = false; c.heard = alts[0] || '';
        if (!c.heard) { c.msg = 'Did not hear anything. Try again or skip.'; render(); return; }
        c.busy = true; render();
        return NB.voice.gemini(c.heard).then(ans => {
          c.busy = false; c.suggest = ans || {}; c.step = 'q'; c.i = 0; c.heard = ''; render(); speakQuestion();
        });
      }).catch(e => {
        if (ui.check !== c) return;
        c.listening = false; c.busy = false; c.step = 'q'; c.msg = 'AI not available (' + e.message + '). Please answer the questions.'; render(); speakQuestion();
      });
    },
    logOpen(t) { ui.logForm = t || null; render(); if (t === 'weight') setTimeout(() => { const i = document.getElementById('wkg'); if (i) i.focus(); }, 50); },
    logFeed() { S.upsert('logs', { type: 'feed', babyId: ui.babyId }); toast(L('Feed saved', 'பால் பதிவு செய்யப்பட்டது')); },
    logKmc(h) { S.upsert('logs', { type: 'kmc', babyId: ui.babyId, hours: +h }); ui.logForm = null; toast(L(`${h} h skin-to-skin saved`, `${h} மணி நேரம் பதிவு செய்யப்பட்டது`)); },
    beltConnect() {
      NB.belt.connect().then(() => toast('NeoBelt connected')).catch(e => { if (e.name !== 'NotFoundError') toast(e.message); else toast('No belt chosen'); render(); });
    },
    beltSim() { NB.belt.startSim(); toast('Demo belt started'); },
    beltOff() { NB.belt.disconnect(); },
    simPause() { NB.belt.simPause(); toast('Breathing pause started. Alarm at 20 s.'); },
    simCold() { NB.belt.simCold(); toast('Baby getting cold…'); },
    simNormal() { NB.belt.simNormal(); },
    openMyAlert() { const al = openAlertFor(ui.babyId); if (al) { ui.alertId = al.id; go('m-alert'); } },
    alarmStop() { stopAlarm(); },
    alertAck() { const al = st().alerts[ui.alertId]; if (al) S.patch('alerts', al.id, { motherAck: true }); stopAlarm(); NB.belt.simNormal(); go('m-home'); },
    openBaby(id) { ui.viewBaby = id; go('a-baby'); },
    seen(id) { S.patch('alerts', id, { seen: true }); },
    resolve(id) { S.patch('alerts', id, { seen: true, resolved: true }); toast('Alert marked as handled'); },
    visitDone(arg) { const [id, key] = arg.split('|'); S.upsert('logs', { type: 'visit', babyId: id, key }); toast('Marked done'); },
    editBaby(id) { ui.editId = id; go('a-edit'); },
    reset() {
      if (!ui.confirmReset) { ui.confirmReset = true; render(); return; }
      ui.confirmReset = false; NB.belt.disconnect(); stopAlarm();
      S.reset().then(() => toast('Demo data reset')).catch(e => toast(e.message));
    }
  };
  const F = {
    saveWeight(form) {
      const kg = Math.round(parseFloat(form.kg.value) * 100) / 100;
      if (!(kg > 0.4 && kg < 6)) { toast('Please enter weight in kg, like 1.70'); return; }
      S.upsert('logs', { type: 'weight', babyId: ui.babyId, kg });
      document.activeElement && document.activeElement.blur();
      ui.logForm = null; toast(L('Weight saved', 'எடை பதிவு செய்யப்பட்டது'));
    },
    saveBaby(form) {
      const g = n => form[n] ? form[n].value.trim() : '';
      const isNew = ui.editId === 'new';
      const base = isNew ? { id: NB.uid() } : Object.assign({}, babyOf(ui.editId));
      const b = Object.assign(base, {
        name: g('name'), mother: g('mother'), motherPhone: g('motherPhone'), ashaName: g('ashaName'), ashaPhone: g('ashaPhone'),
        birthDate: g('birthDate'), dischargeDate: g('dischargeDate'), gestWeeks: +g('gestWeeks'), birthWeight: +g('birthWeight')
      });
      document.activeElement && document.activeElement.blur();
      S.upsert('babies', b);
      if (isNew && g('w0')) S.upsert('logs', { type: 'weight', babyId: b.id, kg: Math.round(+g('w0') * 100) / 100, ts: NB.parseYmd(b.dischargeDate) + 12 * 3600000 });
      ui.viewBaby = b.id; go('a-baby'); toast('Saved');
    }
  };

  document.addEventListener('click', e => {
    audioInit();
    const el = e.target.closest('[data-act]'); if (!el) return;
    const raw = el.getAttribute('data-act'), i = raw.indexOf(':');
    const name = i < 0 ? raw : raw.slice(0, i), arg = i < 0 ? '' : raw.slice(i + 1);
    if (A[name]) { e.preventDefault(); A[name](arg, el); }
  });
  document.addEventListener('submit', e => {
    const f = e.target.closest('[data-form]'); if (!f) return;
    e.preventDefault(); const fn = F[f.getAttribute('data-form')]; if (fn) fn(f);
  });

  // ---------- live updates ----------
  S.subscribe(state => {
    // New alert sound for ASHA / SNCU screens
    const unseen = vals(state.alerts).filter(a => !a.seen && !a.resolved).length;
    if (ui.role && ui.role !== 'mother' && ui.unseen !== null && unseen > ui.unseen) { ping(); ui.toast = 'New RED alert'; clearTimeout(toast.t); toast.t = setTimeout(() => { ui.toast = ''; render(); }, 4000); }
    ui.unseen = unseen;
    // If staff handled the mother's open alert, stop her alarm
    if (ui.role === 'mother' && ui.view === 'm-alert') { const al = state.alerts[ui.alertId]; if (al && al.resolved) { stopAlarm(); ui.view = 'm-home'; } }
    render();
  });
  NB.belt.onStatus(s => { ui.belt = s; render(); });
  NB.belt.onReading(r => {
    if (ui.role !== 'mother' || !ui.babyId) return;
    S.setBelt(ui.babyId, r);
    checkBeltAlert();
  });
  // Re-check every 30 s so "last seen" and overdue visits stay fresh
  setInterval(() => { if (!typing()) render(); }, 30000);

  // ---------- start ----------
  if (!ui.role) ui.view = 'role';
  else if (ui.role === 'mother') ui.view = ui.babyId && babyOf(ui.babyId) ? 'm-home' : 'm-pick';
  else ui.view = 'a-list';
  render();
  S.init().then(render);
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
