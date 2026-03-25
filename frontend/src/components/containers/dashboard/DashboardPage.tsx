import { ReactNode } from "react";
import { Users, CalendarCheck, Clock, CheckCircle } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string | number;
  icon: ReactNode;
  colorClass: string;
};

function StatCard({ label, value, icon, colorClass }: StatCardProps) {
  return (
    <div className="bg-bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-shadow">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colorClass}`}
      >
        {icon}
      </div>
      <p className="text-2xl font-bold text-text-primary leading-none">
        {value}
      </p>
      <p className="text-sm text-text-secondary mt-1.5">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const stats = [
    {
      label: "Total Patients",
      value: 124,
      colorClass: "bg-primary/10 text-primary",
      icon: <Users size={20} />,
    },
    {
      label: "Today's Appointments",
      value: 6,
      colorClass: "bg-success/10 text-success",
      icon: <CalendarCheck size={20} />,
    },
    {
      label: "This Week",
      value: 18,
      colorClass: "bg-warning/10 text-warning",
      icon: <Clock size={20} />,
    },
    {
      label: "Upcoming",
      value: 9,
      colorClass: "bg-purple-500/10 text-purple-500",
      icon: <CheckCircle size={20} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-secondary mt-0.5">Welcome back</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>
    </div>
  );
}
