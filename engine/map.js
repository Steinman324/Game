import { Config } from './config.js';

// 0=empty  1=concrete  2=teal-trim  3=bio-vein  4=symbol-panel  9=door
export const MAP_DATA = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 0
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1], // 1
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1], // 2
  [1,0,0,0,0,0,9,0,0,0,0,0,0,0,0,0,0,9,0,0,0,0,0,1], // 3
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1], // 4
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1], // 5
  [1,1,9,1,1,1,1,2,2,2,2,2,2,2,2,2,2,1,1,1,9,1,1,1], // 6
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 7
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 8
  [1,0,0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,0,1], // 9
  [1,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,1], // 10
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 11
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 12
  [1,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,1], // 13
  [1,0,0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,0,1], // 14
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 15
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 16
  [1,1,9,1,1,1,1,2,2,2,2,2,2,2,2,2,2,1,1,1,9,1,1,1], // 17
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1], // 18
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1], // 19
  [1,0,0,0,0,0,9,0,0,0,4,4,4,4,0,0,0,9,0,0,0,0,0,1], // 20
  [1,0,0,0,0,0,1,0,0,0,4,0,0,4,0,0,0,1,0,0,0,0,0,1], // 21
  [1,0,0,0,0,0,1,0,0,0,4,4,4,4,0,0,0,1,0,0,0,0,0,1], // 22
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 23
];

// Named positions for anchor and low-signal logic
export const ANCHOR_POINTS = [
  { x: 2.5, y: 2.5 },
  { x: 21.5, y: 2.5 },
  { x: 2.5, y: 21.5 },
  { x: 11.5, y: 11.5 },
];

// Axis-aligned rectangles (inclusive) where signal drains
export const LOW_SIGNAL_ZONES = [
  { x1: 7, y1: 7, x2: 16, y2: 16 },
];

// One-time log triggers when player enters zone
export const TRIGGER_ZONES = [
  {
    id: 'impossible_sw',
    x1: 1, y1: 18, x2: 5, y2: 22,
    fired: false,
    entry: "MEASUREMENT ANOMALY — SECTOR SW\nCalculated interior volume: 14.6 m³\nMeasured interior: 58.4 m³\nDiscrepancy factor: 3.99\nConclusion: spatial topology non-Euclidean.\nThis room is larger on the inside than physics permits.",
  },
  {
    id: 'central_hall',
    x1: 7, y1: 7, x2: 16, y2: 16,
    fired: false,
    entry: "ENVIRONMENTAL NOTE — CENTRAL SECTOR\nSignal attenuation detected. Maintain anchor proximity.\nAnomalous entity density: elevated.\nAdvisory: do not linger.",
  },
  {
    id: 'symbol_alcove',
    x1: 10, y1: 20, x2: 13, y2: 22,
    fired: false,
    entry: "SYMBOL ANALYSIS — ALCOVE\nPatterns do not correspond to any catalogued notation system.\nSix recurring glyphs identified. No translation possible.\nAge estimate: indeterminate. Material: unknown.\nThe symbols appeared to rearrange between observations.",
  },
];

export const ANOMALY_CONFIGS = [
  { type: 'WANDERER', x: 5.5,  y: 11.5, anchorX: 5.5,  anchorY: 11.5, orbitAngle: 0 },
  { type: 'WANDERER', x: 18.5, y: 11.5, anchorX: 18.5, anchorY: 11.5, orbitAngle: Math.PI },
  { type: 'OBSERVER', x: 3.5,  y: 3.5,  facingAngle: 0 },
  { type: 'OBSERVER', x: 20.5, y: 20.5, facingAngle: Math.PI },
  { type: 'ECHO',     x: 11.5, y: 11.5 },
  { type: 'RESONATOR',x: 11.5, y: 9.5,  pulsePhase: 0 },
];

export function createMapState() {
  const doors = {};
  for (let y = 0; y < Config.MAP_HEIGHT; y++) {
    for (let x = 0; x < Config.MAP_WIDTH; x++) {
      if (MAP_DATA[y][x] === Config.CELL_DOOR) {
        doors[`${x},${y}`] = { x, y, state: Config.DOOR_CLOSED, offset: 0, timer: 0 };
      }
    }
  }
  return {
    grid: MAP_DATA.map(row => [...row]),
    doors,
    triggers: TRIGGER_ZONES.map(t => ({ ...t, fired: false })),
  };
}

export function getCell(mapState, x, y) {
  const gx = Math.floor(x), gy = Math.floor(y);
  if (gx < 0 || gx >= Config.MAP_WIDTH || gy < 0 || gy >= Config.MAP_HEIGHT) return 1;
  return mapState.grid[gy][gx];
}

export function isWall(mapState, x, y) {
  const cell = getCell(mapState, x, y);
  if (cell === 0) return false;
  if (cell === Config.CELL_DOOR) {
    const key = `${Math.floor(x)},${Math.floor(y)}`;
    const door = mapState.doors[key];
    return door ? door.offset < 1.0 : true;
  }
  return true;
}

export function isInLowSignalZone(x, y) {
  for (const z of LOW_SIGNAL_ZONES) {
    if (x >= z.x1 && x <= z.x2 && y >= z.y1 && y <= z.y2) return true;
  }
  return false;
}

export function nearestAnchor(x, y) {
  let best = ANCHOR_POINTS[0], bestDist = Infinity;
  for (const a of ANCHOR_POINTS) {
    const d = (x - a.x) ** 2 + (y - a.y) ** 2;
    if (d < bestDist) { bestDist = d; best = a; }
  }
  return best;
}

export function checkTriggers(mapState, px, py, addLogEntry) {
  for (const t of mapState.triggers) {
    if (t.fired) continue;
    if (px >= t.x1 && px <= t.x2 && py >= t.y1 && py <= t.y2) {
      t.fired = true;
      addLogEntry(t.entry);
    }
  }
}
