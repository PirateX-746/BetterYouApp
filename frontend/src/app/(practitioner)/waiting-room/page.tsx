"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { acquireSocket, releaseSocket } from "@/lib/useAppSocket";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  Loader2,
  RefreshCw,
  CalendarClock,
} from "lucide-react";
import ComingSoon from "@/components/containers/layout/ComingSoon";
import { Badge, type BadgeTone } from "@/components/common/Badge";
import { LoadingState } from "@/components/ui/loading-state";

const WAITING_ROOM_ENABLED = false;

/* ─── Types ─── */

interface WaitingPatient {
  id: string;
  patientId: string;
  patientName: string;
  title: string;
  start: string;
  end: string;
  status: string;
  checkedInAt: string | null;
}

/* ─── Helpers ─── */

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric", hour12: true,
    minute: "2-digit",
  });
}

function useWaitTimer(checkedInAt: string | null): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!checkedInAt) return "—";
  const diff = Math.floor((now - new Date(checkedInAt).getTime()) / 60_000);
  if (diff < 1) return "< 1 min";
  if (diff < 60) return `${diff} min`;
  return `${Math.floor(diff / 60)}h ${diff % 60}m`;
}

const STATUS_STYLES: Record<string, { label: string; tone: BadgeTone }> = {
  checked_in:  { label: "Waiting",    tone: "primary" },
  in_progress: { label: "In Session", tone: "warning" },
};

/* ─── Row component ─── */

function PatientRow({
  patient,
  onAction,
  updating,
}: {
  patient: WaitingPatient;
  onAction: (id: string, status: string) => void;
  updating: string | null;
}) {
  const router = useRouter();
  const waitTime = useWaitTimer(patient.checkedInAt);
  const style = STATUS_STYLES[patient.status] ?? { label: patient.status, tone: "neutral" as BadgeTone };
  const isUpdating = updating === patient.id;

  return (
    <tr className="hover:bg-bg-hover transition-colors">
      {/* Patient */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center text-xs font-bold shrink-0">
            {patient.patientName
              .split(" ")
              .map((w) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">
              {patient.patientName}
            </p>
            <p className="text-xs text-text-secondary">{patient.title}</p>
          </div>
        </div>
      </td>

      {/* Booked time */}
      <td className="px-4 py-3.5 text-sm text-text-secondary">
        {formatTime(patient.start)}
      </td>

      {/* Arrived */}
      <td className="px-4 py-3.5 text-sm text-text-secondary">
        {patient.checkedInAt ? formatTime(patient.checkedInAt) : "—"}
      </td>

      {/* Wait */}
      <td className="px-4 py-3.5">
        <span
          className={`text-sm font-medium ${
            waitTime !== "—" && parseInt(waitTime) >= 15
              ? "text-danger-strong"
              : "text-text-primary"
          }`}
        >
          {waitTime}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3.5">
        <Badge tone={style.tone}>{style.label}</Badge>
      </td>

      {/* Actions */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          {patient.status === "checked_in" && (
            <button
              onClick={() => onAction(patient.id, "in_progress")}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover transition disabled:opacity-50"
              title="Start Session"
            >
              {isUpdating ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Play size={12} />
              )}
              Start
            </button>
          )}
          {patient.status === "in_progress" && (
            <button
              onClick={() => onAction(patient.id, "completed")}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-success text-white text-xs font-medium rounded-lg hover:bg-success/90 transition disabled:opacity-50"
              title="Mark Completed"
            >
              {isUpdating ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <CheckCircle2 size={12} />
              )}
              Done
            </button>
          )}
          <button
            onClick={() => onAction(patient.id, "no_show")}
            disabled={isUpdating || patient.status === "in_progress"}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-danger/40 text-danger-strong text-xs font-medium rounded-lg hover:bg-danger/5 transition disabled:opacity-30 disabled:cursor-not-allowed"
            title="Mark No Show"
          >
            <XCircle size={12} />
            No Show
          </button>
          <button
            onClick={() => router.push(`/patients/${patient.patientId}`)}
            className="text-xs text-primary hover:underline px-1"
          >
            Profile
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ─── Page ─── */

export default function WaitingRoomPage() {
  if (!WAITING_ROOM_ENABLED) {
    return (
      <ComingSoon
        icon={Users}
        title="Waiting Room"
        description="Live check-ins and session queueing for your patients are on the way."
      />
    );
  }
  return <WaitingRoomPageImpl />;
}

function WaitingRoomPageImpl() {
  const practitionerId = useLocalStorage("userId");
  const [patients, setPatients] = useState<WaitingPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const socketRef = useRef<ReturnType<typeof acquireSocket> | null>(null);

  const fetchWaitingRoom = useCallback(async () => {
    if (!practitionerId) return;
    try {
      const res = await api.get(`/appointments/waiting-room/${practitionerId}`);
      setPatients(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load waiting room");
    } finally {
      setLoading(false);
    }
  }, [practitionerId]);

  // Initial load
  useEffect(() => {
    fetchWaitingRoom();
  }, [fetchWaitingRoom]);

  // Real-time: refresh on patientCheckedIn or appointmentUpdated
  useEffect(() => {
    if (!practitionerId) return;
    const socket = acquireSocket({ practitionerId });
    socketRef.current = socket;

    const handlePatientCheckedIn = () => fetchWaitingRoom();
    const handleAppointmentUpdated = () => fetchWaitingRoom();
    socket.on("patientCheckedIn", handlePatientCheckedIn);
    socket.on("appointmentUpdated", handleAppointmentUpdated);

    return () => {
      socket.off("patientCheckedIn", handlePatientCheckedIn);
      socket.off("appointmentUpdated", handleAppointmentUpdated);
      releaseSocket({ practitionerId });
      socketRef.current = null;
    };
  }, [practitionerId, fetchWaitingRoom]);

  const handleAction = async (appointmentId: string, status: string) => {
    setUpdating(appointmentId);
    try {
      await api.patch(`/appointments/${appointmentId}/status`, { status });
      await fetchWaitingRoom();
      const labels: Record<string, string> = {
        in_progress: "Session started",
        completed: "Session completed",
        no_show: "Marked as no show",
      };
      toast.success(labels[status] ?? "Updated");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdating(null);
    }
  };

  const waitingCount = patients.filter((p) => p.status === "checked_in").length;
  const inSessionCount = patients.filter((p) => p.status === "in_progress").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <Users size={20} className="text-primary" />
            Waiting Room
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Today&apos;s check-ins — live updates
          </p>
        </div>
        <button
          onClick={fetchWaitingRoom}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-text-secondary border border-border rounded-xl hover:bg-bg-hover transition"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Clock size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{waitingCount}</p>
            <p className="text-xs text-text-secondary">Waiting</p>
          </div>
        </div>
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
            <Play size={18} className="text-warning-strong" />
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{inSessionCount}</p>
            <p className="text-xs text-text-secondary">In Session</p>
          </div>
        </div>
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} className="text-success-strong" />
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{patients.length}</p>
            <p className="text-xs text-text-secondary">Total Today</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <LoadingState size="lg" />
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-disabled">
            <CalendarClock size={36} />
            <p className="text-sm font-medium text-text-secondary">
              No patients in the waiting room
            </p>
            <p className="text-xs text-center">
              Patients will appear here once they check in for today&apos;s appointments.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-bg-page">
                  {["Patient", "Booked", "Arrived", "Wait", "Status", "Actions"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {patients.map((p) => (
                  <PatientRow
                    key={p.id}
                    patient={p}
                    onAction={handleAction}
                    updating={updating}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
