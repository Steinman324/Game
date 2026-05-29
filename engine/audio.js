let _ctx = null;
let _ready = false;

function getCtx() {
  if (_ctx) return _ctx;
  try {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
    _ready = true;
  } catch (e) { _ready = false; }
  return _ctx;
}

function beep(freq, dur, type = 'square', vol = 0.15, startDelay = 0) {
  if (!_ready) return;
  try {
    const c = getCtx(); if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain); gain.connect(c.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + startDelay);
    gain.gain.setValueAtTime(vol, c.currentTime + startDelay);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + startDelay + dur);
    osc.start(c.currentTime + startDelay);
    osc.stop(c.currentTime + startDelay + dur);
  } catch (e) {}
}

function noise(dur, vol = 0.12, startDelay = 0) {
  if (!_ready) return;
  try {
    const c = getCtx(); if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1);
    const src = c.createBufferSource();
    src.buffer = buf;
    const gain = c.createGain();
    src.connect(gain); gain.connect(c.destination);
    gain.gain.setValueAtTime(vol, c.currentTime + startDelay);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + startDelay + dur);
    src.start(c.currentTime + startDelay);
  } catch (e) {}
}

export function initAudio() {
  const wake = () => { getCtx(); };
  document.addEventListener('keydown', wake, { once: true });
  document.addEventListener('mousedown', wake, { once: true });
}

export function playSound(name) {
  try {
    switch (name) {
      case 'shoot':
        noise(0.07, 0.25);
        beep(160, 0.06, 'sawtooth', 0.12);
        beep(90, 0.08, 'square', 0.06, 0.04);
        break;
      case 'hurt':
        beep(220, 0.08, 'square', 0.28);
        beep(160, 0.12, 'square', 0.18, 0.06);
        break;
      case 'death':
        beep(350, 0.04, 'square', 0.2);
        beep(220, 0.08, 'square', 0.15, 0.04);
        beep(110, 0.18, 'sawtooth', 0.1, 0.1);
        noise(0.15, 0.08, 0.05);
        break;
      case 'alert':
        beep(700, 0.07, 'square', 0.14);
        beep(900, 0.07, 'square', 0.14, 0.09);
        beep(700, 0.07, 'square', 0.1, 0.18);
        break;
      case 'door':
        beep(90, 0.05, 'sawtooth', 0.1);
        beep(70, 0.15, 'sawtooth', 0.08, 0.04);
        noise(0.25, 0.05, 0.02);
        beep(55, 0.2, 'sawtooth', 0.06, 0.1);
        break;
      case 'pickup':
        beep(660, 0.07, 'sine', 0.2);
        beep(880, 0.09, 'sine', 0.18, 0.07);
        beep(1100, 0.12, 'sine', 0.15, 0.14);
        break;
      case 'step':
        noise(0.03, 0.06);
        break;
    }
  } catch (e) {}
}
