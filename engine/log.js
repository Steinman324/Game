import { Config } from './config.js';

const SCAN_ENTRIES = {
  wanderer: [
    'ENTITY: WANDERER — CLASS Ω-3\nOrbital path consistent with gravitational anchoring\naround an undetected mass. No mass detected.\nCoordinates logged. No further data returned.',
    'ENTITY: WANDERER — CLASS Ω-3\nTrajectory unchanged over observation window.\nPath radius: 1.8 units. Origin: unresolved.\nSignal integrity mild drop on proximity.',
  ],
  observer: [
    'ENTITY: OBSERVER — CLASS Δ-1\nAcknowledgment confirmed. Entity orientation\nmatched operator gaze within 0.3° margin.\nNo data exchange initiated by entity.\nIt knows you are here.',
    'ENTITY: OBSERVER — CLASS Δ-1\nVisual axis tracking: confirmed.\nNo threat behavior. No communication.\nHypothesis: cataloguing.',
  ],
  echo: [
    'ENTITY: ECHO — CLASS Φ-7\nGhost trail matches operator movement pattern\nwith temporal offset of ~36 seconds.\nOrigin of trail-generation mechanism: unknown.\nYou were here before you arrived.',
    'ENTITY: ECHO — CLASS Φ-7\nTrail coherence: 94%. Not a reflection.\nNot a recording. Possible index of prior traversal\nacross a collapsed timeline. Flagged for review.',
  ],
  resonator: [
    'ENTITY: RESONATOR — CLASS Σ-2\nSpatial measurement: floor area = 14.7m²\nExternal measurement of same room: 6.2m²\nDelta: 8.5m². Unexplained.\nAmbient frequency: 55Hz. No oscillator found.',
    'ENTITY: RESONATOR — CLASS Σ-2\nWall surface vibration detected at 0.6Hz.\nNo mechanical source identified. Room geometry\nshifts ~0.3% during peak pulse. Structural sound.',
  ],
};

const AMBIENT_ENTRIES = [
  'COORDINATE LOG: 14.2, 7.8\nCompass bearing drift: +12° from magnetic north\nNo anomalous mass nearby. Drift persists.',
  'OBSERVATION: Door at (14,4) leads to a corridor\nthat does not appear on external map dimensions.\nEstimated internal length: 18m. Wall span: 4m.',
  'NOTE: Signal integrity correlates inversely with\nproximity to marked floor zones. Mechanism unknown.\nZones emit no detectable radiation.',
  'FRAGMENT: "...the geometry holds because we expect\nit to. Remove the observer, and the angles\nbecome optional..." — source unattributed.',
  'ANOMALOUS READING: Barometric pressure stable.\nSurface: 1013 hPa. Interior: 1013 hPa.\nHumidity interior: 0%. Exterior: 0%.\nThis location is not outside.',
];

export function createLog() {
  return {
    entries: [],
    open: false,
    scrollOffset: 0,
  };
}

export function addScanEntry(log, anomaly) {
  const pool = SCAN_ENTRIES[anomaly.type] || [];
  const text = pool[Math.floor(Math.random() * pool.length)] || `ENTITY: ${anomaly.type.toUpperCase()}\nNo data returned.`;
  const timestamp = `T+${Math.floor(performance.now() / 1000).toString().padStart(4, '0')}s`;
  log.entries.push({ timestamp, text, type: anomaly.type });
}

export function addAmbientEntry(log, idx) {
  const text = AMBIENT_ENTRIES[idx % AMBIENT_ENTRIES.length];
  const timestamp = `T+${Math.floor(performance.now() / 1000).toString().padStart(4, '0')}s`;
  log.entries.push({ timestamp, text, type: 'ambient' });
}

export function drawLog(ctx, log) {
  if (!log.open) return;
  const W = Config.WIDTH, H = Config.HEIGHT;

  ctx.fillStyle = Config.COLOR_LOG_BG;
  ctx.fillRect(0, 0, W, H);

  // Border
  ctx.strokeStyle = '#1a4040';
  ctx.lineWidth = 1;
  ctx.strokeRect(20, 20, W - 40, H - 40);

  ctx.fillStyle = Config.COLOR_CYAN;
  ctx.font = 'bold 13px monospace';
  ctx.fillText('▸ DATA LOG', 36, 46);

  ctx.fillStyle = '#2a5050';
  ctx.font = '11px monospace';
  ctx.fillText(`${log.entries.length} ENTR${log.entries.length !== 1 ? 'IES' : 'Y'}  ·  [L] CLOSE`, 36, 60);

  const lineH = 14;
  let yPos = 80 - log.scrollOffset;

  for (const entry of log.entries) {
    if (yPos > H - 30) break;

    ctx.fillStyle = '#3a6060';
    ctx.font = '10px monospace';
    if (yPos >= 70) ctx.fillText(entry.timestamp, 36, yPos);
    yPos += lineH;

    const lines = entry.text.split('\n');
    for (const line of lines) {
      if (yPos >= 70 && yPos < H - 30) {
        ctx.fillStyle = '#8ab8b8';
        ctx.font = '11px monospace';
        ctx.fillText(line, 36, yPos);
      }
      yPos += lineH;
    }
    yPos += 8;
  }

  if (log.entries.length === 0) {
    ctx.fillStyle = '#2a5050';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('— no entries —', W / 2, H / 2);
    ctx.textAlign = 'left';
  }
}
