import { useEffect, useRef } from "react";
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
  const cardRef = useRef<HTMLDivElement | null>(null);
  const ideaKey = idea ? `${idea.key}:${idea.variant}` : null;

  // The card renders below the fold on a 390×844 phone; bring it into view so
  // the promise ("two taps and you'll see your project") is kept without a
  // manual scroll. Desktop keeps its sticky column and skips this when the
  // card is already visible.
  useEffect(() => {
    if (!ready || ideaKey === null) return;
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const visible = rect.top >= 0 && rect.bottom <= window.innerHeight;
    if (visible) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  }, [ready, ideaKey]);

  return (
    <section className="relative overflow-hidden border-b border-hairline">
      <div aria-hidden="true" className="bg-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative mx-auto grid max-w-[1120px] gap-10 px-4 pt-10 pb-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start lg:gap-14 lg:pt-16 lg:pb-20">
        <div>
          <h1 className="max-w-[34ch] text-display-xl text-ink text-balance">
            Build your first AI project. Live, in 60&nbsp;minutes.
          </h1>
          <p className="mt-4 max-w-[52ch] text-body text-ink-muted">
            Two taps and you&rsquo;ll see the exact project you&rsquo;ll ship. No coding experience
            needed — bring a laptop and 60 minutes.
          </p>

          <fieldset className="mt-8">
            <legend className="text-label text-ink-muted">Your branch</legend>
            <div className="mt-2.5 flex flex-wrap gap-2">
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
            <legend className="text-label text-ink-muted">What you&rsquo;re into</legend>
            <div className="mt-2.5 flex flex-wrap gap-2">
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

          <div className="mt-8 hidden lg:block">
            <a href="#register" className={buttonClass({ size: "lg" })}>
              Save my seat
            </a>
            <p className="mt-2 text-body-sm text-ink-subtle">
              Takes about 30 seconds. Free, no card, no sales pitch.
            </p>
          </div>
        </div>

        <div className="lg:sticky lg:top-24">
          {!ready ? (
            <EmptyState
              className="flex min-h-64 flex-col justify-center"
              title="Your project appears here"
              body="Pick your branch and one interest — the card is written from your choices."
            />
          ) : null}

          {ready && loading && !idea ? (
            <div className="rounded-panel border border-hairline bg-surface-1 px-5 py-6">
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
            <div ref={cardRef} className="space-y-4">
              <ProjectCard key={`${idea.key}:${idea.variant}`} idea={idea} />
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="secondary"
                  onClick={onAnother}
                  disabled={loading}
                  data-testid="idea-another"
                >
                  Show me another
                </Button>
                <span className="font-mono text-mono-data text-ink-subtle" aria-live="polite">
                  Idea {variant + 1} of 3
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
