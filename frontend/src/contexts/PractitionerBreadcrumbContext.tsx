"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface BreadcrumbCtx {
  /** An optional trailing crumb a detail page can set, e.g. a patient's name. */
  extraCrumb: string | null;
  setExtraCrumb: (label: string | null) => void;
}

const BreadcrumbContext = createContext<BreadcrumbCtx>({
  extraCrumb: null,
  setExtraCrumb: () => {},
});

export function PractitionerBreadcrumbProvider({ children }: { children: ReactNode }) {
  const [extraCrumb, setExtraCrumb] = useState<string | null>(null);

  return (
    <BreadcrumbContext.Provider value={{ extraCrumb, setExtraCrumb }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export const usePractitionerBreadcrumb = () => useContext(BreadcrumbContext);
