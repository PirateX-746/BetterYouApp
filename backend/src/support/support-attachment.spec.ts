import {
  attachmentKey,
  safeAttachmentName,
  sniffAttachment,
} from './support-attachment';

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
]);
const jpeg = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.alloc(32),
]);
const webp = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.alloc(4),
  Buffer.from('WEBP'),
  Buffer.alloc(32),
]);
const pdf = (body = '') =>
  Buffer.from(`%PDF-1.7\n${body}\n${'x'.repeat(80)}\n%%EOF\n`, 'latin1');

describe('sniffAttachment', () => {
  it('recognises allowed types by their bytes', () => {
    expect(sniffAttachment(png)).toBe('image/png');
    expect(sniffAttachment(jpeg)).toBe('image/jpeg');
    expect(sniffAttachment(webp)).toBe('image/webp');
    expect(sniffAttachment(pdf())).toBe('application/pdf');
  });

  it('rejects everything else, whatever it is named', () => {
    expect(
      sniffAttachment(Buffer.from('<script>alert(1)</script>'.padEnd(40))),
    ).toBeNull();
    expect(sniffAttachment(Buffer.from('PK\x03\x04'.padEnd(40)))).toBeNull(); // zip/docx
    expect(sniffAttachment(Buffer.alloc(4))).toBeNull();
  });

  it('rejects PDFs carrying active content', () => {
    expect(
      sniffAttachment(
        pdf('1 0 obj << /OpenAction 2 0 R /JS (app.alert(1)) >> endobj'),
      ),
    ).toBeNull();
  });
});

describe('safeAttachmentName', () => {
  it('forces the extension to the sniffed type and strips header-unsafe chars', () => {
    expect(safeAttachmentName('my "screen" shot.exe', 'image/png')).toBe(
      'my_screen_shot.png',
    );
    expect(safeAttachmentName('', 'application/pdf')).toBe('attachment.pdf');
    expect(safeAttachmentName('../../etc/passwd', 'image/jpeg')).toBe(
      'passwd.jpg',
    );
  });
});

describe('attachmentKey', () => {
  const id = 'a'.repeat(24);
  it('builds a key from ids only', () => {
    expect(attachmentKey(id, id, id)).toBe(`support/${id}/${id}/${id}`);
  });
  it('refuses anything that is not an ObjectId', () => {
    expect(() => attachmentKey('../x', id, id)).toThrow();
  });
});
