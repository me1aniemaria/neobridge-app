

window.NB = window.NB || {};
NB.DAY = 86400000;

NB.LIMITS = {
  coldRed: 35.5,     
  coolAmber: 36.5,   
  hotRed: 37.5,     
  fastBreath: 60,    
  beltFreshMs: 2 * 60000 
};


NB.SIGNS = [
  { key: 'feeding_poor', en: 'Not feeding well', ta: 'சரியாக பால் குடிக்கவில்லை',
    q_en: 'Is your baby not feeding well, or refusing milk?',
    q_ta: 'குழந்தை சரியாக பால் குடிக்காமல் இருக்கிறதா?' },
  { key: 'fits', en: 'Fits (convulsions)', ta: 'வலிப்பு',
    q_en: 'Has your baby had fits (shaking or stiffening)?',
    q_ta: 'குழந்தைக்கு வலிப்பு (உடல் நடுக்கம் அல்லது விறைப்பு) வந்ததா?' },
  { key: 'fast_breathing', en: 'Fast or difficult breathing', ta: 'வேகமான அல்லது சிரமமான மூச்சு',
    q_en: 'Is your baby breathing very fast or with difficulty?',
    q_ta: 'குழந்தை மிக வேகமாக அல்லது சிரமப்பட்டு மூச்சு விடுகிறதா?' },
  { key: 'chest_indrawing', en: 'Chest pulling in when breathing', ta: 'மூச்சு விடும்போது நெஞ்சு உள்ளிழுப்பு',
    q_en: 'When your baby breathes, does the lower chest pull in deeply?',
    q_ta: 'மூச்சு விடும்போது குழந்தையின் கீழ் நெஞ்சு ஆழமாக உள்ளே இழுக்கிறதா?' },
  { key: 'cold', en: 'Cold to touch', ta: 'தொட்டால் குளிர்ச்சி',
    q_en: "Do your baby's feet or tummy feel cold when you touch them?",
    q_ta: 'குழந்தையின் கால் அல்லது வயிற்றைத் தொட்டால் குளிர்ச்சியாக இருக்கிறதா?' },
  { key: 'hot', en: 'Fever (feels hot)', ta: 'காய்ச்சல்',
    q_en: 'Does your baby feel hot, like a fever?',
    q_ta: 'குழந்தைக்கு காய்ச்சல் போல உடல் சூடாக இருக்கிறதா?' },
  { key: 'low_movement', en: 'Moves only when touched, or not at all', ta: 'தொட்டால் மட்டும் அசைவு / அசைவு இல்லை',
    q_en: 'Does your baby move only when touched, or not move at all?',
    q_ta: 'குழந்தை தொட்டால் மட்டுமே அசைகிறதா, அல்லது அசையவே இல்லையா?' },
  { key: 'yellow', en: 'Yellow palms or soles', ta: 'உள்ளங்கை / உள்ளங்கால் மஞ்சள்',
    q_en: "Are your baby's palms or soles yellow?",
    q_ta: 'குழந்தையின் உள்ளங்கை அல்லது உள்ளங்கால் மஞ்சளாக இருக்கிறதா?' }
];

NB.ADVICE = {
  RED: [
    ['Take baby to the hospital now. Call 108.', 'இப்போதே குழந்தையை மருத்துவமனைக்கு அழைத்துச் செல்லுங்கள். 108-ஐ அழையுங்கள்.'],
    ['Keep baby skin-to-skin on your chest, covered, with a cap.', 'குழந்தையை உங்கள் மார்பில் தோலோடு தோல் வைத்து, போர்த்தி, தொப்பி அணிவியுங்கள்.'],
    ['If baby can feed, keep breastfeeding on the way.', 'குழந்தை பால் குடிக்க முடிந்தால், வழியிலும் தாய்ப்பால் கொடுங்கள்.']
  ],
  AMBER: [
    ['Do skin-to-skin now and check baby again in 1 hour.', 'இப்போதே தோலோடு தோல் அணைப்பு செய்து, 1 மணி நேரத்தில் மீண்டும் பாருங்கள்.'],
    ['Your ASHA worker will be told and should visit today.', 'உங்கள் ஆஷா பணியாளருக்குத் தெரிவிக்கப்படும்; இன்று வருவார்.']
  ],
  GREEN: [
    ['Baby looks okay today. Keep up skin-to-skin.', 'இன்று குழந்தை நலமாக உள்ளது. தோலோடு தோல் அணைப்பைத் தொடருங்கள்.'],
    ['Feed every 2–3 hours, day and night.', 'இரவும் பகலும் 2–3 மணி நேரத்திற்கு ஒருமுறை பால் கொடுங்கள்.']
  ]
};

