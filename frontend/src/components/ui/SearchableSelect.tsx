"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

type Option = {
  value: string;
  label: string;
};

type Props = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  /** Lets a <label htmlFor> point at the trigger. */
  id?: string;
};

/**
 * Searchable dropdown following the ARIA combobox pattern: the trigger
 * announces its expanded state, options are a real listbox, and the list is
 * fully keyboard-operable (↑/↓ to move, Enter to pick, Esc to close).
 */
export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  disabled = false,
  loading = false,
  loadingText = "Loading…",
  id,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const autoId = useId();
  const listboxId = `${autoId}-listbox`;
  const optionId = (i: number) => `${autoId}-opt-${i}`;

  const selected = options.find((o) => o.value === value);

  const filtered = query.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : options;

  /* Close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* On open: focus the search box and start on the selected option */
  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, filtered.findIndex((o) => o.value === value)));
    setTimeout(() => inputRef.current?.focus(), 0);
    // Only on opening; typing resets `active` separately below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* Keep the highlighted option scrolled into view */
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`#${CSS.escape(optionId(active))}`)
      ?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, open]);

  const close = (refocus = true) => {
    setOpen(false);
    setQuery("");
    if (refocus) triggerRef.current?.focus();
  };

  const handleSelect = (val: string) => {
    onChange(val);
    close();
  };

  const handleClear = () => {
    onChange("");
    setQuery("");
    triggerRef.current?.focus();
  };

  const onListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[active];
      if (opt) handleSelect(opt.value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation(); // don't also close an enclosing modal
      close();
    } else if (e.key === "Tab") {
      close(false);
    }
  };

  const showClear = !!selected && !disabled && !loading;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => !disabled && !loading && setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        disabled={disabled || loading}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm bg-bg-page border border-border rounded-xl text-left transition cursor-pointer
          focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30
          disabled:opacity-50 disabled:cursor-not-allowed
          hover:border-primary/60 ${showClear ? "pr-16" : ""}`}
      >
        <span
          className={
            selected ? "text-text-primary truncate" : "text-text-disabled"
          }
        >
          {loading ? loadingText : selected ? selected.label : placeholder}
        </span>

        <ChevronDown
          size={14}
          aria-hidden
          className={`shrink-0 ml-2 text-text-secondary transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Clear: a sibling, not nested — a button inside a button is invalid. */}
      {showClear && (
        <button
          type="button"
          onClick={handleClear}
          aria-label={`Clear ${selected!.label}`}
          className="absolute right-8 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-text-disabled hover:text-text-primary hover:bg-bg-hover transition cursor-pointer"
        >
          <X size={12} aria-hidden />
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search size={13} className="text-text-disabled shrink-0" aria-hidden />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onListKeyDown}
              placeholder="Search…"
              aria-label="Search options"
              aria-controls={listboxId}
              aria-activedescendant={filtered[active] ? optionId(active) : undefined}
              className="flex-1 text-sm bg-transparent text-text-primary placeholder:text-text-disabled focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="text-text-disabled hover:text-text-primary transition cursor-pointer"
              >
                <X size={12} aria-hidden />
              </button>
            )}
          </div>

          {/* Options list */}
          <ul ref={listRef} id={listboxId} role="listbox" className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li role="presentation" className="px-3.5 py-2.5 text-sm text-text-disabled text-center">
                No results found
              </li>
            ) : (
              filtered.map((opt, i) => (
                <li
                  key={opt.value}
                  id={optionId(i)}
                  role="option"
                  aria-selected={opt.value === value}
                  onClick={() => handleSelect(opt.value)}
                  onMouseEnter={() => setActive(i)}
                  className={`px-3.5 py-2.5 text-sm cursor-pointer transition
                    ${
                      opt.value === value
                        ? "bg-primary/10 text-primary font-medium"
                        : i === active
                          ? "bg-bg-hover text-text-primary"
                          : "text-text-primary"
                    }`}
                >
                  {opt.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
