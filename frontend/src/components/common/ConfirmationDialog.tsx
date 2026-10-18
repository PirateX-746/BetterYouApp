"use client";

import { Loader2 } from "lucide-react";
import { Modal } from "./Modal";

interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the confirm button in the danger color — use for destructive actions. */
  danger?: boolean;
  loading?: boolean;
}

/**
 * Confirmation prompt for destructive actions, built on the shared Modal.
 * Replaces the browser's native `confirm()` — which blocks the JS thread,
 * can't be styled, and looks out of place next to every other dialog in
 * the app — with something visually consistent and testable.
 */
export function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  loading = false,
}: ConfirmationDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="sm:max-w-sm"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-border text-sm text-text-secondary hover:bg-bg-hover transition disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed ${
              danger
                ? "bg-danger text-white hover:bg-danger/90"
                : "bg-primary text-white hover:bg-primary-hover"
            }`}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      }
    >
      {description && (
        <p className="text-sm text-text-secondary">{description}</p>
      )}
    </Modal>
  );
}
