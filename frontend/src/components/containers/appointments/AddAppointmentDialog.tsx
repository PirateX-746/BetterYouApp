"use client";

import { useEffect, useState } from "react";
import { X, Trash2, Loader2 } from "lucide-react";
import { CalendarEvent } from "@/types/appointment";
import { api } from "@/lib/api";
import SearchableSelect from "../../ui/SearchableSelect";

type Patient = {
  _id: string;
  firstName: string;
  lastName?: string;
};

type Props = {
  open: boolean;
  initialDate: Date | null;
  event: CalendarEvent | null;
  onClose: () => void;
  onSave: (data: Record<string, unknown>, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

const APPOINTMENT_TYPES = [
  "New Patient Visit",
  "Follow-Up Session",
  "Counselling Session",
  "CBT Session",
  "Couples Therapy",
  "Family Therapy",
];

const fieldCls =
  "w-full px-3.5 py-2.5 text-sm bg-bg-page border border-border rounded-xl text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition disabled:opacity-50 disabled:cursor-not-allowed";

export default function AddAppointmentDialog({
  open,
  initialDate,
  event,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [patientId, setPatientId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");

  /* Prefill for edit */
  useEffect(() => {
    if (!event) return;
    const start = new Date(event.start);
    const end = new Date(event.end);
    setTitle(event.title);
    setPatientId(event.patientId);
    setNotes(event.notes ?? "");
    setDate(start.toISOString().slice(0, 10));
    setTime(start.toTimeString().slice(0, 5));
    setDuration((end.getTime() - start.getTime()) / 60_000);
  }, [event]);

  /* Prefill date/time for create */
  useEffect(() => {
    if (!initialDate || event) return;
    setDate(initialDate.toISOString().slice(0, 10));
    setTime(initialDate.toTimeString().slice(0, 5));
  }, [initialDate, event]);

  /* Fetch patients when dialog opens */
  useEffect(() => {
    if (!open) return;
    setLoadingPatients(true);
    api
      .get("/patients")
      .then((res) => setPatients(Array.isArray(res.data) ? res.data : []))
      .catch(() => setPatients([]))
      .finally(() => setLoadingPatients(false));
  }, [open]);

  /* Reset on close */
  useEffect(() => {
    if (open) return;
    setTitle("");
    setNotes("");
    setPatientId("");
    setDuration(30);
  }, [open]);

  if (!open) return null;

  const patientOptions = patients.map((p) => ({
    value: p._id,
    label: `${p.firstName} ${p.lastName ?? ""}`.trim(),
  }));

  const typeOptions = APPOINTMENT_TYPES.map((t) => ({ value: t, label: t }));

  const handleSubmit = async () => {
    if (!date || !time) return;
    const start = new Date(`${date}T${time}`);
    const end = new Date(start.getTime() + duration * 60_000);
    setSaving(true);
    try {
      await onSave(
        {
          title,
          patientId,
          start: start.toISOString(),
          end: end.toISOString(),
          notes,
        },
        event?.id,
      );
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!event) return;
    onDelete(event.id);
    onClose();
  };

  return (
    /* Bottom sheet on mobile, centered modal on desktop */
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-bg-card w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[92dvh] flex flex-col">
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden shrink-0">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0">
          <h2 className="text-base font-semibold text-text-primary">
            {event ? "Edit Appointment" : "Schedule Appointment"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-hover text-text-secondary transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-3">
          {/* Patient */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
              Patient
            </label>
            <SearchableSelect
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
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
              Appointment Type
            </label>
            <SearchableSelect
              options={typeOptions}
              value={title}
              onChange={setTitle}
              placeholder="Select type"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Date
              </label>
              <input
                type="date"
                className={fieldCls}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Time
              </label>
              <input
                type="time"
                className={fieldCls}
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
              Duration
            </label>
            <select
              className={fieldCls}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>1 hour</option>
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
              Notes
            </label>
            <textarea
              className={`${fieldCls} resize-none`}
              placeholder="Session notes…"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex items-center gap-3 shrink-0">
          {event && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-danger text-danger text-sm hover:bg-danger/5 transition"
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}

          <div className="flex gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border text-sm text-text-secondary hover:bg-bg-hover transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !date || !time || !title}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Saving…" : event ? "Update" : "Schedule"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
