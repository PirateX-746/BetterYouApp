"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSocket } from "@/lib/socket";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import {
  Calendar,
  Plus,
  CheckCircle,
  Clock,
  TrendingUp,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useLocalStorage } from "@/hooks/useLocalStorage";

type Appointment = {
  id: string;
  title: string;
  start: string;
  end: string;
  practitionerId: string;
  patientId: string;
  status: string;
  createdAt?: string;
};

const HOURS_24 = 24 * 60 * 60 * 1000;
const HOURS_48 = 48 * 60 * 60 * 1000;
const HOURS_2 = 2 * 60 * 60 * 1000;

const QUOTES = [
  "Your health is your wealth. Every step forward counts.",
  "Progress, not perfection. You're doing great!",
  "Take care of your body — it's the only place you have to live.",
  "Small consistent actions lead to big changes.",
  "Invest in your wellness today for a better tomorrow.",
  "Your health journey is unique. Celebrate every win.",
];

export default function HomePage() {
  const userId = useLocalStorage("userId");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Stable random quote — computed once, not on every render
  const [quote] = useState(
    () => QUOTES[Math.floor(Math.random() * QUOTES.length)],
  );

  /* ── Fetch ── */
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchAppointments = async () => {
      try {
        const res = await api.get(`/appointments/patient/${userId}`);
        setAppointments(res.data || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load appointments");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();

    const s = createSocket({ patientId: userId });
    s.on("appointmentUpdated", (incoming: Appointment) => {
      setAppointments((prev) => {
        const exists = prev.find((a) => a.id === incoming.id);
        return exists
          ? prev.map((a) => (a.id === incoming.id ? incoming : a))
          : [incoming, ...prev];
      });
      toast.success("Appointment updated");
    });

    return () => {
      s.disconnect();
    };
  }, [userId]);

  /* ── Derived ── */
  const now = Date.now();

  const normalized = useMemo(
    () =>
      appointments.map((a) => ({
        ...a,
        normalizedStatus: a.status.toLowerCase(),
        startTime: new Date(a.start).getTime(),
        createdTime: a.createdAt ? new Date(a.createdAt).getTime() : 0,
      })),
    [appointments],
  );

  const upcoming = normalized
    .filter((a) => a.startTime > now)
    .sort((a, b) => a.startTime - b.startTime);
  const next = upcoming[0];
  const completedCount = normalized.filter(
    (a) => a.startTime <= now && a.normalizedStatus === "confirmed",
  ).length;
  const timeUntilNext = next ? next.startTime - now : 0;
  const timeSinceCreate = next ? now - next.createdTime : 0;
  const within24h = timeUntilNext > 0 && timeUntilNext <= HOURS_24;
  const canConfirm = next && within24h && next.normalizedStatus === "scheduled";

  /* ── Update ── */
  const updateStatus = useCallback(
    async (id: string, status: "CONFIRMED" | "CANCELLED") => {
      setUpdatingId(id);
      try {
        await api.put(`/appointments/${id}`, { status });
        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status } : a)),
        );
        toast.success(
          status === "CONFIRMED"
            ? "Appointment confirmed"
            : "Appointment cancelled",
        );
      } catch {
        toast.error("Failed to update appointment");
      } finally {
        setUpdatingId(null);
      }
    },
    [],
  );

  /* ── Auto-cancel ── */
  useEffect(() => {
    if (!next) return;
    const shouldAutoCancel =
      next.normalizedStatus === "scheduled" &&
      timeUntilNext <= HOURS_2 &&
      timeSinceCreate >= HOURS_48;
    if (shouldAutoCancel) {
      updateStatus(next.id, "CANCELLED");
      toast("Appointment auto-cancelled", { icon: "⚠️" });
    }
  }, [next, timeUntilNext, timeSinceCreate, updateStatus]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  const stats = [
    {
      label: "Total",
      value: appointments.length,
      icon: TrendingUp,
      color: "text-primary",
    },
    {
      label: "Upcoming",
      value: upcoming.length,
      icon: Clock,
      color: "text-warning",
    },
    {
      label: "Completed",
      value: completedCount,
      icon: CheckCircle,
      color: "text-success",
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-6">
      {/* Quote banner */}
      <div className="bg-primary/5 border border-primary/15 rounded-2xl px-4 py-4">
        <p className="text-sm font-medium text-primary leading-relaxed italic">
          &ldquo;{quote}&rdquo;
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-bg-card border border-border rounded-2xl p-3 sm:p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-text-secondary">{label}</p>
              <Icon size={14} className={color} />
            </div>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
          </div>
        ))}
      </div>

      {/* Next appointment */}
      <div className="bg-bg-card border border-border rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-4">
          <Calendar size={16} className="text-primary" />
          Next Appointment
        </h2>

        {!next ? (
          <div className="text-center py-6">
            <Calendar
              size={32}
              className="mx-auto text-text-secondary opacity-30 mb-3"
            />
            <p className="text-sm font-medium text-text-primary mb-1">
              No upcoming appointments
            </p>
            <p className="text-xs text-text-secondary mb-4">
              Book one to get started
            </p>
            <Link
              href="/patient/appointments"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition"
            >
              <Plus size={16} />
              Book Appointment
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
              <p className="font-semibold text-primary text-sm mb-2">
                {next.title}
              </p>
              <p className="text-xs text-text-secondary flex items-center gap-1.5">
                <Calendar size={12} className="opacity-60" />
                {new Date(next.startTime).toLocaleString()}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-text-secondary">Status:</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-success/10 text-success capitalize">
                  {next.normalizedStatus}
                </span>
              </div>
            </div>

            {canConfirm && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={updatingId === next.id}
                  onClick={() => updateStatus(next.id, "CONFIRMED")}
                  className="py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition disabled:opacity-50"
                >
                  {updatingId === next.id ? "Confirming…" : "Confirm"}
                </button>
                <button
                  disabled={updatingId === next.id}
                  onClick={() => updateStatus(next.id, "CANCELLED")}
                  className="py-2.5 border border-danger text-danger text-sm font-medium rounded-xl hover:bg-danger/5 transition disabled:opacity-50"
                >
                  {updatingId === next.id ? "Cancelling…" : "Cancel"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upcoming list */}
      {upcoming.length > 1 && (
        <div className="bg-bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
          <div className="px-4 py-3">
            <h2 className="text-sm font-semibold text-text-primary">
              Upcoming
            </h2>
          </div>
          {upcoming.slice(1, 4).map((appt) => (
            <div key={appt.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Calendar size={14} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {appt.title}
                </p>
                <p className="text-xs text-text-secondary">
                  {new Date(appt.startTime).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-bg-hover text-text-secondary capitalize shrink-0">
                {appt.normalizedStatus}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
