import { BRANCHES, INTERESTS, type Branch, type Interest } from "../../../shared/constants";
import type { IdeaCard } from "../../../shared/contracts";
import { Button, buttonClass, Chip, EmptyState, ProjectCard, Skeleton } from "../../design";
import type { Variant } from "./useIdeaPreview";

export interface HeroProps {
  branch: Branch | null;
  interest: Interest | null;
  variant: Variant;
  idea: IdeaCard | null;
  loading: boolean;
  error: string | null;
  onBranch: (branch: Branch) => void;
  onInterest: (interest: Interest) => void;
  onAnother: () => void;
  onRetry: () => void;
}

export function Hero({
  branch,
  interest,
  variant,
  idea,
  loading,
  error,
  onBranch,
  onInterest,
  onAnother,
  onRetry,
}: HeroProps) {
  const ready = branch !== null && interest !== null;
  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-12 sm:px-6 lg:pt-16 lg:pb-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start">
          <div className="relative pl-5">
            <span aria-hidden="true" className="absolute inset-y-1 left-0 w-0.5 bg-margin" />
            <p className="text-sm font-bold text-ink">Free NxtWave workshop · Sunday, 7 PM IST</p>
            <h1 className="mt-3 max-w-xl font-display font-stretch-expanded text-4xl leading-[1.05] font-black text-graphite sm:text-5xl">
              Build your first AI project. Live, in 60 minutes.
            </h1>
            <p className="mt-4 max-w-lg text-lg leading-8 text-graphite/80">
              Two taps and you&rsquo;ll see the exact project you&rsquo;ll ship. No coding experience
              needed — bring a laptop and 60 minutes.
            </p>

            <fieldset className="mt-8">
              <legend className="text-sm font-bold text-graphite">Your branch</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {BRANCHES.map((item) => (
                  <Chip
                    key={item}
                    data-testid={`branch-${item}`}
                    selected={branch === item}
                    onClick={() => onBranch(item)}
                  >
                    {item}
                  </Chip>
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-6">
              <legend className="text-sm font-bold text-graphite">What you&rsquo;re into</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {INTERESTS.map((item) => (
                  <Chip
                    key={item}
                    data-testid={`interest-${item}`}
                    selected={interest === item}
                    onClick={() => onInterest(item)}
                  >
                    {item}
                  </Chip>
                ))}
              </div>
            </fieldset>

            <a
              href="#register"
              className={buttonClass({ size: "lg", className: "mt-8" })}
            >
              Save my seat
            </a>
            <p className="mt-2 text-sm text-graphite/70">
              Takes about 30 seconds. Free, no card, no sales pitch.
            </p>
          </div>

          <div className="lg:sticky lg:top-8">
            {!ready ? (
              <EmptyState
                className="flex min-h-64 flex-col justify-center"
                title="Your project appears here"
                body="Pick your branch and one interest — the card is written from your choices."
              />
            ) : null}

            {ready && loading && !idea ? (
              <div className="rounded-xl border border-rule bg-surface px-5 py-6">
                <Skeleton className="w-40" lines={1} />
                <Skeleton className="mt-4" lines={3} />
                <Skeleton className="mt-4 w-3/4" lines={3} />
              </div>
            ) : null}

            {ready && error && !idea ? (
              <EmptyState
                title="The idea writer is busy"
                body={error}
                action={
                  <Button variant="secondary" onClick={onRetry}>
                    Try again
                  </Button>
                }
              />
            ) : null}

            {ready && idea ? (
              <div className="space-y-4">
                <ProjectCard key={`${idea.key}:${idea.variant}`} idea={idea} />
                <div className="flex items-center justify-between gap-4">
                  <Button variant="secondary" onClick={onAnother} disabled={loading} data-testid="idea-another">
                    Show me another
                  </Button>
                  <span className="text-sm text-graphite/70" aria-live="polite">
                    Idea {variant + 1} of 3
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
