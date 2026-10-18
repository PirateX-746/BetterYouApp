import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

/**
 * The standard page frame for every portal screen.
 *
 *   <Page>
 *     <PageHeader title="Patients" subtitle="14 patients" actions={<AddButton />} />
 *     …content…
 *   </Page>
 *
 * Pages always use the full content width the portal layout gives them —
 * no per-page max-w-* — so every screen lines up with the others. Constrain
 * individual blocks of long prose inside the page instead (e.g. max-w-prose).
 */
/**
 * `fill`: the page is exactly one viewport tall (below the topbar) as a flex
 * column, so its last block — a calendar or <DataTable fill> — stretches to
 * the bottom and scrolls inside itself instead of scrolling the page.
 * Heights mirror the portal layout: 3.5rem topbar, main padding (2rem /
 * 3rem from md), and the 4rem mobile bottom nav below lg.
 */
const FILL =
  "flex flex-col h-[calc(100dvh-9.5rem)] md:h-[calc(100dvh-10.5rem)] lg:h-[calc(100dvh-6.5rem)] min-h-[480px]";

export function Page({
  children,
  className = "",
  fill = false,
}: {
  children: ReactNode;
  className?: string;
  fill?: boolean;
}) {
  return <div className={`w-full space-y-5 ${fill ? FILL : ""} ${className}`}>{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
  eyebrow,
  className = "",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Buttons/controls aligned right on desktop, stacked below on mobile. */
  actions?: ReactNode;
  /** Optional "← Back" link above the title. */
  back?: { href: string; label: string };
  /** Small line above the title, e.g. a ticket number. */
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {back && (
        <Link
          href={back.href}
          className="inline-flex items-center gap-1.5 h-11 text-sm text-text-secondary hover:text-text-primary rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
        >
          <ArrowLeft size={16} aria-hidden /> {back.label}
        </Link>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <div className="text-xs font-mono text-text-secondary mb-1">{eyebrow}</div>}
          <h1 className="text-xl font-semibold text-text-primary break-words">{title}</h1>
          {subtitle && <div className="text-sm text-text-secondary mt-0.5">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
