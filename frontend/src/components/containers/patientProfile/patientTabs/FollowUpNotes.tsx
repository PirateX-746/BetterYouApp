"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  CalendarClock,
  CheckSquare,
  Printer,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import toast from "react-hot-toast";

interface FollowUpNote {
  _id: string;
  title: string;
  summary?: string;
  recommendations?: string;
  actionItems: string[];
  followUpDate?: string;
  createdAt: string;
}

export default function FollowUpNotesTab() {
  const params = useParams();
  const patientId = params?.id as string;
  const practitionerId =
    typeof window !== "undefined" ? localStorage.getItem("userId") ?? "" : "";

  const [notes, setNotes] = useState<FollowUpNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [actionItemsInput, setActionItemsInput] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  const fetchNotes = useCallback(async () => {
    if (!patientId) return;
    try {
      const res = await api.get("/follow-up-notes", { params: { patientId } });
      setNotes(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load follow-up notes");
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
    setSummary("");
    setRecommendations("");
    setActionItemsInput("");
    setFollowUpDate("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      await api.post("/follow-up-notes", {
        patientId,
        practitionerId,
        title,
        summary: summary || undefined,
        recommendations: recommendations || undefined,
        actionItems: actionItemsInput
          ? actionItemsInput.split("\n").map((s) => s.trim()).filter(Boolean)
          : [],
        followUpDate: followUpDate || undefined,
      });
      await fetchNotes();
      resetForm();
      setShowForm(false);
      toast.success("Follow-up note saved");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? "Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this follow-up note?")) return;
    try {
      await api.delete(`/follow-up-notes/${id}`);
      setNotes((prev) => prev.filter((n) => n._id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handlePrint = (note: FollowUpNote) => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Follow-Up Note</title><style>
        body { font-family: sans-serif; padding: 40px; color: #1f1f1f; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .meta { color: #5f6368; font-size: 13px; margin-bottom: 24px; }
        .section { margin-bottom: 16px; }
        .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #9aa0a6; margin-bottom: 4px; }
        .value { font-size: 14px; }
        ul { padding-left: 20px; margin: 0; }
        li { margin-bottom: 4px; font-size: 14px; }
      </style></head><body>
        <h1>${note.title}</h1>
        <div class="meta">Created: ${new Date(note.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
        ${note.followUpDate ? `<div class="section"><div class="label">Follow-Up Date</div><div class="value">${new Date(note.followUpDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div></div>` : ""}
        ${note.summary ? `<div class="section"><div class="label">Summary</div><div class="value">${note.summary}</div></div>` : ""}
        ${note.recommendations ? `<div class="section"><div class="label">Recommendations</div><div class="value">${note.recommendations}</div></div>` : ""}
        ${note.actionItems?.length ? `<div class="section"><div class="label">Action Items</div><ul>${note.actionItems.map((a) => `<li>${a}</li>`).join("")}</ul></div>` : ""}
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="animate-spin text-primary" size={22} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {notes.length} note{notes.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={() => setShowForm((p) => !p)}>
          <Plus size={15} className="mr-1.5" />
          Add Note
        </Button>
      </div>

      {showForm && (
        <div ref={formRef} className="bg-bg-light border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">New Follow-Up Note</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fu-title">Title *</Label>
                <Input
                  id="fu-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Session 3 Follow-Up"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="fu-date">Next Follow-Up Date</Label>
                <Input
                  id="fu-date"
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="fu-summary">Session Summary</Label>
              <textarea
                id="fu-summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                placeholder="Brief summary of the session…"
                className="mt-1 w-full rounded-xl border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
              />
            </div>

            <div>
              <Label htmlFor="fu-recs">Recommendations</Label>
              <textarea
                id="fu-recs"
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                rows={2}
                placeholder="Clinical recommendations for the patient…"
                className="mt-1 w-full rounded-xl border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
              />
            </div>

            <div>
              <Label htmlFor="fu-actions">Action Items (one per line)</Label>
              <textarea
                id="fu-actions"
                value={actionItemsInput}
                onChange={(e) => setActionItemsInput(e.target.value)}
                rows={3}
                placeholder={"Complete mood diary daily\nPractice breathing exercises\nAttend group therapy"}
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
          icon={CalendarClock}
          title="No follow-up notes yet"
          description="Document session summaries, recommendations, and action items after each appointment."
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
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{note.title}</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {new Date(note.createdAt).toLocaleDateString("en-US", {
                      year: "numeric", month: "short", day: "numeric",
                    })}
                    {note.followUpDate && (
                      <span className="ml-2 text-primary">
                        · Follow-up {new Date(note.followUpDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
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
                    onClick={(e) => { e.stopPropagation(); handleDelete(note._id); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-text-secondary hover:text-danger transition-colors"
                    title="Delete"
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
                  {note.summary && (
                    <div>
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">Summary</p>
                      <p className="text-sm text-text-primary">{note.summary}</p>
                    </div>
                  )}
                  {note.recommendations && (
                    <div>
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">Recommendations</p>
                      <p className="text-sm text-text-primary">{note.recommendations}</p>
                    </div>
                  )}
                  {note.actionItems?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Action Items</p>
                      <ul className="space-y-1.5">
                        {note.actionItems.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-text-primary">
                            <CheckSquare size={14} className="text-primary shrink-0 mt-0.5" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
