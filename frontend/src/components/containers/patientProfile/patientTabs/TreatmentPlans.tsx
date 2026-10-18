"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Target,
  CheckCircle2,
  Circle,
  Timer,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { LoadingState } from "@/components/ui/loading-state";
import toast from "react-hot-toast";

type GoalStatus = "pending" | "in-progress" | "achieved";

interface Goal {
  goal: string;
  status: GoalStatus;
}

interface TreatmentPlan {
  _id: string;
  title: string;
  startDate: string;
  endDate?: string;
  goals: Goal[];
  interventions: string[];
  status: "active" | "completed" | "paused";
  notes?: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-success-light text-success",
  completed: "bg-primary-light text-primary",
  paused: "bg-warning-light text-warning",
};

const GOAL_ICONS: Record<GoalStatus, React.ElementType> = {
  pending: Circle,
  "in-progress": Timer,
  achieved: CheckCircle2,
};

const GOAL_COLORS: Record<GoalStatus, string> = {
  pending: "text-text-secondary",
  "in-progress": "text-warning",
  achieved: "text-success",
};

export default function TreatmentPlansTab() {
  const params = useParams();
  const patientId = params?.id as string;
  const practitionerId =
    typeof window !== "undefined" ? localStorage.getItem("userId") ?? "" : "";

  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [goalsInput, setGoalsInput] = useState("");
  const [interventionsInput, setInterventionsInput] = useState("");
  const [planStatus, setPlanStatus] = useState<"active" | "completed" | "paused">("active");
  const [notes, setNotes] = useState("");

  const fetchPlans = useCallback(async () => {
    if (!patientId) return;
    try {
      const res = await api.get("/treatment-plans", { params: { patientId } });
      setPlans(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load treatment plans");
    }
  }, [patientId]);

  useEffect(() => {
    fetchPlans().finally(() => setLoading(false));
  }, [fetchPlans]);

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
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate("");
    setGoalsInput("");
    setInterventionsInput("");
    setPlanStatus("active");
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      const goals: Goal[] = goalsInput
        ? goalsInput.split("\n").map((g) => g.trim()).filter(Boolean).map((g) => ({ goal: g, status: "pending" as GoalStatus }))
        : [];
      const interventions = interventionsInput
        ? interventionsInput.split("\n").map((s) => s.trim()).filter(Boolean)
        : [];
      await api.post("/treatment-plans", {
        patientId,
        practitionerId,
        title,
        startDate,
        endDate: endDate || undefined,
        goals,
        interventions,
        status: planStatus,
        notes: notes || undefined,
      });
      await fetchPlans();
      resetForm();
      setShowForm(false);
      toast.success("Treatment plan created");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? "Failed to create plan");
    } finally {
      setSaving(false);
    }
  };

  const handleGoalStatusUpdate = async (planId: string, goalIndex: number, newStatus: GoalStatus) => {
    const plan = plans.find((p) => p._id === planId);
    if (!plan) return;
    const updatedGoals = plan.goals.map((g, i) =>
      i === goalIndex ? { ...g, status: newStatus } : g
    );
    try {
      const res = await api.patch(`/treatment-plans/${planId}`, { goals: updatedGoals });
      setPlans((prev) => prev.map((p) => (p._id === planId ? { ...p, ...res.data } : p)));
    } catch {
      toast.error("Failed to update goal");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/treatment-plans/${deleteId}`);
      setPlans((prev) => prev.filter((p) => p._id !== deleteId));
      toast.success("Deleted");
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
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
          {plans.length} plan{plans.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={() => setShowForm((p) => !p)}>
          <Plus size={15} className="mr-1.5" />
          New Plan
        </Button>
      </div>

      {showForm && (
        <div ref={formRef} className="bg-bg-light border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">New Treatment Plan</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="tp-title">Plan Title *</Label>
              <Input
                id="tp-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. CBT for Anxiety Management"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="tp-start">Start Date *</Label>
                <Input
                  id="tp-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="tp-end">End Date (optional)</Label>
                <Input
                  id="tp-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="tp-status">Status</Label>
                <select
                  id="tp-status"
                  value={planStatus}
                  onChange={(e) => setPlanStatus(e.target.value as typeof planStatus)}
                  className="mt-1 w-full rounded-xl border border-border bg-bg-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="tp-goals">Goals (one per line)</Label>
              <textarea
                id="tp-goals"
                value={goalsInput}
                onChange={(e) => setGoalsInput(e.target.value)}
                rows={4}
                placeholder={"Reduce anxiety episodes to <2 per week\nImprove sleep quality\nDevelop coping strategies"}
                className="mt-1 w-full rounded-xl border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
              />
            </div>

            <div>
              <Label htmlFor="tp-interventions">Interventions (one per line)</Label>
              <textarea
                id="tp-interventions"
                value={interventionsInput}
                onChange={(e) => setInterventionsInput(e.target.value)}
                rows={3}
                placeholder={"Weekly CBT sessions\nMindfulness training\nJournaling exercises"}
                className="mt-1 w-full rounded-xl border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
              />
            </div>

            <div>
              <Label htmlFor="tp-notes">Notes</Label>
              <textarea
                id="tp-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Additional notes about the treatment plan…"
                className="mt-1 w-full rounded-xl border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" size="sm" disabled={saving}>
                {saving && <Loader2 size={13} className="animate-spin mr-1.5" />}
                Create Plan
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

      {plans.length === 0 && !showForm ? (
        <EmptyState
          icon={Target}
          title="No treatment plans yet"
          description="Create structured treatment plans with goals and interventions to track patient outcomes."
          action={{ label: "Create Plan", onClick: () => setShowForm(true) }}
        />
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => {
            const achievedCount = plan.goals.filter((g) => g.status === "achieved").length;
            const totalGoals = plan.goals.length;

            return (
              <div key={plan._id} className="bg-bg-card border border-border rounded-2xl overflow-hidden">
                <div
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-bg-hover transition-colors"
                  onClick={() => setExpanded((p) => (p === plan._id ? null : plan._id))}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-text-primary truncate">{plan.title}</p>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[plan.status]}`}>
                        {plan.status}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Started {new Date(plan.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {plan.endDate && ` · Ends ${new Date(plan.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                      {totalGoals > 0 && ` · ${achievedCount}/${totalGoals} goals achieved`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteId(plan._id); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-text-secondary hover:text-danger transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                    {expanded === plan._id ? (
                      <ChevronUp size={15} className="text-text-secondary" />
                    ) : (
                      <ChevronDown size={15} className="text-text-secondary" />
                    )}
                  </div>
                </div>

                {expanded === plan._id && (
                  <div className="border-t border-border px-4 py-4 space-y-4 bg-bg-light">
                    {plan.goals.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Goals</p>
                        <div className="space-y-2">
                          {plan.goals.map((goal, i) => {
                            const GoalIcon = GOAL_ICONS[goal.status];
                            return (
                              <div key={i} className="flex items-start gap-2">
                                <button
                                  onClick={() => {
                                    const cycle: GoalStatus[] = ["pending", "in-progress", "achieved"];
                                    const next = cycle[(cycle.indexOf(goal.status) + 1) % cycle.length];
                                    handleGoalStatusUpdate(plan._id, i, next);
                                  }}
                                  className={`mt-0.5 shrink-0 transition-colors ${GOAL_COLORS[goal.status]}`}
                                  title="Click to cycle goal status"
                                >
                                  <GoalIcon size={15} />
                                </button>
                                <span className="text-sm text-text-primary">{goal.goal}</span>
                                <span className="ml-auto text-[11px] text-text-secondary capitalize shrink-0">
                                  {goal.status}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {plan.interventions.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Interventions</p>
                        <ul className="space-y-1">
                          {plan.interventions.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-text-primary">
                              <span className="text-primary shrink-0">·</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {plan.notes && (
                      <div>
                        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">Notes</p>
                        <p className="text-sm text-text-primary">{plan.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmationDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete treatment plan"
        description="This treatment plan will be permanently removed from the patient's history. This cannot be undone."
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </div>
  );
}
