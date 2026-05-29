import { Config } from '../engine/config.js';

const S = Config.TEX_SIZE; // 64

function makeImg() {
  const img = new ImageData(S, S);
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;
  return img;
}

function spx(img, x, y, r, g, b, a = 255) {
  if (x < 0 || x >= S || y < 0 || y >= S) return;
  const i = (y * S + x) * 4;
  img.data[i] = r; img.data[i+1] = g; img.data[i+2] = b; img.data[i+3] = a;
}

function fill(img, r, g, b) {
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = r; img.data[i+1] = g; img.data[i+2] = b;
  }
}

function noise(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

// 1 — Concrete (dark grey, subtle panel lines)
function makeConcrete() {
  const img = makeImg();
  const rng = noise(42);
  fill(img, 38, 41, 46);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const n = rng() * 8 - 4;
      const panelY = y % 16, panelX = x % 16;
      const edge = (panelY === 0 || panelX === 0) ? -14 : 0;
      const v = 38 + n + edge;
      spx(img, x, y, v, v + 2, v + 4);
    }
  }
  return img;
}

// 2 — Teal trim (teal base, slightly darker grout)
function makeTealTrim() {
  const img = makeImg();
  const rng = noise(77);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const n = rng() * 6 - 3;
      const edge = (y % 8 === 0 || x % 8 === 0) ? -20 : 0;
      const r = 20 + n + edge;
      const g = 80 + n + edge;
      const b = 78 + n + edge;
      spx(img, x, y, Math.max(0, r), Math.max(0, g), Math.max(0, b));
    }
  }
  return img;
}

// 3 — Bioluminescent vein (dark wall with glowing cyan veins)
function makeBiolum() {
  const img = makeImg();
  const rng = noise(13);
  fill(img, 28, 32, 36);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const n = rng() * 6;
      // Vein pattern: diagonal sine waves
      const vein = Math.sin(x * 0.4 + y * 0.3) * Math.cos(x * 0.2 - y * 0.5);
      if (vein > 0.7) {
        const t = (vein - 0.7) / 0.3;
        spx(img, x, y,
          Math.floor(28 + t * 60 + n),
          Math.floor(32 + t * 150 + n),
          Math.floor(36 + t * 160 + n));
      } else {
        const base = 28 + n * 0.5;
        spx(img, x, y, base, base + 4, base + 8);
      }
    }
  }
  return img;
}

// 4 — Symbol panel (dark metallic with etched glyphs)
function makeSymbolPanel() {
  const img = makeImg();
  const rng = noise(99);
  fill(img, 22, 28, 36);
  // Horizontal lines
  for (let y = 8; y < S; y += 8) {
    for (let x = 0; x < S; x++) spx(img, x, y, 30, 38, 50);
  }
  // Glyph marks (small cyan accents)
  const glyphs = [[8,8],[24,24],[40,8],[16,40],[48,40],[32,16]];
  for (const [gx, gy] of glyphs) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (Math.abs(dx) + Math.abs(dy) <= 2) {
          const t = rng();
          spx(img, gx + dx, gy + dy,
            Math.floor(60 + t * 20),
            Math.floor(160 + t * 40),
            Math.floor(160 + t * 40));
        }
      }
    }
  }
  return img;
}

// Door — same as concrete but slightly lighter
function makeDoor() {
  const img = makeImg();
  const rng = noise(55);
  fill(img, 42, 46, 52);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const n = rng() * 6 - 3;
      const edge = (y % 24 === 0 || x % 32 === 0) ? -12 : 0;
      const v = 42 + n + edge;
      spx(img, x, y, v, v + 3, v + 6);
    }
  }
  // Teal accent strip
  for (let y = 28; y < 36; y++) {
    for (let x = 4; x < S - 4; x++) {
      const n = rng() * 4;
      spx(img, x, y, 18 + n, 70 + n, 68 + n);
    }
  }
  return img;
}

// Floor
function makeFloor() {
  const img = makeImg();
  const rng = noise(200);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const n = rng() * 10 - 5;
      const v = 18 + n;
      spx(img, x, y, Math.max(0, v), Math.max(0, v + 2), Math.max(0, v + 4));
    }
  }
  return img;
}

// Ceiling
function makeCeiling() {
  const img = makeImg();
  const rng = noise(300);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const n = rng() * 6 - 3;
      const v = 12 + n;
      spx(img, x, y, Math.max(0, v), Math.max(0, v + 1), Math.max(0, v + 2));
    }
  }
  return img;
}

// Anomaly sprites — billboard shapes on transparent background
function makeAnomalyWanderer() {
  const img = makeImg();
  // Clear to transparent
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = 0;
  const cx = S / 2, cy = S / 2, r = 18;
  const rng = noise(401);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < r) {
        const t = 1 - dist / r;
        const n = rng() * 20;
        const g = Math.floor(160 * t + n);
        const b = Math.floor(180 * t + n);
        const a = Math.floor(220 * t);
        spx(img, x, y, 20, g, b, a);
      }
    }
  }
  // Ring
  for (let ang = 0; ang < Math.PI * 2; ang += 0.05) {
    const rx = Math.floor(cx + Math.cos(ang) * r);
    const ry = Math.floor(cy + Math.sin(ang) * r);
    spx(img, rx, ry, 126, 206, 202, 200);
  }
  return img;
}

function makeAnomalyObserver() {
  const img = makeImg();
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = 0;
  const cx = S / 2, cy = S / 2;
  const rng = noise(402);
  // Vertical pillar shape
  for (let y = 8; y < S - 8; y++) {
    for (let x = cx - 10; x < cx + 10; x++) {
      const t = 1 - Math.abs(x - cx) / 10;
      const n = rng() * 10;
      spx(img, x, y, Math.floor(30 + n), Math.floor(80 * t + n), Math.floor(80 * t + n), Math.floor(200 * t));
    }
  }
  // Eye glow
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      if (dx * dx + dy * dy <= 16) {
        const t = 1 - Math.sqrt(dx * dx + dy * dy) / 4;
        spx(img, cx + dx, cy - 5 + dy, 126, 206, 202, Math.floor(240 * t));
      }
    }
  }
  return img;
}

function makeAnomalyEcho() {
  const img = makeImg();
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = 0;
  const cx = S / 2, cy = S / 2;
  const rng = noise(403);
  // Ghost-like humanoid silhouette, very transparent
  for (let y = 4; y < S - 4; y++) {
    for (let x = cx - 12; x < cx + 12; x++) {
      const t = 1 - Math.abs(x - cx) / 12;
      const yt = 1 - Math.abs(y - cy) / (S / 2 - 4);
      const a = Math.floor(130 * t * yt * (0.7 + rng() * 0.3));
      if (a > 10) spx(img, x, y, 80, 180, 180, a);
    }
  }
  return img;
}

function makeAnomalyResonator() {
  // Resonator is wall-embedded; minimal sprite for icon use
  const img = makeImg();
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = 0;
  return img;
}

export function loadTextures() {
  const walls = [
    null,             // 0: empty (unused)
    makeConcrete(),   // 1
    makeTealTrim(),   // 2
    makeBiolum(),     // 3
    makeSymbolPanel(),// 4
    makeConcrete(),   // 5: low-signal zone (same as concrete)
  ];
  return {
    walls,
    door: makeDoor(),
    floor: makeFloor(),
    ceiling: makeCeiling(),
    anomaly_wanderer: makeAnomalyWanderer(),
    anomaly_observer: makeAnomalyObserver(),
    anomaly_echo:     makeAnomalyEcho(),
    anomaly_resonator: makeAnomalyResonator(),
  };
}
