"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import axios from "axios";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  NotebookPen,
  Cloud,
  CloudOff,
  FileCheck2,
  History,
  Loader2,
  PencilLine,
  RefreshCw,
  Send,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { apiErrorMessage } from "@/lib/api";
import {
  assessmentsApi,
  backup,
  STATUS_META,
  type AssessmentBundle,
  type AssessmentResponse,
  type AssessmentStatus,
  type DraftPayload,
  type TemplateItem,
  type TemplateSection,
} from "@/lib/assessments";
import { ScaleItem, TextItem } from "./ScaleItem";

type SaveState = "saved" | "unsaved" | "saving" | "offline" | "conflict" | "error";
type Mode = "edit" | "view" | "amend";

interface Form {
  responses: Record<string, AssessmentResponse>;
  notes: string;
  /** undefined = no summary yet. */
  summaryText?: string;
  summaryApproved: boolean;
}

export interface TabMeta {
  title: string;
  status: AssessmentStatus | null;
  unsaved: boolean;
}

const AUTOSAVE_MS = 1200;

const formFrom = (b: AssessmentBundle): Form => ({
  responses: Object.fromEntries(b.assessment.responses.map((r) => [r.itemId, r])),
  notes: b.assessment.notes ?? "",
  summaryText: b.assessment.summary?.text,
  summaryApproved: !!b.assessment.summary?.approved,
});

const payloadOf = (f: Form): DraftPayload => ({
  responses: Object.values(f.responses),
  notes: f.notes,
  ...(f.summaryText !== undefined ? { summaryText: f.summaryText, summaryApproved: f.summaryApproved } : {}),
});

const fmtDateTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
    : "";
