import { Config } from '../engine/config.js';

const S = Config.TEX_SIZE; // 64

// ── helpers ────────────────────────────────────────────────────────────────

function makeCanvas() {
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  return c;
}

function makeImageData() {
  const img = new ImageData(S, S);
  // init full alpha
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;
  return img;
}

function spx(img, x, y, r, g, b, a = 255) {
  if (x < 0 || x >= S || y < 0 || y >= S) return;
  const i = (y * S + x) * 4;
  img.data[i] = r; img.data[i+1] = g; img.data[i+2] = b; img.data[i+3] = a;
}

function fill(img, r, g, b, a = 255) {
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = r; img.data[i+1] = g; img.data[i+2] = b; img.data[i+3] = a;
  }
}

function noise(x, y, scale = 17) {
  return (((x * 7 + y * 13 + x * y * 3) % scale) - Math.floor(scale / 2));
}

function toImageData(canvas) {
  return canvas.getContext('2d').getImageData(0, 0, S, S);
}

function applyImageData(img) {
  const c = makeCanvas();
  c.getContext('2d').putImageData(img, 0, 0);
  return toImageData(c);
}

// ── wall textures ───────────────────────────────────────────────────────────

function makeBrickRed() {
  const img = makeImageData();
  const BRICK_H = 10, BRICK_W = 20;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const row = Math.floor(y / BRICK_H);
      const offset = (row % 2) * (BRICK_W / 2);
      const bx = (x + offset) % BRICK_W;
      const by = y % BRICK_H;
      const isGrout = bx <= 1 || by <= 1;
      const n = noise(x, y, 19);
      if (isGrout) {
        spx(img, x, y, 55 + n, 50 + n, 45 + n);
      } else {
        // Brick color variation per brick
        const brickId = (row * 100 + Math.floor((x + offset) / BRICK_W)) % 7;
        const br = 165 + brickId * 3 + n;
        const bg = 65 + brickId * 2 + n;
        const bb = 55 + brickId + n;
        spx(img, x, y, Math.min(255, br), Math.min(255, bg), Math.min(255, bb));
      }
    }
  }
  // highlight top edge of each brick row
  for (let y = 2; y < S; y += BRICK_H) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      img.data[i] = Math.min(255, img.data[i] + 20);
      img.data[i+1] = Math.min(255, img.data[i+1] + 10);
    }
  }
  return applyImageData(img);
}

function makeBrickTan() {
  const img = makeImageData();
  const BRICK_H = 9, BRICK_W = 22;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const row = Math.floor(y / BRICK_H);
      const offset = (row % 2) * (BRICK_W / 2);
      const bx = (x + offset) % BRICK_W;
      const by = y % BRICK_H;
      const isGrout = bx <= 1 || by <= 1;
      const n = noise(x, y, 15);
      if (isGrout) {
        spx(img, x, y, 80 + n, 75 + n, 65 + n);
      } else {
        const brickId = (row * 100 + Math.floor((x + offset) / BRICK_W)) % 5;
        spx(img, x, y, 175 + brickId * 4 + n, 148 + brickId * 3 + n, 110 + brickId * 2 + n);
      }
    }
  }
  return applyImageData(img);
}

function makeStone() {
  const img = makeImageData();
  // Large irregular stone blocks
  const BLOCK_H = 16, BLOCK_W = 32;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const row = Math.floor(y / BLOCK_H);
      const offset = (row % 2) * (BLOCK_W / 2);
      const bx = (x + offset) % BLOCK_W;
      const by = y % BLOCK_H;
      const isGrout = bx <= 1 || by <= 1;
      const n = noise(x, y, 23);
      const n2 = noise(x * 3, y * 2, 11);
      if (isGrout) {
        spx(img, x, y, 45 + n, 43 + n, 40 + n);
      } else {
        const blockId = (row * 50 + Math.floor((x + offset) / BLOCK_W)) % 9;
        const base = 98 + blockId * 4 + n + n2 / 2;
        spx(img, x, y, base - 5, base - 3, base);
      }
    }
  }
  // Crack lines
  for (let i = 0; i < 4; i++) {
    const sx = (i * 19 + 5) % S;
    let cx = sx;
    for (let y = 0; y < S; y++) {
      cx += (noise(y, i * 7, 5));
      cx = Math.max(0, Math.min(S - 1, cx));
      const idx = (y * S + cx) * 4;
      img.data[idx] = 35; img.data[idx+1] = 33; img.data[idx+2] = 30;
    }
  }
  return applyImageData(img);
}

