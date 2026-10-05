import type { ReactNode } from "react";
import { cn } from "./cn";

export interface TicketProps {
  seatNo: number;
  name?: string;
  projectTitle?: string | null;
  detail?: string;
  footer?: ReactNode;
  className?: string;
}

/** Seat ticket (DESIGN.md §5): mono seat number in signal at mono-stat size. */
export function Ticket({ seatNo, name, projectTitle, detail, footer, className }: TicketProps) {
  return (
    <div
      data-testid="seat-ticket"
      className={cn("overflow-hidden rounded-panel border border-hairline bg-surface-2", className)}
    >
      <div className="px-5 py-5">
        <p className="text-label text-ink-subtle">Seat</p>
        <p className="font-mono text-mono-stat text-signal tabular-nums">{seatNo}</p>
        {name ? <p className="mt-2 text-title text-ink">{name}</p> : null}
        {projectTitle ? (
          <p className="mt-1 truncate text-body-sm text-ink-muted">{projectTitle}</p>
        ) : null}
        {detail ? <p className="mt-3 text-body-sm text-ink-subtle">{detail}</p> : null}
      </div>
      {footer ? (
        <div className="border-t border-dashed border-hairline-strong px-5 py-4">{footer}</div>
      ) : null}
    </div>
  );
}
