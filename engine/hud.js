import { Config } from './config.js';

const W = Config.CANVAS_WIDTH;
const H = Config.CANVAS_HEIGHT;

// ── compass helpers ────────────────────────────────────────────────────────────

function compassDir(dirX, dirY) {
  const angle = Math.atan2(dirY, dirX);   // 0 = east
  const deg = ((angle * 180 / Math.PI) % 360 + 360) % 360;
  if (deg < 22.5 || deg >= 337.5) return 'E';
  if (deg < 67.5)  return 'SE';
  if (deg < 112.5) return 'S';
  if (deg < 157.5) return 'SW';
  if (deg < 202.5) return 'W';
  if (deg < 247.5) return 'NW';
  if (deg < 292.5) return 'N';
  return 'NE';
}

// ── minimap ────────────────────────────────────────────────────────────────────

function drawMinimap(ctx, player, mapState, anomalies) {
  const C  = Config.MINIMAP_SCALE;
  const OX = W - Config.MAP_WIDTH * C - 10;
  const OY = 10;
  const MW = Config.MAP_WIDTH;
  const MH = Config.MAP_HEIGHT;

  ctx.fillStyle = 'rgba(8,12,16,0.78)';
  ctx.fillRect(OX - 1, OY - 1, MW * C + 2, MH * C + 2);

  for (let y = 0; y < MH; y++) {
    for (let x = 0; x < MW; x++) {
      const cell = mapState.grid[y][x];
      if (cell === 0) continue;
      if (cell === Config.CELL_DOOR) {
        const door = mapState.doors[`${x},${y}`];
        ctx.fillStyle = (door && door.offset > 0.1) ? '#1a5c5a' : '#2a8880';
      } else if (cell === Config.CELL_TEAL) {
        ctx.fillStyle = '#1a4a48';
      } else if (cell === Config.CELL_BIO) {
        ctx.fillStyle = '#0e3830';
      } else if (cell === Config.CELL_SYMBOL) {
        ctx.fillStyle = '#1e2840';
      } else {
        ctx.fillStyle = '#2a2d33';
      }
      ctx.fillRect(OX + x * C, OY + y * C, C, C);
    }
  }

  // Anomaly dots
  for (const a of anomalies) {
    ctx.fillStyle = a.scanned ? '#3a7a78' : '#7ececa';
    ctx.fillRect(OX + a.x * C - 1, OY + a.y * C - 1, 3, 3);
  }

  // Player
  const px = OX + player.x * C;
  const py = OY + player.y * C;
  ctx.fillStyle = '#c8f0ee';
  ctx.fillRect(px - 2, py - 2, 4, 4);
  ctx.strokeStyle = '#c8f0ee';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px + player.dirX * C * 3, py + player.dirY * C * 3);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(126,206,202,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(OX, OY, MW * C, MH * C);
}

// ── signal bar ────────────────────────────────────────────────────────────────

function drawSignalBar(ctx, player) {
  const x = 12, y = H - 38, w = 160, h = 14;
  const ratio = player.signal / Config.MAX_SIGNAL;

  ctx.fillStyle = 'rgba(8,12,16,0.75)';
  ctx.fillRect(x - 2, y - 14, w + 4, h + 18);

  ctx.fillStyle = 'rgba(126,206,202,0.18)';
  ctx.fillRect(x, y, w, h);

  const barColor = ratio > 0.5 ? '#7ececa' : ratio > 0.2 ? '#2a8880' : '#1a5040';
  ctx.fillStyle = barColor;
  ctx.fillRect(x, y, Math.floor(w * ratio), h);

  // Segment ticks
  ctx.strokeStyle = 'rgba(8,14,18,0.5)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 10; i++) {
    const sx = x + (w / 10) * i;
    ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx, y + h); ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(126,206,202,0.4)';
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = ratio > 0.3 ? '#c8f0ee' : '#7ececa';
  ctx.font = '10px monospace';
  ctx.shadowColor = '#000'; ctx.shadowBlur = 2;
  ctx.fillText('SIGNAL INTEGRITY', x, y - 3);
  ctx.fillText(`${Math.round(player.signal)}%`, x + w - 32, y - 3);
  ctx.shadowBlur = 0;
}

// ── data fragment counter ──────────────────────────────────────────────────────

function drawDataCounter(ctx, scannedCount, totalTypes) {
  const x = 12, y = H - 58;
  ctx.fillStyle = '#7ececa';
  ctx.font = '11px monospace';
  ctx.shadowColor = '#000'; ctx.shadowBlur = 2;
  ctx.fillText(`DATA FRAGMENTS  ${scannedCount} / ${totalTypes}`, x, y);
  ctx.shadowBlur = 0;
}

// ── compass ───────────────────────────────────────────────────────────────────

function drawCompass(ctx, player) {
  const cx = W / 2, cy = 24;
  ctx.fillStyle = 'rgba(8,12,16,0.65)';
  ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = 'rgba(126,206,202,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.stroke();

  // Needle
  const angle = Math.atan2(player.dirY, player.dirX);
  const nx = Math.cos(angle) * 13, ny = Math.sin(angle) * 13;
  ctx.strokeStyle = '#7ececa';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + nx, cy + ny); ctx.stroke();
  ctx.fillStyle = '#7ececa';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000'; ctx.shadowBlur = 2;
  ctx.fillText(compassDir(player.dirX, player.dirY), cx, cy + 34);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'left';
}

