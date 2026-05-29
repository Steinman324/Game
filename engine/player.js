import { Config } from './config.js';
import { InputState, flushMouseDX, consumeUse, consumeShoot } from './input.js';
import { isWall, isDoor } from './map.js';

export function createPlayer() {
  return {
    x: Config.PLAYER_START_X,
    y: Config.PLAYER_START_Y,
    angle: Config.PLAYER_START_ANGLE,
    // Direction vector
    dirX: Math.cos(Config.PLAYER_START_ANGLE),
    dirY: Math.sin(Config.PLAYER_START_ANGLE),
    // Camera plane (perpendicular to dir, length = FOV factor)
    planeX: 0,
    planeY: Config.FOV,
    health: Config.PLAYER_MAX_HEALTH,
    ammo: Config.PLAYER_START_AMMO,
    gunCooldown: 0,
    shootTriggered: false,
    usedDoor: false,
    bobTimer: 0,
    bobAmount: 0,
    stepSoundTimer: 0,
  };
}

function rotate(player, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const oldDirX = player.dirX;
  player.dirX = player.dirX * cos - player.dirY * sin;
  player.dirY = oldDirX * sin + player.dirY * cos;
  const oldPlaneX = player.planeX;
  player.planeX = player.planeX * cos - player.planeY * sin;
  player.planeY = oldPlaneX * sin + player.planeY * cos;
  player.angle += angle;
}

function tryMove(player, mapState, nx, ny) {
  const r = Config.PLAYER_RADIUS;
  // Try X movement
  if (!isWall(mapState, nx + Math.sign(nx - player.x) * r, player.y)) {
    player.x = nx;
  }
  // Try Y movement
  if (!isWall(mapState, player.x, ny + Math.sign(ny - player.y) * r)) {
    player.y = ny;
  }
}

export function updatePlayer(player, mapState, doors, delta, enemies) {
  if (player.health <= 0) return;

  const mouseDX = flushMouseDX();
  const rot = mouseDX * Config.MOUSE_SENSITIVITY
    + (InputState.turnRight ? 1 : 0) * Config.PLAYER_ROT_SPEED * delta
    - (InputState.turnLeft ? 1 : 0) * Config.PLAYER_ROT_SPEED * delta;

  if (rot !== 0) rotate(player, rot);

  const speed = Config.PLAYER_SPEED * delta;
  let moveX = 0;
  let moveY = 0;

  if (InputState.forward) {
    moveX += player.dirX * speed;
    moveY += player.dirY * speed;
  }
  if (InputState.backward) {
    moveX -= player.dirX * speed;
    moveY -= player.dirY * speed;
  }
  if (InputState.strafeLeft) {
    moveX += player.dirY * speed;
    moveY -= player.dirX * speed;
  }
  if (InputState.strafeRight) {
    moveX -= player.dirY * speed;
    moveY += player.dirX * speed;
  }

  if (moveX !== 0 || moveY !== 0) {
    tryMove(player, mapState, player.x + moveX, player.y + moveY);
    player.bobTimer += delta * 8;
    player.bobAmount = Math.sin(player.bobTimer) * 4;
    player.stepSoundTimer += delta;
  } else {
    player.bobAmount *= 0.85;
  }

  // Gun cooldown
  if (player.gunCooldown > 0) player.gunCooldown -= delta;

  // Shoot
  player.shootTriggered = false;
  if (InputState.shoot && player.gunCooldown <= 0 && player.ammo > 0) {
    player.shootTriggered = true;
    player.gunCooldown = Config.GUN_COOLDOWN;
    player.ammo--;
    consumeShoot();
  }

  // Use door
  player.usedDoor = false;
  if (InputState.use) {
    consumeUse();
    tryUseDoor(player, mapState, doors);
    player.usedDoor = true;
  }

  // Auto-trigger nearby doors
  autoTriggerDoors(player, doors);
}

function tryUseDoor(player, mapState, doors) {
  // Check cell in front of player
  const fx = Math.floor(player.x + player.dirX * 1.0);
  const fy = Math.floor(player.y + player.dirY * 1.0);
  const key = `${fx},${fy}`;
  if (doors[key]) {
    triggerDoor(doors[key]);
  }
}

function autoTriggerDoors(player, doors) {
  for (const key in doors) {
    const door = doors[key];
    const dx = door.x + 0.5 - player.x;
    const dy = door.y + 0.5 - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < Config.DOOR_TRIGGER_DIST) {
      if (door.state === Config.DOOR_CLOSED) {
        door.state = Config.DOOR_OPENING;
      }
    }
  }
}

function triggerDoor(door) {
  if (door.state === Config.DOOR_CLOSED || door.state === Config.DOOR_CLOSING) {
    door.state = Config.DOOR_OPENING;
  }
}

export function damagePlayer(player, amount, audioFn) {
  player.health = Math.max(0, player.health - amount);
  if (audioFn) audioFn('hurt');
}
