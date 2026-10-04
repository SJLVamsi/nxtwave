import { useEffect } from "react";
import { cn } from "./cn";

export type ToastVariant = "info" | "success" | "error";

const variantStyles: Record<ToastVariant, string> = {
  info: "border-ink/30 bg-surface text-graphite",
  success: "border-ink/40 bg-ink text-paper",
  error: "border-margin bg-surface text-margin",
};

export interface ToastProps {
  message: string;
  variant?: ToastVariant;
  onDismiss?: () => void;
  durationMs?: number;
}

export function Toast({ message, variant = "info", onDismiss, durationMs = 5000 }: ToastProps) {
  useEffect(() => {
    if (!onDismiss || durationMs <= 0) return;
    const timer = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(timer);
  }, [onDismiss, durationMs]);

  return (
    <div
      role="status"
      className={cn(
        "w-full max-w-sm rounded-lg border px-4 py-3 text-sm font-bold shadow-lg",
        variantStyles[variant],
      )}
    >
      {message}
    </div>
  );
}

/**
 * Imperative toast for code outside a React tree. Mounts its own container so
 * pages do not need a provider wired into App.tsx.
 */
export function showToast(
  message: string,
  opts: { variant?: ToastVariant; durationMs?: number } = {},
): void {
  if (typeof document === "undefined") return;
  let host = document.getElementById("s60-toasts");
  if (!host) {
    host = document.createElement("div");
    host.id = "s60-toasts";
    host.setAttribute("aria-live", "polite");
    host.className = "fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4";
    document.body.appendChild(host);
  }
  const node = document.createElement("div");
  node.className = cn(
    "w-full max-w-sm rounded-lg border px-4 py-3 text-sm font-bold shadow-lg",
    variantStyles[opts.variant ?? "info"],
  );
  node.textContent = message;
  host.appendChild(node);
  window.setTimeout(() => node.remove(), opts.durationMs ?? 5000);
}
