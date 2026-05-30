import { Config } from './engine/config.js';
import { initInput, InputState, consumeConfirm, consumeEscape, consumeLogToggle } from './engine/input.js';
import { createMapState, checkTriggers } from './engine/map.js';
import { createPlayer, updatePlayer, updateAnchor, displace } from './engine/player.js';
import { createAnomalies, updateAnomalies, findScanTarget, buildAnomalySprites } from './engine/anomalies.js';
import { updateDoors, resetDoors } from './engine/doors.js';
import { castWalls, applyResonatorWarp, commitFrame, zBuffer } from './engine/raycaster.js';
import { drawSpritesToBuffer } from './engine/sprites.js';
import { drawHUD, drawMenu, drawWin, drawDisplacedOverlay } from './engine/hud.js';
import { createLog, addEntry, drawLogOverlay } from './engine/log.js';
import { initAudio, updateDroneFreq, playScanSuccess, playDisplacement, playScanTick } from './engine/audio.js';
import { loadTextures } from './assets/textures.js';

// ── canvas setup ───────────────────────────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d', { alpha: false });
canvas.width  = Config.CANVAS_WIDTH;
canvas.height = Config.CANVAS_HEIGHT;

// ── game state ─────────────────────────────────────────────────────────────────

let textures    = null;
let gameState   = Config.STATE_LOADING;
let player      = null;
let mapState    = null;
let anomalies   = null;
let log         = null;

let scanTarget   = null;
let scanProgress = 0;      // 0..1
let scanTickTimer = 0;

let displacedTimer = 0;    // ms elapsed since displacement

let totalTime = 0;
let lastTimestamp = 0;

// ── reset ──────────────────────────────────────────────────────────────────────

function resetGame() {
  mapState   = createMapState();
  player     = createPlayer();
  anomalies  = createAnomalies();
  log        = createLog();
  scanTarget    = null;
  scanProgress  = 0;
  scanTickTimer = 0;
  displacedTimer = 0;
  totalTime  = 0;
}

// ── init ───────────────────────────────────────────────────────────────────────

function init() {
  initInput(canvas);
  initAudio();
  textures  = loadTextures();
  resetGame();
  gameState = Config.STATE_MENU;
  requestAnimationFrame(loop);
}

// ── main loop ──────────────────────────────────────────────────────────────────

function loop(timestamp) {
  try {
    const nowSec = timestamp / 1000;
    let delta = nowSec - lastTimestamp;
    lastTimestamp = nowSec;
    if (delta > Config.DELTA_CAP || delta <= 0) delta = Config.DELTA_CAP;
    update(delta, timestamp);
    render();
  } catch (err) {
    console.error('[LIMINAL] loop error:', err);
  }
  requestAnimationFrame(loop);
}

// ── update ─────────────────────────────────────────────────────────────────────

function update(delta, timestamp) {
  switch (gameState) {

    case Config.STATE_MENU:
      if (InputState.confirm) { consumeConfirm(); resetGame(); gameState = Config.STATE_PLAYING; }
      break;

    case Config.STATE_PLAYING:
    case Config.STATE_LOG_OPEN: {
      totalTime += delta;

      // Log toggle
      if (InputState.logToggle) {
        consumeLogToggle();
        gameState = gameState === Config.STATE_LOG_OPEN ? Config.STATE_PLAYING : Config.STATE_LOG_OPEN;
        break;
      }
      if (gameState === Config.STATE_LOG_OPEN) {
        if (InputState.escape) { consumeEscape(); gameState = Config.STATE_PLAYING; }
        break;
      }

      // -- PLAYING only below --

      // Player movement
      updatePlayer(player, mapState, delta);
      updateAnchor(player, mapState);

      // Doors auto-open
      updateDoors(mapState, player, delta);

      // Anomalies
      updateAnomalies(anomalies, player, mapState, delta, totalTime);

      // Map triggers → data log
      checkTriggers(mapState, player.x, player.y, text => addEntry(log, text));

      // Scan mechanic
      if (InputState.scanHeld) {
        const candidate = findScanTarget(anomalies, player, mapState);
        if (candidate) {
          if (candidate !== scanTarget) {
            // New target: reset progress
            scanTarget   = candidate;
            scanProgress = 0;
          }
          scanProgress = Math.min(1, scanProgress + delta * 1000 / Config.SCAN_HOLD_DURATION);

          // Tick sound every 0.3s
          scanTickTimer += delta;
          if (scanTickTimer >= 0.3) { scanTickTimer = 0; playScanTick(); }

          if (scanProgress >= 1) {
            completeScan(scanTarget);
            scanTarget   = null;
            scanProgress = 0;
          }
        } else {
          scanTarget   = null;
          scanProgress = Math.max(0, scanProgress - delta * 2);
        }
      } else {
        scanTarget   = null;
        scanProgress = Math.max(0, scanProgress - delta * 3);
      }

      // Drone frequency update
      updateDroneProximity();

      // Signal displacement
      if (player.signal <= 0) {
        gameState      = Config.STATE_DISPLACED;
        displacedTimer = 0;
        playDisplacement();
        displace(player);
        player.signal = Config.DISPLACEMENT_SIGNAL_RESTORE;
        addEntry(log, 'SIGNAL FAILURE\nAnchor recovery initiated. Spatial position reset to last stable coordinates.\nSignal restored: 50%');
      }

      // Win: all 4 types scanned
      const scannedTypes = new Set(anomalies.filter(a => a.scanned).map(a => a.type)).size;
      if (scannedTypes >= 4) gameState = Config.STATE_WIN;
      break;
    }

    case Config.STATE_DISPLACED:
      displacedTimer += delta * 1000;
      if (displacedTimer >= Config.DISPLACEMENT_DURATION) {
        gameState = Config.STATE_PLAYING;
      }
      break;

    case Config.STATE_WIN:
      if (InputState.confirm) { consumeConfirm(); resetGame(); gameState = Config.STATE_MENU; }
      break;
  }
}

