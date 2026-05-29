import { Config } from './config.js';

// Z-buffer: one entry per screen column (perpendicular wall distance)
export const zBuffer = new Float32Array(Config.WIDTH);

// Reused frame buffer for floor/ceiling (avoid GC churn)
const _frameData = new ImageData(Config.WIDTH, Config.HEIGHT);

export function castWalls(ctx, player, mapState, textures) {
  const W = Config.WIDTH;
  const H = Config.HEIGHT;
  const HH = Config.HALF_HEIGHT;
  const buf = _frameData.data;

  // ── PASS 1: Floor + ceiling via textured floor casting ────────────────────
  const floorTex = textures.floor;
  const ceilTex  = textures.ceiling;
  const texW = Config.TEX_SIZE;
  const texH = Config.TEX_SIZE;

  // Ray directions for left and right edge of screen
  const rdX0 = player.dirX - player.planeX;
  const rdY0 = player.dirY - player.planeY;
  const rdX1 = player.dirX + player.planeX;
  const rdY1 = player.dirY + player.planeY;

  for (let y = 0; y < H; y++) {
    const isFloor = y > HH;
    // Row's distance from camera plane
    const yRelToHorizon = y - HH;
    if (yRelToHorizon === 0) continue; // skip exact horizon
    const rowDist = HH / Math.abs(yRelToHorizon);

    const stepX = rowDist * (rdX1 - rdX0) / W;
    const stepY = rowDist * (rdY1 - rdY0) / W;

    let floorX = player.x + rowDist * rdX0;
    let floorY = player.y + rowDist * rdY0;

    // Darker farther away
    const shade = isFloor
      ? Math.max(0.12, Math.min(0.9, 0.15 + 0.7 * (1 - rowDist / 8)))
      : Math.max(0.06, Math.min(0.5, 0.07 + 0.38 * (1 - rowDist / 10)));

    const tex = isFloor ? floorTex : ceilTex;
    const rowBase = y * W * 4;

    for (let x = 0; x < W; x++) {
      const tx = ((Math.floor(floorX) % texW) + texW) % texW;
      const ty = ((Math.floor(floorY) % texH) + texH) % texH;
      const txFrac = floorX - Math.floor(floorX);
      const tyFrac = floorY - Math.floor(floorY);
      const stx = Math.floor(txFrac * texW) & (texW - 1);
      const sty = Math.floor(tyFrac * texH) & (texH - 1);
      const srcIdx = (sty * texW + stx) * 4;
      const dstIdx = rowBase + x * 4;

      buf[dstIdx]   = tex.data[srcIdx]   * shade;
      buf[dstIdx+1] = tex.data[srcIdx+1] * shade;
      buf[dstIdx+2] = tex.data[srcIdx+2] * shade;
      buf[dstIdx+3] = 255;

      floorX += stepX;
      floorY += stepY;
    }
  }

  // Fill exact horizon line (yRelToHorizon === 0 skipped above)
  const horizBase = HH * W * 4;
  for (let x = 0; x < W; x++) {
    const i = horizBase + x * 4;
    buf[i] = 18; buf[i+1] = 18; buf[i+2] = 20; buf[i+3] = 255;
  }

  ctx.putImageData(_frameData, 0, 0);

  // ── PASS 2: Wall columns ───────────────────────────────────────────────────
  for (let col = 0; col < W; col++) {
    const cameraX = (2 * col / W) - 1;
    const rayDirX = player.dirX + player.planeX * cameraX;
    const rayDirY = player.dirY + player.planeY * cameraX;

    let mapX = Math.floor(player.x);
    let mapY = Math.floor(player.y);

    const deltaDistX = rayDirX === 0 ? 1e30 : Math.abs(1 / rayDirX);
    const deltaDistY = rayDirY === 0 ? 1e30 : Math.abs(1 / rayDirY);

    let stepX, stepY;
    let sideDistX, sideDistY;

    if (rayDirX < 0) {
      stepX = -1;
      sideDistX = (player.x - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1 - player.x) * deltaDistX;
    }
    if (rayDirY < 0) {
      stepY = -1;
      sideDistY = (player.y - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1 - player.y) * deltaDistY;
    }

    let side = 0;
    let cellType = 0;
    let perpWallDist = 0;
    let doorHit = false;
    let doorWallX = 0;

    // DDA
    for (let depth = 0; depth < Config.MAX_DEPTH; depth++) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }

      if (mapX < 0 || mapX >= Config.MAP_WIDTH || mapY < 0 || mapY >= Config.MAP_HEIGHT) {
        cellType = 1;
        perpWallDist = side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY;
        break;
      }

      cellType = mapState.grid[mapY][mapX];

      if (cellType === 9) {
        // Door: test ray at the MIDPOINT of the door cell (classic Wolf3D technique)
        // Advance half a delta step from the near face of the cell
        let halfDist;
        if (side === 0) {
          halfDist = sideDistX - deltaDistX * 0.5;
        } else {
          halfDist = sideDistY - deltaDistY * 0.5;
        }

        // Wall X at mid-cell
        let wallX = side === 0
          ? player.y + halfDist * rayDirY
          : player.x + halfDist * rayDirX;
        wallX -= Math.floor(wallX);

        const key = `${mapX},${mapY}`;
        const door = mapState.doors[key];
        const dOffset = door ? door.offset : 0;

        if (wallX < dOffset) {
          // Door has slid past this texture column — ray passes through
          continue;
        }

        // Hit the door face at mid-cell
        doorHit = true;
        doorWallX = wallX;
        perpWallDist = halfDist;
        break;
      }

      if (cellType > 0) {
        perpWallDist = side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY;
        break;
      }
    }

    perpWallDist = Math.max(0.001, perpWallDist);
    zBuffer[col] = perpWallDist;

    const lineHeight = Math.floor(H / perpWallDist);
    const bob = Math.round(player.bobAmount);
    const drawStart = Math.max(0, Math.floor(HH - lineHeight / 2) + bob);
    const drawEnd   = Math.min(H - 1, Math.floor(HH + lineHeight / 2) + bob);
    const colPixels = drawEnd - drawStart;
    if (colPixels <= 0) continue;

    // Texture coordinate
    let wallX;
    if (doorHit) {
      wallX = doorWallX;
    } else if (side === 0) {
      wallX = player.y + perpWallDist * rayDirY;
      wallX -= Math.floor(wallX);
    } else {
      wallX = player.x + perpWallDist * rayDirX;
      wallX -= Math.floor(wallX);
    }

    const texData = doorHit
      ? textures.door
      : (textures.walls[Math.min(cellType, textures.walls.length - 1)]);

    if (!texData) { zBuffer[col] = 1e30; continue; }

    let texX = Math.floor(wallX * texW);
    if (!doorHit) {
      if (side === 0 && rayDirX > 0) texX = texW - texX - 1;
      if (side === 1 && rayDirY < 0) texX = texW - texX - 1;
    }
    texX = Math.max(0, Math.min(texW - 1, texX));

    const sideShade = (side === 1 && !doorHit) ? Config.WALL_SHADE_SIDE : 1.0;
    const distShade = Math.max(0.3, 1 - perpWallDist / Config.MAX_DEPTH * 0.75);
    const finalShade = sideShade * distShade;

    const step = texH / lineHeight;
    let texPos = (drawStart - bob - (HH - lineHeight / 2)) * step;

    const imageData = ctx.createImageData(1, colPixels);
    const data = imageData.data;

    for (let y = 0; y < colPixels; y++) {
      const texY = Math.max(0, Math.min(texH - 1, Math.floor(texPos)));
      texPos += step;
      const srcIdx = (texY * texW + texX) * 4;
      const dstIdx = y * 4;
      data[dstIdx]   = texData.data[srcIdx]   * finalShade;
      data[dstIdx+1] = texData.data[srcIdx+1] * finalShade;
      data[dstIdx+2] = texData.data[srcIdx+2] * finalShade;
      data[dstIdx+3] = 255;
    }
    ctx.putImageData(imageData, col, drawStart);
  }
}
