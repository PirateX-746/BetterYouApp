"use client";

import { useEffect, useState } from "react";
import { Clock, Save, Loader2, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

/* ─── Types ─── */

interface DaySchedule {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

type PracticeHours = Record<string, DaySchedule>;

/* ─── Constants ─── */

const DAYS = [
  { key: "monday",    label: "Monday" },
  { key: "tuesday",   label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday",  label: "Thursday" },
  { key: "friday",    label: "Friday" },
  { key: "saturday",  label: "Saturday" },
  { key: "sunday",    label: "Sunday" },
];

const DEFAULT_HOURS: PracticeHours = {
  monday:    { isOpen: true,  openTime: "09:00", closeTime: "17:00" },
  tuesday:   { isOpen: true,  openTime: "09:00", closeTime: "17:00" },
  wednesday: { isOpen: true,  openTime: "09:00", closeTime: "17:00" },
  thursday:  { isOpen: true,  openTime: "09:00", closeTime: "17:00" },
  friday:    { isOpen: true,  openTime: "09:00", closeTime: "17:00" },
  saturday:  { isOpen: false, openTime: "09:00", closeTime: "17:00" },
  sunday:    { isOpen: false, openTime: "09:00", closeTime: "17:00" },
};

/* ─── Helpers ─── */

function formatTime12(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr ?? "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

/* ─── Component ─── */

export default function PracticeHoursTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hours, setHours] = useState<PracticeHours>(DEFAULT_HOURS);
  const [saved, setSaved] = useState<PracticeHours>(DEFAULT_HOURS);

  const userId =
    typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    api
      .get(`/practitioners/${userId}`)
      .then((res) => {
        const ph = res.data?.practiceHours;
        if (ph && typeof ph === "object") {
          const merged: PracticeHours = { ...DEFAULT_HOURS };
          DAYS.forEach(({ key }) => {
            if (ph[key]) merged[key] = { ...DEFAULT_HOURS[key], ...ph[key] };
          });
          setHours(merged);
          setSaved(merged);
        }
      })
      .catch(() => toast.error("Failed to load practice hours"))
      .finally(() => setLoading(false));
  }, [userId]);

  const toggle = (day: string) => {
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], isOpen: !prev[day].isOpen },
    }));
  };

  const setTime = (day: string, field: "openTime" | "closeTime", value: string) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };

  const handleSave = async () => {
    if (!userId) return;

    // Validate: closeTime must be after openTime for open days
    for (const { key, label } of DAYS) {
      const d = hours[key];
      if (d.isOpen && d.openTime >= d.closeTime) {
        toast.error(`${label}: closing time must be after opening time`);
        return;
      }
    }

    setSaving(true);
    try {
      await api.patch(`/practitioners/${userId}`, { practiceHours: hours });
      setSaved(hours);
      toast.success("Practice hours saved");
    } catch {
      toast.error("Failed to save practice hours");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setHours(saved);
  };

  const isDirty = JSON.stringify(hours) !== JSON.stringify(saved);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  const openDays = DAYS.filter(({ key }) => hours[key].isOpen);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          Practice Hours
        </h2>
        <p className="text-sm text-text-secondary mt-0.5">
          Set the days and times your practice is open for appointments
        </p>
      </div>

      {/* Summary pill */}
      <div className="flex flex-wrap gap-2">
        {openDays.length === 0 ? (
          <span className="text-xs text-text-secondary italic">
            No days currently open
          </span>
        ) : (
          openDays.map(({ key, label }) => (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
            >
              <Clock size={11} />
              {label.slice(0, 3)} · {formatTime12(hours[key].openTime)} – {formatTime12(hours[key].closeTime)}
            </span>
          ))
        )}
      </div>

      {/* Day rows */}
      <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
        {DAYS.map(({ key, label }) => {
          const day = hours[key];
          return (
            <div
              key={key}
              className={`flex items-center gap-4 px-4 py-3.5 transition-colors ${
                day.isOpen ? "bg-bg-card" : "bg-bg-page"
              }`}
            >
              {/* Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={day.isOpen}
                onClick={() => toggle(key)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  day.isOpen ? "bg-primary" : "bg-border"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    day.isOpen ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>

              {/* Day label */}
              <span
                className={`w-24 text-sm font-medium shrink-0 ${
                  day.isOpen ? "text-text-primary" : "text-text-disabled"
                }`}
              >
                {label}
              </span>

              {/* Time inputs or closed badge */}
              {day.isOpen ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={day.openTime}
                    onChange={(e) => setTime(key, "openTime", e.target.value)}
                    className="h-8 px-2.5 text-sm rounded-lg border border-border bg-bg-page text-text-primary focus:outline-none focus:border-primary transition-colors"
                  />
                  <span className="text-xs text-text-disabled shrink-0">to</span>
                  <input
                    type="time"
                    value={day.closeTime}
                    onChange={(e) => setTime(key, "closeTime", e.target.value)}
                    className="h-8 px-2.5 text-sm rounded-lg border border-border bg-bg-page text-text-primary focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              ) : (
                <span className="text-xs font-medium text-text-disabled bg-bg-hover px-2.5 py-1 rounded-full">
                  Closed
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-text-secondary">
          {openDays.length} day{openDays.length !== 1 ? "s" : ""} open per week
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={!isDirty || saving}
          >
            <RotateCcw size={14} className="mr-1.5" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!isDirty || saving}>
            {saving ? (
              <Loader2 size={14} className="animate-spin mr-1.5" />
            ) : (
              <Save size={14} className="mr-1.5" />
            )}
            {saving ? "Saving…" : "Save Hours"}
          </Button>
        </div>
      </div>
    </div>
  );
}
