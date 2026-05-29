import { Config } from './config.js';

export function drawHUD(ctx, player, enemies, mapState, textures, gunFrame, hitFlash, pickupFlash) {
  drawGun(ctx, textures, gunFrame, player.bobAmount);
  if (hitFlash > 0) drawDamageVignette(ctx, hitFlash);
  drawMinimap(ctx, player, enemies, mapState);
  drawHealthBar(ctx, player);
  drawAmmoCounter(ctx, player);
  drawCrosshair(ctx);
  if (pickupFlash > 0) drawPickupMessage(ctx, pickupFlash, player._lastPickup);
  drawDoorHint(ctx, player, mapState);
}

function drawMinimap(ctx, player, enemies, mapState) {
  const C = Config.MINIMAP_SCALE;
  const OX = Config.MINIMAP_X;
  const OY = Config.MINIMAP_Y;
  const W = Config.MAP_WIDTH;
  const H = Config.MAP_HEIGHT;

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(OX - 1, OY - 1, W * C + 2, H * C + 2);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = mapState.grid[y][x];
      if (cell === 0) continue;
      if (cell === 9) {
        const key = `${x},${y}`;
        const door = mapState.doors[key];
        ctx.fillStyle = (door && door.offset > 0.1) ? '#a06020' : '#d49030';
      } else if (cell === 1) {
        ctx.fillStyle = '#994444';
      } else if (cell === 2) {
        ctx.fillStyle = '#997755';
      } else if (cell === 3) {
        ctx.fillStyle = '#666666';
      } else if (cell === 5) {
        ctx.fillStyle = '#446688';
      } else {
        ctx.fillStyle = '#224422';
      }
      ctx.fillRect(OX + x * C, OY + y * C, C, C);
    }
  }

  // Enemies
  for (const enemy of enemies) {
    if (enemy.state === Config.ENEMY_DEAD) continue;
    ctx.fillStyle = enemy.state >= Config.ENEMY_CHASE ? '#ff2222' : '#ff8800';
    ctx.fillRect(OX + enemy.x * C - 1, OY + enemy.y * C - 1, 3, 3);
  }

  // Player dot + direction line
  const px = OX + player.x * C;
  const py = OY + player.y * C;
  ctx.fillStyle = '#44ff88';
  ctx.fillRect(px - 2, py - 2, 4, 4);
  ctx.strokeStyle = '#44ff88';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px + player.dirX * C * 3, py + player.dirY * C * 3);
  ctx.stroke();

  // Minimap border
  ctx.strokeStyle = 'rgba(100,100,100,0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(OX, OY, W * C, H * C);
}

