"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
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

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Appointments",
    href: "/appointmentsPractitioner",
    icon: CalendarCheck,
  },
  { label: "Patients", href: "/patients", icon: Users },
  { label: "Messages", href: "/messages", icon: MessageCircle },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function PractitionerSidebar({ open, setOpen }: SidebarProps) {
  const pathname = usePathname();

  // Auto-close sidebar on route change (mobile)
  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Desktop sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-64
          bg-bg-card border-r border-border
          transform transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* Brand */}
        <div className="h-14 px-5 flex items-center gap-2.5 border-b border-border shrink-0">
          <Stethoscope size={18} className="text-primary" />
          <span className="font-semibold text-text-primary">
            <span className="text-primary">Better</span>You
          </span>
        </div>

        {/* Nav */}
        <nav className="p-3 space-y-0.5">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all
                  ${
                    active
                      ? "bg-primary text-white font-medium shadow-sm"
                      : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  }
                `}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-bg-card border-t border-border flex items-center justify-around px-2">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className="flex flex-col items-center gap-1 px-3 py-1"
            >
              <Icon
                size={22}
                className={active ? "text-primary" : "text-text-disabled"}
              />
              <span
                className={`text-[10px] font-medium ${active ? "text-primary" : "text-text-disabled"}`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
