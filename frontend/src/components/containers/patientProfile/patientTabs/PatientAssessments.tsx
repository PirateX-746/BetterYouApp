"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ClipboardList, FileCheck2 } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { LoadingState } from "@/components/ui/loading-state";
import { apiErrorMessage } from "@/lib/api";
import { assessmentsApi, STATUS_META, type AssessmentRow } from "@/lib/assessments";

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—";

/** Loads this patient's session assessments, newest first. */
export function usePatientAssessments(patientId: string) {
  const [rows, setRows] = useState<AssessmentRow[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!patientId) return;
    assessmentsApi
      .byPatient(patientId)
      .then((r) =>
        setRows(
          [...r].sort(
            (a, b) =>
              new Date(b.appointment?.start ?? b.updatedAt).getTime() -
              new Date(a.appointment?.start ?? a.updatedAt).getTime(),
          ),
        ),
      )
      .catch((e) => setError(apiErrorMessage(e, "Couldn't load assessments.")));
  }, [patientId]);
  return { rows, error };
}

/**
 * Session assessments for one patient. Each row opens the assessment in the
 * Assessments workspace, which owns editing, amendment and filing — this view
 * only lists what exists.
 */
export function AssessmentList({ rows, limit }: { rows: AssessmentRow[]; limit?: number }) {
  const shown = limit ? rows.slice(0, limit) : rows;
  return (
    <ul className="divide-y divide-border-light">
      {shown.map((r) => {
        const st = STATUS_META[r.status];
        const href = r.appointment?._id ? `/assessments?appointment=${r.appointment._id}` : null;
        const body = (
          <>
            <span className="size-9 rounded-lg bg-bg-hover text-text-secondary grid place-items-center shrink-0" aria-hidden>
              {r.documentId ? <FileCheck2 size={16} /> : <ClipboardList size={16} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-body font-medium text-text-primary truncate">{r.appointment?.title ?? "Session"}</span>
                <Badge tone={st.tone} dot>{st.label}</Badge>
                {r.amendments > 0 && (
                  <span className="text-caption text-text-secondary">
                    Amended {r.amendments}×
                  </span>
                )}
              </span>
              <span className="block text-footnote text-text-secondary mt-0.5 tabular-nums">
                Session {fmt(r.appointment?.start)}
                {r.submittedAt && ` · Submitted ${fmt(r.submittedAt)}`}
              </span>
              {r.summary && (
                <span className="block text-footnote text-text-secondary mt-1.5 line-clamp-2 max-w-prose">{r.summary}</span>
              )}
            </span>
            {href && <ArrowUpRight size={16} className="text-text-light shrink-0 mt-1" aria-hidden />}
          </>
        );
        return (
          <li key={r._id}>
            {href ? (
              <Link
                href={href}
                className="flex items-start gap-3 px-5 py-3.5 hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:bg-bg-subtle"
              >
                {body}
              </Link>
            ) : (
              <div className="flex items-start gap-3 px-5 py-3.5">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function PatientAssessments({ patientId }: { patientId: string }) {
  const { rows, error } = usePatientAssessments(patientId);

  // Rendered inside the EMR Notes card, so no card of its own.
  return (
    <div className="space-y-4">
      <p className="text-footnote text-text-secondary">
        Practitioner observations recorded after each session. Open one to review, continue or amend it.
      </p>
      {error ? (
        <p role="alert" className="text-body text-danger-strong">{error}</p>
      ) : !rows ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <div className="py-10 text-center">
          <ClipboardList className="mx-auto text-text-light" size={28} aria-hidden />
          <p className="mt-3 text-body font-medium text-text-primary">No assessments yet</p>
          <p className="text-footnote text-text-secondary mt-1">
            Assessments appear here once a session with this patient has been assessed.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <AssessmentList rows={rows} />
        </div>
      )}
    </div>
  );
}
