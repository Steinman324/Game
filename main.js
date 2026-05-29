import { Config } from './engine/config.js';
import { initInput, InputState, flushMouseDX, consumeLog, consumePause, consumeConfirm } from './engine/input.js';
import { createMapState, ANOMALY_SPAWNS, isLowSignal } from './engine/map.js';
import { createPlayer, updatePlayer, displace } from './engine/player.js';
import { createAnomalies, updateAnomalies, buildAnomalySprites, getNearestResonatorDist, getTargetedAnomaly } from './engine/anomalies.js';
import { updateDoors, resetDoors } from './engine/doors.js';
import { castWalls, applyResonatorWarp } from './engine/raycaster.js';
import { drawSprites } from './engine/sprites.js';
import { drawHUD, drawMenu, drawDisplaced, drawWin } from './engine/hud.js';
import { createLog, addScanEntry, addAmbientEntry, drawLog } from './engine/log.js';
import { initAudio, updateDroneFrequency, playScanSuccess, playDisplace } from './engine/audio.js';
import { loadTextures } from './assets/textures.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = Config.WIDTH;
canvas.height = Config.HEIGHT;

// ── GameState ─────────────────────────────────────────────────────────────
const GS = {
  phase: Config.STATE_LOADING,
  player: null,
  mapState: null,
  anomalies: null,
  log: null,
  textures: null,
  totalTime: 0,
  displacedTimer: 0,
  ambientLogTimer: 0,
  scanTarget: null,
  winTimer: 0,
};

let lastTime = 0;

function resetGame() {
  GS.mapState = createMapState();
  GS.player = createPlayer();
  GS.anomalies = createAnomalies(ANOMALY_SPAWNS);
  GS.log = createLog();
  GS.totalTime = 0;
  GS.displacedTimer = 0;
  GS.ambientLogTimer = 40;
  GS.scanTarget = null;
  GS.winTimer = 0;
  resetDoors(GS.mapState.doors);
}

function init() {
  initInput(canvas);
  initAudio();
  GS.textures = loadTextures();
  resetGame();
  GS.phase = Config.STATE_MENU;
  requestAnimationFrame(loop);
}

function loop(timestamp) {
  try {
    const nowSec = timestamp / 1000;
    let delta = nowSec - lastTime;
    lastTime = nowSec;
    if (delta > Config.DELTA_CAP) delta = Config.DELTA_CAP;
    update(delta);
    render();
  } catch (e) {
    console.error('Loop error:', e);
  }
  requestAnimationFrame(loop);
}

