/**
 * Validation for files attached to support tickets.
 *
 * Kept free of Nest/Mongoose imports so it is trivially unit-testable. The
 * browser-supplied MIME type and extension are never trusted: the type is
 * sniffed from the file's own bytes.
 */
import { hasActivePdfContent, isPdf } from '../documents/document-file';

export const ATTACHMENT_LIMITS = {
  maxBytes: 10 * 1024 * 1024,
  maxFiles: 5,
} as const;

export type AttachmentKind = 'image/png' | 'image/jpeg' | 'image/webp' | 'application/pdf';

const EXT: Record<AttachmentKind, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

/** The real content type of an allowed attachment, or null if not allowed. */
export function sniffAttachment(buf: Buffer): AttachmentKind | null {
  if (!buf || buf.length < 12) return null;
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') {
    return 'image/webp';
  }
  if (isPdf(buf)) return hasActivePdfContent(buf) ? null : 'application/pdf';
  return null;
}

/**
 * A display filename safe for a Content-Disposition header, with the
 * extension forced to match the sniffed type. Only ever a label — storage
 * keys are built from server-generated ids.
 */
export function safeAttachmentName(original: string, kind: AttachmentKind): string {
  const base = ((original || '').split(/[\\/]/).pop() ?? '')
    .replace(/\.[^.]*$/, '')
    .normalize('NFKD')
    .replace(/[^\w\s.-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 80);
  return `${base || 'attachment'}.${EXT[kind]}`;
}

export function attachmentKey(ticketId: string, messageId: string, attachmentId: string): string {
  for (const id of [ticketId, messageId, attachmentId]) {
    if (!/^[a-f0-9]{24}$/i.test(id)) throw new Error('Invalid id in storage key');
  }
  return `support/${ticketId}/${messageId}/${attachmentId}`;
}
