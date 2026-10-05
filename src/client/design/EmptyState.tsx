import type { ReactNode } from "react";
import { cn } from "./cn";

export interface EmptyStateProps {
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}

/** One line of copy and one action; no illustrations (DESIGN.md §5). */
export function EmptyState({ title, body, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-panel border border-hairline bg-surface-1 px-5 py-8 text-center",
        className,
      )}
    >
      <p className="text-title text-ink text-balance">{title}</p>
      {body ? (
        <p className="mx-auto mt-2 max-w-[42ch] text-body-sm text-ink-muted">{body}</p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
