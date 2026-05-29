import { Config } from './config.js';

export const zBuffer = new Float32Array(Config.WIDTH);
// Per-column warp amounts written by anomalies system
export const columnWarp = new Float32Array(Config.WIDTH);

const _frameData = new ImageData(Config.WIDTH, Config.HEIGHT);

export function castWalls(ctx, player, mapState, textures) {
  const W = Config.WIDTH, H = Config.HEIGHT, HH = Config.HALF_HEIGHT;
  const buf = _frameData.data;

  // ─── Floor / ceiling pass ────────────────────────────────────────────────
  const rdX0 = player.dirX - player.planeX, rdY0 = player.dirY - player.planeY;
  const rdX1 = player.dirX + player.planeX, rdY1 = player.dirY + player.planeY;
  const floorTex = textures.floor, ceilTex = textures.ceiling;
  const texW = Config.TEX_SIZE;

  for (let y = 0; y < H; y++) {
    const yRel = y - HH;
    if (yRel === 0) continue;
    const rowDist = HH / Math.abs(yRel);
    const stepX = rowDist * (rdX1 - rdX0) / W;
    const stepY = rowDist * (rdY1 - rdY0) / W;
    let fx = player.x + rowDist * rdX0;
    let fy = player.y + rowDist * rdY0;
    const isFloor = y > HH;
    const shade = isFloor
      ? Math.max(0.10, Math.min(0.85, 0.12 + 0.65 * (1 - rowDist / 8)))
      : Math.max(0.05, Math.min(0.45, 0.06 + 0.35 * (1 - rowDist / 10)));
    const tex = isFloor ? floorTex : ceilTex;
    const rowBase = y * W * 4;

    for (let x = 0; x < W; x++) {
      const stx = Math.floor((fx - Math.floor(fx)) * texW) & (texW - 1);
      const sty = Math.floor((fy - Math.floor(fy)) * texW) & (texW - 1);
      const src = (sty * texW + stx) * 4;
      const dst = rowBase + x * 4;
      buf[dst]   = tex.data[src]   * shade;
      buf[dst+1] = tex.data[src+1] * shade;
      buf[dst+2] = tex.data[src+2] * shade;
      buf[dst+3] = 255;
      fx += stepX; fy += stepY;
    }
  }

  // Horizon fill
  const hz = HH * W * 4;
  for (let x = 0; x < W; x++) {
    const i = hz + x * 4;
    buf[i] = 14; buf[i+1] = 18; buf[i+2] = 22; buf[i+3] = 255;
  }

  ctx.putImageData(_frameData, 0, 0);

  // ─── Wall columns ────────────────────────────────────────────────────────
  for (let col = 0; col < W; col++) {
    const cameraX = (2 * col / W) - 1;
    const rayDirX = player.dirX + player.planeX * cameraX;
    const rayDirY = player.dirY + player.planeY * cameraX;

    let mapX = Math.floor(player.x), mapY = Math.floor(player.y);
    const ddx = rayDirX === 0 ? 1e30 : Math.abs(1 / rayDirX);
    const ddy = rayDirY === 0 ? 1e30 : Math.abs(1 / rayDirY);
    const stepX = rayDirX < 0 ? -1 : 1;
    const stepY = rayDirY < 0 ? -1 : 1;
    let sdx = rayDirX < 0 ? (player.x - mapX) * ddx : (mapX + 1 - player.x) * ddx;
    let sdy = rayDirY < 0 ? (player.y - mapY) * ddy : (mapY + 1 - player.y) * ddy;

    let side = 0, cellType = 0, perpWallDist = 0, doorHit = false, doorWallX = 0;

    for (let depth = 0; depth < Config.MAX_DEPTH; depth++) {
      if (sdx < sdy) { sdx += ddx; mapX += stepX; side = 0; }
      else           { sdy += ddy; mapY += stepY; side = 1; }

      if (mapX < 0 || mapX >= Config.MAP_WIDTH || mapY < 0 || mapY >= Config.MAP_HEIGHT) {
        cellType = 1;
        perpWallDist = side === 0 ? sdx - ddx : sdy - ddy;
        break;
      }

      cellType = mapState.grid[mapY][mapX];

      if (cellType === 9) {
        const halfDist = side === 0 ? sdx - ddx * 0.5 : sdy - ddy * 0.5;
        let wx = side === 0
          ? (player.y + halfDist * rayDirY) - Math.floor(player.y + halfDist * rayDirY)
          : (player.x + halfDist * rayDirX) - Math.floor(player.x + halfDist * rayDirX);
        const door = mapState.doors[`${mapX},${mapY}`];
        const dOffset = door ? door.offset : 0;
        if (wx < dOffset) continue;
        doorHit = true; doorWallX = wx;
        perpWallDist = halfDist; break;
      }

      if (cellType > 0 && cellType !== 5) {
        perpWallDist = side === 0 ? sdx - ddx : sdy - ddy;
        break;
      }
    }

    perpWallDist = Math.max(0.001, perpWallDist);
    zBuffer[col] = perpWallDist;

    const warp = columnWarp[col];
    const lineHeight = Math.floor(H / perpWallDist);
    const warped = lineHeight + Math.round(warp);
    const bob = Math.round(player.bobAmount);
    const drawStart = Math.max(0, Math.floor(HH - warped / 2) + bob);
    const drawEnd   = Math.min(H - 1, Math.floor(HH + warped / 2) + bob);
    const colPx = drawEnd - drawStart;
    if (colPx <= 0) continue;

    let wallX;
    if (doorHit) { wallX = doorWallX; }
    else if (side === 0) { wallX = player.y + perpWallDist * rayDirY; wallX -= Math.floor(wallX); }
    else { wallX = player.x + perpWallDist * rayDirX; wallX -= Math.floor(wallX); }

    const texIdx = doorHit ? 0 : Math.min(cellType, textures.walls.length - 1);
    const texData = doorHit ? textures.door : textures.walls[texIdx];
    if (!texData) { zBuffer[col] = 1e30; continue; }

    const texW2 = Config.TEX_SIZE;
    let texX = Math.floor(wallX * texW2);
    if (!doorHit) {
      if (side === 0 && rayDirX > 0) texX = texW2 - texX - 1;
      if (side === 1 && rayDirY < 0) texX = texW2 - texX - 1;
    }
    texX = Math.max(0, Math.min(texW2 - 1, texX));

    const sideShade = (side === 1 && !doorHit) ? Config.WALL_SHADE_SIDE : 1.0;
    const distShade = Math.max(0.28, 1 - perpWallDist / Config.MAX_DEPTH * 0.78);
    const finalShade = sideShade * distShade;
    const step = texW2 / warped;
    let texPos = (drawStart - bob - (HH - warped / 2)) * step;

    const imgd = ctx.createImageData(1, colPx);
    const data = imgd.data;
    for (let y = 0; y < colPx; y++) {
      const ty = Math.max(0, Math.min(texW2 - 1, Math.floor(texPos)));
      texPos += step;
      const src = (ty * texW2 + texX) * 4;
      const dst = y * 4;
      data[dst]   = texData.data[src]   * finalShade;
      data[dst+1] = texData.data[src+1] * finalShade;
      data[dst+2] = texData.data[src+2] * finalShade;
      data[dst+3] = 255;
    }
    ctx.putImageData(imgd, col, drawStart);
  }
}

export function applyResonatorWarp(anomalies, player) {
  for (let col = 0; col < Config.WIDTH; col++) {
    columnWarp[col] = 0;
  }
  for (const a of anomalies) {
    if (a.type !== 'resonator') continue;
    const dx = a.x - player.x, dy = a.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > Config.RESONATOR_RANGE) continue;
    const strength = (1 - dist / Config.RESONATOR_RANGE);
    const warpAmt = Config.RESONATOR_WARP_AMT * strength * Math.sin(a.phase);
    for (let col = 0; col < Config.WIDTH; col++) {
      columnWarp[col] += warpAmt * Math.sin(col / Config.WIDTH * Math.PI * 4);
    }
  }
}
