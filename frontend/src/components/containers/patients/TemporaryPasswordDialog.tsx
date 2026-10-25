"use client";

import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { Modal } from "@/components/common/Modal";

export interface IssuedPassword {
  patientName: string;
  email: string;
  temporaryPassword: string;
  /** ISO date */
  expiresAt: string;
}

/**
 * Shows a patient's one-time password, once. The server stores only its
 * hash, so after this closes nobody can see it again — a new one has to be
 * issued from the patient's profile.
 */
export function TemporaryPasswordDialog({
  issued,
  onClose,
  title = "Patient added",
}: {
  issued: IssuedPassword | null;
  onClose: () => void;
  title?: string;
}) {
  // Keyed to the password itself, so a newly issued one never shows "Copied".
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const copied = !!issued && copiedValue === issued.temporaryPassword;

  const copy = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.temporaryPassword);
      setCopiedValue(issued.temporaryPassword);
    } catch {
      // Clipboard can be blocked (permissions, insecure context); the
      // password is selectable text, so it can still be copied by hand.
    }
  };

  const expires = issued
    ? new Date(issued.expiresAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <Modal
      open={!!issued}
      onClose={onClose}
      title={title}
      subtitle={issued ? `${issued.patientName} · ${issued.email}` : undefined}
      maxWidth="sm:max-w-md"
      footer={
        <div className="flex justify-end w-full">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      }
    >
      {issued && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <KeyRound size={18} aria-hidden />
            </span>
            <p className="text-sm text-text-secondary leading-relaxed">
              Give the patient this temporary password in person or by phone. They&apos;ll choose their own
              password the first time they sign in.
            </p>
          </div>

          <div className="space-y-1.5">
            <p id="temp-pw-label" className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Temporary password
            </p>
            <div className="flex items-stretch gap-2">
              <output
                aria-labelledby="temp-pw-label"
                className="flex-1 min-w-0 flex items-center px-3.5 h-11 rounded-xl bg-bg-page border border-border font-mono text-base tracking-wider text-text-primary select-all break-all"
              >
                {issued.temporaryPassword}
              </output>
              <button
                type="button"
                onClick={() => void copy()}
                className="h-11 inline-flex items-center gap-2 px-4 rounded-xl border border-border text-sm text-text-primary hover:bg-bg-hover transition-colors cursor-pointer shrink-0"
              >
                {copied ? <Check size={16} className="text-success-strong" aria-hidden /> : <Copy size={16} aria-hidden />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-xs text-text-secondary" role="status" aria-live="polite">
              {copied ? "Copied to clipboard." : ""}
            </p>
          </div>

          <ul className="text-xs text-text-secondary space-y-1 list-disc pl-4">
            <li>Expires on {expires} if it isn&apos;t used.</li>
            <li>It won&apos;t be shown again. If it&apos;s lost, use “Reset password” on the patient&apos;s profile.</li>
          </ul>
        </div>
      )}
    </Modal>
  );
}
