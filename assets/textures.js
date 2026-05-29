import { Config } from '../engine/config.js';

const S = Config.TEX_SIZE;

// Returns ImageData for each texture type
function makeTexture(drawFn) {
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, S);
  return ctx.getImageData(0, 0, S, S);
}

function px(img, x, y, r, g, b) {
  const i = (y * S + x) * 4;
  img.data[i]   = r;
  img.data[i+1] = g;
  img.data[i+2] = b;
  img.data[i+3] = 255;
}

function makeBrick(baseR, baseG, baseB) {
  return makeTexture((ctx) => {
    const img = ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const row = Math.floor(y / 8);
        const offset = (row % 2) * 16;
        const col = Math.floor((x + offset) / 16);
        const bx = (x + offset) % 16;
        const by = y % 8;
        const isGrout = bx === 0 || by === 0;
        const noise = ((x * 7 + y * 13) % 17) - 8;
        if (isGrout) {
          px(img, x, y, 60+noise/2, 55+noise/2, 50+noise/2);
        } else {
          px(img, x, y, baseR+noise, baseG+noise/2, baseB+noise/3);
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  });
}

function makeStone() {
  return makeTexture((ctx) => {
    const img = ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const n = ((x * 3 + y * 7) % 31) - 15;
        const base = 90 + n;
        px(img, x, y, base, base, base - 5);
      }
    }
    // Crack lines
    for (let i = 0; i < 3; i++) {
      const sx = (i * 22) % S;
      for (let y = 0; y < S; y++) {
        const xoff = Math.floor(Math.sin(y * 0.3 + i) * 2);
        const cx = Math.min(S - 1, Math.max(0, sx + xoff));
        const idx = (y * S + cx) * 4;
        img.data[idx] = 50; img.data[idx+1] = 50; img.data[idx+2] = 45; img.data[idx+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  });
}

function makeDoor() {
  return makeTexture((ctx) => {
    const img = ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        // Wooden planks
        const plank = Math.floor(x / 8) % 2;
        const grain = ((x * 5 + y * 2) % 11) - 5;
        const r = 120 + grain + plank * 10;
        const g = 80 + grain / 2 + plank * 5;
        const b = 40 + grain / 3;
        px(img, x, y, r, g, b);
      }
    }
    // Door frame
    for (let i = 0; i < S; i++) {
      px(img, 0, i, 60, 40, 20);
      px(img, S-1, i, 60, 40, 20);
      px(img, i, 0, 60, 40, 20);
      px(img, i, S-1, 60, 40, 20);
    }
    // Handle
    for (let y = 28; y < 36; y++) {
      px(img, 52, y, 200, 170, 50);
      px(img, 53, y, 220, 190, 60);
    }
    ctx.putImageData(img, 0, 0);
  });
}

function makeExit() {
  return makeTexture((ctx) => {
    const img = ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const n = ((x * 5 + y * 9) % 23) - 11;
        px(img, x, y, 20+n, 80+n, 20+n);
      }
    }
    ctx.putImageData(img, 0, 0);
  });
}

function makeEnemySprite() {
  // Enemy: 4 frames (idle, walk1, walk2, attack)
  const frames = [];
  for (let f = 0; f < 4; f++) {
    frames.push(makeTexture((ctx) => {
      const img = ctx.createImageData(S, S);
      // Transparent background
      for (let i = 0; i < img.data.length; i += 4) img.data[i+3] = 0;

      // Body (grey/green soldier)
      const bodyColor = [80, 100, 60];
      const skinColor = [180, 140, 110];

      // Head (top 20px)
      for (let y = 8; y < 22; y++) {
        for (let x = 22; x < 42; x++) {
          const i = (y * S + x) * 4;
          img.data[i] = skinColor[0]; img.data[i+1] = skinColor[1]; img.data[i+2] = skinColor[2]; img.data[i+3] = 255;
        }
      }
      // Helmet
      for (let y = 6; y < 14; y++) {
        for (let x = 20; x < 44; x++) {
          const i = (y * S + x) * 4;
          img.data[i] = 40; img.data[i+1] = 40; img.data[i+2] = 40; img.data[i+3] = 255;
        }
      }
      // Eyes
      [[24,14],[36,14]].forEach(([ex, ey]) => {
        const i = (ey * S + ex) * 4;
        img.data[i] = 20; img.data[i+1] = 20; img.data[i+2] = 20; img.data[i+3] = 255;
        const i2 = (ey * S + ex+1) * 4;
        img.data[i2] = 20; img.data[i2+1] = 20; img.data[i2+2] = 20; img.data[i2+3] = 255;
      });

      // Body
      const bodyY1 = 22, bodyY2 = 48;
      for (let y = bodyY1; y < bodyY2; y++) {
        for (let x = 18; x < 46; x++) {
          const i = (y * S + x) * 4;
          img.data[i] = bodyColor[0]; img.data[i+1] = bodyColor[1]; img.data[i+2] = bodyColor[2]; img.data[i+3] = 255;
        }
      }

      // Gun
      if (f === 3) { // attack frame: arm extended
        for (let y = 30; y < 38; y++) {
          for (let x = 46; x < 58; x++) {
            const i = (y * S + x) * 4;
            img.data[i] = 50; img.data[i+1] = 50; img.data[i+2] = 50; img.data[i+3] = 255;
          }
        }
        // Muzzle flash
        for (let y = 28; y < 36; y++) {
          for (let x = 54; x < 62; x++) {
            if (x < S) {
              const i = (y * S + x) * 4;
              img.data[i] = 255; img.data[i+1] = 200; img.data[i+2] = 50; img.data[i+3] = 255;
            }
          }
        }
      } else {
        for (let y = 30; y < 38; y++) {
          for (let x = 44; x < 52; x++) {
            const i = (y * S + x) * 4;
            img.data[i] = 50; img.data[i+1] = 50; img.data[i+2] = 50; img.data[i+3] = 255;
          }
        }
      }

      // Legs (walking animation)
      const legOffset = f === 1 ? -3 : (f === 2 ? 3 : 0);
      for (let y = 48; y < 60; y++) {
        // Left leg
        for (let x = 20 + legOffset; x < 31 + legOffset; x++) {
          if (x >= 0 && x < S) {
            const i = (y * S + x) * 4;
            img.data[i] = bodyColor[0]; img.data[i+1] = bodyColor[1]; img.data[i+2] = bodyColor[2]; img.data[i+3] = 255;
          }
        }
        // Right leg
        for (let x = 33 - legOffset; x < 44 - legOffset; x++) {
          if (x >= 0 && x < S) {
            const i = (y * S + x) * 4;
            img.data[i] = bodyColor[0]; img.data[i+1] = bodyColor[1]; img.data[i+2] = bodyColor[2]; img.data[i+3] = 255;
          }
        }
      }

      ctx.putImageData(img, 0, 0);
    }));
  }
  return frames;
}

