/**
 * Real-world-style scenes for the document detector: textured, bright,
 * patterned and unevenly lit backgrounds, clutter, shadows. Frames are built
 * procedurally (RGB), at the detector's working resolution.
 */
import { describe, expect, it } from "vitest";
import { detectDocument, quadsClose } from "../detect";
import type { Point, Quad } from "../image";

const W = 240;
const H = 180;
type RGB = [number, number, number];

function inside(poly: Point[], x: number, y: number) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

/** Deterministic noise. */
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 2;
}

function scene(opts: {
  bg: (x: number, y: number) => RGB;
  page?: Point[];
  paper?: (x: number, y: number) => RGB;
  extras?: { poly: Point[]; color: RGB }[];
  noise?: number;
}): Uint8ClampedArray {
  const px = new Uint8ClampedArray(W * H * 4);
  const rand = rng(11);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let c: RGB = opts.bg(x, y);
      for (const e of opts.extras ?? []) if (inside(e.poly, x + 0.5, y + 0.5)) c = e.color;
      if (opts.page && inside(opts.page, x + 0.5, y + 0.5)) c = (opts.paper ?? (() => [244, 242, 238] as RGB))(x, y);
      const n = (opts.noise ?? 8) * rand();
      const i = (y * W + x) * 4;
      px[i] = c[0] + n;
      px[i + 1] = c[1] + n;
      px[i + 2] = c[2] + n;
      px[i + 3] = 255;
    }
  return camera(px);
}

/** What a phone camera adds: vignetting (darker corners) and slight defocus. */
function camera(px: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(px.length);
  const cx = W / 2, cy = H / 2, rmax = Math.hypot(cx, cy);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const v = 1 - 0.3 * (Math.hypot(x - cx, y - cy) / rmax) ** 2;
      for (let c = 0; c < 3; c++) {
        let sum = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = Math.min(W - 1, Math.max(0, x + dx)), yy = Math.min(H - 1, Math.max(0, y + dy));
            sum += px[(yy * W + xx) * 4 + c];
            n++;
          }
        out[(y * W + x) * 4 + c] = (sum / n) * v;
      }
      out[(y * W + x) * 4 + 3] = 255;
    }
  return out;
}

const norm = (pts: Point[]): Quad => pts.map((p) => ({ x: p.x / (W - 1), y: p.y / (H - 1) })) as Quad;
const TILTED = [{ x: 62, y: 22 }, { x: 186, y: 34 }, { x: 176, y: 160 }, { x: 50, y: 148 }];

function expectFound(q: Quad | null, page: Point[], tol = 0.035) {
  expect(q, "no document detected").not.toBeNull();
  expect(quadsClose(q!, norm(page), tol), `corners off: ${JSON.stringify(q)}`).toBe(true);
}

/* ─── backgrounds ─── */

/** Light wood: warm, nearly as bright as paper, with grain. */
const lightWood = (x: number, y: number): RGB => {
  const g = 24 * Math.sin(y * 0.45 + 2.5 * Math.sin(x * 0.04)) + 10 * Math.sin(y * 1.7 + x * 0.1);
  return [236 + g, 212 + g, 176 + g];
};

/** Beige wall lit from the right: brightness ramps 150 → 240 across the frame. */
const litWall = (x: number): RGB => {
  const v = 150 + (90 * x) / W;
  return [v, v * 0.97, v * 0.9];
};

/** Red/white checked cloth — the white squares are as bright as the paper. */
const checkedCloth = (x: number, y: number): RGB =>
  (Math.floor(x / 20) + Math.floor(y / 20)) % 2 ? [240, 238, 234] : [190, 55, 60];

describe("detectDocument — real-world backgrounds", () => {
  it("finds a page on light wood grain", () => {
    expectFound(detectDocument(scene({ bg: lightWood, page: TILTED }), W, H), TILTED);
  });

  it("finds a page on an unevenly lit wall (page's dim side darker than the wall's bright side)", () => {
    const page = [{ x: 70, y: 25 }, { x: 175, y: 25 }, { x: 175, y: 155 }, { x: 70, y: 155 }];
    const paper = (x: number): RGB => {
      const v = 185 + (68 * x) / W; // lit by the same lamp
      return [v, v, v];
    };
    expectFound(detectDocument(scene({ bg: litWall, page, paper }), W, H), page);
  });

  it("finds a page on a patterned (checked) tablecloth", () => {
    expectFound(detectDocument(scene({ bg: checkedCloth, page: TILTED }), W, H), TILTED);
  });

  it("finds the page, not a bright laptop screen cut off by the frame edge", () => {
    const page = [{ x: 30, y: 40 }, { x: 130, y: 46 }, { x: 124, y: 170 }, { x: 24, y: 164 }];
    const laptop = { poly: [{ x: 140, y: 0 }, { x: 240, y: 0 }, { x: 240, y: 150 }, { x: 140, y: 150 }], color: [252, 252, 255] as RGB };
    const q = detectDocument(scene({ bg: () => [70, 66, 62], page, extras: [laptop] }), W, H);
    expectFound(q, page);
  });

  it("finds a page with a soft shadow across part of it", () => {
    const paper = (x: number, y: number): RGB => {
      const shade = Math.max(0, Math.min(1, (110 - x - 0.3 * y) / 40)); // soft diagonal shadow edge
      const v = 238 - 80 * shade;
      return [v, v, v - 3];
    };
    expectFound(detectDocument(scene({ bg: () => [88, 80, 72], page: TILTED, paper, noise: 6 }), W, H), TILTED);
  });

  it("finds a page on a low-contrast grey desk", () => {
    expectFound(detectDocument(scene({ bg: () => [176, 178, 182], page: TILTED, noise: 6 }), W, H), TILTED);
  });

  it("finds a white page on an off-white wall", () => {
    const page = [{ x: 60, y: 30 }, { x: 180, y: 30 }, { x: 180, y: 150 }, { x: 60, y: 150 }];
    const q = detectDocument(scene({ bg: () => [214, 210, 200], page, paper: () => [246, 246, 244] }), W, H);
    expectFound(q, page);
  });

  it("finds a page on a dark, busy (noisy) surface", () => {
    const busy = (x: number, y: number): RGB => {
      const v = 60 + 40 * Math.sin(x * 0.9) * Math.sin(y * 0.7) + 25 * Math.sin(x * 0.13 + y * 0.21);
      return [v + 10, v, v - 8];
    };
    expectFound(detectDocument(scene({ bg: busy, page: TILTED, noise: 14 }), W, H), TILTED);
  });

  it("finds nothing on bare wood", () => {
    expect(detectDocument(scene({ bg: lightWood }), W, H)).toBeNull();
  });

  it("finds nothing on a bare, unevenly lit wall", () => {
    expect(detectDocument(scene({ bg: litWall }), W, H)).toBeNull();
  });
});

