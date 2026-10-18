/**
 * Live document detection: finds the four corners of a sheet of paper in a
 * small camera frame. Pure functions on pixel arrays (no DOM, no OpenCV), so
 * it runs a few times a second on the main thread and is unit-testable.
 *
 * Real backgrounds (wood grain, lit walls, tablecloths, laptops) defeat any
 * single cue, so this proposes candidates from several and keeps the one the
 * image actually supports:
 *
 *   candidates  1. bright regions            (classic "white page on dark desk")
 *               2. "paper-ness" regions      (bright AND colourless — beats
 *                                             warm wood and beige walls)
 *               3. straight-line quads       (Hough lines on edges — beats
 *                                             patterns and uneven lighting)
 *   scoring     do all four sides sit on real edges? is the inside different
 *               from the outside? is the inside uniform like paper?
 *   refinement  snap each side onto the nearest strong straight edge.
 *
 * It returns null rather than a wrong answer when unsure — the UI then shows
 * the plain framing guide and the user can crop by hand.
 */
import type { Point, Quad } from "./image";

/** Long edge of the analysis frame. Small keeps a full pass to a few ms. */
export const DETECT_EDGE = 240;

export type DetectOptions = {
  /** Smallest document, as a fraction of the frame area. */
  minAreaRatio?: number;
  /** A quad this large is the background, not a page. */
  maxAreaRatio?: number;
  /** Smallest interior angle (degrees) a page corner may have. */
  minAngle?: number;
  /** Largest interior angle — rejects a "corner" that is really a straight edge. */
  maxAngle?: number;
  /** Shortest side as a fraction of the longest. */
  minSideRatio?: number;
  /** Minimum overall score (0..1) to report a page. */
  minScore?: number;
};

const DEFAULTS: Required<DetectOptions> = {
  minAreaRatio: 0.1,
  maxAreaRatio: 0.95,
  minAngle: 55,
  maxAngle: 125,
  minSideRatio: 0.25,
  minScore: 0.55,
};

/* ─── pixel helpers ─── */

export function toGray(rgba: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const out = new Uint8Array(width * height);
  for (let i = 0, j = 0; j < out.length; i += 4, j++) {
    out[j] = (rgba[i] * 77 + rgba[i + 1] * 150 + rgba[i + 2] * 29) >> 8;
  }
  return out;
}

/**
 * "Paper-ness": bright and colourless scores high (V × (1 − S) in HSV terms).
 * White paper ≈ 240; warm wood or a beige wall drops well below its brightness.
 */
export function toPaperness(rgba: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const out = new Uint8Array(width * height);
  for (let i = 0, j = 0; j < out.length; i += 4, j++) {
    const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    // v·(1−s) = max·(min/max) = min — the darkest channel. Cheap and exact.
    out[j] = max === 0 ? 0 : min;
  }
  return out;
}

/** Separable 3-tap box blur, run twice (≈ small Gaussian). Smooths text and noise. */
export function blur(src: Uint8Array, width: number, height: number): Uint8Array {
  let a = src;
  for (let pass = 0; pass < 2; pass++) {
    const tmp = new Uint8Array(a.length);
    const out = new Uint8Array(a.length);
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const l = a[row + Math.max(0, x - 1)];
        const r = a[row + Math.min(width - 1, x + 1)];
        tmp[row + x] = (l + a[row + x] + r) / 3;
      }
    }
    for (let y = 0; y < height; y++) {
      const up = Math.max(0, y - 1) * width;
      const dn = Math.min(height - 1, y + 1) * width;
      const row = y * width;
      for (let x = 0; x < width; x++) {
        out[row + x] = (tmp[up + x] + tmp[row + x] + tmp[dn + x]) / 3;
      }
    }
    a = out;
  }
  return a;
}

/** Otsu's threshold, plus the contrast between the two classes it found. */
export function otsu(gray: Uint8Array): { threshold: number; separation: number } {
  const hist = new Array<number>(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let sumAll = 0;
  for (let t = 0; t < 256; t++) sumAll += t * hist[t];
  let sumB = 0, wB = 0, best = 0, threshold = 127, sep = 0;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sumAll - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) {
      best = between;
      threshold = t;
      sep = mF - mB;
    }
  }
  return { threshold, separation: sep };
}

