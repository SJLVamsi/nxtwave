import type { ReactNode } from "react";
import { cn } from "./cn";

export interface EmptyStateProps {
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, body, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-rule bg-surface/60 px-5 py-8 text-center",
        className,
      )}
    >
      <p className="font-display text-lg font-bold text-graphite">{title}</p>
      {body ? <p className="mx-auto mt-1 max-w-sm text-sm text-graphite/70">{body}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
