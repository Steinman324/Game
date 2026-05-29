import { Config } from './config.js';
import { zBuffer } from './raycaster.js';

export function drawSprites(ctx, player, sprites) {
  if (!sprites || sprites.length === 0) return;

  const W = Config.WIDTH;
  const H = Config.HEIGHT;

  // Translate relative to player
  const translated = sprites.map(s => {
    const dx = s.x - player.x;
    const dy = s.y - player.y;
    return { ...s, dx, dy, distSq: dx * dx + dy * dy };
  });

  // Back-to-front sort
  translated.sort((a, b) => b.distSq - a.distSq);

  const invDet = 1.0 / (player.planeX * player.dirY - player.dirX * player.planeY);

  for (const sprite of translated) {
    const transformX = invDet * (player.dirY * sprite.dx - player.dirX * sprite.dy);
    const transformY = invDet * (-player.planeY * sprite.dx + player.planeX * sprite.dy);

    if (transformY <= 0.05) continue;

    const spriteScreenX = Math.floor((W / 2) * (1 + transformX / transformY));

    const scale = sprite.scale || 1.0;
    const spriteHeight = Math.abs(Math.floor(H / transformY)) * scale;
    const spriteWidth  = spriteHeight;

    // Vertical bob for items
    const bobPx = sprite.bobOffset ? Math.round(sprite.bobOffset * spriteHeight) : 0;

    const drawStartY = Math.max(0, Math.floor(H / 2 - spriteHeight / 2) + bobPx);
    const drawEndY   = Math.min(H - 1, Math.floor(H / 2 + spriteHeight / 2) + bobPx);
    const drawStartX = Math.max(0, Math.floor(spriteScreenX - spriteWidth / 2));
    const drawEndX   = Math.min(W - 1, Math.floor(spriteScreenX + spriteWidth / 2));

    const stripW = drawEndX - drawStartX + 1;
    const stripH = drawEndY - drawStartY + 1;
    if (stripW <= 0 || stripH <= 0) continue;

    const texData = sprite.texture;
    if (!texData) continue;

    const texW = Config.TEX_SIZE;
    const texH = Config.TEX_SIZE;
    const dist = Math.sqrt(sprite.distSq);
    const distShade = Math.max(0.18, 1 - dist / Config.MAX_DEPTH * 0.82);

    const imageData = ctx.createImageData(stripW, stripH);
    const data = imageData.data;
    let hasVisible = false;

    for (let sx = 0; sx < stripW; sx++) {
      const screenX = drawStartX + sx;
      if (zBuffer[screenX] < transformY) continue;

      const realTexX = Math.floor(((screenX - (spriteScreenX - spriteWidth / 2)) / spriteWidth) * texW);
      if (realTexX < 0 || realTexX >= texW) continue;

      for (let sy = 0; sy < stripH; sy++) {
        const screenY = drawStartY + sy - bobPx;
        const realTexY = Math.floor(((screenY - (H / 2 - spriteHeight / 2)) / spriteHeight) * texH);
        if (realTexY < 0 || realTexY >= texH) continue;

        const srcIdx = (realTexY * texW + realTexX) * 4;
        if (texData.data[srcIdx + 3] < 128) continue;

        hasVisible = true;
        const dstIdx = (sy * stripW + sx) * 4;
        data[dstIdx]   = texData.data[srcIdx]   * distShade;
        data[dstIdx+1] = texData.data[srcIdx+1] * distShade;
        data[dstIdx+2] = texData.data[srcIdx+2] * distShade;
        data[dstIdx+3] = texData.data[srcIdx+3];
      }
    }

    if (hasVisible) ctx.putImageData(imageData, drawStartX, drawStartY);
  }
}
