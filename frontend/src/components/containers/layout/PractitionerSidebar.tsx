"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  Settings,
  Stethoscope,
  MessageCircle,
} from "lucide-react";

interface SidebarProps {
  open: boolean;
  setOpen: (value: boolean) => void;
}

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Appointments", href: "/appointmentsPractitioner", icon: CalendarCheck },
  { label: "Patients", href: "/patients", icon: Users },
  { label: "Messages", href: "/messages", icon: MessageCircle },
  { label: "Settings", href: "/settings", icon: Settings },

];

export default function PractitionerSidebar({
  open,
  setOpen,
}: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Overlay (Mobile Only) */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-64
          bg-bg-card border-r border-border
          transform transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* Brand */}
        <div className="border-b border-border flex items-center gap-3 px-4 h-14 font-semibold text-primary">
          <Stethoscope size={20} />
          <span>Better You</span>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`
                  flex items-center gap-3 rounded-md p-3 transition-all
                  ${isActive(item.href)
                    ? "bg-primary text-white"
                    : "text-text-secondary hover:bg-bg-hover"}
                `}
              >
                <Icon size={18} />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
