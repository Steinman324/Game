import { Config } from './config.js';

// Map legend: 0=empty, 1-8=wall texture index, 9=door
export const MAP_DATA = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,2,2,2,0,0,0,0,0,2,2,2,2,2,2,2,0,0,0,0,0,1],
  [1,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,1],
  [1,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,1],
  [1,0,0,9,0,0,0,0,0,0,0,0,0,0,0,0,0,9,0,0,0,0,0,1],
  [1,0,0,2,0,0,0,2,2,9,2,2,0,0,0,0,0,2,0,0,0,0,0,1],
  [1,0,0,2,0,0,0,2,0,0,0,2,0,0,0,0,0,2,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,2,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,2,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,3,3,3,3,3,0,0,0,0,0,3,3,3,3,0,0,0,0,0,0,1],
  [1,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,1],
  [1,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,9,0,0,0,0,0,0,1],
  [1,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,1],
  [1,0,0,3,3,3,3,9,3,3,3,3,3,3,3,3,3,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// Door states: keyed by "x,y"
export function createMapState() {
  const doors = {};
  for (let y = 0; y < Config.MAP_HEIGHT; y++) {
    for (let x = 0; x < Config.MAP_WIDTH; x++) {
      if (MAP_DATA[y][x] === 9) {
        doors[`${x},${y}`] = {
          x, y,
          state: Config.DOOR_CLOSED,
          offset: 0.0,  // 0=closed, 1=fully open
          timer: 0,
        };
      }
    }
  }
  return { grid: MAP_DATA.map(row => [...row]), doors };
}

export function getCell(mapState, x, y) {
  const gx = Math.floor(x);
  const gy = Math.floor(y);
  if (gx < 0 || gx >= Config.MAP_WIDTH || gy < 0 || gy >= Config.MAP_HEIGHT) return 1;
  return mapState.grid[gy][gx];
}

export function isWall(mapState, x, y) {
  const cell = getCell(mapState, x, y);
  if (cell === Config.CELL_EMPTY) return false;
  if (cell === 9) {
    const key = `${Math.floor(x)},${Math.floor(y)}`;
    const door = mapState.doors[key];
    return door ? door.offset < 1.0 : true;
  }
  return cell !== Config.CELL_EMPTY;
}

export function isDoor(mapState, x, y) {
  return getCell(mapState, Math.floor(x), Math.floor(y)) === 9;
}

// Enemy spawn positions (x, y, angle)
export const ENEMY_SPAWNS = [
  { x: 4.5, y: 4.5, angle: 0 },
  { x: 10.5, y: 9.5, angle: Math.PI },
  { x: 15.5, y: 5.5, angle: Math.PI / 2 },
  { x: 10.5, y: 15.5, angle: Math.PI },
  { x: 20.5, y: 20.5, angle: Math.PI * 1.5 },
  { x: 5.5, y: 18.5, angle: 0 },
  { x: 18.5, y: 10.5, angle: Math.PI / 2 },
  { x: 14.5, y: 17.5, angle: Math.PI },
];

// Win tile position (cell 4 = exit marker)
export const EXIT_POS = { x: 21.5, y: 20.5 };
