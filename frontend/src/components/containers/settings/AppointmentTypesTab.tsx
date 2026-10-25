"use client";

import { useEffect, useId, useState } from "react";
import { CalendarClock, Check, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  apiErrorMessage,
  appointmentTypesApi,
  type AppointmentType,
  type AppointmentTypeInput,
} from "@/lib/api";
import {
  DURATION_PRESETS,
  TYPE_COLOR_PRESETS,
  TYPE_DURATION_MAX,
  TYPE_DURATION_MIN,
  TYPE_NAME_MAX,
  formatDuration,
} from "@/lib/appointmentTypes";
import { Modal } from "@/components/common/Modal";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { LoadingState } from "@/components/ui/loading-state";

const fieldCls =
  "w-full px-3.5 py-2.5 text-sm bg-bg-page border border-border rounded-xl text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition";

const iconBtnCls =
  "w-11 h-11 flex items-center justify-center rounded-xl text-text-secondary hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

/* ─── Active toggle ─── */

function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    // 44px hit area around a compact track.
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="h-11 px-1.5 flex items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? "bg-primary" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 motion-reduce:transition-none ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

/* ─── Editor modal ─── */

type Draft = { name: string; duration: string; color: string; isActive: boolean };
type Errors = Partial<Record<"name" | "duration", string>>;

function validate(d: Draft): Errors {
  const errors: Errors = {};
  const name = d.name.trim();
  if (!name) errors.name = "Name is required";
  else if (name.length > TYPE_NAME_MAX) errors.name = `Name must be ${TYPE_NAME_MAX} characters or fewer`;

  const n = Number(d.duration);
  if (d.duration.trim() === "" || !Number.isInteger(n)) {
    errors.duration = "Enter a whole number of minutes";
  } else if (n < TYPE_DURATION_MIN || n > TYPE_DURATION_MAX) {
    errors.duration = `Duration must be between ${TYPE_DURATION_MIN} and ${TYPE_DURATION_MAX} minutes`;
  }
  return errors;
}

