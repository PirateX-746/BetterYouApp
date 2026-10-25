"use client";

import Link from "next/link";
import { usePractitionerBreadcrumb } from "@/contexts/PractitionerBreadcrumbContext";
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
  // flex + gap rather than space-y: an sr-only heading or a display:none
  // block (mobile-only back link) must not leave a margin behind.
  return <div className={`relative w-full flex flex-col gap-6 ${fill ? FILL : ""} ${className}`}>{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  toolbar,
  back,
  eyebrow,
  className = "",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Buttons/controls aligned right on desktop, stacked below on mobile. */
  actions?: ReactNode;
  /** Finding controls — search, filters — aligned LEFT, opposite the actions. */
  toolbar?: ReactNode;
  /** Optional "← Back" link above the title. */
  back?: { href: string; label: string };
  /** Small line above the title, e.g. a ticket number. */
  eyebrow?: ReactNode;
  className?: string;
}) {
  // In the practitioner shell the topbar already shows this page's name (or
  // its breadcrumb), so a repeated title only costs vertical space: keep the
  // <h1> for assistive tech but hide it visually. A title that says something
  // the topbar doesn't — e.g. a ticket's subject — stays visible.
  const { inShell, extraCrumb } = usePractitionerBreadcrumb();
  const titleInTopbar = inShell && (!back || (typeof title === "string" && title === extraCrumb));
  // With the title in the topbar the subtitle goes too (it only described the
  // title), leaving a single right-aligned row of actions — or nothing at all.
  // The back link shows at every width: the breadcrumb is a way back, but not
  // an obvious one.
  const backLink = back && (
    <Link
      href={back.href}
      className="self-start inline-flex items-center gap-1.5 h-9 -mb-2 text-footnote font-medium text-text-secondary hover:text-text-primary rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
    >
      <ArrowLeft size={16} aria-hidden /> {back.label}
    </Link>
  );
  // Beside a visible title the back control is a compact icon button, so the
  // title row stays one line instead of growing a link above it.
  const backButton = back && (
    <Link
      href={back.href}
      aria-label={`Back to ${back.label}`}
      title={`Back to ${back.label}`}
      className="size-9 shrink-0 grid place-items-center rounded-md border border-border bg-bg-card text-text-secondary shadow-xs hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
    >
      <ArrowLeft size={17} aria-hidden />
    </Link>
  );

  if (titleInTopbar) {
    return (
      <>
        <h1 className="sr-only">{title}</h1>
        {backLink}
        {(toolbar || actions) && (
          <div className={`flex flex-wrap items-center gap-2 ${className}`}>
            {toolbar && <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">{toolbar}</div>}
            {actions && <div className="flex flex-wrap items-center gap-2 ml-auto">{actions}</div>}
          </div>
        )}
      </>
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 flex items-start gap-3">
          {backButton}
          <div className="min-w-0">
            {eyebrow && <div className="text-caption font-mono text-text-secondary mb-1">{eyebrow}</div>}
            <h1 className="text-title-1 font-semibold text-text-primary break-words">{title}</h1>
            {subtitle && <div className="text-body text-text-secondary mt-1">{subtitle}</div>}
          </div>
        </div>
        {(toolbar || actions) && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {toolbar}
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
