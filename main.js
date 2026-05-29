import { Config } from './engine/config.js';
import { initInput, InputState, consumeConfirm, consumePause } from './engine/input.js';
import { createMapState, ITEM_SPAWNS, EXIT_POS } from './engine/map.js';
import { createPlayer, updatePlayer } from './engine/player.js';
import { createEnemies, updateEnemies, shootEnemies, buildEnemySprites } from './engine/enemies.js';
import { updateDoors, resetDoors } from './engine/doors.js';
import { createItems, updateItems, buildItemSprites } from './engine/items.js';
import { castWalls } from './engine/raycaster.js';
import { drawSprites } from './engine/sprites.js';
import { drawHUD, drawMenu, drawPaused, drawGameOver, drawWin } from './engine/hud.js';
import { loadTextures } from './assets/textures.js';
import { initAudio, playSound } from './engine/audio.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = Config.WIDTH;
canvas.height = Config.HEIGHT;

let textures = null;
let gameState = Config.STATE_LOADING;
let player = null;
let mapState = null;
let enemies = null;
let items = null;
let gunFrame = 0;
let gunTimer = 0;
let hitFlash = 0;
let pickupFlash = 0;
let totalTime = 0;
let lastTime = 0;

function resetGame() {
  mapState = createMapState();
  player = createPlayer();
  enemies = createEnemies();
  items = createItems(ITEM_SPAWNS);
  resetDoors(mapState.doors);
  gunFrame = 0;
  gunTimer = 0;
  hitFlash = 0;
  pickupFlash = 0;
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
      updateDoors(mapState.doors, delta, playSound);

      // Items
      const pickedUp = updateItems(items, player, delta, playSound);
      if (pickedUp) {
        pickupFlash = 1.0;
        player._lastPickup = pickedUp;
      }
      if (pickupFlash > 0) pickupFlash = Math.max(0, pickupFlash - delta * 2.5);

      // Shooting
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

      // Hit flash
      const prevHealth = player._lastHealth !== undefined ? player._lastHealth : player.health;
      if (player.health < prevHealth) hitFlash = 1.0;
      player._lastHealth = player.health;
      hitFlash = Math.max(0, hitFlash - delta * 2.8);

      // Win / death
      const allDead = enemies.every(e => e.state >= Config.ENEMY_DYING);
      const dx = player.x - EXIT_POS.x;
      const dy = player.y - EXIT_POS.y;
      if (allDead || dx * dx + dy * dy < 1.2) gameState = Config.STATE_WIN;
      if (player.health <= 0) gameState = Config.STATE_GAME_OVER;
      break;

    case Config.STATE_PAUSED:
      if (InputState.pause || InputState.confirm) {
        if (InputState.pause) consumePause();
        else consumeConfirm();
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
      ctx.textAlign = 'center';
      ctx.fillText('Loading...', Config.WIDTH / 2, Config.HEIGHT / 2);
      ctx.textAlign = 'left';
      break;

    case Config.STATE_MENU:
      drawMenu(ctx);
      break;

    case Config.STATE_PLAYING: {
      castWalls(ctx, player, mapState, textures);
      const sprites = [
        ...buildEnemySprites(enemies, textures),
        ...buildItemSprites(items, textures),
      ];
      drawSprites(ctx, player, sprites);
      drawHUD(ctx, player, enemies, mapState, textures, gunFrame, hitFlash, pickupFlash);
      break;
    }

    case Config.STATE_PAUSED: {
      castWalls(ctx, player, mapState, textures);
      const sprites = [
        ...buildEnemySprites(enemies, textures),
        ...buildItemSprites(items, textures),
      ];
      drawSprites(ctx, player, sprites);
      drawHUD(ctx, player, enemies, mapState, textures, gunFrame, hitFlash, pickupFlash);
      drawPaused(ctx);
      break;
    }

    case Config.STATE_GAME_OVER:
      castWalls(ctx, player, mapState, textures);
      drawGameOver(ctx);
      break;

    case Config.STATE_WIN:
      castWalls(ctx, player, mapState, textures);
      drawWin(ctx);
      break;
  }
}

init();
