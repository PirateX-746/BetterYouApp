"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { assessmentsApi, STATUS_META, type AssessmentRow } from "@/lib/assessments";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { Badge, type BadgeTone } from "@/components/common/Badge";
import { LoadingState } from "@/components/ui/loading-state";
import { docTypeLabel } from "@/components/containers/documents/DocumentSheet";

export type EmrKind = "note" | "assessment" | "document";

/** One row of the combined EMR list — every record type reduced to the same shape. */
export interface EmrItem {
  id: string;
  kind: EmrKind;
  date: string;
  title: string;
  author?: string;
  status?: { label: string; tone: BadgeTone };
  summary?: string;
  meta?: string;
  /** Assessments open in the workspace, keyed by their appointment. */
  appointmentId?: string;
}

const KIND: Record<EmrKind, { label: string; tone: BadgeTone }> = {
  note: { label: "Session note", tone: "primary" },
  assessment: { label: "Assessment", tone: "teal" },
  document: { label: "Document", tone: "purple" },
};

const DOC_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  finalized: { label: "Finalized", tone: "primary" },
  signed: { label: "Signed", tone: "success" },
};

type Person = { firstName?: string; lastName?: string } | string | null | undefined;
const personName = (p: Person) =>
  p && typeof p === "object" ? [p.firstName, p.lastName].filter(Boolean).join(" ") || undefined : undefined;

const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });

type NoteRow = {
  _id: string; title: string; sessionDate: string; content?: string; observations?: string;
  progressScore?: number; followUpDate?: string; practitionerId?: Person;
};
type DocRow = {
  _id: string; type: string; date?: string; createdAt?: string; title?: string; category?: string;
  description?: string; status?: string; doctor?: Person;
};

async function loadEmr(patientId: string): Promise<EmrItem[]> {
  const [notes, assessments, docs] = await Promise.allSettled([
    api.get<NoteRow[]>("/progress-notes", { params: { patientId } }),
    assessmentsApi.byPatient(patientId),
    api.get<DocRow[]>(`/documents/patient/${patientId}`),
  ]);
  const items: EmrItem[] = [];

  if (notes.status === "fulfilled") {
    for (const n of notes.value.data ?? []) {
      items.push({
        id: n._id,
        kind: "note",
        date: n.sessionDate,
        title: n.title,
        author: personName(n.practitionerId),
        summary: n.content || n.observations,
        meta: [
          n.progressScore != null ? `Score ${n.progressScore}/10` : null,
          n.followUpDate ? `Follow-up ${fmt(n.followUpDate)}` : null,
        ].filter(Boolean).join(" · ") || undefined,
      });
    }
  }

  if (assessments.status === "fulfilled") {
    for (const a of assessments.value as AssessmentRow[]) {
      items.push({
        id: a._id,
        kind: "assessment",
        date: a.appointment?.start ?? a.submittedAt ?? a.updatedAt,
        title: a.appointment?.title ?? "Session assessment",
        author: personName(a.practitioner),
        status: STATUS_META[a.status],
        summary: a.summary ?? undefined,
        meta: a.amendments > 0 ? `Amended ${a.amendments}×` : undefined,
        appointmentId: a.appointment?._id,
      });
    }
  }

  if (docs.status === "fulfilled") {
    for (const d of docs.value.data ?? []) {
      items.push({
        id: d._id,
        kind: "document",
        date: d.date ?? d.createdAt ?? new Date(0).toISOString(),
        title: d.title || docTypeLabel(d.type),
        author: personName(d.doctor),
        status: d.status ? DOC_STATUS[d.status] : undefined,
        summary: d.description,
        meta: d.title ? docTypeLabel(d.type) : d.category,
      });
    }
  }

  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * EMR Notes → All: every session note, assessment and document for the
 * patient in one list, newest first. Selecting a row opens it in its own
 * view (handled by the parent through `onOpen`).
 */
export default function EmrAllNotes({ patientId, onOpen }: { patientId: string; onOpen: (item: EmrItem) => void }) {
  const [items, setItems] = useState<EmrItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadEmr(patientId).then((r) => !cancelled && setItems(r));
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  if (!items) return <LoadingState />;

  const counts = items.reduce<Record<EmrKind, number>>(
    (acc, i) => ({ ...acc, [i.kind]: acc[i.kind] + 1 }),
    { note: 0, assessment: 0, document: 0 },
  );

  const columns: DataTableColumn<EmrItem>[] = [
    {
      key: "date",
      header: "Date",
      width: "8.5rem",
      sortValue: (i) => new Date(i.date),
      firstSortDirection: "desc",
      className: "align-top text-body text-text-primary tabular-nums whitespace-nowrap",
      render: (i) => fmt(i.date),
    },
    {
      key: "type",
      header: "Type of note",
      width: "30%",
      sortValue: (i) => KIND[i.kind].label,
      className: "align-top",
      render: (i) => (
        <div className="min-w-0 space-y-1">
          {/* A real button so the row is reachable by keyboard, not just by mouse. */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(i);
            }}
            className="block max-w-full text-left text-body font-medium text-text-primary truncate rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 group-hover:text-primary-strong"
          >
            {i.title}
          </button>
          <Badge tone={KIND[i.kind].tone}>{KIND[i.kind].label}</Badge>
        </div>
      ),
    },
    {
      key: "signed",
      header: "Author / status",
      width: "22%",
      sortValue: (i) => i.author,
      className: "align-top",
      render: (i) => (
        <div className="space-y-1">
          <p className={`text-body truncate ${i.author ? "text-text-primary" : "text-text-light"}`}>{i.author ?? "—"}</p>
          {i.status && <Badge tone={i.status.tone} dot>{i.status.label}</Badge>}
        </div>
      ),
    },
    {
      key: "summary",
      header: "Summary",
      className: "align-top",
      render: (i) => (
        <div className="min-w-0">
          {i.summary ? (
            <p className="text-footnote text-text-primary line-clamp-2">{i.summary}</p>
          ) : (
            !i.meta && <p className="text-footnote text-text-light">—</p>
          )}
          {i.meta && <p className="text-caption text-text-secondary mt-0.5 tabular-nums">{i.meta}</p>}
        </div>
      ),
    },
    {
      key: "open",
      header: <span className="sr-only">Open</span>,
      width: "2.75rem",
      className: "align-middle",
      render: () => <ChevronRight size={16} className="text-text-light group-hover:text-text-secondary" aria-hidden />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={items}
      getRowId={(i) => `${i.kind}-${i.id}`}
      onRowClick={onOpen}
      defaultSort={{ key: "date", direction: "desc" }}
      maxBodyHeight="calc(100vh - 24rem)"
      className="min-w-0 [&_table]:min-w-[44rem]"
      emptyState="No notes, assessments or documents for this patient yet."
      footer={
        <p className="text-footnote text-text-secondary tabular-nums">
          {items.length} record{items.length === 1 ? "" : "s"} · {counts.note} session note{counts.note === 1 ? "" : "s"} ·{" "}
          {counts.assessment} assessment{counts.assessment === 1 ? "" : "s"} · {counts.document} document{counts.document === 1 ? "" : "s"}
        </p>
      }
    />
  );
}
