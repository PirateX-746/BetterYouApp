"use client";

import { Page, PageHeader } from "@/components/common/PageLayout";
import { CardLink, EmptyBlock, SectionCard, StatCard } from "@/components/common/Dashboard";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useClientValue } from "@/hooks/useClientValue";
import { Badge } from "@/components/common/Badge";
import {
  Users,
  Calendar,
  Clock,
  AlertCircle,
  UserPlus,
  CalendarCheck,
  Pill,
  FileText,
  Loader2,
  Activity,
  CircleCheck,
} from "lucide-react";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

interface Appointment {
  id: string;
  title: string;
  start: string;
  end: string;
  patientId: string;
  status: string;
}

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  healthCondition?: string;
  createdAt?: string;
  lastVisit?: string;
  isActive?: boolean;
}

interface PatientMedication {
  _id: string;
  status: string;
  createdAt: string;
  patientId?: { _id: string; firstName: string; lastName: string };
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function startOfWeek(d: Date) {
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Mon start
  return startOfDay(new Date(d.setDate(diff)));
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_KEYS   = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

interface DaySchedule { isOpen: boolean; openTime: string; closeTime: string; }
type PracticeHours = Record<string, DaySchedule>;

const DEFAULT_HOURS: PracticeHours = {
  monday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
  tuesday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
  wednesday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
  thursday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
  friday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
  saturday: { isOpen: false, openTime: "09:00", closeTime: "17:00" },
  sunday: { isOpen: false, openTime: "09:00", closeTime: "17:00" },
};

function isPracticeOpen(hours: PracticeHours, now: Date): boolean {
  const key = DAY_KEYS[now.getDay()];
  const s = hours[key] ?? DEFAULT_HOURS[key];
  if (!s.isOpen) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = s.openTime.split(":").map(Number);
  const [ch, cm] = s.closeTime.split(":").map(Number);
  return cur >= oh * 60 + om && cur < ch * 60 + cm;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric", hour12: true,
    minute: "2-digit",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

function AppointmentStatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "confirmed") return <Badge tone="success">Confirmed</Badge>;
  if (s === "cancelled") return <Badge tone="danger">Cancelled</Badge>;
  return <Badge tone="warning">Scheduled</Badge>;
}

function initials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */

export default function DashboardPage() {
  const practitionerId = useLocalStorage("userId");

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientMedications, setPatientMedications] = useState<PatientMedication[]>([]);
  const [practiceHours, setPracticeHours] = useState<PracticeHours>(DEFAULT_HOURS);
  // Which practitioner the data on screen belongs to; loading until it matches.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const loading = !!practitionerId && loadedFor !== practitionerId;
  const doctorName = useClientValue(() => localStorage.getItem("name"), null) || "Doctor";

  useEffect(() => {
    if (!practitionerId) return;

    Promise.all([
      api
        .get<Appointment[]>(`/appointments/practitioner/${practitionerId}`)
        .then((r) => setAppointments(r.data ?? [])),
      api
        .get<Patient[]>("/patients")
        .then((r) => setPatients(r.data ?? [])),
      api
        .get<PatientMedication[]>("/patient-medications", {
          params: { practitionerId },
        })
        .then((r) => setPatientMedications(r.data ?? [])),
      api
        .get(`/practitioners/${practitionerId}`)
        .then((r) => {
          const ph = r.data?.practiceHours;
          if (ph && typeof ph === "object") setPracticeHours({ ...DEFAULT_HOURS, ...ph });
        })
        .catch(() => {}),
    ])
      .catch(console.error)
      .finally(() => setLoadedFor(practitionerId));
  }, [practitionerId]);

  /* ─── Derived stats ─── */
  const now = useMemo(() => new Date(), []);
  const todayStart = useMemo(() => startOfDay(new Date(now)), [now]);
  const todayEnd = useMemo(() => endOfDay(new Date(now)), [now]);
  const weekStart = useMemo(() => startOfWeek(new Date(now)), [now]);
  const monthStart = useMemo(() => startOfMonth(new Date(now)), [now]);

