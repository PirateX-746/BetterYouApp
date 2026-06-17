"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface PortalLockCtx {
  isLocked: boolean;
  lock: () => void;
  unlock: () => void;
}

const PortalLockContext = createContext<PortalLockCtx>({
  isLocked: false,
  lock: () => {},
  unlock: () => {},
});

export function PortalLockProvider({ children }: { children: ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);
  return (
    <PortalLockContext.Provider
      value={{ isLocked, lock: () => setIsLocked(true), unlock: () => setIsLocked(false) }}
    >
      {children}
    </PortalLockContext.Provider>
  );
}

export const usePortalLock = () => useContext(PortalLockContext);
