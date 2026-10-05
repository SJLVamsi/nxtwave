import type { IdeaCard } from "../../shared/contracts";
import { cn } from "./cn";

export interface ProjectCardProps {
  idea: IdeaCard;
  /** Play the single "written on the page" reveal. Respects reduced motion. */
  writing?: boolean;
  className?: string;
}

/**
 * The hero object (DESIGN.md §5): surface-1 panel, mono meta row, display
 * title, three numbered steps, tools as chips. The one authored moment is the
 * title revealing behind a mono caret — clip-path + opacity over 320ms.
 */
export function ProjectCard({ idea, writing = true, className }: ProjectCardProps) {
  const meta = [idea.branch, idea.interest, "60 MIN"];

  return (
    <article
      data-testid="project-card"
      className={cn("overflow-hidden rounded-panel border border-hairline bg-surface-1", className)}
      aria-label={`Project preview: ${idea.title}`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-hairline px-4 py-3 font-mono text-mono-data text-ink-subtle sm:px-5">
        {meta.map((part, index) => (
          <span key={part} className="flex items-center gap-2">
            {index > 0 ? (
              <span aria-hidden="true" className="text-hairline-strong">
                ·
              </span>
            ) : null}
            <span className={index === 0 ? "text-ink-muted" : undefined}>{part}</span>
          </span>
        ))}
      </div>

      <div className="px-4 py-5 sm:px-5">
        <h3 className="text-title text-ink text-balance">
          <span className={cn("inline-block", writing && "s60-written")}>{idea.title}</span>
          {writing ? (
            <span
              aria-hidden="true"
              className="s60-caret ml-1 inline-block h-[0.85em] w-[0.08em] translate-y-[0.08em] bg-signal align-baseline"
            />
          ) : null}
        </h3>

        <p className="mt-2 text-body-sm text-ink-muted">{idea.pitch}</p>

        <ol className="mt-4 divide-y divide-hairline border-y border-hairline">
          {idea.steps.map((step, index) => (
            <li
              key={step}
              className={cn(
                "grid grid-cols-[1.75rem_1fr] gap-3 py-3",
                writing && "s60-step",
              )}
              style={writing ? { animationDelay: `${320 + index * 40}ms` } : undefined}
            >
              <span className="font-mono text-mono-data text-ink-subtle tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-body-sm text-ink">{step}</span>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-label text-ink-subtle">Tools</span>
          {idea.tools.map((tool) => (
            <span
              key={tool}
              className="inline-flex items-center rounded-full border border-hairline bg-surface-2 px-2.5 py-1 text-label text-ink-muted"
            >
              {tool}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline px-4 py-3 sm:px-5">
        <p className="text-body-sm text-ink">You&rsquo;ll deploy this in 60 minutes</p>
        <p className="text-label text-ink-subtle">
          {idea.source === "ai" ? "Written for you just now" : "From the Ship60 idea bank"}
        </p>
      </div>
    </article>
  );
}
