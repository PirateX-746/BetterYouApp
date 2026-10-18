import type { ReactNode } from "react";

export type BadgeTone =
  | "success"
  | "danger"
  | "warning"
  | "primary"
  | "purple"
  | "teal"
  | "neutral";

const toneClass: Record<BadgeTone, string> = {
  success: "bg-success-light text-success",
  danger: "bg-danger-light text-danger",
  warning: "bg-warning-light text-warning",
  primary: "bg-primary-light text-primary",
  purple: "bg-purple-light text-purple",
  teal: "bg-teal-light text-teal",
  neutral: "bg-border text-text-secondary",
};

interface BadgeProps {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * One pill/status-badge implementation for the whole app. Every status,
 * gender, or category pill should render through this rather than a
 * one-off `<span className="rounded-full ...">` — that's how the badge
 * palette drifted across appointments/dashboard/waiting-room/patients
 * (each hand-picking its own opacity/color instead of the shared tokens).
 */
export function Badge({ tone = "neutral", icon, children, className }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${toneClass[tone]} ${className ?? ""}`}
    >
      {icon}
      {children}
    </span>
  );
}
