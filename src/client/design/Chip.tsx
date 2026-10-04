import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

export function Chip({ selected = false, className, children, type = "button", ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-10 items-center rounded-full border px-3.5 font-body text-sm font-bold transition-colors",
        selected
          ? "border-ink bg-ink text-paper"
          : "border-rule bg-surface text-graphite hover:border-ink/50",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
