import { Config } from './config.js';
import { ANOMALY_CONFIGS } from './map.js';
import { isWall, getCell } from './map.js';

// ── factory ────────────────────────────────────────────────────────────────────

export function createAnomalies() {
  return ANOMALY_CONFIGS.map((cfg, i) => {
    const base = {
      id: i,
      type: cfg.type,
      x: cfg.x,
      y: cfg.y,
      scanned: false,
      state: 'IDLE',
      stateTimer: 0,
    };
    switch (cfg.type) {
      case 'WANDERER':
        return { ...base, anchorX: cfg.anchorX, anchorY: cfg.anchorY,
                 orbitAngle: cfg.orbitAngle ?? 0 };
      case 'OBSERVER':
        return { ...base, facingAngle: cfg.facingAngle ?? 0 };
      case 'ECHO': {
        const trail = new Array(Config.ECHO_TRAIL_LENGTH).fill(null);
        return { ...base, trail, trailHead: 0, sampleTimer: 0 };
      }
      case 'RESONATOR':
        return { ...base, pulsePhase: cfg.pulsePhase ?? 0 };
      default:
        return base;
    }
  });
}

// ── line of sight ──────────────────────────────────────────────────────────────

export function hasLoS(x1, y1, x2, y2, mapState) {
  const dx = x2 - x1, dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(dist * 6);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const cx = Math.floor(x1 + dx * t);
    const cy = Math.floor(y1 + dy * t);
    const cell = getCell(mapState, cx, cy);
    if (cell > 0 && cell !== Config.CELL_DOOR) return false;
    if (cell === Config.CELL_DOOR) {
      const door = mapState.doors[`${cx},${cy}`];
      if (!door || door.offset < 0.5) return false;
    }
  }
  return true;
}

// ── update ─────────────────────────────────────────────────────────────────────

export function updateAnomalies(anomalies, player, mapState, delta, totalTime) {
  for (const a of anomalies) {
    a.stateTimer += delta;

    switch (a.type) {
      case 'WANDERER':   updateWanderer(a, player, mapState, delta, totalTime); break;
      case 'OBSERVER':   updateObserver(a, player, mapState, delta); break;
      case 'ECHO':       updateEcho(a, player, delta, totalTime); break;
      case 'RESONATOR':  updateResonator(a, delta); break;
    }
  }
}

function updateWanderer(a, player, mapState, delta, totalTime) {
  a.orbitAngle += Config.WANDERER_ORBIT_SPEED * delta;
  a.x = a.anchorX + Config.WANDERER_ORBIT_RADIUS * Math.cos(a.orbitAngle);
  a.y = a.anchorY + Config.WANDERER_ORBIT_RADIUS * Math.sin(a.orbitAngle);

  const dx = player.x - a.anchorX, dy = player.y - a.anchorY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < Config.WANDERER_ACTIVATE_RANGE) {
    if (a.state === 'IDLE') a.state = 'ACTIVE';
  } else {
    a.state = 'IDLE';
  }
}

function updateObserver(a, player, mapState, delta) {
  const dx = player.x - a.x, dy = player.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const inRange = dist < Config.OBSERVER_RANGE;
  const los = inRange && hasLoS(a.x, a.y, player.x, player.y, mapState);

  if (los) {
    if (a.state === 'IDLE') a.state = 'ACTIVE';
    // Lerp facing angle toward player
    const targetAngle = Math.atan2(dy, dx);
    let diff = targetAngle - a.facingAngle;
    while (diff > Math.PI)  diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    a.facingAngle += diff * Math.min(1, Config.OBSERVER_ROT_SPEED * delta);
  } else if (!inRange) {
    a.state = 'IDLE';
  }
}

function updateEcho(a, player, delta, totalTime) {
  // Sample player position at interval
  a.sampleTimer = (a.sampleTimer ?? 0) + delta * 1000;
  if (a.sampleTimer >= Config.ECHO_SAMPLE_INTERVAL) {
    a.sampleTimer = 0;
    // O(1) circular buffer insert
    a.trail[a.trailHead] = { x: player.x, y: player.y };
    a.trailHead = (a.trailHead + 1) % Config.ECHO_TRAIL_LENGTH;
  }
}

function updateResonator(a, delta) {
  a.pulsePhase += Math.PI * 2 * Config.RESONATOR_PULSE_HZ * delta;
  if (a.pulsePhase > Math.PI * 100) a.pulsePhase -= Math.PI * 100;
}

// ── scan ───────────────────────────────────────────────────────────────────────

export function findScanTarget(anomalies, player, mapState) {
  let best = null, bestDist = Infinity;

  for (const a of anomalies) {
    if (a.scanned && a.type !== 'ECHO') continue; // Echo can be re-scanned but won't add new entries
    const dx = a.x - player.x, dy = a.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > Config.SCAN_RANGE) continue;

    // Angle check: is anomaly within scan cone?
    const dot = (dx / dist) * player.dirX + (dy / dist) * player.dirY;
    if (dot < Math.cos(Config.SCAN_FOV_HALF)) continue;

    if (!hasLoS(player.x, player.y, a.x, a.y, mapState)) continue;

    if (dist < bestDist) { bestDist = dist; best = a; }
  }
  return best;
}

// ── sprite list for renderer ───────────────────────────────────────────────────

export function buildAnomalySprites(anomalies, textures, totalTime) {
  const sprites = [];
  for (const a of anomalies) {
    if (a.type === 'ECHO') {
      // Ghost trail: each non-null trail entry becomes a translucent sprite
      for (let i = 0; i < Config.ECHO_TRAIL_LENGTH; i++) {
        const pos = a.trail[i];
        if (!pos) continue;
        // Older entries are more faded
        const age = ((a.trailHead - i + Config.ECHO_TRAIL_LENGTH) % Config.ECHO_TRAIL_LENGTH);
        const alpha = Math.max(0, 1 - age / Config.ECHO_TRAIL_LENGTH);
        sprites.push({ x: pos.x, y: pos.y, texture: textures.echo, alpha, scale: 0.6 });
      }
      continue;
    }
    const tex = textures[a.type.toLowerCase()];
    sprites.push({ x: a.x, y: a.y, texture: tex, scale: 0.85, anomaly: a });
  }
  return sprites;
}
