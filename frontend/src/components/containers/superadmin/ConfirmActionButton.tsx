"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";

/**
 * A small table-row action that asks before it runs — disable a member,
 * revoke an invitation. Owns its dialog and busy state so a table can drop
 * one in per row.
 */
export function ConfirmActionButton({
  label,
  title,
  description,
  confirmLabel,
  success,
  danger = false,
  onConfirm,
  onDone,
}: {
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  success: string;
  danger?: boolean;
  onConfirm: () => Promise<unknown>;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);

  async function run() {
    setWorking(true);
    try {
      await onConfirm();
      toast.success(success);
      setOpen(false);
      onDone();
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: unknown } } })
        ?.response?.data?.message;
      toast.error(
        Array.isArray(m)
          ? m.join(". ")
          : typeof m === "string"
            ? m
            : "Action failed",
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant={danger ? "danger-ghost" : "ghost"}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <ConfirmationDialog
        open={open}
        onClose={() => !working && setOpen(false)}
        onConfirm={run}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        danger={danger}
        loading={working}
      />
    </>
  );
}
