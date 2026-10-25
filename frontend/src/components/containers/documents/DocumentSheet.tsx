"use client";

import { forwardRef, type ReactNode } from "react";
import { DOCUMENT_TYPES } from "@/lib/documentTypes";
import { escapeHtml } from "@/lib/escapeHtml";

/**
 * A clinical document as a printable "sheet": letterhead, patient block,
 * document body, footer. The same markup and stylesheet (`DOC_CSS`) are used
 * on screen and in the print window, so what the practitioner previews is
 * exactly what prints. Session assessments get a purpose-built layout; other
 * structured documents fall back to a generic labelled-field renderer.
 */

export interface SheetDocument {
  _id: string;
  type: string;
  date: string;
  status?: string;
  doctor?: { firstName?: string; lastName?: string };
  content?: Record<string, unknown>;
}
export interface SheetPatient {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  phoneNo?: string;
  mrn?: string;
}

/* Scoped stylesheet — injected next to the sheet and into the print window. */
export const DOC_CSS = `
.doc-sheet { --ink:#0f172a; --muted:#475569; --line:#e2e8f0; --soft:#f8fafc; --brand:#3b6fd8;
  font-family: Inter, Helvetica, Arial, sans-serif; color: var(--ink); font-size: 13px; line-height: 1.55;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.doc-sheet * { box-sizing: border-box; }
.doc-sheet .lh { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; padding-bottom:12px; border-bottom:2px solid var(--brand); }
.doc-sheet .lh-name { font-size:20px; font-weight:700; color:var(--brand); margin:0; letter-spacing:-0.01em; }
.doc-sheet .lh-tag { font-size:12px; color:var(--muted); margin-top:2px; }
.doc-sheet .lh-contact { font-size:11.5px; color:var(--muted); text-align:right; line-height:1.5; }
.doc-sheet .doc-title { margin:20px 0 4px; font-size:18px; font-weight:700; }
.doc-sheet .doc-sub { font-size:12px; color:var(--muted); }
.doc-sheet .pt { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px 24px; margin:16px 0 4px; padding:12px 14px; border:1px solid var(--line); border-radius:6px; background:var(--soft); }
.doc-sheet .k { font-size:10.5px; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); font-weight:600; }
.doc-sheet .v { font-size:13px; margin-top:1px; word-break:break-word; }
.doc-sheet .sec { margin-top:22px; break-inside:avoid; page-break-inside:avoid; }
.doc-sheet .sec-h { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--brand); margin:0 0 8px; padding-bottom:6px; border-bottom:1px solid var(--line); }
.doc-sheet .grid2 { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px 28px; }
.doc-sheet .para { white-space:pre-wrap; }
.doc-sheet .muted { color:var(--muted); }
.doc-sheet .note { margin-top:10px; padding:10px 12px; border-radius:6px; background:var(--soft); border:1px solid var(--line); font-size:12px; color:var(--muted); }
.doc-sheet table.scores { width:100%; border-collapse:collapse; }
.doc-sheet table.scores td { padding:8px 0; border-bottom:1px solid var(--line); vertical-align:top; }
.doc-sheet table.scores tr:last-child td { border-bottom:0; }
.doc-sheet td.q { width:46%; padding-right:16px; }
.doc-sheet td.q .qn { font-size:11.5px; color:var(--muted); margin-top:2px; }
.doc-sheet td.s { width:54%; }
.doc-sheet .bar { display:flex; gap:2px; align-items:center; }
.doc-sheet .cell { flex:1; height:10px; border-radius:2px; background:#e8eef9; border:1px solid #d5def0; }
.doc-sheet .cell.on { background:var(--brand); border-color:var(--brand); }
.doc-sheet .score { min-width:44px; text-align:right; font-weight:700; font-variant-numeric:tabular-nums; margin-left:10px; }
.doc-sheet .ends { display:flex; justify-content:space-between; font-size:10.5px; color:var(--muted); margin-top:3px; padding-right:54px; }
.doc-sheet .pill { display:inline-block; padding:1px 8px; border-radius:999px; font-size:11px; font-weight:600; background:#eef2f7; color:var(--muted); }
.doc-sheet .pill.ok { background:#e7f6ec; color:#166534; }
.doc-sheet .pill.amd { background:#eaf0fd; color:#1e40af; }
.doc-sheet ol.amend { margin:0; padding-left:18px; }
.doc-sheet ol.amend li { margin:4px 0; }
.doc-sheet .sign { margin-top:28px; display:flex; justify-content:space-between; gap:24px; align-items:flex-end; break-inside:avoid; }
.doc-sheet .sign-line { min-width:220px; border-top:1px solid var(--ink); padding-top:4px; font-size:12px; }
.doc-sheet .foot { margin-top:24px; padding-top:8px; border-top:1px solid var(--line); font-size:10.5px; color:var(--muted); text-align:center; }
@media (max-width: 640px) { .doc-sheet .pt { grid-template-columns:repeat(2,minmax(0,1fr)); } .doc-sheet .grid2 { grid-template-columns:1fr; } }
`;

