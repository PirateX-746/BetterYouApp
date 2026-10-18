/**
 * Image processing for scanned pages.
 *
 * The pure functions (homography, filters, quality metrics, corner rotation)
 * operate on plain arrays so they are unit-testable without a DOM; the
 * canvas helpers at the bottom wire them to real images in the browser.
 *
 * Everything runs locally — page images never leave the device except as
 * the final PDF upload.
 */

export type Point = { x: number; y: number };
/** Top-left, top-right, bottom-right, bottom-left — normalized 0..1. */
export type Quad = [Point, Point, Point, Point];
export type ColorMode = "color" | "grayscale" | "bw";
export type Rotation = 0 | 90 | 180 | 270;

export type PageEdits = {
  rotation: Rotation;
  corners: Quad;
  mode: ColorMode;
  /** -100..100 */
  brightness: number;
  /** -100..100 */
  contrast: number;
};

export const FULL_QUAD: Quad = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

export const DEFAULT_EDITS: PageEdits = {
  rotation: 0,
  corners: FULL_QUAD,
  mode: "color",
  brightness: 0,
  contrast: 0,
};

/** Output limits: legible at A4 (~240 dpi on the long edge) without bloat. */
export const MAX_OUTPUT_EDGE = 2800;
/** Working-copy limit, bounds memory for 4K+ phone captures. */
export const MAX_WORKING_EDGE = 3200;
export const JPEG_QUALITY = 0.85;

/* ------------------------------------------------------------------ */
/*  Geometry                                                          */
/* ------------------------------------------------------------------ */

export function isFullQuad(q: Quad): boolean {
  return q.every(
    (p, i) => Math.abs(p.x - FULL_QUAD[i].x) < 1e-3 && Math.abs(p.y - FULL_QUAD[i].y) < 1e-3,
  );
}

/** Rotates normalized corners 90° clockwise along with the image. */
export function rotateQuadCw(q: Quad): Quad {
  // (x, y) -> (1 - y, x); the corner that was bottom-left becomes top-left.
  const r = q.map((p) => ({ x: 1 - p.y, y: p.x })) as Quad;
  return [r[3], r[0], r[1], r[2]];
}

/** Rejects self-intersecting or degenerate crop shapes. */
export function isConvexQuad(q: Quad): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i];
    const b = q[(i + 1) % 4];
    const c = q[(i + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 1e-4) return false;
    const s = Math.sign(cross);
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Size of the flattened output for a quad in pixel coordinates. */
export function quadOutputSize(q: Quad): { width: number; height: number } {
  const [tl, tr, br, bl] = q;
  return {
    width: Math.max(1, Math.round(Math.max(dist(tl, tr), dist(bl, br)))),
    height: Math.max(1, Math.round(Math.max(dist(tl, bl), dist(tr, br)))),
  };
}

/**
 * 3x3 homography (row-major, h[8] = 1) mapping each `from` point to the
 * matching `to` point. Solved as an 8x8 linear system by Gaussian
 * elimination with partial pivoting.
 */
export function computeHomography(from: Quad, to: Quad): number[] {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = from[i];
    const { x: u, y: v } = to[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }

  const n = 8;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r;
    }
    if (Math.abs(A[pivot][col]) < 1e-12) throw new Error("Degenerate crop shape");
    [A[col], A[pivot]] = [A[pivot], A[col]];
    [b[col], b[pivot]] = [b[pivot], b[col]];

    for (let r = col + 1; r < n; r++) {
      const f = A[r][col] / A[col][col];
      for (let c = col; c < n; c++) A[r][c] -= f * A[col][c];
      b[r] -= f * b[col];
    }
  }

  const h = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r];
    for (let c = r + 1; c < n; c++) s -= A[r][c] * h[c];
    h[r] = s / A[r][r];
  }
  return [...h, 1];
}

export function applyHomography(h: number[], x: number, y: number): Point {
  const w = h[6] * x + h[7] * y + h[8];
  return { x: (h[0] * x + h[1] * y + h[2]) / w, y: (h[3] * x + h[4] * y + h[5]) / w };
}

/**
 * Perspective-flattens the quad region of `src` into a new RGBA buffer
 * (bilinear sampling). `quad` is in source pixel coordinates.
 */
