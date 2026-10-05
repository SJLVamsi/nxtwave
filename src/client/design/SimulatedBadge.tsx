import { cn } from "./cn";

export interface SimulatedBadgeProps {
  className?: string;
}

/** Pill labelling simulated rows. Label is exactly "Simulated data" (DESIGN.md §5). */
export function SimulatedBadge({ className }: SimulatedBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-warning/40 bg-warning/[0.12] px-2.5 py-1 text-label text-warning",
        className,
      )}
    >
      Simulated data
    </span>
  );
}
