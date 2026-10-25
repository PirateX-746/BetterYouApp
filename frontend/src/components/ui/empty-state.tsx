"use client";

import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/* The action is tertiary on purpose: the section header normally carries the
   primary "Add" button, and a view gets one primary action (DESIGN_SYSTEM.md). */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-bg-hover flex items-center justify-center mb-4">
        <Icon size={22} className="text-text-secondary" aria-hidden />
      </div>
      <h3 className="text-body font-semibold text-text-primary mb-1">{title}</h3>
      {description && (
        <p className="text-footnote text-text-secondary max-w-xs">{description}</p>
      )}
      {action && (
        <Button
          onClick={action.onClick}
          className="mt-5"
          size="sm"
          variant="tertiary"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
