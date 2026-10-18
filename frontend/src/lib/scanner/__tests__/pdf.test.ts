import { describe, expect, it } from "vitest";
import { buildPdfFromJpegs, estimatePdfPageCount, looksLikePdf } from "../pdf";

/** Smallest byte pattern the writer accepts as a JPEG (SOI ... EOI). */
const fakeJpeg = (n = 32) => {
    const b = new Uint8Array(n);
    b[0] = 0xff; b[1] = 0xd8; b[n - 2] = 0xff; b[n - 1] = 0xd9;
    return b;
};

const latin1 = (b: Uint8Array) => new TextDecoder("latin1").decode(b);

describe("buildPdfFromJpegs", () => {
    const pdf = buildPdfFromJpegs([
        { jpeg: fakeJpeg(), width: 1200, height: 1600 },
        { jpeg: fakeJpeg(40), width: 1600, height: 1200 },
        { jpeg: fakeJpeg(), width: 1000, height: 1400 },
    ]);
    const text = latin1(pdf);

    it("writes a PDF header, trailer and EOF", () => {
        expect(text.startsWith("%PDF-1.4")).toBe(true);
        expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
        expect(looksLikePdf(pdf)).toBe(true);
    });

    it("keeps every page in order", () => {
        expect(text).toMatch(/\/Type \/Pages \/Count 3 \/Kids \[3 0 R 6 0 R 9 0 R\]/);
        expect(estimatePdfPageCount(pdf)).toBe(3);
        const order = [...text.matchAll(/\/Im(\d) \d+ 0 R/g)].map((m) => m[1]);
        expect(order).toEqual(["0", "1", "2"]);
    });

    it("orients each page to its image (A4 portrait / landscape)", () => {
        const boxes = [...text.matchAll(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g)].map((m) => [+m[1], +m[2]]);
        expect(boxes[0][0]).toBeLessThan(boxes[0][1]);
        expect(boxes[1][0]).toBeGreaterThan(boxes[1][1]);
    });

    it("embeds images as DCTDecode with their real dimensions", () => {
        expect(text).toContain("/Width 1200 /Height 1600");
        expect(text).toContain("/Width 1600 /Height 1200");
        expect((text.match(/\/Filter \/DCTDecode/g) ?? []).length).toBe(3);
    });

    it("has a byte-accurate xref table", () => {
        const startxref = Number(/startxref\n(\d+)/.exec(text)![1]);
        expect(text.slice(startxref, startxref + 4)).toBe("xref");
        const entries = [...text.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
        expect(entries).toHaveLength(2 + 3 * 3);
        entries.forEach((offset, i) => {
            expect(text.slice(offset, offset + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`);
        });
    });

    it("declares stream lengths that match the payload", () => {
        const re = /\/Length (\d+) >>\nstream\n/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text))) {
            const start = m.index + m[0].length;
            expect(text.slice(start + Number(m[1]), start + Number(m[1]) + 10)).toBe("\nendstream");
        }
    });

    it("rejects empty documents and non-JPEG pages", () => {
        expect(() => buildPdfFromJpegs([])).toThrow();
        expect(() => buildPdfFromJpegs([{ jpeg: new Uint8Array([0x89, 0x50, 0x4e, 0x47]), width: 1, height: 1 }])).toThrow(/not a JPEG/);
        expect(() => buildPdfFromJpegs([{ jpeg: fakeJpeg(), width: 0, height: 10 }])).toThrow();
    });
});

describe("estimatePdfPageCount", () => {
    it("falls back to 1 when page objects are not visible", () => {
        expect(estimatePdfPageCount(new TextEncoder().encode("%PDF-1.7 compressed"))).toBe(1);
    });
});
