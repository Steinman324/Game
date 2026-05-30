import { Config } from './config.js';

const W = Config.CANVAS_WIDTH;
const H = Config.CANVAS_HEIGHT;
const MAX_ENTRIES = 20;

export function createLog() {
  return { entries: [] };
}

export function addEntry(log, text) {
  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  log.entries.unshift({ text, ts });
  if (log.entries.length > MAX_ENTRIES) log.entries.pop();
}

export function drawLogOverlay(ctx, log) {
  // Dark overlay
  ctx.fillStyle = 'rgba(4,8,12,0.92)';
  ctx.fillRect(0, 0, W, H);

  // Header
  ctx.strokeStyle = 'rgba(126,206,202,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(20, 46); ctx.lineTo(W - 20, 46); ctx.stroke();

  ctx.fillStyle = '#7ececa';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'left';
  ctx.shadowColor = '#3ecece'; ctx.shadowBlur = 8;
  ctx.fillText('DATA LOG', 22, 36);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#3d6e6e';
  ctx.font = '11px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${log.entries.length} ENTRIES`, W - 22, 36);
  ctx.textAlign = 'left';

  if (log.entries.length === 0) {
    ctx.fillStyle = '#3d6e6e';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('No data recorded yet.', W/2, H/2);
    ctx.fillText('Scan anomalies to populate this log.', W/2, H/2 + 22);
    ctx.textAlign = 'left';
    drawCloseHint(ctx);
    return;
  }

  const lineHeight = 15;
  const maxWidth = W - 60;
  let y = 64;

  for (let i = 0; i < log.entries.length; i++) {
    if (y > H - 40) break;
    const entry = log.entries[i];

    // Timestamp
    ctx.fillStyle = '#2a6058';
    ctx.font = '9px monospace';
    ctx.fillText(entry.ts, 22, y);
    y += 13;

    // Entry text (word-wrap)
    ctx.fillStyle = i === 0 ? '#c8f0ee' : '#7abaB8';
    ctx.font = '11px monospace';
    const lines = entry.text.split('\n');
    for (const rawLine of lines) {
      if (y > H - 40) break;
      // Simple character-based wrap
      const words = rawLine.split(' ');
      let line = '';
      for (const word of words) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          ctx.fillText(line, 22, y);
          y += lineHeight;
          line = word;
        } else {
          line = test;
        }
      }
      if (line) {
        ctx.fillText(line, 22, y);
        y += lineHeight;
      }
    }

    y += 8; // gap between entries
    if (i < log.entries.length - 1) {
      ctx.strokeStyle = 'rgba(126,206,202,0.1)';
      ctx.beginPath(); ctx.moveTo(22, y - 4); ctx.lineTo(W - 22, y - 4); ctx.stroke();
    }
  }

  drawCloseHint(ctx);
}

function drawCloseHint(ctx) {
  ctx.fillStyle = 'rgba(126,206,202,0.45)';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('[L] or [Esc]  — close log', W / 2, H - 14);
  ctx.textAlign = 'left';
}
