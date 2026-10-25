"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Trash2, ChevronDown, NotebookPen, Printer, CalendarClock, CheckSquare } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Badge, type BadgeTone } from "@/components/common/Badge";
import { Field, FieldGroup, inputClass, textareaClass } from "@/components/common/Field";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { escapeHtml } from "@/lib/escapeHtml";

/**
 * Session notes — the patient's single clinical note type. What used to be a
 * separate "follow-up note" is now the optional Follow-up section of a session
 * note (recommendations, action items, follow-up date). Backed by
 * /progress-notes; migration 003 copied the old follow-up notes across.
 */
interface SessionNote {
  _id: string;
  title: string;
  sessionDate: string;
  content?: string;
  progressScore?: number;
  mood?: string;
  symptoms: string[];
  observations?: string;
  nextSteps?: string;
  recommendations?: string;
  actionItems?: string[];
  followUpDate?: string;
  createdAt: string;
}

const MOODS = ["Excellent", "Good", "Neutral", "Anxious", "Low", "Distressed"];

const scoreTone = (score: number): BadgeTone => (score >= 8 ? "success" : score >= 5 ? "warning" : "danger");

const fmtDate = (iso: string, long = false) =>
  new Date(iso).toLocaleDateString(undefined, long ? { year: "numeric", month: "long", day: "numeric" } : { year: "numeric", month: "short", day: "numeric" });

const splitLines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

const EMPTY_FORM = {
  title: "",
  sessionDate: new Date().toISOString().slice(0, 10),
  content: "",
  progressScore: "" as number | "",
  mood: "",
  symptoms: "",
  observations: "",
  nextSteps: "",
  recommendations: "",
  actionItems: "",
  followUpDate: "",
};