function TypeEditor({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: AppointmentType | null;
  onClose: () => void;
  onSaved: (type: AppointmentType) => void;
}) {
  const ids = { name: useId(), duration: useId(), color: useId() };
  const [draft, setDraft] = useState<Draft>({ name: "", duration: "30", color: TYPE_COLOR_PRESETS[0], isActive: true });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverNameError, setServerNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(
      initial
        ? { name: initial.name, duration: String(initial.durationMinutes), color: initial.color, isActive: initial.isActive }
        : { name: "", duration: "30", color: TYPE_COLOR_PRESETS[0], isActive: true },
    );
    setTouched({});
    setServerNameError(null);
  }, [open, initial]);

  const errors = validate(draft);
  const nameError = (touched.name && errors.name) || serverNameError;
  const durationError = touched.duration && errors.duration;

  const submit = async () => {
    setTouched({ name: true, duration: true });
    if (Object.keys(errors).length) return;

    const input: AppointmentTypeInput = {
      name: draft.name.trim(),
      durationMinutes: Number(draft.duration),
      color: draft.color,
      isActive: draft.isActive,
    };
    setSaving(true);
    try {
      const { data } = initial
        ? await appointmentTypesApi.update(initial._id, input)
        : await appointmentTypesApi.create(input);
      toast.success(initial ? "Appointment type updated" : "Appointment type added");
      onSaved(data);
      onClose();
    } catch (err) {
      const msg = apiErrorMessage(err, "Couldn't save the appointment type");
      // A duplicate name belongs next to the name field, not in a toast.
      if ((err as { response?: { status?: number } })?.response?.status === 409) {
        setServerNameError(msg);
      } else {
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const isCustomColor = !(TYPE_COLOR_PRESETS as readonly string[]).includes(draft.color.toLowerCase());

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : onClose}
      title={initial ? "Edit appointment type" : "New appointment type"}
      subtitle="Duration prefills when booking and can be changed per appointment."
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-11 px-4 rounded-xl border border-border text-sm text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="appointment-type-form"
            disabled={saving}
            className="h-11 flex items-center gap-2 px-5 text-sm font-medium rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {initial ? "Save changes" : "Add type"}
          </button>
        </div>
      }
    >
      <form
        id="appointment-type-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-5"
      >
        <div className="space-y-1.5">
          <label htmlFor={ids.name} className="text-sm font-medium text-text-primary">
            Name
          </label>
          <input
            id={ids.name}
            className={fieldCls}
            value={draft.name}
            maxLength={TYPE_NAME_MAX + 10}
            placeholder="e.g. CBT Session"
            aria-invalid={!!nameError}
            aria-describedby={nameError ? `${ids.name}-err` : undefined}
            onChange={(e) => {
              setDraft((d) => ({ ...d, name: e.target.value }));
              setServerNameError(null);
            }}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            autoFocus
          />
          {nameError && (
            <p id={`${ids.name}-err`} role="alert" className="text-xs text-danger-strong">
              {nameError}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor={ids.duration} className="text-sm font-medium text-text-primary">
            Duration (minutes)
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id={ids.duration}
              type="number"
              inputMode="numeric"
              min={TYPE_DURATION_MIN}
              max={TYPE_DURATION_MAX}
              step={5}
              className={fieldCls.replace("w-full", "w-28")}
              value={draft.duration}
              aria-invalid={!!durationError}
              aria-describedby={durationError ? `${ids.duration}-err` : undefined}
              onChange={(e) => setDraft((d) => ({ ...d, duration: e.target.value }))}
              onBlur={() => setTouched((t) => ({ ...t, duration: true }))}
            />
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Common durations">
              {DURATION_PRESETS.map((m) => {
                const selected = Number(draft.duration) === m;
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setDraft((d) => ({ ...d, duration: String(m) }))}
                    className={`h-11 px-3 rounded-xl border text-sm transition-colors cursor-pointer ${
                      selected
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border text-text-secondary hover:bg-bg-hover"
                    }`}
                  >
                    {formatDuration(m)}
                  </button>
                );
              })}
            </div>
          </div>
          {durationError && (
            <p id={`${ids.duration}-err`} role="alert" className="text-xs text-danger-strong">
              {durationError}
            </p>
          )}
        </div>

        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium text-text-primary">Calendar color</legend>
          <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Calendar color">
            {TYPE_COLOR_PRESETS.map((c) => {
              const selected = draft.color.toLowerCase() === c;
              return (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={c}
                  onClick={() => setDraft((d) => ({ ...d, color: c }))}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary ${
                    selected ? "ring-2 ring-offset-2 ring-offset-bg-card ring-text-primary" : ""
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {selected && <Check size={18} className="text-white drop-shadow" aria-hidden />}
                </button>
              );
            })}
            <label
              htmlFor={ids.color}
              className={`relative w-11 h-11 rounded-xl border border-dashed border-border flex items-center justify-center cursor-pointer text-xs text-text-secondary hover:bg-bg-hover ${
                isCustomColor ? "ring-2 ring-offset-2 ring-offset-bg-card ring-text-primary" : ""
              }`}
              style={isCustomColor ? { backgroundColor: draft.color } : undefined}
              title="Custom color"
            >
              {!isCustomColor && <Plus size={16} aria-hidden />}
              <span className="sr-only">Custom color</span>
              <input
                id={ids.color}
                type="color"
                value={draft.color}
                onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
          </div>
        </fieldset>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-1.5">
          <div>
            <p className="text-sm font-medium text-text-primary">Active</p>
            <p className="text-xs text-text-secondary">Inactive types can&apos;t be newly booked.</p>
          </div>
          <Switch
            checked={draft.isActive}
            onChange={(v) => setDraft((d) => ({ ...d, isActive: v }))}
            label="Active"
          />
        </div>
      </form>
    </Modal>
  );
}

/* ─── Tab ─── */

