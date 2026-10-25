"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-bg-light dark:bg-bg-hover",
        className
      )}
    />
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
      <Skeleton className="h-7 w-7 rounded-lg" />
    </div>
  );
}