  const todayAppointments = useMemo(
    () =>
      appointments.filter((a) => {
        const t = new Date(a.start).getTime();
        return t >= todayStart.getTime() && t <= todayEnd.getTime();
      }),
    [appointments, todayStart, todayEnd],
  );

  const weekAppointments = useMemo(
    () =>
      appointments.filter(
        (a) => new Date(a.start).getTime() >= weekStart.getTime(),
      ),
    [appointments, weekStart],
  );

  const completedCount = useMemo(
    () =>
      // Sessions actually marked completed — not merely "confirmed" (that
      // counted every completed session as a miss and showed ~5%).
      appointments.filter(
        (a) =>
          a.status.toLowerCase() === "completed" &&
          new Date(a.start).getTime() < now.getTime(),
      ).length,
    [appointments, now],
  );

  const pastTotal = useMemo(
    () =>
      // Past sessions that were meant to happen: cancellations don't count
      // against the rate, no-shows do.
      appointments.filter(
        (a) =>
          new Date(a.start).getTime() < now.getTime() &&
          a.status.toLowerCase() !== "cancelled",
      ).length,
    [appointments, now],
  );

  const completionRate = pastTotal > 0 ? Math.round((completedCount / pastTotal) * 100) : 100;

  const medicationsThisMonth = useMemo(
    () =>
      patientMedications.filter(
        (p) => new Date(p.createdAt).getTime() >= monthStart.getTime(),
      ).length,
    [patientMedications, monthStart],
  );

  // Patient map for joining names into appointments
  const patientMap = useMemo(() => {
    const m = new Map<string, Patient>();
    patients.forEach((p) => m.set(p._id, p));
    return m;
  }, [patients]);