function makeMetal() {
  const img = makeImageData();
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const panelY = Math.floor(y / 16);
      const panelX = Math.floor(x / 32);
      const py = y % 16, px = x % 32;
      const isBorder = py === 0 || py === 15 || px === 0 || px === 31;
      const n = noise(x, y, 9);
      if (isBorder) {
        spx(img, x, y, 40 + n, 42 + n, 45 + n);
      } else {
        const base = 72 + (panelX + panelY) % 2 * 6 + n;
        spx(img, x, y, base - 4, base, base + 4);
      }
    }
  }
  // Rivets at corners
  for (let ry = 3; ry < S; ry += 16) {
    for (let rx = 3; rx < S; rx += 32) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const bright = (dx === 0 && dy === 0) ? 180 : 100;
          spx(img, rx + dx, ry + dy, bright, bright, bright);
        }
      }
    }
  }
  return applyImageData(img);
}

function makeExit() {
  const img = makeImageData();
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const n = noise(x, y, 13);
      spx(img, x, y, 15 + n, 55 + n, 25 + n);
    }
  }
  // EXIT text approximated as bright green pattern
  const pattern = [
    [10,16],[11,16],[12,16],[13,16],[14,16],
    [10,17],[10,18],[10,19],[11,19],[12,19],[13,19],[14,19],
    [10,20],[10,21],[10,22],[11,22],[12,22],[13,22],[14,22],
    [16,16],[20,16],[16,17],[18,17],[16,18],[18,18],[16,19],[17,19],[18,19],[19,19],[20,19],[16,20],[18,20],[16,21],[18,21],[16,22],[20,22],
    [22,16],[23,16],[24,16],[23,17],[23,18],[23,19],[23,20],[23,21],[22,22],[23,22],[24,22],
    [26,16],[27,16],[28,16],[29,16],[30,16],[26,17],[26,18],[26,19],[27,19],[28,19],[26,20],[26,21],[26,22],[27,22],[28,22],[29,22],[30,22],
  ];
  for (const [px, py] of pattern) {
    spx(img, px, py, 0, 255, 80);
    spx(img, px, py + 30, 0, 200, 60);
  }
  return applyImageData(img);
}

// ── floor / ceiling ──────────────────────────────────────────────────────────

function makeFloor() {
  const img = makeImageData();
  const TILE = 16;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
      const lx = x % TILE, ly = y % TILE;
      const isEdge = lx <= 1 || ly <= 1;
      const checker = (tx + ty) % 2;
      const n = noise(x, y, 11);
      if (isEdge) {
        spx(img, x, y, 30 + n, 28 + n, 25 + n);
      } else if (checker) {
        spx(img, x, y, 58 + n, 54 + n, 48 + n);
      } else {
        spx(img, x, y, 48 + n, 45 + n, 40 + n);
      }
    }
  }
  return applyImageData(img);
}

function makeCeiling() {
  const img = makeImageData();
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const n = noise(x, y, 9);
      const panel = (Math.floor(x / 16) + Math.floor(y / 16)) % 2;
      const base = panel ? 32 : 26;
      spx(img, x, y, base + n, base + n, base + n + 4);
    }
  }
  // Occasional light fixture outline
  for (let fy = 8; fy < S; fy += 16) {
    for (let fx = 8; fx < S; fx += 16) {
      for (let d = -3; d <= 3; d++) {
        spx(img, fx + d, fy, 55, 55, 65);
        spx(img, fx, fy + d, 55, 55, 65);
      }
    }
  }
  return applyImageData(img);
}

// ── door ────────────────────────────────────────────────────────────────────

function makeDoor() {
  const img = makeImageData();
  // Frame
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const isFrame = x <= 3 || x >= S - 4 || y <= 3 || y >= S - 4;
      const n = noise(x, y, 11);
      if (isFrame) {
        spx(img, x, y, 55 + n, 38 + n, 20 + n);
      } else {
        // Wood planks (vertical grain)
        const plank = Math.floor((x - 4) / 7);
        const grain = noise(x, y * 2, 7);
        spx(img, x, y,
          130 + plank % 3 * 8 + grain,
          88 + plank % 3 * 5 + grain / 2,
          42 + plank % 2 * 4 + grain / 3);
      }
    }
  }
  // Two recessed panels
  const panelBorder = (x, y, x1, y1, x2, y2) => {
    if ((x === x1 || x === x2) && y >= y1 && y <= y2) return true;
    if ((y === y1 || y === y2) && x >= x1 && x <= x2) return true;
    return false;
  };
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (panelBorder(x, y, 7, 7, S - 8, 28)) spx(img, x, y, 60, 40, 20);
      if (panelBorder(x, y, 7, 33, S - 8, S - 8)) spx(img, x, y, 60, 40, 20);
    }
  }
  // Handle
  for (let y = 28; y < 34; y++) {
    spx(img, S - 14, y, 180, 155, 40);
    spx(img, S - 13, y, 210, 185, 50);
    spx(img, S - 12, y, 180, 155, 40);
  }
  spx(img, S - 13, 27, 180, 155, 40);
  spx(img, S - 13, 34, 180, 155, 40);
  return applyImageData(img);
}

