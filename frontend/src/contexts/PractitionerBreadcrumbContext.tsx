"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface BreadcrumbCtx {
  /** An optional trailing crumb a detail page can set, e.g. a patient's name. */
  extraCrumb: string | null;
  setExtraCrumb: (label: string | null) => void;
  /** True inside the practitioner shell, whose topbar shows the page title —
      PageHeader then hides its own visible title to give content the space. */
  inShell: boolean;
}

const BreadcrumbContext = createContext<BreadcrumbCtx>({
  extraCrumb: null,
  setExtraCrumb: () => {},
  inShell: false,
});

export function PractitionerBreadcrumbProvider({ children }: { children: ReactNode }) {
  const [extraCrumb, setExtraCrumb] = useState<string | null>(null);

  return (
    <BreadcrumbContext.Provider value={{ extraCrumb, setExtraCrumb, inShell: true }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export const usePractitionerBreadcrumb = () => useContext(BreadcrumbContext);

/**
 * Adds the trailing breadcrumb for a detail page ("Patients › Rhea Kulkarni",
 * "Help & Support › SUP-1002") and clears it on leave. Pass null while the
 * record is still loading. Every practitioner detail page should call this.
 */
export function useDetailCrumb(label: string | null | undefined) {
  const { setExtraCrumb } = useContext(BreadcrumbContext);
  useEffect(() => {
    setExtraCrumb(label || null);
    return () => setExtraCrumb(null);
  }, [label, setExtraCrumb]);
}