function completeScan(target) {
  target.scanned = true;
  playScanSuccess();
  const entries = {
    WANDERER:  'WANDERER — Class II Mobile Anomaly\nOrbital trajectory: deterministic. No awareness of observer detected.\nSignal signature: non-hostile. Spatial footprint: negligible.\nNote: anomaly maintains exact orbit under all observed conditions.\nNo communication attempted or possible.',
    OBSERVER:  'OBSERVER — Class III Passive Entity\nObserver acknowledged. No data returned.\nEntity demonstrates clear awareness but does not communicate.\nDuration of visual contact: [VARIABLE — REDACTED]\nIf you are reading this, it is still watching you.',
    ECHO:      'ECHO — Class I Temporal Residue\nPositional echo: approximately 4.2 seconds behind present.\nOrigin: indeterminate. Not interactive.\nTheory: residual spatial imprint of transit event.\nCannot be communicated with. May be able to observe us.',
    RESONATOR: 'RESONATOR — Class IV Spatial Anomaly\nSpatial measurement: interior volume 340% of calculated exterior.\nResonance frequency: [CANNOT BE EXPRESSED IN KNOWN NOTATION]\nWall geometry: non-Euclidean. The walls here are not where they appear.\nDo not attempt extended proximity. Signal drain confirmed.',
  };
  const entry = entries[target.type] || `${target.type} scanned. No additional data.`;
  addEntry(log, entry);
}

function updateDroneProximity() {
  let nearest = Infinity;
  for (const a of anomalies) {
    if (a.type !== 'RESONATOR') continue;
    const d = Math.sqrt((a.x - player.x)**2 + (a.y - player.y)**2);
    if (d < nearest) nearest = d;
  }
  updateDroneFreq(nearest, Config.RESONATOR_RANGE, Config.BASE_DRONE_HZ);
}

// ── render ─────────────────────────────────────────────────────────────────────

function render() {
  switch (gameState) {

    case Config.STATE_LOADING:
      ctx.fillStyle = '#060810';
      ctx.fillRect(0, 0, Config.CANVAS_WIDTH, Config.CANVAS_HEIGHT);
      break;

    case Config.STATE_MENU:
      drawMenu(ctx);
      break;

    case Config.STATE_PLAYING:
    case Config.STATE_LOG_OPEN: {
      castWalls(player, mapState, textures);
      applyResonatorWarp(anomalies, player);
      const sprites = buildAnomalySprites(anomalies, textures, totalTime);
      drawSpritesToBuffer(player, sprites);
      commitFrame(ctx);
      drawHUD(ctx, player, anomalies, mapState, scanProgress, scanTarget, log.entries.length);
      if (gameState === Config.STATE_LOG_OPEN) drawLogOverlay(ctx, log);
      break;
    }

    case Config.STATE_DISPLACED: {
      castWalls(player, mapState, textures);
      applyResonatorWarp(anomalies, player);
      const sprites = buildAnomalySprites(anomalies, textures, totalTime);
      drawSpritesToBuffer(player, sprites);
      commitFrame(ctx);
      drawHUD(ctx, player, anomalies, mapState, 0, null, log.entries.length);
      drawDisplacedOverlay(ctx, displacedTimer / Config.DISPLACEMENT_DURATION);
      break;
    }

    case Config.STATE_WIN:
      castWalls(player, mapState, textures);
      commitFrame(ctx);
      drawWin(ctx);
      break;
  }
}

init();