// Follow-up schedule 
NB.followUps = function (b, logs, now) {
  now = now || Date.now();
  const birth = NB.parseYmd(b.birthDate), dis = NB.parseYmd(b.dischargeDate);
  const items = [
    { key: 'v1', en: 'Home visit 1 (24 h after discharge)', due: dis + NB.DAY },
    { key: 'v2', en: 'Home visit 2 (1 week after visit 1)', due: dis + 8 * NB.DAY },
    { key: 'v3', en: 'Home visit 3 (6 weeks of age)', due: birth + 42 * NB.DAY },
    { key: 'vax6', en: '6-week vaccines', due: birth + 42 * NB.DAY }
  ];
  if (b.gestWeeks < 34 || b.birthWeight < 1.75) {
    items.push({ key: 'rop', en: 'Eye (ROP) screening, by day 30 of life', due: birth + 30 * NB.DAY });
  }
  const done = {};
  logs.filter(l => l.type === 'visit').forEach(l => { done[l.key] = l.ts; });
  const today = NB.startOfToday();
  return items.map(it => Object.assign(it, {
    doneAt: done[it.key] || null,
    status: done[it.key] ? 'done' : (it.due < today ? 'overdue' : (it.due < today + NB.DAY ? 'today' : 'upcoming'))
  })).sort((a, c) => a.due - c.due);
};

// Main assessment: returns
NB.assess = function (b, st, now) {
  now = now || Date.now();
  const L = NB.LIMITS, R = [];
  const add = (level, en, ta, code) => R.push({ level, en, ta, code: code || en });
  const logs = Object.values(st.logs || {}).filter(l => l.babyId === b.id);

  // 1) Mother's daily check (last 24 hours)
  const check = logs.filter(l => l.type === 'check').sort((x, y) => y.ts - x.ts)[0];
  const recentCheck = check && now - check.ts < NB.DAY ? check : null;
  if (recentCheck) {
    NB.SIGNS.forEach(s => { if (recentCheck.answers && recentCheck.answers[s.key] === true) add('RED', s.en, s.ta, 'sign-' + s.key); });
  } else {
    add('INFO', 'Daily check not done in the last 24 hours', 'இன்றைய சோதனை இன்னும் செய்யவில்லை', 'nocheck');
  }

  // 2) NeoBelt readings
  const r = (st.belt || {})[b.id];
  const live = r && now - r.ts < L.beltFreshMs ? r : null;
  if (live) {
    if (live.apnea) add('RED', 'Breathing pause of 20 seconds or more (belt)', '20 விநாடிக்கு மேல் மூச்சு நின்றது (பெல்ட்)', 'belt-apnea');
    if (live.t > 0 && live.t < L.coldRed) add('RED', `Too cold: ${live.t.toFixed(1)}°C (belt)`, `மிகவும் குளிர்: ${live.t.toFixed(1)}°C (பெல்ட்)`, 'belt-cold');
    else if (live.t >= L.hotRed) add('RED', `Too hot: ${live.t.toFixed(1)}°C (belt)`, `அதிக சூடு: ${live.t.toFixed(1)}°C (பெல்ட்)`, 'belt-hot');
    else if (live.t > 0 && live.t < L.coolAmber) add('AMBER', `Slightly cold: ${live.t.toFixed(1)}°C (belt)`, `சற்று குளிர்: ${live.t.toFixed(1)}°C (பெல்ட்)`, 'belt-cool');
    if (!live.apnea && live.br >= L.fastBreath) add('RED', `Fast breathing: ${live.br} per minute (belt)`, `வேகமான மூச்சு: நிமிடத்திற்கு ${live.br} (பெல்ட்)`, 'belt-fast');
  }

  // 3) Weight trend
  const ws = logs.filter(l => l.type === 'weight').sort((x, y) => x.ts - y.ts);
  if (ws.length >= 2) {
    const last = ws[ws.length - 1], prev = ws[ws.length - 2];
    if (last.kg < prev.kg) add('AMBER', 'Weight went down since last entry', 'கடைசி பதிவை விட எடை குறைந்துள்ளது');
    else {
      const old = ws.filter(w => last.ts - w.ts >= 3 * NB.DAY - 3600000).pop();
      if (old && last.kg <= old.kg) add('AMBER', 'No weight gain in 3 days', '3 நாட்களாக எடை கூடவில்லை');
    }
  }

  // 4) Missed follow-ups
  const fu = NB.followUps(b, logs, now);
  fu.filter(f => f.status === 'overdue').forEach(f => add('AMBER', `Overdue: ${f.en}`, `தவறிய வருகை: ${f.en}`, 'overdue-' + f.key));

  // Today's skin-to-skin and feeds
  const today = NB.startOfToday();
  const kmcToday = logs.filter(l => l.type === 'kmc' && l.ts >= today).reduce((s, l) => s + (l.hours || 0), 0);
  const feedsToday = logs.filter(l => l.type === 'feed' && l.ts >= today).length;

  const level = R.some(x => x.level === 'RED') ? 'RED' : R.some(x => x.level === 'AMBER') ? 'AMBER' : 'GREEN';

  // Risk score 0-100 (used to sort the ASHA list)
  let score = 0;
  if (level === 'RED') score += 50;
  score += R.filter(x => x.level === 'RED').length * 10;
  score += R.filter(x => x.level === 'AMBER').length * 12;
  if (!recentCheck) score += 8;
  if (kmcToday < (window.NB_CONFIG && NB_CONFIG.kmcTargetHours || 12) / 2) score += 8;
  if (b.gestWeeks < 32) score += 5;
  if (b.birthWeight < 1.5) score += 5;
  score = Math.min(100, score);

  return { level, reasons: R, score, kmcToday, feedsToday, belt: live, check: recentCheck, weights: ws, followUps: fu };
};
