"use client";

import { api } from "@/lib/api";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Clock3,
  AlertCircle,
  ClipboardList,
  ClipboardCheck,
} from "lucide-react";
import Link from "next/link";

type Appointment = {
  _id?: string;
  id?: string;
  title: string;
  patientId: string;
  start: string;
  end: string;
  status: string;
  notes?: string;
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; dot: string; Icon: React.ElementType }
> = {
  scheduled:   { label: "Scheduled",  color: "text-text-secondary", dot: "bg-text-disabled", Icon: Clock3 },
  confirmed:   { label: "Confirmed",  color: "text-emerald-600",    dot: "bg-emerald-500",    Icon: CheckCircle2 },
  checked_in:  { label: "Checked In", color: "text-teal",           dot: "bg-teal",           Icon: CheckCircle2 },
  in_progress: { label: "Ongoing",    color: "text-warning-strong",        dot: "bg-warning",        Icon: Clock3 },
  completed:   { label: "Completed",  color: "text-blue-600",       dot: "bg-blue-500",       Icon: CheckCircle2 },
  no_show:     { label: "No Show",    color: "text-purple",         dot: "bg-purple",         Icon: XCircle },
  cancelled:   { label: "Cancelled",  color: "text-red-500",        dot: "bg-red-400",        Icon: XCircle },
  pending:     { label: "Pending",    color: "text-amber-600",      dot: "bg-amber-400",      Icon: Clock3 },
};

function getStatus(raw: string) {
  const key = raw.replace(/"/g, "").toLowerCase();
  return (
    STATUS_CONFIG[key] ?? {
      label: raw,
      color: "text-text-secondary",
      dot: "bg-text-disabled",
      Icon: AlertCircle,
    }
  );
}

function groupByMonth(appointments: Appointment[]) {
  const groups: Record<string, Appointment[]> = {};
  appointments.forEach((a) => {
    const d = new Date(a.start);
    const key = d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  });
  return groups;
}

export default function AppointmentHistory() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [assessedIds, setAssessedIds] = useState<Set<string>>(new Set());
  const params = useParams();
  const patientId = params?.id as string;

  const refreshAssessed = () => {
    if (!patientId) return;
    api
      .get(`/session-assessments/patient/${patientId}`)
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : [];
        setAssessedIds(
          new Set(
            rows
              .map((r: { appointment?: { _id?: string } | string | null }) =>
                typeof r.appointment === "string" ? r.appointment : r.appointment?._id,
              )
              .filter((id: string | undefined): id is string => !!id),
          ),
        );
      })
      .catch(() => setAssessedIds(new Set()));
  };

  useEffect(() => {
    if (!patientId) return;
    api
      .get(`/appointments/patient/${patientId}`)
      .then((res) => {
        const data = res.data;
        setAppointments(
          Array.isArray(data)
            ? data
            : Array.isArray(data?.data)
            ? data.data
            : [],
        );
      })
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
    refreshAssessed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  if (loading) {
    return (
      <LoadingState />
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Calendar size={32} className="text-text-disabled" />
        <p className="text-sm text-text-secondary">No appointments recorded</p>
      </div>
    );
  }

  const sorted = [...appointments].sort(
    (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime(),
  );
  const groups = groupByMonth(sorted);

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([month, appts]) => (
        <div key={month}>
          {/* Month header */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-widest">
              {month}
            </span>
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-text-disabled">{appts.length}</span>
          </div>

          {/* Timeline */}
          <div className="relative pl-6">
            {/* Vertical connecting line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

            <div className="space-y-3">
              {appts.map((appt, i) => {
                const start = new Date(appt.start);
                const end = new Date(appt.end);
                const { label, color, dot, Icon } = getStatus(appt.status);
                const key = appt._id ?? appt.id ?? String(i);

                return (
                  <div key={key} className="relative flex gap-4 group">
                    {/* Dot on the timeline */}
                    <div
                      className={`absolute -left-6 top-[14px] w-3.5 h-3.5 rounded-full border-2 border-bg-card ${dot} shrink-0 z-10 transition-transform group-hover:scale-110`}
                    />

                    {/* Card */}
                    <div className="flex-1 bg-bg-page border border-border rounded-2xl px-4 py-3 hover:border-primary/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text-primary truncate">
                            {appt.title}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                            <span className="flex items-center gap-1 text-xs text-text-secondary">
                              <Calendar size={11} className="opacity-60" />
                              {start.toLocaleDateString(undefined, {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-text-secondary">
                              <Clock size={11} className="opacity-60" />
                              {start.toLocaleTimeString([], {
                                hour: "numeric", hour12: true,
                                minute: "2-digit",
                              })}
                              {" – "}
                              {end.toLocaleTimeString([], {
                                hour: "numeric", hour12: true,
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          {appt.notes && (
                            <p className="text-xs text-text-secondary mt-1.5 italic line-clamp-1">
                              {appt.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className={`flex items-center gap-1 text-[11px] font-medium mt-0.5 ${color}`}>
                            <Icon size={12} />
                            {label}
                          </span>
                          {appt.status.toLowerCase() === "completed" && key && (
                            <Link
                              href={`/assessments?appointment=${key}`}
                              className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full border transition ${
                                assessedIds.has(key)
                                  ? "border-primary/30 text-primary hover:bg-primary/5"
                                  : "border-border text-text-secondary hover:bg-bg-hover"
                              }`}
                            >
                              {assessedIds.has(key) ? (
                                <ClipboardCheck size={11} />
                              ) : (
                                <ClipboardList size={11} />
                              )}
                              {assessedIds.has(key) ? "Assessment" : "Add Assessment"}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}

    </div>
  );
}
