"use client";

import { usePathname } from "next/navigation";
import PatientSidebar from "./PatientSidebar";
import MobileBottomNav from "./MobileBottomNav";
import MobileTopNav from "./MobileTopNav";
import { HIDE_BOTTOM_NAV_PATTERN } from "@/lib/nav-config";

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Suppress the bottom tab bar when inside a specific chat thread.
  // The regex lives in nav-config so the rule stays in one place.
  const hideBottomNav = HIDE_BOTTOM_NAV_PATTERN.test(pathname);

  return (
    <div className="h-[100dvh] flex bg-bg-page w-full overflow-hidden">
      <MobileTopNav />
      <PatientSidebar />

      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-24 md:pb-6 mt-16 md:mt-0">
        {children}
      </main>

      {!hideBottomNav && <MobileBottomNav />}
    </div>
  );
}