const fmtDate = (v?: string) =>
  v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtDateTime = (v?: string) =>
  v ? new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", hour12: true, minute: "2-digit" }) : "—";
const ageOf = (dob?: string) => {
  if (!dob) return null;
  const d = new Date(dob);
  const n = new Date();
  return n.getFullYear() - d.getFullYear() - (n < new Date(n.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
};
const cap = (s?: string) => (s ? s[0].toUpperCase() + s.slice(1) : "—");
const humanize = (k: string) =>
  k
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());

export const docTypeLabel = (type: string) =>
  type === "session-assessment" ? "Session Assessment" : DOCUMENT_TYPES.find((d) => d.value === type)?.label ?? humanize(type);

/* ───────────── session assessment body ───────────── */

interface AItem { id: string; label: string; type: "scale" | "text"; scale?: { min: number; max: number; lowLabel: string; highLabel: string } }
interface ASection { id: string; title: string; items: AItem[] }
interface AResp { itemId: string; state: string; score?: number | null; text?: string; note?: string }
interface AContent {
  kind: "session-assessment";
  template?: { sections?: ASection[] };
  appointment?: { title?: string; start?: string; end?: string };
  responses?: AResp[];
  notes?: string;
  summary?: { text?: string; approved?: boolean; approvedAt?: string } | null;
  status?: string;
  submittedAt?: string;
  amendments?: { version: number; at: string; reason: string }[];
}

function AssessmentBody({ c }: { c: AContent }) {
  const byId = new Map((c.responses ?? []).map((r) => [r.itemId, r]));
  const minutes =
    c.appointment?.start && c.appointment?.end
      ? Math.round((new Date(c.appointment.end).getTime() - new Date(c.appointment.start).getTime()) / 60000)
      : null;
  const amended = (c.amendments?.length ?? 0) > 0;

  return (
    <>
      <div className="sec">
        <div className="grid2">
          <div>
            <div className="k">Session</div>
            <div className="v">
              {c.appointment?.title ?? "—"}
              {minutes ? ` · ${minutes} min` : ""}
            </div>
          </div>
          <div>
            <div className="k">Session date</div>
            <div className="v">{fmtDateTime(c.appointment?.start)}</div>
          </div>
          <div>
            <div className="k">Status</div>
            <div className="v">
              <span className={`pill ${amended ? "amd" : "ok"}`}>{amended ? `Amended (${c.amendments!.length})` : "Submitted"}</span>
            </div>
          </div>
          <div>
            <div className="k">Submitted</div>
            <div className="v">{fmtDateTime(c.submittedAt)}</div>
          </div>
        </div>
        <div className="note">
          Ratings are the practitioner&apos;s observations on 0–10 scales during this session — not a diagnosis or a standardised measure. Items left blank or not observed are not scored.
        </div>
      </div>

      {(c.template?.sections ?? []).map((s) => {
        const rows = s.items.filter((i) => {
          const r = byId.get(i.id);
          return r && (r.state !== "blank" || r.note?.trim() || r.text?.trim());
        });
        if (!rows.length) return null;
        return (
          <div className="sec" key={s.id}>
            <h3 className="sec-h">{s.title}</h3>
            <table className="scores">
              <tbody>
                {rows.map((i) => {
                  const r = byId.get(i.id)!;
                  if (i.type === "text") {
                    return (
                      <tr key={i.id}>
                        <td className="q">{i.label}</td>
                        <td className="s para">{r.text}</td>
                      </tr>
                    );
                  }
                  const max = i.scale?.max ?? 10;
                  return (
                    <tr key={i.id}>
                      <td className="q">
                        {i.label}
                        {r.note?.trim() && <div className="qn">{r.note}</div>}
                      </td>
                      <td className="s">
                        {r.state === "scored" && typeof r.score === "number" ? (
                          <>
                            <div className="bar" role="img" aria-label={`${r.score} out of ${max}`}>
                              {Array.from({ length: max }, (_, k) => (
                                <span key={k} className={`cell ${k < r.score! ? "on" : ""}`} />
                              ))}
                              <span className="score">
                                {r.score}/{max}
                              </span>
                            </div>
                            {i.scale && (
                              <div className="ends">
                                <span>0 · {i.scale.lowLabel}</span>
                                <span>{i.scale.highLabel} · {max}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="pill">{r.state === "not_observed" ? "Not observed" : r.state === "not_applicable" ? "Not applicable" : "Not rated"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}

      {c.notes?.trim() && (
        <div className="sec">
          <h3 className="sec-h">Practitioner notes</h3>
          <div className="para">{c.notes}</div>
        </div>
      )}

      {c.summary?.text?.trim() && (
        <div className="sec">
          <h3 className="sec-h">Session summary</h3>
          <div className="para">{c.summary.text}</div>
          {c.summary.approved && (
            <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
              Reviewed and approved by the practitioner{c.summary.approvedAt ? ` on ${fmtDateTime(c.summary.approvedAt)}` : ""}.
            </div>
          )}
        </div>
      )}

      {amended && (
        <div className="sec">
          <h3 className="sec-h">Amendment history</h3>
          <ol className="amend">
            {c.amendments!.map((m) => (
              <li key={m.version}>
                <strong>{fmtDateTime(m.at)}</strong> — {m.reason}
              </li>
            ))}
          </ol>
        </div>
      )}
    </>
  );
}

/* ───────────── generic structured body ───────────── */

function Value({ v }: { v: unknown }): ReactNode {
  if (v === null || v === undefined || v === "") return <span className="muted">—</span>;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return fmtDateTime(v);
  if (Array.isArray(v)) {
    if (v.every((x) => typeof x !== "object" || x === null)) return v.length ? v.join(", ") : <span className="muted">—</span>;
    return (
      <div style={{ display: "grid", gap: 8 }}>
        {v.map((x, i) => (
          <div key={i} className="note" style={{ marginTop: 0 }}>
            <Fields obj={x as Record<string, unknown>} />
          </div>
        ))}
      </div>
    );
  }
  if (typeof v === "object") return <Fields obj={v as Record<string, unknown>} />;
  return <span className="para">{String(v)}</span>;
}

function Fields({ obj }: { obj: Record<string, unknown> }) {
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== "");
  return (
    <div className="grid2">
      {entries.map(([k, v]) => (
        <div key={k} style={typeof v === "string" && v.length > 80 ? { gridColumn: "1 / -1" } : undefined}>
          <div className="k">{humanize(k)}</div>
          <div className="v">
            <Value v={v} />
          </div>
        </div>
      ))}
    </div>
  );
}

function GenericBody({ content }: { content: Record<string, unknown> }) {
  return (
    <>
      {Object.entries(content).map(([section, value]) =>
        value === null || value === undefined || value === "" ? null : (
          <div className="sec" key={section}>
            <h3 className="sec-h">{humanize(section)}</h3>
            {typeof value === "object" && !Array.isArray(value) ? (
              <Fields obj={value as Record<string, unknown>} />
            ) : (
              <div className="v">
                <Value v={value} />
              </div>
            )}
          </div>
        ),
      )}
    </>
  );
}

/* ───────────── sheet ───────────── */

export const DocumentSheet = forwardRef<HTMLDivElement, { doc: SheetDocument; patient: SheetPatient | null }>(function DocumentSheet(
  { doc, patient },
  ref,
) {
  const isAssessment = (doc.content as { kind?: string } | undefined)?.kind === "session-assessment";
  const doctor = [doc.doctor?.firstName, doc.doctor?.lastName].filter(Boolean).join(" ");
  const age = ageOf(patient?.dateOfBirth);

  return (
    <div ref={ref} className="doc-sheet">
      <style>{DOC_CSS}</style>
      <header className="lh">
        <div>
          <h1 className="lh-name">BetterYou Clinic</h1>
          <div className="lh-tag">Mental Health &amp; Wellness Center</div>
        </div>
        <div className="lh-contact">
          +91 98765 43210
          <br />
          contact@betteryou.com
          <br />
          Ahmedabad, Gujarat
        </div>
      </header>

      <h2 className="doc-title">{docTypeLabel(doc.type)}</h2>
      <div className="doc-sub">
        {fmtDate(doc.date)}
        {doctor ? ` · Dr. ${doctor}` : ""}
        {doc.status ? ` · ${cap(doc.status)}` : ""}
      </div>

      <div className="pt">
        <div>
          <div className="k">Patient</div>
          <div className="v">{[patient?.firstName, patient?.lastName].filter(Boolean).join(" ") || "—"}</div>
        </div>
        <div>
          <div className="k">MRN</div>
          <div className="v">{patient?.mrn || "—"}</div>
        </div>
        <div>
          <div className="k">Date of birth</div>
          <div className="v">
            {fmtDate(patient?.dateOfBirth)}
            {age !== null ? ` (${age} yrs)` : ""}
          </div>
        </div>
        <div>
          <div className="k">Gender</div>
          <div className="v">{cap(patient?.gender)}</div>
        </div>
        <div>
          <div className="k">Contact</div>
          <div className="v">{patient?.phoneNo || "—"}</div>
        </div>
        <div>
          <div className="k">Practitioner</div>
          <div className="v">{doctor ? `Dr. ${doctor}` : "—"}</div>
        </div>
      </div>

      {isAssessment ? (
        <AssessmentBody c={doc.content as unknown as AContent} />
      ) : doc.content && Object.keys(doc.content).length ? (
        <GenericBody content={doc.content} />
      ) : (
        <p className="sec muted">This document has no content.</p>
      )}

      <div className="sign">
        <div className="muted" style={{ fontSize: 11.5 }}>
          Generated {fmtDateTime(new Date().toISOString())}
        </div>
        <div className="sign-line">{doctor ? `Dr. ${doctor}` : "Practitioner"}</div>
      </div>
      <div className="foot">This document is electronically generated by BetterYou and is confidential patient information.</div>
    </div>
  );
});

/**
 * Prints a rendered sheet in a clean window with the same stylesheet. Waits
 * for the document to load before printing and closes after the dialog.
 */
export function printSheet(el: HTMLElement | null, title: string) {
  if (!el) return;
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>@page{size:A4;margin:16mm 16mm 18mm}html,body{margin:0;background:#fff}${DOC_CSS}</style></head>
<body>${el.outerHTML}</body></html>`);
  w.document.close();
  const go = () => {
    w.focus();
    w.addEventListener("afterprint", () => w.close());
    w.print();
  };
  if (w.document.readyState === "complete") setTimeout(go, 50);
  else w.addEventListener("load", go);
}
