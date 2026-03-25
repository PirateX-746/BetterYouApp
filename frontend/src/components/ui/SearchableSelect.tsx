"use client";

import { useEffect, useRef, useState } from "react";
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
};

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  disabled = false,
  loading = false,
  loadingText = "Loading…",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  /* Focus input when dropdown opens */
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && !loading && setOpen((v) => !v)}
        disabled={disabled || loading}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm bg-bg-page border border-border rounded-xl text-left transition
          focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary
          disabled:opacity-50 disabled:cursor-not-allowed
          hover:border-primary/60"
      >
        <span
          className={
            selected ? "text-text-primary truncate" : "text-text-disabled"
          }
        >
          {loading ? loadingText : selected ? selected.label : placeholder}
        </span>

        <span className="flex items-center gap-1 shrink-0 ml-2">
          {selected && !disabled && (
            <span
              role="button"
              onClick={handleClear}
              className="p-0.5 rounded text-text-disabled hover:text-text-primary transition"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`text-text-secondary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search size={13} className="text-text-disabled shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="flex-1 text-sm bg-transparent text-text-primary placeholder:text-text-disabled focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-text-disabled hover:text-text-primary transition"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options list */}
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3.5 py-2.5 text-sm text-text-disabled text-center">
                No results found
              </li>
            ) : (
              filtered.map((opt) => (
                <li
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`px-3.5 py-2.5 text-sm cursor-pointer transition
                    ${
                      opt.value === value
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-text-primary hover:bg-bg-hover"
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
