/**
 * Operate-surface primitives for the Ship60 "Flight Deck" world (DESIGN.md).
 * Local to /me, /leaderboard, /ambassador, /live, /submit and /cert; everything
 * here composes the design system in `src/client/design/` — no second palette.
 */
import { type ReactNode, useEffect, useState } from "react";
import { Button, cn } from "../../design";

/* ---------------------------------- shell ---------------------------------- */

export function PageShell({
  title,
  subtitle,
  topRight,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Quiet mono context for the top bar (e.g. the workshop countdown). */
  topRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-canvas font-sans text-ink">
      <header className="border-b border-hairline">
        <div className="mx-auto flex w-full max-w-xl items-baseline justify-between gap-4 px-4 py-3">
          <a
            href="/"
            className="rounded-sm text-title text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
          >
            Ship60
          </a>
          {topRight ? <div className="min-w-0 text-right">{topRight}</div> : null}
        </div>
      </header>
      <div className="mx-auto w-full max-w-xl px-4 pb-[calc(4rem+env(safe-area-inset-bottom))] pt-8">
        <div className="mb-6">
          <h1 className="font-display text-display-lg text-ink text-balance">{title}</h1>
          {subtitle ? (
            <p className="mt-2 max-w-[60ch] text-body-sm text-ink-muted">{subtitle}</p>
          ) : null}
        </div>
        {children}
      </div>
    </main>
  );
}

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-panel border border-hairline bg-surface-1 p-4", className)}>
      {children}
    </section>
  );
}

export function SectionTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn("mb-3 text-title text-ink text-balance", className)}>{children}</h2>
  );
}

/* ---------------------------------- states --------------------------------- */

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div
        aria-hidden="true"
        className="h-36 animate-skeleton rounded-panel border border-hairline bg-surface-1 motion-reduce:animate-none"
      />
      <div
        aria-hidden="true"
        className="h-24 animate-skeleton rounded-panel border border-hairline bg-surface-1 motion-reduce:animate-none"
      />
    </div>
  );
}

export function ErrorState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <Panel>
      <h2 className="font-display text-title text-danger">{title}</h2>
      <p className="mt-1.5 text-body-sm leading-relaxed text-ink-muted">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </Panel>
  );
}

/* ---------------------------------- badges --------------------------------- */

const STATUS_STYLES = {
  pending: "border-warning/40 text-warning",
  qualified: "border-success/40 text-success",
  rejected: "border-danger/50 text-danger",
} as const;

export function StatusBadge({ status }: { status: "pending" | "qualified" | "rejected" }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border bg-surface-2 px-2.5 py-0.5 text-label font-medium",
        STATUS_STYLES[status],
      )}
    >
      {status === "qualified" ? "checked in" : status}
    </span>
  );
}

const CONNECTION_STYLES = {
  connecting: "border-warning/40 text-warning",
  open: "border-signal/40 text-signal",
  reconnecting: "border-warning/40 text-warning",
  failed: "border-danger/50 text-danger",
} as const;

const CONNECTION_COPY = {
  connecting: "Connecting…",
  open: "Live",
  reconnecting: "Reconnecting…",
  failed: "Offline",
} as const;

export function ConnectionStatus({
  status,
}: {
  status: "connecting" | "open" | "reconnecting" | "failed";
}) {
  return (
    <span
      role="status"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-label font-medium",
        CONNECTION_STYLES[status],
      )}
    >
      {status === "open" ? (
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      ) : null}
      {CONNECTION_COPY[status]}
    </span>
  );
}

/* --------------------------------- controls -------------------------------- */

function legacyCopy(text: string): boolean {
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "0";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

export function CopyButton({
  text,
  label = "Copy",
  variant = "secondary",
  className,
  onCopied,
  testId,
}: {
  text: string;
  label?: string;
  variant?: "primary" | "secondary";
  className?: string;
  onCopied?: () => void;
  testId?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) ok = legacyCopy(text);
    if (ok) {
      setCopied(true);
      onCopied?.();
      window.setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      data-testid={testId}
      onClick={onCopy}
      aria-live="polite"
      className={className}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}

/* ---------------------------------- icons ---------------------------------- */

/** One stroke weight across the operate surfaces (DESIGN.md §10). */
export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={cn("h-4 w-4 shrink-0", className)}
      fill="none"
    >
      <path
        d="M3 8.5 6.5 12 13 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* -------------------------------- countdown -------------------------------- */

/**
 * Workshop countdown with the page's own copy. Kept local because the operate
 * pages pair a quiet label with the mono value; the ticking number itself is
 * the design system's `Countdown` (mono tabular, no animation on tick).
 */
export function CountdownLabel({ targetIso }: { targetIso: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const diff = new Date(targetIso).getTime() - now;
  if (Number.isNaN(diff)) return null;
  if (diff <= 0) {
    return (
      <span className="text-label font-medium text-signal" role="status">
        Live now
      </span>
    );
  }
  const total = Math.floor(diff / 1000);
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="text-label text-ink-subtle" role="status">
      Starts in{" "}
      <span className="font-mono text-mono-data text-ink tabular-nums">
        {days > 0 ? `${days}d\u00a0` : ""}
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    </span>
  );
}
