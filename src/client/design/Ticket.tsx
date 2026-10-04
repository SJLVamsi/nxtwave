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

/** Seat ticket styled like the stub at the top of a lab record. */
export function Ticket({ seatNo, name, projectTitle, detail, footer, className }: TicketProps) {
  return (
    <div
      data-testid="seat-ticket"
      className={cn(
        "relative overflow-hidden rounded-xl border border-ink/30 bg-surface shadow-[0_1px_2px_rgba(46,51,59,0.08)]",
        className,
      )}
    >
      <div className="flex items-stretch">
        <div className="flex w-24 shrink-0 flex-col items-center justify-center border-r border-dashed border-ink/40 bg-ink/5 px-3 py-4">
          <span className="text-xs font-bold text-graphite/70">Seat</span>
          <span className="font-display font-stretch-expanded text-3xl font-black text-ink">
            {seatNo}
          </span>
        </div>
        <div className="min-w-0 px-4 py-4">
          {name ? <p className="font-bold text-graphite">{name}</p> : null}
          {projectTitle ? (
            <p className="mt-0.5 truncate text-sm text-graphite/80">{projectTitle}</p>
          ) : null}
          {detail ? <p className="mt-2 text-sm text-graphite/70">{detail}</p> : null}
          {footer ? <div className="mt-3">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
