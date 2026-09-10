"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  UserPlus,
  CalendarCheck,
  Pill,
  FileText,
  ChevronRight,
  Dot,
  Loader2,
  Activity,
  Star,
} from "lucide-react";
import type { ReactNode } from "react";

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
    hour: "2-digit",
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

type StatCardProps = {
  label: string;
  value: string | number;
  icon: ReactNode;
  iconBg: string;
  trend?: { value: string; up: boolean };
  sub?: string;
};

function StatCard({ label, value, icon, iconBg, trend, sub }: StatCardProps) {
  return (
    <div className="bg-bg-card border border-border rounded-2xl p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
        >
          {icon}
        </div>
        {trend && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${
              trend.up
                ? "bg-success/10 text-success"
                : "bg-danger/10 text-danger"
            }`}
          >
            {trend.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {trend.value}
          </span>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-text-primary leading-none">
          {value}
        </div>
        <div className="text-sm text-text-secondary mt-1">{label}</div>
        {sub && <div className="text-xs text-text-disabled mt-1">{sub}</div>}
      </div>
    </div>
  );
}

function AppointmentStatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "confirmed")
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
        Confirmed
      </span>
    );
  if (s === "cancelled")
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-danger/10 text-danger">
        Cancelled
      </span>
    );
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
      Scheduled
    </span>
  );
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
  const [loading, setLoading] = useState(true);
  const [doctorName, setDoctorName] = useState("Doctor");

  // Read name from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("name");
    if (stored) setDoctorName(stored);
  }, []);

  useEffect(() => {
    if (!practitionerId) {
      setLoading(false);
      return;
    }

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
      .finally(() => setLoading(false));
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
      appointments.filter(
        (a) =>
          a.status.toLowerCase() === "confirmed" &&
          new Date(a.start).getTime() < now.getTime(),
      ).length,
    [appointments, now],
  );

  const pastTotal = useMemo(
    () =>
      appointments.filter((a) => new Date(a.start).getTime() < now.getTime())
        .length,
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
          color: "text-warning bg-warning/10",
          text: `Medication recorded for ${name}`,
          time: timeAgo(pm.createdAt),
        });
      });

    // Confirmed past appointments → "Session completed"
    appointments
      .filter(
        (a) =>
          a.status.toLowerCase() === "confirmed" &&
          new Date(a.start).getTime() < now.getTime(),
      )
      .slice(0, 2)
      .forEach((a) => {
        const p = patientMap.get(a.patientId);
        const name = p ? `${p.firstName} ${p.lastName}` : "patient";
        items.push({
          id: `ca-${a.id}`,
          icon: CalendarCheck,
          color: "text-success bg-success/10",
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
          color: "text-danger bg-danger/10",
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
    hour: "2-digit",
    minute: "2-digit",
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            {greeting}, Dr. {doctorName} 👋
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">{dateStr}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-bg-card border border-border rounded-xl">
          <Activity size={15} className={isPracticeOpen(practiceHours, now) ? "text-success" : "text-text-disabled"} />
          <span className="text-sm font-medium text-text-primary">
            {timeStr}
          </span>
          <Dot
            className={isPracticeOpen(practiceHours, now) ? "text-success animate-pulse" : "text-danger"}
            size={20}
          />
          <span className="text-xs text-text-secondary">
            {isPracticeOpen(practiceHours, now) ? "Practice open" : "Practice closed"}
          </span>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Patients"
          value={patients.length}
          iconBg="bg-primary/10 text-primary"
          icon={<Users size={20} />}
        />
        <StatCard
          label="Today's Appointments"
          value={todayAppointments.length}
          iconBg="bg-success/10 text-success"
          icon={<Calendar size={20} />}
          sub={`${todayConfirmed} confirmed`}
        />
        <StatCard
          label="This Week"
          value={weekAppointments.length}
          iconBg="bg-warning/10 text-warning"
          icon={<Clock size={20} />}
          sub={`Avg. ${(weekAppointments.length / 5).toFixed(1)}/day`}
        />
        <StatCard
          label="Completion Rate"
          value={`${completionRate}%`}
          iconBg="bg-purple-500/10 text-purple-500"
          icon={<CheckCircle2 size={20} />}
          trend={
            completionRate >= 80
              ? { value: "On track", up: true }
              : { value: "Needs attention", up: false }
          }
          sub={`${completedCount} completed`}
        />
      </div>

      {/* ── Secondary stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Patients"
          value={patients.filter((p) => p.isActive !== false).length}
          iconBg="bg-primary/10 text-primary"
          icon={<Users size={20} />}
          sub="Currently under care"
        />
        <StatCard
          label="Avg. Session Rating"
          value="—"
          iconBg="bg-warning/10 text-warning"
          icon={<Star size={20} />}
          sub="No ratings yet"
        />
        <StatCard
          label="Medications"
          value={medicationsThisMonth}
          iconBg="bg-success/10 text-success"
          icon={<Pill size={20} />}
          sub="This month"
        />
        <StatCard
          label="Total Appointments"
          value={appointments.length}
          iconBg="bg-purple-500/10 text-purple-500"
          icon={<CalendarCheck size={20} />}
          sub="All time"
        />
      </div>

      {/* ── Main grid: today's schedule + activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's schedule */}
        <div className="lg:col-span-2 bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">
                Today&apos;s Schedule
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                {todayAppointments.length} appointments · {todayConfirmed}{" "}
                confirmed
              </p>
            </div>
            <Link
              href="/appointmentsPractitioner"
              className="text-xs text-primary flex items-center gap-1 hover:underline"
            >
              View all <ChevronRight size={13} />
            </Link>
          </div>

          {todayAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-5">
              <Calendar size={28} className="text-text-disabled mb-3" />
              <p className="text-sm font-medium text-text-primary">
                No appointments today
              </p>
              <p className="text-xs text-text-secondary mt-1">
                Your schedule is clear for today.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {todayAppointments
                .sort(
                  (a, b) =>
                    new Date(a.start).getTime() - new Date(b.start).getTime(),
                )
                .map((appt) => {
                  const p = patientMap.get(appt.patientId);
                  const name = p
                    ? `${p.firstName} ${p.lastName}`
                    : "Unknown patient";
                  const avatarText = p
                    ? initials(p.firstName, p.lastName)
                    : "??";

                  return (
                    <div
                      key={appt.id}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-bg-hover transition-colors"
                    >
                      <div className="w-12 shrink-0 text-center">
                        <p className="text-sm font-semibold text-text-primary">
                          {formatTime(appt.start)}
                        </p>
                        <p className="text-xs text-text-disabled">
                          {Math.round(
                            (new Date(appt.end).getTime() -
                              new Date(appt.start).getTime()) /
                              60000,
                          )}
                          m
                        </p>
                      </div>
                      <div className="w-px h-10 bg-border shrink-0" />
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-primary/10 text-primary">
                        {avatarText}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {name}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {appt.title}
                        </p>
                      </div>
                      <AppointmentStatusBadge status={appt.status} />
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary">
              Recent Activity
            </h2>
          </div>
          <div className="px-5 py-3 space-y-4">
            {activityFeed.length === 0 ? (
              <p className="text-sm text-text-secondary py-4 text-center">
                No recent activity
              </p>
            ) : (
              activityFeed.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.id} className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-text-primary leading-snug">
                        {item.text}
                      </p>
                      <p className="text-xs text-text-disabled mt-0.5">
                        {item.time}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom grid: weekly chart + recent patients ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly sessions bar chart */}
        <div className="bg-bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-1">
            Weekly Sessions
          </h2>
          <p className="text-xs text-text-secondary mb-5">
            Appointments this week
          </p>
          <div className="flex items-end justify-between gap-2 h-28">
            {weeklyData.map((d) => (
              <div
                key={d.label}
                className="flex-1 flex flex-col items-center gap-1.5"
              >
                <span className="text-xs text-text-disabled">
                  {d.sessions || ""}
                </span>
                <div
                  className="w-full flex flex-col justify-end"
                  style={{ height: "80px" }}
                >
                  <div
                    className={`w-full rounded-md transition-all ${
                      d.label === todayDayLabel
                        ? "bg-primary"
                        : d.sessions === 0
                          ? "bg-border"
                          : "bg-primary/30"
                    }`}
                    style={{
                      height: `${(d.sessions / maxSessions) * 80}px`,
                      minHeight: d.sessions > 0 ? "6px" : "3px",
                    }}
                  />
                </div>
                <span className="text-xs text-text-disabled">{d.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <p className="text-xs text-text-secondary">Total this week</p>
            <p className="text-sm font-bold text-text-primary">
              {weekAppointments.length} sessions
            </p>
          </div>
        </div>

        {/* Recent patients — spans 2 cols */}
        <div className="lg:col-span-2 bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary">
              Recent Patients
            </h2>
            <Link
              href="/patients"
              className="text-xs text-primary flex items-center gap-1 hover:underline"
            >
              All patients <ChevronRight size={13} />
            </Link>
          </div>

          {recentPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-5">
              <Users size={28} className="text-text-disabled mb-3" />
              <p className="text-sm font-medium text-text-primary">
                No patients yet
              </p>
              <p className="text-xs text-text-secondary mt-1">
                Patients will appear here after they register.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentPatients.map((p) => {
                const apptCount = appointments.filter(
                  (a) => a.patientId === p._id,
                ).length;
                const lastAppt = appointments
                  .filter((a) => a.patientId === p._id)
                  .sort(
                    (a, b) =>
                      new Date(b.start).getTime() - new Date(a.start).getTime(),
                  )[0];

                return (
                  <Link
                    key={p._id}
                    href={`/patients/${p._id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-bg-hover transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                      {initials(p.firstName, p.lastName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">
                        {p.firstName} {p.lastName}
                      </p>
                      <p className="text-xs text-text-disabled truncate">
                        {p.healthCondition || "No condition recorded"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-text-primary">
                        {apptCount} session{apptCount !== 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-text-disabled">
                        {lastAppt
                          ? new Date(lastAppt.start).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })
                          : "No visits"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
