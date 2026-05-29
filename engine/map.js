import { Config } from './config.js';

// 0=empty 1=concrete 2=teal-trim 3=biolum-vein 4=symbol-panel 5=low-signal 9=door
export const MAP_GRID = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,9,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0,0,1],
  [1,1,1,1,9,1,1,0,0,9,0,0,9,0,0,1,3,3,1,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,1,1,1,1,0,0,1,1,1,1,0,0,0,0,1],
  [1,0,0,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,2,5,5,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,2,5,5,2,0,0,0,0,0,4,4,4,4,0,0,0,0,0,0,0,1],
  [1,0,0,2,2,2,2,0,0,0,0,0,4,0,0,4,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,4,0,0,4,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,4,4,9,4,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,3,3,3,3,1,1,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,0,1],
  [1,3,0,0,3,1,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,2,0,1],
  [1,3,0,0,9,0,0,0,0,0,0,5,5,5,0,0,0,0,2,0,0,2,0,1],
  [1,3,0,0,3,1,0,0,0,0,0,5,5,5,0,0,0,0,2,2,2,2,0,1],
  [1,3,3,3,3,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

export const ANCHOR_POINTS = [
  { x: 2.5, y: 2.5 },
  { x: 2.5, y: 10.5 },
  { x: 18.5, y: 2.5 },
  { x: 13.5, y: 18.5 },
];

export const WIN_ZONE = { x: 21.5, y: 21.5, radius: 1.5 };

export const ANOMALY_SPAWNS = [
  { type: 'wanderer',  cx: 5.0,  cy: 7.0,  orbitRadius: 1.8 },
  { type: 'observer',  cx: 10.5, cy: 9.5 },
  { type: 'observer',  cx: 16.5, cy: 6.5 },
  { type: 'echo',      cx: 10.5, cy: 5.5 },
  { type: 'resonator', cx: 16.0, cy: 7.0, wallCell: { x: 15, y: 6 } },
  { type: 'wanderer',  cx: 14.5, cy: 13.0, orbitRadius: 1.4 },
  { type: 'echo',      cx: 4.5,  cy: 18.0 },
  { type: 'resonator', cx: 2.5,  cy: 18.5, wallCell: { x: 1, y: 17 } },
];

export function createMapState() {
  const doors = {};
  for (let y = 0; y < Config.MAP_HEIGHT; y++) {
    for (let x = 0; x < Config.MAP_WIDTH; x++) {
      if (MAP_GRID[y][x] === 9) {
        doors[`${x},${y}`] = { x, y, state: Config.DOOR_CLOSED, offset: 0, timer: 0 };
      }
    }
  }
  return { grid: MAP_GRID.map(r => [...r]), doors };
}

export function getCell(mapState, x, y) {
  const gx = Math.floor(x), gy = Math.floor(y);
  if (gx < 0 || gx >= Config.MAP_WIDTH || gy < 0 || gy >= Config.MAP_HEIGHT) return 1;
  return mapState.grid[gy][gx];
}

export function isWall(mapState, x, y) {
  const cell = getCell(mapState, x, y);
  if (cell === 0 || cell === Config.CELL_LOW_SIGNAL) return false;
  if (cell === 9) {
    const door = mapState.doors[`${Math.floor(x)},${Math.floor(y)}`];
    return door ? door.offset < 1.0 : true;
  }
  return cell > 0;
}

export function isDoor(mapState, x, y) {
  return getCell(mapState, x, y) === 9;
}

export function isLowSignal(mapState, x, y) {
  return mapState.grid[Math.floor(y)]?.[Math.floor(x)] === Config.CELL_LOW_SIGNAL;
}
