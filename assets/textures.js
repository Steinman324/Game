import { Config } from '../engine/config.js';

const S = Config.TEX_SIZE; // 64

// ── helpers ────────────────────────────────────────────────────────────────────

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

// Cheap deterministic noise — avoids Math.random() for reproducibility
function hn(x, y) {
  let h = (x * 374761393 + y * 1103515245) ^ 0;
  h = (((h >> 13) ^ h) * 1664525) ^ 0;
  return (h & 0x7f) - 63; // -63..63
}

function n8(x, y) { return ((hn(x,y) & 0x0f) - 7); } // -7..7

// ── wall textures ──────────────────────────────────────────────────────────────

// Type 1: Concrete — cool grey stone blocks
function makeConcrete() {
  const img = makeImg();
  const BW = 20, BH = 10;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const row = Math.floor(y / BH);
      const off = (row % 2) * (BW / 2);
      const bx = (x + off) % BW;
      const by = y % BH;
      const grout = bx <= 1 || by <= 1;
      const ns = hn(x, y) >> 3; // -8..7
      if (grout) {
        spx(img, x, y, 35+ns, 37+ns, 42+ns);
      } else {
        const bid = (row * 13 + Math.floor((x + off) / BW)) % 5;
        const base = 78 + bid * 5 + ns;
        spx(img, x, y, base-2, base, base+6);
      }
    }
  }
  return img;
}

// Type 2: Teal-trim — dark teal panels with brighter edges
function makeTealTrim() {
  const img = makeImg();
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const ns = n8(x, y);
      const isEdge = (y % 16 < 2) || (x % 16 < 2);
      const isAccent = (y % 16 === 0) || (x % 16 === 0);
      let r = 22 + ns, g = 72 + ns, b = 70 + ns;
      if (isEdge)   { r = 28; g = 95; b = 90; }
      if (isAccent) { r = 20; g = 110; b = 105; }
      spx(img, x, y, Math.max(0,r), Math.max(0,g), Math.max(0,b));
    }
  }
  return img;
}

// Type 3: Bio-vein — dark with glowing cyan veins
function makeBioVein() {
  const img = makeImg();
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let r = 10, g = 16, b = 20;
      const v1 = Math.abs((x + y * 0.4) % 22 - 11);
      const v2 = Math.abs((x * 0.6 + y) % 18 - 9);
      const vein = Math.min(v1, v2);
      if (vein < 2.5) {
        const intensity = (1 - vein / 2.5) ** 2;
        r = Math.floor(8  + intensity * 30);
        g = Math.floor(55 + intensity * 130);
        b = Math.floor(55 + intensity * 140);
      }
      const ns = n8(x, y);
      spx(img, x, y, Math.min(255, r + ns/4|0), Math.min(255, g + ns/4|0), Math.min(255, b + ns/4|0));
    }
  }
  return img;
}

// Type 4: Symbol panel — near-black with cryptic glyphs
function makeSymbolPanel() {
  const img = makeImg();
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const ns = n8(x, y);
      let r = 20+ns/4|0, g = 24+ns/4|0, b = 30+ns/4|0;
      // Grid lines
      if (x % 16 === 0 || y % 16 === 0) { r = 32; g = 40; b = 48; }
      spx(img, x, y, r, g, b);
    }
  }
  // Draw glyph-like marks in each 16x16 cell
  const glyphs = [
    // cross
    (img, ox, oy) => {
      for (let i = 3; i < 13; i++) { spx(img,ox+8,oy+i,55,180,170); spx(img,ox+i,oy+8,55,180,170); }
    },
    // square
    (img, ox, oy) => {
      for (let i = 4; i < 12; i++) {
        spx(img,ox+4,oy+i,55,180,170); spx(img,ox+11,oy+i,55,180,170);
        spx(img,ox+i,oy+4,55,180,170); spx(img,ox+i,oy+11,55,180,170);
      }
    },
    // diagonal X
    (img, ox, oy) => {
      for (let i = 3; i < 13; i++) {
        spx(img,ox+i,oy+i,55,180,170);
        spx(img,ox+i,oy+15-i,55,180,170);
      }
    },
    // dot cluster
    (img, ox, oy) => {
      [[7,5],[8,5],[7,10],[8,10],[4,8],[11,8]].forEach(([dx,dy]) => {
        spx(img,ox+dx,oy+dy,55,180,170);
        spx(img,ox+dx+1,oy+dy,55,180,170);
      });
    },
  ];
  for (let cy = 0; cy < 4; cy++) {
    for (let cx = 0; cx < 4; cx++) {
      const g = glyphs[(cx + cy * 3 + cx*cy) % glyphs.length];
      g(img, cx * 16, cy * 16);
    }
  }
  return img;
}

