import { useEffect, useState } from "react";
import { cn } from "./cn";

export interface CountdownProps {
  targetIso: string;
  /** Accessible name for the timer. */
  label?: string;
  className?: string;
  /** Rendered when the target has passed. */
  doneText?: string;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Mono tabular countdown; updates each second with no animation on tick. */
export function Countdown({
  targetIso,
  label = "Countdown",
  className,
  doneText = "Starting now",
}: CountdownProps) {
  const target = new Date(targetIso).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remainingMs = Number.isNaN(target) ? 0 : Math.max(0, target - now);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const text =
    remainingMs === 0
      ? doneText
      : `${days > 0 ? `${days}d ` : ""}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return (
    <span
      role="timer"
      aria-label={label}
      className={cn("font-mono text-mono-data text-ink tabular-nums", className)}
    >
      {text}
    </span>
  );
}
