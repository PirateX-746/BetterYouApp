"use client";

import { useEffect, useState } from "react";
import { useAppointments } from "@/hooks/useAppointments";
import PatientBookingFlow from "./PatientBookingFlow";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import {
  Calendar,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  LogIn,
  Loader2,
} from "lucide-react";

export interface Practitioner {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  confirmed:    { label: "Confirmed",    className: "bg-success/10 text-success" },
  scheduled:    { label: "Scheduled",    className: "bg-primary/10 text-primary" },
  checked_in:   { label: "Checked In",   className: "bg-teal/10 text-teal" },
  in_progress:  { label: "In Progress",  className: "bg-warning/10 text-warning" },
  completed:    { label: "Completed",    className: "bg-success/10 text-success" },
  no_show:      { label: "No Show",      className: "bg-danger/10 text-danger" },
  cancelled:    { label: "Cancelled",    className: "bg-danger/10 text-danger" },
};

function statusConfig(status: string) {
  return (
    STATUS_CONFIG[status.toLowerCase()] ?? {
      label: status,
      className: "bg-bg-hover text-text-secondary",
    }
  );
}

function StatusIcon({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "confirmed" || s === "completed")
    return <CheckCircle size={14} className="text-success" />;
  if (s === "cancelled" || s === "no_show")
    return <XCircle size={14} className="text-danger" />;
  if (s === "checked_in")
    return <LogIn size={14} className="text-teal" />;
  return <Clock size={14} className="text-primary" />;
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const t = new Date();
  return (
    d.getUTCFullYear() === t.getUTCFullYear() &&
    d.getUTCMonth()    === t.getUTCMonth()    &&
    d.getUTCDate()     === t.getUTCDate()
  );
}

const CHECK_IN_ELIGIBLE = new Set(["scheduled", "confirmed"]);

export default function AppointmentsPage() {
  // ✅ Lazy init (NO useEffect, no lint error)
  const [patientId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("userId");
    }
    return null;
  });

  const { appointments, loading, refresh } = useAppointments(patientId);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [now, setNow] = useState<number>(() => Date.now());
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  // Clock update
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch practitioners
  useEffect(() => {
    const fetchPractitioners = async () => {
      try {
        const res = await api.get("/practitioners");
        setPractitioners(res.data || []);
      } catch {
        toast.error("Failed to load practitioners");
      }
    };

    fetchPractitioners();
  }, []);

  const handleCheckIn = async (appointmentId: string) => {
    if (!patientId) return;
    setCheckingInId(appointmentId);
    try {
      await api.patch(`/appointments/${appointmentId}/check-in`, { patientId });
      toast.success("You're checked in! Please take a seat.", { duration: 4000 });
      refresh();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? "Check-in failed");
    } finally {
      setCheckingInId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full px-0 py-2 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            My Appointments
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {appointments.length} total
          </p>
        </div>

        <button
          onClick={() => setBookingOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors shadow-sm active:scale-95"
        >
          <Plus size={16} />
          Book
        </button>
      </div>

      {/* Empty state */}
      {appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-bg-card border border-border flex items-center justify-center mb-4">
            <Calendar size={28} className="text-text-disabled" />
          </div>
          <p className="text-text-primary font-medium mb-1">
            No appointments yet
          </p>
          <p className="text-sm text-text-secondary mb-6">
            Book your first appointment to get started
          </p>

          <button
            onClick={() => setBookingOpen(true)}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors shadow-sm"
          >
            <Plus size={16} /> Book Appointment
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => {
            const cfg = statusConfig(appt.status);
            const startDate = new Date(appt.start);
            const isPast = startDate.getTime() < now;
            const todayAppt = isToday(appt.start);
            const canCheckIn =
              todayAppt && CHECK_IN_ELIGIBLE.has(appt.status.toLowerCase());
            const isCheckingIn = checkingInId === appt.id;

            return (
              <div
                key={appt.id}
                className={`bg-bg-card border rounded-xl p-4 transition-colors ${
                  todayAppt && canCheckIn
                    ? "border-primary/40 shadow-sm"
                    : "border-border hover:border-primary/30"
                } ${isPast && !todayAppt ? "opacity-60" : ""}`}
              >
                <div className="flex items-start gap-4">
                  {/* Date */}
                  <div className="shrink-0 w-12 text-center bg-primary/5 rounded-lg py-2">
                    <p className="text-[10px] text-text-secondary font-medium uppercase">
                      {startDate.toLocaleDateString([], { month: "short" })}
                    </p>
                    <p className="text-lg font-bold text-primary">
                      {startDate.getDate()}
                    </p>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{appt.title}</p>
                    <p className="text-xs text-text-secondary">
                      {startDate.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {todayAppt && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-primary">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Status */}
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${cfg.className}`}
                  >
                    <StatusIcon status={appt.status} />
                    {cfg.label}
                  </div>
                </div>

                {/* Check In button — only for today's eligible appointments */}
                {canCheckIn && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <button
                      disabled={isCheckingIn}
                      onClick={() => handleCheckIn(appt.id)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCheckingIn ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <LogIn size={15} />
                      )}
                      {isCheckingIn ? "Checking in…" : "Check In"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Modal */}
      {bookingOpen && (
        <PatientBookingFlow
          practitioners={practitioners}
          onClose={() => setBookingOpen(false)}
          onBookingComplete={() => {
            refresh();
            setBookingOpen(false);
          }}
        />
      )}
    </div>
  );
}