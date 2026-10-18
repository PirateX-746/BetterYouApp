"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2, Loader2, AlertCircle, Clock, CheckCircle2, ClipboardList, XCircle, UserX } from "lucide-react";
import { CalendarEvent } from "@/types/appointment";
import Link from "next/link";
import { api, type AppointmentType } from "@/lib/api";
import { DURATION_PRESETS, formatDuration } from "@/lib/appointmentTypes";
import { Modal } from "@/components/common/Modal";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { Badge, type BadgeTone } from "@/components/common/Badge";
import SearchableSelect from "../../ui/SearchableSelect";
import type { PracticeHours } from "./AppointmentsClient";

type Patient = { _id: string; firstName: string; lastName?: string };

type Props = {
  open: boolean;
  initialDate: Date | null;
  event: CalendarEvent | null;
  practiceHours?: PracticeHours;
  /** The practitioner's configured types (all of them; inactive ones are filtered here). */
  appointmentTypes: AppointmentType[];
  typesLoading?: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onStatusChange?: (id: string, status: string) => Promise<void>;
};

const STATUS_BADGE: Record<string, { label: string; tone: BadgeTone }> = {
  scheduled: { label: "Scheduled", tone: "warning" },
  confirmed: { label: "Confirmed", tone: "success" },
  checked_in: { label: "Checked in", tone: "teal" },
  in_progress: { label: "In session", tone: "primary" },
  completed: { label: "Completed", tone: "success" },
  no_show: { label: "No-show", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

/** Option value for an appointment booked before types existed: it has a title but no type. */
const LEGACY_PREFIX = "legacy:";

const DAY_KEYS = [
  "sunday", "monday", "tuesday", "wednesday",
  "thursday", "friday", "saturday",
] as const;

const fieldCls =
  "w-full px-3.5 py-2.5 text-sm bg-bg-page border border-border rounded-xl text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition disabled:opacity-50 disabled:cursor-not-allowed";

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function fmt12(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mStr} ${ampm}`;
}

export default function AddAppointmentDialog({
  open,
  initialDate,
  event,
  practiceHours,
  appointmentTypes,
  typesLoading = false,
  onClose,
  onSave,
  onDelete,
  onStatusChange,
}: Props) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [saving, setSaving] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [markingNoShow, setMarkingNoShow] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | "cancel" | null>(null);

  // A type _id, or LEGACY_PREFIX + title for pre-types appointments.
  const [typeValue, setTypeValue] = useState("");
  const [patientId, setPatientId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");

  /* Prefill for edit */
  useEffect(() => {
    if (!event) return;
    const start = new Date(event.start);
    const end   = new Date(event.end);
    setTypeValue(
      event.appointmentTypeId
        ? event.appointmentTypeId
        : // Old appointments: match a same-named type if there is one.
          appointmentTypes.find((t) => t.name === event.title)?._id ??
            `${LEGACY_PREFIX}${event.title}`,
    );
    setPatientId(event.patientId);
    setNotes(event.notes ?? "");
    setDate(start.toISOString().slice(0, 10));
    setTime(start.toTimeString().slice(0, 5));
    setDuration((end.getTime() - start.getTime()) / 60_000);
    // appointmentTypes is deliberately not a dependency: types reload when the
    // dialog opens, and re-running this would discard the user's edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  /* Prefill date/time for create */
  useEffect(() => {
    if (!initialDate || event) return;
    setDate(initialDate.toISOString().slice(0, 10));
    setTime(initialDate.toTimeString().slice(0, 5));
  }, [initialDate, event]);

  /* Fetch patients */
  useEffect(() => {
    if (!open) return;
    setLoadingPatients(true);
    api.get("/patients")
      .then((r) => setPatients(Array.isArray(r.data) ? r.data : []))
      .catch(() => setPatients([]))
      .finally(() => setLoadingPatients(false));
  }, [open]);

  /* Reset on close */
  useEffect(() => {
    if (open) return;
    setTypeValue(""); setNotes(""); setPatientId(""); setDuration(30);
  }, [open]);

  /* ── Practice hours validation for selected date ── */
  const daySchedule = useMemo(() => {
    if (!date || !practiceHours) return null;
    const [y, m, d] = date.split("-").map(Number);
    const dayIdx = new Date(y, m - 1, d).getDay();
    return practiceHours[DAY_KEYS[dayIdx]] ?? null;
  }, [date, practiceHours]);

  const hoursError = useMemo(() => {
    if (!date || !time || !daySchedule) return null;
    if (!daySchedule.isOpen) {
      const [y, m, d] = date.split("-").map(Number);
      const dayName = DAY_KEYS[new Date(y, m - 1, d).getDay()];
      return `Practice is closed on ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}`;
    }
    const startMin = toMinutes(time);
    const endMin   = startMin + duration;
    const openMin  = toMinutes(daySchedule.openTime);
    const closeMin = toMinutes(daySchedule.closeTime);
    if (startMin < openMin) return `Practice opens at ${fmt12(daySchedule.openTime)}`;
    if (endMin > closeMin)  return `Appointment ends after closing time (${fmt12(daySchedule.closeTime)})`;
    return null;
  }, [date, time, duration, daySchedule]);

  const hoursHint = useMemo(() => {
    if (!daySchedule?.isOpen) return null;
    return `Open ${fmt12(daySchedule.openTime)} – ${fmt12(daySchedule.closeTime)}`;
  }, [daySchedule]);

  const patientOptions = patients.map((p) => ({
    value: p._id,
    label: `${p.firstName} ${p.lastName ?? ""}`.trim(),
  }));
  // Active types, plus whatever this appointment already has even if that
  // type has since been deactivated (or predates types entirely).
  const typeOptions = useMemo(() => {
    const opts = appointmentTypes
      .filter((t) => t.isActive || t._id === typeValue)
      .map((t) => ({
        value: t._id,
        label: `${t.name} · ${formatDuration(t.durationMinutes)}${t.isActive ? "" : " (inactive)"}`,
      }));
    if (typeValue.startsWith(LEGACY_PREFIX)) {
      opts.unshift({ value: typeValue, label: typeValue.slice(LEGACY_PREFIX.length) });
    }
    return opts;
  }, [appointmentTypes, typeValue]);
  const noActiveTypes = !typesLoading && !appointmentTypes.some((t) => t.isActive);

  /** Picking a type prefills its duration; the duration stays editable. */
  const handleTypeChange = (value: string) => {
    setTypeValue(value);
    const type = appointmentTypes.find((t) => t._id === value);
    if (type) setDuration(type.durationMinutes);
  };

  // Presets plus the current value, so a type's 50- or 75-minute default
  // (or an old appointment's odd length) is always selectable.
  const durationOptions = useMemo(
    () => [...new Set([...DURATION_PRESETS, 120, duration])].sort((a, b) => a - b),
    [duration],
  );

  const isClosedOut =
    event?.status === "completed" ||
    event?.status === "cancelled" ||
    event?.status === "no_show";

  const canSave = !saving && !!date && !!time && !!typeValue && (isClosedOut || !hoursError);

  const handleSubmit = async () => {
    if (!canSave) return;
    const start = new Date(`${date}T${time}`);
    const end   = new Date(start.getTime() + duration * 60_000);
    setSaving(true);
    try {
      // A real type is sent by id (the server sets the title from it); a
      // legacy appointment keeps its free-text title.
      const typeFields = typeValue.startsWith(LEGACY_PREFIX)
        ? { title: typeValue.slice(LEGACY_PREFIX.length) }
        : { appointmentTypeId: typeValue };
      await onSave({ ...typeFields, patientId, start: start.toISOString(), end: end.toISOString(), notes }, event?.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const busy = markingComplete || markingNoShow || cancelling;
  // Outcome actions only make sense once the session's start time has passed.
  const hasStarted = !!event && new Date(event.start).getTime() <= Date.now();

  const handleDelete = () => {
    if (!event) return;
    setConfirm(null);
    onDelete(event.id);
    onClose();
  };

  const handleMarkCompleted = async () => {
    if (!event || !onStatusChange) return;
    setMarkingComplete(true);
    try {
      await onStatusChange(event.id, "completed");
    } finally {
      setMarkingComplete(false);
    }
  };

  const handleMarkNoShow = async () => {
    if (!event || !onStatusChange) return;
    setMarkingNoShow(true);
    try {
      await onStatusChange(event.id, "no_show");
    } finally {
      setMarkingNoShow(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!event || !onStatusChange) return;
    setCancelling(true);
    try {
      await onStatusChange(event.id, "cancelled");
      setConfirm(null);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title={event ? "Edit Appointment" : "Schedule Appointment"}
      footer={
        <div className="flex flex-wrap items-center gap-2 w-full">
          {/* Destructive actions: quiet, on the left, and always confirmed.
              Not offered once a session is closed out — that's the record. */}
          {event && !isClosedOut && (
            <div className="flex items-center gap-1 -ml-2">
              {onStatusChange && (
                <button
                  type="button"
                  onClick={() => setConfirm("cancel")}
                  disabled={busy}
                  className="h-10 inline-flex items-center gap-1.5 px-2.5 rounded-md text-sm text-danger hover:bg-danger/5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <XCircle size={15} aria-hidden /> Cancel appointment
                </button>
              )}
              <button
                type="button"
                onClick={() => setConfirm("delete")}
                disabled={busy}
                className="h-10 inline-flex items-center gap-1.5 px-2.5 rounded-md text-sm text-text-secondary hover:text-danger hover:bg-danger/5 transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Delete appointment"
              >
                <Trash2 size={15} aria-hidden /> Delete
              </button>
            </div>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSave}
              className="h-10 flex items-center gap-2 px-5 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title={hoursError ?? undefined}
            >
              {saving && <Loader2 size={14} className="animate-spin" aria-hidden />}
              {saving ? "Saving…" : event ? "Save changes" : "Schedule"}
            </button>
          </div>
        </div>
      }
    >
          {/* Session status + the actions that make sense right now */}
          {event && (
            <div className="rounded-md border border-border bg-bg-page p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Status</span>
                <Badge tone={STATUS_BADGE[event.status ?? "scheduled"]?.tone ?? "neutral"}>
                  {STATUS_BADGE[event.status ?? "scheduled"]?.label ?? event.status}
                </Badge>
              </div>
              {!isClosedOut && onStatusChange && hasStarted && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-text-primary">How did the session go?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleMarkNoShow}
                      disabled={busy}
                      className="h-10 inline-flex items-center gap-1.5 px-3 rounded-md border border-border bg-bg-card text-sm text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {markingNoShow ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <UserX size={14} aria-hidden />}
                      No-show
                    </button>
                    <button
                      type="button"
                      onClick={handleMarkCompleted}
                      disabled={busy}
                      className="h-10 inline-flex items-center gap-1.5 px-3 rounded-md bg-success text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                    >
                      {markingComplete ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <CheckCircle2 size={14} aria-hidden />}
                      Mark completed
                    </button>
                  </div>
                </div>
              )}
              {!isClosedOut && !hasStarted && (
                <p className="text-xs text-text-secondary">
                  Completion and no-show can be recorded once the session has started.
                </p>
              )}
              {/* Assessable from the session's start, unless cancelled / no-show. */}
              {hasStarted && event.status !== "cancelled" && event.status !== "no_show" && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                  <p className="text-sm text-text-primary">Record your observations of this session.</p>
                  <Link
                    href={`/assessments?appointment=${event.id}`}
                    className="h-10 inline-flex items-center gap-1.5 px-3 rounded-md border border-primary/30 bg-bg-card text-sm font-medium text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                  >
                    <ClipboardList size={14} aria-hidden /> Session assessment
                  </Link>
                </div>
              )}
              {isClosedOut && (
                <p className="text-xs text-text-secondary">Closed out — the time can&apos;t change, but you can still edit the notes.</p>
              )}
            </div>
          )}

          {/* Patient */}
          <div className="space-y-1.5">
            <label htmlFor="appt-patient" className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Patient</label>
            <SearchableSelect
              id="appt-patient"
              options={patientOptions}
              value={patientId}
              onChange={setPatientId}
              placeholder="Select patient"
              disabled={!!event}
              loading={loadingPatients}
              loadingText="Loading patients…"
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <label htmlFor="appt-type" className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Appointment Type</label>
            <SearchableSelect
              id="appt-type"
              options={typeOptions}
              value={typeValue}
              onChange={handleTypeChange}
              placeholder="Select type"
              loading={typesLoading}
              loadingText="Loading types…"
            />
            {noActiveTypes && (
              <p className="text-xs text-text-secondary">
                No active appointment types.{" "}
                <Link href="/settings" className="text-primary hover:underline">
                  Add them in Settings → Appointment Types
                </Link>
              </p>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between h-4">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Date</label>
              </div>
              <input
                type="date"
                className={fieldCls}
                value={date}
                disabled={isClosedOut}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between h-4">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Time</label>
                {hoursHint && (
                  <span className="flex items-center gap-1 whitespace-nowrap text-[10px] text-text-secondary shrink-0">
                    <Clock size={10} className="shrink-0" />
                    {hoursHint}
                  </span>
                )}
              </div>
              <input
                type="time"
                className={fieldCls}
                value={time}
                min={daySchedule?.isOpen ? daySchedule.openTime : undefined}
                max={daySchedule?.isOpen ? daySchedule.closeTime : undefined}
                disabled={isClosedOut}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          {isClosedOut && (
            <p className="text-xs text-text-secondary -mt-2">
              This appointment is {event?.status === "completed" ? "completed" : event?.status === "no_show" ? "marked as no-show" : "cancelled"} and can no longer be rescheduled.
            </p>
          )}

          {/* Practice hours error banner */}
          {!isClosedOut && hoursError && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-danger/8 border border-danger/20 rounded-xl">
              <AlertCircle size={15} className="text-danger shrink-0 mt-0.5" />
              <p className="text-xs text-danger">{hoursError}</p>
            </div>
          )}

          {/* Duration */}
          <div className="space-y-1.5">
            <label htmlFor="appt-duration" className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Duration</label>
            <select id="appt-duration" className={fieldCls} value={duration} disabled={isClosedOut} onChange={(e) => setDuration(Number(e.target.value))}>
              {durationOptions.map((m) => (
                <option key={m} value={m}>{formatDuration(m)}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label htmlFor="appt-notes" className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Notes</label>
            <textarea
              id="appt-notes"
              className={`${fieldCls} resize-none`}
              placeholder="Session notes…"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
    </Modal>

    {event && (
      <>
      <ConfirmationDialog
        open={confirm === "cancel"}
        onClose={() => !cancelling && setConfirm(null)}
        onConfirm={() => void handleCancelAppointment()}
        title="Cancel this appointment?"
        description="It stays on the calendar and in the patient's history, marked as cancelled, and the time slot opens up again."
        confirmLabel="Cancel appointment"
        cancelLabel="Keep it"
        danger
        loading={cancelling}
      />
      <ConfirmationDialog
        open={confirm === "delete"}
        onClose={() => setConfirm(null)}
        onConfirm={handleDelete}
        title="Delete this appointment?"
        description="It's removed completely, as if it was never booked. Use this for mistakes — to call off a real session, cancel it instead so it stays on record."
        confirmLabel="Delete"
        danger
      />
      </>
    )}
    </>
  );
}
