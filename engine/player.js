import { Config } from './config.js';
import { InputState, flushMouseDX } from './input.js';
import { isWall, isInLowSignalZone, nearestAnchor } from './map.js';

export function createPlayer() {
  return {
    x: Config.PLAYER_START_X,
    y: Config.PLAYER_START_Y,
    dirX: Config.PLAYER_START_DIR_X,
    dirY: Config.PLAYER_START_DIR_Y,
    planeX: 0,
    planeY: Config.FOV_PLANE,
    signal: Config.MAX_SIGNAL,
    anchorX: Config.PLAYER_START_X,
    anchorY: Config.PLAYER_START_Y,
    bobTimer: 0,
    bobAmount: 0,
    isMoving: false,
  };
}

function rotate(player, angle) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const dx = player.dirX;
  player.dirX   = dx * cos - player.dirY * sin;
  player.dirY   = dx * sin + player.dirY * cos;
  const px = player.planeX;
  player.planeX = px * cos - player.planeY * sin;
  player.planeY = px * sin + player.planeY * cos;
}

function tryMove(player, mapState, nx, ny) {
  const r = Config.PLAYER_COLLISION_RADIUS;
  if (!isWall(mapState, nx + Math.sign(nx - player.x) * r, player.y)) player.x = nx;
  if (!isWall(mapState, player.x, ny + Math.sign(ny - player.y) * r)) player.y = ny;
}

export function updatePlayer(player, mapState, delta) {
  const mouseDX = flushMouseDX();
  const rot = mouseDX * Config.MOUSE_SENSITIVITY
    + (InputState.turnRight ? 1 : 0) * Config.PLAYER_ROT_SPEED * delta
    - (InputState.turnLeft  ? 1 : 0) * Config.PLAYER_ROT_SPEED * delta;

  if (rot !== 0) rotate(player, rot);

  const speed = Config.PLAYER_SPEED * delta;
  let mx = 0, my = 0;

  if (InputState.forward)     { mx += player.dirX * speed; my += player.dirY * speed; }
  if (InputState.backward)    { mx -= player.dirX * speed; my -= player.dirY * speed; }
  if (InputState.strafeLeft)  { mx += player.dirY * speed; my -= player.dirX * speed; }
  if (InputState.strafeRight) { mx -= player.dirY * speed; my += player.dirX * speed; }

  player.isMoving = (mx !== 0 || my !== 0);
  if (player.isMoving) {
    tryMove(player, mapState, player.x + mx, player.y + my);
    player.bobTimer += delta * 8;
    player.bobAmount = Math.sin(player.bobTimer) * 3.5;
  } else {
    player.bobAmount *= 0.88;
  }

  // Signal drain in low-signal zones
  if (isInLowSignalZone(player.x, player.y)) {
    player.signal = Math.max(0, player.signal - Config.LOW_SIGNAL_DRAIN_RATE * delta);
  } else {
    // Slow passive recovery outside zones
    player.signal = Math.min(Config.MAX_SIGNAL, player.signal + 2 * delta);
  }
}

export function updateAnchor(player, mapState) {
  // Called after door opens / stable signal — anchor to nearest safe point
  if (!isInLowSignalZone(player.x, player.y) && player.signal > 60) {
    player.anchorX = player.x;
    player.anchorY = player.y;
  }
}

export function displace(player) {
  const anchor = nearestAnchor(player.anchorX, player.anchorY);
  player.x = anchor.x;
  player.y = anchor.y;
  player.signal = Config.DISPLACEMENT_SIGNAL_RESTORE;
  // Reset direction to east
  player.dirX = 1; player.dirY = 0;
  player.planeX = 0; player.planeY = Config.FOV_PLANE;
}