// ── enemy sprites ───────────────────────────────────────────────────────────
// 6 frames: 0=idle 1=walk1 2=walk2 3=attack 4=pain 5=dead (lying)

const SKIN   = [195, 155, 120];
const HELM   = [35, 38, 30];
const BODY   = [72, 88, 58];
const PANTS  = [48, 55, 38];
const BOOTS  = [28, 24, 20];
const GUN_C  = [45, 45, 45];
const BLOOD  = [160, 15, 15];

function drawSoldier(img, legOffset = 0, armRaise = 0, shooting = false, pain = false) {
  const cx = 32;

  // Boots
  for (let y = 55; y < 62; y++) {
    for (let x = cx - 10 + legOffset; x < cx - 3 + legOffset; x++)
      spx(img, x, y, ...BOOTS);
    for (let x = cx + 3 - legOffset; x < cx + 10 - legOffset; x++)
      spx(img, x, y, ...BOOTS);
  }
  // Pants / legs
  for (let y = 42; y < 56; y++) {
    for (let x = cx - 9 + legOffset; x < cx - 2 + legOffset; x++)
      spx(img, x, y, ...PANTS);
    for (let x = cx + 2 - legOffset; x < cx + 9 - legOffset; x++)
      spx(img, x, y, ...PANTS);
  }
  // Belt
  for (let x = cx - 10; x < cx + 10; x++) {
    spx(img, x, 41, 35, 30, 20);
    spx(img, x, 42, 50, 42, 28);
  }
  // Body
  for (let y = 22; y < 42; y++) {
    for (let x = cx - 11; x < cx + 11; x++) {
      spx(img, x, y, ...BODY);
    }
  }
  // Uniform details
  for (let y = 25; y < 40; y++) {
    spx(img, cx - 1, y, 55, 70, 45);
    spx(img, cx,     y, 55, 70, 45);
  }
  // Pocket left
  for (let y = 28; y < 35; y++)
    for (let x = cx - 10; x < cx - 5; x++)
      spx(img, x, y, 62, 78, 50);

  // Arms
  const leftArmY = 22 + armRaise;
  const rightArmY = 22 - armRaise;
  for (let y = leftArmY; y < leftArmY + 14; y++) {
    spx(img, cx - 12, y, ...BODY);
    spx(img, cx - 13, y, ...BODY);
  }
  for (let y = rightArmY; y < rightArmY + 14 - armRaise; y++) {
    spx(img, cx + 12, y, ...BODY);
    spx(img, cx + 13, y, ...BODY);
  }

  // Gun in right hand
  const gunY = rightArmY + 12 - armRaise;
  for (let y = gunY; y < gunY + 4; y++) {
    for (let x = cx + 12; x < cx + 22; x++)
      spx(img, x, y, ...GUN_C);
  }
  if (shooting) {
    // Muzzle flash
    for (let fy = gunY - 2; fy < gunY + 6; fy++) {
      for (let fx = cx + 19; fx < cx + 26; fx++) {
        const d = Math.abs(fx - (cx + 22)) + Math.abs(fy - (gunY + 2));
        if (d < 5) spx(img, fx, fy, 255, 200 - d * 20, 30, 255);
      }
    }
  }

  // Neck
  for (let y = 14; y < 23; y++) {
    spx(img, cx - 3, y, ...SKIN);
    spx(img, cx - 2, y, ...SKIN);
    spx(img, cx - 1, y, ...SKIN);
    spx(img, cx,     y, ...SKIN);
    spx(img, cx + 1, y, ...SKIN);
    spx(img, cx + 2, y, ...SKIN);
  }
  // Head
  for (let y = 6; y < 22; y++) {
    const hw = (y < 10) ? 6 : 8;
    for (let x = cx - hw; x <= cx + hw; x++)
      spx(img, x, y, ...SKIN);
  }
  // Helmet
  for (let y = 4; y < 14; y++) {
    const hw = 9;
    for (let x = cx - hw; x <= cx + hw; x++)
      spx(img, x, y, ...HELM);
  }
  // Helmet brim
  for (let x = cx - 11; x <= cx + 11; x++)
    spx(img, x, 13, ...HELM);

  // Eyes
  if (!pain) {
    spx(img, cx - 4, 16, 20, 20, 20);
    spx(img, cx - 3, 16, 20, 20, 20);
    spx(img, cx + 3, 16, 20, 20, 20);
    spx(img, cx + 4, 16, 20, 20, 20);
  } else {
    // X eyes when in pain
    spx(img, cx - 4, 15, 180, 20, 20);
    spx(img, cx - 3, 16, 180, 20, 20);
    spx(img, cx + 3, 16, 180, 20, 20);
    spx(img, cx + 4, 15, 180, 20, 20);
  }
  // Mouth
  for (let mx = cx - 2; mx <= cx + 2; mx++)
    spx(img, mx, 19, 90, 55, 45);
}