export function warpPerspective(
  src: { data: Uint8ClampedArray; width: number; height: number },
  quad: Quad,
  outWidth: number,
  outHeight: number,
): Uint8ClampedArray<ArrayBuffer> {
  const dstRect: Quad = [
    { x: 0, y: 0 },
    { x: outWidth - 1, y: 0 },
    { x: outWidth - 1, y: outHeight - 1 },
    { x: 0, y: outHeight - 1 },
  ];
  // Inverse mapping: for each output pixel, find where it comes from.
  const h = computeHomography(dstRect, quad);
  const out = new Uint8ClampedArray(new ArrayBuffer(outWidth * outHeight * 4));
  const { data, width: sw, height: sh } = src;
  const maxX = sw - 1;
  const maxY = sh - 1;

  for (let y = 0; y < outHeight; y++) {
    for (let x = 0; x < outWidth; x++) {
      const w = h[6] * x + h[7] * y + h[8];
      let sx = (h[0] * x + h[1] * y + h[2]) / w;
      let sy = (h[3] * x + h[4] * y + h[5]) / w;
      sx = sx < 0 ? 0 : sx > maxX ? maxX : sx;
      sy = sy < 0 ? 0 : sy > maxY ? maxY : sy;

      const x0 = sx | 0;
      const y0 = sy | 0;
      const x1 = x0 < maxX ? x0 + 1 : x0;
      const y1 = y0 < maxY ? y0 + 1 : y0;
      const fx = sx - x0;
      const fy = sy - y0;

      const i00 = (y0 * sw + x0) * 4;
      const i10 = (y0 * sw + x1) * 4;
      const i01 = (y1 * sw + x0) * 4;
      const i11 = (y1 * sw + x1) * 4;
      const o = (y * outWidth + x) * 4;

      for (let c = 0; c < 3; c++) {
        const top = data[i00 + c] + (data[i10 + c] - data[i00 + c]) * fx;
        const bot = data[i01 + c] + (data[i11 + c] - data[i01 + c]) * fx;
        out[o + c] = top + (bot - top) * fy;
      }
      out[o + 3] = 255;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Tone and color                                                    */
/* ------------------------------------------------------------------ */

const luma = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

/**
 * Applies brightness/contrast then the color mode, in place, on RGBA data.
 *
 * Black & white uses Bradley adaptive thresholding (local mean over a
 * window ~1/8 of the page) rather than one global cutoff, so shadows and
 * uneven lighting across a phone photo don't wipe out faint handwriting
 * or signatures.
 */
export function applyTone(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  mode: ColorMode,
  brightness: number,
  contrast: number,
): void {
  const b = (brightness / 100) * 255 * 0.5;
  const c = (contrast / 100) * 255 * 0.8;
  const cf = (259 * (c + 255)) / (255 * (259 - c));
  const toned = brightness !== 0 || contrast !== 0;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let bl = data[i + 2];
    if (toned) {
      r = cf * (r - 128) + 128 + b;
      g = cf * (g - 128) + 128 + b;
      bl = cf * (bl - 128) + 128 + b;
    }
    if (mode !== "color") {
      const y = luma(r, g, bl);
      r = g = bl = y;
    }
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = bl;
  }

  if (mode === "bw") adaptiveThreshold(data, width, height);
}

function adaptiveThreshold(data: Uint8ClampedArray, width: number, height: number) {
  // Integral image of luminance (already grayscale at this point).
  const integral = new Float64Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    for (let x = 0; x < width; x++) {
      rowSum += data[(y * width + x) * 4];
      integral[(y + 1) * (width + 1) + (x + 1)] = integral[y * (width + 1) + (x + 1)] + rowSum;
    }
  }

  const half = Math.max(4, Math.round(Math.max(width, height) / 16));
  const t = 0.15;
  for (let y = 0; y < height; y++) {
    const y1 = Math.max(0, y - half);
    const y2 = Math.min(height - 1, y + half);
    for (let x = 0; x < width; x++) {
      const x1 = Math.max(0, x - half);
      const x2 = Math.min(width - 1, x + half);
      const count = (x2 - x1 + 1) * (y2 - y1 + 1);
      const sum =
        integral[(y2 + 1) * (width + 1) + (x2 + 1)] -
        integral[y1 * (width + 1) + (x2 + 1)] -
        integral[(y2 + 1) * (width + 1) + x1] +
        integral[y1 * (width + 1) + x1];
      const i = (y * width + x) * 4;
      const v = data[i] * count <= sum * (1 - t) ? 0 : 255;
      data[i] = data[i + 1] = data[i + 2] = v;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Quality hints                                                     */
/* ------------------------------------------------------------------ */

export type QualityHint = "dark" | "blurry" | null;

/**
 * Cheap capture-quality check on a downscaled grayscale sample: mean
 * brightness and variance of the Laplacian (low variance = few sharp
 * edges = likely blur). Advisory only — never blocks a capture.
 */
export function assessQuality(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): QualityHint {
  const gray = new Float32Array(width * height);
  let total = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = luma(data[i], data[i + 1], data[i + 2]);
    total += gray[p];
  }
  if (total / gray.length < 55) return "dark";

  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x;
      const lap = gray[p - 1] + gray[p + 1] + gray[p - width] + gray[p + width] - 4 * gray[p];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  if (n === 0) return null;
  const variance = sumSq / n - (sum / n) ** 2;
  return variance < 40 ? "blurry" : null;
}

/* ------------------------------------------------------------------ */
/*  Browser helpers                                                   */
/* ------------------------------------------------------------------ */

export function fitWithin(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export async function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new Error("This image could not be read. Try a JPEG or PNG file.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvas2d(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not available in this browser");
  return { canvas, ctx };
}

export function canvasToJpeg(canvas: HTMLCanvasElement, quality = JPEG_QUALITY): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode image"))),
      "image/jpeg",
      quality,
    ),
  );
}

