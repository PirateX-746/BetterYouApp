"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarCheck, Users, Settings } from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Appointments",
    href: "/appointments",
    icon: CalendarCheck,
  },
  {
    label: "Patients",
    href: "/patients",
    icon: Users,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export default function PractitionerSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-bg-card border-r border-border">
      {/* Brand */}
      <div className="border-b border-border px-4 py-4 text-xl font-semibold text-primary">
        Better You
      </div>

      {/* Navigation */}
      <nav className="space-y-1 p-4 text-md">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 rounded-md p-3 transition-colors",
                isActive
                  ? "bg-primary-light text-primary font-medium"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
