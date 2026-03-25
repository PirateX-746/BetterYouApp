"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { PATIENT_NAV_ITEMS } from "@/lib/nav-config";
import { useLogout } from "@/hooks/useLogout";

export default function PatientSidebar() {
  const pathname = usePathname();
  const { handleLogout, isPending } = useLogout();

  return (
    <div className="w-64 h-screen bg-bg-card border-r border-border p-6 hidden md:flex flex-col justify-between">
      <div>
        <h1 className="text-lg font-semibold text-text-primary mb-8 flex items-center gap-2">
          <span className="text-primary">Better</span>You
        </h1>

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
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <button
        className="flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:bg-danger/10 hover:text-danger rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
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
