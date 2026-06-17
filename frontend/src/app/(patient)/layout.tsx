"use client";

import { usePathname } from "next/navigation";
import PatientSidebar from "./PatientSidebar";
import MobileBottomNav from "./MobileBottomNav";
import MobileTopNav from "./MobileTopNav";
import { HIDE_BOTTOM_NAV_PATTERN } from "@/lib/nav-config";
import { PatientChatProvider, usePatientChat } from "@/contexts/PatientChatContext";
import { PatientUnreadProvider } from "@/contexts/PatientUnreadContext";

function PatientLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { chatOpen } = usePatientChat();

  const hideBottomNav = HIDE_BOTTOM_NAV_PATTERN.test(pathname);
  const isMessages = pathname === "/patient/messages";

  // When a chat is open, give main the full viewport (topnav + bottomnav are hidden).
  // When on the messages list with no chat open, restore the topnav offset.
  // All other pages get the standard padded scroll layout.
  const mainClass = isMessages
    ? chatOpen
      ? "flex-1 overflow-hidden flex flex-col min-h-0"
      : "flex-1 overflow-hidden flex flex-col min-h-0 mt-16 md:mt-0"
    : "flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-24 md:pb-6 mt-16 md:mt-0";

  return (
    <div className="h-[100dvh] flex bg-bg-page w-full overflow-hidden">
      <MobileTopNav />
      <PatientSidebar />

      <main className={mainClass}>
        {children}
      </main>

      {!hideBottomNav && <MobileBottomNav />}
    </div>
  );
}

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <PatientChatProvider>
      <PatientUnreadProvider>
        <PatientLayoutInner>{children}</PatientLayoutInner>
      </PatientUnreadProvider>
    </PatientChatProvider>
  );
}