type Region = { size: number; boundary: Point[] };

/**
 * The `k` largest 4-connected regions of `mask`, each with its pixel count
 * and boundary pixels (region pixels with an outside neighbour).
 */
export function topRegions(mask: Uint8Array, width: number, height: number, k = 3): Region[] {
  const label = new Int32Array(mask.length);
  const stack = new Int32Array(mask.length);
  const sizes: number[] = [0];
  let next = 0;
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || label[start]) continue;
    next++;
    let size = 0, top = 0;
    stack[top++] = start;
    label[start] = next;
    while (top) {
      const p = stack[--top];
      size++;
      const x = p % width, y = (p - x) / width;
      if (x > 0 && mask[p - 1] && !label[p - 1]) { label[p - 1] = next; stack[top++] = p - 1; }
      if (x < width - 1 && mask[p + 1] && !label[p + 1]) { label[p + 1] = next; stack[top++] = p + 1; }
      if (y > 0 && mask[p - width] && !label[p - width]) { label[p - width] = next; stack[top++] = p - width; }
      if (y < height - 1 && mask[p + width] && !label[p + width]) { label[p + width] = next; stack[top++] = p + width; }
    }
    sizes.push(size);
  }
  const ids = sizes.map((s, id) => ({ s, id })).slice(1).sort((a, b) => b.s - a.s).slice(0, k);
  const want = new Map(ids.map(({ id }, i) => [id, i]));
  const out: Region[] = ids.map(({ s }) => ({ size: s, boundary: [] }));
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const idx = want.get(label[p]);
      if (idx === undefined) continue;
      const id = label[p];
      if (
        x === 0 || y === 0 || x === width - 1 || y === height - 1 ||
        label[p - 1] !== id || label[p + 1] !== id || label[p - width] !== id || label[p + width] !== id
      ) {
        out[idx].boundary.push({ x, y });
      }
    }
  return out;
}

/** Largest region only (kept for callers/tests of the original API). */
export function largestRegion(mask: Uint8Array, width: number, height: number): Region {
  return topRegions(mask, width, height, 1)[0] ?? { size: 0, boundary: [] };
}