/** `focusId`: a note picked in EMR → All — expanded and scrolled into view. */
export default function SessionNotesTab({ focusId }: { focusId?: string }) {
  const params = useParams();
  const patientId = params?.id as string;
  const practitionerId = typeof window !== "undefined" ? localStorage.getItem("userId") ?? "" : "";

  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const formRef = useRef<HTMLFormElement>(null);

  const set = <K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const fetchNotes = useCallback(async () => {
    if (!patientId) return;
    try {
      const res = await api.get("/progress-notes", { params: { patientId } });
      setNotes(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load session notes");
    }
  }, [patientId]);

  useEffect(() => {
    fetchNotes().finally(() => setLoading(false));
  }, [fetchNotes]);

  useEffect(() => {
    if (loading || !focusId) return;
    setExpanded(focusId);
    requestAnimationFrame(() =>
      document.getElementById(`note-${focusId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  }, [loading, focusId]);

  useEffect(() => {
    if (showForm) setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }, [showForm]);

  const closeForm = () => {
    setShowForm(false);
    setForm({ ...EMPTY_FORM, sessionDate: new Date().toISOString().slice(0, 10) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Mirrors the server's rules so the practitioner sees why before a round trip.
    const today = new Date().toISOString().slice(0, 10);
    const score = form.progressScore === "" ? null : Number(form.progressScore);
    const problem =
      !form.title.trim() ? "Title is required"
      : !form.sessionDate ? "Session date is required"
      : form.sessionDate > today ? "The session date can't be in the future"
      : score !== null && !(Number.isInteger(score) && score >= 1 && score <= 10) ? "Progress score must be a whole number from 1 to 10"
      : form.followUpDate && form.followUpDate < form.sessionDate ? "The follow-up date can't be before the session"
      : null;
    if (problem) {
      toast.error(problem);
      return;
    }
    setSaving(true);
    try {
      await api.post("/progress-notes", {
        patientId,
        practitionerId,
        title: form.title.trim(),
        sessionDate: form.sessionDate,
        content: form.content || undefined,
        progressScore: form.progressScore !== "" ? Number(form.progressScore) : undefined,
        mood: form.mood || undefined,
        symptoms: form.symptoms ? form.symptoms.split(",").map((s) => s.trim()).filter(Boolean) : [],
        observations: form.observations || undefined,
        nextSteps: form.nextSteps || undefined,
        recommendations: form.recommendations || undefined,
        actionItems: splitLines(form.actionItems),
        followUpDate: form.followUpDate || undefined,
      });
      await fetchNotes();
      closeForm();
      toast.success("Session note saved");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e?.response?.data?.message;
      toast.error((Array.isArray(msg) ? msg[0] : msg) ?? "Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/progress-notes/${deleteId}`);
      setNotes((prev) => prev.filter((n) => n._id !== deleteId));
      toast.success("Deleted");
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handlePrint = (note: SessionNote) => {
    const win = window.open("", "_blank");
    if (!win) return;
    const section = (label: string, value?: string) =>
      value ? `<div class="section"><div class="label">${label}</div><div class="value">${escapeHtml(value)}</div></div>` : "";
    win.document.write(`
      <html><head><title>Session Note</title><style>
        body { font-family: -apple-system, system-ui, sans-serif; padding: 40px; color: #1d1d1f; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        h2 { font-size: 13px; margin: 24px 0 8px; color: #5f6368; text-transform: uppercase; letter-spacing: 0.05em; }
        .meta { color: #5f6368; font-size: 13px; margin-bottom: 24px; }
        .section { margin-bottom: 14px; }
        .label { font-size: 12px; font-weight: 600; color: #5f6368; margin-bottom: 3px; }
        .value { font-size: 14px; white-space: pre-wrap; }
        ul { padding-left: 20px; margin: 0; } li { font-size: 14px; margin-bottom: 4px; }
      </style></head><body>
        <h1>${escapeHtml(note.title)}</h1>
        <div class="meta">Session date: ${fmtDate(note.sessionDate, true)}</div>
        ${note.progressScore != null ? section("Progress score", `${note.progressScore}/10`) : ""}
        ${section("Mood", note.mood)}
        ${section("Session notes", note.content)}
        ${note.symptoms?.length ? section("Symptoms", note.symptoms.join(", ")) : ""}
        ${section("Observations", note.observations)}
        ${section("Next steps", note.nextSteps)}
        ${note.recommendations || note.actionItems?.length || note.followUpDate ? "<h2>Follow-up</h2>" : ""}
        ${note.followUpDate ? section("Follow-up date", fmtDate(note.followUpDate, true)) : ""}
        ${section("Recommendations", note.recommendations)}
        ${note.actionItems?.length ? `<div class="section"><div class="label">Action items</div><ul>${note.actionItems.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ul></div>` : ""}
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        {/* No heading: the EMR Notes switcher above already names this view. */}
        <p className="text-footnote text-text-secondary">
          {notes.length} note{notes.length !== 1 ? "s" : ""} · what happened in each session, and the plan to follow up.
        </p>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus aria-hidden />
            Add note
          </Button>
        )}
      </div>

      {showForm && (
        <form ref={formRef} onSubmit={handleSubmit} className="rounded-xl border border-border-light bg-bg-subtle p-4 md:p-5 space-y-6" noValidate>
          <FieldGroup legend="Session">
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_11rem] gap-3">
              <Field label="Title" htmlFor="sn-title" required>
                <input id="sn-title" className={inputClass} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Session 4 – Progress review" />
              </Field>
              <Field label="Session date" htmlFor="sn-date" required>
                <input id="sn-date" type="date" className={inputClass} value={form.sessionDate} onChange={(e) => set("sessionDate", e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-[9rem_11rem] gap-3">
              <Field label="Progress score" htmlFor="sn-score" hint="1–10">
                <input
                  id="sn-score"
                  type="number"
                  min={1}
                  max={10}
                  className={inputClass}
                  value={form.progressScore}
                  onChange={(e) => set("progressScore", e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="e.g. 7"
                />
              </Field>
              <Field label="Mood" htmlFor="sn-mood">
                <select id="sn-mood" className={inputClass} value={form.mood} onChange={(e) => set("mood", e.target.value)}>
                  <option value="">Select…</option>
                  {MOODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Session notes" htmlFor="sn-content">
              <textarea id="sn-content" rows={3} className={textareaClass} value={form.content} onChange={(e) => set("content", e.target.value)} placeholder="What was discussed in this session…" />
            </Field>
            <Field label="Symptoms" htmlFor="sn-symptoms" hint="Separate with commas">
              <input id="sn-symptoms" className={inputClass} value={form.symptoms} onChange={(e) => set("symptoms", e.target.value)} placeholder="e.g. anxiety, insomnia, low mood" />
            </Field>
            <Field label="Observations" htmlFor="sn-obs">
              <textarea id="sn-obs" rows={2} className={textareaClass} value={form.observations} onChange={(e) => set("observations", e.target.value)} placeholder="Clinical observations…" />
            </Field>
          </FieldGroup>

          <FieldGroup legend="Follow-up (optional)">
            <div className="grid grid-cols-1 md:grid-cols-[11rem_minmax(0,1fr)] gap-3">
              <Field label="Follow-up date" htmlFor="sn-fu-date">
                <input id="sn-fu-date" type="date" className={inputClass} value={form.followUpDate} onChange={(e) => set("followUpDate", e.target.value)} />
              </Field>
              <Field label="Next steps" htmlFor="sn-next">
                <input id="sn-next" className={inputClass} value={form.nextSteps} onChange={(e) => set("nextSteps", e.target.value)} placeholder="Focus for the next session" />
              </Field>
            </div>
            <Field label="Recommendations" htmlFor="sn-recs">
              <textarea id="sn-recs" rows={2} className={textareaClass} value={form.recommendations} onChange={(e) => set("recommendations", e.target.value)} placeholder="Clinical recommendations for the patient…" />
            </Field>
            <Field label="Action items" htmlFor="sn-actions" hint="One per line">
              <textarea
                id="sn-actions"
                rows={3}
                className={textareaClass}
                value={form.actionItems}
                onChange={(e) => set("actionItems", e.target.value)}
                placeholder={"Complete mood diary daily\nPractise breathing exercises"}
              />
            </Field>
          </FieldGroup>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeForm} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save note
            </Button>
          </div>
        </form>
      )}

      {notes.length === 0 && !showForm ? (
        <EmptyState
          icon={NotebookPen}
          title="No session notes yet"
          description="Record what happened in each session and the follow-up plan, to track progress over time."
          action={{ label: "Add first note", onClick: () => setShowForm(true) }}
        />
      ) : (
        <ul className="space-y-2.5">
          {notes.map((note) => {
            const open = expanded === note._id;
            const hasFollowUp = !!(note.followUpDate || note.recommendations || note.actionItems?.length || note.nextSteps);
            return (
              <li
                key={note._id}
                id={`note-${note._id}`}
                className={`rounded-xl border bg-bg-card overflow-hidden scroll-mt-20 ${focusId === note._id ? "border-primary/50 ring-2 ring-primary/15" : "border-border"}`}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : note._id)}
                    aria-expanded={open}
                    className="flex-1 min-w-0 flex items-center gap-3 text-left cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-body font-medium text-text-primary truncate">{note.title}</span>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-footnote text-text-secondary tabular-nums">
                        {fmtDate(note.sessionDate)}
                        {note.mood && <span>· {note.mood}</span>}
                        {note.progressScore != null && <Badge tone={scoreTone(note.progressScore)}>Score {note.progressScore}/10</Badge>}
                        {note.followUpDate && (
                          <Badge tone="primary" icon={<CalendarClock size={12} aria-hidden />}>
                            Follow-up {fmtDate(note.followUpDate)}
                          </Badge>
                        )}
                      </span>
                    </span>
                    <ChevronDown size={16} className={`text-text-secondary shrink-0 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`} aria-hidden />
                  </button>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon-sm" onClick={() => handlePrint(note)} aria-label="Print note" title="Print note">
                      <Printer aria-hidden />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(note._id)} aria-label="Delete note" title="Delete note" className="hover:text-danger-strong hover:bg-danger/10">
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                </div>

                {open && (
                  <div className="border-t border-border-light bg-bg-subtle px-4 py-4 grid gap-5 md:grid-cols-2">
                    <dl className="space-y-3 min-w-0">
                      <Detail label="Session notes" value={note.content} />
                      {note.symptoms?.length > 0 && (
                        <div>
                          <dt className="text-caption font-medium text-text-secondary mb-1.5">Symptoms</dt>
                          <dd className="flex flex-wrap gap-1.5">
                            {note.symptoms.map((s) => (
                              <Badge key={s}>{s}</Badge>
                            ))}
                          </dd>
                        </div>
                      )}
                      <Detail label="Observations" value={note.observations} />
                      {!note.content && !note.symptoms?.length && !note.observations && (
                        <p className="text-footnote text-text-light">No session details recorded.</p>
                      )}
                    </dl>
                    <dl className="space-y-3 min-w-0 md:border-l md:border-border-light md:pl-5">
                      <p className="text-eyebrow font-semibold uppercase text-text-secondary">Follow-up</p>
                      {note.followUpDate && <Detail label="Follow-up date" value={fmtDate(note.followUpDate, true)} />}
                      <Detail label="Next steps" value={note.nextSteps} />
                      <Detail label="Recommendations" value={note.recommendations} />
                      {note.actionItems && note.actionItems.length > 0 && (
                        <div>
                          <dt className="text-caption font-medium text-text-secondary mb-1.5">Action items</dt>
                          <dd>
                            <ul className="space-y-1.5">
                              {note.actionItems.map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-body text-text-primary">
                                  <CheckSquare size={14} className="text-primary shrink-0 mt-1" aria-hidden />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </dd>
                        </div>
                      )}
                      {!hasFollowUp && <p className="text-footnote text-text-light">No follow-up plan recorded.</p>}
                    </dl>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmationDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete session note"
        description="This note will be permanently removed from the patient's history. This cannot be undone."
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-caption font-medium text-text-secondary mb-0.5">{label}</dt>
      <dd className="text-body text-text-primary whitespace-pre-wrap break-words">{value}</dd>
    </div>
  );
}
