"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* Small building blocks shared by the platform console pages, so the
   screens stay consistent and each page file holds only its own content. */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
        {subtitle && (
          <p className="text-sm text-text-secondary mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Notice for a screen whose backend does not exist yet. */
export function NotImplementedBanner({ what }: { what: string }) {
  return (
    <div className="flex items-start gap-3 mb-6 px-4 py-3 rounded-xl border border-warning bg-warning-light">
      <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
      <p className="text-xs text-text-secondary leading-relaxed">
        <span className="font-semibold text-text-primary">
          Not implemented yet.
        </span>{" "}
        {what}
      </p>
    </div>
  );
}

/** Full-panel loading state. */
export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Loader2 size={22} className="text-text-disabled animate-spin" />
      <p className="text-sm text-text-secondary">{label}</p>
    </div>
  );
}

/** Full-panel error state with a retry. */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 px-5 text-center">
      <AlertTriangle size={22} className="text-danger" />
      <div>
        <p className="text-sm font-medium text-text-primary">
          Couldn&apos;t load this
        </p>
        <p className="text-xs text-text-secondary mt-1 max-w-md">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <RefreshCw size={13} />
          Try again
        </button>
      )}
    </div>
  );
}

/** Empty state for a list that loaded fine but has nothing in it. */
export function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-5">
      <Icon size={28} className="text-text-disabled mb-3" />
      <p className="text-sm font-medium text-text-primary">{title}</p>
      {hint && (
        <p className="text-xs text-text-secondary mt-1 max-w-md">{hint}</p>
      )}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "purple" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    default: "text-text-primary",
    purple: "text-purple",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  }[tone];

  return (
    <div className="bg-bg-card border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
          {label}
        </p>
        {Icon && <Icon size={16} className="text-text-disabled shrink-0" />}
      </div>
      <p className={`text-2xl font-bold mt-2 tabular-nums ${toneClass}`}>
        {value}
      </p>
      {hint && <p className="text-xs text-text-secondary mt-1">{hint}</p>}
    </div>
  );
}

type PillTone = "success" | "warning" | "danger" | "neutral" | "purple";

const PILL_CLASS: Record<PillTone, string> = {
  success: "bg-success-light text-success",
  warning: "bg-warning-light text-warning",
  danger:  "bg-danger-light text-danger",
  neutral: "bg-bg-light text-text-secondary",
  purple:  "bg-purple-light text-purple",
};

export function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: PillTone;
}) {
  return (
    <span
      className={`inline-flex items-center text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md whitespace-nowrap ${PILL_CLASS[tone]}`}
    >
      {label}
    </span>
  );
}

export function toneForPracticeStatus(status: string): PillTone {
  switch (status) {
    case "ACTIVE":    return "success";
    case "TRIAL":     return "purple";
    case "SUSPENDED": return "warning";
    case "CANCELLED": return "danger";
    default:          return "neutral";
  }
}

export function toneForSubscription(status: string): PillTone {
  switch (status) {
    case "ACTIVE":    return "success";
    case "TRIALING":  return "purple";
    case "PAST_DUE":  return "danger";
    case "CANCELLED": return "neutral";
    default:          return "neutral";
  }
}

export function toneForInvitationStatus(status: string): PillTone {
  switch (status) {
    case "PENDING":  return "purple";
    case "ACCEPTED": return "success";
    case "EXPIRED":  return "warning";
    case "REVOKED":  return "neutral";
    default:         return "neutral";
  }
}

export function toneForUserStatus(status: string): PillTone {
  switch (status) {
    case "ACTIVE":   return "success";
    case "INVITED":  return "purple";
    case "DISABLED": return "neutral";
    default:         return "neutral";
  }
}

/** Card wrapper matching the practitioner portal's panel treatment. */
export function Panel({
  title,
  action,
  children,
  padded = false,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        {action}
      </div>
      <div className={padded ? "p-5" : ""}>{children}</div>
    </div>
  );
}

export function TableShell({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px]">
        <thead className="bg-bg-light">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="px-5 py-3.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}