/** Andrew's monotone chain. */
export function convexHull(points: Point[]): Point[] {
  if (points.length < 3) return points.slice();
  const pts = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Point[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Point[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

export function polygonArea(poly: Point[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

/** The 4 hull vertices (kept in hull order) that enclose the largest area. */
export function maxAreaQuad(hull: Point[]): Point[] | null {
  if (hull.length < 4) return null;
  const MAX = 32; // C(32,4) ≈ 36k
  const pts = hull.length > MAX ? Array.from({ length: MAX }, (_, i) => hull[Math.floor((i * hull.length) / MAX)]) : hull;
  const n = pts.length;
  let best = -1;
  let quad: Point[] | null = null;
  for (let i = 0; i < n - 3; i++)
    for (let j = i + 1; j < n - 2; j++)
      for (let k = j + 1; k < n - 1; k++)
        for (let l = k + 1; l < n; l++) {
          const area = polygonArea([pts[i], pts[j], pts[k], pts[l]]);
          if (area > best) {
            best = area;
            quad = [pts[i], pts[j], pts[k], pts[l]];
          }
        }
  return quad;
}

/** Orders 4 points as top-left, top-right, bottom-right, bottom-left. */
export function orderQuad(points: Point[]): Quad {
  const cx = points.reduce((s, p) => s + p.x, 0) / 4;
  const cy = points.reduce((s, p) => s + p.y, 0) / 4;
  const sorted = points.slice().sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
  let start = 0;
  for (let i = 1; i < 4; i++) if (sorted[i].x + sorted[i].y < sorted[start].x + sorted[start].y) start = i;
  return [0, 1, 2, 3].map((i) => sorted[(start + i) % 4]) as Quad;
}

function interiorAngles(q: Quad): number[] {
  return q.map((p, i) => {
    const a = q[(i + 3) % 4], b = q[(i + 1) % 4];
    const v1 = { x: a.x - p.x, y: a.y - p.y }, v2 = { x: b.x - p.x, y: b.y - p.y };
    const cos = (v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y) || 1);
    return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
  });
}

function isConvex(q: Quad): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i], b = q[(i + 1) % 4], c = q[(i + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 1e-6) return false;
    const s = Math.sign(cross);
    if (!sign) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

/* ─── gradients and straight lines ─── */

type Gradients = { gx: Float32Array; gy: Float32Array; mag: Float32Array; scale: number };

/** Sobel on two channels; per pixel, the stronger channel's gradient wins. */
function gradients(a: Uint8Array, b: Uint8Array, width: number, height: number): Gradients {
  const n = width * height;
  const gx = new Float32Array(n), gy = new Float32Array(n), mag = new Float32Array(n);
  for (let y = 1; y < height - 1; y++)
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x;
      let bestM = -1, bx = 0, by = 0;
      for (const c of [a, b]) {
        const sx =
          c[p - width + 1] + 2 * c[p + 1] + c[p + width + 1] - c[p - width - 1] - 2 * c[p - 1] - c[p + width - 1];
        const sy =
          c[p + width - 1] + 2 * c[p + width] + c[p + width + 1] - c[p - width - 1] - 2 * c[p - width] - c[p - width + 1];
        const m = Math.hypot(sx, sy);
        if (m > bestM) { bestM = m; bx = sx; by = sy; }
      }
      gx[p] = bx; gy[p] = by; mag[p] = bestM;
    }
  // Robust scale: the 92nd percentile magnitude (sampled), floor for flat scenes.
  const sample: number[] = [];
  for (let i = 0; i < n; i += 7) sample.push(mag[i]);
  sample.sort((u, v) => u - v);
  const scale = Math.max(40, sample[Math.floor(sample.length * 0.92)] ?? 40);
  return { gx, gy, mag, scale };
}

/** A line as normal angle θ (radians, 0..π) and distance ρ: x·cosθ + y·sinθ = ρ. */
type Line = { theta: number; rho: number; votes: number };

const THETA_STEPS = 90; // 2° bins

/**
 * Hough transform, voting only near each edge pixel's own gradient direction
 * (fast and far less noisy than voting over every angle), then non-maximum
 * suppression. Returns the strongest straight edges.
 */
function houghLines(g: Gradients, width: number, height: number, max = 32): Line[] {
  const diag = Math.ceil(Math.hypot(width, height));
  const rhoBins = 2 * diag + 1;
  const acc = new Float32Array(THETA_STEPS * rhoBins);
  const cos = new Float32Array(THETA_STEPS), sin = new Float32Array(THETA_STEPS);
  for (let t = 0; t < THETA_STEPS; t++) {
    cos[t] = Math.cos((t * Math.PI) / THETA_STEPS);
    sin[t] = Math.sin((t * Math.PI) / THETA_STEPS);
  }
  const thr = 0.3 * g.scale;
  for (let y = 2; y < height - 2; y++)
    for (let x = 2; x < width - 2; x++) {
      const p = y * width + x;
      const m = g.mag[p];
      if (m < thr) continue;
      let ang = Math.atan2(g.gy[p], g.gx[p]);
      if (ang < 0) ang += Math.PI;
      const t0 = Math.round((ang / Math.PI) * THETA_STEPS);
      const w = Math.min(m / g.scale, 1.5);
      for (let dt = -3; dt <= 3; dt++) {
        const t = (t0 + dt + THETA_STEPS) % THETA_STEPS;
        // Wrapping past 180° flips the normal, so flip ρ with it.
        const flip = t0 + dt < 0 || t0 + dt >= THETA_STEPS ? -1 : 1;
        const rho = flip * (x * cos[t] + y * sin[t]);
        acc[t * rhoBins + Math.round(rho) + diag] += w;
      }
    }

  const peaks: Line[] = [];
  const minVotes = Math.min(width, height) * 0.15;
  for (let t = 0; t < THETA_STEPS; t++)
    for (let r = 0; r < rhoBins; r++) {
      const v = acc[t * rhoBins + r];
      if (v < minVotes) continue;
      let isMax = true;
      for (let dt = -2; dt <= 2 && isMax; dt++)
        for (let dr = -5; dr <= 5; dr++) {
          if (!dt && !dr) continue;
          const tt = (t + dt + THETA_STEPS) % THETA_STEPS, rr = r + dr;
          if (rr < 0 || rr >= rhoBins) continue;
          if (acc[tt * rhoBins + rr] > v) { isMax = false; break; }
        }
      if (isMax) peaks.push({ theta: (t * Math.PI) / THETA_STEPS, rho: r - diag, votes: v });
    }
  peaks.sort((a, b) => b.votes - a.votes);
  return peaks.slice(0, max);
}

function intersect(a: Line, b: Line): Point | null {
  const det = Math.cos(a.theta) * Math.sin(b.theta) - Math.sin(a.theta) * Math.cos(b.theta);
  if (Math.abs(det) < 1e-6) return null;
  return {
    x: (a.rho * Math.sin(b.theta) - b.rho * Math.sin(a.theta)) / det,
    y: (b.rho * Math.cos(a.theta) - a.rho * Math.cos(b.theta)) / det,
  };
}

/** Angle between two line directions, 0..90°. */
function angleBetween(a: number, b: number): number {
  let d = Math.abs(a - b) % Math.PI;
  if (d > Math.PI / 2) d = Math.PI - d;
  return (d * 180) / Math.PI;
}

/** Line through two points, in (θ, ρ) form. */
function lineThrough(p: Point, q: Point): Line {
  let theta = Math.atan2(q.x - p.x, -(q.y - p.y)); // normal of the direction
  if (theta < 0) theta += Math.PI;
  if (theta >= Math.PI) theta -= Math.PI;
  return { theta, rho: p.x * Math.cos(theta) + p.y * Math.sin(theta), votes: 0 };
}

/* ─── scoring ─── */

type Scored = { quad: Quad; score: number };

function sampleAt(img: Uint8Array, width: number, height: number, x: number, y: number): number | null {
  const xi = Math.round(x), yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= width || yi >= height) return null;
  return img[yi * width + xi];
}

/**
 * How well the image supports `q` as a page outline, 0..1:
 *   edges      — every side lies on real edges aligned with it (the minimum
 *                side counts, so a side on the frame border or on nothing fails)
 *   contrast   — inside differs from a band just outside
 *   uniformity — inside is fairly even, like paper (text lowers it a little)
 */
function scoreQuad(q: Quad, g: Gradients, lum: Uint8Array, pap: Uint8Array, width: number, height: number): number {
  const edgeThr = 0.22 * g.scale;
  const support: number[] = [], strength: number[] = [], contrast: number[] = [];
  const cx = q.reduce((s, p) => s + p.x, 0) / 4, cy = q.reduce((s, p) => s + p.y, 0) / 4;
  const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN);

  for (let i = 0; i < 4; i++) {
    const a = q[i], b = q[(i + 1) % 4];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const dx = (b.x - a.x) / len, dy = (b.y - a.y) / len;
    let nx = -dy, ny = dx;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    if ((mx + nx - cx) ** 2 + (my + ny - cy) ** 2 < (mx - cx) ** 2 + (my - cy) ** 2) { nx = -nx; ny = -ny; } // outward

    const steps = Math.max(10, Math.round(len / 3));
    let hit = 0, strong = 0, total = 0;
    const inL: number[] = [], outL: number[] = [], inP: number[] = [], outP: number[] = [];
    for (let s = 1; s < steps; s++) {
      const t = 0.08 + (0.84 * s) / steps; // skip the corners
      const px = a.x + (b.x - a.x) * t, py = a.y + (b.y - a.y) * t;
      total++;
      let bestM = 0;
      for (let o = -2; o <= 2; o++) {
        const sx = Math.round(px + nx * o), sy = Math.round(py + ny * o);
        if (sx < 1 || sy < 1 || sx >= width - 1 || sy >= height - 1) continue;
        const p = sy * width + sx;
        if (g.mag[p] < edgeThr) continue;
        // The edge must run along this side: gradient ≈ parallel to the normal.
        const align = Math.abs(g.gx[p] * nx + g.gy[p] * ny) / (g.mag[p] || 1);
        if (align > 0.8 && g.mag[p] > bestM) bestM = g.mag[p];
      }
      if (bestM) { hit++; strong += Math.min(1, bestM / g.scale); }
      // Just inside vs just outside this side.
      const il = sampleAt(lum, width, height, px - nx * 4, py - ny * 4), ol = sampleAt(lum, width, height, px + nx * 4, py + ny * 4);
      const ip = sampleAt(pap, width, height, px - nx * 4, py - ny * 4), op = sampleAt(pap, width, height, px + nx * 4, py + ny * 4);
      if (il !== null && ol !== null) { inL.push(il); outL.push(ol); }
      if (ip !== null && op !== null) { inP.push(ip); outP.push(op); }
    }
    support.push(total ? hit / total : 0);
    strength.push(total ? strong / total : 0);
    // A side running along the frame border has no "outside" to compare.
    contrast.push(inL.length < total * 0.5 ? 0 : Math.min(1, Math.max(Math.abs(mean(inL) - mean(outL)), Math.abs(mean(inP) - mean(outP))) / 45));
  }

  const minSupport = Math.min(...support);
  if (minSupport < 0.3) return 0; // a side with no edge under it isn't a page edge
  const minContrast = Math.min(...contrast);
  if (minContrast < 0.12) return 0; // a side that doesn't separate inside from outside

  const insideL: number[] = [];
  for (let u = 0.15; u <= 0.851; u += 0.1)
    for (let v = 0.15; v <= 0.851; v += 0.1) {
      const top = { x: q[0].x + (q[1].x - q[0].x) * u, y: q[0].y + (q[1].y - q[0].y) * u };
      const bot = { x: q[3].x + (q[2].x - q[3].x) * u, y: q[3].y + (q[2].y - q[3].y) * u };
      const l = sampleAt(lum, width, height, top.x + (bot.x - top.x) * v, top.y + (bot.y - top.y) * v);
      if (l !== null) insideL.push(l);
    }
  if (insideL.length < 10) return 0;
  const m = mean(insideL);
  const uniformity = Math.max(0, Math.min(1, 1 - Math.sqrt(insideL.reduce((s, v) => s + (v - m) ** 2, 0) / insideL.length) / 45));

  const edges = 0.5 * (support.reduce((s, v) => s + v, 0) / 4) + 0.5 * minSupport;
  const area = polygonArea(q) / (width * height);
  return (
    0.35 * edges +
    0.2 * Math.min(...strength) + // crisp page border beats a soft shadow line
    0.25 * minContrast + //          every side must separate page from background
    0.1 * uniformity +
    0.1 * Math.min(1, area / 0.5)
  );
}

/**
 * Slides each side (parallel to itself) to the offset within ±8px where the
 * aligned edge response is strongest, then re-intersects. Puts region-derived
 * corners onto the true border instead of a blurred approximation.
 */
function refineSides(q: Quad, g: Gradients, width: number, height: number): Quad {
  const cx = q.reduce((s, p) => s + p.x, 0) / 4, cy = q.reduce((s, p) => s + p.y, 0) / 4;
  const lines: Line[] = [];
  for (let i = 0; i < 4; i++) {
    const a = q[i], b = q[(i + 1) % 4];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    let nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    if ((mx + nx - cx) ** 2 + (my + ny - cy) ** 2 < (mx - cx) ** 2 + (my - cy) ** 2) { nx = -nx; ny = -ny; }
    let bestO = 0, bestSum = -1;
    for (let o = -8; o <= 8; o++) {
      let sum = 0;
      for (let s = 1; s < 16; s++) {
        const t = 0.1 + (0.8 * s) / 16;
        const sx = Math.round(a.x + (b.x - a.x) * t + nx * o), sy = Math.round(a.y + (b.y - a.y) * t + ny * o);
        if (sx < 1 || sy < 1 || sx >= width - 1 || sy >= height - 1) continue;
        const p = sy * width + sx;
        sum += Math.abs(g.gx[p] * nx + g.gy[p] * ny); // edge strength across this side only
      }
      if (sum > bestSum) { bestSum = sum; bestO = o; }
    }
    lines.push(lineThrough({ x: a.x + nx * bestO, y: a.y + ny * bestO }, { x: b.x + nx * bestO, y: b.y + ny * bestO }));
  }
  const pts = [0, 1, 2, 3].map((i) => intersect(lines[(i + 3) % 4], lines[i]));
  return pts.some((p) => !p) ? q : orderQuad(pts as Point[]);
}

/** Local standard deviation (box window of radius r) via integral images. */
function localStd(img: Uint8Array, width: number, height: number, r: number): Float32Array {
  const W1 = width + 1;
  const s1 = new Float64Array(W1 * (height + 1)), s2 = new Float64Array(W1 * (height + 1));
  for (let y = 0; y < height; y++) {
    let row1 = 0, row2 = 0;
    for (let x = 0; x < width; x++) {
      const v = img[y * width + x];
      row1 += v; row2 += v * v;
      s1[(y + 1) * W1 + x + 1] = s1[y * W1 + x + 1] + row1;
      s2[(y + 1) * W1 + x + 1] = s2[y * W1 + x + 1] + row2;
    }
  }
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(height, y + r + 1);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(width, x + r + 1);
      const n = (y1 - y0) * (x1 - x0);
      const a = s1[y1 * W1 + x1] - s1[y0 * W1 + x1] - s1[y1 * W1 + x0] + s1[y0 * W1 + x0];
      const b = s2[y1 * W1 + x1] - s2[y0 * W1 + x1] - s2[y1 * W1 + x0] + s2[y0 * W1 + x0];
      out[y * width + x] = Math.sqrt(Math.max(0, b / n - (a / n) ** 2));
    }
  }
  return out;
}

