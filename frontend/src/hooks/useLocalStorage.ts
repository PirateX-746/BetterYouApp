"use client";

import { useClientValue } from "./useClientValue";

/**
 * Safe localStorage hook — null during SSR *and hydration*, then the stored
 * value. Reading storage in a useState initializer instead made the first
 * client render differ from the server's (e.g. a loading spinner vs the
 * page), which React reports as a hydration mismatch.
 * Use this everywhere instead of calling localStorage.getItem() directly.
 */
export function useLocalStorage<T extends string = string>(
  key: string,
): T | null {
  return useClientValue(() => localStorage.getItem(key) as T | null, null);
}