export default function AppointmentTypesTab() {
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentType | null>(null);
  const [deleting, setDeleting] = useState<AppointmentType | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setLoadError(false);
    appointmentTypesApi
      .list()
      .then(({ data }) => setTypes(data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const upsert = (saved: AppointmentType) =>
    setTypes((prev) =>
      prev.some((t) => t._id === saved._id)
        ? prev.map((t) => (t._id === saved._id ? saved : t))
        : [...prev, saved],
    );

  const toggleActive = async (type: AppointmentType, isActive: boolean) => {
    setTogglingId(type._id);
    upsert({ ...type, isActive }); // optimistic
    try {
      await appointmentTypesApi.update(type._id, { isActive });
      toast.success(`${type.name} ${isActive ? "activated" : "deactivated"}`);
    } catch (err) {
      upsert(type);
      toast.error(apiErrorMessage(err, "Couldn't update the appointment type"));
    } finally {
      setTogglingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await appointmentTypesApi.delete(deleting._id);
      setTypes((prev) => prev.filter((t) => t._id !== deleting._id));
      toast.success(`${deleting.name} deleted`);
      setDeleting(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't delete the appointment type"));
    } finally {
      setDeleteBusy(false);
    }
  };

  const openEditor = (type: AppointmentType | null) => {
    setEditing(type);
    setEditorOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Appointment Types</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            The sessions you offer. Picking a type when booking fills in its duration.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openEditor(null)}
          className="h-11 shrink-0 inline-flex items-center justify-center gap-2 px-4 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors cursor-pointer"
        >
          <Plus size={16} aria-hidden />
          Add type
        </button>
      </div>

      {loading ? (
        <LoadingState />
      ) : loadError ? (
        <div className="rounded-xl border border-border p-6 text-center space-y-3">
          <p className="text-sm text-text-secondary">Couldn&apos;t load your appointment types.</p>
          <button
            type="button"
            onClick={load}
            className="h-11 px-4 rounded-xl border border-border text-sm text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
          >
            Try again
          </button>
        </div>
      ) : types.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
          <CalendarClock className="mx-auto text-text-disabled" size={28} aria-hidden />
          <p className="text-sm font-medium text-text-primary">No appointment types yet</p>
          <p className="text-sm text-text-secondary">Add the kinds of sessions you offer to start booking them.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden" aria-label="Appointment types">
          {types.map((type) => (
            <li
              key={type._id}
              className={`flex items-center gap-3 pl-4 pr-2 py-1.5 bg-bg-card ${type.isActive ? "" : "bg-bg-page"}`}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: type.color }}
                aria-hidden
              />
              <div className="flex-1 min-w-0 py-1.5">
                <p className={`text-sm font-medium truncate ${type.isActive ? "text-text-primary" : "text-text-secondary"}`}>
                  {type.name}
                </p>
                <p className="text-xs text-text-secondary">
                  {formatDuration(type.durationMinutes)}
                  {!type.isActive && <span className="ml-2 font-medium">· Inactive</span>}
                </p>
              </div>
              <Switch
                checked={type.isActive}
                onChange={(v) => void toggleActive(type, v)}
                label={`${type.name} active`}
                disabled={togglingId === type._id}
              />
              <button type="button" onClick={() => openEditor(type)} className={iconBtnCls} aria-label={`Edit ${type.name}`}>
                <Pencil size={16} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setDeleting(type)}
                className={`${iconBtnCls} hover:!text-danger-strong`}
                aria-label={`Delete ${type.name}`}
              >
                <Trash2 size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <TypeEditor
        open={editorOpen}
        initial={editing}
        onClose={() => setEditorOpen(false)}
        onSaved={upsert}
      />

      <ConfirmationDialog
        open={!!deleting}
        onClose={() => !deleteBusy && setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        title={`Delete "${deleting?.name ?? ""}"?`}
        description="Appointments already booked keep their type name. To stop new bookings but keep the type, turn it off instead."
        confirmLabel="Delete"
        danger
        loading={deleteBusy}
      />
    </div>
  );
}
