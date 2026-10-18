import { api } from "./api";

/* ───── types (mirror backend session-assessments) ───── */

export type AssessmentStatus = "draft" | "ready_for_review" | "submitted" | "amended";
export type ResponseState = "scored" | "not_observed" | "not_applicable" | "blank";

export interface TemplateItem {
  id: string;
  label: string;
  type: "scale" | "text";
  help?: string;
  scale?: { min: number; max: number; lowLabel: string; highLabel: string; direction: "higher-is-better" | "higher-is-more" };
}
export interface TemplateSection {
  id: string;
  title: string;
  items: TemplateItem[];
}
export interface AssessmentResponse {
  itemId: string;
  state: ResponseState;
  score?: number | null;
  text?: string;
  note?: string;
}
export interface AssessmentSummary {
  text: string;
  generatedBy: "template" | "ai";
  generatedAt: string;
  edited: boolean;
  approved: boolean;
  approvedAt?: string;
}
export interface Assessment {
  _id: string;
  appointmentId: string;
  patientId: string;
  practitionerId: string;
  status: AssessmentStatus;
  revision: number;
  responses: AssessmentResponse[];
  notes?: string;
  summary?: AssessmentSummary | null;
  documentId?: string;
  submittedAt?: string;
  lastSavedAt?: string;
  amendments: { version: number; at: string; reason: string }[];
}
export interface AssessmentBundle {
  assessment: Assessment;
  template: TemplateSection[];
  appointment: { _id: string; title: string; start: string; end: string; status: string } | null;
  patient: {
    _id: string;
    firstName: string;
    lastName: string;
    mrn?: string;
    dateOfBirth?: string;
    gender?: string;
    healthCondition?: string;
    allergies?: string;
  } | null;
  previousSummaries: { id: string; submittedAt: string; appointment?: { title?: string; start?: string }; summary: string }[];
  permissions: { canEdit: boolean; canAmend: boolean };
}
/** Row shape from GET /session-assessments/patient/:id and /mine/drafts. */
export interface AssessmentRow {
  _id: string;
  format: "v2" | "legacy";
  status: AssessmentStatus;
  appointment?: { _id: string; title?: string; start?: string; end?: string; status?: string } | null;
  patient?: { _id: string; firstName?: string; lastName?: string } | string | null;
  practitioner?: { _id: string; firstName?: string; lastName?: string } | string | null;
  documentId: string | null;
  summary: string | null;
  submittedAt: string | null;
  updatedAt: string;
  amendments: number;
}

export interface DraftPayload {
  responses?: AssessmentResponse[];
  notes?: string;
  summaryText?: string;
  summaryApproved?: boolean;
  status?: "draft" | "ready_for_review";
}

export const STATUS_META: Record<AssessmentStatus, { label: string; tone: "neutral" | "warning" | "success" | "primary" }> = {
  draft: { label: "Draft", tone: "neutral" },
  ready_for_review: { label: "Ready for review", tone: "warning" },
  submitted: { label: "Submitted", tone: "success" },
  amended: { label: "Amended", tone: "primary" },
};

export const assessmentsApi = {
  open: (appointmentId: string) =>
    api.post<AssessmentBundle>("/session-assessments/open", { appointmentId }).then((r) => r.data),
  save: (id: string, revision: number, body: DraftPayload) =>
    api.patch<AssessmentBundle>(`/session-assessments/${id}`, { revision, ...body }).then((r) => r.data),
  summary: (id: string, revision: number) =>
    api.post<AssessmentBundle>(`/session-assessments/${id}/summary`, { revision }).then((r) => r.data),
  previewSummary: (id: string, body: { responses?: AssessmentResponse[]; notes?: string }) =>
    api.post<{ text: string }>(`/session-assessments/${id}/summary/preview`, body).then((r) => r.data),
  submit: (id: string, revision: number) =>
    api.post<AssessmentBundle>(`/session-assessments/${id}/submit`, { revision }).then((r) => r.data),
  amend: (id: string, revision: number, body: DraftPayload & { reason: string }) =>
    api.post<AssessmentBundle>(`/session-assessments/${id}/amend`, { revision, ...body }).then((r) => r.data),
  myDrafts: () => api.get<AssessmentRow[]>("/session-assessments/mine/drafts").then((r) => r.data),
  byPatient: (patientId: string) =>
    api.get<AssessmentRow[]>(`/session-assessments/patient/${patientId}`).then((r) => r.data),
};

/* ───── on-device backup ─────
 * Unsaved edits are mirrored to localStorage so a crash, closed tab or lost
 * connection never loses work. Keys are scoped to the signed-in user and
 * every `by.assess.` key is wiped on logout (lib/session.ts), since they
 * hold clinical notes.
 */

export const ASSESS_KEY_PREFIX = "by.assess.";

const uid = () => {
  try {
    return localStorage.getItem("userId") ?? "anon";
  } catch {
    return "anon";
  }
};

export interface LocalBackup {
  revision: number;
  at: number;
  data: Required<Pick<DraftPayload, "responses" | "notes">> & { summaryText?: string; summaryApproved?: boolean };
}

export const backup = {
  key: (assessmentId: string) => `${ASSESS_KEY_PREFIX}${uid()}.draft.${assessmentId}`,
  read(assessmentId: string): LocalBackup | null {
    try {
      const raw = localStorage.getItem(this.key(assessmentId));
      return raw ? (JSON.parse(raw) as LocalBackup) : null;
    } catch {
      return null;
    }
  },
  write(assessmentId: string, value: LocalBackup) {
    try {
      localStorage.setItem(this.key(assessmentId), JSON.stringify(value));
    } catch {
      /* storage full or blocked — server autosave still runs */
    }
  },
  clear(assessmentId: string) {
    try {
      localStorage.removeItem(this.key(assessmentId));
    } catch {
      /* ignore */
    }
  },
};

/** Open workspace tabs (appointment ids), per user. */
export const tabsStore = {
  key: () => `${ASSESS_KEY_PREFIX}${uid()}.tabs`,
  read(): { tabs: string[]; active: string | null } {
    try {
      const v = JSON.parse(localStorage.getItem(this.key()) ?? "null");
      if (v && Array.isArray(v.tabs)) return { tabs: v.tabs.filter((t: unknown) => typeof t === "string"), active: v.active ?? null };
    } catch {
      /* ignore */
    }
    return { tabs: [], active: null };
  },
  write(tabs: string[], active: string | null) {
    try {
      localStorage.setItem(this.key(), JSON.stringify({ tabs, active }));
    } catch {
      /* ignore */
    }
  },
};

export interface SessionRow {
  appointmentId: string;
  title: string;
  start: string;
  end: string;
  appointmentStatus: string;
  patient: { _id: string; firstName: string; lastName: string } | null;
  assessmentId: string | null;
  assessmentStatus: AssessmentStatus | null;
}
export const mySessions = () => api.get<SessionRow[]>("/session-assessments/mine/sessions").then((r) => r.data);
