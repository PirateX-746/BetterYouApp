"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import PractitionerSidebar from "@/components/containers/layout/PractitionerSidebar";
import PractitionerTopbar from "@/components/containers/layout/PractitionerTopbar";

export default function PractitionerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <PractitionerSidebar open={open} setOpen={setOpen} />

      <div className="lg:ml-64 min-h-screen bg-bg-page flex flex-col">
        <PractitionerTopbar open={open} onToggle={() => setOpen((o) => !o)} />

        {/*
          pt-14  = topbar height
          pb-16  = mobile bottom nav height (lg:pb-0 removes it on desktop)
        */}
        <main className="flex-1 pt-14 pb-16 lg:pb-0 overflow-y-auto overflow-x-hidden">
          <div className="p-4 md:p-6 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </>
  );
}