function makeEnemyFrames() {
  const specs = [
    { legOffset: 0,  armRaise: 0,  shooting: false, pain: false }, // idle
    { legOffset: 5,  armRaise: 0,  shooting: false, pain: false }, // walk1
    { legOffset: -5, armRaise: 0,  shooting: false, pain: false }, // walk2
    { legOffset: 0,  armRaise: 6,  shooting: true,  pain: false }, // attack
    { legOffset: 0,  armRaise: 0,  shooting: false, pain: true  }, // pain
  ];
  return specs.map(spec => {
    const img = makeImageData();
    fill(img, 0, 0, 0, 0);
    drawSoldier(img, spec.legOffset, spec.armRaise, spec.shooting, spec.pain);
    return applyImageData(img);
  });
}

function makeEnemyDead() {
  const img = makeImageData();
  fill(img, 0, 0, 0, 0);
  // Body lying on side — spread across middle rows
  // Torso
  for (let y = 40; y < 52; y++) {
    for (let x = 8; x < 56; x++) {
      const withinBody = (y >= 42 && y < 50) ? true : (x > 14 && x < 50);
      if (withinBody) spx(img, x, y, ...BODY);
    }
  }
  // Legs
  for (let y = 44; y < 50; y++) {
    for (let x = 42; x < 60; x++) spx(img, x, y, ...PANTS);
  }
  // Head
  for (let y = 38; y < 50; y++) {
    for (let x = 4; x < 18; x++) spx(img, x, y, ...SKIN);
  }
  for (let y = 36; y < 45; y++) {
    for (let x = 3; x < 17; x++) spx(img, x, y, ...HELM);
  }
  // Blood pool
  for (let y = 48; y < 57; y++) {
    for (let x = 10; x < 45; x++) {
      const d = Math.abs(x - 27) / 17 + Math.abs(y - 52) / 5;
      if (d < 1) spx(img, x, y, ...BLOOD, Math.floor(220 * (1 - d)));
    }
  }
  return applyImageData(img);
}

function makeEnemyDying() {
  const img = makeImageData();
  fill(img, 0, 0, 0, 0);
  // Tilted body (45 degrees, mid-fall)
  for (let y = 20; y < 58; y++) {
    const tilt = Math.floor((y - 20) * 0.6);
    for (let x = 18 + tilt; x < 46 + tilt; x++) {
      spx(img, x, y, ...BODY);
    }
  }
  // Head
  for (let y = 14; y < 26; y++) {
    for (let x = 20; x < 36; x++) spx(img, x, y, ...SKIN);
  }
  for (let y = 12; y < 20; y++) {
    for (let x = 18; x < 38; x++) spx(img, x, y, ...HELM);
  }
  // Blood splatter
  for (const [bx, by] of [[32,45],[28,50],[38,47],[24,52]]) {
    spx(img, bx, by, ...BLOOD, 200);
    spx(img, bx+1, by, ...BLOOD, 150);
    spx(img, bx, by+1, ...BLOOD, 150);
  }
  return applyImageData(img);
}

// ── weapon (pistol) ─────────────────────────────────────────────────────────
// 2 frames: idle, firing

