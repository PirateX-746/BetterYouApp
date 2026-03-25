"use client";

import { Bell } from "lucide-react";
import { LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { PATIENT_NAV_ITEMS } from "@/lib/nav-config";
import { useLogout } from "@/hooks/useLogout";

// Derive page titles from the shared nav config so they stay in sync automatically.
const PAGE_TITLES: Record<string, string> = Object.fromEntries(
  PATIENT_NAV_ITEMS.map((item) => [item.href, item.name]),
);

export default function MobileTopNav() {
  const pathname = usePathname();
  const { handleLogout, isPending } = useLogout();

  const currentPage = PAGE_TITLES[pathname] ?? "";

  function handleNotificationClick() {
    // TODO: open notification panel
  }

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 bg-bg-card border-b border-border h-16 flex justify-between items-center px-4 z-50 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
      <span className="text-text-primary font-medium text-lg">
        {currentPage}
      </span>

      <div className="flex items-center gap-4">
        <button
          aria-label="Open notifications"
          className="flex items-center justify-center text-text-secondary hover:text-primary transition-colors duration-200"
          onClick={handleNotificationClick}
        >
          <Bell size={22} />
        </button>

        <button
          aria-label="Log out"
          className="flex items-center justify-center text-text-secondary hover:text-danger transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleLogout}
          disabled={isPending}
        >
          <LogOut size={22} />
        </button>
      </div>
    </header>
  );
}