const fmtTime = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
const ageOf = (dob?: string) => {
  if (!dob) return null;
  const d = new Date(dob);
  const n = new Date();
  return n.getFullYear() - d.getFullYear() - (n < new Date(n.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
};

/**
 * One appointment's assessment — a workspace tab. Edits autosave (debounced,
 * optimistic-locked by `revision`) and are mirrored on-device until the
 * server confirms them. Stays mounted while other tabs are shown, so
 * switching tabs never drops in-progress work.
 */
export function AssessmentEditor({
  appointmentId,
  onMeta,
}: {
  appointmentId: string;
  onMeta: (appointmentId: string, meta: TabMeta) => void;
}) {
  const [bundle, setBundle] = useState<AssessmentBundle | null>(null);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [mode, setMode] = useState<Mode>("edit");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState("");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [restored, setRestored] = useState(false);
  const [busy, setBusy] = useState<null | "summary" | "submit" | "review" | "amend">(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [amendReason, setAmendReason] = useState("");

  const formRef = useRef<Form | null>(null);
  const revisionRef = useRef(0);
  const dirtyRef = useRef(false);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const id = bundle?.assessment._id;

  /* ───── load ───── */

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const b = await assessmentsApi.open(appointmentId);
      const f = formFrom(b);
      revisionRef.current = b.assessment.revision;
      const editable = b.permissions.canEdit;
      const local = editable ? backup.read(b.assessment._id) : null;
      if (local && local.revision === b.assessment.revision) {
        // Unsaved edits from this device (closed tab, crash, offline) on top
        // of the same server version — put them back and save them.
        Object.assign(f, {
          responses: Object.fromEntries(local.data.responses.map((r) => [r.itemId, r])),
          notes: local.data.notes,
          ...(local.data.summaryText !== undefined
            ? { summaryText: local.data.summaryText, summaryApproved: !!local.data.summaryApproved }
            : {}),
        });
        dirtyRef.current = true;
        setRestored(true);
        setSaveState("unsaved");
      } else if (local) {
        backup.clear(b.assessment._id); // older than the server copy
      }
      formRef.current = f;
      setForm(f);
      setBundle(b);
      setMode(editable ? "edit" : "view");
      setSavedAt(b.assessment.lastSavedAt ? new Date(b.assessment.lastSavedAt) : null);
    } catch (err) {
      setLoadError(apiErrorMessage(err, "Couldn't open this assessment."));
    }
  }, [appointmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  /* ───── autosave ───── */

  const flush = useCallback(async (): Promise<boolean> => {
    if (inFlight.current) {
      await inFlight.current;
      if (!dirtyRef.current) return true;
    }
    if (!dirtyRef.current || !id || !formRef.current) return true;
    if (timer.current) clearTimeout(timer.current);
    dirtyRef.current = false;
    setSaveState("saving");
    const run = (async () => {
      try {
        const b = await assessmentsApi.save(id, revisionRef.current, payloadOf(formRef.current!));
        revisionRef.current = b.assessment.revision;
        setBundle(b);
        setSavedAt(new Date());
        if (!dirtyRef.current) {
          backup.clear(id);
          setSaveState("saved");
        }
        return true;
      } catch (err) {
        dirtyRef.current = true;
        if (axios.isAxiosError(err) && !err.response) {
          setSaveState("offline");
        } else if (axios.isAxiosError(err) && err.response?.status === 409) {
          setSaveState("conflict");
          setSaveError(apiErrorMessage(err, "This assessment changed elsewhere."));
        } else {
          setSaveState("error");
          setSaveError(apiErrorMessage(err, "Couldn't save."));
        }
        return false;
      } finally {
        inFlight.current = null;
      }
    })();
    inFlight.current = run;
    const ok = await run;
    if (ok && dirtyRef.current) return flush(); // edits made while saving
    return ok;
  }, [id]);

  const update = (fn: (f: Form) => Form) => {
    const prev = formRef.current!;
    let next = fn(prev);
    // While amending, changed answers make an approved summary stale: it has
    // to be regenerated or re-approved before the amendment can be saved.
    if (mode === "amend" && next.summaryText?.trim() && (next.responses !== prev.responses || next.notes !== prev.notes)) {
      next = { ...next, summaryApproved: false };
    }
    formRef.current = next;
    setForm(next);
    if (mode !== "edit" || !id) return; // amend mode saves explicitly
    dirtyRef.current = true;
    backup.write(id, { revision: revisionRef.current, at: Date.now(), data: { ...payloadOf(next), responses: Object.values(next.responses), notes: next.notes } });
    if (saveState !== "conflict") setSaveState((s) => (s === "offline" ? s : "unsaved"));
    if (timer.current) clearTimeout(timer.current);
    if (saveState !== "conflict") timer.current = setTimeout(() => void flush(), AUTOSAVE_MS);
  };

  // Retry when the connection comes back, and every 15 s while offline.
  useEffect(() => {
    if (saveState !== "offline" && saveState !== "error") return;
    const retry = () => void flush();
    window.addEventListener("online", retry);
    const t = setInterval(retry, 15000);
    return () => {
      window.removeEventListener("online", retry);
      clearInterval(t);
    };
  }, [saveState, flush]);

  // Warn before leaving with unsaved changes (they're also backed up locally).
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current || inFlight.current || mode === "amend") e.preventDefault();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [mode]);

  // Save immediately when the tab closes/unmounts.
  useEffect(() => () => void flush(), [flush]);

  /* ───── tab meta ───── */

  const patientName = bundle?.patient ? `${bundle.patient.firstName} ${bundle.patient.lastName}` : "";
  useEffect(() => {
    onMeta(appointmentId, {
      title: patientName || (loadError ? "Unavailable" : "Loading…"),
      status: bundle?.assessment.status ?? null,
      unsaved: saveState !== "saved" || mode === "amend",
    });
  }, [appointmentId, patientName, bundle?.assessment.status, saveState, mode, loadError, onMeta]);

  /* ───── derived ───── */

  const items = useMemo(() => bundle?.template.flatMap((s) => s.items) ?? [], [bundle]);
  const answered = form ? items.filter((i) => (form.responses[i.id]?.state ?? "blank") !== "blank").length : 0;
  const hasContent =
    !!form && (form.notes.trim().length > 0 || Object.values(form.responses).some((r) => r.state !== "blank" || r.note?.trim()));
  const summaryPending = form?.summaryText !== undefined && form.summaryText.trim() !== "" && !form.summaryApproved;
  const readOnly = mode === "view";

  /* ───── steps: one question at a time, then notes, then review ───── */

  type Step =
    | { kind: "item"; item: TemplateItem; section: TemplateSection; posInSection: number; index: number }
    | { kind: "notes" }
    | { kind: "review" };
  const steps = useMemo<Step[]>(() => {
    const out: Step[] = [];
    let index = 0;
    for (const section of bundle?.template ?? []) {
      section.items.forEach((item, i) => out.push({ kind: "item", item, section, posInSection: i + 1, index: index++ }));
    }
    out.push({ kind: "notes" }, { kind: "review" });
    return out;
  }, [bundle?.template]);
  const [step, setStep] = useState(0);
  const current = steps[Math.min(step, steps.length - 1)] as Step;
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback(
    (i: number) => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      setStep(Math.max(0, Math.min(steps.length - 1, i)));
      scrollRef.current?.scrollTo({ top: 0 });
    },
    [steps.length],
  );

  // First open: start at the first unanswered question; submitted ones open on the review.
  const placed = useRef(false);
  useEffect(() => {
    if (!bundle || !form || placed.current) return;
    placed.current = true;
    if (!bundle.permissions.canEdit) {
      setStep(steps.length - 1);
      return;
    }
    const first = steps.findIndex((st) => st.kind === "item" && (form.responses[st.item.id]?.state ?? "blank") === "blank");
    setStep(first === -1 ? steps.length - 1 : first);
  }, [bundle, form, steps]);

  /** Records an answer; a new rating moves on to the next question. */
  const answer = (r: AssessmentResponse) => {
    const prev = formRef.current?.responses[r.itemId];
    update((f) => ({ ...f, responses: { ...f.responses, [r.itemId]: r } }));
    const rated = r.state !== "blank" && (prev?.state !== r.state || prev?.score !== r.score);
    if (rated && (r.note ?? "") === (prev?.note ?? "")) {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      const at = step;
      advanceTimer.current = setTimeout(() => setStep((s) => (s === at ? Math.min(steps.length - 1, s + 1) : s)), 350);
    }
  };

  // Keyboard: 0–9 score, N not observed, Enter next (not while typing).
  useEffect(() => {
    if (readOnly || current?.kind !== "item" || current.item.type !== "scale") return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable))) return;
      if (document.querySelector('[role="dialog"]')) return;
      const id = current.item.id;
      const r = formRef.current?.responses[id];
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        answer({ itemId: id, state: "scored", score: Number(e.key), note: r?.note });
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        answer({ itemId: id, state: r?.state === "not_observed" ? "blank" : "not_observed", score: null, note: r?.note });
      } else if (e.key === "Enter" && !(t && t.tagName === "BUTTON")) {
        e.preventDefault();
        goTo(step + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ───── actions ───── */

  const generateSummary = async () => {
    setConfirmRegen(false);
    if (!id) return;
    setBusy("summary");
    try {
      if (mode === "amend") {
        const { text } = await assessmentsApi.previewSummary(id, {
          responses: Object.values(formRef.current!.responses),
          notes: formRef.current!.notes,
        });
        const next = { ...formRef.current!, summaryText: text, summaryApproved: false };
        formRef.current = next;
        setForm(next);
        return;
      }
      if (!(await flush())) return;
      const b = await assessmentsApi.summary(id, revisionRef.current);
      revisionRef.current = b.assessment.revision;
      const next = { ...formRef.current!, summaryText: b.assessment.summary?.text ?? "", summaryApproved: false };
      formRef.current = next;
      setForm(next);
      setBundle(b);
      setSavedAt(new Date());
      requestAnimationFrame(() => jump("summary"));
      setStep(steps.length - 1);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't generate a summary. Your answers are safe."));
    } finally {
      setBusy(null);
    }
  };

  const setStatus = async (status: "draft" | "ready_for_review") => {
    if (!id) return;
    setBusy("review");
    try {
      if (!(await flush())) return;
      const b = await assessmentsApi.save(id, revisionRef.current, { status });
      revisionRef.current = b.assessment.revision;
      setBundle(b);
      toast.success(status === "ready_for_review" ? "Marked ready for review" : "Moved back to draft");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't update the status."));
    } finally {
      setBusy(null);
    }
  };

  const submit = async () => {
    if (!id) return;
    setBusy("submit");
    try {
      if (!(await flush())) {
        setConfirmSubmit(false);
        return;
      }
      const b = await assessmentsApi.submit(id, revisionRef.current);
      revisionRef.current = b.assessment.revision;
      backup.clear(id);
      setBundle(b);
      setForm(formFrom(b));
      formRef.current = formFrom(b);
      setMode("view");
      setConfirmSubmit(false);
      toast.success(`Filed to ${patientName}'s record`);
    } catch (err) {
      setConfirmSubmit(false);
      toast.error(apiErrorMessage(err, "Couldn't submit. Your draft is saved — try again."));
    } finally {
      setBusy(null);
    }
  };

  const startAmend = () => {
    setAmendReason("");
    setMode("amend");
    setStep(steps.length - 1);
  };
  const cancelAmend = () => {
    if (!bundle) return;
    const f = formFrom(bundle);
    formRef.current = f;
    setForm(f);
    setMode("view");
  };
  const saveAmend = async () => {
    if (!id || !form) return;
    setBusy("amend");
    try {
      const b = await assessmentsApi.amend(id, revisionRef.current, { ...payloadOf(form), reason: amendReason.trim() });
      revisionRef.current = b.assessment.revision;
      setBundle(b);
      const f = formFrom(b);
      formRef.current = f;
      setForm(f);
      setMode("view");
      toast.success("Amendment saved");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't save the amendment."));
    } finally {
      setBusy(null);
    }
  };

  const reloadLatest = async () => {
    if (id) backup.clear(id);
    dirtyRef.current = false;
    setSaveState("saved");
    setSaveError("");
    setRestored(false);
    setBundle(null);
    await load();
  };

  // Scroll only the form pane. scrollIntoView would also scroll the
  // overflow-clipped workspace card, pushing the tabs and header out of view.
  function jump(target: string) {
    const pane = scrollRef.current;
    const el = document.getElementById(`${target}-${appointmentId}`);
    if (!pane || !el) return;
    const top = el.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop - 12;
    pane.scrollTo({ top, behavior: "smooth" });
  }

  /* ───── render ───── */

  if (loadError) {
    return (
      <div className="h-full grid place-items-center p-8">
        <div className="max-w-sm text-center space-y-3">
          <AlertTriangle className="mx-auto text-warning" size={28} aria-hidden />
          <p className="text-sm text-text-primary">{loadError}</p>
          <button onClick={() => void load()} className="h-10 px-4 rounded-md border border-border text-sm hover:bg-bg-hover cursor-pointer">
            Try again
          </button>
        </div>
      </div>
    );
  }
  if (!bundle || !form) {
    return (
      <div className="h-full grid place-items-center text-text-secondary">
        <Loader2 className="animate-spin" size={22} aria-label="Loading assessment" />
      </div>
    );
  }

  const { assessment: a, appointment: appt, patient, permissions } = bundle;
  const meta = STATUS_META[a.status];
  const age = ageOf(patient?.dateOfBirth);

  return (
    <div className="h-full flex flex-col min-h-0 overflow-clip">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 md:px-5 py-3.5 border-b border-border">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-text-primary truncate">{patientName}</h2>
            <Badge tone={mode === "amend" ? "warning" : meta.tone}>{mode === "amend" ? "Amending" : meta.label}</Badge>
          </div>
          <p className="text-sm text-text-secondary mt-0.5 truncate">
            {appt?.title} · {fmtDateTime(appt?.start)}
          </p>
        </div>

        {mode === "edit" && <SaveIndicator state={saveState} savedAt={savedAt} onRetry={() => void flush()} />}

        <div className="flex flex-wrap items-center gap-2">
          {mode === "edit" && (
            <>
              <button
                type="button"
                onClick={() => void setStatus(a.status === "ready_for_review" ? "draft" : "ready_for_review")}
                disabled={!!busy || saveState === "conflict"}
                className="h-10 px-3.5 rounded-md border border-border bg-bg-card text-sm text-text-primary hover:bg-bg-hover transition-colors cursor-pointer disabled:opacity-50"
              >
                {busy === "review" ? <Loader2 size={14} className="animate-spin inline" aria-hidden /> : a.status === "ready_for_review" ? "Back to draft" : "Mark ready for review"}
              </button>
              <button
                type="button"
                onClick={() => goTo(steps.length - 1)}
                disabled={current?.kind === "review"}
                className="h-10 inline-flex items-center gap-2 px-4 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
              >
                <ListChecks size={14} aria-hidden /> Review &amp; submit
              </button>
            </>
          )}
          {mode === "view" && permissions.canAmend && (
            <button
              type="button"
              onClick={startAmend}
              className="h-10 inline-flex items-center gap-2 px-3.5 rounded-md border border-border bg-bg-card text-sm text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
            >
              <PencilLine size={14} aria-hidden /> Amend
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 md:px-5 py-3 border-b border-border">
        <div className="flex items-center justify-between gap-3 text-xs mb-2">
          <span className="text-text-secondary truncate">
            {current.kind === "item" ? current.section.title : current.kind === "notes" ? "Session notes" : "Review & submit"}
          </span>
          <span className="tabular-nums text-text-secondary shrink-0">
            <span className="font-semibold text-text-primary">{answered}</span> of {items.length} answered
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Questions answered"
          aria-valuemin={0}
          aria-valuemax={items.length}
          aria-valuenow={answered}
          className="h-2 rounded-full bg-bg-hover overflow-hidden"
        >
          <div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${(answered / Math.max(1, items.length)) * 100}%` }} />
        </div>
      </div>

      {/* Banners */}
      {(restored || saveState === "conflict" || saveState === "error" || readOnly || mode === "amend") && (
        <div className="px-4 md:px-5 pt-3 space-y-2">
          {restored && saveState !== "conflict" && (
            <Banner tone="info" icon={History} onDismiss={() => setRestored(false)}>
              Restored changes from this device that hadn&apos;t reached the server yet.
            </Banner>
          )}
          {saveState === "conflict" && (
            <Banner tone="warning" icon={AlertTriangle} action={{ label: "Load latest version", onClick: () => void reloadLatest() }}>
              {saveError} Your unsaved edits on this screen will be replaced.
            </Banner>
          )}
          {saveState === "error" && (
            <Banner tone="danger" icon={AlertTriangle} action={{ label: "Retry", onClick: () => void flush() }}>
              {saveError} Your edits are kept on this device.
            </Banner>
          )}
          {readOnly && a.documentId && (
            <Banner tone="success" icon={FileCheck2}>
              Filed to the patient record{a.submittedAt ? ` on ${fmtDateTime(a.submittedAt)}` : ""}.{" "}
              {a.amendments.length > 0 && `Amended ${a.amendments.length} time${a.amendments.length > 1 ? "s" : ""}. `}
              <Link href={`/patients/${a.patientId}`} className="font-medium underline underline-offset-2">
                View patient
              </Link>
            </Banner>
          )}
          {mode === "amend" && (
            <Banner tone="warning" icon={PencilLine}>
              You&apos;re amending a submitted assessment. The previous version is kept in the history, and the patient record is updated when you save.
            </Banner>
          )}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 min-h-0 grid xl:grid-cols-[250px_minmax(0,1fr)_280px]">
        {/* Question list */}
        <nav aria-label="Questions" className="hidden xl:block min-h-0 overflow-y-auto border-r border-border p-3">
          {bundle.template.map((s) => (
            <div key={s.id} className="mb-3">
              <p className="px-2.5 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{s.title}</p>
              <ul>
                {s.items.map((it) => {
                  const idx = steps.findIndex((st) => st.kind === "item" && st.item.id === it.id);
                  const st = form.responses[it.id]?.state ?? "blank";
                  const on = idx === step;
                  return (
                    <li key={it.id}>
                      <button
                        type="button"
                        onClick={() => goTo(idx)}
                        aria-current={on ? "step" : undefined}
                        className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-md text-left text-sm transition-colors cursor-pointer ${
                          on ? "bg-primary/10 text-primary font-medium" : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                        }`}
                      >
                        <StepDot state={st} />
                        <span className="leading-snug">{it.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <div className="border-t border-border pt-2">
            {(["notes", "review"] as const).map((k) => {
              const idx = steps.findIndex((st) => st.kind === k);
              const on = idx === step;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => goTo(idx)}
                  aria-current={on ? "step" : undefined}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left text-sm transition-colors cursor-pointer ${
                    on ? "bg-primary/10 text-primary font-medium" : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  }`}
                >
                  {k === "notes" ? <NotebookPen size={15} aria-hidden /> : <ListChecks size={15} aria-hidden />}
                  {k === "notes" ? "Session notes" : "Review & submit"}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Current step */}
        <div className="min-h-0 flex flex-col">
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl px-4 md:px-8 py-6 md:py-10">
              {current.kind === "item" && (
                <div key={current.item.id} className="animate-in fade-in duration-200">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {current.section.title} · {current.posInSection} of {current.section.items.length}
                  </p>
                  <h3 id={`q-${appointmentId}`} className="mt-2 text-xl md:text-2xl font-semibold text-text-primary leading-snug">
                    {current.item.label}
                  </h3>
                  {current.item.help && <p className="mt-2 text-sm text-text-secondary">{current.item.help}</p>}
                  <div className="mt-8">
                    {current.item.type === "scale" ? (
                      <ScaleItem
                        item={current.item}
                        value={form.responses[current.item.id]}
                        readOnly={readOnly}
                        labelledBy={`q-${appointmentId}`}
                        onChange={answer}
                      />
                    ) : (
                      <TextItem
                        item={current.item}
                        value={form.responses[current.item.id]}
                        readOnly={readOnly}
                        labelledBy={`q-${appointmentId}`}
                        onChange={(r) => update((f) => ({ ...f, responses: { ...f.responses, [r.itemId]: r } }))}
                      />
                    )}
                  </div>
                  {!readOnly && current.item.type === "scale" && (
                    <p className="mt-8 hidden md:block text-xs text-text-secondary">
                      Shortcuts: <Kbd>0</Kbd>–<Kbd>9</Kbd> score · <Kbd>N</Kbd> not observed · <Kbd>Enter</Kbd> next · <Kbd>←</Kbd> <Kbd>→</Kbd> adjust when a score is focused
                    </p>
                  )}
                </div>
              )}

              {current.kind === "notes" && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Almost done</p>
                  <label htmlFor={`notes-in-${appointmentId}`} className="mt-2 block text-xl md:text-2xl font-semibold text-text-primary">
                    Session notes
                  </label>
                  <p className="mt-2 text-sm text-text-secondary">What happened in the session, in your own words. Optional.</p>
                  <textarea
                    id={`notes-in-${appointmentId}`}
                    value={form.notes}
                    readOnly={readOnly}
                    maxLength={5000}
                    rows={12}
                    onChange={(e) => update((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Topics covered, what the patient said, how they responded…"
                    className="mt-6 w-full px-3.5 py-3 text-sm leading-relaxed bg-bg-card border border-border rounded-md text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 resize-y"
                  />
                  <p className="mt-1 text-xs text-text-secondary text-right tabular-nums">{form.notes.length}/5000</p>
                </div>
              )}

              {current.kind === "review" && (
                <div className="space-y-8">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">{readOnly ? "Submitted assessment" : "Last step"}</p>
                    <h3 className="mt-2 text-xl md:text-2xl font-semibold text-text-primary">{readOnly ? "Assessment" : "Review & submit"}</h3>
                    <p className="mt-2 text-sm text-text-secondary">
                      {readOnly
                        ? "Practitioner observations on 0–10 scales — not a diagnosis or a standardised measure."
                        : `${answered} of ${items.length} questions answered. Select any answer to change it. Blanks are never counted as 0.`}
                    </p>
                  </div>

                  {bundle.template.map((s) => (
                    <section key={s.id} aria-label={s.title}>
                      <h4 className="text-sm font-semibold text-text-primary mb-2">{s.title}</h4>
                      <ul className="rounded-md border border-border divide-y divide-border bg-bg-card overflow-hidden">
                        {s.items.map((it) => {
                          const r = form.responses[it.id];
                          const idx = steps.findIndex((st) => st.kind === "item" && st.item.id === it.id);
                          const row = (
                            <>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm text-text-primary">{it.label}</span>
                                {r?.note?.trim() && <span className="block text-xs text-text-secondary mt-0.5 truncate">{r.note}</span>}
                                {it.type === "text" && r?.text?.trim() && (
                                  <span className="block text-xs text-text-secondary mt-0.5 line-clamp-2 whitespace-pre-wrap">{r.text}</span>
                                )}
                              </span>
                              {it.type === "scale" && <AnswerValue r={r} max={it.scale?.max ?? 10} />}
                              {it.type === "text" && !r?.text?.trim() && <span className="text-sm text-text-disabled">Not answered</span>}
                            </>
                          );
                          return (
                            <li key={it.id}>
                              {readOnly ? (
                                <div className="flex items-center gap-4 px-4 py-3">{row}</div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => goTo(idx)}
                                  className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-bg-hover transition-colors cursor-pointer focus-visible:outline-none focus-visible:bg-bg-hover"
                                >
                                  {row}
                                </button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}

                  {form.notes.trim() && (
                    <section>
                      <h4 className="text-sm font-semibold text-text-primary mb-2">Session notes</h4>
                      <p className="rounded-md border border-border bg-bg-card px-4 py-3 text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{form.notes}</p>
                    </section>
                  )}

            {/* Summary */}
            <section id={`summary-${appointmentId}`} className="scroll-mt-4 rounded-md border border-border bg-bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 border-b border-border">
                <div>
                  <h3 className="text-base font-semibold text-text-primary">Session summary</h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Built only from what you recorded above. Review and edit it before approving.
                  </p>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => (form.summaryText?.trim() ? setConfirmRegen(true) : void generateSummary())}
                    disabled={!!busy || !hasContent || saveState === "conflict"}
                    className="h-10 inline-flex items-center gap-2 px-3.5 rounded-md border border-primary/30 text-sm font-medium text-primary hover:bg-primary/5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {busy === "summary" ? <Loader2 size={14} className="animate-spin" aria-hidden /> : form.summaryText ? <RefreshCw size={14} aria-hidden /> : <Sparkles size={14} aria-hidden />}
                    {form.summaryText ? "Regenerate" : "Generate summary"}
                  </button>
                )}
              </div>
              <div className="p-4 space-y-3">
                {form.summaryText === undefined ? (
                  <p className="text-sm text-text-secondary">
                    {readOnly ? "No summary was attached." : "Optional. Generate a draft summary once you've recorded your observations."}
                  </p>
                ) : (
                  <>
                    <label htmlFor={`sum-${appointmentId}`} className="sr-only">
                      Summary text
                    </label>
                    <textarea
                      id={`sum-${appointmentId}`}
                      value={form.summaryText}
                      readOnly={readOnly}
                      rows={Math.min(18, Math.max(6, form.summaryText.split("\n").length + 1))}
                      maxLength={8000}
                      onChange={(e) => update((f) => ({ ...f, summaryText: e.target.value, summaryApproved: false }))}
                      className="w-full px-3.5 py-3 text-sm leading-relaxed bg-bg-page border border-border rounded-md text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 resize-y whitespace-pre-wrap"
                    />
                    {!readOnly ? (
                      <label
                        className={`flex items-start gap-3 rounded-md border px-3.5 py-3 cursor-pointer transition-colors ${
                          form.summaryApproved ? "border-success/40 bg-success/5" : "border-warning/40 bg-warning/5"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={form.summaryApproved}
                          disabled={!form.summaryText.trim()}
                          onChange={(e) => update((f) => ({ ...f, summaryApproved: e.target.checked }))}
                          className="mt-0.5 size-4 accent-[var(--primary)] cursor-pointer"
                        />
                        <span className="text-sm text-text-primary">
                          I&apos;ve reviewed this summary and it accurately reflects my observations.
                          <span className="block text-xs text-text-secondary mt-0.5">
                            {form.summaryApproved ? "Approved — it will be filed with the assessment." : "Required before submitting. Editing the text clears approval."}
                          </span>
                        </span>
                      </label>
                    ) : (
                      form.summaryApproved && (
                        <p className="text-xs text-success inline-flex items-center gap-1.5">
                          <CheckCircle2 size={13} aria-hidden /> Approved by the practitioner
                        </p>
                      )
                    )}
                  </>
                )}
              </div>
            </section>

            {mode === "amend" && (
              <section className="rounded-md border border-warning/40 bg-warning/5 p-4 space-y-3">
                <label htmlFor={`reason-${appointmentId}`} className="block text-sm font-semibold text-text-primary">
                  Reason for amendment <span className="text-danger" aria-hidden>*</span>
                </label>
                <textarea
                  id={`reason-${appointmentId}`}
                  value={amendReason}
                  onChange={(e) => setAmendReason(e.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="e.g. Corrected the anxiety rating after reviewing my notes"
                  className="w-full px-3.5 py-2.5 text-sm bg-bg-card border border-border rounded-md text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={cancelAmend} disabled={busy === "amend"} className="h-10 px-4 rounded-md border border-border bg-bg-card text-sm text-text-secondary hover:bg-bg-hover cursor-pointer disabled:opacity-50">
                    Discard changes
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveAmend()}
                    disabled={busy === "amend" || amendReason.trim().length < 5 || summaryPending}
                    title={amendReason.trim().length < 5 ? "Give a short reason" : summaryPending ? "Approve the summary first" : undefined}
                    className="h-10 inline-flex items-center gap-2 px-4 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-hover cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {busy === "amend" && <Loader2 size={14} className="animate-spin" aria-hidden />}
                    Save amendment
                  </button>
                </div>
              </section>
            )}

            {a.amendments.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <History size={15} aria-hidden /> Amendment history
                </h3>
                <ol className="space-y-2">
                  {[...a.amendments].reverse().map((m) => (
                    <li key={m.version} className="rounded-md border border-border bg-bg-card px-3.5 py-2.5 text-sm">
                      <span className="font-medium text-text-primary">Amendment {m.version}</span>
                      <span className="text-text-secondary"> · {fmtDateTime(m.at)}</span>
                      <p className="text-text-secondary mt-0.5">{m.reason}</p>
                    </li>
                  ))}
                </ol>
              </section>
            )}
                </div>
              )}
            </div>
          </div>

          {/* Step navigation */}
          {!(readOnly && current.kind === "review") && (
            <div className="shrink-0 border-t border-border bg-bg-card px-4 md:px-6 py-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => goTo(step - 1)}
                disabled={step === 0}
                className="h-11 inline-flex items-center gap-1.5 px-4 rounded-md border border-border bg-bg-card text-sm text-text-primary hover:bg-bg-hover transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} aria-hidden /> Back
              </button>
              <span className="flex-1 text-center text-xs text-text-secondary tabular-nums">
                {current.kind === "item" ? `Question ${current.index + 1} of ${items.length}` : current.kind === "notes" ? "Notes" : "Review"}
              </span>
              {current.kind === "review" ? (
                mode === "edit" && (
                  <button
                    type="button"
                    onClick={() => setConfirmSubmit(true)}
                    disabled={!!busy || !hasContent || summaryPending || saveState === "conflict"}
                    title={!hasContent ? "Record at least one observation first" : summaryPending ? "Approve the summary first" : undefined}
                    className="h-11 inline-flex items-center gap-2 px-5 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send size={15} aria-hidden /> Submit assessment
                  </button>
                )
              ) : (
                <>
                  {current.kind === "item" && !readOnly && (form.responses[current.item.id]?.state ?? "blank") === "blank" && (
                    <button type="button" onClick={() => goTo(step + 1)} className="h-11 px-3 rounded-md text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary cursor-pointer">
                      Skip
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => goTo(step + 1)}
                    className="h-11 inline-flex items-center gap-1.5 px-5 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors cursor-pointer"
                  >
                    {step === steps.length - 2 ? "Review" : "Next"} <ChevronRight size={16} aria-hidden />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Patient context */}
        <aside aria-label="Patient context" className="hidden xl:block min-h-0 overflow-y-auto border-l border-border p-4 space-y-4">
            <div className="rounded-md border border-border bg-bg-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="size-10 rounded-full bg-primary-light text-primary grid place-items-center shrink-0">
                  <UserRound size={18} aria-hidden />
                </span>
                <div className="min-w-0">
                  <Link href={`/patients/${a.patientId}`} className="text-sm font-semibold text-text-primary hover:text-primary truncate block">
                    {patientName}
                  </Link>
                  <p className="text-xs text-text-secondary">
                    {[age !== null ? `${age} yrs` : null, patient?.gender ? patient.gender[0].toUpperCase() + patient.gender.slice(1) : null, patient?.mrn].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
              <dl className="text-sm space-y-2">
                <div>
                  <dt className="text-xs text-text-secondary">Condition</dt>
                  <dd className="text-text-primary">{patient?.healthCondition || "Not recorded"}</dd>
                </div>
                {patient?.allergies && (
                  <div>
                    <dt className="text-xs text-text-secondary">Allergies</dt>
                    <dd className="text-text-primary">{patient.allergies}</dd>
                  </div>
                )}
              </dl>
            </div>
            <div className="rounded-md border border-border bg-bg-card">
              <h3 className="px-4 py-3 border-b border-border text-sm font-semibold text-text-primary">Previous summaries</h3>
              {bundle.previousSummaries.length === 0 ? (
                <p className="px-4 py-3 text-sm text-text-secondary">No earlier approved summaries.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {bundle.previousSummaries.map((p) => (
                    <li key={p.id} className="px-4 py-3">
                      <details>
                        <summary className="text-sm text-text-primary cursor-pointer">
                          {p.appointment?.title ?? "Session"}
                          <span className="block text-xs text-text-secondary">{fmtDateTime(p.appointment?.start ?? p.submittedAt)}</span>
                        </summary>
                        <p className="mt-2 text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">{p.summary}</p>
                      </details>
                    </li>
                  ))}
                </ul>
              )}
            </div>
        </aside>
      </div>

      <ConfirmationDialog
        open={confirmSubmit}
        onClose={() => busy !== "submit" && setConfirmSubmit(false)}
        onConfirm={() => void submit()}
        loading={busy === "submit"}
        title="Submit this assessment?"
        description={`It will be filed to ${patientName}'s record as a document. After that it can only be changed through an amendment with a reason.`}
        confirmLabel="Submit"
      />
      <ConfirmationDialog
        open={confirmRegen}
        onClose={() => setConfirmRegen(false)}
        onConfirm={() => void generateSummary()}
        title="Replace the current summary?"
        description="Regenerating rebuilds it from your answers. Any edits you made to the summary text will be lost."
        confirmLabel="Regenerate"
      />
    </div>
  );
}

function SaveIndicator({ state, savedAt, onRetry }: { state: SaveState; savedAt: Date | null; onRetry: () => void }) {
  const base = "inline-flex items-center gap-1.5 text-xs";
  return (
    <div role="status" aria-live="polite" className="min-w-[9rem] text-right">
      {state === "saving" && (
        <span className={`${base} text-text-secondary`}>
          <Loader2 size={13} className="animate-spin" aria-hidden /> Saving…
        </span>
      )}
      {state === "unsaved" && <span className={`${base} text-text-secondary`}>Unsaved changes</span>}
      {state === "saved" && (
        <span className={`${base} text-text-secondary`}>
          <Cloud size={13} aria-hidden /> {savedAt ? `Saved ${fmtTime(savedAt)}` : "Saved"}
        </span>
      )}
      {state === "offline" && (
        <button type="button" onClick={onRetry} className={`${base} text-warning cursor-pointer hover:underline`}>
          <CloudOff size={13} aria-hidden /> Offline — kept on this device
        </button>
      )}
      {(state === "error" || state === "conflict") && (
        <span className={`${base} text-danger`}>
          <AlertTriangle size={13} aria-hidden /> Not saved
        </span>
      )}
    </div>
  );
}

function Banner({
  tone,
  icon: Icon,
  children,
  action,
  onDismiss,
}: {
  tone: "info" | "warning" | "danger" | "success";
  icon: typeof AlertTriangle;
  children: React.ReactNode;
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
}) {
  const cls = {
    info: "border-primary/30 bg-primary/5 text-text-primary",
    warning: "border-warning/40 bg-warning/5 text-text-primary",
    danger: "border-danger/30 bg-danger/5 text-text-primary",
    success: "border-success/30 bg-success/5 text-text-primary",
  }[tone];
  const iconCls = { info: "text-primary", warning: "text-warning", danger: "text-danger", success: "text-success" }[tone];
  return (
    <div role={tone === "danger" || tone === "warning" ? "alert" : "status"} className={`flex flex-wrap items-center gap-3 rounded-md border px-3.5 py-2.5 text-sm ${cls}`}>
      <Icon size={16} className={`shrink-0 ${iconCls}`} aria-hidden />
      <div className="flex-1 min-w-0">{children}</div>
      {action && (
        <button type="button" onClick={action.onClick} className="h-9 px-3 rounded-md border border-border bg-bg-card text-sm font-medium hover:bg-bg-hover cursor-pointer">
          {action.label}
        </button>
      )}
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="h-9 px-2 text-sm text-text-secondary hover:text-text-primary cursor-pointer">
          Dismiss
        </button>
      )}
    </div>
  );
}

function StepDot({ state }: { state: string }) {
  if (state === "scored")
    return (
      <span className="mt-0.5 size-4 shrink-0 rounded-full bg-primary grid place-items-center" aria-label="Answered">
        <CheckCircle2 size={16} className="text-white" aria-hidden />
      </span>
    );
  if (state === "not_observed" || state === "not_applicable")
    return <span className="mt-0.5 size-4 shrink-0 rounded-full border-2 border-text-secondary bg-bg-hover" aria-label={state === "not_observed" ? "Not observed" : "Not applicable"} />;
  return <span className="mt-0.5 size-4 shrink-0 rounded-full border-2 border-border" aria-label="Not answered" />;
}

function AnswerValue({ r, max }: { r: AssessmentResponse | undefined; max: number }) {
  if (r?.state === "scored" && typeof r.score === "number") {
    return (
      <span className="flex items-center gap-3 shrink-0">
        <span className="hidden sm:flex gap-0.5" aria-hidden>
          {Array.from({ length: max }, (_, k) => (
            <span key={k} className={`h-2 w-2.5 rounded-sm ${k < r.score! ? "bg-primary" : "bg-bg-hover"}`} />
          ))}
        </span>
        <span className="w-12 text-right text-sm font-semibold tabular-nums text-text-primary">
          {r.score}/{max}
        </span>
      </span>
    );
  }
  if (r?.state === "not_observed" || r?.state === "not_applicable") {
    return <Badge tone="neutral">{r.state === "not_observed" ? "Not observed" : "N/A"}</Badge>;
  }
  return <span className="text-sm text-text-disabled shrink-0">Not answered</span>;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="inline-flex min-w-5 h-5 items-center justify-center px-1 rounded border border-border bg-bg-page font-sans text-[11px] text-text-primary">{children}</kbd>;
}