function update(delta) {
  switch (GS.phase) {

    case Config.STATE_MENU:
      if (InputState.confirm) {
        consumeConfirm();
        resetGame();
        GS.phase = Config.STATE_PLAYING;
      }
      break;

    case Config.STATE_PLAYING:
    case Config.STATE_SCANNING: {
      GS.totalTime += delta;

      // Log toggle
      if (InputState.logToggle) {
        consumeLog();
        GS.log.open = true;
        GS.phase = Config.STATE_LOG_OPEN;
        break;
      }

      // Escape to menu
      if (InputState.pause) {
        consumePause();
        GS.phase = Config.STATE_MENU;
        break;
      }

      updatePlayer(GS.player, GS.mapState, delta);
      updateAnomalies(GS.anomalies, GS.player, GS.mapState, delta, GS.totalTime, onScanComplete);
      updateDoors(GS.mapState.doors, GS.player, delta);

      // Signal drain in low-signal zones
      if (isLowSignal(GS.mapState, GS.player.x, GS.player.y)) {
        GS.player.signal = Math.max(0, GS.player.signal - Config.SIGNAL_DRAIN_RATE * delta);
      } else {
        GS.player.signal = Math.min(Config.MAX_SIGNAL, GS.player.signal + 3 * delta);
      }

      if (GS.player.signal <= 0) {
        playDisplace();
        displace(GS.player);
        GS.phase = Config.STATE_DISPLACED;
        GS.displacedTimer = 0;
        break;
      }

      // Scan hold tracking
      GS.scanTarget = getTargetedAnomaly(GS.anomalies, GS.player, GS.mapState);
      if (InputState.scanHeld && GS.scanTarget) {
        InputState.scanHoldMs += delta * 1000;
        GS.phase = Config.STATE_SCANNING;
        GS.player.scanHeld = true;
      } else {
        if (!InputState.scanHeld) InputState.scanHoldMs = 0;
        GS.phase = Config.STATE_PLAYING;
        GS.player.scanHeld = false;
      }

      // Ambient log entries
      GS.ambientLogTimer -= delta;
      if (GS.ambientLogTimer <= 0 && GS.log.entries.length < 8) {
        addAmbientEntry(GS.log, GS.log.entries.length);
        GS.ambientLogTimer = 90 + Math.random() * 60;
      }

      // Audio
      const resonDist = getNearestResonatorDist(GS.anomalies, GS.player);
      updateDroneFrequency(resonDist);

      // Win check — all non-resonator anomalies scanned
      const scannableCount = GS.anomalies.filter(a => a.type !== Config.ANOM_RESONATOR).length;
      const scannedCount   = GS.anomalies.filter(a => a.scanned).length;
      if (scannedCount >= scannableCount && scannableCount > 0) {
        GS.winTimer += delta;
        if (GS.winTimer > 1.5) GS.phase = Config.STATE_WIN;
      }
      break;
    }

    case Config.STATE_LOG_OPEN:
      if (InputState.logToggle || InputState.pause) {
        consumeLog();
        consumePause();
        GS.log.open = false;
        GS.phase = Config.STATE_PLAYING;
      }
      if (InputState.confirm) {
        consumeConfirm();
        GS.log.open = false;
        GS.phase = Config.STATE_PLAYING;
      }
      break;

    case Config.STATE_DISPLACED:
      GS.displacedTimer += delta;
      if (GS.displacedTimer >= Config.DISPLACED_DURATION) {
        GS.phase = Config.STATE_PLAYING;
      }
      break;

    case Config.STATE_WIN:
      if (InputState.confirm) {
        consumeConfirm();
        resetGame();
        GS.phase = Config.STATE_MENU;
      }
      break;
  }
}

function onScanComplete(anomaly) {
  addScanEntry(GS.log, anomaly);
  playScanSuccess();
}

function render() {
  switch (GS.phase) {
    case Config.STATE_MENU:
      drawMenu(ctx);
      break;

    case Config.STATE_PLAYING:
    case Config.STATE_SCANNING: {
      applyResonatorWarp(GS.anomalies, GS.player);
      castWalls(ctx, GS.player, GS.mapState, GS.textures);
      const sprites = buildAnomalySprites(GS.anomalies, GS.textures);
      drawSprites(ctx, GS.player, sprites);
      drawHUD(ctx, GS.player, GS.anomalies, GS.mapState,
        GS.scanTarget, InputState.scanHoldMs);
      break;
    }

    case Config.STATE_LOG_OPEN: {
      applyResonatorWarp(GS.anomalies, GS.player);
      castWalls(ctx, GS.player, GS.mapState, GS.textures);
      const sprites = buildAnomalySprites(GS.anomalies, GS.textures);
      drawSprites(ctx, GS.player, sprites);
      drawHUD(ctx, GS.player, GS.anomalies, GS.mapState, null, 0);
      drawLog(ctx, GS.log);
      break;
    }

    case Config.STATE_DISPLACED: {
      applyResonatorWarp(GS.anomalies, GS.player);
      castWalls(ctx, GS.player, GS.mapState, GS.textures);
      const sprites2 = buildAnomalySprites(GS.anomalies, GS.textures);
      drawSprites(ctx, GS.player, sprites2);
      drawHUD(ctx, GS.player, GS.anomalies, GS.mapState, null, 0);
      drawDisplaced(ctx, GS.displacedTimer / Config.DISPLACED_DURATION);
      break;
    }

    case Config.STATE_WIN:
      applyResonatorWarp(GS.anomalies, GS.player);
      castWalls(ctx, GS.player, GS.mapState, GS.textures);
      drawWin(ctx);
      break;

    default:
      ctx.fillStyle = '#060a0d';
      ctx.fillRect(0, 0, Config.WIDTH, Config.HEIGHT);
  }
}

init();
