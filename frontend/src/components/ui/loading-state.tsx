"use client";

import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  /** Vertical padding — "sm" for a tab/panel body, "lg" for a full page section. */
  size?: "sm" | "lg";
  className?: string;
}

/**
 * One spinner block for the whole app. Every tab/panel that shows "loading
 * this section's data" should render through this rather than its own copy
 * of `<div className="flex items-center justify-center py-N"><Loader2 .../></div>` —
 * that pattern was duplicated near-identically across a dozen patient-tab
 * and settings components.
 */
export function LoadingState({ size = "sm", className }: LoadingStateProps) {
  return (
    <div
      className={`flex items-center justify-center ${size === "lg" ? "py-16" : "py-10"} ${className ?? ""}`}
    >
      <Loader2 className="animate-spin text-primary" size={size === "lg" ? 24 : 22} />
    </div>
  );
}
