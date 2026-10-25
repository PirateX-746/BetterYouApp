"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  CalendarCheck,
  FileText,
  Pill,
  TrendingUp,
  Target,
  ClipboardCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { LoadingState } from "@/components/ui/loading-state";
import { Card, CardHeader } from "@/components/common/Card";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

type EventType =
  | "appointment"
  | "document"
  | "medication"
  | "progress-note"
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
  appointment: { icon: CalendarCheck, color: "text-primary-strong", bg: "bg-primary/10", label: "Appointment" },
  document: { icon: FileText, color: "text-purple-strong", bg: "bg-purple-light", label: "Document" },
  medication: { icon: Pill, color: "text-teal-strong", bg: "bg-teal-light", label: "Medication" },
  "progress-note": { icon: TrendingUp, color: "text-success-strong", bg: "bg-success-light", label: "Session note" },
  "treatment-plan": { icon: Target, color: "text-warning-strong", bg: "bg-warning-light", label: "Treatment plan" },
  "session-assessment": { icon: ClipboardCheck, color: "text-text-primary", bg: "bg-bg-hover", label: "Assessment" },
};

const PREVIEW = 6;

/**
 * Recent activity — the patient's whole history (appointments, notes,
 * assessments, documents, medications, plans) as one newest-first feed.
 * Lives on the Dashboard tab: the latest few by default, "Show all" expands
 * the full month-grouped history with a filter in place. (Replaces the old
 * separate Timeline tab, which duplicated the dashboard's purpose.)
 */
