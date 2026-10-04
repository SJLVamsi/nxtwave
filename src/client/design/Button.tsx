import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "quiet";
export type ButtonSize = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-body font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-55";

const sizes: Record<ButtonSize, string> = {
  md: "min-h-11 rounded-lg px-4 text-[0.95rem]",
  lg: "min-h-13 rounded-xl px-5 text-base",
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-paper hover:opacity-90 active:opacity-80",
  secondary: "border border-ink/40 text-ink hover:bg-ink/5 active:bg-ink/10",
  quiet:
    "text-ink underline decoration-ink/40 underline-offset-4 hover:decoration-ink",
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
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function Spinner() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4 animate-spin motion-reduce:animate-none"
      fill="none"
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M8 1.5a6.5 6.5 0 0 1 6.5 6.5" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
