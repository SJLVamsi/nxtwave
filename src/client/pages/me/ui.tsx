/**
 * WS4 — local design workaround until WS3's design/ components land.
 * Plain Tailwind with PRD §5 tokens (paper/ink/graphite/margin/rule/highlight).
 * Swap these for src/client/design/* at integration.
 */
import { type ReactNode, useEffect, useState } from "react";
import { cx } from "./format";

export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#FBFCFE] px-4 pb-16 pt-6 text-[#2E333B]">
      <div className="mx-auto w-full max-w-xl">
        <header className="mb-5">
          <p className="text-sm font-bold text-[#1F3A93]">Ship60 · NxtWave</p>
          <h1 className="mt-1 text-2xl font-bold leading-tight text-[#1F3A93]">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-[#2E333B]">{subtitle}</p> : null}
        </header>
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
    <section
      className={cx(
        "rounded-lg border border-[#DDE5F2] bg-white p-4 shadow-[0_1px_0_#DDE5F2]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 text-base font-bold text-[#2E333B]">{children}</h2>;
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="h-24 animate-pulse rounded-lg bg-[#DDE5F2]" />
      <div className="h-16 animate-pulse rounded-lg bg-[#DDE5F2]" />
      <div className="h-16 animate-pulse rounded-lg bg-[#DDE5F2]" />
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
    <Panel className="border-l-4 border-l-[#D7263D]">
      <h2 className="text-base font-bold text-[#D7263D]">{title}</h2>
      <p className="mt-1 text-sm">{message}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </Panel>
  );
}

export function SimulatedBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-[#DDE5F2] bg-[#FFE45C] px-2 py-0.5 text-xs font-bold text-[#2E333B]">
      Simulated data
    </span>
  );
}

export function StatusBadge({ status }: { status: "pending" | "qualified" | "rejected" }) {
  const styles = {
    pending: "border-[#DDE5F2] bg-white text-[#2E333B]",
    qualified: "border-[#1F3A93] bg-[#1F3A93] text-white",
    rejected: "border-[#D7263D] bg-white text-[#D7263D]",
  } as const;
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold",
        styles[status],
      )}
    >
      {status === "qualified" ? "checked in" : status}
    </span>
  );
}

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
  className,
  onCopied,
}: {
  text: string;
  label?: string;
  className?: string;
  onCopied?: () => void;
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
    <button
      type="button"
      onClick={onCopy}
      aria-live="polite"
      className={cx(
        "inline-flex min-h-11 items-center justify-center rounded-md border border-[#1F3A93] px-3 py-2 text-sm font-bold text-[#1F3A93] hover:bg-[#1F3A93] hover:text-white",
        className,
      )}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

export function Countdown({ targetIso }: { targetIso: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const diff = new Date(targetIso).getTime() - now;
  if (Number.isNaN(diff)) return null;
  if (diff <= 0) {
    return (
      <span className="font-bold text-[#D7263D]" role="status">
        The workshop is live now
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
    <span role="status" className="font-bold tabular-nums text-[#1F3A93]">
      Starts in {days > 0 ? `${days}d ` : ""}
      {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </span>
  );
}


