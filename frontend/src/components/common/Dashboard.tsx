import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

/*
  Shared dashboard building blocks — practitioner dashboard and the platform
  console use the same ones, so both read with one type scale:

    page title      text-xl  semibold   (PageHeader)
    section title   text-base semibold  (SectionCard)
    metric value    text-2xl semibold, tabular-nums
    body / labels   text-sm
    meta / hints    text-xs  text-text-secondary  (never the faint "disabled" grey)

  Colors come from tokens, so the console's .theme-mono turns them monochrome.
*/

export type StatTone = "primary" | "teal" | "purple" | "success" | "warning" | "danger" | "neutral";

const TONE: Record<StatTone, string> = {
  primary: "bg-primary/10 text-primary",
  teal: "bg-teal/10 text-teal",
  purple: "bg-purple/10 text-purple",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  neutral: "bg-bg-light text-text-secondary",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  sub,
  trend,
  href,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  tone?: StatTone;
  sub?: ReactNode;
  trend?: { value: string; up: boolean };
  href?: string;
}) {
  const body = (
    <>
      {Icon && (
        <span className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${TONE[tone]}`} aria-hidden>
          <Icon size={20} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text-secondary truncate">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-text-primary tabular-nums leading-tight">{value}</p>
        {(sub || trend) && (
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-text-secondary">
            {trend && (
              <span className={`inline-flex items-center gap-0.5 font-medium ${trend.up ? "text-success" : "text-danger"}`}>
                {trend.up ? <TrendingUp size={12} aria-hidden /> : <TrendingDown size={12} aria-hidden />}
                {trend.value}
              </span>
            )}
            {sub}
          </p>
        )}
      </div>
    </>
  );
  const cls = "bg-bg-card border border-border rounded-2xl p-5 flex items-start gap-4";
  return href ? (
    <Link
      href={href}
      className={`${cls} hover:border-primary/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`}
    >
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** "View all ›" style link for a SectionCard header. */
export function CardLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="shrink-0 inline-flex items-center gap-1 h-9 px-2 -mr-2 rounded-md text-sm font-medium text-primary hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      {children} <ChevronRight size={14} aria-hidden />
    </Link>
  );
}

/** One card style for every dashboard / console section. */
export function SectionCard({
  title,
  subtitle,
  action,
  padded = false,
  className = "",
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  padded?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`bg-bg-card border border-border rounded-2xl overflow-hidden flex flex-col ${className}`}>
      <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text-primary">{title}</h2>
          {subtitle && <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className={`flex-1 ${padded ? "p-5" : ""}`}>{children}</div>
    </section>
  );
}

export function EmptyBlock({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
      <Icon size={28} className="text-text-disabled mb-3" aria-hidden />
      <p className="text-sm font-medium text-text-primary">{title}</p>
      {hint && <p className="text-xs text-text-secondary mt-1">{hint}</p>}
    </div>
  );
}
