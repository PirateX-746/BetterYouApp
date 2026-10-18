"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  TrendingUp,
  Printer,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { escapeHtml } from "@/lib/escapeHtml";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { LoadingState } from "@/components/ui/loading-state";
import toast from "react-hot-toast";

interface ProgressNote {
  _id: string;
  title: string;
  sessionDate: string;
  content?: string;
  progressScore?: number;
  mood?: string;
  symptoms: string[];
  observations?: string;
  nextSteps?: string;
  createdAt: string;
}

const MOODS = ["Excellent", "Good", "Neutral", "Anxious", "Low", "Distressed"];

const SCORE_COLOR = (score: number) => {
  if (score >= 8) return "text-success bg-success-light";
  if (score >= 5) return "text-warning bg-warning-light";
  return "text-danger bg-danger-light";
};

export default function ProgressNotesTab() {
  const params = useParams();
  const patientId = params?.id as string;
  const practitionerId =
    typeof window !== "undefined" ? localStorage.getItem("userId") ?? "" : "";

  const [notes, setNotes] = useState<ProgressNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState("");
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [content, setContent] = useState("");
  const [progressScore, setProgressScore] = useState<number | "">("");
  const [mood, setMood] = useState("");
  const [symptomsInput, setSymptomsInput] = useState("");
  const [observations, setObservations] = useState("");
  const [nextSteps, setNextSteps] = useState("");

  const fetchNotes = useCallback(async () => {
    if (!patientId) return;
    try {
      const res = await api.get("/progress-notes", { params: { patientId } });
      setNotes(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load progress notes");
    }
  }, [patientId]);

  useEffect(() => {
    fetchNotes().finally(() => setLoading(false));
  }, [fetchNotes]);

  useEffect(() => {
    if (showForm) {
      setTimeout(
        () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        80
      );
    }
  }, [showForm]);

  const resetForm = () => {
    setTitle("");
    setSessionDate(new Date().toISOString().slice(0, 10));
    setContent("");
    setProgressScore("");
    setMood("");
    setSymptomsInput("");
    setObservations("");
    setNextSteps("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      await api.post("/progress-notes", {
        patientId,
        practitionerId,
        title,
        sessionDate,
        content: content || undefined,
        progressScore: progressScore !== "" ? Number(progressScore) : undefined,
        mood: mood || undefined,
        symptoms: symptomsInput
          ? symptomsInput.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        observations: observations || undefined,
        nextSteps: nextSteps || undefined,
      });
      await fetchNotes();
      resetForm();
      setShowForm(false);
      toast.success("Progress note saved");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? "Failed to save note");
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

  const handlePrint = (note: ProgressNote) => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Progress Note</title><style>
        body { font-family: sans-serif; padding: 40px; color: #1f1f1f; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .meta { color: #5f6368; font-size: 13px; margin-bottom: 24px; }
        .section { margin-bottom: 16px; }
        .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #9aa0a6; margin-bottom: 4px; }
        .value { font-size: 14px; }
        .score { display: inline-block; font-size: 22px; font-weight: 700; }
      </style></head><body>
        <h1>${escapeHtml(note.title)}</h1>
        <div class="meta">Session date: ${new Date(note.sessionDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
        ${note.progressScore != null ? `<div class="section"><div class="label">Progress Score</div><div class="score">${note.progressScore}/10</div></div>` : ""}
        ${note.mood ? `<div class="section"><div class="label">Mood</div><div class="value">${escapeHtml(note.mood)}</div></div>` : ""}
        ${note.content ? `<div class="section"><div class="label">Session Notes</div><div class="value">${escapeHtml(note.content)}</div></div>` : ""}
        ${note.symptoms?.length ? `<div class="section"><div class="label">Symptoms</div><div class="value">${escapeHtml(note.symptoms.join(", "))}</div></div>` : ""}
        ${note.observations ? `<div class="section"><div class="label">Observations</div><div class="value">${escapeHtml(note.observations)}</div></div>` : ""}
        ${note.nextSteps ? `<div class="section"><div class="label">Next Steps</div><div class="value">${escapeHtml(note.nextSteps)}</div></div>` : ""}
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  if (loading) {
    return (
      <LoadingState />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {notes.length} note{notes.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={() => { setShowForm((p) => !p); }}>
          <Plus size={15} className="mr-1.5" />
          Add Note
        </Button>
      </div>

      {showForm && (
        <div ref={formRef} className="bg-bg-light border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">New Progress Note</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pn-title">Title *</Label>
                <Input
                  id="pn-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Session 4 – Progress Review"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="pn-date">Session Date *</Label>
                <Input
                  id="pn-date"
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pn-score">Progress Score (1–10)</Label>
                <Input
                  id="pn-score"
                  type="number"
                  min={1}
                  max={10}
                  value={progressScore}
                  onChange={(e) =>
                    setProgressScore(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="e.g. 7"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="pn-mood">Mood</Label>
                <select
                  id="pn-mood"
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-bg-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select mood…</option>
                  {MOODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="pn-content">Session Notes</Label>
              <textarea
                id="pn-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                placeholder="What was discussed in this session…"
                className="mt-1 w-full rounded-xl border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
              />
            </div>

            <div>
              <Label htmlFor="pn-symptoms">Symptoms (comma-separated)</Label>
              <Input
                id="pn-symptoms"
                value={symptomsInput}
                onChange={(e) => setSymptomsInput(e.target.value)}
                placeholder="e.g. anxiety, insomnia, low mood"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="pn-observations">Observations</Label>
              <textarea
                id="pn-observations"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={2}
                placeholder="Clinical observations…"
                className="mt-1 w-full rounded-xl border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
              />
            </div>

            <div>
              <Label htmlFor="pn-next">Next Steps</Label>
              <textarea
                id="pn-next"
                value={nextSteps}
                onChange={(e) => setNextSteps(e.target.value)}
                rows={2}
                placeholder="Action items for next session…"
                className="mt-1 w-full rounded-xl border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" size="sm" disabled={saving}>
                {saving && <Loader2 size={13} className="animate-spin mr-1.5" />}
                Save Note
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setShowForm(false); resetForm(); }}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {notes.length === 0 && !showForm ? (
        <EmptyState
          icon={TrendingUp}
          title="No progress notes yet"
          description="Track patient progress session by session to monitor outcomes over time."
          action={{ label: "Add First Note", onClick: () => setShowForm(true) }}
        />
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note._id} className="bg-bg-card border border-border rounded-2xl overflow-hidden">
              <div
                className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-bg-hover transition-colors"
                onClick={() => setExpanded((p) => (p === note._id ? null : note._id))}
              >
                {note.progressScore != null && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${SCORE_COLOR(note.progressScore)}`}>
                    {note.progressScore}/10
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{note.title}</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {new Date(note.sessionDate).toLocaleDateString("en-US", {
                      year: "numeric", month: "short", day: "numeric",
                    })}
                    {note.mood && ` · ${note.mood}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePrint(note); }}
                    className="p-1.5 rounded-lg hover:bg-bg-light text-text-secondary transition-colors"
                    title="Print note"
                  >
                    <Printer size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteId(note._id); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-text-secondary hover:text-danger transition-colors"
                    title="Delete note"
                  >
                    <Trash2 size={14} />
                  </button>
                  {expanded === note._id ? (
                    <ChevronUp size={15} className="text-text-secondary" />
                  ) : (
                    <ChevronDown size={15} className="text-text-secondary" />
                  )}
                </div>
              </div>

              {expanded === note._id && (
                <div className="border-t border-border px-4 py-4 space-y-3 bg-bg-light">
                  {note.content && (
                    <div>
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">Session Notes</p>
                      <p className="text-sm text-text-primary whitespace-pre-wrap">{note.content}</p>
                    </div>
                  )}
                  {note.symptoms?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">Symptoms</p>
                      <div className="flex flex-wrap gap-1.5">
                        {note.symptoms.map((s) => (
                          <span key={s} className="text-xs px-2 py-0.5 bg-bg-card border border-border rounded-full text-text-secondary">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {note.observations && (
                    <div>
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">Observations</p>
                      <p className="text-sm text-text-primary">{note.observations}</p>
                    </div>
                  )}
                  {note.nextSteps && (
                    <div>
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">Next Steps</p>
                      <p className="text-sm text-text-primary">{note.nextSteps}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmationDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete progress note"
        description="This note will be permanently removed from the patient's history. This cannot be undone."
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </div>
  );
}
