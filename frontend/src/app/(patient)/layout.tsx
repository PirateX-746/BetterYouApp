"use client";

import { usePathname } from "next/navigation";
import PatientSidebar from "./PatientSidebar";
import MobileBottomNav from "./MobileBottomNav";

export default function PatientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    // Hide bottom nav when inside chat conversation
    // const hideBottomNav = pathname.includes("/messages");
    const hideBottomNav = pathname.match(/\/messages\/[^/]+$/);

    return (
        <div className="h-[100dvh] flex bg-bg-page w-full overflow-hidden">

            {/* Desktop Sidebar */}
            <PatientSidebar />

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-24 md:pb-6">
                {children}
            </main>

            {/* Mobile Bottom Navigation */}
            {!hideBottomNav && <MobileBottomNav />}

        </div>
    );
}