function makeGunFrames() {
  const frames = [];
  for (let f = 0; f < 2; f++) {
    const img = makeImageData();
    fill(img, 0, 0, 0, 0);
    const yOff = f === 1 ? -5 : 0;

    // Slide / upper receiver
    for (let y = 18 + yOff; y < 38 + yOff; y++) {
      for (let x = 18; x < 46; x++) {
        const shade = 45 + Math.floor((x - 18) / 5);
        spx(img, x, y, shade, shade, shade);
      }
    }
    // Barrel
    for (let y = 20 + yOff; y < 30 + yOff; y++) {
      for (let x = 38; x < 54; x++) {
        const shade = (x % 4 === 0) ? 20 : 35;
        spx(img, x, y, shade, shade, shade);
      }
    }
    // Trigger guard
    for (let y = 36 + yOff; y < 44 + yOff; y++) {
      spx(img, 22, y, 55, 55, 55);
      spx(img, 30, y, 55, 55, 55);
    }
    for (let x = 22; x < 31; x++) spx(img, x, 43 + yOff, 55, 55, 55);
    // Grip (wood)
    for (let y = 36 + yOff; y < 58; y++) {
      for (let x = 22; x < 32; x++) {
        const g = noise(x, y, 7);
        spx(img, x, y, 110 + g, 72 + g, 36 + g);
      }
    }
    // Front sight
    spx(img, 52, 19 + yOff, 180, 180, 180);
    spx(img, 52, 20 + yOff, 180, 180, 180);
    // Rear sight notch
    spx(img, 23, 18 + yOff, 40, 40, 40);
    spx(img, 24, 18 + yOff, 40, 40, 40);
    spx(img, 26, 18 + yOff, 40, 40, 40);
    spx(img, 27, 18 + yOff, 40, 40, 40);

    // Muzzle flash on fire frame
    if (f === 1) {
      for (let fy = 14; fy < 30; fy++) {
        for (let fx = 50; fx < 64; fx++) {
          const d = Math.sqrt((fx - 54) ** 2 + (fy - 22) ** 2);
          if (d < 9) {
            const a = Math.floor(255 * Math.max(0, 1 - d / 9));
            const r = 255, gg = Math.floor(200 - d * 15), b = 30;
            spx(img, fx, fy, r, gg, b, a);
          }
        }
      }
    }
    frames.push(applyImageData(img));
  }
  return frames;
}

// ── pickup items ──────────────────────────────────────────────────────────────

function makeHealthItem() {
  const img = makeImageData();
  fill(img, 0, 0, 0, 0);
  // White cross on green glowing background
  for (let y = 16; y < 48; y++) {
    for (let x = 16; x < 48; x++) {
      const dist = Math.max(Math.abs(x - 32), Math.abs(y - 32));
      spx(img, x, y, 10, Math.max(0, 90 - dist * 3), 10, Math.floor(180 - dist * 4));
    }
  }
  // Red cross
  for (let y = 20; y < 44; y++) {
    for (let x = 28; x < 36; x++) spx(img, x, y, 220, 20, 20);
  }
  for (let y = 28; y < 36; y++) {
    for (let x = 20; x < 44; x++) spx(img, x, y, 220, 20, 20);
  }
  // Bright center
  for (let y = 29; y < 35; y++) {
    for (let x = 29; x < 35; x++) spx(img, x, y, 255, 80, 80);
  }
  return applyImageData(img);
}

function makeAmmoItem() {
  const img = makeImageData();
  fill(img, 0, 0, 0, 0);
  // Ammo crate box shape
  for (let y = 18; y < 50; y++) {
    for (let x = 14; x < 50; x++) {
      const isEdge = x <= 15 || x >= 48 || y <= 19 || y >= 48;
      const n = noise(x, y, 9);
      if (isEdge) {
        spx(img, x, y, 55 + n, 45 + n, 20 + n);
      } else {
        spx(img, x, y, 95 + n, 80 + n, 35 + n);
      }
    }
  }
  // Stencil "AMMO" text bars
  for (let bx = 20; bx < 44; bx++) {
    spx(img, bx, 25, 30, 25, 10);
    spx(img, bx, 34, 30, 25, 10);
    spx(img, bx, 43, 30, 25, 10);
  }
  // Bullet silhouettes
  for (let i = 0; i < 4; i++) {
    const bx = 20 + i * 7;
    for (let by = 27; by < 33; by++) {
      spx(img, bx, by, 180, 160, 60);
      spx(img, bx + 1, by, 200, 180, 70);
      spx(img, bx + 2, by, 180, 160, 60);
    }
    spx(img, bx + 1, 26, 220, 200, 80);
  }
  return applyImageData(img);
}

// ── export ────────────────────────────────────────────────────────────────────

export function loadTextures() {
  return {
    walls: [
      null,            // 0 = empty
      makeBrickRed(),  // 1
      makeBrickTan(),  // 2
      makeStone(),     // 3
      makeExit(),      // 4
      makeMetal(),     // 5
    ],
    door: makeDoor(),
    floor: makeFloor(),
    ceiling: makeCeiling(),
    enemyFrames: makeEnemyFrames(),    // 5 frames: idle/walk1/walk2/attack/pain
    enemyDying: makeEnemyDying(),
    enemyDead: makeEnemyDead(),
    gunFrames: makeGunFrames(),
    healthItem: makeHealthItem(),
    ammoItem: makeAmmoItem(),
  };
}
