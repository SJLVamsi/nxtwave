import { useEffect, useMemo } from "react";
import { buttonClass } from "../../design";
import { readAttribution, trackPageView } from "./analytics";
import { Hero } from "./Hero";
import { RegistrationForm } from "./RegistrationForm";
import { Agenda, CoHosts, Faq, LiveCounters, WalkAway, WhoItsFor } from "./Sections";
import { useIdeaPreview } from "./useIdeaPreview";

export default function LandingPage() {
  const preview = useIdeaPreview();
  const attribution = useMemo(
    () => readAttribution(typeof window === "undefined" ? "" : window.location.search),
    [],
  );

  useEffect(() => {
    trackPageView(attribution.utm);
  }, [attribution.utm]);

  return (
    <div className="min-h-screen bg-paper font-body text-graphite">
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a
            href="/"
            className="font-display font-stretch-expanded text-lg font-black text-ink"
            aria-label="Ship60 home"
          >
            Ship60
          </a>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-graphite/70 sm:inline">
              A free NxtWave workshop
            </span>
            <a
              href="#register"
              className={buttonClass({ size: "md", className: "min-h-9 px-3 text-sm" })}
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

        <WalkAway />
        <Agenda />
        <WhoItsFor />
        <LiveCounters />
        <CoHosts />
        <Faq />

        <section id="register" className="border-b border-rule">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
            <h2 className="font-display font-stretch-expanded text-3xl font-black text-graphite">
              Save your seat
            </h2>
            <p className="mt-3 max-w-2xl text-lg leading-8 text-graphite/80">
              30 seconds now, one deployed project on Sunday night. Free, and your seat number is
              shown immediately.
            </p>
            <div className="mt-8">
              <RegistrationForm
                idea={preview.idea}
                refCode={attribution.refCode}
                shareVariant={attribution.shareVariant}
                utm={attribution.utm}
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-graphite/70 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            Ship60 · a free workshop by NxtWave · Sunday, 7 PM IST. Simulated demo data is always
            labelled where it appears.
          </p>
          <div className="flex gap-4">
            <a href="/plan" className="underline decoration-rule underline-offset-4 hover:text-ink">
              Growth plan
            </a>
            <a href="/build" className="underline decoration-rule underline-offset-4 hover:text-ink">
              How it&rsquo;s built
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
