"use client";

import { useRef, type ReactNode } from "react";

export interface DataTableColumn<T> {
  /** Unique key for this column (used as the React key, not shown). */
  key: string;
  header: ReactNode;
  /** e.g. "28%" or "120px" — passed through to <col>, not Tailwind. */
  width?: string;
  align?: "left" | "center" | "right";
  /** Extra classes applied to every body cell in this column. */
  className?: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Caps the scrollable body height — the header sits above it, unscrolled. */
  maxBodyHeight?: string;
  footer?: ReactNode;
  emptyState?: ReactNode;
  className?: string;
  /**
   * Grow to fill the remaining height of a flex-column parent (e.g. <Page fill>)
   * and scroll only the rows. Ignores maxBodyHeight.
   */
  fill?: boolean;
}

const alignClass: Record<NonNullable<DataTableColumn<unknown>["align"]>, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

/**
 * One table implementation for the whole app, so every table looks and
 * scrolls the same regardless of what data it holds.
 *
 * Header and body are two separate <table>s in two separate scroll
 * containers — not one table with a `sticky` thead. That's deliberate: a
 * sticky thead still sits inside the same scrolling box as the body, so the
 * browser's scrollbar track runs the full height of that box and visually
 * overlaps the header row. Splitting them means the header never scrolls
 * and never shows a scrollbar at all — only the body does. A shared
 * <colgroup> keeps the two tables' columns aligned, and horizontal scroll
 * is synced between them so they can't drift apart.
 */
export function DataTable<T>({
  columns,
  data,
  getRowId,
  onRowClick,
  maxBodyHeight = "calc(100vh - 21rem)",
  footer,
  emptyState,
  className,
  fill = false,
}: DataTableProps<T>) {
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  const syncHeaderScroll = () => {
    if (headerScrollRef.current && bodyScrollRef.current) {
      headerScrollRef.current.scrollLeft = bodyScrollRef.current.scrollLeft;
    }
  };

  const colGroup = (
    <colgroup>
      {columns.map((col) => (
        <col key={col.key} style={col.width ? { width: col.width } : undefined} />
      ))}
    </colgroup>
  );

  return (
    <div
      className={`bg-bg-card border border-border rounded-2xl overflow-hidden ${fill ? "flex flex-col flex-1 min-h-0" : ""} ${className ?? ""}`}
    >
      {/* Header — its own scroll container, no vertical overflow, ever. */}
      <div ref={headerScrollRef} className="overflow-x-hidden shrink-0">
        <table className="w-full table-fixed text-left border-separate border-spacing-0">
          {colGroup}
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`bg-bg-card px-5 py-5 text-xs font-semibold text-text-secondary uppercase tracking-wide border-b border-border whitespace-nowrap ${
                    col.align ? alignClass[col.align] : ""
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
        </table>
      </div>

      {/* Body — the only part that ever scrolls, vertically or horizontally. */}
      <div
        ref={bodyScrollRef}
        onScroll={syncHeaderScroll}
        className={`overflow-auto ${fill ? "flex-1 min-h-0" : ""}`}
        style={fill ? undefined : { maxHeight: maxBodyHeight }}
      >
        <table className="w-full table-fixed text-left border-separate border-spacing-0">
          {colGroup}
          {/*
            Row dividers live on each <td>, not on <tr>/<tbody> (a `divide-y`
            there sets border on the <tr>, which the separated-borders model
            — required for the header/body split above — never renders; only
            cell borders are honored under border-separate). `:last-child`
            cells skip the border so it doesn't double up against the footer.
          */}
          <tbody className="[&>tr:last-child>td]:border-b-0">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-12 text-center text-sm text-text-secondary"
                >
                  {emptyState ?? "No data to show"}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={getRowId(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={
                    onRowClick
                      ? "hover:bg-bg-hover transition-colors cursor-pointer group"
                      : ""
                  }
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-5 py-3.5 align-middle border-b border-border ${col.align ? alignClass[col.align] : ""} ${col.className ?? ""}`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {footer && (
        <div className="px-5 py-3 border-t border-border flex items-center justify-between shrink-0">
          {footer}
        </div>
      )}
    </div>
  );
}
