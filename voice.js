

window.NB = window.NB || {};
NB.voice = (function () {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const YES = ['ஆமாம்', 'ஆமா', 'ஆம்', 'ஆமாங்க', 'yes', 'yeah', 'yep', 'haan', 'aamaa', 'aama', 'aam', 'amam'];
  const NO = ['இல்லை', 'இல்ல', 'இல்லீங்க', 'இல்லைங்க', 'no', 'nope', 'illa', 'illai', 'nahi', 'not'];

  function listen(lang) {
    return new Promise((resolve, reject) => {
      if (!SR) return reject(new Error('Voice input needs Chrome. Please tap Yes or No.'));
      const r = new SR();
      r.lang = lang; r.interimResults = false; r.maxAlternatives = 3;
      let done = false;
      r.onresult = e => { done = true; const alts = []; for (const a of e.results[0]) alts.push(a.transcript); resolve(alts); };
      r.onerror = e => {
        done = true;
        reject(new Error(e.error === 'not-allowed' ? 'Microphone permission is blocked. Allow it, or tap Yes / No.'
          : e.error === 'no-speech' ? 'Did not hear anything. Please try again.' : 'Voice problem (' + e.error + '). Please tap Yes / No.'));
      };
      r.onend = () => { if (!done) resolve([]); };
      try { r.start(); } catch (e) { reject(e); }
    });
  }

  // Returns true (yes), false (no) or null (not sure)
  function yesNo(alts) {
    for (const raw of alts || []) {
      const t = ' ' + String(raw).toLowerCase().replace(/[.,!?]/g, ' ') + ' ';
      if (NO.some(w => t.includes(/^[a-z]+$/.test(w) ? ' ' + w + ' ' : w))) return false;
      if (YES.some(w => t.includes(/^[a-z]+$/.test(w) ? ' ' + w + ' ' : w))) return true;
    }
    return null;
  }

  function speak(ta, en, lang) {
    if (!window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      const voices = speechSynthesis.getVoices();
      const hasTa = voices.some(v => v.lang && v.lang.toLowerCase().startsWith('ta'));
      const useTa = lang === 'ta' && hasTa && ta;
      const u = new SpeechSynthesisUtterance(useTa ? ta : en);
      u.lang = useTa ? 'ta-IN' : 'en-IN';
      const v = voices.find(x => x.lang && x.lang.toLowerCase().startsWith(useTa ? 'ta' : 'en'));
      if (v) u.voice = v;
      u.rate = 0.95;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  // Optional: Gemini turns the mother's own words into yes / no / null per danger sign.
  async function gemini(text) {
    const cfg = window.NB_CONFIG || {};
    if (!cfg.geminiApiKey) return null;
    const signs = NB.SIGNS.map(s => `- ${s.key}: ${s.en}`).join('\n');
    const prompt = 'A mother describes her newborn baby today, in Tamil or English. For each danger sign below, answer true if she says it is present, false if she says it is absent, or null if she does not mention it. Do not guess. Reply with only a JSON object with exactly these keys.\n'
      + signs + '\n\nMother said: """' + text + '"""';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.geminiModel || 'gemini-2.5-flash')}:generateContent?key=${encodeURIComponent(cfg.geminiApiKey)}`;
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0 } })
    });
    if (!res.ok) throw new Error('AI error ' + res.status);
    const j = await res.json();
    const raw = j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts[0].text;
    const o = JSON.parse(raw || '{}');
    const out = {};
    NB.SIGNS.forEach(s => { out[s.key] = (o[s.key] === true || o[s.key] === false) ? o[s.key] : null; });
    return out;
  }

  return { listen, yesNo, speak, gemini, canListen: !!SR, hasAI: () => !!(window.NB_CONFIG && NB_CONFIG.geminiApiKey) };
})();
