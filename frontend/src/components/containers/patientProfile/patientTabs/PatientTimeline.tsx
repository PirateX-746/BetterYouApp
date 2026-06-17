"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  CalendarCheck,
  FileText,
  Pill,
  TrendingUp,
  CalendarClock,
  Target,
  Loader2,
  History,
} from "lucide-react";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import toast from "react-hot-toast";

type EventType =
  | "appointment"
  | "document"
  | "prescription"
  | "progress-note"
  | "follow-up"
  | "treatment-plan";

interface TimelineEvent {
  id: string;
  type: EventType;
  title: string;
  subtitle: string;
  date: string;
}

const TYPE_CONFIG: Record<EventType, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  appointment: { icon: CalendarCheck, color: "text-primary", bg: "bg-primary/10", label: "Appointment" },
  document: { icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50", label: "Document" },
  prescription: { icon: Pill, color: "text-teal-600", bg: "bg-teal-50", label: "Prescription" },
  "progress-note": { icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", label: "Progress Note" },
  "follow-up": { icon: CalendarClock, color: "text-amber-600", bg: "bg-amber-50", label: "Follow-Up Note" },
  "treatment-plan": { icon: Target, color: "text-purple-600", bg: "bg-purple-50", label: "Treatment Plan" },
};

export default function PatientTimelineTab() {
  const params = useParams();
  const patientId = params?.id as string;

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EventType | "all">("all");

  const fetchAll = useCallback(async () => {
    if (!patientId) return;
    try {
      const [appts, docs, rxs, pns, fus, tps] = await Promise.allSettled([
        api.get("/appointments", { params: { patientId } }),
        api.get("/documents", { params: { patientId } }),
        api.get("/prescriptions", { params: { patientId } }),
        api.get("/progress-notes", { params: { patientId } }),
        api.get("/follow-up-notes", { params: { patientId } }),
        api.get("/treatment-plans", { params: { patientId } }),
      ]);

      const timeline: TimelineEvent[] = [];

      if (appts.status === "fulfilled") {
        (appts.value.data ?? []).forEach((a: { _id: string; appointmentType?: string; startTime: string; status?: string }) => {
          timeline.push({
            id: a._id,
            type: "appointment",
            title: a.appointmentType ?? "Appointment",
            subtitle: a.status ?? "scheduled",
            date: a.startTime,
          });
        });
      }

      if (docs.status === "fulfilled") {
        (docs.value.data ?? []).forEach((d: { _id: string; title: string; category?: string; createdAt: string }) => {
          timeline.push({
            id: d._id,
            type: "document",
            title: d.title,
            subtitle: d.category ?? "document",
            date: d.createdAt,
          });
        });
      }

      if (rxs.status === "fulfilled") {
        (rxs.value.data ?? []).forEach((r: { _id: string; diagnosis: string; status?: string; createdAt: string }) => {
          timeline.push({
            id: r._id,
            type: "prescription",
            title: r.diagnosis,
            subtitle: r.status ?? "active",
            date: r.createdAt,
          });
        });
      }

      if (pns.status === "fulfilled") {
        (pns.value.data ?? []).forEach((n: { _id: string; title: string; progressScore?: number; sessionDate: string }) => {
          timeline.push({
            id: n._id,
            type: "progress-note",
            title: n.title,
            subtitle: n.progressScore != null ? `Score: ${n.progressScore}/10` : "Progress recorded",
            date: n.sessionDate,
          });
        });
      }

      if (fus.status === "fulfilled") {
        (fus.value.data ?? []).forEach((f: { _id: string; title: string; followUpDate?: string; createdAt: string }) => {
          timeline.push({
            id: f._id,
            type: "follow-up",
            title: f.title,
            subtitle: f.followUpDate
              ? `Follow-up: ${new Date(f.followUpDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
              : "Follow-up note",
            date: f.createdAt,
          });
        });
      }

      if (tps.status === "fulfilled") {
        (tps.value.data ?? []).forEach((t: { _id: string; title: string; status?: string; startDate: string }) => {
          timeline.push({
            id: t._id,
            type: "treatment-plan",
            title: t.title,
            subtitle: t.status ?? "active",
            date: t.startDate,
          });
        });
      }

      timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEvents(timeline);
    } catch {
      toast.error("Failed to load timeline");
    }
  }, [patientId]);

  useEffect(() => {
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  const filtered = filter === "all" ? events : events.filter((e) => e.type === filter);

  const groupedByMonth: Record<string, TimelineEvent[]> = {};
  filtered.forEach((e) => {
    const key = new Date(e.date).toLocaleDateString("en-US", { year: "numeric", month: "long" });
    if (!groupedByMonth[key]) groupedByMonth[key] = [];
    groupedByMonth[key].push(e);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="animate-spin text-primary" size={22} />
      </div>
    );
  }

  const filterOptions: { value: EventType | "all"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "appointment", label: "Appointments" },
    { value: "prescription", label: "Prescriptions" },
    { value: "progress-note", label: "Progress Notes" },
    { value: "follow-up", label: "Follow-Ups" },
    { value: "treatment-plan", label: "Treatment Plans" },
    { value: "document", label: "Documents" },
  ];

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === opt.value
                ? "bg-primary text-white"
                : "bg-bg-light text-text-secondary hover:bg-bg-hover"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={History}
          title="No events yet"
          description="Patient activities across appointments, notes, and prescriptions will appear here."
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByMonth).map(([month, monthEvents]) => (
            <div key={month}>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">{month}</p>
              <div className="relative pl-5">
                {/* Vertical line */}
                <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />

                <div className="space-y-3">
                  {monthEvents.map((event) => {
                    const cfg = TYPE_CONFIG[event.type];
                    const Icon = cfg.icon;
                    return (
                      <div key={event.id} className="relative flex items-start gap-3">
                        {/* Dot */}
                        <div className={`absolute -left-3 w-2 h-2 rounded-full mt-1.5 ${cfg.bg} border-2 border-bg-card`} />

                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                          <Icon size={13} className={cfg.color} />
                        </div>

                        <div className="flex-1 min-w-0 bg-bg-card border border-border rounded-xl px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.color}`}>
                              {cfg.label}
                            </span>
                            <span className="text-[10px] text-text-secondary">
                              {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-text-primary mt-0.5 truncate">{event.title}</p>
                          <p className="text-xs text-text-secondary capitalize">{event.subtitle}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
