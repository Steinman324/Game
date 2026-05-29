import { Config } from './config.js';

// Z-buffer: one entry per screen column (perpendicular wall distance)
export const zBuffer = new Float32Array(Config.WIDTH);

export function castWalls(ctx, player, mapState, textures) {
  const W = Config.WIDTH;
  const H = Config.HEIGHT;
  const HH = Config.HALF_HEIGHT;

  // Draw ceiling and floor
  ctx.fillStyle = Config.CEILING_COLOR;
  ctx.fillRect(0, 0, W, HH);
  ctx.fillStyle = Config.FLOOR_COLOR;
  ctx.fillRect(0, HH, W, HH);

  for (let col = 0; col < W; col++) {
    // Camera x in [-1, 1]
    const cameraX = (2 * col / W) - 1;
    const rayDirX = player.dirX + player.planeX * cameraX;
    const rayDirY = player.dirY + player.planeY * cameraX;

    let mapX = Math.floor(player.x);
    let mapY = Math.floor(player.y);

    // Prevent division by zero
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

    let side = 0;  // 0=X wall, 1=Y wall
    let hit = false;
    let cellType = 0;
    let doorOffset = 0;

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
        hit = true; cellType = 1; break;
      }

      cellType = mapState.grid[mapY][mapX];

      if (cellType === 9) {
        // Door: check if ray intersects the open portion
        const key = `${mapX},${mapY}`;
        const door = mapState.doors[key];
        doorOffset = door ? door.offset : 0;

        // Compute exact hit position within cell for door occlusion
        let perpDist, wallX;
        if (side === 0) {
          perpDist = sideDistX - deltaDistX;
          wallX = player.y + perpDist * rayDirY;
        } else {
          perpDist = sideDistY - deltaDistY;
          wallX = player.x + perpDist * rayDirX;
        }
        wallX -= Math.floor(wallX);

        // Door slides in from one side; if wallX < offset, it's open space
        if (wallX < doorOffset) {
          cellType = 0; // treat as open (door slid past this column)
          continue;
        }
        hit = true;
        break;
      }

      if (cellType > 0) {
        hit = true;
        break;
      }
    }

    // Compute perpendicular wall distance (fisheye correction)
    let perpWallDist;
    if (side === 0) {
      perpWallDist = sideDistX - deltaDistX;
    } else {
      perpWallDist = sideDistY - deltaDistY;
    }
    perpWallDist = Math.max(0.001, perpWallDist);
    zBuffer[col] = perpWallDist;

    const lineHeight = Math.floor(H / perpWallDist);
    const drawStart = Math.max(0, Math.floor(HH - lineHeight / 2) + Math.round(player.bobAmount));
    const drawEnd   = Math.min(H - 1, Math.floor(HH + lineHeight / 2) + Math.round(player.bobAmount));

    // Texture X coordinate
    let wallX;
    if (side === 0) {
      wallX = player.y + perpWallDist * rayDirY;
    } else {
      wallX = player.x + perpWallDist * rayDirX;
    }
    wallX -= Math.floor(wallX);

    const texIndex = (cellType === 9) ? null : Math.min(cellType, textures.walls.length - 1);
    const texData  = (cellType === 9) ? textures.door : (texIndex ? textures.walls[texIndex] : null);

    if (!texData) {
      zBuffer[col] = 1e30;
      continue;
    }

    const texW = Config.TEX_SIZE;
    const texH = Config.TEX_SIZE;
    let texX = Math.floor(wallX * texW);
    if (side === 0 && rayDirX > 0) texX = texW - texX - 1;
    if (side === 1 && rayDirY < 0) texX = texW - texX - 1;
    texX = Math.max(0, Math.min(texW - 1, texX));

    // Draw textured column
    const shade = side === 1 ? Config.WALL_SHADE_SIDE : 1.0;
    const distShade = Math.max(0.3, 1 - perpWallDist / Config.MAX_DEPTH * 0.8);
    const finalShade = shade * distShade;

    const colPixels = drawEnd - drawStart;
    if (colPixels <= 0) continue;

    const step = texH / lineHeight;
    let texPos = (drawStart - Math.round(player.bobAmount) - (H / 2 - lineHeight / 2)) * step;

    // Use imageData for speed
    const imageData = ctx.createImageData(1, drawEnd - drawStart);
    const data = imageData.data;

    for (let y = 0; y < drawEnd - drawStart; y++) {
      const texY = Math.max(0, Math.min(texH - 1, Math.floor(texPos)));
      texPos += step;
      const texIdx = (texY * texW + texX) * 4;
      const i = y * 4;
      data[i]   = texData.data[texIdx]   * finalShade;
      data[i+1] = texData.data[texIdx+1] * finalShade;
      data[i+2] = texData.data[texIdx+2] * finalShade;
      data[i+3] = 255;
    }
    ctx.putImageData(imageData, col, drawStart);
  }
}