function drawHealthBar(ctx, player) {
  const x = Config.HEALTH_BAR_X;
  const y = Config.HEALTH_BAR_Y;
  const w = 160, h = 20;
  const hp = player.health / Config.PLAYER_MAX_HEALTH;

  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);

  // Gradient fill
  const grad = ctx.createLinearGradient(x, y, x + w * hp, y);
  const r = Math.floor(200 * (1 - hp) + 55 * hp);
  const g = Math.floor(200 * hp);
  grad.addColorStop(0, `rgb(${r}, ${g}, 0)`);
  grad.addColorStop(1, `rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, 0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, Math.floor(w * hp), h);

  // Segment lines
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 10; i++) {
    const sx = x + (w / 10) * i;
    ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx, y + h); ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(180,180,180,0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  // Label
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px monospace';
  ctx.shadowColor = '#000'; ctx.shadowBlur = 3;
  ctx.fillText(`HP ${player.health}`, x + 5, y + 14);
  ctx.shadowBlur = 0;
}

function drawAmmoCounter(ctx, player) {
  const x = Config.HEALTH_BAR_X + 174;
  const y = Config.HEALTH_BAR_Y;
  const w = 90, h = 20;

  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);

  ctx.fillStyle = player.ammo > 10 ? '#ccaa00' : '#cc2200';
  ctx.font = 'bold 13px monospace';
  ctx.shadowColor = '#000'; ctx.shadowBlur = 3;
  ctx.fillText(`■ ${player.ammo}`, x + 5, y + 14);
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(180,180,100,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

function drawGun(ctx, textures, gunFrame, bobAmount) {
  if (!textures?.gunFrames) return;
  const frame = Math.min(gunFrame, textures.gunFrames.length - 1);
  const texData = textures.gunFrames[frame];
  if (!texData) return;

  const scale = 4;
  const W = Config.WIDTH;
  const H = Config.HEIGHT;
  const gw = Config.TEX_SIZE * scale;
  const gh = Config.TEX_SIZE * scale;
  const gx = Math.floor((W - gw) / 2) + 60; // offset right like classic Doom/Wolf
  const gy = H - gh + 18 + Math.round(bobAmount * 0.4);

  const tmp = document.createElement('canvas');
  tmp.width = Config.TEX_SIZE; tmp.height = Config.TEX_SIZE;
  tmp.getContext('2d').putImageData(texData, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, gx, gy, gw, gh);
}

function drawDamageVignette(ctx, intensity) {
  const W = Config.WIDTH, H = Config.HEIGHT;
  // Red vignette edges
  const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.8);
  grad.addColorStop(0, `rgba(160,0,0,0)`);
  grad.addColorStop(1, `rgba(160,0,0,${intensity * 0.65})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function drawCrosshair(ctx) {
  const cx = Config.WIDTH / 2;
  const cy = Config.HEIGHT / 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1;
  // Gap in center
  const gap = 4, len = 8;
  ctx.beginPath();
  ctx.moveTo(cx - len - gap, cy); ctx.lineTo(cx - gap, cy);
  ctx.moveTo(cx + gap, cy);       ctx.lineTo(cx + len + gap, cy);
  ctx.moveTo(cx, cy - len - gap); ctx.lineTo(cx, cy - gap);
  ctx.moveTo(cx, cy + gap);       ctx.lineTo(cx, cy + len + gap);
  ctx.stroke();
  // Center dot
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(cx - 1, cy - 1, 2, 2);
}

function drawPickupMessage(ctx, flash, type) {
  if (!type) return;
  const msg = type === Config.ITEM_HEALTH ? '+ HEALTH RESTORED' : '+ AMMO COLLECTED';
  const color = type === Config.ITEM_HEALTH ? `rgba(60,220,60,${flash})` : `rgba(220,200,50,${flash})`;
  ctx.fillStyle = color;
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
  ctx.fillText(msg, Config.WIDTH / 2, Config.HEIGHT / 2 - 60);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'left';
}

function drawDoorHint(ctx, player, mapState) {
  // Show "Press E" hint if a door is nearby
  const fx = Math.floor(player.x + player.dirX * 1.5);
  const fy = Math.floor(player.y + player.dirY * 1.5);
  const key = `${fx},${fy}`;
  if (mapState.doors[key] && mapState.doors[key].state === Config.DOOR_CLOSED) {
    ctx.fillStyle = 'rgba(255,230,100,0.9)';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[E] Open Door', Config.WIDTH / 2, Config.HEIGHT / 2 + 40);
    ctx.textAlign = 'left';
  }
}

// ── overlay screens ───────────────────────────────────────────────────────────

export function drawMenu(ctx) {
  const W = Config.WIDTH, H = Config.HEIGHT;

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#080808');
  bg.addColorStop(1, '#1a0808');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Decorative side bars
  ctx.fillStyle = 'rgba(140,20,20,0.4)';
  ctx.fillRect(0, 0, 6, H);
  ctx.fillRect(W - 6, 0, 6, H);

  // Title
  ctx.shadowColor = '#ff2200';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#dd1100';
  ctx.font = 'bold 52px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('WOLFENSTEIN', W / 2, H / 2 - 90);
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#cc3300';
  ctx.font = 'bold 30px monospace';
  ctx.fillText('RAYCASTER', W / 2, H / 2 - 48);
  ctx.shadowBlur = 0;

  // Divider
  ctx.strokeStyle = 'rgba(180,40,10,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 160, H / 2 - 28);
  ctx.lineTo(W / 2 + 160, H / 2 - 28);
  ctx.stroke();

  ctx.fillStyle = '#999';
  ctx.font = '14px monospace';
  const lines = [
    'WASD / Arrow Keys  —  Move',
    'Mouse (click to lock)  —  Look',
    'E / Space  —  Open doors',
    'Left Click  —  Shoot',
    'ESC  —  Pause',
  ];
  lines.forEach((l, i) => ctx.fillText(l, W / 2, H / 2 + 10 + i * 22));

  ctx.shadowColor = '#ffaa00';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('Press  ENTER  to start', W / 2, H / 2 + 150);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'left';
}

export function drawPaused(ctx) {
  const W = Config.WIDTH, H = Config.HEIGHT;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = 'bold 40px monospace';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
  ctx.fillText('PAUSED', W / 2, H / 2);
  ctx.fillStyle = '#aaa';
  ctx.font = '16px monospace';
  ctx.fillText('ESC  or  ENTER  to resume', W / 2, H / 2 + 40);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'left';
}

export function drawGameOver(ctx) {
  const W = Config.WIDTH, H = Config.HEIGHT;
  ctx.fillStyle = 'rgba(0,0,0,0.88)';
  ctx.fillRect(0, 0, W, H);
  ctx.shadowColor = '#ff0000';
  ctx.shadowBlur = 25;
  ctx.fillStyle = '#cc0000';
  ctx.font = 'bold 56px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('YOU DIED', W / 2, H / 2 - 20);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#888';
  ctx.font = '17px monospace';
  ctx.fillText('Press  ENTER  to try again', W / 2, H / 2 + 40);
  ctx.textAlign = 'left';
}

export function drawWin(ctx) {
  const W = Config.WIDTH, H = Config.HEIGHT;
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(0, 0, W, H);
  ctx.shadowColor = '#00ff44';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#00cc44';
  ctx.font = 'bold 44px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MISSION COMPLETE!', W / 2, H / 2 - 20);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#888';
  ctx.font = '17px monospace';
  ctx.fillText('Press  ENTER  to play again', W / 2, H / 2 + 40);
  ctx.textAlign = 'left';
}
