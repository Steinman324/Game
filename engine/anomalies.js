import { Config } from './config.js';
import { getAimDot } from './player.js';
import { isWall } from './map.js';

// Circular buffer for Echo trail
class CircularBuffer {
  constructor(size) {
    this.buf = new Array(size).fill(null);
    this.size = size;
    this.head = 0;
    this.count = 0;
  }
  push(v) {
    this.buf[this.head] = v;
    this.head = (this.head + 1) % this.size;
    if (this.count < this.size) this.count++;
  }
  toArray() {
    const out = [];
    const start = this.count < this.size ? 0 : this.head;
    for (let i = 0; i < this.count; i++) {
      out.push(this.buf[(start + i) % this.size]);
    }
    return out;
  }
}

export function createAnomalies(spawns) {
  return spawns.map((sp, idx) => {
    const base = {
      id: idx, type: sp.type, state: Config.ANOM_IDLE,
      x: sp.cx, y: sp.cy, angle: 0, scanned: false, scanProgress: 0,
    };
    switch (sp.type) {
      case Config.ANOM_WANDERER:
        return { ...base, cx: sp.cx, cy: sp.cy, orbitRadius: sp.orbitRadius || Config.WANDERER_ORBIT_RADIUS, t: Math.random() * Math.PI * 2 };
      case Config.ANOM_OBSERVER:
        return { ...base, facingAngle: 0 };
      case Config.ANOM_ECHO:
        return { ...base, trail: new CircularBuffer(Config.ECHO_TRAIL_LENGTH), sampleTimer: 0 };
      case Config.ANOM_RESONATOR:
        return { ...base, phase: Math.random() * Math.PI * 2, wallCell: sp.wallCell || null };
      default:
        return base;
    }
  });
}

function hasLOS(ax, ay, bx, by, mapState) {
  const dx = bx - ax, dy = by - ay;
  const steps = Math.ceil(Math.sqrt(dx * dx + dy * dy) * 4);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const cx = ax + dx * t, cy = ay + dy * t;
    const cell = mapState.grid[Math.floor(cy)]?.[Math.floor(cx)];
    if (cell && cell !== 0 && cell !== 5 && cell !== 9) return false;
  }
  return true;
}

export function updateAnomalies(anomalies, player, mapState, delta, totalTime, onScanComplete) {
  for (const a of anomalies) {
    switch (a.type) {
      case Config.ANOM_WANDERER:
        updateWanderer(a, delta, totalTime);
        break;
      case Config.ANOM_OBSERVER:
        updateObserver(a, player, mapState, delta);
        break;
      case Config.ANOM_ECHO:
        updateEcho(a, player, delta, totalTime);
        break;
      case Config.ANOM_RESONATOR:
        updateResonator(a, delta, totalTime);
        break;
    }
    updateScan(a, player, mapState, delta, onScanComplete);
  }
}

function updateWanderer(a, delta, totalTime) {
  a.t += Config.WANDERER_ORBIT_SPEED * delta;
  a.x = a.cx + Math.cos(a.t) * a.orbitRadius;
  a.y = a.cy + Math.sin(a.t) * a.orbitRadius;
}

function updateObserver(a, player, mapState, delta) {
  const dx = player.x - a.x, dy = player.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < Config.OBSERVER_RANGE && hasLOS(a.x, a.y, player.x, player.y, mapState)) {
    a.state = Config.ANOM_ACTIVE;
    const targetAngle = Math.atan2(dy, dx);
    let diff = targetAngle - a.facingAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    a.facingAngle += diff * Math.min(1, Config.OBSERVER_LERP * delta);
  } else {
    a.state = Config.ANOM_IDLE;
  }
}

function updateEcho(a, player, delta, totalTime) {
  a.sampleTimer += delta * 1000;
  if (a.sampleTimer >= Config.ECHO_SAMPLE_INTERVAL) {
    a.sampleTimer -= Config.ECHO_SAMPLE_INTERVAL;
    a.trail.push({ x: player.x, y: player.y });
  }
}

function updateResonator(a, delta, totalTime) {
  a.phase += Config.RESONATOR_PULSE_HZ * Math.PI * 2 * delta;
}

function updateScan(a, player, mapState, delta, onScanComplete) {
  if (a.scanned) return;
  const dx = a.x - player.x, dy = a.y - player.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const inRange = dist < Config.SCAN_RANGE;
  const aimed = getAimDot(player, a.x, a.y) >= Config.SCAN_AIM_DOT;
  const los = inRange && hasLOS(player.x, player.y, a.x, a.y, mapState);

  if (inRange && aimed && los && player.scanHeld) {
    a.scanProgress = Math.min(1, a.scanProgress + delta / Config.SCAN_DURATION);
    a.state = Config.ANOM_RESPONDING;
    if (a.scanProgress >= 1) {
      a.scanned = true;
      if (onScanComplete) onScanComplete(a);
    }
  } else {
    a.scanProgress = Math.max(0, a.scanProgress - delta * 1.5);
    if (dist >= Config.SCAN_RANGE || !los) a.state = Config.ANOM_IDLE;
    else if (aimed) a.state = Config.ANOM_ACTIVE;
  }
}

export function buildAnomalySprites(anomalies, textures) {
  const sprites = [];
  for (const a of anomalies) {
    if (a.type === Config.ANOM_ECHO) {
      const trail = a.trail.toArray();
      for (let i = 0; i < trail.length; i++) {
        const alpha = (i + 1) / trail.length * 0.55;
        sprites.push({ x: trail[i].x, y: trail[i].y, texture: textures.anomaly_echo, scale: 0.5 * Config.ANOMALY_SPRITE_SCALE, alpha });
      }
      sprites.push({ x: a.x, y: a.y, texture: textures.anomaly_echo, scale: Config.ANOMALY_SPRITE_SCALE, alpha: 0.7 });
    } else if (a.type === Config.ANOM_RESONATOR) {
      // Resonator is wall-embedded, no billboard sprite
    } else {
      const tex = textures[`anomaly_${a.type}`] || textures.anomaly_wanderer;
      sprites.push({ x: a.x, y: a.y, texture: tex, scale: Config.ANOMALY_SPRITE_SCALE, alpha: 1.0, anomaly: a });
    }
  }
  return sprites;
}

export function getResonatorWarp(anomalies, col, W, player, totalTime) {
  let warp = 0;
  for (const a of anomalies) {
    if (a.type !== Config.ANOM_RESONATOR) continue;
    const dx = a.x - player.x, dy = a.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > Config.RESONATOR_RANGE) continue;
    const strength = 1 - dist / Config.RESONATOR_RANGE;
    warp += Config.RESONATOR_WARP_AMT * strength * Math.sin(a.phase);
  }
  return warp;
}

export function getNearestResonatorDist(anomalies, player) {
  let minDist = Infinity;
  for (const a of anomalies) {
    if (a.type !== Config.ANOM_RESONATOR) continue;
    const dx = a.x - player.x, dy = a.y - player.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

export function getTargetedAnomaly(anomalies, player, mapState) {
  let best = null, bestDot = Config.SCAN_AIM_DOT - 0.01;
  for (const a of anomalies) {
    if (a.scanned) continue;
    const dx = a.x - player.x, dy = a.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > Config.SCAN_RANGE) continue;
    const dot = getAimDot(player, a.x, a.y);
    if (dot > bestDot && hasLOS(player.x, player.y, a.x, a.y, mapState)) {
      bestDot = dot; best = a;
    }
  }
  return best;
}
