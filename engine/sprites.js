import { Config } from './config.js';
import { frameBuf, zBuffer } from './raycaster.js';

const W = Config.CANVAS_WIDTH;
const H = Config.CANVAS_HEIGHT;
const T = Config.TEX_SIZE;

export function drawSpritesToBuffer(player, sprites) {
  if (!sprites || sprites.length === 0) return;

  // Compute camera-space depth for each sprite
  const invDet = 1 / (player.planeX * player.dirY - player.dirX * player.planeY);

  const projected = [];
  for (const s of sprites) {
    const dx = s.x - player.x;
    const dy = s.y - player.y;
    const tx = invDet * ( player.dirY * dx  - player.dirX * dy);
    const ty = invDet * (-player.planeY * dx + player.planeX * dy);
    if (ty <= 0.05) continue; // behind or on camera plane
    projected.push({ ...s, transformX: tx, transformY: ty, distSq: dx * dx + dy * dy });
  }

  // Sort far to near (painter's algorithm; Z-buffer handles per-pixel occlusion)
  projected.sort((a, b) => b.distSq - a.distSq);

  for (const s of projected) {
    const { transformX, transformY, distSq } = s;
    const screenX = Math.floor(W / 2 * (1 + transformX / transformY));
    const scale = s.scale ?? 1.0;
    const sH = Math.abs(Math.floor(H / transformY)) * scale;
    const sW = sH;

    const drawStartY = Math.max(0,     Math.floor(H / 2 - sH / 2));
    const drawEndY   = Math.min(H - 1, Math.floor(H / 2 + sH / 2));
    const drawStartX = Math.max(0,     Math.floor(screenX - sW / 2));
    const drawEndX   = Math.min(W - 1, Math.floor(screenX + sW / 2));
    if (drawEndX < drawStartX || drawEndY < drawStartY) continue;

    const texData = s.texture;
    if (!texData) continue;

    const dist    = Math.sqrt(distSq);
    const distSh  = Math.max(0.1, 1 - dist / Config.MAX_DEPTH * 0.85);
    const alpha   = s.alpha ?? 1.0;

    for (let sx = drawStartX; sx <= drawEndX; sx++) {
      if (zBuffer[sx] < transformY) continue; // wall in front

      const texXfrac = (sx - (screenX - sW / 2)) / sW;
      const texX = Math.max(0, Math.min(T - 1, Math.floor(texXfrac * T)));

      for (let sy = drawStartY; sy <= drawEndY; sy++) {
        const texYfrac = (sy - (H / 2 - sH / 2)) / sH;
        const texY = Math.max(0, Math.min(T - 1, Math.floor(texYfrac * T)));

        const src = (texY * T + texX) * 4;
        if (texData.data[src + 3] < 32) continue; // transparent pixel

        const a = (texData.data[src + 3] / 255) * alpha;
        const dst = (sy * W + sx) * 4;
        frameBuf[dst]   = Math.floor(frameBuf[dst]   * (1 - a) + texData.data[src]   * distSh * a);
        frameBuf[dst+1] = Math.floor(frameBuf[dst+1] * (1 - a) + texData.data[src+1] * distSh * a);
        frameBuf[dst+2] = Math.floor(frameBuf[dst+2] * (1 - a) + texData.data[src+2] * distSh * a);
        frameBuf[dst+3] = 255;
      }
    }
  }
}
