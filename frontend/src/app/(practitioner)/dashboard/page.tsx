"use client";

import { ReactNode } from "react";
import {
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Star,
  Activity,
  UserPlus,
  CalendarCheck,
  Brain,
  Heart,
  Pill,
  FileText,
  ChevronRight,
  Dot,
} from "lucide-react";

/* ─────────────────────────────────────────────
   Mock data
───────────────────────────────────────────── */

const TODAY_APPOINTMENTS = [
  {
    id: 1,
    time: "10:00",
    patient: "Sarah Mitchell",
    type: "CBT Session",
    status: "confirmed",
    avatar: "SM",
    color: "bg-primary/10 text-primary",
    duration: 60,
  },
  {
    id: 2,
    time: "11:30",
    patient: "James Okafor",
    type: "Follow-Up Session",
    status: "confirmed",
    avatar: "JO",
    color: "bg-success/10 text-success",
    duration: 45,
  },
  {
    id: 3,
    time: "13:00",
    patient: "Priya Sharma",
    type: "New Patient Visit",
    status: "pending",
    avatar: "PS",
    color: "bg-warning/10 text-warning",
    duration: 60,
  },
  {
    id: 4,
    time: "14:30",
    patient: "Tom Whitfield",
    type: "Couples Therapy",
    status: "confirmed",
    avatar: "TW",
    color: "bg-purple-500/10 text-purple-500",
    duration: 60,
  },
  {
    id: 5,
    time: "16:00",
    patient: "Aisha Kamara",
    type: "Counselling Session",
    status: "confirmed",
    avatar: "AK",
    color: "bg-primary/10 text-primary",
    duration: 45,
  },
];

const RECENT_PATIENTS = [
  {
    id: 1,
    name: "Sarah Mitchell",
    condition: "Anxiety & Depression",
    lastVisit: "Today",
    sessions: 12,
    progress: 78,
    avatar: "SM",
  },
  {
    id: 2,
    name: "James Okafor",
    condition: "PTSD",
    lastVisit: "Today",
    sessions: 8,
    progress: 55,
    avatar: "JO",
  },
  {
    id: 3,
    name: "Mei-Lin Zhou",
    condition: "OCD",
    lastVisit: "Yesterday",
    sessions: 21,
    progress: 88,
    avatar: "MZ",
  },
  {
    id: 4,
    name: "Carlos Reyes",
    condition: "Bipolar II",
    lastVisit: "2 days ago",
    sessions: 35,
    progress: 62,
    avatar: "CR",
  },
  {
    id: 5,
    name: "Fatima Al-Hassan",
    condition: "Generalised Anxiety",
    lastVisit: "3 days ago",
    sessions: 6,
    progress: 41,
    avatar: "FA",
  },
];

const ACTIVITY_FEED = [
  {
    id: 1,
    icon: UserPlus,
    color: "text-primary bg-primary/10",
    text: "New patient Priya Sharma registered",
    time: "2h ago",
  },
  {
    id: 2,
    icon: FileText,
    color: "text-warning bg-warning/10",
    text: "Prescription issued for Carlos Reyes",
    time: "3h ago",
  },
  {
    id: 3,
    icon: CalendarCheck,
    color: "text-success bg-success/10",
    text: "Session completed — Mei-Lin Zhou",
    time: "4h ago",
  },
  {
    id: 4,
    icon: AlertCircle,
    color: "text-danger bg-danger/10",
    text: "Missed appointment — David Park",
    time: "5h ago",
  },
  {
    id: 5,
    icon: FileText,
    color: "text-purple-500 bg-purple-500/10",
    text: "Medical document uploaded by Aisha Kamara",
    time: "Yesterday",
  },
  {
    id: 6,
    icon: Star,
    color: "text-warning bg-warning/10",
    text: "Session feedback received — 5 stars",
    time: "Yesterday",
  },
];

const WEEKLY_DATA = [
  { day: "Mon", sessions: 5, new: 1 },
  { day: "Tue", sessions: 7, new: 2 },
  { day: "Wed", sessions: 4, new: 0 },
  { day: "Thu", sessions: 8, new: 3 },
  { day: "Fri", sessions: 6, new: 1 },
  { day: "Sat", sessions: 3, new: 1 },
  { day: "Sun", sessions: 0, new: 0 },
];

const SESSION_TYPES = [
  { label: "CBT Sessions", count: 14, color: "bg-primary", pct: 38 },
  { label: "Counselling", count: 10, color: "bg-success", pct: 27 },
  { label: "Follow-Up", count: 8, color: "bg-warning", pct: 22 },
  { label: "New Patients", count: 5, color: "bg-purple-500", pct: 13 },
];

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const now = new Date();
const timeStr = now.toLocaleTimeString("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});
const dateStr = now.toLocaleDateString("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const maxSessions = Math.max(...WEEKLY_DATA.map((d) => d.sessions));

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
  if (status === "confirmed")
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
        Confirmed
      </span>
    );
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
      Pending
    </span>
  );
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */

