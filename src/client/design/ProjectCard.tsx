import type { IdeaCard } from "../../shared/contracts";
import { cn } from "./cn";

export interface ProjectCardProps {
  idea: IdeaCard;
  /** Play the single "written on the page" reveal. Respects reduced motion. */
  writing?: boolean;
  className?: string;
}

export function ProjectCard({ idea, writing = true, className }: ProjectCardProps) {
  const lineClass = writing ? "animate-written" : undefined;
  const delay = (index: number) =>
    writing ? { animationDelay: `${140 + index * 110}ms` } : undefined;

  return (
    <article
      data-testid="project-card"
      className={cn(
        "relative overflow-hidden rounded-xl border border-rule bg-surface shadow-[0_1px_2px_rgba(46,51,59,0.08)]",
        className,
      )}
      aria-label={`Project preview: ${idea.title}`}
    >
      <div className="ruled absolute inset-0" aria-hidden="true" />
      <div className="absolute inset-y-0 left-10 w-px bg-rule sm:left-12" aria-hidden="true" />
      <div className="relative px-5 py-5 pl-14 sm:px-7 sm:pl-16">
        <p className="text-sm font-bold text-graphite/70">The project you&rsquo;ll build</p>
        <h3
          className={cn(
            "mt-2 font-display font-stretch-expanded text-2xl leading-8 font-black text-graphite",
            lineClass,
          )}
          style={delay(0)}
        >
          <span className="box-decoration-clone bg-highlight px-1">{idea.title}</span>
        </h3>
        <p
          className={cn("mt-2 max-w-prose leading-7 text-graphite", lineClass)}
          style={delay(1)}
        >
          {idea.pitch}
        </p>
        <ol className="mt-4">
          {idea.steps.map((step, index) => (
            <li
              key={step}
              className={cn("flex gap-3 leading-7", lineClass)}
              style={delay(2 + index)}
            >
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-ink/40 font-display text-sm font-bold text-ink">
                {index + 1}
              </span>
              <span className="text-graphite">{step}</span>
            </li>
          ))}
        </ol>
        <p
          className={cn("mt-4 text-sm leading-7 text-graphite/80", lineClass)}
          style={delay(5)}
        >
          <span className="font-bold text-graphite">Tools:</span> {idea.tools.join(" · ")}
        </p>
        <p className={cn("text-sm leading-7 text-graphite/80", lineClass)} style={delay(6)}>
          {idea.deployLine}
        </p>
        <p
          className={cn(
            "mt-4 inline-flex items-center rounded-full border border-ink/30 bg-ink/5 px-3 py-1 text-sm font-bold text-ink",
            lineClass,
          )}
          style={delay(7)}
        >
          You&rsquo;ll deploy this in 60 minutes
        </p>
        <p className="mt-3 text-xs text-graphite/70">
          {idea.source === "ai" ? "Written for you just now" : "From the Ship60 idea bank"}
        </p>
      </div>
    </article>
  );
}
