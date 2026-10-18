import { describe, expect, it } from "vitest";
import {
    FULL_QUAD,
    applyHomography,
    applyTone,
    assessQuality,
    computeHomography,
    fitWithin,
    isConvexQuad,
    isFullQuad,
    quadOutputSize,
    rotateQuadCw,
    warpPerspective,
    type Quad,
} from "../image";

const rgba = (w: number, h: number, fn: (x: number, y: number) => number) => {
    const d = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const v = fn(x, y);
            d[i] = d[i + 1] = d[i + 2] = v;
            d[i + 3] = 255;
        }
    return d;
};

describe("geometry", () => {
    it("homography maps each source corner onto its target", () => {
        const from: Quad = [{ x: 0, y: 0 }, { x: 99, y: 0 }, { x: 99, y: 149 }, { x: 0, y: 149 }];
        const to: Quad = [{ x: 10, y: 20 }, { x: 180, y: 5 }, { x: 200, y: 260 }, { x: 0, y: 240 }];
        const h = computeHomography(from, to);
        from.forEach((p, i) => {
            const q = applyHomography(h, p.x, p.y);
            expect(q.x).toBeCloseTo(to[i].x, 6);
            expect(q.y).toBeCloseTo(to[i].y, 6);
        });
    });

    it("refuses a degenerate quad", () => {
        const flat: Quad = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }];
        expect(() => computeHomography(FULL_QUAD, flat)).toThrow();
    });

    it("four clockwise rotations return the original corners", () => {
        const q: Quad = [{ x: 0.1, y: 0.2 }, { x: 0.9, y: 0.1 }, { x: 0.8, y: 0.9 }, { x: 0.2, y: 0.8 }];
        let r = q;
        for (let i = 0; i < 4; i++) r = rotateQuadCw(r);
        r.forEach((p, i) => {
            expect(p.x).toBeCloseTo(q[i].x);
            expect(p.y).toBeCloseTo(q[i].y);
        });
        // A single turn keeps the full page a full page.
        expect(isFullQuad(rotateQuadCw(FULL_QUAD))).toBe(true);
    });

    it("detects crossed or collapsed corners", () => {
        expect(isConvexQuad(FULL_QUAD)).toBe(true);
        const crossed: Quad = [FULL_QUAD[0], FULL_QUAD[2], FULL_QUAD[1], FULL_QUAD[3]];
        expect(isConvexQuad(crossed)).toBe(false);
    });

    it("sizes the flattened output from the longest edges", () => {
        expect(quadOutputSize([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 90, y: 200 }, { x: 10, y: 200 }])).toEqual({ width: 100, height: 200 });
    });

    it("bounds large images without enlarging small ones", () => {
        expect(fitWithin(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
        expect(fitWithin(800, 600, 2000)).toEqual({ width: 800, height: 600 });
    });
});

describe("warpPerspective", () => {
    it("crops an axis-aligned region exactly", () => {
        const w = 20, h = 20;
        const src = { data: rgba(w, h, (x, y) => (x >= 5 && x < 15 && y >= 5 && y < 15 ? 200 : 10)), width: w, height: h };
        const quad: Quad = [{ x: 5, y: 5 }, { x: 14, y: 5 }, { x: 14, y: 14 }, { x: 5, y: 14 }];
        const out = warpPerspective(src, quad, 10, 10);
        for (let i = 0; i < out.length; i += 4) {
            expect(out[i]).toBe(200);
            expect(out[i + 3]).toBe(255);
        }
    });
});

describe("applyTone", () => {
    it("grayscale equalizes channels", () => {
        const d = new Uint8ClampedArray([255, 0, 0, 255]);
        applyTone(d, 1, 1, "grayscale", 0, 0);
        expect(d[0]).toBe(d[1]);
        expect(d[1]).toBe(d[2]);
    });

    it("leaves color untouched at neutral settings", () => {
        const d = new Uint8ClampedArray([12, 150, 240, 255]);
        applyTone(d, 1, 1, "color", 0, 0);
        expect([...d]).toEqual([12, 150, 240, 255]);
    });

    it("brightness raises values", () => {
        const d = new Uint8ClampedArray([100, 100, 100, 255]);
        applyTone(d, 1, 1, "color", 50, 0);
        expect(d[0]).toBeGreaterThan(100);
    });

    it("black & white keeps dark ink under a shadow gradient", () => {
        // Paper brightening left-to-right with one dark stroke in the shadow.
        const w = 64, h = 64;
        const d = rgba(w, h, (x, y) => (x === 8 && y > 10 && y < 50 ? 30 : 90 + x * 2));
        applyTone(d, w, h, "bw", 0, 0);
        const at = (x: number, y: number) => d[(y * w + x) * 4];
        expect(new Set(Array.from({ length: w * h }, (_, i) => d[i * 4]))).toEqual(new Set([0, 255]));
        expect(at(8, 30)).toBe(0); // ink survives
        expect(at(30, 30)).toBe(255); // shadowed paper goes white
    });
});

describe("assessQuality", () => {
    it("flags dark captures", () => {
        expect(assessQuality(rgba(32, 32, () => 20), 32, 32)).toBe("dark");
    });

    it("flags flat (blurry) captures", () => {
        expect(assessQuality(rgba(32, 32, () => 180), 32, 32)).toBe("blurry");
    });

    it("passes sharp text-like content", () => {
        expect(assessQuality(rgba(32, 32, (x, y) => ((x + y) % 4 < 2 ? 20 : 240)), 32, 32)).toBeNull();
    });
});
