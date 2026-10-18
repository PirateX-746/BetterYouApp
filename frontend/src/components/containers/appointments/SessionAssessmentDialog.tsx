"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { Modal } from "@/components/common/Modal";
import { ScoreSlider } from "@/components/common/ScoreSlider";
import { LoadingState } from "@/components/ui/loading-state";

type Props = {
  open: boolean;
  onClose: () => void;
  appointmentId: string;
  patientName?: string;
  /** Called after a successful save so the caller can refresh its own state. */
  onSaved?: () => void;
};

/** Must match backend/src/session-assessments/schemas/session-assessment.schema.ts */
const QUICK_OBSERVATION_TAGS = [
  "Calm",
  "Anxious",
  "Engaged",
  "Withdrawn",
  "Cooperative",
  "Distracted",
  "Positive",
  "Low Mood",
  "Improved",
  "Needs Follow-up",
] as const;

const SCORE_FIELDS = [
  { key: "overallBehaviour", label: "Overall Behaviour", hint: "How was the patient's overall behaviour during the session?" },
  { key: "anxiety", label: "Anxiety", hint: "0 = No visible anxiety · 10 = Very high visible anxiety" },
  { key: "mood", label: "Mood", hint: "0 = Very low / distressed · 10 = Very positive / stable" },
  { key: "engagement", label: "Engagement", hint: "How engaged was the patient in the session?" },
  { key: "communication", label: "Communication", hint: "How comfortable was the patient communicating?" },
  { key: "cooperation", label: "Cooperation", hint: "How cooperative was the patient with the session?" },
  { key: "emotionalRegulation", label: "Emotional Regulation", hint: "How well did the patient manage emotions?" },
  { key: "focus", label: "Focus / Attention", hint: "How well was the patient able to stay focused?" },
  { key: "insight", label: "Insight", hint: "How well did the patient show awareness of their situation?" },
  { key: "progress", label: "Progress", hint: "Compared with previous sessions, how was today's progress?" },
] as const;

type ScoreKey = (typeof SCORE_FIELDS)[number]["key"];
type Scores = Record<ScoreKey, number>;

const DEFAULT_SCORES: Scores = {
  overallBehaviour: 5, anxiety: 5, mood: 5, engagement: 5, communication: 5,
  cooperation: 5, emotionalRegulation: 5, focus: 5, insight: 5, progress: 5,
};

const FEEDBACK_MAX = 1000;
const REASON_MAX = 300;

export default function SessionAssessmentDialog({ open, onClose, appointmentId, patientName, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");
  const [existingId, setExistingId] = useState<string | null>(null);

  const [scores, setScores] = useState<Scores>(DEFAULT_SCORES);
  const [observations, setObservations] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpReason, setFollowUpReason] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setServerError("");
    api
      .get(`/session-assessments/appointment/${appointmentId}`)
      .then((res) => {
        const a = res.data;
        if (!a) return;
        setExistingId(a._id);
        setScores({
          overallBehaviour: a.overallBehaviour, anxiety: a.anxiety, mood: a.mood,
          engagement: a.engagement, communication: a.communication, cooperation: a.cooperation,
          emotionalRegulation: a.emotionalRegulation, focus: a.focus, insight: a.insight,
          progress: a.progress,
        });
        setObservations(a.observations ?? []);
        setFeedback(a.feedback ?? "");
        setFollowUpRequired(!!a.followUpRequired);
        setFollowUpReason(a.followUpReason ?? "");
      })
      .catch(() => {
        // No assessment yet for this appointment — start fresh (POST on save).
      })
      .finally(() => setLoading(false));
  }, [open, appointmentId]);

  useEffect(() => {
    if (open) return;
    setExistingId(null);
    setScores(DEFAULT_SCORES);
    setObservations([]);
    setFeedback("");
    setFollowUpRequired(false);
    setFollowUpReason("");
    setServerError("");
  }, [open]);

  const toggleTag = (tag: string) => {
    setObservations((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const followUpReasonValid = !followUpRequired || followUpReason.trim().length > 0;
  const canSave = !saving && !loading && followUpReasonValid;

  const handleSave = async () => {
    if (!canSave) return;
    setServerError("");
    setSaving(true);
    const payload = {
      ...scores,
      observations,
      feedback: feedback.trim() || undefined,
      followUpRequired,
      followUpReason: followUpRequired ? followUpReason.trim() : undefined,
    };
    try {
      if (existingId) {
        await api.patch(`/session-assessments/appointment/${appointmentId}`, payload);
      } else {
        await api.post("/session-assessments", { appointmentId, ...payload });
      }
      toast.success("Session assessment saved");
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      setServerError(Array.isArray(msg) ? msg.join(", ") : msg ?? "Failed to save assessment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Session Assessment"
      subtitle={patientName ? `Practitioner observations for ${patientName}` : "Practitioner observations for this session"}
      maxWidth="sm:max-w-xl"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-border text-sm text-text-secondary hover:bg-bg-hover transition">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? "Saving…" : "Save Assessment"}
          </button>
        </div>
      }
    >
      {loading ? (
        <LoadingState />
      ) : (
        <div className="space-y-5">
          <p className="text-xs text-text-secondary bg-bg-light border border-border rounded-xl px-3 py-2">
            Practitioner observations recorded during the session — not a diagnosis or a
            standardized clinical assessment.
          </p>

          {serverError && (
            <div className="flex items-start gap-2 text-sm text-danger bg-danger/5 border border-danger/20 px-3.5 py-2.5 rounded-xl">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <div className="space-y-4">
            {SCORE_FIELDS.map((f) => (
              <ScoreSlider
                key={f.key}
                label={f.label}
                hint={f.hint}
                value={scores[f.key]}
                onChange={(v) => setScores((prev) => ({ ...prev, [f.key]: v }))}
              />
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
              Quick Observations
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_OBSERVATION_TAGS.map((tag) => {
                const active = observations.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      active
                        ? "bg-primary text-white"
                        : "bg-bg-light text-text-secondary hover:bg-bg-hover"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Practitioner Feedback
              </label>
              <span className="text-[10px] text-text-disabled tabular-nums">
                {feedback.length}/{FEEDBACK_MAX}
              </span>
            </div>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value.slice(0, FEEDBACK_MAX))}
              maxLength={FEEDBACK_MAX}
              rows={3}
              placeholder="Add a short summary of today's session… (optional)"
              className="w-full px-3.5 py-2.5 text-sm bg-bg-page border border-border rounded-xl text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={followUpRequired}
                onChange={(e) => setFollowUpRequired(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-primary"
              />
              <span className="text-sm font-medium text-text-primary">Follow-up required</span>
            </label>
            {followUpRequired && (
              <div className="space-y-1">
                <input
                  type="text"
                  value={followUpReason}
                  onChange={(e) => setFollowUpReason(e.target.value.slice(0, REASON_MAX))}
                  maxLength={REASON_MAX}
                  placeholder="Reason for follow-up"
                  className="w-full px-3.5 py-2.5 text-sm bg-bg-page border border-border rounded-xl text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                />
                {!followUpReasonValid && (
                  <p className="text-xs text-danger">A reason is required when follow-up is enabled.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
