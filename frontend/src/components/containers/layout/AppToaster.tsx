"use client";

import { Toaster } from "sonner";
import type { CSSProperties } from "react";

/**
 * App-wide toasts (Sonner). Every toast gets a close (×) button, top-right;
 * colours come from the theme tokens, so light/dark follow the app's own
 * theme toggle. See the `[data-sonner-toast]` rules in globals.css.
 */
export default function AppToaster() {
  return (
    <Toaster
      position="top-right"
      closeButton
      duration={4000}
      visibleToasts={4}
      gap={10}
      offset={{ top: "calc(env(safe-area-inset-top) + 16px)", right: 16 }}
      mobileOffset={{ top: "calc(env(safe-area-inset-top) + 12px)", left: 12, right: 12 }}
      style={
        {
          "--normal-bg": "var(--bg-card)",
          "--normal-text": "var(--text-primary)",
          "--normal-border": "var(--border)",
          "--border-radius": "14px",
        } as CSSProperties
      }
      toastOptions={{ classNames: { toast: "app-toast" } }}
    />
  );
}
