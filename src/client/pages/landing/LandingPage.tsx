import { useEffect, useMemo, useState } from "react";
import { buttonClass, cn } from "../../design";
import { readAttribution, trackPageView } from "./analytics";
import { Hero } from "./Hero";
import { RegistrationForm } from "./RegistrationForm";
import { Agenda, CoHosts, Faq, LiveCounters, WalkAway, WhoItsFor } from "./Sections";
import { useIdeaPreview } from "./useIdeaPreview";
import { useStats } from "./useStats";

export default function LandingPage() {
  const preview = useIdeaPreview();
  const { data: stats } = useStats();
  const [formInView, setFormInView] = useState(false);
  const attribution = useMemo(
    () => readAttribution(typeof window === "undefined" ? "" : window.location.search),
    [],
  );

  useEffect(() => {
    trackPageView(attribution.utm);
  }, [attribution.utm]);

  // The mobile action bar steps out of the way once the form is on screen.
  useEffect(() => {
    const register = document.getElementById("register");
    if (!register || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => setFormInView(entries.some((entry) => entry.isIntersecting)),
      { rootMargin: "0px 0px -35% 0px" },
    );
    observer.observe(register);
    return () => observer.disconnect();
  }, []);

  const seatsLine = stats
    ? `${stats.registrations.toLocaleString("en-IN")} of ${stats.target.toLocaleString("en-IN")} seats filled`
    : "Seats are free and capped";

  return (
    <div
      className={cn(
        "min-h-screen bg-canvas font-sans text-ink",
        !formInView && "pb-28 lg:pb-0",
      )}
    >
      <header className="sticky top-0 z-40 border-b border-hairline bg-canvas">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a href="/" className="text-title text-ink" aria-label="Ship60 home">
            Ship60
          </a>
          <div className="flex items-center gap-4">
            <span className="hidden font-mono text-mono-data text-ink-subtle sm:inline">
              Sunday, 7 PM IST
            </span>
            <a
              href="#register"
              className={buttonClass({ size: "md", className: "max-lg:hidden" })}
            >
              Save my seat
            </a>
          </div>
        </div>
      </header>

      <main>
        <Hero
          branch={preview.branch}
          interest={preview.interest}
          variant={preview.variant}
          idea={preview.idea}
          loading={preview.loading}
          error={preview.error}
          onBranch={preview.selectBranch}
          onInterest={preview.selectInterest}
          onAnother={preview.showAnother}
          onRetry={preview.retry}
        />

        <section id="register" className="border-b border-hairline">
          <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-6 lg:py-24">
            <h2 className="text-display-lg text-ink text-balance">Save your seat</h2>
            <p className="mt-3 max-w-[60ch] text-body text-ink-muted">
              30 seconds now, one deployed project on Sunday night. Free, and your seat number is
              shown immediately.
            </p>
            <div className="mt-8 lg:mt-10">
              <RegistrationForm
                idea={preview.idea}
                refCode={attribution.refCode}
                shareVariant={attribution.shareVariant}
                utm={attribution.utm}
              />
            </div>
          </div>
        </section>

        <WalkAway />
        <Agenda />
        <WhoItsFor />
        <LiveCounters />
        <CoHosts />
        <Faq />
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-3 px-4 py-8 text-body-sm text-ink-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            Ship60 · a free workshop by NxtWave · Sunday, 7 PM IST. Simulated demo data is always
            labelled where it appears.
          </p>
          <div className="flex gap-4">
            <a
              href="/plan"
              className="underline decoration-hairline-strong underline-offset-4 hover:text-ink"
            >
              Growth plan
            </a>
            <a
              href="/build"
              className="underline decoration-hairline-strong underline-offset-4 hover:text-ink"
            >
              How it&rsquo;s built
            </a>
          </div>
        </div>
      </footer>

      {!formInView ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface-1 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden">
          <div className="mx-auto flex max-w-[1120px] items-center gap-3">
            <p className="min-w-0 flex-1 font-mono text-mono-data text-ink-muted tabular-nums">
              {seatsLine}
            </p>
            <a href="#register" className={buttonClass({ size: "lg", className: "shrink-0" })}>
              Save my seat
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