export default function DashboardPage() {
  const todayConfirmed = TODAY_APPOINTMENTS.filter(
    (a) => a.status === "confirmed",
  ).length;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            Good morning, Dr. Patel 👋
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">{dateStr}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-bg-card border border-border rounded-xl">
          <Activity size={15} className="text-success" />
          <span className="text-sm font-medium text-text-primary">
            {timeStr}
          </span>
          <Dot className="text-success animate-pulse" size={20} />
          <span className="text-xs text-text-secondary">Practice open</span>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Patients"
          value="124"
          iconBg="bg-primary/10 text-primary"
          icon={<Users size={20} />}
          trend={{ value: "+8 this month", up: true }}
          sub="6 new this week"
        />
        <StatCard
          label="Today's Appointments"
          value={TODAY_APPOINTMENTS.length}
          iconBg="bg-success/10 text-success"
          icon={<Calendar size={20} />}
          sub={`${todayConfirmed} confirmed · 1 pending`}
        />
        <StatCard
          label="This Week"
          value="33"
          iconBg="bg-warning/10 text-warning"
          icon={<Clock size={20} />}
          trend={{ value: "+12% vs last week", up: true }}
          sub="Avg. 6.6/day"
        />
        <StatCard
          label="Completion Rate"
          value="91%"
          iconBg="bg-purple-500/10 text-purple-500"
          icon={<CheckCircle2 size={20} />}
          trend={{ value: "-2% vs last month", up: false }}
          sub="3 missed this week"
        />
      </div>

      {/* ── Secondary stats row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Cases"
          value="47"
          iconBg="bg-primary/10 text-primary"
          icon={<Brain size={20} />}
          sub="Ongoing treatment plans"
        />
        <StatCard
          label="Avg. Session Rating"
          value="4.8 ★"
          iconBg="bg-warning/10 text-warning"
          icon={<Star size={20} />}
          trend={{ value: "+0.2 this month", up: true }}
          sub="Based on 38 reviews"
        />
        <StatCard
          label="Prescriptions Issued"
          value="18"
          iconBg="bg-success/10 text-success"
          icon={<Pill size={20} />}
          sub="This month"
        />
        <StatCard
          label="New Referrals"
          value="5"
          iconBg="bg-purple-500/10 text-purple-500"
          icon={<Heart size={20} />}
          trend={{ value: "+2 vs last month", up: true }}
          sub="Awaiting first session"
        />
      </div>

      {/* ── Main grid: appointments + activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's schedule */}
        <div className="lg:col-span-2 bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">
                Today's Schedule
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                {TODAY_APPOINTMENTS.length} appointments · {todayConfirmed}{" "}
                confirmed
              </p>
            </div>
            <button className="text-xs text-primary flex items-center gap-1 hover:underline">
              View all <ChevronRight size={13} />
            </button>
          </div>
          <div className="divide-y divide-border">
            {TODAY_APPOINTMENTS.map((appt) => (
              <div
                key={appt.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-bg-hover transition-colors"
              >
                {/* Time */}
                <div className="w-12 shrink-0 text-center">
                  <p className="text-sm font-semibold text-text-primary">
                    {appt.time}
                  </p>
                  <p className="text-xs text-text-disabled">{appt.duration}m</p>
                </div>

                {/* Divider line */}
                <div className="w-px h-10 bg-border shrink-0" />

                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${appt.color}`}
                >
                  {appt.avatar}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {appt.patient}
                  </p>
                  <p className="text-xs text-text-secondary">{appt.type}</p>
                </div>

                <AppointmentStatusBadge status={appt.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary">
              Recent Activity
            </h2>
            <button className="text-xs text-primary flex items-center gap-1 hover:underline">
              All <ChevronRight size={13} />
            </button>
          </div>
          <div className="px-5 py-3 space-y-4">
            {ACTIVITY_FEED.map((item) => {
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
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom grid: weekly chart + session types + recent patients ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly sessions bar chart */}
        <div className="bg-bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-1">
            Weekly Sessions
          </h2>
          <p className="text-xs text-text-secondary mb-5">
            Sessions completed this week
          </p>
          <div className="flex items-end justify-between gap-2 h-28">
            {WEEKLY_DATA.map((d) => (
              <div
                key={d.day}
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
                      d.day === "Thu"
                        ? "bg-primary"
                        : d.sessions === 0
                          ? "bg-border"
                          : "bg-primary/30"
                    }`}
                    style={{
                      height: `${maxSessions > 0 ? (d.sessions / maxSessions) * 80 : 4}px`,
                      minHeight: d.sessions > 0 ? "6px" : "3px",
                    }}
                  />
                </div>
                <span className="text-xs text-text-disabled">{d.day}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <p className="text-xs text-text-secondary">Total this week</p>
            <p className="text-sm font-bold text-text-primary">33 sessions</p>
          </div>
        </div>

        {/* Session type breakdown */}
        <div className="bg-bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-1">
            Session Types
          </h2>
          <p className="text-xs text-text-secondary mb-5">
            Distribution this month
          </p>
          <div className="space-y-3.5">
            {SESSION_TYPES.map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-text-primary">{s.label}</span>
                  <span className="text-xs font-semibold text-text-primary">
                    {s.count}
                  </span>
                </div>
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${s.color} transition-all`}
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
            <p className="text-xs text-text-secondary">Total sessions</p>
            <p className="text-sm font-bold text-text-primary">37 this month</p>
          </div>
        </div>

        {/* Recent patients */}
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary">
              Active Patients
            </h2>
            <button className="text-xs text-primary flex items-center gap-1 hover:underline">
              All patients <ChevronRight size={13} />
            </button>
          </div>
          <div className="divide-y divide-border">
            {RECENT_PATIENTS.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-bg-hover transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {p.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">
                    {p.name}
                  </p>
                  <p className="text-xs text-text-disabled truncate">
                    {p.condition}
                  </p>
                  {/* Progress bar */}
                  <div className="mt-1 h-1 bg-border rounded-full overflow-hidden w-full">
                    <div
                      className={`h-full rounded-full transition-all ${
                        p.progress >= 75
                          ? "bg-success"
                          : p.progress >= 50
                            ? "bg-primary"
                            : p.progress >= 30
                              ? "bg-warning"
                              : "bg-danger"
                      }`}
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-text-primary">
                    {p.progress}%
                  </p>
                  <p className="text-xs text-text-disabled">{p.lastVisit}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
