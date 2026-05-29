import { Config } from './config.js';

export function drawHUD(ctx, player, anomalies, mapState, scanTarget, scanHoldMs) {
  drawSignalBar(ctx, player.signal);
  drawCompass(ctx, player);
  drawMinimap(ctx, player, anomalies, mapState);
  drawScanReticle(ctx, scanTarget, scanHoldMs);
  drawDataCounter(ctx, anomalies);
}

function drawSignalBar(ctx, signal) {
  const x = 10, y = Config.HEIGHT - 30, w = 140, h = 10;
  const ratio = signal / Config.MAX_SIGNAL;

  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(x - 2, y - 14, w + 4, h + 18);

  ctx.fillStyle = '#162828';
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = ratio > 0.3 ? Config.COLOR_SIGNAL_HIGH : '#2a6a40';
  ctx.fillRect(x, y, Math.floor(w * ratio), h);

  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1;
  for (let i = 1; i < 10; i++) {
    const sx = x + (w / 10) * i;
    ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx, y + h); ctx.stroke();
  }

  ctx.fillStyle = Config.COLOR_HUD_TEXT; ctx.font = '10px monospace';
  ctx.fillText('SIGNAL', x, y - 2);
  ctx.fillText(`${Math.ceil(signal)}%`, x + w - 28, y - 2);
}

function drawCompass(ctx, player) {
  const cx = Config.WIDTH - 34, cy = 34, r = 22;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1a4040'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

  const angle = player.angle;
  const nx = cx + Math.cos(angle - Math.PI / 2) * (r - 5);
  const ny = cy + Math.sin(angle - Math.PI / 2) * (r - 5);
  ctx.strokeStyle = Config.COLOR_CYAN; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny); ctx.stroke();

  ctx.fillStyle = '#3a6060'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
  ctx.fillText('N', cx, cy - r + 10);
  ctx.textAlign = 'left';
}

function drawMinimap(ctx, player, anomalies, mapState) {
  const C = Config.MINIMAP_SCALE;
  const OX = Config.MINIMAP_X, OY = Config.MINIMAP_Y;
  const W = Config.MAP_WIDTH, H = Config.MAP_HEIGHT;

  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(OX - 1, OY - 1, W * C + 2, H * C + 2);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = mapState.grid[y][x];
      if (cell === 0) continue;
      if (cell === 9) {
        const door = mapState.doors[`${x},${y}`];
        ctx.fillStyle = door && door.offset > 0.1 ? '#1a4040' : '#2a6060';
      } else if (cell === 5) { ctx.fillStyle = '#1a2a2a';
      } else if (cell === 2) { ctx.fillStyle = '#1a5c5a';
      } else if (cell === 3) { ctx.fillStyle = '#1a4a40';
      } else if (cell === 4) { ctx.fillStyle = '#2a3a50';
      } else { ctx.fillStyle = '#2a2d33'; }
      ctx.fillRect(OX + x * C, OY + y * C, C, C);
    }
  }

  for (const a of anomalies) {
    if (a.type === Config.ANOM_RESONATOR) continue;
    ctx.fillStyle = a.scanned ? '#3a7070' : Config.COLOR_CYAN;
    ctx.fillRect(OX + a.x * C - 1, OY + a.y * C - 1, 3, 3);
  }

  const px = OX + player.x * C, py = OY + player.y * C;
  ctx.fillStyle = '#c8e8e8';
  ctx.fillRect(px - 2, py - 2, 4, 4);
  ctx.strokeStyle = '#c8e8e8'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(px, py);
  ctx.lineTo(px + player.dirX * C * 2.5, py + player.dirY * C * 2.5); ctx.stroke();
  ctx.strokeStyle = '#1a3030'; ctx.lineWidth = 1;
  ctx.strokeRect(OX, OY, W * C, H * C);
}