function makeDeadEnemySprite() {
  return makeTexture((ctx) => {
    const img = ctx.createImageData(S, S);
    for (let i = 0; i < img.data.length; i += 4) img.data[i+3] = 0;
    // Fallen body
    for (let y = 45; y < 55; y++) {
      for (let x = 12; x < 52; x++) {
        const i = (y * S + x) * 4;
        img.data[i] = 80; img.data[i+1] = 100; img.data[i+2] = 60; img.data[i+3] = 255;
      }
    }
    // Blood
    for (let y = 50; y < 56; y++) {
      for (let x = 14; x < 30; x++) {
        const i = (y * S + x) * 4;
        img.data[i] = 150; img.data[i+1] = 20; img.data[i+2] = 20; img.data[i+3] = 200;
      }
    }
    ctx.putImageData(img, 0, 0);
  });
}

function makeGunSprite() {
  // 2 frames: idle and firing
  const frames = [];
  for (let f = 0; f < 2; f++) {
    frames.push(makeTexture((ctx) => {
      const img = ctx.createImageData(S, S);
      for (let i = 0; i < img.data.length; i += 4) img.data[i+3] = 0;

      // Gun body
      const yOff = f === 1 ? -4 : 0; // recoil on fire frame
      for (let y = 28 + yOff; y < 60; y++) {
        if (y < 0 || y >= S) continue;
        for (let x = 18; x < 46; x++) {
          const i = (y * S + x) * 4;
          img.data[i] = 50; img.data[i+1] = 50; img.data[i+2] = 50; img.data[i+3] = 255;
        }
      }
      // Barrel
      for (let y = 20 + yOff; y < 32 + yOff; y++) {
        if (y < 0 || y >= S) continue;
        for (let x = 26; x < 38; x++) {
          const i = (y * S + x) * 4;
          img.data[i] = 30; img.data[i+1] = 30; img.data[i+2] = 30; img.data[i+3] = 255;
        }
      }
      // Grip
      for (let y = 48; y < 64; y++) {
        if (y >= S) continue;
        for (let x = 28; x < 36; x++) {
          const i = (y * S + x) * 4;
          img.data[i] = 100; img.data[i+1] = 60; img.data[i+2] = 30; img.data[i+3] = 255;
        }
      }
      // Muzzle flash on fire frame
      if (f === 1) {
        for (let y = 12; y < 24; y++) {
          for (let x = 22; x < 42; x++) {
            const d = Math.abs(x - 32) + Math.abs(y - 16);
            if (d < 10) {
              const i = (y * S + x) * 4;
              img.data[i] = 255; img.data[i+1] = 200 - d * 10; img.data[i+2] = 50; img.data[i+3] = 255;
            }
          }
        }
      }
      ctx.putImageData(img, 0, 0);
    }));
  }
  return frames;
}

export function loadTextures() {
  return {
    walls: [
      null,                                           // 0 = empty
      makeBrick(160, 80, 60),                         // 1 = red brick
      makeBrick(140, 120, 100),                       // 2 = tan brick
      makeStone(),                                    // 3 = stone
      makeExit(),                                     // 4 = exit marker
    ],
    door: makeDoor(),
    enemyFrames: makeEnemySprite(),
    enemyDead: makeDeadEnemySprite(),
    gunFrames: makeGunSprite(),
  };
}
