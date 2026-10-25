"use client";

import { useRouter } from "next/navigation";
import { Bell, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { PATIENT_NAV_ITEMS } from "@/lib/nav-config";
import { useLogout } from "@/hooks/useLogout";
import { usePatientChat } from "@/contexts/PatientChatContext";
import { usePatientUnread } from "@/contexts/PatientUnreadContext";

const PAGE_TITLES: Record<string, string> = Object.fromEntries(
  PATIENT_NAV_ITEMS.map((item) => [item.href, item.name]),
);

export default function MobileTopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { handleLogout, isPending } = useLogout();
  const { chatOpen } = usePatientChat();
  const { totalUnread } = usePatientUnread();
  const currentPage = PAGE_TITLES[pathname] ?? "";

  if (chatOpen) return null;

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 bg-bg-card border-b border-border h-16 flex justify-between items-center px-4 z-50 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
      <span className="text-text-primary font-medium text-lg">
        {currentPage}
      </span>

      <div className="flex items-center gap-4">
        {/* Message notification bell */}
        <button
          aria-label="Messages"
          className="relative flex items-center justify-center text-text-secondary hover:text-primary transition-colors duration-200"
          onClick={() => router.push("/patient/messages")}
        >
          <Bell size={22} />
          {totalUnread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {totalUnread > 9 ? "9+" : totalUnread}
            </span>
          )}
        </button>

        <button
          aria-label="Log out"
          className="flex items-center justify-center text-text-secondary hover:text-danger-strong transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleLogout}
          disabled={isPending}
        >
          <LogOut size={22} />
        </button>
      </div>
    </header>
  );
}
