import type { ReactNode } from "react";
import PractitionerSidebar from "@/components/layout/PractitionerSidebar";
import PractitionerTopbar from "@/components/layout/PractitionerTopbar";

export default function PractitionerLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className="ml-64 pt-14
          min-h-screen
          bg-bg-page
          p-6"
    >
      <PractitionerSidebar />

      <div className="flex flex-col flex-1">
        <PractitionerTopbar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
