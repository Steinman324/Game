import { Config } from './config.js';

const W = Config.CANVAS_WIDTH;
const H = Config.CANVAS_HEIGHT;
const HH = Math.floor(H / 2);

// Shared frame buffer — single putImageData per frame
export const frameBuf = new Uint8ClampedArray(W * H * 4);
export const frameImgData = new ImageData(frameBuf, W, H);
export const zBuffer = new Float32Array(W);

// Reused column temp buffer for Resonator warp
const _colTemp = new Uint8Array(H * 4);

// ── floor / ceiling gradient initialisation ────────────────────────────────────
// Pre-compute per-row shading for floor/ceiling using Lode-style floor casting.
// We skip full texture sampling (no external assets); use solid gradient instead.
function clearFrame() {
  for (let y = 0; y < H; y++) {
    const t = y / H; // 0 = top, 1 = bottom
    let r, g, b;
    if (y < HH) {
      // Ceiling: near-black at top, slightly lighter at horizon
      const f = y / HH;
      r = Math.floor(13 + f * 10);
      g = Math.floor(14 + f * 11);
      b = Math.floor(18 + f * 12);
    } else {
      // Floor: lighter near horizon, darker at bottom
      const f = 1 - (y - HH) / HH;
      r = Math.floor(18 + f * 10);
      g = Math.floor(20 + f * 10);
      b = Math.floor(24 + f * 12);
    }
    const rowBase = y * W * 4;
    for (let x = 0; x < W; x++) {
      const i = rowBase + x * 4;
      frameBuf[i]   = r;
      frameBuf[i+1] = g;
      frameBuf[i+2] = b;
      frameBuf[i+3] = 255;
    }
  }
}

// ── main wall cast ────────────────────────────────────────────────────────────

export function castWalls(player, mapState, textures) {
  clearFrame();

  const { grid, doors } = mapState;
  const { x: px, y: py, dirX, dirY, planeX, planeY, bobAmount } = player;
  const bob = Math.round(bobAmount);
  const T = Config.TEX_SIZE;

  for (let col = 0; col < W; col++) {
    const cameraX = 2 * col / W - 1;
    const rayDirX = dirX + planeX * cameraX;
    const rayDirY = dirY + planeY * cameraX;

    let mapX = Math.floor(px);
    let mapY = Math.floor(py);

    const deltaDistX = rayDirX === 0 ? 1e30 : Math.abs(1 / rayDirX);
    const deltaDistY = rayDirY === 0 ? 1e30 : Math.abs(1 / rayDirY);

    let stepX, stepY, sideDistX, sideDistY;
    if (rayDirX < 0) { stepX = -1; sideDistX = (px - mapX) * deltaDistX; }
    else             { stepX =  1; sideDistX = (mapX + 1 - px) * deltaDistX; }
    if (rayDirY < 0) { stepY = -1; sideDistY = (py - mapY) * deltaDistY; }
    else             { stepY =  1; sideDistY = (mapY + 1 - py) * deltaDistY; }

    let side = 0, cellType = 0, perpWallDist = 0;
    let wallX = 0, doorHit = false;

    // DDA loop
    for (let depth = 0; depth < Config.MAX_DEPTH; depth++) {
      if (sideDistX < sideDistY) { sideDistX += deltaDistX; mapX += stepX; side = 0; }
      else                       { sideDistY += deltaDistY; mapY += stepY; side = 1; }

      if (mapX < 0 || mapX >= Config.MAP_WIDTH || mapY < 0 || mapY >= Config.MAP_HEIGHT) {
        cellType = 1;
        perpWallDist = side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY;
        break;
      }

      cellType = grid[mapY][mapX];

      if (cellType === Config.CELL_DOOR) {
        // Classic Wolf3D door: test at midpoint of cell
        const halfDist = side === 0 ? sideDistX - deltaDistX * 0.5 : sideDistY - deltaDistY * 0.5;
        let wx = side === 0 ? py + halfDist * rayDirY : px + halfDist * rayDirX;
        wx -= Math.floor(wx);
        const door = doors[`${mapX},${mapY}`];
        const dOff = door ? door.offset : 0;
        if (wx < dOff) continue; // ray passes through open portion
        doorHit = true;
        wallX = wx - dOff;
        perpWallDist = halfDist;
        break;
      }

      if (cellType > 0) {
        perpWallDist = side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY;
        if (!doorHit) {
          wallX = side === 0 ? py + perpWallDist * rayDirY : px + perpWallDist * rayDirX;
          wallX -= Math.floor(wallX);
        }
        break;
      }
    }

    perpWallDist = Math.max(0.001, perpWallDist);
    zBuffer[col] = perpWallDist;

    const lineHeight = Math.floor(H / perpWallDist);
    const drawStart = Math.max(0, Math.floor(HH - lineHeight / 2) + bob);
    const drawEnd   = Math.min(H - 1, Math.floor(HH + lineHeight / 2) + bob);
    if (drawEnd <= drawStart) continue;

    // Select texture
    let texData;
    if (doorHit) {
      texData = textures.door;
    } else {
      texData = textures.walls[Math.min(cellType, textures.walls.length - 1)];
    }
    if (!texData) continue;

    let texX = Math.floor(wallX * T);
    if (!doorHit) {
      if (side === 0 && rayDirX > 0) texX = T - texX - 1;
      if (side === 1 && rayDirY < 0) texX = T - texX - 1;
    }
    texX = Math.max(0, Math.min(T - 1, texX));

    const sideShade = (side === 1 && !doorHit) ? Config.WALL_SHADE_SIDE : 1.0;
    const distShade = Math.max(0.18, 1.0 - perpWallDist / Config.MAX_DEPTH * 0.82);
    const shade = sideShade * distShade;

    const colH = drawEnd - drawStart;
    const step = T / lineHeight;
    let texPos = (drawStart - bob - (HH - lineHeight / 2)) * step;

    for (let y = drawStart; y <= drawEnd; y++) {
      const texY = Math.max(0, Math.min(T - 1, Math.floor(texPos)));
      texPos += step;
      const src = (texY * T + texX) * 4;
      const dst = (y * W + col) * 4;
      frameBuf[dst]   = texData.data[src]   * shade;
      frameBuf[dst+1] = texData.data[src+1] * shade;
      frameBuf[dst+2] = texData.data[src+2] * shade;
      frameBuf[dst+3] = 255;
    }
  }
}