function geometryOk(q: Quad, width: number, height: number, o: Required<DetectOptions>): boolean {
  if (!isConvex(q)) return false;
  // Corners may sit a little outside the frame (a page edge kissing the border) but not far.
  const m = 0.04 * Math.max(width, height);
  if (q.some((p) => p.x < -m || p.y < -m || p.x > width - 1 + m || p.y > height - 1 + m)) return false;
  const area = polygonArea(q) / (width * height);
  if (area < o.minAreaRatio || area > o.maxAreaRatio) return false;
  if (interiorAngles(q).some((a) => a < o.minAngle || a > o.maxAngle)) return false;
  const sides = q.map((p, i) => Math.hypot(q[(i + 1) % 4].x - p.x, q[(i + 1) % 4].y - p.y));
  return Math.min(...sides) >= Math.max(...sides) * o.minSideRatio;
}

/** Moves each side of a region-derived quad onto the closest strong straight edge. */
function snapToLines(q: Quad, lines: Line[]): Quad {
  const sides = [0, 1, 2, 3].map((i) => {
    const own = lineThrough(q[i], q[(i + 1) % 4]);
    let best: Line | null = null, bestD = Infinity;
    for (const l of lines) {
      if (angleBetween(l.theta, own.theta) > 8) continue;
      // Compare ρ in the same orientation.
      const sameDir = Math.abs(l.theta - own.theta) < Math.PI / 2;
      const d = Math.abs((sameDir ? l.rho : -l.rho) - own.rho);
      if (d < 7 && d < bestD) { bestD = d; best = l; }
    }
    return best ?? own;
  });
  const pts = [0, 1, 2, 3].map((i) => intersect(sides[(i + 3) % 4], sides[i]));
  if (pts.some((p) => !p)) return q;
  return orderQuad(pts as Point[]);
}

