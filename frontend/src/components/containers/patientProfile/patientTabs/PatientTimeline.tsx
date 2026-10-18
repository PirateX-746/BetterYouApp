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
  History,
  ClipboardCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import toast from "react-hot-toast";

type EventType =
  | "appointment"
  | "document"
  | "medication"
  | "progress-note"
  | "follow-up"
  | "treatment-plan"
  | "session-assessment";

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
  medication: { icon: Pill, color: "text-teal-600", bg: "bg-teal-50", label: "Medication" },
  "progress-note": { icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", label: "Progress Note" },
  "follow-up": { icon: CalendarClock, color: "text-amber-600", bg: "bg-amber-50", label: "Follow-Up Note" },
  "treatment-plan": { icon: Target, color: "text-purple-600", bg: "bg-purple-50", label: "Treatment Plan" },
  "session-assessment": { icon: ClipboardCheck, color: "text-rose-600", bg: "bg-rose-50", label: "Session Assessment" },
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
      const [appts, docs, meds, pns, fus, tps, sas] = await Promise.allSettled([
        // These two are path-param routes on the backend (/appointments/patient/:id,
        // /documents/patient/:patientId) — not query-param — unlike the other four
        // below. Getting this wrong 404s silently under allSettled and the
        // appointment/document entries just vanish from the timeline.
        api.get(`/appointments/patient/${patientId}`),
        api.get(`/documents/patient/${patientId}`),
        api.get("/patient-medications", { params: { patientId } }),
        api.get("/progress-notes", { params: { patientId } }),
        api.get("/follow-up-notes", { params: { patientId } }),
        api.get("/treatment-plans", { params: { patientId } }),
        api.get(`/session-assessments/patient/${patientId}`),
      ]);

      const timeline: TimelineEvent[] = [];

      if (appts.status === "fulfilled") {
        // formatAppointment() (appointments.service.ts) returns { id, title, start, ... } —
        // not the Mongo-default { _id, appointmentType, startTime } shape the other five
        // resources use, which is why this needed its own field names.
        (appts.value.data ?? []).forEach((a: { id: string; title?: string; start: string; status?: string }) => {
          timeline.push({
            id: a.id,
            type: "appointment",
            title: a.title ?? "Appointment",
            subtitle: a.status ?? "scheduled",
            date: a.start,
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

      if (meds.status === "fulfilled") {
        (meds.value.data ?? []).forEach((m: { _id: string; medicationId?: { name?: string }; status?: string; createdAt: string }) => {
          timeline.push({
            id: m._id,
            type: "medication",
            title: m.medicationId?.name ?? "Medication",
            subtitle: m.status ?? "active",
            date: m.createdAt,
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

      if (sas.status === "fulfilled") {
        const LABEL: Record<string, string> = { draft: "Draft", ready_for_review: "Ready for review", submitted: "Submitted", amended: "Amended" };
        (sas.value.data ?? []).forEach(
          (s: {
            _id: string;
            status: string;
            submittedAt?: string | null;
            updatedAt: string;
            practitioner?: { firstName?: string; lastName?: string } | string | null;
            appointment?: { title?: string; start?: string } | null;
          }) => {
            const by = typeof s.practitioner === "object" && s.practitioner ? `Dr. ${s.practitioner.firstName ?? ""} ${s.practitioner.lastName ?? ""}`.trim() : null;
            timeline.push({
              id: s._id,
              type: "session-assessment",
              title: "Session Assessment",
              subtitle: [s.appointment?.title, LABEL[s.status] ?? s.status, by].filter(Boolean).join(" · "),
              date: s.appointment?.start ?? s.submittedAt ?? s.updatedAt,
            });
          },
        );
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
      <LoadingState />
    );
  }

  const filterOptions: { value: EventType | "all"; label: string }[] = [
    { value: "all", label: "All activity" },
    { value: "appointment", label: "Appointments" },
    { value: "session-assessment", label: "Assessments" },
    { value: "medication", label: "Medications" },
    { value: "progress-note", label: "Progress notes" },
    { value: "follow-up", label: "Follow-ups" },
    { value: "treatment-plan", label: "Treatment plans" },
    { value: "document", label: "Documents" },
  ];

  return (
    <div className="space-y-4">
      {/* One combined, chronological feed. A compact filter instead of a chip
          row — chips repeated the profile's tab names right above them. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">
          {filtered.length} {filtered.length === 1 ? "event" : "events"}, newest first
        </p>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          Show
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as EventType | "all")}
            className="h-10 px-3 text-sm bg-bg-card border border-border rounded-md text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 cursor-pointer"
          >
            {filterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={History}
          title="No events yet"
          description="Patient activities across appointments, notes, and medications will appear here."
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
