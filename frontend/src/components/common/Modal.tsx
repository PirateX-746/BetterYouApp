"use client";

import { useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Tailwind max-width class for the desktop dialog, e.g. "sm:max-w-lg". */
  maxWidth?: string;
}

/**
 * One modal shell for the whole app: bottom sheet on mobile, centered
 * dialog on desktop, Esc-to-close, click-outside-to-close, scrollable body
 * capped at 92dvh. Every custom (non-Radix) modal should be built from
 * this rather than reimplementing the overlay/backdrop/close-button
 * boilerplate — that's how the Esc-key bug happened in the first place:
 * four near-identical modals, each with its own copy to forget.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = "sm:max-w-lg",
}: ModalProps) {
  useEscapeToClose(open, onClose);
  const titleId = useId();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative w-full ${maxWidth} bg-bg-card rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92dvh]`}
      >
        <div className="flex justify-center pt-3 sm:hidden shrink-0">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-4 shrink-0 border-b border-border">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-text-primary">{title}</h2>
            {subtitle && (
              <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-hover text-text-secondary transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {children}
        </div>

        {footer && (
          <div className="flex items-center gap-3 px-5 py-4 border-t border-border shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