/** Draws the image rotated, bounded to the working size. */
export function drawRotated(img: CanvasImageSource & { width: number; height: number }, rotation: Rotation) {
  const base = fitWithin(img.width, img.height, MAX_WORKING_EDGE);
  const swap = rotation === 90 || rotation === 270;
  const { canvas, ctx } = canvas2d(swap ? base.height : base.width, swap ? base.width : base.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -base.width / 2, -base.height / 2, base.width, base.height);
  return { canvas, ctx };
}

export type ProcessedPage = { blob: Blob; width: number; height: number };

/**
 * Renders a page from its untouched original plus the edit settings.
 * The original blob is never modified, so every edit is reversible.
 */
export async function renderPage(original: Blob, edits: PageEdits): Promise<ProcessedPage> {
  const img = await loadImage(original);
  const { canvas: rotated, ctx: rctx } = drawRotated(img, edits.rotation);

  let width = rotated.width;
  let height = rotated.height;
  let pixels: ImageData;

  if (isFullQuad(edits.corners)) {
    pixels = rctx.getImageData(0, 0, width, height);
  } else {
    if (!isConvexQuad(edits.corners)) throw new Error("The crop corners overlap. Adjust them and try again.");
    const quad = edits.corners.map((p) => ({ x: p.x * (width - 1), y: p.y * (height - 1) })) as Quad;
    const size = quadOutputSize(quad);
    const out = fitWithin(size.width, size.height, MAX_OUTPUT_EDGE);
    // Scale the target so the warp writes the output size directly.
    const src = rctx.getImageData(0, 0, width, height);
    const warped = warpPerspective(src, quad, out.width, out.height);
    width = out.width;
    height = out.height;
    pixels = new ImageData(warped, width, height);
  }

  applyTone(pixels.data, width, height, edits.mode, edits.brightness, edits.contrast);

  const final = fitWithin(width, height, MAX_OUTPUT_EDGE);
  const { canvas: work, ctx: wctx } = canvas2d(width, height);
  wctx.putImageData(pixels, 0, 0);

  let outCanvas = work;
  if (final.width !== width) {
    const scaled = canvas2d(final.width, final.height);
    scaled.ctx.imageSmoothingQuality = "high";
    scaled.ctx.drawImage(work, 0, 0, final.width, final.height);
    outCanvas = scaled.canvas;
  }

  const blob = await canvasToJpeg(outCanvas, edits.mode === "bw" ? 0.8 : JPEG_QUALITY);
  // Read the size before releasing: outCanvas is `work` itself when no
  // downscale was needed, and zeroing it below would report a 0×0 page.
  const size = { width: outCanvas.width, height: outCanvas.height };
  // Release backing stores promptly — large canvases are the main memory cost.
  rotated.width = rotated.height = work.width = work.height = 0;
  return { blob, ...size };
}

/** Quality hint for a freshly captured image, on a small sample. */
export function quickQuality(source: CanvasImageSource, width: number, height: number): QualityHint {
  const s = fitWithin(width, height, 320);
  const { canvas, ctx } = canvas2d(s.width, s.height);
  ctx.drawImage(source, 0, 0, s.width, s.height);
  const hint = assessQuality(ctx.getImageData(0, 0, s.width, s.height).data, s.width, s.height);
  canvas.width = canvas.height = 0;
  return hint;
}
