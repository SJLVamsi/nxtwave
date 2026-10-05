import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "quiet";
export type ButtonSize = "md" | "lg";

const base =
  "relative inline-flex items-center justify-center gap-2 rounded-control font-sans font-medium " +
  "transition-[transform,background-color,border-color,color,opacity] duration-[var(--dur-ui)] ease-[var(--ease-out)] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal " +
  "enabled:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45";

const sizes: Record<ButtonSize, string> = {
  md: "min-h-11 px-4 text-[0.9375rem]",
  lg: "min-h-13 px-5 text-body",
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-signal text-signal-ink hover:bg-signal/85",
  secondary:
    "border border-hairline bg-surface-2 text-ink hover:border-hairline-strong hover:bg-surface-3",
  ghost: "text-ink-muted hover:bg-surface-2 hover:text-ink",
  danger: "bg-danger text-signal-ink hover:bg-danger/85",
  /** @deprecated use `ghost`; kept so existing pages keep compiling. */
  quiet: "text-ink-muted underline decoration-hairline-strong underline-offset-4 hover:text-ink",
};

/**
 * Class builder for anchors/links that need to look like a button
 * (`<Link className={buttonClass({ variant: "primary" })}>`).
 */
export function buttonClass(opts?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}): string {
  const { variant = "primary", size = "md", fullWidth = false, className } = opts ?? {};
  return cn(base, sizes[size], variants[variant], fullWidth && "w-full", className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, fullWidth, className })}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>
        {children}
      </span>
      {loading ? (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner />
        </span>
      ) : null}
    </button>
  );
}

export function Spinner({ className }: { className?: string } = {}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={cn("h-4 w-4 animate-spinner motion-reduce:animate-none", className)}
      fill="none"
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M8 1.5a6.5 6.5 0 0 1 6.5 6.5" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
