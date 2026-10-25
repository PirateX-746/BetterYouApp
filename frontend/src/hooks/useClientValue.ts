"use client";

import { useSyncExternalStore } from "react";

const noSubscription = () => () => {};

/**
 * Reads a browser-only value (localStorage, a cookie) for display. The server
 * render and hydration use `serverValue`, then the client value takes over —
 * no hydration mismatch, and no effect copying it into state.
 *
 * `read` must return a primitive (or a stable reference) and should be cheap:
 * it runs on every render. Storage access errors fall back to `serverValue`.
 */
export function useClientValue<T>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(
    noSubscription,
    () => {
      try {
        return read();
      } catch {
        return serverValue;
      }
    },
    () => serverValue,
  );
}

/** Reads a non-HttpOnly cookie set by `setDisplayCookie`. */
export function readCookie(name: string): string | null {
  const entry = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
}
