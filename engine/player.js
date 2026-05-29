import { Config } from './config.js';
import { InputState, flushMouseDX } from './input.js';
import { isWall, ANCHOR_POINTS } from './map.js';

export function createPlayer() {
  return {
    x: Config.PLAYER_START_X, y: Config.PLAYER_START_Y,
    angle: Config.PLAYER_START_ANGLE,
    dirX: Math.cos(Config.PLAYER_START_ANGLE),
    dirY: Math.sin(Config.PLAYER_START_ANGLE),
    planeX: 0, planeY: Config.FOV,
    signal: Config.MAX_SIGNAL,
    anchorIdx: 0,
    bobTimer: 0, bobAmount: 0,
    isMoving: false, scanHeld: false,
  };
}

function rotate(player, angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  const dx = player.dirX, px = player.planeX;
  player.dirX = dx * c - player.dirY * s;
  player.dirY = dx * s + player.dirY * c;
  player.planeX = px * c - player.planeY * s;
  player.planeY = px * s + player.planeY * c;
  player.angle += angle;
}

function tryMove(player, mapState, nx, ny) {
  const r = Config.PLAYER_RADIUS;
  const sx = Math.sign(nx - player.x) || 1;
  const sy = Math.sign(ny - player.y) || 1;
  if (!isWall(mapState, nx + sx * r, player.y)) player.x = nx;
  if (!isWall(mapState, player.x, ny + sy * r)) player.y = ny;
}

export function updatePlayer(player, mapState, delta) {
  const mouseDX = flushMouseDX();
  const rot = mouseDX * Config.MOUSE_SENSITIVITY
    + (InputState.turnLeft ? -1 : 0) * Config.PLAYER_ROT_SPEED * delta;

  if (rot !== 0) rotate(player, rot);

  const speed = Config.PLAYER_SPEED * delta;
  let mx = 0, my = 0;
  if (InputState.forward)     { mx += player.dirX * speed; my += player.dirY * speed; }
  if (InputState.backward)    { mx -= player.dirX * speed; my -= player.dirY * speed; }
  if (InputState.strafeLeft)  { mx += player.dirY * speed; my -= player.dirX * speed; }
  if (InputState.strafeRight) { mx -= player.dirY * speed; my += player.dirX * speed; }

  player.isMoving = mx !== 0 || my !== 0;
  if (player.isMoving) {
    tryMove(player, mapState, player.x + mx, player.y + my);
    player.bobTimer += delta * 7;
    player.bobAmount = Math.sin(player.bobTimer) * 3;
  } else {
    player.bobAmount *= 0.88;
  }

  // Update anchor (nearest anchor point)
  if (player.signal > 60) {
    let bestDist = Infinity, bestIdx = 0;
    for (let i = 0; i < ANCHOR_POINTS.length; i++) {
      const ap = ANCHOR_POINTS[i];
      const d = (ap.x - player.x) ** 2 + (ap.y - player.y) ** 2;
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    if (bestDist < 4) player.anchorIdx = bestIdx;
  }
}

export function displace(player) {
  const ap = ANCHOR_POINTS[player.anchorIdx];
  player.x = ap.x; player.y = ap.y;
  player.signal = Config.SIGNAL_RESTORE_ON_DISPLACE;
}

export function getAimDot(player, tx, ty) {
  const dx = tx - player.x, dy = ty - player.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.001) return 0;
  return (dx / dist) * player.dirX + (dy / dist) * player.dirY;
}
