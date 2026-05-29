import { Config } from './config.js';
import { ENEMY_SPAWNS } from './map.js';
import { isWall } from './map.js';

export function createEnemies() {
  return ENEMY_SPAWNS.map((spawn, i) => ({
    id: i,
    x: spawn.x,
    y: spawn.y,
    angle: spawn.angle,
    state: Config.ENEMY_IDLE,
    health: Config.ENEMY_HEALTH,
    attackCooldown: 0,
    stuckTimer: 0,
    lastX: spawn.x,
    lastY: spawn.y,
    animFrame: 0,
    animTimer: 0,
    alertSoundPlayed: false,
    deathHandled: false,
  }));
}

function hasLineOfSight(ex, ey, px, py, mapState) {
  const dx = px - ex;
  const dy = py - ey;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(dist * 4);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = ex + dx * t;
    const cy = ey + dy * t;
    if (isWall(mapState, cx, cy)) return false;
  }
  return true;
}

function tryMoveEnemy(enemy, mapState, nx, ny) {
  const r = 0.3;
  let moved = false;
  if (!isWall(mapState, nx + Math.sign(nx - enemy.x) * r, enemy.y)) {
    enemy.x = nx;
    moved = true;
  }
  if (!isWall(mapState, enemy.x, ny + Math.sign(ny - enemy.y) * r)) {
    enemy.y = ny;
    moved = true;
  }
  return moved;
}

function separateEnemies(enemies) {
  for (let i = 0; i < enemies.length; i++) {
    if (enemies[i].state === Config.ENEMY_DEAD) continue;
    for (let j = i + 1; j < enemies.length; j++) {
      if (enemies[j].state === Config.ENEMY_DEAD) continue;
      const dx = enemies[j].x - enemies[i].x;
      const dy = enemies[j].y - enemies[i].y;
      const distSq = dx * dx + dy * dy;
      if (distSq < 0.5 && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const push = (0.5 - dist) * 0.1 / dist;
        enemies[i].x -= dx * push;
        enemies[i].y -= dy * push;
        enemies[j].x += dx * push;
        enemies[j].y += dy * push;
      }
    }
  }
}

export function updateEnemies(enemies, player, mapState, delta, audioFn) {
  separateEnemies(enemies);

  for (const enemy of enemies) {
    if (enemy.state === Config.ENEMY_DEAD) continue;

    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);

    // Animation
    enemy.animTimer += delta;
    if (enemy.animTimer > 0.2) {
      enemy.animTimer = 0;
      enemy.animFrame = (enemy.animFrame + 1) % 3; // cycle through walk frames 0-2
    }

    if (enemy.attackCooldown > 0) enemy.attackCooldown -= delta;

    switch (enemy.state) {
      case Config.ENEMY_IDLE:
        if (dist < Config.ENEMY_ALERT_DIST && hasLineOfSight(enemy.x, enemy.y, player.x, player.y, mapState)) {
          enemy.state = Config.ENEMY_ALERT;
          enemy.alertSoundPlayed = false;
        }
        break;

      case Config.ENEMY_ALERT:
        if (!enemy.alertSoundPlayed) {
          if (audioFn) audioFn('alert');
          enemy.alertSoundPlayed = true;
        }
        enemy.state = Config.ENEMY_CHASE;
        break;

      case Config.ENEMY_CHASE: {
        if (dist > Config.ENEMY_LOSE_DIST) {
          enemy.state = Config.ENEMY_IDLE;
          break;
        }
        if (dist < Config.ENEMY_ATTACK_RANGE) {
          enemy.state = Config.ENEMY_ATTACK;
          break;
        }

        // Move towards player
        const nx = enemy.x + (dx / dist) * Config.ENEMY_SPEED * delta;
        const ny = enemy.y + (dy / dist) * Config.ENEMY_SPEED * delta;
        const moved = tryMoveEnemy(enemy, mapState, nx, ny);

        // Stuck detection
        const stuckDx = enemy.x - enemy.lastX;
        const stuckDy = enemy.y - enemy.lastY;
        if (stuckDx * stuckDx + stuckDy * stuckDy < 0.0001) {
          enemy.stuckTimer += delta;
          if (enemy.stuckTimer > 2.0) {
            // Nudge perpendicular to unstick
            const perpX = -dy / dist;
            const perpY = dx / dist;
            enemy.x += perpX * 0.1;
            enemy.y += perpY * 0.1;
            enemy.stuckTimer = 0;
          }
        } else {
          enemy.stuckTimer = 0;
        }
        enemy.lastX = enemy.x;
        enemy.lastY = enemy.y;
        break;
      }

      case Config.ENEMY_ATTACK:
        enemy.animFrame = 3; // attack frame
        if (dist > Config.ENEMY_ATTACK_RANGE * 1.5) {
          enemy.state = Config.ENEMY_CHASE;
          break;
        }
        if (enemy.attackCooldown <= 0) {
          player.health = Math.max(0, player.health - Config.ENEMY_ATTACK_DAMAGE);
          enemy.attackCooldown = Config.ENEMY_ATTACK_COOLDOWN;
          if (audioFn) audioFn('hurt');
        }
        break;
    }
  }
}

export function shootEnemies(enemies, player, mapState, audioFn) {
  // Raycast in player's forward direction, hit nearest enemy in view
  let closestEnemy = null;
  let closestDist = Infinity;

  for (const enemy of enemies) {
    if (enemy.state === Config.ENEMY_DEAD) continue;

    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > Config.MAX_DEPTH) continue;

    // Check if enemy is roughly in center of screen (within ~15 degrees of aim)
    const dot = (dx / dist) * player.dirX + (dy / dist) * player.dirY;
    if (dot < 0.97) continue; // ~14 degree cone

    // Line of sight
    if (!hasLineOfSight(player.x, player.y, enemy.x, enemy.y, mapState)) continue;

    if (dist < closestDist) {
      closestDist = dist;
      closestEnemy = enemy;
    }
  }

  if (closestEnemy) {
    closestEnemy.health -= Config.GUN_DAMAGE;
    if (closestEnemy.health <= 0) {
      closestEnemy.state = Config.ENEMY_DEAD;
      closestEnemy.deathHandled = false;
      if (audioFn) audioFn('death');
    } else {
      if (closestEnemy.state === Config.ENEMY_IDLE) {
        closestEnemy.state = Config.ENEMY_ALERT;
      }
    }
    return true;
  }
  return false;
}

export function buildEnemySprites(enemies, textures) {
  return enemies.map(enemy => {
    if (enemy.state === Config.ENEMY_DEAD) {
      return {
        x: enemy.x,
        y: enemy.y,
        texture: textures.enemyDead,
        scale: 0.6,
      };
    }
    const frame = Math.min(enemy.animFrame, textures.enemyFrames.length - 1);
    return {
      x: enemy.x,
      y: enemy.y,
      texture: textures.enemyFrames[frame],
      scale: Config.ENEMY_SPRITE_SIZE,
    };
  });
}