/* ─── main entry ─── */

/** Test-only: receives every geometrically valid candidate with its score. */
let debugSink: ((c: Scored) => void) | null = null;
export function __setDetectDebug(fn: ((c: Scored) => void) | null) {
  debugSink = fn;
}

/**
 * Detects a document in an RGBA frame. Returns its corners normalized to
 * 0..1 (TL, TR, BR, BL), or null when no confident page is found.
 */
export function detectDocument(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  options: DetectOptions = {},
): Quad | null {
  const o = { ...DEFAULTS, ...options };
  const lum = blur(toGray(rgba, width, height), width, height);
  const pap = blur(toPaperness(rgba, width, height), width, height);
  const g = gradients(lum, pap, width, height);
  const lines = houghLines(g, width, height);
  const candidates: Quad[] = [];

  // 1–2. Region candidates from brightness and paper-ness.
  for (const ch of [lum, pap]) {
    const { threshold, separation } = otsu(ch);
    if (separation < 18) continue;
    const mask = new Uint8Array(ch.length);
    for (let i = 0; i < ch.length; i++) mask[i] = ch[i] > threshold ? 1 : 0;
    for (const region of topRegions(mask, width, height, 3)) {
      if (region.size < width * height * o.minAreaRatio * 0.6) continue;
      const picked = maxAreaQuad(convexHull(region.boundary));
      if (!picked) continue;
      const q = orderQuad(picked);
      candidates.push(q, snapToLines(q, lines), refineSides(q, g, width, height));
    }
  }

  // Smooth + bright regions: paper is even over large areas, while wood grain,
  // patterned cloth and busy surfaces are not. Proposes the page even when
  // brightness masks merge it with the background.
  {
    const R = 6;
    const sd = localStd(lum, width, height, R);
    const { threshold } = otsu(lum);
    const mask = new Uint8Array(lum.length);
    for (let i = 0; i < lum.length; i++) mask[i] = sd[i] < 9 && lum[i] > Math.min(threshold, 170) ? 1 : 0;
    for (const region of topRegions(mask, width, height, 2)) {
      if (region.size < width * height * o.minAreaRatio * 0.4) continue;
      const picked = maxAreaQuad(convexHull(region.boundary));
      if (!picked) continue;
      // The window shrank the region by ~R at the border; grow back, then snap.
      const q0 = orderQuad(picked);
      const cx = q0.reduce((s, p) => s + p.x, 0) / 4, cy = q0.reduce((s, p) => s + p.y, 0) / 4;
      const grown = q0.map((p) => {
        const d = Math.hypot(p.x - cx, p.y - cy) || 1;
        return { x: p.x + ((p.x - cx) / d) * R, y: p.y + ((p.y - cy) / d) * R };
      }) as Quad;
      candidates.push(grown, refineSides(grown, g, width, height), snapToLines(grown, lines));
    }
  }

  // 3. Quads from straight lines: two roughly-parallel pairs, roughly perpendicular to each other.
  const pairs: [Line, Line][] = [];
  const minGap = 0.2 * Math.min(width, height);
  for (let i = 0; i < lines.length; i++)
    for (let j = i + 1; j < lines.length; j++) {
      if (angleBetween(lines[i].theta, lines[j].theta) > 22) continue;
      const a = intersect(lines[i], lines[j]);
      // Near-parallel lines must be well apart inside the frame.
      if (a && a.x > -width && a.x < 2 * width && a.y > -height && a.y < 2 * height) {
        // Converging within view = perspective is too extreme or it's not a pair.
        if (a.x > 0 && a.x < width && a.y > 0 && a.y < height) continue;
      }
      const sameDir = Math.abs(lines[i].theta - lines[j].theta) < Math.PI / 2;
      const gap = Math.abs((sameDir ? lines[j].rho : -lines[j].rho) - lines[i].rho);
      if (gap >= minGap) pairs.push([lines[i], lines[j]]);
    }
  for (let i = 0; i < pairs.length; i++)
    for (let j = i + 1; j < pairs.length; j++) {
      const [a1, a2] = pairs[i], [b1, b2] = pairs[j];
      const cross = angleBetween(a1.theta, b1.theta);
      if (cross < 55) continue;
      const pts = [intersect(a1, b1), intersect(b1, a2), intersect(a2, b2), intersect(b2, a1)];
      if (pts.some((p) => !p)) continue;
      candidates.push(orderQuad(pts as Point[]));
    }

  // Score every plausible candidate; keep the best.
  // Cheap pass first: 8 samples per side. Busy scenes produce hundreds of
  // line quads; only the most edge-supported few get the full scoring.
  const quick = (q: Quad) => {
    const cx = q.reduce((s, p) => s + p.x, 0) / 4, cy = q.reduce((s, p) => s + p.y, 0) / 4;
    let min = 1, sum = 0;
    for (let i = 0; i < 4; i++) {
      const a = q[i], b = q[(i + 1) % 4];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      let nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      if ((mx + nx - cx) ** 2 + (my + ny - cy) ** 2 < (mx - cx) ** 2 + (my - cy) ** 2) { nx = -nx; ny = -ny; }
      let hit = 0;
      for (let k = 1; k <= 8; k++) {
        const t = k / 9;
        for (let off = -2; off <= 2; off += 2) {
          const sx = Math.round(a.x + (b.x - a.x) * t + nx * off), sy = Math.round(a.y + (b.y - a.y) * t + ny * off);
          if (sx < 1 || sy < 1 || sx >= width - 1 || sy >= height - 1) continue;
          const p = sy * width + sx;
          if (g.mag[p] > 0.22 * g.scale && Math.abs(g.gx[p] * nx + g.gy[p] * ny) > 0.8 * g.mag[p]) { hit++; break; }
        }
      }
      min = Math.min(min, hit / 8);
      sum += hit / 8;
    }
    return min < 0.25 ? -1 : min + sum / 4;
  };
  const shortlist = candidates
    .filter((q) => geometryOk(q, width, height, o))
    .map((q) => ({ q, k: quick(q) }))
    .filter((c) => c.k >= 0)
    .sort((a, b) => b.k - a.k)
    .slice(0, 40);

  let best: Scored | null = null;
  for (const { q } of shortlist) {
    const score = scoreQuad(q, g, lum, pap, width, height);
    debugSink?.({ quad: q, score });
    if (!best || score > best.score) best = { quad: q, score };
  }
  if (!best || best.score < o.minScore) return null;

  // Blur spreads the boundary ~1px outward: pull corners in slightly so the
  // crop never keeps a sliver of background, and clamp into the frame.
  const quad = best.quad;
  const cx = quad.reduce((sum, p) => sum + p.x, 0) / 4;
  const cy = quad.reduce((sum, p) => sum + p.y, 0) / 4;
  const INSET_PX = 1.5;
  return quad.map((p) => {
    const d = Math.hypot(p.x - cx, p.y - cy) || 1;
    const x = Math.min(width - 1, Math.max(0, p.x + ((cx - p.x) / d) * INSET_PX));
    const y = Math.min(height - 1, Math.max(0, p.y + ((cy - p.y) / d) * INSET_PX));
    return { x: x / (width - 1), y: y / (height - 1) };
  }) as Quad;
}

/**
 * Temporal smoothing across frames: follow the new detection, but damp the
 * jitter. A big jump (the page moved) snaps instead of sliding.
 */
export function smoothQuad(prev: Quad | null, next: Quad, alpha = 0.5): Quad {
  if (!prev) return next;
  const jump = Math.max(...next.map((p, i) => Math.hypot(p.x - prev[i].x, p.y - prev[i].y)));
  if (jump > 0.12) return next;
  return next.map((p, i) => ({
    x: prev[i].x + (p.x - prev[i].x) * alpha,
    y: prev[i].y + (p.y - prev[i].y) * alpha,
  })) as Quad;
}

/** True when two detections are within `tol` (normalized) at every corner. */
export function quadsClose(a: Quad, b: Quad, tol = 0.025): boolean {
  return a.every((p, i) => Math.hypot(p.x - b[i].x, p.y - b[i].y) <= tol);
}
