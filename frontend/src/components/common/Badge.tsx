import type { ReactNode } from "react";

export type BadgeTone =
  | "success"
  | "danger"
  | "warning"
  | "primary"
  | "purple"
  | "teal"
  | "info"
  | "neutral";

/* Text uses the -strong shades so every tone clears 4.5:1 on its fill;
   the base status colors are too light for 12px text. */
const toneClass: Record<BadgeTone, string> = {
  success: "bg-success-light text-success-strong",
  danger: "bg-danger-light text-danger-strong",
  warning: "bg-warning-light text-warning-strong",
  primary: "bg-primary-light text-primary-strong",
  purple: "bg-purple-light text-purple-strong",
  teal: "bg-teal-light text-teal-strong",
  info: "bg-info-light text-info-strong",
  neutral: "bg-bg-hover text-text-secondary",
};

const dotClass: Record<BadgeTone, string> = {
  success: "bg-success",
  danger: "bg-danger",
  warning: "bg-warning",
  primary: "bg-primary",
  purple: "bg-purple",
  teal: "bg-teal",
  info: "bg-info",
  neutral: "bg-text-light",
};

interface BadgeProps {
  tone?: BadgeTone;
  icon?: ReactNode;
  /** Leading status dot. Statuses always carry a text label too — never color alone. */
  dot?: boolean;
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
export function Badge({ tone = "neutral", icon, dot, children, className }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-caption font-medium whitespace-nowrap ${toneClass[tone]} ${className ?? ""}`}
    >
      {dot && <span className={`size-1.5 rounded-full shrink-0 ${dotClass[tone]}`} aria-hidden />}
      {icon}
      {children}
    </span>
  );
}
