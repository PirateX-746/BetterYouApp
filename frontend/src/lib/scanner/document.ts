/**
 * Metadata, validation and upload for custom (scanned / uploaded) documents.
 * Categories and limits mirror backend/src/documents (schema + document-file.ts).
 */
import { api } from "@/lib/api";
import { MAX_PAGES } from "./pages";

export const CUSTOM_DOCUMENT_TYPE = "custom-document";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_TITLE_LENGTH = 120;
export const MAX_DESCRIPTION_LENGTH = 1000;
export { MAX_PAGES };

export const DOCUMENT_CATEGORIES = [
  { value: "medical-report", label: "Medical Reports" },
  { value: "prescription", label: "Prescriptions" },
  { value: "lab-result", label: "Lab Results" },
  { value: "referral-letter", label: "Referral Letters" },
  { value: "consent-form", label: "Consent Forms" },
  { value: "insurance", label: "Insurance Documents" },
  { value: "identification", label: "Identification Documents" },
  { value: "other", label: "Other" },
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number]["value"];
export type DocumentSource = "camera_scan" | "device_upload";

export const categoryLabel = (value?: string) =>
  DOCUMENT_CATEGORIES.find((c) => c.value === value)?.label ?? "Other";

export type DocumentMeta = {
  title: string;
  category: DocumentCategory | "";
  description: string;
  /** yyyy-mm-dd */
  date: string;
};

/** Local calendar date as yyyy-mm-dd (not UTC — avoids off-by-one at night). */
export function todayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Neutral default name — deliberately no patient details. */
export function defaultTitle(now = new Date()): string {
  return `Patient_Document_${todayIso(now)}`;
}

export type MetaErrors = Partial<Record<keyof DocumentMeta, string>>;

export function validateMeta(meta: DocumentMeta, now = new Date()): MetaErrors {
  const errors: MetaErrors = {};
  const title = meta.title.trim();
  if (!title) errors.title = "Document name is required";
  else if (title.length > MAX_TITLE_LENGTH) errors.title = `Keep the name under ${MAX_TITLE_LENGTH} characters`;

  if (!meta.category) errors.category = "Choose a category";

  if (meta.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Keep notes under ${MAX_DESCRIPTION_LENGTH} characters`;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date) || Number.isNaN(Date.parse(meta.date))) {
    errors.date = "Enter a valid date";
  } else if (meta.date > todayIso(now)) {
    errors.date = "Date can't be in the future";
  }
  return errors;
}

export function validateFile(size: number, pageCount: number): string | null {
  if (pageCount < 1) return "Add at least one page";
  if (pageCount > MAX_PAGES) return `A document can have at most ${MAX_PAGES} pages`;
  if (size <= 0) return "The document is empty";
  if (size > MAX_UPLOAD_BYTES) {
    return `The document is ${formatBytes(size)}, over the ${formatBytes(MAX_UPLOAD_BYTES)} limit. Remove pages or switch them to black & white.`;
  }
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Human-readable upload failure. Never surfaces stack traces or raw bodies. */
export function uploadErrorMessage(err: unknown): string {
  const e = err as {
    isAxiosError?: boolean;
    code?: string;
    response?: { status?: number; data?: { message?: string } };
  };
  const status = e?.response?.status;
  if (!e?.response) {
    if (e?.code === "ECONNABORTED" || e?.code === "ETIMEDOUT") {
      return "The upload timed out. Check your connection and retry — your scan is still here.";
    }
    // Only a request that actually left the browser can be a network failure;
    // anything else broke while preparing the PDF and retrying won't help.
    return e?.isAxiosError
      ? "Network error. Check your connection and retry — your scan is still here."
      : "The document couldn't be prepared on this device. Your scan is still here — try removing and re-adding the last page.";
  }
  switch (status) {
    case 400:
      return e.response.data?.message || "Some details are invalid. Review the form and try again.";
    case 401:
      return "Your session has expired. Sign in again to save this document.";
    case 403:
      return "You don't have permission to add documents for this patient.";
    case 404:
      return "This patient record could not be found in your practice.";
    case 413:
      return "The document is too large. Remove pages or use black & white mode.";
    case 415:
      return e.response.data?.message || "This file type isn't supported. Save scans as PDF.";
    default:
      return "The server couldn't save the document. Your scan is still here — please retry.";
  }
}

export type UploadInput = {
  patientId: string;
  pdf: Blob;
  pageCount: number;
  meta: DocumentMeta;
  source: DocumentSource;
  uploadKey: string;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
};

export async function uploadCustomDocument(input: UploadInput) {
  const form = new FormData();
  form.append("title", input.meta.title.trim());
  form.append("category", input.meta.category);
  if (input.meta.description.trim()) form.append("description", input.meta.description.trim());
  form.append("date", input.meta.date);
  form.append("source", input.source);
  form.append("pageCount", String(input.pageCount));
  form.append("uploadKey", input.uploadKey);
  // Generic filename: the display name is derived server-side from the title.
  form.append("file", input.pdf, "document.pdf");

  const res = await api.post(`/documents/patient/${input.patientId}/upload`, form, {
    // The shared client defaults to JSON; multipart lets the browser set the boundary.
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120_000,
    signal: input.signal,
    onUploadProgress: (e) => {
      if (e.total) input.onProgress?.(e.loaded / e.total);
    },
  });
  return res.data;
}

/** Fetches the stored PDF through the authorized endpoint as a Blob. */
export async function fetchDocumentFile(documentId: string): Promise<Blob> {
  const res = await api.get(`/documents/${documentId}/file`, { responseType: "blob" });
  return res.data as Blob;
}
