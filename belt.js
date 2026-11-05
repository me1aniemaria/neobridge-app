

window.NB = window.NB || {};
NB.belt = (function () {
  const SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
  const NOTIFY = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
  let status = 'off', device = null, simTimer = null;
  let sim = { mode: 'normal', pauseStart: 0, pauses: 0, temp: 36.7 };
  const readingFns = [], statusFns = [];

  function setStatus(s) { status = s; statusFns.forEach(f => f(s)); }
  function emit(r) { r.ts = Date.now(); readingFns.forEach(f => f(r)); }

  function parse(text) {
    const p = String(text).trim().split(',');
    if (p.length < 2) return;
    emit({ br: Math.round(+p[0] || 0), t: Math.round((+p[1] || 0) * 10) / 10, apnea: p[2] === '1', pauses: +p[3] || 0 });
  }

  async function connect() {
    if (!navigator.bluetooth) throw new Error('Bluetooth is not available here. Use Chrome on Android or a laptop, opened from an https:// link.');
    device = await navigator.bluetooth.requestDevice({ filters: [{ namePrefix: 'NeoBelt' }], optionalServices: [SERVICE] });
    stopSim();
    
    device.addEventListener('gattserverdisconnected', onDisconnected);
    setStatus('connecting');
    await attach();
  }
  async function attach() {
    const server = await device.gatt.connect();
    const svc = await server.getPrimaryService(SERVICE);
    const ch = await svc.getCharacteristic(NOTIFY);
    ch.addEventListener('characteristicvaluechanged', e => parse(new TextDecoder().decode(e.target.value)));
    await ch.startNotifications();
    setStatus('ble');
  }
  function onDisconnected() {
    if (!device || status === 'off') return;
    setStatus('reconnecting');
    let tries = 0;
    const retry = () => {
      if (!device || status !== 'reconnecting') return;
      attach().catch(() => { if (++tries < 10) setTimeout(retry, 2000); else setStatus('off'); });
    };
    setTimeout(retry, 1000);
  }
  function disconnect() {
    stopSim();
    const d = device; device = null;
    setStatus('off');
    try { if (d && d.gatt.connected) d.gatt.disconnect(); } catch (e) {}
  }

  // ----- Demo belt -----
  function startSim() {
    disconnect();
    sim = { mode: 'normal', pauseStart: 0, pauses: 0, temp: 36.7 };
    simTimer = setInterval(tick, 2000);
    setStatus('sim'); tick();
  }
  function stopSim() { if (simTimer) { clearInterval(simTimer); simTimer = null; } }
  function tick() {
    const now = Date.now();
    let br, apnea = false, ps = 0;
    if (sim.mode === 'pause') { br = 0; ps = Math.round((now - sim.pauseStart) / 1000); apnea = ps >= 20; }
    else br = 38 + Math.round(Math.random() * 8);
    const target = sim.mode === 'cold' ? 35.1 : 36.7;
    sim.temp += (target - sim.temp) * 0.4 + (Math.random() - 0.5) * 0.06;
    emit({ br, t: Math.round(sim.temp * 10) / 10, apnea, pauses: sim.pauses, ps });
  }
  function simPause() { if (status !== 'sim') return; sim.mode = 'pause'; sim.pauseStart = Date.now(); sim.pauses++; tick(); }
  function simCold() { if (status !== 'sim') return; sim.mode = 'cold'; tick(); }
  function simNormal() { if (status !== 'sim') return; sim.mode = 'normal'; tick(); }

  return {
    connect, disconnect, startSim, simPause, simCold, simNormal,
    onReading: f => readingFns.push(f), onStatus: f => statusFns.push(f),
    get status() { return status; }, get simMode() { return sim.mode; }
  };
})();
