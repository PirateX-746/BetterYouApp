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

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-bg-light flex items-center justify-center mb-4">
        <Icon size={24} className="text-text-secondary" />
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary max-w-xs leading-relaxed">{description}</p>
      )}
      {action && (
        <Button
          onClick={action.onClick}
          className="mt-5"
          size="sm"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
