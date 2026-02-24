"use client";

import PatientSidebar from "./PatientSidebar";
import MobileBottomNav from "./MobileBottomNav";

export default function PatientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-[#F8FAFC]">

            {/* Desktop Sidebar */}
            <div className="hidden md:block">
                <PatientSidebar />
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
                {children}
            </main>

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav />

        </div>
    );
}