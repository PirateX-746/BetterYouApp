"use client";

import PatientSidebar from "./PatientSidebar";
import MobileBottomNav from "./MobileBottomNav";

export default function PatientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-bg-page w-full overflow-hidden">

            {/* Desktop Sidebar */}
            <PatientSidebar />

            {/* Main Content */}
            <main className="flex-1 h-screen overflow-y-auto pb-20 md:pb-0 p-4 md:p-6 lg:p-8">
                {children}
            </main>

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav />

        </div>
    );
}