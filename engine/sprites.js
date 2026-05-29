import { Config } from './config.js';
import { zBuffer } from './raycaster.js';

export function drawSprites(ctx, player, sprites, textures) {
  if (!sprites || sprites.length === 0) return;

  const W = Config.WIDTH;
  const H = Config.HEIGHT;

  // Translate sprite positions relative to player
  const translated = sprites.map(s => {
    const dx = s.x - player.x;
    const dy = s.y - player.y;
    return { ...s, dx, dy, distSq: dx * dx + dy * dy };
  });

  // Sort back-to-front (farthest first)
  translated.sort((a, b) => b.distSq - a.distSq);

  // Camera inverse determinant for projection
  const invDet = 1.0 / (player.planeX * player.dirY - player.dirX * player.planeY);

  for (const sprite of translated) {
    // Transform sprite with the inverse camera matrix
    const transformX = invDet * (player.dirY * sprite.dx - player.dirX * sprite.dy);
    const transformY = invDet * (-player.planeY * sprite.dx + player.planeX * sprite.dy);

    // Behind the camera
    if (transformY <= 0.1) continue;

    const spriteScreenX = Math.floor((W / 2) * (1 + transformX / transformY));

    // Sprite size on screen
    const spriteHeight = Math.abs(Math.floor(H / transformY)) * (sprite.scale || 1);
    const spriteWidth  = spriteHeight; // square sprites

    const drawStartY = Math.max(0, Math.floor(H / 2 - spriteHeight / 2));
    const drawEndY   = Math.min(H - 1, Math.floor(H / 2 + spriteHeight / 2));
    const drawStartX = Math.max(0, Math.floor(spriteScreenX - spriteWidth / 2));
    const drawEndX   = Math.min(W - 1, Math.floor(spriteScreenX + spriteWidth / 2));

    if (drawStartX >= drawEndX || drawStartY >= drawEndY) continue;

    const texData = sprite.texture;
    if (!texData) continue;

    const texW = Config.TEX_SIZE;
    const texH = Config.TEX_SIZE;

    // Distance-based shading
    const dist = Math.sqrt(sprite.distSq);
    const distShade = Math.max(0.2, 1 - dist / Config.MAX_DEPTH * 0.8);

    const stripW = drawEndX - drawStartX;
    const stripH = drawEndY - drawStartY;
    if (stripW <= 0 || stripH <= 0) continue;

    const imageData = ctx.createImageData(stripW, stripH);
    const data = imageData.data;
    let hasVisible = false;

    for (let sx = 0; sx < stripW; sx++) {
      const screenX = drawStartX + sx;
      // Z-buffer check: don't draw if wall is closer
      if (zBuffer[screenX] < transformY) continue;

      const texX = Math.floor((sx / spriteWidth) * texW * (spriteWidth / spriteHeight));
      if (texX < 0 || texX >= texW) continue;

      // Correct texX mapping
      const realTexX = Math.floor(((screenX - (spriteScreenX - spriteWidth / 2)) / spriteWidth) * texW);
      if (realTexX < 0 || realTexX >= texW) continue;

      for (let sy = 0; sy < stripH; sy++) {
        const texY = Math.floor((sy / spriteHeight) * texH * (spriteHeight / spriteWidth));
        if (texY < 0 || texY >= texH) continue;

        const realTexY = Math.floor(((drawStartY + sy - (H / 2 - spriteHeight / 2)) / spriteHeight) * texH);
        if (realTexY < 0 || realTexY >= texH) continue;

        const srcIdx = (realTexY * texW + realTexX) * 4;
        const alpha = texData.data[srcIdx + 3];
        if (alpha < 128) continue; // transparent pixel

        hasVisible = true;
        const dstIdx = (sy * stripW + sx) * 4;
        data[dstIdx]   = texData.data[srcIdx]   * distShade;
        data[dstIdx+1] = texData.data[srcIdx+1] * distShade;
        data[dstIdx+2] = texData.data[srcIdx+2] * distShade;
        data[dstIdx+3] = alpha;
      }
    }

    if (hasVisible) {
      ctx.putImageData(imageData, drawStartX, drawStartY);
    }
  }
}
