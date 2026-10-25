import type { ReactNode } from "react";

/**
 * Surfaces (see DESIGN_SYSTEM.md → Surfaces).
 *
 *   <Card>
 *     <CardHeader title="General information" actions={<Button size="sm" variant="ghost">Edit</Button>} />
 *     <CardBody>…</CardBody>
 *   </Card>
 *
 * A Card is white on the grey canvas; the contrast does the separating, so it
 * carries only a hairline border and the resting shadow. Don't nest Cards —
 * group inside one with <CardSection> or spacing instead.
 */
const CARD_VARIANT = {
  /** White surface on the canvas — the default for everything. */
  default: "bg-bg-card border border-border/70 shadow-xs",
  /** Faint brand wash — a quiet emphasis (record header, a highlighted section). */
  tinted: "bg-brand-soft border border-primary/15 shadow-xs",
  /** Deep blue gradient with white text — ONE hero per view at most (e.g. the
      day's key number). Use `on-brand` buttons and white/80 secondary text. */
  featured: "bg-brand text-white border border-transparent shadow-brand",
} as const;

export function Card({
  children,
  className = "",
  variant = "default",
  as: Tag = "section",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  variant?: keyof typeof CARD_VARIANT;
  as?: "section" | "div" | "article" | "aside";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={`rounded-2xl ${CARD_VARIANT[variant]} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  description,
  icon,
  actions,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Optional small leading icon (16px). */
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 px-5 pt-4 pb-3 min-h-14 ${className}`}>
      <div className="min-w-0 flex items-start gap-2.5">
        {icon && <span className="mt-0.5 text-text-secondary shrink-0">{icon}</span>}
        <div className="min-w-0">
          <h2 className="text-title-3 font-semibold text-text-primary">{title}</h2>
          {description && <p className="text-footnote text-text-secondary mt-0.5">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
    </div>
  );
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-5 pb-5 ${className}`}>{children}</div>;
}

/** A divided sub-group inside a Card — use instead of nesting another Card. */
export function CardSection({
  title,
  children,
  className = "",
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`border-t border-border-light px-5 py-4 ${className}`}>
      {title && <h3 className="text-eyebrow font-semibold uppercase text-text-secondary mb-3">{title}</h3>}
      {children}
    </div>
  );
}

/**
 * Label/value rows for read-only record data, aligned to a shared label
 * column so values line up down the card (like a form, without inputs).
 */
export function InfoList({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <dl className={`divide-y divide-border-light ${className}`}>{children}</dl>;
}

export function InfoRow({
  label,
  children,
  emphasis,
}: {
  label: ReactNode;
  children: ReactNode;
  /** Draws attention to clinically important values (e.g. allergies). */
  emphasis?: "warning" | "danger";
}) {
  const valueCls =
    emphasis === "danger"
      ? "text-danger-strong font-medium"
      : emphasis === "warning"
        ? "text-warning-strong font-medium"
        : "text-text-primary";
  return (
    <div className="grid grid-cols-[minmax(6.5rem,34%)_minmax(0,1fr)] gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-body text-text-secondary">{label}</dt>
      <dd className={`text-body break-words [overflow-wrap:anywhere] ${valueCls}`}>{children}</dd>
    </div>
  );
}

/** Empty value placeholder, so blanks read as "not recorded" rather than missing UI. */
export function NotRecorded({ children = "Not recorded" }: { children?: ReactNode }) {
  return <span className="text-text-light">{children}</span>;
}
