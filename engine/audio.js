let _ctx = null;
let _ready = false;

function getCtx() {
  if (_ctx) return _ctx;
  try {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
    _ready = true;
  } catch (e) {
    _ready = false;
  }
  return _ctx;
}

function beep(freq, duration, type = 'square', gainVal = 0.15) {
  if (!_ready) return;
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) { /* degrade gracefully */ }
}

function noise(duration, gainVal = 0.1) {
  if (!_ready) return;
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const bufLen = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    src.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    src.start(ctx.currentTime);
  } catch (e) { /* degrade gracefully */ }
}

export function initAudio() {
  // Audio context must be created on user gesture
  document.addEventListener('keydown', () => getCtx(), { once: true });
  document.addEventListener('mousedown', () => getCtx(), { once: true });
}

export function playSound(name) {
  try {
    switch (name) {
      case 'shoot':
        noise(0.08, 0.2);
        beep(180, 0.05, 'sawtooth', 0.1);
        break;
      case 'hurt':
        beep(200, 0.15, 'square', 0.3);
        beep(150, 0.1, 'square', 0.2);
        break;
      case 'death':
        beep(400, 0.05, 'square', 0.2);
        beep(200, 0.1, 'square', 0.15);
        beep(100, 0.2, 'square', 0.1);
        break;
      case 'alert':
        beep(600, 0.1, 'square', 0.15);
        setTimeout(() => beep(800, 0.1, 'square', 0.15), 120);
        break;
      case 'door':
        beep(80, 0.3, 'sawtooth', 0.1);
        break;
      case 'step':
        beep(60, 0.03, 'square', 0.05);
        break;
    }
  } catch (e) { /* degrade gracefully */ }
}
