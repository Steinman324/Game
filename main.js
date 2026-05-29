import { Config } from './engine/config.js';
import { initInput, InputState, consumeConfirm, consumePause } from './engine/input.js';
import { createMapState } from './engine/map.js';
import { createPlayer, updatePlayer } from './engine/player.js';
import { createEnemies, updateEnemies, shootEnemies, buildEnemySprites } from './engine/enemies.js';
import { updateDoors, resetDoors } from './engine/doors.js';
import { castWalls } from './engine/raycaster.js';
import { drawSprites } from './engine/sprites.js';
import { drawHUD, drawMenu, drawPaused, drawGameOver, drawWin } from './engine/hud.js';
import { loadTextures } from './assets/textures.js';
import { initAudio, playSound } from './engine/audio.js';
import { EXIT_POS } from './engine/map.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = Config.WIDTH;
canvas.height = Config.HEIGHT;

let textures = null;
let gameState = Config.STATE_LOADING;
let player = null;
let mapState = null;
let enemies = null;
let gunFrame = 0;
let gunTimer = 0;
let hitFlash = 0;
let totalTime = 0;
let lastTime = 0;

function resetGame() {
  mapState = createMapState();
  player = createPlayer();
  enemies = createEnemies();
  resetDoors(mapState.doors);
  gunFrame = 0;
  gunTimer = 0;
  hitFlash = 0;
  totalTime = 0;
}

function init() {
  initInput(canvas);
  initAudio();
  textures = loadTextures();
  resetGame();
  gameState = Config.STATE_MENU;
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
    console.error('Game loop error:', e);
  }
  requestAnimationFrame(loop);
}

function update(delta) {
  switch (gameState) {
    case Config.STATE_MENU:
      if (InputState.confirm) {
        consumeConfirm();
        resetGame();
        gameState = Config.STATE_PLAYING;
      }
      break;

    case Config.STATE_PLAYING:
      totalTime += delta;

      if (InputState.pause) {
        consumePause();
        gameState = Config.STATE_PAUSED;
        break;
      }

      updatePlayer(player, mapState, mapState.doors, delta, enemies);
      updateEnemies(enemies, player, mapState, delta, playSound);
      updateDoors(mapState.doors, delta);

      // Handle shooting
      if (player.shootTriggered) {
        gunFrame = 1;
        gunTimer = Config.GUN_COOLDOWN;
        playSound('shoot');
        shootEnemies(enemies, player, mapState, playSound);
      }
      if (gunTimer > 0) {
        gunTimer -= delta;
        if (gunTimer <= 0) gunFrame = 0;
      }

      // Hit flash decay
      const prevHealth = player._lastHealth !== undefined ? player._lastHealth : player.health;
      if (player.health < prevHealth) hitFlash = 1.0;
      player._lastHealth = player.health;
      hitFlash = Math.max(0, hitFlash - delta * 3);

      // Check win condition: reach exit or kill all enemies
      const allDead = enemies.every(e => e.state === Config.ENEMY_DEAD);
      const dx = player.x - EXIT_POS.x;
      const dy = player.y - EXIT_POS.y;
      if (allDead || (dx * dx + dy * dy < 1)) {
        gameState = Config.STATE_WIN;
      }

      // Check death
      if (player.health <= 0) {
        gameState = Config.STATE_GAME_OVER;
      }
      break;

    case Config.STATE_PAUSED:
      if (InputState.pause) {
        consumePause();
        gameState = Config.STATE_PLAYING;
      }
      if (InputState.confirm) {
        consumeConfirm();
        gameState = Config.STATE_PLAYING;
      }
      break;

    case Config.STATE_GAME_OVER:
    case Config.STATE_WIN:
      if (InputState.confirm) {
        consumeConfirm();
        resetGame();
        gameState = Config.STATE_MENU;
      }
      break;
  }
}

function render() {
  switch (gameState) {
    case Config.STATE_LOADING:
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, Config.WIDTH, Config.HEIGHT);
      ctx.fillStyle = '#fff';
      ctx.font = '20px monospace';
      ctx.fillText('Loading...', Config.WIDTH / 2 - 40, Config.HEIGHT / 2);
      break;

    case Config.STATE_MENU:
      drawMenu(ctx);
      break;

    case Config.STATE_PLAYING: {
      castWalls(ctx, player, mapState, textures);
      const sprites = buildEnemySprites(enemies, textures);
      drawSprites(ctx, player, sprites, textures);
      drawHUD(ctx, player, enemies, mapState, textures, gunFrame, hitFlash);
      break;
    }

    case Config.STATE_PAUSED: {
      castWalls(ctx, player, mapState, textures);
      const sprites = buildEnemySprites(enemies, textures);
      drawSprites(ctx, player, sprites, textures);
      drawHUD(ctx, player, enemies, mapState, textures, gunFrame, hitFlash);
      drawPaused(ctx);
      break;
    }

    case Config.STATE_GAME_OVER: {
      castWalls(ctx, player, mapState, textures);
      drawGameOver(ctx);
      break;
    }

    case Config.STATE_WIN: {
      castWalls(ctx, player, mapState, textures);
      drawWin(ctx);
      break;
    }
  }
}

init();
