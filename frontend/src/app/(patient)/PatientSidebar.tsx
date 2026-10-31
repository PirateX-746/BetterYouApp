"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { PATIENT_NAV_ITEMS } from "@/lib/nav-config";
import { useLogout } from "@/hooks/useLogout";
import { usePatientUnread } from "@/contexts/PatientUnreadContext";
import { BrandLogo } from "@/components/common/BrandLogo";

export default function PatientSidebar() {
  const pathname = usePathname();
  const { handleLogout, isPending } = useLogout();
  const { totalUnread } = usePatientUnread();

  return (
    <div className="w-64 h-screen bg-bg-card border-r border-border p-6 hidden md:flex flex-col justify-between">
      <div>
        <BrandLogo className="mb-8" />

        <nav className="space-y-2">
          {PATIENT_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition ${
                  active
                    ? "bg-primary text-white font-medium shadow-sm"
                    : "text-text-secondary hover:bg-bg-hover"
                }`}
              >
                <Icon size={18} />
                <span className="flex-1">{item.name}</span>
                {item.href === "/patient/messages" && totalUnread > 0 && (
                  <span className={`text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center ${active ? "bg-white text-primary" : "bg-primary text-white"}`}>
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <button
        className="flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:bg-danger/10 hover:text-danger-strong rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleLogout}
        disabled={isPending}
        aria-label="Log out"
      >
        <LogOut size={18} />
        {isPending ? "Logging out…" : "Logout"}
      </button>
    </div>
  );
}
