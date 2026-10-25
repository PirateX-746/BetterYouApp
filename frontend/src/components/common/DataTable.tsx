"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";

export type SortDirection = "asc" | "desc";
export type SortValue = string | number | Date | boolean | null | undefined;
export interface SortState {
  key: string;
  direction: SortDirection;
}

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
  /**
   * Makes the column sortable: return the raw value to order by (not the
   * rendered cell). Empty values (null / undefined / "") always sort last.
   */
  sortValue?: (row: T) => SortValue;
  /** Direction applied on the first click. Default "asc"; use "desc" for dates. */
  firstSortDirection?: SortDirection;
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
  /** Initial sort. Leave unset to show rows in the order they were passed. */
  defaultSort?: SortState;
  /** Rows per page (client-side). Default 25; pass 0 to show every row. */
  pageSize?: number;
}

const alignClass: Record<NonNullable<DataTableColumn<unknown>["align"]>, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function isEmpty(v: SortValue) {
  return v === null || v === undefined || v === "" || (v instanceof Date && Number.isNaN(v.getTime()));
}

function compareValues(a: SortValue, b: SortValue): number {
  if (typeof a === "string" && typeof b === "string") return collator.compare(a, b);
  const na = a instanceof Date ? a.getTime() : Number(a);
  const nb = b instanceof Date ? b.getTime() : Number(b);
  return na - nb;
}

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
  defaultSort,
  pageSize = 25,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(defaultSort ?? null);
  const sortColumn = sort ? columns.find((c) => c.key === sort.key && c.sortValue) : undefined;

  // Sorting is client-side and stable, so equal values keep their incoming order.
  const rows = useMemo(() => {
    if (!sort || !sortColumn?.sortValue) return data;
    const get = sortColumn.sortValue;
    const dir = sort.direction === "asc" ? 1 : -1;
    return data
      .map((row) => ({ row, value: get(row) }))
      .sort((a, b) => {
        const ae = isEmpty(a.value);
        const be = isEmpty(b.value);
        if (ae || be) return ae === be ? 0 : ae ? 1 : -1;
        return compareValues(a.value, b.value) * dir;
      })
      .map((x) => x.row);
  }, [data, sort, sortColumn]);

  // Paging. A new result set (search, filter) starts again at page 1; the key
  // is derived from the data, not its identity, since callers often pass a
  // freshly filtered array on every render.
  const [page, setPage] = useState(0);
  const dataKey = `${data.length}:${data[0] ? getRowId(data[0]) : ""}`;
  const [pageKey, setPageKey] = useState(dataKey);
  if (pageKey !== dataKey) {
    setPageKey(dataKey);
    setPage(0);
  }
  const paged = pageSize > 0 && rows.length > pageSize;
  const pageCount = paged ? Math.ceil(rows.length / pageSize) : 1;
  const current = Math.min(page, pageCount - 1);
  const pageRows = paged ? rows.slice(current * pageSize, (current + 1) * pageSize) : rows;

  const goToPage = (p: number) => {
    setPage(p);
    bodyScrollRef.current?.scrollTo({ top: 0 });
  };

  const toggleSort = (col: DataTableColumn<T>) => {
    setPage(0);
    setSort((prev) =>
      prev?.key === col.key
        ? { key: col.key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key: col.key, direction: col.firstSortDirection ?? "asc" },
    );
  };

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
      className={`bg-bg-card border border-border/70 rounded-2xl shadow-xs overflow-hidden ${fill ? "flex flex-col flex-1 min-h-0" : ""} ${className ?? ""}`}
    >
      {/* Header — its own scroll container, no vertical overflow, ever. */}
      <div ref={headerScrollRef} className="overflow-x-hidden shrink-0">
        <table className="w-full table-fixed text-left border-separate border-spacing-0">
          {colGroup}
          <thead>
            <tr>
              {columns.map((col) => {
                const active = sort?.key === col.key && !!col.sortValue;
                const SortIcon = !active ? ChevronsUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={col.key}
                    aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}
                    className={`bg-bg-subtle px-5 py-3 text-footnote font-semibold text-text-secondary border-b border-border whitespace-nowrap ${
                      col.align ? alignClass[col.align] : ""
                    }`}
                  >
                    {col.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col)}
                        className={`group/sort -mx-1.5 -my-1 inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-semibold transition-colors hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                          col.align === "right" ? "flex-row-reverse" : ""
                        } ${active ? "text-text-primary" : ""}`}
                      >
                        <span>{col.header}</span>
                        <SortIcon
                          size={13}
                          aria-hidden
                          className={`shrink-0 transition-opacity ${
                            active ? "text-primary-strong" : "text-text-light opacity-0 group-hover/sort:opacity-100 group-focus-visible/sort:opacity-100"
                          }`}
                        />
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
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
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-12 text-center text-sm text-text-secondary"
                >
                  {emptyState ?? "No data to show"}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr
                  key={getRowId(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={
                    onRowClick
                      ? "hover:bg-bg-subtle transition-colors cursor-pointer group"
                      : ""
                  }
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-5 py-3.5 align-middle border-b border-border-light ${col.align ? alignClass[col.align] : ""} ${col.className ?? ""}`}
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

      {(footer || paged) && (
        <div className="px-5 py-2.5 min-h-12 border-t border-border flex flex-wrap items-center justify-between gap-x-4 gap-y-2 shrink-0">
          <div className="min-w-0">{footer}</div>
          {paged && (
            <nav aria-label="Table pages" className="flex items-center gap-2 ml-auto">
              <span className="text-footnote text-text-secondary tabular-nums" aria-live="polite">
                {current * pageSize + 1}–{Math.min((current + 1) * pageSize, rows.length)} of {rows.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => goToPage(current - 1)}
                  disabled={current === 0}
                  aria-label="Previous page"
                  className="size-8 grid place-items-center rounded-md border border-border bg-bg-card text-text-secondary hover:bg-bg-hover hover:text-text-primary cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
                >
                  <ChevronLeft size={16} aria-hidden />
                </button>
                <span className="px-1.5 text-footnote text-text-secondary tabular-nums">
                  Page <span className="font-semibold text-text-primary">{current + 1}</span> of {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => goToPage(current + 1)}
                  disabled={current >= pageCount - 1}
                  aria-label="Next page"
                  className="size-8 grid place-items-center rounded-md border border-border bg-bg-card text-text-secondary hover:bg-bg-hover hover:text-text-primary cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
                >
                  <ChevronRight size={16} aria-hidden />
                </button>
              </div>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
