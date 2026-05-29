import { Config } from './config.js';

let _ctx = null;
let _droneOsc = null;
let _droneGain = null;
let _ready = false;

function getCtx() {
  if (_ctx) return _ctx;
  try {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
    _ready = true;
  } catch (e) { _ready = false; }
  return _ctx;
}

function beep(freq, dur, type = 'sine', vol = 0.1, delay = 0) {
  if (!_ready) return;
  try {
    const c = getCtx(); if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain); gain.connect(c.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + delay);
    gain.gain.setValueAtTime(vol, c.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + dur);
  } catch (e) {}
}

function startDrone() {
  if (!_ready || _droneOsc) return;
  try {
    const c = getCtx(); if (!c) return;
    _droneOsc = c.createOscillator();
    _droneGain = c.createGain();
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 200;
    _droneOsc.connect(filter);
    filter.connect(_droneGain);
    _droneGain.connect(c.destination);
    _droneOsc.type = 'sine';
    _droneOsc.frequency.setValueAtTime(Config.BASE_DRONE_HZ, c.currentTime);
    _droneGain.gain.setValueAtTime(0.0, c.currentTime);
    _droneGain.gain.linearRampToValueAtTime(0.06, c.currentTime + 2.0);
    _droneOsc.start();
  } catch (e) {}
}

export function initAudio() {
  const wake = () => {
    getCtx();
    startDrone();
  };
  document.addEventListener('keydown', wake, { once: true });
  document.addEventListener('mousedown', wake, { once: true });
  document.addEventListener('click', wake, { once: true });
}

export function updateDroneFrequency(nearestResonatorDist) {
  if (!_ready || !_droneOsc || !_ctx) return;
  try {
    const proximity = Math.max(0, 1 - nearestResonatorDist / Config.RESONATOR_RANGE);
    const targetFreq = Config.BASE_DRONE_HZ + proximity * Config.DRONE_PROXIMITY_SCALE;
    _droneOsc.frequency.linearRampToValueAtTime(targetFreq, _ctx.currentTime + 0.5);
  } catch (e) {}
}

export function playScanSuccess() {
  beep(440, 0.12, 'sine', 0.12);
  beep(660, 0.14, 'sine', 0.10, 0.12);
  beep(880, 0.20, 'sine', 0.08, 0.24);
}

export function playDisplace() {
  beep(220, 0.3, 'sine', 0.14);
  beep(110, 0.5, 'sine', 0.12, 0.22);
  beep(55,  0.8, 'sine', 0.08, 0.55);
}
