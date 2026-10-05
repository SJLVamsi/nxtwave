import type { ReactNode } from "react";
import { cn } from "./cn";

export interface StatProps {
  value: ReactNode;
  label: string;
  className?: string;
}

/** Mono number plus label; used in admin and leaderboard (DESIGN.md §5). */
export function Stat({ value, label, className }: StatProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className="font-mono text-mono-stat text-ink tabular-nums">{value}</span>
      <span className="text-label text-ink-subtle">{label}</span>
    </div>
  );
}
