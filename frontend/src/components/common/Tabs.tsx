"use client";

import { useId, useRef, type ElementType, type KeyboardEvent, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: ElementType;
  /** Small count after the label, e.g. number of documents. */
  count?: number;
}

/**
 * In-page navigation (see DESIGN_SYSTEM.md → Tabs): an underline tab bar.
 * The indicator slides between tabs on a critically damped spring and starts
 * from wherever it is, so rapid switching never jumps. Arrow keys / Home /
 * End move focus and selection (WAI-ARIA tabs). Scrolls horizontally rather
 * than compressing labels when space runs out.
 *
 * Pair each panel with `tabPanelProps(id)` so tabs and panels are linked.
 */
export function TabBar<T extends string>({
  items,
  value,
  onChange,
  label,
  className = "",
  idBase,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Accessible name for the tablist, e.g. "Patient record". */
  label: string;
  className?: string;
  /** Shared with tabPanelProps; defaults to a generated id. */
  idBase?: string;
}) {
  const generated = useId();
  const base = idBase ?? generated;
  const reduceMotion = useReducedMotion();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = items.length - 1;
    const next =
      e.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : e.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    refs.current[next]?.focus();
    onChange(items[next].id);
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      // overflow-x-auto alone makes the y axis scrollable too; the bar only
      // ever scrolls sideways.
      className={`flex gap-1 overflow-x-auto overflow-y-hidden scrollbar-hide border-b border-border ${className}`}
    >
      {items.map(({ id, label: text, icon: Icon, count }, i) => {
        const active = id === value;
        return (
          <button
            key={id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`${base}-tab-${id}`}
            aria-selected={active}
            aria-controls={`${base}-panel-${id}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`relative shrink-0 inline-flex items-center gap-2 h-11 px-3 text-body whitespace-nowrap rounded-t-md cursor-pointer transition-colors focus-visible:outline-none focus-visible:bg-bg-hover ${
              active ? "text-primary-strong font-semibold" : "text-text-secondary font-medium hover:text-text-primary"
            }`}
          >
            {Icon && <Icon size={15} className="shrink-0" aria-hidden />}
            {text}
            {typeof count === "number" && (
              <span
                className={`min-w-5 h-5 px-1.5 rounded-full text-caption tabular-nums grid place-items-center ${
                  active ? "bg-primary/10 text-primary-strong" : "bg-bg-hover text-text-secondary"
                }`}
              >
                {count}
              </span>
            )}
            {active && (
              <motion.span
                layoutId={`${base}-indicator`}
                className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-primary"
                transition={reduceMotion ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.35 }}
                aria-hidden
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function tabPanelProps(base: string, id: string) {
  return {
    role: "tabpanel" as const,
    id: `${base}-panel-${id}`,
    "aria-labelledby": `${base}-tab-${id}`,
    tabIndex: 0,
  };
}

/** Segmented control for 2–4 mutually exclusive views/filters (e.g. To do | All). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex p-[3px] rounded-md bg-bg-hover">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`h-8 px-3 rounded-[6px] text-footnote whitespace-nowrap cursor-pointer transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              on ? "bg-bg-card text-text-primary font-semibold shadow-sm" : "text-text-secondary font-medium hover:text-text-primary"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