function drawScanReticle(ctx, scanTarget, scanHoldMs) {
  const cx = Config.WIDTH / 2, cy = Config.HEIGHT / 2;

  if (!scanTarget) {
    ctx.fillStyle = 'rgba(126,206,202,0.45)';
    ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill();
    return;
  }

  const progress = Math.min(1, scanHoldMs / (Config.SCAN_DURATION * 1000));
  const r = 12;
  ctx.strokeStyle = Config.COLOR_CYAN; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.stroke();

  const bSize = 6;
  ctx.strokeStyle = Config.COLOR_SCAN_BAR; ctx.lineWidth = 1;
  for (const [ox, oy] of [[-r, -r], [r, -r], [r, r], [-r, r]]) {
    const sx = cx + ox, sy = cy + oy;
    ctx.beginPath();
    ctx.moveTo(sx + (ox < 0 ? bSize : -bSize), sy);
    ctx.lineTo(sx, sy);
    ctx.lineTo(sx, sy + (oy < 0 ? bSize : -bSize));
    ctx.stroke();
  }

  ctx.fillStyle = Config.COLOR_CYAN;
  ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill();

  if (progress > 0) {
    ctx.fillStyle = Config.COLOR_CYAN; ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SCANNING', cx, cy + r + 14);
    ctx.textAlign = 'left';
  }
}

function drawDataCounter(ctx, anomalies) {
  const scanned = anomalies.filter(a => a.scanned).length;
  const x = Config.WIDTH - 80, y = Config.HEIGHT - 14;
  ctx.fillStyle = Config.COLOR_HUD_TEXT; ctx.font = '10px monospace';
  ctx.fillText(`DATA: ${scanned}/${anomalies.length}`, x, y);
}

export function drawMenu(ctx) {
  const W = Config.WIDTH, H = Config.HEIGHT;
  ctx.fillStyle = '#060a0d'; ctx.fillRect(0, 0, W, H);

  const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
  grad.addColorStop(0, 'rgba(10,30,30,0.0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.88)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = Config.COLOR_CYAN; ctx.font = 'bold 44px monospace';
  ctx.fillText('LIMINAL', W / 2, H / 2 - 60);
  ctx.fillStyle = '#3a7070'; ctx.font = '12px monospace';
  ctx.fillText('a spatial anomaly research log', W / 2, H / 2 - 34);
  ctx.fillStyle = '#5a9090'; ctx.font = '13px monospace';
  ctx.fillText('[ PRESS ENTER TO BEGIN ]', W / 2, H / 2 + 20);
  ctx.fillStyle = '#2a4040'; ctx.font = '10px monospace';
  ctx.fillText('WASD · MOUSE · [E] SCAN · [L] LOG', W / 2, H / 2 + 50);
  ctx.fillText('No hostile entities present.', W / 2, H / 2 + 66);
  ctx.textAlign = 'left';
}

export function drawDisplaced(ctx, progress) {
  const W = Config.WIDTH, H = Config.HEIGHT;
  const alpha = Math.sin(progress * Math.PI) * 0.92;
  ctx.fillStyle = `rgba(0,8,12,${alpha})`; ctx.fillRect(0, 0, W, H);
  if (progress > 0.25 && progress < 0.75) {
    ctx.fillStyle = Config.COLOR_HUD_TEXT; ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SIGNAL LOST — DISPLACEMENT EVENT', W / 2, H / 2);
    ctx.fillText('returning to last anchor', W / 2, H / 2 + 20);
    ctx.textAlign = 'left';
  }
}

export function drawWin(ctx) {
  const W = Config.WIDTH, H = Config.HEIGHT;
  ctx.fillStyle = 'rgba(6,10,14,0.93)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = Config.COLOR_CYAN; ctx.font = 'bold 22px monospace';
  ctx.fillText('SURVEY COMPLETE', W / 2, H / 2 - 30);
  ctx.fillStyle = '#5a9090'; ctx.font = '12px monospace';
  ctx.fillText('All anomalies catalogued.', W / 2, H / 2);
  ctx.fillText('The geometry holds. For now.', W / 2, H / 2 + 18);
  ctx.fillStyle = '#3a6060'; ctx.font = '11px monospace';
  ctx.fillText('[ ENTER ] to restart', W / 2, H / 2 + 50);
  ctx.textAlign = 'left';
}
