/**
 * Content validation and naming for uploaded document files.
 *
 * Kept free of Nest/Mongoose imports so it is trivially unit-testable.
 */

export const UPLOAD_LIMITS = {
  /** Hard cap on the uploaded PDF, enforced by multer before buffering more. */
  maxBytes: 20 * 1024 * 1024,
  maxPages: 30,
} as const;

export const PDF_MIME = 'application/pdf';

/**
 * True when the buffer is structurally a PDF: `%PDF-` header at offset 0 and
 * an `%%EOF` marker in the trailing bytes. The browser-supplied MIME type and
 * extension are never trusted.
 */
export function isPdf(buf: Buffer): boolean {
  if (!buf || buf.length < 64) return false;
  if (buf.subarray(0, 5).toString('latin1') !== '%PDF-') return false;
  const tail = buf.subarray(Math.max(0, buf.length - 1024)).toString('latin1');
  return tail.includes('%%EOF');
}

/**
 * Rejects PDFs carrying active content. A scanned document never needs
 * JavaScript, launch actions or embedded files, and serving one inline to a
 * clinician's browser would be an attack surface.
 */
export function hasActivePdfContent(buf: Buffer): boolean {
  // Only the object dictionaries are inspected: binary stream payloads (the
  // page images) would otherwise produce random false positives.
  const text = buf
    .toString('latin1')
    .replace(/stream\r?\n[\s\S]*?endstream/g, '');
  return /\/(JavaScript|JS|Launch|EmbeddedFile|OpenAction|AA|RichMedia|XFA)\b/.test(
    text,
  );
}

/**
 * Display filename derived from the title. Strips everything outside a
 * conservative set so it is safe in a Content-Disposition header. It is
 * only ever a label — storage keys are generated server-side from IDs.
 */
export function safeFileName(title: string): string {
  const base = title
    .normalize('NFKD')
    .replace(/[^\w\s.-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/\.+/g, '.')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 80);
  return `${base || 'Document'}.pdf`;
}

/** Tenant-aware object key. Every component is a server-generated ObjectId. */
export function storageKeyFor(
  practiceId: string,
  patientId: string,
  documentId: string,
): string {
  for (const id of [practiceId, patientId, documentId]) {
    if (!/^[a-f0-9]{24}$/i.test(id)) throw new Error('Invalid id in storage key');
  }
  return `documents/${practiceId}/patients/${patientId}/${documentId}/original.pdf`;
}
