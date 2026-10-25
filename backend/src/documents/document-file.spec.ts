import {
  hasActivePdfContent,
  countPdfPages,
  isPdf,
  safeFileName,
  storageKeyFor,
} from './document-file';

const pdf = (body = '') =>
  Buffer.from(
    `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n${body}\n` +
      'x'.repeat(64) +
      '\n%%EOF\n',
    'latin1',
  );

describe('document-file', () => {
  describe('countPdfPages', () => {
    it('counts page objects but not the page tree', () => {
      const body =
        '<< /Type /Pages /Count 2 >> << /Type /Page >> << /Type/Page /Parent 2 0 R >>';
      expect(countPdfPages(Buffer.from(body, 'latin1'))).toBe(2);
    });

    it('returns 0 when no page objects are visible', () => {
      expect(
        countPdfPages(Buffer.from('%PDF-1.7 /Type /ObjStm', 'latin1')),
      ).toBe(0);
    });
  });

  describe('isPdf', () => {
    it('accepts a structurally valid PDF', () => {
      expect(isPdf(pdf())).toBe(true);
    });

    it('rejects a JPEG renamed to .pdf', () => {
      const jpeg = Buffer.concat([
        Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
        Buffer.alloc(200),
      ]);
      expect(isPdf(jpeg)).toBe(false);
    });

    it('rejects a truncated PDF with no EOF marker', () => {
      expect(isPdf(Buffer.from('%PDF-1.4\n' + 'x'.repeat(200)))).toBe(false);
    });

    it('rejects tiny or empty buffers', () => {
      expect(isPdf(Buffer.alloc(0))).toBe(false);
      expect(isPdf(Buffer.from('%PDF-'))).toBe(false);
    });
  });

  describe('hasActivePdfContent', () => {
    it('flags JavaScript and auto-actions', () => {
      expect(
        hasActivePdfContent(
          pdf('2 0 obj << /S /JavaScript /JS (app.alert(1)) >> endobj'),
        ),
      ).toBe(true);
      expect(hasActivePdfContent(pdf('<< /OpenAction 3 0 R >>'))).toBe(true);
      expect(hasActivePdfContent(pdf('<< /Type /EmbeddedFile >>'))).toBe(true);
    });

    it('ignores marker-like bytes inside binary image streams', () => {
      const body =
        '3 0 obj << /Length 20 /Filter /DCTDecode >>\nstream\n/JavaScript /JS junk\nendstream\nendobj';
      expect(hasActivePdfContent(pdf(body))).toBe(false);
    });

    it('passes a plain image PDF', () => {
      expect(hasActivePdfContent(pdf())).toBe(false);
    });
  });

  describe('safeFileName', () => {
    it('strips path traversal and header-breaking characters', () => {
      const name = safeFileName('../../etc/passwd"\r\nX-Evil: 1');
      expect(name).not.toMatch(/[/"\r\n:]/);
      expect(name.endsWith('.pdf')).toBe(true);
    });

    it('falls back when nothing usable remains', () => {
      expect(safeFileName('///')).toBe('Document.pdf');
    });

    it('keeps a readable name', () => {
      expect(safeFileName('Lab Results 2026-10-12')).toBe(
        'Lab_Results_2026-10-12.pdf',
      );
    });
  });

  describe('storageKeyFor', () => {
    const id = 'a'.repeat(24);

    it('builds a tenant-scoped key', () => {
      expect(storageKeyFor(id, id, id)).toBe(
        `documents/${id}/patients/${id}/${id}/original.pdf`,
      );
    });

    it('refuses non-ObjectId components', () => {
      expect(() => storageKeyFor('../x', id, id)).toThrow();
    });
  });
});