// Door texture — dark teal with sliding panel look
function makeDoor() {
  const img = makeImg();
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const ns = n8(x, y);
      const isFrame = x <= 3 || x >= S-4 || y <= 2 || y >= S-3;
      const isPanel = y % 32 < 2;
      let r = 30+ns/3|0, g = 55+ns/3|0, b = 55+ns/3|0;
      if (isFrame)  { r = 20; g = 80; b = 78; }
      if (isPanel)  { r = 18; g = 65; b = 63; }
      spx(img, x, y, Math.max(0,r), Math.max(0,g), Math.max(0,b));
    }
  }
  // Horizontal accent stripe
  for (let x = 4; x < S-4; x++) {
    spx(img, x, S/2,   40, 110, 105);
    spx(img, x, S/2-1, 30,  90,  86);
  }
  return img;
}

// ── sprite textures ────────────────────────────────────────────────────────────

// Wanderer — floating orb with inner glow
function makeWanderer() {
  const img = makeImg();
  for (let i = 0; i < img.data.length; i += 4) img.data[i+3] = 0;
  const cx = 32, cy = 32, R = 14;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const d = Math.sqrt((x-cx)**2 + (y-cy)**2);
      if (d > R) continue;
      const t = 1 - d / R;
      const core = d < R * 0.4;
      const r = core ? Math.floor(180 + t*60) : Math.floor(40  + t*80);
      const g = core ? Math.floor(230 + t*20) : Math.floor(150 + t*80);
      const b = core ? Math.floor(230 + t*20) : Math.floor(155 + t*90);
      const a = Math.floor(180 + t * 70);
      spx(img, x, y, r, g, b, a);
    }
  }
  return img;
}

// Observer — elongated vertical form, faint outline
function makeObserver() {
  const img = makeImg();
  for (let i = 0; i < img.data.length; i += 4) img.data[i+3] = 0;
  const cx = 32;
  // Body outline — tall narrow silhouette
  for (let y = 10; y < 56; y++) {
    const w = y < 20 ? 3 : y < 42 ? 7 : 4; // narrow at head, wider at body
    for (let x = cx-w; x <= cx+w; x++) {
      const edge = Math.abs(x - cx) >= w - 1;
      const dist = Math.sqrt((x-cx)**2 + ((y-33)/1.5)**2);
      const glow = Math.max(0, 1 - dist / (w + 6));
      const r = edge ? 100 : Math.floor(40  + glow * 80);
      const g = edge ? 200 : Math.floor(160 + glow * 70);
      const b = edge ? 195 : Math.floor(165 + glow * 75);
      const a = edge ? 220 : Math.floor(100 + glow * 120);
      spx(img, x, y, r, g, b, a);
    }
  }
  // Eyes
  spx(img, cx-3, 22, 255, 255, 240, 255);
  spx(img, cx+3, 22, 255, 255, 240, 255);
  return img;
}

// Echo — translucent ghost trail (player-shaped smear)
function makeEcho() {
  const img = makeImg();
  for (let i = 0; i < img.data.length; i += 4) img.data[i+3] = 0;
  const cx = 32;
  for (let y = 14; y < 58; y++) {
    const w = y < 22 ? 5 : 8;
    for (let x = cx-w; x <= cx+w; x++) {
      const d = Math.sqrt((x-cx)**2 + (y-36)**2);
      const a = Math.floor(60 + (1 - d / 20) * 80);
      if (a <= 0) continue;
      spx(img, x, y, 150, 210, 205, Math.max(0, Math.min(255, a)));
    }
  }
  return img;
}

// Resonator — pulsing geometric ring
function makeResonator() {
  const img = makeImg();
  for (let i = 0; i < img.data.length; i += 4) img.data[i+3] = 0;
  const cx = 32, cy = 32;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const d = Math.sqrt((x-cx)**2 + (y-cy)**2);
      const ring1 = Math.abs(d - 16);
      const ring2 = Math.abs(d - 8);
      if (ring1 < 2.5 || ring2 < 1.5) {
        const t = ring1 < ring2 ? 1 - ring1/2.5 : 1 - ring2/1.5;
        spx(img, x, y, Math.floor(40+t*80), Math.floor(180+t*70), Math.floor(175+t*75), Math.floor(160+t*90));
      }
    }
  }
  // Center dot
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++)
      spx(img, cx+dx, cy+dy, 200, 240, 238, 220);
  return img;
}

// ── export ─────────────────────────────────────────────────────────────────────

export function loadTextures() {
  return {
    walls: [
      null,              // 0 = empty
      makeConcrete(),    // 1 = concrete
      makeTealTrim(),    // 2 = teal
      makeBioVein(),     // 3 = bio-vein
      makeSymbolPanel(), // 4 = symbol
    ],
    door:      makeDoor(),
    wanderer:  makeWanderer(),
    observer:  makeObserver(),
    echo:      makeEcho(),
    resonator: makeResonator(),
  };
}
