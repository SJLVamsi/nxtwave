import { useEffect, useState } from "react";
import { cn } from "./cn";

export type ToastVariant = "info" | "success" | "error";

const variantStyles: Record<ToastVariant, string> = {
  info: "border-hairline bg-surface-3 text-ink",
  success: "border-success/40 bg-surface-3 text-ink",
  error: "border-danger/50 bg-surface-3 text-ink",
};

export interface ToastProps {
  message: string;
  variant?: ToastVariant;
  onDismiss?: () => void;
  durationMs?: number;
}

export function Toast({ message, variant = "info", onDismiss, durationMs = 5000 }: ToastProps) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setShown(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!onDismiss || durationMs <= 0) return;
    const timer = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(timer);
  }, [onDismiss, durationMs]);

  return (
    <div
      role="status"
      className={cn(
        "w-full max-w-sm rounded-panel border px-4 py-3 text-body-sm",
        "transition-[opacity,transform] duration-[var(--dur-ui)] ease-[var(--ease-out)]",
        shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
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
    host.className =
      "fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]";
    document.body.appendChild(host);
  }
  const node = document.createElement("div");
  node.className = cn(
    "w-full max-w-sm rounded-panel border px-4 py-3 text-body-sm shadow-[0_16px_40px_rgba(0,0,0,0.5)]",
    variantStyles[opts.variant ?? "info"],
  );
  node.style.opacity = "0";
  node.style.transform = "translateY(8px)";
  node.style.transition =
    "opacity var(--dur-ui) var(--ease-out), transform var(--dur-ui) var(--ease-out)";
  node.textContent = message;
  host.appendChild(node);
  window.requestAnimationFrame(() => {
    node.style.opacity = "1";
    node.style.transform = "translateY(0)";
  });
  window.setTimeout(
    () => {
      node.style.transition =
        "opacity 120ms var(--ease-out), transform 120ms var(--ease-out)";
      node.style.opacity = "0";
      node.style.transform = "translateY(8px)";
      window.setTimeout(() => node.remove(), 140);
    },
    opts.durationMs ?? 5000,
  );
}
