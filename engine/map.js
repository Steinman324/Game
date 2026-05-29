import { Config } from './config.js';

// Map legend: 0=empty, 1=red brick, 2=tan brick, 3=stone, 4=exit, 5=metal, 9=door
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
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,5,5,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,4,5,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,0,5,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,5,5,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

export function createMapState() {
  const doors = {};
  for (let y = 0; y < Config.MAP_HEIGHT; y++) {
    for (let x = 0; x < Config.MAP_WIDTH; x++) {
      if (MAP_DATA[y][x] === 9) {
        doors[`${x},${y}`] = {
          x, y,
          state: Config.DOOR_CLOSED,
          offset: 0.0,
          timer: 0,
          soundPlayed: false,
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
  if (cell === 0) return false;
  if (cell === 9) {
    const key = `${Math.floor(x)},${Math.floor(y)}`;
    const door = mapState.doors[key];
    return door ? door.offset < 1.0 : true;
  }
  return true;
}

export function isDoor(mapState, x, y) {
  return getCell(mapState, Math.floor(x), Math.floor(y)) === 9;
}

export const ENEMY_SPAWNS = [
  { x: 4.5,  y: 4.5,  angle: 0 },
  { x: 10.5, y: 9.5,  angle: Math.PI },
  { x: 15.5, y: 5.5,  angle: Math.PI / 2 },
  { x: 10.5, y: 15.5, angle: Math.PI },
  { x: 20.5, y: 21.5, angle: Math.PI * 1.5 },
  { x: 5.5,  y: 18.5, angle: 0 },
  { x: 18.5, y: 10.5, angle: Math.PI / 2 },
  { x: 14.5, y: 17.5, angle: Math.PI },
];

export const ITEM_SPAWNS = [
  { x: 6.5,  y: 2.5,  type: 'health' },
  { x: 13.5, y: 2.5,  type: 'ammo' },
  { x: 4.5,  y: 9.5,  type: 'health' },
  { x: 9.5,  y: 9.5,  type: 'ammo' },
  { x: 6.5,  y: 12.5, type: 'health' },
  { x: 15.5, y: 12.5, type: 'ammo' },
  { x: 8.5,  y: 16.5, type: 'health' },
  { x: 15.5, y: 16.5, type: 'ammo' },
  { x: 12.5, y: 21.5, type: 'health' },
  { x: 17.5, y: 21.5, type: 'ammo' },
];

export const EXIT_POS = { x: 20.5, y: 20.5 };
