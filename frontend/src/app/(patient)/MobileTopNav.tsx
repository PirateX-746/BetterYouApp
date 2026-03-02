"use client";

import { LogOut, Bell } from "lucide-react";
import { logout } from "@/app/actions/logout";
import { usePathname } from "next/navigation";

export default function MobileTopNav() {
  const pathname = usePathname();

  const pageTitles: { [key: string]: string } = {
    "/patient/home": "Dashboard",
    "/patient/appointments": "Appointments",
    "/patient/messages": "Messages",
    "/patient/profile": "Profile",
    "/patient/settings": "Settings",
  };

  const currentPage = pageTitles[pathname] || "";

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 bg-bg-card border-b border-border h-16 flex justify-between items-center px-4 z-50 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
      {/* Page Title */}
      <span className="text-text-primary font-medium text-lg">
        {currentPage}
      </span>

      {/* Notification and Logout Buttons */}
      <div className="flex items-center gap-4">
        <button
          className="flex items-center justify-center text-text-secondary hover:text-primary transition-colors duration-200"
          onClick={() => {
            // Handle notification click
            console.log("Notification clicked");
          }}
        >
          <Bell size={22} />
        </button>

        <button
          className="flex items-center justify-center text-text-secondary hover:text-danger transition-colors duration-200"
          onClick={async () => {
            await logout();
          }}
        >
          <LogOut size={22} />
        </button>
      </div>
    </div>
  );
}
