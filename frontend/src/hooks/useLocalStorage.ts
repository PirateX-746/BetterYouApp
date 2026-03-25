"use client";

import { useState } from "react";

/**
 * Safe localStorage hook — returns null during SSR, reads on client.
 * Use this everywhere instead of calling localStorage.getItem() directly.
 */
export function useLocalStorage<T extends string = string>(
  key: string,
): T | null {
  const [value] = useState<T | null>(() => {
    if (typeof window === "undefined") return null;
    return (localStorage.getItem(key) as T | null) ?? null;
  });
  return value;
}
