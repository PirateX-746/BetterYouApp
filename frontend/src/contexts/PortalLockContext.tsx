"use client";

import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react";

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

/* The lock lives in localStorage, not React state, so reloading the page or
 * opening another tab can't skip the PIN. Logout clears it with the other
 * session keys (lib/session.ts). */
const LOCK_KEY = "portalLocked";
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readLocked() {
  try {
    return localStorage.getItem(LOCK_KEY) === "1";
  } catch {
    return false;
  }
}

function writeLocked(locked: boolean) {
  try {
    if (locked) localStorage.setItem(LOCK_KEY, "1");
    else localStorage.removeItem(LOCK_KEY);
  } catch {
    /* storage unavailable — the lock can't be persisted */
  }
  listeners.forEach((l) => l());
}

export function PortalLockProvider({ children }: { children: ReactNode }) {
  const isLocked = useSyncExternalStore(subscribe, readLocked, () => false);
  const lock = useCallback(() => writeLocked(true), []);
  const unlock = useCallback(() => writeLocked(false), []);
  return (
    <PortalLockContext.Provider value={{ isLocked, lock, unlock }}>
      {children}
    </PortalLockContext.Provider>
  );
}

export const usePortalLock = () => useContext(PortalLockContext);
