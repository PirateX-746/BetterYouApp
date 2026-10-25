"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2, AlertCircle, Clock, CheckCircle2, ClipboardList, XCircle, UserX } from "lucide-react";
import { CalendarEvent } from "@/types/appointment";
import Link from "next/link";
import { api, type AppointmentType } from "@/lib/api";
import { DURATION_PRESETS, formatDuration } from "@/lib/appointmentTypes";
import { Modal } from "@/components/common/Modal";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { Badge, type BadgeTone } from "@/components/common/Badge";
import { Field, FieldGroup, inputClass, textareaClass } from "@/components/common/Field";
import { Button } from "@/components/ui/button";
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
  // When the dialog opened — the reference for "in the past" below.
  const [openedAt] = useState(() => Date.now());
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
    if (!date || !time) return null;
    // New bookings, and moves of an existing one, can't start in the past.
    const startAt = new Date(`${date}T${time}`).getTime();
    const moved = !event || startAt !== new Date(event.start).getTime();
    if (moved && startAt < openedAt) return "That time has already passed";
    if (!daySchedule) return null;
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
  }, [date, time, duration, daySchedule, event, openedAt]);

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

  const status = STATUS_BADGE[event?.status ?? "scheduled"];

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title={event ? "Edit appointment" : "Schedule appointment"}
      footer={
        <div className="flex flex-wrap items-center gap-2 w-full">
          {/* Destructive actions: quiet, on the left, apart from Save, and
              always confirmed. Not offered once a session is closed out —
              that's the record. */}
          {event && !isClosedOut && (
            <div className="flex items-center gap-1 -ml-2">
              {onStatusChange && (
                <Button variant="danger-ghost" size="sm" onClick={() => setConfirm("cancel")} disabled={busy}>
                  <XCircle aria-hidden /> Cancel appointment
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirm("delete")}
                disabled={busy}
                className="hover:text-danger-strong hover:bg-danger/10"
                aria-label="Delete appointment"
              >
                <Trash2 aria-hidden /> Delete
              </Button>
            </div>
          )}
          <div className="flex gap-2 ml-auto">
            <Button onClick={handleSubmit} disabled={!canSave} loading={saving} title={hoursError ?? undefined}>
              {saving ? "Saving…" : event ? "Save changes" : "Schedule"}
            </Button>
          </div>
        </div>
      }
    >
          {/* Session status + the actions that make sense right now */}
          {event && (
            <section aria-label="Session status" className="rounded-xl bg-bg-subtle border border-border-light">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-eyebrow font-semibold uppercase text-text-secondary">Status</p>
                  <p className="text-footnote text-text-secondary mt-0.5">
                    {isClosedOut
                      ? "Closed out — the time can't change, but you can still edit the notes."
                      : hasStarted
                        ? "The session has started. Record how it went."
                        : "Completion and no-show can be recorded once the session has started."}
                  </p>
                </div>
                <Badge tone={status?.tone ?? "neutral"} dot>
                  {status?.label ?? event.status}
                </Badge>
              </div>
              {((!isClosedOut && onStatusChange && hasStarted) ||
                (hasStarted && event.status !== "cancelled" && event.status !== "no_show")) && (
                <div className="flex flex-wrap items-center gap-2 border-t border-border-light px-4 py-3">
                  {!isClosedOut && onStatusChange && hasStarted && (
                    <>
                      <Button variant="secondary" size="sm" onClick={handleMarkCompleted} disabled={busy} loading={markingComplete}>
                        {!markingComplete && <CheckCircle2 className="text-success-strong" aria-hidden />}
                        Mark completed
                      </Button>
                      <Button variant="secondary" size="sm" onClick={handleMarkNoShow} disabled={busy} loading={markingNoShow}>
                        {!markingNoShow && <UserX aria-hidden />}
                        No-show
                      </Button>
                    </>
                  )}
                  {/* Assessable from the session's start, unless cancelled / no-show. */}
                  {hasStarted && event.status !== "cancelled" && event.status !== "no_show" && (
                    <Button asChild variant="tertiary" size="sm">
                      <Link href={`/assessments?appointment=${event.id}`}>
                        <ClipboardList aria-hidden /> Session assessment
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </section>
          )}

          <FieldGroup legend="Session">
            <Field label="Patient" htmlFor="appt-patient">
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
            </Field>

            <Field
              label="Appointment type"
              htmlFor="appt-type"
              hint={
                noActiveTypes ? (
                  <>
                    No active appointment types.{" "}
                    <Link href="/settings" className="text-primary-strong hover:underline">
                      Add them in Settings → Appointment Types
                    </Link>
                  </>
                ) : undefined
              }
            >
              <SearchableSelect
                id="appt-type"
                options={typeOptions}
                value={typeValue}
                onChange={handleTypeChange}
                placeholder="Select type"
                loading={typesLoading}
                loadingText="Loading types…"
              />
            </Field>
          </FieldGroup>

          <FieldGroup legend="When">
            <div className="grid grid-cols-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3">
              <Field label="Date" htmlFor="appt-date" className="col-span-2 sm:col-span-1">
                <input
                  id="appt-date"
                  type="date"
                  className={inputClass}
                  value={date}
                  disabled={isClosedOut}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>
              <Field label="Time" htmlFor="appt-time">
                <input
                  id="appt-time"
                  type="time"
                  className={inputClass}
                  value={time}
                  min={daySchedule?.isOpen ? daySchedule.openTime : undefined}
                  max={daySchedule?.isOpen ? daySchedule.closeTime : undefined}
                  disabled={isClosedOut}
                  aria-invalid={!isClosedOut && !!hoursError}
                  onChange={(e) => setTime(e.target.value)}
                />
              </Field>
              <Field label="Duration" htmlFor="appt-duration">
                <select id="appt-duration" className={inputClass} value={duration} disabled={isClosedOut} onChange={(e) => setDuration(Number(e.target.value))}>
                  {durationOptions.map((m) => (
                    <option key={m} value={m}>{formatDuration(m)}</option>
                  ))}
                </select>
              </Field>
            </div>

            {hoursHint && !isClosedOut && !hoursError && (
              <p className="flex items-center gap-1.5 text-caption text-text-secondary">
                <Clock size={12} className="shrink-0" aria-hidden />
                Practice hours that day: {hoursHint.replace(/^Open\s*/i, "")}
              </p>
            )}

            {isClosedOut && (
              <p className="text-caption text-text-secondary">
                This appointment is {event?.status === "completed" ? "completed" : event?.status === "no_show" ? "marked as no-show" : "cancelled"} and can no longer be rescheduled.
              </p>
            )}

            {/* Practice hours error */}
            {!isClosedOut && hoursError && (
              <div role="alert" className="flex items-start gap-2 px-3 py-2.5 bg-danger-light rounded-lg">
                <AlertCircle size={15} className="text-danger-strong shrink-0 mt-0.5" aria-hidden />
                <p className="text-footnote text-danger-strong">{hoursError}</p>
              </div>
            )}
          </FieldGroup>

          <Field label="Notes" htmlFor="appt-notes">
            <textarea
              id="appt-notes"
              className={textareaClass}
              placeholder="Session notes…"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
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