export default function RecentActivity() {
  const [expanded, setExpanded] = useState(false);
  const params = useParams();
  const patientId = params?.id as string;

  // null until loaded — loading is derived, not a second piece of state.
  const [loaded, setEvents] = useState<TimelineEvent[] | null>(null);
  const loading = loaded === null;
  /** When the feed was loaded — the line between "upcoming" and "recent". */
  const [loadedAt, setLoadedAt] = useState(0);
  const events = loaded ?? [];
  const [filter, setFilter] = useState<EventType | "all">("all");

  const fetchAll = useCallback(async (): Promise<TimelineEvent[]> => {
    if (!patientId) return [];
    try {
      const [appts, docs, meds, pns, tps, sas] = await Promise.allSettled([
        // These two are path-param routes on the backend (/appointments/patient/:id,
        // /documents/patient/:patientId) — not query-param — unlike the other four
        // below. Getting this wrong 404s silently under allSettled and the
        // appointment/document entries just vanish from the timeline.
        api.get(`/appointments/patient/${patientId}`),
        api.get(`/documents/patient/${patientId}`),
        api.get("/patient-medications", { params: { patientId } }),
        api.get("/progress-notes", { params: { patientId } }),
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
        // Session notes now carry the follow-up plan (follow-up notes were merged in).
        (pns.value.data ?? []).forEach((n: { _id: string; title: string; progressScore?: number; followUpDate?: string; sessionDate: string }) => {
          const parts = [
            n.progressScore != null ? `Score: ${n.progressScore}/10` : null,
            n.followUpDate ? `Follow-up: ${new Date(n.followUpDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : null,
          ].filter(Boolean);
          timeline.push({
            id: n._id,
            type: "progress-note",
            title: n.title,
            subtitle: parts.length ? parts.join(" · ") : "Session recorded",
            date: n.sessionDate,
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
      return timeline;
    } catch {
      toast.error("Failed to load recent activity");
      return [];
    }
  }, [patientId]);

  useEffect(() => {
    let cancelled = false;
    fetchAll().then((r) => {
      if (cancelled) return;
      setLoadedAt(Date.now());
      setEvents(r);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchAll]);

  const filtered = filter === "all" ? events : events.filter((e) => e.type === filter);
  // Future-dated items (booked appointments) sit at the top of the timeline,
  // soonest first, so the next visit is the first thing you see.
  const upcoming = events.filter((e) => new Date(e.date).getTime() > loadedAt).reverse().slice(0, 2);
  const past = events.filter((e) => new Date(e.date).getTime() <= loadedAt).slice(0, PREVIEW);
  const shown = expanded ? filtered : [...upcoming, ...past];

  // One timeline node per calendar day, in display order.
  const days: { key: string; date: Date; items: TimelineEvent[] }[] = [];
  for (const e of shown) {
    const d = new Date(e.date);
    const key = d.toDateString();
    const last = days[days.length - 1];
    if (last && last.key === key) last.items.push(e);
    else days.push({ key, date: d, items: [e] });
  }

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOfDay(new Date(loadedAt || 0));
  const dayLabel = (d: Date) => {
    const diff = Math.round((startOfDay(d) - today) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  };
  const hasTime = (d: Date) => d.getHours() !== 0 || d.getMinutes() !== 0;

  const filterOptions: { value: EventType | "all"; label: string }[] = [
    { value: "all", label: "Everything" },
    { value: "appointment", label: "Appointments" },
    { value: "session-assessment", label: "Assessments" },
    { value: "medication", label: "Medications" },
    { value: "progress-note", label: "Session notes" },
    { value: "treatment-plan", label: "Treatment plans" },
    { value: "document", label: "Documents" },
  ];

  return (
    <Card>
      <CardHeader
        title="Timeline"
        description={expanded ? "Full history, newest first" : "Upcoming and recent, by date"}
        actions={
          expanded ? (
            <label className="flex items-center gap-2 text-footnote text-text-secondary">
              <span className="sr-only sm:not-sr-only">Show</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as EventType | "all")}
                className="h-8 pl-2.5 text-footnote bg-bg-card border border-border rounded-md text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                {filterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          ) : undefined
        }
      />
      <div className="px-5 pb-4">
        {loading ? (
          <LoadingState />
        ) : events.length === 0 ? (
          <p className="text-body text-text-secondary pb-1">
            Appointments, notes, assessments, documents and medications will appear here as they&apos;re recorded.
          </p>
        ) : days.length === 0 ? (
          <p className="text-body text-text-secondary py-4">Nothing of this type yet.</p>
        ) : (
          <ol className="pt-1" aria-label="Patient timeline">
            {days.map((day, i) => {
              const future = startOfDay(day.date) > today;
              const isToday = startOfDay(day.date) === today;
              const isLast = i === days.length - 1;
              return (
                <li key={day.key} className={`relative pl-8 ${isLast ? "" : "pb-5"}`}>
                  {/* The line runs from this node to the next one. */}
                  {!isLast && <span className="absolute left-[7px] top-5 bottom-0 w-0.5 rounded-full bg-border-light" aria-hidden />}
                  <span
                    className={`absolute left-0 top-[3px] size-4 rounded-full border-[3px] ${
                      isToday
                        ? "border-primary bg-bg-card shadow-[0_0_0_4px] shadow-primary/15"
                        : future
                          ? "border-primary bg-primary"
                          : "border-border bg-bg-card"
                    }`}
                    aria-hidden
                  />
                  <h3 className="flex flex-wrap items-baseline gap-x-2 text-body">
                    <span className={`font-semibold ${future || isToday ? "text-primary-strong" : "text-text-primary"}`}>{dayLabel(day.date)}</span>
                    <span className="text-footnote text-text-secondary">
                      {day.date.toLocaleDateString(undefined, { weekday: "long" })}
                    </span>
                    {future && <span className="text-eyebrow font-semibold uppercase text-primary-strong">Upcoming</span>}
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {day.items.map((e) => {
                      const cfg = TYPE_CONFIG[e.type];
                      const Icon = cfg.icon;
                      const d = new Date(e.date);
                      return (
                        <li
                          key={`${e.type}-${e.id}`}
                          className={`flex items-start gap-3 rounded-xl px-3 py-2.5 ${future ? "bg-primary-subtle ring-1 ring-primary/15" : "bg-bg-subtle"}`}
                        >
                          <span className={`size-8 rounded-lg grid place-items-center shrink-0 ${cfg.bg}`} aria-hidden>
                            <Icon size={15} className={cfg.color} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-body font-medium text-text-primary truncate">{e.title}</p>
                            <p className="text-footnote text-text-secondary truncate first-letter:uppercase">
                              <span className={`font-medium ${cfg.color}`}>{cfg.label}</span>
                              {e.subtitle && ` · ${e.subtitle}`}
                            </p>
                          </div>
                          {hasTime(d) && (
                            <time dateTime={e.date} className="text-footnote font-medium text-text-secondary tabular-nums shrink-0 pt-0.5">
                              {d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })}
                            </time>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ol>
        )}

        {!loading && events.length > upcoming.length + past.length && (
          <div className="mt-4 pt-2 border-t border-border-light">
            <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
              {expanded ? "Show less" : `Show full timeline (${events.length})`}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
