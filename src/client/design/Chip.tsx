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
        "inline-flex min-h-9 items-center rounded-full border px-3.5 font-sans text-body-sm font-medium",
        "transition-[transform,background-color,border-color,color] duration-[var(--dur-ui)] ease-[var(--ease-out)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal",
        "enabled:active:scale-[0.97] pointer-coarse:min-h-11",
        selected
          ? "border-signal bg-signal text-signal-ink"
          : "border-hairline bg-surface-2 text-ink-muted hover:border-hairline-strong hover:text-ink",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
