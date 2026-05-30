let _ctx = null;
let _droneOsc = null;
let _droneGain = null;
let _ready = false;

function getAudioCtx() {
  if (_ctx) return _ctx;
  try {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
    _ready = true;
  } catch (e) { _ready = false; }
  return _ctx;
}

function beep(freq, dur, type = 'sine', vol = 0.12, delay = 0) {
  if (!_ready) return;
  try {
    const c = getAudioCtx(); if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain); gain.connect(c.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + delay);
    gain.gain.setValueAtTime(vol, c.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + delay + dur);
    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + dur + 0.02);
  } catch (e) {}
}

export function initAudio() {
  const wake = () => {
    const c = getAudioCtx();
    if (!c || _droneOsc) return;
    try {
      _droneOsc = c.createOscillator();
      _droneGain = c.createGain();
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;

      _droneOsc.type = 'sawtooth';
      _droneOsc.frequency.value = 82;
      _droneGain.gain.value = 0.04;
      _droneOsc.connect(filter);
      filter.connect(_droneGain);
      _droneGain.connect(c.destination);
      _droneOsc.start();
    } catch (e) {}
  };
  document.addEventListener('keydown', wake, { once: true });
  document.addEventListener('mousedown', wake, { once: true });
}

export function updateDroneFreq(nearestResonatorDist, resonatorRange, baseHz) {
  if (!_ready || !_droneOsc) return;
  try {
    const c = getAudioCtx(); if (!c) return;
    let freq = baseHz;
    if (nearestResonatorDist < resonatorRange) {
      const t = 1 - nearestResonatorDist / resonatorRange;
      freq = baseHz + t * 45;
    }
    _droneOsc.frequency.setTargetAtTime(freq, c.currentTime, 0.5);
  } catch (e) {}
}

export function playScanSuccess() {
  if (!_ready) return;
  try {
    // Short ascending tones — mysterious
    beep(220,  0.18, 'sine',     0.12, 0.0);
    beep(330,  0.18, 'sine',     0.10, 0.18);
    beep(440,  0.28, 'sine',     0.08, 0.36);
    beep(660,  0.40, 'triangle', 0.06, 0.54);
  } catch (e) {}
}

export function playDisplacement() {
  if (!_ready) return;
  try {
    // Descending sweep with noise burst
    const c = getAudioCtx(); if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain); gain.connect(c.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, c.currentTime + 1.2);
    gain.gain.setValueAtTime(0.18, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.4);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 1.5);
  } catch (e) {}
}

export function playScanTick() {
  if (!_ready) return;
  try {
    beep(880, 0.04, 'sine', 0.05, 0);
  } catch (e) {}
}