// ── Resonator warp — applied AFTER castWalls, BEFORE sprite draw ───────────────

export function applyResonatorWarp(anomalies, player) {
  for (const a of anomalies) {
    if (a.type !== 'RESONATOR') continue;
    const dx = a.x - player.x, dy = a.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > Config.RESONATOR_RANGE) continue;

    const invDet = 1 / (player.planeX * player.dirY - player.dirX * player.planeY);
    const transformX = invDet * ( player.dirY * dx  - player.dirX * dy);
    const transformY = invDet * (-player.planeY * dx + player.planeX * dy);
    if (transformY <= 0.1) continue;

    const screenX = Math.floor(W / 2 * (1 + transformX / transformY));
    const influence = Math.max(1, Math.floor(W * 0.28 * (1 - dist / Config.RESONATOR_RANGE)));
    const strength  = Config.RESONATOR_WARP_AMT * (1 - dist / Config.RESONATOR_RANGE);
    const phase = a.pulsePhase;

    for (let x = Math.max(0, screenX - influence); x < Math.min(W, screenX + influence); x++) {
      const d = Math.abs(x - screenX) / influence;
      const offset = Math.round(strength * (1 - d) * Math.sin(phase + x * 0.18));
      if (offset === 0) continue;

      // Copy column into temp buffer
      for (let y = 0; y < H; y++) {
        const si = (y * W + x) * 4;
        const di = y * 4;
        _colTemp[di]   = frameBuf[si];
        _colTemp[di+1] = frameBuf[si+1];
        _colTemp[di+2] = frameBuf[si+2];
        _colTemp[di+3] = frameBuf[si+3];
      }
      // Write back shifted
      for (let y = 0; y < H; y++) {
        const srcY = Math.max(0, Math.min(H - 1, y - offset));
        const si = srcY * 4;
        const di = (y * W + x) * 4;
        frameBuf[di]   = _colTemp[si];
        frameBuf[di+1] = _colTemp[si+1];
        frameBuf[di+2] = _colTemp[si+2];
        frameBuf[di+3] = _colTemp[si+3];
      }
    }
  }
}

export function commitFrame(ctx) {
  ctx.putImageData(frameImgData, 0, 0);
}