  // Weekly sessions bar chart data (Mon–Sun current week)
  const weeklyData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return { date: d, sessions: 0, label: DAY_LABELS[d.getDay()] };
    });
    weekAppointments.forEach((a) => {
      const aDate = new Date(a.start);
      const idx = days.findIndex(
        (d) =>
          d.date.getFullYear() === aDate.getFullYear() &&
          d.date.getMonth() === aDate.getMonth() &&
          d.date.getDate() === aDate.getDate(),
      );
      if (idx !== -1) days[idx].sessions++;
    });
    return days;
  }, [weekAppointments, weekStart]);

  const maxSessions = Math.max(...weeklyData.map((d) => d.sessions), 1);
  const todayDayLabel = DAY_LABELS[now.getDay()];

  // Recent patients (latest 5 by createdAt)
  const recentPatients = useMemo(
    () =>
      [...patients]
        .sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime(),
        )
        .slice(0, 5),
    [patients],
  );

  // Activity feed: blend recent appointments + recent patients
  const activityFeed = useMemo(() => {
    type FeedItem = {
      id: string;
      icon: typeof UserPlus;
      color: string;
      text: string;
      time: string;
    };
    const items: FeedItem[] = [];

    // Recent patients → "New patient registered"
    [...patients]
      .sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime(),
      )
      .slice(0, 3)
      .forEach((p) => {
        if (!p.createdAt) return;
        items.push({
          id: `p-${p._id}`,
          icon: UserPlus,
          color: "text-primary bg-primary/10",
          text: `New patient ${p.firstName} ${p.lastName} registered`,
          time: timeAgo(p.createdAt),
        });
      });

    // Recent medications → "Medication recorded"
    [...patientMedications]
      .slice(0, 2)
      .forEach((pm) => {
        const name = pm.patientId
          ? `${pm.patientId.firstName} ${pm.patientId.lastName}`
          : "a patient";
        items.push({
          id: `pm-${pm._id}`,
          icon: FileText,
          color: "text-warning-strong bg-warning/10",
          text: `Medication recorded for ${name}`,
          time: timeAgo(pm.createdAt),
        });
      });

    // Completed past appointments → "Session completed"
    appointments
      .filter(
        (a) =>
          a.status.toLowerCase() === "completed" &&
          new Date(a.start).getTime() < now.getTime(),
      )
      .slice(0, 2)
      .forEach((a) => {
        const p = patientMap.get(a.patientId);
        const name = p ? `${p.firstName} ${p.lastName}` : "patient";
        items.push({
          id: `ca-${a.id}`,
          icon: CalendarCheck,
          color: "text-success-strong bg-success/10",
          text: `Session completed — ${name}`,
          time: timeAgo(a.start),
        });
      });

    // Cancelled appointments
    appointments
      .filter((a) => a.status.toLowerCase() === "cancelled")
      .slice(0, 1)
      .forEach((a) => {
        const p = patientMap.get(a.patientId);
        const name = p ? `${p.firstName} ${p.lastName}` : "patient";
        items.push({
          id: `xa-${a.id}`,
          icon: AlertCircle,
          color: "text-danger-strong bg-danger/10",
          text: `Appointment cancelled — ${name}`,
          time: timeAgo(a.start),
        });
      });

    return items.slice(0, 6);
  }, [patients, patientMedications, appointments, patientMap, now]);

  const todayConfirmed = todayAppointments.filter(
    (a) => a.status.toLowerCase() === "confirmed",
  ).length;

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const dateStr = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-GB", {
    hour: "numeric", hour12: true,
    minute: "2-digit",
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  const activePatients = patients.filter((p) => p.isActive !== false).length;
  const open = isPracticeOpen(practiceHours, now);

  return (
    <Page>
      <PageHeader
        title={`${greeting}, Dr. ${doctorName}`}
        subtitle={dateStr}
        actions={
          <div className="flex items-center gap-2 h-10 px-3.5 bg-bg-card border border-border rounded-md text-sm">
            <span className={`w-2 h-2 rounded-full ${open ? "bg-success" : "bg-danger"}`} aria-hidden />
            <span className="font-medium text-text-primary tabular-nums">{timeStr}</span>
            <span className="text-text-secondary">· {open ? "Practice open" : "Practice closed"}</span>
          </div>
        }
      />

      {/* ── Headline metrics ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Today's appointments"
          value={todayAppointments.length}
          icon={Calendar}
          tone="primary"
          sub={`${todayConfirmed} confirmed`}
          href="/appointmentsPractitioner"
          featured
        />
        <StatCard
          label="This week"
          value={weekAppointments.length}
          icon={Clock}
          tone="teal"
          sub={`Avg. ${(weekAppointments.length / 5).toFixed(1)} per weekday`}
          href="/appointmentsPractitioner"
        />
        <StatCard
          label="Active patients"
          value={activePatients}
          icon={Users}
          tone="purple"
          sub={`of ${patients.length} total`}
          href="/patients"
        />
        <StatCard
          label="Completion rate"
          value={`${completionRate}%`}
          icon={CircleCheck}
          tone="success"
          trend={completionRate >= 80 ? { value: "On track", up: true } : { value: "Needs attention", up: false }}
          sub={`${completedCount} of ${pastTotal} past sessions`}
        />
      </div>

      {/* ── Totals strip ── */}
      <dl className="grid grid-cols-1 sm:grid-cols-3 bg-bg-card border border-border rounded-2xl divide-y sm:divide-y-0 sm:divide-x divide-border">
        {[
          { label: "Total patients", value: patients.length, icon: Users },
          { label: "Appointments, all time", value: appointments.length, icon: CalendarCheck },
          { label: "Medications recorded this month", value: medicationsThisMonth, icon: Pill },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-3 px-5 py-3.5">
            <Icon size={16} className="text-text-secondary shrink-0" aria-hidden />
            <dt className="text-sm text-text-secondary flex-1 min-w-0 truncate">{label}</dt>
            <dd className="text-base font-semibold text-text-primary tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      {/* ── Today + activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard
          className="lg:col-span-2"
          title="Today's schedule"
          subtitle={`${todayAppointments.length} appointment${todayAppointments.length === 1 ? "" : "s"} · ${todayConfirmed} confirmed`}
          action={<CardLink href="/appointmentsPractitioner">Open calendar</CardLink>}
        >
          {todayAppointments.length === 0 ? (
            <EmptyBlock icon={Calendar} title="No appointments today" hint="Your schedule is clear for today." />
          ) : (
            <ul className="divide-y divide-border">
              {[...todayAppointments]
                .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                .map((appt) => {
                  const p = patientMap.get(appt.patientId);
                  const name = p ? `${p.firstName} ${p.lastName}` : "Unknown patient";
                  const mins = Math.round((new Date(appt.end).getTime() - new Date(appt.start).getTime()) / 60000);
                  return (
                    <li key={appt.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="w-[4.75rem] shrink-0 whitespace-nowrap tabular-nums">
                        <p className="text-sm font-semibold text-text-primary tabular-nums">{formatTime(appt.start)}</p>
                        <p className="text-xs text-text-secondary">{mins} min</p>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0" aria-hidden>
                        {p ? initials(p.firstName, p.lastName) : "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{name}</p>
                        <p className="text-xs text-text-secondary truncate">{appt.title}</p>
                      </div>
                      <AppointmentStatusBadge status={appt.status} />
                    </li>
                  );
                })}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Recent activity">
          {activityFeed.length === 0 ? (
            <EmptyBlock icon={Activity} title="No recent activity" hint="New patients, sessions and medications show up here." />
          ) : (
            <ul className="px-5 py-2">
              {activityFeed.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id} className="flex items-start gap-3 py-2.5">
                    <span className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${item.color}`} aria-hidden>
                      <Icon size={15} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary leading-snug">{item.text}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{item.time}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* ── Week + new patients ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard
          title="This week"
          subtitle={`${weekAppointments.length} session${weekAppointments.length === 1 ? "" : "s"} scheduled`}
        >
          <div className="p-5">
            {/* Bars carry their count as text, so color/height is never the only cue. */}
            <ol className="flex items-end justify-between gap-2 h-40" aria-label="Sessions per day this week">
              {weeklyData.map((d) => {
                const isToday = d.label === todayDayLabel;
                return (
                  <li key={d.label} className="flex-1 h-full flex flex-col items-center justify-end gap-1.5">
                    <span className="text-xs font-medium text-text-primary tabular-nums">{d.sessions}</span>
                    <div
                      className={`w-full max-w-10 rounded-md ${isToday ? "bg-primary" : d.sessions === 0 ? "bg-border" : "bg-primary/35"}`}
                      style={{ height: `${Math.max(4, (d.sessions / maxSessions) * 100)}px` }}
                      aria-hidden
                    />
                    <span className={`text-xs ${isToday ? "font-semibold text-primary" : "text-text-secondary"}`}>
                      {d.label}
                      <span className="sr-only">: {d.sessions} sessions{isToday ? " (today)" : ""}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </SectionCard>

        <SectionCard
          className="lg:col-span-2"
          title="New patients"
          subtitle="Most recently added"
          action={<CardLink href="/patients">All patients</CardLink>}
        >
          {recentPatients.length === 0 ? (
            <EmptyBlock icon={Users} title="No patients yet" hint="Patients you add will appear here." />
          ) : (
            <ul className="divide-y divide-border">
              {recentPatients.map((p) => {
                const theirs = appointments.filter((a) => a.patientId === p._id);
                const last = [...theirs].sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())[0];
                return (
                  <li key={p._id}>
                    <Link
                      href={`/patients/${p._id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-bg-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
                    >
                      <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0" aria-hidden>
                        {initials(p.firstName, p.lastName)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{p.firstName} {p.lastName}</p>
                        <p className="text-xs text-text-secondary truncate">{p.healthCondition || "No condition recorded"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-text-primary tabular-nums">
                          {theirs.length} session{theirs.length === 1 ? "" : "s"}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {last ? `Last ${new Date(last.start).toLocaleDateString([], { month: "short", day: "numeric" })}` : "No visits yet"}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>
    </Page>
  );
}
