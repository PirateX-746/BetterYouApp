"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js (offline page + static-asset cache). Production
 * only: in dev the worker would serve stale chunks across hot reloads.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // An unregistered worker only costs the offline page; the app works without it.
    });
  }, []);

  return null;
}
