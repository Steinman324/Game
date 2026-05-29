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
    dyingTimer: 0,
    painTimer: 0,
  }));
}

function hasLineOfSight(ex, ey, px, py, mapState) {
  const dx = px - ex;
  const dy = py - ey;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(dist * 5);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isWall(mapState, ex + dx * t, ey + dy * t)) return false;
  }
  return true;
}

function tryMoveEnemy(enemy, mapState, nx, ny) {
  const r = 0.3;
  if (!isWall(mapState, nx + Math.sign(nx - enemy.x) * r, enemy.y)) enemy.x = nx;
  if (!isWall(mapState, enemy.x, ny + Math.sign(ny - enemy.y) * r)) enemy.y = ny;
}

function separateEnemies(enemies) {
  for (let i = 0; i < enemies.length; i++) {
    if (enemies[i].state >= Config.ENEMY_DYING) continue;
    for (let j = i + 1; j < enemies.length; j++) {
      if (enemies[j].state >= Config.ENEMY_DYING) continue;
      const dx = enemies[j].x - enemies[i].x;
      const dy = enemies[j].y - enemies[i].y;
      const distSq = dx * dx + dy * dy;
      if (distSq < 0.64 && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const push = (0.8 - dist) * 0.08 / dist;
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

    // ── dying animation ──────────────────────────────────────────────────────
    if (enemy.state === Config.ENEMY_DYING) {
      enemy.dyingTimer += delta;
      if (enemy.dyingTimer > 0.5) {
        enemy.state = Config.ENEMY_DEAD;
      }
      continue;
    }

    // ── pain flash ───────────────────────────────────────────────────────────
    if (enemy.painTimer > 0) {
      enemy.painTimer -= delta;
      enemy.animFrame = 4; // pain frame
      continue;
    }

    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);

    // Walk cycle animation (frames 1 and 2)
    if (enemy.state === Config.ENEMY_CHASE) {
      enemy.animTimer += delta;
      if (enemy.animTimer > 0.18) {
        enemy.animTimer = 0;
        enemy.animFrame = (enemy.animFrame === 1) ? 2 : 1;
      }
    } else if (enemy.state === Config.ENEMY_IDLE) {
      enemy.animFrame = 0;
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
        enemy.animFrame = 0;
        enemy.state = Config.ENEMY_CHASE;
        break;

      case Config.ENEMY_CHASE: {
        if (dist > Config.ENEMY_LOSE_DIST) {
          enemy.state = Config.ENEMY_IDLE;
          enemy.animFrame = 0;
          break;
        }
        if (dist < Config.ENEMY_ATTACK_RANGE) {
          enemy.state = Config.ENEMY_ATTACK;
          break;
        }
        const speed = Config.ENEMY_SPEED * delta;
        const nx = enemy.x + (dx / dist) * speed;
        const ny = enemy.y + (dy / dist) * speed;
        tryMoveEnemy(enemy, mapState, nx, ny);

        // Stuck detection
        const movedSq = (enemy.x - enemy.lastX) ** 2 + (enemy.y - enemy.lastY) ** 2;
        if (movedSq < 0.0001) {
          enemy.stuckTimer += delta;
          if (enemy.stuckTimer > 1.5) {
            // Nudge perpendicular to unstick
            enemy.x += (-dy / dist) * 0.15;
            enemy.y += (dx / dist) * 0.15;
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
        enemy.animFrame = 3;
        if (dist > Config.ENEMY_ATTACK_RANGE * 1.6) {
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
  let closestEnemy = null;
  let closestDist = Infinity;

  for (const enemy of enemies) {
    if (enemy.state >= Config.ENEMY_DYING) continue;
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > Config.MAX_DEPTH) continue;

    // Aiming cone (~14 degrees)
    const dot = (dx / dist) * player.dirX + (dy / dist) * player.dirY;
    if (dot < 0.97) continue;

    if (!hasLineOfSight(player.x, player.y, enemy.x, enemy.y, mapState)) continue;

    if (dist < closestDist) { closestDist = dist; closestEnemy = enemy; }
  }

  if (closestEnemy) {
    closestEnemy.health -= Config.GUN_DAMAGE;
    if (closestEnemy.health <= 0) {
      closestEnemy.state = Config.ENEMY_DYING;
      closestEnemy.dyingTimer = 0;
      if (audioFn) audioFn('death');
    } else {
      closestEnemy.painTimer = 0.25;
      if (closestEnemy.state === Config.ENEMY_IDLE) closestEnemy.state = Config.ENEMY_ALERT;
    }
    return true;
  }
  return false;
}

export function buildEnemySprites(enemies, textures) {
  return enemies.map(enemy => {
    if (enemy.state === Config.ENEMY_DEAD) {
      return { x: enemy.x, y: enemy.y, texture: textures.enemyDead, scale: 0.75 };
    }
    if (enemy.state === Config.ENEMY_DYING) {
      return { x: enemy.x, y: enemy.y, texture: textures.enemyDying, scale: 0.8 };
    }
    const frame = Math.min(enemy.animFrame, textures.enemyFrames.length - 1);
    return {
      x: enemy.x,
      y: enemy.y,
      texture: textures.enemyFrames[frame],
      scale: Config.ENEMY_SPRITE_SCALE,
    };
  });
}
