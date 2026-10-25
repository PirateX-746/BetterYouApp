import { api } from "@/lib/api";

/* ─── Types (mirror backend/src/support) ─── */

export type TicketCategory = "technical" | "account" | "billing" | "feature_request" | "other";
export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export interface SupportTicket {
  _id: string;
  ticketNo: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  requesterName: string;
  requesterEmail: string;
  practiceName: string | null;
  lastMessageAt: string;
  messageCount: number;
  unreadForRequester: boolean;
  unreadForAdmin: boolean;
  createdAt: string;
}

export interface SupportAttachment {
  _id: string;
  fileName: string;
  contentType: string;
  size: number;
}

export interface SupportMessage {
  _id: string;
  authorSide: "requester" | "support";
  authorName: string;
  body: string;
  createdAt: string;
  attachments: SupportAttachment[];
}

export interface SupportTicketDetail extends SupportTicket {
  messages: SupportMessage[];
}

export interface Faq {
  _id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isPublished: boolean;
}

export type FaqInput = Pick<Faq, "question" | "answer" | "category"> & {
  isPublished?: boolean;
  sortOrder?: number;
};

/* ─── Labels ─── */

export const CATEGORY_LABEL: Record<TicketCategory, string> = {
  technical: "Technical problem",
  account: "Account & access",
  billing: "Billing",
  feature_request: "Feature request",
  other: "Other",
};

export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

/** Mirrors ATTACHMENT_LIMITS on the backend. */
export const ATTACHMENT_LIMITS = {
  maxFiles: 5,
  maxBytes: 10 * 1024 * 1024,
  accept: "image/png,image/jpeg,image/webp,application/pdf",
} as const;

export const SUBJECT_MAX = 120;
export const BODY_MAX = 5000;

/* ─── API ─── */

function form(fields: Record<string, string | undefined>, files: File[]) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) fd.append(k, v);
  for (const f of files) fd.append("files", f);
  return fd;
}

// The shared client defaults to JSON (which axios would apply to FormData too);
// multipart lets the browser set the boundary.
const MULTIPART = { headers: { "Content-Type": "multipart/form-data" } };

/** Same-origin URL (through the /api rewrite) — the session cookie rides along. */
export const attachmentUrl = (messageId: string, attachmentId: string) =>
  `/api/support/attachments/${messageId}/${attachmentId}`;

export const supportApi = {
  faqs: () => api.get<Faq[]>("/support/faqs").then((r) => r.data),
  myTickets: () => api.get<SupportTicket[]>("/support/tickets").then((r) => r.data),
  ticket: (id: string) => api.get<SupportTicketDetail>(`/support/tickets/${id}`).then((r) => r.data),
  create: (
    input: { subject: string; category: TicketCategory; priority: TicketPriority; body: string },
    files: File[],
  ) => api.post<SupportTicket>("/support/tickets", form(input, files), MULTIPART).then((r) => r.data),
  reply: (id: string, body: string, files: File[]) =>
    api.post<SupportTicketDetail>(`/support/tickets/${id}/messages`, form({ body }, files), MULTIPART).then((r) => r.data),
  close: (id: string) => api.patch<SupportTicketDetail>(`/support/tickets/${id}/close`).then((r) => r.data),
};

export const supportAdminApi = {
  tickets: (params: { status?: TicketStatus; priority?: TicketPriority; category?: TicketCategory; q?: string }) =>
    api
      .get<{ tickets: SupportTicket[]; counts: Partial<Record<TicketStatus, number>> }>("/admin/support/tickets", {
        params: Object.fromEntries(Object.entries(params).filter(([, v]) => v)),
      })
      .then((r) => r.data),
  ticket: (id: string) => api.get<SupportTicketDetail>(`/admin/support/tickets/${id}`).then((r) => r.data),
  reply: (id: string, body: string, files: File[]) =>
    api.post<SupportTicketDetail>(`/admin/support/tickets/${id}/messages`, form({ body }, files), MULTIPART).then((r) => r.data),
  update: (id: string, patch: { status?: TicketStatus; priority?: TicketPriority }) =>
    api.patch<SupportTicketDetail>(`/admin/support/tickets/${id}`, patch).then((r) => r.data),
  faqs: () => api.get<Faq[]>("/admin/support/faqs").then((r) => r.data),
  createFaq: (input: FaqInput) => api.post<Faq>("/admin/support/faqs", input).then((r) => r.data),
  updateFaq: (id: string, input: Partial<FaqInput>) =>
    api.patch<Faq>(`/admin/support/faqs/${id}`, input).then((r) => r.data),
  deleteFaq: (id: string) => api.delete(`/admin/support/faqs/${id}`),
};

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  const mb = n / (1024 * 1024);
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}

export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric", hour12: true,
    minute: "2-digit",
  });
}
