import { Config } from './config.js';
import { zBuffer } from './raycaster.js';

export function drawSprites(ctx, player, sprites) {
  if (!sprites || sprites.length === 0) return;

  const W = Config.WIDTH, H = Config.HEIGHT;
  const invDet = 1.0 / (player.planeX * player.dirY - player.dirX * player.planeY);

  // Translate + sort back-to-front
  const transformed = sprites
    .map(s => {
      const dx = s.x - player.x, dy = s.y - player.y;
      return { ...s, dx, dy, distSq: dx * dx + dy * dy };
    })
    .sort((a, b) => b.distSq - a.distSq);

  for (const sprite of transformed) {
    const tX = invDet * (player.dirY * sprite.dx - player.dirX * sprite.dy);
    const tY = invDet * (-player.planeY * sprite.dx + player.planeX * sprite.dy);
    if (tY <= 0.05) continue;

    const screenX = Math.floor((W / 2) * (1 + tX / tY));
    const scale = sprite.scale || 1.0;
    const sprH = Math.abs(Math.floor(H / tY)) * scale;
    const sprW = sprH;

    const drawStartY = Math.max(0, Math.floor(H / 2 - sprH / 2));
    const drawEndY   = Math.min(H - 1, Math.floor(H / 2 + sprH / 2));
    const drawStartX = Math.max(0, Math.floor(screenX - sprW / 2));
    const drawEndX   = Math.min(W - 1, Math.floor(screenX + sprW / 2));

    const stripW = drawEndX - drawStartX + 1;
    const stripH = drawEndY - drawStartY + 1;
    if (stripW <= 0 || stripH <= 0) continue;

    const texData = sprite.texture;
    if (!texData) continue;

    const texW = Config.TEX_SIZE, texH = Config.TEX_SIZE;
    const dist = Math.sqrt(sprite.distSq);
    const distShade = Math.max(0.15, 1 - dist / Config.MAX_DEPTH * 0.85);
    const alpha = sprite.alpha !== undefined ? sprite.alpha : 1.0;

    const imgd = ctx.createImageData(stripW, stripH);
    const data = imgd.data;
    let hasVis = false;

    for (let sx = 0; sx < stripW; sx++) {
      const screenCol = drawStartX + sx;
      if (zBuffer[screenCol] < tY) continue;
      const rtx = Math.floor(((screenCol - (screenX - sprW / 2)) / sprW) * texW);
      if (rtx < 0 || rtx >= texW) continue;

      for (let sy = 0; sy < stripH; sy++) {
        const screenRow = drawStartY + sy;
        const rty = Math.floor(((screenRow - (H / 2 - sprH / 2)) / sprH) * texH);
        if (rty < 0 || rty >= texH) continue;
        const src = (rty * texW + rtx) * 4;
        if (texData.data[src + 3] < 64) continue;
        hasVis = true;
        const dst = (sy * stripW + sx) * 4;
        data[dst]   = texData.data[src]   * distShade;
        data[dst+1] = texData.data[src+1] * distShade;
        data[dst+2] = texData.data[src+2] * distShade;
        data[dst+3] = Math.floor(texData.data[src+3] * alpha);
      }
    }

    if (hasVis) ctx.putImageData(imgd, drawStartX, drawStartY);
  }
}