// ── scan reticle ──────────────────────────────────────────────────────────────

function drawScanReticle(ctx, scanProgress, scanTarget) {
  const cx = W / 2, cy = H / 2;
  const r = 18;

  // Outer ring
  ctx.strokeStyle = 'rgba(126,206,202,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

  // Corner ticks
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * (r - 4);
    const y1 = cy + Math.sin(a) * (r - 4);
    const x2 = cx + Math.cos(a) * (r + 6);
    const y2 = cy + Math.sin(a) * (r + 6);
    ctx.strokeStyle = 'rgba(126,206,202,0.7)';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  if (scanProgress > 0) {
    // Scan arc fill
    ctx.strokeStyle = `rgba(30,200,180,${0.5 + scanProgress * 0.4})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * scanProgress);
    ctx.stroke();

    if (scanTarget) {
      ctx.fillStyle = 'rgba(126,206,202,0.75)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000'; ctx.shadowBlur = 3;
      ctx.fillText(`SCANNING: ${scanTarget.type}`, cx, cy + r + 18);
      ctx.fillText(`${Math.round(scanProgress * 100)}%`, cx, cy + r + 30);
      ctx.shadowBlur = 0;
      ctx.textAlign = 'left';
    }
  }
}

// ── log hint ──────────────────────────────────────────────────────────────────

function drawLogHint(ctx, logEntries) {
  if (logEntries === 0) return;
  ctx.fillStyle = 'rgba(126,206,202,0.55)';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.shadowColor = '#000'; ctx.shadowBlur = 2;
  ctx.fillText(`[L] DATA LOG  (${logEntries} entries)`, W - 12, H - 10);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'left';
}

// ── displacement overlay ───────────────────────────────────────────────────────

export function drawDisplacedOverlay(ctx, progress) {
  // progress: 0=just displaced, 1=fading out
  const alpha = Math.max(0, 1 - progress);
  ctx.fillStyle = `rgba(20,60,80,${alpha * 0.75})`;
  ctx.fillRect(0, 0, W, H);
  if (progress < 0.5) {
    ctx.fillStyle = `rgba(126,206,202,${(0.5 - progress) * 0.4})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.fillStyle = `rgba(200,240,238,${alpha * 0.9})`;
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
  ctx.fillText('SIGNAL LOST — ANCHOR RECOVERY', W / 2, H / 2);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'left';
}

// ── overlay screens ───────────────────────────────────────────────────────────

export function drawMenu(ctx) {
  ctx.fillStyle = '#060810';
  ctx.fillRect(0, 0, W, H);

  // Subtle vignette
  const vg = ctx.createRadialGradient(W/2, H/2, H*0.1, W/2, H/2, H*0.85);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.shadowColor = '#3ecece';
  ctx.shadowBlur = 28;
  ctx.fillStyle = '#7ececa';
  ctx.font = 'bold 58px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('LIMINAL', W/2, H/2 - 80);

  ctx.shadowBlur = 6;
  ctx.fillStyle = '#3d6e6e';
  ctx.font = '15px monospace';
  ctx.fillText('a spatial exploration', W/2, H/2 - 44);

  ctx.strokeStyle = 'rgba(126,206,202,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W/2-120, H/2-26); ctx.lineTo(W/2+120, H/2-26); ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#5a8c8a';
  ctx.font = '12px monospace';
  const lines = [
    'WASD / Arrow Keys  —  Move',
    'Mouse  —  Look (click to lock)',
    '[E] Hold  —  Scan anomaly',
    '[L]  —  Data log',
    '[Esc]  —  Release mouse',
  ];
  lines.forEach((l, i) => ctx.fillText(l, W/2, H/2 + 10 + i * 20));

  ctx.shadowColor = '#7ececa';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#c8f0ee';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('ENTER  to begin', W/2, H/2 + 138);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'left';
}

export function drawWin(ctx) {
  ctx.fillStyle = 'rgba(6,8,14,0.88)';
  ctx.fillRect(0, 0, W, H);
  ctx.shadowColor = '#7ececa';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#c8f0ee';
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('TRANSMISSION COMPLETE', W/2, H/2 - 24);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#5a8c8a';
  ctx.font = '14px monospace';
  ctx.fillText('All anomaly types catalogued.', W/2, H/2 + 14);
  ctx.fillText('Signal stable. Data archived.', W/2, H/2 + 34);
  ctx.fillStyle = '#7ececa';
  ctx.font = '14px monospace';
  ctx.fillText('ENTER  to restart', W/2, H/2 + 80);
  ctx.textAlign = 'left';
}

// ── main HUD draw (called after commitFrame) ──────────────────────────────────

export function drawHUD(ctx, player, anomalies, mapState, scanProgress, scanTarget, logEntries) {
  drawMinimap(ctx, player, mapState, anomalies);
  drawSignalBar(ctx, player);
  const scannedTypes = new Set(anomalies.filter(a => a.scanned).map(a => a.type)).size;
  drawDataCounter(ctx, scannedTypes, 4);
  drawCompass(ctx, player);
  drawScanReticle(ctx, scanProgress, scanTarget);
  drawLogHint(ctx, logEntries);
}
