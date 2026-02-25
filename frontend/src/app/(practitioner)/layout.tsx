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

      <div
        className={`
          min-h-screen bg-bg-page transition-all duration-300
          lg:ml-64
        `}
      >
        <PractitionerTopbar
          open={open}
          onToggle={() => setOpen(!open)}
        />

        <main className="pt-16 p-6 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </>
  );
}
