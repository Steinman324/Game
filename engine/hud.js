import { Config } from './config.js';
import { MAP_DATA } from './map.js';

const MINIMAP_CELL = Config.MINIMAP_SCALE;
const MM_X = Config.MINIMAP_X;
const MM_Y = Config.MINIMAP_Y;

export function drawHUD(ctx, player, enemies, mapState, textures, gunFrame, hitFlash) {
  drawMinimap(ctx, player, enemies, mapState);
  drawHealthBar(ctx, player);
  drawAmmoCounter(ctx, player);
  drawGun(ctx, textures, gunFrame, player.bobAmount);
  if (hitFlash > 0) drawHitFlash(ctx, hitFlash);
  drawCrosshair(ctx);
}

function drawMinimap(ctx, player, enemies, mapState) {
  const W = Config.MAP_WIDTH;
  const H = Config.MAP_HEIGHT;

  ctx.save();
  ctx.globalAlpha = 0.75;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = mapState.grid[y][x];
      if (cell === 0) {
        ctx.fillStyle = '#222';
      } else if (cell === 9) {
        const key = `${x},${y}`;
        const door = mapState.doors[key];
        ctx.fillStyle = door && door.offset > 0 ? '#885500' : '#cc8800';
      } else {
        ctx.fillStyle = cell === 1 ? '#884444' : (cell === 2 ? '#888844' : '#555555');
      }
      ctx.fillRect(MM_X + x * MINIMAP_CELL, MM_Y + y * MINIMAP_CELL, MINIMAP_CELL, MINIMAP_CELL);
    }
  }

  // Draw enemies on minimap
  for (const enemy of enemies) {
    if (enemy.state === Config.ENEMY_DEAD) continue;
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(
      MM_X + enemy.x * MINIMAP_CELL - 1,
      MM_Y + enemy.y * MINIMAP_CELL - 1,
      3, 3
    );
  }

  // Draw player on minimap
  ctx.fillStyle = '#44ff44';
  ctx.fillRect(
    MM_X + player.x * MINIMAP_CELL - 2,
    MM_Y + player.y * MINIMAP_CELL - 2,
    4, 4
  );

  // Player direction indicator
  ctx.strokeStyle = '#44ff44';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MM_X + player.x * MINIMAP_CELL, MM_Y + player.y * MINIMAP_CELL);
  ctx.lineTo(
    MM_X + (player.x + player.dirX * 3) * MINIMAP_CELL,
    MM_Y + (player.y + player.dirY * 3) * MINIMAP_CELL
  );
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawHealthBar(ctx, player) {
  const x = Config.HEALTH_BAR_X;
  const y = Config.HEALTH_BAR_Y;
  const w = 150;
  const h = 18;
  const hp = player.health / Config.PLAYER_MAX_HEALTH;

  // Background
  ctx.fillStyle = '#333';
  ctx.fillRect(x, y, w, h);

  // Health fill
  const r = Math.floor(255 * (1 - hp));
  const g = Math.floor(200 * hp);
  ctx.fillStyle = `rgb(${r},${g},0)`;
  ctx.fillRect(x, y, Math.floor(w * hp), h);

  // Border
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  // Label
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(`HP: ${player.health}`, x + 5, y + 13);
}

function drawAmmoCounter(ctx, player) {
  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(`AMMO: ${player.ammo}`, Config.HEALTH_BAR_X + 165, Config.HEALTH_BAR_Y + 13);
}

function drawGun(ctx, textures, gunFrame, bobAmount) {
  if (!textures || !textures.gunFrames) return;
  const frame = Math.min(gunFrame, textures.gunFrames.length - 1);
  const texData = textures.gunFrames[frame];
  if (!texData) return;

  const scale = 3;
  const W = Config.WIDTH;
  const H = Config.HEIGHT;
  const gw = Config.TEX_SIZE * scale;
  const gh = Config.TEX_SIZE * scale;
  const gx = Math.floor((W - gw) / 2);
  const gy = Math.floor(H - gh + 10 + bobAmount * 0.5);

  // Scale up the gun texture
  const offCanvas = document.createElement('canvas');
  offCanvas.width = Config.TEX_SIZE;
  offCanvas.height = Config.TEX_SIZE;
  const offCtx = offCanvas.getContext('2d');
  offCtx.putImageData(texData, 0, 0);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(offCanvas, gx, gy, gw, gh);
}

function drawHitFlash(ctx, intensity) {
  ctx.fillStyle = `rgba(180, 0, 0, ${intensity * 0.5})`;
  ctx.fillRect(0, 0, Config.WIDTH, Config.HEIGHT);
}

function drawCrosshair(ctx) {
  const cx = Config.WIDTH / 2;
  const cy = Config.HEIGHT / 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy);
  ctx.lineTo(cx + 8, cy);
  ctx.moveTo(cx, cy - 8);
  ctx.lineTo(cx, cy + 8);
  ctx.stroke();
}

export function drawMenu(ctx) {
  const W = Config.WIDTH;
  const H = Config.HEIGHT;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#cc2200';
  ctx.font = 'bold 48px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('WOLFENSTEIN', W / 2, H / 2 - 80);

  ctx.fillStyle = '#cc4400';
  ctx.font = 'bold 28px monospace';
  ctx.fillText('RAYCASTER', W / 2, H / 2 - 40);

  ctx.fillStyle = '#aaa';
  ctx.font = '16px monospace';
  ctx.fillText('WASD / Arrow Keys to move', W / 2, H / 2 + 20);
  ctx.fillText('Mouse to look (click to lock)', W / 2, H / 2 + 45);
  ctx.fillText('SPACE/E to open doors', W / 2, H / 2 + 70);
  ctx.fillText('Left Click to shoot', W / 2, H / 2 + 95);

  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('Press ENTER to start', W / 2, H / 2 + 140);
  ctx.textAlign = 'left';
}

export function drawPaused(ctx) {
  const W = Config.WIDTH;
  const H = Config.HEIGHT;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', W / 2, H / 2);
  ctx.font = '18px monospace';
  ctx.fillText('Press ESC to resume', W / 2, H / 2 + 40);
  ctx.textAlign = 'left';
}

export function drawGameOver(ctx) {
  const W = Config.WIDTH;
  const H = Config.HEIGHT;
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#cc0000';
  ctx.font = 'bold 48px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('YOU DIED', W / 2, H / 2 - 30);
  ctx.fillStyle = '#fff';
  ctx.font = '18px monospace';
  ctx.fillText('Press ENTER to restart', W / 2, H / 2 + 30);
  ctx.textAlign = 'left';
}

export function drawWin(ctx) {
  const W = Config.WIDTH;
  const H = Config.HEIGHT;
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#00cc44';
  ctx.font = 'bold 48px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MISSION COMPLETE!', W / 2, H / 2 - 30);
  ctx.fillStyle = '#fff';
  ctx.font = '18px monospace';
  ctx.fillText('Press ENTER to play again', W / 2, H / 2 + 30);
  ctx.textAlign = 'left';
}
