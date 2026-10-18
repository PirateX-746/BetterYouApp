/**
 * Minimal PDF writer for scanned pages.
 *
 * PDF embeds JPEG natively (DCTDecode), so a multi-page scan is just the
 * page JPEGs wrapped in a few dictionary objects — no re-encoding, no
 * dependency, and the output is byte-for-byte the images the practitioner
 * reviewed. Each page is A4 (portrait or landscape to match the image) with
 * the image scaled to fit and centered.
 */

export type PdfPage = {
  /** Baseline or progressive JPEG bytes, 3-channel (what canvas emits). */
  jpeg: Uint8Array;
  width: number;
  height: number;
};

const A4 = { short: 595.28, long: 841.89 };

const enc = new TextEncoder();

export function buildPdfFromJpegs(pages: PdfPage[]): Uint8Array {
  if (pages.length === 0) throw new Error("A PDF needs at least one page");

  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;

  const push = (part: string | Uint8Array) => {
    const bytes = typeof part === "string" ? enc.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };

  const object = (id: number, body: () => void) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
    body();
    push("\nendobj\n");
  };

  // Header + binary marker comment so transfer tools treat the file as binary.
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  // Object ids: 1 catalog, 2 page tree, then 3 per page (page, content, image).
  const pageIds = pages.map((_, i) => 3 + i * 3);

  object(1, () => push("<< /Type /Catalog /Pages 2 0 R >>"));
  object(2, () =>
    push(
      `<< /Type /Pages /Count ${pages.length} /Kids [${pageIds
        .map((id) => `${id} 0 R`)
        .join(" ")}] >>`,
    ),
  );

  pages.forEach((page, i) => {
    if (!page.width || !page.height) throw new Error(`Page ${i + 1} has no size`);
    if (page.jpeg[0] !== 0xff || page.jpeg[1] !== 0xd8) {
      throw new Error(`Page ${i + 1} is not a JPEG`);
    }

    const pageId = pageIds[i];
    const contentId = pageId + 1;
    const imageId = pageId + 2;

    const landscape = page.width > page.height;
    const pw = landscape ? A4.long : A4.short;
    const ph = landscape ? A4.short : A4.long;
    const scale = Math.min(pw / page.width, ph / page.height);
    const w = +(page.width * scale).toFixed(2);
    const h = +(page.height * scale).toFixed(2);
    const x = +((pw - w) / 2).toFixed(2);
    const y = +((ph - h) / 2).toFixed(2);

    object(pageId, () =>
      push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] ` +
          `/Resources << /XObject << /Im${i} ${imageId} 0 R >> >> ` +
          `/Contents ${contentId} 0 R >>`,
      ),
    );

    const drawOps = `q ${w} 0 0 ${h} ${x} ${y} cm /Im${i} Do Q`;
    object(contentId, () => {
      push(`<< /Length ${enc.encode(drawOps).length} >>\nstream\n`);
      push(drawOps);
      push("\nendstream");
    });

    object(imageId, () => {
      push(
        `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} ` +
          `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ` +
          `/Length ${page.jpeg.length} >>\nstream\n`,
      );
      push(page.jpeg);
      push("\nendstream");
    });
  });

  const objectCount = 3 + pages.length * 3;
  const xrefOffset = length;
  let xref = `xref\n0 ${objectCount}\n0000000000 65535 f \n`;
  for (let id = 1; id < objectCount; id++) {
    xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  push(xref);
  push(
    `trailer\n<< /Size ${objectCount} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  );

  const out = new Uint8Array(length);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

/**
 * Best-effort page count of an existing PDF (device uploads). Counts page
 * objects in the uncompressed dictionary text; PDFs that hide them in object
 * streams fall back to 1. Only used as display metadata.
 */
export function estimatePdfPageCount(bytes: Uint8Array): number {
  const text = new TextDecoder("latin1").decode(bytes);
  const matches = text.match(/\/Type\s*\/Page(?![s\w])/g);
  return Math.max(1, matches?.length ?? 0);
}

export function looksLikePdf(bytes: Uint8Array): boolean {
  return (
    bytes.length > 64 &&
    new TextDecoder("latin1").decode(bytes.subarray(0, 5)) === "%PDF-"
  );
}
