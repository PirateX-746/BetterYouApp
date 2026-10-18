import { describe, expect, it } from "vitest";
import { convexHull, detectDocument, orderQuad, quadsClose, smoothQuad } from "../detect";
import type { Point, Quad } from "../image";

const W = 240;
const H = 180;

/** RGBA frame: `bg` everywhere, `fg` inside the polygon (pixel coords). */
function frame(poly: Point[] | null, bg = 60, fg = 235, noise = 0): Uint8ClampedArray {
  const px = new Uint8ClampedArray(W * H * 4);
  const inside = (x: number, y: number) => {
    if (!poly) return false;
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c;
    }
    return c;
  };
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 2;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const v = (inside(x + 0.5, y + 0.5) ? fg : bg) + noise * rand();
      const i = (y * W + x) * 4;
      px[i] = px[i + 1] = px[i + 2] = v;
      px[i + 3] = 255;
    }
  return px;
}

const norm = (pts: Point[]): Quad => pts.map((p) => ({ x: p.x / (W - 1), y: p.y / (H - 1) })) as Quad;

describe("detectDocument", () => {
  it("finds an upright page on a dark desk", () => {
    const page = [{ x: 50, y: 25 }, { x: 190, y: 25 }, { x: 190, y: 160 }, { x: 50, y: 160 }];
    const q = detectDocument(frame(page), W, H);
    expect(q).not.toBeNull();
    expect(quadsClose(q!, norm(page), 0.03)).toBe(true);
  });

  it("finds a rotated, perspective-skewed page, corners in TL/TR/BR/BL order", () => {
    const page = [{ x: 70, y: 20 }, { x: 200, y: 40 }, { x: 180, y: 165 }, { x: 40, y: 140 }];
    const q = detectDocument(frame(page, 50, 230, 12), W, H);
    expect(q).not.toBeNull();
    expect(quadsClose(q!, norm(page), 0.04)).toBe(true);
  });

  it("is not thrown by dark text on the page", () => {
    const page = [{ x: 40, y: 20 }, { x: 200, y: 20 }, { x: 200, y: 165 }, { x: 40, y: 165 }];
    const px = frame(page);
    // Lines of "text": dark bars inside the page.
    for (let y = 40; y < 150; y += 12)
      for (let x = 60; x < 180; x++)
        for (let t = 0; t < 3; t++) {
          const i = ((y + t) * W + x) * 4;
          px[i] = px[i + 1] = px[i + 2] = 40;
        }
    const q = detectDocument(px, W, H);
    expect(q).not.toBeNull();
    expect(quadsClose(q!, norm(page), 0.03)).toBe(true);
  });

  it("returns null with no page in view", () => {
    expect(detectDocument(frame(null), W, H)).toBeNull();
  });

  it("returns null when page and background are too alike (white on white)", () => {
    const page = [{ x: 50, y: 25 }, { x: 190, y: 25 }, { x: 190, y: 160 }, { x: 50, y: 160 }];
    expect(detectDocument(frame(page, 230, 235), W, H)).toBeNull();
  });

  it("returns null for a small object", () => {
    const tiny = [{ x: 100, y: 80 }, { x: 130, y: 80 }, { x: 130, y: 100 }, { x: 100, y: 100 }];
    expect(detectDocument(frame(tiny), W, H)).toBeNull();
  });

  it("returns null for a non-rectangular bright blob", () => {
    const tri = [{ x: 120, y: 10 }, { x: 225, y: 170 }, { x: 15, y: 170 }];
    expect(detectDocument(frame(tri), W, H)).toBeNull();
  });
});

describe("helpers", () => {
  it("orders corners TL, TR, BR, BL whatever the input order", () => {
    const q = orderQuad([{ x: 9, y: 9 }, { x: 0, y: 0 }, { x: 0, y: 9 }, { x: 9, y: 0 }]);
    expect(q).toEqual([{ x: 0, y: 0 }, { x: 9, y: 0 }, { x: 9, y: 9 }, { x: 0, y: 9 }]);
  });

  it("builds a convex hull", () => {
    const hull = convexHull([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 2, y: 1 }, { x: 4, y: 4 }, { x: 0, y: 4 }]);
    expect(hull).toHaveLength(4);
  });

  it("smooths small jitter but snaps on a big move", () => {
    const a = norm([{ x: 50, y: 25 }, { x: 190, y: 25 }, { x: 190, y: 160 }, { x: 50, y: 160 }]);
    const nudge = a.map((p) => ({ x: p.x + 0.01, y: p.y })) as Quad;
    const s = smoothQuad(a, nudge);
    expect(s[0].x).toBeCloseTo(a[0].x + 0.005, 5);
    const moved = a.map((p) => ({ x: p.x + 0.3, y: p.y })) as Quad;
    expect(smoothQuad(a, moved)).toEqual(moved);
  });
});
