"use client";

import { useEffect, useState } from "react";
import { Users, CalendarCheck, Clock, CheckCircle, TrendingUp, UserPlus, MessageCircle, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { api } from "@/lib/api";
import { SkeletonStat } from "@/components/ui/skeleton";
import Link from "next/link";

interface DashboardStats {
  totalPatients: number;
  activePatients: number;
  todayAppointments: number;
  upcomingAppointments: number;
  weeklyAppointments: number;
  completedSessions: number;
}

interface RecentPatient {
  _id: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

interface RecentAppointment {
  _id: string;
  patientId?: { firstName?: string; lastName?: string };
  startTime: string;
  status: string;
  title?: string;
}

interface WeeklyData {
  day: string;
  appointments: number;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentPatients, setRecentPatients] = useState<RecentPatient[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorName, setDoctorName] = useState("Doctor");

  useEffect(() => {
    const cookies = document.cookie.split("; ");
    const nameCookie = cookies.find((r) => r.startsWith("name="));
    if (nameCookie) setDoctorName(decodeURIComponent(nameCookie.split("=")[1]));
  }, []);

  useEffect(() => {
    const practitionerId = localStorage.getItem("userId") ?? "";
    if (!practitionerId) { setLoading(false); return; }

    const fetchAll = async () => {
      try {
        const [patientsRes, appointmentsRes] = await Promise.allSettled([
          api.get("/patients", { params: { practitionerId } }),
          api.get("/appointments", { params: { practitionerId } }),
        ]);

        let totalPatients = 0;
        let activePatients = 0;
        let latestPatients: RecentPatient[] = [];

        if (patientsRes.status === "fulfilled") {
          const patients = Array.isArray(patientsRes.value.data)
            ? patientsRes.value.data
            : (patientsRes.value.data?.patients ?? []);
          totalPatients = patients.length;
          activePatients = patients.filter((p: { isActive?: boolean }) => p.isActive !== false).length;
          latestPatients = [...patients]
            .sort((a: { createdAt: string }, b: { createdAt: string }) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 4);
        }

        let todayCount = 0;
        let upcomingCount = 0;
        let weeklyCount = 0;
        let completedCount = 0;
        let latestAppointments: RecentAppointment[] = [];
        const weeklyCounts = Array(7).fill(0);

        if (appointmentsRes.status === "fulfilled") {
          const appts: RecentAppointment[] = Array.isArray(appointmentsRes.value.data)
            ? appointmentsRes.value.data
            : [];

          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const weekStart = new Date(todayStart);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());

          appts.forEach((a) => {
            const d = new Date(a.startTime);
            const dayIdx = d.getDay();
            if (d >= weekStart && d < new Date(weekStart.getTime() + 7 * 86400000)) {
              weeklyCounts[dayIdx]++;
              weeklyCount++;
            }
            if (d >= todayStart && d < new Date(todayStart.getTime() + 86400000)) todayCount++;
            if (d > now) upcomingCount++;
            if (a.status === "completed") completedCount++;
          });

          latestAppointments = [...appts]
            .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
            .slice(0, 5);
        }

        setStats({
          totalPatients,
          activePatients,
          todayAppointments: todayCount,
          upcomingAppointments: upcomingCount,
          weeklyAppointments: weeklyCount,
          completedSessions: completedCount,
        });
        setRecentPatients(latestPatients);
        setRecentAppointments(latestAppointments);
        setWeeklyData(DAYS.map((day, i) => ({ day, appointments: weeklyCounts[i] })));
      } catch {
        // non-fatal — show zeros
        setStats({ totalPatients: 0, activePatients: 0, todayAppointments: 0, upcomingAppointments: 0, weeklyAppointments: 0, completedSessions: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const statCards = stats
    ? [
        { label: "Total Patients", value: stats.totalPatients, icon: Users, colorClass: "bg-primary/10 text-primary" },
        { label: "Today's Appointments", value: stats.todayAppointments, icon: CalendarCheck, colorClass: "bg-success/10 text-success" },
        { label: "This Week", value: stats.weeklyAppointments, icon: Clock, colorClass: "bg-warning/10 text-warning" },
        { label: "Completed Sessions", value: stats.completedSessions, icon: CheckCircle, colorClass: "bg-purple-500/10 text-purple-500" },
      ]
    : [];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            {greeting}, Dr. {doctorName}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/patients"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border border-border text-text-secondary hover:bg-bg-hover transition"
          >
            <UserPlus size={14} />
            Add Patient
          </Link>
          <Link
            href="/appointmentsPractitioner"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm bg-primary text-white hover:bg-primary-hover transition"
          >
            <CalendarCheck size={14} />
            New Appointment
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)
          : statCards.map((s) => (
              <div key={s.label} className="bg-bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-shadow">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${s.colorClass}`}>
                  <s.icon size={20} />
                </div>
                <p className="text-2xl font-bold text-text-primary leading-none">{s.value}</p>
                <p className="text-sm text-text-secondary mt-1.5">{s.label}</p>
              </div>
            ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly bar chart */}
        <div className="bg-bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">This Week</h2>
              <p className="text-xs text-text-secondary mt-0.5">Appointments by day</p>
            </div>
            <TrendingUp size={16} className="text-text-secondary" />
          </div>
          {loading ? (
            <div className="h-40 bg-bg-light rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
                  cursor={{ fill: "var(--bg-hover)" }}
                />
                <Bar dataKey="appointments" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Active patients vs total */}
        <div className="bg-bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Patient Overview</h2>
              <p className="text-xs text-text-secondary mt-0.5">Active vs total enrolled</p>
            </div>
            <Users size={16} className="text-text-secondary" />
          </div>
          {loading ? (
            <div className="h-40 bg-bg-light rounded-xl animate-pulse" />
          ) : (
            <div className="space-y-4 pt-2">
              <div>
                <div className="flex justify-between text-xs text-text-secondary mb-1.5">
                  <span>Active patients</span>
                  <span className="font-medium text-text-primary">{stats?.activePatients ?? 0} / {stats?.totalPatients ?? 0}</span>
                </div>
                <div className="h-2 bg-bg-light rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: stats?.totalPatients ? `${Math.round((stats.activePatients / stats.totalPatients) * 100)}%` : "0%" }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-text-secondary mb-1.5">
                  <span>Upcoming appointments</span>
                  <span className="font-medium text-text-primary">{stats?.upcomingAppointments ?? 0}</span>
                </div>
                <div className="h-2 bg-bg-light rounded-full overflow-hidden">
                  <div
                    className="h-full bg-warning rounded-full transition-all"
                    style={{ width: stats?.upcomingAppointments ? `${Math.min(100, (stats.upcomingAppointments / Math.max(1, stats.weeklyAppointments)) * 100)}%` : "0%" }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-text-secondary mb-1.5">
                  <span>Completion rate (all time)</span>
                  <span className="font-medium text-text-primary">
                    {stats?.totalPatients
                      ? `${Math.round(((stats.completedSessions) / Math.max(1, stats.completedSessions + stats.upcomingAppointments)) * 100)}%`
                      : "—"}
                  </span>
                </div>
                <div className="h-2 bg-bg-light rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full transition-all"
                    style={{
                      width: `${Math.round(((stats?.completedSessions ?? 0) / Math.max(1, (stats?.completedSessions ?? 0) + (stats?.upcomingAppointments ?? 0))) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent patients */}
        <div className="bg-bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Recent Patients</h2>
            <Link href="/patients" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-bg-light animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-bg-light rounded animate-pulse w-1/2" />
                    <div className="h-2.5 bg-bg-light rounded animate-pulse w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <UserPlus size={20} className="text-text-disabled mb-2" />
              <p className="text-sm text-text-secondary">No patients yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentPatients.map((p) => (
                <Link
                  key={p._id}
                  href={`/patients/${p._id}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-bg-hover transition"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                    {p.firstName?.[0]?.toUpperCase()}{p.lastName?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{p.firstName} {p.lastName}</p>
                    <p className="text-xs text-text-secondary">
                      Added {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent appointments */}
        <div className="bg-bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Recent Appointments</h2>
            <Link href="/appointmentsPractitioner" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-bg-light animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-bg-light rounded animate-pulse w-2/3" />
                    <div className="h-2.5 bg-bg-light rounded animate-pulse w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle size={20} className="text-text-disabled mb-2" />
              <p className="text-sm text-text-secondary">No appointments yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentAppointments.map((a) => {
                const statusColor: Record<string, string> = {
                  completed: "bg-success/10 text-success",
                  confirmed: "bg-primary/10 text-primary",
                  scheduled: "bg-primary/10 text-primary",
                  cancelled: "bg-danger/10 text-danger",
                  "no-show": "bg-warning/10 text-warning",
                };
                return (
                  <div key={a._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-bg-hover transition">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <CalendarCheck size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {a.patientId?.firstName} {a.patientId?.lastName}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {new Date(a.startTime).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize shrink-0 ${statusColor[a.status] ?? "bg-border text-text-secondary"}`}>
                      {a.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
